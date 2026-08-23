import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./db/schema";
import type { Env } from "./env";

// Workers WebCrypto caps PBKDF2 at 100k iterations; native PBKDF2 runs in a
// couple of milliseconds of CPU, unlike Better Auth's default scrypt which is
// pure JS on Workers and can blow the CPU budget on the free plan.
const PBKDF2_ITERATIONS = 100_000;

const enc = new TextEncoder();
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `v1:${b64(salt)}:${b64(await derive(password, salt))}`;
}

export async function verifyPassword(data: { hash: string; password: string }): Promise<boolean> {
  const [version, saltB64, digestB64] = data.hash.split(":");
  if (version !== "v1" || !saltB64 || !digestB64) return false;
  const expected = unb64(digestB64);
  const actual = await derive(data.password, unb64(saltB64));
  if (expected.length !== actual.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ actual[i];
  return diff === 0;
}

// Instantiated per request: env bindings are request-scoped on Workers, and
// baseURL follows the request origin so workers.dev today and a custom domain
// later both work with zero config changes.
export function makeAuth(env: Env, origin: string) {
  const db = drizzle(env.DB, { schema });
  return betterAuth({
    baseURL: origin,
    secret: env.BETTER_AUTH_SECRET || "insecure-dev-secret-change-me",
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      password: {
        hash: hashPassword,
        verify: verifyPassword,
      },
    },
    session: {
      cookieCache: { enabled: true, maxAge: 300 },
    },
  });
}

export type Auth = ReturnType<typeof makeAuth>;
