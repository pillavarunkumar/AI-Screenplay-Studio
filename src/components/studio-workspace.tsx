"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ErrorState } from "@/components/error-state";
import { ApiError } from "@/lib/api-client";
import type { CastPlanOutput } from "@/lib/schemas/characters";
import { AutoDraftCard } from "@/components/auto-draft-card";
import { AutoDraftRunner } from "@/components/auto-draft-runner";
import { ExportPanel } from "@/components/export-panel";
import { FinalCheck } from "@/components/final-check";
import { StoryboardStep } from "@/components/storyboard-step";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ProgressTracker } from "@/components/progress-tracker";
import { CharacterCard } from "@/components/character-card";
import { ScenesSection } from "@/components/scenes-section";
import { StorylinePanel } from "@/components/storyline-panel";
import { callWithRateLimitRetry } from "@/lib/llm-retry";
import { ProjectLanguageContext } from "@/lib/language-context";
import { autoFormatElement, normalizeHeading } from "@/lib/screenplay-format";
import type { WriteSceneOutput } from "@/lib/schemas/scene";
import { writeSceneInput } from "@/lib/story-context";
import type { StudioDraft } from "@/lib/schemas/draft";
import {
  createCharacterCard,
  useStudioDraft,
  type RemoteProject,
  type SaveState,
} from "@/lib/studio-draft";
import type { BibleCharacter } from "@/lib/schemas/story-bible";
import type { CharacterRole } from "@/lib/schemas/characters";

const ROLE_LABEL: Record<CharacterRole, string> = {
  protagonist: "Protagonist",
  antagonist: "Antagonist",
  supporting: "Supporting",
};

const SAVE_LABEL: Record<SaveState, string> = {
  saved: "All changes saved",
  pending: "Unsaved changes…",
  saving: "Saving…",
  error: "Not saved",
};

interface StudioWorkspaceProps {
  remote: RemoteProject;
  /** Printed as "written by" on exported title pages. */
  author?: string;
}

