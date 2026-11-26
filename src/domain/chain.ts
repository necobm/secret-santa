import { randomInt } from "node:crypto";

export const MIN_PARTICIPANTS = 3;

export interface Assignment<Id> {
  giver: Id;
  recipient: Id;
}

/** Returns a random integer in [0, max). */
export type Random = (max: number) => number;

const secureRandom: Random = (max) => randomInt(max);

/**
 * Generates a Chain: a single cycle A→B→C→…→A through every Participant.
 * Shuffling and closing the ring gives every possible Chain the same probability.
 */
export function generateChain<Id>(
  participants: readonly Id[],
  random: Random = secureRandom,
): Assignment<Id>[] {
  if (participants.length < MIN_PARTICIPANTS) {
    throw new Error(`At least ${MIN_PARTICIPANTS} Participants are needed`);
  }
  if (new Set(participants).size !== participants.length) {
    throw new Error("A Participant is repeated");
  }

  const order = [...participants];
  for (let i = order.length - 1; i > 0; i--) {
    const j = random(i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }

  return order.map((giver, i) => ({
    giver,
    recipient: order[(i + 1) % order.length],
  }));
}

/** Verification summary: counts only, never names. */
export interface Verification {
  total: number;
  /** Participants who give to exactly one Recipient. */
  withRecipient: number;
  /** Participants who receive more than one gift. */
  receivingSeveral: number;
  /** Participants who receive no gift. */
  withoutGift: number;
  selfGifts: number;
  mutualPairs: number;
  singleChain: boolean;
  valid: boolean;
}

export function verify<Id>(
  participants: readonly Id[],
  assignments: readonly Assignment<Id>[],
): Verification {
  const total = participants.length;
  const recipientsOf = new Map<Id, Id[]>(participants.map((p) => [p, []]));
  const giftsTo = new Map<Id, number>(participants.map((p) => [p, 0]));

  let selfGifts = 0;
  for (const { giver, recipient } of assignments) {
    if (giver === recipient) selfGifts++;
    recipientsOf.get(giver)?.push(recipient);
    giftsTo.set(recipient, (giftsTo.get(recipient) ?? 0) + 1);
  }

  const withRecipient = participants.filter((p) => recipientsOf.get(p)!.length === 1).length;
  const receivingSeveral = [...giftsTo.values()].filter((n) => n > 1).length;
  const withoutGift = participants.filter((p) => giftsTo.get(p) === 0).length;

  let mutualPairs = 0;
  for (const p of participants) {
    const [r] = recipientsOf.get(p)!;
    if (r !== undefined && r !== p && recipientsOf.get(r)?.includes(p)) mutualPairs++;
  }
  mutualPairs /= 2;

  const singleChain = isSingleChain(participants, recipientsOf);
  const valid =
    total >= MIN_PARTICIPANTS &&
    assignments.length === total &&
    withRecipient === total &&
    receivingSeveral === 0 &&
    withoutGift === 0 &&
    selfGifts === 0 &&
    mutualPairs === 0 &&
    singleChain;

  return { total, withRecipient, receivingSeveral, withoutGift, selfGifts, mutualPairs, singleChain, valid };
}

function isSingleChain<Id>(participants: readonly Id[], recipientsOf: Map<Id, Id[]>) {
  if (participants.length === 0) return false;
  const start = participants[0];
  const visited = new Set<Id>();
  let current: Id | undefined = start;
  while (current !== undefined && !visited.has(current)) {
    visited.add(current);
    const next: Id[] = recipientsOf.get(current) ?? [];
    if (next.length !== 1) return false;
    current = next[0];
  }
  return current === start && visited.size === participants.length;
}
