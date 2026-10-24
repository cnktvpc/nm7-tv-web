(function(){
'use strict';
var KEY='nm7.tiktok.videos.v1';
var PLAYER_ORIGIN='https://www.tiktok.com';
var DEFAULT_VIDEO={id:'6718335390845095173',url:'https://www.tiktok.com/@scout2015/video/6718335390845095173',title:'Video mẫu TikTok',description:'Video mẫu để thử thao tác vuốt. Thêm link TikTok công khai vào danh sách để cá nhân hóa gợi ý.'};
var state={active:false,mobile:false,videos:[],accountVideos:[],profile:null,authenticated:false,configured:false,missingConfig:[],index:0,mode:'recommend',loadedId:'',oldHomeTitle:'',touchStart:null,playing:false,muted:false,accountLoading:false};
function byId(id){return document.getElementById(id)}
function escapeHtml(value){return String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function setStatus(message){var el=byId('tiktokStatus');if(el)el.textContent=String(message||'')}
function setMobileNotice(title,copy,docs){
 var wrap=byId('tiktokMobileNotice'),heading=byId('tiktokMobileNoticeTitle'),body=byId('tiktokMobileNoticeCopy'),docsButton=byId('tiktokSetupDocs');
 if(heading)heading.textContent=title||'TikTok';
 if(body)body.textContent=copy||'';
 if(docsButton)docsButton.style.display=docs===false?'none':'';
 if(wrap)wrap.classList.remove('hidden');
}
function closeMobileNotice(){var wrap=byId('tiktokMobileNotice');if(wrap)wrap.classList.add('hidden')}
function isMobileDevice(){
 if(document.body&&document.body.classList.contains('mobile-mode'))return true;
 try{return !!(window.matchMedia&&window.matchMedia('(pointer: coarse)').matches&&Math.max(screen.width||0,screen.height||0)<=1200)}catch(e){return false}
}
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
 return {id:id,url:'https://www.tiktok.com'+url.pathname,title:title,description:''};
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
function videoList(){return state.mode==='account'?state.accountVideos:state.videos}
function current(){var list=videoList();return list[state.index]||null}
function playerUrl(video){
 var params=state.mobile?'controls=0&description=0&music_info=0&volume_control=0&fullscreen_button=0&progress_bar=0&play_button=0&autoplay=1&loop=0&rel=1':'controls=1&description=1&music_info=0&autoplay=1&loop=0&rel=1&volume_control=1';
 return PLAYER_ORIGIN+'/player/v1/'+encodeURIComponent(video.id)+'?'+params;
}
function postPlayer(type,value){
 var frame=byId('tiktokFrame');if(!frame||!frame.contentWindow||!state.loadedId)return;
 var message={'x-tiktok-player':true,type:type};if(typeof value!=='undefined')message.value=value;
 try{frame.contentWindow.postMessage(message,PLAYER_ORIGIN)}catch(e){}
}
function updateControls(){
 var has=!!current(),multiple=videoList().length>1;
 ['tiktokPrev','tiktokSwipePrev'].forEach(function(id){var el=byId(id);if(el)el.disabled=!multiple});
 ['tiktokNext','tiktokSwipeNext'].forEach(function(id){var el=byId(id);if(el)el.disabled=!multiple});
 var remove=byId('tiktokRemove');if(remove){remove.disabled=!has||state.mode==='account';remove.textContent=state.mode==='account'?'Lưu vào Đề xuất':'Xóa video'}
 ['tiktokToggle','tiktokOpen'].forEach(function(id){var el=byId(id);if(el)el.disabled=!has});
 var empty=byId('tiktokEmpty');if(empty){empty.classList.toggle('hidden',!!has);if(!has)empty.innerHTML=state.mode==='account'?'Chưa có video tài khoản. Đăng nhập TikTok để tải danh sách video của bạn.':'Chưa có video. Hãy dán link TikTok ở phía trên.'}
 var frame=byId('tiktokFrame');if(frame)frame.style.visibility=has?'visible':'hidden';
 var mobilePlay=byId('tiktokMobilePlay');if(mobilePlay){mobilePlay.textContent=state.playing?'Ⅱ':'▶';mobilePlay.setAttribute('aria-label',state.playing?'Tạm dừng':'Phát')}
 var mobileMute=byId('tiktokMobileMute');if(mobileMute){mobileMute.textContent=state.muted?'🔇':'🔊';mobileMute.setAttribute('aria-label',state.muted?'Bật tiếng':'Tắt tiếng')}
 var login=byId('tiktokMobileLogin');if(login)login.textContent=state.authenticated?'Tài khoản ✓':'Đăng nhập';
 var recommendTab=byId('tiktokModeRecommend'),accountTab=byId('tiktokModeAccount');
 if(recommendTab)recommendTab.setAttribute('aria-selected',state.mode!=='account'?'true':'false');
 if(accountTab)accountTab.setAttribute('aria-selected',state.mode==='account'?'true':'false');
 var creator=byId('tiktokMobileCreatorName'),description=byId('tiktokMobileDescription'),avatar=byId('tiktokMobileAvatar');
 var video=current();
 if(creator)creator.textContent=state.mode==='account'&&state.profile?('@'+(state.profile.display_name||'TikTok')):((video&&video.title&&video.title.charAt(0)==='@')?video.title:'@TikTok');
 if(description)description.textContent=video?(video.description||video.title||'Video TikTok'):state.mode==='account'?'Đăng nhập TikTok để hiển thị các video công khai của tài khoản bạn.':'Thêm link video TikTok công khai để tạo danh sách gợi ý riêng.';
 if(avatar){
  avatar.innerHTML='';
  if(state.mode==='account'&&state.profile&&state.profile.avatar_url){var img=document.createElement('img');img.src=state.profile.avatar_url;img.alt='';avatar.appendChild(img)}
  else avatar.textContent='♪';
 }
}
function renderQueue(){
 var queue=byId('tiktokQueue');if(!queue)return;
 var list=videoList(),html='';
 for(var i=0;i<list.length;i++){
  var v=list[i];html+='<button class="tiktok-queue-item" type="button" data-tiktok-index="'+i+'" aria-current="'+(i===state.index?'true':'false')+'" title="'+escapeHtml(v.title)+'">'+(i+1)+'. '+escapeHtml(v.title)+'</button>';
 }
 queue.innerHTML=html;
 Array.prototype.forEach.call(queue.querySelectorAll('[data-tiktok-index]'),function(button){button.addEventListener('click',function(){selectIndex(Number(this.getAttribute('data-tiktok-index')))});});
}
function renderModeButtons(){
 var mode=state.mode;
 Array.prototype.forEach.call(document.querySelectorAll('.tiktok-mobile-mode'),function(button){button.setAttribute('aria-selected',button.id===(mode==='account'?'tiktokModeAccount':'tiktokModeRecommend')?'true':'false')});
 Array.prototype.forEach.call(document.querySelectorAll('.tiktok-mobile-nav-button'),function(button){button.classList.toggle('active',(mode==='account'&&button.id==='tiktokNavAccount')||(mode!=='account'&&button.id==='tiktokNavHome'))});
}
function loadCurrent(force){
 var frame=byId('tiktokFrame'),video=current();updateControls();renderQueue();renderModeButtons();if(!frame)return;
 if(!video){frame.src='about:blank';frame.style.pointerEvents=state.mobile?'none':'auto';state.loadedId='';state.playing=false;setStatus(state.mode==='account'?'Đăng nhập TikTok để tải video tài khoản.':'Chưa có video. Hãy thêm link TikTok để tạo gợi ý.');return}
 if(!state.active)return;
 if(!force&&state.loadedId===video.id)return;
 state.loadedId=video.id;state.playing=false;state.muted=false;frame.title='TikTok: '+(video.title||video.id);setStatus('Đang tải video TikTok…');
 frame.style.pointerEvents=state.mobile?'none':'auto';
 frame.src='about:blank';
 setTimeout(function(){if(!state.active||state.loadedId!==video.id)return;frame.src=playerUrl(video)},30);
}
function selectIndex(index){
 var list=videoList();if(!list.length)return;
 var n=Number(index);if(!isFinite(n))return;
 state.index=(n+list.length)%list.length;loadCurrent(true);
}
function next(){var list=videoList();if(list.length>1)selectIndex(state.index+1);else setStatus(state.mode==='account'?'Tài khoản chỉ có một video được API trả về.':'Thêm video khác để chuyển bài bằng cách vuốt lên/xuống.')}
function previous(){var list=videoList();if(list.length>1)selectIndex(state.index-1);else setStatus(state.mode==='account'?'Tài khoản chỉ có một video được API trả về.':'Thêm video khác để chuyển bài bằng cách vuốt lên/xuống.')}
function openAddSheet(){var sheet=byId('tiktokAddSheet');if(sheet){sheet.classList.remove('hidden');setTimeout(function(){var input=byId('tiktokUrlMobile');if(input)input.focus()},50)}else{var input=byId('tiktokUrl');if(input)input.focus()}}
function closeAddSheet(){var sheet=byId('tiktokAddSheet');if(sheet)sheet.classList.add('hidden')}
function addFromInput(input){
 input=input||byId('tiktokUrl');
 if(!input)return;
 var parsed=parseVideoUrl(input.value);
 if(parsed.error){setStatus(parsed.error);if(state.mobile)setMobileNotice('Không thêm được video',parsed.error,false);return}
 var existing=state.videos.findIndex(function(v){return v.id===parsed.id});
 if(existing>=0){state.mode='recommend';state.index=existing;input.value='';closeAddSheet();loadCurrent(true);setStatus('Video đã có trong danh sách gợi ý.');return}
 if(state.videos.length>=100){setStatus('Danh sách đã đạt giới hạn 100 video. Hãy xóa bớt video trước khi thêm.');return}
 state.videos.push({id:parsed.id,url:parsed.url,title:parsed.title,description:parsed.description||''});
 state.mode='recommend';state.index=state.videos.length-1;storeVideos();input.value='';closeAddSheet();loadCurrent(true);setStatus('Đã thêm video vào danh sách gợi ý của thiết bị này.');
}
function removeCurrent(){
 var list=videoList(),video=current();if(!video)return;
 if(state.mode==='account'){saveCurrent();return}
 state.videos.splice(state.index,1);if(state.index>=state.videos.length)state.index=Math.max(0,state.videos.length-1);
 storeVideos();state.loadedId='';state.playing=false;loadCurrent(true);setStatus('Đã xóa video khỏi danh sách gợi ý NM7.');
}
function saveCurrent(){
 var video=current();if(!video)return;
 if(state.videos.some(function(v){return v.id===video.id})){setStatus('Video đã nằm trong danh sách gợi ý/đã lưu.');return}
 if(state.videos.length>=100){setStatus('Danh sách đã đạt 100 video.');return}
 state.videos.push({id:video.id,url:video.url||('https://www.tiktok.com/@/video/'+video.id),title:video.title||('TikTok '+video.id),description:video.description||''});
 storeVideos();setStatus('Đã lưu video vào danh sách Đề xuất trên thiết bị này.');
}
function openOriginal(){
 var v=current();if(!v)return;var opened=null;
 try{opened=window.open(v.url||('https://www.tiktok.com/player/v1/'+v.id),'_blank')}catch(e){}
 if(opened){try{opened.opener=null}catch(e){}return}
 window.location.href=v.url||('https://www.tiktok.com/player/v1/'+v.id);
}
function openOriginalAction(){openOriginal()}
async function shareCurrent(){
 var v=current();if(!v)return;var url=v.url||('https://www.tiktok.com/player/v1/'+v.id);
 try{if(navigator.share){await navigator.share({title:v.title||'TikTok',text:v.description||'Video TikTok',url:url});return}}catch(e){if(e&&e.name==='AbortError')return}
 try{if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(url);setStatus('Đã sao chép link TikTok.');return}}catch(e){}
 openOriginal();
}
function togglePlayback(){
 if(!current())return;
 var nextType=state.playing?'pause':'play';postPlayer(nextType);
 state.playing=!state.playing;updateControls();
}
function toggleMute(){
 if(!current())return;state.muted=!state.muted;postPlayer(state.muted?'mute':'unMute');updateControls();
}
async function fullscreen(){
 var el=byId('tiktokFrameWrap');if(!el)return;
 try{if(document.fullscreenElement){await document.exitFullscreen();return}if(el.requestFullscreen)await el.requestFullscreen();else if(byId('tiktokFrame')&&byId('tiktokFrame').requestFullscreen)await byId('tiktokFrame').requestFullscreen();else setStatus('Trình duyệt không hỗ trợ toàn màn hình.')}catch(e){setStatus('Không mở được toàn màn hình trên trình duyệt này.')}
}
async function getSession(){
 try{
  var response=await fetch('/api/tiktok/session',{credentials:'same-origin',cache:'no-store'});
  var data=await response.json();
  state.configured=!!data.configured;state.missingConfig=Array.isArray(data.missing)?data.missing:[];
  state.authenticated=!!data.authenticated;state.profile=data.profile||null;updateControls();
  return data;
 }catch(e){state.configured=false;state.authenticated=false;updateControls();return {configured:false,authenticated:false,error:'network'}}
}
async function loginTikTok(){
 var data=await getSession();
 if(!data.configured){
  var missing=(data.missing||[]).join(', ')||'TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_SESSION_SECRET';
  setMobileNotice('Chưa cấu hình đăng nhập TikTok','Đăng nhập chưa thể chạy trước khi cấu hình TikTok Login Kit trên Worker. Cần đặt secrets: '+missing+'. Redirect URI phải đăng ký chính xác trong TikTok Developer Portal. NM7 không yêu cầu hoặc lưu mật khẩu TikTok của bạn.',true);
  setStatus('Cần cấu hình TikTok Login Kit/Display API trên Worker.');
  return;
 }
 window.location.href='/api/tiktok/oauth/start';
}
async function loadAccountVideos(){
 if(state.accountLoading)return;
 var session=await getSession();
 if(!session.authenticated){
  if(!session.configured){await loginTikTok();return}
  await loginTikTok();return;
 }
 state.accountLoading=true;setStatus('Đang tải video công khai từ tài khoản TikTok…');
 try{
  var response=await fetch('/api/tiktok/videos',{credentials:'same-origin',cache:'no-store'});
  var data=await response.json();
  if(!response.ok)throw new Error(data.message||data.error||'Không tải được video tài khoản');
  state.accountVideos=(data.videos||[]).filter(function(v){return validId(v.id)}).map(function(v){
   return {id:String(v.id),url:v.share_url||('https://www.tiktok.com/player/v1/'+v.id),title:(v.title||'').trim()||('Video TikTok '+String(v.id).slice(-6)),description:(v.video_description||v.title||'').trim(),cover_image_url:v.cover_image_url||'',embed_link:v.embed_link||''};
  });
  state.mode='account';state.index=0;state.loadedId='';loadCurrent(true);
  setStatus(state.accountVideos.length?'Đã tải '+state.accountVideos.length+' video công khai gần đây của tài khoản.':'Tài khoản chưa có video công khai được Display API trả về.');
 }catch(e){setStatus('Không tải được video tài khoản TikTok: '+String(e.message||e));}
 finally{state.accountLoading=false;updateControls()}
}
function switchMode(mode){
 if(mode==='account'){loadAccountVideos();return}
 state.mode='recommend';state.index=0;loadCurrent(true);
 setStatus('Đề xuất từ danh sách video bạn đã thêm/lưu trên thiết bị.'); 
}
function isRelevantGestureTarget(target){
 if(!target)return false;
 return !!(target.closest&&(target.closest('[data-no-gesture]')||target.closest('#tiktokMobileHeader')||target.closest('#tiktokMobileNav')||target.closest('#tiktokAddSheet')||target.closest('#tiktokMobileNotice')));
}
function bindGestureLayer(){
 var layer=byId('tiktokGestureLayer');if(!layer||layer.dataset.bound==='1')return;layer.dataset.bound='1';
 var start=null;
 layer.addEventListener('pointerdown',function(e){
  if(!state.active||!state.mobile||isRelevantGestureTarget(e.target))return;
  start={x:e.clientX,y:e.clientY,time:Date.now(),pointerId:e.pointerId};
  try{layer.setPointerCapture(e.pointerId)}catch(_){}
 },{passive:true});
 layer.addEventListener('pointerup',function(e){
  if(!state.active||!state.mobile||!start)return;
  var s=start;start=null;
  if(isRelevantGestureTarget(e.target))return;
  var dx=e.clientX-s.x,dy=e.clientY-s.y,elapsed=Date.now()-s.time;
  if(Math.abs(dy)>54&&Math.abs(dy)>Math.abs(dx)*1.15){if(dy<0)next();else previous();return}
  if(Math.abs(dx)>58&&Math.abs(dx)>Math.abs(dy)*1.2){if(dx<0)next();else previous();return}
  if(Math.abs(dx)<22&&Math.abs(dy)<22&&elapsed<550)togglePlayback();
 },{passive:true});
 layer.addEventListener('pointercancel',function(){start=null},{passive:true});
 layer.addEventListener('touchmove',function(e){if(state.active&&state.mobile&&start&&e.cancelable)e.preventDefault()},{passive:false});
 layer.addEventListener('click',function(e){if(!state.active||!state.mobile||isRelevantGestureTarget(e.target))return;e.preventDefault();e.stopPropagation()});
}
function bindSwipeRail(id){
 var rail=byId(id);if(!rail||rail.dataset.tiktokSwipeBound==='1')return;rail.dataset.tiktokSwipeBound='1';
 var touchY=0,lastSwipeAt=0;
 rail.addEventListener('touchstart',function(e){var t=e.touches&&e.touches[0];touchY=t?Number(t.clientY):0},{passive:true});
 rail.addEventListener('touchend',function(e){var t=e.changedTouches&&e.changedTouches[0];if(!t)return;var delta=touchY-Number(t.clientY);if(Math.abs(delta)<32)return;lastSwipeAt=Date.now();if(delta>0)next();else previous()},{passive:true});
 rail.addEventListener('click',function(){if(Date.now()-lastSwipeAt<500)return;if(id==='tiktokSwipeNext')next();else previous()});
}
function handleRemoteKey(e){
 if(!state.active||!e)return false;
 var k=Number(e.keyCode||e.which||0),key=String(e.key||'').toLowerCase(),code=String(e.code||'').toLowerCase();
 if(key==='arrowup'||key==='up'||code==='arrowup'||k===19){e.preventDefault();e.stopPropagation();next();return true}
 if(key==='arrowdown'||key==='down'||code==='arrowdown'||k===20){e.preventDefault();e.stopPropagation();previous();return true}
 if(key==='escape'||key==='esc'||key==='back'||key==='backspace'||k===4||k===8||k===27||k===461||k===10009){e.preventDefault();e.stopPropagation();leave(true);return true}
 if(key==='enter'||key==='select'||k===13||k===23){e.preventDefault();e.stopPropagation();togglePlayback();return true}
 if(key==='arrowleft'||key==='left'||k===21){e.preventDefault();e.stopPropagation();previous();return true}
 if(key==='arrowright'||key==='right'||k===22){e.preventDefault();e.stopPropagation();next();return true}
 return false;
}
function enter(){
 if(state.active)return;
 if(window.NM7PlayerBridge&&typeof window.NM7PlayerBridge.openTikTok==='function')window.NM7PlayerBridge.openTikTok();
 state.active=true;state.mobile=isMobileDevice();
 var rows=byId('homeRows'),live=byId('liveView'),view=byId('tiktokView'),title=byId('homeTitle'),tab=byId('btnTikTokTab');
 if(rows)rows.classList.add('hidden');if(live)live.classList.add('hidden');if(view)view.classList.remove('hidden');
 if(title){state.oldHomeTitle=title.textContent||'';title.textContent='TikTok'}
 if(tab){tab.classList.add('tiktok-tab-active');tab.setAttribute('aria-pressed','true')}
 if(state.mobile&&document.body)document.body.classList.add('tiktok-mobile-active');
 bindGestureLayer();loadCurrent(true);getSession();
 var params=new URLSearchParams(location.search);
 if(params.get('tiktok_auth')==='success'){setStatus('Đăng nhập TikTok thành công.');history.replaceState({},'',location.pathname)}
 else if(params.get('tiktok_auth')==='error'){setMobileNotice('Đăng nhập TikTok chưa thành công','TikTok chưa hoàn tất đăng nhập. Kiểm tra Client Key/Secret, Redirect URI đã đăng ký và quyền user.info.basic, video.list.',true);history.replaceState({},'',location.pathname)}
 updateControls();
}
function leave(restoreFocus){
 if(!state.active)return;
 postPlayer('pause');state.active=false;
 var frame=byId('tiktokFrame');if(frame)frame.src='about:blank';state.loadedId='';state.playing=false;
 var rows=byId('homeRows'),live=byId('liveView'),view=byId('tiktokView'),title=byId('homeTitle'),tab=byId('btnTikTokTab');
 if(view)view.classList.add('hidden');if(rows)rows.classList.remove('hidden');if(live)live.classList.add('hidden');
 if(title)title.textContent=state.oldHomeTitle;
 if(tab){tab.classList.remove('tiktok-tab-active');tab.setAttribute('aria-pressed','false')}
 if(document.body)document.body.classList.remove('tiktok-mobile-active');
 closeAddSheet();closeMobileNotice();
 if(window.NM7PlayerBridge&&typeof window.NM7PlayerBridge.returnFromTikTok==='function')window.NM7PlayerBridge.returnFromTikTok();
 if(restoreFocus!==false){var target=byId('btnTikTokTab');if(target&&target.focus)try{target.focus()}catch(e){}}
}
function initialize(){
 var tab=byId('btnTikTokTab');if(tab)tab.addEventListener('click',enter);
 var form=byId('tiktokAddForm');if(form)form.addEventListener('submit',function(e){e.preventDefault();addFromInput(byId('tiktokUrl'))});
 var formMobile=byId('tiktokAddFormMobile');if(formMobile)formMobile.addEventListener('submit',function(e){e.preventDefault();addFromInput(byId('tiktokUrlMobile'))});
 var prev=byId('tiktokPrev'),nxt=byId('tiktokNext'),toggle=byId('tiktokToggle'),open=byId('tiktokOpen'),remove=byId('tiktokRemove'),home=byId('tiktokHomeBtn');
 if(prev)prev.addEventListener('click',previous);if(nxt)nxt.addEventListener('click',next);
 if(toggle)toggle.addEventListener('click',togglePlayback);if(open)open.addEventListener('click',openOriginal);
 if(remove)remove.addEventListener('click',removeCurrent);if(home)home.addEventListener('click',function(){leave(true)});
 bindSwipeRail('tiktokSwipePrev');bindSwipeRail('tiktokSwipeNext');readVideos();renderQueue();updateControls();bindGestureLayer();
 if(byId('tiktokMobileBack'))byId('tiktokMobileBack').addEventListener('click',function(){leave(true)});
 if(byId('tiktokMobileSearch'))byId('tiktokMobileSearch').addEventListener('click',openAddSheet);
 if(byId('tiktokMobileLogin'))byId('tiktokMobileLogin').addEventListener('click',function(){if(state.authenticated){setMobileNotice('Tài khoản TikTok',state.profile&&state.profile.display_name?'Đã đăng nhập: '+state.profile.display_name:'Đã liên kết tài khoản TikTok.',false)}else loginTikTok()});
 if(byId('tiktokModeRecommend'))byId('tiktokModeRecommend').addEventListener('click',function(){switchMode('recommend')});
 if(byId('tiktokModeAccount'))byId('tiktokModeAccount').addEventListener('click',function(){switchMode('account')});
 if(byId('tiktokNavHome'))byId('tiktokNavHome').addEventListener('click',function(){switchMode('recommend')});
 if(byId('tiktokNavExplore'))byId('tiktokNavExplore').addEventListener('click',openAddSheet);
 if(byId('tiktokNavAdd'))byId('tiktokNavAdd').addEventListener('click',openAddSheet);
 if(byId('tiktokNavSaved'))byId('tiktokNavSaved').addEventListener('click',function(){switchMode('recommend');setStatus('Danh sách Đã lưu và Đề xuất được quản lý trên thiết bị này.')});
 if(byId('tiktokNavAccount'))byId('tiktokNavAccount').addEventListener('click',function(){switchMode('account')});
 if(byId('tiktokMobileLike'))byId('tiktokMobileLike').addEventListener('click',openOriginalAction);
 if(byId('tiktokMobileComment'))byId('tiktokMobileComment').addEventListener('click',openOriginalAction);
 if(byId('tiktokMobileBookmark'))byId('tiktokMobileBookmark').addEventListener('click',saveCurrent);
 if(byId('tiktokMobileShare'))byId('tiktokMobileShare').addEventListener('click',shareCurrent);
 if(byId('tiktokMobilePlay'))byId('tiktokMobilePlay').addEventListener('click',togglePlayback);
 if(byId('tiktokMobileMute'))byId('tiktokMobileMute').addEventListener('click',toggleMute);
 if(byId('tiktokMobileFullscreen'))byId('tiktokMobileFullscreen').addEventListener('click',fullscreen);
 if(byId('tiktokAddCancel'))byId('tiktokAddCancel').addEventListener('click',closeAddSheet);
 if(byId('tiktokNoticeClose'))byId('tiktokNoticeClose').addEventListener('click',closeMobileNotice);
 if(byId('tiktokMobileLogout'))byId('tiktokMobileLogout').addEventListener('click',async function(){try{await fetch('/api/tiktok/logout',{method:'POST',credentials:'same-origin'})}catch(e){}state.authenticated=false;state.profile=null;state.accountVideos=[];state.mode='recommend';state.index=0;state.loadedId='';closeMobileNotice();loadCurrent(true);updateControls();setStatus('Đã đăng xuất TikTok.')});
 if(byId('tiktokSetupDocs'))byId('tiktokSetupDocs').addEventListener('click',function(){window.open('https://developers.tiktok.com/docs/en/login-kit-web','_blank')});
 window.addEventListener('message',function(event){
  var frame=byId('tiktokFrame');if(!frame||event.origin!==PLAYER_ORIGIN||event.source!==frame.contentWindow)return;
  var data=event.data;if(!data||data['x-tiktok-player']!==true)return;
  if(data.type==='onPlayerReady'){setStatus('Trình phát TikTok sẵn sàng. Vuốt lên/xuống để chuyển video.');if(state.active&&state.mobile)postPlayer('play')}
  else if(data.type==='onStateChange'&&Number(data.value)===1){state.playing=true;setStatus('Đang phát: '+(current()?current().title:'TikTok'));updateControls()}
  else if(data.type==='onStateChange'&&Number(data.value)===2){state.playing=false;setStatus('Video đang tạm dừng.');updateControls()}
  else if(data.type==='onPlayerError'){var detail=data.value&&data.value.errorType?String(data.value.errorType):'lỗi trình phát';setStatus('TikTok không phát được video ('+detail+'). Hãy thử video khác hoặc mở TikTok gốc.')}
 });
}
window.NM7TikTok={enter:enter,leave:leave,isActive:function(){return state.active},handleRemoteKey:handleRemoteKey,parseVideoUrl:parseVideoUrl,loadAccountVideos:loadAccountVideos};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize);else initialize();
})();