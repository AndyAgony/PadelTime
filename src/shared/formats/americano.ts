import type { EngineContext, FormatStrategy, PlannedMatch, RoundPlan } from "./types";
import { pairKey, shuffle } from "./types";

// Americano:
//  - rotating partners, fixed total points per match, individual cumulative scoring
//  - pairing goal: maximum partner diversity first, opponent diversity second
//  - byes rotate evenly: fewest byes sit next; ties broken by longest time
//    since the last bye, then randomly
//
// Pairing works by scored search (plan §11): many random orderings are chunked
// into courts of four; each court of four tries all three internal team splits
// and keeps the cheapest. Repeat partners cost quadratically more than repeat
// opponents, so the engine burns opponent variety before it ever repeats a
// partnership. Player counts at a padel night are small (≤ ~28), so a few
// thousand restarts explore the space thoroughly in a few milliseconds.

const PARTNER_WEIGHT = 40;
const OPPONENT_WEIGHT = 3;

function teamsCost(a: [string, string], b: [string, string], ctx: EngineContext): number {
  const pa = ctx.partnerCounts[pairKey(a[0], a[1])] ?? 0;
  const pb = ctx.partnerCounts[pairKey(b[0], b[1])] ?? 0;
  let cost = PARTNER_WEIGHT * (pa * pa + pb * pb);
  for (const x of a) {
    for (const y of b) {
      const o = ctx.opponentCounts[pairKey(x, y)] ?? 0;
      cost += OPPONENT_WEIGHT * o * o;
    }
  }
  return cost;
}

function bestSplit(four: string[], ctx: EngineContext): { a: [string, string]; b: [string, string]; cost: number } {
  const [p0, p1, p2, p3] = four;
  const options: [[string, string], [string, string]][] = [
    [[p0, p1], [p2, p3]],
    [[p0, p2], [p1, p3]],
    [[p0, p3], [p1, p2]],
  ];
  let best = options[0];
  let bestCost = Infinity;
  for (const [a, b] of options) {
    const cost = teamsCost(a, b, ctx);
    if (cost < bestCost) {
      bestCost = cost;
      best = [a, b];
    }
  }
  return { a: best[0], b: best[1], cost: bestCost };
}

export function pickByes(ctx: EngineContext, byeCount: number): string[] {
  if (byeCount <= 0) return [];
  // Random shuffle first so equal candidates rotate fairly, then a stable sort
  // by fairness criteria: fewest byes sit next, then whoever sat longest ago.
  const candidates = shuffle([...ctx.players], ctx.rng);
  candidates.sort(
    (x, y) =>
      (ctx.byeCounts[x] ?? 0) - (ctx.byeCounts[y] ?? 0) ||
      (ctx.lastByeRound[x] ?? 0) - (ctx.lastByeRound[y] ?? 0),
  );
  return candidates.slice(0, byeCount);
}

export const americano: FormatStrategy = {
  key: "americano",
  name: "Americano",
  minPlayers: 4,
  defaultPoints: 24,

  planRound(ctx: EngineContext): RoundPlan {
    const courtCount = Math.min(ctx.courts, Math.floor(ctx.players.length / 4));
    if (courtCount === 0) {
      return { matches: [], byes: [...ctx.players] };
    }
    const byes = pickByes(ctx, ctx.players.length - courtCount * 4);
    const byeSet = new Set(byes);
    const active = ctx.players.filter((p) => !byeSet.has(p));

    let best: PlannedMatch[] | null = null;
    let bestCost = Infinity;
    const restarts = Math.min(4000, 500 + active.length * 150);
    for (let i = 0; i < restarts; i++) {
      const order = shuffle([...active], ctx.rng);
      let cost = 0;
      const matches: PlannedMatch[] = [];
      for (let c = 0; c < courtCount; c++) {
        const four = order.slice(c * 4, c * 4 + 4);
        const split = bestSplit(four, ctx);
        matches.push({ court: c + 1, a: split.a, b: split.b });
        cost += split.cost;
        if (cost >= bestCost) break; // prune hopeless orderings early
      }
      if (cost < bestCost) {
        bestCost = cost;
        best = matches;
        if (cost === 0) break;
      }
    }
    return { matches: best ?? [], byes };
  },
};
