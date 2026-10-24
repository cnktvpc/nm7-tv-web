#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=p=>fs.readFileSync(process.cwd()+'/'+p,'utf8');
const html=read('web-tv/index.html');
const tiktok=read('web-tv/tiktok.js');
const config=read('wrangler.tiktok-preview.toml');
for(const marker of ['id="btnTikTokTab"','id="tiktokView"','id="tiktokFrame"','id="tiktokAddForm"','tiktok.js?v=20261024-tiktok-mobile-v1'])assert.ok(html.includes(marker),'missing TikTok UI marker: '+marker);
for(const marker of ["PLAYER_ORIGIN+'/player/v1/'","function parseVideoUrl(value)","event.origin!==PLAYER_ORIGIN","event.source!==frame.contentWindow","window.NM7PlayerBridge.openTikTok","localStorage","tiktokSwipeNext","function handleRemoteKey(e)"])assert.ok(tiktok.includes(marker),'missing TikTok behavior marker: '+marker);
for(const [name,path] of [['mobile','web-tv/app-safari-policy-mobile-controls.js'],['pc','web-tv/app-safari-policy-pc-controls.js'],['app','web-tv/app.js'],['legacy','web-tv/app-safari-policy.js']]){
 const source=read(path);
 assert.ok(source.includes('♪  TikTok · Video ngắn'),name+' runtime menu item missing');
 assert.ok(source.includes('window.NM7TikTok.handleRemoteKey(e)'),name+' remote-key hook missing');
 assert.ok(source.includes('openTikTok:function()'),name+' IPTV lifecycle hook missing');
}
assert.ok(config.includes('name = "nm7-tv-web-tiktok-preview"'),'preview Worker name missing');
assert.ok(!config.includes('name = "nm7-tv-web"\n'),'preview config must not target production Worker');
assert.ok(config.includes('PLAYLIST_SOURCE')&&config.includes('THETHAO_SOURCE'),'preview service bindings missing');
const listeners={};
const fakeWindow={addEventListener:(name,fn)=>{(listeners[name]||(listeners[name]=[])).push(fn)},location:{href:'https://nm7-tv-web-tiktok-preview.phuongnm7-iptv.workers.dev/'}};
const fakeDocument={readyState:'loading',addEventListener:(name,fn)=>{(listeners['document:'+name]||(listeners['document:'+name]=[])).push(fn)}};
const fakeStorage={getItem:()=>null,setItem:()=>{}};
vm.runInNewContext(tiktok,{window:fakeWindow,document:fakeDocument,localStorage:fakeStorage,URL,setTimeout:()=>0,console});
const parse=fakeWindow.NM7TikTok.parseVideoUrl;
assert.equal(parse('https://www.tiktok.com/@scout2015/video/6718335390845095173').id,'6718335390845095173');
assert.equal(parse('www.tiktok.com/@abc/video/1234567890123456789').title,'@abc');
assert.ok(parse('https://evil.example/@abc/video/1234567890123456789').error,'must reject non-TikTok host');
assert.ok(parse('https://vm.tiktok.com/ZMshort/').error,'must explain short links without a video ID');
assert.ok(parse('javascript:alert(1)').error,'must reject non-HTTP schemes');
assert.ok(parse('https://www.tiktok.com/@abc/video/not-an-id').error,'must reject malformed video IDs');
console.log('TIKTOK_TAB_REGRESSION_OK: UI, remote controls, isolated preview bindings, URL validation and official embed route');
