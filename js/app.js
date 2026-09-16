// Ovládacia aplikácia pre organistu (tablet).

import { store, loadSettings, saveSettings, DEFAULT_SETTINGS } from './store.js';
import { searchSongs, compareSongs, normalize, parseNumber, VERSE_TYPES } from './songs.js';
import { createEditor } from './editor.js';
import { importFiles, systemForFolder } from './import.js';
import { createLocalBus, createNetBus, displayState } from './bus.js';
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
  view: 'library',
};

const bus = createLocalBus();
const net = createNetBus({ onStatus: (status) => renderNetStatus(status) });
let editor = null;
let preview = null;
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

function toast(message, kind = 'info') {
  const box = $('#toast');
  box.textContent = message;
  box.className = `toast toast--${kind} is-visible`;
  clearTimeout(box._timer);
  box._timer = setTimeout(() => box.classList.remove('is-visible'), 3200);
}

function setView(view) {
  state.view = view;
  $$('.view').forEach((node) => node.classList.toggle('is-active', node.dataset.view === view));
  $$('.tab').forEach((node) => node.classList.toggle('is-active', node.dataset.goto === view));
  document.body.classList.toggle('is-live', view === 'live');
  if (view === 'live') enableWakeLock();
  else releaseWakeLock();
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
      renderFolders();
      renderSongList();
    };
    box.appendChild(button);
  }
}

