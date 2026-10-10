import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
function setup({local=true,replay=false,fever=7,slash=6}={}){
  const calls=[];
  const context=vm.createContext({
    run:{story:true,storyReplay:replay,correct:20,deck:Array(20),elapsed:60000,slashBonus:slash,feverCollected:fever},
    selectedCharacter:{id:'hero',class:'warrior',coins:100},selectedStage:'forest',player:'guest',
    localMode:local,dbOnline:!local,accountMode:true,accountCrystals:100,
    demoState:{records:[]},records:[],storyStages:[],timerId:null,nextTimer:null,
    stageRecordName:()=> '스토리 1 · 속삭이는 숲',stageCleared:()=>false,storyStageUnlocked:()=>true,
    clearInterval(){},clearTimeout(){},removeBattleReward(){},cancelSpeech(){},saveDemo(){},go(){},
    emitAudio(){},playStageClearSound(){},document:{dispatchEvent(){}},CustomEvent:class{},
    rpc:async(name,args)=>{calls.push({name,args});return [{game_score_id:1,coins_earned:replay?0:34+slash+(fever||0),balance:replay?100:134+slash+(fever||0)}];},
    apiGet:async()=>[],
    clearSummaryMarkup:(_run,earned)=>earned,stages:{forest:{name:'forest'}},esc:String,num:String,icon:()=>'',
  });
  vm.runInContext(source.slice(source.indexOf('  function earnedCoins('),source.indexOf('\n',source.indexOf('  function earnedCoins('))),context);
  vm.runInContext(source.slice(source.indexOf('  async function finishBattle('),source.indexOf('  function clearSummaryMarkup(')),context);
  vm.runInContext(source.slice(source.indexOf('  function renderResult('),source.indexOf('\n',source.indexOf('  function renderResult('))),context);
  return {context,calls};
}
test('guest rewards add fever and slash to the wallet, record and result exactly once',async()=>{
  const {context}=setup();
  await context.finishBattle(true,'fever-complete');
  await context.finishBattle(true,'fever-complete');
  assert.equal(context.selectedCharacter.coins,147);
  assert.equal(context.records.length,1);
  assert.equal(context.records[0].coins_earned,47);
  assert.equal(context.renderResult(),47);
});
test('account sends fever separately from class-specific slash and uses server balance',async()=>{
  const {context,calls}=setup({local:false,slash:0});context.selectedCharacter.class='mage';
  await context.finishBattle(true,'fever-complete');
  assert.equal(calls[0].name,'award_game_result');
  assert.equal(calls[0].args.p_fever_bonus,7);
  assert.equal(calls[0].args.p_slash_bonus,0);
  assert.equal(calls[0].args.p_correct,20);
  assert.equal(context.accountCrystals,141);
  assert.equal(context.renderResult(),41);
});
test('result estimate includes fever when no server result is available',()=>{
  const {context}=setup();context.run.clear=true;
  assert.equal(context.renderResult(),47);
});
test('story replay remains unpaid locally and sends zero bonuses to server',async()=>{
  for(const local of [true,false]){
    const {context,calls}=setup({local,replay:true});
    await context.finishBattle(true,'fever-complete');
    assert.equal(context.renderResult(),0);
    assert.equal(context.selectedCharacter.coins,100);
    if(!local){assert.equal(calls[0].args.p_fever_bonus,0);assert.equal(calls[0].args.p_slash_bonus,0);}
  }
});
test('runs without fever keep their existing rewards',async()=>{
  const {context}=setup({fever:undefined,slash:0});delete context.run.feverCollected;
  await context.finishBattle(true);
  assert.equal(context.renderResult(),34);
});
