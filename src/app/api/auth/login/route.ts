import type { NextRequest } from "next/server";
import { LoginSchema } from "@/lib/schemas/auth";
import {
  checkAuthRateLimit,
  getStoreOrError,
  jsonError,
  jsonOk,
  readJson,
  setSessionCookie,
} from "@/lib/server/http";
import { getDummyHash, verifyPassword } from "@/lib/server/password";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const limited = checkAuthRateLimit(request);
  if (limited) return limited;

  const parsedBody = await readJson(request, 2_000);
  if ("response" in parsedBody) return parsedBody.response;

  const input = LoginSchema.safeParse(parsedBody.body);
  if (!input.success) {
    return jsonError(
      "invalid_input",
      input.error.issues[0]?.message ?? "Enter your email and password.",
      400,
    );
  }

  const resolved = await getStoreOrError();
  if ("response" in resolved) return resolved.response;
  const { store } = resolved;
  const found = await store.findUserByEmail(input.data.email);
  // Hash even for unknown emails so response time doesn't reveal which exist.
  const valid = await verifyPassword(
    input.data.password,
    found?.passwordHash ?? (await getDummyHash()),
  );
  if (!found || !valid) {
    return jsonError("invalid_credentials", "Incorrect email or password.", 401);
  }

  const session = await store.createSession(found.user.id);
  const response = jsonOk({ user: found.user });
  setSessionCookie(response, session.token);
  return response;
}
