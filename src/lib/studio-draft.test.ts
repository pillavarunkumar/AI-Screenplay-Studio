import { describe, expect, it } from "vitest";
import { EMPTY_DRAFT, StudioDraftSchema } from "./studio-draft";

const storyline = {
  correctedIdea: "A burned-out nurse inherits her father's lighthouse.",
  corrections: [],
  synopsis: {
    setup: "Nora inherits a lighthouse.",
    complication: "A stranger arrives with a claim.",
    resolution: "Nora chooses to share it.",
  },
  whyThisStructure: "The inheritance promises escape; the stranger makes it costly.",
};

describe("StudioDraftSchema", () => {
  it("accepts the empty draft", () => {
    expect(StudioDraftSchema.safeParse(EMPTY_DRAFT).success).toBe(true);
  });

  it("accepts a partially generated cast", () => {
    const result = StudioDraftSchema.safeParse({
      ...EMPTY_DRAFT,
      idea: "A burned-out nurse inherits her father's lighthouse.",
      storyline,
      storylineSourceIdea:
        "A burned-out nurse inherits her father's lighthouse.",
      characters: [
        { id: "card-1", role: "protagonist", profile: null },
        {
          id: "card-2",
          role: "supporting",
          profile: {
            name: "",
            alternateNames: [],
            physicalDescription: "",
            personality: "",
            motivation: "",
            internalConflict: "",
            voice: "",
            arc: "",
          },
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("accepts saved scenes and the story bible", () => {
    const result = StudioDraftSchema.safeParse({
      ...EMPTY_DRAFT,
      storyBible: {
        tone: "wintry",
        characters: [
          { name: "Nora", role: "Protagonist", summary: "A nurse." },
        ],
        facts: ["Nora inherits the lighthouse."],
      },
      scenes: [
        {
          id: "scene-1",
          order: 0,
          heading: "INT. LIGHTHOUSE KITCHEN - NIGHT",
          summary: "Nora finds the letters.",
          elements: [
            { id: "element-1", type: "action", text: "Nora sets down a tin." },
          ],
          shotList: {
            shots: [
              {
                id: "shot-1",
                order: 0,
                shotType: "close-up",
                cameraAngle: "low angle",
                movement: "static",
                description: "Nora's hand hovers over the letters.",
                reasoning: "Isolation: the choice feels watched.",
              },
            ],
            coverageNotes: "",
          },
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("upgrades a draft saved before scenes existed", () => {
    // The v1 shape written by the Step 1/2 build had no storyBible or scenes.
    const legacy = {
      schemaVersion: 1,
      idea: "A burned-out nurse inherits her father's lighthouse.",
      storyline,
      storylineSourceIdea: "A burned-out nurse inherits her father's lighthouse.",
      characters: [],
    };

    const result = StudioDraftSchema.safeParse(legacy);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.storyBible).toEqual({
        tone: "",
        characters: [],
        facts: [],
      });
      expect(result.data.scenes).toEqual([]);
    }
  });

  it("rejects an incompatible saved version", () => {
    const result = StudioDraftSchema.safeParse({
      ...EMPTY_DRAFT,
      schemaVersion: 2,
    });
    expect(result.success).toBe(false);
  });
});

describe("saved translations", () => {
  const translation = {
    language: "Telugu",
    signature: "1f2e3d-120",
    scenes: [{ heading: "INT. A - NIGHT", elements: [{ type: "dialogue" as const, text: "హాయ్" }] }],
  };

  it("are part of the saved story and default to none for older stories", () => {
    expect(StudioDraftSchema.parse({ ...EMPTY_DRAFT, translations: [translation] }).translations).toHaveLength(1);
    const { translations: _omit, ...older } = EMPTY_DRAFT;
    expect(StudioDraftSchema.parse(older).translations).toEqual([]);
  });

  it("are limited to four languages and valid line types", () => {
    expect(StudioDraftSchema.safeParse({ ...EMPTY_DRAFT, translations: Array(5).fill(translation) }).success).toBe(false);
    const bad = { ...translation, scenes: [{ heading: "x", elements: [{ type: "poem", text: "x" }] }] };
    expect(StudioDraftSchema.safeParse({ ...EMPTY_DRAFT, translations: [bad] }).success).toBe(false);
  });
});
