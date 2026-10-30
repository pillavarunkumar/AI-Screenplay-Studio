import { readFileSync } from "node:fs";
import { z } from "zod";
import {
  SceneForAiSchema,
  type SceneForAi,
} from "../../src/lib/schemas/scene";
import { StoryBibleSchema, type StoryBible } from "../../src/lib/schemas/story-bible";
import {
  StorylineSynopsisSchema,
  type StorylineSynopsis,
} from "../../src/lib/schemas/storyline";

export const STUB_FLAVORS = [
  "strong",
  "generic-technique",
  "contradiction",
  "tone-deaf",
] as const;

export const EvalSampleSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(160),
  correctedIdea: z.string().min(1).max(2_000),
  synopsis: StorylineSynopsisSchema,
  bible: StoryBibleSchema,
  scene: SceneForAiSchema,
  rubric: z.object({
    /** Words that should feel at home in this scene's tone. */
    emotionKeywords: z.array(z.string().min(1)).min(1).max(20),
    /** Words that signal the model missed the tone. */
    antiEmotionKeywords: z.array(z.string().min(1)).max(20).default([]),
    /** Story anchors a consistent response can reference. */
    expectedMentions: z.array(z.string().min(1)).max(20).default([]),
    /** Phrases that would contradict the story bible. */
    forbiddenMentions: z.array(z.string().min(1)).max(20).default([]),
  }),
  /** Only used by the deterministic stub; live runs ignore it. */
  stubFlavor: z.enum(STUB_FLAVORS).default("strong"),
});

export type EvalSample = z.infer<typeof EvalSampleSchema> & {
  synopsis: StorylineSynopsis;
  bible: StoryBible;
  scene: SceneForAi;
};

export const EvalSampleListSchema = z
  .array(EvalSampleSchema)
  .min(8, "Keep at least 8 samples so the eval covers a range of stories.")
  .max(10, "Keep at most 10 samples so the eval stays quick.");

export function parseSamples(raw: unknown): EvalSample[] {
  return EvalSampleListSchema.parse(raw) as EvalSample[];
}

export function loadSamples(): EvalSample[] {
  const raw = JSON.parse(
    readFileSync(new URL("../storylines.json", import.meta.url), "utf8"),
  ) as unknown;
  return parseSamples(raw);
}
