'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');

const app = fs.readFileSync('web-tv/app.js', 'utf8');
const mobileApp = fs.readFileSync('web-tv/app-safari-policy-mobile-controls.js', 'utf8');
const pcApp = fs.readFileSync('web-tv/app-safari-policy-pc-controls.js', 'utf8');
const html = fs.readFileSync('web-tv/index.html', 'utf8');
const worker = fs.readFileSync('worker.js', 'utf8');

const liveClassMarker = "S.zone='player';$('player').className=S.livePlaybackContext?'live-playback':'';";
const titleSourceAssignment = "$('playerTitle').textContent=c.name;$('playerMeta').textContent=c.url||'';";

for (const [name, source] of [['app.js', app], ['mobile runtime', mobileApp], ['PC runtime', pcApp]]) {
  assert.ok(source.includes(liveClassMarker), name + ': LIVE player class must follow the tested livePlaybackContext state');
  assert.ok(source.includes(titleSourceAssignment), name + ': normal title/source binding must remain intact');
}

assert.ok(html.includes('#player.live-playback #playerTop{display:none!important;}'), 'LIVE-only title/source CSS must exist');
assert.ok(html.includes('#player.live-playback #playerTitle{display:none!important;}'), 'LIVE-only title CSS must exist');
assert.ok(html.includes('#player:not(.live-playback) #playerTop{display:none!important;}'), 'ordinary IPTV playback must hide the app title/source strip without changing LIVE styling');
assert.ok(
  !html.split('\n').some(line => line.trim().startsWith('#playerTop{display:none!important;')),
  'Do not apply a global metadata hide outside the player context'
);
assert.ok(html.includes('app-safari-policy-mobile-controls.js?v=20261021-tv360-retry404-2'), 'index.html must reference the promoted runtime cache key');
assert.ok(html.includes('retryToast=20261019-cleanup1'), 'HTML must force clients to load the runtime with playback retry toast cleanup');
assert.ok(worker.includes('retryToast=20261019-cleanup1'), 'Worker fallback runtime URLs must use the retry toast cache key');

assert.ok(worker.includes('LIVE_PLAYER_OVERLAY_CSS'), 'Worker must apply the same scoped CSS as the working test');
assert.ok(worker.includes('LIVE_PLAYER_INIT_RE'), 'Worker must support upgrading a stale browser runtime');
assert.ok(worker.includes("S.livePlaybackContext?'live-playback':''"), 'Worker fallback must use the tested LIVE state');
assert.ok(worker.includes('liveOverlayHtmlResponse(new Response(page.body'), 'Worker must transform the production homepage');
assert.ok(worker.includes('LIVE_PLAYER_PC_OVERLAY_SCRIPT_URL'), 'Worker must cover the PC runtime route');
assert.ok(worker.includes("p==='/app-safari-policy-mobile-controls.js'||p==='/app-safari-policy-pc-controls.js'"), 'Worker must transform both runtime assets');
assert.ok(worker.includes('20261018-live-hide-overlay6'), 'Worker must emit the current cache key');

const initPattern = /S\.zone\s*=\s*['"]player['"];\s*\$\(\s*['"]player['"]\s*\)\.className\s*=\s*[^;]+;\s*\$\(\s*['"]ctrl['"]\s*\)\.className\s*=\s*['"]hidden['"];\s*\$\(\s*['"]quick['"]\s*\)\.className\s*=\s*['"]hidden['"];\s*updatePlayerFullscreenButton\(\);\s*showPlayerFullscreenButton\(\);/;
const originalRuntime = "S.zone='player';$('player').className='';$('ctrl').className='hidden';$('quick').className='hidden';updatePlayerFullscreenButton();showPlayerFullscreenButton();";
const previousClassOnlyRuntime = "S.zone='player';$('player').className=(S.livePlaybackContext||S.liveSectionActive)?'live-playback':'';$('ctrl').className='hidden';$('quick').className='hidden';updatePlayerFullscreenButton();showPlayerFullscreenButton();";
assert.match(originalRuntime, initPattern, 'Worker matcher must recognize the original player initialization');
assert.match(previousClassOnlyRuntime, initPattern, 'Worker matcher must recognize an older class-only patch');

console.log('NM7_TV_WEB_LIVE_PLAYER_METADATA_HIDDEN_REGRESSION_OK');
