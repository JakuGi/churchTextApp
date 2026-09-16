// Google Cast – odosielacia strana (tablet).
// Vyžaduje vlastné Application ID zaregistrované v Google Cast SDK Developer Console,
// ktoré si používateľ zadá v Nastaveniach. Bez neho appka používa zrkadlenie karty.

import { CAST_NAMESPACE } from './bus.js';

const SENDER_SRC = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';

export function createCast({ appId, onStatus }) {
  const state = {
    appId: appId || '',
    available: false,
    connected: false,
    deviceName: '',
    error: '',
  };

  const notify = () => onStatus({ ...state });

  function session() {
    const context = window.cast && window.cast.framework
      ? window.cast.framework.CastContext.getInstance()
      : null;
    return context ? context.getCurrentSession() : null;
  }

  function initialize() {
    if (!state.appId || !window.cast || !window.cast.framework || !window.chrome || !window.chrome.cast) return;
    const context = window.cast.framework.CastContext.getInstance();
    context.setOptions({
      receiverApplicationId: state.appId,
      autoJoinPolicy: window.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
    });
    context.addEventListener(
      window.cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
      (event) => {
        const types = window.cast.framework.SessionState;
        state.connected = event.sessionState === types.SESSION_STARTED || event.sessionState === types.SESSION_RESUMED;
        const active = session();
        state.deviceName = active && active.getCastDevice() ? active.getCastDevice().friendlyName : '';
        notify();
      },
    );
    state.available = true;
    notify();
  }

  window.__onGCastApiAvailable = (isAvailable) => {
    if (isAvailable) initialize();
  };

  function load() {
    if (document.querySelector(`script[src="${SENDER_SRC}"]`)) {
      initialize();
      return;
    }
    const script = document.createElement('script');
    script.src = SENDER_SRC;
    script.onerror = () => {
      state.error = 'Cast SDK sa nepodarilo načítať (offline?).';
      notify();
    };
    document.head.appendChild(script);
  }

  return {
    get state() { return { ...state }; },
    start() {
      if (state.appId) load();
      else notify();
    },
    setAppId(appId) {
      state.appId = appId || '';
      state.connected = false;
      state.available = false;
      if (state.appId) load();
      notify();
    },
    async connect() {
      const context = window.cast && window.cast.framework
        ? window.cast.framework.CastContext.getInstance()
        : null;
      if (!context) {
        state.error = 'Cast nie je dostupný v tomto prehliadači.';
        notify();
        return;
      }
      try {
        await context.requestSession();
      } catch (error) {
        if (error !== 'cancel') {
          state.error = 'Pripojenie k Chromecastu zlyhalo.';
          notify();
        }
      }
    },
    disconnect() {
      const active = session();
      if (active) active.endSession(true);
      state.connected = false;
      notify();
    },
    send(payload) {
      const active = session();
      if (!active) return false;
      active.sendMessage(CAST_NAMESPACE, payload);
      return true;
    },
  };
}
