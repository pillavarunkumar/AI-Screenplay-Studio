"use client";

import { useRef, useState } from "react";
import { ErrorState } from "@/components/error-state";
import { ApiError } from "@/lib/api-client";
import { ScreenplayScene } from "@/components/screenplay-scene";
import type {
  BibleSyncOutput,
  NextLineSuggestion,
  NextLinesOutput,
  PolishSceneOutput,
  Scene,
  ScriptElement,
  ScriptElementType,
  ShotListOutput,
} from "@/lib/schemas/scene";
import type { StoryBible } from "@/lib/schemas/story-bible";
import type { StorylineOutput } from "@/lib/schemas/storyline";
import {
  autoFormatElement,
  checkScene,
  normalizeHeading,
} from "@/lib/screenplay-format";
import { useLlmTask } from "@/lib/use-llm-task";

interface SceneEditorProps {
  scene: Scene;
  storyline: StorylineOutput;
  bible: StoryBible;
  onChange: (patch: Partial<Omit<Scene, "id" | "order">>) => void;
  onRemove: () => void;
  onBibleFacts: (facts: string[]) => void;
  /** Has the AI write this scene's script. Rejects with an ApiError on failure. */
  onWrite: () => Promise<void>;
}

const TYPE_LABEL: Record<ScriptElementType, string> = {
  action: "Action",
  character: "Character",
  dialogue: "Dialogue",
  parenthetical: "Acting note",
  transition: "Scene change",
};

const ADD_TYPES: ScriptElementType[] = [
  "action",
  "character",
  "dialogue",
  "parenthetical",
  "transition",
];

const PLACEHOLDER: Record<ScriptElementType, string> = {
  action: "Nora sets the letters on the table, one by one.",
  character: "NORA",
  dialogue: "I'm not staying. I just came to sign the papers.",
  parenthetical: "(quietly)",
  transition: "CUT TO:",
};

const TOOL_BUTTON =
  "rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 disabled:cursor-not-allowed disabled:opacity-50";

