"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createProjectRequest } from "@/lib/projects-client";
import type { StudioDraft } from "@/lib/schemas/draft";

interface UseExampleButtonProps {
  title: string;
  draft: StudioDraft;
  signedIn: boolean;
}

/** Copies a sample story into the signed-in writer's account, then opens it. */
export function UseExampleButton({ title, draft, signedIn }: UseExampleButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const classes =
    "inline-flex items-center justify-center rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800 disabled:opacity-60";

  if (!signedIn) {
    return (
      <Link href="/signup?next=/examples" className={classes}>
        Sign up to make your own copy
      </Link>
    );
  }

  async function copy() {
    setBusy(true);
    setError(null);
    try {
      const { project } = await createProjectRequest({ title, draft });
      router.push(`/projects/${project.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not copy this story.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={copy} disabled={busy} className={classes}>
        {busy ? "Copying…" : "Make my own copy"}
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
