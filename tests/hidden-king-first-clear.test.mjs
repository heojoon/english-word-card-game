import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
function setup(){
  const timers=[],hero={id:'hero',coins:10};
  const c=vm.createContext({run:null,localMode:true,dbOnline:true,selectedCharacter:hero,selectedStage:'story-ch5-9',player:'learner',demoState:{characters:[hero],records:[],inventory:[]},shopItems:[{id:77,code:'pet_prism_guardian_dragon'}],records:[],performance:{now:()=>0},setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length;},nextTimer:0,document:{dispatchEvent(){}},CustomEvent:class{},render(){},speak(){},setHeroAttackTravel(){},battleContactDelay:()=>200,storyAttackDuration:()=>900,$:()=>null,saveDemo(){},loadCharacterExtras:async()=>{},royalSlimeTime:n=>String(n),eaglePairHintMarkup:()=>'',storyBattleActions:()=>'',battleHeroMarkup:()=>'',iceTimeEffectMarkup:()=>'',esc:String,num:String,deployedAssetUrl:String,stages:{'story-ch5-9':{}},shuffle:a=>a,buildQuestionDeck:()=>Array.from({length:30},(_,i)=>({entry:['word'+i,'','뜻'+i]}))});
  vm.runInContext(source.slice(source.indexOf('  // Hidden access is durable'),source.indexOf('  function initializeBattlePet(')),c);
  c.run={hiddenKind:'fever',hiddenSession:'session',storyCharacterId:'hero',hiddenRound:0,hiddenRoundCounts:[],hiddenRoundStartCount:0,feverCollected:0,storyTimeLimit:60000,elapsed:60000,bossDamage:0,correct:0,deck:[],reason:'hidden-complete'};
  c.timers=timers;return c;
}
test('hidden access is persistent, shared across learning levels, and only replaces stages 9/19',async()=>{
  const c=setup();await c.loadWorldFiveHidden();assert.equal(c.worldFiveHiddenKind('story-ch5-9'),null);
  c.demoState.worldFiveHiddenUnlocked=true;await c.loadWorldFiveHidden();
  assert.equal(c.worldFiveHiddenKind('story-ch5-9'),'fever');assert.equal(c.worldFiveHiddenKind('story-ch5-19'),'king');assert.equal(c.worldFiveHiddenKind('story-ch5-7'),null);
});
test('five one-minute rounds require 60/70/80/90/100; failure preserves every collected crystal',()=>{
  for(let failed=0;failed<5;failed++){
    const c=setup();let ended=0;c.finishBattle=(clear,reason)=>{assert.equal(clear,true);assert.equal(reason,'hidden-target-missed');ended++;};
    let total=0;
    for(let round=0;round<=failed;round++){
      total+=60+round*10-(round===failed?1:0);c.run.feverCollected=total;c.run.elapsed=(round+1)*60000;c.hiddenFeverRoundComplete();
      if(round<failed)assert.equal(c.run.storyTimeLimit,(round+2)*60000);
    }
    assert.equal(ended,1);assert.equal(c.run.feverCollected,total);assert.equal(c.run.hiddenRoundCounts.length,failed+1);
  }
  const c=setup();let ended=0;c.finishBattle=(_,reason)=>{assert.equal(reason,'hidden-complete');ended++;};
  for(let r=0;r<5;r++){c.run.feverCollected+=60+r*10;c.run.elapsed=(r+1)*60000;c.hiddenFeverRoundComplete();}
  assert.equal(ended,1);assert.equal(c.run.feverCollected,400);
});
test('fever partial/failed rewards are repeatable but each session pays once and storage errors roll back',async()=>{
  const c=setup();c.run.feverCollected=59;c.run.hiddenRoundCounts=[59];await c.saveWorldFiveHidden(c.run);
  assert.equal(c.selectedCharacter.coins,69);assert.equal(c.run.result.coins_earned,59);
  c.run.result=null;await c.saveWorldFiveHidden(c.run);assert.equal(c.selectedCharacter.coins,69);assert.equal(c.demoState.records.length,1);
  c.run.hiddenSession='retry';c.run.result=null;c.saveDemo=()=>{throw Error('storage');};await c.saveWorldFiveHidden(c.run);
  assert.equal(c.selectedCharacter.coins,69);assert.ok(c.run.saveRetryable);assert.equal(c.demoState.records.length,1);
});
test('king pays floor(damage*1.5) at five minutes, awards dragon at 500, and never duplicates pet',async()=>{
  for(const damage of [0,499,500,999]){
    const c=setup();Object.assign(c.run,{hiddenKind:'king',bossDamage:damage,elapsed:300000,storyTimeLimit:300000,hiddenRoundCounts:[]});
    await c.saveWorldFiveHidden(c.run);assert.equal(c.run.result.coins_earned,Math.floor(damage*1.5));assert.equal(c.demoState.inventory.length,damage>=500?1:0);
    c.run.result=null;c.run.hiddenSession='second';await c.saveWorldFiveHidden(c.run);assert.equal(c.run.result.coins_earned,0);assert.equal(c.run.result.pet_granted,false);assert.equal(c.demoState.inventory.length,damage>=500?1:0);
  }
  const c=setup();Object.assign(c.run,{hiddenKind:'king',bossDamage:800,elapsed:299999,storyTimeLimit:300000,reason:'leave'});await c.saveWorldFiveHidden(c.run);
  assert.equal(c.run.result.coins_earned,0);assert.equal(c.demoState.inventory.length,0);
});
test('king wrong answers preserve HP and release Ice Time; damage lands on contact, capped at remaining HP',()=>{
  const c=setup();Object.assign(c.run,{hiddenKind:'king',hp:4,bossHp:3,bossAttackSteps:10,deck:c.buildQuestionDeck(),index:0,matched:new Set(),iceTimeActive:true});c.prepareHiddenKingBoard();
  const pick=(side,id)=>c.hiddenKingPick({dataset:{side,id:String(id)}});
  c.run.iceTimeActive=true;pick('ko',0);pick('en',1);assert.equal(c.run.hp,4);assert.equal(c.run.bossDamage,0);assert.equal(c.run.iceTimeActive,false);
  pick('ko',0);pick('en',0);assert.equal(c.run.bossHp,3);assert.equal(c.run.bossDamage,0);
  c.timers.find(t=>t.ms===200).fn();assert.equal(c.run.bossDamage,3);assert.equal(c.run.bossHp,0);
  c.timers.find(t=>t.ms===900).fn();assert.equal(c.run.done,undefined);assert.equal(c.run.locked,false);
});
test('king timer runs for full five minutes even at HP zero; Ice Time freezes countdown',()=>{
  const c=setup();let done=0;c.finishBattle=()=>done++;Object.assign(c.run,{hiddenKind:'king',bossHp:0,storyTimeLimit:300000,elapsed:299000,iceTimeActive:true});
  c.advanceWorldFiveHidden(1000);assert.equal(c.run.elapsed,299000);assert.equal(done,0);
  c.run.iceTimeActive=false;c.advanceWorldFiveHidden(1000);assert.equal(done,1);
});
test('remote save retries preserve session token and use authoritative balance',async()=>{
  const c=setup();c.localMode=false;c.accountMode=true;let calls=0;c.rpc=async(name,args)=>{assert.equal(name,'finish_world_five_hidden');assert.equal(args.p_session_id,'session');calls++;if(calls===1)throw Error('network');return [{game_score_id:1,coins_earned:100,balance:999,pet_granted:false}];};
  await c.saveWorldFiveHidden(c.run);assert.ok(c.run.saveRetryable);await c.saveWorldFiveHidden(c.run);assert.equal(c.accountCrystals,999);assert.equal(c.run.saveError,false);
});
test('completed-world stage seven replay gets 90 seconds of fever without exceeding server spawn bounds',()=>{
  const c=setup();vm.runInContext(source.slice(source.indexOf('  function advanceFeverCrystals('),source.indexOf('  function canActivateMageIceTime(')),c);
  c.selectedStage='story-ch5-7';c.stageCleared=()=>true;Object.assign(c.run,{hiddenKind:null,deck:c.buildQuestionDeck().slice(0,25),storyReplay:true,elapsed:30000,storyTimeLimit:75000,feverWords:[],feverWordSequence:0});
  c.enterFeverTime();assert.equal(c.run.storyTimeLimit,120000);
  for(let i=0;i<300;i++){c.run.elapsed=30000+i*250;c.run.feverNextSpawnAt=0;c.advanceFeverCrystals();}
  assert.equal(c.run.feverWordSequence,Math.ceil(25*3000/550));
});
test('king Ice Time consumes MP, releases on group completion, and a blue potion allows reuse',async()=>{
  const c=setup();Object.assign(c,{equippedPotions:()=>['blue'],potionTypes:{blue:{name:'블루 포션'}},potionInventory:{},persistStoryBattleVitals(){},toast(){}});
  vm.runInContext(source.slice(source.indexOf('  function canActivateMageIceTime('),source.indexOf('  function updateWarriorSlash(')),c);
  vm.runInContext(source.slice(source.indexOf('  async function useStoryPotion('),source.indexOf('  const ROYAL_SLIME_REWARD=')),c);
  c.selectedCharacter.class='mage';Object.assign(c.run,{story:true,hiddenKind:'king',done:false,paused:false,locked:false,fever:false,mp:1,mpMax:1,deck:c.buildQuestionDeck(),index:0});c.prepareHiddenKingBoard();
  c.activateMageIceTime();assert.equal(c.run.mp,0);assert.equal(c.run.iceTimeActive,true);
  c.prepareHiddenKingBoard();assert.equal(c.run.iceTimeActive,false);assert.equal(c.canActivateMageIceTime(),false);
  await c.useStoryPotion(0,{});assert.equal(c.run.mp,1);assert.equal(c.canActivateMageIceTime(),true);c.activateMageIceTime();assert.equal(c.run.iceTimeActive,true);
});

