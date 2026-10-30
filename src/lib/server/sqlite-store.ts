import "server-only";
import { getDb, type Db } from "./db";
import * as projects from "./projects";
import type { Store } from "./store";
import * as users from "./users";

/** The original local-file backend, behind the same interface. Used when Supabase isn't configured, and in tests. */
export function createSqliteStore(db: Db = getDb()): Store {
  return {
    kind: "sqlite",
    findUserByEmail: async (email) => users.findUserByEmail(db, email),
    createUser: async (input) => users.createUser(db, input),
    createSession: async (userId) => users.createSession(db, userId),
    getUserBySession: async (token) => users.getUserBySession(db, token),
    deleteSession: async (token) => users.deleteSession(db, token),
    createProject: async (userId, input) => projects.createProject(db, userId, input),
    listProjects: async (userId) => projects.listProjects(db, userId),
    getProject: async (userId, id) => projects.getProject(db, userId, id),
    updateProject: async (userId, id, input) => projects.updateProject(db, userId, id, input),
    renameProject: async (userId, id, title) => projects.renameProject(db, userId, id, title),
    deleteProject: async (userId, id) => projects.deleteProject(db, userId, id),
  };
}
