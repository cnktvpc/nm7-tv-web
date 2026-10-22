#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const worker = fs.readFileSync('worker.js', 'utf8');
const helperStart = worker.indexOf('function normalizeClearKeyKid(value){');
const helperEnd = worker.indexOf('async function probeTv360ResolverKids(channels,eventChannels){', helperStart);
const start = worker.indexOf('function mergeTv360EventKeys(channels,eventChannels,manifestKidsByUrl){');
const end = worker.indexOf('async function refreshTv360EventKeys(channels){', start);
assert.ok(helperStart >= 0 && helperEnd > helperStart && start >= 0 && end > start,
  'Worker must expose the TV360 live-event metadata overlay and KID verification helpers');

const harness = vm.runInNewContext(
  '(function(){' + worker.slice(helperStart, helperEnd) + '\n' +
  worker.slice(start, end) +
  '\nreturn {mergeTv360EventKeys:mergeTv360EventKeys,clearKeyKidIds:clearKeyKidIds};})()',
  { URL, atob: value => Buffer.from(value, 'base64').toString('binary') }
);

// Fake 128-bit fixture values only; no production content key material is included.
const freshKey15 = 'fa4033841a70511c84a7fe7e0daf1a6a:00112233445566778899aabbccddeeff';
const oldKey15 = 'c305b22dfd6d55e3998ab279cc98e0d3:ffeeddccbbaa99887766554433221100';
const freshKey13 = '41ce0eac12eb58f69607df0d2eaff649:11223344556677889900aabbccddeeff';
const staleKey13 = '856f291af35a5db7b7d0c944b32993b9:ffeeddccbbaa99887766554433221100';

const url15 = 'https://vmttv.dpdns.org/tv360/?id=tv360-15';
const url13 = 'https://vmttv.dpdns.org/tv360/?id=tv360-13';

const baseChannels = [
  {name:'TV360+15',group:'Sự Kiện TV360',candidates:[{
    url:url15,ua:'Dalvik/2.1.0',forceProxy:true,dash:true,type:'dash',
    drm:{type:'clearkey',key:oldKey15}
  }]},
  {name:'TV360+13',group:'Sự Kiện TV360',candidates:[{
    url:url13,forceProxy:true,dash:true,type:'dash',
    drm:{type:'clearkey',key:staleKey13}
  }]},
  {name:'TV360+12',group:'Sự Kiện TV360',candidates:[{
    url:'https://vmttv.dpdns.org/tv360/?id=tv360-12',
    drm:{type:'clearkey',key:'stale-invalid-key'}
  }]},
  {name:'SCTV15',group:'SCTV',candidates:[{
    url:'https://live.example.invalid/sctv15.mpd',
    drm:{type:'clearkey',key:oldKey15}
  }]}
];

const eventChannels = [
  {name:'Bi-a Championship, Kênh TV360+ 15',group:'Sự Kiện TV360',candidates:[{
    url:'https://dekki.example.invalid/stream/channel/10024',type:'dash',dash:true,
    drm:{type:'clearkey',key:freshKey15}
  }]},
  {name:'Golf Event TV360plus13',group:'Sự Kiện TV360',candidates:[{
    url:'https://dekki.example.invalid/stream/channel/10022',type:'dash',dash:true,
    drm:{type:'clearkey',key:freshKey13}
  }]},
  {name:'TV360+12 event with invalid metadata',group:'Sự Kiện TV360',candidates:[{
    url:'https://dekki.example.invalid/stream/channel/10001',type:'dash',dash:true,
    drm:{type:'clearkey',key:'not-a-valid-key'}
  }]}
];

const liveManifestKids = new Map([
  [url15,new Set(['fa4033841a70511c84a7fe7e0daf1a6a'])],
  [url13,new Set(['41ce0eac12eb58f69607df0d2eaff649'])]
]);
const updated = harness.mergeTv360EventKeys(baseChannels,eventChannels,liveManifestKids);
assert.equal(updated,2,'only keys that match the current TV360+15 and TV360+13 MPD KIDs should be refreshed');

const c15=baseChannels[0].candidates[0];
assert.equal(c15.drm.key,freshKey15,'TV360+15 must receive the key whose KID matches the current MPD');
assert.equal(c15.url,url15,'original resolver URL must remain unchanged');
assert.equal(c15.forceProxy,true,'proxy-first behavior must be preserved');
assert.equal(c15.ua,'Dalvik/2.1.0','per-channel User-Agent must be preserved');
assert.equal(c15.type,'dash','DASH type must remain intact');

assert.equal(baseChannels[1].candidates[0].drm.key,freshKey13,
  'channel number parsing must tolerate event title text and only apply a matching KID');
assert.equal(baseChannels[2].candidates[0].drm.key,'stale-invalid-key',
  'invalid or unverified event metadata must leave the channel unchanged');
assert.equal(baseChannels[3].candidates[0].drm.key,oldKey15,
  'non-TV360 DRM channels must never be modified');

const mismatchChannel={name:'TV360+13',group:'Sự Kiện TV360',candidates:[{
  url:url13,dash:true,type:'dash',drm:{type:'clearkey',key:freshKey13}
}]};
const mismatchEvent={name:'Stale event TV360+13',group:'Sự Kiện TV360',candidates:[{
  type:'dash',dash:true,drm:{type:'clearkey',key:staleKey13}
}]};
assert.equal(harness.mergeTv360EventKeys([mismatchChannel],[mismatchEvent],
  new Map([[url13,new Set(['41ce0eac12eb58f69607df0d2eaff649'])]])),0,
  'a stale event-feed KID must not overwrite a key that differs from the live MPD KID');
assert.equal(mismatchChannel.candidates[0].drm.key,freshKey13,
  'mismatched KID verification must preserve existing channel DRM metadata');

assert.deepEqual([...harness.clearKeyKidIds(JSON.stringify({keys:[{
  kty:'oct',kid:'41ce0eac12eb58f69607df0d2eaff649',k:'11223344556677889900aabbccddeeff'
}]}))],['41ce0eac12eb58f69607df0d2eaff649'],
  'JSON ClearKey metadata must expose the KID only when a valid 128-bit key is present');

assert.ok(worker.includes('async function probeTv360ResolverKids(channels,eventChannels)'),
  'Worker must probe live resolver MPDs before merging an event key');
assert.ok(worker.includes('dashManifestKidIds(body)'),
  'Worker must use the current MPD default_KID instead of assuming resolver IDs are stable');

console.log('TV360_LIVE_KEY_OVERLAY_REGRESSION_OK');
