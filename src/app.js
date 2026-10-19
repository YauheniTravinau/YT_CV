/* Static portfolio first; the interpolated photo character loads only when the scene is visible. */
document.documentElement.classList.add('js');
// Language: only the site root (/) negotiates. An explicit /pl/ or /ru/ URL is always respected,
// and a manual choice in the switcher is remembered and wins over the browser language.
const LANGS=['en','pl','ru'],store={get:k=>{try{return localStorage.getItem(k);}catch{return null;}},set:(k,v)=>{try{localStorage.setItem(k,v);}catch{}}};
if(document.body.hasAttribute('data-root')){
 const saved=store.get('lang'),alias={be:'ru'};
 const browser=(navigator.languages?.length?navigator.languages:[navigator.language||'']).map(l=>l.slice(0,2).toLowerCase()).map(l=>alias[l]||l).find(l=>LANGS.includes(l));
 const wanted=LANGS.includes(saved)?saved:browser;
 if(wanted&&wanted!=='en'){location.replace(wanted+'/'+location.hash);}
}
document.querySelectorAll('.locales a').forEach(a=>a.addEventListener('click',()=>store.set('lang',a.getAttribute('lang'))));
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const scriptBase=new URL(document.currentScript.src);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const viewer=$('#viewer'),character=$('#character'),sprite=$('#sprite'),toggle=$('#toggle');
const heroCore=$('.hero-core'),lab=$('#lab-viewer'),range=$('#rotation'),motion=$('#motion'),sceneStatus=$('#scene-status');
let playing=!reduced.matches,mode='character',heroVisible=false,labVisible=false,dragging=false,labMotion=false;
let scene=null,loading=false,failed=false,raf=0,lastTick=0;
let yaw=0,targetYaw=0,pitch=0,targetPitch=0,autoSpeed=0,labAngle=25;
const updatePlay=()=>{toggle.textContent=playing?toggle.dataset.pause:toggle.dataset.play;toggle.setAttribute('aria-pressed',String(!playing));};
const updateMotion=()=>{motion.textContent=labMotion?motion.dataset.on:motion.dataset.off;motion.setAttribute('aria-pressed',String(labMotion));};
function renderHero(){if(mode==='character')scene?.setView(yaw,pitch);else{heroCore.style.setProperty('--ry',`${yaw+25}deg`);heroCore.style.setProperty('--rx',`${pitch-22}deg`);}}
async function loadScene(){if(scene||loading||failed)return;loading=true;sceneStatus.hidden=false;
 try{const module=await import(new URL('./character3d.js',scriptBase).href);scene=await module.createCharacter3D(character);sprite.hidden=true;sceneStatus.hidden=true;renderHero();schedule();}
 catch{failed=true;sceneStatus.textContent=sceneStatus.dataset.unavailable;sceneStatus.hidden=false;sprite.hidden=false;}
 finally{loading=false;}
}
character.addEventListener('scene-unavailable',()=>{failed=true;scene?.dispose();scene=null;sprite.hidden=false;sceneStatus.textContent=sceneStatus.dataset.unavailable;sceneStatus.hidden=false;schedule();});
function setLabAngle(n){labAngle=n===360?360:((n%360)+360)%360;lab.style.setProperty('--ry',`${labAngle}deg`);range.value=String(Math.round(labAngle));$('#angle').value=`${Math.round(labAngle)}°`;}
function wantsAnimation(){return !document.hidden&&((heroVisible&&(mode==='core'||scene)&&(playing||dragging||Math.abs(targetYaw-yaw)>.01||Math.abs(targetPitch-pitch)>.01))||(labVisible&&labMotion));}
function animate(t){raf=0;if(!wantsAnimation()){lastTick=0;return;}const dt=lastTick?Math.min((t-lastTick)/1000,.05):0;lastTick=t;
 if(heroVisible&&(mode==='core'||scene)){
  const desiredSpeed=playing&&!dragging?18:0;
  autoSpeed+=(desiredSpeed-autoSpeed)*(1-Math.exp(-dt*5));
  if(!dragging)targetYaw+=autoSpeed*dt;
  const damping=1-Math.exp(-dt*(dragging?22:12));yaw+=(targetYaw-yaw)*damping;pitch+=(targetPitch-pitch)*damping;renderHero();
 }
 if(labVisible&&labMotion)setLabAngle(labAngle+18*dt);
 raf=requestAnimationFrame(animate);
}
function schedule(){if(wantsAnimation()&&!raf){lastTick=0;raf=requestAnimationFrame(animate);}else if(!wantsAnimation()&&raf){cancelAnimationFrame(raf);raf=0;lastTick=0;}}
updatePlay();updateMotion();setLabAngle(25);
if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{for(const e of entries){if(e.target===viewer){heroVisible=e.isIntersecting;if(heroVisible&&mode==='character')loadScene();}else labVisible=e.isIntersecting;}schedule();},{threshold:.05});observer.observe(viewer);observer.observe(lab);}else{heroVisible=true;labVisible=true;loadScene();}
document.addEventListener('visibilitychange',schedule);
reduced.addEventListener('change',e=>{if(e.matches){playing=false;labMotion=false;autoSpeed=0;updatePlay();updateMotion();schedule();}});
toggle.addEventListener('click',()=>{playing=!playing;if(!playing)autoSpeed=0;updatePlay();schedule();});
$('#reset').addEventListener('click',()=>{targetYaw=Math.round(yaw/360)*360;targetPitch=0;schedule();});
$$('[data-scene]').forEach(button=>button.addEventListener('click',()=>{mode=button.dataset.scene;character.hidden=mode!=='character';heroCore.hidden=mode!=='core';sceneStatus.hidden=mode!=='character'||Boolean(scene);if(mode==='character')loadScene();$$('[data-scene]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));});renderHero();schedule();}));
viewer.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft')targetYaw-=12;if(e.key==='ArrowRight')targetYaw+=12;if(e.key==='ArrowUp')targetPitch=Math.max(-18,targetPitch-5);if(e.key==='ArrowDown')targetPitch=Math.min(18,targetPitch+5);schedule();});
function drag(target,onMove,onStart=()=>{},onEnd=()=>{}){let pointer=null,x=0,y=0;
 target.addEventListener('pointerdown',e=>{if(pointer!==null||(e.pointerType==='mouse'&&e.button!==0))return;pointer=e.pointerId;x=e.clientX;y=e.clientY;target.setPointerCapture(pointer);onStart();});
 target.addEventListener('pointermove',e=>{if(pointer!==e.pointerId)return;onMove(e.clientX-x,e.clientY-y);x=e.clientX;y=e.clientY;});
 const end=e=>{if(pointer!==e.pointerId)return;pointer=null;onEnd();};
 target.addEventListener('pointerup',end);target.addEventListener('pointercancel',end);target.addEventListener('lostpointercapture',end);
}
drag(viewer,(dx,dy)=>{targetYaw+=dx*.42;targetPitch=Math.max(-18,Math.min(18,targetPitch+dy*.2));schedule();},()=>{dragging=true;autoSpeed=0;viewer.classList.add('is-dragging');schedule();},()=>{dragging=false;viewer.classList.remove('is-dragging');schedule();});
drag(lab,dx=>{setLabAngle(labAngle+dx*.5);},()=>{labMotion=false;updateMotion();schedule();});
range.addEventListener('input',()=>{labMotion=false;updateMotion();setLabAngle(Number(range.value));schedule();});
motion.addEventListener('click',()=>{labMotion=!labMotion;updateMotion();schedule();});
$$('[data-accent]').forEach(button=>button.addEventListener('click',()=>{const colors={violet:'#a78bfa',cyan:'#5ad0ff',lime:'#c8f560'};document.documentElement.style.setProperty('--lab-accent',colors[button.dataset.accent]);$$('[data-accent]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));}));
const menu=$('.menu-button'),nav=$('#navigation');
function closeMenu(){nav.classList.remove('open');menu.setAttribute('aria-expanded','false');}
menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));});
nav.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open')){closeMenu();menu.focus();}});
$('#copy-email').addEventListener('click',async e=>{const button=e.currentTarget;try{await navigator.clipboard.writeText('j.travinov@gmail.com');$('.copy-status').textContent=button.dataset.success;}catch{$('.copy-status').textContent=button.dataset.error;}});
// Preserve the current section when switching language, including on Pages subpaths.
$$('.locales a').forEach(a=>a.addEventListener('click',()=>{if(location.hash)a.href+=location.hash;}));
// One brief code reveal; keep a complete static alternative for reduced motion.
const terminal=$('.terminal');
if(terminal&&!reduced.matches&&'IntersectionObserver' in window){const reveal=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('is-revealed');reveal.unobserve(entry.target);}},{threshold:.4});reveal.observe(terminal);}
// Scroll reveal: armed only when it can run, and disarmed if the observer never reports (content must never stay hidden).
if(!reduced.matches&&'IntersectionObserver' in window){
 const root=document.documentElement;let fired=false;root.classList.add('reveal-ready');
 const appear=new IntersectionObserver(entries=>{fired=true;for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('in');appear.unobserve(entry.target);}},{threshold:.12,rootMargin:'0px 0px -6% 0px'});
 $$('[data-reveal]').forEach(el=>appear.observe(el));
 setTimeout(()=>{if(!fired)root.classList.remove('reveal-ready');},2500);
}
// Project cards follow the pointer with a soft spotlight.
$$('.project-card').forEach(card=>card.addEventListener('pointermove',e=>{const r=card.getBoundingClientRect();card.style.setProperty('--mx',`${e.clientX-r.left}px`);card.style.setProperty('--my',`${e.clientY-r.top}px`);}));
// Scroll-spy: mark the navigation link of the section in view.
if('IntersectionObserver' in window){
 const links=new Map($$('header nav a').map(a=>[a.hash.slice(1),a]));
 const spy=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){links.forEach((a,id)=>{if(id===entry.target.id)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current');});}},{rootMargin:'-45% 0px -50% 0px'});
 links.forEach((a,id)=>{const section=document.getElementById(id);if(section)spy.observe(section);});
}
