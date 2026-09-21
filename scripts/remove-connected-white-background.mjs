import { spawnSync } from 'node:child_process';
import { readFileSync, unlinkSync } from 'node:fs';

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  throw new Error('Usage: node scripts/remove-connected-white-background.mjs <input> <output>');
}

const probe = spawnSync('ffprobe', [
  '-v', 'error', '-select_streams', 'v:0',
  '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', input,
], { encoding: 'utf8' });
if (probe.status !== 0) throw new Error(probe.stderr);
const [width, height] = probe.stdout.trim().split('x').map(Number);

const decoded = spawnSync('ffmpeg', [
  '-v', 'error', '-i', input, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-',
], { encoding: null, maxBuffer: width * height * 4 });
if (decoded.status !== 0) throw new Error(decoded.stderr.toString());
const rgb = decoded.stdout;
const count = width * height;
const background = new Uint8Array(count);
const queue = new Uint32Array(count);
let head = 0;
let tail = 0;

function isBackgroundCandidate(index) {
  const offset = index * 3;
  const r = rgb[offset];
  const g = rgb[offset + 1];
  const b = rgb[offset + 2];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return min >= 226 && max - min <= 18;
}

function enqueue(index) {
  if (!background[index] && isBackgroundCandidate(index)) {
    background[index] = 1;
    queue[tail++] = index;
  }
}

for (let x = 0; x < width; x += 1) {
  enqueue(x);
  enqueue((height - 1) * width + x);
}
for (let y = 1; y < height - 1; y += 1) {
  enqueue(y * width);
  enqueue(y * width + width - 1);
}

while (head < tail) {
  const index = queue[head++];
  const x = index % width;
  if (x > 0) enqueue(index - 1);
  if (x + 1 < width) enqueue(index + 1);
  if (index >= width) enqueue(index - width);
  if (index + width < count) enqueue(index + width);
}

// White background can be enclosed by hair, ribbons, limbs, and magic effects.
// Remove only large enclosed neutral-white regions; small white details such as
// eyes, teeth, and highlights remain opaque.
const visited = new Uint8Array(count);
const enclosedSizes = [];
for (let start = 0; start < count; start += 1) {
  if (background[start] || visited[start] || !isBackgroundCandidate(start)) continue;
  head = 0;
  tail = 0;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  visited[start] = 1;
  queue[tail++] = start;
  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = Math.floor(index / width);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    const neighbors = [];
    if (x > 0) neighbors.push(index - 1);
    if (x + 1 < width) neighbors.push(index + 1);
    if (index >= width) neighbors.push(index - width);
    if (index + width < count) neighbors.push(index + width);
    for (const neighbor of neighbors) {
      if (!background[neighbor] && !visited[neighbor] && isBackgroundCandidate(neighbor)) {
        visited[neighbor] = 1;
        queue[tail++] = neighbor;
      }
    }
  }
  enclosedSizes.push(tail);
  const smallFacialDetail = tail < 512
    && minX >= 500 && maxX <= 805 && minY >= 260 && maxY <= 550;
  if (tail >= 32 && !smallFacialDetail) {
    for (let i = 0; i < tail; i += 1) background[queue[i]] = 1;
  }
}

const rgba = Buffer.allocUnsafe(count * 4);
for (let index = 0; index < count; index += 1) {
  const source = index * 3;
  const target = index * 4;
  rgba[target] = rgb[source];
  rgba[target + 1] = rgb[source + 1];
  rgba[target + 2] = rgb[source + 2];
  rgba[target + 3] = background[index] ? 0 : 255;
}

const encoded = spawnSync('ffmpeg', [
  '-v', 'error', '-f', 'rawvideo', '-pixel_format', 'rgba',
  '-video_size', `${width}x${height}`, '-i', '-', '-frames:v', '1', '-y', output,
], { input: rgba, encoding: null, maxBuffer: width * height * 5 });
if (encoded.status !== 0) throw new Error(encoded.stderr.toString());

const removed = background.reduce((sum, value) => sum + value, 0);
console.log(`${output}: ${width}x${height}, removed ${removed} white-background pixels`);
console.log(`largest enclosed white regions: ${enclosedSizes.sort((a, b) => b - a).slice(0, 12).join(', ')}`);
