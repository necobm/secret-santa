import { DomainError } from "./errors";

export const MAX_NAME = 40;
export const MAX_DRAW_NAME = 80;
export const MAX_LIKES = 500;

const tidy = (s: string) => s.trim().replace(/\s+/g, " ");

/** Participant name: extra whitespace removed; the normalized form decides whether it is a duplicate. */
export function participantName(input: string) {
  const name = tidy(input);
  if (!name || name.length > MAX_NAME) throw new DomainError("invalid-name");
  return { name, normalizedName: name.toLocaleLowerCase("es") };
}

export function drawName(input: string) {
  const name = tidy(input);
  if (!name || name.length > MAX_DRAW_NAME) throw new DomainError("invalid-draw-name");
  return name;
}

/** "30", "25,50", "25.5 €" → cents. Empty → null. */
function amountCents(input: string): number | null {
  const s = input.replace("€", "").trim().replace(",", ".");
  if (!s) return null;
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(s)) throw new DomainError("invalid-budget");
  return Math.round(Number(s) * 100);
}

/** A single amount (`budgetMaxCents` null) or a range, in euro cents. Both null = no Budget. */
export interface Budget {
  budgetCents: number | null;
  budgetMaxCents: number | null;
}

/**
 * The Budget from the two amounts the Organizer types. Only one filled → a single amount;
 * both filled → a range (equal amounts collapse into a single amount).
 */
export function budget(from: string, to: string): Budget {
  const [a, b] = [amountCents(from), amountCents(to)];
  if (a === null || b === null || a === b) return { budgetCents: a ?? b, budgetMaxCents: null };
  if (a > b) throw new DomainError("invalid-budget-range");
  return { budgetCents: a, budgetMaxCents: b };
}

/** A valid YYYY-MM-DD. Empty → null. */
export function exchangeDate(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) throw new DomainError("invalid-date");
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) {
    throw new DomainError("invalid-date");
  }
  return s;
}

/** Likes / Dislikes free text. */
export function likesText(input: string) {
  const s = input.trim();
  if (s.length > MAX_LIKES) throw new DomainError("text-too-long");
  return s;
}

const euros = (cents: number) =>
  (cents / 100).toLocaleString("es-ES", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 });

/** 3000 → "30 €", 2550 → "25,50 €", 2000–3000 → "20–30 €". No Budget → null. */
export function formatBudget({ budgetCents, budgetMaxCents }: Budget) {
  if (budgetCents === null) return null;
  return budgetMaxCents === null ? `${euros(budgetCents)} €` : `${euros(budgetCents)}–${euros(budgetMaxCents)} €`;
}

/** Cents → the text an input shows for editing: 2550 → "25,50". null → "". */
export function amountInput(cents: number | null) {
  return cents === null ? "" : String(cents / 100).replace(".", ",");
}

/** "2026-12-24" → "24 dic 2026" (Spanish month abbreviations, shown to users). */
export function formatDate(date: string, withYear = true) {
  const [y, m, d] = date.split("-").map(Number);
  const month = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"][m - 1];
  return withYear ? `${d} ${month} ${y}` : `${d} ${month}`;
}
