import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script, createContext } from 'node:vm';
import test from 'node:test';

const source = readFileSync(new URL('../crystal-game.js', import.meta.url), 'utf8');
const body = source.match(/  function advanceKeurus\(\)\{[\s\S]*?\n  \}/)?.[0];
assert.ok(body, 'Keurus battle update exists');

function encounter() {
  const events = [];
  const run = {
    keurus: true, elapsed: 0, iceTimeActive: false, timeStopped: false, attack: false,
    keurusStompAt: 30000, keurusConfuseAt: 20000, keurusStompVisual: false,
    hp: 3, matched: new Set([1]), selectedKo: 2, selectedEn: 2,
    matchKo: [{ id: 1 }, { id: 2 }, { id: 3 }],
    matchEn: [{ id: 3 }, { id: 2 }, { id: 1 }],
  };
  const context = createContext({
    run, render: () => events.push('render'), shuffle: cards => [...cards].reverse(),
    persistStoryBattleVitals: () => events.push('persist'),
    storyVitalsMarkup: () => '<b>HP</b>',
    finishBattle: (...args) => events.push(['finish', ...args]),
    document: {
      dispatchEvent: () => events.push('haptic'),
      querySelector: () => null,
    },
    CustomEvent: class {},
  });
  new Script(`${body}\nthis.advanceKeurus=advanceKeurus;`).runInContext(context);
  return { run, events, advance: context.advanceKeurus };
}

test('two-head feint reshuffles only unmatched pairs and preserves answer IDs', () => {
  const battle = encounter();
  battle.run.elapsed = 20000;
  battle.advance();
  assert.deepEqual(Array.from(battle.run.matchKo, card => card.id), [1, 3, 2]);
  assert.deepEqual(Array.from(battle.run.matchEn, card => card.id), [2, 3, 1]);
  assert.equal(battle.run.selectedKo, null);
  assert.equal(battle.run.selectedEn, null);
  assert.equal(battle.run.keurusConfuseAt, 40000);
});

test('stone stomp warns first, then damages once at contact', () => {
  const battle = encounter();
  battle.run.elapsed = 29300;
  battle.advance();
  assert.equal(battle.run.keurusStompVisual, true);
  assert.equal(battle.run.hp, 3);
  battle.run.elapsed = 30000;
  battle.advance();
  assert.equal(battle.run.hp, 2);
  assert.equal(battle.run.keurusStompAt, 60000);
  battle.advance();
  assert.equal(battle.run.hp, 2);
  assert.ok(battle.events.includes('persist'));
});

test('Ice Time and pet time stop hold both skill cycles', () => {
  const battle = encounter();
  battle.run.elapsed = 30000;
  battle.run.iceTimeActive = true;
  battle.advance();
  assert.equal(battle.run.hp, 3);
  assert.equal(battle.run.keurusConfuseAt, 20000);
  battle.run.iceTimeActive = false;
  battle.run.timeStopped = true;
  battle.advance();
  assert.equal(battle.run.hp, 3);
  battle.run.timeStopped = false;
  battle.advance();
  assert.equal(battle.run.hp, 2);
});

test('SD strips keep contiguous RGBA cells, transparent review gaps and final down hold', () => {
  const root = new URL('../assets/monsters/world-7a/keurus/', import.meta.url);
  for (const [action, count] of [['idle', 2], ['attack', 3], ['hit', 3]]) {
    const stem = `keurus-sd-${action}-strip`;
    const manifest = JSON.parse(readFileSync(new URL(`${stem}.json`, root), 'utf8'));
    const strip = readFileSync(new URL(`${stem}.png`, root));
    const spaced = readFileSync(new URL(`review/${action}-source-50px.png`, root));
    assert.equal(strip.readUInt32BE(16), count * 512);
    assert.equal(strip.readUInt32BE(20), 320);
    assert.equal(strip[25], 6, 'RGBA color type');
    assert.equal(spaced.readUInt32BE(16), count * 512 + (count - 1) * 50);
    assert.equal(manifest.sourceFrameGapPx, 50);
    assert.deepEqual(manifest.anchor, { x: 0.5, y: 0.975 });
  }
  const attack = JSON.parse(readFileSync(new URL('keurus-sd-attack-strip.json', root), 'utf8'));
  const hit = JSON.parse(readFileSync(new URL('keurus-sd-hit-strip.json', root), 'utf8'));
  assert.equal(attack.frames[2].hit, true);
  assert.equal(hit.frames[2].name, 'complete-knockdown');
  assert.equal(hit.frames[2].hold, true);
});
