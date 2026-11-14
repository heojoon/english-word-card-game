import { cp, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../', import.meta.url);
const dist = new URL('../dist/', import.meta.url);
const files = [
  'index.html',
  'app-config.js',
  'title-screen.css',
  'title-screen.js',
  'playable-preview.html',
  'playable-preview.css',
  'map-creator.html',
  'map-creator.css',
  'map-creator.js',
  'equipment-status-concept.html',
  'equipment-status-concept.css',
  'equipment-status-concept.js',
  'character-select-concepts.html',
  'character-select-concepts.css',
  'character-select-concepts.js',
  'crystal-game.css',
  'crystal-game.js',
  'blackroot-elder-boss.js',
  'vargas-boss.js',
  'world-nine-boss.js',
  'world-ten-boss.js',
  'story-novel.js', 'red-skull-knight-boss.js', 'dark-triton-boss.js', 'nereus-boss.js', 'arkaon-boss.js', 'seal-knight-boss.js', 'morgana-boss.js', 'abyss-golem-boss.js', 'bandit-chief-boss.js', 'elliot-boss.js', 'lich-dragon-boss.js', 'sorcerus-boss.js', 'guardian-boss.js', 'red-reaper-boss.js', 'shadow-sorceress-boss.js', 'black-dragon-boss.js', 'pet-system.js', 'active-skills.js',
  'sound-manager.js',
  'native-bridge.js',
  'stages.js',
  'elementary-stages.js',
  'stage6.js',
  'stage7.js',
  'stage8.js',
  'stage15.js',
  'stage35.js',
  'remote-content.js',
  'avatar-art.js'
];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await Promise.all(files.map(file => cp(new URL(file, root), new URL(file, dist))));
await cp(new URL('assets/', root), new URL('assets/', dist), { recursive: true, filter: source => {
  // Keep this boss's generation originals and review composites out of the APK.
  const path=source.replaceAll('\\','/');
  // Keep production delivery limited to runtime art. Generation inputs and review boards stay in the repository.
  return !/\/(?:source|source-frames|review|concept)(?:\/|$)/.test(path)
    && !/\/characters\/bard\/(?:source|source-frames|review|concept|(?:idle|attack|hit)-(?:male|female)|projectile)(?:\/|$)/.test(path)
    && !/\/monsters\/world-9\/training-dummy\/(?:source(?:\/|$)|(?:basic|advanced)\/(?:source-frames|review|idle|attack|hit)(?:\/|$))/.test(path)
    && !/\/monsters\/world-9\/(?:griffin|iris)\/(?:source|source-frames|review|idle|attack|hit|skill)(?:\/|$)/.test(path)
    && !/\/monsters\/world-10\/(?:lumen|seiran)\/(?:source|source-frames|review|idle|attack|hit|skill|shield)(?:\/|$)/.test(path)
    && !/\/novel\/characters\/source\/world-9(?:\/|$)/.test(path)
    && !/\/audio\/source\/roulette(?:\/|$)/.test(path)
    && !/\/story\/source\/world-9(?:\/|$)/.test(path);
} });
await cp(new URL('content/', root), new URL('content/', dist), { recursive: true });
console.log(`Prepared ${join('dist', '/')} for Capacitor.`);
