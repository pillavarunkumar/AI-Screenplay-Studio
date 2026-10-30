import { describe, expect, it } from "vitest";
import { EXAMPLES } from "./examples";
import { reviewDraft, scriptRatio } from "./review-draft";
import { EMPTY_DRAFT, type StudioDraft } from "./schemas/draft";

const ferry = EXAMPLES[0].draft;
const item = (draft: StudioDraft, id: string) => reviewDraft(draft).items.find((i) => i.id === id)!;

describe("scriptRatio", () => {
  it("measures the share of letters in a script", () => {
    expect(scriptRatio("హాయ్ ఎలా ఉన్నావు", /\p{Script=Telugu}/u)).toBe(1);
    // Vowel signs and virama are marks, not letters: 5 Latin + 2 Telugu letters.
    expect(scriptRatio("Hello హాయ్", /\p{Script=Telugu}/u)).toBeCloseTo(2 / 7, 5);
    expect(scriptRatio("123 !!", /\p{Script=Telugu}/u)).toBe(1); // no letters: nothing to disagree with
  });
});

describe("reviewDraft", () => {
  it("shows an empty story as not ready, with things to fill in", () => {
    const review = reviewDraft(EMPTY_DRAFT);
    expect(review.ready).toBe(false);
    expect(review.items.find((i) => i.id === "story")?.fix).toBe("fill");
    expect(review.score).toBeLessThan(50);
  });

  it("passes the script basics for a well-formed example and flags what it lacks", () => {
    expect(item(ferry, "story").ok).toBe(true);
    expect(item(ferry, "cast").ok).toBe(true);
    expect(item(ferry, "format").ok).toBe(true);
    expect(item(ferry, "speakers").ok).toBe(true);
    // The examples ship with camera plans and storyboards.
    expect(item(ferry, "camera").ok).toBe(true);
    expect(item(ferry, "board").ok).toBe(true);
    // Removing them is noticed, with a one-click fix.
    const bare = { ...ferry, scenes: ferry.scenes.map((s) => ({ ...s, shotList: null, storyboard: null })) };
    expect(item(bare, "camera")).toMatchObject({ ok: false, fix: "fill" });
    expect(item(bare, "board")).toMatchObject({ ok: false, fix: "fill" });
  });

  it("wants every planned character written, not just three", () => {
    const four = { ...ferry, characters: [...ferry.characters, { id: "c4", role: "supporting" as const, profile: null, brief: "The harbour master." }] };
    expect(item(four, "cast")).toMatchObject({ ok: false, fix: "fill" });
    expect(item(four, "cast").detail).toBe("3 of 4 are done.");
    const two = { ...ferry, characters: ferry.characters.slice(0, 2) };
    expect(item(two, "cast").detail).toContain("Only 2 characters");
  });

  it("flags unwritten scenes, naming them", () => {
    const draft = { ...ferry, scenes: [...ferry.scenes, { id: "x", order: 2, heading: "INT. A - DAY", summary: "s", elements: [], shotList: null }] };
    const written = item(draft, "written");
    expect(written.ok).toBe(false);
    expect(written.detail).toContain("Scene 3");
  });

  it("offers an automatic fix when only formatting is wrong", () => {
    const messy = {
      ...ferry,
      scenes: ferry.scenes.map((scene, i) =>
        i === 0
          ? { ...scene, heading: "int ferry deck night", elements: scene.elements.map((e) => (e.type === "character" ? { ...e, text: e.text.toLowerCase() } : e)) }
          : scene,
      ),
    };
    expect(item(messy, "format")).toMatchObject({ ok: false, fix: "format" });
  });

  it("does not offer a format fix for a problem it can't repair", () => {
    const broken = {
      ...ferry,
      scenes: ferry.scenes.map((scene, i) => (i === 0 ? { ...scene, elements: scene.elements.filter((e) => e.type !== "dialogue") } : scene)),
    };
    expect(item(broken, "format").fix).toBeUndefined();
  });

  it("notices a script written in the wrong language", () => {
    expect(item(ferry, "language").ok).toBe(true);
    expect(item({ ...ferry, language: "Telugu" }, "language")).toMatchObject({ ok: false });
  });

  it("notices speakers who aren't in the cast, and a lead who never speaks", () => {
    const strangers = {
      ...ferry,
      scenes: ferry.scenes.map((scene) => ({
        ...scene,
        elements: scene.elements.map((e, i) => (e.type === "character" ? { ...e, text: ["A", "B", "C"][i % 3] + "NONYM" } : e)),
      })),
    };
    expect(item(strangers, "speakers").ok).toBe(false);
    expect(item(strangers, "leads").ok).toBe(false);
  });

  it("is ready when every check passes", () => {
    const finished: StudioDraft = {
      ...ferry,
      scenes: ferry.scenes.concat({ ...ferry.scenes[0], id: "lf-s3", order: 2 }).map((scene) => ({
        ...scene,
        shotList: { coverageNotes: "c", shots: [] },
        storyboard: { panels: [{ shotType: "Wide", cameraAngle: "eye", movement: "static" as const, setting: "interior" as const, time: "night" as const, horizon: 55, elements: [], caption: "c", dialogue: "" }] },
      })),
    };
    const review = reviewDraft(finished);
    expect(review.items.filter((i) => !i.ok).map((i) => i.id)).toEqual([]);
    expect(review.ready).toBe(true);
    expect(review.score).toBe(100);
  });
});
