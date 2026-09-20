// Lokálne úložisko: piesne, zbierky, sety a nastavenia.
//
// V aplikácii pre Android sa dáta ukladajú do súkromného priečinka aplikácie
// cez natívny most (súbory, ktoré vie Android aj zálohovať). V prehliadači sa
// použije IndexedDB.

import { native, call } from './native.js';

const DB_NAME = 'organista-texty';
const DB_VERSION = 1;
const STORES = { songs: 'id', folders: 'name', sets: 'id' };
const CHUNK = 200000;   // znakov na jeden prenos do natívnej časti

// ------------------------------------------------------- Android (súbory) ---

function nativeBackend() {
  const parse = (text) => {
    try {
      const value = JSON.parse(text || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  };

  const write = (name, items) => {
    const text = JSON.stringify(items);
    call('writeBegin', name);
    for (let index = 0; index < text.length; index += CHUNK) {
      call('writeChunk', name, text.slice(index, index + CHUNK));
    }
    if (call('writeCommit', name) === false) throw new Error('Uloženie do tabletu zlyhalo.');
  };

  return {
    kind: 'android',
    async getAll(name) {
      return parse(call('read', name));
    },
    async putAll(name, items) {
      const path = STORES[name];
      const all = parse(call('read', name));
      const index = new Map(all.map((item, position) => [item[path], position]));
      for (const item of items) {
        const position = index.get(item[path]);
        if (position === undefined) {
          index.set(item[path], all.length);
          all.push(item);
        } else {
          all[position] = item;
        }
      }
      write(name, all);
    },
    // Zapíše presne dodaný zoznam bez toho, aby si najprv prečítal a zlúčil
    // to, čo je uložené – volajúci už má celú knižnicu v pamäti (state.songs).
    // Cez natívny most ide veľký blok textu pomaly, takže vynechanie tohto
    // čítania výrazne skráti ukladanie pri väčšej knižnici.
    async replaceAll(name, items) {
      write(name, items);
    },
    async remove(name, keys) {
      const path = STORES[name];
      const drop = new Set(keys);
      write(name, parse(call('read', name)).filter((item) => !drop.has(item[path])));
    },
    async clear(name) {
      write(name, []);
    },
  };
}

// ------------------------------------------------------------- IndexedDB ---

function openDB() {
  return new Promise((resolve, reject) => {
    let request;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (error) {
      reject(error);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const [name, keyPath] of Object.entries(STORES)) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    setTimeout(() => reject(new Error('IndexedDB neodpovedá')), 4000);
  });
}

function idbBackend(db) {
  const run = (storeName, mode, action) => new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    let request = null;
    try {
      request = action(store);
    } catch (error) {
      reject(error);
      return;
    }
    transaction.oncomplete = () => resolve(request ? request.result : undefined);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });

  return {
    kind: 'indexeddb',
    getAll: (name) => run(name, 'readonly', (store) => store.getAll()),
    putAll: (name, items) => run(name, 'readwrite', (store) => {
      items.forEach((item) => store.put(item));
      return null;
    }),
    // IndexedDB nečíta pred zápisom (žiadny bridge, žiadny problém s
    // rýchlosťou), takže „replaceAll“ tu znamená to isté ako putAll –
    // volajúci aj tak posiela celý zoznam.
    replaceAll: (name, items) => run(name, 'readwrite', (store) => {
      items.forEach((item) => store.put(item));
      return null;
    }),
    remove: (name, keys) => run(name, 'readwrite', (store) => {
      keys.forEach((key) => store.delete(key));
      return null;
    }),
    clear: (name) => run(name, 'readwrite', (store) => {
      store.clear();
      return null;
    }),
  };
}

let backendPromise = null;

function backend() {
  if (!backendPromise) {
    backendPromise = native
      ? Promise.resolve(nativeBackend())
      : openDB().then(idbBackend);
  }
  return backendPromise;
}

/** 'android' | 'indexeddb' – pre informáciu v nastaveniach. */
export async function storageKind() {
  return (await backend()).kind;
}

export const store = {
  async allSongs() {
    return (await backend()).getAll('songs');
  },
  async putSongs(songs) {
    await (await backend()).putAll('songs', songs);
    return songs.length;
  },
  async deleteSongs(ids) {
    await (await backend()).remove('songs', ids);
  },
  async deleteFolder(folder) {
    const api = await backend();
    const songs = await api.getAll('songs');
    await api.remove('songs', songs.filter((song) => song.folder === folder).map((song) => song.id));
    await api.remove('folders', [folder]);
  },
  async clearSongs() {
    const api = await backend();
    await api.clear('songs');
    await api.clear('folders');
  },
  async folders() {
    return (await backend()).getAll('folders');
  },
  async putFolder(folder) {
    await (await backend()).putAll('folders', [folder]);
    return folder;
  },
  /** Zapíše celú knižnicu piesní naraz – rýchla cesta pre editor (viď vyššie). */
  async replaceSongs(songs) {
    await (await backend()).replaceAll('songs', songs);
  },
  async replaceFolders(folders) {
    await (await backend()).replaceAll('folders', folders);
  },
  async sets() {
    return (await backend()).getAll('sets');
  },
  async putSet(set) {
    await (await backend()).putAll('sets', [set]);
    return set;
  },
  async deleteSet(id) {
    await (await backend()).remove('sets', [id]);
  },
};

// --------------------------------------------------------------- nastavenia

const SETTINGS_KEY = 'organista-nastavenia';

export const DEFAULT_SETTINGS = {
  castAppId: '',
  theme: 'dark',            // dark | light | sepia
  fontScale: 1,
  fontMin: 12,              // najmenšie písmo v % výšky plochy s textom
  fontMax: 55,              // najväčšie písmo v % výšky plochy s textom
  header: 'both',           // none | number | title | both – hlavička na televízore
  showVerseLabel: true,     // číslo slohy v rohu obrazovky
  verseNumberInline: false, // číslo slohy pred prvým riadkom textu
  fade: 120,                // prelínanie pri zmene slohy (ms, 0 = vypnuté)
  uppercase: false,
  lineSpacing: 1.25,
  keepAwake: true,
  blankOnStart: true,       // premietanie začína čiernou obrazovkou
  defaultSystem: 'JKS',
};

export function loadSettings() {
  let stored = {};
  try {
    stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  } catch {
    stored = {};
  }
  // Staršie verzie mali len prepínač „zobrazovať názov a číslo“.
  if (stored.header === undefined && stored.showTitle !== undefined) {
    stored.header = stored.showTitle ? 'both' : 'none';
  }
  delete stored.showTitle;
  return { ...DEFAULT_SETTINGS, ...stored };
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* súkromný režim – nastavenia sa neuložia */
  }
  return settings;
}
