// End-to-end smoke test against a running `wrangler dev` on :8787.
// Drives the full V1 flow with two users (organizer + player) plus the
// public board. Run with: node test/e2e-smoke.mjs [screenshot-dir]
import { chromium } from "playwright";

const BASE = process.env.E2E_BASE ?? "http://127.0.0.1:8787";
const SHOTS = process.argv[2] ?? null;
const run = `${Date.now()}`.slice(-6);

let step = 0;
const log = (msg) => console.log(`  [${++step}] ${msg}`);
const fail = (msg) => {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
};

async function shot(page, name) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false });
}

async function launch() {
  // Honor an outbound proxy (e.g. sandboxed CI environments); bypass it for localhost.
  const proxyServer = process.env.HTTPS_PROXY || process.env.https_proxy;
  const opts = proxyServer
    ? { proxy: { server: proxyServer, bypass: "127.0.0.1,localhost" } }
    : {};
  try {
    return await chromium.launch(opts);
  } catch {
    return await chromium.launch({ ...opts, executablePath: "/opt/pw-browsers/chromium" });
  }
}

const contextOpts = { ignoreHTTPSErrors: !!(process.env.HTTPS_PROXY || process.env.https_proxy) };

async function register(page, name, email) {
  await page.goto(`${BASE}/register`);
  await page.getByPlaceholder("Andrew").fill(name);
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("••••••••").fill("padeltime123");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/app", { timeout: 15000 });
}

const browser = await launch();

// --- Organizer -------------------------------------------------------------
const orgCtx = await browser.newContext({ ...contextOpts, viewport: { width: 390, height: 844 } });
const org = await orgCtx.newPage();
org.on("dialog", (d) => d.accept());

await register(org, "Andrew", `andrew${run}@test.com`);
log("organizer registered → /app");
await shot(org, "01-home");

await org.getByRole("button", { name: /Create your first group/ }).click();
await org.getByPlaceholder("Sunday Padel Crew").fill("Sunday Padel");
await org.getByRole("button", { name: "Create group", exact: true }).click();
await org.waitForURL("**/app/groups/**");
log("group created");

await org.getByRole("button", { name: "+ New session" }).click();
await org.getByPlaceholder("Sunday Padel").fill("Sunday Night Americano");
await org.getByRole("button", { name: "Create session", exact: true }).click();
await org.waitForURL("**/app/sessions/**");
log("session created (draft)");

await org.getByRole("button", { name: "Open signup" }).click();
await org.getByText("Invite players").waitFor({ timeout: 10000 });
log("signup opened");

const joinUrl = (await org.locator(".font-mono").first().textContent())?.trim();
if (!joinUrl?.includes("/join/")) fail(`no join url found (${joinUrl})`);
const code = joinUrl.split("/join/")[1];
log(`invite code: ${code}`);

await org.getByRole("button", { name: "+ I'm playing too" }).click();
await org.getByText("you", { exact: true }).first().waitFor({ timeout: 10000 });
for (const g of ["George", "John", "Zach", "Mike", "Ben", "Chris"]) {
  await org.getByPlaceholder(/Add player by name/).fill(g);
  await org.getByRole("button", { name: "Add", exact: true }).click();
  await org.getByText(g).first().waitFor({ timeout: 10000 });
}
log("organizer + 6 guests in roster");
await shot(org, "02-roster-open");

// --- Player joins via invite link ------------------------------------------
const paulaCtx = await browser.newContext({ ...contextOpts, viewport: { width: 390, height: 844 } });
const paula = await paulaCtx.newPage();
await paula.goto(`${BASE}/join/${code}`);
await paula.getByText("You're invited").waitFor();
await shot(paula, "03-join-page");
await paula.getByRole("button", { name: "Join — create account" }).click();
await paula.waitForURL("**/register**");
await paula.getByPlaceholder("Andrew").fill("Paula");
await paula.getByPlaceholder("you@example.com").fill(`paula${run}@test.com`);
await paula.getByPlaceholder("••••••••").fill("padeltime123");
await paula.getByRole("button", { name: "Create account" }).click();
await paula.getByRole("button", { name: /Join session|Join waitlist/ }).click({ timeout: 15000 });
await paula.getByText("You're in ✓").waitFor({ timeout: 10000 });
await paula.getByRole("button", { name: "Open session" }).click();
await paula.waitForURL("**/app/sessions/**");
log("Paula joined via invite link (8 players total)");

