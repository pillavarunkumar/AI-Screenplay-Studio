"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveProject } from "./projects-client";
import type { CharacterRole } from "./schemas/characters";
import {
  EMPTY_DRAFT,
  StudioDraftSchema,
  type CharacterCard,
  type SavedTranslation,
  type StudioDraft,
} from "./schemas/draft";
import type { Scene } from "./schemas/scene";
import type { StoryBible } from "./schemas/story-bible";
import type { StorylineOutput } from "./schemas/storyline";
import { mergeBibleFacts } from "./story-bible";

export {
  CharacterCardSchema,
  EMPTY_DRAFT,
  StudioDraftSchema,
  type CharacterCard,
  type StudioDraft,
} from "./schemas/draft";


export function createCharacterCard(
  role: CharacterRole,
  plan: { brief?: string; suggestedName?: string } = {},
): CharacterCard {
  return { id: crypto.randomUUID(), role, profile: null, ...plan };
}

export type SaveState = "saved" | "pending" | "saving" | "error";

export interface RemoteProject {
  id: string;
  title: string;
  draft: StudioDraft;
}

const SAVE_DEBOUNCE_MS = 800;
const SAVE_RETRY_MS = 5_000;

/**
 * The open story's draft. It is loaded from the server and autosaved to
 * `PUT /api/projects/:id` (Supabase) after a short debounce. Nothing is kept
 * only in the browser.
 */
export function useStudioDraft(remote: RemoteProject) {
  const [draft, setDraft] = useState<StudioDraft>(remote.draft);
  const [title, setTitle] = useState(remote.title);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const lastSaved = useRef<{ draft: StudioDraft; title: string }>({ draft: remote.draft, title: remote.title });
  const remoteId = remote.id;

  useEffect(() => {
    if (
      draft === lastSaved.current.draft &&
      title === lastSaved.current.title
    ) {
      return;
    }

    setSaveState("pending");
    const timer = setTimeout(async () => {
      setSaveState("saving");
      try {
        const { project } = await saveProject(remoteId, { title, draft });
        lastSaved.current = { draft, title };
        setSaveError(null);
        setSaveState("saved");
        // Adopt a server-derived title only if the user hasn't typed since.
        setTitle((current) => (current === title ? project.title : current));
        if (project.title !== title) lastSaved.current.title = project.title;
      } catch (error) {
        setSaveError(
          error instanceof Error ? error.message : "Could not save your story.",
        );
        setSaveState("error");
      }
    }, SAVE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [draft, title, remoteId, retryTick]);

  // Retry failed saves automatically, unless the session is gone.
  useEffect(() => {
    if (saveState !== "error" || saveError?.startsWith("Your session")) return;
    const timer = setTimeout(() => setRetryTick((tick) => tick + 1), SAVE_RETRY_MS);
    return () => clearTimeout(timer);
  }, [saveState, saveError]);

  useEffect(() => {
    if (saveState === "saved") return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveState]);

  /** Swaps in a whole new draft (language conversion, undo). Autosave picks it up. */
  const replaceDraft = useCallback((next: StudioDraft) => setDraft(next), []);

  const setIdea = useCallback((idea: string) => {
    setDraft((previous) => ({ ...previous, idea }));
  }, []);

  const setStoryline = useCallback(
    (storyline: StorylineOutput, sourceIdea: string) => {
      setDraft((previous) => ({
        ...previous,
        storyline,
        storylineSourceIdea: sourceIdea,
      }));
    },
    [],
  );

  const addCharacters = useCallback((cards: CharacterCard[]) => {
    setDraft((previous) => ({
      ...previous,
      characters: [...previous.characters, ...cards].slice(0, 8),
    }));
  }, []);

  const updateCharacter = useCallback(
    (id: string, patch: Partial<Omit<CharacterCard, "id">>) => {
      setDraft((previous) => ({
        ...previous,
        characters: previous.characters.map((card) =>
          card.id === id ? { ...card, ...patch } : card,
        ),
      }));
    },
    [],
  );

  const removeCharacter = useCallback((id: string) => {
    setDraft((previous) => ({
      ...previous,
      characters: previous.characters.filter((card) => card.id !== id),
    }));
  }, []);

  const setBible = useCallback((storyBible: StoryBible) => {
    setDraft((previous) => ({ ...previous, storyBible }));
  }, []);

  const addBibleFacts = useCallback((facts: string[]) => {
    setDraft((previous) => {
      const next = mergeBibleFacts(previous.storyBible.facts, facts);
      if (next.length === previous.storyBible.facts.length) return previous;

      return {
        ...previous,
        storyBible: { ...previous.storyBible, facts: next },
      };
    });
  }, []);

  const replaceScenes = useCallback((scenes: Scene[]) => {
    setDraft((previous) => ({
      ...previous,
      scenes: scenes.slice(0, 20).map((scene, order) => ({ ...scene, order })),
    }));
  }, []);

  const updateScene = useCallback(
    (id: string, patch: Partial<Omit<Scene, "id" | "order">>) => {
      setDraft((previous) => ({
        ...previous,
        scenes: previous.scenes.map((scene) =>
          scene.id === id ? { ...scene, ...patch } : scene,
        ),
      }));
    },
    [],
  );

  const removeScene = useCallback((id: string) => {
    setDraft((previous) => ({
      ...previous,
      scenes: previous.scenes
        .filter((scene) => scene.id !== id)
        .map((scene, order) => ({ ...scene, order })),
    }));
  }, []);

  /** Clears the story but keeps its language. */
  const reset = useCallback(() => {
    setDraft((previous) => ({ ...EMPTY_DRAFT, language: previous.language }));
  }, []);

  const setTranslations = useCallback((translations: SavedTranslation[]) => {
    setDraft((previous) => ({ ...previous, translations }));
  }, []);

  return {
    draft,
    title,
    setTitle,
    replaceDraft,
    setTranslations,
    saveState,
    saveError,
    setIdea,
    setStoryline,
    addCharacters,
    updateCharacter,
    removeCharacter,
    setBible,
    addBibleFacts,
    replaceScenes,
    updateScene,
    removeScene,
    reset,
  };
}
