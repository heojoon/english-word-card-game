import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const code = await readFile(new URL('../sound-manager.js', import.meta.url), 'utf8');

class AudioParamMock {
  constructor(value = 1) { this.value = value; }
  setValueAtTime(value) { this.value = value; }
  cancelScheduledValues() {}
  linearRampToValueAtTime(value) { this.value = value; }
}

class NodeMock {
  constructor() { this.gain = new AudioParamMock(); this.playbackRate = { value: 1 }; this.connections = []; }
  connect(node) { this.connections.push(node); }
  disconnect() { this.connections = []; }
}

class SourceMock extends NodeMock {
  start() { this.started = true; }
  stop() { this.stopped = true; this.onended?.(); }
}

class AudioContextMock {
  constructor() { this.currentTime = 1; this.state = 'running'; this.sampleRate = 48000; this.destination = new NodeMock(); this.sources = []; }
  createGain() { return new NodeMock(); }
  createBufferSource() { const source = new SourceMock(); this.sources.push(source); return source; }
  createBuffer() { return { duration: 1 }; }
  decodeAudioData() { return Promise.resolve({ duration: 2 }); }
  resume() { this.state = 'running'; return Promise.resolve(); }
  close() { this.state = 'closed'; return Promise.resolve(); }
}

function makeManager({ assetOK = true } = {}) {
  const manifest = {
    settingsKey: 'test.audio', defaults: { masterVolume: 0.8, bgmVolume: 0.5, sfxVolume: 0.75, muted: false },
    events: {
      HIT: { category: 'sfx', volume: 0.7, pitchVariation: 0.04, sources: ['hit-1.wav', 'hit-2.wav'] },
      BGM: { category: 'bgm', volume: 0.5, loop: true, sources: ['music.ogg'] }
    }
  };
  const storageData = new Map();
  const fetch = async url => url.includes('manifest')
    ? { ok: true, json: async () => manifest }
    : { ok: assetOK, status: 404, arrayBuffer: async () => new ArrayBuffer(8) };
  const root = { fetch, setTimeout, clearTimeout, console: { warn() {} } };
  root.globalThis = root;
  vm.runInNewContext(code, root);
  const context = new AudioContextMock();
  const manager = new root.SoundManager({ manifestUrl: 'manifest.json', fetch, contextFactory: () => context, storage: { getItem: key => storageData.get(key), setItem: (key, value) => storageData.set(key, value) } });
  return { manager, context, storageData };
}

test('missing audio is a safe no-op', async () => {
  const { manager } = makeManager({ assetOK: false });
  await manager.ready;
  assert.equal(await manager.playSFX('HIT'), null);
  assert.equal(manager.activeSFX.size, 0);
});

test('SFX overlap, BGM loop, volumes, mute, and persistence', async () => {
  const { manager, context, storageData } = makeManager();
  await manager.ready;
  const first = await manager.playSFX('HIT');
  const second = await manager.playSFX('HIT');
  assert.notEqual(first.source, second.source);
  assert.equal(manager.activeSFX.size, 2);
  const bgm = await manager.playBGM('BGM', { fadeMs: 0 });
  assert.equal(bgm.source.loop, true);
  manager.setMasterVolume(0.4); manager.setBGMVolume(0.3); manager.setSFXVolume(0.2); manager.mute();
  assert.equal(manager.masterGain.gain.value, 0);
  manager.unmute();
  assert.equal(manager.masterGain.gain.value, 0.4);
  assert.deepEqual(JSON.parse(storageData.get('test.audio')), { masterVolume: 0.4, bgmVolume: 0.3, sfxVolume: 0.2, muted: false });
});

test('preload tolerates failures and release removes decoded buffers', async () => {
  const { manager } = makeManager();
  await manager.ready;
  const results = await manager.preloadAudio(['HIT']);
  assert.equal(results.length, 2);
  assert.equal(manager.buffers.size, 2);
  manager.releaseAudio([]);
  assert.equal(manager.buffers.size, 0);
});
