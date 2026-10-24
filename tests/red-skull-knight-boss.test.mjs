import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,existsSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const window={};vm.runInNewContext(read('red-skull-knight-boss.js'),{window});
const boss=window.WORDORIA_RED_SKULL_KNIGHT,shuffle=list=>[...list].reverse();
const words=Array.from({length:30},(_,i)=>[`word${i}`,'n',`뜻${i}`]);
const state=()=>{const s={...boss.reset(),deck:boss.deck(words,shuffle),index:0,correct:0,hp:4};boss.board(s,shuffle);return s;};
const step=(s,ms,clock=ms)=>Array.from(boss.advance(s,ms,shuffle,clock));
const answer=(s,id)=>{boss.pick(s,'ko',id,420);return boss.pick(s,'en',id,420);};

test('7A final boss contract and unique five-pair boards',()=>{
  assert.equal(boss.HP,180);assert.equal(boss.TIME_MS,330000);assert.equal(boss.INTERVAL_MS,12000);
  const deck=boss.deck(words,shuffle);assert.equal(deck.length,180);
  for(let i=0;i<deck.length;i+=5)assert.equal(new Set(deck.slice(i,i+5).map(x=>x.entry[0])).size,5);
});
test('flame wave shuffles at contact; slash damages once after HP thresholds',()=>{
  const s=state();const before=s.matchKo.map(x=>x.id);s.selectedKo=s.matchKo[0].id;
  step(s,12000);assert.equal(s.knightSkill,'flame-wave');step(s,609);assert.deepEqual(s.matchKo.map(x=>x.id),before);
  assert.ok(step(s,1).includes('shuffle'));assert.notDeepEqual(s.matchKo.map(x=>x.id),before);assert.equal(s.selectedKo,null);assert.equal(s.hp,4);
  step(s,180);s.bossHp=91;s.bossAttackSteps=47;answer(s,s.matchEn[0].id);step(s,420);step(s,300);
  assert.deepEqual(Array.from(s.knightThresholds),[90,45]);assert.equal(s.knightSkill,'flame-slash');
  step(s,609);assert.equal(s.hp,4);assert.ok(step(s,1).includes('trident-hit'));assert.equal(s.hp,3);
  step(s,180);step(s,610);assert.equal(s.hp,2);step(s,180);assert.equal(s.knightQueue.length,0);
});
test('pause and ice freeze clock; wrong answer releases ice; defeat holds third hit frame',()=>{
  const s=state();s.paused=true;step(s,12000);assert.equal(s.knightClock,0);s.paused=false;
  s.iceTimeActive=true;s.knightQueue.push('flame-slash');step(s,1000,0);assert.equal(s.knightClock,0);assert.equal(s.knightSkill,null);
  answer(s,s.matchEn[0].id);step(s,420,0);assert.equal(s.bossHp,179);step(s,300,0);
  boss.pick(s,'ko',s.matchEn[1].id,420);assert.equal(boss.pick(s,'en',s.matchEn[2].id,420),'wrong');assert.equal(s.iceTimeActive,false);
  step(s,500);assert.equal(s.knightSkill,'flame-slash');
  const t=state();t.bossHp=1;answer(t,t.matchEn[0].id);step(t,420);step(t,300);assert.equal(boss.visual(t).action,'hit');assert.equal(boss.visual(t).frame,2);
});
test('sprite files and integration paths are present',()=>{
  const root='assets/monsters/world-7a/red-skull-knight/';
  for(const [action,count] of Object.entries({idle:2,attack:3,hit:3})){
    const stem=`char_red_skull_knight_sd_${action}_strip`,meta=JSON.parse(read(root+stem+'.json'));
    assert.equal(meta.frameCount,count);assert.equal(meta.frameWidth,480);assert.equal(meta.frameHeight,320);
    assert.equal(meta.sourceFrameGapPx,50);assert.ok(existsSync(new URL('../'+root+meta.image,import.meta.url)));
  }
  const game=read('crystal-game.js');assert.match(game,/if\(run.redSkullKnight\)return renderRedSkullKnightBattle/);
  assert.match(game,/claim_red_skull_knight_reward/);assert.match(read('index.html'),/red-skull-knight-boss.js/);
  assert.match(read('scripts/build-web.mjs'),/'red-skull-knight-boss.js'/);
});
