import { chromium } from '@playwright/test';
import {readFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage();
const svg=await readFile('public/icon.svg','utf8');
for(const [name,size] of [['icon-192.png',192],['icon-512.png',512],['icon-maskable.png',512],['apple-touch-icon.png',180]]){
 await page.setViewportSize({width:size,height:size});
 await page.setContent(`<html><body style="margin:0;background:#fff2e6;display:grid;place-items:center;width:100vw;height:100vh">${svg.replace('<svg ',`<svg style="width:${name.includes('maskable')?'80':'100'}%;height:auto" `)}</body></html>`);
 await page.screenshot({path:`public/${name}`});
}
await browser.close();
