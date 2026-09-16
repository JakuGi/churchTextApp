// Prenos stavu na zobrazovacie plochy.
// 1) BroadcastChannel + localStorage – pre okno/kartu na tom istom zariadení
//    (to sa zrkadlí na TV cez "Prenášať kartu" / mirroring),
// 2) Google Cast – priamo na Chromecast prijímač (receiver.html).

export const CHANNEL = 'organista-texty';
export const MIRROR_KEY = 'organista-stav';
export const CAST_NAMESPACE = 'urn:x-cast:sk.organista.texty';

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
    showTitle: settings.showTitle,
    showVerseLabel: settings.showVerseLabel,
    uppercase: settings.uppercase,
    lineSpacing: settings.lineSpacing,
    ts: Date.now(),
  };
}
