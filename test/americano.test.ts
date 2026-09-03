import { describe, expect, it } from "vitest";
import { americano } from "../src/shared/formats/americano";
import { mulberry32, pairKey } from "../src/shared/formats/types";
import type { EngineContext } from "../src/shared/formats/types";
import { buildHistory } from "../src/shared/history";
import type { HistoryRound } from "../src/shared/history";
import { computeStandings } from "../src/shared/standings";
import type { RoundRow } from "../src/shared/types";

function makeCtx(players: string[], courts: number, roundsPlayed: HistoryRound[], seed = 42): EngineContext {
  const h = buildHistory(roundsPlayed);
  return {
    players,
    courts,
    roundNumber: roundsPlayed.length + 1,
    ...h,
    standings: [],
    rng: mulberry32(seed),
  };
}

function playRounds(players: string[], courts: number, count: number, seed = 42): HistoryRound[] {
  const history: HistoryRound[] = [];
  for (let i = 0; i < count; i++) {
    const plan = americano.planRound(makeCtx(players, courts, history, seed + i));
    history.push({
      number: i + 1,
      byes: plan.byes,
      matches: plan.matches.map((m) => ({ a: m.a, b: m.b })),
    });
  }
  return history;
}

const names = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);

describe("americano round planning", () => {
  it("fills courts and assigns everyone exactly once per round", () => {
    const players = names(8);
    const plan = americano.planRound(makeCtx(players, 2, []));
    expect(plan.matches).toHaveLength(2);
    expect(plan.byes).toHaveLength(0);
    const seen = plan.matches.flatMap((m) => [...m.a, ...m.b]);
    expect(new Set(seen).size).toBe(8);
  });

  it("respects the court limit", () => {
    const players = names(12);
    const plan = americano.planRound(makeCtx(players, 2, []));
    expect(plan.matches).toHaveLength(2);
    expect(plan.byes).toHaveLength(4);
  });

  it("gives byes to players who have sat out least", () => {
    const players = names(5);
    const rounds = playRounds(players, 1, 5);
    const byeCounts: Record<string, number> = {};
    for (const r of rounds) for (const b of r.byes) byeCounts[b] = (byeCounts[b] ?? 0) + 1;
    // 5 rounds, 5 players, 1 bye per round → everyone sits exactly once
    for (const p of players) expect(byeCounts[p] ?? 0).toBe(1);
  });

  it("keeps bye spread fair for 15 players on 3 courts", () => {
    const players = names(15);
    const rounds = playRounds(players, 3, 5);
    const byeCounts: Record<string, number> = {};
    for (const r of rounds) {
      expect(r.byes).toHaveLength(3);
      for (const b of r.byes) byeCounts[b] = (byeCounts[b] ?? 0) + 1;
    }
    // 15 byes over 15 players → exactly one each
    for (const p of players) expect(byeCounts[p] ?? 0).toBe(1);
  });

  it("maximises partner diversity — 8 players, 7 rounds, few repeats", () => {
    const players = names(8);
    const rounds = playRounds(players, 2, 7);
    const partnerCounts: Record<string, number> = {};
    for (const r of rounds) {
      for (const m of r.matches) {
        partnerCounts[pairKey(m.a[0], m.a[1])] = (partnerCounts[pairKey(m.a[0], m.a[1])] ?? 0) + 1;
        partnerCounts[pairKey(m.b[0], m.b[1])] = (partnerCounts[pairKey(m.b[0], m.b[1])] ?? 0) + 1;
      }
    }
    const repeats = Object.values(partnerCounts).filter((c) => c > 1).length;
    // Perfect whist rotation has 0 repeats in 7 rounds; the stochastic search
    // should land at most a couple.
    expect(repeats).toBeLessThanOrEqual(2);
    // Everyone plays all 7 rounds
    const h = buildHistory(rounds);
    for (const p of players) expect(h.playedCounts[p]).toBe(7);
  });

  it("never repeats a partner in the first rounds when avoidable (12 players)", () => {
    const players = names(12);
    const rounds = playRounds(players, 3, 4);
    const partnerCounts: Record<string, number> = {};
    for (const r of rounds) {
      for (const m of r.matches) {
        for (const key of [pairKey(m.a[0], m.a[1]), pairKey(m.b[0], m.b[1])]) {
          partnerCounts[key] = (partnerCounts[key] ?? 0) + 1;
        }
      }
    }
    expect(Object.values(partnerCounts).every((c) => c === 1)).toBe(true);
  });

  it("handles fewer than 4 players by sitting everyone", () => {
    const plan = americano.planRound(makeCtx(names(3), 2, []));
    expect(plan.matches).toHaveLength(0);
    expect(plan.byes).toHaveLength(3);
  });
});

