import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

// libSQL (ADR-0004): Turso in production, a local SQLite file in development, `:memory:` in tests.

export interface DbConfig {
  url: string;
  authToken?: string;
}

export function dbConfig(): DbConfig {
  return {
    url: process.env.TURSO_DATABASE_URL ?? "file:data/secret-santa.db",
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  };
}

export function openDb({ url, authToken }: DbConfig = dbConfig()) {
  if (url.startsWith("file:")) mkdirSync(dirname(url.slice("file:".length)), { recursive: true });
  const client = createClient({ url, authToken });
  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof openDb>;

let db: Db | undefined;

/**
 * One client per server instance; on Vercel each instance has its own.
 * In Server Components, call `connection()` from next/server before querying,
 * or the query would run during prerendering.
 */
export function getDb(): Db {
  db ??= openDb();
  return db;
}
