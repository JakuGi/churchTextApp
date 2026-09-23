// Ovládacia aplikácia pre organistu (tablet).

import { store, loadSettings, saveSettings, storageKind } from './store.js';
import { searchSongs, compareSongs, normalize, parseNumber, VERSE_TYPES, songToXml } from './songs.js';
import { createEditor } from './editor.js';
import { dateKey, todayKey, humanDate, lcUrl, parsePsalmPage, psalmSong } from './psalms.js';
import { importFiles, systemForFolder } from './import.js';
import { createLocalBus, createNetBus, createNativeBus, displayState } from './bus.js';
import { isNative, call } from './native.js';
import { createDisplay } from './display-core.js';
import { createCast } from './cast.js';

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

const state = {
  songs: [],
  folders: [],
  sets: [],
  activeFolder: null,
  query: '',
  set: { id: null, name: 'Nový set', items: [] },   // items = id piesní
  live: { songs: [], songIndex: 0, verseIndex: 0, blank: false },
  settings: loadSettings(),
  display: { connected: false, name: '' },
  view: 'library',
};

const bus = createLocalBus();
const net = createNetBus({ onStatus: (status) => renderNetStatus(status) });
const nativeBus = createNativeBus();
let editor = null;
let displayWindow = null;
let wakeLock = null;

const cast = createCast({
  appId: state.settings.castAppId,
  onStatus: (status) => renderCastStatus(status),
});

// ------------------------------------------------------------------ pomôcky

function songById(id) {
  return state.songs.find((song) => song.id === id) || null;
}

/** Slovenské skloňovanie: 1 pieseň, 2–4 piesne, 5+ piesní. */
function pluralSongs(count) {
  if (count === 1) return '1 pieseň';
  if (count >= 2 && count <= 4) return `${count} piesne`;
  return `${count} piesní`;
}

/** Slovenské skloňovanie: 1 sloha, 2–4 slohy, 5+ slôh. */
function pluralVerses(count) {
  if (count === 1) return '1 sloha';
  if (count >= 2 && count <= 4) return `${count} slohy`;
  return `${count} slôh`;
}

function songLabel(song) {
  return song.number ? `${song.system || ''} ${song.number}`.trim() : '';
}

// Vždy sa hneď ukáže posledná správa (rýchle opakované ťukanie napr. na
// „✓ V sete“ teda nikdy nečaká na doznenie predošlej). Keď bol pásik práve
// v polovici miznutia, vynúti sa prekreslenie pred návratom triedy
// is-visible – inak vedel prechod „zamrznúť“ v polceste (rovnaký trik ako
// pri prelínaní na televízore).
function toast(message, kind = 'info') {
  const box = $('#toast');
  const wasHidden = !box.classList.contains('is-visible');
  box.textContent = message;
  box.className = `toast toast--${kind}`;
  if (wasHidden) void box.offsetWidth;
  box.classList.add('is-visible');
  clearTimeout(box._timer);
  box._timer = setTimeout(() => box.classList.remove('is-visible'), 3200);
}

// Aktívne, keď editor bol otvorený priamo z premietania (editCurrentSong) –
// televízor vtedy ukazuje pôvodný text ďalej, kým sa pieseň opravuje.
let presentingInBackground = false;

function setView(view, opts = {}) {
  const previous = state.view;
  const leavingLiveDirectly = previous === 'live' && view !== 'live';
  // Keď organista z editora (otvoreného cez editCurrentSong) odíde inam než
  // späť na premietanie, berie sa to ako skutočné ukončenie premietania.
  const abandoningBackgroundEdit = presentingInBackground && previous === 'editor' && view !== 'live';

  state.view = view;
  $$('.view').forEach((node) => node.classList.toggle('is-active', node.dataset.view === view));
  $$('.tab').forEach((node) => node.classList.toggle('is-active', node.dataset.goto === view));
  document.body.classList.toggle('is-live', view === 'live');
  if (view === 'live') enableWakeLock();
  else releaseWakeLock();

  if (view === 'live') {
    presentingInBackground = false;
  } else if (leavingLiveDirectly && opts.keepPresenting) {
    presentingInBackground = true;
  } else if (leavingLiveDirectly || abandoningBackgroundEdit) {
    // Skutočný odchod z premietania hneď zhasne televízor; po návrate sa
    // text neobjaví skôr, než ho organista sám zapne.
    state.live.blank = true;
    presentingInBackground = false;
    publish();
  }
  updatePresentingIndicator();
}

/** Vrchný panel sa sfarbí, keď premietanie beží ďalej mimo záložky Naživo. */
function updatePresentingIndicator() {
  const active = presentingInBackground && !state.live.blank && state.live.songs.length > 0;
  document.body.classList.toggle('is-presenting-bg', active);
  const badge = $('#presentingBadge');
  if (!badge) return;
  badge.hidden = !active;
  if (active) {
    const song = currentSong();
    badge.textContent = `🔴 Premieta sa${song ? `: ${song.title}` : ''}`;
  }
}

async function enableWakeLock() {
  if (!state.settings.keepAwake || !navigator.wakeLock || wakeLock) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch {
    wakeLock = null;
  }
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
}

// ------------------------------------------------------------ dáta / načítanie

async function reloadLibrary() {
  const [songs, folders, sets] = await Promise.all([store.allSongs(), store.folders(), store.sets()]);
  state.songs = songs.sort(compareSongs);
  state.folders = folders.sort((a, b) => a.name.localeCompare(b.name, 'sk'));
  state.sets = sets.sort((a, b) => b.updatedAt - a.updatedAt);
  renderFolders();
  renderSongList();
  renderSetList();
  renderSavedSets();
}

// ------------------------------------------------------------------ knižnica

/**
 * Vyprázdni vyhľadávacie pole v knižnici – pri prepnutí zbierky alebo pri
 * pridaní nájdenej piesne do setu, aby nezostalo filtrovať zvyšok knižnice.
 */
function clearLibrarySearch() {
  if (!state.query) return;
  state.query = '';
  const input = $('#searchInput');
  if (input) input.value = '';
}

function renderFolders() {
  const box = $('#folders');
  const counts = new Map();
  for (const song of state.songs) counts.set(song.folder, (counts.get(song.folder) || 0) + 1);

  const items = [{ name: null, label: 'Všetky piesne', count: state.songs.length, system: '' }]
    .concat(state.folders.map((folder) => ({
      name: folder.name,
      label: folder.name,
      count: counts.get(folder.name) || 0,
      system: folder.system || '',
    })));

  box.innerHTML = '';
  for (const item of items) {
    const button = document.createElement('button');
    button.className = 'folder';
    button.classList.toggle('is-active', state.activeFolder === item.name);
    button.innerHTML = `<span class="folder__name">${item.label}</span>
      <span class="folder__meta">${item.system ? `<em>${item.system}</em>` : ''}${item.count}</span>`;
    button.onclick = () => {
      state.activeFolder = item.name;
      clearLibrarySearch();
      renderFolders();
      renderSongList();
    };
    box.appendChild(button);
  }
}

function visibleSongs() {
  // Jednorázovo načítaný žalm sa neukladá, preto nepatrí do zoznamu knižnice.
  const saved = state.songs.filter((song) => !song.temporary);
  const pool = state.activeFolder
    ? saved.filter((song) => song.folder === state.activeFolder)
    : saved;
  return searchSongs(pool, state.query);
}

function songRow(song, { action, actionLabel, subtitle }) {
  const row = document.createElement('div');
  row.className = 'song';
  const number = songLabel(song);
  row.innerHTML = `
    <div class="song__num">${number || '—'}</div>
    <div class="song__body">
      <div class="song__title">${song.title}</div>
      <div class="song__sub">${subtitle || `${song.folder} · ${pluralVerses(song.verses.length)}`}</div>
    </div>`;
  const edit = document.createElement('button');
  edit.className = 'btn btn--icon';
  edit.textContent = '✎';
  edit.title = 'Upraviť pieseň';
  edit.onclick = (event) => {
    event.stopPropagation();
    openEditor(song);
  };

  // Zelené tlačidlo „✓ V sete“ pieseň zo setu zase odoberie.
  const inSet = isInSet(song.id);
  const button = document.createElement('button');
  button.className = `btn btn--add${inSet ? ' btn--inset' : ''}`;
  button.textContent = inSet ? '✓ V sete' : actionLabel;
  button.title = inSet ? 'Kliknutím pieseň odoberieš zo setu' : 'Pridať pieseň do setu';
  button.onclick = (event) => {
    event.stopPropagation();
    if (isInSet(song.id)) removeSongFromSet(song.id);
    else action(song);
  };
  row.append(edit, button);
  row.onclick = () => openSongPreview(song);
  return row;
}

function renderSongList() {
  const box = $('#songList');
  const songs = visibleSongs();
  $('#songCount').textContent = songs.length ? pluralSongs(songs.length) : '';
  box.innerHTML = '';

  if (!state.songs.length) {
    const path = (isNative && call('songsFolder')) || 'Stiahnuté/Organista/piesne';
    box.innerHTML = `<div class="empty">
      <h3>Knižnica je prázdna</h3>
      <p>Napíš prvú pieseň tlačidlom <strong>✎ Nová pieseň</strong>, alebo načítaj priečinok
      s .xml súbormi tlačidlom <strong>Načítať priečinok</strong> – každý podpriečinok sa stane
      samostatnou zbierkou (napr. <em>JKS</em>).</p>
      <p class="only-native">Piesne z počítača: tablet pripoj USB káblom, súbory .xml skopíruj
      do priečinka <strong>${path}</strong> a potom ťukni na
      <strong>⬇ Načítať piesne z tabletu</strong>.</p></div>`;
    return;
  }
  if (!songs.length) {
    box.innerHTML = '<div class="empty"><h3>Nič sa nenašlo</h3><p>Skús iný názov alebo číslo.</p></div>';
    return;
  }
  const fragment = document.createDocumentFragment();
  for (const song of songs.slice(0, 400)) {
    fragment.appendChild(songRow(song, {
      actionLabel: '+ Do setu',
      action: (target) => {
        clearLibrarySearch();
        addToSet(target.id);
      },
    }));
  }
  box.appendChild(fragment);
}

function openSongPreview(song) {
  const dialog = $('#songDialog');
  $('#dialogTitle').textContent = song.title;
  $('#dialogMeta').textContent = [songLabel(song), song.folder, song.author].filter(Boolean).join(' · ');
  $('#dialogBody').innerHTML = song.verses.map((verse) => `
    <div class="verse-preview">
      <div class="verse-preview__label">${verse.type === 'chorus' ? 'Refrén' : `${verse.label}.`}</div>
      <div class="verse-preview__text">${verse.lines.map((line) => line || '&nbsp;').join('<br>')}</div>
    </div>`).join('');
  $('#dialogEdit').onclick = () => {
    dialog.close();
    openEditor(song);
  };
  const addButton = $('#dialogAdd');
  const alreadyIn = isInSet(song.id);
  addButton.textContent = alreadyIn ? '✓ V sete – odobrať' : '+ Do setu';
  addButton.title = alreadyIn ? 'Kliknutím pieseň odoberieš zo setu' : 'Pridať pieseň do setu';
  addButton.classList.toggle('btn--inset', alreadyIn);
  addButton.onclick = () => {
    if (isInSet(song.id)) removeSongFromSet(song.id);
    else addToSet(song.id);
    dialog.close();
  };
  $('#dialogPlay').onclick = () => {
    dialog.close();
    startLive([song.id], 0);
  };
  dialog.showModal();
}

