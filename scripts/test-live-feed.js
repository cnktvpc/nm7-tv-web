'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const core=require('../web-tv/live-core.js');
const coreCanonical=fs.readFileSync(path.join(__dirname,'..','web-tv','live-core.js'),'utf8');
const coreVersioned=fs.readFileSync(path.join(__dirname,'..','web-tv','live-core-livefix-20261014.js'),'utf8');
const uiCanonical=fs.readFileSync(path.join(__dirname,'..','web-tv','live.js'),'utf8');
const uiVersioned=fs.readFileSync(path.join(__dirname,'..','web-tv','live-ui-livefix-20261014.js'),'utf8');
assert.equal(coreVersioned,coreCanonical,'versioned Worker parser asset must match the tested canonical parser');
assert.equal(uiVersioned,uiCanonical,'versioned Live UI asset must match the tested canonical UI');
const now=Date.UTC(2026,9,12,5,0,0); // 12:00 in Vietnam (UTC+7)
const feed=[
 '#EXTM3U',
 '#EXTINF:-1 tvg-logo="https://img.example/mcity.png" group-title="FPT PLAY",10:30 12/10 🟢 Manchester City vs Arsenal - Server 1',
 '#EXTVLCOPT:http-user-agent=NM7-Live-Test',
 '#EXTVLCOPT:http-referrer=https://ref.example/',
 '#KODIPROP:inputstream.adaptive.manifest_type=hls',
 'https://stream.example/mcity.m3u8',
 '#EXTINF:-1 group-title="TV360",10:35 12/10 Arsenal FC vs Manchester City FC - Server 2',
 'https://stream.example/arsenal.m3u8',
 '#EXTINF:-1 group-title="Ended",10:30 12/10 🔴 Manchester City vs Arsenal - Server 3',
 'https://stream.example/ended.m3u8',
 '#EXTINF:-1 group-title="Stale",01:00 12/10 🟢 Real Madrid vs Bayern Munich - Server 1',
 'https://stream.example/stale.m3u8',
 '#EXTINF:-1 group-title="Upcoming",12:30 12/10 🟢 Liverpool vs Chelsea - Server 1',
 'https://stream.example/upcoming.m3u8',
 '#EXTINF:-1 group-title="No marker",10:30 12/10 Paris Saint Germain vs Monaco - Server 1',
 'https://stream.example/nomarker.m3u8',
 '#EXTINF:-1 group-title="LIVE Feed",10:50 12/10 Club Chivas Tapatio vs Tepatitlan FC (Source 1)',
 'https://stream.example/chivas.m3u8',
 '#EXTINF:-1 group-title="TV360",10:40 12/10 LIVE NOW Athletic Club vs Londrina PR - Server 1',
 'https://stream.example/athletic.m3u8',
 '#EXTINF:-1 group-title="FPT Play",2026-10-12 11:45:00 Memphis Grizzlies vs Chicago Bulls [LIVE]',
 'https://stream.example/memphis.m3u8',
 '#EXTINF:-1 group-title="Sút Bóng TV",10:30 12/10 🟢 Hougang United FC vs Balestier Khalsa FC (BLV ĐỎM)',
 'https://stream.example/hougang-1.m3u8',
 '#EXTINF:-1 group-title="Sút Bóng TV",10:30 12/10 Hougang United FC vs Balestier Khalsa FC (BÒ TƯƠI)',
 'https://stream.example/hougang-2.m3u8',
 '#EXTINF:-1 group-title="Sút Bóng TV",10:30 12/10 Hougang United FC vs Balestier Khalsa FC (CÔNG CHẤT)',
 'https://stream.example/hougang-3.m3u8',
 '#EXTINF:-1 group-title="Giờ Vàng TV",10:30 12/10 Hougang United vs Balestier Khalsa (Tv)',
 'https://stream.example/hougang-4.m3u8',
 ''
].join('\n');
const channels=core.parseM3U(feed,'https://thethaonm7.phuongnm7-iptv.workers.dev/playlist.m3u');
assert.equal(channels.length,13,'M3U parser should preserve all input records including format variants');
assert.equal(channels[0].candidates[0].ua,'NM7-Live-Test','player User-Agent header survives parsing');
assert.equal(channels[0].candidates[0].ref,'https://ref.example/','referer survives parsing');
assert.equal(channels[0].candidates[0].type,'hls','HLS manifest hint survives parsing');
const events=core.buildEvents(channels,now);
assert.equal(events.length,5,'active fixtures should survive across emoji, text/group markers and ISO datetime formats');
assert.ok(events.some(e=>e.title==='Club Chivas Tapatio vs Tepatitlan FC'),'a group-title LIVE marker should preserve a match with no emoji in its name');
assert.ok(events.some(e=>e.title==='Athletic Club vs Londrina PR'),'unbracketed LIVE NOW status should be recognized and stripped from the event title');
assert.ok(events.some(e=>e.title==='Memphis Grizzlies vs Chicago Bulls'),'ISO-like date/time feed entry should parse as a live event');
const diag=core.diagnoseFeed(feed,now);
assert.equal(diag.channels,13,'feed diagnostics should report input channel count');
assert.equal(diag.events,5,'feed diagnostics should report the same event count as the parser');
const event=events.find(e=>e.title==='Manchester City vs Arsenal');
assert.ok(event,'Manchester City vs Arsenal event should exist');
assert.equal(event.sources.length,2,'same event alternatives should be grouped; ended server must be excluded');
assert.match(event.id,/^2026-10-12\|.*_vs_.*$/,'event id should be stable by date and normalized teams');
assert.equal(Math.floor((now-event.kickoff)/60000),90,'kickoff parsing must use Vietnam timezone UTC+7');
const grouped=events.find(e=>e.title==='Hougang United FC vs Balestier Khalsa FC');
assert.ok(grouped,'commentator/server suffixes must not become part of the fixture title');
assert.equal(grouped.sources.length,4,'four streams for the same fixture must become one card with four servers');
assert.deepEqual(grouped.sources.map(s=>s.label).sort(),[
 'Giờ Vàng TV • Tv','Sút Bóng TV • BLV ĐỎM','Sút Bóng TV • BÒ TƯƠI','Sút Bóng TV • CÔNG CHẤT'
].sort(),'the grouped event must retain each source/provider label');
assert.equal(core.parseFeed(feed,now).length,5,'public parseFeed wrapper must match buildEvents and group by fixture');
assert.equal(core.kickoffOf('10:30 12/10',now),Date.UTC(2026,9,12,3,30,0),'date without year should resolve in Vietnam local time');
assert.equal(core.kickoffOf('2026-10-12 11:45:00',now),Date.UTC(2026,9,12,4,45,0),'ISO-like datetime should use Vietnam local time when no timezone suffix is present');
assert.equal(core.isLiveMarker('10:30 12/10 LIVE NOW Team A vs Team B','TV360'),true,'text and provider group LIVE signals should be recognized');
const expired=feed.replace('10:30 12/10 🟢 Manchester City vs Arsenal','01:00 12/10 🟢 Manchester City vs Arsenal');
assert.equal(core.parseFeed(expired,now).some(e=>e.title.indexOf('Manchester City')>=0),false,'marked-live feed older than eight hours should expire');
const worker=fs.readFileSync(path.join(__dirname,'..','worker.js'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'..','web-tv','app-safari-policy.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'..','web-tv','index.html'),'utf8');
assert.match(worker,/p==='\/api\/live-feed'/,'dedicated Worker route exists');
assert.match(worker,/thethaonm7\.phuongnm7-iptv\.workers\.dev\/playlist\.m3u/,'feed is sourced from the dedicated Live Worker');
assert.match(html,/id="btnLiveTab"/,'home Live tab exists');
assert.match(html,/id="liveServerBtn"/,'in-player Live server switch exists');
assert.match(html,/live-core-livefix-20261014\.js/,'updated parser uses a unique asset path to avoid stale edge JS');
assert.match(html,/live-ui-livefix-20261014\.js/,'Live UI uses a unique asset path to avoid stale edge JS');
const liveUi=fs.readFileSync(path.join(__dirname,'..','web-tv','live.js'),'utf8');
assert.match(liveUi,/if\(!\/\^\\s\*#EXTM3U\/i\.test\(String\(text\|\|''\)\.replace\(\/\^\\uFEFF\//,'Live UI must use real whitespace/BOM escapes when validating the M3U header');
assert.match(app,/window\.NM7PlayerBridge/,'main player bridge exists');
assert.match(app,/S\.livePlaybackContext/,'Live playback stores/restores previous IPTV state');
const runtimePath=process.argv[2];
if(runtimePath){
 const runtimeText=fs.readFileSync(runtimePath,'utf8');
 const runtimeStats=core.diagnoseFeed(runtimeText,Date.now());
 console.log('NM7_LIVE_FEED_RUNTIME_DIAGNOSTICS',JSON.stringify(runtimeStats));
}
console.log('NM7_LIVE_FEED_TESTS_OK',JSON.stringify({channels:channels.length,events:events.length,servers:event.sources.length,groupedFixtureServers:grouped.sources.length,kickoffMinutes:90,script:'live-core-livefix-20261014'}));
