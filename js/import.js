// Načítanie .xml súborov z priečinka (alebo výberu súborov) do knižnice.

import { parseSongFile } from './songs.js';
import { store } from './store.js';

function folderOf(file, fallback) {
  const path = file.webkitRelativePath || file.relativePath || '';
  const parts = path.split('/').filter(Boolean);
  if (parts.length > 1) return parts[parts.length - 2];
  return fallback || 'Ostatné';
}

/** Odhad číselníka podľa názvu priečinka: "JKS", "LS", "Liturgicky spevnik". */
export function systemForFolder(folderName, defaultSystem) {
  const name = String(folderName || '').toUpperCase();
  if (/\bJKS\b|JEDNOTN/.test(name)) return 'JKS';
  if (/\bLS\b|LITURGIC/.test(name)) return 'LS';
  return defaultSystem && /^JKS|LS$/.test(defaultSystem) ? '' : '';
}

/**
 * @param {FileList|File[]} fileList
 * @param {{folderName?:string, system?:string, onProgress?:Function}} options
 */
export async function importFiles(fileList, options = {}) {
  const files = Array.from(fileList).filter((file) => /\.xml$/i.test(file.name));
  const result = { files: files.length, songs: 0, folders: new Set(), errors: [] };
  if (!files.length) return result;

  const songs = [];
  const importedAt = Date.now();

  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    const folder = options.folderName || folderOf(file, options.folderName);
    const system = (options.system || systemForFolder(folder)).toUpperCase();
    try {
      const text = await file.text();
      const parsed = parseSongFile(text, {
        folder,
        fileName: file.name,
        folderSystem: system,
        importedAt,
      });
      if (!parsed.length) result.errors.push(`${file.name}: nenašli sa slohy`);
      songs.push(...parsed);
      result.folders.add(folder);
    } catch (error) {
      result.errors.push(`${file.name}: ${error.message}`);
    }
    if (options.onProgress) options.onProgress(i + 1, files.length);
  }

  if (songs.length) await store.putSongs(songs);
  for (const folder of result.folders) {
    const inFolder = songs.filter((song) => song.folder === folder);
    await store.putFolder({
      name: folder,
      system: (options.system || systemForFolder(folder) || (inFolder.find((s) => s.system) || {}).system || '').toUpperCase(),
      count: inFolder.length,
      updatedAt: importedAt,
    });
  }
  result.songs = songs.length;
  result.folders = Array.from(result.folders);
  return result;
}
