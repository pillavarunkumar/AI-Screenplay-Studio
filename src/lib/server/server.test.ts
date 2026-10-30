import { beforeEach, describe, expect, it } from "vitest";
import { EMPTY_DRAFT } from "@/lib/schemas/draft";
import { openDb, type Db } from "./db";
import { hashPassword, verifyPassword } from "./password";
import {
  cleanTitle,
  createProject,
  deleteProject,
  getProject,
  listProjects,
  MAX_PROJECTS_PER_USER,
  renameProject,
  updateProject,
} from "./projects";
import {
  createSession,
  createUser,
  deleteSession,
  findUserByEmail,
  getUserBySession,
  SESSION_TTL_MS,
} from "./users";

let db: Db;
beforeEach(() => {
  db = openDb(":memory:");
});

const makeUser = (email = "a@example.com") =>
  createUser(db, { name: "Ada", email, passwordHash: "x" })!;

const draftWithIdea = (idea: string) => ({ ...EMPTY_DRAFT, idea });

describe("password hashing", () => {
  it("verifies the right password and rejects others", async () => {
    const stored = await hashPassword("correct horse");
    expect(stored).toMatch(/^scrypt\$/);
    expect(await verifyPassword("correct horse", stored)).toBe(true);
    expect(await verifyPassword("wrong", stored)).toBe(false);
  });

  it("salts each hash and rejects malformed values", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
    expect(await verifyPassword("same", "garbage")).toBe(false);
  });
});

describe("users and sessions", () => {
  it("creates a user and rejects a duplicate email", () => {
    expect(makeUser()).not.toBeNull();
    expect(createUser(db, { name: "B", email: "a@example.com", passwordHash: "y" })).toBeNull();
    expect(findUserByEmail(db, "a@example.com")?.user.name).toBe("Ada");
  });

  it("resolves a session token, stores only its hash, and expires it", () => {
    const user = makeUser();
    const { token } = createSession(db, user.id, 1_000);
    const stored = db.prepare("SELECT token_hash FROM sessions").get() as { token_hash: string };
    expect(stored.token_hash).not.toContain(token);
    expect(getUserBySession(db, token, 2_000)?.id).toBe(user.id);
    expect(getUserBySession(db, token, 1_000 + SESSION_TTL_MS)).toBeNull();
    expect(getUserBySession(db, "bogus", 2_000)).toBeNull();
  });

  it("logout invalidates the session", () => {
    const user = makeUser();
    const { token } = createSession(db, user.id);
    deleteSession(db, token);
    expect(getUserBySession(db, token)).toBeNull();
  });
});

