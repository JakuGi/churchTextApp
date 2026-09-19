import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseSongFile, searchSongs, parseNumber, numberFromFileName, normalize, songToXml } from '../js/songs.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('natívny formát: názov, JKS číslo, slohy aj refrén', () => {
  const [song] = parseSongFile(read('songs/JKS/342-Ó_Bože_náš.xml'), { folder: 'JKS', fileName: '342-Ó_Bože_náš.xml', folderSystem: 'JKS' });
  assert.equal(song.title, 'Ó, Bože náš, k Tebe voláme');
  assert.equal(song.number, '342');
  assert.equal(song.system, 'JKS');
  assert.equal(song.numberKey, 'JKS342');
  assert.equal(song.verses.length, 4);
  assert.equal(song.verses[0].type, 'verse');
  assert.equal(song.verses[0].label, '1');
  assert.equal(song.verses[1].type, 'chorus');
  assert.equal(song.verses[1].label, 'R');
  assert.equal(song.verses[2].label, '2');
  assert.equal(song.verses[0].lines.length, 4);
});

test('slohy bez atribútu čísla sa číslujú automaticky', () => {
  const [song] = parseSongFile(read('songs/JKS/501-Chvalme_Pana.xml'), { folder: 'JKS', fileName: '501-Chvalme_Pana.xml', folderSystem: 'JKS' });
  assert.deepEqual(song.verses.map((v) => v.label), ['1', '2', 'R']);
});

test('OpenSong formát', () => {
  const [song] = parseSongFile(read('songs/Ukazkove/adventna.xml'), { folder: 'Ukazkove', fileName: 'adventna.xml' });
  assert.equal(song.title, 'Adventná ukážková');
  assert.deepEqual(song.verses.map((v) => v.type), ['verse', 'chorus', 'verse']);
  assert.equal(song.verses[0].lines[0], 'Príď už, príď už, očakávaný,');
  assert.equal(song.verses[0].lines.length, 2);
});

test('OpenLyrics formát vrátane <br/>', () => {
  const [song] = parseSongFile(read('songs/Ukazkove/velkonocna.xml'), { folder: 'Ukazkove', fileName: 'velkonocna.xml' });
  assert.equal(song.title, 'Veľkonočná ukážková');
  assert.equal(song.verses.length, 3);
  assert.deepEqual(song.verses[0].lines, ['Radujme sa, prišiel deň,', 'kameň z hrobu odvalený.']);
  assert.equal(song.verses[1].label, 'R');
});

test('jeden súbor s viacerými piesňami', () => {
  const songs = parseSongFile(read('songs/Ukazkove/viacero-piesni.xml'), { folder: 'Ukazkove', fileName: 'viacero-piesni.xml' });
  assert.equal(songs.length, 2);
  assert.equal(songs[0].numberKey, 'LS12');
  assert.equal(songs[1].numberKey, 'LS44');
  assert.notEqual(songs[0].id, songs[1].id);
});

test('číslo z názvu súboru, keď v XML chýba', () => {
  const songs = parseSongFile('<piesen><nazov>Test</nazov><slohy><sloha>riadok</sloha></slohy></piesen>', {
    folder: 'JKS', fileName: 'JKS_123 - Test.xml', folderSystem: 'JKS',
  });
  assert.equal(songs[0].numberKey, 'JKS123');
});

test('parseNumber a numberFromFileName', () => {
  assert.deepEqual(parseNumber('JKS 342'), { system: 'JKS', number: '342', suffix: '' });
  assert.deepEqual(parseNumber('ls45'), { system: 'LS', number: '45', suffix: '' });
  assert.deepEqual(parseNumber('007'), { system: '', number: '7', suffix: '' });
  assert.equal(parseNumber('ahoj'), null);
  assert.deepEqual(numberFromFileName('078-Vitaj.xml', 'JKS'), { system: 'JKS', number: '78', suffix: '' });
});

