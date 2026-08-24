import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { americano } from "../../shared/formats/americano";
import { mulberry32 } from "../../shared/formats/types";
import type { EngineContext } from "../../shared/formats/types";
import { buildHistory } from "../../shared/history";
import type { HistoryRound } from "../../shared/history";
import { Button, cls } from "../components/ui";

// Pen & paper mode: a one-page, print-optimised Americano sheet.
// The pairing engine pre-computes the whole schedule by player NUMBER —
// names are written once next to a number, everything else is already routed.

function clampInt(v: string | null, def: number, min: number, max: number): number {
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : def;
}

interface SheetRound {
  number: number;
  byes: number[];
  matches: { court: number; a: [number, number]; b: [number, number] }[];
}

function generateSchedule(players: number, courts: number, rounds: number, seed: number): SheetRound[] {
  const ids = Array.from({ length: players }, (_, i) => `${i + 1}`);
  const history: HistoryRound[] = [];
  const out: SheetRound[] = [];
  const rng = mulberry32(seed || 1);
  for (let r = 1; r <= rounds; r++) {
    const h = buildHistory(history);
    const ctx: EngineContext = { players: ids, courts, roundNumber: r, ...h, standings: [], rng };
    const plan = americano.planRound(ctx);
    history.push({ number: r, byes: plan.byes, matches: plan.matches.map((m) => ({ a: m.a, b: m.b })) });
    out.push({
      number: r,
      byes: plan.byes.map(Number).sort((a, b) => a - b),
      matches: plan.matches.map((m) => ({
        court: m.court,
        a: [Number(m.a[0]), Number(m.a[1])],
        b: [Number(m.b[0]), Number(m.b[1])],
      })),
    });
  }
  return out;
}