// ------------------------------------------- záloha a aktualizácia (Android)

const AUTO_BACKUP_FILE = 'organista-zaloha-auto.xml';
const RELEASE_API = 'https://api.github.com/repos/JakuGi/churchTextApp/releases';

// ---------------------------------- priečinok s piesňami (Stiahnuté/…/piesne)

/** Názov súboru piesne; ak ho pieseň nemá, odvodí sa z názvu. */
function songFileName(song) {
  if (song.fileName && /\.xml$/i.test(song.fileName)) return song.fileName;
  const base = normalize(song.title || 'piesen')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'piesen';
  return `${song.number ? `${song.number}-` : ''}${base}.xml`;
}

/**
 * Zapíše pieseň do priečinka s piesňami, do podpriečinka podľa zbierky.
 * Priečinok je zároveň úložiskom, z ktorého sa knižnica načíta pri spustení,
 * takže nová pieseň tam musí pribudnúť hneď.
 */
function writeSongFile(song) {
  if (!isNative || !song || song.temporary) return false;
  if (!call('hasSongsFolder')) return false;
  return call('saveSongFile', song.folder || 'Ostatné', songFileName(song), songToXml(song)) === true;
}

/** Zmaže súbor piesne, aby sa pri ďalšom spustení znovu nenačítala. */
function removeSongFile(song) {
  if (!isNative || !song || song.temporary) return false;
  if (!call('hasSongsFolder')) return false;
  return call('deleteSongFile', song.folder || 'Ostatné', songFileName(song)) === true;
}

// ------------------------------------- sety v priečinku vedľa piesní (Organista/sety)

/** Názov súboru setu podľa jeho (nemenného) id. */
function setFileName(set) {
  const safe = String((set && set.id) || '').replace(/[^a-zA-Z0-9_-]/g, '') || `set-${Date.now()}`;
  return `${safe}.json`;
}

/**
 * Zapíše set do priečinka vedľa piesní. Funguje len s povoleným prístupom
 * k súborom (rovnaká podmienka ako pri priamom zápise piesní).
 */
function writeSetFile(set) {
  if (!isNative || !set || !call('hasFileAccess')) return false;
  return call('saveSetFile', setFileName(set), JSON.stringify(set, null, 2)) === true;
}

/** Zmaže súbor setu, aby sa pri ďalšom spustení znovu nenačítal. */
function removeSetFile(set) {
  if (!isNative || !set || !call('hasFileAccess')) return false;
  return call('deleteSetFile', setFileName(set)) === true;
}

let setsFolderLoaded = false;

/**
 * Sety uložené vedľa priečinka s piesňami sa načítajú pri každom spustení,
 * rovnako ako piesne – doplnia sa do knižnice uložených setov v pamäti.
 * Priečinok je to, čo prežije preinštalovanie appky, preto sa doň zároveň
 * dopíšu sety, ktoré v ňom ešte nie sú (napríklad uložené staršou verziou,
 * ktorá sety do priečinka ešte nezapisovala).
 */
async function loadSetsFolderAtStart() {
  if (!isNative || !call('hasFileAccess')) return;
  setsFolderLoaded = true;
  let files = [];
  try {
    files = JSON.parse(call('readSetsFolder') || '[]');
  } catch {
    files = [];
  }

  if (files.length) showProgress('Načítavam sety…', 0, files.length);
  const parsed = [];
  files.forEach((file, index) => {
    try {
      const set = JSON.parse(file.text);
      if (set && set.id && Array.isArray(set.items)) parsed.push(set);
    } catch {
      /* poškodený súbor sa preskočí */
    }
    showProgress('Načítavam sety…', index + 1, files.length);
  });
  if (files.length) hideProgress();

  // Pri rovnakom id vyhrá novšia verzia setu.
  const byId = new Map(state.sets.map((set) => [set.id, set]));
  const fromFolder = [];
  for (const set of parsed) {
    const known = byId.get(set.id);
    if (!known || (set.updatedAt || 0) >= (known.updatedAt || 0)) {
      byId.set(set.id, set);
      fromFolder.push(set);
    } else {
      writeSetFile(known);
    }
  }
  state.sets = Array.from(byId.values()).sort((a, b) => b.updatedAt - a.updatedAt);

  const inFolder = new Set(files.map((file) => file.name));
  const missing = state.sets.filter((set) => !inFolder.has(setFileName(set)));
  missing.forEach((set) => writeSetFile(set));

  if (fromFolder.length) await Promise.all(fromFolder.map((set) => store.putSet(set)));
  renderSavedSets();
}

