import { describe, expect, it, vi } from "vitest";
import { assertSupabaseReady, createSupabaseStore } from "./supabase-store";
import { createSupabaseAdmin } from "./supabase";

/** A Supabase client whose network calls are answered by `respond`. */
function storeWith(respond: (url: URL, init: RequestInit) => { status?: number; body: unknown }) {
  const calls: { url: URL; init: RequestInit }[] = [];
  const fakeFetch = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input));
    calls.push({ url, init });
    const { status = 200, body } = respond(url, init);
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  });
  const client = createSupabaseAdmin("https://example.supabase.co", "sb_secret_test", fakeFetch as unknown as typeof fetch);
  return { store: createSupabaseStore(client), calls };
}

describe("supabase store", () => {
  it("treats a duplicate email (unique violation) as 'already registered'", async () => {
    const { store } = storeWith(() => ({ status: 409, body: { code: "23505", message: "duplicate key value" } }));
    expect(await store.createUser({ name: "Ada", email: "a@x.com", passwordHash: "h" })).toBeNull();
  });

  it("creates a user and never sends the password anywhere but as a hash", async () => {
    const { store, calls } = storeWith(() => ({ status: 201, body: [] }));
    const user = await store.createUser({ name: "Ada", email: "a@x.com", passwordHash: "scrypt$abc" });
    expect(user).toMatchObject({ name: "Ada", email: "a@x.com" });
    const sent = JSON.parse(String(calls[0].init.body));
    expect(sent.password_hash).toBe("scrypt$abc");
    expect(sent).not.toHaveProperty("password");
  });

  it("looks sessions up by hashed token and maps the joined user", async () => {
    const { store, calls } = storeWith(() => ({ body: { user: { id: "u1", email: "a@x.com", name: "Ada" } } }));
    expect(await store.getUserBySession("secret-token")).toEqual({ id: "u1", email: "a@x.com", name: "Ada" });
    const query = calls[0].url.search;
    expect(query).toContain("token_hash=eq.");
    expect(query).not.toContain("secret-token"); // only the hash is sent
    expect(query).toContain("expires_at=gt.");
  });

  it("returns null when there is no matching session", async () => {
    const { store } = storeWith(() => ({ body: null, status: 200 }));
    // PostgREST answers an empty single() lookup with 406/empty; both must read as "not signed in".
    expect(await store.getUserBySession("nope")).toBeNull();
  });

  it("scopes every story query to the signed-in user", async () => {
    const { store, calls } = storeWith(() => ({ body: [] }));
    await store.listProjects("user-1");
    await store.deleteProject("user-1", "11111111-1111-1111-1111-111111111111");
    for (const call of calls) expect(call.url.search).toContain("user_id=eq.user-1");
  });

  it("treats a malformed story id as not found instead of an error", async () => {
    const { store } = storeWith(() => ({ status: 400, body: { code: "22P02", message: "invalid input syntax for type uuid" } }));
    expect(await store.getProject("user-1", "not-a-uuid")).toBeNull();
    expect(await store.deleteProject("user-1", "not-a-uuid")).toBe(false);
  });

  it("surfaces unexpected database errors", async () => {
    const { store } = storeWith(() => ({ status: 500, body: { code: "XX000", message: "boom" } }));
    await expect(store.listProjects("user-1")).rejects.toThrow(/story list failed: boom/);
  });
});

describe("assertSupabaseReady", () => {
  const clientFor = (status: number, body: unknown) =>
    createSupabaseAdmin(
      "https://example.supabase.co",
      "sb_secret_test",
      (async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })) as unknown as typeof fetch,
    );

  it("passes when the tables exist", async () => {
    await expect(assertSupabaseReady(clientFor(200, []))).resolves.toBeUndefined();
  });

  it("explains how to fix missing tables", async () => {
    await expect(
      assertSupabaseReady(clientFor(404, { code: "PGRST205", message: "Could not find the table 'public.users'" })),
    ).rejects.toThrow(/supabase\/schema\.sql/);
  });

  it("explains a rejected key", async () => {
    await expect(
      assertSupabaseReady(clientFor(401, { message: "Invalid API key" })),
    ).rejects.toThrow(/SUPABASE_SECRET_KEY/);
  });
});
