"use client";

import { useState } from "react";
import { NewStoryDialog } from "@/components/new-story-dialog";

export function StartWritingButton({ className, children }: { className?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      <NewStoryDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
