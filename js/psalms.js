// Responzóriový žalm z liturgického kalendára KBS (lc.kbs.sk).
//
// Stránka má okrem adresy s mriežkou (lc.kbs.sk/#20260917, ktorú spracúva
// prehliadač) aj serverovú podobu lc.kbs.sk/?den=20260917. Tú vieme stiahnuť
// priamo, takže netreba prehliadač ani spúšťať JavaScript stránky.

import { decodeEntities } from './xmlparse.js';
import { normalize, composeSong } from './songs.js';

export const LC_BASE = 'https://lc.kbs.sk/';

/** @param {Date|string} date Date alebo 'YYYY-MM-DD' */
export function dateKey(date) {
  const value = date instanceof Date ? date : new Date(`${date}T12:00:00`);
  if (Number.isNaN(value.getTime())) return '';
  const pad = (number) => String(number).padStart(2, '0');
  return `${value.getFullYear()}${pad(value.getMonth() + 1)}${pad(value.getDate())}`;
}

export function todayKey() {
  return dateKey(new Date());
}

export function lcUrl(key) {
  const clean = String(key || '').replace(/\D/g, '');
  return clean.length === 8 ? `${LC_BASE}?den=${clean}` : LC_BASE;
}

/** Dátum v tvare, ktorý sa hodí do názvu piesne: „17. 9. 2026“. */
export function humanDate(key) {
  const clean = String(key || '').replace(/\D/g, '');
  if (clean.length !== 8) return '';
  return `${Number(clean.slice(6, 8))}. ${Number(clean.slice(4, 6))}. ${clean.slice(0, 4)}`;
}

// --------------------------------------------------------------- HTML → text

export function htmlToText(html) {
  const text = String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '\n')
    .replace(/<style[\s\S]*?<\/style>/gi, '\n')
    .replace(/<!--[\s\S]*?-->/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr|section|article|td|th|blockquote)>/gi, '\n')
    .replace(/<[^>]*>/g, ' ');

  return decodeEntities(text)
    .replace(/ /g, ' ')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter((line, index, all) => line !== '' || (index > 0 && all[index - 1] !== ''));
}

/** Nadpisy zo stránky – pomáhajú nájsť názov sviatku. */
export function htmlHeadings(html) {
  const out = [];
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(String(html || ''));
  if (title) out.push({ tag: 'title', text: decodeEntities(title[1].replace(/<[^>]*>/g, ' ')).trim() });
  const re = /<h([1-4])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match;
  while ((match = re.exec(String(html || ''))) !== null) {
    const text = decodeEntities(match[2].replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
    if (text) out.push({ tag: `h${match[1]}`, text });
  }
  return out;
}

// ----------------------------------------------------------------- parsovanie

const PSALM_HEADING = /responzoriovy zalm|responzoriovy\s*zalm|zalm responzoriovy/;
const SECTION_HEADING = [
  /^prve citanie/, /^druhe citanie/, /^tretie citanie/, /^evanjelium/,
  /^alelujovy vers/, /^vers pred evanjeliom/, /^spev pred evanjeliom/, /^aleluja/,
  /^modlitba/, /^na prijimanie/, /^na obetovanie/, /^vstupny spev/, /^kolekta/,
  /^liturgicke citania/, /^homilia/, /^prosby/,
];
// Riadok s refrénom: „R.: text“, „R. text“, „R: text“ aj s odkazom v zátvorke.
const REFRAIN_MARKER = /^R\s*\.?\s*(?:\([^)]*\))?\s*:?\s*(?=\S)/;
// Refrén je na stránke označený „R.:“ – s dvojbodkou. Samotné „R.“ medzi
// slohami žalmu je len značka opakovania, tá sa neberie.
const REFRAIN_COLON = /^R\s*\.?\s*:\s*(\S.*)$/;
// Biblické súradnice: „1 Tim 4, 12-16“, „Ž 111, 7-8. 9. 10“, „Lk 7, 36-50“.
const BIBLE_REFERENCE = /^\d?\s*[A-ZÁÄČĎÉÍĽĹŇÓÔŔŠŤÚÝŽ][\wáäčďéíĺľňóôŕšťúýž]*\.?\s+\d+\s*,\s*\d/;
// „R.: Veľké sú diela Pánove. alebo Aleluja.“ – druhá možnosť sa nepremieta.
const OR_ALLELUIA = /\s*alebo\s*:?\s*aleluj[aá]\b.*$/i;
const NAME_DAY = /^meniny\s+ma/;
const REFERENCE = /^(Ž|Ž\.|Žalm|Ž ?\d)/;

const isSectionHeading = (line) => {
  const key = normalize(line);
  return SECTION_HEADING.some((re) => re.test(key));
};

/**
 * Vytiahne zo stránky liturgického kalendára responzóriové žalmy.
 * Stránka môže obsahovať viac formulárov (napr. pri viacerých sviatkoch),
 * preto sa vracia zoznam.
 *
 * @returns {{date:string, dateLabel:string, feast:string, psalms:Array, lines:Array}}
 */