function visibleSongs() {
  const pool = state.activeFolder
    ? state.songs.filter((song) => song.folder === state.activeFolder)
    : state.songs;
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

  const inSet = isInSet(song.id);
  const button = document.createElement('button');
  button.className = `btn btn--add${inSet ? ' btn--inset' : ''}`;
  button.textContent = inSet ? '✓ V sete' : actionLabel;
  button.disabled = inSet;
  button.title = inSet ? 'Pieseň už je v sete' : 'Pridať pieseň do setu';
  button.onclick = (event) => {
    event.stopPropagation();
    action(song);
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
    box.innerHTML = `<div class="empty">
      <h3>Knižnica je prázdna</h3>
      <p>Napíš prvú pieseň tlačidlom <strong>✎ Nová pieseň</strong>, alebo načítaj priečinok
      s .xml súbormi tlačidlom <strong>Načítať priečinok</strong> – každý podpriečinok sa stane
      samostatnou zbierkou (napr. <em>JKS</em>).</p></div>`;
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
      action: (target) => addToSet(target.id),
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
  addButton.textContent = alreadyIn ? '✓ Už je v sete' : '+ Do setu';
  addButton.disabled = alreadyIn;
  addButton.classList.toggle('btn--inset', alreadyIn);
  addButton.onclick = () => {
    addToSet(song.id);
    dialog.close();
  };
  $('#dialogPlay').onclick = () => {
    dialog.close();
    startLive([song.id], 0);
  };
  dialog.showModal();
}

// ---------------------------------------------------------------- editor

function openEditor(song) {
  editor.open(song || null);
  setView('editor');
}

function setupEditor() {
  editor = createEditor({
    getFolders: () => state.folders,
    getSongs: () => state.songs,
    getSettings: () => state.settings,
    toast,
    onSave: async (song, replacedId) => {
      if (replacedId) {
        await store.deleteSongs([replacedId]);
        state.set.items = state.set.items.map((id) => (id === replacedId ? song.id : id));
      }
      await store.putSongs([song]);
      const others = state.songs.filter((item) => item.folder === song.folder && item.id !== song.id).length;
      await store.putFolder({
        name: song.folder,
        system: (state.folders.find((folder) => folder.name === song.folder) || {}).system
          || (song.number ? song.system : ''),
        count: others + 1,
        updatedAt: Date.now(),
      });
      await reloadLibrary();
      toast(`Pieseň „${song.title}“ uložená.`, 'ok');
    },
    onDelete: async (song) => {
      await store.deleteSongs([song.id]);
      state.set.items = state.set.items.filter((id) => id !== song.id);
      await reloadLibrary();
      toast(`Pieseň „${song.title}“ zmazaná.`, 'ok');
      setView('library');
    },
    onClose: () => setView('library'),
  });
}

// ------------------------------------------------------------------- set

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

function moveInSet(index, delta) {
  const target = index + delta;
  if (target < 0 || target >= state.set.items.length) return;
  const [item] = state.set.items.splice(index, 1);
  state.set.items.splice(target, 0, item);
  renderSetList();
}

function renderSetList() {
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
      toast(`Načítaný set „${saved.name}“`, 'ok');
    };
    const remove = document.createElement('button');
    remove.className = 'btn btn--danger';
    remove.textContent = 'Zmazať';
    remove.onclick = async () => {
      if (!confirm(`Zmazať set „${saved.name}“?`)) return;
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
  const set = {
    id: state.set.id || `set-${Date.now()}`,
    name: $('#setNameInput').value.trim() || 'Set bez názvu',
    items: state.set.items.slice(),
    updatedAt: Date.now(),
  };
  await store.putSet(set);
  state.set.id = set.id;
  state.set.name = set.name;
  await reloadLibrary();
  toast(`Set „${set.name}“ uložený.`, 'ok');
}

// -------------------------------------------------------- rýchly výber čísla

function quickMatches(value) {
  const raw = String(value || '').trim();
  if (!raw) return [];
  const asNumber = parseNumber(raw);
  if (asNumber) {
    return state.songs.filter((song) => song.number
      && parseInt(song.number, 10) === parseInt(asNumber.number, 10)
      && (!asNumber.system || song.system === asNumber.system));
  }
  return searchSongs(state.songs, raw).slice(0, 8);
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
  state.live = { songs, songIndex: Math.min(index, songs.length - 1), verseIndex: 0, blank: state.live.blank };
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

function renderLive() {
  const song = currentSong();
  const verse = currentVerse();

  $('#liveTitle').textContent = song ? song.title : 'Bez piesne';
  $('#liveNumber').textContent = song ? songLabel(song) : '';
  $('#livePosition').textContent = state.live.songs.length > 1
    ? `${state.live.songIndex + 1}/${state.live.songs.length}`
    : '';
  $('#prevSong').disabled = state.live.songIndex === 0;
  $('#nextSong').disabled = state.live.songIndex >= state.live.songs.length - 1;
  $('#prevSongLabel').textContent = state.live.songIndex > 0
    ? state.live.songs[state.live.songIndex - 1].title : '';
  $('#nextSongLabel').textContent = state.live.songIndex < state.live.songs.length - 1
    ? state.live.songs[state.live.songIndex + 1].title : '';

  const blankButton = $('#blankBtn');
  blankButton.classList.toggle('is-on', state.live.blank);
  blankButton.querySelector('.bigbtn__label').textContent = state.live.blank ? 'ZOBRAZIŤ TEXT' : 'ČIERNA OBRAZOVKA';
  $('#blankNotice').hidden = !state.live.blank;
  if (state.live.blank && verse) {
    $('#blankNotice').textContent = `Čierna obrazovka – vybraná ostáva ${verse.type === 'chorus' ? 'refrén' : `${verse.label}. sloha`}`;
  }

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

  $('#prevVerse').disabled = !song || (state.live.verseIndex === 0 && state.live.songIndex === 0);
  $('#nextVerse').disabled = !song
    || (state.live.verseIndex >= song.verses.length - 1 && state.live.songIndex >= state.live.songs.length - 1);

  publish();
}

// ------------------------------------------------------------- publikovanie

function publish() {
  const payload = displayState({
    song: currentSong(),
    verse: currentVerse(),
    blank: state.live.blank || state.view !== 'live',
    settings: state.settings,
    position: state.live.songs.length > 1 ? `${state.live.songIndex + 1}/${state.live.songs.length}` : '',
  });
  bus.send(payload);
  net.send(payload);
  cast.send(payload);
  if (preview) preview.render(payload);
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

function renderCastStatus(status) {
  const badge = $('#castStatus');
  const button = $('#castBtn');
  if (!state.settings.castAppId) {
    badge.hidden = true;                     // bez App ID nie je čo hlásiť
    button.textContent = 'Nastaviť Cast';
    button.onclick = () => {
      setView('settings');
      renderSettings();
      net.probe();
    };
    return;
  }
  badge.hidden = false;
  if (status.connected) {
    badge.textContent = `Chromecast: ${status.deviceName || 'pripojený'}`;
    badge.className = 'badge badge--ok';
    button.textContent = 'Odpojiť';
    button.onclick = () => cast.disconnect();
    publish();
    return;
  }
  badge.textContent = status.error || (status.available ? 'Chromecast: pripravený' : 'Chromecast: hľadám...');
  badge.className = status.error ? 'badge badge--warn' : 'badge';
  button.textContent = 'Pripojiť Chromecast';
  button.onclick = () => cast.connect();
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

function renderSettings() {
  $('#castAppId').value = state.settings.castAppId;
  $('#themeSelect').value = state.settings.theme;
  $('#fontScale').value = String(state.settings.fontScale);
  $('#fontScaleValue').textContent = `${Math.round(state.settings.fontScale * 100)} %`;
  $('#lineSpacing').value = String(state.settings.lineSpacing);
  $('#lineSpacingValue').textContent = state.settings.lineSpacing.toFixed(2);
  $('#showTitle').checked = state.settings.showTitle;
  $('#showVerseLabel').checked = state.settings.showVerseLabel;
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
      if (!confirm(`Odstrániť zbierku „${folder.name}“ z knižnice?`)) return;
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
  $('#pickFolder').onclick = () => $('#folderInput').click();
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
  $('#newSet').onclick = () => {
    if (state.set.items.length && !confirm('Vyprázdniť aktuálny set?')) return;
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
  $('#showTitle').onchange = (event) => updateSettings({ showTitle: event.target.checked });
  $('#showVerseLabel').onchange = (event) => updateSettings({ showVerseLabel: event.target.checked });
  $('#uppercase').onchange = (event) => updateSettings({ uppercase: event.target.checked });
  $('#keepAwake').onchange = (event) => {
    updateSettings({ keepAwake: event.target.checked });
    if (event.target.checked && state.view === 'live') enableWakeLock();
    else releaseWakeLock();
  };
  $('#defaultSystem').onchange = (event) => updateSettings({ defaultSystem: event.target.value });
  $('#clearLibrary').onclick = async () => {
    if (!confirm('Naozaj zmazať celú knižnicu piesní?')) return;
    await store.clearSongs();
    state.activeFolder = null;
    await reloadLibrary();
    renderSettings();
    toast('Knižnica vymazaná.', 'ok');
  };
  $('#loadSamples').onclick = loadSampleSongs;

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
  preview = createDisplay($('#previewScreen'));
  setupEditor();
  bindEvents();
  renderSettings();
  renderCastStatus(cast.state);
  renderNetStatus(net.status);
  cast.start();
  await net.probe();
  await reloadLibrary();
  setView('library');
  publish();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

main();
