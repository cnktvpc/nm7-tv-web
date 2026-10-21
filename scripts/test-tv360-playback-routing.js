'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const worker = fs.readFileSync('worker.js', 'utf8');
const runtimeFiles = [
  'web-tv/app.js',
  'web-tv/app-safari-policy.js',
  'web-tv/app-safari-policy-mobile-controls.js',
  'web-tv/app-safari-policy-pc-controls.js'
];

assert.match(worker, /function isTv360ResolverUrl\(value\)/,
  'Worker must identify the TV360 resolver endpoint');
assert.ok(worker.includes('forceProxy:/vietanhtv\\.id\\.vn/i.test(ps[0])||isTv360ResolverUrl(ps[0])'),
  'M3U parsing must mark TV360 resolver candidates as proxy-first');
assert.match(worker, /h\.set\('User-Agent',q\.get\('ua'\)\|\|fallbackUA\)/,
  'Worker stream proxy must preserve an explicit playlist User-Agent');

for (const file of runtimeFiles) {
  const source = fs.readFileSync(file, 'utf8');
  assert.match(source, /function isTv360ResolverUrl\(value\)/,
    file + ': resolver detection must be available for local/custom M3U parsing');
  assert.match(source, /forceProxy:isTv360ResolverUrl\(url\)/,
    file + ': candidate must preserve proxy-first metadata');
  assert.match(source, /if\(cand\.forceProxy===true\)return true/,
    file + ': resolver candidates must use the proxy on the first playback attempt');
  assert.match(source, /if\(cand\.ua\)q\+='&ua='\+encodeURIComponent\(cand\.ua\)/,
    file + ': per-channel User-Agent must reach the Worker proxy');
}

const html = fs.readFileSync('web-tv/index.html', 'utf8');
assert.ok(html.includes('app-safari-policy-mobile-controls.js?v=20261021-tv360-proxy1&retryToast=20261019-cleanup1'),
  'HTML must bump the active runtime cache key for the TV360 fix');
assert.ok(worker.includes('20261021-tv360-proxy1'),
  'Worker PC/mobile runtime fallbacks must use the same cache key');

console.log('TV360_PLAYBACK_ROUTING_REGRESSION_OK');
