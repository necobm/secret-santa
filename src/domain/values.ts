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
export function budgetCents(input: string): number | null {
  const s = input.replace("€", "").trim().replace(",", ".");
  if (!s) return null;
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(s)) throw new DomainError("invalid-budget");
  return Math.round(Number(s) * 100);
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

/** 3000 → "30 €", 2550 → "25,50 €". */
export function formatBudget(cents: number) {
  const euros = cents / 100;
  return `${euros.toLocaleString("es-ES", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })} €`;
}

/** "2026-12-24" → "24 dic 2026" (Spanish month abbreviations, shown to users). */
export function formatDate(date: string, withYear = true) {
  const [y, m, d] = date.split("-").map(Number);
  const month = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"][m - 1];
  return withYear ? `${d} ${month} ${y}` : `${d} ${month}`;
}
