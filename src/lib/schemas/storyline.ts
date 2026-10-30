import { z } from "zod";

export const StorylineInputSchema = z.object({
  idea: z
    .string()
    .trim()
    .min(10, "Describe your idea in at least 10 characters.")
    .max(2_000),
});

export type StorylineInput = z.infer<typeof StorylineInputSchema>;

export const StorylineSynopsisSchema = z.object({
  setup: z.string().min(1).max(1_200),
  complication: z.string().min(1).max(1_200),
  resolution: z.string().min(1).max(1_200),
});

export type StorylineSynopsis = z.infer<typeof StorylineSynopsisSchema>;

/** The story analysis shown beside the synopsis. Optional so older saved stories still load. */
export const StorylineAnalysisSchema = z.object({
  /** The yes/no tension the whole story answers, as a question. */
  centralQuestion: z.string().min(1).max(300),
  /** What the protagonist consciously wants. */
  want: z.string().min(1).max(300),
  /** What they actually need (the lesson or change), usually in tension with the want. */
  need: z.string().min(1).max(300),
  /** What is lost if they fail, concretely. */
  stakes: z.string().min(1).max(400),
  theme: z.string().min(1).max(300),
  /** What already works, tied to specifics of this idea. */
  strengths: z.array(z.string().min(1).max(250)).min(1).max(3),
  /** Concrete, actionable ways to make the story stronger. */
  toStrengthen: z.array(z.string().min(1).max(250)).min(1).max(3),
});

export type StorylineAnalysis = z.infer<typeof StorylineAnalysisSchema>;

export const StorylineOutputSchema = z.object({
  /** The writer's idea with spelling/grammar/clarity fixed, intent preserved. */
  correctedIdea: z.string().min(1).max(2_000),
  /** Short, human-readable notes on what was fixed. May be empty. */
  corrections: z.array(z.string().min(1).max(200)).max(8),
  synopsis: StorylineSynopsisSchema,
  /** Two to four sentences on why this shape fits this story. */
  whyThisStructure: z.string().min(1).max(1_000),
  analysis: StorylineAnalysisSchema.optional(),
});

/** What the model must return: the analysis is required for new storylines. */
export const StorylineModelOutputSchema = StorylineOutputSchema.required({ analysis: true });

export type StorylineOutput = z.infer<typeof StorylineOutputSchema>;

const TRIVIAL_FIX = /\b(capitali[sz]|punctuat|full stop|period|comma|apostrophe|hyphen|spacing|whitespace|lowercase|uppercase|case\b)/i;

/**
 * Models pad "what we fixed" with capital letters and full stops. Keep only the
 * fixes that changed meaning or clarity, so the list stays worth reading.
 */
export function dropTrivialCorrections<T extends { corrections: string[] }>(storyline: T): T {
  return { ...storyline, corrections: storyline.corrections.filter((note) => !TRIVIAL_FIX.test(note)) };
}
