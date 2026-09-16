// Prezentačný režim pre zrkadlenie obrazovky na TV (Chromecast „Prenášať obrazovku“).
//
// Pri zrkadlení vidí televízor presne to, čo je na tablete, takže na obrazovke
// nesmie byť žiadne ovládanie. Riadi sa preto neviditeľnými dotykovými zónami:
//   ľavá tretina  = predošlá sloha
//   pravá tretina = ďalšia sloha
//   stred         = čierna obrazovka (ťuknutie) / ponuka (podržanie)
//   potiahnutie vľavo-vpravo = predošlá/ďalšia pieseň
// Každý dotyk potvrdí krátka vibrácia, aby organista nemusel pozerať na tablet.

const LONG_PRESS_MS = 600;
const SWIPE_MIN = 90;

export function createPresenter({ root, actions, isVibrationOn }) {
  let active = false;

  const buzz = (pattern) => {
    if (!isVibrationOn() || !navigator.vibrate) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      /* zariadenie vibrácie nepodporuje */
    }
  };

  const zones = root.querySelector('#presentZones');
  const menu = root.querySelector('#presentMenu');
  const help = root.querySelector('#presentHelp');

  const showMenu = (show) => {
    menu.hidden = !show;
    if (show) buzz(25);
  };

  // ---------------------------------------------------------------- dotyk ---
  let start = null;
  let longPressTimer = null;

  const zoneOf = (x) => {
    const width = zones.clientWidth || window.innerWidth;
    if (x < width * 0.35) return 'prev';
    if (x > width * 0.65) return 'next';
    return 'center';
  };

  zones.addEventListener('pointerdown', (event) => {
    if (!menu.hidden || !help.hidden) return;
    start = { x: event.clientX, y: event.clientY, t: Date.now(), zone: zoneOf(event.clientX) };
    clearTimeout(longPressTimer);
    if (start.zone === 'center') {
      longPressTimer = setTimeout(() => {
        start = null;
        showMenu(true);
      }, LONG_PRESS_MS);
    }
  });

  zones.addEventListener('pointercancel', () => {
    clearTimeout(longPressTimer);
    start = null;
  });

  zones.addEventListener('pointerup', (event) => {
    clearTimeout(longPressTimer);
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const moved = Math.abs(dx);
    start = null;

    if (moved > SWIPE_MIN && moved > Math.abs(dy)) {
      if (dx < 0) actions.nextSong();
      else actions.prevSong();
      buzz([20, 40, 20]);
      return;
    }

    const zone = zoneOf(event.clientX);
    if (zone === 'prev') actions.prevVerse();
    else if (zone === 'next') actions.nextVerse();
    else actions.toggleBlank();
    buzz(zone === 'center' ? [15, 30, 15] : 18);
  });

  // ---------------------------------------------------------------- ponuka ---
  root.querySelectorAll('[data-present-action]').forEach((button) => {
    button.onclick = () => {
      const action = button.dataset.presentAction;
      if (action === 'close') showMenu(false);
      else if (action === 'exit') {
        showMenu(false);
        exit();
      } else if (actions[action]) {
        actions[action]();
        showMenu(false);
      }
    };
  });

  root.querySelector('#presentHelpOk').onclick = () => {
    help.hidden = true;
    actions.helpSeen();
  };

  // ------------------------------------------------------------ fullscreen ---
  async function goFullscreen() {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    } catch {
      /* prehliadač celú obrazovku odmietol – režim funguje aj bez nej */
    }
    try {
      if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape');
    } catch {
      /* uzamknutie orientácie nie je povinné */
    }
  }

  async function enter({ showHelp }) {
    active = true;
    root.hidden = false;
    document.body.classList.add('is-presenting');
    help.hidden = !showHelp;
    menu.hidden = true;
    await goFullscreen();
    actions.changed();
  }

  function exit() {
    active = false;
    root.hidden = true;
    document.body.classList.remove('is-presenting');
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    actions.changed();
  }

  document.addEventListener('fullscreenchange', () => {
    // Používateľ vyskočil z celej obrazovky (systémové gesto) – režim ukončíme,
    // aby sa na televízore neobjavilo rozhrané rozhranie.
    if (active && !document.fullscreenElement) exit();
  });

  return {
    get active() { return active; },
    enter,
    exit,
    toggleButtons(show) {
      root.classList.toggle('has-buttons', !!show);
    },
  };
}
