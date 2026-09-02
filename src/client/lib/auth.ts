import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

// Same-origin API — no baseURL needed; works on workers.dev and the custom
// domain without changes. Auth is passwordless: email → 6-digit code.
export const authClient = createAuthClient({
  plugins: [emailOTPClient()],
});
