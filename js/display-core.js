// Vykreslenie textu na premietaciu plochu (okno na TV aj Chromecast prijímač).

const THEMES = {
  dark: { bg: '#000000', fg: '#ffffff', meta: 'rgba(255,255,255,.55)' },
  light: { bg: '#ffffff', fg: '#101010', meta: 'rgba(0,0,0,.5)' },
  sepia: { bg: '#1b1408', fg: '#ffe9c2', meta: 'rgba(255,233,194,.55)' },
};

export function createDisplay(root) {
  root.classList.add('screen-host');
  root.innerHTML = `
    <div class="screen" id="screen">
      <div class="meta meta-top"><span id="metaTitle"></span></div>
      <div class="text" id="text"><div class="lines" id="lines"></div></div>
      <div class="meta meta-bottom"><span id="metaVerse"></span></div>
    </div>`;

  const screen = root.querySelector('#screen');
  const textBox = root.querySelector('#text');
  const linesBox = root.querySelector('#lines');
  const metaTitle = root.querySelector('#metaTitle');
  const metaVerse = root.querySelector('#metaVerse');
  let current = null;
  let lastTs = 0;
  let settleTimer = null;
  let fadeEndsAt = 0;

  // Najväčšie písmo, pri ktorom sa text ešte zmestí na plochu.
  // Prvá voľba: každý riadok piesne zostane na jednom riadku obrazovky.
  // Ak by bolo písmo príliš malé (veľmi dlhý verš), povolíme zalomenie.
  function measure(wrap, available, width, cap) {
    linesBox.style.whiteSpace = wrap ? 'pre-wrap' : 'pre';
    let low = 6;
    let high = cap;
    let best = low;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      linesBox.style.fontSize = `${mid}px`;
      const fitsHeight = linesBox.scrollHeight <= available;
      const fitsWidth = wrap ? true : linesBox.scrollWidth <= width + 1;
      if (fitsHeight && fitsWidth) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return best;
  }

  function fit() {
    if (!current || current.blank || !current.lines.length) return;
    const available = textBox.clientHeight;
    const width = textBox.clientWidth;
    if (available < 8 || width < 8) return;
    const scale = current.fontScale || 1;
    const cap = Math.max(10, Math.round(available * 0.42 * scale));

    const wrapped = measure(true, available, width, cap);
    const noWrap = measure(false, available, width, cap);

    // Celé verše na jednom riadku sú prehľadnejšie; zalomíme len vtedy,
    // ak by nás to stálo výraznú stratu veľkosti písma.
    if (noWrap >= Math.max(14, wrapped * 0.72)) {
      linesBox.style.whiteSpace = 'pre';
      linesBox.style.fontSize = `${noWrap}px`;
      return;
    }
    linesBox.style.whiteSpace = 'pre-wrap';
    linesBox.style.fontSize = `${wrapped}px`;
  }

  /** Popisok slohy: „1.“ alebo „Refrén“. */
  function verseLabel(state, inline) {
    if (!state.verseLabel) return '';
    if (state.verseType === 'chorus') return inline ? 'R:' : 'Refrén';
    return `${state.verseLabel}.`;
  }

  function headerText(state) {
    const mode = state.header || (state.showTitle === false ? 'none' : 'both');
    if (mode === 'none') return '';
    if (mode === 'number') return state.number || '';
    if (mode === 'title') return state.title || '';
    return [state.number, state.title].filter(Boolean).join(' · ');
  }

  /** Vypíše obsah bez prelínania. */
  function paint(state) {
    const blank = state.blank || !state.lines || state.lines.length === 0;
    screen.classList.toggle('is-blank', blank);

    if (blank) {
      linesBox.textContent = '';
      metaTitle.textContent = '';
      metaVerse.textContent = '';
      return;
    }

    metaTitle.textContent = headerText(state);
    metaVerse.textContent = state.showVerseLabel ? verseLabel(state, false) : '';

    const prefix = state.verseNumberInline ? verseLabel(state, true) : '';
    linesBox.innerHTML = '';
    state.lines.forEach((line, index) => {
      const div = document.createElement('div');
      div.className = 'line';
      const text = index === 0 && prefix ? `${prefix} ${line}` : line;
      div.textContent = text;
      if (!text.trim()) div.innerHTML = '&nbsp;';
      linesBox.appendChild(div);
    });
    fit();
  }

  /** Porovnanie toho, čo je vidieť – podľa toho sa rozhodne o prelínaní. */
  function contentKey(state) {
    if (!state) return '';
    const blank = state.blank || !state.lines || state.lines.length === 0;
    return JSON.stringify([
      blank,
      blank ? '' : state.lines,
      headerText(state),
      state.showVerseLabel ? verseLabel(state, false) : '',
      state.verseNumberInline ? verseLabel(state, true) : '',
    ]);
  }

  function render(state) {
    // Správa, ktorá dorazí neskoro (pomalší prenos), by prepísala obrazovku
    // predchádzajúcou slohou – preto sa staršie stavy zahadzujú.
    const ts = Number(state && state.ts) || 0;
    if (ts && ts < lastTs) return;
    if (ts) lastTs = ts;

    const previousKey = contentKey(current);
    current = state;

    const theme = THEMES[state.theme] || THEMES.dark;
    screen.style.setProperty('--bg', theme.bg);
    screen.style.setProperty('--fg', theme.fg);
    screen.style.setProperty('--meta', theme.meta);
    linesBox.style.lineHeight = String(state.lineSpacing || 1.25);
    linesBox.style.textTransform = state.uppercase ? 'uppercase' : 'none';

    const fade = Math.max(0, Math.min(1500, Number(state.fade) || 0));
    screen.style.setProperty('--fade', `${fade}ms`);

    // Obsah sa vymení okamžite. Prelínanie je len rozsvietenie nového textu,
    // takže na televízore nikdy nevidno predchádzajúcu slohu – aj keby sa
    // časovače v okne druhej obrazovky oneskorili.
    const changed = previousKey !== contentKey(state);
    if (changed) {
      clearTimeout(settleTimer);
      screen.classList.remove('is-swapping', 'is-settled');
    }
    paint(state);

    if (!changed || !fade || !previousKey) {
      // Bez prelínania má byť text hneď plne viditeľný. Ak práve nejaké beží
      // (ten istý stav prišiel druhý raz), nechá sa dobehnúť.
      if (changed || Date.now() >= fadeEndsAt) screen.classList.add('is-settled');
      return;
    }

    fadeEndsAt = Date.now() + fade;
    screen.classList.add('is-swapping');
    void screen.offsetWidth;   // vynúti prepočet štýlu, aby prechod nabehol
    screen.classList.remove('is-swapping');

    // Poistka pre okno na televízore: keby tam prechod zamrzol v polovici,
    // po jeho uplynutí sa text natvrdo prepne na plnú viditeľnosť.
    settleTimer = setTimeout(() => screen.classList.add('is-settled'), fade + 60);
  }

  window.addEventListener('resize', fit);
  if (typeof ResizeObserver === 'function') new ResizeObserver(fit).observe(root);
  render({ blank: true, theme: 'dark', lines: [] });
  return { render };
}
