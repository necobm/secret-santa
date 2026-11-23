CREATE TABLE `intentos_acceso` (
	`clave` text PRIMARY KEY NOT NULL,
	`intentos` integer NOT NULL,
	`desde` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `intentos_acceso_desde_idx` ON `intentos_acceso` (`desde`);