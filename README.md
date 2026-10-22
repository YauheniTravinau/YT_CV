# YAUHENI.BUILD

Lightweight trilingual portfolio for Yauheni Travinau. Static HTML, CSS and JavaScript. The photo character uses a lazy-loaded, locally bundled Three.js renderer; the alternative cube uses CSS 3D. No backend, API keys, external fonts or CDN requests.

## Local development

Requires Node.js 22 or newer. Run commands **inside `programmer_360_website`**:

```sh
npm run dev
```

Open http://127.0.0.1:4186. After editing source, run `npm run build`, then refresh. The preview server reads the generated files directly.

```sh
npm run build
npm run check
```

Output: `dist/`. The build includes the checks. `dist/index.html` also works as a basic file-based preview; clipboard permissions depend on the browser.

## Netlify

Upload **this folder's contents as the repository root**, then import it into Netlify. `netlify.toml` sets build command `npm run build`, publish directory `dist` and Node.js 22. The build generates `dist/_headers` from `scripts/headers.mjs` for content-hashed asset caching and security headers. The preview server uses the same policies.

Netlify's build `URL` supplies the public address automatically. For a custom domain, set `SITE_URL=https://your-domain.example`. This generates canonical URLs, absolute Open Graph images and `sitemap.xml`.

If importing the **entire parent workspace**, set Netlify's base directory to `programmer_360_website`.

For drag-and-drop publishing, build with the real `SITE_URL`, then upload **the contents of `dist`**, including `_headers`:

```powershell
$env:SITE_URL = 'https://your-name.netlify.app'
npm run build
```

Without a public URL, the build omits canonical/sitemap instead of inventing a domain. Rebuild with the real URL before manual publishing.

## GitHub Pages

Publish **this folder as the repository root**, including `.github/workflows/pages.yml`. In Settings → Pages, choose **GitHub Actions**. Push to `main` or run the workflow manually. It discovers the Pages base URL, builds, checks, and publishes `dist`.

Relative links work at repository subpaths. GitHub Pages controls its own HTTP headers; Netlify header rules do not apply there.

## Content

```
content/ui.json                  EN / PL / RU interface copy
content/engineering.json         Technical explanations
content/cv-{en,pl,ru}.json        CV facts and translations
content/projects-{en,pl,ru}.json  Six case studies per language
src/styles.css                   Responsive layout, CSS 3D, print view
src/app.js                       Progressive enhancement
content/frame-crops.json          Per-view CSS crops and alignment offsets
assets/                          Optimized artwork and original Polish CV
frames/                          20 supplied WebP frames (~1 MB total)
scripts/build.mjs                Rendering, content hashing, SEO and checks
scripts/check.mjs                Translation, local-link and content checks
```

The 15 MB GLB and old Next.js project are not shipped. Project cards use a readable text layout without decorative images. Career facts/project descriptions come from the supplied CV/materials; external services have not been verified live.

Without JavaScript, text, case studies, navigation and CV download remain available. With JS: filters, clipboard and scene controls. The original photo character is the default scene. It makes a slow 20-second turn using continuously interpolated views. Numeric optical-flow fields reproject neighboring images before blending. Each image is individually cropped and centered in a canvas; original files are preserved. This is photo-based 2.5D, not a reconstructed solid model. Dragging suspends automatic movement; releasing resumes smoothly from the selected view. The CSS 3D module is available as the second scene. The character supports arrow keys; the cube has a native slider. Reduced-motion preferences disable initial automatic rotation and stop it when the preference changes. A user can explicitly start movement with the play button. Offscreen/hidden tabs pause the loop; a static front image remains visible while loading or if WebGL is unavailable.

The progress line indicates reading position, not simulated loading. The terminal displays design notes, not fabricated live checks. No analytics or service worker is included.

## Before sharing

1. Review email/phone, CV and project descriptions.
2. Configure the production URL and verify the deployed language routes and CV download.
3. Check actual host headers, HTTPS, social previews and external project links after deployment.

Build checks do not constitute a penetration test, physical-device test or search-ranking guarantee.

## Asset rights

Artwork, character frames and CV were supplied by the owner. Verify redistribution rights before publication; no third-party license is invented for them.

## Hosting references

