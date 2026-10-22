#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('web-tv/index.html', 'utf8');
const activeScript = fs.readFileSync('web-tv/app-safari-policy-mobile-controls.js', 'utf8');
const worker = fs.readFileSync('worker.js', 'utf8');
const page = fs.readFileSync('web-tv/ban-tin.html', 'utf8');

assert.ok(html.includes('id="btnNewsTab"'), 'Home screen must render the Bản tin button');
assert.ok(html.includes('app-safari-policy-mobile-controls.js?v=20261022-logo-scroll-load1'),
  'Home page must load the active player script with a cache-busting query');
assert.ok(activeScript.includes("$('btnNewsTab').addEventListener('click',function(){location.href='/ban-tin.html';});"),
  'The script actually loaded by index.html must bind the home Bản tin button');
assert.ok(activeScript.includes('Bản tin · Highlights / Xem lại'),
  'Side navigation must include Bản tin');
assert.ok(activeScript.includes("if(p===11){location.href='/ban-tin.html';return}"),
  'Selecting Bản tin from the side menu must open the news page');
assert.ok(worker.includes("if(p==='/api/news/play')return newsPlayResponse(url);"),
  'Worker must route per-video playback resolution');
assert.ok(worker.includes("if(p==='/api/news')return newsResponse(url);"),
  'Worker must route the news listing API');
assert.ok(worker.includes('function parseOnPlusCards(html)'),
  'Tin thể thao must use the OnPlus-specific metadata parser');
assert.ok(worker.includes('if (existingUrl) add({...value,href:existingUrl});') && !worker.includes("'/video?id='+encodeURIComponent(id)+'&type=2'"),
  'OnPlus cards must use explicit detail URLs and not manufacture them from event/category IDs');
assert.ok(worker.includes('function extractProviderMedia(value)'),
  'Highlights and OnPlus must resolve direct HLS/MP4 media rather than open the article page');
assert.ok(worker.includes("newsStreamProxy(url.origin,directMedia"),
  'GetOut replay URLs must use the NM7 HLS proxy so playlist segments can load in browsers');
assert.ok(worker.includes("return env.ASSETS.fetch(request)"),
  'Worker must serve /ban-tin.html through its configured assets binding');
assert.ok(page.includes('id="streamPlayer"'), 'News page must provide an in-page media player');
assert.ok(page.includes('window.Hls&&window.Hls.isSupported()'),
  'News page must support HLS.js for browsers without native HLS');
const inlineScripts = [...page.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
assert.ok(inlineScripts.length > 0, 'News page must contain the Bản tin UI controller');
for (const [index, script] of inlineScripts.entries()) {
  new vm.Script(script, {filename: 'web-tv/ban-tin.html:inline-script-' + index});
}
assert.ok(worker.includes('GETOUT_BTV_CONFIG_URL'), 'Replay provider must follow GetOut public BTV base URL config');
assert.ok(worker.includes("new URL('/gateway-api/sp/sports/anon/getReplay?pageNo=1&pageSize=30',providerBase).href"),
  'Replay API must be built from GetOut resolved base host');
assert.ok(worker.includes('playbackUrl'),
  'Replay response must preserve direct HLS/MP4 URLs when available');
assert.ok(worker.includes('normalizeReplayMedia(url1, providerBase)'),
  'GetOut url1 paths ending in index.m3u8 must become direct playback URLs');
assert.ok(worker.includes('rec.homeLogo') && worker.includes('rec.awayLogo') && worker.includes('findReplayThumbnail(rec, providerBase)'),
  'Replay cards must prioritize event thumbnails and retain team-logo fallbacks');
assert.ok(worker.includes("sourcePageUrl:providerBase+'/'"),
  'Direct-media playback must retain a provider-page fallback');
assert.ok(!/debugSchema|onPlusDebug|summarizeNewsUrl|debug=onplus/.test(worker),
  'Temporary source-schema diagnostics must not remain in the deployed Worker');
assert.ok(page.includes("fetch('/api/news/play?source='+encodeURIComponent(source)+'&url='+encodeURIComponent(it.href||'')"),
  'Clicking an unresolved item must ask the provider-specific playback resolver');
assert.ok(page.includes("function showPlayMessage(message)"),
  'Playback errors must display a message inside the player instead of navigating into an article iframe');
assert.ok(page.includes("frame.src='about:blank'"),
  'The hidden iframe must never load the complete 24h or OnPlus article inside the player');
assert.ok(page.includes('data-source="onplus">Tin thể thao</button>'),
  'The third GetOut section must be labeled Tin thể thao');
for (const tab of ['highlights', 'replay', 'onplus']) {
  assert.ok(page.includes('data-source="' + tab + '"'), 'News UI must render provider tab: ' + tab);
}
const tabBar = page.slice(page.indexOf('<nav class="tabs"'), page.indexOf('</nav>'));
assert.ok(tabBar.indexOf('data-source="highlights"') < tabBar.indexOf('data-source="replay"') &&
  tabBar.indexOf('data-source="replay"') < tabBar.indexOf('data-source="onplus"'),
  'The three sections must be ordered Highlight, Xem lại, Tin thể thao');
console.log('GETOUT_NEWS_ENTRY_REGRESSION_OK: home button + side menu + active script + GetOut adapter + inline JS');