/** Celá knižnica ako jeden .xml súbor. */
function libraryXml() {
  const body = state.songs
    .filter((song) => !song.temporary)
    .map((song) => songToXml(song).replace(/<\?xml[^>]*\?>\s*/, '').trim())
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<piesne>\n${body}\n</piesne>\n`;
}

/**
 * Automatická záloha do priečinka Stiahnuté/Organista/autosave. Robí sa po
 * spustení aplikácie a pred inštaláciou aktualizácie – vždy prepíše
 * predchádzajúci súbor, takže zaberá stále rovnaké miesto. Opakované
 * ukladanie každých 20 minút je vypnuté (knižnica sa aj tak zapisuje priamo
 * do priečinka s piesňami pri každej zmene, takže priebežná záloha navyše
 * nie je potrebná).
 */
function autoBackup() {
  if (!isNative || !state.songs.some((song) => !song.temporary)) return;
  const where = call('exportFileTo', 'autosave', AUTO_BACKUP_FILE, libraryXml());
  const info = $('#autoBackupInfo');
  if (info) {
    const time = new Date().toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
    info.textContent = where
      ? `Automatická záloha: ${where} (naposledy ${time}).`
      : 'Automatickú zálohu sa nepodarilo uložiť.';
  }
}

function startAutoBackup() {
  if (!isNative) return;
  autoBackup();
}

/**
 * Prázdna knižnica po preinštalovaní aplikácie sa sama obnoví z automatickej
 * zálohy v Stiahnuté/Organista/autosave. Piesne sa vrátia do tých istých
 * zbierok, z ktorých boli – zbierku si každá pieseň nesie v zálohe.
 */
async function restoreFromAutoBackup() {
  if (!isNative || state.songs.length) return false;
  const xml = call('readExportedFile', 'autosave', AUTO_BACKUP_FILE);
  if (!xml || !xml.trim()) return false;
  try {
    const result = await importFiles([{
      name: AUTO_BACKUP_FILE,
      webkitRelativePath: AUTO_BACKUP_FILE,
      text: async () => xml,
    }]);
    if (!result.songs) return false;
    await reloadLibrary();
    toast(`Knižnica obnovená zo zálohy: ${pluralSongs(result.songs)}.`, 'ok');
    return true;
  } catch {
    return false;
  }
}

// --------------------------------------------------------------- aktualizácia

const update = { waiting: null, latest: null };

window.organistaFetched = (result) => {
  const pending = update.waiting;
  update.waiting = null;
  if (!pending) return;
  if (result && result.ok) pending.resolve(result.text);
  else pending.reject(new Error((result && result.error) || 'Sťahovanie zlyhalo.'));
};

window.organistaUpdateState = (info) => {
  const badge = $('#updateStatus');
  if (!badge || !info) return;
  if (info.stage === 'installer') {
    badge.textContent = 'Spúšťam inštalátor…';
    badge.className = 'badge badge--ok';
  } else {
    badge.textContent = info.error || 'Aktualizácia zlyhala.';
    badge.className = 'badge badge--warn';
  }
};

function fetchNative(url) {
  return new Promise((resolve, reject) => {
    update.waiting = { resolve, reject };
    call('fetchText', url, 'window.organistaFetched');
    setTimeout(() => {
      if (update.waiting) {
        update.waiting = null;
        reject(new Error('GitHub neodpovedal včas.'));
      }
    }, 30000);
  });
}

/**
 * Číslo verzie bez značiek: „v1.2.3“ aj „a0.1.1“ → „1.2.3“ / „0.1.1“.
 * Alfa verzie majú hlavné číslo 0, takže sú vždy staršie ako budúca 1.0.0.
 */
function versionNumbers(value) {
  return String(value || '').replace(/^v/i, '').replace(/^a/i, '');
}

/** Porovná verzie v tvare a0.1.1 aj 1.2.3. */
function isNewer(candidate, current) {
  const parse = (value) => versionNumbers(value).split('.').map((part) => parseInt(part, 10) || 0);
  const [a, b] = [parse(candidate), parse(current)];
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    if ((a[index] || 0) !== (b[index] || 0)) return (a[index] || 0) > (b[index] || 0);
  }
  return false;
}

/** Z vydaní na GitHube vyberie najnovšiu verziu a odkaz na jej APK. */
function newestRelease(releases) {
  let best = null;
  for (const release of releases || []) {
    const version = String(release.tag_name || '').replace(/^v(?=\d)/, '');
    if (!/^a?\d+\.\d+/.test(version)) continue;
    const asset = (release.assets || []).find((item) => /\.apk$/i.test(item.name || ''));
    if (!asset) continue;
    if (!best || isNewer(version, best.version)) {
      best = { version, url: asset.browser_download_url, name: asset.name };
    }
  }
  return best;
}

async function checkUpdate() {
  const button = $('#checkUpdate');
  const badge = $('#updateStatus');
  const current = call('version') || '0.0.0';
  button.disabled = true;
  badge.textContent = 'Zisťujem…';
  badge.className = 'badge';

  try {
    const releases = JSON.parse(await fetchNative(RELEASE_API));
    const latest = newestRelease(releases);
    if (!latest) throw new Error('Na GitHube sa nenašlo žiadne vydanie s aplikáciou.');
    update.latest = latest;

    if (!isNewer(latest.version, current)) {
      badge.textContent = `Máš najnovšiu verziu (${current}).`;
      badge.className = 'badge badge--ok';
      return;
    }
    badge.textContent = `Je dostupná verzia ${latest.version}.`;
    badge.className = 'badge badge--warn';

    if (!confirm(`Je dostupná verzia ${latest.version} (máš ${current}).\n\n`
      + 'Stiahnuť a nainštalovať? Piesne a sety zostanú zachované a pred inštaláciou '
      + 'sa uloží záloha knižnice.')) return;

    autoBackup();
    badge.textContent = 'Sťahujem aktualizáciu…';
    call('installUpdate', latest.url, latest.version);
  } catch (error) {
    badge.textContent = error.message;
    badge.className = 'badge badge--warn';
  } finally {
    button.disabled = false;
  }
}

// ------------------------------------------------- responzóriový žalm

const psalm = { day: todayKey(), parsed: null, song: null, waiting: null };

/**
 * Stiahne stránku liturgického kalendára. V aplikácii pre Android to robí
 * natívna časť, pri spustení zo servera jeho sprostredkovanie; na statickom
 * hostingu to prehliadač nedovolí (cudzia doména).
 */
function loadLiturgyPage(day) {
  if (isNative) {
    return new Promise((resolve, reject) => {
      psalm.waiting = { resolve, reject };
      call('fetchLiturgy', day);
      setTimeout(() => {
        if (psalm.waiting) {
          psalm.waiting = null;
          reject(new Error('Kalendár neodpovedal včas.'));
        }
      }, 30000);
    });
  }
  return fetch(`api/liturgia?den=${encodeURIComponent(day)}`)
    .then((response) => {
      if (!response.ok) throw new Error('Kalendár sa nepodarilo načítať.');
      return response.text();
    })
    .catch(() => {
      throw new Error('Žalm vie stiahnuť aplikácia v tablete alebo spustenie cez `npm start`. '
        + 'Zo statickej stránky to prehliadač nedovolí.');
    });
}

/** Odpoveď z natívnej časti. */
window.organistaLiturgy = (result) => {
  const pending = psalm.waiting;
  psalm.waiting = null;
  if (!pending) return;
  if (result && result.ok) pending.resolve(result.html);
  else pending.reject(new Error((result && result.error) || 'Kalendár sa nepodarilo načítať.'));
};

function nextSundayKey() {
  const date = new Date();
  date.setDate(date.getDate() + ((7 - date.getDay()) % 7 || 7));
  return dateKey(date);
}

function setPsalmDay(day) {
  psalm.day = day;
  const iso = `${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}`;
  $('#psalmDate').value = iso;
  $$('#psalmQuick [data-day]').forEach((chip) => {
    const key = chip.dataset.day === 'today' ? todayKey()
      : chip.dataset.day === 'tomorrow' ? dateKey(new Date(Date.now() + 86400000))
        : nextSundayKey();
    chip.classList.toggle('is-active', key === day);
  });
}

function renderPsalmResult() {
  const box = $('#psalmResult');
  const parsed = psalm.parsed;
  box.innerHTML = '';
  $('#psalmSave').disabled = !psalm.song;
  $('#psalmPlay').disabled = !psalm.song;
  if (!parsed) return;

  if (!parsed.psalms.length) {
    box.innerHTML = '<p class="field__warn">Na tejto stránke sa nenašiel responzóriový žalm. '
      + 'Pozri si načítaný text nižšie – podľa neho sa dá hľadanie doladiť.</p>';
    return;
  }

  for (const item of parsed.psalms) {
    const card = document.createElement('div');
    card.className = 'psalmcard';
    card.innerHTML = `
      <div class="psalmcard__head">
        <span class="psalmcard__ref">${item.reference || 'Responzóriový žalm'}</span>
        <span class="psalmcard__feast">${[parsed.dateLabel, parsed.feast].filter(Boolean).join(' · ')}</span>
      </div>
      <div class="psalmcard__refrain">${item.lines.join('<br>')}</div>`;
    box.appendChild(card);
  }

  const note = document.createElement('p');
  note.className = 'hint';
  note.textContent = parsed.psalms.length > 1
    ? `Nájdené ${parsed.psalms.length} žalmy – uložia sa ako jedna pieseň, každý ako samostatná sloha.`
    : `Uloží sa ako pieseň „${psalm.song.title}“ do zbierky Žalmy.`;
  box.appendChild(note);
}

async function loadPsalm() {
  const button = $('#psalmLoad');
  const error = $('#psalmError');
  button.disabled = true;
  button.textContent = 'Načítavam…';
  error.hidden = true;
  psalm.parsed = null;
  psalm.song = null;
  renderPsalmResult();

  try {
    const html = await loadLiturgyPage(psalm.day);
    const parsed = parsePsalmPage(html, { date: psalm.day });
    psalm.parsed = parsed;
    psalm.song = parsed.psalms.length ? psalmSong(parsed) : null;
    $('#psalmRaw').textContent = parsed.lines.join('\n');
    $('#psalmRawBox').hidden = false;
    renderPsalmResult();
  } catch (failure) {
    error.textContent = failure.message;
    error.hidden = false;
    $('#psalmRawBox').hidden = true;
  } finally {
    button.disabled = false;
    button.textContent = 'Načítať žalm';
  }
}

async function savePsalm() {
  if (!psalm.song) return;
  const song = psalm.song;
  await store.putSongs([song]);
  writeSongFile(song);
  const others = state.songs.filter((item) => item.folder === song.folder && item.id !== song.id).length;
  await store.putFolder({ name: song.folder, system: '', count: others + 1, updatedAt: Date.now() });
  await reloadLibrary();
  toast(`Žalm uložený: „${song.title}“`, 'ok');
}

/** Premietanie bez ukladania – pieseň žije len do zatvorenia aplikácie. */
function playPsalm() {
  if (!psalm.song) return;
  const song = { ...psalm.song, temporary: true };
  if (!state.songs.some((item) => item.id === song.id)) state.songs = [song, ...state.songs];
  $('#psalmDialog').close();
  startLive([song.id], 0);
}

// ---------------------------------------------------------------- editor

/** Odkiaľ sa editor otvoril – po uložení sa tam vrátime. */
let editorReturn = 'library';

function openEditor(song, from = 'library', opts = {}) {
  editorReturn = from;
  editor.open(song || null);
  setView('editor', opts);
}

/**
 * Úprava piesne priamo z premietania: keď je v texte chyba, dá sa opraviť
 * hneď a natrvalo. Premietanie sa počas úpravy neruší – televízor ukazuje
 * ďalej pôvodný text, len sa sfarbí vrchný panel (updatePresentingIndicator).
 * Po uložení sa premietanie vráti na tú istú pieseň.
 */
function editCurrentSong() {
  const song = currentSong();
  if (!song) {
    toast('Najprv vyber pieseň.', 'warn');
    return;
  }
  if (song.temporary) {
    toast('Túto pieseň (žalm) najprv ulož do knižnice.', 'warn');
    return;
  }
  openEditor(song, 'live', { keepPresenting: true });
}

/** Po úprave z premietania nahradí pieseň v zozname jej novou podobou. */
function refreshLiveSong(song, replacedId) {
  const index = state.live.songs.findIndex((item) => item.id === (replacedId || song.id));
  if (index >= 0) state.live.songs[index] = song;
  state.live.verseIndex = Math.min(state.live.verseIndex, song.verses.length - 1);
  verseScreens.key = '';
  renderLive();
}

function setupEditor() {
  editor = createEditor({
    getFolders: () => state.folders,
    getSongs: () => state.songs,
    getSettings: () => state.settings,
    toast,
    onSave: async (song, replacedId) => {
      if (replacedId) {
        // Pieseň sa premenovala alebo presunula do inej zbierky – starý súbor
        // v priečinku s piesňami treba zmazať, inak by sa vrátila pri štarte.
        const previous = songById(replacedId);
        if (previous) removeSongFile(previous);
        state.set.items = state.set.items.map((id) => (id === replacedId ? song.id : id));
      }

      // Knižnicu v pamäti (state.songs) už máme celú, takže sa rovno zapíše
      // ona – bez toho, aby si natívna časť najprv musela prečítať a zlúčiť
      // to, čo je uložené. Práve to bol hlavný dôvod, prečo uloženie jednej
      // piesne pri väčšej knižnici trvalo aj niekoľko sekúnd.
      const withoutOld = replacedId
        ? state.songs.filter((item) => item.id !== replacedId)
        : state.songs;
      const existingIndex = withoutOld.findIndex((item) => item.id === song.id);
      const nextSongs = existingIndex >= 0
        ? withoutOld.map((item, index) => (index === existingIndex ? song : item))
        : [...withoutOld, song];
      state.songs = nextSongs.sort(compareSongs);

      const others = state.songs.filter((item) => item.folder === song.folder && item.id !== song.id).length;
      const folder = {
        name: song.folder,
        system: (state.folders.find((item) => item.name === song.folder) || {}).system
          || (song.number ? song.system : ''),
        count: others + 1,
        updatedAt: Date.now(),
      };
      state.folders = state.folders.filter((item) => item.name !== folder.name)
        .concat(folder)
        .sort((a, b) => a.name.localeCompare(b.name, 'sk'));

      await Promise.all([
        store.replaceSongs(state.songs),
        store.replaceFolders(state.folders),
      ]);
      renderFolders();
      renderSongList();
      renderSetList();
      renderSavedSets();

      const stored = writeSongFile(song);
      toast(stored
        ? `Pieseň „${song.title}“ uložená do zbierky ${song.folder}.`
        : `Pieseň „${song.title}“ uložená.`, 'ok');
      if (editorReturn === 'live') {
        editorReturn = 'library';
        setView('live');
        refreshLiveSong(song, replacedId);
      }
    },
    onDelete: async (song) => {
      removeSongFile(song);
      await store.deleteSongs([song.id]);
      state.set.items = state.set.items.filter((id) => id !== song.id);
      state.live.songs = state.live.songs.filter((item) => item.id !== song.id);
      state.live.songIndex = Math.min(state.live.songIndex, Math.max(0, state.live.songs.length - 1));
      state.live.verseIndex = 0;
      verseScreens.key = '';
      editorReturn = 'library';
      await reloadLibrary();
      toast(`Pieseň „${song.title}“ zmazaná.`, 'ok');
      setView('library');
    },
    onClose: () => {
      const back = editorReturn;
      editorReturn = 'library';
      setView(back === 'live' && state.live.songs.length ? 'live' : 'library');
    },
  });
}

// ------------------------------------------------------------------- set

const CURRENT_SET_BACKUP_ID = 'aktualny-set-zaloha';
const CURRENT_SET_BACKUP_NAME = 'Aktuálny set (zálohovaný)';
let lastSetBackupKey = null;
// Kým sa pri štarte nepokúsime zálohu obnoviť, nesmie sa prepisovať: prvé
// vykreslenie (ešte prázdneho) setu by ju inak zmazalo skôr, než sa obnoví.
let setBackupReady = false;

/**
 * Rozpracovaný set sa priebežne zálohuje medzi uložené sety pod pevným id –
 * keby appka počas jeho prípravy spadla, pri ďalšom spustení sa z tejto
 * zálohy obnoví (pozri restoreCurrentSetBackup v main()). Prázdny set zálohu
 * zase zmaže, aby v uložených setoch nezostala zastaraná.
 */
async function persistCurrentSetBackup() {
  if (!setBackupReady) return;
  const key = JSON.stringify(state.set.items);
  if (key === lastSetBackupKey) return;
  lastSetBackupKey = key;

  const existing = state.sets.find((item) => item.id === CURRENT_SET_BACKUP_ID);
  if (!state.set.items.length) {
    if (!existing) return;
    state.sets = state.sets.filter((item) => item.id !== CURRENT_SET_BACKUP_ID);
    removeSetFile(existing);
    await store.deleteSet(CURRENT_SET_BACKUP_ID);
    return;
  }
  const backup = {
    id: CURRENT_SET_BACKUP_ID,
    name: CURRENT_SET_BACKUP_NAME,
    items: state.set.items.slice(),
    updatedAt: Date.now(),
  };
  const index = state.sets.findIndex((item) => item.id === CURRENT_SET_BACKUP_ID);
  if (index >= 0) state.sets[index] = backup; else state.sets.push(backup);
  await store.putSet(backup);
  writeSetFile(backup);
}

/**
 * Pri štarte (a po neskoršom povolení prístupu k súborom) obnoví rozpracovaný
 * set zo zálohy – ak appka spadla, reštartovala sa alebo sa preinštalovala.
 */
function restoreCurrentSetBackup() {
  setBackupReady = true;
  if (state.set.items.length) return;
  const backup = state.sets.find((item) => item.id === CURRENT_SET_BACKUP_ID);
  if (!backup || !backup.items.length) return;
  state.set = { id: null, name: 'Nový set', items: backup.items.slice() };
  lastSetBackupKey = JSON.stringify(state.set.items);
  renderSetList();
  renderSongList();
  toast('Obnovený rozpracovaný set zo zálohy.', 'ok');
}

function isInSet(songId) {
  return state.set.items.includes(songId);
}

/** @returns {boolean} true, ak pieseň pribudla; false, ak už v sete bola */
function addToSet(songId, { silent } = {}) {
  const song = songById(songId);
  if (!song) return false;
  if (isInSet(songId)) {
    if (!silent) toast(`„${song.title}“ už v sete je.`, 'warn');
    return false;
  }
  state.set.items.push(songId);
  renderSetList();
  renderSongList();
  if (!silent) toast(`Pridané: ${song.title}`, 'ok');
  return true;
}

function removeFromSet(index) {
  state.set.items.splice(index, 1);
  renderSetList();
  renderSongList();
}

/** Odoberie pieseň zo setu podľa jej id (tlačidlo „✓ V sete“ v knižnici). */
function removeSongFromSet(songId) {
  const index = state.set.items.indexOf(songId);
  if (index < 0) return false;
  const song = songById(songId);
  removeFromSet(index);
  toast(`Odobraté zo setu: ${song ? song.title : 'pieseň'}`, 'ok');
  return true;
}

function moveInSet(index, delta) {
  const target = index + delta;
  if (target < 0 || target >= state.set.items.length) return;
  const [item] = state.set.items.splice(index, 1);
  state.set.items.splice(target, 0, item);
  renderSetList();
}

function renderSetList() {
  persistCurrentSetBackup();
  const box = $('#setList');
  $('#setCount').textContent = String(state.set.items.length);
  $('#setNameInput').value = state.set.name;
  box.innerHTML = '';

  if (!state.set.items.length) {
    box.innerHTML = `<div class="empty">
      <h3>Set je prázdny</h3>
      <p>Pridaj piesne z knižnice alebo rýchlo zadaj číslo JKS/LS nižšie.</p></div>`;
    return;
  }

  state.set.items.forEach((id, index) => {
    const song = songById(id);
    const row = document.createElement('div');
    row.className = 'setrow';
    row.innerHTML = `
      <div class="setrow__pos">${index + 1}</div>
      <div class="setrow__body">
        <div class="song__title">${song ? song.title : 'Pieseň sa nenašla'}</div>
        <div class="song__sub">${song ? [songLabel(song), pluralVerses(song.verses.length)].filter(Boolean).join(' · ') : id}</div>
      </div>
      <div class="setrow__tools">
        <button class="btn btn--icon" data-up title="Hore">▲</button>
        <button class="btn btn--icon" data-down title="Dole">▼</button>
        <button class="btn btn--icon btn--danger" data-del title="Odobrať">✕</button>
      </div>`;
    $('[data-up]', row).onclick = () => moveInSet(index, -1);
    $('[data-down]', row).onclick = () => moveInSet(index, 1);
    $('[data-del]', row).onclick = () => removeFromSet(index);
    row.onclick = (event) => {
      if (event.target.closest('button')) return;
      if (song) startLive(state.set.items, index);
    };
    box.appendChild(row);
  });
}

function renderSavedSets() {
  const box = $('#savedSets');
  $('#savedSetsCount').textContent = String(state.sets.length);
  box.innerHTML = '';
  if (!state.sets.length) {
    box.innerHTML = '<p class="hint">Zatiaľ nemáš uložený žiadny set.</p>';
    return;
  }
  for (const saved of state.sets) {
    const row = document.createElement('div');
    row.className = 'savedset';
    const date = new Date(saved.updatedAt).toLocaleDateString('sk-SK');
    row.innerHTML = `<div><strong>${saved.name}</strong><span class="song__sub">${pluralSongs(saved.items.length)} · ${date}</span></div>`;
    const open = document.createElement('button');
    open.className = 'btn';
    open.textContent = 'Otvoriť';
    open.onclick = () => {
      state.set = { id: saved.id, name: saved.name, items: saved.items.slice() };
      renderSetList();
      renderSongList();
      $('#savedSetsDialog').close();
      toast(`Načítaný set „${saved.name}“`, 'ok');
    };
    const remove = document.createElement('button');
    remove.className = 'btn btn--danger';
    remove.textContent = 'Zmazať';
    remove.onclick = async () => {
      if (!confirm(`Zmazať set „${saved.name}“?`)) return;
      removeSetFile(saved);
      await store.deleteSet(saved.id);
      await reloadLibrary();
    };
    row.append(open, remove);
    box.appendChild(row);
  }
}

async function saveCurrentSet() {
  if (!state.set.items.length) {
    toast('Set je prázdny.', 'warn');
    return;
  }
  const name = $('#setNameInput').value.trim() || 'Set bez názvu';
  const existing = state.sets.find((item) => normalize(item.name) === normalize(name));

  // Rovnaký názov prepíše pôvodný set (po potvrdení), iný názov uloží nový.
  if (existing && !confirm(`Set s názvom „${existing.name}“ už existuje.\n\nChceš ho prepísať?`)) return;

  const set = {
    id: existing ? existing.id : `set-${Date.now()}`,
    name,
    items: state.set.items.slice(),
    updatedAt: Date.now(),
  };
  await store.putSet(set);
  state.set.id = set.id;
  state.set.name = set.name;
  await reloadLibrary();
  const stored = writeSetFile(set);
  toast(existing
    ? `Set „${set.name}“ prepísaný${stored ? ' aj v priečinku' : ''}.`
    : `Set „${set.name}“ uložený${stored ? ' aj do priečinka' : ''}.`, 'ok');
}

// -------------------------------------------------------- rýchly výber čísla

/**
 * Zadané číslo hľadá ako predponu, nie presnú zhodu – „25“ tak nájde aj 250,
 * 251, 252…, presná zhoda (ak existuje) je vždy prvá. Uľahčuje to písanie na
 * číselnej klávesnici, kde sa píše po jednej číslici.
 */
function quickMatches(value) {
  const raw = String(value || '').trim();
  if (!raw) return [];
  const asNumber = parseNumber(raw);
  if (asNumber) {
    const prefix = String(parseInt(asNumber.number, 10));
    const target = Number(prefix);
    return state.songs
      .filter((song) => song.number
        && String(parseInt(song.number, 10)).startsWith(prefix)
        && (!asNumber.system || song.system === asNumber.system))
      .sort((a, b) => {
        const an = parseInt(a.number, 10);
        const bn = parseInt(b.number, 10);
        if (an === target && bn !== target) return -1;
        if (bn === target && an !== target) return 1;
        return an - bn;
      });
  }
  return searchSongs(state.songs, raw);
}

function renderQuickResults(boxId, value, onPick) {
  const box = $(boxId);
  const matches = quickMatches(value);
  box.innerHTML = '';
  if (!value.trim()) return;
  if (!matches.length) {
    box.innerHTML = '<p class="hint">Žiadna zhoda.</p>';
    return;
  }
  for (const song of matches.slice(0, 8)) {
    const button = document.createElement('button');
    button.className = 'quickhit';
    const mark = state.view === 'set' && isInSet(song.id) ? '<span class="quickhit__in">✓ v sete</span>' : '';
    button.innerHTML = `<span class="quickhit__num">${songLabel(song) || '—'}</span>
      <span class="quickhit__title">${song.title}</span>${mark}<span class="quickhit__folder">${song.folder}</span>`;
    button.onclick = () => onPick(song);
    box.appendChild(button);
  }
}

// -------------------------------------------------------------- živý režim

function currentSong() {
  return state.live.songs[state.live.songIndex] || null;
}

function currentVerse() {
  const song = currentSong();
  return song ? song.verses[state.live.verseIndex] || null : null;
}

function startLive(ids, index = 0) {
  const songs = ids.map(songById).filter(Boolean);
  if (!songs.length) {
    toast('Najprv pridaj aspoň jednu pieseň.', 'warn');
    return;
  }
  state.live = {
    songs,
    songIndex: Math.min(index, songs.length - 1),
    verseIndex: 0,
    // Premietanie začína čierno, aby sa text objavil až keď organista chce.
    blank: state.settings.blankOnStart,
  };
  setView('live');
  renderLive();
}

function selectVerse(index) {
  const song = currentSong();
  if (!song) return;
  state.live.verseIndex = Math.max(0, Math.min(index, song.verses.length - 1));
  renderLive();
}

function stepVerse(delta) {
  const song = currentSong();
  if (!song) return;
  const next = state.live.verseIndex + delta;
  if (next < 0) {
    if (state.live.songIndex > 0) {
      state.live.songIndex -= 1;
      state.live.verseIndex = Math.max(0, currentSong().verses.length - 1);
    }
  } else if (next >= song.verses.length) {
    if (state.live.songIndex < state.live.songs.length - 1) {
      state.live.songIndex += 1;
      state.live.verseIndex = 0;
    }
  } else {
    state.live.verseIndex = next;
  }
  renderLive();
}

function stepSong(delta) {
  const next = state.live.songIndex + delta;
  if (next < 0 || next >= state.live.songs.length) return;
  state.live.songIndex = next;
  state.live.verseIndex = 0;
  renderLive();
}

/** Čierna obrazovka – výber slohy zostáva nezmenený. */
function toggleBlank(force) {
  state.live.blank = force === undefined ? !state.live.blank : !!force;
  renderLive();
}

const jump = { system: '' };

function toggleJumpPanel(force) {
  const panel = $('#jumpPanel');
  const open = force === undefined ? panel.hidden : force;
  panel.hidden = !open;
  if (open) {
    $('#jumpValue').textContent = '';
    $('#jumpResults').innerHTML = '';
  }
}

/** Otvorí pieseň podľa zadaného čísla – ak nie je v sete, vloží ju hneď za aktuálnu. */
function jumpToSong(song) {
  const index = state.live.songs.findIndex((item) => item.id === song.id);
  if (index >= 0) {
    state.live.songIndex = index;
  } else {
    state.live.songs.splice(state.live.songIndex + 1, 0, song);
    state.live.songIndex += 1;
  }
  state.live.verseIndex = 0;
  toggleJumpPanel(false);
  renderLive();
}

function renderJump() {
  const query = `${jump.system} ${$('#jumpValue').textContent}`.trim();
  renderQuickResults('#jumpResults', query, jumpToSong);
}

// ------------------------------------- set počas premietania (bez prerušenia)

/** Prepne na inú pieseň priamo v bežiacom sete – premietanie neprestane. */
function jumpToLiveSong(index) {
  if (index >= 0 && index < state.live.songs.length && index !== state.live.songIndex) {
    state.live.songIndex = index;
    state.live.verseIndex = 0;
    renderLive();
  }
  $('#liveSetDialog').close();
}

/**
 * Pridá nájdenú pieseň do bežiaceho setu bez toho, aby prerušila premietanie
 * (na rozdiel od jumpToSong nepreskočí na ňu – len pribudne na koniec, aby sa
 * nezastavila práve hraná pieseň).
 */
function addToLiveSet(song) {
  if (state.live.songs.some((item) => item.id === song.id)) {
    toast(`„${song.title}“ už v sete je.`, 'warn');
    return;
  }
  state.live.songs.push(song);
  toast(`Pridané do setu: ${song.title}`, 'ok');
  $('#liveSetSearch').value = '';
  $('#liveSetResults').innerHTML = '';
  renderLiveSetList();
  renderLive();
}

function renderLiveSetList() {
  const box = $('#liveSetList');
  if (!box) return;
  box.innerHTML = '';
  if (!state.live.songs.length) {
    box.innerHTML = '<div class="empty"><h3>Set je prázdny</h3></div>';
    return;
  }
  state.live.songs.forEach((song, index) => {
    const row = document.createElement('div');
    row.className = `setrow${index === state.live.songIndex ? ' is-active' : ''}`;
    row.innerHTML = `
      <div class="setrow__pos">${index + 1}</div>
      <div class="setrow__body">
        <div class="song__title">${song.title}</div>
        <div class="song__sub">${[songLabel(song), pluralVerses(song.verses.length)].filter(Boolean).join(' · ')}</div>
      </div>
      <div class="setrow__tools">
        <button class="btn btn--icon" data-up title="Hore" ${index === 0 ? 'disabled' : ''}>▲</button>
        <button class="btn btn--icon" data-down title="Dole" ${index === state.live.songs.length - 1 ? 'disabled' : ''}>▼</button>
      </div>`;
    $('[data-up]', row).onclick = () => moveInLiveSet(index, -1);
    $('[data-down]', row).onclick = () => moveInLiveSet(index, 1);
    row.onclick = (event) => {
      if (event.target.closest('button')) return;
      jumpToLiveSong(index);
    };
    box.appendChild(row);
  });
}

/**
 * Presunie pieseň v bežiacom sete. Práve premietaná pieseň zostáva tá istá
 * (posunie sa len jej poradie), takže premietanie sa nepreruší.
 */
function moveInLiveSet(index, delta) {
  const target = index + delta;
  const songs = state.live.songs;
  if (target < 0 || target >= songs.length) return;
  const current = songs[state.live.songIndex];
  const [item] = songs.splice(index, 1);
  songs.splice(target, 0, item);
  state.live.songIndex = songs.indexOf(current);
  renderLiveSetList();
  renderLive();
}

function renderLive() {
  const song = currentSong();
  const verse = currentVerse();

  $('#liveTitle').textContent = song ? song.title : 'Bez piesne';
  $('#liveNumber').textContent = song ? songLabel(song) : '';
  // Pozícia v sete sa ukazuje priamo na tlačidle, ktoré set aj otvára.
  $('#liveSetBtn').textContent = state.live.songs.length > 1
    ? `Set ${state.live.songIndex + 1}/${state.live.songs.length}`
    : 'Set';
  $('#prevSong').disabled = state.live.songIndex === 0;
  $('#nextSong').disabled = state.live.songIndex >= state.live.songs.length - 1;
  $('#prevSongLabel').textContent = state.live.songIndex > 0
    ? state.live.songs[state.live.songIndex - 1].title : '';
  $('#nextSongLabel').textContent = state.live.songIndex < state.live.songs.length - 1
    ? state.live.songs[state.live.songIndex + 1].title : '';

  const blankButton = $('#blankBtn');
  blankButton.classList.toggle('is-on', state.live.blank);
  blankButton.querySelector('.bigbtn__icon').textContent = state.live.blank ? '▶' : '◼';
  blankButton.querySelector('.bigbtn__label').textContent = state.live.blank ? 'ZOBRAZIŤ TEXT' : 'ZASTAVIŤ';

  const grid = $('#verseGrid');
  grid.innerHTML = '';
  if (song) {
    song.verses.forEach((item, index) => {
      const button = document.createElement('button');
      button.className = `versebtn versebtn--${item.type}`;
      button.classList.toggle('is-active', index === state.live.verseIndex);
      const short = item.type === 'chorus' ? 'R' : item.label;
      button.innerHTML = `<span class="versebtn__num">${short}</span>
        <span class="versebtn__hint">${(item.lines[0] || '').slice(0, 28)}</span>`;
      button.setAttribute('aria-label', `${VERSE_TYPES[item.type] ? VERSE_TYPES[item.type].label : 'Sloha'} ${item.label}`);
      button.onclick = () => selectVerse(index);
      grid.appendChild(button);
    });
  }

  renderVerseScreens();

  $('#prevVerse').disabled = !song || (state.live.verseIndex === 0 && state.live.songIndex === 0);
  $('#nextVerse').disabled = !song
    || (state.live.verseIndex >= song.verses.length - 1 && state.live.songIndex >= state.live.songs.length - 1);

  publish();
}

// ------------------------------------------- obrazovky slôh v živom režime

const verseScreens = { key: '', items: [] };

/** Podľa čoho sa pozná, že sa obrazovky slôh musia prekresliť. */
function verseScreensKey(song) {
  if (!song) return '';
  const look = [
    state.settings.theme, state.settings.fontScale, state.settings.fontMin, state.settings.fontMax,
    state.settings.header, state.settings.showVerseLabel, state.settings.verseNumberInline,
    state.settings.uppercase, state.settings.lineSpacing,
  ];
  return JSON.stringify([song.id, song.verses.map((verse) => verse.lines.join('|')), look]);
}

/**
 * Sloha po slohe ako malé obrazovky pod sebou. Ťuknutím sa sloha premietne,
 * práve premietaná má červený rámik.
 */
function renderVerseScreens() {
  const box = $('#verseScreens');
  if (!box) return;
  const song = currentSong();
  const key = verseScreensKey(song);
  if (key === verseScreens.key) {
    updateVerseScreens();
    return;
  }
  verseScreens.key = key;
  verseScreens.items = [];
  box.innerHTML = '';
  if (!song) return;

  song.verses.forEach((verse, index) => {
    const item = document.createElement('button');
    item.className = 'vscreen';
    item.type = 'button';
    const label = verse.type === 'chorus' ? 'R' : verse.label;
    const name = VERSE_TYPES[verse.type] ? VERSE_TYPES[verse.type].label : 'Sloha';
    item.innerHTML = `<div class="vscreen__label">${label}<small>${name}</small></div>
      <div class="vscreen__frame"><div class="vscreen__screen"></div></div>`;
    const display = createDisplay(item.querySelector('.vscreen__screen'));
    display.render(displayState({
      song, verse, blank: false, settings: state.settings, position: '',
    }));
    item.onclick = () => selectVerse(index);
    box.appendChild(item);
    verseScreens.items.push(item);
  });
  updateVerseScreens();
}

/** Zvýraznenie vybranej slohy a červený rámik okolo tej premietanej. */
function updateVerseScreens() {
  const live = state.view === 'live' && !state.live.blank;
  verseScreens.items.forEach((item, index) => {
    const selected = index === state.live.verseIndex;
    item.classList.toggle('is-selected', selected);
    item.classList.toggle('is-live', selected && live);
    if (selected && item.scrollIntoView) {
      item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  });
}

// ------------------------------------------------------------- publikovanie

function publish() {
  const presenting = state.view === 'live' || presentingInBackground;
  const payload = displayState({
    song: currentSong(),
    verse: currentVerse(),
    blank: state.live.blank || !presenting,
    settings: state.settings,
    position: state.live.songs.length > 1 ? `${state.live.songIndex + 1}/${state.live.songs.length}` : '',
  });
  // V aplikácii pre Android chodí stav na druhú obrazovku natívne; miestny
  // prenos cez localStorage by ten istý stav doručil ešte raz a s oneskorením.
  if (!isNative) bus.send(payload);
  net.send(payload);
  nativeBus.send(payload);
  cast.send(payload);
  updateVerseScreens();
}

// -------------------------------------------- hodiny a batéria (vrchný panel)

let batteryPercent = null;

function renderClock() {
  const time = new Date().toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
  $$('.statusbar__time').forEach((el) => { el.textContent = time; });
}

function renderBatteryDisplay() {
  $$('.statusbar__battery').forEach((el) => {
    el.hidden = batteryPercent === null;
    el.textContent = batteryPercent === null ? '' : `🔋 ${batteryPercent} %`;
    el.classList.toggle('is-warn', batteryPercent !== null && batteryPercent < 20 && batteryPercent >= 10);
    el.classList.toggle('is-danger', batteryPercent !== null && batteryPercent < 10);
  });
}

/** V appke sa číta cez natívny most, v prehliadači skúsi Battery Status API (ak ho má). */
async function refreshBattery() {
  if (isNative) {
    const level = call('batteryLevel');
    batteryPercent = typeof level === 'number' && level >= 0 ? level : null;
  } else if (navigator.getBattery) {
    try {
      const battery = await navigator.getBattery();
      batteryPercent = Math.round(battery.level * 100);
    } catch {
      batteryPercent = null;
    }
  }
  renderBatteryDisplay();
}

/** Čas a percento batérie sú vždy vidno vo vrchnom paneli aj v premietaní. */
function startStatusBar() {
  renderClock();
  refreshBattery();
  setInterval(renderClock, 30 * 1000);
  setInterval(refreshBattery, 60 * 1000);
}

function renderDisplayStatus({ connected, name }) {
  state.display = { connected, name };
  const badge = $('#displayStatus');
  badge.hidden = !isNative;
  badge.textContent = connected
    ? `Druhá obrazovka: ${name || 'pripojená'}`
    : 'Druhá obrazovka: nepripojená';
  badge.className = connected ? 'badge badge--ok' : 'badge badge--warn';

  const button = $('#displayBtn');
  if (button) button.hidden = !isNative || connected;

  const hint = $('#displayHint');
  const detail = $('#displayDetail');
  if (!hint || !detail) return;
  if (connected) {
    hint.textContent = 'Televízor je pripojený. Texty piesní sa naň premietajú automaticky, '
      + 'na tablete zostáva ovládanie.';
    detail.textContent = name || 'pripojená';
    detail.className = 'badge badge--ok';
  } else {
    hint.textContent = 'Zatiaľ nie je pripojená žiadna druhá obrazovka. Pripoj televízor HDMI káblom, '
      + 'alebo v nastaveniach tabletu zapni zrkadlenie obrazovky (Prenášať / Smart View). '
      + 'Aplikácia si to všimne sama.';
    detail.textContent = 'nepripojená';
    detail.className = 'badge badge--warn';
  }
  publish();
}

function renderNetStatus(status) {
  const badge = $('#netStatus');
  badge.hidden = !status.available;
  if (status.available) {
    badge.textContent = status.screens
      ? `Obrazovka cez sieť: ${status.screens === 1 ? '1 pripojená' : `${status.screens} pripojené`}`
      : 'Obrazovka cez sieť: pripravená';
    badge.className = status.screens ? 'badge badge--ok' : 'badge';
  }

  const hint = $('#netHint');
  const list = $('#netAddresses');
  const screens = $('#netScreens');
  if (!hint) return;

  if (!status.available) {
    hint.innerHTML = 'Táto možnosť funguje, keď je aplikácia spustená z priloženého servera '
      + '(<code>npm start</code>) v počítači na rovnakej sieti. Teraz je aplikácia otvorená '
      + 'zo statického hostingu alebo zo súboru, takže nemá cez čo posielať text na iné zariadenie. '
      + 'Použi Chromecast alebo tlačidlo <strong>Okno na TV</strong>.';
    list.innerHTML = '';
    screens.textContent = '';
    return;
  }

  hint.innerHTML = 'Na televízore alebo počítači pri televízore otvor v prehliadači túto adresu '
    + 'a daj ju na celú obrazovku. Text sa tam objaví okamžite a sám sa mení podľa toho, '
    + 'čo robíš na tablete. Obrazoviek môže byť aj viac naraz.';
  const port = status.port || location.port || 8080;
  const addresses = (status.addresses.length ? status.addresses : [location.hostname])
    .map((address) => `http://${address}:${port}/display.html`);
  list.innerHTML = '';
  for (const address of addresses) {
    const row = document.createElement('div');
    row.className = 'netaddr__row';
    const code = document.createElement('code');
    code.className = 'netaddr__url';
    code.textContent = address;
    const copy = document.createElement('button');
    copy.className = 'btn';
    copy.textContent = 'Kopírovať';
    copy.onclick = async () => {
      try {
        await navigator.clipboard.writeText(address);
        toast('Adresa skopírovaná.', 'ok');
      } catch {
        toast('Kopírovanie sa nepodarilo – prepíš adresu ručne.', 'warn');
      }
    };
    row.append(code, copy);
    list.appendChild(row);
  }
  screens.textContent = status.screens
    ? `Práve pripojené obrazovky: ${status.screens}`
    : 'Zatiaľ nie je pripojená žiadna obrazovka.';
}

