import "server-only";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

export type Db = Database.Database;

const MIGRATIONS = [
  `
  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX sessions_user ON sessions(user_id);
  CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    draft TEXT NOT NULL,
    scene_count INTEGER NOT NULL DEFAULT 0,
    character_count INTEGER NOT NULL DEFAULT 0,
    logline TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX projects_user_updated ON projects(user_id, updated_at DESC);
  `,
  // Card info for the My stories page. progress stays NULL until computed.
  `
  ALTER TABLE projects ADD COLUMN language TEXT NOT NULL DEFAULT 'English';
  ALTER TABLE projects ADD COLUMN progress INTEGER;
  `,
];

/** Applies pending migrations using SQLite's `user_version` as the cursor. */
export function migrate(db: Db): void {
  const current = db.pragma("user_version", { simple: true }) as number;
  for (let version = current; version < MIGRATIONS.length; version += 1) {
    db.transaction(() => {
      db.exec(MIGRATIONS[version]);
      db.pragma(`user_version = ${version + 1}`);
    })();
  }
}

export function openDb(file: string): Db {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

const globalForDb = globalThis as unknown as { __studioDb?: Db };

/** Singleton that survives Next.js dev hot reloads. */
export function getDb(): Db {
  if (!globalForDb.__studioDb) {
    const file =
      process.env.DATABASE_PATH?.trim() ||
      path.join(process.cwd(), "data", "studio.db");
    globalForDb.__studioDb = openDb(file);
  }
  return globalForDb.__studioDb;
}
