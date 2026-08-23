import type { DrizzleD1Database } from "drizzle-orm/d1";
import type * as schema from "../db/schema";
import type { Env } from "../env";

export interface AuthedUser {
  id: string;
  name: string;
  email: string;
}

export type ApiCtx = {
  Bindings: Env;
  Variables: {
    db: DrizzleD1Database<typeof schema>;
    user: AuthedUser | null;
  };
};
