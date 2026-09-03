import type { Env } from "../env";

// Production D1 can't be migrated from this environment (the deploy token has
// no D1 permission), so additive migrations are also applied lazily here:
// once per isolate, on the first API request. Idempotent and cheap (one
// PRAGMA); records the migration so wrangler's bookkeeping stays in sync.
let ready: Promise<void> | null = null;

export function ensureSchema(db: Env["DB"]): Promise<void> {
  if (!ready) {
    ready = apply(db).catch((e) => {
      ready = null; // retry on the next request
      throw e;
    });
  }
  return ready;
}

async function apply(db: Env["DB"]): Promise<void> {
  const cols = await db.prepare("PRAGMA table_info(session_players)").all<{ name: string }>();
  if (!cols.results.some((c) => c.name === "level")) {
    await db.prepare("ALTER TABLE session_players ADD COLUMN level integer").run();
    try {
      await db.prepare("INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0004_player_levels.sql')").run();
    } catch {
      // bookkeeping only
    }
  }
}
