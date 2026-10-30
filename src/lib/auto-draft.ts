import { ApiError, type callLlm } from "./api-client";
import { callWithRateLimitRetry } from "./llm-retry";
import { bibleCast, isSceneWritten, sceneContext, writeSceneInput } from "./story-context";
import { mergeBibleFacts } from "./story-bible";
import { autoFormatElement, normalizeHeading } from "./screenplay-format";
import type { CastPlanOutput, CharacterProfile } from "./schemas/characters";
import type { StudioDraft } from "./schemas/draft";
import type {
  BibleSyncOutput,
  Scene,
  ScenePlanOutput,
  ShotListOutput,
  WriteSceneOutput,
} from "./schemas/scene";
import type { StorylineOutput } from "./schemas/storyline";
import type { Storyboard } from "./schemas/storyboard";

/** Rough scene count used for the progress bar before the scenes are planned. */
const EXPECTED_SCENES = 5;

export interface AutoDraftProgress {
  label: string;
  done: number;
  total: number;
  note?: string;
}

export interface AutoDraftOptions {
  call?: typeof callLlm;
  isCancelled?: () => boolean;
  /** Called after every finished step with the updated story, so work is saved as it goes. */
  onDraft?: (draft: StudioDraft) => void;
  onProgress?: (progress: AutoDraftProgress) => void;
}

const isWritten = (card: StudioDraft["characters"][number]) => Boolean(card.profile?.name.trim());

/** How many AI steps are still missing; the same logic decides what to run. */
export function remainingSteps(draft: StudioDraft): number {
  let steps = 0;
  if (!draft.storyline) steps += 1;
  // No cast yet: one planning call, then roughly four characters. Otherwise, the ones still unwritten.
  steps += draft.characters.length === 0 ? 1 + 4 : draft.characters.filter((card) => !isWritten(card)).length;
  if (draft.scenes.length === 0) {
    steps += 1 + EXPECTED_SCENES * 4;
  } else {
    for (const scene of draft.scenes) {
      if (!isSceneWritten(scene)) steps += 2; // write + notebook facts
      if (!scene.shotList) steps += 1;
      if (!scene.storyboard) steps += 1;
    }
  }
  return steps;
}

/**
 * Finishes a story with AI, in order: story → characters → scene plan → each
 * scene's script (+ its facts into the notebook) → camera plans → storyboards.
 *
 * It only fills in what is MISSING and never overwrites anything the writer
 * already has, so it doubles as "resume" after a failure or cancel.
 */
