document.documentElement.classList.add('js');
const $$=s=>[...document.querySelectorAll(s)];
// Remember a manual language choice (lang.js reads it on the entry points).
document.querySelectorAll('.locales a').forEach(a=>a.addEventListener('click',()=>{try{localStorage.setItem('lang',a.getAttribute('lang'));}catch{}}));
const menu=document.querySelector('.menu-button'),nav=document.getElementById('navigation');
if(menu&&nav){
 const close=()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false');};
 menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));});
 nav.addEventListener('click',e=>{if(e.target.closest('a'))close();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open')){close();menu.focus();}});
}
const chips=$$('.filter-chip'),cards=$$('.show-card');
if(chips.length&&cards.length){
 chips.forEach(chip=>chip.addEventListener('click',()=>{
  chips.forEach(c=>{const on=c===chip;c.classList.toggle('is-active',on);c.setAttribute('aria-pressed',String(on));});
  const filter=chip.dataset.filter;
  cards.forEach(card=>{card.hidden=filter!=='all'&&card.dataset.category!==filter;});
 }));
}
if('IntersectionObserver' in window){
 const root=document.documentElement;let fired=false;
 root.classList.add('reveal-ready');
 const appear=new IntersectionObserver(entries=>{fired=true;for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('in');appear.unobserve(entry.target);}},{threshold:.12,rootMargin:'0px 0px -6% 0px'});
 $$('[data-reveal]').forEach(el=>appear.observe(el));
 setTimeout(()=>{if(!fired)root.classList.remove('reveal-ready');},2500);
}
