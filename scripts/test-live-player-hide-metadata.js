'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');

const app = fs.readFileSync('web-tv/app.js', 'utf8');
const html = fs.readFileSync('web-tv/index.html', 'utf8');

// LIVE playback must mark the player so its embedded title/source panel can be hidden.
assert.match(
  app,
  /S\.zone='player';\$\('player'\)\.className=S\.livePlaybackContext\?'live-playback':'';/,
  'openPlayer must apply live-playback class only when a LIVE playback context exists'
);

// The title/source row is hidden only for the LIVE player, not for ordinary channel playback.
assert.match(
  html,
  /#player\.live-playback\s+#playerTop\s*\{\s*display:none!important;\s*\}/,
  'LIVE player CSS must hide #playerTop'
);
assert.match(
  app,
  /\$\('playerTitle'\)\.textContent=c\.name;\$\('playerMeta'\)\.textContent=c\.url\|\|'';/,
  'The standard player metadata binding should remain intact for regular channels'
);
assert.doesNotMatch(
  html,
  /^#playerTop\s*\{\s*display:none!important;\s*\}/m,
  'Do not globally hide player metadata for non-LIVE channels'
);

console.log('NM7_TV_WEB_LIVE_PLAYER_METADATA_HIDDEN_REGRESSION_OK');
