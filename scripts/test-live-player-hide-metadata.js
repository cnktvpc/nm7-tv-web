'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');

const app = fs.readFileSync('web-tv/app.js', 'utf8');
const mobileApp = fs.readFileSync('web-tv/app-safari-policy-mobile-controls.js', 'utf8');
const pcApp = fs.readFileSync('web-tv/app-safari-policy-pc-controls.js', 'utf8');
const html = fs.readFileSync('web-tv/index.html', 'utf8');
const worker = fs.readFileSync('worker.js', 'utf8');

const titleSourceAssignment = "$('playerTitle').textContent=c.name;$('playerMeta').textContent=c.url||'';";
const titleHideMarker = "__nm7LiveTitleHideV4";
const titleHideStatement = "__nm7PlayerTitleV4.style.display=__nm7LiveTitleHideV4?'none':''";
const metaHideStatement = "__nm7PlayerMetaV4.style.display=__nm7LiveTitleHideV4?'none':''";

// The canonical source and both browser runtimes must hide the actual title element,
// not rely only on an ancestor class/CSS selector.
for (const [name, source] of [['app.js', app], ['mobile runtime', mobileApp], ['PC runtime', pcApp]]) {
  assert.ok(source.includes(titleSourceAssignment), name + ': standard player title/source assignment must remain');
  assert.ok(source.includes(titleHideMarker), name + ': LIVE title state must be evaluated at the title assignment');
  assert.ok(source.includes("$('playerTitle').style.display=__nm7LiveTitleHideV4?'none':''"), name + ': playerTitle must be hidden directly for LIVE');
  assert.ok(source.includes("$('playerMeta').style.display=__nm7LiveTitleHideV4?'none':''"), name + ': playerMeta must be hidden directly for LIVE');
  assert.ok(source.includes("if(__nm7PlayerTopV4)__nm7PlayerTopV4.style.display=__nm7LiveTitleHideV4?'none':''"), name + ': playerTop must be hidden for LIVE');
}

// Keep a scoped CSS safety net; ordinary channel playback must not lose metadata globally.
assert.ok(html.includes('#player.live-playback #playerTop{display:none!important;}'), 'LIVE-only playerTop CSS must exist');
assert.ok(html.includes('#player.live-playback #playerTitle{display:none!important;}'), 'LIVE-only title CSS must exist');
assert.ok(
  !html.split('\n').some(line => line.trim().startsWith('#playerTop{display:none!important;')),
  'Do not globally hide title/source for ordinary IPTV playback'
);
assert.ok(html.includes('app-safari-policy-mobile-controls.js?v=20261018-live-hide-overlay5'), 'index.html must reference overlay4 runtime');

// Production Worker must reproduce the working test-wrapper behavior, while also hiding
// playerTitle explicitly so the production-only residual-title case cannot recur.
assert.ok(worker.includes('LIVE_PLAYER_OVERLAY_CSS'), 'Worker must apply the tested scoped CSS');
assert.ok(worker.includes('LIVE_PLAYER_INIT_RE'), 'Worker must recognize old and already-patched player initialization');
assert.ok(worker.includes('LIVE_PLAYER_TITLE_ASSIGN_RE'), 'Worker must locate the actual title/source DOM assignments');
assert.ok(worker.includes('LIVE_PLAYER_TITLE_HIDE_INSERTION'), 'Worker must patch the actual title/source DOM');
assert.ok(worker.includes(titleHideMarker), 'Worker must insert the title-hide marker');
assert.ok(worker.includes(titleHideStatement), 'Worker must set playerTitle display directly');
assert.ok(worker.includes(metaHideStatement), 'Worker must set playerMeta display directly');
assert.ok(worker.includes('20261018-live-hide-overlay5'), 'Worker must serve overlay4 with a new cache-buster');
assert.ok(worker.includes('liveOverlayHtmlResponse(new Response(page.body'), 'Worker must transform home HTML');
assert.ok(worker.includes('LIVE_PLAYER_PC_OVERLAY_SCRIPT_URL'), 'Worker must cover the PC runtime');
assert.ok(worker.includes("p==='/app-safari-policy-mobile-controls.js'||p==='/app-safari-policy-pc-controls.js'"), 'Worker must route both player runtimes');

// Regression-check the initializer matcher against both the original test runtime and
// a runtime that already received the old class-only patch.
const initPattern = /S\.zone\s*=\s*['"]player['"];\s*\$\(\s*['"]player['"]\s*\)\.className\s*=\s*[^;]+;\s*\$\(\s*['"]ctrl['"]\s*\)\.className\s*=\s*['"]hidden['"];\s*\$\(\s*['"]quick['"]\s*\)\.className\s*=\s*['"]hidden['"];\s*updatePlayerFullscreenButton\(\);\s*showPlayerFullscreenButton\(\);/;
const originalRuntime = "S.zone='player';$('player').className='';$('ctrl').className='hidden';$('quick').className='hidden';updatePlayerFullscreenButton();showPlayerFullscreenButton();";
const oldClassOnlyRuntime = "S.zone='player';$('player').className=(S.livePlaybackContext||S.liveSectionActive)?'live-playback':'';$('ctrl').className='hidden';$('quick').className='hidden';updatePlayerFullscreenButton();showPlayerFullscreenButton();";
assert.match(originalRuntime, initPattern, 'Worker matcher must match the original test runtime');
assert.match(oldClassOnlyRuntime, initPattern, 'Worker matcher must match the previously patched runtime');

// Match the title setter used by the active app and assert direct per-element style handling.
const titleAssignPattern = /\$\(\s*['"]playerTitle['"]\s*\)\.textContent\s*=\s*c\.name\s*;\s*\$\(\s*['"]playerMeta['"]\s*\)\.textContent\s*=\s*c\.url\s*\|\|\s*['"]{2}\s*;/;
assert.match(titleSourceAssignment, titleAssignPattern, 'Title-source matcher must fit the actual runtime assignment');
const titlePatched = titleSourceAssignment + "var __nm7LiveTitleHideV4=!!S.livePlaybackContext;var __nm7PlayerTitleV4=$('playerTitle');if(__nm7PlayerTitleV4)__nm7PlayerTitleV4.style.display=__nm7LiveTitleHideV4?'none':'';var __nm7PlayerMetaV4=$('playerMeta');if(__nm7PlayerMetaV4)__nm7PlayerMetaV4.style.display=__nm7LiveTitleHideV4?'none':'';";
assert.ok(titlePatched.includes(titleHideStatement), 'Test transformation must hide the title DOM node');
assert.ok(titlePatched.includes(metaHideStatement), 'Test transformation must hide the source URL DOM node');

console.log('NM7_TV_WEB_LIVE_PLAYER_METADATA_HIDDEN_REGRESSION_OK');
