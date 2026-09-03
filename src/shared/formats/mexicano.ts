import type { EngineContext, FormatStrategy, PlannedMatch, RoundPlan } from "./types";
import { pairKey, shuffle } from "./types";
import { americano, pickByes } from "./americano";

// Mexicano — the competitive sibling of Americano.
//  - Round 1 is a random draw (no standings yet), planned exactly like Americano.
//  - From then on players are ranked by total points and dealt in blocks of
//    four: the top four to court 1, the next four to court 2, and so on.
//    Within a court the balanced split is 1st & 4th vs 2nd & 3rd, so matches
//    stay close; the engine only deviates from it to avoid a repeat partnership.
//  - Byes rotate fairly (fewest sit-outs first), same as Americano — the
//    players at the bottom shouldn't also be the ones sitting out.
//  - Players with no results yet (late arrivals) start on the bottom court.
//  - If the organizer (or the players) set ability levels, round 1 is seeded
//    from them instead of drawn at random — the ladder starts sorted.

function repeatPartners(a: [string, string], b: [string, string], ctx: EngineContext): number {
  return (ctx.partnerCounts[pairKey(a[0], a[1])] ?? 0) + (ctx.partnerCounts[pairKey(b[0], b[1])] ?? 0);
}

export const mexicano: FormatStrategy = {
  key: "mexicano",
  name: "Mexicano",
  minPlayers: 4,
  defaultPoints: 24,

  planRound(ctx: EngineContext): RoundPlan {
    // Nothing on the board yet → seed from levels if any are set, else a random draw.
    let standings = ctx.standings;
    if (standings.length === 0) {
      const seeded = ctx.players.filter((p) => ctx.levels?.[p] != null);
      if (seeded.length === 0) return americano.planRound(ctx);
      standings = seeded
        .map((playerId) => ({ playerId, points: ctx.levels![playerId] }))
        .sort((a, b) => b.points - a.points);
    }

    const courtCount = Math.min(ctx.courts, Math.floor(ctx.players.length / 4));
    if (courtCount === 0) {
      return { matches: [], byes: [...ctx.players] };
    }
    const byes = pickByes(ctx, ctx.players.length - courtCount * 4);
    const byeSet = new Set(byes);

    // Shuffle first so exact ties and unranked players land in random order;
    // the sort is stable, so the ranking decides everything else.
    const rank = new Map(standings.map((s, i) => [s.playerId, i]));
    const unranked = standings.length;
    const ranked = shuffle(
      ctx.players.filter((p) => !byeSet.has(p)),
      ctx.rng,
    ).sort((x, y) => (rank.get(x) ?? unranked) - (rank.get(y) ?? unranked));

    const matches: PlannedMatch[] = [];
    for (let c = 0; c < courtCount; c++) {
      const [p1, p2, p3, p4] = ranked.slice(c * 4, c * 4 + 4);
      // Most balanced split first; only a fresher partnership can displace it.
      const splits: [[string, string], [string, string]][] = [
        [[p1, p4], [p2, p3]],
        [[p1, p3], [p2, p4]],
        [[p1, p2], [p3, p4]],
      ];
      let pick = splits[0];
      let pickRepeats = repeatPartners(pick[0], pick[1], ctx);
      for (const s of splits.slice(1)) {
        const r = repeatPartners(s[0], s[1], ctx);
        if (r < pickRepeats) {
          pick = s;
          pickRepeats = r;
        }
      }
      matches.push({ court: c + 1, a: pick[0], b: pick[1] });
    }
    return { matches, byes };
  },
};
