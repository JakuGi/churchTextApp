// Editor piesní – organista píše text do formulára, nie do XML.

import { composeSong, splitPastedText, songToXml, VERSE_TYPES, parseNumber } from './songs.js';
import { createDisplay } from './display-core.js';
import { displayState } from './bus.js';

const DRAFT_KEY = 'organista-koncept';

const TYPE_OPTIONS = [
  ['verse', 'Sloha'],
  ['chorus', 'Refrén'],
  ['bridge', 'Medzihra'],
  ['ending', 'Záver'],
];

const $ = (selector, scope = document) => scope.querySelector(selector);

function emptyForm() {
  return {
    title: '', folder: '', system: '', number: '', author: '', melody: '',
    verses: [{ type: 'verse', text: '' }],
  };
}

/** Popisok slohy tak, ako ho neskôr vyrobí composeSong. */
function labelFor(verses, index) {
  const verse = verses[index];
  let counter = 0;
  for (let i = 0; i <= index; i += 1) {
    if (verses[i].type === verse.type) counter += 1;
  }
  if (verse.type === 'verse') {
    let number = 0;
    for (let i = 0; i <= index; i += 1) if (verses[i].type === 'verse') number += 1;
    return String(number);
  }
  const short = VERSE_TYPES[verse.type] ? VERSE_TYPES[verse.type].short : '*';
  return counter > 1 ? `${short}${counter}` : short;
}

/**
 * @param {{onSave, onDelete, onClose, getFolders, getSongs, getSettings, toast}} deps
 */
