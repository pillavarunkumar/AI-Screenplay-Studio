import { describe, expect, it, vi } from "vitest";
import { ApiError } from "./api-client";
import { remainingSteps, runAutoDraft } from "./auto-draft";
import { EXAMPLES } from "./examples";
import { reviewDraft } from "./review-draft";
import { EMPTY_DRAFT, type StudioDraft } from "./schemas/draft";
import { CastPlanOutputSchema } from "./schemas/characters";
import { WriteSceneOutputSchema } from "./schemas/scene";
import { writeSceneInput } from "./story-context";

const meta = { model: "m", attempts: 1, latencyMs: 1 };
const profile = (name: string) => ({
  name, alternateNames: [], physicalDescription: "p", personality: "pe", motivation: "m", internalConflict: "i", voice: "v", arc: "a",
});
const storyline = {
  correctedIdea: "A nurse inherits a lighthouse.", corrections: [],
  synopsis: { setup: "s", complication: "c", resolution: "r" }, whyThisStructure: "w",
};
const sceneLines = [
  { type: "action", text: "Rain." }, { type: "character", text: "NORA" }, { type: "dialogue", text: "Who is there?" },
  { type: "character", text: "THEO" }, { type: "dialogue", text: "Me." }, { type: "action", text: "A door slams." },
];
const panel = { shotType: "Wide", cameraAngle: "eye", movement: "static", setting: "interior", time: "night", horizon: 55, elements: [], caption: "c", dialogue: "" };

/** A fake model that answers each task with a plausible, schema-valid reply. */
function fakeModel() {
  const names = ["Nora", "Theo", "Ivy", "Sam"];
  let nameIndex = 0;
  const calls: { task: string; input: any; language?: string }[] = [];
  const call = vi.fn(async (task: string, input: any, language?: string) => {
    calls.push({ task, input, language });
    const replies: Record<string, () => unknown> = {
      storyline: () => ({ ...storyline, analysis: undefined }),
      castPlan: () => ({
        characters: [
          { role: "protagonist", name: "", brief: "A burned-out nurse." },
          { role: "antagonist", name: "", brief: "The stranger with a claim." },
          { role: "supporting", name: "Ivy", brief: "Her estranged sister, named by the writer." },
          { role: "supporting", name: "", brief: "The old harbour master." },
        ],
      }),
      characters: () => profile(names[nameIndex++ % 4]),
      scenes: () => ({ tone: "wintry", scenes: [0, 1, 2].map((i) => ({ heading: `int room ${i} night`, summary: `Scene ${i} summary.` })) }),
      writeScene: () => ({ heading: "INT. ROOM - NIGHT", elements: sceneLines }),
      bibleSync: () => ({ newFacts: ["The lighthouse is old."] }),
      shotList: () => ({ coverageNotes: "n", shots: [{ shotType: "Wide", cameraAngle: "eye", movement: "static", description: "d", reasoning: "r" }] }),
      storyboard: () => ({ panels: [panel] }),
    };
    const data = replies[task]();
    return { data, meta };
  }) as never;
  return { call, calls };
}

