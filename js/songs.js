// Prevod XML súborov na dátový model piesne.
// Podporované formáty: vlastný (SK/EN), OpenSong, OpenLyrics / OpenLP.

import { parseXML, elements, firstElement, deepFirst, textOf, attr } from './xmlparse.js';

/** Odstráni diakritiku a zjednotí na malé písmená – pre vyhľadávanie. */
export function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export const VERSE_TYPES = {
  verse: { label: 'Sloha', short: '' },
  chorus: { label: 'Refrén', short: 'R' },
  bridge: { label: 'Medzihra', short: 'B' },
  prechorus: { label: 'Pred refrénom', short: 'P' },
  ending: { label: 'Záver', short: 'Z' },
  intro: { label: 'Úvod', short: 'Ú' },
  other: { label: 'Časť', short: '*' },
};

const TYPE_ALIASES = {
  v: 'verse', verse: 'verse', sloha: 'verse', slocha: 'verse', strofa: 'verse',
  c: 'chorus', chorus: 'chorus', refren: 'chorus', ref: 'chorus', r: 'chorus',
  b: 'bridge', bridge: 'bridge', medzihra: 'bridge',
  p: 'prechorus', prechorus: 'prechorus', 'pre-chorus': 'prechorus',
  e: 'ending', ending: 'ending', zaver: 'ending', koniec: 'ending',
  i: 'intro', intro: 'intro', uvod: 'intro',
  o: 'other', other: 'other',
};

function verseType(raw) {
  const key = normalize(raw).replace(/\s+/g, '');
  return TYPE_ALIASES[key] || (key ? 'other' : 'verse');
}

/** Rozpozná číselník (JKS / LS / iný) a číslo piesne. */
export function parseNumber(raw, fallbackSystem) {
  const text = String(raw || '').trim();
  if (!text) return null;
  const match = /^([A-Za-zÀ-ž]{1,6})?\s*[.\-_ ]?\s*(\d{1,4})\s*([a-zA-Z])?$/.exec(text);
  if (!match) return null;
  const system = (match[1] || fallbackSystem || '').toUpperCase().replace(/[^A-ZÀ-Ž]/g, '');
  const number = String(parseInt(match[2], 10));
  return { system: system || '', number, suffix: (match[3] || '').toUpperCase() };
}

/** Skúsi vytiahnuť číslo z názvu súboru, napr. "JKS_342 - Nazov.xml" alebo "123.xml". */
export function numberFromFileName(fileName, fallbackSystem) {
  const base = String(fileName || '').replace(/\.[a-z0-9]+$/i, '');
  const match = /^\s*(JKS|LS)?[\s._-]*(\d{1,4})(?![\d])/i.exec(base);
  if (!match) return null;
  return {
    system: (match[1] || fallbackSystem || '').toUpperCase(),
    number: String(parseInt(match[2], 10)),
    suffix: '',
  };
}

function cleanLines(block) {
  return String(block || '')
    .replace(/\r\n?/g, '\n')
    .replace(/\{\/?[^}\n]{0,40}\}/g, '') // formátovacie značky OpenLyrics {y}{/y}
    .split('\n')
    .map((line) => line.replace(/\s+$/g, '').replace(/^\s{1,2}(?=\S)/, ''))
    .filter((line, index, all) => !(line.trim() === '' && (index === 0 || index === all.length - 1)));
}

function makeVerse(type, label, block) {
  const lines = cleanLines(block).filter((line) => line.trim() !== '' || true);
  while (lines.length && lines[0].trim() === '') lines.shift();
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  return { type, label: String(label || ''), lines };
}

function labelFor(type, label, verseCounter) {
  if (label) return label;
  if (type === 'verse') return String(verseCounter);
  return VERSE_TYPES[type] ? VERSE_TYPES[type].short : '*';
}

// ---------------------------------------------------------------- formáty ---

