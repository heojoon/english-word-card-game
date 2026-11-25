import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const originalPath = path.join(root, 'content/world-eleven-vocabulary.json');
assert.ok(fs.existsSync(originalPath), 'World Eleven curated source is required');
const source = JSON.parse(fs.readFileSync(originalPath, 'utf8'));
const generatedPath = path.join(root, 'world-eleven-content.js');
const before = fs.readFileSync(generatedPath, 'utf8');
execFileSync(process.execPath, ['scripts/generate-world-eleven-content.mjs', '--check'], { cwd: root, stdio: 'pipe' });
assert.equal(fs.readFileSync(generatedPath, 'utf8'), before, '--check must not mutate runtime content');
const context = { window: {} };
vm.runInNewContext(before, context);
const runtime = context.window.WORDORIA_WORLD_ELEVEN_CONTENT;
assert.ok(runtime && Array.isArray(runtime.sources), 'Browser global and source metadata required');
const sourceIds = new Set(source.sources.map(item => item.id));
for (const item of source.sources) {
  assert.match(item.url, /^https:\/\//);
  assert.equal(item.checkedAt, '2026-11-22');
  assert.ok(item.scope && item.title);
}
assert.ok(source.policy.cefrCaveat && source.policy.translation);
assert.equal(source.policy.phonetics, 'not-provided');
assert.ok(source.policy.displayLabel);
for (const level of ['elementary', 'middle']) {
  const original = source.levels[level];
  const items = new Map(original.items.map(item => [item.id, item]));
  assert.equal(items.size, original.items.length, `${level}: duplicate source IDs`);
  assert.ok(items.size >= 250 && items.size <= 400, `${level}: curated pool must contain 250–400 items`);
  const seen = new Set();
  for (const item of items.values()) {
    assert.equal(item.level, level);
    assert.ok(item.topic && item.difficulty);
    assert.equal(typeof item.authoredExtension, 'boolean');
    assert.ok(item.en.trim() && item.ko.trim());
    assert.ok(item.sourceIds.length >= 2);
    assert.ok(item.sourceIds.every(id => sourceIds.has(id)));
    assert.ok(item.evidence.length && item.evidence.every(e => sourceIds.has(e.sourceId) && e.headwords.length && e.locator));
    for (const evidence of item.evidence) {
      assert.equal(evidence.headwordLocations.length, evidence.headwords.length);
      for (const [index, reference] of evidence.headwordLocations.entries()) {
        assert.equal(reference.headword, evidence.headwords[index]);
        assert.ok(Number.isInteger(reference.pdfPage) && reference.pdfPage > 0);
        if (evidence.sourceId === 'cambridge-starters-2025') {
          assert.ok(reference.pdfPage >= 4 && reference.pdfPage <= 7, 'Elementary evidence must use the Starters section, not higher levels');
        }
      }
    }
    assert.equal(item.phonetics, null, 'No verified phonetic transcription is provided');
    assert.equal(item.displayLabel, /\s/.test(item.en) ? '표현' : '단어');
  }
  assert.equal(original.stages.length, 44);
  assert.equal(runtime.levels[level].length, 44);
  for (let index = 0; index < 44; index++) {
    const stage = original.stages[index];
    const output = runtime.levels[level][index];
    assert.equal(stage.number, index + 1);
    assert.equal(output.number, stage.number);
    assert.equal(output.name, stage.name);
    assert.equal(stage.itemIds.length, 30);
    assert.equal(output.words.length, 30);
    const english = new Set(), korean = new Set();
    for (let i = 0; i < 30; i++) {
      const entry = items.get(stage.itemIds[i]);
      assert.ok(entry, `${level}/${stage.number}: missing item`);
      seen.add(entry.id);
      const row = output.words[i];
      assert.equal(row.length, 3);
      assert.ok(row.every(text => typeof text === 'string' && text.trim()));
      assert.deepEqual(Array.from(row), [entry.en, entry.displayLabel, entry.ko]);
      assert.ok(['단어', '표현'].includes(row[1]), 'The visible classification label must never reveal the English answer');
      english.add(row[0].toLowerCase());
      korean.add(row[2]);
    }
    assert.equal(english.size, 30, `${level}/${stage.number}: duplicate English answer`);
    assert.equal(korean.size, 30, `${level}/${stage.number}: duplicate Korean answer`);
  }
  assert.equal(seen.size, items.size, `${level}: every curated item must be assigned`);
  console.log(`${level}: 44 stages × 30 = 1320 assignments; ${items.size} curated items; provenance and distinct answers verified`);
}
assert.notEqual(JSON.stringify(runtime.levels.elementary), JSON.stringify(runtime.levels.middle));
console.log('World Eleven content verification passed.');
