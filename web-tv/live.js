(function(){
'use strict';
var $=function(id){return document.getElementById(id)};
var REFRESH_MS=5*60*1000,ELAPSED_MS=60*1000,CACHE_KEY='nm7.live.raw.v1',FAV_KEY='nm7.live.favorites.v1',SERVER_KEY='nm7.live.servers.v1';
var state={active:false,loading:false,loaded:false,events:[],lastError:'',refreshTimer:null,elapsedTimer:null,dialog:false,dialogEventId:'',dialogFromPlayer:false,dialogFocus:0,lastFocus:null,scrollTop:0,activePlaybackEvent:null};
function readObject(key){try{var value=JSON.parse(localStorage.getItem(key)||'{}');return value&&typeof value==='object'?value:{}}catch(e){return {}}}
function writeObject(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch(e){}}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function core(){return window.NM7LiveCore||null}
function favorites(){return readObject(FAV_KEY)}
function servers(){return readObject(SERVER_KEY)}
function eventById(id){for(var i=0;i<state.events.length;i++)if(state.events[i].id===id)return state.events[i];return null}
function saveScroll(){var list=$('liveEvents');if(list)state.scrollTop=list.scrollTop}
function focusList(){var el=document.querySelector('#liveEvents [data-live-action="play"]');if(el){try{el.focus({preventScroll:true})}catch(e){el.focus()}}}
function enter(){
 if(state.active){refresh(true);return}
 state.active=true;state.lastFocus=document.activeElement;
 saveScroll();
 if(window.NM7PlayerBridge&&window.NM7PlayerBridge.setLiveActive)window.NM7PlayerBridge.setLiveActive(true);
 $('homeRows').classList.add('hidden');$('liveView').classList.remove('hidden');
 closeDialog(false);
 var cached='';try{cached=localStorage.getItem(CACHE_KEY)||''}catch(e){}
 if(cached&&core()){try{state.events=core().parseFeed(cached,Date.now());state.loaded=true;renderEvents();setStatus('Đang cập nhật feed Live độc lập…')}catch(e){}}
 if(!state.loaded){$('liveEvents').innerHTML='<div class="live-empty">Đang tải danh sách sự kiện Live…</div>';setStatus('Đang kết nối nguồn Live độc lập…')}
 refresh(false);
 clearTimers();state.refreshTimer=setInterval(function(){refresh(false)},REFRESH_MS);state.elapsedTimer=setInterval(updateElapsed,ELAPSED_MS);
 setTimeout(focusList,80);
}
function leave(restoreFocus){
 if(!state.active)return;
 saveScroll();state.active=false;state.activePlaybackEvent=null;closeDialog(false);clearTimers();
 $('liveView').classList.add('hidden');$('homeRows').classList.remove('hidden');
 if(window.NM7PlayerBridge&&window.NM7PlayerBridge.setLiveActive)window.NM7PlayerBridge.setLiveActive(false);
 if(restoreFocus!==false){var target=$('btnLiveTab');if(target){try{target.focus()}catch(e){}}}
}
function clearTimers(){if(state.refreshTimer){clearInterval(state.refreshTimer);state.refreshTimer=null}if(state.elapsedTimer){clearInterval(state.elapsedTimer);state.elapsedTimer=null}}
function setStatus(s){var el=$('liveStatus');if(el)el.textContent=s||''}
function refresh(manual){
 if(state.loading){if(manual)setStatus('Đang cập nhật feed Live…');return}
 state.loading=true;
 var b=$('liveRefresh');if(b)b.disabled=true;
 if(manual)setStatus('Đang tải dữ liệu Live mới…');
 var url='/api/live-feed?_nm7_refresh='+Date.now();
 fetch(url,{method:'GET',cache:'no-store',credentials:'same-origin',headers:{'Accept':'application/vnd.apple.mpegurl,text/plain,*/*','Cache-Control':'no-cache'}})
 .then(function(response){if(!response.ok)throw new Error('HTTP '+response.status);return response.text()})
 .then(function(text){
  if(!/^\s*#EXTM3U/i.test(String(text||'').replace(/^\uFEFF/,'')))throw new Error('Nguồn không trả về M3U hợp lệ');
  var c=core();if(!c)throw new Error('Thiếu bộ phân tích Live');
  var next=c.parseFeed(text,Date.now());
  state.events=next;state.loaded=true;state.lastError='';
  if(text.length<1800000){try{localStorage.setItem(CACHE_KEY,text)}catch(e){}}
  renderEvents();
  var diagnostics=c.diagnoseFeed?c.diagnoseFeed(text,Date.now()):null;
  setStatus(next.length?'Nguồn Live độc lập · '+next.length+' sự kiện · tự làm mới mỗi 5 phút':(diagnostics?'Feed đã tải nhưng chưa nhận diện được sự kiện LIVE · '+diagnostics.channels+' mục · '+diagnostics.withKickoff+' có giờ · '+diagnostics.liveMarked+' có dấu LIVE · '+diagnostics.matchups+' có cặp đấu':'Feed đã cập nhật · hiện không có sự kiện được xác định là đang LIVE'));
 })
 .catch(function(err){
  state.lastError=String(err&&err.message||err||'Lỗi không xác định');
  if(state.loaded&&state.events.length){setStatus('Đang dùng cache Live gần nhất · sẽ thử lại sau 5 phút');renderEvents()}
  else {setStatus('Không tải được feed Live · '+state.lastError);$('liveEvents').innerHTML='<div class="live-empty">Không tải được danh sách Live. Kiểm tra kết nối rồi bấm “Làm mới”.</div>'}
 })
 .then(function(){state.loading=false;if(b)b.disabled=false});
}
function sourceCandidates(sources){
 var out=[];for(var i=0;i<sources.length;i++){var s=sources[i],c=s.candidate||{};if(!s.url)continue;
  out.push({url:s.url,ref:c.ref||'',ua:c.ua||'',headers:c.headers||s.headers||{},type:c.type||'',dash:!!c.dash,hls:!!c.hls,drm:c.drm||null,forceProxy:!!c.forceProxy,mime:c.mime||''});
 }return out;
}
function channelForEvent(ev){
 if(!ev||!ev.sources||!ev.sources.length)return null;
 var preferred=servers()[ev.id]||'',sources=ev.sources.slice(),ix=-1;
 for(var i=0;i<sources.length;i++)if(sources[i].url===preferred){ix=i;break}
 if(ix>0)sources.unshift(sources.splice(ix,1)[0]);
 var candidates=sourceCandidates(sources),first=candidates[0];
 if(!first)return null;
 return {id:ev.id,name:ev.title,group:'LIVE',logo:ev.logo||sources[0].logo||'',url:first.url,ref:first.ref,ua:first.ua,headers:first.headers,candidates:candidates,liveEventId:ev.id,liveSources:ev.sources};
}
function playbackChannels(){var out=[];for(var i=0;i<state.events.length;i++){var c=channelForEvent(state.events[i]);if(c)out.push(c)}return out}
function play(id){
 var ev=eventById(id);if(!ev||!window.NM7PlayerBridge||!window.NM7PlayerBridge.playLive){setStatus('Trình phát LIVE chưa sẵn sàng');return}
 window.NM7PlayerBridge.playLive(id);
}
function renderEvents(){
 if(!state.active&&!state.loaded)return;
 var host=$('liveEvents');if(!host)return;
 var list=state.events,html='',favs=favorites(),preferred=servers();
 if(!list.length){host.innerHTML='<div class="live-empty">Không có sự kiện LIVE phù hợp ở thời điểm hiện tại.</div>';return}
 for(var i=0;i<list.length;i++){
  var ev=list[i],logo=ev.logo||'',fav=!!favs[ev.id],selected=preferred[ev.id]||'';
  var chosen=ev.sources.filter(function(s){return s.url===selected})[0]||ev.sources[0];
  html+='<article class="live-row" data-event-id="'+esc(ev.id)+'" data-live-row="'+i+'">';
  html+='<div class="live-logo">'+(logo?'<img src="'+esc(logo)+'" loading="lazy" alt="">':'<span>LIVE</span>')+'</div>';
  html+='<div class="live-info"><div class="live-event-title">'+esc(ev.title)+'</div><div class="live-subtitle">⚽ LIVE · '+esc(ev.sport||'Thể thao')+' · '+ev.sources.length+' server</div><div class="live-detail"><span data-live-duration="'+esc(ev.id)+'">'+elapsedLabel(ev)+'</span><span class="live-selected-server">Server: '+esc(chosen.label||'Server 1')+'</span></div></div>';
  html+='<div class="live-actions"><button type="button" class="live-action live-play" data-live-action="play" data-live-row="'+i+'" data-live-col="0" aria-label="Phát '+esc(ev.title)+'">▶ Phát</button>';
  html+='<button type="button" class="live-action" data-live-action="servers" data-live-row="'+i+'" data-live-col="1" aria-label="Chọn server cho '+esc(ev.title)+'">Server ('+ev.sources.length+')</button>';
  html+='<button type="button" class="live-action live-fav" data-live-action="favorite" data-live-row="'+i+'" data-live-col="2" aria-pressed="'+(fav?'true':'false')+'" aria-label="'+(fav?'Bỏ yêu thích ':'Thêm yêu thích ')+esc(ev.title)+'">'+(fav?'♥ Đã thích':'♡ Yêu thích')+'</button></div></article>';
 }
 host.innerHTML=html;
 var buttons=host.querySelectorAll('[data-live-action]');
 for(var j=0;j<buttons.length;j++)buttons[j].addEventListener('click',onAction);
 if(state.scrollTop){host.scrollTop=state.scrollTop}
}
function elapsedLabel(ev){var mins=Math.max(0,Math.floor((Date.now()-ev.kickoff)/60000));return 'Đã live '+mins+' phút'}
function updateElapsed(){var nodes=document.querySelectorAll('[data-live-duration]');for(var i=0;i<nodes.length;i++){var ev=eventById(nodes[i].getAttribute('data-live-duration'));if(ev)nodes[i].textContent=elapsedLabel(ev)}}
function onAction(e){
 var b=e.currentTarget,id=String(b.closest('.live-row').getAttribute('data-event-id')||''),kind=b.getAttribute('data-live-action');
 if(kind==='play'){play(id);return}
 if(kind==='servers'){openServerDialog(id,false);return}
 if(kind==='favorite'){
  var f=favorites();if(f[id])delete f[id];else f[id]=true;writeObject(FAV_KEY,f);
  b.setAttribute('aria-pressed',f[id]?'true':'false');b.textContent=f[id]?'♥ Đã thích':'♡ Yêu thích';b.setAttribute('aria-label',(f[id]?'Bỏ yêu thích ':'Thêm yêu thích ')+eventById(id).title);return
 }
}
function openServerDialog(id,fromPlayer){
 var ev=(fromPlayer&&state.activePlaybackEvent&&state.activePlaybackEvent.id===id)?state.activePlaybackEvent:eventById(id);if(!ev||!ev.sources.length)return;
 state.dialog=true;state.dialogEventId=id;state.dialogFromPlayer=!!fromPlayer;state.dialogFocus=0;
 var chosen=servers()[id]||'',html='<div class="live-dialog-shade"><section class="live-dialog-panel" role="dialog" aria-modal="true" aria-label="Chọn server LIVE"><h2>Chọn server · '+esc(ev.title)+'</h2><p>Chọn một nguồn phát cho sự kiện này.</p><div class="live-dialog-options">';
 for(var i=0;i<ev.sources.length;i++){var s=ev.sources[i],host='';try{host=new URL(s.url).hostname}catch(e){}var selected=s.url===chosen;html+='<button type="button" class="live-dialog-choice" data-live-server-index="'+i+'" aria-pressed="'+(selected?'true':'false')+'">'+esc(s.label||('Server '+(i+1)))+' · '+esc(host)+(selected?' ✓':'')+'</button>'}
 html+='</div><div class="live-dialog-footer"><button type="button" class="live-dialog-cancel">Đóng</button></div></section></div>';
 var root=$('liveDialog');root.innerHTML=html;root.classList.remove('hidden');
 var choices=root.querySelectorAll('.live-dialog-choice');
 for(var j=0;j<choices.length;j++)choices[j].addEventListener('click',onServerChoice);
 var close=root.querySelector('.live-dialog-cancel');close.addEventListener('click',function(){closeDialog(true)});
 var desired=0;for(var z=0;z<ev.sources.length;z++)if(ev.sources[z].url===chosen)desired=z;
 state.dialogFocus=desired;
 setTimeout(function(){var b=root.querySelector('[data-live-server-index="'+desired+'"]');if(b)b.focus()},0);
}
function onServerChoice(e){
 var b=e.currentTarget,index=Number(b.getAttribute('data-live-server-index')),id=state.dialogEventId,fromPlayer=state.dialogFromPlayer;
 var ev=(fromPlayer&&state.activePlaybackEvent&&state.activePlaybackEvent.id===id)?state.activePlaybackEvent:eventById(id);
 if(!ev||!ev.sources[index])return;
 var url=ev.sources[index].url,store=servers();store[id]=url;writeObject(SERVER_KEY,store);
 closeDialog(false);renderEvents();
 if(fromPlayer&&window.NM7PlayerBridge&&window.NM7PlayerBridge.selectLiveServer)window.NM7PlayerBridge.selectLiveServer(url);
 else play(id);
}
function closeDialog(restore){
 var wasPlayer=state.dialogFromPlayer;
 state.dialog=false;state.dialogEventId='';state.dialogFromPlayer=false;
 var root=$('liveDialog');if(root){root.classList.add('hidden');root.innerHTML=''}
 if(restore!==false){if(wasPlayer&&window.NM7PlayerBridge&&window.NM7PlayerBridge.playerFocus)window.NM7PlayerBridge.playerFocus();else if(state.active)focusNearest()}
}
function focusNearest(){
 var el=document.activeElement;if(el&&el.getAttribute&&el.getAttribute('data-live-action'))return;
 var candidates=document.querySelectorAll('#liveEvents [data-live-action]');if(candidates.length){try{candidates[0].focus()}catch(e){}}
}
function isDialogOpen(){return !!state.dialog}
function handleRemoteKey(e,k){
 if(state.dialog){
  e.preventDefault();e.stopPropagation();
  if(k===27||k===8||k===461||k===10009){closeDialog(true);return true}
  var choices=$('liveDialog').querySelectorAll('.live-dialog-choice,.live-dialog-cancel');
  if(k===37||k===38)state.dialogFocus=Math.max(0,state.dialogFocus-1);
  else if(k===39||k===40)state.dialogFocus=Math.min(choices.length-1,state.dialogFocus+1);
  else if(k===13){if(choices[state.dialogFocus])choices[state.dialogFocus].click();return true}
  if(choices[state.dialogFocus])choices[state.dialogFocus].focus();return true;
 }
 if(state.active&&!state.dialog){
  e.preventDefault();e.stopPropagation();
  if(k===27||k===8||k===461||k===10009){leave(true);return true}
  var rowCount=state.events.length,active=document.activeElement;
  if(active===$('liveRefresh')){if(k===13)refresh(true);else if(k===40)focusList();return true}
  var ri=Number(active&&active.getAttribute&&active.getAttribute('data-live-row')),ci=Number(active&&active.getAttribute&&active.getAttribute('data-live-col'));
  if(k===38&&ri===0){var refreshControl=$('liveRefresh');if(refreshControl){refreshControl.focus();return true}}
  if(!isFinite(ri)||!active||!active.hasAttribute||!active.hasAttribute('data-live-action')){ri=0;ci=0}
  if(k===37)ci=Math.max(0,ci-1);
  else if(k===39)ci=Math.min(2,ci+1);
  else if(k===38)ri=Math.max(0,ri-1);
  else if(k===40)ri=Math.min(Math.max(0,rowCount-1),ri+1);
  else if(k===13){if(active&&active.click)active.click();else focusList();return true}
  var target=document.querySelector('#liveEvents [data-live-row="'+ri+'"][data-live-col="'+ci+'"]');
  if(target){target.focus();target.scrollIntoView({block:'nearest',inline:'nearest'})}return true;
 }
 return false;
}
function onPlayerStarted(id){state.activePlaybackEvent=eventById(String(id||''))}
function openPlayerServerPicker(){
 var id='';
 try{var bridge=window.NM7PlayerBridge;if(bridge&&bridge.currentLiveEventId)id=bridge.currentLiveEventId()}catch(e){}
 if(!id&&state.events.length)id=state.events[0].id;
 openServerDialog(id,true);
}
function onPlayerClosed(){state.activePlaybackEvent=null;if(state.active){$('liveView').classList.remove('hidden');$('homeRows').classList.add('hidden');renderEvents();setTimeout(focusList,60)}}
function onMenuClosed(){if(state.active)setTimeout(focusList,0)}
function startup(){
 var tab=$('btnLiveTab');if(tab)tab.addEventListener('click',enter);
 var refreshBtn=$('liveRefresh');if(refreshBtn)refreshBtn.addEventListener('click',function(){refresh(true)});
 document.addEventListener('visibilitychange',function(){if(!document.hidden&&state.active)refresh(false)});
}
window.NM7LiveUI={enter:enter,leave:leave,refresh:refresh,handleRemoteKey:handleRemoteKey,isDialogOpen:isDialogOpen,openPlayerServerPicker:openPlayerServerPicker,onPlayerStarted:onPlayerStarted,onPlayerClosed:onPlayerClosed,onMenuClosed:onMenuClosed,eventById:eventById,channelForEvent:channelForEvent,playbackChannels:playbackChannels};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startup);else startup();
})();