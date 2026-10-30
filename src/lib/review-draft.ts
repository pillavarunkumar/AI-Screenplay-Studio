import { autoFormatElement, checkScene, normalizeHeading, speakerName } from "./screenplay-format";
import type { StudioDraft } from "./schemas/draft";
import { isSceneWritten } from "./story-context";

export interface ReviewItem {
  id: string;
  ok: boolean;
  label: string;
  /** What is wrong (or a short note when fine). */
  detail?: string;
  /** What the "Fix it" button can do for this item. */
  fix?: "format" | "fill";
}

export interface DraftReview {
  /** Share of checks that pass, 0-100. */
  score: number;
  ready: boolean;
  items: ReviewItem[];
}

/** Unicode scripts that identify a language; Latin-script languages can't be told apart this way. */
const SCRIPT_FOR_LANGUAGE: Record<string, RegExp> = {
  Telugu: /\p{Script=Telugu}/u,
  Hindi: /\p{Script=Devanagari}/u,
  Marathi: /\p{Script=Devanagari}/u,
  Tamil: /\p{Script=Tamil}/u,
  Kannada: /\p{Script=Kannada}/u,
  Malayalam: /\p{Script=Malayalam}/u,
  Bengali: /\p{Script=Bengali}/u,
  Gujarati: /\p{Script=Gujarati}/u,
  Punjabi: /\p{Script=Gurmukhi}/u,
  Urdu: /\p{Script=Arabic}/u,
  Arabic: /\p{Script=Arabic}/u,
  Japanese: /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u,
  Korean: /\p{Script=Hangul}/u,
  "Chinese (Simplified)": /\p{Script=Han}/u,
  Russian: /\p{Script=Cyrillic}/u,
};

/** Share of the letters in `text` that belong to `script`. */
export function scriptRatio(text: string, script: RegExp): number {
  let letters = 0;
  let matching = 0;
  for (const char of text) {
    if (!/\p{L}/u.test(char)) continue;
    letters += 1;
    if (script.test(char)) matching += 1;
  }
  return letters === 0 ? 1 : matching / letters;
}

const names = (list: string[]) => (list.length > 3 ? `${list.slice(0, 3).join(", ")} and ${list.length - 3} more` : list.join(", "));

