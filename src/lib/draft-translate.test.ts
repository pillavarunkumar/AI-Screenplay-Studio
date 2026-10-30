import { describe, expect, it, vi } from "vitest";
import { ApiError } from "./api-client";
import { convertDraft, countUniqueStrings, mapDraftStrings } from "./draft-translate";
import { EMPTY_DRAFT, type StudioDraft } from "./schemas/draft";

const meta = { model: "m", attempts: 1, latencyMs: 1 };
const el = (id: string, type: "action" | "character" | "dialogue" | "parenthetical", text: string) => ({ id, type, text });

const draft: StudioDraft = {
  ...EMPTY_DRAFT,
  idea: "A nurse inherits a lighthouse.",
  storylineSourceIdea: "A nurse inherits a lighthouse.",
  storyline: {
    correctedIdea: "A nurse inherits a lighthouse.",
    corrections: ["Added a period"],
    synopsis: { setup: "Nora inherits it.", complication: "A stranger arrives.", resolution: "She shares it." },
    whyThisStructure: "Three beats fit.",
  },
  characters: [
    {
      id: "c1",
      role: "protagonist",
      profile: {
        name: "Nora",
        alternateNames: ["Nori"],
        physicalDescription: "Tall.",
        personality: "Guarded.",
        motivation: "Peace.",
        internalConflict: "Guilt.",
        voice: "Dry.",
        arc: "Opens up.",
      },
    },
    { id: "c2", role: "antagonist", profile: null },
  ],
  storyBible: {
    tone: "Wintry",
    characters: [{ name: "Nora", role: "Protagonist", summary: "A nurse." }],
    facts: ["The lighthouse is old."],
  },
  scenes: [
    {
      id: "s1",
      order: 0,
      heading: "INT. KITCHEN - NIGHT",
      summary: "Nora finds letters.",
      elements: [
        el("e1", "action", "Rain falls."),
        el("e2", "character", "NORA (V.O.)"),
        el("e3", "parenthetical", "(quietly)"),
        el("e4", "dialogue", "Who wrote these?"),
        el("e5", "character", "THEO"),
        el("e6", "dialogue", "I did."),
      ],
      shotList: {
        shots: [{ id: "h1", order: 0, shotType: "Wide", cameraAngle: "Low", movement: "Static", description: "The room.", reasoning: "Context." }],
        coverageNotes: "Coverage.",
      },
      storyboard: {
        panels: [
          { shotType: "Wide", cameraAngle: "Eye level", movement: "static", setting: "interior", time: "night", horizon: 55, elements: [], caption: "Nora enters.", dialogue: "" },
        ],
      },
    },
  ],
};

/** Fake model: names become "తె-<name>", text becomes "[te] <text>". */
function fakeCall() {
  return vi.fn(async (_task: string, input: unknown) => {
    const { kind, strings } = input as { kind: string; strings: string[] };
    return {
      data: { strings: strings.map((s) => (kind === "names" ? `తె-${s}` : `[te] ${s}`)) },
      meta,
    };
  }) as never;
}

