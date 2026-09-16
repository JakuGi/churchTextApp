// Lokálne úložisko: piesne, zbierky, sety a nastavenia.
// Primárne IndexedDB; ak nie je dostupná (napr. pri otvorení jedného súboru
// z disku cez file://), automaticky sa použije localStorage.

const DB_NAME = 'organista-texty';
const DB_VERSION = 1;
const STORES = { songs: 'id', folders: 'name', sets: 'id' };

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
    request.onblocked = () => reject(new Error('IndexedDB je zablokovaná'));
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

// ----------------------------------------------------------- localStorage ---

function localBackend() {
  const key = (name) => `organista-${name}`;
  const read = (name) => {
    try {
      return JSON.parse(localStorage.getItem(key(name)) || '[]');
    } catch {
      return [];
    }
  };
  const write = (name, items) => {
    try {
      localStorage.setItem(key(name), JSON.stringify(items));
    } catch (error) {
      throw new Error('Pamäť prehliadača je plná. Zmaž nepoužívané zbierky piesní.');
    }
  };
  const keyPathOf = (name) => STORES[name];

  return {
    kind: 'localstorage',
    async getAll(name) {
      return read(name);
    },
    async putAll(name, items) {
      const path = keyPathOf(name);
      const all = read(name);
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
    async remove(name, keys) {
      const path = keyPathOf(name);
      const drop = new Set(keys);
      write(name, read(name).filter((item) => !drop.has(item[path])));
    },
    async clear(name) {
      write(name, []);
    },
  };
}

let backendPromise = null;

function backend() {
  if (!backendPromise) {
    backendPromise = openDB()
      .then(idbBackend)
      .catch(() => localBackend());
  }
  return backendPromise;
}

/** 'indexeddb' | 'localstorage' – pre informáciu v nastaveniach. */
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
  theme: 'dark',          // dark | light | sepia
  fontScale: 1,
  showTitle: true,
  showVerseLabel: true,
  uppercase: false,
  lineSpacing: 1.25,
  keepAwake: true,
  defaultSystem: 'JKS',
  vibrate: true,
  presentHelpSeen: false,
  presentButtons: false,  // viditeľné tlačidlá v prezentačnom režime
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return { ...DEFAULT_SETTINGS, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* súkromný režim – nastavenia sa neuložia */
  }
  return settings;
}
