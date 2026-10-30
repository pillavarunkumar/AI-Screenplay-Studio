import "server-only";
import { randomBytes, createHash, randomUUID } from "node:crypto";
import type { PublicUser } from "@/lib/schemas/auth";
import type { Db } from "./db";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
}

const toPublic = (row: UserRow): PublicUser => ({
  id: row.id,
  name: row.name,
  email: row.email,
});

export function findUserByEmail(db: Db, email: string) {
  const row = db
    .prepare("SELECT id, email, name, password_hash FROM users WHERE email = ?")
    .get(email) as UserRow | undefined;
  return row ? { user: toPublic(row), passwordHash: row.password_hash } : null;
}

/** Returns null when the email is already registered. */
export function createUser(
  db: Db,
  input: { name: string; email: string; passwordHash: string },
  now = Date.now(),
): PublicUser | null {
  const id = randomUUID();
  try {
    db.prepare(
      "INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run(id, input.email, input.name, input.passwordHash, now);
  } catch (error) {
    if ((error as { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE") {
      return null;
    }
    throw error;
  }
  return { id, name: input.name, email: input.email };
}

export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

/** A fresh random sign-in token (the cookie value). Only its hash is ever stored. */
export const newSessionToken = () => randomBytes(32).toString("base64url");

/** Only a hash of the token is stored, so a leaked database can't be replayed. */
export function createSession(db: Db, userId: string, now = Date.now()) {
  const token = newSessionToken();
  const expiresAt = now + SESSION_TTL_MS;
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now);
  db.prepare(
    "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
  ).run(hashToken(token), userId, expiresAt);
  return { token, expiresAt };
}

export function getUserBySession(
  db: Db,
  token: string,
  now = Date.now(),
): PublicUser | null {
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.name, u.password_hash
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(hashToken(token), now) as UserRow | undefined;
  return row ? toPublic(row) : null;
}

export function deleteSession(db: Db, token: string): void {
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
}
