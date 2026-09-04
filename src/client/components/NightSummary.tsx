import { estimateRounds, planNight, sweetSpot } from "../../shared/timing";

/**
 * "What you get": rounds, matches and breaks per player for a roster size,
 * courts, court time and points — the numbers that decide whether a night
 * feels like a grind or has room to socialise.
 */
export function NightSummary({
  players,
  courts,
  durationMin,
  points,
  label = "players",
}: {
  players: number;
  courts: number;
  durationMin: number | null | undefined;
  points: number;
  label?: string;
}) {
  const p = planNight(players, courts, durationMin, points);
  const spot = sweetSpot(courts);
  const shorter = points > 16 ? estimateRounds(durationMin, 16) : null;
  if (players < 4) {
    return (
      <div className="rounded-2xl bg-canvas px-4 py-3 text-sm text-ink">
        <span className="font-black text-navy">{players}</span> {label} —{" "}
        <span className="font-semibold text-amber-dark">need at least 4 to start</span>
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-canvas px-4 py-3 text-sm text-ink">
      <p>
        <span className="font-black text-navy">{players}</span> {label} → <span className="font-black text-navy">{p.courtsUsed}</span>{" "}
        court{p.courtsUsed === 1 ? "" : "s"} per round
        {p.sitting > 0 ? (
          <>
            {" "}
            · <span className="font-black text-navy">{p.sitting}</span> sitting each round
          </>
        ) : (
          <span className="text-muted"> · nobody sits out</span>
        )}
      </p>
      {p.rounds != null && p.courtsUsed > 0 && (
        <p className="mt-1 text-xs text-muted">
          {durationMin} min of {points}-point games ≈ <span className="font-bold text-navy">{p.rounds} rounds</span> · each player plays ~
          <span className="font-bold text-navy">{p.matchesPerPlayer}</span>
          {p.sitting > 0 ? (
            <>
              {" "}
              and sits out ~<span className="font-bold text-navy">{p.sitOutsPerPlayer}</span> (≈ {p.breakMinutes} min of breaks)
            </>
          ) : (
            <> — no breaks until the end</>
          )}
          .
          {shorter != null && shorter > p.rounds && (
            <>
              {" "}
              16-point games would fit <span className="font-bold text-navy">{shorter} rounds</span>.
            </>
          )}
        </p>
      )}
      <p className="mt-1 text-xs text-muted">
        Sweet spot for {courts} court{courts === 1 ? "" : "s"}: {spot.min}–{spot.max} players (everyone plays 60–100% of rounds).
      </p>
    </div>
  );
}
