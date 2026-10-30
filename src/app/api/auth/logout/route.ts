import { cookies } from "next/headers";
import { clearSessionCookie, getStoreOrError, jsonOk, SESSION_COOKIE } from "@/lib/server/http";

export const runtime = "nodejs";

export async function POST() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) {
    const resolved = await getStoreOrError();
    // Even if the database is down, still sign the browser out.
    if ("store" in resolved) await resolved.store.deleteSession(token).catch(() => undefined);
  }
  const response = jsonOk({ ok: true });
  clearSessionCookie(response);
  return response;
}
