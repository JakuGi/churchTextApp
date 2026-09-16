// Vytvorí jeden samostatný súbor organista.html, ktorý funguje aj po otvorení
// priamo z disku (dvojklikom), bez servera a bez internetu.
//
// Spustenie: npm run build

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(join(ROOT, path), 'utf8');

// Poradie modulov = poradie závislostí (bez kruhových odkazov).
const MODULES = [
  'js/xmlparse.js',
  'js/songs.js',
  'js/store.js',
  'js/import.js',
  'js/bus.js',
  'js/display-core.js',
  'js/cast.js',
  'js/present.js',
  'js/app.js',
];

/** Z ES modulu spraví obyčajný kód – všetko beží v jednom rozsahu. */
function flatten(source) {
  return source
    .replace(/^\s*import\s+[^;]*?from\s*['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^\s*export\s+(?=(const|let|var|function|async|class)\b)/gm, '')
    .replace(/^\s*export\s*\{[^}]*\};?\s*$/gm, '')
    .replace(/^\s*export\s+default\s+/gm, 'const __default = ');
}

const css = ['css/screen.css', 'css/app.css']
  .map((path) => read(path).replace(/@import url\([^)]*\);\s*/g, ''))
  .join('\n');

const displayCss = read('css/display.css').replace(/@import url\([^)]*\);\s*/g, '');

const script = MODULES.map((path) => `\n/* ===== ${path} ===== */\n${flatten(read(path))}`).join('\n');

/** V HTML ukončí `</script>` blok skriptu aj vnútri reťazca – treba ho rozbiť. */
const safe = (code) => code.replace(/<\/(script)/gi, '<\\/$1');

// Premietacie okno sa v samostatnom súbore otvára ako blob – rovnaký kód,
// len bez potreby druhého súboru na disku.
const displayPage = `<!DOCTYPE html><html lang="sk"><head><meta charset="utf-8">
<title>Texty piesní – obrazovka</title><style>${displayCss}\n${read('css/screen.css')}</style></head>
<body class="display"><div id="root" class="display__root"></div>
<script>
${flatten(read('js/bus.js'))}
${flatten(read('js/display-core.js'))}
const display = createDisplay(document.getElementById('root'));
createLocalBus().subscribe((state) => display.render(state));
document.addEventListener('dblclick', () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen().catch(() => {});
});
<\/script></body></html>`;

let html = read('index.html');

// Náhrady sa robia funkciou – v reťazcovej náhrade má `$` špeciálny význam
// a poškodil by kód (napr. `$$` z pomocných funkcií).
html = html
  .replace('<link rel="stylesheet" href="css/app.css">', () => `<style>\n${css}\n</style>`)
  .replace(/\s*<link rel="manifest"[^>]*>/, '')
  .replace(/\s*<link rel="icon"[^>]*>/, '')
  .replace(/\s*<link rel="apple-touch-icon"[^>]*>/, '')
  .replace('<img src="icon.svg" alt="" width="28" height="28">', () => '<span aria-hidden="true">🎵</span>')
  .replace(
    '<script type="module" src="js/app.js"></script>',
    () => `<script>\nwindow.DISPLAY_PAGE = ${safe(JSON.stringify(displayPage))};\nwindow.__SINGLE_FILE__ = true;\n${safe(script)}\n</script>`,
  );

writeFileSync(join(ROOT, 'organista.html'), html, 'utf8');
const size = Math.round(Buffer.byteLength(html, 'utf8') / 1024);
console.log(`organista.html vytvorený (${size} kB)`);
