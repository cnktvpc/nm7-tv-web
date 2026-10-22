(function(root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NM7EPGCore = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function() {
  'use strict';

  function normalizeEpgKey(value) {
    return String(value == null ? '' : value)
      .replace(/[đĐ]/g, 'd')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  function keyVariants(value) {
    var original = normalizeEpgKey(value), seen = Object.create(null), queue = [], result = [];
    if (!original) return result;
    queue.push(original);
    while (queue.length) {
      var key = queue.shift();
      if (!key || seen[key]) continue;
      seen[key] = true;
      result.push(key);
      var noCountry = key.replace(/(?:\.?vn|vietnamesetelevision)$/, '');
      if (noCountry && noCountry !== key) queue.push(noCountry);
      var noQuality = key.replace(/(?:uhd|fhd|hd|sd|4k)$/, '');
      if (noQuality && noQuality !== key) queue.push(noQuality);
    }
    return result;
  }

  function parseXmltvDate(value) {
    var text = String(value || '').trim();
    var m = text.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:\s*([+-])(\d{2})(\d{2}))?$/);
    if (m) {
      var year = Number(m[1]), month = Number(m[2]), day = Number(m[3]);
      var hour = Number(m[4]), minute = Number(m[5]), second = Number(m[6]);
      if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 60) return NaN;
      var epoch;
      if (m[7]) {
        var offset = (Number(m[8]) * 60 + Number(m[9])) * 60000;
        epoch = Date.UTC(year, month - 1, day, hour, minute, second) + (m[7] === '+' ? -offset : offset);
      } else {
        epoch = new Date(year, month - 1, day, hour, minute, second).getTime();
      }
      return Number.isFinite(epoch) ? epoch : NaN;
    }
    var parsed = Date.parse(text);
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  function progressPercent(program, now) {
    if (!program || !Number.isFinite(program.start) || !Number.isFinite(program.stop) || program.stop <= program.start) return 0;
    return Math.max(0, Math.min(100, ((Number(now) - program.start) / (program.stop - program.start)) * 100));
  }

  function stateAt(program, now) {
    if (!program || !Number.isFinite(program.start) || !Number.isFinite(program.stop)) return 'unknown';
    if (now < program.start) return 'upcoming';
    if (now < program.stop) return 'live';
    return 'past';
  }

  function overlaps(program, start, stop) {
    return !!program && Number.isFinite(program.start) && Number.isFinite(program.stop) &&
      program.stop > start && program.start < stop;
  }

  function channelKey(channel, index) {
    channel = channel || {};
    var identity = String(channel.id || channel.tvgId || channel.name || ('channel-' + index));
    return encodeURIComponent(identity + '|' + String(channel.group || '') + '|' + String(channel.name || '') + '|' + index);
  }

  function textOf(node, tag) {
    var list = node.getElementsByTagName(tag);
    return list && list.length ? String(list[0].textContent || '').trim() : '';
  }

  function parseXmltv(xmlText, playlistChannels, rangeStart, rangeStop) {
    if (typeof DOMParser === 'undefined') throw new Error('Trình duyệt không hỗ trợ phân tích XMLTV.');
    var doc = new DOMParser().parseFromString(String(xmlText || ''), 'application/xml');
    if (!doc || !doc.documentElement || String(doc.documentElement.nodeName || '').toLowerCase() !== 'tv' ||
        doc.getElementsByTagName('parsererror').length) {
      throw new Error('Tệp lịch không phải XMLTV hợp lệ.');
    }

    var xmlChannels = [], aliases = new Map(), xmlChannelNodes = doc.getElementsByTagName('channel');
    for (var i = 0; i < xmlChannelNodes.length; i++) {
      var node = xmlChannelNodes[i], id = String(node.getAttribute('id') || '').trim();
      if (!id) continue;
      var displayNames = [], names = node.getElementsByTagName('display-name');
      for (var ni = 0; ni < names.length; ni++) {
        var n = String(names[ni].textContent || '').trim();
        if (n && displayNames.indexOf(n) < 0) displayNames.push(n);
      }
      var entry = { id: id, displayNames: displayNames, icon: '' };
      var iconNode = node.getElementsByTagName('icon');
      if (iconNode.length) entry.icon = String(iconNode[0].getAttribute('src') || '');
      xmlChannels.push(entry);
      var xmlIdKeys = keyVariants(id);
      xmlIdKeys.forEach(function(k) {
        var old = aliases.get(k) || [];
        if (old.indexOf(id) < 0) old.push(id);
        aliases.set(k, old);
      });
      displayNames.forEach(function(displayName) {
        keyVariants(displayName).forEach(function(k) {
          var old = aliases.get(k) || [];
          if (old.indexOf(id) < 0) old.push(id);
          aliases.set(k, old);
        });
      });
    }

    var epgIds = new Set(xmlChannels.map(function(c) { return c.id; }));
    var scheduleByEpgId = new Map();
    var programmeNodes = doc.getElementsByTagName('programme');
    for (var pi = 0; pi < programmeNodes.length; pi++) {
      var programme = programmeNodes[pi], epgId = String(programme.getAttribute('channel') || '').trim();
      if (!epgId || !epgIds.has(epgId)) continue;
      var start = parseXmltvDate(programme.getAttribute('start')), stop = parseXmltvDate(programme.getAttribute('stop'));
      if (!Number.isFinite(start) || !Number.isFinite(stop) || stop <= start) continue;
      if (Number.isFinite(rangeStart) && stop <= rangeStart) continue;
      if (Number.isFinite(rangeStop) && start >= rangeStop) continue;
      var item = {
        start: start,
        stop: stop,
        title: textOf(programme, 'title') || 'Chương trình chưa có tên',
        desc: textOf(programme, 'desc'),
        category: textOf(programme, 'category')
      };
      var schedule = scheduleByEpgId.get(epgId) || [];
      schedule.push(item);
      scheduleByEpgId.set(epgId, schedule);
    }
    scheduleByEpgId.forEach(function(items) {
      items.sort(function(a, b) { return a.start - b.start; });
      var deduped = [], last = '';
      items.forEach(function(p) {
        var key = p.start + '|' + p.stop + '|' + p.title;
        if (key !== last) deduped.push(p);
        last = key;
      });
      items.length = 0;
      Array.prototype.push.apply(items, deduped);
    });

    var schedules = Object.create(null), matchedChannels = 0, mappedProgrammes = 0;
    (Array.isArray(playlistChannels) ? playlistChannels : []).forEach(function(channel, index) {
      channel = channel || {};
      var values = [
        { value: channel.id || channel.tvgId || '', weight: 100 },
        { value: channel.tvgName || channel.tvg_name || '', weight: 60 },
        { value: channel.name || '', weight: 30 }
      ], scores = new Map();
      values.forEach(function(candidate) {
        if (!candidate.value) return;
        keyVariants(candidate.value).forEach(function(key) {
          var ids = aliases.get(key) || [];
          ids.forEach(function(aliasId) {
            var old = scores.get(aliasId) || 0;
            if (candidate.weight > old) scores.set(aliasId, candidate.weight);
          });
        });
      });
      var bestId = '', bestScore = -1, bestCount = -1;
      scores.forEach(function(score, candidateId) {
        var count = (scheduleByEpgId.get(candidateId) || []).length;
        if (score > bestScore || (score === bestScore && count > bestCount)) {
          bestId = candidateId; bestScore = score; bestCount = count;
        }
      });
      var programs = bestId ? (scheduleByEpgId.get(bestId) || []).slice() : [];
      schedules[channelKey(channel, index)] = programs;
      if (programs.length) { matchedChannels++; mappedProgrammes += programs.length; }
    });
    return {
      schedules: schedules,
      matchedChannels: matchedChannels,
      programmeCount: mappedProgrammes,
      xmltvChannels: xmlChannels.length,
      xmltvProgrammes: programmeNodes.length
    };
  }

  return {
    normalizeEpgKey: normalizeEpgKey,
    keyVariants: keyVariants,
    parseXmltvDate: parseXmltvDate,
    progressPercent: progressPercent,
    stateAt: stateAt,
    overlaps: overlaps,
    channelKey: channelKey,
    parseXmltv: parseXmltv
  };
});
