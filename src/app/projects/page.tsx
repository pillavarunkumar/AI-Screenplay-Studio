import { redirect } from "next/navigation";
import { ProjectList } from "@/components/project-list";
import { getStore } from "@/lib/server/store";
import { getCurrentUser } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/projects");

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 sm:py-12">
      <ProjectList initial={await (await getStore()).listProjects(user.id)} firstName={user.name.trim().split(/\s+/)[0]} />
    </main>
  );
}
