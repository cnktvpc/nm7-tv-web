'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const worker = fs.readFileSync('worker.js', 'utf8');
const runtimeFiles = [
  'web-tv/app.js',
  'web-tv/app-safari-policy.js',
  'web-tv/app-safari-policy-mobile-controls.js',
  'web-tv/app-safari-policy-pc-controls.js'
];

assert.match(worker, /function isTv360ResolverUrl\(value\)/,
  'Worker must identify the TV360 resolver endpoint');
assert.match(worker, /forceProxy:\/vietanhtv.*isTv360ResolverUrl\(ps\[0\]\)/,
  'M3U parsing must mark TV360 resolver candidates as proxy-first');
assert.match(worker, /h\.set\('User-Agent',q\.get\('ua'\)\|\|fallbackUA\)/,
  'Worker stream proxy must preserve an explicit playlist User-Agent');

assert.ok(worker.includes('newCacheSchema') && worker.includes('safeGetter') && worker.includes('safeProxyFirst'),
  'Worker runtime patch must invalidate stale cache and guard/route TV360 candidates');

const mergeStart = worker.indexOf('function mergeTv360EventKeys(channels,eventChannels){');
const mergeEnd = worker.indexOf('\nasync function refreshTv360EventKeys(channels){', mergeStart);
assert.ok(mergeStart >= 0 && mergeEnd > mergeStart, 'Worker must pair TV360 event channels with their own stream');
const mergeTv360EventKeys = vm.runInNewContext('(' + worker.slice(mergeStart, mergeEnd).trim() + ')', {
  URL,
  isHttp: value => String(value || '').startsWith('http://') || String(value || '').startsWith('https://')
});
const fixtureResolverKey = '00112233445566778899aabbccddeeff:ffeeddccbbaa99887766554433221100';
const fixtureEventKey = '856f291af35a5db7b7d0c944b32993b9:aa3547547f084fe4c9ea5206effb6b78';
const resolverFixture = {
  name: 'TV360+13', group: 'Sự Kiện TV360',
  candidates: [{
    url: 'https://vmttv.dpdns.org/tv360/?id=tv360-13',
    type: 'dash', dash: true, forceProxy: true,
    drm: {type:'clearkey',key:fixtureResolverKey}
  }]
};
const eventFixture = {
  name: 'Golf event, Kênh TV360+ 13', group: 'Sự Kiện TV360',
  candidates: [{
    url: 'https://dekki.bacbenny95.workers.dev/film4k/stream/channel/10022',
    type: 'dash', dash: true,
    drm: {type:'clearkey',key:fixtureEventKey}
  }]
};
const mergedCount = mergeTv360EventKeys([resolverFixture],[eventFixture]);
assert.equal(mergedCount, 1, 'A matching TV360 event must add its event-specific media candidate');
assert.equal(resolverFixture.candidates[0].url, eventFixture.candidates[0].url,
  'Event-specific URL must be tried before the independently mapped resolver');
assert.equal(resolverFixture.candidates[0].tv360EventFeed, true,
  'Event media candidate must carry an explicit priority marker');
assert.equal(resolverFixture.candidates[0].forceProxy, true,
  'Event media candidate must use the Worker proxy');
assert.equal(resolverFixture.candidates[0].drm.key, fixtureEventKey,
  'Event media candidate must retain the ClearKey pair from the same M3U entry');
assert.equal(resolverFixture.candidates[1].url, 'https://vmttv.dpdns.org/tv360/?id=tv360-13',
  'The original resolver must remain as a fallback');
assert.equal(resolverFixture.candidates[1].drm.key, fixtureResolverKey,
  'Event key must not be copied onto a resolver that can return another KID');
assert.ok(worker.includes("Number(!!b.tv360EventFeed)-Number(!!a.tv360EventFeed"),
  'Worker channel sorting must prioritize the paired event media candidate');

for (const file of runtimeFiles) {
  const source = fs.readFileSync(file, 'utf8');
  assert.match(source, /function isTv360ResolverUrl\(value\)/,
    file + ': resolver detection must be available for local/custom M3U parsing');
  assert.match(source, /forceProxy:isTv360ResolverUrl\(url\)/,
    file + ': candidate must preserve proxy-first metadata');
  assert.match(source, /if\(cand\.forceProxy===true\)return true/,
    file + ': resolver candidates must use the proxy on the first playback attempt');
  assert.ok(source.includes("var workerDashResource=uri.indexOf(location.origin+'/api/dash-resource/')===0"),
    file + ': already-rewritten DASH resources must be recognized as Worker-managed');
  assert.match(source, /&&!workerDashResource/,
    file + ': do not double-wrap Worker DASH resource URLs in another /api/stream request');
  assert.match(source, /if\(isTv360ResolverUrl\(cand\.url\|\|''\)\)return true/,
    file + ': TV360 resolver candidates must always be proxy-first even if forceProxy was lost');
  assert.ok(source.includes("CACHE_SCHEMA='20261022-tv360-probe-recovery1'"),
    file + ': stale legacy channel cache must be invalidated');
  assert.match(source, /if\(cand\.ua\)q\+='&ua='\+encodeURIComponent\(cand\.ua\)/,
    file + ': per-channel User-Agent must reach the Worker proxy');
}

