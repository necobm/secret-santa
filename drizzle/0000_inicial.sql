CREATE TABLE `asignaciones` (
	`sorteo_id` integer NOT NULL,
	`regalador_id` integer NOT NULL,
	`destinatario_id` integer NOT NULL,
	PRIMARY KEY(`sorteo_id`, `regalador_id`),
	FOREIGN KEY (`sorteo_id`) REFERENCES `sorteos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`regalador_id`) REFERENCES `participantes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`destinatario_id`) REFERENCES `participantes`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "asignaciones_no_autoregalo_chk" CHECK(regalador_id <> destinatario_id)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `asignaciones_destinatario_uq` ON `asignaciones` (`sorteo_id`,`destinatario_id`);--> statement-breakpoint
CREATE TABLE `organizadores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`creado_en` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organizadores_email_unique` ON `organizadores` (`email`);--> statement-breakpoint
CREATE TABLE `participantes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sorteo_id` integer NOT NULL,
	`nombre` text NOT NULL,
	`nombre_normalizado` text NOT NULL,
	`token` text NOT NULL,
	`es_organizador` integer DEFAULT false NOT NULL,
	`le_gusta` text DEFAULT '' NOT NULL,
	`no_le_gusta` text DEFAULT '' NOT NULL,
	`visto_en` integer,
	`creado_en` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`sorteo_id`) REFERENCES `sorteos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `participantes_token_unique` ON `participantes` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `participantes_nombre_uq` ON `participantes` (`sorteo_id`,`nombre_normalizado`);--> statement-breakpoint
CREATE UNIQUE INDEX `participantes_organizador_uq` ON `participantes` (`sorteo_id`) WHERE es_organizador = 1;--> statement-breakpoint
CREATE TABLE `sorteos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`organizador_id` integer NOT NULL,
	`nombre` text NOT NULL,
	`presupuesto_centimos` integer,
	`fecha_entrega` text,
	`estado` text DEFAULT 'abierto' NOT NULL,
	`creado_en` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`organizador_id`) REFERENCES `organizadores`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "sorteos_estado_chk" CHECK(estado in ('abierto', 'sorteado')),
	CONSTRAINT "sorteos_presupuesto_chk" CHECK(presupuesto_centimos is null or presupuesto_centimos >= 0)
);
--> statement-breakpoint
CREATE INDEX `sorteos_organizador_idx` ON `sorteos` (`organizador_id`);