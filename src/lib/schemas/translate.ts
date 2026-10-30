import { z } from "zod";
import { ScriptElementTypeSchema } from "./scene";

export const TranslateSceneInputSchema = z.object({
  /** Any language the writer names, e.g. "Telugu" or "Brazilian Portuguese". */
  language: z.string().trim().min(2, "Name a language.").max(60),
  heading: z.string().max(200),
  /** Non-blank script lines only; the reply must have one line per entry. */
  elements: z
    .array(z.object({ type: ScriptElementTypeSchema, text: z.string().min(1).max(2_000) }))
    .max(120),
  characterNames: z.array(z.string().min(1).max(80)).max(20),
});

export type TranslateSceneInput = z.infer<typeof TranslateSceneInputSchema>;

export const TranslateSceneOutputSchema = z.object({
  heading: z.string().max(400),
  lines: z.array(z.string().max(4_000)).max(120),
});

export type TranslateSceneOutput = z.infer<typeof TranslateSceneOutputSchema>;