export async function runAutoDraft(initial: StudioDraft, options: AutoDraftOptions = {}): Promise<StudioDraft> {
  let draft = initial;
  let done = 0;
  const cancelled = () => options.isCancelled?.() ?? false;

  const report = (label: string, note?: string) =>
    options.onProgress?.({ label, done, total: done + remainingSteps(draft), note });

  const ask = async <T>(task: string, input: unknown, label: string): Promise<T> => {
    if (cancelled()) throw new ApiError("internal", "Cancelled.", 0);
    report(label);
    const { data } = await callWithRateLimitRetry<T>(task, input, {
      call: options.call,
      language: draft.language,
      onRateLimited: (seconds) => report(label, `The AI needs a short break. Continuing in ${seconds}s…`),
    });
    done += 1;
    return data;
  };

  const commit = (next: StudioDraft) => {
    draft = next;
    options.onDraft?.(draft);
  };

  const updateScene = (id: string, patch: Partial<Scene>) =>
    commit({ ...draft, scenes: draft.scenes.map((scene) => (scene.id === id ? { ...scene, ...patch } : scene)) });

  // 1. The story spine.
  if (!draft.storyline) {
    const idea = draft.idea.trim();
    if (idea.length < 10) throw new ApiError("invalid_input", "Write your idea first (at least 10 characters).", 400);
    const storyline = await ask<StorylineOutput>("storyline", { idea }, "Shaping your story");
    commit({ ...draft, storyline, storylineSourceIdea: idea });
  }

  // 2. Work out WHO is in the story (every character the idea mentions, 3 to 6), then write each
  //    one in turn so names stay distinct. A writer's own names and roles are kept.
  if (draft.characters.length === 0) {
    const plan = await ask<CastPlanOutput>(
      "castPlan",
      { idea: draft.idea, correctedIdea: draft.storyline!.correctedIdea, synopsis: draft.storyline!.synopsis },
      "Finding the characters in your story",
    );
    commit({
      ...draft,
      characters: plan.characters.map((planned) => ({
        id: crypto.randomUUID(),
        role: planned.role,
        profile: null,
        brief: planned.brief,
        suggestedName: planned.name.trim() || undefined,
      })),
    });
  }

  for (const card of [...draft.characters]) {
    if (isWritten(card)) continue;
    const existingNames = draft.characters.flatMap((other) => (other.profile?.name ? [other.profile.name] : []));
    const position = draft.characters.findIndex((other) => other.id === card.id) + 1;
    const profile = await ask<CharacterProfile>(
      "characters",
      {
        correctedIdea: draft.storyline!.correctedIdea,
        synopsis: draft.storyline!.synopsis,
        role: card.role,
        existingNames,
        brief: card.brief,
        suggestedName: card.suggestedName,
      },
      `Writing character ${position} of ${draft.characters.length}${card.suggestedName ? `: ${card.suggestedName}` : ""}`,
    );
    commit({ ...draft, characters: draft.characters.map((other) => (other.id === card.id ? { ...other, profile } : other)) });
  }

  // The notebook lists the cast, so every later step stays consistent with it.
  const cast = bibleCast(draft);
  if (cast.length > 0 && draft.storyBible.characters.length === 0) {
    commit({ ...draft, storyBible: { ...draft.storyBible, characters: cast } });
  }

  // 3. Plan the scenes.
  if (draft.scenes.length === 0) {
    const plan = await ask<ScenePlanOutput>(
      "scenes",
      { correctedIdea: draft.storyline!.correctedIdea, synopsis: draft.storyline!.synopsis, bible: draft.storyBible },
      "Planning your scenes",
    );
    commit({
      ...draft,
      storyBible: { ...draft.storyBible, tone: draft.storyBible.tone.trim() || plan.tone?.trim() || "" },
      scenes: plan.scenes.slice(0, 8).map((planned, order) => ({
        id: crypto.randomUUID(),
        order,
        heading: normalizeHeading(planned.heading) || planned.heading,
        summary: planned.summary,
        elements: [],
        shotList: null,
      })),
    });
  }

  // 4. Write each scene in order (each one sees the scenes before it), then record its new facts.
  for (const scene of [...draft.scenes].sort((a, b) => a.order - b.order)) {
    const current = draft.scenes.find((candidate) => candidate.id === scene.id)!;
    if (isSceneWritten(current)) continue;

    const written = await ask<WriteSceneOutput>("writeScene", writeSceneInput(draft, current), `Writing scene ${current.order + 1}`);
    updateScene(current.id, {
      heading: normalizeHeading(written.heading) || current.heading,
      elements: written.elements.map((element) =>
        autoFormatElement({ id: crypto.randomUUID(), type: element.type, text: element.text.trim() }),
      ),
    });

    const facts = await ask<BibleSyncOutput>(
      "bibleSync",
      sceneContext(draft, draft.scenes.find((candidate) => candidate.id === current.id)!),
      `Noting what scene ${current.order + 1} established`,
    );
    commit({
      ...draft,
      storyBible: { ...draft.storyBible, facts: mergeBibleFacts(draft.storyBible.facts, facts.newFacts) },
    });
  }

  // 5. A camera plan for each scene.
  for (const scene of [...draft.scenes].sort((a, b) => a.order - b.order)) {
    const current = draft.scenes.find((candidate) => candidate.id === scene.id)!;
    if (current.shotList) continue;
    const shots = await ask<ShotListOutput>("shotList", sceneContext(draft, current), `Planning the camera for scene ${current.order + 1}`);
    updateScene(current.id, {
      shotList: {
        coverageNotes: shots.coverageNotes,
        shots: shots.shots.map((shot, order) => ({ id: crypto.randomUUID(), order, ...shot })),
      },
    });
  }

  // 6. Storyboards that follow those camera plans.
  for (const scene of [...draft.scenes].sort((a, b) => a.order - b.order)) {
    const current = draft.scenes.find((candidate) => candidate.id === scene.id)!;
    if (current.storyboard) continue;
    const board = await ask<Storyboard>(
      "storyboard",
      {
        ...sceneContext(draft, current),
        shots: (current.shotList?.shots ?? []).slice(0, 10).map((shot) => ({
          shotType: shot.shotType,
          cameraAngle: shot.cameraAngle,
          movement: shot.movement,
          description: shot.description,
        })),
      },
      `Drawing the storyboard for scene ${current.order + 1}`,
    );
    updateScene(current.id, { storyboard: board });
  }

  options.onProgress?.({ label: "Done", done, total: done });
  return draft;
}