test('vyhľadávanie podľa čísla aj názvu bez diakritiky', () => {
  const songs = [
    ...parseSongFile(read('songs/JKS/342-Ó_Bože_náš.xml'), { folder: 'JKS', fileName: '342.xml', folderSystem: 'JKS' }),
    ...parseSongFile(read('songs/JKS/078-Vitaj_svetlo.xml'), { folder: 'JKS', fileName: '078.xml', folderSystem: 'JKS' }),
    ...parseSongFile(read('songs/Ukazkove/viacero-piesni.xml'), { folder: 'Ukazkove', fileName: 'viac.xml' }),
  ];
  assert.equal(searchSongs(songs, '342')[0].number, '342');
  assert.equal(searchSongs(songs, 'JKS 78')[0].title, 'Vitaj, svetlo nebeské');
  assert.equal(searchSongs(songs, 'ls 12')[0].title, 'Ranná ukážková');
  assert.equal(searchSongs(songs, 'bozе'.replace('е', 'e'))[0].title, 'Ó, Bože náš, k Tebe voláme');
  assert.equal(searchSongs(songs, 'vitaj svetlo')[0].title, 'Vitaj, svetlo nebeské');
  assert.equal(searchSongs(songs, 'neexistuje').length, 0);
  assert.equal(searchSongs(songs, '').length, songs.length);
});

test('normalize odstráni diakritiku', () => {
  assert.equal(normalize('Ó, Bože NÁŠ'), 'o, boze nas');
});

test('prázdne slohy sa zahodia, poškodené XML nespadne', () => {
  const songs = parseSongFile('<piesen><nazov>X</nazov><slohy><sloha>  </sloha><sloha>text</sloha></slohy>', { fileName: 'x.xml' });
  assert.equal(songs[0].verses.length, 1);
  assert.deepEqual(parseSongFile('nezmysel', { fileName: 'a.xml' }), []);
});

test('záloha si pamätá zbierku aj názov súboru', () => {
  const [song] = parseSongFile(read('songs/JKS/342-Ó_Bože_náš.xml'), {
    folder: 'JKS', fileName: '342-Ó_Bože_náš.xml', folderSystem: 'JKS',
  });
  const xml = songToXml(song);
  assert.match(xml, /<zbierka>JKS<\/zbierka>/);
  assert.match(xml, /<subor>342-Ó_Bože_náš\.xml<\/subor>/);

  // obnova zo zálohy: súbor sa volá inak, zbierka sa aj tak zachová
  const [restored] = parseSongFile(xml, { folder: 'Ostatné', fileName: 'organista-zaloha-auto.xml' });
  assert.equal(restored.folder, 'JKS');
  assert.equal(restored.fileName, '342-Ó_Bože_náš.xml');
  assert.equal(restored.id, song.id, 'identifikátor zostáva, takže uložené sety fungujú');
  assert.equal(restored.title, song.title);
  assert.equal(restored.number, song.number);
  assert.equal(restored.verses.length, song.verses.length);
});

test('záloha viacerých zbierok sa obnoví do pôvodných zbierok', () => {
  const songs = [
    ...parseSongFile(read('songs/JKS/078-Vitaj_svetlo.xml'), { folder: 'JKS', fileName: '078.xml', folderSystem: 'JKS' }),
    ...parseSongFile(read('songs/Ukazkove/viacero-piesni.xml'), { folder: 'Ukazkove', fileName: 'viac.xml' }),
  ];
  const body = songs.map((song) => songToXml(song).replace(/<\?xml[^>]*\?>\s*/, '').trim()).join('\n');
  const backup = `<?xml version="1.0" encoding="UTF-8"?>\n<piesne>\n${body}\n</piesne>\n`;

  const restored = parseSongFile(backup, { folder: 'Ostatné', fileName: 'organista-zaloha-auto.xml' });
  assert.equal(restored.length, songs.length);
  assert.deepEqual(restored.map((s) => s.folder), songs.map((s) => s.folder));
  assert.deepEqual(restored.map((s) => s.id), songs.map((s) => s.id));
  assert.equal(new Set(restored.map((s) => s.id)).size, restored.length, 'identifikátory sú jedinečné');
});
