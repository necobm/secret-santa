CREATE TABLE `sesiones` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`organizador_id` integer NOT NULL,
	`expira_en` integer NOT NULL,
	`creado_en` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`organizador_id`) REFERENCES `organizadores`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sesiones_organizador_idx` ON `sesiones` (`organizador_id`);