/**
 * Tlačidlo na pripojenie Chromecastu sa z lišty odstránilo – premietanie sa
 * na tomto branchi rieši natívnou druhou obrazovkou. Cast API sa napriek
 * tomu môže pripojiť z nastavení (Application ID), preto stav aj naďalej
 * posielame na obrazovku, len bez samostatnej lišty.
 */
function renderCastStatus(status) {
  if (status.connected) publish();
}

function openDisplayWindow() {
  if (displayWindow && !displayWindow.closed) {
    displayWindow.focus();
    publish();
    return;
  }
  displayWindow = window.open('display.html', 'organista-display', 'width=1280,height=720');
  if (!displayWindow) {
    toast('Prehliadač zablokoval nové okno. Povoľ vyskakovacie okná.', 'warn');
    return;
  }
  setTimeout(publish, 600);
}

// ------------------------------------------------------------- nastavenia

let netPollTimer = null;

function watchNetStatus(active) {
  clearInterval(netPollTimer);
  netPollTimer = active ? setInterval(() => net.probe(), 5000) : null;
}

/** Posuvníky s najmenším a najväčším písmom. */
function renderFontLimits() {
  $('#fontMin').value = String(state.settings.fontMin);
  $('#fontMax').value = String(state.settings.fontMax);
  $('#fontMinValue').textContent = `${state.settings.fontMin} %`;
  $('#fontMaxValue').textContent = `${state.settings.fontMax} %`;
}

