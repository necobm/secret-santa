import { migrate } from "drizzle-orm/libsql/migrator";
import type { Db } from "./client";

export const MIGRATIONS_FOLDER = "drizzle";

export async function runMigrations(db: Db, migrationsFolder = MIGRATIONS_FOLDER) {
  await migrate(db, { migrationsFolder });
}
