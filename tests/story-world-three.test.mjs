import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
const catalog=JSON.parse(readFileSync(new URL('../content/catalog.json',import.meta.url),'utf8'));
function loadBattleEntry(c){
  Object.assign(c,{selectedCharacter:{id:'hero',class:'mage'},run:null,pendingStoryRun:null,
    timerId:null,nextTimer:null,clearInterval(){},clearTimeout(){},removeBattleReward(){},
    levelReady:()=>true,storyEntryAllowed:()=>true,storyVitals:()=>({hp:2,hpMax:2,mp:2,mpMax:2}),
    stageCleared:()=>false,prepareQuestion(){},closeDialog(){},tick(){},reducedMotion:()=>false,
    bossAttackSteps:()=>1,startRoyalSlimeBattle(){c.slimeStarted=true;},go(page){c.page=page;},
    buildQuestionDeck:stage=>Array.from({length:stage.questionCount},()=>({}))});
  vm.runInContext(source.slice(source.indexOf('  function startBattle('),source.indexOf('  function prepareQuestion(')),c);
  vm.runInContext(source.slice(source.indexOf('  function startStoryStage('),source.indexOf('  function renderStages(')),c);
}
function setup(){
  let level='middle';
  const c=vm.createContext({stages:structuredClone(catalog.stages),learningLevel:()=>level,stageLevel:stage=>stage.learningLevel||'middle',records:[],accountMode:false,localHost:false,nativeApp:false});
  vm.runInContext(source.slice(source.indexOf('  const storyStages = ['),source.indexOf('  const storyStageKey='))+ '\nthis.storyStages=storyStages;this.storyWorlds=storyWorlds;',c);
  vm.runInContext(source.slice(source.indexOf('  function stageRecordName('),source.indexOf('  function earnedCoins(')),c);
  c.configureStoryContent();
  return {c,switchLevel(value){level=value;c.configureStoryContent();}};
}
test('world 3 unlocks after world 2 and advances each stage using separate records',()=>{
  const {c}=setup();
  const first=c.storyStages.findIndex(stage=>stage.key==='story-ch3-1');
  assert.equal(c.storyStageUnlocked(first),false);
  c.records.push({stage:c.stageRecordName('story-ch2-7'),cleared:true});
  assert.equal(c.storyStageUnlocked(first),true);
  assert.equal(c.storyStageUnlocked(first+1),false);
  c.records.push({stage:c.stageRecordName('story-ch3-1'),cleared:true});
  assert.equal(c.storyStageUnlocked(first+1),true);
  assert.equal(c.stageCleared('story-ch3-2'),false);
});
test('world 3 preserves progress on learning-level changes and uses matching vocabulary',()=>{
  const {c,switchLevel}=setup();
  const recordName=c.stageRecordName('story-ch3-1');
  c.records.push({stage:recordName,cleared:true});
  switchLevel('elementary');
  assert.equal(c.stageRecordName('story-ch3-1'),recordName);
  assert.equal(c.stageCleared('story-ch3-1'),true);
  assert.equal(c.storyStageUnlocked(c.storyStages.findIndex(stage=>stage.key==='story-ch3-2')),true);
  for(const stage of c.storyStages.filter(stage=>stage.chapter===3)){
    const content=c.stages[stage.key];
    assert.equal(content.learningLevel,'elementary');
    assert.ok(content.words.length>=4);
    assert.equal(content.guardian,false);
    assert.equal(content.questionCount,content.blackDragon?60:25);
  }
});

test('the cave stage unlocks after the temple clear and keeps that progress across levels',()=>{
  const {c,switchLevel}=setup();
  const caveIndex=c.storyStages.findIndex(stage=>stage.key==='story-ch3-8');
  assert.ok(caveIndex>0);
  assert.equal(c.storyStageUnlocked(caveIndex),false);
  c.records.push({stage:c.stageRecordName('story-ch3-7'),cleared:true});
  assert.equal(c.storyStageUnlocked(caveIndex),true);
  const caveRecord=c.stageRecordName('story-ch3-8');
  c.records.push({stage:caveRecord,cleared:true});
  switchLevel('elementary');
  assert.equal(c.stageRecordName('story-ch3-8'),caveRecord);
  assert.equal(c.stageCleared('story-ch3-8'),true);
  assert.equal(c.storyStageUnlocked(caveIndex),true);
  assert.equal(c.storyWorlds[2].positions.length,c.storyStages.filter(stage=>stage.chapter===3).length);
});


test('world 3 builds level questions for ordinary stages and 60 for the cave boss',()=>{
  const {c,switchLevel}=setup();
  c.shuffle=items=>items.slice();
  c.window={};vm.runInContext(readFileSync(new URL('../black-dragon-boss.js',import.meta.url),'utf8'),c);
  vm.runInContext(source.slice(source.indexOf('  function buildQuestionDeck('),source.indexOf('  async function loadAll(')),c);
  for(const level of ['middle','elementary']){
    switchLevel(level);
    for(const stage of c.storyStages.filter(stage=>stage.chapter>=3)){
      const content=c.stages[stage.key],expected=content.blackDragon?60:level==='middle'?35:25;
      assert.equal(content.questionCount,expected);
      const deck=c.buildQuestionDeck(content);
      assert.equal(deck.length,expected);
      assert.equal(deck.length%5,0);
      assert.equal(new Set(deck.slice(0,Math.min(content.words.length,expected)).map(question=>question.entry[0])).size,Math.min(content.words.length,expected));
    }
  }
});

test('world 3 stage 7 entry and retry start ordinary battles at both learning levels',()=>{
  const {c,switchLevel}=setup();loadBattleEntry(c);c.storyStageUnlocked=()=>true;
  for(const level of ['middle','elementary']){
    switchLevel(level);
    c.startStoryStage('story-ch3-7');
    assert.equal(c.page,'battle');assert.equal(c.slimeStarted,undefined);
    assert.equal(c.run.story,true);assert.equal(c.run.boss,undefined);assert.equal(c.run.guardian,undefined);
    assert.equal(c.run.deck.length,level==='middle'?35:25);
    c.run.done=true;c.startBattle();
    assert.equal(c.run.done,false);assert.equal(c.run.boss,undefined);assert.equal(c.slimeStarted,undefined);
  }
});

test('battle entry keeps the slime restricted to world 1 and preserves other world bosses',()=>{
  const {c}=setup();loadBattleEntry(c);c.window={};
  for(const file of ['guardian-boss.js','black-dragon-boss.js'])vm.runInContext(readFileSync(new URL(`../${file}`,import.meta.url),'utf8'),c);
  c.selectedStage='story-lv6';c.startBattle();assert.equal(c.slimeStarted,true);
  c.slimeStarted=false;c.selectedStage='story-ch2-7';c.startBattle();
  assert.equal(c.slimeStarted,false);assert.equal(c.run.guardian,true);assert.equal(c.run.blackDragon,undefined);
  c.selectedStage='story-ch3-8';c.startBattle();
  assert.equal(c.slimeStarted,false);assert.equal(c.run.blackDragon,true);
});
