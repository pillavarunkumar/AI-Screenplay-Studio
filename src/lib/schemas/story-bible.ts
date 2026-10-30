import { z } from "zod";

/**
 * Editable story bible. Sent with every scene-related model request and
 * persisted with the draft. Fields are intentionally permissive because the
 * writer can leave them blank while working.
 */
export const BibleCharacterSchema = z.object({
  name: z.string().max(80),
  role: z.string().max(40),
  summary: z.string().max(400),
});

export type BibleCharacter = z.infer<typeof BibleCharacterSchema>;

export const StoryBibleSchema = z.object({
  tone: z.string().max(200),
  characters: z.array(BibleCharacterSchema).max(12),
  facts: z.array(z.string().max(300)).max(40),
});

export type StoryBible = z.infer<typeof StoryBibleSchema>;

export const EMPTY_STORY_BIBLE: StoryBible = {
  tone: "",
  characters: [],
  facts: [],
};
