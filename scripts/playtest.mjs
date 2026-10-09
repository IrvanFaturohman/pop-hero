// Scripted playtest: performs hold/release sequences and reports room stats + console errors.
// Usage: node scripts/playtest.mjs [url]
import { chromium } from 'playwright-core';

const url = process.argv[2] ?? 'http://localhost:5173/';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const logs = [];
page.on('console', (m) => { if (m.type() !== 'debug') logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
const box = await page.locator('canvas').boundingBox();
const cx = box.x + box.width / 2;
const cy = box.y + box.height * 0.8;
// title (hold) -> home -> START (logical 360, 850 on the 720x1280 canvas)
await page.mouse.move(cx, cy);
await page.mouse.down();
await page.waitForTimeout(700);
await page.mouse.up();
await page.waitForTimeout(900);
await page.mouse.click(cx, box.y + (850 / 1280) * box.height);
await page.waitForTimeout(2500);
const stats = () => page.evaluate(() => {
  const p = window.__pop;
  return { ...p.room.stats, releaseAirs: p.room.stats.releaseAirs.map((a) => +a.toFixed(2)), ammo: p.battle.ammo, protectedLeft: p.room.protectedLeft };
});
async function hold(ms, shot) {
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  if (shot) await page.screenshot({ path: `screenshots/${shot}_hold.png` });
  await page.mouse.up();
}
// 1) small safe balloons
for (let i = 0; i < 3; i++) { await hold(400); await page.waitForTimeout(500); }
await page.waitForTimeout(150);
await page.screenshot({ path: 'screenshots/pt_tokens.png' });
console.log('after small:', JSON.stringify(await stats()));
// 2) overinflate: hold 3.5 s
await hold(3300, 'pt_strain');
await page.waitForTimeout(60);
await page.screenshot({ path: 'screenshots/pt_overinflate.png' });
await page.waitForTimeout(1200);
console.log('after overinflate:', JSON.stringify(await stats()));
// 3) greedy releases at ~0.85 air, several tries
for (let i = 0; i < 8; i++) { await hold(2000); await page.waitForTimeout(900); }
console.log('after greedy:', JSON.stringify(await stats()));
// fps sample
const fps = await page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(n / 2); }; requestAnimationFrame(f); }));
console.log('fps(headless):', fps);
console.log(logs.join('\n') || '(no console output)');
await browser.close();
