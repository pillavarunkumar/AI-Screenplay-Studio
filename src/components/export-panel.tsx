"use client";

import { useRef, useState } from "react";
import { ErrorState } from "@/components/error-state";
import { ApiError } from "@/lib/api-client";
import type { Scene } from "@/lib/schemas/scene";
import {
  buildPrintHtml,
  formatScript,
} from "@/lib/script-export";
import { estimateScript } from "@/lib/story-progress";
import type { SavedTranslation } from "@/lib/schemas/draft";
import { translateScene, type TranslatedScene } from "@/lib/translate-script";

interface ExportPanelProps {
  title: string;
  author: string;
  scenes: Scene[];
  characterNames: string[];
  /** Saved with the story (Supabase), so translations survive reloads. */
  translations: SavedTranslation[];
  onTranslations: (translations: SavedTranslation[]) => void;
}

const LANGUAGES = [
  "Telugu", "Telugish", "Hindi", "Tamil", "Kannada", "Malayalam", "Bengali", "Marathi", "Gujarati",
  "Punjabi", "Urdu", "English", "Spanish", "French", "German", "Portuguese", "Italian",
  "Arabic", "Japanese", "Korean", "Chinese (Simplified)", "Russian", "Turkish", "Indonesian",
];

const OTHER = "__other__";

const LANGUAGE_NOTE: Record<string, string> = { Telugish: "Telugu in English letters" };

