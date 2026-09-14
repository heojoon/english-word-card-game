import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const files = (await readdir(root, { withFileTypes: true }))
  .filter(entry => entry.isFile() && (entry.name === 'stages.js' || /^stage\d+\.js$/.test(entry.name)))
  .map(entry => entry.name)
  .sort((a, b) => {
    if (a === 'stages.js') return -1;
    if (b === 'stages.js') return 1;
    return Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]);
  });
const context = {
  window: {},
  document: { createElement: () => ({}), head: { appendChild: () => {} } }
};

for (const file of files) {
  vm.runInNewContext(await readFile(new URL(file, root), 'utf8'), context, { filename: file });
}

const stages = context.window.QUIZ_STAGES || {};
for (const [key, stage] of Object.entries(stages)) {
  if (!/^s\d+$/.test(key) || !stage?.name || !Array.isArray(stage.words) || !stage.words.length) {
    throw new Error(`Invalid stage definition: ${key}`);
  }
  if (!stage.words.every(row => Array.isArray(row) && row.length === 3 && row.every(value => String(value).trim()))) {
    throw new Error(`Invalid word row in ${key}`);
  }
}
const serializedStages = JSON.stringify(stages);
const catalog = {
  schemaVersion: 1,
  contentVersion: createHash('sha256').update(serializedStages).digest('hex').slice(0, 12),
  stages
};
const contentDir = new URL('../content/', import.meta.url);
await mkdir(contentDir, { recursive: true });
await writeFile(new URL('catalog.json', contentDir), `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`Generated content/catalog.json (${Object.keys(stages).length} stages, version ${catalog.contentVersion}).`);
