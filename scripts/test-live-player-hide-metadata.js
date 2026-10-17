'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');

const app = fs.readFileSync('web-tv/app.js', 'utf8');
const activeApp = fs.readFileSync('web-tv/app-safari-policy-mobile-controls.js', 'utf8');
const html = fs.readFileSync('web-tv/index.html', 'utf8');

const livePlayerClass = /S\\.zone='player';\\$\\('player'\\)\\.className=S\\.livePlaybackContext\\?'live-playback':'';/;
assert.match(app, livePlayerClass, 'app.js source must mark LIVE playback');
assert.match(activeApp, livePlayerClass, 'active browser runtime must mark LIVE playback');

assert.match(
  html,
  /#player\\.live-playback\\s+#playerTop\\s*\\{\\s*display:none!important;\\s*\\}/,
  'LIVE player CSS must hide #playerTop'
);
assert.match(
  activeApp,
  /\\$\\('playerTitle'\\)\\.textContent=c\\.name;\\$\\('playerMeta'\\)\\.textContent=c\\.url\\|\\|'';/,
  'Regular player title/source metadata binding must remain available'
);
assert.doesNotMatch(
  html,
  /^#playerTop\\s*\\{\\s*display:none!important;\\s*\\}/m,
  'Do not globally hide player metadata for non-LIVE channels'
);
assert.ok(
  html.includes('app-safari-policy-mobile-controls.js?v=20261018-live-hide-overlay1'),
  'index.html must use a new cache-buster for the active runtime script'
);

console.log('NM7_TV_WEB_LIVE_PLAYER_METADATA_HIDDEN_REGRESSION_OK');
