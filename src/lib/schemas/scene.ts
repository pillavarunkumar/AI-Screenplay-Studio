import { z } from "zod";
import { StorylineSynopsisSchema } from "./storyline";
import { StoryBibleSchema } from "./story-bible";
import { StoryboardSchema } from "./storyboard";

export const ScriptElementTypeSchema = z.enum([
  "action",
  "character",
  "dialogue",
  "parenthetical",
  "transition",
]);

export type ScriptElementType = z.infer<typeof ScriptElementTypeSchema>;

export const ScriptElementSchema = z.object({
  id: z.string().min(1),
  type: ScriptElementTypeSchema,
  text: z.string().max(2_000),
});

export type ScriptElement = z.infer<typeof ScriptElementSchema>;

export const ShotSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().nonnegative(),
  shotType: z.string().min(1).max(80),
  cameraAngle: z.string().min(1).max(80),
  movement: z.string().min(1).max(80),
  description: z.string().min(1).max(600),
  reasoning: z.string().min(1).max(600),
});

export type Shot = z.infer<typeof ShotSchema>;

export const ShotListSchema = z.object({
  shots: z.array(ShotSchema).max(30),
  coverageNotes: z.string().max(1_000),
});

export type ShotList = z.infer<typeof ShotListSchema>;

export const SceneSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().nonnegative(),
  heading: z.string().max(200),
  summary: z.string().max(1_000),
  elements: z.array(ScriptElementSchema).max(120),
  shotList: ShotListSchema.nullable(),
  storyboard: StoryboardSchema.nullish(),
});

export type Scene = z.infer<typeof SceneSchema>;

/** Input shape for scene-scoped model calls. Blank fields are allowed. */
export const SceneForAiSchema = z.object({
  heading: z.string().max(200),
  summary: z.string().max(1_000),
  elements: z.array(ScriptElementSchema).max(120),
});

export type SceneForAi = z.infer<typeof SceneForAiSchema>;

export const sceneContextShape = {
  correctedIdea: z.string().min(1).max(2_000),
  synopsis: StorylineSynopsisSchema,
  bible: StoryBibleSchema,
  scene: SceneForAiSchema,
};

export const ScenePlanInputSchema = z.object({
  correctedIdea: z.string().min(1).max(2_000),
  synopsis: StorylineSynopsisSchema,
  bible: StoryBibleSchema,
});

export type ScenePlanInput = z.infer<typeof ScenePlanInputSchema>;

export const ScenePlanOutputSchema = z.object({
  /** A short phrase for the story's feel (e.g. "wintry and restrained"); fills an empty notebook tone. */
  tone: z.string().max(200).optional(),
  scenes: z
    .array(
      z.object({
        heading: z.string().min(1).max(200),
        summary: z.string().min(1).max(1_000),
      }),
    )
    .min(2)
    .max(8),
});

export type ScenePlanOutput = z.infer<typeof ScenePlanOutputSchema>;

export const NextLinesInputSchema = z.object(sceneContextShape);
export type NextLinesInput = z.infer<typeof NextLinesInputSchema>;

export const NextLineSuggestionSchema = z.object({
  type: ScriptElementTypeSchema,
  text: z.string().min(1).max(1_200),
  /** The craft technique being used, e.g. "subtext" or "plant and payoff". */
  technique: z.string().min(1).max(80),
  /** Why this line works and how it uses the technique. */
  why: z.string().min(1).max(400),
});

export const NextLinesOutputSchema = z.object({
  suggestions: z.array(NextLineSuggestionSchema).min(2).max(4),
});

export type NextLinesOutput = z.infer<typeof NextLinesOutputSchema>;
export type NextLineSuggestion = z.infer<typeof NextLineSuggestionSchema>;

export const PolishSceneInputSchema = z.object(sceneContextShape);
export type PolishSceneInput = z.infer<typeof PolishSceneInputSchema>;

export const PolishSceneOutputSchema = z.object({
  heading: z.string().min(1).max(200),
  elements: z
    .array(
      z.object({
        type: ScriptElementTypeSchema,
        text: z.string().min(1).max(2_000),
      }),
    )
    .min(1)
    .max(120),
  changes: z.array(z.string().min(1).max(200)).max(10),
});

