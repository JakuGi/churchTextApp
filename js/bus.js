// Prenos stavu na zobrazovacie plochy.
// 1) BroadcastChannel + localStorage – pre okno/kartu na tom istom zariadení,
// 2) sieť (SSE cez priložený server) – pre obrazovku na inom zariadení,
// 3) Google Cast – priamo na Chromecast prijímač (receiver.html).

import { isNative, call } from './native.js';

export const CHANNEL = 'organista-texty';
export const MIRROR_KEY = 'organista-stav';
export const CAST_NAMESPACE = 'urn:x-cast:sk.organista.texty';

/** Druhá obrazovka v aplikácii pre Android (natívne Presentation API). */
export function createNativeBus() {
  return {
    send(state) {
      if (!isNative) return;
      call('publish', JSON.stringify(state));
    },
  };
}

export function createLocalBus() {
  let channel = null;
  try {
    channel = new BroadcastChannel(CHANNEL);
  } catch {
    channel = null;
  }
  return {
    send(state) {
      const payload = JSON.stringify(state);
      if (channel) channel.postMessage(state);
      try {
        localStorage.setItem(MIRROR_KEY, payload);
      } catch {
        /* ignorujeme */
      }
    },
    subscribe(handler) {
      if (channel) channel.onmessage = (event) => handler(event.data);
      window.addEventListener('storage', (event) => {
        if (event.key === MIRROR_KEY && event.newValue) {
          try {
            handler(JSON.parse(event.newValue));
          } catch {
            /* ignorujeme */
          }
        }
      });
      try {
        const last = localStorage.getItem(MIRROR_KEY);
        if (last) handler(JSON.parse(last));
      } catch {
        /* ignorujeme */
      }
    },
  };
}

/** Stav, ktorý sa posiela na obrazovku. */
export function displayState({ song, verse, blank, settings, position }) {
  return {
    v: 1,
    blank: !!blank,
    title: song ? song.title : '',
    number: song && song.number ? `${song.system || ''} ${song.number}`.trim() : '',
    verseLabel: verse ? verse.label : '',
    verseType: verse ? verse.type : '',
    lines: verse ? verse.lines : [],
    position: position || '',
    theme: settings.theme,
    fontScale: settings.fontScale,
    fontMin: settings.fontMin,
    fontMax: settings.fontMax,
    header: settings.header,
    showVerseLabel: settings.showVerseLabel,
    verseNumberInline: settings.verseNumberInline,
    fade: settings.fade,
    uppercase: settings.uppercase,
    lineSpacing: settings.lineSpacing,
    ts: Date.now(),
  };
}

// ------------------------------------------------- obrazovka cez sieť (SSE)

/**
 * Posiela stav na server, ktorý ho rozošle všetkým otvoreným obrazovkám.
 * Funguje len vtedy, keď je aplikácia spustená z priloženého servera
 * (npm start). Na statickom hostingu (napr. GitHub Pages) server nie je
 * a táto možnosť sa sama vypne.
 */
export function createNetBus({ onStatus } = {}) {
  const status = { available: false, screens: 0, addresses: [], port: 0, error: '' };
  const notify = () => onStatus && onStatus({ ...status });
  let sending = false;
  let pending = null;

  async function probe() {
    try {
      const response = await fetch('api/status', { cache: 'no-store' });
      if (!response.ok) throw new Error('bez servera');
      const data = await response.json();
      if (data.app !== 'organista') throw new Error('iný server');
      status.available = true;
      status.screens = data.screens || 0;
      status.addresses = data.addresses || [];
      status.port = data.port || 0;
      status.error = '';
    } catch {
      status.available = false;
      status.screens = 0;
    }
    notify();
    return status.available;
  }

  async function flush() {
    if (sending || pending === null) return;
    sending = true;
    const payload = pending;
    pending = null;
    try {
      const response = await fetch('api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      const changed = status.screens !== data.screens;
      status.screens = data.screens || 0;
      status.error = '';
      if (changed) notify();
    } catch {
      status.error = 'Spojenie so serverom sa prerušilo.';
      status.available = false;
      notify();
    } finally {
      sending = false;
      if (pending !== null) flush();
    }
  }

  return {
    get status() { return { ...status }; },
    probe,
    send(state) {
      if (!status.available) return;
      pending = state;      // posiela sa vždy len najnovší stav
      flush();
    },
  };
}

/** Obrazovka: počúva stav zo servera. */
export function subscribeNet(handler, { onOpen, onError } = {}) {
  if (typeof EventSource === 'undefined') return null;
  let source;
  try {
    source = new EventSource('api/stream');
  } catch {
    return null;
  }
  source.onmessage = (event) => {
    try {
      handler(JSON.parse(event.data));
    } catch {
      /* poškodená správa sa preskočí */
    }
  };
  source.onopen = () => onOpen && onOpen();
  source.onerror = () => onError && onError();
  return source;
}
