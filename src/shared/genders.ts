// Player gender, self-reported at join or set by the organizer. Only used for
// the "mixed pairs" option (one woman + one man per team) and a small badge.
export type Gender = "woman" | "man";

export const GENDERS: { value: Gender; label: string; short: string; emoji: string }[] = [
  { value: "woman", label: "Woman", short: "W", emoji: "👩" },
  { value: "man", label: "Man", short: "M", emoji: "👨" },
];

export function genderMeta(value: string | null | undefined) {
  return GENDERS.find((g) => g.value === value) ?? null;
}

export function parseGender(v: unknown): Gender | null {
  return v === "woman" || v === "man" ? v : null;
}
