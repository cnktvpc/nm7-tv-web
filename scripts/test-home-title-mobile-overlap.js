#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const html = fs.readFileSync('web-tv/index.html', 'utf8');
const workflow = fs.readFileSync('.github/workflows/cloudflare-deploy.yml', 'utf8');
const worker = fs.readFileSync('worker.js', 'utf8');

assert.ok(html.includes('<div id="homeTitle" aria-hidden="true"></div>'),
  'homeTitle container must remain empty so it cannot overlap the Bản tin tab on mobile portrait');
assert.ok(!/id="homeTitle"[^>]*>\s*Danh sách kênh TV\s*</i.test(html),
  'Static "Danh sách kênh TV" must not be reintroduced into the top tab bar');
for (const marker of ['id="mobileMenuBtn"', 'id="btnYouTubeTab"', 'id="btnNewsTab"']) {
  assert.ok(html.includes(marker), 'Top navigation control missing: ' + marker);
}
assert.ok(html.includes('aria-label="Quay lại danh sách kênh"'),
  'The channel-list navigation control in the player/menu must remain intact');
assert.ok(worker.includes("h.set('Cache-Control','no-store, no-cache, must-revalidate')"),
  'Home HTML must not remain cached in the mobile browser after deployment');
assert.ok(workflow.includes('MOBILE_HOME_TITLE_OVERLAP_SMOKE_OK'),
  'Production smoke must verify the top title does not overlap navigation');
assert.ok(workflow.includes('node scripts/test-home-title-mobile-overlap.js'),
  'Cloudflare production workflow must run the home-title overlap regression test');
console.log('HOME_TITLE_MOBILE_OVERLAP_REGRESSION_OK: static title removed; menu, YouTube, Bản tin and channel navigation preserved');
