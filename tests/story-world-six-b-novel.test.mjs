import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {parseWorldSixBNarrative} from '../scripts/generate-story-novel.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('World 6B narrative parser preserves scenes and separates the bandit decision',()=>{
  const prologue=parseWorldSixBNarrative(read('assets/novel/world-6b-1-prologue.md'));
  const ending=read('assets/novel/world-6b-midboss-end.md');
  const prelude=parseWorldSixBNarrative(ending,{section:'prelude'});
  const release=parseWorldSixBNarrative(ending,{section:'release'});
  const arrest=parseWorldSixBNarrative(ending,{section:'arrest'});
  assert.equal(prologue[0].speaker,'내레이션');
  assert.match(prologue.at(-1).text,/일반 전투 진입/);
  assert.equal(prelude.at(-1).speaker,'바이올렛');
  assert.ok(release.some(line=>line.text==='두고 보자…'));
  assert.ok(arrest.some(line=>line.text.includes('수도로 향한다')));
  assert.ok([...prelude,...release,...arrest].every(line=>line.backgroundPath==='assets/environments/world-6b/01-capital-road-battle.webp'));
  const chiefLines=[...parseWorldSixBNarrative(read('assets/novel/world-6b-midboss-start.md')),...prelude,...release,...arrest].filter(line=>line.className==='bandit-chief');
  assert.ok(chiefLines.length>0);
  assert.ok(chiefLines.every(line=>line.artPath==='assets/novel/characters/char_bandit_chief_world6b_standing.png'));
  assert.ok(readFileSync(new URL('../assets/novel/characters/char_bandit_chief_world6b_standing.png',import.meta.url)).length>100_000);
});

test('generated novels include Elliot trial, standing CG and survival goal',()=>{
  const context={window:{}};
  vm.runInNewContext(read('story-novel.js'),context);
  const novels=context.window.WORDORIA_NOVELS;
  for(const key of ['world6bPrologue','world6bMidbossStart','world6bMidbossEndPrelude','world6bMidbossEndRelease','world6bMidbossEndArrest','world6bCapital','world6bBossStart','world6bBossEnd'])assert.ok(novels[key]?.length,key);
  assert.ok(novels.world6bMidbossStart.some(line=>line.speaker==='도적 대장'&&line.artPath==='assets/novel/characters/char_bandit_chief_world6b_standing.png'));
  assert.ok(novels.world6bCapital.some(line=>line.text.includes('기사단장 엘리엇')));
  assert.ok(novels.world6bBossStart.some(line=>line.text.includes('1분 30초 동안 견뎌')));
  assert.ok(novels.world6bBossStart.filter(line=>line.speaker==='엘리엇').every(line=>line.artPath==='assets/novel/characters/char_elliot_world6b_standing.webp'));
  assert.ok(!novels.world6bBossStart.some(line=>line.text.startsWith('- HP')));
});

test('World 6B routes stage 1, stage 10 victory, and stage 20 victory through their stories',()=>{
  const source=read('crystal-game.js');
  assert.match(source,/stage\.chapter===6&&\[1,10,20\]\.includes\(stage\.number\)/);
  assert.match(source,/storyStage\?\.chapter===6&&storyStage\?\.number===10\?'storyChapterSixBMidbossEnd'/);
  assert.match(source,/storyStage\?\.chapter===6&&storyStage\?\.number===20\?'storyChapterSixBBossEnd'/);
  assert.match(source,/data-action="world-six-b-midboss-choice"/);
  assert.match(source,/stage.number===10\?'storyChapterSixBMidbossStart':'storyChapterSixBCapital'/);
});
