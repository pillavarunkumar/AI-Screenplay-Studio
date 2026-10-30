import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { EMPTY_DRAFT } from "@/lib/schemas/draft";
import { createSupabaseStore } from "./supabase-store";
import { createSupabaseAdmin } from "./supabase";

/**
 * Round trip against the REAL Supabase project. Skipped unless SUPABASE_URL and
 * SUPABASE_SECRET_KEY are set (CI doesn't have them). Run with:
 *   set -a; . ./.env.local; set +a; npx vitest run supabase-store.live
 * It creates a throwaway user and deletes it (cascading to its data) afterwards.
 */
const live = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);

describe.skipIf(!live)("supabase store (live)", () => {
  const client = live ? createSupabaseAdmin() : (null as never);
  const store = live ? createSupabaseStore(client) : (null as never);
  const email = `live-test-${randomUUID()}@example.com`;
  let userId = "";

  afterAll(async () => {
    if (userId) await client.from("users").delete().eq("id", userId);
  });

  it("signs up, signs in, saves, edits, renames, and deletes a story", async () => {
    const user = await store.createUser({ name: "Live Test", email, passwordHash: "scrypt$x$y" });
    expect(user).not.toBeNull();
    userId = user!.id;
    expect(await store.createUser({ name: "Dup", email, passwordHash: "h" })).toBeNull();
    expect((await store.findUserByEmail(email))?.passwordHash).toBe("scrypt$x$y");

    const session = await store.createSession(userId);
    expect((await store.getUserBySession(session.token))?.email).toBe(email);
    expect(await store.getUserBySession("wrong-token")).toBeNull();

    const created = await store.createProject(userId, { title: "Live story", draft: { ...EMPTY_DRAFT, idea: "A nurse inherits a lighthouse", language: "Telugu" } });
    expect(created.ok).toBe(true);
    const id = (created as { ok: true; project: { id: string } }).project.id;

    const list = await store.listProjects(userId);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ title: "Live story", language: "Telugu" });

    const updated = await store.updateProject(userId, id, { draft: { ...EMPTY_DRAFT, idea: "Changed", language: "Telugu" } });
    expect(updated?.title).toBe("Live story");
    expect((await store.getProject(userId, id))?.draft.idea).toBe("Changed");
    expect(await store.renameProject(userId, id, "Renamed")).toBe("Renamed");

    // Another user can never see it.
    expect(await store.getProject(randomUUID(), id)).toBeNull();
    expect(await store.deleteProject(randomUUID(), id)).toBe(false);
    expect(await store.getProject(userId, "not-a-uuid")).toBeNull();

    await store.deleteSession(session.token);
    expect(await store.getUserBySession(session.token)).toBeNull();
    expect(await store.deleteProject(userId, id)).toBe(true);
    expect(await store.listProjects(userId)).toHaveLength(0);
  }, 60_000);
});
