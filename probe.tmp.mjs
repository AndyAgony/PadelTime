import { chromium } from "playwright";
const proxy = process.env.HTTPS_PROXY;
const opts = { proxy: { server: proxy, bypass: "127.0.0.1,localhost" } };
let browser;
try { browser = await chromium.launch(opts); }
catch { browser = await chromium.launch({ ...opts, executablePath: "/opt/pw-browsers/chromium" }); }
const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
const page = await ctx.newPage();
try {
  const res = await page.goto("https://padeltime.andrew-7a1.workers.dev/api/health", { timeout: 20000 });
  console.log("STATUS:", res?.status());
  console.log("BODY:", (await page.textContent("body"))?.slice(0, 100));
} catch (e) {
  console.log("NAV ERROR:", e.message.split("\n")[0]);
}
await browser.close();
