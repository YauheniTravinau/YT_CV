// Draws the brand assets (favicon set, app icons, link-preview cards) from code.
//   node scripts/brand/make-assets.mjs
// Needs: Microsoft Edge (headless screenshots) and Python with Pillow (resize / JPEG / ICO).
// Outputs go to assets/. The build copies them into dist; nothing here runs during `npm run build`.
import {readFile, writeFile, mkdir, rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve, dirname} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const work = resolve(root, 'scripts/brand/.work');
const assets = resolve(root, 'assets');
const ui = JSON.parse(await readFile(resolve(root, 'content/ui.json'), 'utf8'));
const roles = JSON.parse(await readFile(resolve(root, 'content/roles.json'), 'utf8'));
const edge = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'];
const url = p => pathToFileURL(p).href;
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

await rm(work, {recursive: true, force: true});
await mkdir(work, {recursive: true});

function shoot(html, name, w, h, transparent = false) {
  const file = resolve(work, name + '.html'), png = resolve(work, name + '.png');
  return writeFile(file, html).then(() => {
    let ok = false;
    for (const exe of edge) {
      try {
        execFileSync(exe, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', `--window-size=${w},${h}`,
          ...(transparent ? ['--default-background-color=00000000'] : []), `--screenshot=${png}`, url(file)], {stdio: 'ignore', timeout: 90000});
        ok = true; break;
      } catch {}
    }
    if (!ok) throw Error('Edge screenshot failed: ' + name);
    return png;
  });
}

