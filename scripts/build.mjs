import {readFile, writeFile, mkdir, cp, rm} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {readdir} from 'node:fs/promises';
import {netlifyHeaders} from './headers.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const out=resolve(root,'dist');
const read=async p=>JSON.parse(await readFile(resolve(root,p),'utf8'));
const ui=await read('content/ui.json');
const engineering=await read('content/engineering.json');
async function fingerprints(dir){let result=[];for(const entry of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const path=resolve(dir,entry.name);result.push(entry.isDirectory()?await fingerprints(path):await readFile(path));}return Buffer.concat(result.flat());}
const fingerprint=createHash('sha256');for(const dir of ['src','assets','frames'])fingerprint.update(await fingerprints(resolve(root,dir)));
const hash=fingerprint.digest('hex').slice(0,16);
const staticPath=`static/${hash}/`;
const configuredUrl=process.env.SITE_URL||(process.env.NETLIFY==='true'?process.env.URL:'');
let siteUrl='';if(configuredUrl){const url=new URL(configuredUrl);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw Error('SITE_URL must be a public http(s) URL without credentials, query or hash');siteUrl=url.href.replace(/\/+$/,'')+'/';}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lines=s=>esc(s).replaceAll('\n','<br>');
const list=items=>items.map(x=>`<li>${esc(x)}</li>`).join('');
const chips=items=>`<ul class="chips">${items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
const cube=()=>`<div class="cube-wrap" aria-hidden="true"><div class="cube">${[['front','YT','BUILD / 01'],['back','AI','CREATE / 02'],['left','{ }','DEVELOP / 03'],['right','&lt;/&gt;','CODE / 04'],['top','+','CONNECT / 05'],['bottom','↗','ITERATE / 06']].map(([face,symbol,label])=>`<div class="face ${face}"><div class="core-chip"><span>${symbol}</span></div><span class="face-label">${label}</span><i class="core-node n1"></i><i class="core-node n2"></i><i class="core-node n3"></i><i class="core-node n4"></i></div>`).join('')}</div></div>`;
// "KEY — description" nodes become a small pipeline diagram; "A → B → C" is split into nodes.
const archNodes=items=>items.length===1&&items[0].includes(' → ')?items[0].split(' → ').map(x=>[x,'']):items.map(x=>{const i=x.indexOf(' — ');return i>0?[x.slice(0,i),x.slice(i+3)]:[x,''];});
// Highlighting for the code samples; everything is escaped, nothing is injected as markup.
const highlight=s=>s.split(/('(?:[^']*)'|"(?:[^"]*)"|\b(?:const|if|await|false|none|public|immutable)\b|\/\/[^\n]*|\b\d+\b)/g).map(x=>`<span class="${/^['"]/.test(x)?'code-string':/^(const|if|await|false|none|public|immutable)$/.test(x)?'code-keyword':/^\d+$/.test(x)?'code-number':'code-text'}">${esc(x)}</span>`).join('');
const snippets=[
 'Cache-Control: public, max-age=31536000, immutable\n/static/[content-hash]/app.js',
 "default-src 'self'; object-src 'none';\nframe-ancestors 'none';\nstatus.textContent = message;",
 '<html lang="pl">\n<link rel="alternate" hreflang="en" href="../en/">',
 "if (reduced.matches) playing = false;\nif (document.hidden) cancelAnimationFrame(raf);",
 'const pose = yaw / 360 * 20;\n// Reproject neighboring photos, then blend.\nuniforms.fraction.value = pose % 1;',
 "const cv = await read(`content/cv-${lang}.json`);\nconst text = esc(cv.summary);"
];
const ICONS={
 projects:'<rect x="3.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.8"/><path d="M13.5 17h7M17 13.5v7"/>',
 playground:'<path d="M9.5 3.5h5M10.5 3.5v5.6L5.2 18a2.2 2.2 0 0 0 1.9 3.3h9.8a2.2 2.2 0 0 0 1.9-3.3l-5.3-8.9V3.5"/><path d="M8 15h8"/><circle cx="12" cy="12.2" r=".6"/>',
 about:'<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20.5c.7-4 3.7-6 7.5-6s6.8 2 7.5 6"/>',
 contact:'<rect x="3" y="5" width="18" height="14" rx="2.6"/><path d="m3.6 7.4 8.4 6 8.4-6"/>',
 showcase:'<path d="M4 20.5V11M10 20.5V4M16 20.5v-7.5M21.5 20.5h-19"/><path d="m4 7 6-3.5 6 4 4.5-3.5"/>'
};
const navIcon=name=>`<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;
const burger='<svg class="burger" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></svg>';

// Visual charts for the "one person, many roles" block: radar + ranked lines + ring gauges. Pure SVG, no JS needed.
const teamCharts=(rl,shots,tm,uid)=>{
 const n=rl.roles.length,P=shots.length,C=210,R=150;
 const counts=rl.roles.map(r=>shots.filter(x=>(rl.matrix[x.slug]||[]).includes(r)).length);
 const order=counts.map((c,i)=>[i,c]).sort((a,b)=>b[1]-a[1]||a[0]-b[0]),gcd=(x,y)=>y?gcd(y,x%y):x,step=gcd(4,n)===1?4:1,slot=[];order.forEach(([i],k)=>{slot[i]=(k*step)%n;});
 const ang=i=>(-90+i*360/n)*Math.PI/180,pt=(i,v,k=1)=>[C+Math.cos(ang(i))*R*v*k,C+Math.sin(ang(i))*R*v*k].map(x=>x.toFixed(1));
 const shape=counts.map((c,i)=>[slot[i],pt(slot[i],c/P)]).sort((a,b)=>a[0]-b[0]).map(x=>x[1].join(',')).join(' ');
 const rings=[.25,.5,.75,1].map(f=>'<circle class="r-ring" cx="'+C+'" cy="'+C+'" r="'+(R*f)+'"/>').join('');
 const spokes=rl.roles.map((_,i)=>{const [x,y]=pt(i,1);return '<line class="r-spoke" x1="'+C+'" y1="'+C+'" x2="'+x+'" y2="'+y+'"/>';}).join('');
 const dots=counts.map((c,i)=>{const [x,y]=pt(slot[i],c/P);return '<circle class="r-dot" cx="'+x+'" cy="'+y+'" r="5"/>';}).join('');
 const badges=rl.roles.map((_,i)=>{const [x,y]=pt(slot[i],1,1.2);return '<g class="r-badge"><circle cx="'+x+'" cy="'+y+'" r="12"/><text x="'+x+'" y="'+y+'" dy=".35em">'+(i+1)+'</text></g>';}).join('');
 const radar='<svg class="radar" viewBox="0 0 420 420" role="img" aria-label="'+esc(tm.radarTitle)+'"><defs><radialGradient id="rg-'+uid+'" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#5ad0ff" stop-opacity=".12"/><stop offset="1" stop-color="#a78bfa" stop-opacity=".5"/></radialGradient></defs>'+rings+spokes+'<polygon class="r-shape" points="'+shape+'" fill="url(#rg-'+uid+')"/>'+dots+badges+'<text class="r-center" x="'+C+'" y="'+(C-4)+'">'+n+'</text><text class="r-center-sub" x="'+C+'" y="'+(C+22)+'">'+esc(tm.centerLabel||'roles')+'</text></svg>';
 const lvl=c=>c>=7?'hi':c>=4?'mid':'low';
 const rank='<ol class="rank">'+order.map(([i,c])=>'<li><span class="rk-n">'+(i+1)+'</span><span class="rk-name">'+esc(tm.roles[rl.roles[i]])+'</span><svg class="rk-bar" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true"><rect class="rk-track" width="100" height="8" rx="4"/><rect class="rk-fill lv-'+lvl(c)+'" width="'+(c/P*100).toFixed(1)+'" height="8" rx="4"/></svg><b>'+c+'<small>/'+P+'</small></b></li>').join('')+'</ol>';
 const perProject=shots.map(x=>[x,(rl.matrix[x.slug]||[]).length]),best=perProject.sort((a,b)=>b[1]-a[1])[0];
 const covered=counts.filter(Boolean).length,avg=perProject.reduce((s,[,k])=>s+k,0)/P;
 const gauges=[[covered,covered/n,tm.rings[0].replace('{n}',n),'g-a'],[avg.toFixed(1),avg/n,tm.rings[1],'g-b'],[best[1],best[1]/n,tm.rings[2].replace('{name}',best[0].title),'g-c']];
 const Rg=46,circ=(2*Math.PI*Rg).toFixed(1);
 const rings3='<ul class="gauges">'+gauges.map(([v,f,label,cls])=>'<li class="gauge '+cls+'"><svg viewBox="0 0 120 120" role="img" aria-label="'+esc(v+' / '+n)+'"><circle class="g-track" cx="60" cy="60" r="'+Rg+'"/><circle class="g-fill" cx="60" cy="60" r="'+Rg+'" stroke-dasharray="'+circ+'" stroke-dashoffset="'+(circ*(1-f)).toFixed(1)+'" data-full="'+circ+'"/><text class="g-val" x="60" y="58">'+v+'</text><text class="g-of" x="60" y="78">/ '+n+'</text></svg><span>'+esc(label)+'</span></li>').join('')+'</ul>';
 return '<div class="charts"><div class="chart-card chart-radar"><h3>'+esc(tm.radarTitle)+'</h3>'+radar+'</div><div class="chart-card chart-rank"><h3>'+esc(tm.rankTitle)+'</h3>'+rank+'</div></div>'+rings3;
};
const langs=['en','pl','ru'];
const localeTag={en:'en-US',pl:'pl-PL',ru:'ru-RU'};
const jobTitle={en:'Independent AI, web and automation developer',pl:'Twórca projektów AI, webowych i automatyzacji',ru:'Разработчик AI, веб-продуктов и автоматизации'};
const personLd=(url,image,description,lang)=>({'@context':'https://schema.org','@type':'Person','name':'Yauheni Travinau','alternateName':['Yauheni Travinov','Eugeniusz Travinau','Евгений Травинов'],'url':url,'image':image,'description':description,'jobTitle':jobTitle[lang],'address':{'@type':'PostalAddress','addressLocality':'Wrocław','addressCountry':'PL'},'knowsLanguage':['be','ru','uk','pl','en'],'knowsAbout':['Artificial intelligence','Web development','Automation','Windows desktop applications'],'sameAs':['https://github.com/YauheniTravinau','https://www.linkedin.com/in/bliss-hart/']});
await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});
await mkdir(resolve(out,staticPath),{recursive:true});
await cp(resolve(root,'frames'),resolve(out,staticPath,'frames'),{recursive:true});
await mkdir(resolve(out,staticPath,'assets'),{recursive:true});
await Promise.all(['CV-YT-2026AI-en.pdf','CV-YT-2026AI-pl.pdf','CV-YT-2026AI-ru.pdf','favicon.svg','favicon-32.png','apple-touch-icon.png','favicon-16.png','icon-192.png','icon-512.png','icon-maskable-512.png','og-home-en.jpg','og-home-pl.jpg','og-home-ru.jpg','og-portfolio-en.jpg','og-portfolio-pl.jpg','og-portfolio-ru.jpg','photo-flow.bin'].map(file=>cp(resolve(root,'assets',file),resolve(out,staticPath,'assets',file))));
await cp(resolve(root,'assets/favicon.ico'),resolve(out,'favicon.ico'));await cp(resolve(root,'assets/apple-touch-icon.png'),resolve(out,'apple-touch-icon.png'));
await writeFile(resolve(out,'site.webmanifest'),JSON.stringify({name:'Yauheni Travinau — YAUHENI.BUILD',short_name:'YAUHENI',description:ui.en.description,start_url:'./',scope:'./',display:'standalone',background_color:'#08090d',theme_color:'#08090d',icons:[{src:`${staticPath}assets/icon-192.png`,sizes:'192x192',type:'image/png',purpose:'any'},{src:`${staticPath}assets/icon-512.png`,sizes:'512x512',type:'image/png',purpose:'any'},{src:`${staticPath}assets/icon-maskable-512.png`,sizes:'512x512',type:'image/png',purpose:'maskable'}]},null,1));
await cp(resolve(root,'content/frame-crops.json'),resolve(out,staticPath,'assets/frame-crops.json'));
await cp(resolve(root,'assets/projects'),resolve(out,staticPath,'assets','projects'),{recursive:true});
await Promise.all(['app.js','lang.js','styles.css','showcase.css','showcase.js','character3d.js','vendor'].map(p=>cp(resolve(root,'src',p),resolve(out,staticPath,p),{recursive:true})));
for (const lang of langs) {
 const t=ui[lang],cv=await read(`content/cv-${lang}.json`),projects=await read(`content/projects-${lang}.json`),e=engineering[lang];
 for (const isRoot of lang==='en'?[true,false]:[false]) {
 const p=isRoot?'':'../';
 const asset=p+staticPath;
 const cvHref=`${p}assets/CV-YT-2026AI-${lang}.pdf`;
 const statusLabel=project=>project.status==='private'?t.private:project.status==='prototype'?t.prototype:project.slug==='github'?t.source:t.live;
 const arch=project=>`<div class="arch"><p class="arch-title">${esc(t.archLabel)}</p><ol>${archNodes(project.architecture).map(([key,desc],i)=>`<li><span class="arch-index">0${i+1}</span><b>${esc(key)}</b>${desc?`<span>${esc(desc)}</span>`:''}</li>`).join('')}</ol></div>`;
 const card=(project,i)=>{
  const featured=i<2,link=project.links.live||project.links.github,host=link?new URL(link).host:'';
  return `<article class="project-card${featured?' is-featured':''}" data-reveal>
  <div class="project-head"><span class="project-number">0${i+1}</span>${featured?`<span class="featured-flag">${esc(t.featured)}</span>`:''}<span class="status status-${esc(project.status)}">${esc(statusLabel(project))}</span></div>
  <div class="project-main"><div class="project-copy"><p class="tags">${project.tags.map(esc).join(' / ')}</p><h3>${esc(project.title)}</h3><p class="project-summary">${esc(project.summary)}</p>
  <p class="project-result"><span>${esc(t.resultLabel)}</span>${esc(project.result)}</p>
  ${link?`<a class="${featured?'button primary':'text-link'}" href="${esc(link)}" target="_blank" rel="noopener noreferrer">${esc(host)} <span aria-hidden="true">↗</span></a>`:''}</div>
  ${featured?arch(project):''}</div>
  <details class="case-study"><summary><span>${esc(t.case)}</span><span class="plus" aria-hidden="true">+</span></summary><div class="case-content">
  <div class="case-grid"><section><h4>${esc(t.problem)}</h4><p>${esc(project.problem)}</p></section><section><h4>${esc(t.solution)}</h4><p>${esc(project.solution)}</p></section></div>
  ${featured?'':arch(project)}
  <div class="case-grid"><section><h4>${esc(t.role)}</h4>${chips(project.role)}</section><section><h4>${esc(t.stack)}</h4>${chips(project.stack)}</section></div>
  <div class="case-grid proof-grid"><section class="proof"><h4>${esc(t.aiHelped)}</h4><ul>${list(project.aiHelpedWith)}</ul></section><section class="proof verified"><h4>${esc(t.verified)}</h4><ul>${list(project.verifiedByOwner)}</ul></section></div>
  <p class="lesson"><span>${esc(t.learned)}</span>${esc(project.lessons)}</p></div></details></article>`;
 };
 const note=i=>`<details class="engineering-note" id="insight-${i}"><summary><span class="note-index">0${i+1}</span><span class="note-title">${esc(e.notes[i][0])}</span><span class="plus" aria-hidden="true">+</span></summary><div class="note-content"><h3>${esc(e.notes[i][1])}</h3><p>${esc(e.notes[i][2])}</p><pre><code>${highlight(snippets[i])}</code></pre><p class="micro">${esc(e.notes[i][3])}</p></div></details>`;
 const terminal=`<div class="terminal"><div class="terminal-bar"><span class="terminal-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>${esc(e.terminal)}</span><span aria-hidden="true">⌘</span></div><div class="terminal-code" aria-label="${esc(e.terminalLabel)}"><code><span class="code-comment">// ${esc(e.terminalLabel)}</span><br><span class="code-keyword">const</span> portfolio = {<br>&nbsp; purpose: <span class="code-string">'solve real problems'</span>,<br>&nbsp; mindset: [<span class="code-string">'build'</span>, <span class="code-string">'test'</span>, <span class="code-string">'learn'</span>],<br>&nbsp; unnecessaryBytes: <span class="code-number">0</span> <span class="code-comment">// the goal</span><br>};<span class="terminal-cursor" aria-hidden="true">▌</span></code></div><div class="terminal-bottom"><span>HTML → CSS → JS</span><span>UTF-8</span></div></div>`;
 const roleData=JSON.parse(await readFile(resolve(root,'content/roles.json'),'utf8')),showData=await read(`content/showcase-${lang}.json`),tm=t.portfolio.team,fillN=s=>s.replace('{n}',roleData.roles.length).replace('{p}',showData.length);
 const teaser=`<section class="team-teaser container" aria-labelledby="teaser-title" data-reveal><div class="teaser-head"><div><p class="eyebrow"><span>${esc(tm.label.split(' · ')[0])}</span> — ${esc(tm.label.split(' · ')[1])}</p><h2 id="teaser-title">${esc(fillN(tm.title))}</h2></div><p>${esc(tm.intro)}</p></div>${teamCharts(roleData,showData,tm,'h')}<p class="team-caveat">${esc(tm.caveat)}</p><a class="button secondary" href="${lang==='en'?`${p}portfolio/`:`${p}${lang}/portfolio/`}#team">${esc(tm.cta)} <span aria-hidden="true">→</span></a></section>`;
 let html=`<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#08090d"><title>${esc(t.title)}</title><meta name="description" content="${esc(t.description)}"><meta name="robots" content="index,follow,max-image-preview:large"><meta property="og:type" content="website"><meta property="og:site_name" content="YAUHENI.BUILD"><meta property="og:title" content="${esc(t.title)}"><meta property="og:description" content="${esc(t.description)}"><meta property="og:locale" content="${{en:'en_US',pl:'pl_PL',ru:'ru_RU'}[lang]}">${isRoot?`<script src="${p}lang.js" data-target="{lang}/"></script>`:''}<link rel="icon" href="${p}assets/favicon.svg" type="image/svg+xml"><link rel="icon" href="${p}assets/favicon-32.png" sizes="32x32" type="image/png"><link rel="apple-touch-icon" href="${p}assets/apple-touch-icon.png" sizes="180x180"><link rel="icon" href="${p}assets/favicon-16.png" sizes="16x16" type="image/png"><link rel="icon" href="${p}favicon.ico" sizes="any"><link rel="manifest" href="${p}site.webmanifest"><meta name="application-name" content="YAUHENI.BUILD"><meta name="apple-mobile-web-app-title" content="YAUHENI"><meta name="author" content="Yauheni Travinau"><meta name="color-scheme" content="dark"><link rel="stylesheet" href="${p}styles.css">${langs.map(l=>`<link rel="alternate" hreflang="${l}" href="${p}${l}/">`).join('')}<link rel="alternate" hreflang="x-default" href="${p}en/"><script src="${p}app.js" defer></script></head>
<body id="top"${isRoot?' data-root':''}><div class="progress-track" aria-hidden="true"><div class="progress-bar"></div></div><a class="skip" href="#main">${esc(t.skip)}</a>
<header class="header"><a class="brand" href="${p}index.html" aria-label="Yauheni home"><span class="brand-icon">YT<b>_</b></span><span class="brand-name">YAUHENI<span class="muted">.build</span></span></a><nav id="navigation" aria-label="${esc(t.menu)}">${t.nav.map((n,i)=>`<a href="#${['projects','playground','about','contact'][i]}">${navIcon(['projects','playground','about','contact'][i])}<span>${esc(n)}</span></a>`).join('')}<a href="${lang==='en'?`${p}portfolio/`:`${p}${lang}/portfolio/`}">${navIcon('showcase')}<span>${esc(t.portfolio.nav)}</span></a></nav><a class="header-cv" href="${cvHref}" download aria-label="${esc(t.cv)}">CV <span aria-hidden="true">↓</span></a><div class="locales" aria-label="Language">${langs.map(l=>`<a href="${p}${l}/" lang="${l}" hreflang="${l}" ${l===lang?'aria-current="page"':''}>${l.toUpperCase()}</a>`).join('')}</div><button class="menu-button" aria-controls="navigation" aria-expanded="false"><span>${esc(t.menu)}</span>${burger}</button></header>
<main id="main" itemscope itemtype="https://schema.org/Person"><meta itemprop="name" content="Yauheni Travinau">
<section class="hero" aria-labelledby="hero-title"><div class="container hero-grid"><div class="hero-copy"><p class="eyebrow">${esc(t.eyebrow)}</p><h1 id="hero-title">${esc(t.hero[0])}<br><em>${esc(t.hero[1])}</em><br>${esc(t.hero[2])}</h1><p class="intro">${esc(t.intro)}</p><div class="hero-actions"><a class="button primary" href="#projects">${esc(t.work)} <span aria-hidden="true">↗</span></a><a class="button secondary" href="${cvHref}" download>${esc(t.cv)} <span aria-hidden="true">↓</span></a></div><p class="micro cv-note">${esc(t.cvNote)}</p><ul class="hero-meta"><li class="availability"><span class="pulse" aria-hidden="true"></span>${esc(t.openToWork)}</li><li><span aria-hidden="true">◎</span> ${esc(t.location)}</li><li><a href="https://github.com/YauheniTravinau" target="_blank" rel="noopener noreferrer">GitHub <span aria-hidden="true">↗</span></a></li></ul></div>
<div class="hero-visual"><div class="scene-heading"><span>${esc(t.viewer)}</span><span class="scene-index">360° / 001</span></div><div class="scene-tabs" role="group" aria-label="${esc(t.viewer)}"><button class="selected" data-scene="character" aria-pressed="true">${esc(t.character)}</button><button data-scene="core" aria-pressed="false">${esc(t.core)}</button></div><div class="viewer" id="viewer" tabindex="0" role="group" aria-label="${esc(t.viewer)}" aria-describedby="drag-hint"><div class="coordinate c-one" aria-hidden="true">X / 360°</div><div class="coordinate c-two" aria-hidden="true">Y / BUILD</div><div class="halo" aria-hidden="true"><i></i><i></i></div><div id="character" class="character"><img id="sprite" src="${p}frames/frame_00.webp" width="480" height="592" alt="${esc(t.character)}" draggable="false"></div><div class="hero-core" hidden>${cube()}</div><div class="floor"></div></div><p id="scene-status" class="scene-status" role="status" data-unavailable="${esc(t.sceneUnavailable)}" hidden>${esc(t.sceneLoading)}</p><div class="scene-footer"><p id="drag-hint">${esc(t.drag)}</p><div class="scene-controls"><button id="toggle" data-play="${esc(t.play)}" data-pause="${esc(t.pause)}" aria-pressed="false">${esc(t.pause)}</button><button id="reset" aria-label="${esc(t.reset)}">↺</button></div></div><p class="micro scene-note">${esc(t.stageNote)}</p></div></div></section>
<section class="stats container" aria-label="${esc(t.statsLabel)}"><ul>${t.stats.map(([value,label])=>`<li><b>${esc(value)}</b><span>${esc(label)}</span></li>`).join('')}</ul></section>
${teaser}
<section class="section container" id="projects" aria-labelledby="projects-title"><div class="section-heading" data-reveal><div><p class="eyebrow"><span>${esc(t.projectsLabel.split(' / ')[0])}</span> — ${esc(t.projectsLabel.split(' / ')[1])}</p><h2 id="projects-title">${esc(t.projectsTitle)}</h2></div><p>${esc(t.projectsIntro)}</p></div><div class="projects-grid">${projects.map(card).join('')}</div><div class="showcase-cta" data-reveal><a class="button primary" href="${lang==='en'?`${p}portfolio/`:`${p}${lang}/portfolio/`}">${esc(t.portfolio.cta)} <span aria-hidden="true">↗</span></a><p class="micro">${esc(t.portfolio.ctaNote)}</p></div></section>
<section id="engineering" class="section engineering-section" aria-labelledby="engineering-title"><div class="container engineering-layout"><div class="engineering-intro" data-reveal><p class="eyebrow"><span>&lt;/&gt;</span> — ${esc(e.label)}</p><h2 id="engineering-title">${esc(e.title)}</h2><p>${esc(e.intro)}</p>${terminal}</div><div class="engineering-grid">${e.notes.map((_,i)=>note(i)).join('')}</div></div></section>
<section class="lab-section" id="playground" aria-labelledby="lab-title"><div class="container lab-grid"><div data-reveal><p class="eyebrow"><span>${esc(t.labLabel.split(' / ')[0])}</span> — ${esc(t.labLabel.split(' / ')[1])}</p><h2 id="lab-title">${lines(t.labTitle)}</h2><p class="lab-intro">${esc(t.labIntro)}</p><div class="lab-controls"><fieldset><legend>${esc(t.accent)}</legend><div class="swatches">${['cyan','violet','lime'].map((c,i)=>`<button data-accent="${c}" class="swatch ${c}" aria-label="${esc(t[c])}" aria-pressed="${i===0}"></button>`).join('')}</div></fieldset><label class="range-label">${esc(t.rotation)} <output id="angle">25°</output><input type="range" id="rotation" min="0" max="360" value="25"></label><button class="button secondary" id="motion" data-on="${esc(t.motionOn)}" data-off="${esc(t.motionOff)}" aria-pressed="false">${esc(t.motionOff)}</button></div><ul class="lab-tags">${t.labMeta.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></div><div class="lab-art" data-reveal><div class="lab-caption"><span>EXPERIMENT / CSS-3D</span><span aria-hidden="true">↗</span></div><div id="lab-viewer" class="lab-viewer" role="group" aria-label="${esc(t.labHint)}">${cube()}<div class="floor"></div></div><p>${esc(t.labHint)}</p></div></div></section>
<section class="section about-section" id="about" aria-labelledby="about-title"><div class="container"><div class="about-head" data-reveal><div><p class="eyebrow"><span>${esc(t.aboutLabel.split(' / ')[0])}</span> — ${esc(t.aboutLabel.split(' / ')[1])}</p><h2 id="about-title">${lines(t.aboutTitle)}</h2></div><p class="intro">${esc(t.aboutIntro)}</p></div>
<div class="process" data-reveal><p class="micro process-label">${esc(t.processLabel)}</p><ol>${t.journey.map(j=>`<li><span>${esc(j)}</span></li>`).join('')}</ol></div>
<div class="about-grid"><div class="about-copy" data-reveal><p class="lead">${esc(cv.summary)}</p><h3>${esc(t.approach)}</h3><p>${esc(cv.aiApproach)}</p><h3>${esc(t.strengths)}</h3><ul class="strengths">${list(cv.strengths)}</ul><h3>${esc(t.skills)}</h3>${cv.skillGroups.map(s=>`<div class="skill-group"><p class="micro">${esc(s.title)}</p>${chips(s.items)}</div>`).join('')}</div>
<div class="timeline-column" data-reveal><h3>${esc(t.experience)}</h3><div class="timeline">${cv.experience.map(x=>`<article><p class="micro period">${esc(x.period)}</p><h4>${esc(x.company)}</h4><p class="role">${esc(x.role)}</p><ul>${list(x.bullets)}</ul>${x.taught?`<p class="taught"><span>${esc(t.taughtLabel)}</span>${esc(x.taught)}</p>`:''}</article>`).join('')}</div><h3>${esc(t.education)}</h3><div class="education">${cv.education.map(x=>`<article><span class="micro">${esc(x.years)}</span><h4>${esc(x.title)}</h4><p>${esc(x.org)}</p></article>`).join('')}</div><h3>${esc(t.languages)}</h3><dl class="language-list">${cv.languages.map(x=>`<div><dt>${esc(x.name)}</dt><dd>${esc(x.level)}</dd></div>`).join('')}</dl></div></div></div></section>
<section class="contact-section" id="contact" aria-labelledby="contact-title"><div class="container" data-reveal><p class="eyebrow"><span>${esc(t.contactLabel.split(' / ')[0])}</span> — ${esc(t.contactLabel.split(' / ')[1])}</p><h2 id="contact-title">${lines(t.contactTitle)}</h2><p class="contact-intro">${esc(t.contactIntro)}</p><a class="email-link" itemprop="email" href="mailto:j.travinov@gmail.com"><span>j.travinov@gmail.com</span><i aria-hidden="true">↗</i></a><div class="contact-links"><button id="copy-email" class="button secondary" data-success="${esc(t.copied)}" data-error="${esc(t.copyFailed)}">${esc(t.copy)}</button><a class="button secondary" href="https://github.com/YauheniTravinau" target="_blank" rel="noopener noreferrer">GitHub <span aria-hidden="true">↗</span></a><a class="button secondary" itemprop="telephone" href="tel:+48880444275">+48 880 444 275</a><a class="button primary" href="${cvHref}" download>${esc(t.cv)} <span aria-hidden="true">↓</span></a></div><p class="copy-status" role="status" aria-live="polite"></p></div></section></main>
<footer class="container footer"><a class="brand" href="#top"><span class="brand-icon">YT<b>_</b></span></a><p>© ${new Date().getUTCFullYear()} Yauheni Travinau · ${esc(t.footer)}</p><a href="#top">${esc(t.top)} ↑</a></footer><noscript><p class="container">${esc(t.nojs)}</p></noscript></body></html>`;
 // All immutable resources share a content-derived URL; language/navigation URLs stay stable.
 html=html.replaceAll(`${p}assets/`,`${asset}assets/`).replaceAll(`${p}frames/`,`${asset}frames/`).replaceAll(`href="${p}styles.css"`,`href="${asset}styles.css"`).replaceAll(`src="${p}app.js"`,`src="${asset}app.js"`).replaceAll(`src="${p}lang.js"`,`src="${asset}lang.js"`);
 if(siteUrl){
  const canonical=siteUrl+`${lang}/`;
  const image=siteUrl+staticPath+`assets/og-home-${lang}.jpg`;
  const social=`<link rel="canonical" href="${esc(canonical)}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:image" content="${esc(image)}"><meta property="og:image:secure_url" content="${esc(image)}"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(t.title)}"><meta property="og:locale:alternate" content="${langs.filter(l=>l!==lang).map(l=>({en:'en_US',pl:'pl_PL',ru:'ru_RU'}[l])).join('"><meta property="og:locale:alternate" content="')}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(t.title)}"><meta name="twitter:description" content="${esc(t.description)}"><meta name="twitter:image" content="${esc(image)}"><meta name="twitter:image:alt" content="${esc(t.title)}"><script type="application/ld+json">${JSON.stringify([personLd(canonical,image,t.description,lang),{"@context":"https://schema.org","@type":"WebSite","name":"YAUHENI.BUILD","url":siteUrl,"inLanguage":localeTag[lang]}]).replace(/</g,'\\u003c')}</script>`;
  html=html.replace('</head>',`${social}</head>`);
  langs.forEach(l=>{html=html.replace(`hreflang="${l}" href="${p}${l}/"`,`hreflang="${l}" href="${esc(siteUrl+l+'/')}"`);});
  html=html.replace(`hreflang="x-default" href="${p}en/"`,`hreflang="x-default" href="${esc(siteUrl+'en/')}"`);
 }
 const target=isRoot?out:resolve(out,lang);await mkdir(target,{recursive:true});await writeFile(resolve(target,'index.html'),html);
 }
}
for (const lang of langs) {
 const t=ui[lang],shots=await read(`content/showcase-${lang}.json`),pt=t.portfolio,an=pt.analytics;
 const p=lang==='en'?'../':'../../';
 const home=lang==='en'?'../en/':'../';
 const asset=p+staticPath;
 const cvHref=`${p}assets/CV-YT-2026AI-${lang}.pdf`;
 const cats=['all','web','desktop','android','ai'];
 const catIds=cats.slice(1),catLabel=Object.fromEntries(catIds.map((c,i)=>[c,pt.filters[i+1]]));
 const statusIds=['live','ready','prototype','private'];
 // Analytics are computed from the project data itself; nothing is typed in by hand.
 const tech=s=>s.replace(/\s+v?\d+(\.\d+)*$/,'');
 const techCount=new Map();for(const project of shots)for(const name of new Set(project.stack.map(tech)))techCount.set(name,(techCount.get(name)||0)+1);
 const topTech=[...techCount].filter(([,n])=>n>1).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,8);
 const byCat=catIds.map(c=>[c,shots.filter(x=>x.category===c).length]).filter(([,n])=>n);
 const byStatus=statusIds.map(s=>[s,shots.filter(x=>x.status===s).length]).filter(([,n])=>n);
 const bar=(n,max)=>`<svg class="bar" viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true"><rect class="bar-track" width="100" height="6"/><rect class="bar-fill" width="${(n/max*100).toFixed(1)}" height="6"/></svg>`;
 let offset=0;
 const stacked=`<svg class="stack-bar" viewBox="0 0 100 10" preserveAspectRatio="none" role="img" aria-label="${esc(an.byPlatform)}">${byCat.map(([c,n])=>{const w=n/shots.length*100,r=`<rect class="seg c-${c}" x="${offset.toFixed(2)}" width="${w.toFixed(2)}" height="10"/>`;offset+=w;return r;}).join('')}</svg>`;
 const glance=[[shots.length,an.projects],[shots.filter(x=>x.status==='live').length,an.live],[techCount.size,an.technologies],[byCat.length,an.platforms]];
 const analytics=`<section class="analytics container" aria-labelledby="analytics-title" data-reveal><div class="an-head"><div><p class="eyebrow"><span>${esc(an.label.split(' ')[0])}</span> — ${esc(an.label.split(' ').slice(1).join(' '))}</p><h2 id="analytics-title">${esc(an.title)}</h2></div><p>${esc(an.intro)}</p></div>
 <ul class="glance">${glance.map(([v,l])=>`<li><b>${String(v).padStart(2,'0')}</b><span>${esc(l)}</span></li>`).join('')}</ul>
 <div class="an-grid">
  <div class="an-card"><h3>${esc(an.byPlatform)}</h3>${stacked}<ul class="legend">${byCat.map(([c,n])=>`<li><i class="dot c-${c}" aria-hidden="true"></i>${esc(catLabel[c])}<b>${n}</b></li>`).join('')}</ul>
   <h3 class="an-sub">${esc(an.byStatus)}</h3><ul class="rows">${byStatus.map(([s,n])=>`<li><span>${esc(pt.status[s])}</span>${bar(n,shots.length)}<b>${n}</b></li>`).join('')}</ul></div>
  <div class="an-card"><h3>${esc(an.topTech)}</h3><ul class="rows">${topTech.map(([name,n])=>`<li><span>${esc(name)}</span>${bar(n,topTech[0][1])}<b>${n}</b></li>`).join('')}</ul></div>
  <div class="an-card an-legend"><h3>${esc(pt.legendTitle)}</h3><dl>${statusIds.map(s=>`<div><dt><span class="status status-${s}">${esc(pt.status[s])}</span></dt><dd>${esc(pt.legend[s])}</dd></div>`).join('')}</dl></div>
 </div></section>`;
 const rl=JSON.parse(await readFile(resolve(root,'content/roles.json'),'utf8')),tm=pt.team,fill=s=>s.replace('{n}',rl.roles.length).replace('{p}',shots.length);
 const coverage=rl.roles.map(r=>[r,shots.filter(x=>(rl.matrix[x.slug]||[]).includes(r)).length]);
 const team=`<section class="team container" id="team" aria-labelledby="team-title" data-reveal><div class="an-head"><div><p class="eyebrow"><span>${esc(tm.label.split(' · ')[0])}</span> — ${esc(tm.label.split(' · ')[1])}</p><h2 id="team-title">${esc(fill(tm.title))}</h2></div><p>${esc(tm.intro)}</p></div>
 ${teamCharts(rl,shots,tm,'p')}
 <div class="team-grid"><div class="an-card matrix-card"><h3>${esc(tm.matrixTitle)}</h3><div class="matrix-scroll"><table class="matrix"><thead><tr><th scope="col"><span class="sr">${esc(tm.matrixTitle)}</span></th>${shots.map((x,i)=>`<th scope="col"><abbr title="${esc(x.title)}">${String(i+1).padStart(2,'0')}</abbr></th>`).join('')}<th scope="col" class="count">∑</th></tr></thead><tbody>${coverage.map(([r,n])=>`<tr><th scope="row">${esc(tm.roles[r])}</th>${shots.map(x=>(rl.matrix[x.slug]||[]).includes(r)?`<td class="on c-${esc(x.category)}"><span class="sr">✓</span></td>`:'<td></td>').join('')}<td class="count">${n}</td></tr>`).join('')}</tbody></table></div>
 <p class="matrix-key micro"><b>${esc(tm.keyTitle)}:</b> ${shots.map((x,i)=>`${String(i+1).padStart(2,'0')} ${esc(x.title)}`).join(' · ')}</p></div>
 <div class="an-card evidence-card"><h3>${esc(tm.evidenceTitle)}</h3><dl>${rl.roles.map(r=>`<div><dt>${esc(tm.roles[r])}</dt><dd>${esc(tm.evidence[r])}</dd></div>`).join('')}</dl></div></div>
 <p class="team-caveat">${esc(tm.caveat)}</p></section>`;
 const wide=project=>project.screenshots.find(s=>s.w>=s.h)||project.screenshots[0];
 const figure=(s,eager)=>`<figure class="shot shot-${s.w<s.h?'phone':'wide'}"><img src="${p}assets/projects/${esc(s.src)}" width="${s.w}" height="${s.h}" alt="${esc(s.caption)}" loading="${eager?'eager':'lazy'}" decoding="async"><figcaption class="micro">${esc(s.caption)}</figcaption></figure>`;
 const card=(project,i)=>{
  const featured=i===0,hasShots=project.screenshots.length>0,live=project.links.live;
  const link=live?`<a class="button primary" href="${esc(live)}" target="_blank" rel="noopener noreferrer">${esc(new URL(live).host)} <span aria-hidden="true">↗</span></a>`:'';
  const media=hasShots?(featured?`<div class="show-media show-media-featured">${project.screenshots.map(s=>figure(s,true)).join('')}</div>`:`<div class="show-media">${figure(wide(project))}</div>`):'';
  const rest=hasShots&&!featured?project.screenshots.filter(s=>s!==wide(project)):[];
  const shown=project.stack.slice(0,6),hidden=project.stack.length-shown.length;
  return `<article class="show-card c-${esc(project.category)}${hasShots?' has-shots':' is-text'}${featured?' is-featured':''}" data-category="${esc(project.category)}" data-reveal>
  ${media}<div class="show-body">
  <div class="show-head"><span class="show-number" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><span class="cat-tag"><i class="dot c-${esc(project.category)}" aria-hidden="true"></i>${esc(catLabel[project.category])}</span><span class="show-year micro">${esc(project.year)}</span><span class="status status-${esc(project.status)}">${esc(pt.status[project.status])}</span></div>
  <h2>${esc(project.title)}</h2>${featured?`<p class="featured-flag">${esc(pt.featuredEyebrow)}</p>`:''}
  <p class="show-summary">${esc(project.summary)}</p>
  <ul class="metrics" aria-label="${esc(pt.keyNumbers)}">${project.metrics.map(([v,l])=>`<li><b>${esc(v)}</b><span>${esc(l)}</span></li>`).join('')}</ul>
  <ul class="chips">${shown.map(x=>`<li>${esc(x)}</li>`).join('')}${hidden>0?`<li class="more-chip">+${hidden}</li>`:''}</ul>
  <details class="show-more"><summary><span>${esc(pt.moreDetails)}</span><span class="plus" aria-hidden="true">+</span></summary><div class="show-more-body"><p class="show-desc">${esc(project.description)}</p><h3>${esc(pt.highlights)}</h3><ul class="show-highlights">${list(project.highlights)}</ul>${hidden>0?`<h3>${esc(t.stack)}</h3>${chips(project.stack)}`:''}${rest.length?`<div class="show-shots">${rest.map(s=>figure(s)).join('')}</div>`:''}${hasShots?'':`<p class="show-noshots micro">${esc(pt.statusNote)}</p>`}</div></details>
  ${link}</div></article>`;
 };
 let html=`<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#08090d"><title>${esc(pt.title)}</title><meta name="description" content="${esc(pt.description)}"><meta name="robots" content="index,follow,max-image-preview:large"><meta property="og:type" content="website"><meta property="og:site_name" content="YAUHENI.BUILD"><meta property="og:title" content="${esc(pt.title)}"><meta property="og:description" content="${esc(pt.description)}"><meta property="og:locale" content="${{en:'en_US',pl:'pl_PL',ru:'ru_RU'}[lang]}">${lang==='en'?`<script src="${p}lang.js" data-target="../{lang}/portfolio/"></script>`:''}<link rel="icon" href="${p}assets/favicon.svg" type="image/svg+xml"><link rel="icon" href="${p}assets/favicon-32.png" sizes="32x32" type="image/png"><link rel="apple-touch-icon" href="${p}assets/apple-touch-icon.png" sizes="180x180"><link rel="icon" href="${p}assets/favicon-16.png" sizes="16x16" type="image/png"><link rel="icon" href="${p}favicon.ico" sizes="any"><link rel="manifest" href="${p}site.webmanifest"><meta name="application-name" content="YAUHENI.BUILD"><meta name="apple-mobile-web-app-title" content="YAUHENI"><meta name="author" content="Yauheni Travinau"><meta name="color-scheme" content="dark"><link rel="stylesheet" href="${p}styles.css"><link rel="stylesheet" href="${p}showcase.css">${langs.map(l=>{const local=l==='en'?(lang==='en'?'./':`${p}portfolio/`):`${p}${l}/portfolio/`;return `<link rel="alternate" hreflang="${l}" href="${local}">`;}).join('')}<link rel="alternate" hreflang="x-default" href="${lang==='en'?'./':`${p}portfolio/`}"><script src="${p}showcase.js" defer></script></head>
<body id="top"${lang==='en'?' data-root':''}><a class="skip" href="#main">${esc(t.skip)}</a>
<header class="header"><a class="brand" href="${home}index.html" aria-label="Yauheni home"><span class="brand-icon">YT<b>_</b></span><span class="brand-name">YAUHENI<span class="muted">.build</span></span></a><nav id="navigation" aria-label="${esc(t.menu)}">${t.nav.map((n,i)=>`<a href="${home}index.html#${['projects','playground','about','contact'][i]}">${navIcon(['projects','playground','about','contact'][i])}<span>${esc(n)}</span></a>`).join('')}<a href="#top" aria-current="page">${navIcon('showcase')}<span>${esc(pt.nav)}</span></a></nav><a class="header-cv" href="${cvHref}" download aria-label="${esc(t.cv)}">CV <span aria-hidden="true">↓</span></a><div class="locales" aria-label="Language">${langs.map(l=>{const local=l==='en'?(lang==='en'?'./':`${p}portfolio/`):`${p}${l}/portfolio/`;return `<a href="${local}" lang="${l}" hreflang="${l}" ${l===lang?'aria-current="page"':''}>${l.toUpperCase()}</a>`;}).join('')}</div><button class="menu-button" aria-controls="navigation" aria-expanded="false"><span>${esc(t.menu)}</span>${burger}</button></header>
<main id="main"><section class="showcase-hero container" aria-labelledby="showcase-title"><p class="eyebrow"><span>${esc(pt.label.split(' · ')[0])}</span> — ${esc(pt.label.split(' · ')[1])}</p><h1 id="showcase-title">${lines(pt.heading)}</h1><p class="showcase-lede">${esc(pt.intro)}</p></section>
${analytics}
${team}
<section class="showcase-list container" aria-label="${esc(pt.label)}"><div class="show-filters" role="group" aria-label="${esc(pt.filters[0])}">${pt.filters.map((f,i)=>`<button class="filter-chip${i===0?' is-active':''}" data-filter="${cats[i]}" aria-pressed="${i===0}">${esc(f)} <span>${i===0?shots.length:shots.filter(x=>x.category===cats[i]).length}</span></button>`).join('')}</div><div class="show-grid-list">${shots.map(card).join('')}</div></section>
<section class="showcase-foot container"><div data-reveal><a class="button secondary" href="${home}index.html">${esc(pt.back)} <span aria-hidden="true">→</span></a><p class="micro foot-note">${esc(pt.note)}</p></div></section></main>
<footer class="container footer"><a class="brand" href="${home}index.html"><span class="brand-icon">YT<b>_</b></span></a><p>© ${new Date().getUTCFullYear()} Yauheni Travinau · ${esc(t.footer)}</p><a href="#top">${esc(t.top)} ↑</a></footer><noscript><p class="container">${esc(t.nojs)}</p></noscript></body></html>`;
 html=html.replaceAll(`${p}assets/`,`${asset}assets/`).replaceAll(`href="${p}styles.css"`,`href="${asset}styles.css"`).replaceAll(`href="${p}showcase.css"`,`href="${asset}showcase.css"`).replaceAll(`src="${p}showcase.js"`,`src="${asset}showcase.js"`).replaceAll(`src="${p}lang.js"`,`src="${asset}lang.js"`);
 if(siteUrl){
  const canonical=siteUrl+(lang==='en'?'portfolio/':`${lang}/portfolio/`);
  const image=siteUrl+staticPath+`assets/og-portfolio-${lang}.jpg`;
  const social=`<link rel="canonical" href="${esc(canonical)}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:image" content="${esc(image)}"><meta property="og:image:secure_url" content="${esc(image)}"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(pt.title)}"><meta property="og:locale:alternate" content="${langs.filter(l=>l!==lang).map(l=>({en:'en_US',pl:'pl_PL',ru:'ru_RU'}[l])).join('"><meta property="og:locale:alternate" content="')}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(pt.title)}"><meta name="twitter:description" content="${esc(pt.description)}"><meta name="twitter:image" content="${esc(image)}"><meta name="twitter:image:alt" content="${esc(pt.title)}"><script type="application/ld+json">${JSON.stringify([personLd(canonical,image,pt.description,lang),{"@context":"https://schema.org","@type":"CollectionPage","name":pt.title,"url":canonical,"inLanguage":localeTag[lang],"isPartOf":{"@type":"WebSite","name":"YAUHENI.BUILD","url":siteUrl},"mainEntity":{"@type":"ItemList","numberOfItems":shots.length,"itemListElement":shots.map((x,i)=>({"@type":"ListItem","position":i+1,"name":x.title,"description":x.summary}))}},{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"YAUHENI.BUILD","item":siteUrl+(lang==='en'?'en/':`${lang}/`)},{"@type":"ListItem","position":2,"name":pt.nav,"item":canonical}]}]).replace(/</g,'\\u003c')}</script>`;
  html=html.replace('</head>',`${social}</head>`);
  langs.forEach(l=>{
   const local=l==='en'?(lang==='en'?'./':`${p}portfolio/`):`${p}${l}/portfolio/`;
   const remote=siteUrl+(l==='en'?'portfolio/':`${l}/portfolio/`);
   html=html.replace(`hreflang="${l}" href="${local}"`,`hreflang="${l}" href="${esc(remote)}"`);
  });
  html=html.replace(`hreflang="x-default" href="${lang==='en'?'./':`${p}portfolio/`}"`,`hreflang="x-default" href="${esc(siteUrl+'portfolio/')}"`);
 }
 const target=lang==='en'?resolve(out,'portfolio'):resolve(out,lang,'portfolio');
 await mkdir(target,{recursive:true});await writeFile(resolve(target,'index.html'),html);
}
const base404=siteUrl||'/';
await writeFile(resolve(out,'404.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><meta name="theme-color" content="#08090d"><title>404 — YAUHENI.BUILD</title><link rel="icon" href="${base404}${staticPath}assets/favicon.svg" type="image/svg+xml"><link rel="icon" href="${base404}favicon.ico" sizes="any"><link rel="stylesheet" href="${base404}${staticPath}styles.css"></head><body><main class="notfound container"><p class="eyebrow"><span>404</span> — YAUHENI.BUILD</p><h1>${esc(ui.en.notfound)}</h1><p>${esc(ui.pl.notfound)}<br>${esc(ui.ru.notfound)}</p><div class="notfound-links">${langs.map(l=>`<a class="button ${l==='en'?'primary':'secondary'}" href="${base404}${l}/">${esc(ui[l].home)} <span aria-hidden="true">→</span></a>`).join('')}</div></main></body></html>`);
await writeFile(resolve(out,'.nojekyll'),'');
await writeFile(resolve(out,'_headers'),netlifyHeaders());
await writeFile(resolve(out,'robots.txt'),`User-agent: *\nAllow: /\n${siteUrl?'Sitemap: '+siteUrl+'sitemap.xml\n':''}`);
const today=new Date().toISOString().slice(0,10),pageUrl=(kind,l)=>siteUrl+(kind==='home'?`${l}/`:(l==='en'?'portfolio/':`${l}/portfolio/`));
if(siteUrl)await writeFile(resolve(out,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${['home','portfolio'].flatMap(kind=>langs.map(l=>`<url><loc>${esc(pageUrl(kind,l))}</loc><lastmod>${today}</lastmod>${langs.map(a=>`<xhtml:link rel="alternate" hreflang="${a}" href="${esc(pageUrl(kind,a))}"/>`).join('')}<xhtml:link rel="alternate" hreflang="x-default" href="${esc(pageUrl(kind,'en'))}"/></url>`)).join('')}</urlset>`);
await import('./check.mjs');
console.log('Built static portfolio: /, /en/, /pl/, /ru/ + /portfolio/, /{lang}/portfolio/ → dist');