describe("runAutoDraft", () => {
  it("writes a complete story from just an idea, in order", async () => {
    const { call, calls } = fakeModel();
    const saved: StudioDraft[] = [];
    const out = await runAutoDraft({ ...EMPTY_DRAFT, idea: "a nurse inherits a lighthouse" }, { call, onDraft: (d) => saved.push(d) });

    expect(out.storyline).not.toBeNull();
    // The idea has FOUR characters, so all four are created (not a fixed three).
    expect(out.characters.map((c) => c.role)).toEqual(["protagonist", "antagonist", "supporting", "supporting"]);
    expect(out.scenes).toHaveLength(3);
    expect(out.scenes.every((s) => s.elements.length === 6 && s.shotList && s.storyboard)).toBe(true);
    expect(out.storyBible.tone).toBe("wintry");
    expect(out.storyBible.characters.map((c) => c.name)).toEqual(["Nora", "Theo", "Ivy", "Sam"]);
    expect(out.storyBible.facts).toEqual(["The lighthouse is old."]);
    expect(out.scenes[0].heading).toBe("INT. ROOM - NIGHT");

    // Order: story → cast plan → 4 characters → scene plan → (write + facts) × 3 → camera × 3 → boards × 3.
    expect(calls.map((c) => c.task)).toEqual([
      "storyline", "castPlan", "characters", "characters", "characters", "characters", "scenes",
      "writeScene", "bibleSync", "writeScene", "bibleSync", "writeScene", "bibleSync",
      "shotList", "shotList", "shotList", "storyboard", "storyboard", "storyboard",
    ]);
    // Saved after every step, so nothing is lost if it stops halfway.
    expect(saved.length).toBeGreaterThan(10);
    expect(reviewDraft(out).items.find((i) => i.id === "written")?.ok).toBe(true);
  });

  it("gives each new character the names already taken, and each scene what came before", async () => {
    const { call, calls } = fakeModel();
    await runAutoDraft({ ...EMPTY_DRAFT, idea: "a nurse inherits a lighthouse" }, { call });
    const chars = calls.filter((c) => c.task === "characters");
    expect(chars).toHaveLength(4);
    expect(chars[0].input.existingNames).toEqual([]);
    expect(chars[2].input.existingNames).toEqual(["Nora", "Theo"]);
    // Each character is written from its brief, and the writer's own name is passed through.
    expect(chars.map((c) => c.input.brief)).toEqual(["A burned-out nurse.", "The stranger with a claim.", "Her estranged sister, named by the writer.", "The old harbour master."]);
    expect(chars.map((c) => c.input.suggestedName)).toEqual([undefined, undefined, "Ivy", undefined]);
    // The planner sees what the writer originally said.
    expect(calls.find((c) => c.task === "castPlan")!.input.idea).toBe("a nurse inherits a lighthouse");

    const writes = calls.filter((c) => c.task === "writeScene");
    expect(writes[0].input.previousScenes).toEqual([]);
    expect(writes[1].input.previousScenes).toHaveLength(1);
    expect(writes[1].input.previousScenes[0].lastLines).toContain("NORA:");
    expect(writes[2].input.position).toEqual({ index: 2, total: 3 });
    expect(writes[0].input.cast.map((c: any) => c.name)).toEqual(["Nora", "Theo", "Ivy", "Sam"]);
  });

  it("only fills what is missing and never overwrites the writer's work", async () => {
    const { call, calls } = fakeModel();
    const mine = EXAMPLES[1].draft; // has story, 3 characters, 2 written scenes
    const out = await runAutoDraft(mine, { call });

    expect(calls.map((c) => c.task).filter((t) => ["writeScene", "storyline", "castPlan", "characters", "scenes"].includes(t))).toEqual([]);
    expect(out.scenes[0].elements).toEqual(mine.scenes[0].elements);
    expect(out.characters).toEqual(mine.characters);
    expect(out.scenes.every((s) => s.shotList && s.storyboard)).toBe(true);
  });

  it("writes only the scenes that are still empty", async () => {
    const { call, calls } = fakeModel();
    const half: StudioDraft = { ...EXAMPLES[0].draft, scenes: [EXAMPLES[0].draft.scenes[0], { ...EXAMPLES[0].draft.scenes[1], elements: [] }] };
    const out = await runAutoDraft(half, { call });
    expect(calls.filter((c) => c.task === "writeScene")).toHaveLength(1);
    expect(out.scenes[0].elements).toEqual(half.scenes[0].elements);
    expect(out.scenes[1].elements.length).toBe(6);
  });

  it("passes the project language to every call", async () => {
    const { call, calls } = fakeModel();
    await runAutoDraft({ ...EMPTY_DRAFT, idea: "a nurse inherits a lighthouse", language: "Telugu" }, { call });
    expect(new Set(calls.map((c) => c.language))).toEqual(new Set(["Telugu"]));
  });

  it("resumes after a failure without redoing finished steps", async () => {
    const { call } = fakeModel();
    let boom = true;
    const flaky = vi.fn(async (task: string, input: unknown, language?: string) => {
      if (task === "writeScene" && boom) {
        boom = false;
        throw new ApiError("not_configured", "down", 503);
      }
      return (call as any)(task, input, language);
    }) as never;

    let latest: StudioDraft = { ...EMPTY_DRAFT, idea: "a nurse inherits a lighthouse" };
    await expect(runAutoDraft(latest, { call: flaky, onDraft: (d) => (latest = d) })).rejects.toMatchObject({ code: "not_configured" });
    expect(latest.scenes).toHaveLength(3);
    expect(latest.scenes[0].elements).toHaveLength(0);

    const again = await runAutoDraft(latest, { call: flaky });
    expect(again.scenes.every((s) => s.elements.length > 0)).toBe(true);
    expect(again.characters).toHaveLength(4);
  });

  it("finishes only the characters still unwritten, without planning the cast again", async () => {
    const { call, calls } = fakeModel();
    const half: StudioDraft = {
      ...EXAMPLES[0].draft,
      characters: [...EXAMPLES[0].draft.characters, { id: "x", role: "supporting", profile: null, brief: "The harbour master." }],
    };
    const out = await runAutoDraft(half, { call });
    expect(calls.filter((c) => c.task === "castPlan")).toHaveLength(0);
    expect(calls.filter((c) => c.task === "characters")).toHaveLength(1);
    expect(out.characters).toHaveLength(4);
    expect(out.characters[3].profile?.name).toBeTruthy();
    expect(out.characters.slice(0, 3)).toEqual(EXAMPLES[0].draft.characters);
  });

  it("stops when cancelled and rejects an empty idea", async () => {
    const { call } = fakeModel();
    await expect(runAutoDraft({ ...EMPTY_DRAFT, idea: "a nurse inherits a lighthouse" }, { call, isCancelled: () => true })).rejects.toThrow("Cancelled");
    await expect(runAutoDraft({ ...EMPTY_DRAFT, idea: "hi" }, { call })).rejects.toMatchObject({ code: "invalid_input" });
  });

  it("reports honest progress that ends at 100%", async () => {
    const { call } = fakeModel();
    const seen: { done: number; total: number }[] = [];
    await runAutoDraft({ ...EMPTY_DRAFT, idea: "a nurse inherits a lighthouse" }, { call, onProgress: (p) => seen.push(p) });
    expect(seen[0].done).toBe(0);
    expect(seen.every((p) => p.done <= p.total)).toBe(true);
    expect(seen[seen.length - 1]).toMatchObject({ label: "Done" });
    expect(seen[seen.length - 1].done).toBe(seen[seen.length - 1].total);
  });
});