/** Short fingerprint (FNV-1a) of the script text, used to tell whether a saved translation is out of date. */
export const scriptSignature = (scenes: readonly Pick<Scene, "heading" | "elements">[]) => {
  const text = JSON.stringify(scenes.map((s) => [s.heading, s.elements.map((e) => e.text)]));
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${hash.toString(16)}-${text.length}`;
};

const slug = (text: string) =>
  text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "screenplay";

function download(text: string, filename: string, type: string) {
  const blob = new Blob([text], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function ExportPanel({ title, author, scenes, characterNames, translations, onTranslations }: ExportPanelProps) {
  const latest = translations[translations.length - 1] ?? null;
  const [language, setLanguage] = useState(latest?.language ?? "");
  const [custom, setCustom] = useState(latest ? !LANGUAGES.includes(latest.language) : false);
  /** Language of the version being previewed/downloaded, or null for the original script. */
  const [active, setActive] = useState<string | null>(latest?.language ?? null);
  const translation = translations.find((item) => item.language === active) ?? null;
  const [progress, setProgress] = useState<{ done: number; total: number; note?: string } | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const cancelled = useRef(false);
  const pending = useRef<TranslatedScene[]>([]);

  const signature = scriptSignature(scenes);
  const stale = translation !== null && translation.signature !== signature;
  const showing = translation ? translation.scenes : scenes;
  const suffix = translation ? `-${slug(translation.language)}` : "";
  const baseName = `${slug(title)}${suffix}`;
  const docTitle = title.trim() || "Screenplay";
  const stats = estimateScript(scenes);
  const busy = progress !== null;

  async function runTranslation(target: string, resumeFrom: TranslatedScene[] = []) {
    target = target.trim();
    if (target.length < 2 || scenes.length === 0) return;

    cancelled.current = false;
    setError(null);
    const done = [...resumeFrom];
    setProgress({ done: done.length, total: scenes.length });

    for (let index = done.length; index < scenes.length; index += 1) {
      if (cancelled.current) break;
      try {
        done.push(
          await translateScene(scenes[index], target, characterNames, {
            onRateLimited: (seconds) =>
              setProgress({ done: done.length, total: scenes.length, note: `The AI needs a short break. Continuing in ${seconds}s…` }),
          }),
        );
        setProgress({ done: done.length, total: scenes.length });
      } catch (caught) {
        setError(caught instanceof ApiError ? caught : new ApiError("internal", "Translation failed.", 500));
        setProgress(null);
        // Keep finished scenes so Retry resumes instead of starting over.
        pending.current = done;
        return;
      }
    }

    setProgress(null);
    if (cancelled.current) return;
    pending.current = [];
    // One saved copy per language (re-translating replaces it); keep the four newest.
    onTranslations(
      [...translations.filter((item) => item.language !== target), { language: target, scenes: done, signature }].slice(-4),
    );
    setActive(target);
  }
  const exportPdf = () => {
    const popup = window.open("", "_blank");
    if (!popup) {
      window.alert("Allow pop-ups for this site, then choose “Save as PDF” in the print dialog.");
      return;
    }
    popup.document.write(buildPrintHtml(showing, { title: docTitle, author }));
    popup.document.close();
    popup.focus();
    popup.print();
  };

  const buttonClass =
    "rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-50";

  return (
    <section aria-labelledby="export-heading" className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">Step 5 · Download</p>
        <h2 id="export-heading" className="mt-1 text-xl font-semibold">Translate and download your script</h2>
        <p className="mt-1 max-w-2xl text-sm text-stone-600">
          {scenes.length === 0
            ? "Plan and write some scenes first — then translate and export them here."
            : `${scenes.length} scenes · about ${stats.pages} page${stats.pages === 1 ? "" : "s"}. Translate into any language, then download as a PDF or text file.`}
        </p>
      </div>

      {scenes.length > 0 ? (
        <>
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <h3 className="font-semibold">Translate</h3>
            <p className="mt-1 text-sm text-stone-600">
              Choose a language and your script is translated right away (or pick “Other” to type any language). Dialogue is translated to sound natural, and character names stay
              consistent across scenes.
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="text-sm font-medium">
                Language
                <select
                  value={custom ? OTHER : language}
                  disabled={busy}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === OTHER) {
                      setCustom(true);
                      setLanguage("");
                      return;
                    }
                    // Picking a language translates straight away.
                    setCustom(false);
                    setLanguage(value);
                    if (value) {
                      pending.current = [];
                      void runTranslation(value);
                    }
                  }}
                  className="mt-1 block w-60 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm disabled:opacity-60"
                >
                  <option value="">Choose a language…</option>
                  {LANGUAGES.map((name) => <option key={name} value={name}>{LANGUAGE_NOTE[name] ? `${name} (${LANGUAGE_NOTE[name]})` : name}</option>)}
                  <option value={OTHER}>Other language…</option>
                </select>
              </label>
              {custom ? (
                <label className="text-sm font-medium">
                  Type the language
                  <input
                    value={language}
                    onChange={(event) => setLanguage(event.target.value)}
                    placeholder="e.g. Swahili"
                    maxLength={60}
                    disabled={busy}
                    autoFocus
                    className="mt-1 block w-52 rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  />
                </label>
              ) : null}
              {custom || translations.length > 0 ? (
                <button
                  type="button"
                  disabled={busy || language.trim().length < 2}
                  onClick={() => { pending.current = []; void runTranslation(language); }}
                  className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
                >
                  {custom ? "Translate" : "Translate again"}
                </button>
              ) : null}
              {busy ? (
                <button type="button" onClick={() => { cancelled.current = true; }} className={buttonClass}>
                  Cancel
                </button>
              ) : null}
            </div>

            {progress ? (
              <div role="status" className="mt-4">
                <p className="text-sm text-stone-600">
                  Translating scene {Math.min(progress.done + 1, progress.total)} of {progress.total}…{" "}
                  {progress.note}
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${(progress.done / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="mt-4">
                <ErrorState error={error} onRetry={() => void runTranslation(language, pending.current)} />
              </div>
            ) : null}

            {stale ? (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                You edited the script after translating it. Translate again to include your changes.
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold">Download</h3>
              {translations.length > 0 ? (
                <div role="group" aria-label="Script version" className="flex flex-wrap rounded-lg border border-stone-300 p-0.5 text-xs">
                  {[null, ...translations.map((item) => item.language)].map((option) => (
                    <button
                      key={option ?? "original"}
                      type="button"
                      aria-pressed={active === option}
                      onClick={() => setActive(option)}
                      className={`rounded-md px-3 py-1.5 font-medium ${
                        active === option ? "bg-stone-900 text-white" : "text-stone-600"
                      }`}
                    >
                      {option ?? "Original"}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={exportPdf} className={buttonClass}>PDF (print dialog)</button>
              <button
                type="button"
                className={buttonClass}
                onClick={() => download(formatScript(showing, { title: docTitle, author }), `${baseName}.txt`, "text/plain")}
              >
                Text (.txt)
              </button>
            </div>
            <p className="mt-2 text-xs text-stone-500">For PDF, choose “Save as PDF” as the destination in the print window.</p>

            <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-stone-50 p-4 font-mono text-xs leading-5 text-stone-800">
              {formatScript(showing, { title: docTitle, author })}
            </pre>
          </div>
        </>
      ) : null}
    </section>
  );
}
