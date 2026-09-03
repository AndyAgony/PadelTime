import { Hono } from "hono";
import { makeAuth } from "./auth";
import type { Env } from "./env";
import { api } from "./routes";
import { ensureSchema } from "./lib/ensureSchema";

const app = new Hono<{ Bindings: Env }>();

// Additive schema changes that couldn't be applied from the deploy pipeline.
app.use("/api/*", async (c, next) => {
  await ensureSchema(c.env.DB);
  await next();
});

// Better Auth owns /api/auth/* (sign-up, sign-in, session, sign-out, …).
app.on(["GET", "POST"], "/api/auth/*", (c) =>
  makeAuth(c.env, new URL(c.req.url).origin).handler(c.req.raw),
);

app.route("/api", api);

app.notFound((c) => c.json({ error: "Not found" }, 404));
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json({ error: "Something went wrong on our side" }, 500);
});

// Static assets (the React app) are served by the Workers runtime for all
// non-/api routes — see "assets" in wrangler.jsonc (SPA fallback enabled).
export default app;