function parseOwnFormat(root) {
  const title = textOf(firstElement(root, 'nazov', 'názov', 'title', 'meno')).trim();
  const numberNode = firstElement(root, 'cislo', 'číslo', 'number');
  const numberText = numberNode ? textOf(numberNode).trim() : attr(root, 'cislo', 'číslo', 'number');
  const systemHint = attr(numberNode || root, 'typ', 'type', 'system', 'spevnik', 'spevník')
    || attr(root, 'typ', 'type', 'system', 'spevnik', 'spevník');
  const author = textOf(firstElement(root, 'autor', 'author', 'text')).trim();
  const melody = textOf(firstElement(root, 'melodia', 'melódia', 'melody', 'hudba')).trim();

  const container = firstElement(root, 'slohy', 'verses', 'text', 'lyrics') || root;
  const verses = [];
  let counter = 0;
  for (const node of elements(container)) {
    const name = node.localName;
    if (!['sloha', 'slocha', 'strofa', 'verse', 'refren', 'refrén', 'chorus', 'bridge', 'medzihra', 'zaver', 'záver', 'ending', 'cast', 'časť', 'part'].includes(name)) continue;
    let type = verseType(attr(node, 'typ', 'type') || name);
    if (['refren', 'refrén', 'chorus'].includes(name)) type = 'chorus';
    if (['bridge', 'medzihra'].includes(name)) type = 'bridge';
    if (['zaver', 'záver', 'ending'].includes(name)) type = 'ending';
    if (type === 'verse') counter += 1;

    const lineNodes = elements(node).filter((child) => ['riadok', 'line', 'l'].includes(child.localName));
    const block = lineNodes.length
      ? lineNodes.map((line) => textOf(line)).join('\n')
      : textOf(node);
    const label = labelFor(type, attr(node, 'cislo', 'číslo', 'label', 'n', 'number'), counter);
    verses.push(makeVerse(type, label, block));
  }
  return { title, numberText, systemHint, author, melody, verses };
}

function parseOpenSong(root) {
  const title = textOf(firstElement(root, 'title')).trim();
  const author = textOf(firstElement(root, 'author')).trim();
  const numberText = textOf(firstElement(root, 'hymn_number', 'number')).trim();
  const lyrics = textOf(firstElement(root, 'lyrics'));
  const verses = [];
  let current = null;
  let counter = 0;

  const flush = () => {
    if (current && current.block.join('\n').trim() !== '') {
      verses.push(makeVerse(current.type, current.label, current.block.join('\n')));
    }
    current = null;
  };

  for (const rawLine of String(lyrics).replace(/\r\n?/g, '\n').split('\n')) {
    const line = rawLine.replace(/\s+$/, '');
    const marker = /^\s*\[([^\]]+)\]\s*$/.exec(line);
    if (marker) {
      flush();
      const token = marker[1].trim();
      const parsed = /^([A-Za-z]*)\s*(\d*)/.exec(token);
      const type = verseType(parsed[1] || 'v');
      if (type === 'verse') counter += 1;
      current = { type, label: labelFor(type, parsed[2] || '', counter), block: [] };
      continue;
    }
    if (/^\s*[;.]/.test(line)) continue; // komentár alebo akordy
    if (!current) {
      counter += 1;
      current = { type: 'verse', label: String(counter), block: [] };
    }
    current.block.push(line.replace(/^\s?\d?\s?/, (prefix) => (/^\s\d\s$/.test(prefix) ? '' : prefix.trimStart())));
  }
  flush();
  return { title, numberText, systemHint: '', author, melody: '', verses };
}

function parseOpenLyrics(root) {
  const properties = firstElement(root, 'properties');
  const titleNode = properties ? deepFirst(properties, 'title') : firstElement(root, 'title');
  const title = textOf(titleNode).trim();
  const author = properties ? textOf(deepFirst(properties, 'author')).trim() : textOf(firstElement(root, 'author')).trim();
  const numberText = properties ? textOf(deepFirst(properties, 'songnumber', 'number')).trim() : '';
  const lyrics = firstElement(root, 'lyrics');
  const verses = [];
  let counter = 0;

  for (const verse of elements(lyrics, 'verse')) {
    const rawType = attr(verse, 'type') || attr(verse, 'name').replace(/\d+$/, '');
    const type = verseType(rawType || 'v');
    if (type === 'verse') counter += 1;
    const lineNodes = elements(verse, 'lines');
    const block = lineNodes.length
      ? lineNodes.map((lines) => textOf(lines)).join('\n')
      : textOf(verse);
    const label = labelFor(type, attr(verse, 'label') || (attr(verse, 'name').match(/\d+/) || [''])[0], counter);
    verses.push(makeVerse(type, label, block));
  }
  return { title, numberText, systemHint: '', author, melody: '', verses };
}

