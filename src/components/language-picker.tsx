"use client";

import { useState } from "react";
import { LANGUAGES, languageLabel, normalizeLanguage } from "@/lib/language";

const OTHER = "__other__";

interface LanguagePickerProps {
  label: string;
  value: string;
  onChange: (language: string) => void;
  hint?: string;
  disabled?: boolean;
}

/** A language dropdown with an "Other" escape hatch that accepts any language name. */
export function LanguagePicker({ label, value, onChange, hint, disabled }: LanguagePickerProps) {
  const listed = (LANGUAGES as readonly string[]).includes(value);
  const [custom, setCustom] = useState(!listed);
  const [typed, setTyped] = useState(listed ? "" : value);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">
        {label}
        <select
          value={custom ? OTHER : value}
          disabled={disabled}
          onChange={(event) => {
            if (event.target.value === OTHER) {
              setCustom(true);
              return;
            }
            setCustom(false);
            onChange(event.target.value);
          }}
          className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-normal disabled:opacity-60"
        >
          {LANGUAGES.map((name) => (
            <option key={name} value={name}>
              {languageLabel(name)}
            </option>
          ))}
          <option value={OTHER}>Other language…</option>
        </select>
      </label>
      {custom ? (
        <input
          value={typed}
          maxLength={60}
          disabled={disabled}
          placeholder="Type any language, e.g. Swahili"
          aria-label="Other language"
          onChange={(event) => {
            setTyped(event.target.value);
            onChange(normalizeLanguage(event.target.value));
          }}
          className="block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
      ) : null}
      {hint ? <p className="text-xs text-stone-500">{hint}</p> : null}
    </div>
  );
}
