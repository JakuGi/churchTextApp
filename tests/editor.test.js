import test from 'node:test';
import assert from 'node:assert/strict';
import { composeSong, splitPastedText, songToXml, slugify, parseSongFile } from '../js/songs.js';

test('composeSong poskladá pieseň z údajov editora', () => {
  const song = composeSong({
    title: 'Ó, Bože náš',
    folder: 'JKS',
    system: 'JKS',
    number: '342',
    author: 'ľudová',
    verses: [
      { type: 'verse', text: 'prvý riadok\ndruhý riadok' },
      { type: 'chorus', text: 'refrén' },
      { type: 'verse', text: 'tretí riadok' },
    ],
  });
  assert.equal(song.title, 'Ó, Bože náš');
  assert.equal(song.numberKey, 'JKS342');
  assert.equal(song.fileName, '342-o-boze-nas.xml');
  assert.equal(song.id, 'JKS/342-o-boze-nas.xml');
  assert.deepEqual(song.verses.map((v) => v.label), ['1', 'R', '2']);
  assert.deepEqual(song.verses[0].lines, ['prvý riadok', 'druhý riadok']);
  assert.deepEqual(song.verses.map((v) => v.index), [0, 1, 2]);
  assert.equal(song.searchKey, 'o, boze nas ludova');
});

test('composeSong zahodí prázdne slohy a doplní chýbajúce údaje', () => {
  const song = composeSong({ title: '', verses: [{ type: 'verse', text: '   ' }, { type: 'verse', text: 'text' }] });
  assert.equal(song.title, 'Bez názvu');
  assert.equal(song.folder, 'Vlastné');
  assert.equal(song.verses.length, 1);
  assert.equal(song.number, '');
  assert.equal(song.numberKey, '');
  assert.equal(song.system, '');
});

test('composeSong si zachová pôvodné id pri úprave existujúcej piesne', () => {
  const song = composeSong(
    { title: 'Nový názov', folder: 'JKS', verses: [{ type: 'verse', text: 'text' }] },
    { id: 'JKS/povodny-subor.xml', fileName: 'povodny-subor.xml' },
  );
  assert.equal(song.id, 'JKS/povodny-subor.xml');
  assert.equal(song.fileName, 'povodny-subor.xml');
});

test('composeSong očísluje viac refrénov', () => {
  const song = composeSong({ title: 'X', verses: [
    { type: 'chorus', text: 'a' }, { type: 'verse', text: 'b' }, { type: 'chorus', text: 'c' },
  ] });
  assert.deepEqual(song.verses.map((v) => v.label), ['R', '1', 'R2']);
});

test('splitPastedText rozdelí text podľa prázdnych riadkov', () => {
  const verses = splitPastedText(`1. Prvý riadok slohy,
druhý riadok slohy.

R: Refrén piesne,
druhý riadok refrénu.

2. Druhá sloha,
jej druhý riadok.`);
  assert.equal(verses.length, 3);
  assert.deepEqual(verses.map((v) => v.type), ['verse', 'chorus', 'verse']);
  assert.deepEqual(verses[0].lines, ['Prvý riadok slohy,', 'druhý riadok slohy.']);
  assert.equal(verses[0].label, '1');
  assert.deepEqual(verses[1].lines, ['Refrén piesne,', 'druhý riadok refrénu.']);
  assert.equal(verses[2].label, '2');
});

test('splitPastedText zvládne text bez značiek aj viac prázdnych riadkov', () => {
  const verses = splitPastedText('Sloha jedna\n\n\n\nSloha dva');
  assert.equal(verses.length, 2);
  assert.deepEqual(verses.map((v) => v.type), ['verse', 'verse']);
  assert.deepEqual(verses.map((v) => v.label), ['', '']);
  assert.deepEqual(splitPastedText('   \n  '), []);
  assert.equal(splitPastedText('jediná sloha').length, 1);
});

test('splitPastedText rozpozná refrén aj v tvare „Refrén:“ na samostatnom riadku', () => {
  const verses = splitPastedText('Refrén:\nAleluja, aleluja.');
  assert.equal(verses[0].type, 'chorus');
  assert.deepEqual(verses[0].lines, ['Aleluja, aleluja.']);
});

test('songToXml a späť: pieseň prejde celým kolobehom bez straty', () => {
  const original = composeSong({
    title: 'Pieseň s & znakmi < >',
    folder: 'Vlastné',
    system: 'LS',
    number: '12',
    author: 'autor',
    melody: 'melódia',
    verses: [
      { type: 'verse', text: 'riadok jedna\nriadok dva' },
      { type: 'chorus', text: 'refrén' },
    ],
  });
  const xml = songToXml(original);
  const [parsed] = parseSongFile(xml, { folder: 'Vlastné', fileName: original.fileName });

  assert.equal(parsed.title, original.title);
  assert.equal(parsed.number, original.number);
  assert.equal(parsed.system, original.system);
  assert.equal(parsed.author, original.author);
  assert.deepEqual(parsed.verses.map((v) => v.type), original.verses.map((v) => v.type));
  assert.deepEqual(parsed.verses.map((v) => v.lines), original.verses.map((v) => v.lines));
  assert.deepEqual(parsed.verses.map((v) => v.label), original.verses.map((v) => v.label));
});

test('slugify', () => {
  assert.equal(slugify('Ó, Bože náš!'), 'o-boze-nas');
  assert.equal(slugify('   '), 'piesen');
  assert.equal(slugify('Ďakujeme Ti, Pane'), 'dakujeme-ti-pane');
});
