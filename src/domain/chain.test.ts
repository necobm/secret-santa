import { describe, expect, it } from "vitest";
import { generateChain, verify, type Assignment } from "./chain";

const names = (n: number) => Array.from({ length: n }, (_, i) => `P${i + 1}`);

/** Deterministic generator for tests (LCG). */
function seeded(s: number) {
  return (max: number) => {
    s = (s * 1103515245 + 12345) % 2 ** 31;
    return s % max;
  };
}

describe("generateChain", () => {
  it.each([3, 4, 5, 8, 13, 50])("with %i Participants produces a valid Chain", (n) => {
    for (let s = 1; s <= 50; s++) {
      const chain = generateChain(names(n), seeded(s));
      expect(chain).toHaveLength(n);
      expect(verify(names(n), chain).valid).toBe(true);
    }
  });

  it("is also valid with the default generator", () => {
    expect(verify(names(10), generateChain(names(10))).valid).toBe(true);
  });

  it("is deterministic with the same generator", () => {
    expect(generateChain(names(6), seeded(7))).toEqual(generateChain(names(6), seeded(7)));
  });

  it("can produce any of the possible Chains", () => {
    // With 4 Participants there are (4-1)! = 6 different Chains.
    const seen = new Set<string>();
    for (let s = 1; s <= 500; s++) {
      const chain = generateChain(names(4), seeded(s));
      seen.add(chain.map((a) => `${a.giver}>${a.recipient}`).sort().join(","));
    }
    expect(seen.size).toBe(6);
  });

  it("requires at least 3 Participants", () => {
    expect(() => generateChain(names(2))).toThrow(/At least 3/);
    expect(() => generateChain([])).toThrow(/At least 3/);
  });

  it("rejects repeated Participants", () => {
    expect(() => generateChain(["A", "B", "A"])).toThrow(/repeated/);
  });
});

describe("verify", () => {
  const p = ["A", "B", "C", "D"];
  const chain = (pairs: [string, string][]): Assignment<string>[] =>
    pairs.map(([giver, recipient]) => ({ giver, recipient }));

  it("accepts a single Chain", () => {
    const v = verify(p, chain([["A", "B"], ["B", "C"], ["C", "D"], ["D", "A"]]));
    expect(v).toEqual({
      total: 4,
      withRecipient: 4,
      receivingSeveral: 0,
      withoutGift: 0,
      selfGifts: 0,
      mutualPairs: 0,
      singleChain: true,
      valid: true,
    });
  });

  it("detects Participants without a Recipient and without a gift", () => {
    const v = verify(p, chain([["A", "B"], ["B", "C"], ["C", "A"]]));
    expect(v).toMatchObject({ withRecipient: 3, withoutGift: 1, singleChain: false, valid: false });
  });

  it("detects someone receiving two gifts", () => {
    const v = verify(p, chain([["A", "B"], ["B", "C"], ["C", "B"], ["D", "A"]]));
    expect(v).toMatchObject({ receivingSeveral: 1, withoutGift: 1, valid: false });
  });

  it("detects self-gifts", () => {
    const v = verify(p, chain([["A", "A"], ["B", "C"], ["C", "D"], ["D", "B"]]));
    expect(v).toMatchObject({ selfGifts: 1, singleChain: false, valid: false });
  });

  it("detects mutual pairs even when everyone has a Recipient", () => {
    const v = verify(p, chain([["A", "B"], ["B", "A"], ["C", "D"], ["D", "C"]]));
    expect(v).toMatchObject({
      withRecipient: 4,
      receivingSeveral: 0,
      withoutGift: 0,
      mutualPairs: 2,
      singleChain: false,
      valid: false,
    });
  });

  it("detects several Chains without mutual pairs", () => {
    const six = ["A", "B", "C", "D", "E", "F"];
    const v = verify(six, chain([["A", "B"], ["B", "C"], ["C", "A"], ["D", "E"], ["E", "F"], ["F", "D"]]));
    expect(v).toMatchObject({ mutualPairs: 0, singleChain: false, valid: false });
  });

  it("does not count someone giving twice as having a Recipient", () => {
    const v = verify(p, chain([["A", "B"], ["A", "C"], ["C", "D"], ["D", "A"]]));
    expect(v).toMatchObject({ withRecipient: 2, valid: false });
  });

  it("ignores Assignments from people who are not Participants", () => {
    const v = verify(["A", "B", "C"], chain([["A", "B"], ["B", "C"], ["C", "A"], ["X", "A"]]));
    expect(v).toMatchObject({ receivingSeveral: 1, valid: false });
  });

  it("a Draw without Assignments is not valid", () => {
    expect(verify(p, [])).toMatchObject({ withRecipient: 0, withoutGift: 4, valid: false });
  });

  it("fewer than 3 Participants is never valid", () => {
    expect(verify(["A", "B"], chain([["A", "B"], ["B", "A"]])).valid).toBe(false);
  });
});
