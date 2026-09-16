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

  function render(state) {
    current = state;
    const theme = THEMES[state.theme] || THEMES.dark;
    screen.style.setProperty('--bg', theme.bg);
    screen.style.setProperty('--fg', theme.fg);
    screen.style.setProperty('--meta', theme.meta);
    linesBox.style.lineHeight = String(state.lineSpacing || 1.25);
    linesBox.style.textTransform = state.uppercase ? 'uppercase' : 'none';

    const blank = state.blank || !state.lines || state.lines.length === 0;
    screen.classList.toggle('is-blank', blank);
    if (blank) {
      linesBox.textContent = '';
      metaTitle.textContent = '';
      metaVerse.textContent = '';
      return;
    }

    metaTitle.textContent = state.showTitle
      ? [state.number, state.title].filter(Boolean).join(' · ')
      : '';
    metaVerse.textContent = state.showVerseLabel && state.verseLabel
      ? (state.verseType === 'chorus' ? 'Refrén' : `${state.verseLabel}.`)
      : '';

    linesBox.innerHTML = '';
    for (const line of state.lines) {
      const div = document.createElement('div');
      div.className = 'line';
      div.textContent = line;
      if (!line.trim()) div.innerHTML = '&nbsp;';
      linesBox.appendChild(div);
    }
    fit();
  }

  window.addEventListener('resize', fit);
  if (typeof ResizeObserver === 'function') new ResizeObserver(fit).observe(root);
  render({ blank: true, theme: 'dark', lines: [] });
  return { render };
}
