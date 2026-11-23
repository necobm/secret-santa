import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import type { Db } from "./client";

export const MIGRATIONS_FOLDER = "drizzle";

export function runMigrations(db: Db, migrationsFolder = MIGRATIONS_FOLDER) {
  migrate(db, { migrationsFolder });
}