function renderSettings() {
  $('#castAppId').value = state.settings.castAppId;
  $('#themeSelect').value = state.settings.theme;
  $('#fontScale').value = String(state.settings.fontScale);
  $('#fontScaleValue').textContent = `${Math.round(state.settings.fontScale * 100)} %`;
  $('#lineSpacing').value = String(state.settings.lineSpacing);
  $('#lineSpacingValue').textContent = state.settings.lineSpacing.toFixed(2);
  renderFontLimits();
  $('#headerMode').value = state.settings.header;
  $('#fadeSelect').value = String(state.settings.fade);
  $('#showVerseLabel').checked = state.settings.showVerseLabel;
  $('#verseNumberInline').checked = state.settings.verseNumberInline;
  $('#blankOnStart').checked = state.settings.blankOnStart;
  $('#uppercase').checked = state.settings.uppercase;
  $('#keepAwake').checked = state.settings.keepAwake;
  $('#defaultSystem').value = state.settings.defaultSystem;
  renderFolderAdmin();
}

function renderFolderAdmin() {
  const box = $('#folderAdmin');
  box.innerHTML = '';
  if (!state.folders.length) {
    box.innerHTML = '<p class="hint">Zatiaľ žiadne zbierky.</p>';
    return;
  }
  for (const folder of state.folders) {
    const row = document.createElement('div');
    row.className = 'savedset';
    row.innerHTML = `<div><strong>${folder.name}</strong>
      <span class="song__sub">${pluralSongs(folder.count || 0)}</span></div>`;
    const select = document.createElement('select');
    select.className = 'input input--small';
    for (const option of ['', 'JKS', 'LS']) {
      const node = document.createElement('option');
      node.value = option;
      node.textContent = option || 'bez čísel';
      node.selected = (folder.system || '') === option;
      select.appendChild(node);
    }
    select.onchange = async () => {
      const system = select.value;
      const songs = state.songs.filter((song) => song.folder === folder.name)
        .map((song) => ({
          ...song,
          system: song.number ? system : song.system,
          numberKey: song.number ? `${system}${parseInt(song.number, 10)}` : '',
        }));
      await store.putSongs(songs);
      await store.putFolder({ ...folder, system });
      await reloadLibrary();
      toast(`Zbierka ${folder.name}: číselník ${system || 'vypnutý'}`, 'ok');
    };
    const remove = document.createElement('button');
    remove.className = 'btn btn--danger';
    remove.textContent = 'Odstrániť';
    remove.onclick = async () => {
      const inFolder = state.songs.filter((song) => song.folder === folder.name);
      const extra = isNative && call('hasSongsFolder')
        ? `\n\nZmažú sa aj súbory v priečinku ${call('songsFolder')}/${folder.name}.` : '';
      if (!confirm(`Odstrániť zbierku „${folder.name}“ z knižnice?${extra}`)) return;
      for (const song of inFolder) removeSongFile(song);
      await store.deleteFolder(folder.name);
      if (state.activeFolder === folder.name) state.activeFolder = null;
      await reloadLibrary();
      renderSettings();
    };
    row.append(select, remove);
    box.appendChild(row);
  }
}