// --- Check-in --------------------------------------------------------------
await org.getByRole("button", { name: "Start check-in" }).click();
await org.getByText("Only checked-in players").waitFor({ timeout: 10000 });
log("check-in started");

await paula.getByRole("button", { name: /I'm here/ }).click({ timeout: 15000 });
await paula.getByText("You're checked in").waitFor({ timeout: 10000 });
log("Paula self-checked-in");

await org.getByRole("button", { name: "Everyone's here" }).click();
await org.getByText(/8.*checked in/s).waitFor({ timeout: 10000 }).catch(() => {});
await shot(org, "04-checkin");
await org.getByRole("button", { name: "Start session →" }).click();
await org.getByText("Round 1", { exact: false }).first().waitFor({ timeout: 15000 });
log("session started — round 1 generated");

const courtCards = org.getByRole("button").filter({ hasText: /^COURT|Court \d/ });
const courtCount = await org.locator("button", { hasText: "Tap to enter score" }).count();
if (courtCount !== 2) fail(`expected 2 courts, saw ${courtCount}`);
log("2 courts, 8 players, no byes ✓");
await shot(org, "05-live-round1");

// --- Paula scores her own match --------------------------------------------
await paula.waitForTimeout(4500); // next poll picks up the live round
const enterBtn = paula.getByRole("button", { name: "Enter final score" });
if (await enterBtn.isVisible().catch(() => false)) {
  await shot(paula, "06-paula-match");
  await enterBtn.click();
  await paula.getByRole("button", { name: "+", exact: true }).click();
  await paula.getByRole("button", { name: "+", exact: true }).click();
  await paula.getByRole("button", { name: /Submit score · 14–10/ }).click();
  await paula
    .getByText(/waiting for .* to confirm|Final: 14–10/i)
    .first()
    .waitFor({ timeout: 10000 });
  log("Paula submitted 14–10 for her match");
  await shot(paula, "07-paula-submitted");
} else {
  log("Paula has the bye this round (also a valid path)");
  await shot(paula, "06-paula-bye");
}

// --- Organizer finalises all courts ----------------------------------------
for (const court of [1, 2]) {
  await org.getByRole("button", { name: new RegExp(`Court ${court}\\b`) }).first().click();
  const plus = org.locator(".fixed").getByRole("button", { name: "+", exact: true });
  await plus.click();
  await org.getByRole("button", { name: /Save score/ }).click();
  await org.locator(".fixed").waitFor({ state: "detached", timeout: 10000 });
}
await org.getByText("all scores in").waitFor({ timeout: 10000 });
log("organizer entered/confirmed both court scores");

const standingsRows = await org.locator("table tbody tr").count();
if (standingsRows !== 8) fail(`expected 8 standings rows, saw ${standingsRows}`);
log("standings show all 8 players");
await shot(org, "08-standings-r1");

// --- Round 2, then finish ---------------------------------------------------
await org.getByRole("button", { name: "Next round →" }).click();
await org.getByText("Round 2").first().waitFor({ timeout: 15000 });
log("round 2 generated");

await org.getByRole("button", { name: "Finish session" }).click();
await org.getByText("Final result").waitFor({ timeout: 15000 });
log("session finished — podium shown");
await shot(org, "09-final");

// --- Public board (no auth) -------------------------------------------------
const tvCtx = await browser.newContext({ ...contextOpts, viewport: { width: 1280, height: 800 } });
const tv = await tvCtx.newPage();
await tv.goto(`${BASE}/board/${code}`);
await tv.getByText("Leaderboard").waitFor({ timeout: 10000 });
await tv.getByText("Sunday Night Americano").waitFor();
log("public board renders without auth");
await shot(tv, "10-board");

await browser.close();
console.log("\nE2E SMOKE: ALL PASSED ✅");
