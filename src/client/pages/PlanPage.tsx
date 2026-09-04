import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { SETUP_MINUTES, planNight, recommendSetup, sweetSpot } from "../../shared/timing";
import { Badge, Button, Card, Field, Input, cls } from "../components/ui";
import { Logo } from "../App";

const POINTS = [24, 21, 16, 12];

/**
 * Night planner: every courts × points setup for a roster and booking, with
 * rounds, matches, sit-outs and break length per player — so the trade-off
 * between padel and socialising is a table, not a guess.
 */
export function PlanPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [players, setPlayers] = useState(clamp(params.get("players"), 12, 4, 64));
  const [courtsAvailable, setCourtsAvailable] = useState(clamp(params.get("courts"), 3, 1, 12));
  const [duration, setDuration] = useState(clamp(params.get("duration"), 90, 30, 600));

  const maxCourts = Math.max(1, Math.min(courtsAvailable, Math.floor(players / 4)));
  const playing = recommendSetup(players, courtsAvailable, duration, "playing");
  const social = recommendSetup(players, courtsAvailable, duration, "social");
  const spot = sweetSpot(courtsAvailable);
  const playMinutes = Math.max(duration - SETUP_MINUTES, 0);

  const createWith = (courts: number, points: number) =>
    navigate(`/app?new=1&players=${players}&courts=${courts}&points=${points}&duration=${duration}`);

  return (
    <div className="min-h-dvh bg-canvas pb-16">
      <header className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
        <Logo to="/" />
        <Link to="/app" className="text-sm font-bold text-royal hover:text-royal-dark">
          My sessions →
        </Link>
      </header>
      <main className="mx-auto max-w-2xl space-y-4 px-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-navy">Night planner</h1>
          <p className="mt-1 text-sm text-muted">
            A 24-point game runs about 15 minutes, a 16-point game about 11, and play starts roughly {SETUP_MINUTES} minutes into a
            booking — measured on real nights. A sit-out always lasts one round.
          </p>
        </div>

        <Card>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Players">
              <Input type="number" min={4} max={64} value={players} onChange={(e) => setPlayers(clamp(e.target.value, players, 4, 64))} />
            </Field>
            <Field label="Courts booked">
              <Input type="number" min={1} max={12} value={courtsAvailable} onChange={(e) => setCourtsAvailable(clamp(e.target.value, courtsAvailable, 1, 12))} />
            </Field>
            <Field label="Booking (min)">
              <Input type="number" min={30} max={600} step={15} value={duration} onChange={(e) => setDuration(clamp(e.target.value, duration, 30, 600))} />
            </Field>
          </div>
          <p className="mt-3 text-xs text-muted">
            ≈ {playMinutes} min of play after arrivals and check-in · sweet spot for {courtsAvailable} court{courtsAvailable === 1 ? "" : "s"}:{" "}
            {spot.min}–{spot.max} players.
          </p>
        </Card>

        {Array.from({ length: maxCourts }, (_, i) => maxCourts - i).map((courts) => {
          const sitting = players - courts * 4;
          const share = Math.round((sitting / players) * 100);
          return (
            <Card key={courts}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-black text-navy">
                  {courts} court{courts === 1 ? "" : "s"}
                  <span className="ml-2 text-sm font-semibold text-muted">
                    {courts * 4} on court{sitting > 0 ? ` · ${sitting} sit each round (${share}%)` : " · nobody sits out"}
                  </span>
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-muted">
                      <th className="py-2 pr-2 font-semibold">Game</th>
                      <th className="py-2 pr-2 text-right font-semibold">Rounds</th>
                      <th className="py-2 pr-2 text-right font-semibold">Plays</th>
                      <th className="py-2 pr-2 text-right font-semibold">Sits</th>
                      <th className="py-2 pr-2 text-right font-semibold">Break</th>
                      <th className="py-2 pr-2 text-right font-semibold">Padel</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {POINTS.map((points) => {
                      const p = planNight(players, courts, duration, points);
                      const isPlaying = playing?.courts === courts && playing.points === points;
                      const isSocial = social?.courts === courts && social.points === points;
                      const padel = p.matchesPerPlayer == null ? null : Math.round(p.matchesPerPlayer * p.minutesPerMatch);
                      return (
                        <tr key={points} className={cls("border-t border-line", (isPlaying || isSocial) && "bg-lime-soft/60")}>
                          <td className="py-2 pr-2">
                            <span className="font-bold text-navy">{points} pts</span>
                            <span className="ml-1 text-xs text-muted">~{p.minutesPerMatch} min</span>
                            {isPlaying && (
                              <Badge tone="lime" className="ml-1.5">
                                🎾 playing
                              </Badge>
                            )}
                            {isSocial && (
                              <Badge tone="amber" className="ml-1.5">
                                🍻 social
                              </Badge>
                            )}
                          </td>
                          <td className="tabular py-2 pr-2 text-right font-black text-navy">{p.rounds ?? "—"}</td>
                          <td className="tabular py-2 pr-2 text-right">{p.matchesPerPlayer ?? "—"}</td>
                          <td className="tabular py-2 pr-2 text-right">{sitting > 0 ? p.sitOutsPerPlayer : "0"}</td>
                          <td className="tabular py-2 pr-2 text-right text-muted">{sitting > 0 ? `${p.minutesPerMatch} min` : "—"}</td>
                          <td className="tabular py-2 pr-2 text-right text-muted">{padel != null ? `${padel} min` : "—"}</td>
                          <td className="py-2 text-right">
                            <Button size="sm" variant="subtle" onClick={() => createWith(courts, points)}>
                              Use
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })}

        <p className="text-xs text-muted">
          Plays = matches per player over the night; Sits = rounds sat out; Break = how long each sit-out lasts (one round);
          Padel = minutes on court per player. "Use" opens a new session with that setup.
        </p>
      </main>
    </div>
  );
}

function clamp(raw: string | null | undefined, fallback: number, min: number, max: number): number {
  const n = parseInt(raw ?? "", 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}
