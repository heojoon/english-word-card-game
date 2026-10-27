import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const code = await readFile(new URL('../crystal-game.js', import.meta.url), 'utf8');

function setup(kind) {
  const sounds = [], classes = new Set(), claims = [], pending = [];
  const button = {
    classList: { contains: x => classes.has(x), add: x => classes.add(x), remove: (...xs) => xs.forEach(x => classes.delete(x)) },
    style: { setProperty() {} }, setAttribute() {}, offsetWidth: 100,
    parentElement: { querySelector: () => ({}), querySelectorAll: () => [{ classList: { add() {} } }, { classList: { add() {} } }] }
  };
  const context = vm.createContext({
    run: { clear: true, chest: false, chestClicks: 0, chestKind: kind, result: { game_score_id: 1 } },
    emitAudio: (...args) => sounds.push(args),
    document: { dispatchEvent() {} }, CustomEvent: class {},
    claimChestReward: async () => { claims.push('crystal'); return 25; },
    claimStoryItemReward: async () => { claims.push('item'); return { potion_count: 1 }; },
    setTimeout: fn => pending.push(fn), render() {}, toast() {}, console: { error() {} }
  });
  vm.runInContext(code.slice(code.indexOf('  async function tapChest('), code.indexOf('  function receiveReward(')), context);
  return { context, button, sounds, claims, pending };
}

for (const kind of ['crystal', 'item']) {
  test(`${kind} chest taps and opening play once, with no extra claim during opening`, async () => {
    const { context, button, sounds, claims, pending } = setup(kind);
    await context.tapChest(button);
    await context.tapChest(button);
    assert.deepEqual(sounds, [['CHEST_TAP', 'sfx'], ['CHEST_TAP', 'sfx']]);
    const opening = context.tapChest(button);
    await context.tapChest(button);
    assert.deepEqual(sounds.slice(2), [['CHEST_TAP', 'sfx'], ['CHEST_OPEN', 'sfx']]);
    assert.deepEqual(claims, [kind]);
    pending.shift()();
    await opening;
    assert.equal(context.run.resultStep, 'reward');
    await context.tapChest(button);
    assert.equal(sounds.length, 4);
  });
}

test('unavailable or already claimed chests stay silent', async () => {
  for (const override of [{ clear: false }, { chest: true }, { result: null }]) {
    const { context, button, sounds } = setup('crystal');
    Object.assign(context.run, override);
    await context.tapChest(button);
    assert.equal(sounds.length, 0);
  }
});