for (const file of runtimeFiles) {
  const source = fs.readFileSync(file, 'utf8');
  assert.match(source, /function retryTv360Resolver\(c,cand,gen,reason\)/,
    file + ': runtime must retry transient TV360 resolver errors');
  assert.match(source, /httpStatus===404\|\|httpStatus===408\|\|httpStatus===429\|\|httpStatus>=500/,
    file + ': HLS transient HTTP failures must retry the resolver before advancing candidates');
  assert.match(source, /function tv360TransientHttpStatusFromShaka\(e\)/,
    file + ': Shaka must classify transient resolver HTTP failures');
  assert.ok(source.includes('5\\d{2}') && !source.includes('5\\\\d{2}'),
    file + ': HTTP 5xx classifier must use a digit-class regex, not a literal backslash');
  assert.match(source, /var tv360Status=tv360TransientHttpStatusFromShaka\(e\)/,
    file + ': fatal Shaka errors must invoke bounded transient HTTP recovery');
  assert.match(source, /var tv360LoadStatus=tv360TransientHttpStatusFromShaka\(e\)/,
    file + ': Shaka manifest-load failures must invoke bounded transient HTTP recovery');
  assert.match(source, /S\.tv360404RetryCount>=5/,
    file + ': retries must be bounded at five per resolver URL');

  const candidateStart = source.indexOf('function getCandidate(){');
  const candidateEnd = source.indexOf('\n\nfunction openPlayer', candidateStart);
  const normalizeStart = source.indexOf('function normalizeCandidate(cand){');
  const normalizeEnd = source.indexOf('\nfunction isAppleTouchDevice', normalizeStart);
  assert.ok(candidateStart >= 0 && candidateEnd > candidateStart && normalizeStart >= 0 && normalizeEnd > normalizeStart,
    file + ': safe candidate selector and normalizer must be present');
  const makeCandidateHarness = vm.runInNewContext(
    '(function(candidates,index){var S={current:{candidates:candidates},candidateIndex:index};' +
    source.slice(normalizeStart, normalizeEnd) + '\n' +
    source.slice(candidateStart, candidateEnd) + '\nreturn {S:S,getCandidate:getCandidate};})');
  const invalidIndexHarness = makeCandidateHarness([{url:'https://example.invalid/valid.mpd',type:'dash'}], 99);
  assert.equal(invalidIndexHarness.getCandidate().url, 'https://example.invalid/valid.mpd',
    file + ': invalid candidate index must fall back to a valid URL instead of probing undefined');
  assert.equal(invalidIndexHarness.S.candidateIndex, 0,
    file + ': invalid candidate index must be reset to an in-range index');
  const missingUrlHarness = makeCandidateHarness([{url:undefined},{url:'https://example.invalid/valid.mpd',type:'dash'}], 0);
  assert.equal(missingUrlHarness.getCandidate().url, 'https://example.invalid/valid.mpd',
    file + ': selector must skip candidates with missing URLs');
  assert.equal(missingUrlHarness.S.candidateIndex, 1,
    file + ': selector must update index when it skips an invalid candidate');

  const classifierStart = source.indexOf('function tv360TransientHttpStatusFromShaka(e){');
  const classifierEnd = source.indexOf('function retryTv360Resolver(', classifierStart);
  assert.ok(classifierStart >= 0 && classifierEnd > classifierStart,
    file + ': transient HTTP classifier body must be present');
  const classifyTv360Status = vm.runInNewContext('(' + source.slice(classifierStart, classifierEnd).trim() + ')');
  assert.equal(classifyTv360Status({data:['HTTP status 503']}), 503,
    file + ': textual HTTP 5xx errors must be classified for bounded retry');
  assert.equal(classifyTv360Status({data:[{status:429}]}), 429,
    file + ': structured HTTP 429 errors must be classified for bounded retry');
}

const html = fs.readFileSync('web-tv/index.html', 'utf8');
assert.ok(html.includes('app-safari-policy-mobile-controls.js?v=20261022-tv360-dash-reproxy-fix1&retryToast=20261019-cleanup1'),
  'HTML must use the cache key for the TV360 probe recovery fix');
assert.ok(worker.includes('app-safari-policy-mobile-controls.js?v=20261022-tv360-dash-reproxy-fix1'),
  'Worker PC/mobile runtime fallbacks must use the active DASH reproxy cache key');
assert.ok(worker.includes('const probeSucceeded=attemptedGet?(getStatus>=200&&getStatus<300):!!r?.ok;'),
  'Worker must use the GET response status when a range GET is attempted');
assert.ok(worker.includes('type:probeSucceeded?type:"http",contentType:ct,status,headStatus,getStatus,errorHint,'),
  'Failed upstream responses must not be exposed as valid DASH/HLS probe results');

