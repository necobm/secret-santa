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

// Vocabulary: see GLOSSARY.md. Table and column names follow the glossary's English terms.

const createdAt = () =>
  integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`);

export const DRAW_STATUSES = ["open", "drawn"] as const;
export type DrawStatus = (typeof DRAW_STATUSES)[number];

/** Organizer account (ADR-0001). Participants have no account. */
export const organizers = sqliteTable("organizers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: createdAt(),
});

/** An Organizer's session. Only the SHA-256 hash of the cookie token is stored. */
export const sessions = sqliteTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    organizerId: integer("organizer_id")
      .notNull()
      .references(() => organizers.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_organizer_idx").on(t.organizerId)],
);

/**
 * Sign-in attempts per key ("email:…" or "ip:…") in a fixed window, against brute force.
 * `windowStart` is when the window began; once it has passed, the count goes back to 1.
 */
export const signInAttempts = sqliteTable(
  "sign_in_attempts",
  {
    key: text("key").primaryKey(),
    count: integer("count").notNull(),
    windowStart: integer("window_start", { mode: "timestamp" }).notNull(),
  },
  (t) => [index("sign_in_attempts_window_start_idx").on(t.windowStart)],
);

export const draws = sqliteTable(
  "draws",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    organizerId: integer("organizer_id")
      .notNull()
      .references(() => organizers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Budget in euro cents; optional. */
    budgetCents: integer("budget_cents"),
    /** Exchange date as YYYY-MM-DD; optional. */
    exchangeDate: text("exchange_date"),
    status: text("status", { enum: DRAW_STATUSES }).notNull().default("open"),
    createdAt: createdAt(),
  },
  (t) => [
    index("draws_organizer_idx").on(t.organizerId),
    check("draws_status_chk", sql`status in ('open', 'drawn')`),
    check("draws_budget_chk", sql`budget_cents is null or budget_cents >= 0`),
  ],
);

export const participants = sqliteTable(
  "participants",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    drawId: integer("draw_id")
      .notNull()
      .references(() => draws.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Lower-cased name (es locale) to prevent case-insensitive duplicates. */
    normalizedName: text("normalized_name").notNull(),
    /** Secret of the Personal link. */
    token: text("token").notNull().unique(),
    /** The Participant who is the Organizer themselves (at most one per Draw). */
    isOrganizer: integer("is_organizer", { mode: "boolean" }).notNull().default(false),
    likes: text("likes").notNull().default(""),
    dislikes: text("dislikes").notNull().default(""),
    /** When they opened their current Assignment; null = pending. Reset to null when the draw is redone. */
    seenAt: integer("seen_at", { mode: "timestamp" }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("participants_name_uq").on(t.drawId, t.normalizedName),
    uniqueIndex("participants_organizer_uq")
      .on(t.drawId)
      .where(sql`is_organizer = 1`),
  ],
);

/** "Giver gives to Recipient". That they form a single Chain is guaranteed by the domain. */
export const assignments = sqliteTable(
  "assignments",
  {
    drawId: integer("draw_id")
      .notNull()
      .references(() => draws.id, { onDelete: "cascade" }),
    giverId: integer("giver_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    recipientId: integer("recipient_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.drawId, t.giverId] }),
    uniqueIndex("assignments_recipient_uq").on(t.drawId, t.recipientId),
    check("assignments_no_self_gift_chk", sql`giver_id <> recipient_id`),
  ],
);
