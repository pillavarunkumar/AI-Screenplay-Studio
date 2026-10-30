import "server-only";
import type { PublicUser } from "@/lib/schemas/auth";
import type { StudioDraft } from "@/lib/schemas/draft";
import type { CreateResult, Project, ProjectSummary } from "./projects";

/**
 * Everything the app needs from storage, so routes don't care whether the data
 * lives in Supabase (production) or a local SQLite file (fallback and tests).
 */
export interface Store {
  readonly kind: "supabase" | "sqlite";

  findUserByEmail(email: string): Promise<{ user: PublicUser; passwordHash: string } | null>;
  /** Resolves to null when the email is already registered. */
  createUser(input: { name: string; email: string; passwordHash: string }): Promise<PublicUser | null>;

  createSession(userId: string): Promise<{ token: string; expiresAt: number }>;
  getUserBySession(token: string): Promise<PublicUser | null>;
  deleteSession(token: string): Promise<void>;

  createProject(userId: string, input: { title?: string; draft: StudioDraft }): Promise<CreateResult>;
  listProjects(userId: string): Promise<ProjectSummary[]>;
  getProject(userId: string, id: string): Promise<Project | null>;
  updateProject(userId: string, id: string, input: { title?: string; draft: StudioDraft }): Promise<ProjectSummary | null>;
  renameProject(userId: string, id: string, title: string): Promise<string | null>;
  deleteProject(userId: string, id: string): Promise<boolean>;
}

const globalForStore = globalThis as unknown as { __studioStore?: Store };

/**
 * Supabase when `SUPABASE_URL` and `SUPABASE_SECRET_KEY` are set, otherwise the
 * local SQLite file. Loaded lazily so the unused backend is never imported.
 */
export async function getStore(): Promise<Store> {
  if (!globalForStore.__studioStore) {
    if (process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SECRET_KEY?.trim()) {
      const { assertSupabaseReady, createSupabaseStore } = await import("./supabase-store");
      const { createSupabaseAdmin } = await import("./supabase");
      const client = createSupabaseAdmin();
      // Not cached on failure, so the app recovers as soon as the tables exist.
      await assertSupabaseReady(client);
      globalForStore.__studioStore = createSupabaseStore(client);
    } else {
      // Production data must not silently land in a file on the server's disk.
      if (process.env.NODE_ENV === "production" && !process.env.DATABASE_PATH?.trim()) {
        throw new Error(
          "No database is configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY so accounts and stories are saved in Supabase.",
        );
      }
      console.warn("[store] Supabase is not configured; using the local SQLite file. Set SUPABASE_URL and SUPABASE_SECRET_KEY to save to Supabase.");
      const { createSqliteStore } = await import("./sqlite-store");
      globalForStore.__studioStore = createSqliteStore();
    }
  }
  return globalForStore.__studioStore;
}
