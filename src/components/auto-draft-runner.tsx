"use client";

import { useEffect, useRef, useState } from "react";
import { ErrorState } from "@/components/error-state";
import { ApiError } from "@/lib/api-client";
import { runAutoDraft, type AutoDraftProgress } from "@/lib/auto-draft";
import type { StudioDraft } from "@/lib/schemas/draft";

interface AutoDraftRunnerProps {
  open: boolean;
  draft: StudioDraft;
  /** Receives the story after every finished step, so it is saved as it grows. */
  onDraft: (draft: StudioDraft) => void;
  onClose: () => void;
  onFinished: () => void;
}

/** The modal that runs "write my story" and shows what the AI is doing. It only fills in what is missing. */
export function AutoDraftRunner({ open, draft, onDraft, onClose, onFinished }: AutoDraftRunnerProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [progress, setProgress] = useState<AutoDraftProgress | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const latest = useRef(draft);
  const cancelled = useRef(false);
  const running = useRef(false);

  async function run() {
    if (running.current) return;
    running.current = true;
    cancelled.current = false;
    setError(null);
    try {
      await runAutoDraft(latest.current, {
        isCancelled: () => cancelled.current,
        onProgress: setProgress,
        onDraft: (next) => {
          latest.current = next;
          onDraft(next);
        },
      });
      running.current = false;
      onFinished();
    } catch (caught) {
      running.current = false;
      if (cancelled.current) {
        onClose();
        return;
      }
      setError(caught instanceof ApiError ? caught : new ApiError("internal", "The AI stopped unexpectedly.", 500));
    }
  }

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      latest.current = draft;
      setProgress(null);
      element.showModal();
      void run();
    }
    if (!open && element.open) element.close();
    // `run` and `draft` are read once, when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const percent = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 3;

  return (
    <dialog
      ref={dialog}
      onCancel={(event) => event.preventDefault()}
      className="w-[min(92vw,30rem)] rounded-2xl border border-stone-200 p-0 shadow-xl backdrop:bg-stone-900/50"
    >
      <div className="space-y-4 p-6">
        <div>
          <h2 className="text-lg font-semibold">{error ? "The AI hit a problem" : "Writing your story…"}</h2>
          <p className="mt-1 text-sm text-stone-600">
            {error
              ? "Everything finished so far is saved. Try again to carry on from here."
              : "Please keep this tab open. Everything is saved as it goes, and nothing you already wrote is replaced."}
          </p>
        </div>

        {error ? (
          <>
            <ErrorState error={error} onRetry={() => void run()} />
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-50"
            >
              Close (keep what’s done)
            </button>
          </>
        ) : (
          <>
            <div role="status" aria-live="polite">
              <p className="text-sm font-medium text-stone-800">{progress?.label ?? "Getting started"}…</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-2 text-xs text-stone-500">
                {progress ? `${percent}% · step ${Math.min(progress.done + 1, progress.total)} of ${progress.total}. ` : ""}
                {progress?.note ?? "This usually takes a few minutes."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                cancelled.current = true;
              }}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-50"
            >
              Stop (keep what’s done)
            </button>
          </>
        )}
      </div>
    </dialog>
  );
}
