"use client";

import { remainingSteps } from "@/lib/auto-draft";
import type { StudioDraft } from "@/lib/schemas/draft";

interface AutoDraftCardProps {
  draft: StudioDraft;
  onStart: () => void;
}

/** "Don't want to write it yourself?" — one button that has the AI finish everything that's missing. */
export function AutoDraftCard({ draft, onStart }: AutoDraftCardProps) {
  const missing = remainingSteps(draft);
  const hasIdea = draft.storyline !== null || draft.idea.trim().length >= 10;
  const started = draft.storyline !== null;

  if (started && missing === 0) return null;

  return (
    <section
      aria-label="Let the AI write it"
      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5"
    >
      <div className="min-w-0 max-w-2xl">
        <h2 className="font-semibold">Don’t want to write it yourself?</h2>
        <p className="mt-1 text-sm text-stone-700">
          {hasIdea
            ? "The AI can finish your whole story: the story itself, characters, every scene’s script and dialogue, camera plans, and storyboards. It only fills in what’s missing, and never replaces what you wrote."
            : "Write or say your idea in Step 1 first, then the AI can write the whole story for you."}
        </p>
        {hasIdea ? <p className="mt-1 text-xs text-stone-500">About {missing} AI steps, usually 3–6 minutes. You can stop any time.</p> : null}
      </div>
      <button
        type="button"
        onClick={onStart}
        disabled={!hasIdea}
        className="rounded-xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {started ? "Finish my story with AI" : "Write my whole story"}
      </button>
    </section>
  );
}
