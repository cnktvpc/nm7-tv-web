'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const html = fs.readFileSync('web-tv/index.html', 'utf8');

assert.ok(html.includes('id="mobileMenuBtn"'), 'home page must include the hamburger');
assert.ok(html.includes('body:not(.mobile-mode) #mobileMenuBtn{display:flex!important'), 'desktop must show hamburger');
assert.ok(!html.includes('#mobileMenuBtn{display:none!important}'), 'desktop CSS must not hide hamburger');
assert.ok(html.includes('body.mobile-mode #mobileMenuBtn{display:flex;align-items:center;justify-content:center;flex:0 0 46px}'), 'mobile hamburger style retained');
assert.ok(html.includes('id="playerFullscreenBtn"'), 'player must include fullscreen button');
assert.ok(html.includes('#playerFullscreenBtn{position:absolute'), 'fullscreen control stays over video');
assert.ok(html.includes('opacity:1;visibility:visible;pointer-events:auto'), 'fullscreen button is visible by default');
assert.ok(html.includes('#player.player-ui-idle #playerFullscreenBtn,#player.player-ui-idle #ctrl{opacity:0;visibility:hidden;pointer-events:none}'), 'desktop fullscreen and nav controls hide together');
assert.ok(html.includes('#player.player-fullscreen-idle #playerFullscreenBtn{opacity:0;visibility:hidden;pointer-events:none}'), 'mobile fullscreen button has its own idle state without hiding the nav strip');
assert.ok(html.includes('app-safari-policy-mobile-controls.js?v=20261014-mobile-autohide1'), 'mobile runtime uses a new unique asset path');

for (const file of ['web-tv/app.js', 'web-tv/app-safari-policy.js', 'web-tv/app-safari-policy-pc-controls.js', 'web-tv/app-safari-policy-mobile-controls.js']) {
  const source = fs.readFileSync(file, 'utf8');
  assert.ok(source.includes('function togglePlayerFullscreen(){'), file + ': fullscreen toggle exists');
  assert.ok(source.includes('p.requestFullscreen||p.webkitRequestFullscreen||p.webkitRequestFullScreen'), file + ': standard/WebKit APIs supported');
  assert.ok(source.includes('webkitEnterFullscreen'), file + ': iOS fullscreen fallback exists');
  assert.ok(source.includes('function bindFullscreenControls(){'), file + ': fullscreen events bound');
  assert.ok(source.includes("btn.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();showPlayerFullscreenButton();togglePlayerFullscreen()});"), file + ': fullscreen button wakes UI and resets timer');
  assert.ok(source.includes('var PLAYER_UI_HIDE_DELAY=2400;'), file + ': controls auto-hide after inactivity');
  assert.ok(source.includes('function isMobileFullscreenAutoHideMode(){return !!S.mobileMode&&!isNativeTvMode()}'), file + ': mobile-only fullscreen auto-hide mode exists');
  assert.ok(source.includes("current.classList.add('player-fullscreen-idle')"), file + ': mobile auto-hide has a dedicated idle class');
  assert.ok(source.includes("player.addEventListener('touchstart',function(){if(S.player)showPlayerFullscreenButton()},{passive:true})"), file + ': touch wakes fullscreen button and resets timer');
  assert.ok(source.includes("player.addEventListener('touchmove',function(){if(S.player)showPlayerFullscreenButton()},{passive:true})"), file + ': active touch movement keeps controls visible');
  assert.ok(!source.includes("toast('Luồng này không hỗ trợ tua')"), file + ': unsupported seek no longer covers the bottom controls');

  assert.ok(source.includes("current.classList.add('player-ui-idle')"), file + ': idle state hides overlay');
  assert.ok(source.includes("var ctrl=$('ctrl');if(ctrl)ctrl.className='hidden';"), file + ': idle hides custom navigation buttons');
  assert.ok(source.includes("if(!player.classList.contains('player-ui-idle'))showPlayerFullscreenButton()"), file + ': hover does not wake hidden controls');
  assert.ok(source.includes("player.addEventListener('pointerdown',function(){showPlayerFullscreenButton()},{passive:true})"), file + ': click wakes controls');
  assert.ok(source.includes('function bindDesktopMouseFocus(){'), file + ': PC click focus remains intact');
  assert.ok(source.includes('target.focus({preventScroll:true})'), file + ': native focus remains assigned at click target');
  assert.ok(source.includes('function openPlayerOptionsFromMouse(){'), file + ': PC click still opens controls');
  assert.ok(source.includes('S.ctrl=true;'), file + ': click activates custom control bar');
  assert.ok(source.includes('function onTvPointerMove(e){\n if(!isTvLikeDevice())return;'), file + ': directional pointer gestures remain TV-only');
  assert.ok(source.includes('bindDesktopMouseFocus();\n bindDesktopPlayerMouse();'), file + ': PC click/focus handlers remain bound');
}
const workflow = fs.readFileSync('.github/workflows/cloudflare-deploy.yml', 'utf8');
assert.ok(workflow.includes('node scripts/test-menu-fullscreen.js'), 'deploy preflight runs interaction regression');
assert.ok(workflow.includes('Smoke test PC player click opens controls and auto-hides player UI'), 'production click/fullscreen smoke exists');
assert.ok(workflow.includes('PC_PLAYER_CLICK_AUTOHIDE_CONTROLS_PRODUCTION_SMOKE_OK'), 'production smoke marker exists');
console.log('PC_PLAYER_CLICK_AUTOHIDE_CONTROLS_REGRESSION_OK');
