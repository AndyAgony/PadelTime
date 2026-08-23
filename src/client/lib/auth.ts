import { createAuthClient } from "better-auth/react";

// Same-origin API — no baseURL needed; works on workers.dev now and on a
// custom domain later without changes.
export const authClient = createAuthClient();
