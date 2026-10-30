import "server-only";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import type { PublicUser } from "@/lib/schemas/auth";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";
import { getStore, type Store } from "./store";
import { SESSION_TTL_MS } from "./users";

export const SESSION_COOKIE = "ss_session";

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
}

export function jsonError(code: string, message: string, status: number, extra: object = {}) {
  return NextResponse.json(
    { error: { code, message, ...extra } },
    { status, headers: { "cache-control": "no-store" } },
  );
}

export function jsonOk(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

/** For server components and route handlers. */
export async function getCurrentUser(): Promise<PublicUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    return await (await getStore()).getUserBySession(token);
  } catch (error) {
    // A broken or not-yet-set-up database must not take down public pages
    // (home, Learn, Examples): treat the visitor as signed out and log why.
    console.error("[auth] could not check the session:", error instanceof Error ? error.message : error);
    return null;
  }
}

/** The data store, or a clear 503 response when it can't be reached. */
export async function getStoreOrError(): Promise<{ store: Store } | { response: NextResponse }> {
  try {
    return { store: await getStore() };
  } catch (error) {
    console.error("[store] unavailable:", error instanceof Error ? error.message : error);
    return {
      response: jsonError(
        "storage_unavailable",
        "We can't reach the story database right now. Please try again in a moment.",
        503,
      ),
    };
  }
}

export async function requireUser(): Promise<
  { user: PublicUser } | { response: NextResponse }
> {
  const user = await getCurrentUser();
  return user
    ? { user }
    : { response: jsonError("unauthorized", "Sign in to continue.", 401) };
}

/**
 * Reading JSON requires `application/json`, which a cross-site HTML form cannot
 * send. Together with SameSite=Lax cookies this blocks CSRF on write routes.
 */
export async function readJson(
  request: NextRequest,
  maxBytes: number,
): Promise<{ body: unknown } | { response: NextResponse }> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return { response: jsonError("invalid_input", "Content-Type must be application/json.", 415) };
  }
  const text = await request.text().catch(() => null);
  if (text === null) {
    return { response: jsonError("invalid_input", "Could not read request body.", 400) };
  }
  if (text.length > maxBytes) {
    return { response: jsonError("invalid_input", "Request body is too large.", 413) };
  }
  try {
    return { body: JSON.parse(text) };
  } catch {
    return { response: jsonError("invalid_input", "Request body must be valid JSON.", 400) };
  }
}

const authLimiter = createRateLimiter({ limit: 10, windowMs: 60_000 });

/** Throttles credential guessing and signup spam per client IP. */
export function checkAuthRateLimit(request: NextRequest): NextResponse | null {
  const result = authLimiter.check(getClientIp(request.headers));
  if (result.allowed) return null;
  return jsonError(
    "rate_limited",
    `Too many attempts. Try again in ${result.retryAfterSec}s.`,
    429,
    { retryAfterSec: result.retryAfterSec },
  );
}
