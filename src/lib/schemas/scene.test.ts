import { describe, expect, it } from "vitest";
import {
  BibleSyncOutputSchema,
  NextLinesInputSchema,
  NextLinesOutputSchema,
  PolishSceneOutputSchema,
  ScenePlanInputSchema,
  ScenePlanOutputSchema,
  ShotListOutputSchema,
} from "./scene";

const synopsis = {
  setup: "Nora inherits a lighthouse.",
  complication: "A stranger arrives with a claim.",
  resolution: "Nora chooses to share it.",
};

const bible = {
  tone: "wintry and restrained",
  characters: [
    {
      name: "Nora",
      role: "Protagonist",
      summary: "A burned-out nurse who deflects emotion with logistics.",
    },
  ],
  facts: ["Nora's father owned the lighthouse."],
};

const scene = {
  heading: "INT. LIGHTHOUSE KITCHEN - NIGHT",
  summary: "Nora finds the letters and hides them when someone knocks.",
  elements: [
    {
      id: "element-1",
      type: "action" as const,
      text: "Nora sets a tin of letters on the table.",
    },
  ],
};

const sceneContext = {
  correctedIdea: "A burned-out nurse inherits her father's lighthouse.",
  synopsis,
  bible,
  scene,
};

describe("ScenePlanInputSchema", () => {
  it("accepts a synopsis and bible", () => {
    expect(
      ScenePlanInputSchema.safeParse({
        correctedIdea: sceneContext.correctedIdea,
        synopsis,
        bible,
      }).success,
    ).toBe(true);
  });

  it("requires the story bible", () => {
    const result = ScenePlanInputSchema.safeParse({
      correctedIdea: sceneContext.correctedIdea,
      synopsis,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join("."))).toContain(
        "bible",
      );
    }
  });

  it("requires all three synopsis beats", () => {
    const result = ScenePlanInputSchema.safeParse({
      correctedIdea: sceneContext.correctedIdea,
      synopsis: { setup: "Only a setup." },
      bible,
    });
    expect(result.success).toBe(false);
  });
});

describe("ScenePlanOutputSchema", () => {
  it("accepts a 3-6 scene breakdown", () => {
    const result = ScenePlanOutputSchema.safeParse({
      scenes: [
        { heading: "INT. LIGHTHOUSE - NIGHT", summary: "Nora arrives." },
        { heading: "INT. KITCHEN - NIGHT", summary: "She finds letters." },
        { heading: "EXT. CLIFF - DAWN", summary: "She chooses to stay." },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a one-scene plan", () => {
    const result = ScenePlanOutputSchema.safeParse({
      scenes: [{ heading: "INT. LIGHTHOUSE - NIGHT", summary: "Nora arrives." }],
    });
    expect(result.success).toBe(false);
  });

  it("requires a heading and summary for every scene", () => {
    const result = ScenePlanOutputSchema.safeParse({
      scenes: [
        { heading: "", summary: "Nora arrives." },
        { heading: "INT. KITCHEN - NIGHT", summary: "She finds letters." },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe("NextLinesInputSchema", () => {
  it("accepts an empty scene while the writer is starting", () => {
    const result = NextLinesInputSchema.safeParse({
      ...sceneContext,
      scene: { heading: "", summary: "", elements: [] },
    });
    expect(result.success).toBe(true);
  });

  it("requires the story bible so suggestions stay consistent", () => {
    const { bible: _bible, ...withoutBible } = sceneContext;
    expect(NextLinesInputSchema.safeParse(withoutBible).success).toBe(false);
  });
});

describe("NextLinesOutputSchema", () => {
  const suggestions = [
    {
      type: "action" as const,
      text: "The knock comes again, slower.",
      technique: "silence beat",
      why: "The pause lets the threat land before Nora reacts.",
    },
    {
      type: "dialogue" as const,
      text: "Nobody's home.",
      technique: "subtext",
      why: "She answers the door with a lie about the house, not herself.",
    },
  ];

  it("accepts 2-4 suggestions with a technique and why", () => {
    expect(
      NextLinesOutputSchema.safeParse({ suggestions }).success,
    ).toBe(true);
  });

  it("requires the Why note", () => {
    const result = NextLinesOutputSchema.safeParse({
      suggestions: [{ ...suggestions[0], why: "" }],
    });
    expect(result.success).toBe(false);
  });

  it("requires a named technique", () => {
    const result = NextLinesOutputSchema.safeParse({
      suggestions: [{ ...suggestions[0], technique: "" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("PolishSceneOutputSchema", () => {
  it("accepts a polished scene and its change list", () => {
    const result = PolishSceneOutputSchema.safeParse({
      heading: "INT. LIGHTHOUSE KITCHEN - NIGHT",
      elements: [
        { type: "action", text: "Nora slides the letters under a plate." },
        { type: "character", text: "NORA" },
        { type: "dialogue", text: "Nobody's home." },
      ],
      changes: ["Cut the greeting and started on the conflict."],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty rewrite", () => {
    const result = PolishSceneOutputSchema.safeParse({
      heading: "INT. LIGHTHOUSE KITCHEN - NIGHT",
      elements: [],
      changes: [],
    });
    expect(result.success).toBe(false);
  });

  it("caps the change list", () => {
    const result = PolishSceneOutputSchema.safeParse({
      heading: "INT. LIGHTHOUSE KITCHEN - NIGHT",
      elements: [{ type: "action", text: "Nora hides the letters." }],
      changes: Array.from({ length: 11 }, (_, index) => `change ${index}`),
    });
    expect(result.success).toBe(false);
  });
});

describe("ShotListOutputSchema", () => {
  const shot = {
    shotType: "close-up",
    cameraAngle: "low angle",
    movement: "static",
    description: "Nora's hand hovers over the letters.",
    reasoning: "Isolation: the low angle makes the choice feel watched.",
  };

  it("accepts coverage with an empty coverage note", () => {
    const result = ShotListOutputSchema.safeParse({
      shots: [shot],
      coverageNotes: "",
    });
    expect(result.success).toBe(true);
  });

  it("requires the directorial reasoning for each shot", () => {
    const result = ShotListOutputSchema.safeParse({
      shots: [{ ...shot, reasoning: "" }],
      coverageNotes: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty shot list", () => {
    const result = ShotListOutputSchema.safeParse({
      shots: [],
      coverageNotes: "Nothing covered.",
    });
    expect(result.success).toBe(false);
  });
});

describe("BibleSyncOutputSchema", () => {
  it("accepts no new facts", () => {
    expect(BibleSyncOutputSchema.safeParse({ newFacts: [] }).success).toBe(true);
  });

  it("caps new facts at eight", () => {
    const result = BibleSyncOutputSchema.safeParse({
      newFacts: Array.from({ length: 9 }, (_, index) => `Fact ${index}`),
    });
    expect(result.success).toBe(false);
  });
});
