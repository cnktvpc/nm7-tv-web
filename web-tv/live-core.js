(function(root){
'use strict';
function normalizeText(v){
 var s=String(v==null?'':v).toLowerCase();
 try{s=s.normalize('NFD').replace(/[\u0300-\u036f]/g,'')}catch(e){}
 return s.replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
}
function parseM3U(text,base){
 var lines=String(text||'').replace(/^\uFEFF/,'').split(/\r?\n/),out=[],m=null,ua='',ref='',origin='',headers={},manifest='',licenseType='',licenseKey='';
 function finish(){if(m&&m.candidates.length)out.push(m);m=null}
 function attr(h,k){var r=new RegExp(k+'="([^"]*)"','i').exec(h);return r?r[1]:''}
 for(var i=0;i<lines.length;i++){
  var l=lines[i].trim(),p,h,ps,url,r,u,o,eq,z,k,v,mt,lt,lk;
  if(!l)continue;
  if(l.indexOf('#EXTINF:')===0){
   finish();p=l.indexOf(',');h=p<0?l:l.slice(0,p);
   m={name:p<0?'Kênh':l.slice(p+1).trim(),group:attr(h,'group-title')||'Khác',logo:attr(h,'tvg-logo'),id:attr(h,'tvg-id'),candidates:[]};
   ua='';ref='';origin='';headers={};manifest='';licenseType='';licenseKey='';continue;
  }
  if(!m)continue;
  if(l.indexOf('#EXTHTTP:')===0){
   try{var j=JSON.parse(l.slice(l.indexOf(':')+1).trim());if(j&&typeof j==='object'&&!Array.isArray(j)){
    Object.keys(j).forEach(function(key){var value=j[key];if(typeof value!=='string'||!value.trim())return;var lower=key.toLowerCase();if(lower==='user-agent')ua=value;else if(lower==='referer'||lower==='referrer')ref=value;else if(lower==='origin')origin=value;else headers[key]=value;});
   }}catch(e){}continue;
  }
  if(l.indexOf('#EXTVLCOPT:')===0){
   var um=/http-user-agent=(?:"([^"]+)"|(.*))/i.exec(l),rm=/(?:http-referrer|http-referer)=(?:"([^"]+)"|([^\s]+))/i.exec(l),om=/http-origin=(?:"([^"]+)"|([^\s]+))/i.exec(l);
   if(um)ua=(um[1]||um[2]||'').trim();if(rm)ref=rm[1]||rm[2];if(om)origin=om[1]||om[2];continue;
  }
  if(l.indexOf('#KODIPROP:')===0){
   mt=/manifest_type=(.+)/i.exec(l);lt=/license_type=(.+)/i.exec(l);lk=/license_key=(.+)/i.exec(l);
   if(mt)manifest=mt[1].trim();if(lt)licenseType=lt[1].trim();if(lk)licenseKey=lk[1].trim();continue;
  }
  if(l.charAt(0)==='#')continue;
  if(!/^(https?|rtsp|rtmp|udp|srt|rtp):/i.test(l))continue;
  ps=l.split('|');url=ps.shift();r=ref;u=ua;o=origin;var extra={};
  for(var q=0;q<ps.length;q++){z=ps[q];eq=z.indexOf('=');if(eq<0)continue;k=z.slice(0,eq);v=z.slice(eq+1);if(/^(?:referer|referrer)$/i.test(k))r=v;else if(/^http-user-agent$/i.test(k))u=v;else if(/^origin$/i.test(k))o=v;else if(k.toLowerCase()!=='host')extra[k]=v}
  if(base){try{url=new URL(url,base).toString()}catch(e){}}
  var typ=String(manifest||'').toLowerCase();
  var cand={url:url,ref:r||'',ua:u||'',headers:headersCopy(headers,extra,o),type:typ==='mpd'?'dash':(typ==='hls'?'hls':''),dash:typ==='mpd',hls:typ==='hls'||/\.m3u8?(?:$|[?#])/i.test(url)||/playlist|index\.m3u|manifest/i.test(url),drm:licenseType&&licenseKey?{type:licenseType,key:licenseKey}:null,forceProxy:/vietanhtv\.id\.vn/i.test(url)};
  if(!cand.type&&/\.mpd(?:$|[?#])/i.test(url)){cand.type='dash';cand.dash=true}
  m.candidates.push(cand);
 }
 finish();return out;
}
function headersCopy(one,two,origin){
 var o={},k;for(k in (one||{}))if(Object.prototype.hasOwnProperty.call(one,k))o[k]=one[k];
 for(k in (two||{}))if(Object.prototype.hasOwnProperty.call(two,k))o[k]=two[k];
 if(origin)o.Origin=origin;return o;
}
function kickoffOf(raw,now){
 var s=String(raw||''),a,timeFirst=true;
 function localTimestamp(year,month,day,hour,minute){
  if(!year||month<1||month>12||day<1||day>31||hour<0||hour>23||minute<0||minute>59)return 0;
  var stamp=Date.UTC(year,month-1,day,hour-7,minute,0,0),local=new Date(stamp+7*60*60*1000);
  if(local.getUTCFullYear()!==year||local.getUTCMonth()!==month-1||local.getUTCDate()!==day||local.getUTCHours()!==hour||local.getUTCMinutes()!==minute)return 0;
  return stamp;
 }
 // Accept ISO-like timestamps as well as the feed's usual "HH:mm DD/MM" format.
 var iso=/\b(\d{4})-(\d{1,2})-(\d{1,2})[T\s]+([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?\s*(Z|[+-]\d{2}:?\d{2})?/i.exec(s);
 if(iso){
  if(iso[6]){
   var zoned=Date.parse(iso[0].replace(/\s+/,'T'));
   if(Number.isFinite(zoned))return zoned;
  }else{
   var isoStamp=localTimestamp(Number(iso[1]),Number(iso[2]),Number(iso[3]),Number(iso[4]),Number(iso[5]));
   if(isoStamp)return isoStamp;
  }
 }
 a=/([01]?\d|2[0-3]):([0-5]\d)\s+(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?/.exec(s);
 if(!a){a=/(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?\s+([01]?\d|2[0-3]):([0-5]\d)/.exec(s);timeFirst=false}
 if(!a)return 0;
 var hour=Number(a[timeFirst?1:4]),minute=Number(a[timeFirst?2:5]),day=Number(a[timeFirst?3:1]),month=Number(a[timeFirst?4:2]),rawYear=a[timeFirst?5:3];
 var years=[],current=new Date(now+7*60*60*1000).getUTCFullYear();
 if(rawYear){var y=Number(rawYear);years=[y<100?(y<70?2000+y:1900+y):y]}else years=[current,current-1,current+1];
 var best=0,bestDiff=Infinity;
 for(var i=0;i<years.length;i++){
  var date=localTimestamp(years[i],month,day,hour,minute);
  if(!date)continue;
  var diff=Math.abs(date-now);
  if(diff<bestDiff){bestDiff=diff;best=date}
 }
 return best;
}
function kickoffEndIndex(raw){
 var s=String(raw||''),m=/\b\d{4}-\d{1,2}-\d{1,2}[T\s]+[01]?\d:[0-5]\d(?::[0-5]\d)?(?:\s*(?:Z|[+-]\d{2}:?\d{2}))?/i.exec(s)||
 /([01]?\d|2[0-3]):([0-5]\d)\s+\d{1,2}[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?/.exec(s)||
 /\d{1,2}[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?\s+[01]?\d:[0-5]\d/.exec(s);
 return m?m.index+m[0].length:0;
}
function isLiveMarker(raw,group){
 var rawText=String(raw||''),allText=rawText+' '+String(group||''),n=normalizeText(rawText),g=normalizeText(group||'');
 if(/🟢|🟩/.test(allText))return true;
 // Feeds may express the live state as text or in group-title rather than an emoji.
 return /\b(?:live|live now|currently live|in progress|in play|truc tiep|dang live|dang dien ra|en vivo|en directo)\b/.test(n)||
        /\b(?:live|truc tiep|dang live|dang dien ra|in progress|en vivo|en directo)\b/.test(g);
}
function isEnded(raw){return /🔴|🟥/.test(String(raw||''))}
function stripSuffix(s){
 s=String(s||'').replace(/\s*(?:[-|•:]?\s*)?(?:server|srv|source|nguon|máy chủ|may chu)\s*#?\s*\d+\s*(?:\([^)]*\)|\[[^\]]*\])?\s*$/i,'');
 s=s.replace(/\s*(?:[-|•:]?\s*)?(?:backup|du phong|primary|main)\s*$/i,'');
 s=s.replace(/\s*(?:[-|•:]?\s*)?(?:fpt\s*play|live\s*feed|feed\s*live)\s*$/i,'');
 return s.trim();
}
function stripSourceSuffix(value){
 var result=String(value||'').trim(),changed=true;
 while(changed){
  changed=false;
  var next=result.replace(/\s*\[[^\]]*\]\s*$/,'').trim();
  if(next!==result){result=next;changed=true;continue}
  next=result.replace(/\s*\([^)]*\)\s*$/,'').trim();
  if(next!==result){result=next;changed=true}
 }
 return result.replace(/\s+/g,' ').trim();
}
function cleanMatchName(raw,kickoffEnd){
 var s=String(raw||'').substring(kickoffEnd).trim();
 s=s.replace(/^[\s:|•\-–—]+/,'').replace(/^(?:🟢|🟩|🔴|🟥|⚽|🏀|🎾|🏒|🏈|🏉|⚾|🏐|🥊|🎮)+\s*/,'');
 s=s.replace(/^\[?\s*(?:currently live|live now|in progress|in play|live|truc tiep|trực tiếp|dang live|đang live|dang dien ra|đang diễn ra|en vivo|en directo)\s*\]?\s*[:|•\-–—]?\s*/i,'');
 s=stripSuffix(s);
 s=stripSourceSuffix(s);
 s=stripSuffix(s).replace(/\s+/g,' ').trim();
 s=s.replace(/\s*(?:\[[^\]]*(?:live|hd|fhd|uhd|4k|hls|dash)[^\]]*\]|\([^)]*(?:live|hd|fhd|uhd|4k|hls|dash)[^)]*\))\s*$/i,'').trim();
 return s;
}
function teamKey(s){
 var n=normalizeText(s).replace(/\b(?:fc|cf|sc|afc|clb|club|ca|rcd|ud|cd|ac|us|ss|jk|f c|s c)\b/g,' ').replace(/\b(?:hd|fhd|uhd|4k|live|truc tiep|fpt play|vs|versus)\b/g,' ');
 return n.replace(/\s+/g,' ').trim();
}
function similarity(a,b){
 if(a===b)return 1;
 var aa=a.split(' '),bb=b.split(' '),setA={},setB={},common=0,na=0,nb=0;
 aa.forEach(function(v){if(v){setA[v]=1;na++}});bb.forEach(function(v){if(v){setB[v]=1;nb++}});
 Object.keys(setA).forEach(function(v){if(setB[v])common++});
 if(!na||!nb)return 0;
 var j=common/(na+nb-common),contain=common/Math.min(na,nb);return Math.max(j,contain*.82);
}
function sameFixture(a,b){
 if(Math.abs(a.kickoff-b.kickoff)>18*60*60*1000)return false;
 return (similarity(a.homeKey,b.homeKey)>=.68&&similarity(a.awayKey,b.awayKey)>=.68)||(similarity(a.homeKey,b.awayKey)>=.68&&similarity(a.awayKey,b.homeKey)>=.68);
}
function sportOf(raw,home,away){
 if(raw.indexOf('🏀')>=0||/basketball/.test(normalizeText(raw)))return 'Bóng rổ';
 if(raw.indexOf('🎾')>=0||/tennis/.test(normalizeText(raw)))return 'Quần vợt';
 if(raw.indexOf('🏒')>=0||/hockey/.test(normalizeText(raw)))return 'Khúc côn cầu';
 if(/[🏈🏉]/.test(raw)||/rugby|american football/.test(normalizeText(raw)))return 'Bóng bầu dục';
 if(raw.indexOf('⚾')>=0||/baseball/.test(normalizeText(raw)))return 'Bóng chày';
 if(raw.indexOf('🏐')>=0||/volleyball/.test(normalizeText(raw)))return 'Bóng chuyền';
 if(raw.indexOf('🥊')>=0||/mma/.test(normalizeText(raw)))return 'Võ thuật';
 if(raw.indexOf('🎮')>=0||/esports/.test(normalizeText(raw)))return 'Esports';
 var matchup=' '+home+' vs '+away+' ';
 var nba=['atlanta hawks','boston celtics','brooklyn nets','charlotte hornets','chicago bulls','cleveland cavaliers','dallas mavericks','denver nuggets','detroit pistons','golden state warriors','houston rockets','indiana pacers','la clippers','los angeles clippers','los angeles lakers','la lakers','memphis grizzlies','miami heat','milwaukee bucks','minnesota timberwolves','new orleans pelicans','new york knicks','oklahoma city thunder','orlando magic','philadelphia 76ers','phoenix suns','portland trail blazers','sacramento kings','san antonio spurs','toronto raptors','utah jazz','washington wizards'];
 for(var i=0;i<nba.length;i++)if(matchup.indexOf(nba[i])>=0)return 'Bóng rổ';
 return 'Bóng đá';
}
function sourceLabel(source,index){
 var extras=[],raw=String(source.name||''),m,lower;
 var parenthetical=/\(([^)]{1,50})\)/g;
 while((m=parenthetical.exec(raw))!==null){
  var value=m[1].trim();lower=normalizeText(value);
  if(value&&!/^(?:18\+|live|truc tiep|hd|fhd|uhd|4k)$/.test(lower)&&extras.indexOf(value)<0)extras.push(value);
 }
 var transport=/\[(flv|hls(?:\s*\d+)?|m3u8|rtmp|dash|mpd)\]/ig;
 while((m=transport.exec(raw))!==null){var type=m[1].toUpperCase().replace(/\s+/g,' ');if(extras.indexOf(type)<0)extras.push(type)}
 var provider=String(source.group||'').trim(),normalizedProvider=normalizeText(provider);
 if(normalizedProvider==='khac'||normalizedProvider==='chua phan nhom')provider='';
 var label=provider;
 for(var i=0;i<extras.length;i++)label+=(label?' • ':'')+extras[i];
 return label||'Server '+index;
}
function buildEvents(channels,now){
 now=Number(now)||Date.now();var entries=[];
 for(var i=0;i<(channels||[]).length;i++){
  var ch=channels[i];if(!ch||!Array.isArray(ch.candidates))continue;
  var raw=String(ch.name||'').trim(),kickoff=kickoffOf(raw,now);
  if(!kickoff)continue;
  var matchText=cleanMatchName(raw,kickoffEndIndex(raw));
  var split=/\s+(?:vs?\.?|versus)\s+/i.exec(matchText);
  if(!split)continue;
  var home=matchText.substring(0,split.index).trim(),away=matchText.substring(split.index+split[0].length).trim();
  home=stripSuffix(home);away=stripSuffix(away);
  var hk=teamKey(home),ak=teamKey(away);if(!home||!away||!hk||!ak)continue;
  for(var ci=0;ci<ch.candidates.length;ci++){
   var candidate=ch.candidates[ci];if(!candidate||!candidate.url||!/^https?:\/\//i.test(candidate.url))continue;
   entries.push({raw:raw,kickoff:kickoff,markedLive:isLiveMarker(raw,ch.group),home:home,away:away,homeKey:hk,awayKey:ak,title:home+' vs '+away,sport:sportOf(raw,hk,ak),channel:ch,candidate:candidate});
  }
 }
 var fixtures=[];
 for(var e=0;e<entries.length;e++){var ent=entries[e],found=null;for(var f=0;f<fixtures.length;f++)if(sameFixture(fixtures[f],ent)){found=fixtures[f];break}
  if(!found){found={entries:[],kickoff:ent.kickoff,home:ent.home,away:ent.away,homeKey:ent.homeKey,awayKey:ent.awayKey,title:ent.title,sport:ent.sport};fixtures.push(found)}
  found.entries.push(ent);if(ent.kickoff<found.kickoff){found.kickoff=ent.kickoff}
 }
 var events=[];
 for(var fi=0;fi<fixtures.length;fi++){
  var fx=fixtures[fi],liveKickoff=0,sources=[],seen={};
  for(var q=0;q<fx.entries.length;q++){var ent2=fx.entries[q],age=now-ent2.kickoff;if(ent2.markedLive&&age>=-15*60000&&age<=8*60*60000){if(!liveKickoff||ent2.kickoff<liveKickoff)liveKickoff=ent2.kickoff}}
  if(!liveKickoff)continue;
  for(var si=0;si<fx.entries.length;si++){
   var en=fx.entries[si],age2=now-en.kickoff;
   if(isEnded(en.raw))continue;
   if(!((age2>=-15*60000&&age2<=180*60000)||(en.markedLive&&age2>=-15*60000&&age2<=8*60*60000)))continue;
   if(seen[en.candidate.url])continue;seen[en.candidate.url]=1;
   sources.push({url:en.candidate.url,name:fx.title,group:en.channel.group,logo:en.channel.logo||'',tvgId:en.channel.id||'',headers:en.candidate.headers||{},candidate:en.candidate,label:sourceLabel(en.channel,sources.length+1),rawName:en.raw});
  }
  if(!sources.length)continue;
  sources.sort(function(a,b){var al=0,bl=0;for(var n=0;n<fx.entries.length;n++){var en=fx.entries[n];if(en.candidate.url===a.url)al=(isLiveMarker(en.raw,en.channel.group)?2:0)+(en.channel.logo?1:0);if(en.candidate.url===b.url)bl=(isLiveMarker(en.raw,en.channel.group)?2:0)+(en.channel.logo?1:0)}return bl-al});
  var date=new Date(liveKickoff+7*60*60*1000),dateKey=date.getUTCFullYear()+'-'+('0'+(date.getUTCMonth()+1)).slice(-2)+'-'+('0'+date.getUTCDate()).slice(-2);
  var low=fx.homeKey<fx.awayKey?fx.homeKey:fx.awayKey,high=fx.homeKey<fx.awayKey?fx.awayKey:fx.homeKey;
  var id=dateKey+'|'+low+'_vs_'+high;
  events.push({id:id,title:fx.title,group:fx.sport,sport:fx.sport,kickoff:liveKickoff,sources:sources,logo:sources[0].logo||''});
 }
 events.sort(function(a,b){return b.kickoff-a.kickoff||a.title.localeCompare(b.title)});
 return events;
}
function parseFeed(text,now){return buildEvents(parseM3U(text,'https://thethaonm7.phuongnm7-iptv.workers.dev/playlist.m3u'),now)}
function diagnoseFeed(text,now){
 var channels=parseM3U(text,'https://thethaonm7.phuongnm7-iptv.workers.dev/playlist.m3u'),withKickoff=0,liveMarked=0,matchups=0,eligible=0;
 for(var i=0;i<channels.length;i++){
  var ch=channels[i]||{},raw=String(ch.name||''),kickoff=kickoffOf(raw,Number(now)||Date.now()),live=isLiveMarker(raw,ch.group),match=/\s+(?:vs?\.?|versus)\s+/i.test(raw);
  if(kickoff)withKickoff++;
  if(live)liveMarked++;
  if(match)matchups++;
  if(kickoff&&live&&match)eligible++;
 }
 return {channels:channels.length,withKickoff:withKickoff,liveMarked:liveMarked,matchups:matchups,eligible:eligible,events:buildEvents(channels,now).length};
}
var api={parseM3U:parseM3U,parseFeed:parseFeed,buildEvents:buildEvents,kickoffOf:kickoffOf,isLiveMarker:isLiveMarker,diagnoseFeed:diagnoseFeed};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.NM7LiveCore=api;
})(typeof window!=='undefined'?window:this);