- [Netlify custom headers](https://docs.netlify.com/manage/routing/headers/)
- [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

## Photo renderer

`src/character3d.js` renders a single textured plane with two source views and two numeric optical-flow fields. It uses camera margins instead of cutting the figure at the viewer edge. `assets/photo-flow.bin` is precomputed gzip-compressed numeric displacement data; the standard Node build needs no Python packages. The optional reproducibility script is in `../source-materials/processing-20261014/analyze-photo-flow.py` and requires Pillow, NumPy, SciPy and OpenCV. The build uses the committed compressed data and does not install these Python tools.

Three.js 0.180.0 is bundled locally under its MIT license in `src/vendor/THREE-LICENSE.txt`. Pixel ratio is capped at 1.75; hidden/offscreen animation pauses. Mobile frame rate depends on hardware; no universal 60 FPS guarantee is made.

For a 360-degree turn, the source views define the visible details. Some original side views already have cut edges; cropping removes neighboring fragments but cannot reconstruct missing content. Optical-flow interpolation softens the transitions, and edge-aware blending limits duplicated outlines. It is not a guarantee of perfect geometry from photographs.

## Языки и маршруты

| Адрес | Язык и назначение |
| --- | --- |
| `/` | Стартовый адрес: выбирает первый поддерживаемый язык браузера (`ru`, `pl`, `en`); сохранённый выбор в переключателе языка имеет приоритет. Если язык не распознан, показывается английская версия. |
| `/en/`, `/pl/`, `/ru/` | Главные страницы на английском, польском и русском. Прямой адрес всегда сохраняет явно выбранный язык. |
| `/portfolio/`, `/pl/portfolio/`, `/ru/portfolio/` | Расширенное портфолио и подробные проекты на соответствующем языке. |

Переводы интерфейса и общие метаданные находятся в `content/ui.json`; CV-факты и опыт — в `content/cv-en.json`, `content/cv-pl.json`, `content/cv-ru.json`; карточки главных проектов — в `content/projects-{en,pl,ru}.json`; расширенные карточки и подписи снимков — в `content/showcase-{en,pl,ru}.json`; инженерные пояснения — в `content/engineering.json`. При изменении переводов сохраняйте одинаковую структуру ключей во всех трёх языках.

## Поиск и предпросмотр ссылки

При публичной сборке указывайте настоящий адрес сайта: Netlify использует свой публичный URL автоматически, GitHub Pages передаёт URL публикации из workflow. Для ручной сборки задайте `SITE_URL`, затем выполните `npm run build`. В таком `dist` создаются абсолютные canonical и hreflang-ссылки, `robots.txt`, `sitemap.xml`, Schema.org JSON-LD, Open Graph и Twitter Card с публичным JPEG 1200×630. Без публичного домена сборка намеренно не придумывает canonical или sitemap.

Предпросмотр ссылки: для каждой страницы и языка своя карточка 1200×630 — `assets/og-home-{en,pl,ru}.jpg` для главной и `assets/og-portfolio-{en,pl,ru}.jpg` для витрины. Иконки: `favicon.svg`, `favicon.ico` (в корне сайта), `favicon-16.png`, `favicon-32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, плюс `site.webmanifest` для установки на телефон. Все эти файлы нарисованы кодом: `node scripts/brand/make-assets.mjs` (нужны Microsoft Edge и Python с Pillow) пересоздаёт их заново, например после смены текста или цветов. Перед первой отправкой новой ссылки сервисы могут держать старую миниатюру в собственном кеше: используйте их инструмент обновления предпросмотра (Facebook Sharing Debugger, LinkedIn Post Inspector).

Язык: адреса `/` и `/portfolio/` определяют язык браузера (`src/lang.js` выполняется до первой отрисовки): польский и русский (а также белорусский) открывают `/pl/` или `/ru/`, остальные остаются на английском. Выбор, сделанный переключателем EN/PL/RU, запоминается и главнее языка браузера. Прямые адреса `/pl/`, `/ru/`, `/en/` никогда не перенаправляются.

## GitHub и Netlify

В GitHub Actions выберите **Settings → Pages → GitHub Actions**, затем отправляйте ветку `main` или запускайте workflow вручную. Workflow собирает и публикует `dist`. Для Netlify импортируйте этот каталог как корень репозитория либо задайте Base directory `programmer_360_website` при импорте родительского проекта; команда сборки — `npm run build`, каталог публикации — `dist`. Публикационные заголовки безопасности и кеша генерирует `scripts/headers.mjs`; на GitHub Pages их задаёт хостинг.
