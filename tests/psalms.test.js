import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  dateKey, lcUrl, humanDate, htmlToText, parsePsalmPage, psalmSong, findFeast,
} from '../js/psalms.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

test('adresa a dátum', () => {
  assert.equal(dateKey('2026-09-17'), '20260917');
  assert.equal(dateKey(new Date(2026, 0, 5, 12)), '20260105');
  assert.equal(lcUrl('20260917'), 'https://lc.kbs.sk/?den=20260917');
  assert.equal(lcUrl(''), 'https://lc.kbs.sk/');
  assert.equal(humanDate('20260917'), '17. 9. 2026');
});

test('HTML sa prevedie na riadky textu', () => {
  const lines = htmlToText('<p>Prvý</p><p>Druhý &amp; tretí<br>štvrtý</p><script>zle()</script>');
  assert.deepEqual(lines.filter(Boolean), ['Prvý', 'Druhý & tretí', 'štvrtý']);
});

test('nájde responzóriový žalm a jeho refrén', () => {
  const parsed = parsePsalmPage(fixture('lc-den.html'), { date: '20260917' });
  assert.equal(parsed.psalms.length, 1);
  assert.equal(parsed.psalms[0].refrain, 'Veľké sú diela Pánove.');
  assert.equal(parsed.psalms[0].reference, 'Ž 111, 7-8. 9. 10');
  assert.equal(parsed.dateLabel, '17. 9. 2026');
  assert.equal(parsed.feast, 'Sv. Kornélia, pápeža, a Cypriána, biskupa, mučeníkov');
});

test('refrén na samostatnom riadku pod značkou R.', () => {
  const parsed = parsePsalmPage(fixture('lc-viac-zalmov.html'), { date: '20261208' });
  assert.equal(parsed.psalms.length, 2);
  assert.equal(parsed.psalms[0].refrain, 'Spievajte Pánovi pieseň novú, lebo vykonal veci zázračné.');
  assert.equal(parsed.psalms[1].refrain, 'Naveky chcem ospevovať Pánovo milosrdenstvo.');
});

test('z viacerých žalmov je jedna pieseň s viacerými slohami', () => {
  const parsed = parsePsalmPage(fixture('lc-viac-zalmov.html'), { date: '20261208' });
  const song = psalmSong(parsed);
  assert.equal(song.folder, 'Žalmy');
  assert.equal(song.title, '8. 12. 2026 – Nepoškvrnené počatie Panny Márie');
  assert.equal(song.verses.length, 2);
  assert.deepEqual(song.verses.map((verse) => verse.label), ['1', '2']);
  assert.equal(song.verses[0].lines[0], 'Spievajte Pánovi pieseň novú, lebo vykonal veci zázračné.');
  assert.equal(song.melody, 'Ž 98, 1. 2-3ab. 3c-4 · Ž 89, 2-3. 4-5');
  assert.equal(song.id, 'Žalmy/zalm-20261208.xml');
});

test('vlastný názov piesne pri ukladaní', () => {
  const parsed = parsePsalmPage(fixture('lc-den.html'), { date: '20260917' });
  assert.equal(psalmSong(parsed, { title: 'Nedeľný žalm' }).title, 'Nedeľný žalm');
});

test('stránka bez žalmu nespadne', () => {
  const parsed = parsePsalmPage('<html><body><h1>Liturgický kalendár</h1><p>Nič</p></body></html>', { date: '20260101' });
  assert.deepEqual(parsed.psalms, []);
  assert.equal(parsed.dateLabel, '1. 1. 2026');
});

test('findFeast preskočí navigáciu a dátumy', () => {
  assert.equal(findFeast([{ text: 'Liturgický kalendár - 1. máj 2026' }, { text: 'Sv. Jozefa, robotníka' }], []),
    'Sv. Jozefa, robotníka');
});