export function PrintSheetPage() {
  const [params, setParams] = useSearchParams();
  // Ranges are capped to what stays genuinely writable on one A4 page —
  // bigger nights are what the app itself is for.
  const players = clampInt(params.get("players"), 12, 4, 16);
  const courts = clampInt(params.get("courts"), 3, 1, 4);
  const points = clampInt(params.get("points"), 24, 4, 99);
  const rounds = clampInt(params.get("rounds"), 6, 3, 8);
  const seed = clampInt(params.get("seed"), 1, 1, 999999);

  const set = (key: string, value: number) => {
    const next = new URLSearchParams(params);
    next.set(key, String(value));
    setParams(next, { replace: true });
  };

  const schedule = useMemo(
    () => generateSchedule(players, courts, rounds, seed),
    [players, courts, rounds, seed],
  );
  const byeRounds = useMemo(() => {
    const map = new Map<number, Set<number>>();
    for (const r of schedule) for (const b of r.byes) {
      if (!map.has(b)) map.set(b, new Set());
      map.get(b)!.add(r.number);
    }
    return map;
  }, [schedule]);

  const dense = players > 12 || rounds > 6;
  const numInput =
    "w-16 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-center text-sm text-zinc-100 outline-none focus:border-lime-400/60";

  return (
    <div className="min-h-dvh bg-zinc-950 print:bg-white">
      {/* Controls — never printed */}
      <div className="no-print border-b border-zinc-800 bg-zinc-950/95 px-4 py-4">
        <div className="mx-auto flex max-w-4xl flex-wrap items-end justify-between gap-4">
          <div>
            <Link to="/" className="text-sm text-zinc-400 hover:text-lime-300">← PadelTime</Link>
            <h1 className="text-lg font-black text-zinc-100">Printable Americano sheet</h1>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            {(
              [
                ["Players", "players", players, 4, 16],
                ["Courts", "courts", courts, 1, 4],
                ["Rounds", "rounds", rounds, 3, 8],
                ["Points", "points", points, 4, 99],
              ] as const
            ).map(([label, key, value, min, max]) => (
              <label key={key} className="block text-center">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</span>
                <input
                  type="number"
                  className={numInput}
                  min={min}
                  max={max}
                  value={value}
                  onChange={(e) => set(key, clampInt(e.target.value, value, min, max))}
                />
              </label>
            ))}
            <Button variant="ghost" size="sm" onClick={() => set("seed", (seed % 999999) + 1)}>
              ↻ Shuffle pairings
            </Button>
            <Button onClick={() => window.print()}>🖨 Print / Save PDF</Button>
          </div>
        </div>
      </div>

      {/* The sheet — white paper, prints exactly as previewed */}
      <div className="mx-auto my-6 max-w-4xl px-4 print:my-0 print:max-w-none print:px-0">
        <div className="sheet mx-auto bg-white p-6 text-zinc-900 shadow-2xl print:p-0 print:shadow-none">
          {/* Header */}
          <div className="flex items-end justify-between border-b-2 border-zinc-900 pb-2">
            <div>
              <p className="text-xl font-black tracking-tight">🎾 PadelTime · AMERICANO</p>
              <p className="text-[11px] text-zinc-600">
                {players} players · {courts} court{courts === 1 ? "" : "s"} · {rounds} rounds ·{" "}
                <b>{points} points per match</b> — every player scores their team's points
              </p>
            </div>
            <div className="text-right text-[11px] text-zinc-700">
              <p className="mb-2">Date ______________________</p>
              <p>Venue ______________________</p>
            </div>
          </div>

          {/* Schedule */}
          <div className={cls("grid gap-x-5", dense ? "mt-2 gap-y-1.5" : "mt-3 gap-y-2", rounds > 4 ? "grid-cols-2" : "grid-cols-1")}>
            {schedule.map((round) => (
              <div key={round.number} className="break-inside-avoid rounded border border-zinc-300">
                <div className={cls("flex items-center justify-between border-b border-zinc-300 bg-zinc-100 px-2", dense ? "py-px" : "py-0.5")}>
                  <span className={cls("font-black", dense ? "text-[11px]" : "text-xs")}>ROUND {round.number}</span>
                  {round.byes.length > 0 && (
                    <span className={cls("text-zinc-600", dense ? "text-[9px]" : "text-[10px]")}>
                      sits: {round.byes.map((b) => `#${b}`).join(" ")}
                    </span>
                  )}
                </div>
                <table className="w-full">
                  <tbody>
                    {round.matches.map((m) => (
                      <tr key={m.court} className="border-t border-zinc-200 first:border-t-0">
                        <td className={cls("px-2 font-bold text-zinc-500", dense ? "py-px text-[9px]" : "py-0.5 text-[10px]")}>
                          C{m.court}
                        </td>
                        <td className={cls("tabular text-center font-bold", dense ? "py-px text-[11px]" : "py-0.5 text-xs")}>
                          {m.a[0]} + {m.a[1]} <span className="font-normal text-zinc-400">vs</span> {m.b[0]} + {m.b[1]}
                        </td>
                        <td className={cls("pr-2 text-right", dense ? "py-px" : "py-0.5")}>
                          <span className={cls("inline-block border-b border-zinc-400 text-center", dense ? "w-7" : "w-9")}>&nbsp;</span>
                          <span className="mx-0.5 text-[10px] text-zinc-400">:</span>
                          <span className={cls("inline-block border-b border-zinc-400 text-center", dense ? "w-7" : "w-9")}>&nbsp;</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {/* Tally: names + points per round + total */}
          <table className={cls("w-full border-collapse", dense ? "mt-2" : "mt-3")}>
            <thead>
              <tr>
                <th className={cls("border border-zinc-400 bg-zinc-100 px-1 py-0.5 font-black", dense ? "text-[10px]" : "text-[11px]")}>#</th>
                <th className={cls("border border-zinc-400 bg-zinc-100 px-2 py-0.5 text-left font-black", dense ? "text-[10px]" : "text-[11px]")}>
                  PLAYER
                </th>
                {schedule.map((r) => (
                  <th key={r.number} className={cls("border border-zinc-400 bg-zinc-100 px-1 py-0.5 font-bold", dense ? "w-8 text-[9px]" : "w-10 text-[10px]")}>
                    R{r.number}
                  </th>
                ))}
                <th className={cls("border border-zinc-400 bg-zinc-200 px-1 py-0.5 font-black", dense ? "w-10 text-[10px]" : "w-14 text-[11px]")}>
                  TOTAL
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: players }, (_, i) => i + 1).map((p) => (
                <tr key={p}>
                  <td className={cls("tabular border border-zinc-400 px-1 text-center font-black", dense ? "py-[2px] text-[10px]" : "py-1 text-[11px]")}>
                    {p}
                  </td>
                  <td className="border border-zinc-400 px-2" />
                  {schedule.map((r) => (
                    <td key={r.number} className="tabular border border-zinc-400 text-center">
                      {byeRounds.get(p)?.has(r.number) ? (
                        <span className={cls("text-zinc-400", dense ? "text-[9px]" : "text-[10px]")}>—</span>
                      ) : null}
                    </td>
                  ))}
                  <td className="border border-zinc-400 bg-zinc-50" />
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-1.5 text-[9px] text-zinc-500">
            Write each name next to its number — the schedule above uses the numbers. “—” means that player sits the
            round out. After each match, both partners write their team's score in their own row; highest total wins.
            Pairings maximise partner &amp; opponent variety (generated by padeltime).
          </p>
        </div>
      </div>
    </div>
  );
}
