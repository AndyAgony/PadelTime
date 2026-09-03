import { LEVELS, levelMeta } from "../../shared/levels";
import { cls } from "./ui";

/** Compact ability picker: a native select so it works with one tap on a phone. */
export function LevelSelect({
  value,
  onChange,
  busy = false,
  label = "Level",
}: {
  value: number | null;
  onChange: (level: number | null) => void;
  busy?: boolean;
  label?: string;
}) {
  const meta = levelMeta(value);
  return (
    <select
      aria-label={label}
      title="Ability level — seeds round 1 and balances teams"
      disabled={busy}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      className={cls(
        "h-7 max-w-[7.5rem] rounded-full border px-2 text-xs font-bold outline-none focus:ring-2 focus:ring-royal/30 disabled:opacity-50",
        meta ? "border-line bg-canvas text-navy" : "border-dashed border-line-strong bg-white text-muted",
      )}
    >
      <option value="">— level —</option>
      {LEVELS.map((l) => (
        <option key={l.value} value={l.value}>
          {l.emoji} {l.label}
        </option>
      ))}
    </select>
  );
}

export function LevelBadge({ level, className }: { level: number | null; className?: string }) {
  const meta = levelMeta(level);
  if (!meta) return null;
  return (
    <span className={cls("inline-flex items-center gap-0.5 rounded-full bg-canvas px-1.5 py-0.5 text-[10px] font-bold text-navy", className)} title={meta.label}>
      {meta.emoji} {meta.short}
    </span>
  );
}
