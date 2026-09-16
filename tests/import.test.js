import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Node nemá IndexedDB ani localStorage – doplníme minimálnu náhradu, čím sa
// zároveň otestuje záložné úložisko použité pri spustení zo súboru na disku.
const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => (memory.has(key) ? memory.get(key) : null),
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key),
};

const { importFiles, systemForFolder } = await import('../js/import.js');
const { store, storageKind } = await import('../js/store.js');

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

/** Napodobenina objektu File z výberu priečinka v prehliadači. */
function fakeFile(relativePath, contents) {
  const name = relativePath.split('/').pop();
  return { name, webkitRelativePath: relativePath, text: async () => contents };
}

test('bez IndexedDB sa použije záložné úložisko', async () => {
  assert.equal(await storageKind(), 'localstorage');
});

test('import priečinka: zbierky podľa podpriečinkov, čísla JKS/LS', async () => {
  const files = [
    fakeFile('piesne/JKS/342-O_Boze_nas.xml', read('songs/JKS/342-O_Boze_nas.xml')),
    fakeFile('piesne/JKS/078-Vitaj_svetlo.xml', read('songs/JKS/078-Vitaj_svetlo.xml')),
    fakeFile('piesne/Ukazkove/adventna.xml', read('songs/Ukazkove/adventna.xml')),
    fakeFile('piesne/Ukazkove/viacero-piesni.xml', read('songs/Ukazkove/viacero-piesni.xml')),
    fakeFile('piesne/JKS/poznamky.txt', 'toto nie je XML'),
  ];

  const result = await importFiles(files);
  assert.equal(result.files, 4, 'súbory iné ako .xml sa preskočia');
  assert.equal(result.songs, 5, 'súbor s dvoma piesňami sa rozdelí');
  assert.deepEqual(result.folders.sort(), ['JKS', 'Ukazkove']);
  assert.deepEqual(result.errors, []);

  const songs = await store.allSongs();
  assert.equal(songs.length, 5);
  const jks342 = songs.find((song) => song.numberKey === 'JKS342');
  assert.equal(jks342.folder, 'JKS');
  assert.equal(jks342.title, 'Ó, Bože náš, k Tebe voláme');
  assert.equal(songs.find((song) => song.title === 'Ranná ukážková').numberKey, 'LS12');

  const folders = await store.folders();
  assert.equal(folders.find((folder) => folder.name === 'JKS').system, 'JKS');
  assert.equal(folders.find((folder) => folder.name === 'JKS').count, 2);
});

test('opakovaný import ten istý súbor neduplikuje', async () => {
  await importFiles([fakeFile('piesne/JKS/342-O_Boze_nas.xml', read('songs/JKS/342-O_Boze_nas.xml'))]);
  const songs = await store.allSongs();
  assert.equal(songs.filter((song) => song.numberKey === 'JKS342').length, 1);
});

test('poškodený súbor nezhodí import ostatných', async () => {
  const result = await importFiles([
    fakeFile('piesne/Vlastne/zle.xml', '<toto nie je pieseň'),
    fakeFile('piesne/Vlastne/dobre.xml', '<piesen><nazov>Dobrá</nazov><slohy><sloha>text</sloha></slohy></piesen>'),
  ]);
  assert.equal(result.songs, 1);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /zle\.xml/);
});

test('sety sa uložia a načítajú', async () => {
  await store.putSet({ id: 'set-1', name: 'Nedeľa', items: ['JKS/342.xml'], updatedAt: 1 });
  assert.equal((await store.sets())[0].name, 'Nedeľa');
  await store.deleteSet('set-1');
  assert.equal((await store.sets()).length, 0);
});

test('zmazanie zbierky odstráni jej piesne', async () => {
  await store.deleteFolder('Ukazkove');
  const songs = await store.allSongs();
  assert.equal(songs.filter((song) => song.folder === 'Ukazkove').length, 0);
  assert.ok(songs.some((song) => song.folder === 'JKS'));
});

test('systemForFolder rozpozná číselník z názvu priečinka', () => {
  assert.equal(systemForFolder('JKS'), 'JKS');
  assert.equal(systemForFolder('jednotny-katolicky-spevnik'), 'JKS');
  assert.equal(systemForFolder('LS'), 'LS');
  assert.equal(systemForFolder('Liturgicky spevnik'), 'LS');
  assert.equal(systemForFolder('Vlastné piesne'), '');
});
