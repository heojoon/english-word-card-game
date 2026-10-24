import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
function setup(stage='story-prologue',replay=false){
  const pages=[];
  const context=vm.createContext({persistStoryBattleVitals(){},
    run:{story:true,storyReplay:replay,elapsed:1000},selectedStage:stage,
    storyStages:[{key:'story-prologue',epilogue:true},{key:'story-lv1'}],
    storyDialogueIndex:5,localMode:false,dbOnline:false,timerId:null,nextTimer:null,
    clearInterval(){},clearTimeout(){},removeBattleReward(){},cancelSpeech(){},
    stageCleared:()=>false,storyStageUnlocked:()=>true,
    go:page=>pages.push(page),emitAudio(){},playStageClearSound(){},
    document:{dispatchEvent(){}},CustomEvent:class {},toast(){},render(){},
  });
  vm.runInContext(source.slice(source.indexOf('  async function finishBattle('),source.indexOf('  function clearSummaryMarkup(')),context);
  vm.runInContext(source.slice(source.indexOf('  function resultNext('),source.indexOf('  async function tapChest(')),context);
  vm.runInContext(source.slice(source.indexOf('  function receiveReward('),source.indexOf('\n',source.indexOf('  function receiveReward('))),context);
  return {context,pages};
}
for(const replay of [false,true])test(`stage 1 clear opens epilogue, replay=${replay}`,async()=>{
  const {context,pages}=setup('story-prologue',replay);
  await context.finishBattle(true,'fever-complete');
  assert.deepEqual(pages,['storyEpilogue']);
  assert.equal(context.storyDialogueIndex,0);
  assert.equal(context.run.clear,true);
});
test('failed stage 1 and other cleared stages open results',async()=>{
  for(const [stage,clear] of [['story-prologue',false],['story-lv1',true]]){
    const {context,pages}=setup(stage);await context.finishBattle(clear,'timeout');
    assert.deepEqual(pages,['result']);
  }
});

test('clearing a story stage selects the following stage in the same world',async()=>{
  for(const replay of [false,true]){
    const {context}=setup('story-ch6-10',replay);
    context.storyStages=[
      {key:'story-ch5-1',chapter:5,number:1},
      {key:'story-ch6a-11',chapter:7,number:11},
      {key:'story-ch6-10',chapter:6,number:10},
      {key:'story-ch6-11',chapter:6,number:11},
    ];
    await context.finishBattle(true,'complete');
    assert.equal(context.selectedStoryStage,'story-ch6-11');
    assert.equal(context.selectedStoryWorld,6);
  }
});

test('clearing the last stage keeps its world selected',async()=>{
  const {context}=setup('story-ch6-20');
  context.storyStages=[{key:'story-ch6-20',chapter:6,number:20},{key:'story-ch7a-1',chapter:8,number:1}];
  await context.finishBattle(true,'complete');
  assert.equal(context.selectedStoryStage,'story-ch6-20');
  assert.equal(context.selectedStoryWorld,6);
});
test('reward receipt does not reopen the epilogue',()=>{
  const {context,pages}=setup();context.run.chest=true;context.run.chestKind='item';
  context.receiveReward();assert.deepEqual(pages,['story']);
});
test('replay result continues to map after epilogue without rewards',()=>{
  const {context,pages}=setup('story-prologue',true);context.run.clear=true;
  context.resultNext();assert.deepEqual(pages,['story']);
  assert.equal(context.run.resultStep,undefined);
});
test('stage 7 clear opens final boss encounter while its failure opens results',async()=>{
  for(const clear of [true,false]){
    const {context,pages}=setup('story-lv6');
    context.storyStages.push({key:'story-lv6',number:7});
    await context.finishBattle(clear,clear?'fever-complete':'timeout');
    assert.deepEqual(pages,[clear?'storyEpilogue':'result']);
  }
});

test('world 2 stage 7 opens its own ending without replaying the forest boss',async()=>{
  const {context,pages}=setup('story-ch2-7');
  context.storyStages.push({key:'story-ch2-7',number:7,chapter:2});
  await context.finishBattle(true,'fever-complete');
  assert.deepEqual(pages,['storyChapterTwoBossEnd']);
});