/** Checks a story the way an editor would before calling it a final draft. */
export function reviewDraft(draft: StudioDraft): DraftReview {
  const items: ReviewItem[] = [];
  const add = (item: ReviewItem) => items.push(item);
  const ordered = [...draft.scenes].sort((a, b) => a.order - b.order);
  const written = ordered.filter(isSceneWritten);
  const label = (scene: { order: number }) => String(scene.order + 1);

  add({
    id: "story",
    ok: draft.storyline !== null,
    label: "Your story is built",
    detail: draft.storyline ? undefined : "Build your story first.",
    fix: draft.storyline ? undefined : "fill",
  });

  const completeCast = draft.characters.filter((card) => {
    const p = card.profile;
    return p && [p.name, p.physicalDescription, p.personality, p.motivation, p.internalConflict, p.voice, p.arc].every((v) => v.trim());
  });
  const castOk = draft.characters.length >= 3 && completeCast.length === draft.characters.length;
  add({
    id: "cast",
    ok: castOk,
    label: "Every character is fully written",
    detail: castOk
      ? undefined
      : draft.characters.length < 3
        ? `Only ${draft.characters.length} character${draft.characters.length === 1 ? "" : "s"} so far. A story usually needs three or more.`
        : `${completeCast.length} of ${draft.characters.length} are done.`,
    fix: castOk ? undefined : "fill",
  });

  add({
    id: "scenes",
    ok: ordered.length >= 3,
    label: "The story is split into scenes",
    detail: ordered.length >= 3 ? `${ordered.length} scenes.` : "Plan at least 3 scenes.",
    fix: ordered.length >= 3 ? undefined : "fill",
  });

  const unwritten = ordered.filter((scene) => !isSceneWritten(scene));
  add({
    id: "written",
    ok: ordered.length > 0 && unwritten.length === 0,
    label: "Every scene has its script",
    detail: unwritten.length > 0 ? `Scene ${names(unwritten.map(label))} still empty.` : undefined,
    fix: ordered.length > 0 && unwritten.length === 0 ? undefined : "fill",
  });

  const thin = written.filter((scene) => scene.elements.filter((e) => e.type === "dialogue" && e.text.trim()).length < 2);
  add({
    id: "dialogue",
    ok: thin.length === 0,
    label: "Scenes have real dialogue",
    detail: thin.length > 0 ? `Scene ${names(thin.map(label))} has almost no dialogue.` : undefined,
  });

  const badFormat = written.filter((scene) => checkScene(scene).length > 0);
  const fixable = badFormat.every(
    (scene) =>
      checkScene({ heading: normalizeHeading(scene.heading), elements: scene.elements.map(autoFormatElement) }).length === 0,
  );
  add({
    id: "format",
    ok: badFormat.length === 0,
    label: "Script format is correct",
    detail: badFormat.length > 0 ? `Scene ${names(badFormat.map(label))} has format problems.` : undefined,
    fix: badFormat.length > 0 && fixable ? "format" : undefined,
  });

  const castNames = new Set(draft.characters.flatMap((card) => (card.profile?.name.trim() ? [speakerName(card.profile.name)] : [])));
  const speakers = new Map<string, number>();
  for (const scene of written) {
    for (const element of scene.elements) {
      if (element.type === "character" && element.text.trim()) {
        const key = speakerName(element.text);
        speakers.set(key, (speakers.get(key) ?? 0) + 1);
      }
    }
  }
  const strangers = [...speakers.keys()].filter((name) => !castNames.has(name));
  add({
    id: "speakers",
    ok: written.length === 0 || strangers.length <= 2,
    label: "Speakers match your cast",
    detail: strangers.length > 0 ? `Not in your cast: ${names(strangers)}.` : undefined,
  });

  const silent = [...castNames].filter((name, index) => index < 2 && written.length > 0 && !speakers.has(name));
  add({
    id: "leads",
    ok: silent.length === 0,
    label: "Your hero and rival both appear in the script",
    detail: silent.length > 0 ? `${names(silent)} never speaks.` : undefined,
  });

  const noCamera = ordered.filter((scene) => !scene.shotList);
  add({
    id: "camera",
    ok: ordered.length > 0 && noCamera.length === 0,
    label: "Every scene has a camera plan",
    detail: noCamera.length > 0 ? `Scene ${names(noCamera.map(label))} has none.` : undefined,
    fix: ordered.length > 0 && noCamera.length === 0 ? undefined : "fill",
  });

  const noBoard = ordered.filter((scene) => !scene.storyboard);
  add({
    id: "board",
    ok: ordered.length > 0 && noBoard.length === 0,
    label: "Every scene is storyboarded",
    detail: noBoard.length > 0 ? `Scene ${names(noBoard.map(label))} has none.` : undefined,
    fix: ordered.length > 0 && noBoard.length === 0 ? undefined : "fill",
  });

  add({
    id: "notebook",
    ok: draft.storyBible.tone.trim() !== "" && draft.storyBible.facts.length > 0,
    label: "The story notebook is filled in",
    detail: draft.storyBible.tone.trim() === "" ? "Add the tone." : draft.storyBible.facts.length === 0 ? "Add a few facts." : undefined,
  });

  const script = SCRIPT_FOR_LANGUAGE[draft.language];
  if (written.length > 0 && (script || draft.language.toLowerCase() === "english")) {
    const text = written.flatMap((scene) => scene.elements.filter((e) => e.type !== "character").map((e) => e.text)).join(" ");
    const ratio = script ? scriptRatio(text, script) : scriptRatio(text, /\p{Script=Latin}/u);
    add({
      id: "language",
      ok: ratio >= 0.6,
      label: `The script is written in ${draft.language}`,
      detail: ratio >= 0.6 ? undefined : `Only ${Math.round(ratio * 100)}% of the script reads as ${draft.language}. Use “Story language” to convert it.`,
    });
  }

  const passed = items.filter((item) => item.ok).length;
  return { score: Math.round((passed / items.length) * 100), ready: passed === items.length, items };
}
