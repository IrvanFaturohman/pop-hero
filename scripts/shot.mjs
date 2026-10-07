// Screenshot + console check in a portrait phone viewport using the installed Chrome.
// Usage: node scripts/shot.mjs [url] [out.png] [holdMs]
import { chromium } from 'playwright-core';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? 'screenshots/shot.png';
const holdMs = Number(process.argv[4] ?? 0);

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
if (holdMs > 0) {
  const box = await page.locator('canvas').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.8);
  await page.mouse.down();
  await page.waitForTimeout(holdMs);
  await page.screenshot({ path: out.replace('.png', '_hold.png') });
  await page.mouse.up();
  await page.waitForTimeout(450);
}
await page.screenshot({ path: out });
console.log(logs.join('\n') || '(no console output)');
await browser.close();
