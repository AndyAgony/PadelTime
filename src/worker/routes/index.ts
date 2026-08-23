import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import * as schema from "../db/schema";
import { makeAuth } from "../auth";
import type { ApiCtx } from "./context";
import { groupRoutes } from "./groups";
import { matchRoutes } from "./matches";
import { publicRoutes } from "./publicRoutes";
import { sessionRoutes } from "./sessions";

export const api = new Hono<ApiCtx>();

api.use("*", async (c, next) => {
  c.set("db", drizzle(c.env.DB, { schema }));
  const auth = makeAuth(c.env, new URL(c.req.url).origin);
  const s = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set(
    "user",
    s?.user ? { id: s.user.id, name: s.user.name, email: s.user.email } : null,
  );
  await next();
});

api.get("/health", (c) => c.json({ ok: true }));
api.route("/", groupRoutes);
api.route("/", sessionRoutes);
api.route("/", matchRoutes);
api.route("/", publicRoutes);
