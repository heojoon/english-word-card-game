import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
function setup(wordCount=13){
  const callbacks=[],pages=[],nodes=new Map();
  const node=()=>({textContent:'',style:{},classList:{add(){},toggle(){}},setAttribute(){}});
  const original={story:true,clear:true,result:{game_score_id:'stage-seven'},treasure:42};
  const context=vm.createContext({
    storyDialogueIndex:5,page:'battle',localMode:true,player:'검증',demoState:{records:[]},records:[],saveDemo(){},num:String,
    run:original,pendingStoryRun:null,selectedStage:'story-lv6',selectedCharacter:{id:'test-warrior',class:'warrior',coins:0},
    stages:{'story-lv6':{words:Array.from({length:wordCount},(_,i)=>[`word${i}`,'noun',`뜻${i}`])}},
    timerId:null,nextTimer:null,performance:{now:()=>1000},shuffle:array=>array.slice().reverse(),
    clearInterval(){},clearTimeout(){},cancelSpeech(){},toast(){},render(){},tick(){},speak(){},emitAudio(){},
    reducedMotion:()=>false,battleContactDelay:()=>420,
    setTimeout:fn=>{callbacks.push(fn);return callbacks.length;},
    go:page=>{context.page=page;pages.push(page);},CustomEvent:class{},
    $:id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);},
    document:{dispatchEvent(){},querySelector:()=>node()},
  });
  vm.runInContext(source.slice(source.indexOf('  const ROYAL_SLIME_REWARD='),source.indexOf('  function renderBattle(){')),context);
  vm.runInContext(source.slice(source.indexOf('  function refreshStorySelections('),source.indexOf('  function syncBGM(')),context);
  vm.runInContext(source.slice(source.indexOf('  function storyPick('),source.indexOf('  async function finishBattle(')),context);
  context.startRoyalSlimeBattle();
  const flush=()=>{while(callbacks.length)callbacks.shift()();};
  const pick=(side,id)=>context.royalSlimePick({dataset:{side,id:String(id)}});
  const correct=()=>{const pair=context.run.matchEn.find(item=>!context.run.matched.has(item.id));pick('ko',pair.id);pick('en',pair.id);};
  return {context,pages,original,flush,pick,correct};
}
test('boss starts at 05:00, preserves stage reward and uses 50 entries with unique boards',()=>{
  for(const count of [5,6,13,20,51]){
    const {context,original}=setup(count);
    assert.equal(context.pendingStoryRun,original);
    assert.equal(context.royalSlimeTime(context.royalSlimeRemaining()),'05:00');
    assert.equal(context.run.deck.length,50);
    for(let start=0;start<50;start+=5)assert.equal(new Set(context.run.deck.slice(start,start+5).map(item=>item.entry[0])).size,5);
    assert.equal(original.treasure,42);
  }
});
test('damage occurs at contact, absorption occurs exactly once after 25 hits and victory after 50',()=>{
  const {context,pages,correct,flush}=setup();
  for(let index=1;index<=50;index++){
    correct();assert.equal(context.run.bossHp,51-index,'HP stays until contact');flush();
    assert.equal(context.run.bossHp,50-index);
    assert.equal(context.run.timePenalty,index<25?0:30000);
    assert.equal(context.run.done,index===50);
  }
  assert.equal(context.run.clear,true);assert.equal(context.run.fever,false);
  assert.equal(context.royalSlimeTime(context.royalSlimeRemaining()),'04:30');
  assert.deepEqual(pages,['battle','storyBossVictory']);
  assert.equal(context.storyDialogueIndex,0);assert.equal(context.selectedCharacter.coins,0);assert.equal(context.run.bossReward,undefined);
});
test('wrong pair loses player HP but no boss HP or question progress',()=>{
  const {context,pick,flush}=setup();pick('ko',0);pick('en',1);flush();
  assert.equal(context.run.hp,2);assert.equal(context.run.correct,0);assert.equal(context.run.bossHp,50);assert.equal(context.run.timePenalty,0);
});
test('absorption clamps timer to zero, ends battle, and retry resets boss without overwriting stage result',()=>{
  const {context,correct,flush,original}=setup();
  for(let index=0;index<24;index++){correct();flush();}
  context.run.elapsed=280000;correct();flush();
  assert.equal(context.royalSlimeRemaining(),0);assert.equal(context.run.reason,'timeout');assert.equal(context.run.clear,false);
  vm.runInContext(source.slice(source.indexOf('  function refreshStorySelections('),source.indexOf('  function syncBGM(')),context);
  vm.runInContext(source.slice(source.indexOf('  function storyPick('),source.indexOf('  async function finishBattle(')),context);
  context.startRoyalSlimeBattle();assert.equal(context.pendingStoryRun,original);assert.equal(context.run.correct,0);assert.equal(context.run.timePenalty,0);assert.equal(context.run.bossHp,50);
});

