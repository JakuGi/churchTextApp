// Lokálne úložisko: piesne, priečinky, sety a nastavenia (IndexedDB + localStorage).

const DB_NAME = 'organista-texty';
const DB_VERSION = 1;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('songs')) {
        const songs = db.createObjectStore('songs', { keyPath: 'id' });
        songs.createIndex('folder', 'folder');
        songs.createIndex('numberKey', 'numberKey');
      }
      if (!db.objectStoreNames.contains('folders')) {
        db.createObjectStore('folders', { keyPath: 'name' });
      }
      if (!db.objectStoreNames.contains('sets')) {
        db.createObjectStore('sets', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

function tx(storeName, mode, run) {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    let result;
    try {
      result = run(store);
    } catch (error) {
      reject(error);
      return;
    }
    transaction.oncomplete = () => resolve(result && result.__req ? result.__req.result : result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  }));
}

const wrap = (request) => ({ __req: request });

export const store = {
  async allSongs() {
    return tx('songs', 'readonly', (s) => wrap(s.getAll()));
  },
  async putSongs(songs) {
    return tx('songs', 'readwrite', (s) => {
      songs.forEach((song) => s.put(song));
      return songs.length;
    });
  },
  async deleteFolder(folder) {
    const songs = await this.allSongs();
    await tx('songs', 'readwrite', (s) => {
      songs.filter((song) => song.folder === folder).forEach((song) => s.delete(song.id));
      return true;
    });
    await tx('folders', 'readwrite', (s) => {
      s.delete(folder);
      return true;
    });
  },
  async clearSongs() {
    await tx('songs', 'readwrite', (s) => { s.clear(); return true; });
    await tx('folders', 'readwrite', (s) => { s.clear(); return true; });
  },
  async folders() {
    return tx('folders', 'readonly', (s) => wrap(s.getAll()));
  },
  async putFolder(folder) {
    return tx('folders', 'readwrite', (s) => { s.put(folder); return folder; });
  },
  async sets() {
    return tx('sets', 'readonly', (s) => wrap(s.getAll()));
  },
  async putSet(set) {
    return tx('sets', 'readwrite', (s) => { s.put(set); return set; });
  },
  async deleteSet(id) {
    return tx('sets', 'readwrite', (s) => { s.delete(id); return true; });
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
