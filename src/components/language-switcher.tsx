"use client";

import { useEffect, useRef, useState } from "react";
import { ErrorState } from "@/components/error-state";
import { LanguagePicker } from "@/components/language-picker";
import { ApiError } from "@/lib/api-client";
import { convertDraft, countUniqueStrings } from "@/lib/draft-translate";
import { normalizeLanguage } from "@/lib/language";
import type { StudioDraft } from "@/lib/schemas/draft";

interface LanguageSwitcherProps {
  draft: StudioDraft;
  /** Called with the fully converted story; the parent swaps it in and keeps an undo copy. */
  onConverted: (converted: StudioDraft) => void;
}

/**
 * Change the language of the whole story at any time. Every field is converted
 * (storyline, cast, bible, scenes and script lines, shot lists, storyboards),
 * and later AI output follows the new language.
 */
export function LanguageSwitcher({ draft, onConverted }: LanguageSwitcherProps) {
  const [target, setTarget] = useState(draft.language);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; note?: string } | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const cache = useRef(new Map<string, string>());
  const cancelled = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);

  const next = normalizeLanguage(target);
  const changed = next.toLowerCase() !== draft.language.toLowerCase();
  const strings = countUniqueStrings(draft);
  const calls = Math.ceil(strings / 25) + 1;

  useEffect(() => {
    setTarget(draft.language);
  }, [draft.language]);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const show = running || error !== null;
    if (show && !element.open) element.showModal();
    if (!show && element.open) element.close();
  }, [running, error]);

  async function run() {
    cancelled.current = false;
    setError(null);
    setRunning(true);
    try {
      const converted = await convertDraft(draft, next, {
        cache: cache.current,
        isCancelled: () => cancelled.current,
        onProgress: setProgress,
      });
      cache.current = new Map();
      onConverted(converted);
    } catch (caught) {
      if (!cancelled.current) {
        setError(caught instanceof ApiError ? caught : new ApiError("internal", "The conversion failed.", 500));
      }
    } finally {
      setRunning(false);
      setProgress(null);
    }
  }

  function start() {
    if (strings === 0) {
      // Nothing written yet: just switch the language for future AI output.
      onConverted({ ...draft, language: next });
      return;
    }
    cache.current = new Map();
    void run();
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-64">
          <LanguagePicker label="Story language" value={target} onChange={setTarget} disabled={running} />
        </div>
        {changed ? (
          <button
            type="button"
            onClick={start}
            disabled={running}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
          >
            Convert whole story to {next}
          </button>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-stone-500">
        {changed && strings > 0
          ? `Converts everything — your story, characters, notebook, scenes, script, camera plans and storyboard captions — in about ${calls} AI calls. You can undo it afterwards.`
          : "Changing this converts the whole story, and everything the AI writes from now on uses it."}
      </p>

      <dialog
        ref={dialog}
        onCancel={(event) => event.preventDefault()}
        className="w-[min(92vw,28rem)] rounded-2xl border border-stone-200 p-0 shadow-xl backdrop:bg-stone-900/50"
      >
        <div className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">Converting to {next}…</h2>
          {error ? (
            <>
              <ErrorState error={error} onRetry={() => void run()} />
              <p className="text-xs text-stone-500">Finished parts are kept, so retrying continues where it stopped.</p>
              <button
                type="button"
                onClick={() => { setError(null); cache.current = new Map(); }}
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-50"
              >
                Close and keep the story as it was
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-stone-600">
                Please keep this tab open. Your story is untouched until the conversion finishes.
              </p>
              <div role="status">
                <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${progress && progress.total > 0 ? (progress.done / progress.total) * 100 : 5}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-stone-500">
                  {progress ? `Step ${Math.min(progress.done + 1, progress.total)} of ${progress.total}. ` : ""}
                  {progress?.note}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { cancelled.current = true; }}
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-50"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </dialog>
    </div>
  );
}
