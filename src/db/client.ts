import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export function openDb(path: string) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

export type Db = ReturnType<typeof openDb>;

export function databasePath() {
  return process.env.DATABASE_PATH ?? "data/secret-santa.db";
}

let db: Db | undefined;

/**
 * The process's single connection (ADR-0002: a single Node process).
 * In Server Components, call `connection()` from next/server before querying,
 * or the synchronous query would run during prerendering.
 */
export function getDb(): Db {
  db ??= openDb(databasePath());
  return db;
}