export function createEditor(deps) {
  const form = emptyForm();
  let editing = null;      // pôvodná pieseň pri úprave
  let savedSnapshot = '';
  let focusIndex = 0;
  let preview = null;

  const snapshot = () => JSON.stringify(form);
  const isDirty = () => snapshot() !== savedSnapshot;

  // ------------------------------------------------------------- koncept ---

  function saveDraft() {
    if (!isDirty()) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        id: editing ? editing.id : null,
        title: form.title,
        form,
        at: Date.now(),
      }));
    } catch {
      /* plná pamäť – koncept je len pomôcka */
    }
  }

  function readDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function clearDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* nevadí */
    }
    $('#editorDraft').hidden = true;
  }

  function offerDraft() {
    const draft = readDraft();
    const bar = $('#editorDraft');
    const sameSong = draft && ((editing && draft.id === editing.id) || (!editing && !draft.id));
    if (!draft || !sameSong) {
      bar.hidden = true;
      return;
    }
    const when = new Date(draft.at).toLocaleString('sk-SK', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
    $('#editorDraftText').textContent = `Máš rozpísanú pieseň „${draft.title || 'bez názvu'}“ (${when}).`;
    bar.hidden = false;
    $('#editorDraftRestore').onclick = () => {
      Object.assign(form, draft.form);
      clearDraft();
      render();
    };
    $('#editorDraftDiscard').onclick = clearDraft;
  }

  // ------------------------------------------------------------ vykreslenie

  function renderFolders() {
    const select = $('#edFolder');
    const folders = deps.getFolders();
    const names = folders.map((folder) => folder.name);
    if (form.folder && !names.includes(form.folder)) names.push(form.folder);
    if (!names.includes('Vlastné')) names.push('Vlastné');

    select.innerHTML = '';
    for (const name of names) {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      option.selected = name === form.folder;
      select.appendChild(option);
    }
    const custom = document.createElement('option');
    custom.value = '__new__';
    custom.textContent = '+ nová zbierka…';
    select.appendChild(custom);
    if (!form.folder) {
      form.folder = names.includes('Vlastné') ? 'Vlastné' : names[0];
      select.value = form.folder;
    }
  }

  function renderNumberWarning() {
    const box = $('#edNumberWarn');
    if (!form.number) {
      box.hidden = true;
      return;
    }
    const clash = deps.getSongs().find((song) => song.number
      && parseInt(song.number, 10) === parseInt(form.number, 10)
      && (song.system || '') === (form.system || '')
      && (!editing || song.id !== editing.id));
    if (clash) {
      box.hidden = false;
      box.textContent = `Pozor: číslo ${[form.system, form.number].filter(Boolean).join(' ')} už má pieseň „${clash.title}“.`;
    } else {
      box.hidden = true;
    }
  }

  function renderPreview() {
    if (!preview) return;
    const verse = form.verses[focusIndex];
    const lines = verse ? verse.text.split('\n').map((line) => line.replace(/\s+$/, '')) : [];
    const hasText = lines.join('').trim() !== '';
    preview.render(displayState({
      song: { title: form.title || 'Bez názvu', number: form.number, system: form.system },
      verse: hasText ? { label: labelFor(form.verses, focusIndex), type: verse.type, lines } : null,
      blank: !hasText,
      settings: deps.getSettings(),
    }));
  }

  function renderVerses() {
    const box = $('#edVerses');
    box.innerHTML = '';

    form.verses.forEach((verse, index) => {
      const card = document.createElement('div');
      card.className = `versecard versecard--${verse.type}`;
      card.classList.toggle('is-focused', index === focusIndex);

      const head = document.createElement('div');
      head.className = 'versecard__head';

      const badge = document.createElement('span');
      badge.className = 'versecard__badge';
      badge.textContent = labelFor(form.verses, index);

      const type = document.createElement('select');
      type.className = 'input input--small';
      for (const [value, label] of TYPE_OPTIONS) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        option.selected = verse.type === value;
        type.appendChild(option);
      }
      type.onchange = () => {
        verse.type = type.value;
        touched();
        renderVerses();
      };

      const tools = document.createElement('div');
      tools.className = 'versecard__tools';
      const tool = (label, title, action, extra = '') => {
        const button = document.createElement('button');
        button.className = `btn btn--icon ${extra}`;
        button.textContent = label;
        button.title = title;
        button.onclick = action;
        return button;
      };
      tools.append(
        tool('▲', 'Posunúť vyššie', () => moveVerse(index, -1)),
        tool('▼', 'Posunúť nižšie', () => moveVerse(index, 1)),
        tool('⧉', 'Duplikovať', () => duplicateVerse(index)),
        tool('✕', 'Zmazať slohu', () => removeVerse(index), 'btn--danger'),
      );

      head.append(badge, type, tools);

      const area = document.createElement('textarea');
      area.className = 'input textarea';
      area.value = verse.text;
      area.placeholder = verse.type === 'chorus'
        ? 'Text refrénu – každý spievaný riadok na samostatný riadok'
        : 'Text slohy – každý spievaný riadok na samostatný riadok';
      area.rows = Math.max(3, verse.text.split('\n').length + 1);
      area.oninput = () => {
        verse.text = area.value;
        area.rows = Math.max(3, area.value.split('\n').length + 1);
        focusIndex = index;
        touched();
        renderPreview();
        badge.textContent = labelFor(form.verses, index);
      };
      area.onfocus = () => {
        focusIndex = index;
        renderPreview();
        box.querySelectorAll('.versecard').forEach((node, position) => {
          node.classList.toggle('is-focused', position === index);
        });
      };

      card.append(head, area);
      box.appendChild(card);
    });
  }

  function render() {
    $('#editorHeading').textContent = editing ? 'Úprava piesne' : 'Nová pieseň';
    $('#editorDelete').hidden = !editing;
    $('#edTitle').value = form.title;
    $('#edSystem').value = form.system;
    $('#edNumber').value = form.number;
    $('#edAuthor').value = form.author;
    $('#edMelody').value = form.melody;
    renderFolders();
    $('#edFolder').value = form.folder;
    $('#edNewFolderField').hidden = true;
    renderNumberWarning();
    renderVerses();
    renderPreview();
    $('#editorDirty').hidden = !isDirty();
    $('#edTitleError').hidden = true;
    $('#edVersesError').hidden = true;
  }

  function touched() {
    $('#editorDirty').hidden = !isDirty();
    saveDraft();
  }

  // -------------------------------------------------------------- operácie

  function moveVerse(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= form.verses.length) return;
    const [item] = form.verses.splice(index, 1);
    form.verses.splice(target, 0, item);
    focusIndex = target;
    touched();
    renderVerses();
    renderPreview();
  }

  function duplicateVerse(index) {
    form.verses.splice(index + 1, 0, { ...form.verses[index] });
    focusIndex = index + 1;
    touched();
    renderVerses();
  }

  function removeVerse(index) {
    if (form.verses[index].text.trim() && !confirm('Zmazať túto slohu?')) return;
    form.verses.splice(index, 1);
    if (!form.verses.length) form.verses.push({ type: 'verse', text: '' });
    focusIndex = Math.max(0, Math.min(focusIndex, form.verses.length - 1));
    touched();
    renderVerses();
    renderPreview();
  }

  function addVerse(type) {
    form.verses.push({ type, text: '' });
    focusIndex = form.verses.length - 1;
    touched();
    renderVerses();
    renderPreview();
    const areas = document.querySelectorAll('#edVerses textarea');
    const last = areas[areas.length - 1];
    if (last) {
      last.focus();
      last.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  function currentSong() {
    return composeSong(form, editing
      ? { id: editing.id, fileName: editing.fileName, importedAt: editing.importedAt }
      : {});
  }

  async function save() {
    const hasTitle = form.title.trim() !== '';
    const hasText = form.verses.some((verse) => verse.text.trim() !== '');
    $('#edTitleError').hidden = hasTitle;
    $('#edVersesError').hidden = hasText;
    if (!hasTitle) {
      $('#edTitle').focus();
      deps.toast('Pieseň potrebuje názov.', 'warn');
      return;
    }
    if (!hasText) {
      deps.toast('Pieseň potrebuje aspoň jednu slohu s textom.', 'warn');
      return;
    }

    const song = currentSong();
    // Zmena zbierky alebo názvu mení aj id – starý záznam treba odstrániť.
    const replacedId = editing && editing.id !== song.id ? editing.id : null;
    await deps.onSave(song, replacedId);
    savedSnapshot = snapshot();
    clearDraft();
    $('#editorDirty').hidden = true;
    editing = song;
    $('#editorHeading').textContent = 'Úprava piesne';
    $('#editorDelete').hidden = false;
  }

  function exportXml() {
    const song = currentSong();
    const blob = new Blob([songToXml(song)], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = song.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    deps.toast(`Uložené ako ${song.fileName}`, 'ok');
  }

  // ---------------------------------------------------------------- vstupy

  function bind() {
    preview = createDisplay($('#edPreview'));

    const bindField = (id, key, after) => {
      $(id).oninput = (event) => {
        form[key] = event.target.value;
        touched();
        if (after) after();
        renderPreview();
      };
    };
    bindField('#edTitle', 'title');
    bindField('#edAuthor', 'author');
    bindField('#edMelody', 'melody');
    $('#edNumber').oninput = (event) => {
      const parsed = parseNumber(event.target.value);
      form.number = event.target.value.replace(/[^0-9]/g, '').slice(0, 4);
      if (parsed && parsed.system && !form.system) {
        form.system = parsed.system;
        $('#edSystem').value = form.system;
      }
      event.target.value = form.number;
      touched();
      renderNumberWarning();
      renderPreview();
    };
    $('#edSystem').onchange = (event) => {
      form.system = event.target.value;
      touched();
      renderNumberWarning();
      renderPreview();
    };
    $('#edFolder').onchange = (event) => {
      if (event.target.value === '__new__') {
        $('#edNewFolderField').hidden = false;
        $('#edNewFolder').value = '';
        $('#edNewFolder').focus();
        return;
      }
      $('#edNewFolderField').hidden = true;
      form.folder = event.target.value;
      const system = /JKS/i.test(form.folder) ? 'JKS' : (/^LS$|LITURGIC/i.test(form.folder) ? 'LS' : '');
      if (system && !form.system) {
        form.system = system;
        $('#edSystem').value = system;
      }
      touched();
    };
    $('#edNewFolder').oninput = (event) => {
      form.folder = event.target.value.trim();
      touched();
    };

    $('#edAddVerse').onclick = () => addVerse('verse');
    $('#edAddChorus').onclick = () => addVerse('chorus');
    $('#editorSave').onclick = save;
    $('#editorExport').onclick = exportXml;
    $('#editorDelete').onclick = async () => {
      if (!editing) return;
      if (!confirm(`Naozaj zmazať pieseň „${editing.title}“ z knižnice?`)) return;
      await deps.onDelete(editing);
      savedSnapshot = snapshot();
      clearDraft();
    };
    $('#editorCancel').onclick = () => {
      if (isDirty() && !confirm('Máš neuložené zmeny. Naozaj odísť bez uloženia?')) return;
      clearDraft();
      deps.onClose();
    };

    // vloženie celého textu naraz
    $('#edPasteAll').onclick = () => {
      $('#pasteText').value = '';
      $('#pasteDialog').showModal();
    };
    const applyPaste = (replace) => {
      const parsed = splitPastedText($('#pasteText').value);
      if (!parsed.length) {
        deps.toast('Nenašiel sa žiadny text.', 'warn');
        return;
      }
      const incoming = parsed.map((verse) => ({ type: verse.type, text: verse.lines.join('\n') }));
      const existing = form.verses.filter((verse) => verse.text.trim() !== '');
      form.verses = replace ? incoming : existing.concat(incoming);
      focusIndex = 0;
      $('#pasteDialog').close();
      touched();
      renderVerses();
      renderPreview();
      const head = document.querySelector('.verses-head');
      if (head) head.scrollIntoView({ block: 'start', behavior: 'smooth' });
      deps.toast(`Rozdelené na ${parsed.length} ${parsed.length === 1 ? 'slohu' : 'slohy'}.`, 'ok');
    };
    $('#pasteReplace').onclick = () => applyPaste(true);
    $('#pasteAppend').onclick = () => applyPaste(false);
  }

  bind();

  return {
    isDirty,
    /** @param {object|null} song null = nová pieseň */
    open(song) {
      editing = song || null;
      focusIndex = 0;
      if (song) {
        Object.assign(form, {
          title: song.title === 'Bez názvu' ? '' : song.title,
          folder: song.folder,
          system: song.system || '',
          number: song.number || '',
          author: song.author || '',
          melody: song.melody || '',
          verses: song.verses.map((verse) => ({ type: verse.type, text: verse.lines.join('\n') })),
        });
        if (!form.verses.length) form.verses = [{ type: 'verse', text: '' }];
      } else {
        Object.assign(form, emptyForm());
      }
      savedSnapshot = snapshot();
      render();
      offerDraft();
      if (!song) setTimeout(() => $('#edTitle').focus(), 50);
    },
  };
}
