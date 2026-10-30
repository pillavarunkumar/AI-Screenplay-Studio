import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicUser } from "@/lib/schemas/auth";
import { StudioDraftSchema } from "@/lib/schemas/draft";
import {
  cleanTitle,
  loglineOf,
  MAX_PROJECTS_PER_USER,
  progressOf,
  type Project,
  type ProjectSummary,
} from "./projects";
import type { Store } from "./store";
import { createSupabaseAdmin } from "./supabase";
import { hashToken, newSessionToken, SESSION_TTL_MS } from "./users";

interface ProjectRow {
  id: string;
  title: string;
  logline: string;
  scene_count: number;
  character_count: number;
  language: string;
  progress: number | null;
  created_at: number;
  updated_at: number;
}

const SUMMARY_COLUMNS = "id, title, logline, scene_count, character_count, language, progress, created_at, updated_at";

const toSummary = (row: ProjectRow): ProjectSummary => ({
  id: row.id,
  title: row.title,
  logline: row.logline,
  sceneCount: row.scene_count,
  characterCount: row.character_count,
  language: row.language,
  progress: row.progress ?? 0,
  createdAt: Number(row.created_at),
  updatedAt: Number(row.updated_at),
});

/** Throws a readable error for anything unexpected; callers only handle the cases they expect. */
function fail(action: string, error: { message: string; code?: string }): never {
  throw new Error(`Supabase ${action} failed: ${error.message}${error.code ? ` (${error.code})` : ""}`);
}

