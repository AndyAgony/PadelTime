// Player ability levels — coarse on purpose. Set by the player when joining or
// by the organizer in the roster. Used to seed round 1 (Mexicano) and to
// balance teams within a court (Americano).
export interface LevelMeta {
  value: number;
  label: string;
  short: string;
  emoji: string;
}

export const LEVELS: LevelMeta[] = [
  { value: 1, label: "Newbie", short: "New", emoji: "🌱" },
  { value: 2, label: "Beginner", short: "Beg", emoji: "🙂" },
  { value: 3, label: "Intermediate", short: "Int", emoji: "💪" },
  { value: 4, label: "Advanced", short: "Adv", emoji: "🔥" },
];

export function levelMeta(value: number | null | undefined): LevelMeta | null {
  return LEVELS.find((l) => l.value === value) ?? null;
}

/** Clamp anything from the wire to a valid level, or null. */
export function parseLevel(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseInt(v, 10) : NaN;
  return Number.isInteger(n) && n >= 1 && n <= 4 ? n : null;
}

/** Level used in calculations when a player hasn't set one: the middle of the scale. */
export const UNSET_LEVEL = 2.5;
