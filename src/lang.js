// Runs before first paint, and only on the two language-neutral entry points (/ and /portfolio/).
// An explicit /pl/ or /ru/ URL is never redirected. A language picked in the switcher is remembered
// and wins over the browser language; otherwise the first supported browser language is used.
(() => {
  try {
    const LANGS = ['en', 'pl', 'ru'], alias = {be: 'ru'};
    let saved = null;
    try { saved = localStorage.getItem('lang'); } catch {}
    const prefs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
    const browser = prefs.map(l => String(l).slice(0, 2).toLowerCase()).map(l => alias[l] || l).find(l => LANGS.includes(l));
    const wanted = LANGS.includes(saved) ? saved : browser;
    const target = document.currentScript && document.currentScript.dataset.target;
    if (target && wanted && wanted !== 'en') location.replace(target.replace('{lang}', wanted) + location.hash);
  } catch {}
})();
