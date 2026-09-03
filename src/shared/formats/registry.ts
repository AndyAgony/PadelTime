import type { FormatStrategy } from "./types";
import { americano } from "./americano";
import { mexicano } from "./mexicano";
import type { FormatKey } from "../types";

// Register new formats here (King of the Court, …) — nothing else in the
// session engine needs to change to support a new format.
export const FORMATS: Record<FormatKey, FormatStrategy> = {
  americano,
  mexicano,
};

export function getFormat(key: string): FormatStrategy | null {
  return (FORMATS as Record<string, FormatStrategy>)[key] ?? null;
}
