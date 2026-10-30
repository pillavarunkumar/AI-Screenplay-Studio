import "server-only";
import { randomUUID } from "node:crypto";
import { StudioDraftSchema, type StudioDraft } from "@/lib/schemas/draft";
import { getMilestones } from "@/lib/story-progress";
import type { Db } from "./db";

export const MAX_PROJECTS_PER_USER = 50;
export const MAX_DRAFT_BYTES = 1_000_000;
export const DEFAULT_TITLE = "Untitled story";

export interface ProjectSummary {
  id: string;
  title: string;
  logline: string;
  sceneCount: number;
  characterCount: number;
  language: string;
  /** 0-100, share of the story-progress milestones reached. */
  progress: number;
  createdAt: number;
  updatedAt: number;
}

export interface Project extends ProjectSummary {
  draft: StudioDraft;
}

interface ProjectRow {
  id: string;
  title: string;
  draft: string;
  logline: string;
  scene_count: number;
  character_count: number;
  language: string;
  progress: number | null;
  created_at: number;
  updated_at: number;
}

export function cleanTitle(title: string | undefined, draft: StudioDraft): string {
  const explicit = title?.trim();
  // The placeholder counts as "not named yet" so it picks up the idea later.
  if (explicit && explicit !== DEFAULT_TITLE) return explicit.slice(0, 120);
  const idea = (draft.storyline?.correctedIdea ?? draft.idea).trim();
  if (!idea) return DEFAULT_TITLE;
  const firstSentence = idea.split(/(?<=[.!?])\s/)[0] ?? idea;
  return firstSentence.length > 60
    ? `${firstSentence.slice(0, 57).trimEnd()}…`
    : firstSentence;
}

export function progressOf(draft: StudioDraft): number {
  const milestones = getMilestones(draft);
  return Math.round((milestones.filter((m) => m.done).length / milestones.length) * 100);
}

const toSummary = (row: ProjectRow): ProjectSummary => ({
  id: row.id,
  title: row.title,
  logline: row.logline,
  sceneCount: row.scene_count,
  characterCount: row.character_count,
  language: row.language,
  progress: row.progress ?? 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const loglineOf = (draft: StudioDraft) =>
  (draft.storyline?.synopsis.setup ?? draft.idea).trim().slice(0, 240);

export type CreateResult =
  | { ok: true; project: Project }
  | { ok: false; reason: "limit" };

export function createProject(
  db: Db,
  userId: string,
  input: { title?: string; draft: StudioDraft },
  now = Date.now(),
): CreateResult {
  const { count } = db
    .prepare("SELECT COUNT(*) AS count FROM projects WHERE user_id = ?")
    .get(userId) as { count: number };
  if (count >= MAX_PROJECTS_PER_USER) return { ok: false, reason: "limit" };

  const id = randomUUID();
  const title = cleanTitle(input.title, input.draft);
  db.prepare(
    `INSERT INTO projects
       (id, user_id, title, draft, scene_count, character_count, logline, language, progress, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    userId,
    title,
    JSON.stringify(input.draft),
    input.draft.scenes.length,
    input.draft.characters.length,
    loglineOf(input.draft),
    input.draft.language,
    progressOf(input.draft),
    now,
    now,
  );

  return {
    ok: true,
    project: {
      id,
      title,
      logline: loglineOf(input.draft),
      sceneCount: input.draft.scenes.length,
      characterCount: input.draft.characters.length,
      language: input.draft.language,
      progress: progressOf(input.draft),
      createdAt: now,
      updatedAt: now,
      draft: input.draft,
    },
  };
}

export function listProjects(db: Db, userId: string): ProjectSummary[] {
  const rows = db
    .prepare(
      `SELECT id, title, '' AS draft, logline, scene_count, character_count, language, progress, created_at, updated_at
         FROM projects WHERE user_id = ? ORDER BY updated_at DESC`,
    )
    .all(userId) as ProjectRow[];

  // Stories saved before progress was tracked: compute it once and keep it.
  for (const row of rows) {
    if (row.progress !== null) continue;
    const full = db.prepare("SELECT draft FROM projects WHERE id = ?").get(row.id) as { draft: string } | undefined;
    const parsed = full ? StudioDraftSchema.safeParse(JSON.parse(full.draft)) : null;
    row.progress = parsed?.success ? progressOf(parsed.data) : 0;
    if (parsed?.success) {
      db.prepare("UPDATE projects SET progress = ?, language = ? WHERE id = ?").run(row.progress, parsed.data.language, row.id);
      row.language = parsed.data.language;
    }
  }
  return rows.map(toSummary);
}

/** Ownership is part of the query, so another user's id looks like "not found". */
export function getProject(db: Db, userId: string, id: string): Project | null {
  const row = db
    .prepare("SELECT * FROM projects WHERE id = ? AND user_id = ?")
    .get(id, userId) as ProjectRow | undefined;
  if (!row) return null;

  const parsed = StudioDraftSchema.safeParse(JSON.parse(row.draft));
  if (!parsed.success) return null;
  return { ...toSummary(row), draft: parsed.data };
}

export function updateProject(
  db: Db,
  userId: string,
  id: string,
  input: { title?: string; draft: StudioDraft },
  now = Date.now(),
): ProjectSummary | null {
  const existing = db
    .prepare("SELECT title, created_at FROM projects WHERE id = ? AND user_id = ?")
    .get(id, userId) as { title: string; created_at: number } | undefined;
  if (!existing) return null;

  const title = input.title === undefined ? existing.title : cleanTitle(input.title, input.draft);
  db.prepare(
    `UPDATE projects
        SET title = ?, draft = ?, scene_count = ?, character_count = ?, logline = ?, language = ?, progress = ?, updated_at = ?
      WHERE id = ? AND user_id = ?`,
  ).run(
    title,
    JSON.stringify(input.draft),
    input.draft.scenes.length,
    input.draft.characters.length,
    loglineOf(input.draft),
    input.draft.language,
    progressOf(input.draft),
    now,
    id,
    userId,
  );

  return {
    id,
    title,
    logline: loglineOf(input.draft),
    sceneCount: input.draft.scenes.length,
    characterCount: input.draft.characters.length,
    language: input.draft.language,
    progress: progressOf(input.draft),
    createdAt: existing.created_at,
    updatedAt: now,
  };
}

export function deleteProject(db: Db, userId: string, id: string): boolean {
  return (
    db.prepare("DELETE FROM projects WHERE id = ? AND user_id = ?").run(id, userId)
      .changes > 0
  );
}

/** Renames without touching the draft, so the list page can do it without loading the story. */
export function renameProject(
  db: Db,
  userId: string,
  id: string,
  title: string,
  now = Date.now(),
): string | null {
  const clean = title.trim().slice(0, 120);
  if (!clean) return null;
  const changed = db
    .prepare("UPDATE projects SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?")
    .run(clean, now, id, userId).changes;
  return changed > 0 ? clean : null;
}