// ---------- the mark: Y (white) + T (cyan) + a cyan "cursor" underscore ----------
const mark = ({rounded = true, scale = 1} = {}) => {
  const k = scale, o = 32 - 32 * k;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1a1f33"/><stop offset="1" stop-color="#07080d"/></linearGradient><radialGradient id="h" cx=".78" cy=".12" r=".7"><stop offset="0" stop-color="#5ad0ff" stop-opacity=".30"/><stop offset="1" stop-color="#5ad0ff" stop-opacity="0"/></radialGradient></defs>`
    + `<rect width="64" height="64"${rounded ? ' rx="15"' : ''} fill="url(#g)"/><rect width="64" height="64"${rounded ? ' rx="15"' : ''} fill="url(#h)"/>`
    + (rounded ? `<rect x=".75" y=".75" width="62.5" height="62.5" rx="14.3" fill="none" stroke="#5ad0ff" stroke-opacity=".4" stroke-width="1.5"/>` : '')
    + `<g transform="translate(${o} ${o}) scale(${k})" fill="none" stroke-linecap="round" stroke-linejoin="round">`
    + `<path d="M9.5 17.5l8 14.8V46.5M25.5 17.5L17.5 32.3" stroke="#eef0f6" stroke-width="5.4"/>`
    + `<path d="M33.5 17.5h14.5M40.75 17.5v29" stroke="#5ad0ff" stroke-width="5.4"/>`
    + `<path d="M52.5 46.5h5.5" stroke="#5ad0ff" stroke-width="4.2"/></g></svg>`;
};
await writeFile(resolve(assets, 'favicon.svg'), mark() + '\n');
const inline = svg => svg.replace(/id="g"/g, 'id="gg"').replace(/url\(#g\)/g, 'url(#gg)').replace(/id="h"/g, 'id="hh"').replace(/url\(#h\)/g, 'url(#hh)');
const iconPage = (svg, size, bg = 'transparent') => `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:${bg}}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`;
await shoot(iconPage(mark(), 512), 'icon-512', 512, 512, true);
await shoot(iconPage(mark({rounded: false}), 360, '#07080d'), 'apple-360', 360, 360);
await shoot(iconPage(mark({rounded: false, scale: 0.74}), 512, '#07080d'), 'maskable-512', 512, 512);

// ---------- link-preview cards (1200 x 630) ----------
const shotUrl = f => url(resolve(root, 'assets/projects', f));
const character = url(resolve(root, 'frames/frame_00.webp'));
const liveCount = 2;                    // aa-eucoins.de, cryptogemscanner.com (status "live" in showcase data)
const chips = {
  en: [`${liveCount} live products`, '10 projects', `${roles.roles.length} roles · 1 author`],
  pl: [`${liveCount} działające produkty`, '10 projektów', `${roles.roles.length} ról · 1 autor`],
  ru: [`${liveCount} рабочих продукта`, '10 проектов', `${roles.roles.length} ролей · 1 автор`]
};
const base = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1200px;height:630px;overflow:hidden;background:#08090d;font-family:"Segoe UI Variable Display","Segoe UI",Arial,sans-serif;color:#eef0f6}
.card{position:relative;width:1200px;height:630px;overflow:hidden;background:
 radial-gradient(620px 520px at 86% 40%,rgba(90,208,255,.20),transparent 70%),
 radial-gradient(520px 380px at 0% 105%,rgba(167,139,250,.16),transparent 70%),#08090d}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);background-size:60px 60px;
 -webkit-mask-image:radial-gradient(ellipse 80% 90% at 75% 40%,#000 10%,transparent 70%);mask-image:radial-gradient(ellipse 80% 90% at 75% 40%,#000 10%,transparent 70%)}
.brand{position:absolute;left:72px;top:58px;display:flex;align-items:center;gap:16px;font:600 22px Consolas,"Cascadia Mono",monospace;letter-spacing:.16em;color:#a4aabc}
.brand svg{width:54px;height:54px;display:block}
.eyebrow{position:absolute;left:72px;top:142px;font:500 18px Consolas,"Cascadia Mono",monospace;letter-spacing:.11em;text-transform:uppercase;color:#5ad0ff;white-space:nowrap}
h1{position:absolute;left:72px;top:182px;font-weight:700;font-size:92px;line-height:1.0;letter-spacing:-.045em;max-width:700px}
h1 em{display:block;font:italic 400 100px/.95 "Iowan Old Style","Palatino Linotype",Georgia,serif;letter-spacing:-.03em;color:#5ad0ff}
.row{position:absolute;left:72px;bottom:64px;display:flex;gap:12px;flex-wrap:wrap;max-width:700px}
.chip{padding:11px 20px;border:1.5px solid rgba(255,255,255,.2);border-radius:999px;font-size:23px;font-weight:600;background:rgba(255,255,255,.05);white-space:nowrap}
.chip:first-child{border-color:rgba(200,245,96,.55);color:#c8f560}
.name{position:absolute;left:72px;bottom:128px;font-size:25px;color:#a4aabc}
.char{position:absolute;right:70px;top:60px;width:420px;height:518px;object-fit:contain;filter:drop-shadow(0 24px 40px rgba(0,0,0,.65))}
.halo{position:absolute;right:62px;top:452px;width:436px;height:96px;border-radius:50%;border:2px solid rgba(90,208,255,.55);box-shadow:0 0 44px rgba(90,208,255,.4),inset 0 0 40px rgba(90,208,255,.25)}
.halo.two{right:20px;top:424px;width:520px;height:152px;border-color:rgba(90,208,255,.22);box-shadow:0 0 60px rgba(90,208,255,.18)}
.collage{position:absolute;right:-30px;top:78px;width:560px;height:480px}
.collage img{position:absolute;width:420px;border-radius:16px;border:1.5px solid rgba(255,255,255,.25);box-shadow:0 30px 60px rgba(0,0,0,.6)}
.collage .a{right:40px;top:0;transform:rotate(4deg)}
.collage .b{right:96px;top:150px;transform:rotate(-3deg)}
.collage .c{right:30px;top:290px;transform:rotate(2deg)}
.stripe{position:absolute;left:0;right:0;bottom:0;height:6px;background:linear-gradient(90deg,#5ad0ff,#a78bfa 60%,#c8f560)}
`;
const markInline = inline(mark());
function homeCard(lang) {
  const t = ui[lang];
  return `<!doctype html><meta charset="utf-8"><style>${base}</style><div class="card"><div class="grid"></div>
  <div class="brand">${markInline}<span>YAUHENI.BUILD</span></div>
  <div class="eyebrow">${esc(t.eyebrow)}</div>
  <h1>${esc(t.hero[0])}<em>${esc(t.hero[1])}</em>${esc(t.hero[2])}</h1>
  <div class="name">Yauheni Travinau · ${esc(t.location)}</div>
  <div class="row">${chips[lang].map(c => `<span class="chip">${esc(c)}</span>`).join('')}</div>
  <div class="halo two"></div><div class="halo"></div><img class="char" src="${character}" alt="">
  <div class="stripe"></div></div>`;
}
function portfolioCard(lang) {
  const t = ui[lang], pt = t.portfolio, heading = pt.heading.split('\n');
  return `<!doctype html><meta charset="utf-8"><style>${base}h1{font-size:84px}h1 em{font-size:92px}</style><div class="card"><div class="grid"></div>
  <div class="brand">${markInline}<span>YAUHENI.BUILD</span></div>
  <div class="eyebrow">${esc(pt.label.replace(' · ', ' — '))}</div>
  <h1>${esc(heading[0])}<em>${esc(heading[1] || '')}</em></h1>
  <div class="name">Yauheni Travinau · ${esc(t.location)}</div>
  <div class="row">${chips[lang].map(c => `<span class="chip">${esc(c)}</span>`).join('')}</div>
  <div class="collage"><img class="a" src="${shotUrl('aa-eucoins-desktop.jpg')}" alt=""><img class="b" src="${shotUrl('accounting-desktop.jpg')}" alt=""><img class="c" src="${shotUrl('cryptogem-desktop.jpg')}" alt=""></div>
  <div class="stripe"></div></div>`;
}
const cards = [];
for (const lang of ['en', 'pl', 'ru']) {
  cards.push([await shoot(homeCard(lang), `og-home-${lang}`, 1200, 630), `og-home-${lang}.jpg`]);
  cards.push([await shoot(portfolioCard(lang), `og-portfolio-${lang}`, 1200, 630), `og-portfolio-${lang}.jpg`]);
}

// ---------- Pillow: resize, JPEG, ICO ----------
const job = {
  assets,
  png: [[resolve(work, 'icon-512.png'), 'icon-512.png', 512], [resolve(work, 'icon-512.png'), 'icon-192.png', 192], [resolve(work, 'icon-512.png'), 'favicon-32.png', 32], [resolve(work, 'icon-512.png'), 'favicon-16.png', 16],
    [resolve(work, 'apple-360.png'), 'apple-touch-icon.png', 180], [resolve(work, 'maskable-512.png'), 'icon-maskable-512.png', 512]],
  ico: [resolve(work, 'icon-512.png'), 'favicon.ico', [16, 32, 48]],
  jpg: cards.map(([src, dst]) => [src, dst])
};
const py = `
import json,sys
from PIL import Image
j=json.load(open(sys.argv[1],encoding='utf8'));A=j['assets']
for src,dst,size in j['png']:
    im=Image.open(src).convert('RGBA'); im=im.resize((size,size),Image.LANCZOS) if im.size!=(size,size) else im; im.save(A+'/'+dst,optimize=True)
src,dst,sizes=j['ico']; im=Image.open(src).convert('RGBA'); im.save(A+'/'+dst,sizes=[(s,s) for s in sizes])
for src,dst in j['jpg']:
    im=Image.open(src).convert('RGB')
    if im.size!=(1200,630):
        print('size',src,im.size); im=im.crop((0,0,1200,630)) if im.size[0]>=1200 and im.size[1]>=630 else im.resize((1200,630),Image.LANCZOS)
    im.save(A+'/'+dst,quality=86,optimize=True,progressive=True,subsampling=0)
print('ok')
`;
await writeFile(resolve(work, 'job.json'), JSON.stringify(job));
await writeFile(resolve(work, 'convert.py'), py);
console.log(execFileSync('python', [resolve(work, 'convert.py'), resolve(work, 'job.json')], {encoding: 'utf8'}).trim());
await rm(work, {recursive: true, force: true});
