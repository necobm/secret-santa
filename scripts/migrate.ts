import { databasePath, openDb } from "../src/db/client";
import { runMigrations } from "../src/db/migrate";

const path = databasePath();
runMigrations(openDb(path));
console.log(`Migraciones aplicadas en ${path}`);
