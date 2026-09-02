import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./db/schema";
import type { Env } from "./env";
import { sendOtpEmail } from "./lib/email";

// Passwordless auth: a 6-digit one-time code emailed on every sign-in.
// First-time emails auto-create an account; the client asks for a display
// name right after. OTPs live in the existing `verification` table.
//
// Instantiated per request: env bindings are request-scoped on Workers, and
// baseURL follows the request origin so workers.dev and the custom domain
// both work with zero config changes.
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
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 600, // 10 minutes
        allowedAttempts: 5,
        async sendVerificationOTP({ email, otp }) {
          await sendOtpEmail(env, email, otp);
        },
      }),
    ],
    session: {
      cookieCache: { enabled: true, maxAge: 300 },
    },
  });
}

export type Auth = ReturnType<typeof makeAuth>;
