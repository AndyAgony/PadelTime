// Rough Americano pacing: a rally-point match runs about half a minute per
// point plus a changeover. 24 points ≈ 15 min, so 90 minutes ≈ 6 rounds.
export function minutesPerMatch(pointsPerMatch: number): number {
  return Math.round(pointsPerMatch * 0.5) + 3;
}

/** Rounds that fit in the booked court time (at least 1 when a duration is set). */
export function estimateRounds(durationMin: number | null | undefined, pointsPerMatch: number): number | null {
  if (!durationMin || durationMin <= 0) return null;
  return Math.max(1, Math.floor(durationMin / minutesPerMatch(pointsPerMatch)));
}
