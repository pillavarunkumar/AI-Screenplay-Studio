import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client using the SECRET key, which bypasses row-level
 * security. It must never reach the browser: this module is server-only and the
 * key has no NEXT_PUBLIC_ prefix. Access control is enforced in `supabase-store.ts`
 * by always scoping queries to the signed-in user's id.
 */
export function createSupabaseAdmin(
  url = process.env.SUPABASE_URL?.trim(),
  secretKey = process.env.SUPABASE_SECRET_KEY?.trim(),
  fetchImpl: typeof fetch = fetch,
): SupabaseClient {
  if (!url || !secretKey) {
    throw new Error("Set SUPABASE_URL and SUPABASE_SECRET_KEY to use Supabase storage.");
  }
  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      // Next.js caches server-side GETs by default; account and story data must always be fresh.
      fetch: (input, init) => fetchImpl(input, { ...init, cache: "no-store" }),
    },
  });
}
