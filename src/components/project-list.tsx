"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { NewStoryDialog } from "@/components/new-story-dialog";
import { coverFor, timeAgo } from "@/lib/format";
import { languageLabel } from "@/lib/language";
import { deleteProjectRequest, renameProjectRequest } from "@/lib/projects-client";

interface ProjectItem {
  id: string;
  title: string;
  logline: string;
  sceneCount: number;
  characterCount: number;
  language: string;
  progress: number;
  updatedAt: number;
}

type Sort = "recent" | "name" | "progress";

const STAGE = (progress: number) =>
  progress === 0 ? "Just started" : progress < 40 ? "Developing" : progress < 80 ? "Taking shape" : progress < 100 ? "Almost there" : "Production-ready";

export function ProjectList({ initial, firstName }: { initial: ProjectItem[]; firstName: string }) {
  const [projects, setProjects] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("recent");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? projects.filter((p) => `${p.title} ${p.logline}`.toLowerCase().includes(needle))
      : projects;
    return [...filtered].sort((a, b) =>
      sort === "name"
        ? a.title.localeCompare(b.title)
        : sort === "progress"
          ? b.progress - a.progress || b.updatedAt - a.updatedAt
          : b.updatedAt - a.updatedAt,
    );
  }, [projects, query, sort]);

  async function saveRename() {
    if (!renaming) return;
    const title = renaming.title.trim();
    if (!title) return;
    setError(null);
    try {
      const saved = await renameProjectRequest(renaming.id, title);
      setProjects((current) => current.map((p) => (p.id === renaming.id ? { ...p, title: saved.title } : p)));
      setRenaming(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not rename the story.");
    }
  }

  async function remove(item: ProjectItem) {
    if (!window.confirm(`Delete "${item.title}"? This can't be undone.`)) return;
    setError(null);
    try {
      await deleteProjectRequest(item.id);
      setProjects((current) => current.filter((p) => p.id !== item.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete the story.");
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-amber-700">Welcome back, {firstName}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">My stories</h1>
          <p className="mt-1 text-sm text-stone-600">
            {projects.length === 0
              ? "Your stories will live here, saved automatically."
              : `${projects.length} ${projects.length === 1 ? "story" : "stories"}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
        >
          <span aria-hidden="true" className="text-lg leading-none">+</span> New story
        </button>
      </div>

      {projects.length > 1 ? (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <label className="relative block min-w-[14rem] flex-1 sm:max-w-sm">
            <span className="sr-only">Search stories</span>
            <svg viewBox="0 0 20 20" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <circle cx="9" cy="9" r="5.5" />
              <path d="m13.5 13.5 3.5 3.5" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your stories"
              className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-stone-400 focus:ring-2 focus:ring-stone-100"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-600">
            Sort
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as Sort)}
              className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800"
            >
              <option value="recent">Recently edited</option>
              <option value="progress">Most progress</option>
              <option value="name">Name (A–Z)</option>
            </select>
          </label>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </p>
      ) : null}

      {projects.length === 0 ? (
        <div className="mt-8 overflow-hidden rounded-3xl border border-stone-200 bg-white">
          <div className="grid items-center gap-8 p-8 sm:grid-cols-[1fr_auto] sm:p-12">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Every film starts as one sentence.</h2>
              <p className="mt-2 max-w-lg text-stone-600">
                Name your story, then say it out loud or type it. We&apos;ll refine the idea, build the structure,
                cast the characters, write the scenes, and draw the storyboard.
              </p>
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="mt-6 rounded-xl bg-stone-900 px-6 py-3 text-sm font-semibold text-white hover:bg-stone-800"
              >
                Start your first story →
              </button>
            </div>
            <div aria-hidden="true" className="hidden h-40 w-56 rotate-3 rounded-2xl bg-[#b5533c] p-4 shadow-lg sm:block">
              <div className="h-full rounded-xl border-2 border-dashed border-white/50" />
            </div>
          </div>
        </div>
      ) : visible.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">
          No stories match “{query}”.
        </p>
      ) : (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((project) => (
            <li
              key={project.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <Link href={`/projects/${project.id}`} className="block" tabIndex={-1} aria-hidden="true">
                <div className={`relative h-28 ${coverFor(project.id)}`}>
                  <div className="absolute inset-y-0 left-0 flex w-3 flex-col justify-around bg-black/25 py-1" aria-hidden="true">
                    {Array.from({ length: 6 }, (_, i) => <span key={i} className="mx-auto h-2 w-1.5 rounded-sm bg-white/70" />)}
                  </div>
                  <span className="absolute bottom-2 right-4 text-6xl font-black leading-none text-white/25">
                    {Array.from(project.title)[0]?.toUpperCase() ?? "?"}
                  </span>
                  <span className="absolute left-6 top-3 rounded-full bg-black/30 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
                    {languageLabel(project.language).split(" (")[0]}
                  </span>
                </div>
              </Link>

              <div className="flex flex-1 flex-col p-5">
                {renaming?.id === project.id ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void saveRename();
                    }}
                    className="flex gap-2"
                  >
                    <input
                      autoFocus
                      aria-label="Story title"
                      value={renaming.title}
                      maxLength={120}
                      onChange={(event) => setRenaming({ id: project.id, title: event.target.value })}
                      onKeyDown={(event) => event.key === "Escape" && setRenaming(null)}
                      className="min-w-0 flex-1 rounded-lg border border-stone-300 px-2.5 py-1.5 text-sm"
                    />
                    <button type="submit" disabled={!renaming.title.trim()} className="text-sm font-semibold disabled:opacity-40">
                      Save
                    </button>
                  </form>
                ) : (
                  <Link href={`/projects/${project.id}`} className="line-clamp-2 text-lg font-semibold leading-snug tracking-tight hover:underline">
                    {project.title}
                  </Link>
                )}

                <p className="mt-2 line-clamp-2 min-h-[2.75rem] text-sm leading-[1.4rem] text-stone-600">
                  {project.logline || "Nothing written yet — open it to start."}
                </p>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-stone-700">{STAGE(project.progress)}</span>
                    <span className="text-stone-500">{project.progress}%</span>
                  </div>
                  <div
                    className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100"
                    role="progressbar"
                    aria-label={`${project.title} progress`}
                    aria-valuenow={project.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${project.progress}%` }} />
                  </div>
                </div>

                <p className="mt-3 text-xs text-stone-500">
                  {project.characterCount} {project.characterCount === 1 ? "character" : "characters"} · {project.sceneCount}{" "}
                  {project.sceneCount === 1 ? "scene" : "scenes"} · edited {timeAgo(project.updatedAt)}
                </p>

                <div className="mt-4 flex items-center gap-1 border-t border-stone-100 pt-3 text-sm">
                  <Link
                    href={`/projects/${project.id}`}
                    className="rounded-lg bg-stone-900 px-3.5 py-1.5 font-medium text-white hover:bg-stone-800"
                  >
                    Open
                  </Link>
                  <button
                    type="button"
                    onClick={() => setRenaming({ id: project.id, title: project.title })}
                    className="ml-auto rounded-lg px-3 py-1.5 text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(project)}
                    className="rounded-lg px-3 py-1.5 text-stone-500 hover:bg-red-50 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <NewStoryDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </section>
  );
}
