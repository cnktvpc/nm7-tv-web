(function(){
'use strict';
var KEY='nm7.tiktok.videos.v1',PLAYER_ORIGIN='https://www.tiktok.com';
var DEFAULT_VIDEO={id:'6718335390845095173',url:'https://www.tiktok.com/@scout2015/video/6718335390845095173',title:'Video mẫu TikTok'};
var state={active:false,videos:[],index:0,loadedId:'',oldHomeTitle:'',touchY:0,lastSwipeAt:0,playing:false};
function byId(id){return document.getElementById(id)}
function escapeHtml(value){return String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function setStatus(message){var el=byId('tiktokStatus');if(el)el.textContent=String(message||'')}
function validId(id){return /^[0-9]{10,25}$/.test(String(id||''))}
function parseVideoUrl(value){
 var raw=String(value||'').trim();
 if(!raw)return {error:'Hãy dán đường dẫn video TikTok.'};
 if(!/^https?:\/\//i.test(raw))raw='https://'+raw.replace(/^\/+/, '');
 var url;try{url=new URL(raw)}catch(e){return {error:'Đường dẫn không hợp lệ.'}}
 if(url.protocol!=='https:'&&url.protocol!=='http:')return {error:'Chỉ chấp nhận đường dẫn TikTok HTTP/HTTPS.'};
 var host=String(url.hostname||'').toLowerCase();
 if(host!=='tiktok.com'&&host!=='www.tiktok.com'&&host!=='m.tiktok.com'&&!host.endsWith('.tiktok.com'))return {error:'Đường dẫn phải thuộc tên miền TikTok chính thức.'};
 var match=url.pathname.match(/\/(?:@[^/]+\/)?video\/([0-9]{10,25})(?:\/|$)/i)||url.pathname.match(/\/player\/v1\/([0-9]{10,25})(?:\/|$)/i);
 if(!match||!validId(match[1]))return {error:'Link rút gọn chưa có ID video. Hãy mở link TikTok rồi sao chép URL đầy đủ dạng /@tên_tài_khoản/video/ID.'};
 var id=match[1],title='Video TikTok '+id.slice(-6),user=url.pathname.match(/\/@([^/]+)/);
 if(user)title='@'+user[1];
 return {id:id,url:'https://www.tiktok.com'+url.pathname,title:title};
}
function storeVideos(){try{localStorage.setItem(KEY,JSON.stringify(state.videos.slice(0,100)))}catch(e){setStatus('Không lưu được danh sách trên thiết bị này; video hiện tại vẫn dùng được.')}}
function readVideos(){
 try{
  var raw=localStorage.getItem(KEY);
  if(raw===null){state.videos=[DEFAULT_VIDEO];storeVideos();return}
  var parsed=JSON.parse(raw);
  state.videos=Array.isArray(parsed)?parsed.filter(function(v){return v&&validId(v.id)&&typeof v.url==='string'&&/^https:\/\/www\.tiktok\.com\//i.test(v.url)}).slice(0,100):[];
 }catch(e){state.videos=[DEFAULT_VIDEO]}
 if(state.index>=state.videos.length)state.index=Math.max(0,state.videos.length-1);
}
function current(){return state.videos[state.index]||null}
function playerUrl(video){return PLAYER_ORIGIN+'/player/v1/'+encodeURIComponent(video.id)+'?controls=1&description=1&music_info=0&autoplay=1&loop=0&rel=0&volume_control=1'}
function postPlayer(type,value){
 var frame=byId('tiktokFrame');if(!frame||!frame.contentWindow||!state.loadedId)return;
 var message={'x-tiktok-player':true,type:type};if(typeof value!=='undefined')message.value=value;
 try{frame.contentWindow.postMessage(message,PLAYER_ORIGIN)}catch(e){}
}
function updateControls(){
 var has=!!current(),multiple=state.videos.length>1;
 ['tiktokPrev','tiktokSwipePrev'].forEach(function(id){var el=byId(id);if(el)el.disabled=!multiple});
 ['tiktokNext','tiktokSwipeNext'].forEach(function(id){var el=byId(id);if(el)el.disabled=!multiple});
 ['tiktokToggle','tiktokOpen','tiktokRemove'].forEach(function(id){var el=byId(id);if(el)el.disabled=!has});
 var empty=byId('tiktokEmpty');if(empty)empty.classList.toggle('hidden',!!has);
 var frame=byId('tiktokFrame');if(frame)frame.style.visibility=has?'visible':'hidden';
}
function renderQueue(){
 var queue=byId('tiktokQueue');if(!queue)return;
 var html='';
 for(var i=0;i<state.videos.length;i++){
  var v=state.videos[i];
  html+='<button class="tiktok-queue-item" type="button" data-tiktok-index="'+i+'" aria-current="'+(i===state.index?'true':'false')+'" title="'+escapeHtml(v.title)+'">'+(i+1)+'. '+escapeHtml(v.title)+'</button>';
 }
 queue.innerHTML=html;
 Array.prototype.forEach.call(queue.querySelectorAll('[data-tiktok-index]'),function(button){
  button.addEventListener('click',function(){selectIndex(Number(this.getAttribute('data-tiktok-index')))});
 });
}
function loadCurrent(force){
 var frame=byId('tiktokFrame'),video=current();updateControls();renderQueue();if(!frame)return;
 if(!video){frame.src='about:blank';state.loadedId='';state.playing=false;setStatus('Chưa có video. Hãy dán link TikTok ở phía trên.');return}
 if(!state.active)return;
 if(!force&&state.loadedId===video.id)return;
 state.loadedId=video.id;state.playing=false;frame.title='TikTok: '+video.title;setStatus('Đang tải trình phát TikTok…');
 frame.src='about:blank';
 setTimeout(function(){if(!state.active||state.loadedId!==video.id)return;frame.src=playerUrl(video)},25);
}
function selectIndex(index){
 if(!state.videos.length)return;
 var n=Number(index);if(!isFinite(n))return;
 state.index=(n+state.videos.length)%state.videos.length;loadCurrent(true);
}
function next(){if(state.videos.length>1)selectIndex(state.index+1);else setStatus('Thêm video TikTok khác để chuyển video.')}
function previous(){if(state.videos.length>1)selectIndex(state.index-1);else setStatus('Thêm video TikTok khác để chuyển video.')}
function addFromInput(){
 var input=byId('tiktokUrl');if(!input)return;var parsed=parseVideoUrl(input.value);
 if(parsed.error){setStatus(parsed.error);return}
 var existing=state.videos.findIndex(function(v){return v.id===parsed.id});
 if(existing>=0){state.index=existing;input.value='';loadCurrent(true);setStatus('Video đã có trong danh sách; đã chuyển tới video đó.');return}
 if(state.videos.length>=100){setStatus('Danh sách đã đạt giới hạn 100 video. Hãy xóa bớt video trước khi thêm.');return}
 state.videos.push({id:parsed.id,url:parsed.url,title:parsed.title});state.index=state.videos.length-1;
 storeVideos();input.value='';loadCurrent(true);setStatus('Đã thêm video TikTok vào danh sách trên thiết bị này.');
}
function removeCurrent(){
 if(!current())return;var removed=current();state.videos.splice(state.index,1);
 if(state.index>=state.videos.length)state.index=Math.max(0,state.videos.length-1);
 storeVideos();state.loadedId='';state.playing=false;loadCurrent(true);setStatus('Đã xóa '+removed.title+' khỏi danh sách NM7.');
}
function openOriginal(){
 var v=current();if(!v)return;var opened=null;
 try{opened=window.open(v.url,'_blank','noopener,noreferrer')}catch(e){}
 if(!opened)window.location.href=v.url;
}
function enter(){
 if(state.active)return;
 if(window.NM7PlayerBridge&&typeof window.NM7PlayerBridge.openTikTok==='function')window.NM7PlayerBridge.openTikTok();
 state.active=true;
 var rows=byId('homeRows'),live=byId('liveView'),view=byId('tiktokView'),title=byId('homeTitle'),tab=byId('btnTikTokTab');
 if(rows)rows.classList.add('hidden');if(live)live.classList.add('hidden');if(view)view.classList.remove('hidden');
 if(title){state.oldHomeTitle=title.textContent||'';title.textContent='TikTok'}
 if(tab){tab.classList.add('tiktok-tab-active');tab.setAttribute('aria-pressed','true')}
 loadCurrent(true);
 setTimeout(function(){var target=byId('tiktokNext')||byId('tiktokAddBtn');if(target&&state.active&&target.focus)try{target.focus()}catch(e){}},30);
}
function leave(restoreFocus){
 if(!state.active)return;
 postPlayer('pause');state.active=false;
 var frame=byId('tiktokFrame');if(frame)frame.src='about:blank';state.loadedId='';state.playing=false;
 var rows=byId('homeRows'),live=byId('liveView'),view=byId('tiktokView'),title=byId('homeTitle'),tab=byId('btnTikTokTab');
 if(view)view.classList.add('hidden');if(rows)rows.classList.remove('hidden');if(live)live.classList.add('hidden');
 if(title)title.textContent=state.oldHomeTitle;
 if(tab){tab.classList.remove('tiktok-tab-active');tab.setAttribute('aria-pressed','false')}
 if(window.NM7PlayerBridge&&typeof window.NM7PlayerBridge.returnFromTikTok==='function')window.NM7PlayerBridge.returnFromTikTok();
 if(restoreFocus!==false){var target=byId('btnTikTokTab');if(target&&target.focus)try{target.focus()}catch(e){}}
}
function keyCode(e){
 var k=Number(e.keyCode||e.which||0),key=String(e.key||'').toLowerCase(),code=String(e.code||'').toLowerCase();
 if(key==='arrowleft'||key==='left'||code==='arrowleft'||key==='dpad_left'||k===21)return 37;
 if(key==='arrowup'||key==='up'||code==='arrowup'||key==='dpad_up'||k===19)return 38;
 if(key==='arrowright'||key==='right'||code==='arrowright'||key==='dpad_right'||k===22)return 39;
 if(key==='arrowdown'||key==='down'||code==='arrowdown'||key==='dpad_down'||k===20)return 40;
 if(key==='enter'||key==='select'||key==='ok'||key==='return'||key==='dpad_center'||k===23||k===66)return 13;
 if(key==='escape'||key==='esc')return 27;
 if(key==='back'||key==='backspace'||key==='browserback'||key==='browserbackspace'||k===4||k===8||k===461||k===10009)return 10009;
 return k;
}
function handleRemoteKey(e){
 if(!state.active||!e)return false;
 var k=keyCode(e),target=e.target||document.activeElement;
 if([37,38,39,40,13,27,10009,461,8].indexOf(k)<0)return false;
 if(k===27||k===10009||k===461||k===8){e.preventDefault();e.stopPropagation();leave(true);return true}
 if(target&&target.id==='tiktokUrl'){if(k===13){e.preventDefault();e.stopPropagation();addFromInput();return true}e.stopPropagation();return true}
 e.preventDefault();e.stopPropagation();
 if(k===38){next();return true}
 if(k===40){previous();return true}
 if(k===37){var p=byId('tiktokPrev');if(p)p.focus();return true}
 if(k===39){var n=byId('tiktokNext');if(n)n.focus();return true}
 if(k===13){if(target&&target.tagName==='BUTTON'){target.click();return true}postPlayer(state.playing?'pause':'play');return true}
 return true;
}
function bindSwipeRail(id){
 var rail=byId(id);if(!rail||rail.dataset.tiktokSwipeBound==='1')return;rail.dataset.tiktokSwipeBound='1';
 rail.addEventListener('touchstart',function(e){var t=e.touches&&e.touches[0];state.touchY=t?Number(t.clientY):0},{passive:true});
 rail.addEventListener('touchend',function(e){var t=e.changedTouches&&e.changedTouches[0];if(!t)return;var delta=state.touchY-Number(t.clientY);if(Math.abs(delta)<32)return;state.lastSwipeAt=Date.now();if(delta>0)next();else previous()},{passive:true});
 rail.addEventListener('click',function(){if(Date.now()-state.lastSwipeAt<500)return;if(id==='tiktokSwipeNext')next();else previous()});
}
function initialize(){
 var tab=byId('btnTikTokTab');if(tab)tab.addEventListener('click',enter);
 var form=byId('tiktokAddForm');if(form)form.addEventListener('submit',function(e){e.preventDefault();addFromInput()});
 var prev=byId('tiktokPrev'),nxt=byId('tiktokNext'),toggle=byId('tiktokToggle'),open=byId('tiktokOpen'),remove=byId('tiktokRemove'),home=byId('tiktokHomeBtn');
 if(prev)prev.addEventListener('click',previous);if(nxt)nxt.addEventListener('click',next);
 if(toggle)toggle.addEventListener('click',function(){postPlayer(state.playing?'pause':'play')});
 if(open)open.addEventListener('click',openOriginal);if(remove)remove.addEventListener('click',removeCurrent);
 if(home)home.addEventListener('click',function(){leave(true)});
 bindSwipeRail('tiktokSwipePrev');bindSwipeRail('tiktokSwipeNext');readVideos();renderQueue();updateControls();
 window.addEventListener('message',function(event){
  var frame=byId('tiktokFrame');if(!frame||event.origin!==PLAYER_ORIGIN||event.source!==frame.contentWindow)return;
  var data=event.data;if(!data||data['x-tiktok-player']!==true)return;
  if(data.type==='onPlayerReady')setStatus('Trình phát TikTok đã sẵn sàng. Nếu video chưa chạy, bấm Phát / tạm dừng trong trình phát.');
  else if(data.type==='onStateChange'&&Number(data.value)===1){state.playing=true;setStatus('Đang phát: '+(current()?current().title:'TikTok'))}
  else if(data.type==='onStateChange'&&Number(data.value)===2){state.playing=false;setStatus('Video đang tạm dừng.')}
  else if(data.type==='onPlayerError'){var detail=data.value&&data.value.errorType?String(data.value.errorType):'lỗi trình phát';setStatus('TikTok không phát được video ('+detail+'). Hãy thử video khác hoặc mở TikTok gốc.')}
 });
}
window.NM7TikTok={enter:enter,leave:leave,isActive:function(){return state.active},handleRemoteKey:handleRemoteKey,parseVideoUrl:parseVideoUrl};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize);else initialize();
})();