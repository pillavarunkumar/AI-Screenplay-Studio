import { ApiError, type callLlm } from "./api-client";
import { callWithRateLimitRetry } from "./llm-retry";
import { speakerName } from "./screenplay-format";
import type { StudioDraft } from "./schemas/draft";

type Kind = "name" | "cue" | "text";

/** Applies `fn` to every human-readable string in a draft; structure and enums are untouched. */
export function mapDraftStrings(
  draft: StudioDraft,
  fn: (text: string, kind: Kind) => string,
): StudioDraft {
  const t = (text: string, kind: Kind = "text") => (text.trim() ? fn(text, kind) : text);

  return {
    ...draft,
    idea: t(draft.idea),
    storylineSourceIdea: t(draft.storylineSourceIdea),
    storyline: draft.storyline && {
      ...draft.storyline,
      correctedIdea: t(draft.storyline.correctedIdea),
      corrections: draft.storyline.corrections.map((c) => t(c)),
      synopsis: {
        setup: t(draft.storyline.synopsis.setup),
        complication: t(draft.storyline.synopsis.complication),
        resolution: t(draft.storyline.synopsis.resolution),
      },
      whyThisStructure: t(draft.storyline.whyThisStructure),
      analysis: draft.storyline.analysis && {
        centralQuestion: t(draft.storyline.analysis.centralQuestion),
        want: t(draft.storyline.analysis.want),
        need: t(draft.storyline.analysis.need),
        stakes: t(draft.storyline.analysis.stakes),
        theme: t(draft.storyline.analysis.theme),
        strengths: draft.storyline.analysis.strengths.map((x) => t(x)),
        toStrengthen: draft.storyline.analysis.toStrengthen.map((x) => t(x)),
      },
    },
    characters: draft.characters.map((card) => ({
      ...card,
      profile: card.profile && {
        name: t(card.profile.name, "name"),
        alternateNames: card.profile.alternateNames.map((n) => t(n, "name")),
        physicalDescription: t(card.profile.physicalDescription),
        personality: t(card.profile.personality),
        motivation: t(card.profile.motivation),
        internalConflict: t(card.profile.internalConflict),
        voice: t(card.profile.voice),
        arc: t(card.profile.arc),
      },
    })),
    storyBible: {
      tone: t(draft.storyBible.tone),
      characters: draft.storyBible.characters.map((c) => ({
        name: t(c.name, "name"),
        role: t(c.role),
        summary: t(c.summary),
      })),
      facts: draft.storyBible.facts.map((f) => t(f)),
    },
    scenes: draft.scenes.map((scene) => ({
      ...scene,
      heading: t(scene.heading),
      summary: t(scene.summary),
      elements: scene.elements.map((element) => ({
        ...element,
        text: t(element.text, element.type === "character" ? "cue" : "text"),
      })),
      shotList: scene.shotList && {
        ...scene.shotList,
        coverageNotes: t(scene.shotList.coverageNotes),
        shots: scene.shotList.shots.map((shot) => ({
          ...shot,
          shotType: t(shot.shotType),
          cameraAngle: t(shot.cameraAngle),
          movement: t(shot.movement),
          description: t(shot.description),
          reasoning: t(shot.reasoning),
        })),
      },
      storyboard: scene.storyboard && {
        panels: scene.storyboard.panels.map((panel) => ({
          ...panel,
          shotType: t(panel.shotType),
          cameraAngle: t(panel.cameraAngle),
          caption: t(panel.caption),
          dialogue: t(panel.dialogue),
        })),
      },
    })),
  };
}

/** `NORA (V.O.)` → name `NORA`, suffix ` (V.O.)`. */
function splitCue(cue: string): { name: string; suffix: string } {
  const match = cue.trim().match(/^(.*?)((?:\s*\([^)]*\))*)$/);
  return { name: (match?.[1] ?? cue).trim(), suffix: match?.[2] ?? "" };
}

const nameKey = (name: string) => speakerName(name).toLowerCase();

// Small batches: scripts like Devanagari and Telugu need several times more
// output tokens than English, and a reply that hits the model's completion
// limit comes back as an upstream 400 instead of partial JSON.
const MAX_BATCH_STRINGS = 12;
const MAX_BATCH_CHARS = 1_800;

/** Errors that a smaller request can plausibly avoid (too long, malformed, or lost count). */
const SPLITTABLE = new Set(["llm_upstream_error", "llm_bad_json", "llm_schema_mismatch", "llm_invalid_response", "llm_timeout"]);