export function createSupabaseStore(client: SupabaseClient = createSupabaseAdmin()): Store {
  return {
    kind: "supabase",

    async findUserByEmail(email) {
      const { data, error } = await client
        .from("users")
        .select("id, email, name, password_hash")
        .eq("email", email)
        .maybeSingle();
      if (error) fail("user lookup", error);
      if (!data) return null;
      return {
        user: { id: data.id, email: data.email, name: data.name },
        passwordHash: data.password_hash,
      };
    },

    async createUser(input) {
      const id = randomUUID();
      const { error } = await client
        .from("users")
        .insert({ id, email: input.email, name: input.name, password_hash: input.passwordHash, created_at: Date.now() });
      // 23505 = unique_violation: that email is already registered.
      if (error?.code === "23505") return null;
      if (error) fail("sign-up", error);
      return { id, name: input.name, email: input.email };
    },

    async createSession(userId) {
      const now = Date.now();
      const token = newSessionToken();
      const expiresAt = now + SESSION_TTL_MS;
      // Tidy up expired sessions as we go; failures here must not block signing in.
      await client.from("sessions").delete().lte("expires_at", now);
      const { error } = await client
        .from("sessions")
        .insert({ token_hash: hashToken(token), user_id: userId, expires_at: expiresAt });
      if (error) fail("session create", error);
      return { token, expiresAt };
    },

    async getUserBySession(token) {
      const { data, error } = await client
        .from("sessions")
        .select("user:users(id, email, name)")
        .eq("token_hash", hashToken(token))
        .gt("expires_at", Date.now())
        .maybeSingle();
      if (error) fail("session lookup", error);
      const user = data?.user as unknown as PublicUser | PublicUser[] | null | undefined;
      const row = Array.isArray(user) ? user[0] : user;
      return row ? { id: row.id, email: row.email, name: row.name } : null;
    },

    async deleteSession(token) {
      const { error } = await client.from("sessions").delete().eq("token_hash", hashToken(token));
      if (error) fail("sign-out", error);
    },

    async createProject(userId, input) {
      const { count, error: countError } = await client
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      if (countError) fail("story count", countError);
      if ((count ?? 0) >= MAX_PROJECTS_PER_USER) return { ok: false, reason: "limit" };

      const now = Date.now();
      const id = randomUUID();
      const title = cleanTitle(input.title, input.draft);
      const summary: ProjectSummary = {
        id,
        title,
        logline: loglineOf(input.draft),
        sceneCount: input.draft.scenes.length,
        characterCount: input.draft.characters.length,
        language: input.draft.language,
        progress: progressOf(input.draft),
        createdAt: now,
        updatedAt: now,
      };
      const { error } = await client.from("projects").insert({
        id,
        user_id: userId,
        title,
        draft: input.draft,
        scene_count: summary.sceneCount,
        character_count: summary.characterCount,
        logline: summary.logline,
        language: summary.language,
        progress: summary.progress,
        created_at: now,
        updated_at: now,
      });
      if (error) fail("story create", error);
      return { ok: true, project: { ...summary, draft: input.draft } };
    },

    async listProjects(userId) {
      const { data, error } = await client
        .from("projects")
        .select(SUMMARY_COLUMNS)
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });
      if (error) fail("story list", error);
      return ((data ?? []) as ProjectRow[]).map(toSummary);
    },

    async getProject(userId, id): Promise<Project | null> {
      // Ownership is part of the query, so another user's id looks like "not found".
      const { data, error } = await client
        .from("projects")
        .select(`${SUMMARY_COLUMNS}, draft`)
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) {
        // Not a valid uuid → treat as not found rather than a server error.
        if (error.code === "22P02") return null;
        fail("story load", error);
      }
      if (!data) return null;
      const parsed = StudioDraftSchema.safeParse(data.draft);
      if (!parsed.success) return null;
      return { ...toSummary(data as ProjectRow), draft: parsed.data };
    },

    async updateProject(userId, id, input) {
      const { data: existing, error: findError } = await client
        .from("projects")
        .select("title, created_at")
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle();
      if (findError) {
        if (findError.code === "22P02") return null;
        fail("story lookup", findError);
      }
      if (!existing) return null;

      const now = Date.now();
      const title = input.title === undefined ? existing.title : cleanTitle(input.title, input.draft);
      const summary: ProjectSummary = {
        id,
        title,
        logline: loglineOf(input.draft),
        sceneCount: input.draft.scenes.length,
        characterCount: input.draft.characters.length,
        language: input.draft.language,
        progress: progressOf(input.draft),
        createdAt: Number(existing.created_at),
        updatedAt: now,
      };
      const { error } = await client
        .from("projects")
        .update({
          title,
          draft: input.draft,
          scene_count: summary.sceneCount,
          character_count: summary.characterCount,
          logline: summary.logline,
          language: summary.language,
          progress: summary.progress,
          updated_at: now,
        })
        .eq("id", id)
        .eq("user_id", userId);
      if (error) fail("story save", error);
      return summary;
    },

    async renameProject(userId, id, title) {
      const clean = title.trim().slice(0, 120);
      if (!clean) return null;
      const { data, error } = await client
        .from("projects")
        .update({ title: clean, updated_at: Date.now() })
        .eq("id", id)
        .eq("user_id", userId)
        .select("id");
      if (error) {
        if (error.code === "22P02") return null;
        fail("rename", error);
      }
      return data && data.length > 0 ? clean : null;
    },

    async deleteProject(userId, id) {
      const { data, error } = await client
        .from("projects")
        .delete()
        .eq("id", id)
        .eq("user_id", userId)
        .select("id");
      if (error) {
        if (error.code === "22P02") return false;
        fail("delete", error);
      }
      return (data?.length ?? 0) > 0;
    },
  };
}

/**
 * Fails loudly (and helpfully) when Supabase is reachable but the tables haven't
 * been created yet, instead of letting every page crash with a vague error.
 */
export async function assertSupabaseReady(client: SupabaseClient): Promise<void> {
  const { error } = await client.from("users").select("id").limit(1);
  if (!error) return;
  if (error.code === "PGRST205" || error.code === "42P01") {
    throw new Error(
      "Supabase is connected, but its tables are missing. Open Supabase → SQL Editor, paste supabase/schema.sql, and press Run.",
    );
  }
  if (error.code === "PGRST301" || /invalid api key|jwt/i.test(error.message)) {
    throw new Error("Supabase rejected the key. Check SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local.");
  }
  throw new Error(`Could not reach Supabase: ${error.message}`);
}
