"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createProjectRequest } from "@/lib/projects-client";
import { EMPTY_DRAFT } from "@/lib/schemas/draft";
import { LanguagePicker } from "@/components/language-picker";
import { DEFAULT_LANGUAGE } from "@/lib/language";

interface NewStoryDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Asks for a project title, creates the story, and opens the studio. */
export function NewStoryDialog({ open, onClose }: NewStoryDialogProps) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      setTitle("");
      setLanguage(DEFAULT_LANGUAGE);
      setError(null);
      element.showModal();
    }
    if (!open && element.open) element.close();
  }, [open]);

  async function create(event: FormEvent) {
    event.preventDefault();
    const name = title.trim();
    if (!name) {
      setError("Give your story a name to continue.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const { project } = await createProjectRequest({ title: name, draft: { ...EMPTY_DRAFT, language } });
      router.push(`/projects/${project.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the story.");
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialog.current && !busy) onClose();
      }}
      className="w-[min(92vw,26rem)] rounded-2xl border border-stone-200 p-0 shadow-xl backdrop:bg-stone-900/40"
    >
      <form onSubmit={create} className="space-y-4 p-6">
        <div>
          <h2 className="text-lg font-semibold">Name your story</h2>
          <p className="mt-1 text-sm text-stone-600">
            You can rename it any time. Next you&apos;ll tell or type your idea.
          </p>
        </div>
        <label className="block text-sm font-medium">
          Project title
          <input
            autoFocus
            value={title}
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. The Lighthouse Letters"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200"
          />
        </label>
        <LanguagePicker
          label="Story language"
          value={language}
          onChange={setLanguage}
          hint="Everything the AI writes will use this language. You can change it any time and the whole story is converted."
        />
        {error ? (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-60"
          >
            {busy ? "Creating…" : "Start writing"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
