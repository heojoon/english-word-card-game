import { cp, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../', import.meta.url);
const dist = new URL('../dist/', import.meta.url);
const files = [
  'index.html',
  'playable-preview.html',
  'playable-preview.css',
  'equipment-status-concept.html',
  'equipment-status-concept.css',
  'equipment-status-concept.js',
  'crystal-game.css',
  'crystal-game.js',
  'native-bridge.js',
  'stages.js',
  'stage6.js',
  'stage7.js',
  'avatar-art.js'
];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await Promise.all(files.map(file => cp(new URL(file, root), new URL(file, dist))));
await cp(new URL('assets/', root), new URL('assets/', dist), { recursive: true });
console.log(`Prepared ${join('dist', '/')} for Capacitor.`);
