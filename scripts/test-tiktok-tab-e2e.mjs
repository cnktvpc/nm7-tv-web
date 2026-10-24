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
  await desktop.waitForFunction(() =>
    document.querySelector('#tiktokFrame')?.src.includes('/player/v1/6718335390845095173'),
    null, { timeout: 15000 }
  );
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

  // Pixel-style mobile viewport: full-screen shell, overlay gestures and account prompt.
  const mobileContext = await browser.newContext({
    ...devices['Pixel 7'],
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    colorScheme: 'dark',
    permissions: []
  });
  const mobile = await mobileContext.newPage();
  const mobileErrors = await assertNoPageErrors(mobile, 'mobile');
  const mobileResponse = await mobile.goto(base + '?__tiktok_mobile_e2e=' + Date.now(), {
    waitUntil: 'domcontentloaded', timeout: 45000
  });
  assert.equal(mobileResponse?.status(), 200, 'mobile preview homepage should return HTTP 200');
  await mobile.locator('#btnTikTokTab').waitFor({ state: 'visible', timeout: 20000 });
  await mobile.locator('#homeRows .card').first().waitFor({ state: 'attached', timeout: 30000 });
  await mobile.locator('#btnTikTokTab').click();
  await mobile.locator('body.tiktok-mobile-active').waitFor({ state: 'attached', timeout: 10000 });
  await mobile.locator('#tiktokMobileNav').waitFor({ state: 'visible', timeout: 10000 });
  await mobile.locator('#tiktokGestureLayer').waitFor({ state: 'visible', timeout: 10000 });
  const layout = await mobile.evaluate(() => ({
    bodyMobile: document.body.classList.contains('mobile-mode'),
    feedPosition: getComputedStyle(document.querySelector('#tiktokView')).position,
    feedWidth: Math.round(document.querySelector('#tiktokView').getBoundingClientRect().width),
    viewportWidth: window.innerWidth,
    footerDisplay: getComputedStyle(document.querySelector('#tiktokMobileNav')).display,
    oldToolbarDisplay: getComputedStyle(document.querySelector('#tiktokToolbar')).display,
    framePointerEvents: getComputedStyle(document.querySelector('#tiktokFrame')).pointerEvents
  }));
  assert.ok(layout.bodyMobile, 'mobile device mode must be detected');
  assert.equal(layout.feedPosition, 'fixed', 'mobile feed should be full-screen fixed');
  assert.ok(Math.abs(layout.feedWidth - layout.viewportWidth) <= 2, 'feed must fill mobile viewport: ' + JSON.stringify(layout));
  assert.notEqual(layout.footerDisplay, 'none', 'native-style bottom navigation should be visible');
  assert.equal(layout.oldToolbarDisplay, 'none', 'desktop toolbar should be hidden on mobile');
  assert.equal(layout.framePointerEvents, 'none', 'mobile gestures must be captured by NM7 overlay');

  await mobile.locator('#tiktokNavAdd').click();
  await mobile.locator('#tiktokAddSheet:not(.hidden)').waitFor({ state: 'visible', timeout: 5000 });
  await mobile.locator('#tiktokUrlMobile').fill('https://www.tiktok.com/@nm7_mobile_test/video/1234567890123456789');
  await mobile.locator('#tiktokAddFormMobile button[type="submit"]').click();
  await mobile.waitForFunction(() =>
    document.querySelectorAll('#tiktokQueue .tiktok-queue-item').length === 2 &&
    document.querySelector('#tiktokFrame')?.src.includes('/player/v1/1234567890123456789'),
    null, { timeout: 10000 }
  );

  // Dispatch a genuine pointer event sequence through NM7's transparent gesture layer.
  // This models a vertical finger swipe without relying on TikTok iframe internals.
  const swipe = async (fromY, toY) => mobile.locator('#tiktokGestureLayer').evaluate((el, points) => {
    const common = { bubbles: true, cancelable: true, pointerId: 41, pointerType: 'touch', clientX: 190, buttons: 1 };
    el.dispatchEvent(new PointerEvent('pointerdown', { ...common, clientY: points.fromY }));
    el.dispatchEvent(new PointerEvent('pointerup', { ...common, clientY: points.toY, buttons: 0 }));
  }, { fromY, toY });
  await swipe(730, 620); // swipe up: next, wrapping to the starter video
  await mobile.waitForFunction(() =>
    document.querySelector('#tiktokFrame')?.src.includes('/player/v1/6718335390845095173'),
    null, { timeout: 10000 }
  );
  await swipe(620, 730); // swipe down: previous
  await mobile.waitForFunction(() =>
    document.querySelector('#tiktokFrame')?.src.includes('/player/v1/1234567890123456789'),
    null, { timeout: 10000 }
  );

  const configResponse = await mobile.evaluate(async () => {
    const response = await fetch('/api/tiktok/config', { credentials: 'same-origin', cache: 'no-store' });
    return { status: response.status, body: await response.json() };
  });
  assert.equal(configResponse.status, 200, 'TikTok auth config route should respond');
  assert.equal(typeof configResponse.body.configured, 'boolean', 'auth status should be explicit');
  if (!configResponse.body.configured) {
    await mobile.locator('#tiktokMobileLogin').click();
    await mobile.locator('#tiktokMobileNotice:not(.hidden)').waitFor({ state: 'visible', timeout: 10000 });
    const prompt = await mobile.locator('#tiktokMobileNoticeCopy').innerText();
    assert.ok(prompt.includes('TIKTOK_CLIENT_KEY'), 'login prompt must explain missing server-side config');
    await mobile.locator('#tiktokNoticeClose').click();
  }

  await mobile.keyboard.press('Escape');
  await mobile.waitForFunction(() =>
    !document.body.classList.contains('tiktok-mobile-active') &&
    document.querySelector('#tiktokView')?.classList.contains('hidden') &&
    document.querySelector('#tiktokFrame')?.getAttribute('src') === 'about:blank',
    null, { timeout: 10000 }
  );
  assert.equal(mobileErrors.length, 0, 'mobile uncaught JS errors: ' + mobileErrors.join(' | '));
  assert.equal(allErrors.length, 0, 'uncaught JS errors: ' + allErrors.join(' | '));

  console.log('TIKTOK_PREVIEW_BROWSER_E2E_OK: desktop integration; mobile full-screen layout; add URL; swipe up/down; OAuth configuration prompt; Back/iframe cleanup');
} finally {
  await browser.close();
}
