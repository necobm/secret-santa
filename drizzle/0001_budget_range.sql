-- Hand-written: drizzle-kit rebuilds the table, and DROP TABLE would cascade-delete Participants
-- (PRAGMA foreign_keys=OFF is ignored inside the migration transaction). SQLite can add the column with its CHECK.
ALTER TABLE `draws` ADD `budget_max_cents` integer CONSTRAINT "draws_budget_max_chk" CHECK(budget_max_cents is null or (budget_cents is not null and budget_max_cents > budget_cents));
