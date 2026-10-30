/** Appends a dictated chunk to existing text with sensible spacing and casing. */
export function appendDictation(existing: string, chunk: string, max = 2_000): string {
  const spoken = chunk.trim().replace(/\s+/g, " ");
  if (!spoken) return existing;

  const base = existing.replace(/\s+$/, "");
  const startsSentence = base === "" || /[.!?]["')\]]*$/.test(base);
  const text = startsSentence
    ? spoken.charAt(0).toUpperCase() + spoken.slice(1)
    : spoken;

  return (base ? `${base} ${text}` : text).slice(0, max);
}

export const DICTATION_LANGUAGES = [
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "en-IN", label: "English (India)" },
  { code: "hi-IN", label: "हिन्दी" },
  { code: "te-IN", label: "తెలుగు" },
  { code: "es-ES", label: "Español" },
  { code: "fr-FR", label: "Français" },
  { code: "de-DE", label: "Deutsch" },
  { code: "pt-BR", label: "Português" },
] as const;
