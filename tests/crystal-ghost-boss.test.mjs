import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
function setup(attackSteps=1){
  const callbacks=[],pages=[],node=()=>({remove(){},style:{},textContent:'',classList:{add(){},toggle(){}},setAttribute(){}});
  const c=vm.createContext({initializeBattlePet(){},run:null,pendingStoryRun:null,selectedStage:'story-ch3-7',selectedCharacter:{id:'hero',class:'warrior',coins:0},
    storyStages:[1,2,3].map(chapter=>({key:`world${chapter}`,chapter})),stages:Object.fromEntries([1,2,3].map(chapter=>[`world${chapter}`,{words:Array.from({length:40},(_,i)=>[`w${chapter}-${i}`,'명',`뜻${chapter}-${i}`])}])),
    shopItems:[{id:9,code:'pet'}],inventory:[{item_id:9}],itemOwned:item=>c.inventory.some(i=>i.item_id===item.id),storyStageUnlocked:()=>true,levelReady:()=>true,
    localMode:true,player:'테스트',demoState:{records:[],potionInventory:{}},records:[],potionInventory:{blue_potion_count:2},
    storyEntryAllowed:()=>true,storyVitals:()=>({hp:9,hpMax:9,mp:2,mpMax:2}),bossAttackSteps:()=>attackSteps,activatePassive(){},
    timerId:null,nextTimer:null,storyDialogueIndex:0,page:'battle',performance:{now:()=>1000},shuffle:a=>a.slice().reverse(),
    clearInterval(){},clearTimeout(){},cancelSpeech(){},toast(){},render(){},tick(){},speak(){},emitAudio(){},saveDemo(){},persistStoryBattleVitals(){},
    reducedMotion:()=>false,battleContactDelay:()=>420,setTimeout:fn=>{callbacks.push(fn);return callbacks.length;},
    closeDialog(){},go:page=>{c.page=page;pages.push(page);},CustomEvent:class{},$:()=>node(),document:{dispatchEvent(){},querySelector:()=>node()},
    esc:String,num:String,deployedAssetUrl:String,battleHeroMarkup:()=>'',passiveBannerMarkup:()=>'',storyBattleActions:()=>'',eagleEyeEffectMarkup:()=>'',iceTimeEffectMarkup:()=>'',stageRecordName:()=> '스토리 3장 7 · 하늘 수정 성소'
  });c.stages['story-ch3-7']=c.stages.world3;
  vm.runInContext(source.slice(source.indexOf('  const ROYAL_SLIME_REWARD='),source.indexOf('  function renderBattle(){')),c);
  vm.runInContext(source.slice(source.indexOf('  function refreshStorySelections('),source.indexOf('  function syncBGM(')),c);
  vm.runInContext(source.slice(source.indexOf('  function canActivateMageIceTime('),source.indexOf('  function updateWarriorSlash(')),c);
  c.startCrystalGhostBattle();
  const flush=()=>{while(callbacks.length)callbacks.shift()();};
  const pick=(side,id)=>c.royalSlimePick({dataset:{side,id:String(id)}});
  const correct=()=>{const pair=c.run.matchEn.find(item=>!c.run.matched.has(item.id));pick('ko',pair.id);pick('en',pair.id);};
  return {c,callbacks,pages,flush,pick,correct};
}

