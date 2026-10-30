"use client";

import { reviewDraft } from "@/lib/review-draft";
import type { StudioDraft } from "@/lib/schemas/draft";

interface FinalCheckProps {
  draft: StudioDraft;
  onFixFormat: () => void;
  onFillMissing: () => void;
}

/** An editor's checklist before downloading: what's done, what's missing, and one-click fixes. */
export function FinalCheck({ draft, onFixFormat, onFillMissing }: FinalCheckProps) {
  const review = reviewDraft(draft);
  const canFormat = review.items.some((item) => !item.ok && item.fix === "format");
  const canFill = review.items.some((item) => !item.ok && item.fix === "fill");

  return (
    <section aria-label="Final draft check" className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">{review.ready ? "🎬 Your final draft is ready" : "Final draft check"}</h3>
          <p className="mt-0.5 text-sm text-stone-600">
            {review.ready
              ? "Everything checks out. Translate it or download it below."
              : "Fix these before you download, or let the AI do it for you."}
          </p>
        </div>
        <div
          className={`grid h-14 w-14 place-items-center rounded-full text-sm font-bold ${
            review.ready ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
          }`}
          aria-label={`${review.score} percent`}
        >
          {review.score}%
        </div>
      </div>

      <ul className="mt-4 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {review.items.map((item) => (
          <li key={item.id} className="flex items-start gap-2 text-sm">
            <span aria-hidden="true" className={item.ok ? "text-emerald-600" : "text-amber-600"}>
              {item.ok ? "✓" : "!"}
            </span>
            <span className={item.ok ? "text-stone-700" : "text-stone-900"}>
              {item.label}
              {item.detail && !item.ok ? <span className="block text-xs text-stone-500">{item.detail}</span> : null}
            </span>
          </li>
        ))}
      </ul>

      {canFormat || canFill ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {canFormat ? (
            <button type="button" onClick={onFixFormat} className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium hover:bg-stone-50">
              Fix the formatting
            </button>
          ) : null}
          {canFill ? (
            <button type="button" onClick={onFillMissing} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800">
              Fill in what’s missing with AI
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