describe("convertDraft", () => {
  it("converts every field, keeps cue names in sync with the glossary, and leaves structure alone", async () => {
    const out = await convertDraft(draft, "Telugu", { call: fakeCall() });

    expect(out.language).toBe("Telugu");
    expect(out.idea).toBe("[te] A nurse inherits a lighthouse.");
    // Same source string → same translation, so the stale-idea check still matches.
    expect(out.storylineSourceIdea).toBe(out.idea);
    expect(out.storyline?.synopsis.setup).toBe("[te] Nora inherits it.");
    expect(out.characters[0].profile?.name).toBe("తె-Nora");
    expect(out.characters[0].profile?.alternateNames).toEqual(["తె-Nori"]);
    expect(out.characters[0].profile?.arc).toBe("[te] Opens up.");
    expect(out.characters[1].profile).toBeNull();
    expect(out.storyBible.characters[0].name).toBe("తె-Nora");
    expect(out.storyBible.facts).toEqual(["[te] The lighthouse is old."]);

    const scene = out.scenes[0];
    expect(scene.heading).toBe("[te] INT. KITCHEN - NIGHT");
    expect(scene.elements.map((e) => e.type)).toEqual(draft.scenes[0].elements.map((e) => e.type));
    expect(scene.elements[1].text).toBe("తె-NORA (V.O.)".toUpperCase().replace("తె-", "తె-"));
    expect(scene.elements[4].text).toBe("తె-THEO");
    expect(scene.elements[5].text).toBe("[te] I did.");
    expect(scene.shotList?.shots[0].description).toBe("[te] The room.");
    expect(scene.storyboard?.panels[0].caption).toBe("[te] Nora enters.");
    expect(scene.storyboard?.panels[0].movement).toBe("static");
  });

  it("drops saved translations, which were made from the old text", async () => {
    const withSaved: StudioDraft = {
      ...draft,
      translations: [{ language: "Hindi", signature: "abc-1", scenes: [{ heading: "x", elements: [] }] }],
    };
    const out = await convertDraft(withSaved, "Telugu", { call: fakeCall() });
    expect(out.translations).toEqual([]);
  });

  it("sends names first and attaches them as a glossary to the text batches", async () => {
    const call = fakeCall();
    await convertDraft(draft, "Telugu", { call });
    const calls = (call as unknown as { mock: { calls: [string, { kind: string; glossary: { from: string; to: string }[] }][] } }).mock.calls;
    expect(calls[0][1].kind).toBe("names");
    expect(calls[1][1].kind).toBe("text");
    expect(calls[1][1].glossary).toContainEqual({ from: "Nora", to: "తె-Nora" });
    expect(calls[1][1].glossary.map((g) => g.from)).toContain("THEO");
  });

  it("resumes from the cache after a failure", async () => {
    const cache = new Map<string, string>();
    let first = true;
    const flaky = vi.fn(async (_t: string, input: unknown) => {
      const { kind, strings } = input as { kind: string; strings: string[] };
      if (kind === "text" && first) {
        first = false;
        throw new ApiError("not_configured", "no key", 503);
      }
      return { data: { strings: strings.map((s) => `[x] ${s}`) }, meta };
    }) as never;

    await expect(convertDraft(draft, "Hindi", { call: flaky, cache })).rejects.toMatchObject({ code: "not_configured" });
    expect(cache.size).toBeGreaterThan(0); // names were kept
    const callsBefore = (flaky as unknown as { mock: { calls: unknown[] } }).mock.calls.length;
    const out = await convertDraft(draft, "Hindi", { call: flaky, cache });
    const later = (flaky as unknown as { mock: { calls: [string, { kind: string }][] } }).mock.calls.slice(callsBefore);
    expect(later.length).toBeGreaterThan(0);
    expect(later.every(([, input]) => input.kind === "text")).toBe(true); // names were cached
    expect(out.language).toBe("Hindi");
  });

  it("splits a batch when the model returns the wrong number of strings", async () => {
    const lossy = vi.fn(async (_t: string, input: unknown) => {
      const { strings } = input as { strings: string[] };
      const out = strings.length > 2 ? strings.slice(1) : strings;
      return { data: { strings: out.map((s) => `[y] ${s}`) }, meta };
    }) as never;
    const out = await convertDraft(draft, "French", { call: lossy });
    expect(out.storyline?.synopsis.resolution).toBe("[y] She shares it.");
  });

  it("splits a batch the provider rejects as too long (HTTP 400) instead of failing", async () => {
    const strict = vi.fn(async (_t: string, input: unknown) => {
      const { strings } = input as { strings: string[] };
      if (strings.length > 3) throw new ApiError("llm_upstream_error", "The model provider returned HTTP 400.", 502);
      return { data: { strings: strings.map((s) => `[z] ${s}`) }, meta };
    }) as never;
    const out = await convertDraft(draft, "Hindi", { call: strict });
    expect(out.storyline?.synopsis.setup).toBe("[z] Nora inherits it.");
    expect(out.scenes[0].elements[5].text).toBe("[z] I did.");
  });

  it("still fails when a single string is rejected", async () => {
    const never = vi.fn(async () => {
      throw new ApiError("llm_upstream_error", "The model provider returned HTTP 400.", 502);
    }) as never;
    await expect(convertDraft(draft, "Hindi", { call: never })).rejects.toMatchObject({ code: "llm_upstream_error" });
  });

  it("stops when cancelled and never touches an empty draft's text", async () => {
    await expect(
      convertDraft(draft, "French", { call: fakeCall(), isCancelled: () => true }),
    ).rejects.toThrow("cancelled");

    const call = fakeCall();
    const out = await convertDraft(EMPTY_DRAFT, "French", { call });
    expect(out).toEqual({ ...EMPTY_DRAFT, language: "French" });
    expect((call as unknown as { mock: { calls: unknown[] } }).mock.calls).toHaveLength(0);
  });
});

describe("helpers", () => {
  it("counts unique strings and skips blanks", () => {
    expect(countUniqueStrings(EMPTY_DRAFT)).toBe(0);
    expect(countUniqueStrings(draft)).toBeGreaterThan(10);
  });

  it("mapDraftStrings passes the right kinds", () => {
    const kinds = new Set<string>();
    mapDraftStrings(draft, (text, kind) => (kinds.add(kind), text));
    expect([...kinds].sort()).toEqual(["cue", "name", "text"]);
  });
});
