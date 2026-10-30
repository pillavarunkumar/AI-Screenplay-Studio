import { z } from "zod";
import {
  CharacterProfileDraftSchema,
  CharacterRoleSchema,
} from "./characters";
import { SceneSchema, ScriptElementTypeSchema } from "./scene";
import { EMPTY_STORY_BIBLE, StoryBibleSchema } from "./story-bible";
import { StorylineOutputSchema } from "./storyline";

export const CharacterCardSchema = z.object({
  id: z.string().min(1),
  role: CharacterRoleSchema,
  /** Null until this card's generation succeeds. */
  profile: CharacterProfileDraftSchema.nullable(),
  /** From the cast plan: who this character is, and the writer's own name for them if given. */
  brief: z.string().max(300).optional(),
  suggestedName: z.string().max(80).optional(),
});

export type CharacterCard = z.infer<typeof CharacterCardSchema>;

/** A translated copy of the script, saved with the story so it is never lost on reload. */
export const SavedTranslationSchema = z.object({
  language: z.string().min(2).max(60),
  /** Short fingerprint of the original script when this was translated; a mismatch means "out of date". */
  signature: z.string().max(64),
  scenes: z
    .array(
      z.object({
        heading: z.string().max(400),
        elements: z
          .array(z.object({ type: ScriptElementTypeSchema, text: z.string().max(4_000) }))
          .max(120),
      }),
    )
    .max(20),
});

export type SavedTranslation = z.infer<typeof SavedTranslationSchema>;

export const StudioDraftSchema = z.object({
  schemaVersion: z.literal(1),
  /** Language the whole story is written in; AI output follows it. */
  language: z.string().min(2).max(60).default("English"),
  idea: z.string().max(2_000),
  storyline: StorylineOutputSchema.nullable(),
  /** The idea text that produced `storyline`, used to flag stale results. */
  storylineSourceIdea: z.string().max(2_000),
  characters: z.array(CharacterCardSchema).max(8),
  storyBible: StoryBibleSchema.default(EMPTY_STORY_BIBLE),
  scenes: z.array(SceneSchema).max(20).default([]),
  translations: z.array(SavedTranslationSchema).max(4).default([]),
});

export type StudioDraft = z.infer<typeof StudioDraftSchema>;

export const EMPTY_DRAFT: StudioDraft = {
  schemaVersion: 1,
  language: "English",
  idea: "",
  storyline: null,
  storylineSourceIdea: "",
  characters: [],
  storyBible: EMPTY_STORY_BIBLE,
  scenes: [],
  translations: [],
};
