/**
 * One-off: copy accounts, active sessions, and stories from the local SQLite file
 * (data/studio.db, or DATABASE_PATH) into Supabase. Safe to re-run (upserts by id).
 *
 *   npx tsx scripts/migrate-sqlite-to-supabase.ts
 *
 * Run supabase/schema.sql in the Supabase SQL editor first.
 */
import { createClient } from "@supabase/supabase-js";
import Database from "better-sqlite3";
import path from "node:path";

try {
  process.loadEnvFile(".env.local");
} catch {
  // Environment may already be set.
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SECRET_KEY (in .env.local).");
  process.exit(1);
}

const file = process.env.DATABASE_PATH?.trim() || path.join(process.cwd(), "data", "studio.db");
const sqlite = new Database(file, { readonly: true });
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function upsertAll(table: string, rows: object[], onConflict: string) {
  for (let i = 0; i < rows.length; i += 50) {
    const { error } = await supabase.from(table).upsert(rows.slice(i, i + 50), { onConflict });
    if (error) {
      console.error(`Failed copying ${table}: ${error.message} (${error.code ?? "?"})`);
      if (error.code === "PGRST205") console.error("The tables don't exist yet. Run supabase/schema.sql first.");
      process.exit(1);
    }
  }
  console.log(`  ${table}: ${rows.length} copied`);
}

(async () => {
  console.log(`Copying from ${file}`);
  const users = sqlite.prepare("SELECT id, email, name, password_hash, created_at FROM users").all() as object[];
  const sessions = sqlite
    .prepare("SELECT token_hash, user_id, expires_at FROM sessions WHERE expires_at > ?")
    .all(Date.now()) as object[];
  const projectRows = sqlite
    .prepare(
      "SELECT id, user_id, title, draft, scene_count, character_count, logline, language, progress, created_at, updated_at FROM projects",
    )
    .all() as { draft: string }[];
  const projects = projectRows.map((row) => ({ ...row, draft: JSON.parse(row.draft) }));

  await upsertAll("users", users, "id");
  await upsertAll("sessions", sessions, "token_hash");
  await upsertAll("projects", projects, "id");
  console.log("Done. Your accounts and stories are now in Supabase.");
})();
