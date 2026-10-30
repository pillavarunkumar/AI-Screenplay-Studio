import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Writing requires an account; this just routes people to the right place. */
export default async function StudioPage() {
  redirect((await getCurrentUser()) ? "/projects" : "/login?next=/projects");
}
