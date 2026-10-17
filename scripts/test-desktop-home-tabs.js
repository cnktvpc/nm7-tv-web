'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const html = fs.readFileSync('web-tv/index.html', 'utf8');

for (const id of ['btnYouTubeTab', 'btnLiveTab', 'btnNewsTab']) {
  assert.match(html, new RegExp('id="' + id + '"'), 'home navigation must include ' + id);
}
assert.match(
  html,
  /@media\s+screen\s+and\s+\(min-width:\s*1025px\)\s+and\s+\(pointer:\s*fine\)\s*\{[^}]*#homeTabs\s*\{[^}]*display:\s*flex/s,
  'desktop with a mouse/fine pointer must display the top navigation'
);
assert.match(
  html,
  /@media\s+screen\s+and\s+\(max-width:\s*1024px\)\s+and\s+\(pointer:\s*coarse\)\s*\{[\s\S]{0,20000}?#homeTabs\s*\{\s*display:\s*flex/s,
  'mobile/tablet touch navigation must remain enabled'
);
assert.match(html, /#homeTabs\s+#homeTitle\s*\{\s*display:\s*none\s*\}/,
  'empty home title overlay must not cover desktop navigation');
console.log('DESKTOP_HOME_TABS_REGRESSION_OK: YouTube, LIVE and Bản tin visible on desktop; mobile navigation preserved');
