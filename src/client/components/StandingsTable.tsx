import type { StandingRow } from "../../shared/types";
import { cls } from "./ui";

export const rankStyle = (i: number) =>
  i === 0
    ? "bg-lime text-navy"
    : i === 1
      ? "bg-line text-navy"
      : i === 2
        ? "bg-amber-soft text-amber-dark"
        : "bg-canvas text-muted";

export function StandingsTable({
  standings,
  highlightId,
  compact = false,
}: {
  standings: StandingRow[];
  highlightId?: string | null;
  compact?: boolean;
}) {
  if (standings.length === 0) {
    return <p className="py-6 text-center text-sm text-muted">No players yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-muted">
            <th className="py-2 pr-2 font-semibold">#</th>
            <th className="py-2 pr-2 font-semibold">Player</th>
            <th className="py-2 pr-2 text-right font-semibold">Pts</th>
            {!compact && <th className="py-2 pr-2 text-right font-semibold">W-L{""}</th>}
            {!compact && <th className="py-2 pr-2 text-right font-semibold">+/-</th>}
            <th className="py-2 text-right font-semibold">P</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row, i) => (
            <tr
              key={row.playerId}
              className={cls(
                "border-t border-line",
                row.playerId === highlightId && "bg-lime-soft",
              )}
            >
              <td className="py-2 pr-2">
                <span
                  className={cls(
                    "inline-flex size-6 items-center justify-center rounded-full text-xs font-bold",
                    rankStyle(i),
                  )}
                >
                  {i + 1}
                </span>
              </td>
              <td className="py-2 pr-2 font-semibold text-navy">
                {row.name}
                {row.playerId === highlightId && <span className="ml-1.5 text-xs font-bold text-royal">you</span>}
              </td>
              <td className="tabular py-2 pr-2 text-right text-base font-black text-navy">
                {row.points}
              </td>
              {!compact && (
                <td className="tabular py-2 pr-2 text-right text-muted">
                  {row.wins}-{row.losses}
                  {row.ties > 0 ? `-${row.ties}` : ""}
                </td>
              )}
              {!compact && (
                <td className={cls("tabular py-2 pr-2 text-right", row.diff > 0 ? "text-mint-dark" : row.diff < 0 ? "text-rose-dark" : "text-faint")}>
                  {row.diff > 0 ? `+${row.diff}` : row.diff}
                </td>
              )}
              <td className="tabular py-2 text-right text-muted">{row.played}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