function updateSettings(patch) {
  state.settings = saveSettings({ ...state.settings, ...patch });
  publish();
}

// ------------------------------------------------------------------- vstupy

function bindEvents() {
  // Klik/ťuknutie do poľa, kam sa píše, ho presunie navrch jeho scrollovanej
  // časti (sidebar, dialóg, editor) – aby ho na tablete nezakryla klávesnica
  // spolu s výsledkami vyhľadávania, ktoré sa zobrazujú pod ním.
  document.addEventListener('focusin', (event) => {
    const el = event.target;
    if (!el.matches || !el.matches('input:not([type=checkbox]):not([type=radio]):not([type=range]), textarea')) return;
    requestAnimationFrame(() => el.scrollIntoView({ block: 'start', behavior: 'smooth' }));
  });

  // Otvorený dialóg (napr. vyhľadávanie v sete počas premietania) sa pri
  // otvorení klávesnice posunie k vrchu viditeľnej plochy a skráti, aby bol
  // celý – aj to, čo sa práve vyhľadáva – vidno nad klávesnicou.
  if (window.visualViewport) {
    const repositionOpenDialog = () => {
      const dialog = $('dialog[open]');
      if (!dialog) return;
      const shrink = window.innerHeight - window.visualViewport.height;
      if (shrink > 80) {
        dialog.style.position = 'fixed';
        dialog.style.margin = '0 auto';
        dialog.style.top = `${Math.max(8, Math.round(window.visualViewport.offsetTop))}px`;
        dialog.style.maxHeight = `${Math.round(window.visualViewport.height - 16)}px`;
      } else {
        dialog.style.position = '';
        dialog.style.margin = '';
        dialog.style.top = '';
        dialog.style.maxHeight = '';
      }
    };
    window.visualViewport.addEventListener('resize', repositionOpenDialog);
    window.visualViewport.addEventListener('scroll', repositionOpenDialog);
  }

  $$('[data-goto]').forEach((node) => {
    node.onclick = () => {
      if (state.view === 'editor' && editor.isDirty()
        && !confirm('Máš neuložené zmeny v piesni. Naozaj odísť bez uloženia?')) return;
      setView(node.dataset.goto);
      if (node.dataset.goto === 'settings') {
        renderSettings();
        net.probe();
      }
      watchNetStatus(node.dataset.goto === 'settings');
      publish();
    };
  });

  $('#searchInput').oninput = (event) => {
    state.query = event.target.value;
    renderSongList();
  };
  $('#searchClear').onclick = () => {
    state.query = '';
    $('#searchInput').value = '';
    renderSongList();
  };

  // import priečinka / súborov
  $('#newSong').onclick = () => openEditor(null);
  $('#psalmBtn').onclick = () => {
    setPsalmDay(psalm.day || todayKey());
    $('#psalmDialog').showModal();
    if (!psalm.parsed) loadPsalm();
  };
  $('#psalmLoad').onclick = loadPsalm;
  $('#psalmSave').onclick = savePsalm;
  $('#psalmPlay').onclick = playPsalm;
  $('#psalmDate').onchange = (event) => {
    if (event.target.value) setPsalmDay(dateKey(event.target.value));
  };
  $$('#psalmQuick [data-day]').forEach((chip) => {
    chip.onclick = () => {
      const key = chip.dataset.day === 'today' ? todayKey()
        : chip.dataset.day === 'tomorrow' ? dateKey(new Date(Date.now() + 86400000))
          : nextSundayKey();
      setPsalmDay(key);
      loadPsalm();
    };
  });
  $('#importSongsFolder').onclick = async () => {
    const result = await startNativeImport('songs');
    await syncSongsToFolder(result && result.filesInFolder);
  };
  $('#reloadSongsFolder').onclick = async () => {
    const result = await startNativeImport('songs');
    await syncSongsToFolder(result && result.filesInFolder);
  };
  $('#pickFolder').onclick = () => {
    if (isNative) startNativeImport('pick');
    else $('#folderInput').click();
  };
  $('#liveEdit').onclick = editCurrentSong;
  $('#liveSetBtn').onclick = () => {
    renderLiveSetList();
    $('#liveSetSearch').value = '';
    $('#liveSetResults').innerHTML = '';
    $('#liveSetDialog').showModal();
    // Dialóg sám neponúka vyhľadávanie – klávesnica sa má otvoriť, až keď
    // do poľa ťukne používateľ, nie hneď pri otvorení (showModal() vie
    // niekedy sám presunúť fokus na prvý ovládací prvok v ňom).
    if (document.activeElement && document.activeElement !== document.body) {
      document.activeElement.blur();
    }
  };
  $('#liveSetSearch').oninput = (event) => {
    renderQuickResults('#liveSetResults', event.target.value, addToLiveSet);
  };
  $('#pickFiles').onclick = () => $('#fileInput').click();
  const handleFiles = async (files, folderName) => {
    if (!files || !files.length) return;
    $('#importInfo').textContent = 'Načítavam...';
    const result = await importFiles(files, {
      folderName,
      onProgress: (done, total) => { $('#importInfo').textContent = `Načítavam ${done}/${total}...`; },
    });
    await reloadLibrary();
    renderSettings();
    $('#importInfo').textContent = `Načítaných ${pluralSongs(result.songs)} z ${result.files} ${result.files === 1 ? 'súboru' : 'súborov'}.`;
    if (result.errors.length) {
      toast(`Načítaných ${pluralSongs(result.songs)}, ${result.errors.length} súborov s chybou.`, 'warn');
      console.warn('Chyby pri načítaní:', result.errors);
    } else {
      toast(`Načítaných ${pluralSongs(result.songs)}.`, 'ok');
    }
  };
  $('#folderInput').onchange = (event) => handleFiles(event.target.files);
  $('#fileInput').onchange = (event) => {
    const name = prompt('Do ktorej zbierky uložiť tieto súbory?', 'Ostatné');
    if (name === null) return;
    handleFiles(event.target.files, name.trim() || 'Ostatné');
  };

  const dropZone = document.body;
  dropZone.addEventListener('dragover', (event) => { event.preventDefault(); });
  dropZone.addEventListener('drop', async (event) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files || []);
    if (files.length) await handleFiles(files, 'Ostatné');
  });

  // set
  $('#setNameInput').oninput = (event) => { state.set.name = event.target.value; };
  $('#saveSet').onclick = saveCurrentSet;
  $('#openSavedSets').onclick = () => {
    renderSavedSets();
    $('#savedSetsDialog').showModal();
  };
  $('#clearSet').onclick = () => {
    if (state.set.items.length && !confirm('Vyprázdniť aktuálny set? Uložené sety zostanú zachované.')) return;
    state.set = { id: null, name: 'Nový set', items: [] };
    renderSetList();
    renderSongList();
  };
  $('#startSet').onclick = () => startLive(state.set.items, 0);

  $('#quickAdd').oninput = (event) => {
    renderQuickResults('#quickAddResults', event.target.value, (song) => {
      if (addToSet(song.id)) {
        $('#quickAdd').value = '';
        $('#quickAddResults').innerHTML = '';
      }
    });
  };
  $('#quickAdd').onkeydown = (event) => {
    if (event.key !== 'Enter') return;
    const matches = quickMatches(event.target.value);
    if (matches.length) {
      if (addToSet(matches[0].id)) {
        event.target.value = '';
        $('#quickAddResults').innerHTML = '';
      }
    } else {
      toast('Pieseň s týmto číslom sa nenašla.', 'warn');
    }
  };

  // živý režim
  $('#prevVerse').onclick = () => stepVerse(-1);
  $('#nextVerse').onclick = () => stepVerse(1);
  $('#blankBtn').onclick = () => toggleBlank();
  $('#prevSong').onclick = () => stepSong(-1);
  $('#nextSong').onclick = () => stepSong(1);
  $('#exitLive').onclick = () => {
    setView(state.set.items.length ? 'set' : 'library');
    publish();
  };
  $('#openDisplay').onclick = openDisplayWindow;
  // Skratka z knižnice (aj set/nastavenia) rovno do premietania – bez
  // toho, aby bolo treba prejsť cez záložku Set. Bežiace premietanie sa
  // len znovu otvorí, nové sa spustí z aktuálneho setu.
  $('#goLive').onclick = () => {
    if (state.live.songs.length) {
      setView('live');
      renderLive();
      return;
    }
    startLive(state.set.items, 0);
  };

  // rýchly skok na pieseň podľa čísla počas hrania
  $('#jumpToggle').onclick = () => toggleJumpPanel();
  $('#jumpClose').onclick = () => toggleJumpPanel(false);
  $$('#keypad [data-key]').forEach((key) => {
    key.onclick = () => {
      const node = $('#jumpValue');
      const digit = key.dataset.key;
      if (digit === 'del') node.textContent = node.textContent.slice(0, -1);
      else if (digit === 'clr') node.textContent = '';
      else node.textContent = (node.textContent + digit).slice(0, 4);
      renderJump();
    };
  });
  $$('#jumpSystem [data-system]').forEach((button) => {
    button.onclick = () => {
      $$('#jumpSystem [data-system]').forEach((other) => other.classList.remove('is-active'));
      button.classList.add('is-active');
      jump.system = button.dataset.system;
      renderJump();
    };
  });

  // nastavenia
  $('#castAppId').onchange = (event) => {
    const value = event.target.value.trim();
    updateSettings({ castAppId: value });
    cast.setAppId(value);
    toast(value ? 'Cast Application ID uložené.' : 'Cast vypnutý.', 'ok');
  };
  $('#themeSelect').onchange = (event) => updateSettings({ theme: event.target.value });
  $('#fontScale').oninput = (event) => {
    updateSettings({ fontScale: Number(event.target.value) });
    $('#fontScaleValue').textContent = `${Math.round(state.settings.fontScale * 100)} %`;
  };
  $('#lineSpacing').oninput = (event) => {
    updateSettings({ lineSpacing: Number(event.target.value) });
    $('#lineSpacingValue').textContent = state.settings.lineSpacing.toFixed(2);
  };
  // Najmenšie písmo nesmie prerásť najväčšie a naopak.
  $('#fontMin').oninput = (event) => {
    const value = Math.min(Number(event.target.value), state.settings.fontMax - 3);
    updateSettings({ fontMin: value });
    renderFontLimits();
  };
  $('#fontMax').oninput = (event) => {
    const value = Math.max(Number(event.target.value), state.settings.fontMin + 3);
    updateSettings({ fontMax: value });
    renderFontLimits();
  };
  $('#headerMode').onchange = (event) => updateSettings({ header: event.target.value });
  $('#fadeSelect').onchange = (event) => updateSettings({ fade: Number(event.target.value) });
  $('#showVerseLabel').onchange = (event) => updateSettings({ showVerseLabel: event.target.checked });
  $('#verseNumberInline').onchange = (event) => updateSettings({ verseNumberInline: event.target.checked });
  $('#blankOnStart').onchange = (event) => updateSettings({ blankOnStart: event.target.checked });
  $('#uppercase').onchange = (event) => updateSettings({ uppercase: event.target.checked });
  $('#keepAwake').onchange = (event) => {
    updateSettings({ keepAwake: event.target.checked });
    if (event.target.checked && state.view === 'live') enableWakeLock();
    else releaseWakeLock();
  };
  $('#defaultSystem').onchange = (event) => updateSettings({ defaultSystem: event.target.value });
  $('#clearLibrary').onclick = async () => {
    const extra = isNative && call('hasSongsFolder')
      ? `\n\nZmažú sa aj súbory v priečinku ${call('songsFolder')}.` : '';
    if (!confirm(`Naozaj zmazať celú knižnicu piesní?${extra}`)) return;
    for (const song of state.songs) removeSongFile(song);
    await store.clearSongs();
    state.activeFolder = null;
    await reloadLibrary();
    renderSettings();
    toast('Knižnica vymazaná.', 'ok');
  };
  $('#loadSamples').onclick = loadSampleSongs;
  if ($('#checkUpdate')) $('#checkUpdate').onclick = checkUpdate;
  $('#exportLibrary').onclick = exportLibrary;

  $$('[data-close-dialog]').forEach((node) => {
    node.onclick = () => node.closest('dialog').close();
  });

  // klávesnica / pedál
  document.addEventListener('keydown', (event) => {
    if (state.view !== 'live') return;
    if (event.target.matches('input, textarea, select')) return;
    const song = currentSong();
    switch (event.key) {
      case 'ArrowRight': case 'PageDown': case ' ': stepVerse(1); event.preventDefault(); break;
      case 'ArrowLeft': case 'PageUp': stepVerse(-1); event.preventDefault(); break;
      case 'ArrowDown': stepSong(1); event.preventDefault(); break;
      case 'ArrowUp': stepSong(-1); event.preventDefault(); break;
      case 'b': case 'B': case '.': toggleBlank(); event.preventDefault(); break;
      default:
        if (/^[1-9]$/.test(event.key) && song) {
          const index = song.verses.findIndex((verse) => verse.label === event.key);
          selectVerse(index >= 0 ? index : Number(event.key) - 1);
          event.preventDefault();
        } else if (event.key === '0' && song) {
          const index = song.verses.findIndex((verse) => verse.type === 'chorus');
          if (index >= 0) selectVerse(index);
          event.preventDefault();
        }
    }
  });
}