const hidden=source.slice(source.indexOf('  let worldFiveHiddenUnlocked='),source.indexOf('  function prepareHiddenKingBoard()'));
function fixture(overrides={}){
  const context=vm.createContext({localMode:true,demoState:{worldFiveHiddenUnlocked:true,records:[]},player:'tester',selectedCharacter:{id:'one'},dbOnline:true,page:'story',selectedStage:'story-ch5-9',crypto:{randomUUID:()=> 'session'},saveDemo(){},toast(){},clearInterval(){},clearTimeout(){},timerId:null,nextTimer:null,removeBattleReward(){},stages:{'story-ch5-9':{}},buildQuestionDeck:()=>[],performance:{now:()=>0},storyVitals:()=>({hp:3,hpMax:3,mp:3,mpMax:3}),bossAttackSteps:()=>1,advanceFeverCrystals(){},prepareHiddenKingBoard(){},closeDialog(){},go(){},tick(){},...overrides});
  vm.runInContext(hidden,context);
  return {context,run:code=>vm.runInContext(code,context)};
}

test('king can reenter after exit or old consumption; fever stays single entry',async()=>{
  const f=fixture({selectedStage:'story-ch5-19',stages:{'story-ch5-19':{}},demoState:{worldFiveHiddenUnlocked:true,worldFiveHiddenEntries:{tester:['king']},records:[]}});
  await f.run('loadWorldFiveHidden()');
  for(let i=0;i<2;i++){
    assert.equal(f.run("worldFiveHiddenKind('story-ch5-19')"),'king');
    await f.run("startWorldFiveHidden('king')");
    assert.equal(f.run('run.hiddenKind'),'king');
  }
});
test('legacy remote used status cannot hide king',async()=>{
  const f=fixture({localMode:false,rpc:async()=>({unlocked:true,used:['fever','king']})});
  await f.run('loadWorldFiveHidden()');
  assert.equal(f.run("worldFiveHiddenKind('story-ch5-19')"),'king');
  assert.equal(f.run("worldFiveHiddenKind('story-ch5-9')"),null);
});
test('leaving king preserves first-clear reward and another character cannot earn it twice',async()=>{
  const c=setup();
  Object.assign(c.run,{hiddenKind:'king',bossDamage:800,elapsed:299999,storyTimeLimit:300000,reason:'leave'});
  await c.saveWorldFiveHidden(c.run);assert.equal(c.run.result.coins_earned,0);
  Object.assign(c.run,{hiddenSession:'complete',elapsed:300000,reason:'hidden-complete',result:null});
  await c.saveWorldFiveHidden(c.run);assert.equal(c.run.result.coins_earned,1200);assert.equal(c.run.result.pet_granted,true);
  c.demoState.characters.push({id:'two',coins:0});c.selectedCharacter=c.demoState.characters[1];
  Object.assign(c.run,{hiddenSession:'other-hero',storyCharacterId:'two',result:null});
  await c.saveWorldFiveHidden(c.run);assert.equal(c.run.result.coins_earned,0);assert.equal(c.run.result.pet_granted,false);
});
