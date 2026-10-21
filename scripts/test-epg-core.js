'use strict';
const assert = require('node:assert/strict');
const core = require('../web-tv/epg-core.js');

assert.equal(core.normalizeEpgKey('Đồng Nai'), 'dongnai');
assert.equal(core.normalizeEpgKey('VTV1 HD'), 'vtv1hd');
assert.ok(core.keyVariants('VTV1 HD').includes('vtv1'), 'quality suffix should not block channel alias matching');
assert.ok(core.keyVariants('VTV1.vn').includes('vtv1'), 'country suffix should be normalized for XMLTV IDs');

const utc = Date.UTC(2026, 9, 22, 5, 0, 0);
assert.equal(core.parseXmltvDate('20261022120000 +0700'), utc, 'XMLTV +0700 should be converted to UTC epoch');
assert.equal(core.parseXmltvDate('20261022010000 -0400'), Date.UTC(2026, 9, 22, 5, 0, 0),
  'XMLTV negative offset should be converted to UTC epoch');
assert.equal(core.parseXmltvDate('not-a-date'), NaN);

const programme = {start: 1000, stop: 11000};
assert.equal(core.stateAt(programme, 0), 'upcoming');
assert.equal(core.stateAt(programme, 1000), 'live');
assert.equal(core.stateAt(programme, 11000), 'past');
assert.equal(core.progressPercent(programme, 6000), 50);
assert.equal(core.progressPercent(programme, 20000), 100);
assert.equal(core.overlaps(programme, 9000, 12000), true);
assert.equal(core.overlaps(programme, 11000, 12000), false);

const channelA = core.channelKey({id:'vtv1', group:'VTV', name:'VTV1'}, 0);
const channelB = core.channelKey({id:'vtv1', group:'Thể thao', name:'VTV1'}, 1);
assert.notEqual(channelA, channelB, 'channel cache keys should not collide across rows/groups');

console.log('EPG_CORE_TESTS_OK: Vietnamese aliases, XMLTV timezones, now/next states, progress and day overlap');