describe("remainingSteps", () => {
  it("counts only the missing work", () => {
    expect(remainingSteps(EMPTY_DRAFT)).toBeGreaterThan(20);
    const finished = { ...EXAMPLES[0].draft, scenes: EXAMPLES[0].draft.scenes.map((s) => ({ ...s, shotList: { coverageNotes: "", shots: [] }, storyboard: { panels: [panel as never] } })) };
    expect(remainingSteps(finished)).toBe(0);
  });
});

describe("writeScene schema and input", () => {
  const draft = EXAMPLES[0].draft;

  it("accepts a well-formed scene and repairs nothing it can't trust", () => {
    expect(WriteSceneOutputSchema.safeParse({ heading: "INT. A - DAY", elements: sceneLines }).success).toBe(true);
  });

  it("rejects scenes that put a parenthetical on nearly every line", () => {
    const heavy = [
      { type: "action", text: "Rain." },
      ...["A", "B", "C", "D"].flatMap((n) => [
        { type: "character", text: "NORA" },
        { type: "parenthetical", text: "(softly)" },
        { type: "dialogue", text: `Line ${n}.` },
      ]),
    ];
    const result = WriteSceneOutputSchema.safeParse({ heading: "INT. A - DAY", elements: heavy });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("Too many parentheticals");
    // One parenthetical across four lines of dialogue is fine.
    expect(WriteSceneOutputSchema.safeParse({ heading: "INT. A - DAY", elements: [...heavy.slice(0, 4), ...heavy.slice(4).filter((e) => e.type !== "parenthetical")] }).success).toBe(true);
  });

  it("rejects script-flow mistakes so the model's retry fixes them", () => {
    const noDialogue = WriteSceneOutputSchema.safeParse({
      heading: "INT. A - DAY",
      elements: [...sceneLines.slice(0, 5), { type: "character", text: "NORA" }, { type: "action", text: "x" }],
    });
    expect(noDialogue.success).toBe(false);
    const orphan = WriteSceneOutputSchema.safeParse({
      heading: "INT. A - DAY",
      elements: [{ type: "dialogue", text: "Hi." }, ...sceneLines],
    });
    expect(orphan.success).toBe(false);
    expect(WriteSceneOutputSchema.safeParse({ heading: "x", elements: sceneLines.slice(0, 3) }).success).toBe(false);
  });

  it("builds an input with cast voices, previous scenes, and position", () => {
    const input = writeSceneInput(draft, draft.scenes[1]);
    expect(input.cast.map((c) => c.name)).toEqual(["Mara", "Mr. Voss", "Captain Iyer"]);
    expect(input.cast[0].voice).toContain("Short");
    expect(input.previousScenes).toHaveLength(1);
    expect(input.previousScenes[0].heading).toBe(draft.scenes[0].heading);
    expect(input.position).toEqual({ index: 1, total: 2 });
  });
});

describe("cast plan schema", () => {
  const one = (role: string, name = "") => ({ role, name, brief: "who they are" });

  it("accepts a full cast with one hero and keeps the writer's names", () => {
    const plan = CastPlanOutputSchema.parse({ characters: [one("protagonist", "Ramulu"), one("antagonist"), one("supporting", "Raju"), one("supporting")] });
    expect(plan.characters.map((c) => c.name)).toEqual(["Ramulu", "", "Raju", ""]);
  });

  it("requires exactly one protagonist, between 2 and 6 characters", () => {
    expect(CastPlanOutputSchema.safeParse({ characters: [one("antagonist"), one("supporting")] }).success).toBe(false);
    expect(CastPlanOutputSchema.safeParse({ characters: [one("protagonist"), one("protagonist")] }).success).toBe(false);
    expect(CastPlanOutputSchema.safeParse({ characters: [one("protagonist")] }).success).toBe(false);
    expect(CastPlanOutputSchema.safeParse({ characters: [one("protagonist"), ...Array(6).fill(one("supporting"))] }).success).toBe(false);
  });
});
