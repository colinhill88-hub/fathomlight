// Draws the home-screen icon with code (a riveted porthole looking into
// sunlit water) and saves it as PNG files in public/.
// Run with: node scripts/make-icons.mjs   (needs Playwright, used only here)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import { writeFileSync } from 'node:fs';

const draw = (size) => {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const s = size / 512;
  // Background: dark water.
  const bg = g.createLinearGradient(0, 0, 0, size);
  bg.addColorStop(0, '#2c6f78');
  bg.addColorStop(1, '#0b2a33');
  g.fillStyle = bg;
  g.fillRect(0, 0, size, size);
  const cx = 256 * s, cy = 256 * s, R = 176 * s;
  // Glass: sunlit water seen through the porthole.
  g.save();
  g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.clip();
  const water = g.createLinearGradient(0, cy - R, 0, cy + R);
  water.addColorStop(0, '#a9d0c8'); water.addColorStop(0.55, '#3f8086'); water.addColorStop(1, '#16404a');
  g.fillStyle = water; g.fillRect(0, 0, size, size);
  g.globalAlpha = 0.18; g.fillStyle = '#e8fff8';
  for (const [x, w] of [[150, 40], [240, 26], [320, 50]]) {
    g.beginPath();
    g.moveTo(x * s, cy - R); g.lineTo((x + w) * s, cy - R);
    g.lineTo((x + w + 90) * s, cy + R); g.lineTo((x + 90) * s, cy + R); g.fill();
  }
  g.globalAlpha = 1;
  g.fillStyle = '#cdbb8f';
  g.beginPath(); g.moveTo(cx - R, cy + 110 * s);
  g.quadraticCurveTo(cx, cy + 70 * s, cx + R, cy + 120 * s); g.lineTo(cx + R, cy + R); g.lineTo(cx - R, cy + R); g.fill();
  g.restore();
  // Frame: muted yellow paint with dark outline, rust streaks and rivets.
  g.lineWidth = 46 * s; g.strokeStyle = '#1b1a17';
  g.beginPath(); g.arc(cx, cy, R + 22 * s, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 36 * s; g.strokeStyle = '#b89a45';
  g.beginPath(); g.arc(cx, cy, R + 22 * s, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = 'rgba(122,58,34,0.55)'; g.lineWidth = 5 * s;
  for (const a of [0.4, 1.9, 3.6, 5.1]) {
    const x = cx + Math.cos(a) * (R + 22 * s), y = cy + Math.sin(a) * (R + 22 * s);
    g.beginPath(); g.moveTo(x, y - 12 * s); g.lineTo(x + 2 * s, y + 18 * s); g.stroke();
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const x = cx + Math.cos(a) * (R + 22 * s), y = cy + Math.sin(a) * (R + 22 * s);
    g.fillStyle = '#1b1a17'; g.beginPath(); g.arc(x, y, 8 * s, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#8a8478'; g.beginPath(); g.arc(x, y, 5 * s, 0, Math.PI * 2); g.fill();
  }
  // Glass highlight.
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 10 * s; g.lineCap = 'round';
  g.beginPath(); g.arc(cx, cy, R - 30 * s, Math.PI * 1.1, Math.PI * 1.4); g.stroke();
  return c.toDataURL('image/png');
};

const browser = await chromium.launch();
const page = await browser.newPage();
for (const size of [180, 192, 512]) {
  const url = await page.evaluate(draw, size);
  writeFileSync(`public/icon-${size}.png`, Buffer.from(url.split(',')[1], 'base64'));
  console.log(`public/icon-${size}.png`);
}
await browser.close();
