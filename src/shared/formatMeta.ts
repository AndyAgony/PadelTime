import type { FormatKey } from "./types";

// How each format is presented: the organizer picks a *style* (casual /
// competitive); the format name is the padel-world term behind it.
export interface FormatMeta {
  key: FormatKey;
  name: string;
  style: string;
  emoji: string;
  tagline: string;
  blurb: string;
}

export const FORMAT_META: Record<FormatKey, FormatMeta> = {
  americano: {
    key: "americano",
    name: "Americano",
    style: "Casual",
    emoji: "🎉",
    tagline: "Mix with everyone",
    blurb: "New partner every round and courts drawn for variety — it's you against the whole field.",
  },
  mexicano: {
    key: "mexicano",
    name: "Mexicano",
    style: "Competitive",
    emoji: "🏆",
    tagline: "Play your level",
    blurb:
      "Round 1 is a random draw. After that the standings deal the courts: top four on court 1, next four on court 2… 1st & 4th vs 2nd & 3rd, so every match stays close.",
  },
};

export const FORMAT_KEYS: FormatKey[] = ["americano", "mexicano"];

export function formatMeta(key: string): FormatMeta {
  return FORMAT_META[key as FormatKey] ?? FORMAT_META.americano;
}
