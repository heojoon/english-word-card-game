(function (root) {
  'use strict';

  const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));
  const now = context => context.currentTime || 0;

  class SoundManager {
    constructor(options = {}) {
      this.manifestUrl = options.manifestUrl || 'assets/audio/config/audio-manifest.json';
      this.contextFactory = options.contextFactory || (() => {
        const AudioContext = root.AudioContext || root.webkitAudioContext;
        return AudioContext ? new AudioContext() : null;
      });
      this.fetch = options.fetch || root.fetch?.bind(root);
      this.storage = options.storage || root.localStorage;
      this.context = null;
      this.manifest = { defaults: {}, events: {} };
      this.buffers = new Map();
      this.loading = new Map();
      this.activeSFX = new Set();
      this.bgm = null;
      this.lastVariant = new Map();
      this.missingWarnings = new Set();
      this.unlocked = false;
      this.settings = { masterVolume: 0.8, bgmVolume: 0.5, sfxVolume: 0.75, muted: false };
      this.ready = this.loadManifest();
      this.installUnlockHandlers();
    }

    async loadManifest() {
      if (!this.fetch) return this.manifest;
      try {
        const response = await this.fetch(this.manifestUrl, { cache: 'no-cache' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        this.manifest = await response.json();
        this.settings = { ...this.settings, ...(this.manifest.defaults || {}), ...this.readSettings() };
      } catch (error) {
        this.warnOnce(this.manifestUrl, `Audio manifest unavailable; continuing silently (${error.message})`);
      }
      return this.manifest;
    }

    readSettings() {
      try { return JSON.parse(this.storage?.getItem(this.manifest.settingsKey || 'wordoria.audio.settings.v1') || '{}'); }
      catch { return {}; }
    }

    saveSettings() {
      try { this.storage?.setItem(this.manifest.settingsKey || 'wordoria.audio.settings.v1', JSON.stringify(this.settings)); }
      catch {}
      this.applyBusVolumes();
    }

    ensureContext() {
      if (!this.context) {
        this.context = this.contextFactory();
        if (!this.context) return null;
        this.masterGain = this.context.createGain();
        this.bgmGain = this.context.createGain();
        this.sfxGain = this.context.createGain();
        this.bgmGain.connect(this.masterGain);
        this.sfxGain.connect(this.masterGain);
        this.masterGain.connect(this.context.destination);
        this.applyBusVolumes();
      }
      return this.context;
    }

    applyBusVolumes() {
      if (!this.context) return;
      const time = now(this.context);
      this.masterGain.gain.setValueAtTime(this.settings.muted ? 0 : clamp(this.settings.masterVolume), time);
      this.bgmGain.gain.setValueAtTime(clamp(this.settings.bgmVolume), time);
      this.sfxGain.gain.setValueAtTime(clamp(this.settings.sfxVolume), time);
    }

    installUnlockHandlers() {
      if (!root.document?.addEventListener) return;
      const unlock = () => this.unlock();
      ['pointerdown', 'touchend', 'keydown'].forEach(type => root.document.addEventListener(type, unlock, { once: true, passive: true }));
    }

    async unlock() {
      const context = this.ensureContext();
      if (!context) return false;
      try {
        if (context.state === 'suspended') await context.resume();
        const buffer = context.createBuffer(1, 1, context.sampleRate);
        const source = context.createBufferSource();
        source.buffer = buffer; source.connect(this.masterGain); source.start(0);
        this.unlocked = context.state === 'running';
      } catch { this.unlocked = false; }
      if (this.unlocked && this.pendingBGM) {
        const pending = this.pendingBGM;
        this.pendingBGM = null;
        this.playBGM(pending.id, pending.options);
      }
      return this.unlocked;
    }

    event(id) { return this.manifest.events?.[id]; }

    pickSource(id, entry) {
      const sources = entry?.sources || [];
      if (sources.length < 2) return sources[0];
      const previous = this.lastVariant.get(id);
      const candidates = sources.filter(source => source !== previous);
      const picked = candidates[Math.floor(Math.random() * candidates.length)] || sources[0];
      this.lastVariant.set(id, picked);
      return picked;
    }

    async loadBuffer(url) {
      if (!url || !this.fetch) return null;
      if (this.buffers.has(url)) return this.buffers.get(url);
      if (this.loading.has(url)) return this.loading.get(url);
      const task = (async () => {
        try {
          const response = await this.fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const context = this.ensureContext();
          if (!context) return null;
          const buffer = await context.decodeAudioData(await response.arrayBuffer());
          this.buffers.set(url, buffer);
          return buffer;
        } catch (error) {
          this.warnOnce(url, `Audio asset unavailable; skipping ${url} (${error.message})`);
          return null;
        } finally { this.loading.delete(url); }
      })();
      this.loading.set(url, task);
      return task;
    }

    async preloadAudio(ids = Object.keys(this.manifest.events || {})) {
      await this.ready;
      const urls = ids.flatMap(id => this.event(id)?.sources || []);
      return Promise.allSettled(urls.map(url => this.loadBuffer(url)));
    }

    async playSFX(id, options = {}) {
      await this.ready;
      const entry = this.event(id);
      if (!entry || entry.category !== 'sfx') return null;
      const context = this.ensureContext();
      if (!context || context.state !== 'running') return null;
      const buffer = await this.loadBuffer(this.pickSource(id, entry));
      if (!buffer) return null;
      const source = context.createBufferSource(), gain = context.createGain();
      const variation = Number(entry.pitchVariation || 0);
      source.buffer = buffer;
      source.playbackRate.value = 1 + (Math.random() * 2 - 1) * variation;
      gain.gain.value = clamp((options.volume ?? entry.volume ?? 1) * (0.96 + Math.random() * 0.08));
      source.connect(gain); gain.connect(this.sfxGain);
      const voice = { id, source, gain };
      this.activeSFX.add(voice);
      source.onended = () => { this.activeSFX.delete(voice); source.disconnect(); gain.disconnect(); };
      source.start(0);
      return voice;
    }

    stopSFX(id) {
      for (const voice of [...this.activeSFX]) {
        if (id && voice.id !== id) continue;
        try { voice.source.stop(); } catch {}
        this.activeSFX.delete(voice);
      }
    }

    async playBGM(id, options = {}) {
      const requestId = (this.bgmRequestId || 0) + 1;
      this.bgmRequestId = requestId;
      await this.ready;
      if (this.bgm?.id === id && !options.restart) return this.bgm;
      const entry = this.event(id);
      if (!entry || entry.category !== 'bgm') return null;
      const context = this.ensureContext();
      if (!context || context.state !== 'running') {
        this.pendingBGM = { id, options };
        return null;
      }
      let buffer = null;
      for (const source of entry.sources || []) {
        buffer = await this.loadBuffer(source);
        if (buffer) break;
      }
      if (!buffer || requestId !== this.bgmRequestId) return null;
      if (this.bgm) await this.fadeOut(options.crossfadeMs ?? 350);
      const source = context.createBufferSource(), gain = context.createGain();
      source.buffer = buffer; source.loop = options.loop ?? entry.loop ?? true;
      gain.gain.value = 0; source.connect(gain); gain.connect(this.bgmGain); source.start(0);
      this.bgm = { id, source, gain, pausedAt: 0, startedAt: now(context), entry };
      await this.fadeIn(options.fadeMs ?? 450, entry.volume ?? 1);
      return this.bgm;
    }

    stopBGM() {
      if (!this.bgm) return;
      try { this.bgm.source.stop(); } catch {}
      this.bgm.source.disconnect(); this.bgm.gain.disconnect(); this.bgm = null;
    }

    pauseBGM() {
      if (!this.bgm || !this.context) return;
      this.bgm.pausedAt = (now(this.context) - this.bgm.startedAt) % this.bgm.source.buffer.duration;
      this.bgm.pausedId = this.bgm.id; this.bgm.pausedEntry = this.bgm.entry;
      try { this.bgm.source.stop(); } catch {}
    }

    async resumeBGM() {
      if (!this.bgm?.pausedId) return null;
      const old = this.bgm, context = this.ensureContext();
      const source = context.createBufferSource(), gain = context.createGain();
      source.buffer = old.source.buffer; source.loop = old.pausedEntry.loop ?? true;
      gain.gain.value = old.pausedEntry.volume ?? 1; source.connect(gain); gain.connect(this.bgmGain);
      source.start(0, old.pausedAt); this.bgm = { id: old.pausedId, source, gain, pausedAt: 0, startedAt: now(context) - old.pausedAt, entry: old.pausedEntry };
      return this.bgm;
    }

    fadeIn(durationMs = 450, target = 1) { return this.fade(this.bgm?.gain, target, durationMs); }
    fadeOut(durationMs = 350) {
      const voice = this.bgm;
      if (!voice) return Promise.resolve();
      return this.fade(voice.gain, 0, durationMs).then(() => {
        try { voice.source.stop(); } catch {}
        voice.source.disconnect(); voice.gain.disconnect();
        if (this.bgm === voice) this.bgm = null;
      });
    }

    fade(node, target, durationMs) {
      if (!node || !this.context) return Promise.resolve();
      const start = now(this.context), seconds = Math.max(0, durationMs) / 1000;
      node.gain.cancelScheduledValues(start); node.gain.setValueAtTime(Math.max(0.0001, node.gain.value), start);
      node.gain.linearRampToValueAtTime(clamp(target), start + seconds);
      return new Promise(resolve => setTimeout(resolve, durationMs));
    }

    setMasterVolume(value) { this.settings.masterVolume = clamp(value); this.saveSettings(); }
    setBGMVolume(value) { this.settings.bgmVolume = clamp(value); this.saveSettings(); }
    setSFXVolume(value) { this.settings.sfxVolume = clamp(value); this.saveSettings(); }
    mute() { this.settings.muted = true; this.saveSettings(); }
    unmute() { this.settings.muted = false; this.saveSettings(); }

    releaseAudio(ids) {
      const keep = new Set((ids || []).flatMap(id => this.event(id)?.sources || []));
      for (const url of this.buffers.keys()) if (!keep.has(url)) this.buffers.delete(url);
    }

    destroy() {
      this.stopSFX(); this.stopBGM(); this.buffers.clear(); this.loading.clear();
      if (this.context && this.context.state !== 'closed') this.context.close().catch(() => {});
      this.context = null;
    }

    warnOnce(key, message) {
      if (this.missingWarnings.has(key)) return;
      this.missingWarnings.add(key);
      root.console?.warn?.(`[SoundManager] ${message}`);
    }
  }

  root.SoundManager = SoundManager;
  root.wordoriaSound = root.wordoriaSound || new SoundManager();
  const handleAudioEvent = event => {
    const { id, type = 'sfx', options } = event.detail || {};
    if (!id) return;
    if (type === 'bgm') root.wordoriaSound.playBGM(id, options);
    else root.wordoriaSound.playSFX(id, options);
  };
  (root.document || root).addEventListener?.('wordoria:audio', handleAudioEvent);
})(typeof window !== 'undefined' ? window : globalThis);
