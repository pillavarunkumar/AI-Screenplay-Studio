import type { StudioDraft } from "./schemas/draft";

export class ProjectRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ProjectRequestError";
  }
}

async function request<T>(
  url: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: init.json ? { "content-type": "application/json" } : undefined,
      body: init.json ? JSON.stringify(init.json) : undefined,
    });
  } catch {
    throw new ProjectRequestError("Could not reach the server.", 0);
  }

  const payload = (await response.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  if (!response.ok) {
    throw new ProjectRequestError(
      response.status === 401
        ? "Your session expired. Sign in again to keep saving."
        : (payload?.error?.message ?? `Request failed (${response.status}).`),
      response.status,
    );
  }
  return payload as T;
}

export const saveProject = (
  id: string,
  body: { title: string; draft: StudioDraft },
) =>
  request<{ project: { title: string; updatedAt: number } }>(
    `/api/projects/${id}`,
    { method: "PUT", json: body },
  );

export const createProjectRequest = (body: {
  title?: string;
  draft: StudioDraft;
}) => request<{ project: { id: string } }>("/api/projects", { method: "POST", json: body });

export const deleteProjectRequest = (id: string) =>
  request<{ ok: true }>(`/api/projects/${id}`, { method: "DELETE" });

export const logoutRequest = () =>
  request<{ ok: true }>("/api/auth/logout", { method: "POST" });

export async function submitAuth(
  mode: "login" | "signup",
  body: Record<string, string>,
): Promise<void> {
  await request(`/api/auth/${mode}`, { method: "POST", json: body });
}

export const renameProjectRequest = (id: string, title: string) =>
  request<{ title: string }>(`/api/projects/${id}`, { method: "PATCH", json: { title } });
