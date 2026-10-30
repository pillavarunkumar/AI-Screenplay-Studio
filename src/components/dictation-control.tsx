"use client";

import { useEffect, useState } from "react";
import { DICTATION_LANGUAGES } from "@/lib/dictation";
import { DICTATION_CODE } from "@/lib/language";
import { useProjectLanguage } from "@/lib/language-context";
import { useDictation } from "@/lib/use-dictation";

interface DictationControlProps {
  onFinal: (text: string) => void;
  onListeningChange?: (listening: boolean) => void;
  /** Visual variant: compact for the studio, large for the home page hero. */
  size?: "sm" | "lg";
}

export function DictationControl({ onFinal, onListeningChange, size = "sm" }: DictationControlProps) {
  const projectLanguage = useProjectLanguage();
  const [lang, setLang] = useState("en-US");
  const { supported, listening, interim, error, start, stop } = useDictation(onFinal, lang);

  useEffect(() => {
    onListeningChange?.(listening);
  }, [listening, onListeningChange]);

  useEffect(() => {
    const browser = navigator.language;
    const match = DICTATION_LANGUAGES.find((l) => l.code === browser) ??
      DICTATION_LANGUAGES.find((l) => l.code.slice(0, 2) === browser.slice(0, 2));
    // A non-English project listens in its own language when the browser supports it.
    const projectCode = DICTATION_CODE[projectLanguage];
    if (projectLanguage !== "English" && projectCode) setLang(projectCode);
    else if (match) setLang(match.code);
  }, [projectLanguage]);

  if (!supported) {
    return (
      <p className="text-xs text-stone-500">
        Voice typing works in Chrome, Edge, and Safari. You can still type your story.
      </p>
    );
  }

  const big = size === "lg";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={listening ? stop : start}
          aria-pressed={listening}
          aria-label={listening ? "Stop voice typing" : "Start voice typing"}
          title={listening ? "Stop & refine" : "Voice typing"}
          className={`inline-flex items-center justify-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2 ${
            big ? "h-12 w-12 text-xl" : "h-9 w-9 text-base"
          } ${
            listening
              ? "bg-red-600 text-white hover:bg-red-700"
              : "border border-stone-300 bg-white text-stone-800 hover:bg-stone-50"
          }`}
        >
          <span aria-hidden="true" className={listening ? "animate-pulse" : ""}>
            {listening ? "■" : "🎙"}
          </span>
        </button>
        <label className="sr-only" htmlFor={`dictation-lang-${size}`}>
          Speaking language
        </label>
        <select
          id={`dictation-lang-${size}`}
          value={lang}
          disabled={listening}
          onChange={(event) => setLang(event.target.value)}
          className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs disabled:opacity-50"
        >
          {DICTATION_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      {listening ? (
        <p role="status" className="text-sm text-stone-600">
          Listening… <span className="italic text-stone-500">{interim || "start talking"}</span>
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