describe("standings", () => {
  it("credits team points to each player and ranks by points", () => {
    const players = [
      { id: "a", name: "Andrew" },
      { id: "b", name: "Ben" },
      { id: "c", name: "Chris" },
      { id: "d", name: "Dan" },
    ];
    const rounds: RoundRow[] = [
      {
        id: "r1",
        number: 1,
        byes: [],
        complete: true,
        matches: [
          {
            id: "m1",
            roundId: "r1",
            court: 1,
            a: ["a", "b"],
            b: ["c", "d"],
            scoreA: 14,
            scoreB: 10,
            status: "confirmed",
            submittedBy: null,
          },
        ],
      },
      {
        id: "r2",
        number: 2,
        byes: [],
        complete: false,
        matches: [
          {
            id: "m2",
            roundId: "r2",
            court: 1,
            a: ["a", "c"],
            b: ["b", "d"],
            scoreA: 20,
            scoreB: 4,
            status: "submitted", // not confirmed → must not count
            submittedBy: "a",
          },
        ],
      },
    ];
    const standings = computeStandings(players, rounds);
    expect(standings[0].name).toBe("Andrew");
    expect(standings[0].points).toBe(14);
    expect(standings[0].wins).toBe(1);
    const dan = standings.find((s) => s.name === "Dan")!;
    expect(dan.points).toBe(10);
    expect(dan.losses).toBe(1);
    expect(dan.diff).toBe(-4);
  });

  it("counts ties", () => {
    const players = [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
      { id: "c", name: "C" },
      { id: "d", name: "D" },
    ];
    const rounds: RoundRow[] = [
      {
        id: "r1",
        number: 1,
        byes: [],
        complete: true,
        matches: [
          {
            id: "m1",
            roundId: "r1",
            court: 1,
            a: ["a", "b"],
            b: ["c", "d"],
            scoreA: 12,
            scoreB: 12,
            status: "confirmed",
            submittedBy: null,
          },
        ],
      },
    ];
    const standings = computeStandings(players, rounds);
    expect(standings.every((s) => s.ties === 1)).toBe(true);
  });
});

describe("americano level balancing", () => {
  it("splits a court strong + weak vs strong + weak when levels are known", () => {
    const players = ["a", "b", "c", "d"];
    const levels = { a: 4, b: 4, c: 1, d: 1 };
    const plan = americano.planRound({ ...makeCtx(players, 1, []), levels });
    const m = plan.matches[0];
    const sum = (t: [string, string]) => levels[t[0] as keyof typeof levels] + levels[t[1] as keyof typeof levels];
    expect(sum(m.a)).toBe(5);
    expect(sum(m.b)).toBe(5);
  });

  it("never lets balance override partner variety", () => {
    const players = ["a", "b", "c", "d"];
    const levels = { a: 4, b: 4, c: 1, d: 1 };
    // Balanced pairs already played together twice → must rotate partners despite the level gap.
    const history: HistoryRound[] = [
      { number: 1, byes: [], matches: [{ a: ["a", "c"], b: ["b", "d"] }] },
      { number: 2, byes: [], matches: [{ a: ["a", "d"], b: ["b", "c"] }] },
    ];
    const plan = americano.planRound({ ...makeCtx(players, 1, history), levels });
    const m = plan.matches[0];
    expect(new Set([[...m.a].sort().join("+"), [...m.b].sort().join("+")])).toEqual(new Set(["a+b", "c+d"]));
  });
});
