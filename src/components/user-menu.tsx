"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { initials } from "@/lib/format";
import { logoutRequest } from "@/lib/projects-client";

export function UserMenu({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function signOut() {
    await logoutRequest().catch(() => undefined);
    router.push("/");
    router.refresh();
  }

  const itemClass = "block w-full rounded-lg px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-100";

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-full border border-stone-200 bg-white py-1 pl-1 pr-3 shadow-sm transition hover:border-stone-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        <span
          aria-hidden="true"
          className="grid h-8 w-8 place-items-center rounded-full bg-[#b5533c] text-xs font-bold text-white"
        >
          {initials(name)}
        </span>
        <span className="hidden max-w-[10rem] truncate text-sm font-medium sm:block">{name}</span>
        <svg viewBox="0 0 20 20" className={`h-4 w-4 text-stone-400 transition ${open ? "rotate-180" : ""}`} fill="currentColor" aria-hidden="true">
          <path d="M5.5 7.5 10 12l4.5-4.5-1.1-1.1L10 9.8 6.6 6.4z" />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 rounded-2xl border border-stone-200 bg-white p-2 shadow-xl"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="truncate text-xs text-stone-500">{email}</p>
          </div>
          <div className="my-1 border-t border-stone-100" />
          <button role="menuitem" type="button" onClick={signOut} className={`${itemClass} text-red-700 hover:bg-red-50`}>
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
