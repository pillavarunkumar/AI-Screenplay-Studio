import type { NextRequest } from "next/server";
import { SignupSchema } from "@/lib/schemas/auth";
import {
  checkAuthRateLimit,
  getStoreOrError,
  jsonError,
  jsonOk,
  readJson,
  setSessionCookie,
} from "@/lib/server/http";
import { hashPassword } from "@/lib/server/password";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const limited = checkAuthRateLimit(request);
  if (limited) return limited;

  const parsedBody = await readJson(request, 4_000);
  if ("response" in parsedBody) return parsedBody.response;

  const input = SignupSchema.safeParse(parsedBody.body);
  if (!input.success) {
    return jsonError(
      "invalid_input",
      input.error.issues[0]?.message ?? "Check your details and try again.",
      400,
    );
  }

  const resolved = await getStoreOrError();
  if ("response" in resolved) return resolved.response;
  const { store } = resolved;
  const user = await store.createUser({
    name: input.data.name,
    email: input.data.email,
    passwordHash: await hashPassword(input.data.password),
  });
  if (!user) {
    return jsonError("email_taken", "An account with this email already exists. Try signing in.", 409);
  }

  const session = await store.createSession(user.id);
  const response = jsonOk({ user }, 201);
  setSessionCookie(response, session.token);
  return response;
}
