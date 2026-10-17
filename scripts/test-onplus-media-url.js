#!/usr/bin/env node
'use strict';

// Regression test for OnPlus URLs that look like MP4 paths but are HLS playlists.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const worker = fs.readFileSync(path.join(__dirname, '..', 'worker.js'), 'utf8');
const functionStart = worker.indexOf('function extractProviderMedia(');
assert.notEqual(functionStart, -1, 'extractProviderMedia must exist');
const marker = 'const pattern = ';
const patternStart = worker.indexOf(marker, functionStart);
assert.notEqual(patternStart, -1, 'provider media extractor regex must exist');
const lineEnd = worker.indexOf(';', patternStart);
assert.notEqual(lineEnd, -1, 'provider media regex must terminate with a semicolon');
const literal = worker.slice(patternStart + marker.length, lineEnd).trim();
const closingSlash = literal.lastIndexOf('/');
assert.ok(literal.startsWith('/') && closingSlash > 0, 'must locate a regex literal');
const mediaPattern = new RegExp(literal.slice(1, closingSlash), literal.slice(closingSlash + 1));

const nestedHls = 'https://vod.onplus.com.vn/hls/vod/newonsports/DISTRIBUTE/new/example-game_abc_20261006064005.mp4/index.m3u8';
assert.deepEqual(nestedHls.match(mediaPattern), [nestedHls], 'must preserve the full .mp4/index.m3u8 path');

const normalMp4 = 'https://cdn.example.test/sports/highlight.mp4';
assert.deepEqual(normalMp4.match(mediaPattern), [normalMp4], 'must keep accepting ordinary MP4 media');

const signedHls = 'https://cdn.example.test/master.m3u8?token=abc123&profile=720';
assert.deepEqual(signedHls.match(mediaPattern), [signedHls], 'must preserve HLS query parameters');

console.log('ONPLUS_MEDIA_URL_REGRESSION_OK: nested HLS, MP4 and query parameters');
