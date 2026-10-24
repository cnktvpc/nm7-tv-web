import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const base = 'https://nm7-tv-web-tiktok-preview.phuongnm7-iptv.workers.dev/';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));

try {
  const response = await page.goto(base + '?__tiktok_e2e=' + Date.now(), {
    waitUntil: 'domcontentloaded',
    timeout: 45000
  });
  assert.equal(response?.status(), 200, 'preview homepage should return HTTP 200');
  await page.locator('#btnTikTokTab').waitFor({ state: 'visible', timeout: 20000 });
  await page.locator('#homeRows .card').first().waitFor({ state: 'attached', timeout: 30000 });

  await page.locator('#btnTikTokTab').click();
  await page.locator('#tiktokView:not(.hidden)').waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForFunction(() =>
    document.querySelector('#tiktokFrame')?.src.includes('/player/v1/6718335390845095173'),
    null, { timeout: 15000 }
  );

  const testUrl = 'https://www.tiktok.com/@nm7_test/video/1234567890123456789';
  await page.locator('#tiktokUrl').fill(testUrl);
  await page.locator('#tiktokAddBtn').click();
  await page.waitForFunction(() =>
    document.querySelectorAll('#tiktokQueue .tiktok-queue-item').length === 2,
    null, { timeout: 10000 }
  );
  await page.waitForFunction(() =>
    document.querySelector('#tiktokFrame')?.src.includes('/player/v1/1234567890123456789'),
    null, { timeout: 10000 }
  );

  await page.keyboard.press('ArrowUp');
  await page.waitForFunction(() =>
    document.querySelector('#tiktokFrame')?.src.includes('/player/v1/6718335390845095173'),
    null, { timeout: 10000 }
  );

  await page.keyboard.press('Escape');
  await page.waitForFunction(() =>
    document.querySelector('#tiktokView')?.classList.contains('hidden') &&
    document.querySelector('#tiktokFrame')?.getAttribute('src') === 'about:blank',
    null, { timeout: 10000 }
  );
  assert.ok(!documentHasErrors(errors), 'no uncaught JavaScript errors: ' + errors.join(' | '));

  console.log('TIKTOK_PREVIEW_BROWSER_E2E_OK: open tab, load official embed URL, add URL, remote next, Back and iframe cleanup');
} finally {
  await browser.close();
}

function documentHasErrors(list) {
  return Array.isArray(list) && list.length > 0;
}