test('equipped pet shield and dragon heart resolve lethal crystal falls before the defeat check',()=>{
  for(const index of [6,9]){
    const {c,flush}=setup();c.window={};
    vm.runInContext(readFileSync(new URL('../pet-system.js',import.meta.url),'utf8'),c);
    c.run.hp=1;c.run.ghostFallsPending=1;
    c.run.petEffects=c.window.WORDORIA_PETS.attach(c.run,c.window.WORDORIA_PETS.catalog[index],{random:()=>0});
    if(index===6)c.run.petEffects.onCorrect();
    c.crystalGhostFall(c.run);flush();
    assert.equal(c.run.hp,1);assert.equal(c.run.done,false);assert.equal(c.run.ghostFallsPending,0);
    assert.equal(c.run.petShield,false);assert.equal(c.run.petRevived,index===9);
  }
});
test('spirit ownership gates entry and the deck draws 90 unique words from all three worlds',()=>{
  const {c}=setup();assert.equal(c.run.crystalGhost,true);assert.equal(c.run.deck.length,90);assert.equal(c.run.bossHp,90);
  assert.equal(c.run.storyTimeLimit,210000);assert.equal(c.royalSlimeTime(c.royalSlimeRemaining()),'03:30');
  assert.equal(new Set(c.run.deck.map(x=>x.entry[0])).size,90);
  assert.deepEqual([...new Set(c.run.deck.map(x=>x.entry[0][1]))].sort(),['1','2','3']);
  for(let i=0;i<90;i+=5)assert.equal(new Set(c.run.deck.slice(i,i+5).map(x=>x.entry[0])).size,5);
  c.run=null;c.inventory=[];c.startCrystalGhostBattle();assert.equal(c.run,null);
  c.inventory=[{item_id:9}];c.selectedStage='world2';c.startCrystalGhostBattle();assert.equal(c.run,null);
});
test('fall triggers once at 50%, 20%, 10%, damages only at contact and rounds remaining HP up',()=>{
  const {c,callbacks,correct,flush}=setup();
  for(let i=1;i<=90;i++){
    correct();
    if([45,72,81].includes(i)){
      const hp=c.run.hp;callbacks.shift()();assert.equal(c.run.ghostFalling,true);assert.equal(c.run.hp,hp);
      callbacks.shift()();assert.equal(c.run.hp,Math.ceil(hp/2));
    }
    flush();assert.equal(c.run.hp,i<45?9:i<72?5:i<81?3:2);
  }
  assert.deepEqual(Array.from(c.run.ghostThresholds),[50,20,10]);assert.equal(c.run.clear,true);assert.equal(c.run.timePenalty,0);
});
test('hidden boss countdown expires at exactly three minutes thirty seconds',()=>{
  const {c}=setup();c.run.elapsed=209999;c.updateRoyalSlimeClock();assert.equal(c.run.done,false);
  assert.equal(c.royalSlimeTime(c.royalSlimeRemaining()),'00:01');
  c.run.elapsed=210000;c.updateRoyalSlimeClock();assert.equal(c.royalSlimeRemaining(),0);
  assert.equal(c.run.done,true);assert.equal(c.run.clear,false);assert.equal(c.run.reason,'timeout');assert.equal(c.page,'bossResult');
});
test('fall kills a character with one HP at contact and persists zero HP',()=>{
  const {c,callbacks,flush}=setup();c.run.hp=1;c.run.ghostFallsPending=2;
  const persisted=[];c.persistStoryBattleVitals=()=>persisted.push(c.run.hp);
  c.crystalGhostFall(c.run);assert.equal(c.run.hp,1);assert.equal(c.run.done,false);
  callbacks.shift()();assert.equal(c.run.hp,0);assert.equal(c.run.stunned,true);assert.deepEqual(persisted,[0]);
  flush();assert.equal(c.run.done,true);assert.equal(c.run.clear,false);assert.equal(c.run.reason,'hp-zero');
  assert.equal(c.page,'bossResult');assert.equal(c.run.ghostFalling,false);assert.equal(c.run.bossReward,undefined);
});
test('two HP survives one fall, then dies to the next fall even after a killing blow',()=>{
  const {c,flush}=setup();c.run.hp=2;c.run.ghostFallsPending=1;
  c.crystalGhostFall(c.run);flush();assert.equal(c.run.hp,1);assert.equal(c.run.done,false);
  c.run.bossHp=0;c.run.correct=90;c.run.ghostFallsPending=1;
  c.crystalGhostFall(c.run);flush();assert.equal(c.run.hp,0);assert.equal(c.run.clear,false);
  assert.equal(c.run.reason,'hp-zero');assert.equal(c.run.bossReward,undefined);
});
test('wrong answers lose one HP without triggering a boss skill',()=>{
  const {c,pick,flush}=setup();pick('ko',0);pick('en',1);flush();
  assert.equal(c.run.hp,8);assert.equal(c.run.bossHp,90);assert.equal(c.run.correct,0);assert.equal(c.run.ghostThresholds.length,0);
});
test('high attack preserves every crossed threshold, including a killing blow',()=>{
  const {c,correct,flush}=setup(20);
  for(let i=0;i<5;i++){correct();flush();}
  assert.equal(c.run.bossHp,0);assert.equal(c.run.hp,2);assert.equal(c.run.clear,true);assert.deepEqual(Array.from(c.run.ghostThresholds),[50,20,10]);
});
test('hidden reward is separate from ordinary clears, pays 2200 and five potions once, and clears 3-7',async()=>{
  const {c,correct,flush}=setup();c.demoState.records.push({player:c.player,stage:c.stageRecordName(),cleared:true});
  for(let i=0;i<90;i++){correct();flush();}
  assert.equal(c.run.bossReward,2200);assert.equal(c.selectedCharacter.coins,2200);assert.equal(c.potionInventory.blue_potion_count,7);
  await c.claimCrystalGhostReward();assert.equal(c.selectedCharacter.coins,2200);assert.equal(c.potionInventory.blue_potion_count,7);
  c.startCrystalGhostBattle();for(let i=0;i<90;i++){correct();flush();}
  assert.equal(c.run.bossReward,0);assert.equal(c.potionInventory.blue_potion_count,7);
});
test('account reward failure can retry without duplicate payout',async()=>{
  const {c}=setup();c.localMode=false;c.run.clear=true;c.run.correct=90;c.run.bossHp=0;c.run.elapsed=60000;c.accountCrystals=100;
  let calls=0;c.loadCharacterExtras=async()=>{};c.rpc=async(name,args)=>{calls++;assert.equal(name,'claim_crystal_ghost_boss_reward');assert.equal(args.p_character_id,'hero');if(calls===1)throw Error('offline');return [{game_score_id:1,reward:2200,balance:2300,mana_potions:5}];};
  await c.claimCrystalGhostReward();assert.equal(c.run.rewardError,true);assert.equal(c.accountCrystals,100);
  await c.claimCrystalGhostReward();assert.equal(c.run.rewardError,false);assert.equal(c.accountCrystals,2300);assert.equal(c.run.bossPotionReward,5);
  await c.claimCrystalGhostReward();assert.equal(calls,2);
});
test('Ice Time freezes timer, defers boss fall until release, and permits potion-enabled reuse',()=>{
  const {c,correct,flush}=setup();c.selectedCharacter.class='mage';
  for(let i=0;i<70;i++){correct();flush();}
  c.activateMageIceTime();flush();assert.equal(c.run.iceTimeActive,true);assert.equal(c.run.mp,1);
  correct();flush();correct();flush();assert.equal(c.run.bossHp,18);assert.equal(c.run.ghostFallsPending,1);assert.equal(c.run.hp,5);
  for(let i=0;i<3;i++){correct();flush();}
  assert.equal(c.run.iceTimeActive,false);assert.equal(c.run.ghostFallsPending,0);assert.equal(c.run.hp,3);
  c.run.mp=1;c.activateMageIceTime();flush();assert.equal(c.run.mp,0);assert.equal(c.run.iceTimeActive,true);
  c.finishRoyalSlimeBattle(false,'leave');assert.equal(c.run.iceTimeActive,false);c.run.mp=1;c.startCrystalGhostBattle();assert.equal(c.run.ghostThresholds.length,0);
});
test('Ice Time freezes actual countdown and releases on a wrong answer',()=>{
  const {c,pick,flush}=setup();c.selectedCharacter.class='mage';
  Object.assign(c,{updateEnemyApproach(){},updateWarriorSlash(){},setInterval(fn){c.tickCallback=fn;return 1;}});
  vm.runInContext(source.slice(source.indexOf('  function tick()'),source.indexOf('  function pause()')),c);
  c.activateMageIceTime();flush();c.tick();c.performance.now=()=>2000;c.tickCallback();assert.equal(c.run.elapsed,0);
  pick('ko',0);pick('en',1);flush();assert.equal(c.run.iceTimeActive,false);
  c.performance.now=()=>2500;c.tickCallback();assert.equal(c.run.elapsed,500);
});
test('registered warrior active skill uses MP and supports refill reuse in hidden battle',()=>{
  const {c,correct,flush}=setup();
  vm.runInContext(source.slice(source.indexOf('  function activateWarriorSlash('),source.indexOf('  function storyPick(')),c);
  c.activateWarriorSlash();assert.equal(c.run.mp,1);assert.equal(c.run.slashExpiresAt,11000);
  correct();flush();assert.equal(c.run.slashCombo,1);
  c.run.mp=1;c.activateWarriorSlash();assert.equal(c.run.mp,0);assert.equal(c.run.slashCombo,0);
});
