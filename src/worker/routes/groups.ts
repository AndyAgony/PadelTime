import { and, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { Hono } from "hono";
import { getFormat } from "../../shared/formats/registry";
import type { GroupRole, MeResponse, SessionStatus, SessionSummary } from "../../shared/types";
import { gameSessions, groupMembers, groups, playerResults, sessionPlayers, user } from "../db/schema";
import type { DB } from "../lib/detail";
import { isGroupOrganizer } from "../lib/detail";
import { asInt, inviteCode, newId, now, trimmed } from "../lib/util";
import type { ApiCtx } from "./context";

export const groupRoutes = new Hono<ApiCtx>();

async function confirmedCounts(db: DB, sessionIds: string[]): Promise<Map<string, number>> {
  if (sessionIds.length === 0) return new Map();
  const rows = await db
    .select({ sessionId: sessionPlayers.sessionId, n: sql<number>`count(*)` })
    .from(sessionPlayers)
    .where(
      and(
        inArray(sessionPlayers.sessionId, sessionIds),
        inArray(sessionPlayers.status, ["confirmed", "checked_in"]),
      ),
    )
    .groupBy(sessionPlayers.sessionId);
  return new Map(rows.map((r) => [r.sessionId, Number(r.n)]));
}

async function winnersFor(db: DB, sessionIds: string[]): Promise<Map<string, string>> {
  if (sessionIds.length === 0) return new Map();
  const sums = await db
    .select({
      sessionId: playerResults.sessionId,
      playerId: playerResults.playerId,
      pts: sql<number>`sum(${playerResults.pointsFor})`,
    })
    .from(playerResults)
    .where(inArray(playerResults.sessionId, sessionIds))
    .groupBy(playerResults.sessionId, playerResults.playerId);
  const top = new Map<string, { playerId: string; pts: number }>();
  for (const r of sums) {
    const cur = top.get(r.sessionId);
    if (!cur || Number(r.pts) > cur.pts) top.set(r.sessionId, { playerId: r.playerId, pts: Number(r.pts) });
  }
  const playerIds = [...top.values()].map((t) => t.playerId);
  if (playerIds.length === 0) return new Map();
  const names = await db
    .select({ id: sessionPlayers.id, guest: sessionPlayers.guestName, uname: user.name })
    .from(sessionPlayers)
    .leftJoin(user, eq(sessionPlayers.userId, user.id))
    .where(inArray(sessionPlayers.id, playerIds));
  const nameById = new Map(names.map((n) => [n.id, n.uname ?? n.guest ?? "Player"]));
  const out = new Map<string, string>();
  for (const [sessionId, t] of top) {
    const name = nameById.get(t.playerId);
    if (name) out.set(sessionId, name);
  }
  return out;
}

function toSummary(
  s: typeof gameSessions.$inferSelect,
  groupName: string,
  confirmedCount: number,
  winnerName: string | null = null,
): SessionSummary {
  return {
    id: s.id,
    groupId: s.groupId,
    groupName,
    name: s.name,
    status: s.status as SessionStatus,
    startsAt: s.startsAt,
    durationMin: s.durationMin,
    venue: s.venue,
    format: s.format as SessionSummary["format"],
    courts: s.courts,
    maxPlayers: s.maxPlayers,
    pointsPerMatch: s.pointsPerMatch,
    inviteCode: s.inviteCode,
    confirmedCount,
    winnerName,
  };
}

groupRoutes.get("/me", async (c) => {
  const u = c.get("user");
  if (!u) return c.json({ error: "Sign in required" }, 401);
  const db = c.get("db");

  const memberships = await db
    .select({ groupId: groupMembers.groupId, role: groupMembers.role, name: groups.name, ownerId: groups.ownerId })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .where(eq(groupMembers.userId, u.id));
  const groupIds = memberships.map((m) => m.groupId);

  const memberCounts = new Map<string, number>();
  if (groupIds.length > 0) {
    const rows = await db
      .select({ groupId: groupMembers.groupId, n: sql<number>`count(*)` })
      .from(groupMembers)
      .where(inArray(groupMembers.groupId, groupIds))
      .groupBy(groupMembers.groupId);
    for (const r of rows) memberCounts.set(r.groupId, Number(r.n));
  }

  let sessions: SessionSummary[] = [];
  if (groupIds.length > 0) {
    const rows = await db
      .select({ s: gameSessions, groupName: groups.name })
      .from(gameSessions)
      .innerJoin(groups, eq(gameSessions.groupId, groups.id))
      .where(
        and(
          inArray(gameSessions.groupId, groupIds),
          notInArray(gameSessions.status, ["complete", "cancelled"]),
        ),
      )
      .orderBy(desc(gameSessions.createdAt))
      .limit(25);
    const counts = await confirmedCounts(db, rows.map((r) => r.s.id));
    sessions = rows.map((r) => toSummary(r.s, r.groupName, counts.get(r.s.id) ?? 0));
  }

  const res: MeResponse = {
    user: { id: u.id, name: u.name, email: u.email },
    groups: memberships.map((m) => ({
      id: m.groupId,
      name: m.name,
      role: (m.ownerId === u.id ? "organizer" : m.role) as GroupRole,
      memberCount: memberCounts.get(m.groupId) ?? 0,
    })),
    sessions,
  };
  return c.json(res);
});

groupRoutes.post("/groups", async (c) => {
  const u = c.get("user");
  if (!u) return c.json({ error: "Sign in required" }, 401);
  const db = c.get("db");
  const body = await c.req.json().catch(() => ({}));
  const name = trimmed(body.name, 60);
  if (!name) return c.json({ error: "Group name is required" }, 400);
  const ts = now();
  const id = newId();
  await db.insert(groups).values({ id, name, ownerId: u.id, createdAt: ts });
  await db.insert(groupMembers).values({
    id: newId(),
    groupId: id,
    userId: u.id,
    role: "organizer",
    createdAt: ts,
  });
  return c.json({ id });
});

groupRoutes.get("/groups/:id", async (c) => {
  const u = c.get("user");
  if (!u) return c.json({ error: "Sign in required" }, 401);
  const db = c.get("db");
  const id = c.req.param("id");

  const [g] = await db.select().from(groups).where(eq(groups.id, id)).limit(1);
  if (!g) return c.json({ error: "Group not found" }, 404);

  const members = await db
    .select({ userId: groupMembers.userId, role: groupMembers.role, joinedAt: groupMembers.createdAt, name: user.name })
    .from(groupMembers)
    .innerJoin(user, eq(groupMembers.userId, user.id))
    .where(eq(groupMembers.groupId, id));
  const me = members.find((m) => m.userId === u.id);
  if (!me) return c.json({ error: "You're not a member of this group" }, 403);

  const sessionRows = await db
    .select()
    .from(gameSessions)
    .where(eq(gameSessions.groupId, id))
    .orderBy(desc(gameSessions.createdAt))
    .limit(100);
  const counts = await confirmedCounts(db, sessionRows.map((s) => s.id));
  const winners = await winnersFor(
    db,
    sessionRows.filter((s) => s.status === "complete").map((s) => s.id),
  );

  const myRole: GroupRole = g.ownerId === u.id ? "organizer" : (me.role as GroupRole);
  return c.json({
    id: g.id,
    name: g.name,
    myRole,
    members: members
      .map((m) => ({
        userId: m.userId,
        name: m.name,
        role: (g.ownerId === m.userId ? "organizer" : m.role) as GroupRole,
        joinedAt: m.joinedAt,
      }))
      .sort((a, b) => a.joinedAt - b.joinedAt),
    sessions: sessionRows.map((s) =>
      toSummary(s, g.name, counts.get(s.id) ?? 0, winners.get(s.id) ?? null),
    ),
  });
});

groupRoutes.post("/groups/:id/sessions", async (c) => {
  const u = c.get("user");
  if (!u) return c.json({ error: "Sign in required" }, 401);
  const db = c.get("db");
  const groupId = c.req.param("id");
  if (!(await isGroupOrganizer(db, groupId, u.id))) {
    return c.json({ error: "Only group organizers can create sessions" }, 403);
  }
  const body = await c.req.json().catch(() => ({}));
  const name = trimmed(body.name, 80);
  if (!name) return c.json({ error: "Session name is required" }, 400);
  const formatKey = typeof body.format === "string" ? body.format : "americano";
  const format = getFormat(formatKey);
  if (!format) return c.json({ error: `Unknown format "${formatKey}"` }, 400);
  const courts = Math.min(Math.max(asInt(body.courts) ?? 2, 1), 12);
  const maxPlayers = Math.min(Math.max(asInt(body.maxPlayers) ?? 12, format.minPlayers), 64);
  const pointsPerMatch = Math.min(Math.max(asInt(body.pointsPerMatch) ?? format.defaultPoints, 4), 99);
  const startsAt = asInt(body.startsAt);
  const durationRaw = asInt(body.durationMin);
  const durationMin = durationRaw == null ? 90 : durationRaw <= 0 ? null : Math.min(durationRaw, 600);
  const venue = trimmed(body.venue, 80);

  const ts = now();
  const id = newId();
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await db.insert(gameSessions).values({
        id,
        groupId,
        name,
        venue,
        startsAt,
        durationMin,
        courts,
        maxPlayers,
        pointsPerMatch,
        format: format.key,
        status: "draft",
        inviteCode: inviteCode(),
        createdBy: u.id,
        createdAt: ts,
        updatedAt: ts,
      });
      break;
    } catch (err) {
      if (attempt === 2) throw err; // invite code collision is the only expected cause
    }
  }
  return c.json({ id });
});

