import { getMilestones } from "@/lib/story-progress";
import type { StudioDraft } from "@/lib/schemas/draft";

export function ProgressTracker({ draft }: { draft: StudioDraft }) {
  const milestones = getMilestones(draft);
  const done = milestones.filter((m) => m.done).length;
  const next = milestones.find((m) => !m.done);
  const percent = Math.round((done / milestones.length) * 100);

  return (
    <section aria-label="Story progress" className="rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">
          {done === milestones.length ? "🎬 Your story is production-ready!" : `Story progress · ${percent}%`}
        </p>
        {next ? (
          <p className="text-xs text-stone-500">
            Next: <span className="font-medium text-stone-700">{next.label}</span> — {next.hint}
          </p>
        ) : null}
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} />
      </div>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {milestones.map((m) => (
          <li
            key={m.id}
            className={`rounded-full px-2.5 py-1 text-[11px] ${
              m.done ? "bg-emerald-100 font-medium text-emerald-800" : "bg-stone-100 text-stone-500"
            }`}
          >
            {m.done ? "✓ " : ""}
            {m.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
