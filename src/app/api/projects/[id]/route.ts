import type { NextRequest } from "next/server";
import { z } from "zod";
import { StudioDraftSchema } from "@/lib/schemas/draft";
import { getStoreOrError, jsonError, jsonOk, readJson, requireUser } from "@/lib/server/http";
import { MAX_DRAFT_BYTES } from "@/lib/server/projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UpdateSchema = z.object({
  title: z.string().max(120).optional(),
  draft: StudioDraftSchema,
});

type Context = { params: Promise<{ id: string }> };

const notFound = () => jsonError("not_found", "Story not found.", 404);

export async function GET(_request: NextRequest, { params }: Context) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const resolved = await getStoreOrError();
  if ("response" in resolved) return resolved.response;
  const { store } = resolved;

  const project = await store.getProject(auth.user.id, id);
  return project ? jsonOk({ project }) : notFound();
}

export async function PUT(request: NextRequest, { params }: Context) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const resolved = await getStoreOrError();
  if ("response" in resolved) return resolved.response;
  const { store } = resolved;

  const parsedBody = await readJson(request, MAX_DRAFT_BYTES);
  if ("response" in parsedBody) return parsedBody.response;

  const input = UpdateSchema.safeParse(parsedBody.body);
  if (!input.success) {
    return jsonError("invalid_input", "That story could not be saved because its data is invalid.", 400);
  }

  const project = await store.updateProject(auth.user.id, id, input.data);
  return project ? jsonOk({ project }) : notFound();
}

const RenameSchema = z.object({ title: z.string().trim().min(1, "Enter a title.").max(120) });

export async function PATCH(request: NextRequest, { params }: Context) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const resolved = await getStoreOrError();
  if ("response" in resolved) return resolved.response;
  const { store } = resolved;

  const parsedBody = await readJson(request, 1_000);
  if ("response" in parsedBody) return parsedBody.response;

  const input = RenameSchema.safeParse(parsedBody.body);
  if (!input.success) {
    return jsonError("invalid_input", input.error.issues[0]?.message ?? "Enter a title.", 400);
  }

  const title = await store.renameProject(auth.user.id, id, input.data.title);
  return title ? jsonOk({ title }) : notFound();
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const resolved = await getStoreOrError();
  if ("response" in resolved) return resolved.response;
  const { store } = resolved;

  return await store.deleteProject(auth.user.id, id)
    ? jsonOk({ ok: true })
    : notFound();
}
