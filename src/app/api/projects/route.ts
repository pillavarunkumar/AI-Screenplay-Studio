import type { NextRequest } from "next/server";
import { z } from "zod";
import { StudioDraftSchema } from "@/lib/schemas/draft";
import { getStoreOrError, jsonError, jsonOk, readJson, requireUser } from "@/lib/server/http";
import { MAX_DRAFT_BYTES, MAX_PROJECTS_PER_USER } from "@/lib/server/projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  title: z.string().max(120).optional(),
  draft: StudioDraftSchema,
});

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const resolved = await getStoreOrError();
  if ("response" in resolved) return resolved.response;
  return jsonOk({ projects: await resolved.store.listProjects(auth.user.id) });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const parsedBody = await readJson(request, MAX_DRAFT_BYTES);
  if ("response" in parsedBody) return parsedBody.response;

  const input = CreateSchema.safeParse(parsedBody.body);
  if (!input.success) {
    return jsonError("invalid_input", "That story could not be saved because its data is invalid.", 400);
  }

  const resolved = await getStoreOrError();
  if ("response" in resolved) return resolved.response;
  const result = await resolved.store.createProject(auth.user.id, input.data);
  if (!result.ok) {
    return jsonError(
      "project_limit",
      `You can keep up to ${MAX_PROJECTS_PER_USER} stories. Delete one to make room.`,
      409,
    );
  }
  return jsonOk({ project: result.project }, 201);
}
