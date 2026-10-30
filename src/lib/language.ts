/** Languages offered for a project and for translation. "English" is the default. */
export const LANGUAGES = [
  "English",
  "Telugu",
  "Telugish",
  "Hindi",
  "Tamil",
  "Kannada",
  "Malayalam",
  "Bengali",
  "Marathi",
  "Gujarati",
  "Punjabi",
  "Urdu",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Italian",
  "Arabic",
  "Japanese",
  "Korean",
  "Chinese (Simplified)",
  "Russian",
  "Turkish",
  "Indonesian",
] as const;

export const DEFAULT_LANGUAGE = "English";

export const LANGUAGE_NOTE: Record<string, string> = {
  Telugish: "Telugu in English letters",
};

export const languageLabel = (name: string) =>
  LANGUAGE_NOTE[name] ? `${name} (${LANGUAGE_NOTE[name]})` : name;

/**
 * Language names are interpolated into prompts, so keep them to letters,
 * spaces, and a few separators. Returns the default for empty/invalid input.
 */
export function normalizeLanguage(raw: string | undefined | null): string {
  const cleaned = (raw ?? "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{M}\s()\-,.]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  return cleaned.length >= 2 ? cleaned : DEFAULT_LANGUAGE;
}

export const isEnglish = (language: string | undefined) =>
  !language || language.trim().toLowerCase() === "english";

/** Appended to a task's system prompt so everything it writes uses the project's language. */
export function languageDirective(language: string): string {
  const name = normalizeLanguage(language);
  return `

Project language: ${JSON.stringify(name)}.
- Write every piece of prose you generate (summaries, descriptions, dialogue, action, notes, explanations, captions) in ${name}, naturally and not word for word. If ${name} is a romanised form such as Telugish, Hinglish, or Tanglish, use Latin letters only.
- Keep JSON keys, enum values (for example "action", "character", "dialogue", "protagonist", "interior", "night"), and the INT./EXT. abbreviations at the start of scene headings exactly as the output format specifies, in English.
- Keep character names exactly as they appear in the input.`;
}

/** Browser speech-recognition code that matches a project language, if there is one. */
export const DICTATION_CODE: Record<string, string> = {
  English: "en-US",
  Telugu: "te-IN",
  Hindi: "hi-IN",
  Spanish: "es-ES",
  French: "fr-FR",
  German: "de-DE",
  Portuguese: "pt-BR",
};
