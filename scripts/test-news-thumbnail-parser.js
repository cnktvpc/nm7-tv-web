const assert = require('node:assert/strict');
const fs = require('node:fs');
const worker = fs.readFileSync('worker.js', 'utf8');
const page = fs.readFileSync('web-tv/ban-tin.html', 'utf8');

const vm = require('node:vm');
assert.ok(worker.includes("onplus: ['onplus.com.vn','vtvcab.vn'"), 'ON Plus CDN images must accept vtvcab.vn');
assert.ok(worker.includes("replay: ['bongplus.vip','bongtv.com','static.wex1sora.com','vtvcab.vn']"), 'Replay image hosts must be explicit');
assert.ok(worker.includes('function findReplayThumbnail(record, base)'), 'Replay parser must search event thumbnails');
assert.ok(worker.includes('function extractNewsImageFromHtml(block, base, source)'), 'OnPlus parser must support lazy img/source/srcset/background URLs');
assert.ok(worker.includes("h.set('Referer',origin.href);h.set('Origin',origin.origin)"), 'Image proxy must send provider Referer and Origin');
assert.ok(worker.includes("'/api/image?u='+encodeURIComponent(sourceImage)+'&r='+encodeURIComponent(providerBase+'/')"), 'Replay cards must use the same-origin thumbnail proxy');
for (const key of ['thumbnailHorizontal','thumbnailUrl','posterImage','coverImage','eventImage','matchImage','videoImage']) {
  assert.ok(worker.includes("'" + key + "'"), 'Replay parser must inspect ' + key);
}
assert.ok(worker.includes("url.searchParams.get('refresh') === '1'"), 'Explicit refresh must bypass caches');
assert.ok(worker.includes('caches.default.match(edgeKey)'), 'News lists must have a shared edge-cache path');
assert.ok(worker.includes('max-age=60, s-maxage=60'), 'Normal list responses must use a 60-second shared edge cache');
assert.ok(worker.includes("const anchors = source === 'highlights'"), 'Do not scan the OnPlus homepage twice');
assert.ok(page.includes('id="refresh"'), 'Bản tin must render a refresh button');
assert.ok(page.includes('function warmInactiveSources()'), 'Other news tabs must be prefetched after first render');
assert.ok(page.includes('if(!keepCurrent)grid.innerHTML'), 'Refresh should keep current list visible until new data arrives');
assert.ok(page.includes('&refresh=1'), 'Refresh button must bypass cache');
assert.ok(page.includes("setInterval(function(){if(!document.hidden&&!viewer.classList.contains('open'))load(source,false)},90000)"), 'Visible listings must auto-refresh');

const helperStart = worker.indexOf('const NEWS_IMAGE_ROOTS = {');
const helperEnd = worker.indexOf('function parseOnPlusCards(html) {', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'Image helpers must be present');
const imageHelpers = vm.runInNewContext(worker.slice(helperStart,helperEnd) + '\n({ normalizeNewsImage, firstNewsImageFromRecord, findReplayThumbnail, extractNewsImageFromHtml })', {
  URL,
  decodeProviderEscapes: value => String(value || '').replace(/&amp;/gi,'&'),
  getOutHtmlAttr: (tag,name) => {
    const text = String(tag || '');
    const dq = new RegExp(name + '="([^"]*)"', 'i').exec(text);
    const sq = new RegExp(name + "='([^']*)'", 'i').exec(text);
    const match = dq || sq;
    return match ? match[1] : '';
  }
});
assert.equal(
  imageHelpers.firstNewsImageFromRecord({image:'name',metadata:{thumbnailHorizontal:'https://imgvlive.vtvcab.vn/thumb/event.jpg'}}, ['thumbnailHorizontal','image'], 'https://onplus.com.vn/','onplus'),
  'https://imgvlive.vtvcab.vn/thumb/event.jpg',
  'Nested thumbnail fields must be found and placeholder image text must be ignored'
);
assert.equal(
  imageHelpers.findReplayThumbnail({homeTeam:{logo:'https://static.wex1sora.com/team/home.png'},coverImage:{url:'https://static.wex1sora.com/replay/cover.jpg'}},'https://bongplus.vip'),
  'https://static.wex1sora.com/replay/cover.jpg',
  'Replay event cover must be prioritized to the team logo'
);
assert.equal(
  imageHelpers.extractNewsImageFromHtml('<a href="/video?id=1"><picture><source data-srcset="https://imgvlive.vtvcab.vn/thumb/event.webp 1x"><img alt="name"></picture></a>','https://onplus.com.vn/','onplus'),
  'https://imgvlive.vtvcab.vn/thumb/event.webp',
  'ON Plus lazy srcset thumbnails must be extracted even when img.src is absent'
);

const titleHelpersStart = worker.indexOf('function replayTextCandidate(value');
const titleHelpersEnd = worker.indexOf('async function cacheNewsResponse', titleHelpersStart);
assert.ok(titleHelpersStart >= 0 && titleHelpersEnd > titleHelpersStart, 'Replay title helpers must be present');
const titleHelpers = vm.runInNewContext(
  worker.slice(titleHelpersStart,titleHelpersEnd) + '\n({ replayTeamName, replayMatchTitle })',
  {}
);
assert.equal(
  titleHelpers.replayMatchTitle({
    title:'Italian Serie A vs',
    homeName:'Inter Milan',
    awayName:'Napoli',
    competitionName:'Italian Serie A'
  }),
  'Inter Milan vs Napoli',
  'Explicit team names must win over the provider generic title'
);
assert.equal(
  titleHelpers.replayMatchTitle({
    title:'Italian Serie A vs',
    homeTeam:{teamInfo:{englishName:'Atalanta'},logo:'https://static.wex1sora.com/team.png'},
    awayTeam:{name:{en:'AS Roma'}},
    competitionName:'Italian Serie A'
  }),
  'Atalanta vs AS Roma',
  'Nested home/away team objects must be read into the title'
);
assert.doesNotMatch(
  titleHelpers.replayMatchTitle({title:'Italian Serie A vs',competitionName:'Italian Serie A'}),
  /\bvs\.?\s*$/i,
  'Fallback title must never end with an empty vs'
);

console.log('NEWS_THUMBNAIL_REFRESH_REGRESSION_OK: trusted CDN images, replay thumbnails, edge cache and manual/periodic refresh');
