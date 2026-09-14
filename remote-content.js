(() => {
  'use strict';

  const productionOrigin = 'https://heojoon.github.io/english-word-card-game';
  const nativeApp = document.documentElement.classList.contains('native-app')
    || Boolean(window.Capacitor?.isNativePlatform?.())
    || location.protocol === 'capacitor:'
    || (location.protocol === 'https:' && location.hostname === 'localhost');
  const catalogUrl = nativeApp
    ? `${productionOrigin}/content/catalog.json`
    : 'content/catalog.json';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  window.WORDORIA_CONTENT_ORIGIN = productionOrigin;
  window.WORDORIA_CONTENT_SOURCE = 'bundled';
  window.WORDORIA_CONTENT_READY = fetch(`${catalogUrl}?refresh=${Date.now()}`, {
    cache: 'no-store',
    signal: controller.signal
  }).then(response => {
    if (!response.ok) throw new Error(`content catalog HTTP ${response.status}`);
    return response.json();
  }).then(catalog => {
    if (catalog?.schemaVersion !== 1 || !catalog.stages || typeof catalog.stages !== 'object') {
      throw new Error('unsupported content catalog');
    }
    Object.entries(catalog.stages).forEach(([key, stage]) => {
      if (!/^s\d+$/.test(key) || !stage?.name || !Array.isArray(stage.words) || !stage.words.length) return;
      if (!stage.words.every(row => Array.isArray(row) && row.length === 3 && row.every(value => String(value).trim()))) return;
      window.QUIZ_STAGES[key] = stage;
    });
    window.WORDORIA_CONTENT_VERSION = catalog.contentVersion || 'remote';
    window.WORDORIA_CONTENT_SOURCE = nativeApp ? 'remote' : 'web';
    return catalog;
  }).catch(error => {
    console.warn('Remote content unavailable; using bundled content.', error);
    return null;
  }).finally(() => clearTimeout(timeout));
})();