/** Uloží všetky piesne do jedného .xml súboru ako zálohu. */
function exportLibrary() {
  if (!state.songs.length) {
    toast('Knižnica je prázdna.', 'warn');
    return;
  }
  const xml = libraryXml();
  const fileName = `organista-zaloha-${new Date().toISOString().slice(0, 10)}.xml`;

  if (isNative) {
    const where = call('exportFile', fileName, xml);
    toast(where ? `Záloha uložená: ${where}` : 'Zálohu sa nepodarilo uložiť.', where ? 'ok' : 'warn');
    return;
  }
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast(`Záloha uložená ako ${fileName}`, 'ok');
}

// ------------------------------------------------- import v aplikácii Android

const nativeImport = { files: [], running: false, total: 0, resolve: null };

/** Pásik s priebehom načítavania piesní a setov – ukazuje každé číslo aj %. */
function showProgress(label, done, total) {
  const box = $('#importProgress');
  if (!box) return;
  box.hidden = false;
  const percent = total ? Math.round((done / total) * 100) : 0;
  $('#importProgressLabel').textContent = total
    ? `${label} ${done}/${total} (${percent} %)`
    : label;
  $('#importProgressBar').style.width = `${Math.max(4, Math.min(100, total ? percent : 8))}%`;
}

function hideProgress() {
  const box = $('#importProgress');
  if (box) box.hidden = true;
}

/**
 * @param {'songs'|'pick'} mode  'songs' = priečinok Stiahnuté/Organista/piesne
 *                               (prvýkrát si ho dá Android potvrdiť),
 *                               'pick'  = vždy vybrať priečinok ručne.
 * @returns {Promise<object|null>} výsledok načítania
 */
function startNativeImport(mode = 'pick') {
  if (nativeImport.running) return Promise.resolve(null);
  nativeImport.files = [];
  nativeImport.total = 0;
  nativeImport.running = true;
  const known = mode === 'songs' && call('hasSongsFolder');
  $('#importInfo').textContent = known
    ? 'Čítam priečinok s piesňami…'
    : 'Potvrď priečinok s piesňami…';
  if (known) showProgress('Načítavam piesne…', 0, 0);
  call(mode === 'songs' ? 'importSongsFolder' : 'importFolder');
  return new Promise((resolve) => { nativeImport.resolve = resolve; });
}

