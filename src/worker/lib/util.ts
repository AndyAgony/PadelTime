const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789"; // no 0/O/1/I/L

export function inviteCode(length = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return out;
}

export function newId(): string {
  return crypto.randomUUID();
}

export function now(): number {
  return Date.now();
}

export function asInt(v: unknown): number | null {
  if (typeof v === "number" && Number.isInteger(v)) return v;
  if (typeof v === "string" && /^-?\d+$/.test(v)) return parseInt(v, 10);
  return null;
}

export function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

export function trimmed(v: unknown, maxLen = 120): string | null {
  const s = asString(v)?.trim();
  return s ? s.slice(0, maxLen) : null;
}
