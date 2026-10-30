"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { DictationControl } from "@/components/dictation-control";
import { ErrorState } from "@/components/error-state";
import type { StorylineAnalysis, StorylineOutput } from "@/lib/schemas/storyline";
import { appendDictation } from "@/lib/dictation";
import { randomStarter, STORY_STARTERS } from "@/lib/story-starters";
import { useLlmTask } from "@/lib/use-llm-task";

interface StorylinePanelProps {
  idea: string;
  storyline: StorylineOutput | null;
  storylineSourceIdea: string;
  onIdeaChange: (idea: string) => void;
  onGenerated: (storyline: StorylineOutput, sourceIdea: string) => void;
}

const BEATS = [
  {
    key: "setup",
    label: "Beginning",
    hint: "Who wants what, and what's in their way.",
  },
  {
    key: "complication",
    label: "Middle",
    hint: "Where things get hard and a choice is forced.",
  },
  {
    key: "resolution",
    label: "End",
    hint: "What they choose, what it costs, and how things end.",
  },
] as const;

export function StorylinePanel({
  idea,
  storyline,
  storylineSourceIdea,
  onIdeaChange,
  onGenerated,
}: StorylinePanelProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [autoRefine, setAutoRefine] = useState(true);
  const [listening, setListening] = useState(false);
  const wasListening = useRef(false);
  const ideaRef = useRef(idea);
  ideaRef.current = idea;
  const { state, run } = useLlmTask<StorylineOutput>("storyline");
  const loading = state.status === "loading";
  const canSubmit = idea.trim().length >= 10 && !loading;
  const isStale =
    storyline !== null && idea.trim() !== storylineSourceIdea.trim();

  async function generate() {
    if (idea.trim().length < 10) {
      setSubmitError("Write at least 10 characters so we have something to work with.");
      return;
    }

    setSubmitError(null);
    const result = await run({ idea: idea.trim() });
    if (result) onGenerated(result.data, idea.trim());
  }

  const handleDictated = useCallback(
    (text: string) => onIdeaChange(appendDictation(ideaRef.current, text)),
    [onIdeaChange],
  );

  // When the writer stops talking, refine what they said straight away.
  useEffect(() => {
    if (wasListening.current && !listening && autoRefine) {
      if (ideaRef.current.trim().length >= 10) void generate();
    }
    wasListening.current = listening;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await generate();
  }

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">
            Step 1 · Your story
          </p>
          <h2 className="mt-1 text-xl font-semibold">
            Turn a rough idea into a clear story
          </h2>
        </div>
        {storyline ? (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
            Story saved
          </span>
        ) : null}
      </div>

      <p className="mt-2 max-w-3xl text-sm text-stone-600">
        Write it however it comes out. We’ll tidy up your idea, then shape it into a beginning, middle and end, and explain why it works.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label htmlFor="raw-idea" className="block text-sm font-medium">
            Raw idea
          </label>
          <DictationControl onFinal={handleDictated} onListeningChange={setListening} />
        </div>
        <label className="flex items-center gap-2 text-xs text-stone-600">
          <input
            type="checkbox"
            checked={autoRefine}
            onChange={(event) => setAutoRefine(event.target.checked)}
          />
          Tidy it up automatically when I stop talking
        </label>
        <textarea
          id="raw-idea"
          rows={4}
          value={idea}
          onChange={(event) => onIdeaChange(event.target.value)}
          maxLength={2000}
          placeholder="a burnt out nurse inherits her estranged fathers lighthouse and finds letters from the woman he never talked about..."
          className="w-full resize-y rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm leading-6 outline-none transition focus:border-stone-500 focus:bg-white focus-visible:ring-2 focus-visible:ring-stone-300"
        />

        {idea.trim() === "" ? (
          <div className="flex flex-wrap items-center gap-2" aria-label="Story starters">
            <span className="text-xs text-stone-500">Need a spark?</span>
            {STORY_STARTERS.slice(0, 4).map((starter) => (
              <button
                key={starter.genre}
                type="button"
                onClick={() => onIdeaChange(starter.idea)}
                className="rounded-full border border-stone-300 px-3 py-1 text-xs text-stone-700 hover:bg-stone-100"
              >
                {starter.genre}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onIdeaChange(randomStarter().idea)}
              className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900 hover:bg-amber-200"
            >
              ✨ Surprise me
            </button>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-stone-500">
            {idea.trim().length}/2000 · spelling and clarity are fixed for you
          </span>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Building your story…"
              : storyline
                ? "Rebuild my story"
                : "Build my story"}
          </button>
        </div>
      </form>

      {submitError ? (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {submitError}
        </p>
      ) : null}

      {isStale && !loading ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          You changed your idea after building this story. Rebuild to update it. Your characters, notebook and scenes stay as they are.
        </p>
      ) : null}

      <div className="mt-5 space-y-4" aria-live="polite">
        {state.status === "error" ? (
          <ErrorState
            error={state.error}
            onRetry={() => {
              void generate();
            }}
          />
        ) : null}

        {loading ? <StorylineLoading /> : null}

        {!loading && storyline ? (
          <StorylineResult
            storyline={storyline}
            canUseRefined={idea.trim() !== storyline.correctedIdea.trim()}
            onSave={(edited) => onGenerated(edited, storylineSourceIdea)}
            onUseRefined={() => {
              onIdeaChange(storyline.correctedIdea);
              onGenerated(storyline, storyline.correctedIdea);
            }}
          />
        ) : null}
      </div>
    </section>
  );
}

function StorylineLoading() {
  return (
    <div
      role="status"
      className="rounded-xl border border-stone-200 bg-stone-50 p-5"
    >
      <div className="flex items-center gap-2 text-sm text-stone-600">
        <span
          aria-hidden="true"
          className="h-3 w-3 animate-pulse rounded-full bg-stone-400"
        />
        Tidying up your idea and shaping your story. This can take up to about 25 seconds.
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="space-y-2">
            <div className="h-3 w-20 animate-pulse rounded bg-stone-200" />
            <div className="h-3 w-full animate-pulse rounded bg-stone-200" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-stone-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

function StorylineResult({
  storyline,
  canUseRefined,
  onUseRefined,
  onSave,
}: {
  storyline: StorylineOutput;
  canUseRefined: boolean;
  onUseRefined: () => void;
  onSave: (storyline: StorylineOutput) => void;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <StorylineEditor
        storyline={storyline}
        onCancel={() => setEditing(false)}
        onSave={(edited) => {
          onSave(edited);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <article className="space-y-5">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
        >
          ✎ Edit my story
        </button>
      </div>
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">
            Your idea, tidied up
          </p>
          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-stone-600 ring-1 ring-stone-200">
            your meaning kept
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-stone-800">
          {storyline.correctedIdea}
        </p>
        {canUseRefined ? (
          <button
            type="button"
            onClick={onUseRefined}
            className="mt-3 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100"
          >
            Use this tidied-up version
          </button>
        ) : null}

        {storyline.corrections.length > 0 ? (
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-medium text-stone-600">
              What we fixed ({storyline.corrections.length})
            </summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-stone-600">
              {storyline.corrections.map((correction, index) => (
                <li key={`${correction}-${index}`}>{correction}</li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {BEATS.map((beat, index) => (
          <div
            key={beat.key}
            className="rounded-xl border border-stone-200 bg-white p-4"
          >
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-xs text-stone-400">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="font-semibold">{beat.label}</h3>
            </div>
            <p className="mt-1 text-xs text-stone-500">{beat.hint}</p>
            <p className="mt-2 text-sm leading-6 text-stone-700">
              {storyline.synopsis[beat.key]}
            </p>
          </div>
        ))}
      </div>

      {storyline.analysis ? <StoryAnalysis analysis={storyline.analysis} /> : null}

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-800">
          Why this works
        </p>
        <p className="mt-1 text-sm leading-6 text-amber-950">
          {storyline.whyThisStructure}
        </p>
      </div>
    </article>
  );
}

const EDIT_FIELDS = [
  { key: "correctedIdea", label: "Your idea (tidied up)", max: 2_000 },
  { key: "setup", label: "Setup", max: 1_200 },
  { key: "complication", label: "Complication", max: 1_200 },
  { key: "resolution", label: "Resolution", max: 1_200 },
] as const;

/** Edits the generated storyline by hand. Nothing is saved until the writer confirms. */
function StorylineEditor({
  storyline,
  onSave,
  onCancel,
}: {
  storyline: StorylineOutput;
  onSave: (storyline: StorylineOutput) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState({
    correctedIdea: storyline.correctedIdea,
    setup: storyline.synopsis.setup,
    complication: storyline.synopsis.complication,
    resolution: storyline.synopsis.resolution,
  });
  const blank = EDIT_FIELDS.filter((field) => values[field.key].trim() === "");

  return (
    <form
      className="space-y-4 rounded-xl border border-stone-300 bg-stone-50 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (blank.length > 0) return;
        onSave({
          ...storyline,
          correctedIdea: values.correctedIdea.trim(),
          synopsis: {
            setup: values.setup.trim(),
            complication: values.complication.trim(),
            resolution: values.resolution.trim(),
          },
        });
      }}
    >
      {EDIT_FIELDS.map((field) => (
        <label key={field.key} className="block text-sm font-medium">
          {field.label}
          <textarea
            rows={field.key === "correctedIdea" ? 3 : 4}
            maxLength={field.max}
            value={values[field.key]}
            onChange={(event) => setValues((previous) => ({ ...previous, [field.key]: event.target.value }))}
            className="mt-1 w-full resize-y rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-normal leading-6 outline-none focus:border-stone-500"
          />
        </label>
      ))}
      {blank.length > 0 ? (
        <p role="alert" className="text-sm text-red-700">
          {blank.map((field) => field.label).join(", ")} can&apos;t be empty.
        </p>
      ) : null}
      <p className="text-xs text-stone-500">
        Your characters, scenes and notebook stay as they are. Your changes are used the next time you create them.
      </p>
      <div className="flex gap-2">
        <button type="submit" disabled={blank.length > 0} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50">
          Save changes
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium hover:bg-stone-50">
          Cancel
        </button>
      </div>
    </form>
  );
}

function StoryAnalysis({ analysis }: { analysis: StorylineAnalysis }) {
  const rows = [
    ["The big question", analysis.centralQuestion],
    ["What they want", analysis.want],
    ["What they need", analysis.need],
    ["What's at stake", analysis.stakes],
    ["The message", analysis.theme],
  ] as const;

  return (
    <section aria-label="What we think of your story" className="rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">What we think of your story</p>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className={label === "The big question" ? "sm:col-span-2" : ""}>
            <dt className="text-xs font-semibold text-stone-500">{label}</dt>
            <dd className="mt-0.5 text-sm leading-6 text-stone-800">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold text-emerald-700">What works</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6 text-stone-700">
            {analysis.strengths.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold text-amber-700">To make it stronger</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6 text-stone-700">
            {analysis.toStrengthen.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}
