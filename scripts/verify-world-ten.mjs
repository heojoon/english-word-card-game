import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
const extract=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
function content(level='middle'){
  const c=vm.createContext({window:{},document:{createElement:()=>({}),head:{appendChild(){}},currentScript:null,documentElement:{classList:{contains:()=>false}}},learningLevel:()=>level,stageLevel:s=>s.learningLevel||'middle',shuffle:a=>a.slice().reverse(),chosenStoryBranch:()=> '6A'});
  for(const file of ['stages.js','elementary-stages.js','stage6.js','stage7.js','stage8.js','stage15.js','stage35.js'])vm.runInContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),c);
  c.window.QUIZ_STAGES.elementary={learningLevel:'elementary',words:[['apple','n','사과'],['book','n','책'],['cat','n','고양이'],['dog','n','개']]};
  vm.runInContext('const stages=window.QUIZ_STAGES;'+extract('  const storyStages = [','  const storyStageKey=')+'\nconfigureStoryContent();globalThis.catalog=stages;globalThis.worlds=storyWorlds;globalThis.story=storyStages;',c);
  return c;
}
test('World 10 registers 40 main stages plus 3 optional stages, 30 Type C questions and shared records',()=>{
  const records=[];
  for(const level of ['middle','elementary']){
    const c=content(level),world=c.worlds.find(w=>w.displayNumber==='10');assert.ok(world);
    const main=c.story.filter(s=>s.chapter===13&&!s.sideStory),side=c.story.filter(s=>s.chapter===13&&s.sideStory);
    assert.equal(main.length,40);assert.equal(side.length,3);assert.equal(world.positions.length,43);
    for(const [i,s] of [...main,...side].entries()){
      const cfg=c.catalog[s.key];assert.equal(cfg.questionCount,30);assert.equal(cfg.questionType,'C');assert.equal(cfg.learningLevel,level);assert.ok(cfg.words.length>=4);
      if(level==='middle')records.push(cfg.recordName);else assert.equal(cfg.recordName,records[i]);
      if(i>0&&i<40)assert.ok(parseFloat(world.positions[i][1])>parseFloat(world.positions[i-1][1]));
    }
    assert.equal(c.catalog['story-ch10-20'].encounterName,'관측교 수호병기 루멘');
    assert.equal(c.catalog['story-ch10-40'].encounterName,'거짓 별의 지휘관 세이런');
    assert.ok(c.catalog[side.at(-1).key].trainingBossHp>0);
  }
});
test('Optional stages do not gate the main path and World 10 opens on either previous branch',()=>{
  const c=content();Object.assign(c,{localHost:false,nativeApp:false,isAdministrator:()=>false,clears:new Set()});c.stageCleared=key=>c.clears.has(key);
  vm.runInContext(extract('  function storyBranchAllowed(','  function isStoryBranchPreview(')+extract('  function storyStageUnlocked(','\n'),c);
  const unlocked=key=>c.storyStageUnlocked(c.story.findIndex(s=>s.key===key));
  assert.equal(unlocked('story-ch10-1'),false);c.clears.add('story-ch9-30');assert.equal(unlocked('story-ch10-1'),true);
  const side=c.story.filter(s=>s.chapter===13&&s.sideStory);
  assert.equal(unlocked(side[0]?.key),false);c.clears.add('story-ch10-20');
  assert.equal(unlocked('story-ch10-21'),true);assert.equal(unlocked(side[0].key),true);assert.equal(unlocked(side[1].key),false);
  c.clears.add(side[0].key);assert.equal(unlocked(side[1].key),true);assert.equal(unlocked('story-ch10-40'),false);
});
test('World 10 HP bosses use contact damage and Ice Time without World 9 training skills',()=>{
  const c=vm.createContext({window:{}});vm.runInContext(readFileSync(new URL('../world-nine-boss.js',import.meta.url),'utf8'),c);
  vm.runInContext(readFileSync(new URL('../world-ten-boss.js',import.meta.url),'utf8'),c);
  for(const [kind,hp] of [['lumen',200],['seiran',240],['astra',180]]){
    const boss=kind==='astra'?c.window.WORDORIA_WORLD_NINE_BOSS:c.window.WORDORIA_WORLD_TEN_BOSS;
    const s={...(kind==='astra'?boss.reset(30,4):boss.reset(kind,4)),observatoryBoss:kind,trainingKind:kind,bossHp:hp,bossMaxHp:hp,elapsed:0,correct:0,hp:3};
    const base={entry:['signal','n','신호'],hidden:[2],answer:'g'};assert.equal(c.window.WORDORIA_WORLD_NINE_BOSS.question(s,base.entry,base),base);
    s.iceTimeActive=true;boss.advance(s,1000);assert.equal(s.elapsed,0);
    boss.answer(s,true,200);assert.equal(s.iceTimeActive,false);assert.equal(s.bossHp,hp);
    boss.advance(s,199);assert.equal(s.bossHp,hp);boss.advance(s,1);assert.equal(s.bossHp,hp-4);
    boss.advance(s,1000);boss.damage(s,hp);assert.equal(s.bossHp,0);assert.equal(s.skillQueue.length,0);assert.equal(s.examPending||0,0);
    assert.ok(boss.advance(s,500).includes('victory'));s.done=true;assert.equal(boss.advance(s,500).length,0);
  }
  assert.match(source,/run\.trainingBoss&&!run\.observatoryBoss&&clear\?await rpc\('claim_world_nine_boss_result'/);
});
test('World 10 main and optional story phases are generated from their source files',()=>{
  const c=vm.createContext({window:{}});vm.runInContext(readFileSync(new URL('../story-novel.js',import.meta.url),'utf8'),c);
  for(const phase of ['Prologue','MidbossStart','MidbossEnd','BossStart','BossEnd','ExtraStart','ExtraEnd']){
    const lines=c.window.WORDORIA_NOVELS[`world10${phase}`];assert.ok(lines?.length>5,phase);
    assert.ok(lines.every(line=>line.backgroundPath==='assets/story/chapter-10-observatory-map.webp'));
  }
});