const STEPS = [
  { id: 1, label: "Your story" },
  { id: 2, label: "Characters" },
  { id: 3, label: "Scenes" },
  { id: 4, label: "Storyboard" },
  { id: 5, label: "Download" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export function StudioWorkspace({ remote, author = "" }: StudioWorkspaceProps) {
  const [step, setStep] = useState<StepId>(1);
  const [runnerOpen, setRunnerOpen] = useState(false);
  const [castBusy, setCastBusy] = useState(false);
  const [castError, setCastError] = useState<ApiError | null>(null);
  const [undo, setUndo] = useState<{ draft: StudioDraft; language: string } | null>(null);
  const goTo = (next: StepId) => {
    setStep(next);
    window.scrollTo({ top: 0 });
  };
  const {
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
  } = useStudioDraft(remote);

  const hasContent =
    draft.idea.trim() !== "" ||
    draft.storyline !== null ||
    draft.characters.length > 0 ||
    draft.scenes.length > 0 ||
    draft.storyBible.tone.trim() !== "" ||
    draft.storyBible.facts.length > 0;

  const castForBible: BibleCharacter[] = draft.characters.flatMap((card) => {
    const profile = card.profile;
    if (!profile || !profile.name.trim()) return [];

    return [
      {
        name: profile.name.trim(),
        role: ROLE_LABEL[card.role],
        summary: [profile.personality, profile.motivation, profile.internalConflict]
          .map((part) => part.trim())
          .filter(Boolean)
          .join(" ")
          .slice(0, 400),
      },
    ];
  });

  /** Finds every character in the story (not a fixed three), then adds a card for each. */
  const suggestCast = async () => {
    if (!draft.storyline) return;
    setCastBusy(true);
    setCastError(null);
    try {
      const { data } = await callWithRateLimitRetry<CastPlanOutput>(
        "castPlan",
        { idea: draft.idea, correctedIdea: draft.storyline.correctedIdea, synopsis: draft.storyline.synopsis },
        { language: draft.language },
      );
      addCharacters(
        data.characters.map((planned) =>
          createCharacterCard(planned.role, { brief: planned.brief, suggestedName: planned.name.trim() || undefined }),
        ),
      );
    } catch (caught) {
      setCastError(caught instanceof ApiError ? caught : new ApiError("internal", "Could not find the characters.", 500));
    } finally {
      setCastBusy(false);
    }
  };

  const addCharacter = () => {
    addCharacters([createCharacterCard("supporting")]);
  };

  const startOver = () => {
    const where = "in this story";
    if (
      window.confirm(
        `Start over? This clears your idea, story, characters, notebook and scenes ${where}.`,
      )
    ) {
      reset();
    }
  };

  /** Writes one scene's script with the AI, using the cast's voices and the scenes before it. */
  const writeScene = async (sceneId: string) => {
    const scene = draft.scenes.find((candidate) => candidate.id === sceneId);
    if (!scene) return;
    const { data } = await callWithRateLimitRetry<WriteSceneOutput>("writeScene", writeSceneInput(draft, scene), {
      language: draft.language,
    });
    updateScene(sceneId, {
      heading: normalizeHeading(data.heading) || scene.heading,
      elements: data.elements.map((element) =>
        autoFormatElement({ id: crypto.randomUUID(), type: element.type, text: element.text.trim() }),
      ),
    });
  };

  /** Capitals on headings and cues, brackets on parentheticals, colons on transitions. */
  const fixFormatting = () =>
    replaceDraft({
      ...draft,
      scenes: draft.scenes.map((scene) => ({
        ...scene,
        heading: normalizeHeading(scene.heading) || scene.heading,
        elements: scene.elements.map(autoFormatElement),
      })),
    });

  const handleConverted = (converted: StudioDraft) => {
    setUndo({ draft, language: draft.language });
    replaceDraft(converted);
  };

  return (
    <ProjectLanguageContext.Provider value={draft.language}>
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/projects"
            className="text-sm font-medium text-stone-500 hover:text-stone-900"
          >
            ← My stories
          </Link>
          <label className="sr-only" htmlFor="story-title">
            Story title
          </label>
          <input
            id="story-title"
            value={title}
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Untitled story"
            className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-lg font-semibold hover:border-stone-300 focus:border-stone-400 focus:bg-white focus:outline-none"
          />
          <span
            role="status"
            className={`text-xs ${saveState === "error" ? "font-medium text-red-700" : "text-stone-500"}`}
          >
            {SAVE_LABEL[saveState]}
          </span>
      </div>

      <AutoDraftCard draft={draft} onStart={() => setRunnerOpen(true)} />
      <AutoDraftRunner
        open={runnerOpen}
        draft={draft}
        onDraft={replaceDraft}
        onClose={() => setRunnerOpen(false)}
        onFinished={() => {
          setRunnerOpen(false);
          goTo(5);
        }}
      />

      <LanguageSwitcher draft={draft} onConverted={handleConverted} />

      {undo ? (
        <p role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <span>Story converted to {draft.language}. AI writing now uses {draft.language}.</span>
          <span className="flex gap-3">
            <button
              type="button"
              className="font-medium underline"
              onClick={() => {
                replaceDraft(undo.draft);
                setUndo(null);
              }}
            >
              Undo (back to {undo.language}; edits since are lost)
            </button>
            <button type="button" className="text-emerald-800" onClick={() => setUndo(null)}>
              Dismiss
            </button>
          </span>
        </p>
      ) : null}

      {saveError && saveState === "error" ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          {saveError}{" "}
          {saveError.startsWith("Your session") ? (
            <Link href={`/login?next=${encodeURIComponent(`/projects/${remote.id}`)}`} className="font-medium underline">
              Sign in
            </Link>
          ) : (
            "Retrying automatically."
          )}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ol className="flex flex-wrap items-center gap-2 text-xs">
          {STEPS.map((item) => {
            const locked = item.id > 1 && !draft.storyline;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={locked}
                  aria-current={step === item.id ? "step" : undefined}
                  onClick={() => goTo(item.id)}
                  className={`rounded-full px-3 py-1.5 ${
                    step === item.id
                      ? "bg-stone-900 font-medium text-white"
                      : locked
                        ? "cursor-not-allowed border border-stone-300 text-stone-400"
                        : "border border-stone-400 text-stone-700 hover:bg-white"
                  }`}
                >
                  {item.id} · {item.label}
                </button>
              </li>
            );
          })}
        </ol>

        {hasContent ? (
          <button
            type="button"
            onClick={startOver}
            className="text-xs font-medium text-stone-500 underline-offset-2 hover:text-stone-900 hover:underline"
          >
            Start over
          </button>
        ) : null}
      </div>

      {step === 1 ? (
        <StorylinePanel
          idea={draft.idea}
          storyline={draft.storyline}
          storylineSourceIdea={draft.storylineSourceIdea}
          onIdeaChange={setIdea}
          onGenerated={setStoryline}
        />
      ) : null}

      {step === 2 ? (
        <>
      {draft.storyline ? (
        <section>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                Step 2 · Characters
              </p>
              <h2 className="mt-1 text-xl font-semibold">
                Create your characters
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-stone-600">
                Each character is created on their own, so if one is slow or fails, the others aren’t affected. You can edit anything, and it saves automatically.
              </p>
            </div>

            {draft.characters.length > 0 ? (
              <button
                type="button"
                onClick={addCharacter}
                disabled={draft.characters.length >= 8}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add character
              </button>
            ) : null}
          </div>

          {draft.characters.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-white/70 p-8 text-center">
              <p className="text-sm font-medium">
                We’ll find every character in your story, usually three to six.
              </p>
              <p className="mx-auto mt-1 max-w-xl text-sm text-stone-500">
                We suggest names and write a profile for each one: how they look, what they’re like, what they want, what holds them back, how they talk, and how they change.
              </p>
              <button
                type="button"
                onClick={() => void suggestCast()}
                disabled={castBusy}
                className="mt-4 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2 disabled:opacity-60"
              >
                {castBusy ? "Finding your characters…" : "Create characters"}
              </button>
              {castError ? (
                <div className="mx-auto mt-4 max-w-xl text-left">
                  <ErrorState error={castError} onRetry={() => void suggestCast()} />
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 grid items-start gap-4 xl:grid-cols-2">
              {draft.characters.map((card) => (
                <CharacterCard
                  key={card.id}
                  card={card}
                  storyline={draft.storyline!}
                  otherNames={draft.characters
                    .filter((other) => other.id !== card.id)
                    .flatMap((other) =>
                      other.profile ? [other.profile.name] : [],
                    )}
                  onChange={(patch) => updateCharacter(card.id, patch)}
                  onRemove={() => removeCharacter(card.id)}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-stone-300 bg-white/60 p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
            Step 2 · Characters
          </p>
          <h2 className="mt-1 text-xl font-semibold text-stone-500">
            Create your characters
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-stone-500">
            Build your story first. Your characters are written from your idea and its beginning, middle and end.
          </p>
        </section>
      )}

        </>
      ) : null}

      {step === 3 ? (
        <>
      {draft.storyline ? (
        <ScenesSection
          storyline={draft.storyline}
          bible={draft.storyBible}
          scenes={draft.scenes}
          cast={castForBible}
          onBibleChange={setBible}
          onBibleFacts={addBibleFacts}
          onScenesReplace={replaceScenes}
          onSceneChange={updateScene}
          onSceneRemove={removeScene}
          onWriteScene={writeScene}
        />
      ) : (
        <section className="rounded-2xl border border-dashed border-stone-300 bg-white/60 p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
            Step 3 · Scenes
          </p>
          <h2 className="mt-1 text-xl font-semibold text-stone-500">
            Turn your story into scenes
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-stone-500">
            Build your story first. We split it into scenes, then you write each one with help for the next line, polishing, and a camera plan.
          </p>
        </section>
      )}

        </>
      ) : null}

      {step === 4 ? (
        <StoryboardStep
          title={title}
          storyline={draft.storyline!}
          bible={draft.storyBible}
          scenes={draft.scenes}
          onSceneChange={updateScene}
        />
      ) : null}

      {step === 5 ? (
        <FinalCheck draft={draft} onFixFormat={fixFormatting} onFillMissing={() => setRunnerOpen(true)} />
      ) : null}

      {step === 5 ? (
        <ExportPanel
          title={title}
          author={author}
          scenes={draft.scenes}
          characterNames={castForBible.map((character) => character.name)}
          translations={draft.translations}
          onTranslations={setTranslations}
        />
      ) : null}

      <nav className="flex items-center justify-between border-t border-stone-200 pt-4" aria-label="Step navigation">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => goTo((step - 1) as StepId)}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-white"
          >
            ← Back to {STEPS[step - 2].label}
          </button>
        ) : (
          <span />
        )}
        {step < 5 ? (
          <button
            type="button"
            disabled={!draft.storyline}
            onClick={() => goTo((step + 1) as StepId)}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next: {STEPS.find((item) => item.id === step + 1)?.label} →
          </button>
        ) : null}
      </nav>

      <p className="text-xs text-stone-400">
        Saved to your account automatically.
      </p>
    </div>
    </ProjectLanguageContext.Provider>
  );
}