groupRoutes.patch("/groups/:id/members/:userId", async (c) => {
  const u = c.get("user");
  if (!u) return c.json({ error: "Sign in required" }, 401);
  const db = c.get("db");
  const groupId = c.req.param("id");
  const targetId = c.req.param("userId");
  if (!(await isGroupOrganizer(db, groupId, u.id))) {
    return c.json({ error: "Only organizers can change roles" }, 403);
  }
  const [g] = await db.select().from(groups).where(eq(groups.id, groupId)).limit(1);
  if (!g) return c.json({ error: "Group not found" }, 404);
  if (targetId === g.ownerId) return c.json({ error: "The group owner is always an organizer" }, 400);
  const body = await c.req.json().catch(() => ({}));
  const role = body.role === "organizer" ? "organizer" : "member";
  await db
    .update(groupMembers)
    .set({ role })
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, targetId)));
  return c.json({ ok: true });
});

groupRoutes.delete("/groups/:id/members/:userId", async (c) => {
  const u = c.get("user");
  if (!u) return c.json({ error: "Sign in required" }, 401);
  const db = c.get("db");
  const groupId = c.req.param("id");
  const targetId = c.req.param("userId");
  const self = targetId === u.id;
  if (!self && !(await isGroupOrganizer(db, groupId, u.id))) {
    return c.json({ error: "Only organizers can remove members" }, 403);
  }
  const [g] = await db.select().from(groups).where(eq(groups.id, groupId)).limit(1);
  if (!g) return c.json({ error: "Group not found" }, 404);
  if (targetId === g.ownerId) return c.json({ error: "The group owner can't be removed" }, 400);
  await db
    .delete(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, targetId)));
  return c.json({ ok: true });
});
