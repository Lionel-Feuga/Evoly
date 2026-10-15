import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
// Adapt the approved artwork to app-icon sizes without redrawing the lettering.
const source = await readFile('design/logo-ev-source.png');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage();
  for (const [name, size, crop] of [
    ['ev-icon-192.png', 192, .72], ['ev-icon-512.png', 512, .72],
    ['ev-icon-maskable.png', 512, .90], ['ev-apple-touch-icon.png', 180, .72], ['ev-favicon.png', 32, .72],
  ]) {
    const data = await page.evaluate(async ({ source, size, crop }) => {
      const image = new Image(); image.src = source; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d'); ctx.imageSmoothingQuality = 'high';
      const side = Math.min(image.width, image.height) * crop;
      ctx.drawImage(image, (image.width-side)/2, (image.height-side)/2, side, side, 0, 0, size, size);
      return canvas.toDataURL('image/png').split(',')[1];
    }, { source: `data:image/png;base64,${source.toString('base64')}`, size, crop });
    await writeFile(`public/${name}`, Buffer.from(data, 'base64'));
  }
} finally { await browser.close(); }
