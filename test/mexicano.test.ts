import { describe, expect, it } from "vitest";
import { mexicano } from "../src/shared/formats/mexicano";
import { mulberry32 } from "../src/shared/formats/types";
import type { EngineContext } from "../src/shared/formats/types";
import { buildHistory } from "../src/shared/history";
import type { HistoryRound } from "../src/shared/history";

const names = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);

function ctxOf(
  players: string[],
  courts: number,
  history: HistoryRound[],
  standings: EngineContext["standings"],
  seed = 7,
): EngineContext {
  return {
    players,
    courts,
    roundNumber: history.length + 1,
    ...buildHistory(history),
    standings,
    rng: mulberry32(seed),
  };
}

/** Standings with p1 on top, descending. */
const ladder = (ids: string[]) => ids.map((playerId, i) => ({ playerId, points: 100 - i * 5 }));
const team = (t: [string, string]) => [...t].sort().join("+");
const courtOf = (plan: ReturnType<typeof mexicano.planRound>, court: number) => plan.matches.find((m) => m.court === court)!;

describe("mexicano round planning", () => {
  it("round 1 is a random draw that fills every court", () => {
    const plan = mexicano.planRound(ctxOf(names(8), 2, [], []));
    expect(plan.matches).toHaveLength(2);
    expect(plan.byes).toHaveLength(0);
    expect(new Set(plan.matches.flatMap((m) => [...m.a, ...m.b])).size).toBe(8);
  });

  it("deals courts from the standings: top four on court 1, 1st & 4th vs 2nd & 3rd", () => {
    const players = names(8);
    const plan = mexicano.planRound(ctxOf(players, 2, [], ladder(players)));
    const c1 = courtOf(plan, 1);
    const c2 = courtOf(plan, 2);
    expect(new Set([team(c1.a), team(c1.b)])).toEqual(new Set(["p1+p4", "p2+p3"]));
    expect(new Set([team(c2.a), team(c2.b)])).toEqual(new Set(["p5+p8", "p6+p7"]));
  });

  it("ranks by the standings order, not by player list order", () => {
    const players = names(8);
    // Reverse ladder: p8 leads.
    const standings = ladder([...players].reverse());
    const plan = mexicano.planRound(ctxOf(players, 2, [], standings));
    const c1 = courtOf(plan, 1);
    expect(new Set([...c1.a, ...c1.b])).toEqual(new Set(["p8", "p7", "p6", "p5"]));
    expect(new Set([team(c1.a), team(c1.b)])).toEqual(new Set(["p5+p8", "p6+p7"]));
  });

  it("puts players without results on the bottom court", () => {
    const players = names(8);
    const plan = mexicano.planRound(ctxOf(players, 2, [], ladder(players.slice(0, 6))));
    const bottom = courtOf(plan, 2);
    expect([...bottom.a, ...bottom.b]).toEqual(expect.arrayContaining(["p7", "p8"]));
  });

  it("only leaves the balanced split to avoid a repeat partnership", () => {
    const players = names(4);
    const history: HistoryRound[] = [{ number: 1, byes: [], matches: [{ a: ["p1", "p4"], b: ["p2", "p3"] }] }];
    const plan = mexicano.planRound(ctxOf(players, 1, history, ladder(players)));
    const c1 = courtOf(plan, 1);
    // p1 & p4 already partnered → next-most-balanced split: 1 & 3 vs 2 & 4
    expect(new Set([team(c1.a), team(c1.b)])).toEqual(new Set(["p1+p3", "p2+p4"]));
  });

  it("rotates byes fairly instead of benching the bottom of the table", () => {
    const players = names(5);
    const history: HistoryRound[] = [
      { number: 1, byes: ["p5"], matches: [{ a: ["p1", "p2"], b: ["p3", "p4"] }] },
    ];
    const plan = mexicano.planRound(ctxOf(players, 1, history, ladder(players)));
    expect(plan.byes).toHaveLength(1);
    expect(plan.byes[0]).not.toBe("p5"); // p5 already sat out
  });
});

describe("mexicano seeded round 1", () => {
  it("seeds round 1 from ability levels when set: advanced players on court 1", () => {
    const players = names(8);
    const levels = { p1: 1, p2: 4, p3: 2, p4: 4, p5: 3, p6: 4, p7: 3, p8: 2 };
    const plan = mexicano.planRound({ ...ctxOf(players, 2, [], []), levels });
    const top = courtOf(plan, 1);
    const topIds = new Set([...top.a, ...top.b]);
    // the three advanced players plus one intermediate
    expect(topIds.has("p2") && topIds.has("p4") && topIds.has("p6")).toBe(true);
    expect([...topIds].filter((id) => levels[id as keyof typeof levels] === 3)).toHaveLength(1);
    // strongest + weakest on the court are partners
    const teams = [top.a, top.b].map(team);
    const inter = [...topIds].find((id) => levels[id as keyof typeof levels] === 3)!;
    const partnerOfInter = [top.a, top.b].find((t) => t.includes(inter))!.find((id) => id !== inter)!;
    expect(levels[partnerOfInter as keyof typeof levels]).toBe(4);
    expect(teams).toHaveLength(2);
  });

  it("without levels round 1 is still a plain draw", () => {
    const plan = mexicano.planRound(ctxOf(names(8), 2, [], []));
    expect(plan.matches).toHaveLength(2);
  });
});
