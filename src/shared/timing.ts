// Rough Americano pacing: a rally-point match runs about half a minute per
// point plus a changeover. 24 points ≈ 15 min, so 90 minutes ≈ 6 rounds.
export function minutesPerMatch(pointsPerMatch: number): number {
  return Math.round(pointsPerMatch * 0.5) + 3;
}

export interface NightPlan {
  minutesPerMatch: number;
  /** Rounds that fit the court time; null when no duration is set. */
  rounds: number | null;
  courtsUsed: number;
  onCourt: number;
  sitting: number;
  /** Share of rounds each player is on court (0–1). */
  playShare: number;
  matchesPerPlayer: number | null;
  sitOutsPerPlayer: number | null;
  /** Roughly how long each player spends off court over the night. */
  breakMinutes: number | null;
}

/** What a night looks like for a given roster, courts, court time and points. */
export function planNight(players: number, courts: number, durationMin: number | null | undefined, points: number): NightPlan {
  const mpm = minutesPerMatch(points);
  const rounds = estimateRounds(durationMin, points);
  const courtsUsed = Math.min(courts, Math.floor(players / 4));
  const onCourt = courtsUsed * 4;
  const sitting = Math.max(0, players - onCourt);
  const playShare = players > 0 && courtsUsed > 0 ? onCourt / players : 0;
  const round1 = (n: number) => Math.round(n * 10) / 10;
  const matchesPerPlayer = rounds == null ? null : round1(rounds * playShare);
  const sitOutsPerPlayer = rounds == null ? null : round1(rounds * (1 - playShare));
  return {
    minutesPerMatch: mpm,
    rounds,
    courtsUsed,
    onCourt,
    sitting,
    playShare,
    matchesPerPlayer,
    sitOutsPerPlayer,
    breakMinutes: sitOutsPerPlayer == null ? null : Math.round(sitOutsPerPlayer * mpm),
  };
}

/** Roster size that keeps everyone on court for 60–100% of rounds: 3 courts → 12–20 players. */
export function sweetSpot(courts: number): { min: number; max: number } {
  return { min: courts * 4, max: Math.floor((courts * 4) / 0.6) };
}

/** Rounds that fit in the booked court time (at least 1 when a duration is set). */
export function estimateRounds(durationMin: number | null | undefined, pointsPerMatch: number): number | null {
  if (!durationMin || durationMin <= 0) return null;
  return Math.max(1, Math.floor(durationMin / minutesPerMatch(pointsPerMatch)));
}
