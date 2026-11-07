import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
const extract=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
function content(level='middle'){
  const c=vm.createContext({window:{},document:{createElement:()=>({}),head:{appendChild(){}},currentScript:null,documentElement:{classList:{contains:()=>false}}},learningLevel:()=>level,stageLevel:s=>s.learningLevel||'middle',shuffle:a=>a.slice().reverse(),chosenStoryBranch:()=> '6A'});
  for(const file of ['stages.js','elementary-stages.js','stage6.js','stage7.js','stage8.js','stage15.js','stage35.js'])vm.runInContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),c);
  c.window.QUIZ_STAGES['creator:elementary-survival']={name:'day.1',learningLevel:'elementary',creator:true,mapId:'elementary-survival',words:[['apple','n','사과'],['book','n','책'],['cat','n','고양이'],['dog','n','개'],['egg','n','달걀'],['fish','n','물고기']]};
  vm.runInContext('const stages=window.QUIZ_STAGES;'+extract('  const storyStages = [','  const storyStageKey=')+'\nconfigureStoryContent();globalThis.catalog=stages;globalThis.worlds=storyWorlds;globalThis.story=storyStages;',c);
  return c;
}
test('World 9 has 30 top-down stages and shares World 8 ordinary question settings at both levels',()=>{
  const records=[];
  for(const level of ['middle','elementary']){
    const c=content(level),world=c.worlds.find(w=>w.displayNumber==='9'),stages=c.story.filter(s=>s.chapter===12);
    assert.ok(world,'World 9 is registered');assert.equal(world.name,'새벽의 수련원');assert.equal(stages.length,30);assert.equal(world.positions.length,30);
    for(const stage of stages){
      const config=c.catalog[stage.key];assert.equal(stage.key,`story-ch9-${stage.number}`);
      assert.equal(config.storyChapter,12);assert.equal(config.questionType,'C');assert.equal(config.questionTimeMs,6000);assert.equal(config.learningLevel,level);assert.ok(config.words.length>=4);
      const hp=stage.number===15?200:stage.number===30?220:0;
      assert.equal(config.questionCount,hp||40);assert.equal(config.trainingBossHp,hp);
      if(level==='middle')records.push(config.recordName);else assert.equal(config.recordName,records[stage.number-1]);
      assert.match(config.recordName,new RegExp(`^스토리 9장 ${stage.number} · 새벽의 수련원$`));
      const p=world.positions[stage.number-1];assert.ok(parseFloat(p[0])>0&&parseFloat(p[0])<100);assert.ok(parseFloat(p[1])>0&&parseFloat(p[1])<100);
      if(stage.number>1)assert.ok(parseFloat(p[1])>parseFloat(world.positions[stage.number-2][1]));
    }
    if(level==='middle')assert.equal(new Set(stages.map(s=>c.catalog[s.key].vocabularyDay)).size,30);
  }
});
test('World 9 opens after World 8 on either branch and keeps sequential stage locks',()=>{
  const c=content();Object.assign(c,{accountMode:false,localHost:false,nativeApp:false,isAdministrator:()=>false,branch:'6A',clears:new Set()});
  c.chosenStoryBranch=()=>c.branch;c.stageCleared=key=>c.clears.has(key);
  vm.runInContext(extract('  function storyBranchAllowed(','  function isStoryBranchPreview(')+extract('  function storyStageUnlocked(','\n'),c);
  const first=c.story.findIndex(s=>s.key==='story-ch9-1');assert.notEqual(first,-1);
  for(const branch of ['6A','6B']){c.branch=branch;c.clears.clear();assert.equal(c.storyStageUnlocked(first),false);c.clears.add('story-ch8-30');assert.equal(c.storyStageUnlocked(first),true);assert.equal(c.storyStageUnlocked(first+1),false);c.clears.add('story-ch9-1');assert.equal(c.storyStageUnlocked(first+1),true);}
});