export type PolishSceneOutput = z.infer<typeof PolishSceneOutputSchema>;

export const ShotListInputSchema = z.object(sceneContextShape);
export type ShotListInput = z.infer<typeof ShotListInputSchema>;

export const ShotListOutputSchema = z.object({
  shots: z
    .array(
      z.object({
        shotType: z.string().min(1).max(80),
        cameraAngle: z.string().min(1).max(80),
        movement: z.string().min(1).max(80),
        description: z.string().min(1).max(600),
        reasoning: z.string().min(1).max(600),
      }),
    )
    .min(1)
    .max(20),
  coverageNotes: z.string().max(1_000),
});

export type ShotListOutput = z.infer<typeof ShotListOutputSchema>;

export const BibleSyncInputSchema = z.object(sceneContextShape);
export type BibleSyncInput = z.infer<typeof BibleSyncInputSchema>;

export const BibleSyncOutputSchema = z.object({
  newFacts: z.array(z.string().min(1).max(300)).max(8),
});

export type BibleSyncOutput = z.infer<typeof BibleSyncOutputSchema>;

/** What the scene writer needs to know about each character, kept short. */
export const CastDetailSchema = z.object({
  name: z.string().min(1).max(80),
  role: z.string().max(40),
  personality: z.string().max(400),
  motivation: z.string().max(400),
  voice: z.string().max(400),
});
export type CastDetail = z.infer<typeof CastDetailSchema>;

export const WriteSceneInputSchema = z.object({
  ...sceneContextShape,
  cast: z.array(CastDetailSchema).max(8).default([]),
  /** The scenes just before this one, so the story flows and nothing repeats. */
  previousScenes: z
    .array(
      z.object({
        heading: z.string().max(200),
        summary: z.string().max(1_000),
        lastLines: z.string().max(1_500),
      }),
    )
    .max(3)
    .default([]),
  position: z.object({ index: z.number().int().min(0), total: z.number().int().min(1) }),
});
export type WriteSceneInput = z.infer<typeof WriteSceneInputSchema>;

const FLOW_OK_BEFORE_DIALOGUE = new Set<string>(["character", "parenthetical"]);

export const WriteSceneOutputSchema = z
  .object({
    heading: z.string().min(1).max(200),
    elements: z
      .array(z.object({ type: ScriptElementTypeSchema, text: z.string().min(1).max(2_000) }))
      .min(6)
      .max(40),
  })
  .superRefine((scene, context) => {
    // Script-format flow, so a bad draft is repaired by the model's retry instead of saved.
    scene.elements.forEach((element, index) => {
      const next = scene.elements[index + 1]?.type;
      const previous = scene.elements[index - 1]?.type;
      const path = ["elements", index, "type"];

      if (element.type === "character" && next !== "dialogue" && next !== "parenthetical") {
        context.addIssue({ code: z.ZodIssueCode.custom, path, message: `Character cue "${element.text}" must be followed by dialogue.` });
      }
      if (element.type === "dialogue" && (!previous || !FLOW_OK_BEFORE_DIALOGUE.has(previous))) {
        context.addIssue({ code: z.ZodIssueCode.custom, path, message: "Dialogue must come right after a character cue (or its parenthetical)." });
      }
      if (element.type === "parenthetical" && previous !== "character" && previous !== "dialogue") {
        context.addIssue({ code: z.ZodIssueCode.custom, path, message: "A parenthetical belongs under a character cue or inside dialogue." });
      }
    });
    const dialogueCount = scene.elements.filter((element) => element.type === "dialogue").length;
    const parentheticalCount = scene.elements.filter((element) => element.type === "parenthetical").length;
    if (parentheticalCount > Math.max(1, Math.floor(dialogueCount / 4))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["elements"],
        message: `Too many parentheticals (${parentheticalCount} for ${dialogueCount} lines of dialogue). Use at most one per four lines and show emotion through action instead.`,
      });
    }
    if (!scene.elements.some((element) => element.type === "dialogue")) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["elements"], message: "The scene needs dialogue." });
    }
    if (!scene.elements.some((element) => element.type === "action")) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["elements"], message: "The scene needs action lines." });
    }
  });
export type WriteSceneOutput = z.infer<typeof WriteSceneOutputSchema>;
