import { dbConfig, openDb } from "../src/db/client";
import { runMigrations } from "../src/db/migrate";

async function main() {
  const { url } = dbConfig();
  await runMigrations(openDb());
  console.log(`Migrations applied to ${url}`);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