describe("projects", () => {
  it("round-trips a draft and lists newest first", () => {
    const user = makeUser();
    const first = createProject(db, user.id, { draft: draftWithIdea("First idea here."), title: "One" }, 1);
    const second = createProject(db, user.id, { draft: draftWithIdea("Second idea here.") }, 2);
    expect(first.ok && second.ok).toBe(true);

    expect(listProjects(db, user.id).map((p) => p.title)).toEqual(["Second idea here.", "One"]);
    const loaded = getProject(db, user.id, (first as { ok: true; project: { id: string } }).project.id);
    expect(loaded?.draft.idea).toBe("First idea here.");
  });

  it("updates title and draft, bumping updatedAt", () => {
    const user = makeUser();
    const created = createProject(db, user.id, { draft: EMPTY_DRAFT }, 1);
    const id = (created as { ok: true; project: { id: string } }).project.id;

    const updated = updateProject(db, user.id, id, { draft: draftWithIdea("Changed"), title: "Renamed" }, 5);
    expect(updated).toMatchObject({ title: "Renamed", updatedAt: 5, createdAt: 1 });
    expect(getProject(db, user.id, id)?.draft.idea).toBe("Changed");

    // Omitting the title keeps the existing one.
    expect(updateProject(db, user.id, id, { draft: EMPTY_DRAFT }, 6)?.title).toBe("Renamed");
  });

  it("renames without touching the draft, only for the owner", () => {
    const owner = makeUser();
    const other = makeUser("b@example.com");
    const created = createProject(db, owner.id, { draft: draftWithIdea("Keep me") }, 1);
    const id = (created as { ok: true; project: { id: string } }).project.id;

    expect(renameProject(db, owner.id, id, "  New name  ", 9)).toBe("New name");
    expect(renameProject(db, owner.id, id, "   ")).toBeNull();
    expect(renameProject(db, other.id, id, "Hijack")).toBeNull();
    const loaded = getProject(db, owner.id, id)!;
    expect(loaded).toMatchObject({ title: "New name", updatedAt: 9 });
    expect(loaded.draft.idea).toBe("Keep me");
  });

  it("never exposes another user's project", () => {
    const owner = makeUser();
    const other = makeUser("b@example.com");
    const created = createProject(db, owner.id, { draft: EMPTY_DRAFT });
    const id = (created as { ok: true; project: { id: string } }).project.id;

    expect(getProject(db, other.id, id)).toBeNull();
    expect(updateProject(db, other.id, id, { draft: EMPTY_DRAFT })).toBeNull();
    expect(deleteProject(db, other.id, id)).toBe(false);
    expect(deleteProject(db, owner.id, id)).toBe(true);
    expect(getProject(db, owner.id, id)).toBeNull();
  });

  it("enforces the per-user project limit", () => {
    const user = makeUser();
    for (let i = 0; i < MAX_PROJECTS_PER_USER; i += 1) {
      expect(createProject(db, user.id, { draft: EMPTY_DRAFT }).ok).toBe(true);
    }
    expect(createProject(db, user.id, { draft: EMPTY_DRAFT })).toEqual({ ok: false, reason: "limit" });
  });

  it("derives a short title from the idea", () => {
    expect(cleanTitle(undefined, EMPTY_DRAFT)).toBe("Untitled story");
    expect(cleanTitle("  ", draftWithIdea("A lighthouse keeper. Then more."))).toBe("A lighthouse keeper.");
    expect(cleanTitle(undefined, draftWithIdea("x".repeat(100))).length).toBeLessThanOrEqual(58);
  });

  it("deletes a user's data with the user", () => {
    const user = makeUser();
    createProject(db, user.id, { draft: EMPTY_DRAFT });
    createSession(db, user.id);
    db.prepare("DELETE FROM users WHERE id = ?").run(user.id);
    expect(db.prepare("SELECT COUNT(*) c FROM projects").get()).toEqual({ c: 0 });
    expect(db.prepare("SELECT COUNT(*) c FROM sessions").get()).toEqual({ c: 0 });
  });
});

describe("card info", () => {
  it("tracks language and progress, and backfills stories saved before progress existed", () => {
    const user = makeUser();
    const created = createProject(db, user.id, {
      draft: { ...EMPTY_DRAFT, language: "Telugu", idea: "A nurse inherits a lighthouse" },
    });
    const id = (created as { ok: true; project: { id: string } }).project.id;
    expect(listProjects(db, user.id)[0]).toMatchObject({ language: "Telugu", progress: 13 });

    // Simulate a row from before the progress column was filled in.
    db.prepare("UPDATE projects SET progress = NULL, language = 'English' WHERE id = ?").run(id);
    expect(listProjects(db, user.id)[0]).toMatchObject({ language: "Telugu", progress: 13 });
    expect(db.prepare("SELECT progress FROM projects WHERE id = ?").get(id)).toEqual({ progress: 13 });
  });
});

import { createSqliteStore } from "./sqlite-store";

describe("sqlite store (fallback backend)", () => {
  it("implements the same async interface", async () => {
    const store = createSqliteStore(openDb(":memory:"));
    const user = await store.createUser({ name: "Ada", email: "a@example.com", passwordHash: "x" });
    expect(user).not.toBeNull();
    expect(await store.createUser({ name: "B", email: "a@example.com", passwordHash: "y" })).toBeNull();
    const session = await store.createSession(user!.id);
    expect((await store.getUserBySession(session.token))?.id).toBe(user!.id);
    const created = await store.createProject(user!.id, { draft: draftWithIdea("Hello there story") });
    expect(created.ok).toBe(true);
    expect(await store.listProjects(user!.id)).toHaveLength(1);
    await store.deleteSession(session.token);
    expect(await store.getUserBySession(session.token)).toBeNull();
    expect(store.kind).toBe("sqlite");
  });
});
