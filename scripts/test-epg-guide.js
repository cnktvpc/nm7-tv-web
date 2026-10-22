'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const worker = read('worker.js');
assert.match(worker, /function extractEpgUrl\(/, 'Worker must detect url-tvg and x-tvg-url metadata');
assert.match(worker, /epgUrl:hit\.epgUrl\|\|''/, 'playlist cache responses must preserve EPG metadata');
assert.match(worker, /async function epgResponse\(/, 'Worker must proxy XMLTV through the dedicated endpoint');
assert.match(worker, /if\(p==='\/api\/epg'\)return epgResponse\(request,q\)/, 'Worker route must expose /api/epg');
assert.match(worker, /function safeEpgUrl\(/, 'EPG proxy must validate source URL');
assert.match(worker, /redirect:'manual'/, 'EPG redirects must be validated before following');
assert.match(worker, /EPG file too large/, 'EPG proxy must limit downloaded data');
assert.match(worker, /DecompressionStream\('gzip'\)/, 'XMLTV .gz sources must be decompressed');
assert.match(worker, /tvgName:\(\/tvg-name=/, 'M3U TVG-name must survive parsing for matching');
assert.match(worker, /Cache-Control':'public, max-age=1800/, 'EPG proxy responses must be cacheable');

// Execute the real URL helpers from worker.js in an isolated Node VM.
const helperStart = worker.indexOf('function safeEpgUrl(');
const helperEnd = worker.indexOf('\nfunction isTv360ResolverUrl', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'Worker EPG URL helpers must be extractable for unit tests');
const sandbox = { URL };
vm.createContext(sandbox);
vm.runInContext(worker.slice(helperStart, helperEnd) +
  '\nthis.checkEpgUrl=safeEpgUrl; this.checkExtractEpgUrl=extractEpgUrl;', sandbox);
assert.equal(sandbox.checkEpgUrl('', 'https://playlist.example/playlist.m3u'), '',
  'empty metadata must not incorrectly resolve to the playlist URL');
assert.equal(sandbox.checkEpgUrl('http://127.0.0.1/epg.xml'), '',
  'private/loopback IPs must be rejected');
assert.equal(sandbox.checkEpgUrl('http://192.168.1.20/epg.xml'), '',
  'RFC1918 addresses must be rejected');
assert.equal(sandbox.checkEpgUrl('file:///etc/passwd'), '',
  'non-HTTP protocols must be rejected');
assert.equal(sandbox.checkEpgUrl('https://epg.example/guide.xml'), 'https://epg.example/guide.xml');
assert.equal(sandbox.checkExtractEpgUrl('#EXTM3U', 'https://playlist.example/playlist.m3u'), '',
  'playlists with no EPG metadata must remain without an EPG URL');
assert.equal(sandbox.checkExtractEpgUrl('#EXTM3U url-tvg="https://epg.example/guide.xml"',
  'https://playlist.example/playlist.m3u'), 'https://epg.example/guide.xml');
assert.equal(sandbox.checkExtractEpgUrl('#EXTM3U x-tvg-url="epg.xml"',
  'https://playlist.example/playlist.m3u'), 'https://playlist.example/epg.xml');

const html = read('web-tv/tv-guide.html');
for (const marker of ['id="epgUrl"', 'id="presetSelect"', 'id="groupSelect"', 'id="searchInput"',
  'id="prevDay"', 'id="nextDay"', 'id="refreshBtn"', 'id="channelList"', 'epg-core.js?v=20261022-epg-guide1',
  'tv-guide.js?v=20261022-epg-guide1']) {
  assert.ok(html.includes(marker), 'guide page must include ' + marker);
}

const appFiles = ['web-tv/app.js', 'web-tv/app-safari-policy.js',
  'web-tv/app-safari-policy-pc-controls.js', 'web-tv/app-safari-policy-mobile-controls.js'];
for (const file of appFiles) {
  const app = read(file);
  assert.ok(app.includes('▤  Lịch phát sóng · EPG'), file + ': EPG must be reachable from NM7 menu');
  assert.ok(app.includes("if(p===13){location.href='/tv-guide.html';return}"), file + ': menu must navigate to guide');
  assert.ok(app.includes('function openPendingGuideChannel()'), file + ': guide channel handoff must be supported');
  assert.ok(app.includes("localStorage.getItem('nm7:guide:open')"), file + ': guide handoff must be short-lived and local');
  assert.ok(app.includes("if(d.epgUrl)rememberEpgUrl(d.epgUrl)"), file + ': playlist EPG URL should be remembered');
  assert.ok(app.includes("tvgName:(/tvg-name="), file + ': TVG-name metadata must be preserved');
}

const index = read('web-tv/index.html');
assert.ok(index.includes('app-safari-policy-mobile-controls.js?v=20261022-epg-guide1'), 'active mobile runtime must use EPG-aware cache key');

console.log('EPG_GUIDE_REGRESSION_OK: Worker endpoint, XMLTV safety/cache, guide UI and four NM7 runtimes');
