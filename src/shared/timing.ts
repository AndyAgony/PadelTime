// Pacing, calibrated on a real night: a rally-point match runs about 0.6 min
// per point plus a changeover. 24 points ≈ 17 min, so 90 minutes ≈ 5 rounds;
// 16 points ≈ 13 min ≈ 7 rounds.
export function minutesPerMatch(pointsPerMatch: number): number {
  return Math.round(pointsPerMatch * 0.6) + 3;
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

export interface Recommendation {
  courts: number;
  points: number;
  rounds: number | null;
}

/**
 * What to run: every court you can fill, and the highest points-per-game that
 * still fits 6+ rounds in the booked time (6 rounds ≈ everyone meets most of
 * the group). 90 min → 16 points; 2 hours → 24; an hour → 12.
 */
export function recommendSetup(players: number, courtsAvailable: number, durationMin: number | null | undefined): Recommendation | null {
  if (players < 4) return null;
  const courts = Math.max(1, Math.min(courtsAvailable, Math.floor(players / 4)));
  const options = [24, 21, 16, 12];
  const fits = (p: number, n: number) => (estimateRounds(durationMin, p) ?? 0) >= n;
  const points = !durationMin ? 24 : (options.find((p) => fits(p, 6)) ?? options.find((p) => fits(p, 4)) ?? 12);
  return { courts, points, rounds: estimateRounds(durationMin, points) };
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
