import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// Vocabulario: ver GLOSSARY.md. Los nombres de tablas y columnas siguen el glosario.

const creadoEn = () =>
  integer("creado_en", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`);

export const ESTADOS_SORTEO = ["abierto", "sorteado"] as const;
export type EstadoSorteo = (typeof ESTADOS_SORTEO)[number];

/** Cuenta de organizador (ADR-0001). Los Participantes no tienen cuenta. */
export const organizadores = sqliteTable("organizadores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  creadoEn: creadoEn(),
});

/** Sesión de un Organizador. Solo se guarda el hash SHA-256 del token de la cookie. */
export const sesiones = sqliteTable(
  "sesiones",
  {
    tokenHash: text("token_hash").primaryKey(),
    organizadorId: integer("organizador_id")
      .notNull()
      .references(() => organizadores.id, { onDelete: "cascade" }),
    expiraEn: integer("expira_en", { mode: "timestamp" }).notNull(),
    creadoEn: creadoEn(),
  },
  (t) => [index("sesiones_organizador_idx").on(t.organizadorId)],
);

export const sorteos = sqliteTable(
  "sorteos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    organizadorId: integer("organizador_id")
      .notNull()
      .references(() => organizadores.id, { onDelete: "cascade" }),
    nombre: text("nombre").notNull(),
    /** Presupuesto en céntimos de euro; opcional. */
    presupuestoCentimos: integer("presupuesto_centimos"),
    /** Fecha de entrega como YYYY-MM-DD; opcional. */
    fechaEntrega: text("fecha_entrega"),
    estado: text("estado", { enum: ESTADOS_SORTEO }).notNull().default("abierto"),
    creadoEn: creadoEn(),
  },
  (t) => [
    index("sorteos_organizador_idx").on(t.organizadorId),
    check("sorteos_estado_chk", sql`estado in ('abierto', 'sorteado')`),
    check(
      "sorteos_presupuesto_chk",
      sql`presupuesto_centimos is null or presupuesto_centimos >= 0`,
    ),
  ],
);

export const participantes = sqliteTable(
  "participantes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sorteoId: integer("sorteo_id")
      .notNull()
      .references(() => sorteos.id, { onDelete: "cascade" }),
    nombre: text("nombre").notNull(),
    /** Nombre en minúsculas (locale es) para impedir duplicados sin distinguir mayúsculas. */
    nombreNormalizado: text("nombre_normalizado").notNull(),
    /** Secreto del Enlace personal. */
    token: text("token").notNull().unique(),
    /** El Participante que es el propio Organizador (como mucho uno por Sorteo). */
    esOrganizador: integer("es_organizador", { mode: "boolean" }).notNull().default(false),
    leGusta: text("le_gusta").notNull().default(""),
    noLeGusta: text("no_le_gusta").notNull().default(""),
    /** Cuándo abrió su Asignación actual; null = pendiente. Se pone a null al rehacer el sorteo. */
    vistoEn: integer("visto_en", { mode: "timestamp" }),
    creadoEn: creadoEn(),
  },
  (t) => [
    uniqueIndex("participantes_nombre_uq").on(t.sorteoId, t.nombreNormalizado),
    uniqueIndex("participantes_organizador_uq")
      .on(t.sorteoId)
      .where(sql`es_organizador = 1`),
  ],
);

/** "Regalador regala a Destinatario". Que formen una única Cadena lo garantiza el dominio. */
export const asignaciones = sqliteTable(
  "asignaciones",
  {
    sorteoId: integer("sorteo_id")
      .notNull()
      .references(() => sorteos.id, { onDelete: "cascade" }),
    regaladorId: integer("regalador_id")
      .notNull()
      .references(() => participantes.id, { onDelete: "cascade" }),
    destinatarioId: integer("destinatario_id")
      .notNull()
      .references(() => participantes.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.sorteoId, t.regaladorId] }),
    uniqueIndex("asignaciones_destinatario_uq").on(t.sorteoId, t.destinatarioId),
    check("asignaciones_no_autoregalo_chk", sql`regalador_id <> destinatario_id`),
  ],
);
