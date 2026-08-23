import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { Api, usePoll } from "../lib/api";
import { StandingsTable } from "../components/StandingsTable";
import { Badge, PageSpinner, cls } from "../components/ui";

// TV / court display (plan §16): read-only, huge type, auto-refreshing.
export function BoardPage() {
  const { code = "" } = useParams();
  const { data, error } = usePoll(() => Api.board(code), 5000, [code]);

  const nameOf = useMemo(() => {
    const map = new Map((data?.players ?? []).map((p) => [p.id, p.name]));
    return (pid: string) => map.get(pid) ?? "?";
  }, [data?.players]);

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-zinc-400">{error}</div>
    );
  }
  if (!data) return <PageSpinner />;

  const current = data.rounds[data.rounds.length - 1];
  const done = data.status === "complete";
  const champion = done ? data.standings[0] : null;

  return (
    <div className="app-bg min-h-dvh px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-zinc-500">{data.groupName}</p>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">{data.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            {current && !done && (
              <span className="text-2xl font-black text-lime-300">ROUND {current.number}</span>
            )}
            {done && <Badge tone="emerald" className="text-sm">FINAL</Badge>}
          </div>
        </header>

        {champion && (
          <div className="mb-8 rounded-3xl border border-lime-400/30 bg-lime-400/10 p-8 text-center">
            <p className="text-lg">🏆 Champion</p>
            <p className="text-5xl font-black text-lime-300">{champion.name}</p>
            <p className="mt-1 text-zinc-300">{champion.points} points</p>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <section>
            {current && !done ? (
              <div className="space-y-4">
                {current.matches.map((m) => (
                  <div key={m.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-black uppercase tracking-widest text-zinc-500">
                        Court {m.court}
                      </span>
                      <span
                        className={cls(
                          "text-xs font-bold uppercase tracking-wider",
                          m.status === "confirmed" ? "text-lime-400" : "text-zinc-500",
                        )}
                      >
                        {m.status === "confirmed" ? "✓ complete" : m.status === "submitted" || m.status === "disputed" ? "confirming…" : "live"}
                      </span>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2">
                      <p className="truncate text-2xl font-bold">{nameOf(m.a[0])} + {nameOf(m.a[1])}</p>
                      <p className="tabular text-4xl font-black text-lime-300">{m.scoreA ?? "–"}</p>
                      <p className="truncate text-2xl font-bold">{nameOf(m.b[0])} + {nameOf(m.b[1])}</p>
                      <p className="tabular text-4xl font-black text-lime-300">{m.scoreB ?? "–"}</p>
                    </div>
                  </div>
                ))}
                {current.byes.length > 0 && (
                  <p className="text-lg text-zinc-400">
                    <span className="font-bold text-zinc-200">SITTING:</span>{" "}
                    {current.byes.map(nameOf).join("  ·  ")}
                  </p>
                )}
              </div>
            ) : !done ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 p-10 text-center text-zinc-500">
                Waiting for the first round…
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <h2 className="mb-4 text-xl font-black">Leaderboard</h2>
            <StandingsTable standings={data.standings} compact />
          </section>
        </div>

        <footer className="mt-10 text-center text-sm text-zinc-600">
          🎾 PadelTime · {data.pointsPerMatch} points per match
        </footer>
      </div>
    </div>
  );
}
