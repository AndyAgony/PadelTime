import type { Env } from "../env";

// Transactional email via Resend's HTTPS API (no SMTP needed on Workers).
// Without an API key (local dev) the code is logged instead — pair with
// DEV_MODE=1 and GET /api/dev/otp for automated tests.
export async function sendOtpEmail(env: Env, email: string, otp: string): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.log(`[dev] sign-in code for ${email}: ${otp}`);
    return;
  }
  const from = env.MAIL_FROM || "PadelTime <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: `${otp} is your PadelTime code`,
      text: `Your PadelTime sign-in code is ${otp}. It expires in 10 minutes.\n\nIf you didn't request this, you can ignore this email.`,
      html: `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:420px;margin:0 auto;padding:24px">
  <p style="font-size:18px;font-weight:800;margin:0 0 16px">🎾 Padel<span style="color:#84cc16">Time</span></p>
  <p style="font-size:14px;color:#3f3f46;margin:0 0 8px">Your sign-in code:</p>
  <p style="font-size:36px;font-weight:800;letter-spacing:8px;margin:0 0 16px">${otp}</p>
  <p style="font-size:12px;color:#71717a;margin:0">Expires in 10 minutes. If you didn't request this, ignore this email.</p>
</div>`,
    }),
  });
  if (!res.ok) {
    console.error("Resend send failed:", res.status, await res.text());
    throw new Error("Could not send the sign-in code email");
  }
}