test('first boss victory pays exactly 200 once and failures pay nothing',()=>{
  const {context,correct,flush}=setup();
  context.finishRoyalSlimeBattle(false,'timeout');
  assert.equal(context.selectedCharacter.coins,0);assert.equal(context.demoState.records.length,0);
  vm.runInContext(source.slice(source.indexOf('  function refreshStorySelections('),source.indexOf('  function syncBGM(')),context);
  vm.runInContext(source.slice(source.indexOf('  function storyPick('),source.indexOf('  async function finishBattle(')),context);
  context.startRoyalSlimeBattle();
  for(let index=0;index<50;index++){correct();flush();}
  assert.equal(context.selectedCharacter.coins,0);assert.equal(context.page,'storyBossVictory');
  context.completeRoyalSlimeVictoryStory();
  assert.equal(context.selectedCharacter.coins,200);assert.equal(context.run.bossReward,200);assert.equal(context.demoState.records.length,1);
  context.claimRoyalSlimeReward();assert.equal(context.selectedCharacter.coins,200);
  vm.runInContext(source.slice(source.indexOf('  function refreshStorySelections('),source.indexOf('  function syncBGM(')),context);
  vm.runInContext(source.slice(source.indexOf('  function storyPick('),source.indexOf('  async function finishBattle(')),context);
  context.startRoyalSlimeBattle();
  for(let index=0;index<50;index++){correct();flush();}
  context.completeRoyalSlimeVictoryStory();
  assert.equal(context.selectedCharacter.coins,200);assert.equal(context.run.bossReward,0);assert.equal(context.demoState.records.length,1);
});
test('account reward save failure can retry and successful saves cannot run twice',async()=>{
  const {context}=setup();context.localMode=false;context.accountCrystals=1250;
  context.run.clear=true;context.run.correct=50;context.run.elapsed=120000;
  let calls=0;context.rpc=async(name,args)=>{
    calls++;assert.equal(name,'claim_royal_slime_reward');assert.equal(args.p_stage_score_id,'stage-seven');
    if(calls===1)throw Error('offline');return [{reward:200,balance:1450}];
  };
  await context.claimRoyalSlimeReward();assert.equal(context.run.rewardError,true);assert.equal(context.accountCrystals,1250);
  await context.claimRoyalSlimeReward();assert.equal(context.run.rewardError,false);assert.equal(context.run.bossReward,200);assert.equal(context.accountCrystals,1450);
  await context.claimRoyalSlimeReward();assert.equal(calls,2);
});

test('victory dialogue completion opens reward once and does not reopen on duplicate completion',()=>{
  const {context,pages,correct,flush}=setup();
  for(let index=0;index<50;index++){correct();flush();}
  assert.equal(context.page,'storyBossVictory');assert.equal(context.demoState.records.length,0);
  context.completeRoyalSlimeVictoryStory();context.completeRoyalSlimeVictoryStory();
  assert.deepEqual(pages,['battle','storyBossVictory','bossResult']);
  assert.equal(context.demoState.records.length,1);assert.equal(context.run.bossReward,200);
});
test('boss accepts the next pair while the current attack is playing',()=>{
  const {context,pick,correct,flush}=setup();correct();
  const pair=context.run.matchEn.find(item=>!context.run.matched.has(item.id));
  pick('ko',pair.id);pick('en',pair.id);
  assert.equal(context.run.queuedStoryPairs.length,1);
  flush();assert.equal(context.run.correct,2);assert.equal(context.run.bossHp,48);
  assert.equal(context.run.attack,false);
});
