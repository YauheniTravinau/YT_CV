import {readFile,stat,readdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {headersFor,netlifyHeaders} from './headers.mjs';
import {PHOTO_FRAME as photo} from '../src/character3d.js';
import {gunzipSync} from 'node:zlib';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const ui=JSON.parse(await readFile(resolve(root,'content/ui.json'),'utf8'));
const engineering=JSON.parse(await readFile(resolve(root,'content/engineering.json'),'utf8'));
const appSource=await readFile(resolve(root,'src/app.js'),'utf8');
const requiredElementIds=[...appSource.matchAll(/\$\('#([^']+)'\)/g)].map(match=>match[1]);
const crops=JSON.parse(await readFile(resolve(root,'content/frame-crops.json'),'utf8'));
assert.equal(crops.length,20);assert(crops.every(c=>c.bounds.length===4&&c.bounds.every(Number.isFinite)));
const widestPhoto=Math.max(...crops.map(c=>{const [l,t,r,b]=c.bounds;return Math.round((r-l+8)/(b-t+8)*photo.subjectHeight)/photo.width*photo.planeWidth;}));
assert(photo.minViewWidth>widestPhoto+2*photo.maxWarpX*photo.planeWidth,'Photo camera can clip a rotated/interpolated silhouette horizontally');
assert(photo.minViewHeight>photo.subjectHeight/photo.height*photo.planeHeight+2*photo.maxWarpY*photo.planeHeight,'Photo camera can clip the head or platform');
assert.equal(gunzipSync(await readFile(resolve(root,'assets/photo-flow.bin'))).length,photo.flowWidth*photo.flowHeight*2*40);
const shape=o=>JSON.stringify(Object.keys(o).sort().map(k=>[k,Array.isArray(o[k])?o[k].length:typeof o[k]]));
assert(headersFor('/static/hash/app.js')['Cache-Control'].includes('immutable'));
assert(headersFor('/en/')['Cache-Control'].includes('must-revalidate'));
assert(headersFor('/en/')['Content-Security-Policy'].includes("object-src 'none'"));
assert.equal(await readFile(resolve(root,'dist/_headers'),'utf8'),netlifyHeaders());
for(const lang of ['en','pl','ru']){
 assert.equal(shape(ui[lang]),shape(ui.en),`UI keys differ: ${lang}`);
 assert.equal(engineering[lang].notes.length,6);
 assert(engineering[lang].notes.every(n=>n.length===4&&n.every(v=>typeof v==='string'&&v.length>0)));
 const projects=JSON.parse(await readFile(resolve(root,`content/projects-${lang}.json`),'utf8'));
 assert.equal(projects.length,6);
 for(const project of projects){assert(project.title&&project.summary&&project.problem&&project.solution);for(const url of Object.values(project.links))assert.equal(new URL(url).protocol,'https:');}
 for(const route of lang==='en'?['','en']: [lang]){
  const dir=resolve(root,'dist',route),html=await readFile(resolve(dir,'index.html'),'utf8');
  assert(html.includes(`<html lang="${lang}">`));
  assert.equal([...html.matchAll(/<h1\b/g)].length,1);
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(ids.length,new Set(ids).size,'Duplicate IDs');
  for(const id of requiredElementIds)assert(ids.includes(id),`Enhancement script expects missing element #${id} on ${route}`);
  for(const [,attr,value] of html.matchAll(/\b(href|src)="([^"]+)"/g)){
   if(value.startsWith('#')){assert(ids.includes(value.slice(1)),`Missing anchor: ${value}`);continue;}
   if(/^(https?:|mailto:|tel:)/.test(value))continue;
   const file=resolve(dir,value.split('#')[0]);assert(file.startsWith(resolve(root,'dist')),`Path escapes dist: ${value}`);
   const info=await stat(file).catch(()=>null);assert(info,`Broken ${attr}: ${route}/${value}`);
   if(value.endsWith('/app.js'))for(const dependency of ['character3d.js','vendor/three.module.min.js','vendor/three.core.min.js','vendor/THREE-LICENSE.txt','assets/photo-flow.bin','assets/frame-crops.json'])await stat(resolve(dirname(file),dependency));
   if(info.isDirectory())await stat(resolve(file,'index.html'));
  }
  assert(!html.includes('localhost:3000'));assert(!html.includes('ai-core.glb'));
  assert.equal([...html.matchAll(/<script\b/g)].length,1+Number(Boolean(process.env.SITE_URL||(process.env.NETLIFY==='true'&&process.env.URL))),'Local script plus optional structured data');
  assert(!/<script(?![^>]*\bsrc=|[^>]*\btype="application\/ld\+json")/.test(html),'No executable inline JavaScript');
  assert(!/\son(?:click|load|error)\s*=/.test(html),'No inline handlers');
  for(const lang of ['en','pl','ru'])assert(html.includes(`hreflang="${lang}"`),`Missing language alternate: ${route}/${lang}`);
  for(const asset of ['favicon.svg','favicon-32.png','apple-touch-icon.png'])assert(html.includes(asset),`Missing icon: ${route}/${asset}`);
  assert(html.includes('max-image-preview:large'));
  if(route==='')assert(html.includes('data-root'),'Root page must negotiate browser language');
  const configuredUrl=process.env.SITE_URL||(process.env.NETLIFY==='true'?process.env.URL:'');
  if(configuredUrl){const base=new URL(configuredUrl).href.replace(/\/+$/,'');assert(html.includes(`rel="canonical" href="${base}/${lang}/"`));assert(html.includes(`property="og:image" content="${base}/static/`));assert(html.includes('og:image:type" content="image/jpeg"'));assert(html.includes('twitter:card" content="summary_large_image"'));const jsonLd=html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);assert(jsonLd,`Missing JSON-LD: ${route}`);assert(JSON.parse(jsonLd[1]).some(x=>x['@type']==='Person'),`Missing Person schema: ${route}`);const sitemap=await readFile(resolve(root,'dist/sitemap.xml'),'utf8');assert(sitemap.includes(`${base}/${lang}/`));}
 }
}
const showcaseSlugs=['aa-eucoins','accounting-pro','devhub','aura-browser','my-time','cryptogemscanner','cactusos','najmo','supply-lens','vesna'];
const referencedShots=new Set();
const enShowcase=JSON.parse(await readFile(resolve(root,'content/showcase-en.json'),'utf8'));
let enNorm=null;
for(const lang of ['en','pl','ru']){
 const items=JSON.parse(await readFile(resolve(root,`content/showcase-${lang}.json`),'utf8'));
 assert.equal(items.length,10,`Showcase project count: ${lang}`);
 assert.deepEqual(items.map(x=>x.slug),showcaseSlugs,`Showcase order: ${lang}`);
 const norm=[];
 for(const item of items){
  assert(item.title&&item.summary&&item.description,`Showcase text: ${item.slug}/${lang}`);
  assert(item.highlights.length>=3&&item.stack.length>=3,`Showcase lists: ${item.slug}/${lang}`);
  assert.equal(item.stack.length,enShowcase.find(x=>x.slug===item.slug).stack.length,`Stack size parity: ${item.slug}/${lang}`);
  assert(['web','desktop','android','ai'].includes(item.category),`Showcase category: ${item.slug}`);
  assert(['live','ready','private','prototype'].includes(item.status),`Showcase status: ${item.slug}`);
  for(const shot of item.screenshots){assert(shot.src&&shot.caption&&shot.w>0&&shot.h>0,`Shot meta: ${item.slug}/${lang}`);referencedShots.add(shot.src);}
  for(const url of Object.values(item.links))assert.equal(new URL(url).protocol,'https:');
  norm.push([item.slug,item.category,item.status,item.year,item.screenshots.map(s=>[s.src,s.w,s.h])]);
 }
 if(enNorm)assert.deepEqual(norm,enNorm,`Showcase structure differs: ${lang}`);else enNorm=norm;
}
const shotFiles=(await readdir(resolve(root,'assets/projects'))).filter(f=>f.endsWith('.jpg')).sort();
assert.deepEqual([...referencedShots].sort(),shotFiles,'Showcase screenshots do not match files in assets/projects');
for(const lang of ['en','pl','ru']){
 for(const route of lang==='en'?['portfolio']:[`${lang}/portfolio`]){
  const dir=resolve(root,'dist',route),html=await readFile(resolve(dir,'index.html'),'utf8');
  assert(html.includes(`<html lang="${lang}">`),`Portfolio lang: ${route}`);
  assert.equal([...html.matchAll(/<h1\b/g)].length,1,`Portfolio h1: ${route}`);
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(ids.length,new Set(ids).size,`Duplicate IDs: ${route}`);
  for(const [,attr,value] of html.matchAll(/\b(href|src)="([^"]+)"/g)){
   if(value.startsWith('#')){assert(ids.includes(value.slice(1)),`Missing anchor: ${value}`);continue;}
   if(/^(https?:|mailto:|tel:)/.test(value))continue;
   const file=resolve(dir,value.split('#')[0]);assert(file.startsWith(resolve(root,'dist')),`Path escapes dist: ${value}`);
   const info=await stat(file).catch(()=>null);assert(info,`Broken ${attr}: ${route}/${value}`);
   if(info.isDirectory())await stat(resolve(file,'index.html'));
  }
  assert.equal([...html.matchAll(/<script\b/g)].length,1+Number(Boolean(process.env.SITE_URL||(process.env.NETLIFY==='true'&&process.env.URL))),`Local script plus optional structured data: ${route}`);
  assert(!/<script(?![^>]*\bsrc=|[^>]*\btype="application\/ld\+json")/.test(html),`No executable inline JavaScript: ${route}`);
  assert(!/\son(?:click|load|error)\s*=/.test(html),`No inline handlers: ${route}`);
  const configuredUrl=process.env.SITE_URL||(process.env.NETLIFY==='true'?process.env.URL:'');
  for(const alternate of ['en','pl','ru'])assert(html.includes(`hreflang="${alternate}"`),`Portfolio language alternate: ${route}/${alternate}`);
  for(const asset of ['favicon.svg','favicon-32.png','apple-touch-icon.png'])assert(html.includes(asset),`Portfolio icon missing: ${route}/${asset}`);
  if(configuredUrl){const base=new URL(configuredUrl).href.replace(/\/+$/,'');const canonicalPath=(lang==='en'?'':`/${lang}`)+'/portfolio/';assert(html.includes(`rel="canonical" href="${base}${canonicalPath}"`),`Portfolio canonical: ${route}`);assert(html.includes(`property="og:image" content="${base}/static/`));assert(html.includes('twitter:card" content="summary_large_image"'));const jsonLd=html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);assert(jsonLd,`Missing showcase JSON-LD: ${route}`);assert(JSON.parse(jsonLd[1]).some(x=>x['@type']==='CollectionPage'),`Missing CollectionPage schema: ${route}`);const sitemap=await readFile(resolve(root,'dist/sitemap.xml'),'utf8');assert(sitemap.includes(`${base}${canonicalPath}`),`Portfolio sitemap: ${route}`);}
 }
}
if(process.env.SITE_URL||(process.env.NETLIFY==='true'&&process.env.URL)){
 const sitemap=await readFile(resolve(root,'dist/sitemap.xml'),'utf8');
 assert.equal([...sitemap.matchAll(/<url>/g)].length,6,'Sitemap must list six canonical localized pages');
 assert((await readFile(resolve(root,'dist/robots.txt'),'utf8')).includes('Sitemap: '),'robots.txt must reference sitemap.xml');
} else assert.equal((await readdir(resolve(root,'dist'))).includes('sitemap.xml'),false,'Do not emit a sitemap without a public base URL');
console.log('PASS: locale parity, 6 case studies, 10 showcase projects, 6 canonical localized URLs plus the language-aware root, anchors/assets/links, safe project URLs, CSP/cache policies and SEO URL configuration');