function detect(root) {
  if (firstElement(root, 'lyrics')) {
    const lyrics = firstElement(root, 'lyrics');
    if (elements(lyrics, 'verse').length) return parseOpenLyrics;
    if (firstElement(root, 'nazov', 'názov', 'slohy')) return parseOwnFormat;
    return parseOpenSong;
  }
  if (firstElement(root, 'slohy', 'verses')) return parseOwnFormat;
  return parseOwnFormat;
}

function buildSong(root, context) {
  const parser = detect(root);
  const data = parser(root);

  const fromXml = parseNumber(data.numberText, data.systemHint || context.folderSystem);
  const fromFile = numberFromFileName(context.fileName, context.folderSystem);
  const numberInfo = fromXml || fromFile;

  let title = data.title;
  if (!title) {
    title = String(context.fileName || '')
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/^\s*(JKS|LS)?[\s._-]*\d{1,4}[\s._-]*/i, '')
      .replace(/[_]+/g, ' ')
      .trim() || 'Bez názvu';
  }

  const verses = data.verses.filter((verse) => verse.lines.join('').trim() !== '');
  const number = numberInfo ? numberInfo.number + numberInfo.suffix : '';
  const system = numberInfo && numberInfo.system ? numberInfo.system : (context.folderSystem || '');

  return {
    id: context.id,
    folder: context.folder || 'Ostatné',
    fileName: context.fileName || '',
    title,
    author: data.author || '',
    melody: data.melody || '',
    number,
    system,
    numberKey: number ? `${system}${parseInt(number, 10)}` : '',
    searchKey: normalize(`${title} ${data.author || ''}`),
    verses: verses.map((verse, index) => ({ ...verse, index })),
    importedAt: context.importedAt || Date.now(),
  };
}

/**
 * Rozparsuje obsah XML súboru. Súbor môže obsahovať jednu alebo viac piesní.
 * @returns {Array} zoznam piesní
 */
export function parseSongFile(xmlText, context = {}) {
  const doc = parseXML(xmlText);
  const roots = elements(doc);
  const base = {
    folder: context.folder || 'Ostatné',
    fileName: context.fileName || '',
    folderSystem: (context.folderSystem || '').toUpperCase(),
    importedAt: context.importedAt || Date.now(),
  };

  const songNodes = [];
  for (const root of roots) {
    const name = root.localName;
    if (['piesne', 'songs', 'zbierka', 'spevnik', 'spevník'].includes(name)) {
      songNodes.push(...elements(root).filter((node) => ['piesen', 'pieseň', 'song'].includes(node.localName)));
    } else {
      songNodes.push(root);
    }
  }

  return songNodes
    .map((node, index) => buildSong(node, {
      ...base,
      id: `${base.folder}/${base.fileName}${songNodes.length > 1 ? `#${index + 1}` : ''}`,
    }))
    .filter((song) => song.verses.length > 0);
}

/** Zoradenie piesní: najprv podľa čísla (ak je), potom podľa názvu. */
export function compareSongs(a, b) {
  const an = a.number ? parseInt(a.number, 10) : Number.POSITIVE_INFINITY;
  const bn = b.number ? parseInt(b.number, 10) : Number.POSITIVE_INFINITY;
  if (an !== bn) return an - bn;
  return a.searchKey.localeCompare(b.searchKey, 'sk');
}

/** Vyhľadávanie podľa názvu alebo podľa čísla (napr. "342", "JKS 342", "ls45"). */
export function searchSongs(songs, query) {
  const raw = String(query || '').trim();
  if (!raw) return songs.slice().sort(compareSongs);

  const asNumber = parseNumber(raw);
  const needle = normalize(raw);
  const scored = [];

  for (const song of songs) {
    let score = 0;
    if (asNumber) {
      const sameSystem = !asNumber.system || asNumber.system === song.system;
      if (sameSystem && song.number && parseInt(song.number, 10) === parseInt(asNumber.number, 10)) score = 1000;
      else if (sameSystem && song.number && song.number.startsWith(asNumber.number)) score = 500;
    }
    if (!score && needle) {
      const index = song.searchKey.indexOf(needle);
      if (index === 0) score = 300;
      else if (index > 0) score = 200;
      else if (needle.split(/\s+/).every((word) => song.searchKey.includes(word))) score = 100;
    }
    if (score) scored.push({ song, score });
  }

  return scored
    .sort((a, b) => (b.score - a.score) || compareSongs(a.song, b.song))
    .map((entry) => entry.song);
}
