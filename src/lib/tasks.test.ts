import { describe, expect, it } from "vitest";
import { TASK_NAMES, TASKS } from "./tasks";

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

const synopsis = {
  setup: "Nora inherits a lighthouse.",
  complication: "A stranger arrives with a claim.",
  resolution: "Nora chooses to share it.",
};

describe("task registry", () => {
  it("exposes every writing task", () => {
    expect(TASK_NAMES).toEqual([
      "premise",
      "storyline",
      "characters",
      "scenes",
      "nextLines",
      "polishScene",
      "shotList",
      "bibleSync",
      "translateScene",
      "storyboard",
      "translateStrings",
      "writeScene",
      "castPlan",
    ]);
  });

  it("builds a translation brief that pins the line count and cast names", () => {
    const input = {
      language: "Telugu",
      heading: "INT. LIGHTHOUSE - NIGHT",
      elements: [
        { type: "character", text: "NORA" },
        { type: "dialogue", text: "Who left these?" },
      ],
      characterNames: ["Nora"],
    };
    expect(TASKS.translateScene.input.safeParse(input).success).toBe(true);
    expect(TASKS.translateScene.input.safeParse({ ...input, language: "" }).success).toBe(false);
    const user = TASKS.translateScene.buildUser(input);
    expect(user).toContain('"Telugu"');
    expect(user).toContain("exactly 2 lines");
    expect(user).toContain("Nora");
  });

  it("tells the model how to write romanised languages like Telugish", () => {
    expect(TASKS.translateScene.system).toContain("Telugish");
    expect(TASKS.translateScene.system).toContain("Latin letters only");
  });

  it("validates storyline input before calling the model", () => {
    expect(TASKS.storyline.input.safeParse({ idea: "too short" }).success).toBe(
      false,
    );
    expect(
      TASKS.storyline.input.safeParse({
        idea: "A burned-out nurse inherits her father's lighthouse.",
      }).success,
    ).toBe(true);
  });

  it("passes role and existing names into the character brief", () => {
    const user = TASKS.characters.buildUser({
      correctedIdea: "A burned-out nurse inherits her father's lighthouse.",
      synopsis: {
        setup: "Nora inherits a lighthouse.",
        complication: "A stranger arrives with a claim.",
        resolution: "Nora chooses to share it.",
      },
      role: "antagonist",
      existingNames: ["Mara"],
    });

    expect(user).toContain('"role":"antagonist"');
    expect(user).toContain('"existingNames"');
    expect(user).toContain('"Mara"');
  });

  it("sends the story bible with every scene task", () => {
    for (const taskName of [
      "scenes",
      "nextLines",
      "polishScene",
      "shotList",
      "bibleSync",
    ] as const) {
      const user = TASKS[taskName].buildUser({
        correctedIdea: "A burned-out nurse inherits her father's lighthouse.",
        synopsis,
        bible,
        scene,
      });

      expect(user).toContain("Nora's father owned the lighthouse.");
      expect(user).toContain("wintry and restrained");
    }
  });

  it("passes the current scene into scene-scoped tasks", () => {
    const user = TASKS.nextLines.buildUser({
      correctedIdea: "A burned-out nurse inherits her father's lighthouse.",
      synopsis,
      bible,
      scene,
    });

    expect(user).toContain("INT. LIGHTHOUSE KITCHEN - NIGHT");
    expect(user).toContain("Nora sets a tin of letters on the table.");
  });

  it("rejects scene tasks without the story bible", () => {
    const result = TASKS.nextLines.input.safeParse({
      correctedIdea: "A burned-out nurse inherits her father's lighthouse.",
      synopsis,
      scene,
    });

    expect(result.success).toBe(false);
  });
});
