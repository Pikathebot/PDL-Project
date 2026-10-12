// Record the live Sentinel demo with Playwright, paced to the narration.
//   node record_demo.js <durations.json> <out dir>
// durations.json: {"d1": seconds, ...}. Writes demo.webm and marks.json (segment start/end in seconds).
const fs = require('fs');
const path = require('path');
const { chromium } = require('D:/scripting/PDL-Project/frontend/node_modules/playwright');

const DUR = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const OUT = process.argv[3];
const BASE = 'http://localhost:5173';
const BUS = 'D:/scripting/PDL-Project/.venv/Lib/site-packages/ultralytics/assets/bus.jpg';
const W = 1440, H = 810;

// A visible cursor with a click ripple; headless recordings have none.
const CURSOR = `
(() => {
  const add = () => {
    if (document.getElementById('__cur')) return;
    const c = document.createElement('div'); c.id = '__cur';
    c.style.cssText = 'position:fixed;left:-50px;top:-50px;width:22px;height:22px;border-radius:50%;' +
      'background:rgba(255,255,255,0.9);border:3px solid #06b6d4;box-shadow:0 0 12px rgba(6,182,212,.9);' +
      'pointer-events:none;z-index:2147483647;transform:translate(-50%,-50%);transition:width .12s,height .12s';
    document.body.appendChild(c);
    addEventListener('mousemove', e => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }, true);
    addEventListener('mousedown', () => { c.style.width = '34px'; c.style.height = '34px'; }, true);
    addEventListener('mouseup', () => { c.style.width = '22px'; c.style.height = '22px'; }, true);
  };
  if (document.body) add(); else addEventListener('DOMContentLoaded', add);
})();`;

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const ctx = await browser.newContext({
    viewport: { width: W, height: H }, recordVideo: { dir: OUT, size: { width: W, height: H } },
    permissions: ['geolocation'], geolocation: { latitude: 13.0069, longitude: 80.2061 },
  });
  await ctx.addInitScript(CURSOR);
  const t0 = Date.now();
  const page = await ctx.newPage();
  const marks = {};
  const now = () => (Date.now() - t0) / 1000;
  const pause = (ms) => page.waitForTimeout(ms);
  let mx = W / 2, my = H / 2;

  async function moveTo(loc) {
    await loc.scrollIntoViewIfNeeded();
    const b = await loc.boundingBox();
    const x = b.x + b.width / 2, y = b.y + b.height / 2;
    await page.mouse.move(x, y, { steps: 22 }); mx = x; my = y;
    await pause(250);
  }
  async function click(loc) { await moveTo(loc); await page.mouse.down(); await pause(90); await page.mouse.up(); await pause(400); }
  async function type(loc, text, delay = 32) { await click(loc); await page.keyboard.type(text, { delay }); }
  async function wheel(dy, steps = 8) { for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, dy / steps); await pause(60); } }
  async function segment(id, fn) {
    const start = now();
    await fn();
    const need = DUR[id] + 0.8;
    const left = need - (now() - start);
    if (left > 0) await pause(left * 1000);
    marks[id] = [start, now()];
    console.log(id, marks[id].map(v => v.toFixed(1)).join(' - '));
  }

  await page.goto(BASE + '/');
  await pause(1500);
  marks.lead = now();

  let tracking = '';
  await segment('d1', async () => {
    await click(page.getByText('Road Accident', { exact: false }).first());
    await type(page.getByPlaceholder('Describe what happened'),
      'MTC bus skidded and hit a two-wheeler near Kathipara junction, rider is injured and traffic is blocked towards Guindy.', 28);
    await page.locator('input[type=file]').first().setInputFiles(BUS);
    await pause(700);
    await wheel(450);
    await click(page.getByText('Use my location'));
    await pause(900);
    await type(page.getByPlaceholder('Street address'), 'Kathipara Junction, Guindy', 30);
    await wheel(400);
    const submit = page.locator('button[type=submit], button:has-text("Submit")').last();
    await moveTo(submit);
    // Submit at the end of the narration line "One tap submits the report".
    const wait = DUR.d1 - 1.0 - (now() - marks.lead);
    if (wait > 0) await pause(wait * 1000);
    await page.mouse.down(); await pause(90); await page.mouse.up();
  });

  await segment('d2', async () => {
    await page.getByText('Tracking ID', { exact: false }).first().waitFor({ timeout: 15000 });
    const body = await page.locator('body').innerText();
    tracking = (body.match(/INC-[A-Z0-9]{8}/) || [''])[0];
    console.log('tracking', tracking);
    await moveTo(page.getByText('Tracking ID', { exact: false }).first());
  });

  await segment('d3', async () => {
    await click(page.getByText('Track Status', { exact: false }).first());
    await type(page.getByPlaceholder('Enter Tracking ID'), tracking, 45);
    await page.keyboard.press('Enter');
    await pause(1500);
    await moveTo(page.getByText('AI Processing').first());
  });

  await segment('d4', async () => {
    await click(page.getByText('Dispatcher sign-in', { exact: false }).first());
    await type(page.locator('input[type=email]'), 'dispatcher@sentinel.gov', 30);
    await type(page.locator('input[type=password]'), 'admin123', 60);
    await click(page.locator('button[type=submit]'));
    await page.waitForURL('**/dashboard');
    await pause(1800);
    await page.keyboard.press('Escape');
    await pause(800);
    await moveTo(page.getByText('ACTIVE INCIDENTS', { exact: false }).first());
    await pause(1200);
    await moveTo(page.getByText('DUPLICATE CLUSTERS', { exact: false }).first());
    await pause(800);
    await click(page.locator('.leaflet-control-zoom-out'));
    await pause(1200);
    await click(page.getByText('Heatmap Overlay'));
    await pause(1500);
    await moveTo(page.getByText('REAL-TIME ACTIVITY FEED', { exact: false }).first());
  });

  await segment('d5', async () => {
    await type(page.getByPlaceholder('Filter by ID, hazard, location...'), tracking, 45);
    await pause(800);
    await click(page.getByText('MTC bus skidded', { exact: false }).first());
    await pause(2500);
    await moveTo(page.getByText('ATTACHED EVIDENCE', { exact: false }).first());
    await pause(2500);
    const panel = page.locator('.overflow-y-auto').last();
    for (let i = 0; i < 10; i++) { await panel.evaluate(el => el.scrollBy(0, 55)); await pause(120); }
    await pause(2500);
    for (let i = 0; i < 6; i++) { await panel.evaluate(el => el.scrollBy(0, 60)); await pause(120); }
  });

  await segment('d6', async () => {
    await page.keyboard.press('Escape');
    await pause(500);
    const filter = page.getByPlaceholder('Filter by ID, hazard, location...');
    await click(filter);
    await page.keyboard.press('Control+A');
    await page.keyboard.type('Ranganathan', { delay: 45 });
    await pause(1500);
    await click(page.getByText('fire in the transformer box at ranganathan', { exact: false }).first());
    await pause(3000);
    const panel = page.locator('.overflow-y-auto').last();
    for (let i = 0; i < 20; i++) { await panel.evaluate(el => el.scrollBy(0, 60)); await pause(110); }
    await pause(2000);
    const priya = page.getByText('Officer Priya Nair').locator('xpath=ancestor::div[.//button][1]').getByRole('button', { name: /dispatch/i });
    await moveTo(priya);
    const wait = DUR.d6 * 0.78 - 0; // click near "sends her with one click"
    const elapsed = now() - marks.d5[1];
    if (wait - elapsed > 0) await pause((wait - elapsed) * 1000);
    await page.mouse.down(); await pause(90); await page.mouse.up();
    await pause(1500);
  });

  await segment('d7', async () => {
    await page.keyboard.press('Escape');
    await pause(400);
    await click(page.getByRole('link', { name: /analytics/i }).first());
    await pause(2500);
    await wheel(500, 14);
    await pause(2000);
    await moveTo(page.getByText('AVG TIME TO DISPATCH', { exact: false }).first());
  });

  marks.end = now();
  const video = page.video();
  await ctx.close();
  await browser.close();
  const src = await video.path();
  fs.renameSync(src, path.join(OUT, 'demo.webm'));
  fs.writeFileSync(path.join(OUT, 'marks.json'), JSON.stringify({ ...marks, tracking }, null, 1));
  console.log('done', marks.end.toFixed(1), 's');
})().catch(e => { console.error(e); process.exit(1); });
