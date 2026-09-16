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

  for (let index = 0; index < lines.length; index += 1) {
    const key = normalize(lines[index]);
    if (!PSALM_HEADING.test(key)) continue;

    // Odkaz na žalm býva na tom istom riadku: „Responzóriový žalm Ž 111, 7-8“.
    const inlineReference = /(Ž\s*\d.*)$/.exec(lines[index]);
    let reference = inlineReference ? inlineReference[1].trim() : '';

    // Refrén je na stránke NAD nadpisom, uvedený značkou „R.:“:
    //     R.: Veľké sú diela Pánove.
    //     Responzóriový žalm   Ž 111, 7-8. 9. 10
    //     <text žalmu>
    let refrain = '';
    for (let back = index - 1; back >= 0 && back >= index - 8; back -= 1) {
      const line = lines[back];
      if (!line.trim()) continue;
      const lineKey = normalize(line);
      if (PSALM_HEADING.test(lineKey) || isSectionHeading(line)) break;
      if (REFRAIN_MARKER.test(line)) {
        refrain = line.trim();
        break;
      }
    }

    // Náhradné hľadanie pod nadpisom, keby stránka vyzerala inak.
    const body = [];
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const line = lines[cursor];
      const lineKey = normalize(line);
      if (PSALM_HEADING.test(lineKey) || isSectionHeading(line)) break;
      if (!reference && REFERENCE.test(line) && /\d/.test(line)) {
        reference = line.trim();
        continue;
      }
      body.push(line);
    }

    if (!refrain) {
      for (let position = 0; position < body.length; position += 1) {
        if (!REFRAIN_MARKER.test(body[position])) continue;
        const rest = body[position].replace(REFRAIN_MARKER, '').trim();
        if (rest) {
          refrain = body[position].trim();
        } else {
          const next = body.slice(position + 1).find((line) => line.trim() !== '');
          refrain = next ? `R.: ${next.trim()}` : '';
        }
        break;
      }
    }
    if (!refrain) continue;

    refrain = refrain.replace(/\s+/g, ' ').trim();
    if (!psalms.some((item) => normalize(item.refrain) === normalize(refrain))) {
      psalms.push({ refrain, reference, lines: [refrain] });
    }
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

const NOT_FEAST = /^liturgicky kalendar|^kalendar|^dnes|^menu|^kbs|^liturgia|^domov|^copyright/;
// „1. máj 2026“, „17. sep 2026“, „1. 5. 2026“ – to je dátum, nie názov sviatku.
const LOOKS_LIKE_DATE = /^\d{1,2}\.\s*([a-z]+\.?|\d{1,2}\.)\s*\d{4}$/;

/** Názov sviatku – z nadpisu stránky, inak z prvých riadkov obsahu. */
export function findFeast(headings, lines) {
  for (const heading of headings) {
    const text = heading.text.replace(/^Liturgický kalendár\s*[-–]\s*/i, '').trim();
    const key = normalize(text);
    if (!text || NOT_FEAST.test(key)) continue;
    if (LOOKS_LIKE_DATE.test(normalize(text))) continue;
    if (text.length > 90) continue;
    return text;
  }
  for (const line of lines.slice(0, 25)) {
    const key = normalize(line);
    if (!line || NOT_FEAST.test(key) || line.length > 90) continue;
    if (/^\d/.test(line) || LOOKS_LIKE_DATE.test(key)) continue;
    return line.trim();
  }
  return '';
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
