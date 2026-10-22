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

// XMLTV integration fixture using a tiny DOM-compatible test parser; CI needs no third-party XML package.
class FakeXmlNode {
  constructor(nodeName, attributes) {
    this.nodeName = nodeName;
    this.attributes = attributes || {};
    this.children = [];
    this.directText = '';
  }
  getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null; }
  get textContent() { return this.directText + this.children.map(child => child.textContent).join(''); }
  getElementsByTagName(tag) {
    const found = [];
    function visit(node) {
      for (const child of node.children) {
        if (child.nodeName === tag) found.push(child);
        visit(child);
      }
    }
    visit(this);
    return found;
  }
}
function decodeXmlText(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, entity) => {
    if (entity[0] === '#') {
      const number = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(number) ? String.fromCodePoint(number) : _;
    }
    return ({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"})[entity.toLowerCase()] || _;
  });
}
function fakeParseXml(xml) {
  const documentRoot = new FakeXmlNode('#document', {});
  const stack = [documentRoot];
  const tokens = String(xml).match(/<!--[\s\S]*?-->|<!DOCTYPE[^>]*>|<\?[^>]*\?>|<\/?[^>]+>|[^<]+/g) || [];
  for (const token of tokens) {
    if (token.startsWith('<!--') || token.startsWith('<?') || /^<!DOCTYPE/i.test(token)) continue;
    if (token.startsWith('</')) { if (stack.length > 1) stack.pop(); continue; }
    if (token.startsWith('<')) {
      const tag = token.match(/^<\s*([^\s/>]+)/);
      if (!tag) continue;
      const attrs = {};
      const attrPart = token.slice(tag[0].length, token.length - (token.endsWith('/>') ? 2 : 1));
      const attrRe = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
      let match;
      while ((match = attrRe.exec(attrPart))) attrs[match[1]] = decodeXmlText(match[2] || match[3] || '');
      const node = new FakeXmlNode(tag[1], attrs);
      stack[stack.length - 1].children.push(node);
      if (!token.endsWith('/>')) stack.push(node);
    } else {
      stack[stack.length - 1].directText += decodeXmlText(token);
    }
  }
  const root = documentRoot.children[0] || new FakeXmlNode('parsererror', {});
  return {
    documentElement: root,
    getElementsByTagName: function(tag) {
      const found = [];
      if (root.nodeName === tag) found.push(root);
      return found.concat(root.getElementsByTagName(tag));
    }
  };
}
global.DOMParser = class {
  parseFromString(text) { return fakeParseXml(text); }
};
const xmltv = '<?xml version="1.0" encoding="UTF-8"?>' +
  '<tv>' +
  '<channel id="VTV1.vn"><display-name>VTV1 HD</display-name></channel>' +
  '<channel id="other-channel"><display-name>Kênh khác</display-name></channel>' +
  '<programme channel="VTV1.vn" start="20261022120000 +0700" stop="20261022130000 +0700">' +
  '<title>Thời sự &amp; tin tức</title><desc>Cập nhật trong ngày</desc><category>Tin tức</category>' +
  '</programme>' +
  '<programme channel="other-channel" start="20261022123000 +0700" stop="20261022130000 +0700">' +
  '<title>Chương trình khác</title></programme></tv>';
const playlistChannels = [
  {id:'vtv1hd', tvgName:'VTV1', name:'VTV1 HD', group:'VTV'},
  {id:'missing', tvgName:'', name:'Kênh không có lịch', group:'Khác'}
];
const xmlRangeStart = Date.UTC(2026, 9, 22, 4, 0, 0);
const xmlRangeStop = Date.UTC(2026, 9, 22, 7, 0, 0);
const parsedXmltv = core.parseXmltv(xmltv, playlistChannels, xmlRangeStart, xmlRangeStop);
const firstSchedule = parsedXmltv.schedules[core.channelKey(playlistChannels[0], 0)];
assert.equal(parsedXmltv.xmltvChannels, 2);
assert.equal(parsedXmltv.matchedChannels, 1, 'only the channel with a matching TVG alias should receive a schedule');
assert.equal(parsedXmltv.programmeCount, 1);
assert.equal(firstSchedule.length, 1);
assert.equal(firstSchedule[0].title, 'Thời sự & tin tức');
assert.equal(firstSchedule[0].desc, 'Cập nhật trong ngày');
assert.equal(firstSchedule[0].category, 'Tin tức');
assert.equal(firstSchedule[0].start, Date.UTC(2026, 9, 22, 5, 0, 0));
assert.equal(parsedXmltv.schedules[core.channelKey(playlistChannels[1], 1)].length, 0);

console.log('EPG_CORE_TESTS_OK: Vietnamese aliases, XMLTV timezones, now/next states, progress, date overlap and XMLTV channel matching');
