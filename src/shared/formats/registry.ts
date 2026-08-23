import type { FormatStrategy } from "./types";
import { americano } from "./americano";
import type { FormatKey } from "../types";

// Register new formats here (Mexicano, King of the Court, …) — nothing else
// in the app needs to change to support a new format.
export const FORMATS: Record<FormatKey, FormatStrategy> = {
  americano,
};

export function getFormat(key: string): FormatStrategy | null {
  return (FORMATS as Record<string, FormatStrategy>)[key] ?? null;
}