function batches(strings: string[]): string[][] {
  const out: string[][] = [];
  let current: string[] = [];
  let chars = 0;
  for (const text of strings) {
    if (current.length > 0 && (current.length >= MAX_BATCH_STRINGS || chars + text.length > MAX_BATCH_CHARS)) {
      out.push(current);
      current = [];
      chars = 0;
    }
    current.push(text);
    chars += text.length;
  }
  if (current.length > 0) out.push(current);
  return out;
}

export interface ConvertOptions {
  /** Finished translations survive a failure, so Retry resumes instead of restarting. */
  cache?: Map<string, string>;
  call?: typeof callLlm;
  isCancelled?: () => boolean;
  onProgress?: (progress: { done: number; total: number; note?: string }) => void;
}

/** Counts the model calls a conversion would need (used for the confirm prompt and progress bar). */
export function countUniqueStrings(draft: StudioDraft): number {
  const seen = new Set<string>();
  mapDraftStrings(draft, (text) => (seen.add(text), text));
  return seen.size;
}

/**
 * Converts every field of a story to `language`.
 * 1) Character names are transliterated into a glossary, so a name is spelled
 *    one way in profiles, the bible, cues, and prose.
 * 2) All other text is translated in batches, with the glossary attached.
 */
export async function convertDraft(
  draft: StudioDraft,
  language: string,
  options: ConvertOptions = {},
): Promise<StudioDraft> {
  const cache = options.cache ?? new Map<string, string>();
  const cancelled = () => options.isCancelled?.() ?? false;

  // Gather names (profile/bible names and the speakers named in cues) and prose.
  const names = new Map<string, string>(); // lowercase key → source spelling
  const texts = new Set<string>();
  mapDraftStrings(draft, (text, kind) => {
    if (kind === "name") {
      const key = nameKey(text);
      if (!names.has(key)) names.set(key, text.trim());
    } else if (kind === "cue") {
      const { name } = splitCue(text);
      const key = nameKey(name);
      if (key && !names.has(key)) names.set(key, name);
    } else {
      texts.add(text);
    }
    return text;
  });

  const nameBatches = batches([...names.values()].filter((n) => !cache.has(`name:${n}`)));
  const textBatches = batches([...texts].filter((s) => !cache.has(`text:${s}`)));
  const total = nameBatches.length + textBatches.length;
  let done = 0;
  const report = (note?: string) => options.onProgress?.({ done, total, note });
  report();

  const run = async (
    kind: "names" | "text",
    strings: string[],
    glossary: { from: string; to: string }[],
  ): Promise<string[]> => {
    const split = async () => {
      // Convert each half separately; a single string that still fails is a real error.
      const middle = Math.ceil(strings.length / 2);
      return [
        ...(await run(kind, strings.slice(0, middle), glossary)),
        ...(await run(kind, strings.slice(middle), glossary)),
      ];
    };

    let data: { strings: string[] };
    try {
      ({ data } = await callWithRateLimitRetry<{ strings: string[] }>(
        "translateStrings",
        { language, kind, glossary, strings },
        { call: options.call, onRateLimited: (s) => report(`The AI needs a short break. Continuing in ${s}s…`) },
      ));
    } catch (error) {
      if (strings.length > 1 && error instanceof ApiError && SPLITTABLE.has(error.code)) {
        return split();
      }
      throw error;
    }

    if (data.strings.length === strings.length) return data.strings;
    if (strings.length === 1) {
      throw new ApiError("llm_schema_mismatch", "The conversion dropped or added text. Try again.", 502);
    }
    return split();
  };

  const convert = async (kind: "names" | "text", list: string[][], glossary: { from: string; to: string }[]) => {
    for (const batch of list) {
      if (cancelled()) throw new ApiError("internal", "Conversion cancelled.", 0);
      const result = await run(kind, batch, glossary);
      batch.forEach((source, index) => cache.set(`${kind === "names" ? "name" : "text"}:${source}`, result[index]));
      done += 1;
      report();
    }
  };

  await convert("names", nameBatches, []);
  const glossary = [...names.values()]
    .map((from) => ({ from, to: cache.get(`name:${from}`) ?? from }))
    .slice(0, 40);
  await convert("text", textBatches, glossary);

  const translatedName = (source: string) => cache.get(`name:${names.get(nameKey(source)) ?? source.trim()}`) ?? source;

  const converted = mapDraftStrings(draft, (text, kind) => {
    if (kind === "name") return translatedName(text);
    if (kind === "cue") {
      const { name, suffix } = splitCue(text);
      return `${translatedName(name).toUpperCase()}${suffix}`;
    }
    return cache.get(`text:${text}`) ?? text;
  });

  // Saved translations were made from the old text, so they no longer apply.
  return { ...converted, language, translations: [] };
}