export function parsePsalmPage(html, options = {}) {
  const lines = Array.isArray(html) ? html : htmlToText(html);
  const headings = Array.isArray(html) ? [] : htmlHeadings(html);

  const psalms = [];
  const seen = new Set();

  // Refrén je vždy riadok označený „R.:“. Býva hneď v úvode pri súradniciach
  // čítaní, kde sa dajú čítania prepínať; ďalej v texte žalmu sa opakuje.
  // Berie sa každý odlišný refrén – pri viacerých formulároch ich je viac.
  for (let index = 0; index < lines.length; index += 1) {
    const match = REFRAIN_COLON.exec(lines[index]);
    if (!match) continue;

    const refrain = cleanRefrain(match[1]);
    if (!refrain) continue;
    const key = normalize(refrain);
    if (seen.has(key)) continue;
    seen.add(key);

    psalms.push({
      refrain: `R.: ${refrain}`,
      reference: findReference(lines, index),
      lines: [`R.: ${refrain}`],
    });
  }

  const date = options.date || '';
  return {
    date,
    dateLabel: humanDate(date),
    feast: findFeast(headings, lines),
    psalms,
    lines,
  };
}

/** Odreže „alebo Aleluja“ a zvyšné zbytočnosti za refrénom. */
export function cleanRefrain(text) {
  return String(text || '')
    .replace(OR_ALLELUIA, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Odkaz na žalm – najbližší riadok so „Ž“ nad refrénom. */
function findReference(lines, index) {
  for (let back = index - 1; back >= 0 && back >= index - 6; back -= 1) {
    const line = (lines[back] || '').trim();
    if (!line) continue;
    if (/^Ž\s*\.?\s*\d/.test(line)) return line;
    if (REFRAIN_COLON.test(line)) break;
  }
  for (let ahead = index + 1; ahead < lines.length && ahead <= index + 3; ahead += 1) {
    const line = (lines[ahead] || '').trim();
    if (/^Ž\s*\.?\s*\d/.test(line)) return line;
  }
  return '';
}

const NOT_FEAST = /^liturgicky kalendar|^kalendar|^dnes|^menu|^kbs|^liturgia|^domov|^copyright|^tyzden|^mesiac/;
// „1. máj 2026“, „17. sep 2026“, „1. 5. 2026“ – to je dátum, nie názov sviatku.
const LOOKS_LIKE_DATE = /^\d{1,2}\.\s*([a-z]+\.?|\d{1,2}\.)\s*\d{4}$/;
const WEEKDAY = /^(pondelok|utorok|streda|stvrtok|piatok|sobota|nedela)/;

/**
 * Názov dňa a sviatku.
 *
 * Na stránke je poradie: dátum slovom, „Meniny má …“, potom deň a sviatok
 * („štvrtok 24. týždňa v Cezročnom období“, prípadne ďalší riadok so
 * spomienkou) a hneď za tým už začínajú súradnice čítaní. Berie sa práve
 * ten blok medzi meninami a prvými súradnicami – bez menín a bez dátumu,
 * ktorý je v názve už číselne.
 */
export function findFeast(headings, lines) {
  const startIndex = feastStart(lines);
  if (startIndex >= 0) {
    const block = [];
    for (let index = startIndex; index < lines.length && block.length < 4; index += 1) {
      const line = (lines[index] || '').trim();
      if (!line) continue;
      const key = normalize(line);
      if (BIBLE_REFERENCE.test(line) || REFRAIN_COLON.test(line)) break;
      if (NAME_DAY.test(key) || NOT_FEAST.test(key) || LOOKS_LIKE_DATE.test(key)) continue;
      if (line.length > 120) break;
      block.push(line);
    }
    if (block.length) return block.join(', ').slice(0, 160);
  }

  // Náhradné riešenie: nadpis stránky, ktorý nie je dátumom ani navigáciou.
  for (const heading of headings) {
    const text = heading.text.replace(/^Liturgický kalendár\s*[-–]\s*/i, '').trim();
    const key = normalize(text);
    if (!text || NOT_FEAST.test(key) || NAME_DAY.test(key)) continue;
    if (LOOKS_LIKE_DATE.test(key) || text.length > 120) continue;
    return text;
  }
  return '';
}

/** Kde začína blok so sviatkom: hneď za meninami, inak pri názve dňa. */
function feastStart(lines) {
  for (let index = 0; index < lines.length && index < 60; index += 1) {
    if (NAME_DAY.test(normalize(lines[index] || ''))) return index + 1;
  }
  for (let index = 0; index < lines.length && index < 60; index += 1) {
    const line = (lines[index] || '').trim();
    if (!line || BIBLE_REFERENCE.test(line)) continue;
    if (WEEKDAY.test(normalize(line))) return index;
  }
  return -1;
}

/**
 * Z nájdených žalmov spraví jednu pieseň; každý žalm je samostatná sloha.
 */
export function psalmSong(parsed, options = {}) {
  const dateLabel = parsed.dateLabel || humanDate(parsed.date);
  const title = [dateLabel, parsed.feast].filter(Boolean).join(' – ') || 'Responzóriový žalm';
  const references = parsed.psalms.map((psalm) => psalm.reference).filter(Boolean);

  return composeSong({
    title: options.title || title,
    folder: options.folder || 'Žalmy',
    author: 'lc.kbs.sk',
    melody: references.join(' · '),
    verses: parsed.psalms.map((psalm) => ({ type: 'verse', text: psalm.lines.join('\n') })),
  }, {
    id: options.id || `Žalmy/zalm-${parsed.date || dateKey(new Date())}.xml`,
    fileName: `zalm-${parsed.date || dateKey(new Date())}.xml`,
  });
}
