import { getCurrentUser, jsonOk } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return jsonOk({ user: await getCurrentUser() });
}
