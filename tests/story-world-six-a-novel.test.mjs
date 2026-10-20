import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseWorldSixANarrative} from '../scripts/generate-story-novel.mjs';

const read=name=>readFileSync(new URL(`../assets/novel/${name}`,import.meta.url),'utf8');

test('World 6A source scenarios parse into the five playable story beats',()=>{
  const prologue=parseWorldSixANarrative(read('world-6a-1-prologue.md'));
  const midbossStart=parseWorldSixANarrative(read('world-6a-midboss-start.md'));
  const midbossEnd=parseWorldSixANarrative(read('world-6a-midboss-end.md'));
  const bossStart=parseWorldSixANarrative(read('world-6a-boss-start.md'));
  assert.match(prologue.at(-1).text,/침입자|…/);
  assert.ok(midbossStart.some(line=>line.speaker==='심연의 골렘'));
  assert.ok(midbossEnd.some(line=>line.text.includes('데스 익스플로전')));
  assert.ok(bossStart.some(line=>line.speaker==='모르가나'));
});

test('World 6A final choice keeps the kill and spare endings separate',()=>{
  const source=read('world-6a-boss-end.md');
  const prelude=parseWorldSixANarrative(source,{section:'prelude'});
  const kill=parseWorldSixANarrative(source,{section:'kill'});
  const spare=parseWorldSixANarrative(source,{section:'spare'});
  assert.ok(prelude.some(line=>line.text.includes('내 패배를 인정하마')));
  assert.ok(kill.some(line=>line.text.includes('저주한다')));
  assert.ok(spare.some(line=>line.text.includes('검은 호수')));
  assert.ok(!kill.some(line=>line.text.includes('검은 호수')));
  assert.ok(!kill.some(line=>line.text.includes('HP , MP')));
  assert.ok(!spare.some(line=>line.text.includes('저주한다')));
});

test('World 6A stage 1, 10 and 20 route through their story pages',()=>{
  const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
  assert.match(source,/stage\.chapter===7&&\[1,10,20\]\.includes\(stage\.number\)/);
  assert.match(source,/storyChapterSixAMidbossEnd/);
  assert.match(source,/storyChapterSixABossChoice/);
  assert.match(source,/world-six-a-ending-choice/);
});
