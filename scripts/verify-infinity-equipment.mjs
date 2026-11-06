import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const source = readFileSync(new URL('crystal-game.js', root), 'utf8');
const start = source.indexOf('allCharacters=demoState.characters;shopItems=[') + 'allCharacters=demoState.characters;shopItems='.length;
const context = vm.createContext({window: {}});
vm.runInContext(readFileSync(new URL('pet-system.js', root), 'utf8'), context);
const catalog = vm.runInContext(source.slice(start, source.indexOf('];', start) + 1), context);
const parts = ['sword', 'boots', 'helmet', 'cape', 'ring', 'armor', 'staff'];

test('Infinity offers a stronger, more expensive attack item for every Corrupted equipment part', () => {
  const infinity = catalog.filter(item => item.code.startsWith('infinity_'));
  assert.equal(infinity.length, parts.length);
  for (const part of parts) {
    const item = infinity.find(item => item.code === `infinity_${part}`);
    const previous = catalog.find(item => item.code === `corrupted_${part}`);
    assert.ok(item, `missing Infinity ${part}`);
    assert.equal(catalog.filter(candidate => candidate.id === item.id).length, 1, `${part} must have an unused demo ID`);
    assert.equal(item.slot, previous.slot);
    assert.equal(item.stat_key, 'atk');
    assert.ok(item.stat_value > previous.stat_value, `${part} must improve attack`);
    assert.ok(item.price > previous.price, `${part} must cost more`);
    assert.equal(item.rarity, 'rare');
    assert.equal(item.stars, 3);
    assert.ok(existsSync(new URL(item.art_path, root)), `${part} runtime art must exist`);
  }
});

test('account migration matches demo offers and preserves code-based purchase identity', () => {
  const folder = new URL('supabase/migrations/', root);
  const filename = readdirSync(folder).find(name => name.endsWith('_add_infinity_rare_equipment.sql'));
  assert.ok(filename, 'account catalog migration must exist');
  const sql = readFileSync(new URL(filename, folder), 'utf8');
  for (const item of catalog.filter(item => item.code.startsWith('infinity_'))) {
    const row = sql.split('\n').find(line => line.includes(`('${item.code}',`));
    assert.ok(row, `missing account offer ${item.code}`);
    assert.ok(row.includes(`'avatar', ${item.price},`), `${item.code} price mismatch`);
    assert.ok(row.includes(`false, true, '${item.slot}', 'rare', 3, 'atk', ${item.stat_value}, '${item.art_path}'`), `${item.code} equipment contract mismatch`);
  }
  assert.match(sql, /on conflict \(code\) do update/i);
  assert.doesNotMatch(sql, /\b(delete|truncate|drop)\b/i);
});
