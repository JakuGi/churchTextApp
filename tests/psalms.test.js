import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  dateKey, lcUrl, humanDate, htmlToText, parsePsalmPage, psalmSong, findFeast, cleanRefrain,
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

test('refrén sa berie z úvodných súradníc podľa značky R.:', () => {
  const parsed = parsePsalmPage(fixture('lc-den.html'), { date: '20260917' });
  assert.equal(parsed.psalms.length, 1);
  assert.equal(parsed.psalms[0].refrain, 'R.: Veľké sú diela Pánove.');
  assert.equal(parsed.psalms[0].reference, 'Ž 111, 7-8. 9. 10');
});

test('„alebo Aleluja“ sa do refrénu nedáva', () => {
  const parsed = parsePsalmPage(fixture('lc-den.html'), { date: '20260917' });
  assert.ok(!/aleluj/i.test(parsed.psalms[0].refrain), parsed.psalms[0].refrain);
  assert.equal(cleanRefrain('Veľké sú diela Pánove. alebo Aleluja.'), 'Veľké sú diela Pánove.');
  assert.equal(cleanRefrain('Naveky chcem ospevovať. alebo: Aleluja'), 'Naveky chcem ospevovať.');
  assert.equal(cleanRefrain('Aleluja, aleluja, aleluja.'), 'Aleluja, aleluja, aleluja.');
});

test('opakovanie refrénu v texte žalmu nevytvorí druhú slohu', () => {
  const parsed = parsePsalmPage(fixture('lc-den.html'), { date: '20260917' });
  assert.equal(parsed.psalms.length, 1, 'refrén sa v texte žalmu opakuje');
});

test('názov dňa a sviatku bez menín a bez zdvojeného dátumu', () => {
  const parsed = parsePsalmPage(fixture('lc-den.html'), { date: '20260917' });
  assert.equal(parsed.feast,
    'štvrtok 24. týždňa v Cezročnom období, Sv. Kornélia, pápeža, a Cypriána, biskupa, mučeníkov (spomienka)');
  assert.ok(!/Meniny/i.test(parsed.feast));
  assert.ok(!/september/i.test(parsed.feast), 'dátum slovom sa do názvu nedáva');
});

test('meniny na tom istom riadku ako deň sa do názvu nedostanú', () => {
  const parsed = parsePsalmPage(fixture('lc-meniny-v-riadku.html'), { date: '20260917' });
  assert.equal(parsed.feast,
    'štvrtok 24. týždňa v Cezročnom období, Sv. Kornélia, pápeža, a Cypriána, biskupa, mučeníkov (spomienka)');
  assert.ok(!/meniny/i.test(parsed.feast), parsed.feast);
  assert.ok(!/september/i.test(parsed.feast), parsed.feast);
  assert.equal(psalmSong(parsed).title,
    '17. 9. 2026 – štvrtok 24. týždňa v Cezročnom období, Sv. Kornélia, pápeža, a Cypriána, biskupa, mučeníkov (spomienka)');
});

test('názov nepoužije nadpis s meninami ani keď blok so sviatkom chýba', () => {
  const html = '<html><head><title>Liturgický kalendár - 1. jan 2027</title></head><body>'
    + '<h2>1. január 2027 - piatok, meniny: Nový rok</h2><p>Ž 8, 2</p></body></html>';
  const parsed = parsePsalmPage(html, { date: '20270101' });
  assert.ok(!/meniny/i.test(parsed.feast), parsed.feast);
});

test('viac formulárov v jeden deň dá viac žalmov', () => {
  const parsed = parsePsalmPage(fixture('lc-viac-zalmov.html'), { date: '20261208' });
  assert.equal(parsed.psalms.length, 2);
  assert.equal(parsed.psalms[0].refrain, 'R.: Spievajte Pánovi pieseň novú, lebo vykonal veci zázračné.');
  assert.equal(parsed.psalms[1].refrain, 'R.: Naveky chcem ospevovať Pánovo milosrdenstvo.');
  assert.equal(parsed.psalms[0].reference, 'Ž 98, 1. 2-3ab. 3c-4');
  assert.equal(parsed.psalms[1].reference, 'Ž 89, 2-3. 4-5');
  assert.equal(parsed.feast, 'Nepoškvrnené počatie Preblahoslavenej Panny Márie (slávnosť)');
});

test('z viacerých žalmov je jedna pieseň s viacerými slohami', () => {
  const parsed = parsePsalmPage(fixture('lc-viac-zalmov.html'), { date: '20261208' });
  const song = psalmSong(parsed);
  assert.equal(song.folder, 'Žalmy');
  assert.equal(song.title, '8. 12. 2026 – Nepoškvrnené počatie Preblahoslavenej Panny Márie (slávnosť)');
  assert.equal(song.verses.length, 2);
  assert.deepEqual(song.verses.map((verse) => verse.label), ['1', '2']);
  assert.equal(song.verses[0].lines[0], 'R.: Spievajte Pánovi pieseň novú, lebo vykonal veci zázračné.');
  assert.equal(song.verses[1].lines[0], 'R.: Naveky chcem ospevovať Pánovo milosrdenstvo.');
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

test('sviatok sa nájde aj bez riadka s meninami', () => {
  const lines = ['Liturgický kalendár', '1. máj 2026', 'piatok 3. veľkonočného týždňa', 'Sk 9, 1-20'];
  assert.equal(findFeast([], lines), 'piatok 3. veľkonočného týždňa');
});
