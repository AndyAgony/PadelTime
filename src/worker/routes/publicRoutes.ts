import { and, desc, eq, like } from "drizzle-orm";
import { Hono } from "hono";
import type { BoardData, JoinInfo, PlayerStatus, SessionStatus } from "../../shared/types";
import { computeStandings } from "../../shared/standings";
import { groupMembers, sessionPlayers, verification } from "../db/schema";
import { loadPlayers, loadRounds, loadSessionByCode } from "../lib/detail";
import { newId, now } from "../lib/util";
import type { ApiCtx } from "./context";

export const publicRoutes = new Hono<ApiCtx>();

// Local-development only: lets tests read the latest sign-in code instead of
// an inbox. Gated on DEV_MODE=1, which only .dev.vars ever sets — the check
// happens per request, and production has no DEV_MODE var.
publicRoutes.get("/dev/otp", async (c) => {
  if (c.env.DEV_MODE !== "1") return c.json({ error: "Not found" }, 404);
  const email = (c.req.query("email") ?? "").toLowerCase();
  if (!email) return c.json({ error: "email required" }, 400);
  const db = c.get("db");
  const [row] = await db
    .select()
    .from(verification)
    .where(like(verification.identifier, `%otp%${email}%`))
    .orderBy(desc(verification.createdAt))
    .limit(1);
  if (!row) return c.json({ error: "No code found" }, 404);
  return c.json({ identifier: row.identifier, value: row.value });
});

// Public info for an invite link — enough to decide to join.
publicRoutes.get("/join/:code", async (c) => {
  const db = c.get("db");
  const loaded = await loadSessionByCode(db, c.req.param("code"));
  if (!loaded) return c.json({ error: "That invite link doesn't exist" }, 404);
  const { session, groupName } = loaded;
  const players = await db
    .select()
    .from(sessionPlayers)
    .where(eq(sessionPlayers.sessionId, session.id));

  const u = c.get("user");
  const mine = u ? players.find((p) => p.userId === u.id) : undefined;
  const info: JoinInfo = {
    sessionId: session.id,
    name: session.name,
    groupName,
    venue: session.venue,
    startsAt: session.startsAt,
    status: session.status as SessionStatus,
    format: session.format as JoinInfo["format"],
    courts: session.courts,
    maxPlayers: session.maxPlayers,
    pointsPerMatch: session.pointsPerMatch,
    confirmedCount: players.filter((p) => p.status === "confirmed" || p.status === "checked_in").length,
    waitlistCount: players.filter((p) => p.status === "waitlist").length,
    myStatus: (mine?.status as PlayerStatus) ?? null,
  };
  return c.json(info);
});

// Join via invite link → confirmed, or waitlist when full (plan §8).
publicRoutes.post("/join/:code", async (c) => {
  const u = c.get("user");
  if (!u) return c.json({ error: "Sign in required" }, 401);
  const db = c.get("db");
  const loaded = await loadSessionByCode(db, c.req.param("code"));
  if (!loaded) return c.json({ error: "That invite link doesn't exist" }, 404);
  const { session } = loaded;
  if (!["open", "checkin"].includes(session.status)) {
    const msg =
      session.status === "draft"
        ? "Signup hasn't opened yet — check back soon"
        : session.status === "active"
          ? "This session already started — ask the organizer to add you"
          : "This session is over";
    return c.json({ error: msg }, 400);
  }

  const players = await db
    .select()
    .from(sessionPlayers)
    .where(eq(sessionPlayers.sessionId, session.id));
  const taken = players.filter((p) => p.status === "confirmed" || p.status === "checked_in").length;
  const target: PlayerStatus = taken < session.maxPlayers ? "confirmed" : "waitlist";

  const existing = players.find((p) => p.userId === u.id);
  if (existing) {
    if (existing.status === "dropped") {
      await db
        .update(sessionPlayers)
        .set({ status: target, joinedAt: now() })
        .where(eq(sessionPlayers.id, existing.id));
      return c.json({ status: target });
    }
    return c.json({ status: existing.status });
  }

  await db.insert(sessionPlayers).values({
    id: newId(),
    sessionId: session.id,
    userId: u.id,
    guestName: null,
    status: target,
    joinedAt: now(),
    checkedInAt: null,
  });

  // Joining a session makes you part of its group (recurring-group model, plan §18).
  const [membership] = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, session.groupId), eq(groupMembers.userId, u.id)))
    .limit(1);
  if (!membership) {
    await db.insert(groupMembers).values({
      id: newId(),
      groupId: session.groupId,
      userId: u.id,
      role: "member",
      createdAt: now(),
    });
  }
  return c.json({ status: target });
});

// Read-only live board for the invite code — the TV / court display (plan §16).
publicRoutes.get("/board/:code", async (c) => {
  const db = c.get("db");
  const loaded = await loadSessionByCode(db, c.req.param("code"));
  if (!loaded) return c.json({ error: "Board not found" }, 404);
  const { session, groupName } = loaded;
  const players = await loadPlayers(db, session.id);
  const rounds = await loadRounds(db, session.id);
  const board: BoardData = {
    name: session.name,
    groupName,
    status: session.status as SessionStatus,
    pointsPerMatch: session.pointsPerMatch,
    players: players.map((p) => ({ id: p.id, name: p.name })),
    rounds,
    standings: computeStandings(players, rounds),
  };
  return c.json(board);
});
