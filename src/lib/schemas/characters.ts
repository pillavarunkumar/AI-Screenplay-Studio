import { z } from "zod";
import { StorylineSynopsisSchema } from "./storyline";

export const CharacterRoleSchema = z.enum([
  "protagonist",
  "antagonist",
  "supporting",
]);

export type CharacterRole = z.infer<typeof CharacterRoleSchema>;

/**
 * Storage/editing shape: every field may be temporarily empty while the writer
 * edits. Autosave must never make the whole draft unreadable.
 */
export const CharacterProfileDraftSchema = z.object({
  name: z.string().max(80),
  alternateNames: z.array(z.string().max(80)).max(4),
  physicalDescription: z.string().max(800),
  personality: z.string().max(800),
  motivation: z.string().max(800),
  internalConflict: z.string().max(800),
  voice: z.string().max(800),
  arc: z.string().max(800),
});

export type CharacterProfileDraft = z.infer<typeof CharacterProfileDraftSchema>;

const REQUIRED_PROFILE_FIELDS = [
  "name",
  "physicalDescription",
  "personality",
  "motivation",
  "internalConflict",
  "voice",
  "arc",
] as const;

/**
 * Model output must be complete. Empty fields fail validation, which triggers
 * the shared one-retry repair loop.
 */
export const CharacterProfileSchema = CharacterProfileDraftSchema.superRefine(
  (profile, context) => {
    for (const field of REQUIRED_PROFILE_FIELDS) {
      if (profile[field].trim().length === 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: "Required",
        });
      }
    }
  },
);

export type CharacterProfile = z.infer<typeof CharacterProfileSchema>;

export const CharacterInputSchema = z.object({
  correctedIdea: z.string().min(1).max(2_000),
  synopsis: StorylineSynopsisSchema,
  role: CharacterRoleSchema,
  /** Names already used by other cards, so suggestions stay distinct. */
  existingNames: z.array(z.string().min(1).max(80)).max(20).default([]),
  /** Who this character is in the story, from the cast plan. The profile must keep every fact in it. */
  brief: z.string().max(300).optional(),
  /** The writer's own name for this character; used exactly when present. */
  suggestedName: z.string().max(80).optional(),
});

export type CharacterInput = z.infer<typeof CharacterInputSchema>;

export const CastPlanInputSchema = z.object({
  /** What the writer originally typed or said (names and roles mentioned there must survive). */
  idea: z.string().max(2_000).default(""),
  correctedIdea: z.string().min(1).max(2_000),
  synopsis: StorylineSynopsisSchema,
});
export type CastPlanInput = z.infer<typeof CastPlanInputSchema>;

export const CastPlanOutputSchema = z
  .object({
    characters: z
      .array(
        z.object({
          role: CharacterRoleSchema,
          /** The writer's name for them, or empty when the story doesn't name them. */
          name: z.string().max(80).default(""),
          brief: z.string().min(1).max(300),
        }),
      )
      .min(2)
      .max(6),
  })
  .superRefine((plan, context) => {
    const heroes = plan.characters.filter((c) => c.role === "protagonist").length;
    if (heroes !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["characters"],
        message: `There must be exactly one protagonist (found ${heroes}).`,
      });
    }
  });
export type CastPlanOutput = z.infer<typeof CastPlanOutputSchema>;
