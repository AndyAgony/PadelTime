export function fmtDateTime(ms: number | null): string {
  if (!ms) return "Time TBD";
  const d = new Date(ms);
  const date = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} · ${time}`;
}

export function firstName(name: string): string {
  return name.split(" ")[0] || name;
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function toLocalInputValue(ms: number | null): string {
  if (!ms) return "";
  const d = new Date(ms);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInputValue(v: string): number | null {
  if (!v) return null;
  const ms = new Date(v).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/** "Thu, Sep 3 · 7:00 – 8:30 PM" when a duration is known; falls back to date+time. */
export function fmtTimeRange(startsAt: number | null, durationMin: number | null | undefined): string {
  if (!startsAt) return "Time TBD";
  const start = new Date(startsAt);
  const date = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const t = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (!durationMin) return `${date} · ${t(start)}`;
  const end = new Date(startsAt + durationMin * 60_000);
  return `${date} · ${t(start)} – ${t(end)}`;
}

/** "SEP" / "3" pieces for a date block. */
export function dateParts(ms: number | null): { month: string; day: string; weekday: string } | null {
  if (!ms) return null;
  const d = new Date(ms);
  return {
    month: d.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
    day: String(d.getDate()),
    weekday: d.toLocaleDateString(undefined, { weekday: "short" }),
  };
}
