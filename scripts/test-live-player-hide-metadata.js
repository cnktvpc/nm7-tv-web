'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');

const app = fs.readFileSync('web-tv/app.js', 'utf8');
const activeApp = fs.readFileSync('web-tv/app-safari-policy-mobile-controls.js', 'utf8');
const pcApp = fs.readFileSync('web-tv/app-safari-policy-pc-controls.js', 'utf8');
const html = fs.readFileSync('web-tv/index.html', 'utf8');
const worker = fs.readFileSync('worker.js', 'utf8');

const liveClassMarker = "S.zone='player';var __nm7LiveOverlay=!!(S.livePlaybackContext||S.liveSectionActive||c.liveEventId||String(c.group||'').toUpperCase()==='LIVE'||String(S.source||'').toLowerCase()==='live');$('player').className=__nm7LiveOverlay?'live-playback':'';var __nm7PlayerTop=$('playerTop');if(__nm7PlayerTop)__nm7PlayerTop.style.display=__nm7LiveOverlay?'none':'';";
assert.ok(app.includes(liveClassMarker), 'app.js source must mark LIVE playback');
assert.ok(activeApp.includes(liveClassMarker), 'active mobile browser runtime must mark LIVE playback');
assert.ok(pcApp.includes(liveClassMarker), 'PC browser runtime must mark LIVE playback');

assert.ok(
  html.includes('#player.live-playback #playerTop{display:none!important;}'),
  'LIVE player CSS must hide #playerTop only in the LIVE playback context'
);
assert.ok(
  activeApp.includes("$('playerTitle').textContent=c.name;$('playerMeta').textContent=c.url||'';"),
  'Regular player title/source metadata binding must remain available'
);
assert.ok(
  !html.split('\n').some(line => line.trim().startsWith('#playerTop{display:none!important;')),
  'Do not globally hide player metadata for non-LIVE channels'
);
assert.ok(worker.includes('LIVE_PLAYER_OVERLAY_CSS'), 'Worker must retain an HTML overlay fallback for the existing production assets');
assert.ok(worker.includes('LIVE_PLAYER_INIT_RE'), 'Worker must patch the active LIVE player runtime when old assets are served');
assert.ok(worker.includes('LIVE_PLAYER_PC_OVERLAY_SCRIPT_URL'), 'Worker must cache-bust the PC player runtime too');
assert.ok(worker.includes('c.liveEventId'), 'Worker must identify an event directly when the LIVE context flags are absent');
assert.ok(worker.includes("__nm7PlayerTop.style.display=__nm7LiveOverlay?'none':''"), 'Worker must explicitly hide the player title/source container');
assert.ok(worker.includes('20261018-live-hide-overlay3'), 'Worker must serve a new cache-busted runtime');
assert.ok(worker.includes('liveOverlayHtmlResponse(new Response(page.body'), 'Worker must transform the home HTML response');
assert.ok(worker.includes("p==='/app-safari-policy-mobile-controls.js'||p==='/app-safari-policy-pc-controls.js'"), 'Worker must transform both PC and mobile player runtime assets');
assert.ok(
  html.includes('app-safari-policy-mobile-controls.js?v=20261018-live-hide-overlay3'),
  'index.html must use a new cache-buster for the active runtime script'
);

console.log('NM7_TV_WEB_LIVE_PLAYER_METADATA_HIDDEN_REGRESSION_OK');
