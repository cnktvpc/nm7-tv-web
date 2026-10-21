(function() {
  'use strict';

  var core = window.NM7EPGCore;
  var $ = function(id) { return document.getElementById(id); };
  var URL_KEY = 'nm7:epgUrl';
  var CACHE_PREFIX = 'nm7:epgCache:';
  var state = {
    preset: 1,
    channels: [],
    schedules: Object.create(null),
    sourceUrl: '',
    offset: 0,
    cacheAt: 0,
    matchedChannels: 0,
    programmeCount: 0,
    playlistLoaded: false,
    epgLoaded: false,
    loading: false
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function normalizeText(value) {
    return core ? core.normalizeEpgKey(value) : String(value || '').toLowerCase();
  }

  function addDays(date, count) {
    var out = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    out.setDate(out.getDate() + count);
    return out;
  }

  function dayBounds(offset) {
    var now = new Date();
    var start = addDays(now, offset);
    var stop = addDays(start, 1);
    return {start:start.getTime(), stop:stop.getTime(), date:start};
  }

  function programmeWindow() {
    return {start:dayBounds(-1).start, stop:dayBounds(8).start};
  }

  function dayLabel(date) {
    return date.toLocaleDateString('vi-VN', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
  }

  function shortTime(value) {
    return new Date(value).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit', hour12:false});
  }

  function setStatus(message, isError) {
    var node = $('status');
    node.textContent = String(message || '');
    node.className = 'status' + (isError ? ' error' : '');
  }

  function localGet(key) {
    try { return localStorage.getItem(key) || ''; } catch (e) { return ''; }
  }

  function localSet(key, value) {
    try { localStorage.setItem(key, value); return true; } catch (e) { return false; }
  }

  function cacheKey(url) {
    var value = String(url || '') + '|preset=' + state.preset, hash = 2166136261;
    for (var i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return CACHE_PREFIX + (hash >>> 0).toString(16);
  }

  function readScheduleCache(url) {
    try {
      var entry = JSON.parse(localStorage.getItem(cacheKey(url)) || 'null');
      if (!entry || !entry.at || Date.now() - entry.at > 6 * 60 * 60 * 1000 ||
          !entry.schedules || typeof entry.schedules !== 'object') return null;
      return entry;
    } catch (e) { return null; }
  }

  function saveScheduleCache(url, result) {
    try {
      var payload = JSON.stringify({
        at: Date.now(),
        schedules: result.schedules,
        matchedChannels: result.matchedChannels,
        programmeCount: result.programmeCount,
        xmltvChannels: result.xmltvChannels
      });
      // Keep well below common browser localStorage quotas; cache failure must not break EPG.
      if (payload.length <= 3500000) localStorage.setItem(cacheKey(url), payload);
    } catch (e) {}
  }

  async function fetchJson(url) {
    var response = await fetch(url, {cache:'no-store', headers:{'Accept':'application/json'}});
    var data;
    try { data = await response.json(); } catch (e) { data = {}; }
    if (!response.ok) throw new Error(data.error || ('HTTP ' + response.status));
    if (!data || !Array.isArray(data.channels)) throw new Error(data.error || 'Dữ liệu playlist không hợp lệ');
    return data;
  }

  async function loadPlaylist() {
    state.preset = $('presetSelect').value === '2' ? 2 : 1;
    localSet('nm7:guide:preset', String(state.preset));
    var url = '/api/playlist?source=tv&default=' + state.preset;
    try {
      var data = await fetchJson(url);
      if (!data.channels.length) throw new Error(data.error || 'Playlist rỗng');
      state.channels = data.channels.filter(function(c) { return c && (c.name || c.id); });
      state.playlistLoaded = true;
      if (data.epgUrl && !$('epgUrl').value.trim() && !localGet(URL_KEY)) {
        $('epgUrl').value = data.epgUrl;
      }
      if (data.epgUrl && !localGet(URL_KEY)) localSet(URL_KEY, data.epgUrl);
      populateGroups();
      $('channelStat').textContent = String(state.channels.length);
      $('sourceHint').textContent = data.epgUrl
        ? 'Đã phát hiện URL lịch trong playlist. Có thể thay URL bên trên nếu muốn dùng nguồn XMLTV khác.'
        : 'Playlist hiện không khai báo url-tvg / x-tvg-url; nhập URL XMLTV công khai ở đây để bật lịch.';
      return true;
    } catch (e) {
      state.playlistLoaded = false;
      $('sourceHint').textContent = 'Không tải được playlist kênh: ' + String(e.message || e);
      setStatus('Không tải được danh sách kênh. Hãy thử đổi nguồn hoặc tải lại trang.', true);
      return false;
    }
  }

  function populateGroups() {
    var select = $('groupSelect'), previous = select.value, groups = Object.create(null);
    state.channels.forEach(function(channel) {
      var group = String(channel.group || 'Khác');
      groups[group] = true;
    });
    var sorted = Object.keys(groups).sort(function(a,b) { return a.localeCompare(b, 'vi'); });
    select.innerHTML = '<option value="">Tất cả nhóm</option>' + sorted.map(function(group) {
      return '<option value="' + escapeHtml(group) + '">' + escapeHtml(group) + '</option>';
    }).join('');
    if (groups[previous]) select.value = previous;
  }

  function isHttpUrl(value) {
    try {
      var url = new URL(String(value || '').trim());
      return (url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password && url.href.length < 4096;
    } catch (e) { return false; }
  }

  function useCachedSchedule(url) {
    var cache = readScheduleCache(url);
    if (!cache) return false;
    state.schedules = cache.schedules;
    state.cacheAt = cache.at;
    state.matchedChannels = Number(cache.matchedChannels || 0);
    state.programmeCount = Number(cache.programmeCount || 0);
    state.epgLoaded = true;
    renderSchedule();
    setStatus('Đang hiển thị lịch đã lưu lúc ' + new Date(cache.at).toLocaleString('vi-VN') + '; đang kiểm tra bản cập nhật mới.');
    return true;
  }

  async function loadSchedule(forceRefresh) {
    var entered = String($('epgUrl').value || '').trim();
    if (!entered) {
      state.epgLoaded = false;
      state.schedules = Object.create(null);
      $('matchedStat').textContent = '—';
      $('programmeStat').textContent = '—';
      $('channelList').innerHTML = '<div class="empty"><strong>Chưa có nguồn lịch XMLTV</strong>Playlist hiện không cung cấp URL lịch. Dán URL trực tiếp tới tệp XMLTV ở trên rồi nhấn “Áp dụng”.</div>';
      setStatus('Cần URL XMLTV để tải lịch phát sóng.', true);
      return;
    }
    if (!isHttpUrl(entered)) {
      setStatus('URL XMLTV không hợp lệ. Hãy dùng URL HTTP/HTTPS công khai.', true);
      return;
    }

    state.sourceUrl = entered;
    localSet(URL_KEY, entered);
    if (!state.playlistLoaded && !(await loadPlaylist())) return;

    var cacheShown = !forceRefresh && useCachedSchedule(entered);
    if (!cacheShown) {
      state.loading = true;
      setStatus(forceRefresh ? 'Đang buộc cập nhật nguồn XMLTV…' : 'Đang tải và ghép lịch XMLTV với danh sách kênh…');
    }

    try {
      var api = '/api/epg?u=' + encodeURIComponent(entered) + (forceRefresh ? '&refresh=1' : '');
      var response = await fetch(api, {cache:'no-store', headers:{'Accept':'application/xml,text/xml,*/*'}});
      var body = await response.text();
      if (!response.ok) {
        var err = {};
        try { err = JSON.parse(body); } catch (e) {}
        throw new Error(err.error || ('HTTP ' + response.status));
      }
      if (!core) throw new Error('Thiếu bộ phân tích EPG NM7.');
      var windowRange = programmeWindow();
      var parsed = core.parseXmltv(body, state.channels, windowRange.start, windowRange.stop);
      state.schedules = parsed.schedules;
      state.matchedChannels = parsed.matchedChannels;
      state.programmeCount = parsed.programmeCount;
      state.cacheAt = Date.now();
      state.epgLoaded = true;
      saveScheduleCache(entered, parsed);
      renderSchedule();
      if (parsed.matchedChannels) {
        setStatus('Đã tải XMLTV: ghép được ' + parsed.matchedChannels + '/' + state.channels.length +
          ' kênh, ' + parsed.programmeCount + ' chương trình trong vùng lịch lưu cục bộ. Cập nhật ' +
          new Date().toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) + '.');
      } else {
        setStatus('Đã tải XMLTV nhưng chưa ghép được lịch với kênh nào. Hãy kiểm tra TVG-ID/tvg-name hoặc thử nguồn XMLTV khác.', true);
      }
    } catch (e) {
      if (cacheShown && state.epgLoaded) {
        setStatus('Nguồn XMLTV chưa cập nhật được (' + String(e.message || e) + '); vẫn giữ lịch cache gần nhất.');
      } else {
        state.epgLoaded = false;
        $('channelList').innerHTML = '<div class="empty"><strong>Không tải được lịch phát sóng</strong>' +
          escapeHtml(String(e.message || e)) + '<br><br>Kiểm tra URL, quyền truy cập nguồn và định dạng XMLTV.</div>';
        setStatus('Lỗi EPG: ' + String(e.message || e), true);
      }
    } finally {
      state.loading = false;
    }
  }

  function programmesFor(channel, index, bounds) {
    var items = state.schedules[core.channelKey(channel, index)] || [];
    return items.filter(function(program) { return core.overlaps(program, bounds.start, bounds.stop); })
      .sort(function(a,b) { return a.start - b.start; });
  }

  function renderProgram(program, now, isToday) {
    var status = isToday ? core.stateAt(program, now) : 'upcoming';
    var cls = 'program' + (status === 'live' ? ' current' : '') + (status === 'past' ? ' past' : '');
    var category = program.category ? '<span>' + escapeHtml(program.category) + '</span>' : '';
    var desc = program.desc ? '<p>' + escapeHtml(program.desc) + '</p>' : '';
    return '<details class="' + cls + '"><summary><span class="progtime">' +
      escapeHtml(shortTime(program.start)) + '–' + escapeHtml(shortTime(program.stop)) +
      '</span><span><span class="progtitle">' + escapeHtml(program.title) + '</span>' +
      (category ? '<span class="progmeta">' + category + '</span>' : '') +
      '</span></summary>' + (desc ? '<div class="progmeta">' + desc + '</div>' : '') + '</details>';
  }

  function renderChannelCard(channel, index, listIndex, bounds, now, isToday) {
    var programs = programmesFor(channel, index, bounds);
    var current = isToday ? programs.filter(function(p) { return p.start <= now && p.stop > now; })[0] : null;
    var upcoming = programs.filter(function(p) { return p.start >= (current ? current.stop : now); });
    var featured = current || upcoming[0] || programs[0] || null;
    var next = current ? programs.filter(function(p) { return p.start >= current.stop; })[0] : (upcoming.length > 1 ? upcoming[1] : null);
    var featuredStatus = current ? 'ĐANG PHÁT' : (isToday && featured && featured.start >= now ? 'SẮP PHÁT SÓNG' : 'LỊCH TRONG NGÀY');
    var pct = current ? core.progressPercent(current, now) : 0;
    var minsLeft = current ? Math.max(0, Math.ceil((current.stop - now) / 60000)) : 0;
    var candidateLogo = String(channel.logo || '');
    var logo = isHttpUrl(candidateLogo)
      ? '<img loading="lazy" src="' + escapeHtml(candidateLogo) + '" alt="" onerror="this.style.display=\'none\'">'
      : escapeHtml(String(channel.name || 'TV').trim().slice(0, 3).toUpperCase());
    var featuredHtml;
    if (featured) {
      featuredHtml = '<div class="featured ' + (current ? 'live' : (featured.start >= now && isToday ? 'upcoming' : '') ) + '">' +
        '<div class="featured-label">' + featuredStatus + '</div>' +
        '<div class="featured-title">' + escapeHtml(featured.title) + '</div>' +
        '<div class="featured-time">' + escapeHtml(shortTime(featured.start)) + ' – ' + escapeHtml(shortTime(featured.stop)) +
        (current ? ' · còn ' + minsLeft + ' phút' : '') + '</div>' +
        (current ? '<div class="progress-track"><div class="progress-fill" style="width:' + pct.toFixed(2) + '%"></div></div><div class="progress-caption">Đã phát ' + Math.floor(pct) + '%</div>' : '') +
        (next ? '<div class="nextline"><strong>Tiếp theo:</strong> ' + escapeHtml(shortTime(next.start)) + ' · ' + escapeHtml(next.title) + '</div>' : '') +
        '</div>';
    } else {
      featuredHtml = '<div class="empty"><strong>Chưa có dữ liệu chương trình</strong>Nguồn XMLTV không có lịch cho khung giờ này.</div>';
    }
    var allPrograms = programs.length
      ? '<details class="schedule"><summary>Xem toàn bộ lịch trong ngày (' + programs.length + ' chương trình)</summary><div class="program-list">' +
          programs.map(function(p) { return renderProgram(p, now, isToday); }).join('') + '</div></details>'
      : '';
    return '<article class="channel-card">' +
      '<div class="channel-meta"><span class="logo">' + logo + '</span><div class="channel-head">' +
      '<div class="channel-name">' + escapeHtml(channel.name || 'Kênh TV') + '</div>' +
      '<div class="channel-group">' + escapeHtml(channel.group || 'Khác') + '</div>' +
      '</div><button class="watchbtn" type="button" data-watch="' + index + '">▶ Xem kênh</button></div>' +
      '<div class="channel-body">' + featuredHtml + allPrograms + '</div></article>';
  }

  function renderSchedule() {
    var bounds = dayBounds(state.offset), isToday = state.offset === 0, now = Date.now();
    $('dayCaption').textContent = state.offset === 0 ? 'Hôm nay' : (state.offset === -1 ? 'Hôm qua' : dayLabel(bounds.date));
    $('daySubcaption').textContent = dayLabel(bounds.date);
    $('prevDay').disabled = state.offset <= -1;
    $('nextDay').disabled = state.offset >= 7;
    $('channelStat').textContent = String(state.channels.length);
    $('matchedStat').textContent = String(state.matchedChannels);
    var query = normalizeText($('searchInput').value || ''), group = $('groupSelect').value;
    var matchedProgramCount = 0, matchedCardCount = 0, html = '';
    state.channels.forEach(function(channel, index) {
      if (group && String(channel.group || 'Khác') !== group) return;
      var programs = programmesFor(channel, index, bounds);
      if (!programs.length) return;
      var channelText = normalizeText([channel.name, channel.id, channel.tvgName, channel.group].join(' '));
      var programMatch = !query || programs.some(function(p) { return normalizeText([p.title, p.desc, p.category].join(' ')).indexOf(query) >= 0; });
      if (query && channelText.indexOf(query) < 0 && !programMatch) return;
      html += renderChannelCard(channel, index, matchedCardCount, bounds, now, isToday);
      matchedCardCount++;
      matchedProgramCount += programs.length;
    });
    $('programmeStat').textContent = String(matchedProgramCount);
    if (html) {
      $('channelList').innerHTML = html;
      var buttons = $('channelList').querySelectorAll('[data-watch]');
      for (var i = 0; i < buttons.length; i++) buttons[i].addEventListener('click', function() {
        openChannelInNm7(Number(this.getAttribute('data-watch')));
      });
    } else if (!state.channels.length) {
      $('channelList').innerHTML = '<div class="empty"><strong>Chưa có danh sách kênh</strong>Hãy kiểm tra nguồn truyền hình rồi tải lại.</div>';
    } else if (!state.epgLoaded) {
      $('channelList').innerHTML = '<div class="empty"><strong>Chưa có lịch</strong>Nhập URL XMLTV ở phía trên rồi nhấn “Áp dụng”.</div>';
    } else {
      $('channelList').innerHTML = '<div class="empty"><strong>Không tìm thấy chương trình phù hợp</strong>Không có lịch trong ngày/bộ lọc đã chọn, hoặc nguồn EPG không khớp TVG-ID/tên kênh. Thử xóa tìm kiếm, đổi nhóm, hoặc kiểm tra URL XMLTV.</div>';
    }
  }

  function openChannelInNm7(index) {
    var channel = state.channels[index];
    if (!channel) return;
    var request = {
      id: String(channel.id || ''),
      name: String(channel.name || ''),
      group: String(channel.group || ''),
      preset: state.preset,
      at: Date.now()
    };
    if (!localSet('nm7:guide:open', JSON.stringify(request))) {
      setStatus('Trình duyệt chặn lưu trạng thái; không thể chuyển kênh trực tiếp. Hãy mở lại danh sách kênh thủ công.', true);
      return;
    }
    localSet('nm7:guide:preset', String(state.preset));
    location.href = '/?guide=1';
  }

  function initialize() {
    var storedPreset = localGet('nm7:guide:preset');
    $('presetSelect').value = storedPreset === '2' ? '2' : '1';
    var storedUrl = localGet(URL_KEY);
    if (storedUrl) $('epgUrl').value = storedUrl;
    $('epgForm').addEventListener('submit', function(event) {
      event.preventDefault();
      var value = String($('epgUrl').value || '').trim();
      if (!value) {
        try { localStorage.removeItem(URL_KEY); } catch (e) {}
        loadSchedule(false);
        return;
      }
      if (!isHttpUrl(value)) {
        setStatus('URL XMLTV không hợp lệ. Chỉ hỗ trợ HTTP/HTTPS công khai.', true);
        $('epgUrl').focus();
        return;
      }
      localSet(URL_KEY, value);
      loadSchedule(true);
    });
    $('refreshBtn').addEventListener('click', function() { loadSchedule(true); });
    $('presetSelect').addEventListener('change', async function() {
      state.channels = [];
      state.playlistLoaded = false;
      state.schedules = Object.create(null);
      if (await loadPlaylist()) await loadSchedule(false);
    });
    $('groupSelect').addEventListener('change', renderSchedule);
    $('searchInput').addEventListener('input', renderSchedule);
    $('prevDay').addEventListener('click', function() {
      state.offset = Math.max(-1, state.offset - 1);
      renderSchedule();
    });
    $('nextDay').addEventListener('click', function() {
      state.offset = Math.min(7, state.offset + 1);
      renderSchedule();
    });

    var initialUrl = storedUrl;
    loadPlaylist().then(function(ok) {
      if (!ok) return;
      if (!initialUrl && $('epgUrl').value.trim()) initialUrl = $('epgUrl').value.trim();
      if (initialUrl || $('epgUrl').value.trim()) loadSchedule(false);
      else {
        $('matchedStat').textContent = '—';
        $('programmeStat').textContent = '—';
        renderSchedule();
        setStatus('Playlist chưa khai báo nguồn XMLTV. Nhập URL lịch ở trên để bắt đầu.', true);
      }
    });
  }

  initialize();
})();
