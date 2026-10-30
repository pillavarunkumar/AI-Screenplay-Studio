import { notFound, redirect } from "next/navigation";
import { StudioWorkspace } from "@/components/studio-workspace";
import { getStore } from "@/lib/server/store";
import { getCurrentUser } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/projects/${id}`)}`);

  const project = await (await getStore()).getProject(user.id, id);
  if (!project) notFound();

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <StudioWorkspace
        author={user.name}
        remote={{ id: project.id, title: project.title, draft: project.draft }}
      />
    </main>
  );
}
