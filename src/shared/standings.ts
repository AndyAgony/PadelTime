import type { MatchRow, RoundRow, StandingRow } from "./types";

// Individual cumulative standings from confirmed matches only.
// Every player on a team is credited with the team's points (Americano rule).
export function computeStandings(
  players: { id: string; name: string }[],
  rounds: RoundRow[],
): StandingRow[] {
  const byId = new Map<string, StandingRow>();
  for (const p of players) {
    byId.set(p.id, {
      playerId: p.id,
      name: p.name,
      points: 0,
      against: 0,
      diff: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      played: 0,
      byes: 0,
    });
  }
  const credit = (ids: [string, string], scoreFor: number, scoreAgainst: number) => {
    for (const id of ids) {
      const row = byId.get(id);
      if (!row) continue;
      row.points += scoreFor;
      row.against += scoreAgainst;
      row.played += 1;
      if (scoreFor > scoreAgainst) row.wins += 1;
      else if (scoreFor < scoreAgainst) row.losses += 1;
      else row.ties += 1;
    }
  };
  for (const round of rounds) {
    for (const id of round.byes) {
      const row = byId.get(id);
      if (row) row.byes += 1;
    }
    for (const m of round.matches) {
      if (m.status !== "confirmed" || m.scoreA == null || m.scoreB == null) continue;
      credit(m.a, m.scoreA, m.scoreB);
      credit(m.b, m.scoreB, m.scoreA);
    }
  }
  const rows = [...byId.values()];
  rows.forEach((r) => (r.diff = r.points - r.against));
  rows.sort(
    (a, b) =>
      b.points - a.points || b.wins - a.wins || b.diff - a.diff || a.name.localeCompare(b.name),
  );
  return rows;
}

export function matchComplete(m: MatchRow): boolean {
  return m.status === "confirmed";
}