// DASH relative-template regression: ../_shared resources must each get a new
// proxy context based on their resolved upstream directory. They must never be
// emitted as ../ paths beneath /api/dash-resource/<token>/, which loses the token.
const safeUrlStart = worker.indexOf('function safeUrl(u,b){');
const safeUrlEnd = worker.indexOf('function isTv360ResolverUrl(', safeUrlStart);
const dashHelpersStart = worker.indexOf('function encodeDashContext(value){');
const dashHelpersEnd = worker.indexOf('async function dashResourceResponse(', dashHelpersStart);
assert.ok(safeUrlStart >= 0 && safeUrlEnd > safeUrlStart && dashHelpersStart >= 0 && dashHelpersEnd > dashHelpersStart,
  'Worker must expose safe URL and DASH proxy helpers for regression testing');
const dashHarness = vm.runInNewContext(
  '(function(){' + worker.slice(safeUrlStart, safeUrlEnd) + '\n' +
  worker.slice(dashHelpersStart, dashHelpersEnd) +
  '\nreturn {rewriteDash:rewriteDash,decodeDashContext:decodeDashContext};})()',
  {
    URL, URLSearchParams, TextEncoder, TextDecoder,
    btoa: value => Buffer.from(value, 'binary').toString('base64'),
    atob: value => Buffer.from(value, 'base64').toString('binary')
  }
);
const sampleMpd = '<MPD><BaseURL>https://cdn.tv360.example/live/session/</BaseURL>' +
  '<Period><AdaptationSet contentType="video"><SegmentTemplate ' +
  'initialization="../_shared/init-$RepresentationID$.mp4" ' +
  'media="../_shared/segment-$Number$.m4s"/>' +
  '<Representation id="video_1" bandwidth="1000000"/></AdaptationSet></Period></MPD>';
const rewrittenMpd = dashHarness.rewriteDash(
  sampleMpd, 'https://cdn.tv360.example/live/manifest.mpd',
  new URLSearchParams(), 'https://nm7-tv-web.example'
);
const initUri = (rewrittenMpd.match(/initialization="([^"]+)"/i) || [])[1];
const mediaUri = (rewrittenMpd.match(/media="([^"]+)"/i) || [])[1];
assert.ok(initUri && initUri.startsWith('https://nm7-tv-web.example/api/dash-resource/'),
  'Relative DASH initialization URI must be rewritten to a context-bearing proxy URL');
assert.ok(mediaUri && mediaUri.startsWith('https://nm7-tv-web.example/api/dash-resource/'),
  'Relative DASH media template must be rewritten to a context-bearing proxy URL');
assert.ok(!initUri.includes('../') && !mediaUri.includes('../'),
  'Proxied DASH resources must not contain parent traversal paths');
const initToken = new URL(initUri).pathname.split('/')[3];
const initContext = dashHarness.decodeDashContext(initToken);
assert.equal(initContext.base, 'https://cdn.tv360.example/live/_shared/',
  'Relative initialization path must resolve against the original upstream BaseURL before proxying');

for (const file of runtimeFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const probeStart = source.indexOf('function probeCandidate(c,cand,gen){');
  const probeEnd = source.indexOf('function markPlaying(gen){', probeStart);
  assert.ok(probeStart >= 0 && probeEnd > probeStart, file + ': probeCandidate must exist');
  const probeBody = source.slice(probeStart, probeEnd);
  assert.ok(probeBody.indexOf('var upstreamStatus=Number(d&&d.status||0);') < probeBody.indexOf('cand.type=d.type;'),
    file + ': HTTP status must be checked before trusting detected media type');
  assert.ok(probeBody.includes('retryTv360Resolver(c,cand,gen,transientReason)'),
    file + ': transient resolver errors must use bounded retries');
  assert.ok(probeBody.includes("retryTv360Resolver(c,cand,gen,'Probe request '+probeError)"),
    file + ': probe transport errors must retry before abandoning TV360');
  assert.ok(source.includes('Shaka init exception '),
    file + ': Shaka initialization exceptions must retain their actual reason');

  const normalizerStart = source.indexOf('function toHex16(v){');
  const normalizerEnd = source.indexOf('function restoreAudio(){', normalizerStart);
  assert.ok(normalizerStart >= 0 && normalizerEnd > normalizerStart,
    file + ': ClearKey normalizer must exist');
  const normalizerSource = source.slice(normalizerStart, normalizerEnd).trim();
  const normalizeHex16 = vm.runInNewContext('(' + normalizerSource + ')', {
    atob: value => Buffer.from(value, 'base64').toString('binary')
  });
  const keyBytes = Buffer.from([251, 255, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  const base64UrlKey = keyBytes.toString('base64url');
  assert.match(base64UrlKey, /[-_]/,
    'fixture must contain a Base64URL-only character');
  assert.equal(normalizeHex16(base64UrlKey), keyBytes.toString('hex'),
    file + ': valid Base64URL ClearKey data must survive normalization');
  assert.equal(normalizeHex16('00112233-4455-6677-8899-aabbccddeeff'),
    '00112233445566778899aabbccddeeff',
    file + ': hyphenated UUID-style hexadecimal KIDs must still normalize');
}
console.log('TV360_PLAYBACK_ROUTING_REGRESSION_OK');
