CREATE TABLE `assignments` (
	`draw_id` integer NOT NULL,
	`giver_id` integer NOT NULL,
	`recipient_id` integer NOT NULL,
	PRIMARY KEY(`draw_id`, `giver_id`),
	FOREIGN KEY (`draw_id`) REFERENCES `draws`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`giver_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipient_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "assignments_no_self_gift_chk" CHECK(giver_id <> recipient_id)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assignments_recipient_uq` ON `assignments` (`draw_id`,`recipient_id`);--> statement-breakpoint
CREATE TABLE `draws` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`organizer_id` integer NOT NULL,
	`name` text NOT NULL,
	`budget_cents` integer,
	`exchange_date` text,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`organizer_id`) REFERENCES `organizers`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "draws_status_chk" CHECK(status in ('open', 'drawn')),
	CONSTRAINT "draws_budget_chk" CHECK(budget_cents is null or budget_cents >= 0)
);
--> statement-breakpoint
CREATE INDEX `draws_organizer_idx` ON `draws` (`organizer_id`);--> statement-breakpoint
CREATE TABLE `organizers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organizers_email_unique` ON `organizers` (`email`);--> statement-breakpoint
CREATE TABLE `participants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`draw_id` integer NOT NULL,
	`name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`token` text NOT NULL,
	`is_organizer` integer DEFAULT false NOT NULL,
	`likes` text DEFAULT '' NOT NULL,
	`dislikes` text DEFAULT '' NOT NULL,
	`seen_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`draw_id`) REFERENCES `draws`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `participants_token_unique` ON `participants` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `participants_name_uq` ON `participants` (`draw_id`,`normalized_name`);--> statement-breakpoint
CREATE UNIQUE INDEX `participants_organizer_uq` ON `participants` (`draw_id`) WHERE is_organizer = 1;--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`organizer_id` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`organizer_id`) REFERENCES `organizers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_organizer_idx` ON `sessions` (`organizer_id`);--> statement-breakpoint
CREATE TABLE `sign_in_attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`window_start` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sign_in_attempts_window_start_idx` ON `sign_in_attempts` (`window_start`);