const PRIMARY_BUTTON =
  "rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export function SceneEditor({
  scene,
  storyline,
  bible,
  onChange,
  onRemove,
  onBibleFacts,
  onWrite,
}: SceneEditorProps) {
  const nextLines = useLlmTask<NextLinesOutput>("nextLines");
  const polish = useLlmTask<PolishSceneOutput>("polishScene");
  const shotList = useLlmTask<ShotListOutput>("shotList");
  const bibleSync = useLlmTask<BibleSyncOutput>("bibleSync");

  const [appliedSuggestions, setAppliedSuggestions] = useState<string[]>([]);
  const [polishBefore, setPolishBefore] = useState<{
    heading: string;
    elements: ScriptElement[];
  } | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const suggesting = nextLines.state.status === "loading";
  const polishing = polish.state.status === "loading";
  const shotsLoading = shotList.state.status === "loading";
  const syncing = bibleSync.state.status === "loading";

  const busy = suggesting || polishing || shotsLoading || syncing;
  const canAddElement = scene.elements.length < 120;

  function buildContext() {
    return {
      correctedIdea: storyline.correctedIdea,
      synopsis: storyline.synopsis,
      bible,
      scene: {
        heading: scene.heading,
        summary: scene.summary,
        // Blank rows are editor scaffolding, not script. Keep them out of the
        // prompt so they cannot be mistaken for written lines.
        elements: scene.elements.filter(
          (element) => element.text.trim().length > 0,
        ),
      },
    };
  }

  function addElement(type: ScriptElementType) {
    if (!canAddElement) return;
    onChange({
      elements: [
        ...scene.elements,
        { id: crypto.randomUUID(), type, text: "" },
      ],
    });
  }

  const focusAfterRender = useRef<string | null>(null);

  /** Cue → dialogue and parenthetical → dialogue are the common next beats. */
  function insertAfter(id: string, type: ScriptElementType) {
    if (!canAddElement) return;
    const index = scene.elements.findIndex((element) => element.id === id);
    if (index < 0) return;
    const created = { id: crypto.randomUUID(), type, text: "" };
    focusAfterRender.current = created.id;
    const next = [...scene.elements];
    next.splice(index + 1, 0, created);
    onChange({ elements: next });
  }

  function autoFormat() {
    onChange({
      heading: normalizeHeading(scene.heading),
      elements: scene.elements.map(autoFormatElement),
    });
  }

  const [writing, setWriting] = useState(false);
  const [writeError, setWriteError] = useState<ApiError | null>(null);

  async function writeWithAi() {
    const hasScript = scene.elements.some((element) => element.text.trim());
    if (hasScript && !window.confirm("Replace what's written in this scene with a new AI draft?")) return;
    setWriting(true);
    setWriteError(null);
    try {
      await onWrite();
    } catch (caught) {
      setWriteError(caught instanceof ApiError ? caught : new ApiError("internal", "The AI could not write this scene.", 500));
    } finally {
      setWriting(false);
    }
  }

  const formatIssues = checkScene(scene);

  function updateElement(id: string, patch: Partial<ScriptElement>) {
    onChange({
      elements: scene.elements.map((element) =>
        element.id === id ? { ...element, ...patch } : element,
      ),
    });
  }

  function removeElement(id: string) {
    onChange({
      elements: scene.elements.filter((element) => element.id !== id),
    });
  }

  function moveElement(id: string, delta: number) {
    const index = scene.elements.findIndex((element) => element.id === id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= scene.elements.length) return;

    const next = [...scene.elements];
    const moved = next[index];
    const displaced = next[target];
    next[index] = displaced;
    next[target] = moved;
    onChange({ elements: next });
  }

  async function suggestNextLines() {
    setAppliedSuggestions([]);
    await nextLines.run(buildContext());
  }

  function applySuggestion(key: string, suggestion: NextLineSuggestion) {
    const text = suggestion.text.trim();
    if (!text || !canAddElement) return;

    onChange({
      elements: [
        ...scene.elements,
        { id: crypto.randomUUID(), type: suggestion.type, text },
      ],
    });
    setAppliedSuggestions((previous) => [...previous, key]);
  }

  async function runPolish() {
    setPolishBefore({
      heading: scene.heading,
      elements: scene.elements.map((element) => ({ ...element })),
    });
    await polish.run(buildContext());
  }

  function applyPolishedScene(data: PolishSceneOutput) {
    onChange({
      heading: data.heading,
      elements: data.elements.map((element) => ({
        id: crypto.randomUUID(),
        type: element.type,
        text: element.text,
      })),
    });
    setPolishBefore(null);
    polish.reset();
  }

  async function generateShotList() {
    const result = await shotList.run(buildContext());
    if (!result) return;

    onChange({
      shotList: {
        coverageNotes: result.data.coverageNotes,
        shots: result.data.shots.map((shot, order) => ({
          id: crypto.randomUUID(),
          order,
          ...shot,
        })),
      },
    });
  }

  async function syncBible() {
    setSyncNotice(null);
    const result = await bibleSync.run(buildContext());
    if (!result) return;

    onBibleFacts(result.data.newFacts);
    setSyncNotice(
      result.data.newFacts.length === 0
        ? "No new facts found. The notebook already has everything from this scene."
        : `Sent ${result.data.newFacts.length} new fact${
            result.data.newFacts.length === 1 ? "" : "s"
          } to the story notebook. Repeats are skipped.`,
    );
  }

  const suggestions =
    nextLines.state.status === "success"
      ? nextLines.state.data.suggestions
      : [];

  const polished =
    polish.state.status === "success" ? polish.state.data : null;

  const handleRemove = () => {
    if (
      window.confirm(
        `Remove scene ${scene.order + 1}? Its script, ideas and camera plan will be lost.`,
      )
    ) {
      onRemove();
    }
  };

  return (
    <article
      aria-busy={busy}
      className="rounded-2xl border border-stone-200 bg-white shadow-sm"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-200 p-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-stone-400">
              {String(scene.order + 1).padStart(2, "0")}
            </span>
            <span className="text-xs font-semibold uppercase tracking-widest text-stone-500">
              Scene heading
            </span>
          </div>
          <input
            type="text"
            value={scene.heading}
            maxLength={200}
            placeholder="INT. LIGHTHOUSE KITCHEN - NIGHT"
            aria-label={`Scene ${scene.order + 1} heading`}
            onChange={(event) => onChange({ heading: event.target.value })}
            className="mt-1 w-full border-b border-stone-300 bg-transparent pb-1 font-mono text-base font-semibold uppercase tracking-wide outline-none focus:border-stone-600"
          />
        </div>
        <button
          type="button"
          onClick={handleRemove}
          className="rounded-md px-2 py-1 text-xs text-stone-500 hover:bg-stone-100 hover:text-stone-800"
          aria-label={`Remove scene ${scene.order + 1}`}
        >
          Remove scene
        </button>
      </header>

      <div className="space-y-6 p-5">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-widest text-stone-500">
            What happens
          </span>
          <span className="mt-0.5 block text-xs text-stone-400">
            What changes in this scene. It isn’t part of the script, but the AI reads it to help you.
          </span>
          <textarea
            rows={2}
            value={scene.summary}
            maxLength={1_000}
            onChange={(event) => onChange({ summary: event.target.value })}
            className="mt-1 w-full resize-y rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm leading-6 outline-none transition focus:border-stone-400 focus:bg-white focus-visible:ring-2 focus-visible:ring-stone-200"
          />
        </label>

        <section aria-labelledby={`scene-${scene.id}-script`}>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h4
                id={`scene-${scene.id}-script`}
                className="text-sm font-semibold"
              >
                Screenplay
              </h4>
              <p className="mt-0.5 text-xs text-stone-500">
                Action, who’s speaking, what they say, small acting notes, and scene changes. Empty rows are ignored.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={writeWithAi}
                disabled={writing || busy}
                title="The AI writes the whole scene: action, dialogue, and acting notes"
                className="rounded-md bg-amber-500 px-2 py-1 text-[11px] font-semibold text-stone-900 hover:bg-amber-400 disabled:opacity-60"
              >
                {writing ? "Writing…" : "✨ Write this scene for me"}
              </button>
              <button
                type="button"
                onClick={autoFormat}
                title="Capitalise the heading and cues, wrap parentheticals, and tidy transitions"
                className="rounded-md bg-stone-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-stone-800"
              >
                Auto-format
              </button>
              {ADD_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => addElement(type)}
                  disabled={!canAddElement}
                  title={
                    canAddElement
                      ? `Add ${TYPE_LABEL[type].toLowerCase()}`
                      : "This scene has reached its 120-line limit."
                  }
                  className="rounded-md border border-stone-300 px-2 py-1 text-[11px] font-medium text-stone-600 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  + {TYPE_LABEL[type]}
                </button>
              ))}
            </div>
          </div>

          {writeError ? (
            <div className="mt-3">
              <ErrorState error={writeError} onRetry={() => void writeWithAi()} />
            </div>
          ) : null}
          {writing ? (
            <p role="status" className="mt-3 text-sm text-stone-600">
              Writing the scene: action, dialogue and all. This can take up to a minute…
            </p>
          ) : null}

          {scene.elements.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-stone-300 bg-stone-50 px-3 py-4 text-sm text-stone-500">
              No lines yet. Start with action, or ask for next-line suggestions
              below.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {scene.elements.map((element, index) => (
                <li
                  key={element.id}
                  className="rounded-lg border border-stone-200 bg-stone-50/60 p-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-stone-500 ring-1 ring-stone-200">
                      {TYPE_LABEL[element.type]}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveElement(element.id, -1)}
                        disabled={index === 0}
                        className="rounded px-1.5 py-0.5 text-xs text-stone-500 hover:bg-white disabled:opacity-30"
                        aria-label={`Move ${TYPE_LABEL[element.type]} up`}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveElement(element.id, 1)}
                        disabled={index === scene.elements.length - 1}
                        className="rounded px-1.5 py-0.5 text-xs text-stone-500 hover:bg-white disabled:opacity-30"
                        aria-label={`Move ${TYPE_LABEL[element.type]} down`}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeElement(element.id)}
                        className="rounded px-1.5 py-0.5 text-[11px] text-stone-500 hover:bg-white hover:text-stone-800"
                        aria-label={`Remove ${TYPE_LABEL[element.type]}`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {element.type === "character" ||
                  element.type === "parenthetical" ||
                  element.type === "transition" ? (
                    <input
                      type="text"
                      value={element.text}
                      maxLength={2_000}
                      autoFocus={focusAfterRender.current === element.id}
                      aria-label={`${TYPE_LABEL[element.type]} ${index + 1}`}
                      placeholder={PLACEHOLDER[element.type]}
                      onChange={(event) =>
                        updateElement(element.id, {
                          text: event.target.value,
                        })
                      }
                      onBlur={() =>
                        updateElement(element.id, {
                          text: autoFormatElement(element).text,
                        })
                      }
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" || element.type === "transition") return;
                        event.preventDefault();
                        insertAfter(element.id, "dialogue");
                      }}
                      className={`mt-1.5 rounded-md border border-stone-200 bg-white px-2.5 py-1.5 font-mono text-sm outline-none focus:border-stone-400 focus-visible:ring-2 focus-visible:ring-stone-200 ${
                        element.type === "character"
                          ? "ml-[22%] w-3/5 uppercase"
                          : element.type === "parenthetical"
                            ? "ml-[16%] w-2/5"
                            : "ml-auto block w-2/5 text-right uppercase"
                      }`}
                    />
                  ) : (
                    <textarea
                      rows={element.type === "dialogue" ? 3 : 2}
                      value={element.text}
                      maxLength={2_000}
                      autoFocus={focusAfterRender.current === element.id}
                      aria-label={`${TYPE_LABEL[element.type]} line ${index + 1}`}
                      placeholder={PLACEHOLDER[element.type]}
                      onChange={(event) =>
                        updateElement(element.id, {
                          text: event.target.value,
                        })
                      }
                      className={`mt-1.5 resize-y rounded-md border border-stone-200 bg-white px-2.5 py-2 font-mono text-sm leading-6 outline-none focus:border-stone-400 focus-visible:ring-2 focus-visible:ring-stone-200 ${
                        element.type === "dialogue" ? "ml-[10%] w-[65%]" : "w-full"
                      }`}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}

          {formatIssues.length > 0 ? (
            <details className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <summary className="cursor-pointer font-medium">
                Format check · {formatIssues.length} thing{formatIssues.length === 1 ? "" : "s"} to tidy
              </summary>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {formatIssues.map((issue, i) => (
                  <li key={`${issue.elementId ?? "heading"}-${i}`}>{issue.message}</li>
                ))}
              </ul>
              <p className="mt-2 text-amber-800">Auto-format fixes capitals, parentheses, and transitions for you.</p>
            </details>
          ) : scene.elements.some((e) => e.text.trim()) ? (
            <p className="mt-3 text-xs text-emerald-700">✓ Format check passed</p>
          ) : null}
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-stone-200 bg-stone-50/50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold">Ideas for the next line</h4>
                <p className="mt-0.5 text-xs text-stone-500">
                  Two to four ideas, each with the trick behind it.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  void suggestNextLines();
                }}
                disabled={suggesting}
                className={PRIMARY_BUTTON}
              >
                {suggesting ? "Thinking…" : "Give me ideas"}
              </button>
            </div>

            <div className="mt-3 space-y-2" aria-live="polite">
              {nextLines.state.status === "error" ? (
                <ErrorState
                  error={nextLines.state.error}
                  onRetry={() => {
                    void suggestNextLines();
                  }}
                />
              ) : null}

              {suggesting ? (
                <p role="status" className="text-sm text-stone-500">
                  Looking for good next lines…
                </p>
              ) : null}

              {suggestions.length > 0 ? (
                <ul className="space-y-2">
                  {suggestions.map((suggestion, index) => {
                    const key = `${index}-${suggestion.type}`;
                    const alreadyAdded = appliedSuggestions.includes(key);

                    return (
                      <li
                        key={key}
                        className="rounded-lg border border-stone-200 bg-white p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-500">
                            {TYPE_LABEL[suggestion.type]}
                          </span>
                          <button
                            type="button"
                            onClick={() => applySuggestion(key, suggestion)}
                            disabled={alreadyAdded || !canAddElement}
                            className="rounded-md border border-stone-300 px-2 py-0.5 text-[11px] font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                          >
                            {alreadyAdded
                              ? "Added"
                              : canAddElement
                                ? "Add to scene"
                                : "Scene full"}
                          </button>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap font-mono text-[13px] leading-6 text-stone-800">
                          {suggestion.text}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-stone-600">
                          <span className="font-semibold text-amber-800">
                            Why — {suggestion.technique}:
                          </span>{" "}
                          {suggestion.why}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border border-stone-200 bg-stone-50/50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold">Camera plan</h4>
                <p className="mt-0.5 text-xs text-stone-500">
                  How to film this scene: shot size, angle, movement, and why.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  void generateShotList();
                }}
                disabled={shotsLoading}
                className={TOOL_BUTTON}
              >
                {shotsLoading
                  ? "Planning the camera…"
                  : scene.shotList
                    ? "Redo camera plan"
                    : "Make a camera plan"}
              </button>
            </div>

            <div className="mt-3 space-y-2" aria-live="polite">
              {shotList.state.status === "error" ? (
                <ErrorState
                  error={shotList.state.error}
                  onRetry={() => {
                    void generateShotList();
                  }}
                />
              ) : null}

              {shotsLoading ? (
                <p role="status" className="text-sm text-stone-500">
                  Choosing angles and camera moves…
                </p>
              ) : null}

              {scene.shotList ? (
                <>
                  <ol className="space-y-2">
                    {scene.shotList.shots.map((shot) => (
                      <li
                        key={shot.id}
                        className="rounded-lg border border-stone-200 bg-white p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-mono text-[11px] text-stone-500">
                            Shot {shot.order + 1}
                          </span>
                          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-700">
                            {shot.shotType}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-5 text-stone-800">
                          {shot.description}
                        </p>
                        <dl className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-stone-600">
                          <div>
                            <dt className="font-semibold uppercase tracking-widest text-stone-400">
                              Angle
                            </dt>
                            <dd>{shot.cameraAngle}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold uppercase tracking-widest text-stone-400">
                              Movement
                            </dt>
                            <dd>{shot.movement}</dd>
                          </div>
                        </dl>
                        <p className="mt-2 text-xs leading-5 text-stone-600">
                          <span className="font-semibold text-stone-700">
                            Why:
                          </span>{" "}
                          {shot.reasoning}
                        </p>
                      </li>
                    ))}
                  </ol>

                  {scene.shotList.coverageNotes.trim() ? (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                      <span className="font-semibold">Filming tip:</span>{" "}
                      {scene.shotList.coverageNotes}
                    </p>
                  ) : null}
                </>
              ) : null}

              {!scene.shotList && !shotsLoading ? (
                <p className="text-sm text-stone-500">
                  No camera plan yet. Make one after the scene has some lines or a summary.
                </p>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 lg:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold">Make it sound better</h4>
                <p className="mt-0.5 text-xs text-stone-500">
                  Rewrites this scene so it reads like a professional script, and shows you before and after. Nothing changes until you accept it.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  void runPolish();
                }}
                disabled={polishing || scene.elements.every((element) => !element.text.trim())}
                className={TOOL_BUTTON}
              >
                {polishing ? "Polishing…" : "Polish this scene"}
              </button>
            </div>

            <div className="mt-3 space-y-3" aria-live="polite">
              {polish.state.status === "error" ? (
                <ErrorState
                  error={polish.state.error}
                  onRetry={() => {
                    void runPolish();
                  }}
                />
              ) : null}

              {polishing ? (
                <p role="status" className="text-sm text-stone-500">
                  Tightening action and dialogue…
                </p>
              ) : null}

              {polished && polishBefore ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
                  <div className="grid gap-3 lg:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-500">
                        Before
                      </p>
                      <ScreenplayScene
                        heading={polishBefore.heading}
                        elements={polishBefore.elements}
                        className="mt-1 border border-stone-200"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-800">
                        After
                      </p>
                      <ScreenplayScene
                        heading={polished.heading}
                        elements={polished.elements}
                        className="mt-1 border border-emerald-200"
                      />
                    </div>
                  </div>

                  {polished.changes.length > 0 ? (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs font-medium text-stone-700">
                        What changed ({polished.changes.length})
                      </summary>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-stone-600">
                        {polished.changes.map((change, index) => (
                          <li key={`${change}-${index}`}>{change}</li>
                        ))}
                      </ul>
                    </details>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => applyPolishedScene(polished)}
                      className={PRIMARY_BUTTON}
                    >
                      Use the polished version
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPolishBefore(null);
                        polish.reset();
                      }}
                      className={TOOL_BUTTON}
                    >
                      Keep mine
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold">Story notebook</h4>
              <p className="mt-0.5 text-xs text-stone-600">
                Add the lasting facts from this scene (names, places, objects, secrets) to the notebook above, so future suggestions remember them.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void syncBible();
              }}
              disabled={syncing}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {syncing ? "Reading scene…" : "Add this scene's facts"}
            </button>
          </div>

          <div className="mt-2 space-y-2" aria-live="polite">
            {bibleSync.state.status === "error" ? (
              <ErrorState
                error={bibleSync.state.error}
                onRetry={() => {
                  void syncBible();
                }}
              />
            ) : null}

            {syncNotice ? (
              <p className="text-xs text-amber-900">{syncNotice}</p>
            ) : null}
          </div>
        </section>
      </div>
    </article>
  );
}
