'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const paths=[
 'web-tv/app.js',
 'web-tv/app-safari-policy.js',
 'web-tv/app-safari-policy-pc-controls.js',
 'web-tv/app-safari-policy-mobile-controls.js'
];
let activeSource='';
for(const path of paths){
 const source=fs.readFileSync(path,'utf8');
 assert.match(source,/rows\.addEventListener\('scroll',scheduleLogoActivation/,'missing scroll-triggered logo activation in '+path);
 assert.match(source,/nearViewport\|\|Math\.abs\(r-S\.row\)<=2/,'missing viewport or remote-focus loading in '+path);
 if(path==='web-tv/app-safari-policy-mobile-controls.js')activeSource=source;
}
const start=activeSource.indexOf('var logoActivationScheduled=');
const end=activeSource.indexOf('\nfunction logoOverride',start);
assert.ok(start>=0&&end>start,'logo loader block must exist');
const loader=activeSource.slice(start,end);
const handlers={};
const raf=[];
const homeRows={
 getBoundingClientRect:()=>({top:100,bottom:900,left:0,right:400}),
 addEventListener:(name,fn)=>{handlers[name]=fn}
};
let scrollingImageTop=1700;
function makeImage(row,getRect,id){
 return {
  dataset:{row:String(row),src:'/api/image?u=https%3A%2F%2Flogo.example/'+id+'.png'},
  src:'',
  getBoundingClientRect:getRect,
  removeAttribute(name){if(name==='data-src')delete this.dataset.src}
 };
}
const visible=makeImage(8,()=>({top:250,bottom:300,left:10,right:100}),'visible');
const scrollIntoView=makeImage(8,()=>({top:scrollingImageTop,bottom:scrollingImageTop+50,left:10,right:100}),'scroll');
const images=[visible,scrollIntoView];
const context={
 S:{row:0},
 document:{querySelectorAll(selector){assert.equal(selector,'img[data-src]');return images}},
 window:{
  innerHeight:800,innerWidth:400,
  requestAnimationFrame(fn){raf.push(fn)},
  addEventListener(name,fn){handlers['window:'+name]=fn}
 },
 $(id){assert.equal(id,'homeRows');return homeRows},
 isTvLikeDevice(){return false},
 setTimeout(fn){raf.push(fn);return raf.length}
};
vm.runInNewContext(loader+'\nactivateLogos();',context);
assert.ok(visible.src.includes('/visible.png'),'logo in visible viewport should load even when its data-row is far from focus');
assert.equal(scrollIntoView.src,'','distant logo should remain lazy');
assert.equal(typeof handlers.scroll,'function','scroll listener should be attached to the channel list');
scrollingImageTop=500;
handlers.scroll();
assert.equal(raf.length,1,'scroll activation should be frame-scheduled');
raf.shift()();
assert.ok(scrollIntoView.src.includes('/scroll.png'),'logo must load after the user scrolls it into view');
console.log('NM7_CHANNEL_LOGO_SCROLL_LOADING_TEST_OK');
