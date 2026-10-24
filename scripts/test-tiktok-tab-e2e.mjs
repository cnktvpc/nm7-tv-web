import { chromium, devices } from 'playwright';
import assert from 'node:assert/strict';

const base = 'https://nm7-tv-web-tiktok-preview.phuongnm7-iptv.workers.dev/';
const browser = await chromium.launch({ headless: true });
const allErrors = [];

async function assertNoPageErrors(page, label) {
  const errors = [];
  page.on('pageerror', error => { errors.push(error.message); allErrors.push(label + ': ' + error.message); });
  return errors;
}

try {
  // Desktop/tablet controls remain functional after the mobile-specific redesign.
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const desktopErrors = await assertNoPageErrors(desktop, 'desktop');
  const response = await desktop.goto(base + '?__tiktok_desktop_e2e=' + Date.now(), {
    waitUntil: 'domcontentloaded', timeout: 45000
  });
  assert.equal(response?.status(), 200, 'preview homepage should return HTTP 200');
  await desktop.locator('#btnTikTokTab').waitFor({ state: 'visible', timeout: 20000 });
  await desktop.locator('#homeRows .card').first().waitFor({ state: 'attached', timeout: 30000 });
  await desktop.locator('#btnTikTokTab').click();
  await desktop.locator('#tiktokView:not(.hidden)').waitFor({ state: 'visible', timeout: 10000 });
  try {
    await desktop.waitForFunction(() =>
      document.querySelector('#tiktokFrame')?.src.includes('/player/v1/6718335390845095173'),
      null, { timeout: 15000 }
    );
  } catch (error) {
    const diagnostic = await desktop.evaluate(() => ({
      url: location.href,
      active: window.NM7TikTok?.isActive?.(),
      frameSrc: document.querySelector('#tiktokFrame')?.src,
      tiktokScript: !!window.NM7TikTok,
      status: document.querySelector('#tiktokStatus')?.textContent,
      homeRows: document.querySelector('#homeRows')?.className,
      viewClass: document.querySelector('#tiktokView')?.className,
      scripts: Array.from(document.scripts).map(s => s.src).filter(x => x.includes('tiktok'))
    }));
    console.log('TIKTOK_DESKTOP_DIAGNOSTIC=' + JSON.stringify({diagnostic,pageErrors:desktopErrors}));
    throw error;
  }
  await desktop.locator('#tiktokUrl').fill('https://www.tiktok.com/@nm7_test/video/1234567890123456789');
  await desktop.locator('#tiktokAddBtn').click();
  await desktop.waitForFunction(() =>
    document.querySelectorAll('#tiktokQueue .tiktok-queue-item').length === 2,
    null, { timeout: 10000 }
  );
  await desktop.waitForFunction(() =>
    document.querySelector('#tiktokFrame')?.src.includes('/player/v1/1234567890123456789'),
    null, { timeout: 10000 }
  );
  await desktop.keyboard.press('ArrowUp');
  await desktop.waitForFunction(() =>
    document.querySelector('#tiktokFrame')?.src.includes('/player/v1/6718335390845095173'),
    null, { timeout: 10000 }
  );
  await desktop.keyboard.press('Escape');
  await desktop.waitForFunction(() =>
    document.querySelector('#tiktokView')?.classList.contains('hidden') &&
    document.querySelector('#tiktokFrame')?.getAttribute('src') === 'about:blank',
    null, { timeout: 10000 }
  );
  assert.equal(desktopErrors.length, 0, 'desktop uncaught JS errors: ' + desktopErrors.join(' | '));

  // Mobile now hands off to TikTok's first-party For You route, not an imitation iframe UI.
  // Intercept the destination in this browser test so we can reliably verify the navigation contract.
  const mobileContext = await browser.newContext({
    ...devices['Pixel 7'],
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    colorScheme: 'dark',
    permissions: []
  });
  const mobile = await mobileContext.newPage();
  const mobileErrors = await assertNoPageErrors(mobile, 'mobile');
  await mobile.route(/^https:\/\/www\.tiktok\.com\/foryou\?lang=vi-VN$/, route =>
    route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: '<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><main id="official-tiktok-route-smoke">TikTok official mobile destination</main>'
    })
  );
  const mobileResponse = await mobile.goto(base + '?__tiktok_mobile_handoff_e2e=' + Date.now(), {
    waitUntil: 'domcontentloaded', timeout: 45000
  });
  assert.equal(mobileResponse?.status(), 200, 'mobile preview homepage should return HTTP 200');
  await mobile.locator('#btnTikTokTab').waitFor({ state: 'visible', timeout: 20000 });
  await mobile.locator('#homeRows .card').first().waitFor({ state: 'attached', timeout: 30000 });
  const previewOrigin = new URL(base).origin;

  await mobile.locator('#btnTikTokTab').click();
  await mobile.waitForURL('https://www.tiktok.com/foryou?lang=vi-VN', { waitUntil: 'commit', timeout: 15000 });
  await mobile.locator('#official-tiktok-route-smoke').waitFor({ state: 'visible', timeout: 5000 });
  assert.equal(mobile.url(), 'https://www.tiktok.com/foryou?lang=vi-VN',
    'mobile TikTok tab must navigate to the official first-party TikTok feed URL');
  assert.equal(mobileErrors.length, 0, 'mobile uncaught JS errors: ' + mobileErrors.join(' | '));

  // Same-tab navigation retains NM7 in browser history so the user can go back.
  await mobile.goBack({ waitUntil: 'domcontentloaded', timeout: 15000 });
  await mobile.waitForURL(url => url.origin === previewOrigin, { timeout: 15000 });
  await mobile.locator('#btnTikTokTab').waitFor({ state: 'visible', timeout: 10000 });
  assert.ok(await mobile.locator('#homeRows').isVisible(), 'NM7 should be reachable again through browser Back');
  assert.equal(mobileErrors.length, 0, 'mobile handoff/back uncaught JS errors: ' + mobileErrors.join(' | '));

  console.log('TIKTOK_PREVIEW_BROWSER_E2E_OK: desktop embed controls; mobile navigation to official TikTok For You; browser Back returns to NM7');
} finally {
  await browser.close();
}
