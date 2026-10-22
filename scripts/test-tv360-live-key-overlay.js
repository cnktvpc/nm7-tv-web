#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const worker = fs.readFileSync('worker.js', 'utf8');
const start = worker.indexOf('function mergeTv360EventKeys(channels,eventChannels){');
const end = worker.indexOf('async function refreshTv360EventKeys(channels){', start);
assert.ok(start >= 0 && end > start, 'Worker must expose the TV360 live-event metadata overlay helper');

const mergeTv360EventKeys = vm.runInNewContext(
  '(' + worker.slice(start, end).trim() + ')',
  { URL, atob: value => Buffer.from(value, 'base64').toString('binary') }
);

// Fake 128-bit fixture values only; no production key material is included.
const freshKey15 = 'fa4033841a70511c84a7fe7e0daf1a6a:00112233445566778899aabbccddeeff';
const oldKey15 = 'c305b22dfd6d55e3998ab279cc98e0d3:ffeeddccbbaa99887766554433221100';
const freshKey13 = '41ce0eac12eb58f69607df0d2eaff649:11223344556677889900aabbccddeeff';

const baseChannels = [
  {
    name: 'TV360+15',
    group: 'Sự Kiện TV360',
    candidates: [{
      url: 'https://vmttv.dpdns.org/tv360/?id=tv360-15',
      ua: 'Dalvik/2.1.0',
      forceProxy: true,
      dash: true,
      type: 'dash',
      drm: { type: 'clearkey', key: oldKey15 }
    }]
  },
  {
    name: 'TV360+13',
    group: 'Sự Kiện TV360',
    candidates: [{
      url: 'https://vmttv.dpdns.org/tv360/?id=tv360-13',
      forceProxy: true,
      drm: { type: 'clearkey', key: 'hW8pGvNaXbe30MlEsymTuQ:AAAAAAAAAAAAAAAAAAAAAA' }
    }]
  },
  {
    name: 'TV360+12',
    group: 'Sự Kiện TV360',
    candidates: [{
      url: 'https://vmttv.dpdns.org/tv360/?id=tv360-12',
      drm: { type: 'clearkey', key: 'stale-invalid-key' }
    }]
  },
  {
    name: 'SCTV15',
    group: 'SCTV',
    candidates: [{
      url: 'https://live.example.invalid/sctv15.mpd',
      drm: { type: 'clearkey', key: oldKey15 }
    }]
  }
];

const eventChannels = [
  {
    name: 'Bi-a Championship, Kênh TV360+ 15',
    group: 'Sự Kiện TV360',
    candidates: [{
      url: 'https://dekki.example.invalid/stream/channel/10024',
      type: 'dash',
      dash: true,
      drm: { type: 'clearkey', key: freshKey15 }
    }]
  },
  {
    name: 'Golf Event TV360plus13',
    group: 'Sự Kiện TV360',
    candidates: [{
      url: 'https://dekki.example.invalid/stream/channel/10022',
      type: 'dash',
      dash: true,
      drm: { type: 'clearkey', key: freshKey13 }
    }]
  },
  {
    name: 'TV360+12 event with invalid metadata',
    group: 'Sự Kiện TV360',
    candidates: [{
      url: 'https://dekki.example.invalid/stream/channel/10001',
      type: 'dash',
      dash: true,
      drm: { type: 'clearkey', key: 'not-a-valid-key' }
    }]
  }
];

const updated = mergeTv360EventKeys(baseChannels, eventChannels);
assert.equal(updated, 2, 'only TV360+15 and TV360+13 with valid event metadata should be refreshed');

const c15 = baseChannels[0].candidates[0];
assert.equal(c15.drm.key, freshKey15, 'TV360+15 must receive the active event key metadata');
assert.equal(c15.url, 'https://vmttv.dpdns.org/tv360/?id=tv360-15', 'original resolver URL must remain unchanged');
assert.equal(c15.forceProxy, true, 'proxy-first behavior must be preserved');
assert.equal(c15.ua, 'Dalvik/2.1.0', 'per-channel User-Agent must be preserved');
assert.equal(c15.type, 'dash', 'DASH type must remain intact');

assert.equal(baseChannels[1].candidates[0].drm.key, freshKey13, 'channel number matching must tolerate current event title text');
assert.equal(baseChannels[2].candidates[0].drm.key, 'stale-invalid-key', 'no current valid event key means leave channel unchanged');
assert.equal(baseChannels[3].candidates[0].drm.key, oldKey15, 'non-TV360 DRM channels must never be modified');

const badOnly = [{
  name: 'TV360+15', group: 'Sự Kiện TV360',
  candidates: [{
    url: 'https://vmttv.dpdns.org/tv360/?id=tv360-15',
    drm: { type: 'clearkey', key: oldKey15 }
  }]
}];
assert.equal(mergeTv360EventKeys(badOnly, [{
  name: 'Current TV360+15', group: 'Sự Kiện TV360',
  candidates: [{ type: 'dash', drm: { type: 'clearkey', key: 'wrong:also-wrong' } }]
}]), 0, 'invalid external metadata must not overwrite the current key');

console.log('TV360_LIVE_KEY_OVERLAY_REGRESSION_OK');