/**
 * Načítanie priečinka s piesňami pri spustení aplikácie. Priečinok je hlavné
 * úložisko: čo je v ňom, to je v knižnici. Keď má aplikácia prístup k súborom,
 * nič sa nevyberá – priečinok je predvolený a číta sa rovno.
 */
async function loadSongsFolderAtStart() {
  if (!isNative || !call('hasSongsFolder')) return;
  const result = await startNativeImport('songs');
  await syncSongsToFolder(result && result.filesInFolder);
}

/** Nastavenia: kde sú piesne uložené a ako to zmeniť. */
function renderSongsDir() {
  const info = $('#songsDirInfo');
  if (!info || !isNative) return;
  const path = call('songsFolderFull') || call('songsFolder') || '';
  const access = call('hasFileAccess') === true;
  info.innerHTML = access
    ? `Piesne sú v priečinku <strong>${path}</strong>.`
    : `Predvolený priečinok je <strong>${path}</strong>, aplikácia doň ale zatiaľ nevidí. `
      + 'Zapni jej prístup k súborom – potom sa piesne načítajú samy pri každom spustení '
      + 'a nemusíš nič vyberať.';
  const allow = $('#songsDirAllow');
  if (allow) allow.hidden = access;
}

/** Po zmene priečinka sa knižnica načíta z nového miesta. */
window.organistaSongsDirChanged = async (result) => {
  hideProgress();
  if (!result || !result.ok) {
    renderSongsDir();
    renderSongsFolderHint();
    toast('Priečinok sa nepodarilo zmeniť.', 'warn');
    return;
  }
  renderSongsDir();
  renderSongsFolderHint();
  toast(`Piesne sa presunuli do ${result.path}.`, 'ok');
  await loadSongsFolderAtStart();
  await loadSetsFolderAtStart();
};

/**
 * Piesne, ktoré v priečinku ešte nemajú súbor (napríklad písané v aplikácii
 * pred jeho potvrdením), sa doň dopíšu. Pri ďalších spusteniach už netreba
 * zapisovať nič.
 */
async function syncSongsToFolder(present) {
  if (!isNative || !call('hasSongsFolder') || !present) return;
  const missing = state.songs.filter((song) => !song.temporary
    && !present.has(`${song.folder}/${songFileName(song)}`)
    && !present.has(songFileName(song)));
  if (!missing.length) return;

  let done = 0;
  for (const song of missing) {
    writeSongFile(song);
    done += 1;
    showProgress('Dopĺňam piesne do priečinka…', done, missing.length);
  }
  hideProgress();
  toast(`Do priečinka pribudlo ${pluralSongs(missing.length)}.`, 'ok');
}

/** Vysvetlivka, kam sa dajú nahrať piesne z počítača. */
function renderSongsFolderHint() {
  const hint = $('#songsFolderHint');
  if (!hint || !isNative) return;
  const path = call('songsFolder') || 'Stiahnuté/Organista/piesne';
  // Keď je priečinok potvrdený, číta sa sám pri každom spustení a veľké
  // tlačidlo netreba – zostane len malé na opätovné načítanie.
  const known = !!call('hasSongsFolder');
  const big = $('#importSongsFolder');
  const again = $('#reloadSongsFolder');
  if (big) big.hidden = known;
  if (again) again.hidden = !known;
  hint.innerHTML = known
    ? `Piesne sa načítavajú pri každom spustení z priečinka <strong>${path}</strong>. `
      + 'Súbory .xml doň skopíruj z počítača cez USB kábel; podpriečinky sa stanú zbierkami. '
      + 'Nové piesne z aplikácie sa doň ukladajú samy. Ak si niečo pridal počas behu '
      + 'aplikácie, načítaj priečinok znovu tlačidlom vyššie.'
    : `Piesne z počítača skopíruj cez USB kábel do priečinka <strong>${path}</strong> `
      + '(v počítači: Tablet → Interná pamäť → Download → Organista → piesne) a potom '
      + 'ťukni na tlačidlo vyššie. Android sa raz spýta, či môže priečinok čítať – '
      + 'potvrď <strong>Použiť tento priečinok</strong>. Podpriečinky sa stanú zbierkami.';
}

/** Natívna časť najprv povie, koľko súborov v priečinku našla. */
window.organistaImportStart = (total) => {
  if (!nativeImport.running) return;
  nativeImport.total = Number(total) || 0;
  showProgress('Načítavam piesne…', 0, nativeImport.total);
};

/**
 * Natívna časť posiela tento signál za KAŽDÝ súbor zvlášť (obsah chodí
 * dávkovo nižšie, kvôli rýchlosti) – vďaka tomu pásik ukazuje skutočné
 * číslo namiesto skokov po 25.
 */
window.organistaImportTick = (done) => {
  if (!nativeImport.running) return;
  showProgress('Načítavam piesne…', Number(done) || 0, nativeImport.total);
};

/** Natívna časť posiela obsah súborov po dávkach (kvôli rýchlosti prenosu). */
window.organistaImportChunk = (batch) => {
  if (!nativeImport.running) return;
  for (const item of batch || []) nativeImport.files.push(item);
  $('#importInfo').textContent = `Načítavam ${nativeImport.files.length} súborov…`;
};

window.organistaImportDone = async (total) => {
  if (!nativeImport.running) return;
  nativeImport.running = false;
  const files = nativeImport.files;
  const finish = nativeImport.resolve;
  nativeImport.files = [];
  nativeImport.resolve = null;

  if (!files.length) {
    hideProgress();
    const path = call('songsFolder') || 'Stiahnuté/Organista/piesne';
    $('#importInfo').textContent = Number(total) === 0
      ? `V priečinku nie sú žiadne súbory .xml. Skopíruj ich tam z počítača (${path}).`
      : 'Načítanie sa nepodarilo.';
    renderSongsFolderHint();
    if (finish) finish(null);
    return;
  }

  showProgress('Spracúvam piesne…', files.length, nativeImport.total || files.length);
  const result = await importFiles(files.map((item) => ({
    name: item.name,
    webkitRelativePath: `${item.folder}/${item.name}`,
    text: async () => item.text,
  })));
  // Zoznam toho, čo v priečinku naozaj je – podľa neho sa dopíšu chýbajúce.
  result.filesInFolder = new Set(files.flatMap((item) => [`${item.folder}/${item.name}`, item.name]));
  await reloadLibrary();
  renderSettings();
  renderSongsFolderHint();
  hideProgress();
  $('#importInfo').textContent = `Načítaných ${pluralSongs(result.songs)} z ${result.files} súborov.`;
  toast(`Načítaných ${pluralSongs(result.songs)}.`, 'ok');
  if (finish) finish(result);
};

/** Zmena druhej obrazovky – volá natívna časť. */
window.organistaDisplayChanged = (info) => {
  renderDisplayStatus({ connected: !!(info && info.connected), name: (info && info.name) || '' });
};

async function loadSampleSongs() {
  const samples = [
    ['JKS', '342-Ó_Bože_náš.xml'],
    ['JKS', '078-Vitaj_svetlo.xml'],
    ['JKS', '501-Chvalme_Pana.xml'],
    ['Ukazkove', 'adventna.xml'],
    ['Ukazkove', 'velkonocna.xml'],
    ['Ukazkove', 'viacero-piesni.xml'],
  ];
  try {
    const files = await Promise.all(samples.map(async ([folder, name]) => {
      const response = await fetch(`songs/${folder}/${encodeURIComponent(name)}`);
      if (!response.ok) throw new Error(name);
      const text = await response.text();
      const file = new File([text], name, { type: 'text/xml' });
      Object.defineProperty(file, 'webkitRelativePath', { value: `songs/${folder}/${name}` });
      return file;
    }));
    const byFolder = new Map();
    files.forEach((file, index) => {
      const folder = samples[index][0];
      if (!byFolder.has(folder)) byFolder.set(folder, []);
      byFolder.get(folder).push(file);
    });
    let total = 0;
    for (const [folder, group] of byFolder) {
      const result = await importFiles(group, { folderName: folder, system: systemForFolder(folder) });
      total += result.songs;
    }
    await reloadLibrary();
    renderSettings();
    toast(`Načítaných ${pluralSongs(total)} (ukážky).`, 'ok');
  } catch (error) {
    toast('Ukážkové piesne sa nepodarilo načítať.', 'warn');
  }
}

// -------------------------------------------------------------------- štart

async function main() {
  setupEditor();
  bindEvents();
  renderSettings();
  if (isNative) {
    document.body.classList.add('is-native');
    renderDisplayStatus({ connected: !!call('displayName'), name: call('displayName') || '' });
    $('#displayBtn').onclick = () => call('openDisplaySettings');
    $('#displaySettingsBtn').onclick = () => call('openDisplaySettings');
    renderSongsFolderHint();
    renderSongsDir();
    $('#songsDirPick').onclick = () => {
      showProgress('Presúvam piesne…', 0, 0);
      call('pickSongsFolder');
    };
    $('#songsDirAllow').onclick = () => call('requestFileAccess');

    // Po návrate zo systémových nastavení sa prístup skontroluje znovu.
    // Po preinštalovaní appka prístup ešte nemá – sety aj piesne z priečinka
    // sa preto načítajú až vtedy, keď sa používateľ vráti s povolením.
    document.addEventListener('visibilitychange', async () => {
      if (document.hidden || !call('hasFileAccess')) return;
      if (!state.songs.length) {
        renderSongsDir();
        renderSongsFolderHint();
        await loadSongsFolderAtStart();
      }
      if (!setsFolderLoaded) {
        await loadSetsFolderAtStart();
        restoreCurrentSetBackup();
      }
    });
  } else {
    renderCastStatus(cast.state);
    renderNetStatus(net.status);
    cast.start();
    await net.probe();
  }
  await reloadLibrary();
  setView('library');
  publish();
  startStatusBar();

  // Priečinok s piesňami je úložisko – načíta sa pri každom spustení.
  await loadSongsFolderAtStart();
  // Sety vedľa neho rovnako.
  await loadSetsFolderAtStart();
  // Keby appka spadla uprostred prípravy setu, obnoví sa z priebežnej zálohy.
  restoreCurrentSetBackup();
  // Ak je knižnica aj tak prázdna (napríklad po preinštalovaní a priečinok
  // ešte nie je potvrdený), skúsi sa posledná automatická záloha.
  await restoreFromAutoBackup();
  startAutoBackup();

  const kind = await storageKind();
  $('#storageInfo').textContent = kind === 'android'
    ? 'Piesne sú uložené v súkromnom priečinku aplikácie v tablete. Iná aplikácia sa k nim '
      + 'nedostane a Android ich zálohuje spolu s aplikáciou. Zálohu si vieš uložiť aj ručne tlačidlom vyššie.'
    : 'Piesne sa ukladajú do databázy prehliadača (IndexedDB) v tomto zariadení.';

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

main();
