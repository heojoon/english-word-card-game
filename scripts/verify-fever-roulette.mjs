import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
function context(localMode=true){
  const audio=[],calls=[],nodes=new Map();
  const c=vm.createContext({run:{story:true,spelling:true,storyCharacterId:'hero',deck:Array(40).fill({}),correct:40,index:40,elapsed:180499,storyTimeLimit:240000,mp:1,mobs:[],slashBonus:0},
    localMode,selectedStage:'story-ch8-1',selectedCharacter:{id:'hero'},stages:{'story-ch8-1':{storyChapter:11}},
    crypto:{randomUUID:()=> 'request-one'},Math:Object.create(Math),performance:{now:()=>0},document:{hidden:false,querySelector:selector=>nodes.get(selector),dispatchEvent(){}},CustomEvent:class{},
    window:{wordoriaSound:{stopSFX(){}}},emitAudio:(...args)=>audio.push(args),render(){c.renders=(c.renders||0)+1;},reducedMotion:()=>true,
    finishBattle:(...args)=>calls.push(args),rpc:async()=>{throw Error('not configured');},stageRecordName:()=> '스토리 8장 1 · 잿빛 종이 울리는 마을',
    accountCrystals:0,accountMode:true,records:[],player:'tester',esc:String,num:String,
  });
  const start=source.indexOf('  const STORY_ROULETTE_MULTIPLIERS');
  assert.notEqual(start,-1,'roulette implementation is present');
  vm.runInContext(source.slice(start,source.indexOf('  function canActivateMageIceTime(',start)),c);
  return Object.assign(c,{audio,calls,nodes});
}

test('only World 8+ ordinary Story clears are eligible; branches and bosses retain their existing contracts',()=>{
  const c=context();assert.equal(c.storyRouletteEligible(),true);
  for(const chapter of [1,5,8,9,10]){c.stages[c.selectedStage].storyChapter=chapter;assert.equal(c.storyRouletteEligible(),false);}
  c.stages[c.selectedStage].storyChapter=12;assert.equal(c.storyRouletteEligible(),true);
  for(const key of ['hiddenKind','boss','guardian','vargas','blackroot','keurus']){c.run[key]=true;assert.equal(c.storyRouletteEligible(),false);delete c.run[key];}
  c.run.story=false;assert.equal(c.storyRouletteEligible(),false);
});
test('real finish routing opens roulette before recovery or saving and real tick freezes the clear clock',async()=>{
  const c=context();let intros=0;
  c.beginFeverIntro=()=>{intros++;c.run.roulette=c.createStoryRoulette();c.run.feverTransition=true;};
  const finish=source.indexOf('  async function finishBattle(');
  vm.runInContext(source.slice(finish,source.indexOf('  async function saveBattleResult(',finish)),c);
  await c.finishBattle(true,'deck-complete');assert.equal(intros,1);assert.equal(c.run.done,undefined);
  await c.finishBattle(true,'duplicate-clear');assert.equal(intros,1);
  Object.assign(c,{timerId:null,clearInterval(){},setInterval:fn=>{c.callback=fn;return 1;},updateEnemyApproach(){}});
  const tick=source.indexOf('  function tick()');vm.runInContext(source.slice(tick,source.indexOf('  function pauseActionsMarkup(',tick)),c);
  c.tick();c.performance.now=()=>10000;c.callback();assert.equal(c.run.elapsed,180499);
  c.run.feverTransition=false;c.run.fever=true;c.run.roulette.phase='spinning';c.callback();assert.equal(c.run.elapsed,180499);
});
test('weighted boundaries choose all six outcomes, round the final product and align the weighted sector',async()=>{
  for(const [random,index,bonus,center] of [[0,0,60,54],[0.29999,0,60,54],[0.3,1,119,144],[0.49999,1,119,144],[0.5,2,179,198],[0.59999,2,179,198],[0.6,3,30,234],[0.69999,3,30,234],[0.7,4,0,261],[0.74999,4,0,261],[0.75,5,89,315],[0.99999,5,89,315]]){
    const c=context();c.Math.random=()=>random;c.run.roulette=c.createStoryRoulette();c.run.fever=true;
    assert.equal(c.run.roulette.remainingMs,59501);
    await c.rouletteButton();assert.equal(c.run.roulette.phase,'spinning');
    c.run.elapsed=239000;await c.rouletteButton();
    assert.equal(c.run.roulette.index,index);assert.equal(c.run.feverCollected,bonus);
    c.advanceStoryRoulette(5000);assert.equal(c.run.roulette.phase,'result');
    assert.equal((c.run.roulette.angle+center)%360,0,'pointer is at the chosen weighted sector center');
    c.completeStoryRoulette();c.completeStoryRoulette();assert.equal(c.calls.length,1);
  }
});
test('every one-percent bucket contributes exactly the requested probability and sector width',async()=>{
  const counts=[0,0,0,0,0,0];
  for(let bucket=0;bucket<100;bucket++){
    const c=context();c.Math.random=()=>(bucket+0.5)/100;c.run.roulette=c.createStoryRoulette();c.run.fever=true;
    await c.rouletteButton();await c.rouletteButton();counts[c.run.roulette.index]++;
  }
  assert.deepEqual(counts,[30,20,10,10,5,25]);
  const c=context();c.run.roulette=c.createStoryRoulette();
  const html=c.renderStoryRoulette();assert.match(html,/×1\.5/);assert.doesNotMatch(html,/각 칸의 당첨 확률은 20%/);
  for(const probability of ['5%','10%','20%','25%','30%'])assert.ok(html.includes(probability),probability);
  assert.match(html,/270deg 360deg/,'the 25% outcome occupies one quarter of the wheel');
});
test('account receipt accepts the new 1.5 multiplier outcome',async()=>{
  const c=context(false);c.rpc=async()=>({index:5,bonus:89,result:{game_score_id:55,coins_earned:147,balance:147}});
  c.run.roulette=c.createStoryRoulette();c.run.fever=true;await c.rouletteButton();await c.rouletteButton();
  assert.equal(c.run.roulette.phase,'stopping');assert.equal(c.run.feverCollected,89);
  c.advanceStoryRoulette(5000);assert.equal((c.run.roulette.angle+315)%360,0);
  assert.match(c.renderStoryRoulette(),/×1\.5 당첨/);
});
test('zero remaining time is a valid zero reward; invalid clear clocks cannot create NaN rewards',async()=>{
  for(const elapsed of [240000,250000,NaN]){
    const c=context();c.run.elapsed=elapsed;c.run.roulette=c.createStoryRoulette();c.run.fever=true;
    assert.equal(c.run.roulette.remainingMs,0);
    await c.rouletteButton();await c.rouletteButton();assert.equal(c.run.feverCollected,0);
  }
});
test('pause and hidden state freeze rotation; spinning and stopping do not consume the battle clock',async()=>{
  const c=context();c.run.roulette=c.createStoryRoulette();c.run.fever=true;await c.rouletteButton();
  c.advanceStoryRoulette(100);const angle=c.run.roulette.angle;
  c.run.paused=true;c.advanceStoryRoulette(1000);assert.equal(c.run.roulette.angle,angle);
  c.run.paused=false;c.document.hidden=true;c.advanceStoryRoulette(1000);assert.equal(c.run.roulette.angle,angle);
  c.document.hidden=false;c.advanceStoryRoulette(1000);assert.ok(c.run.roulette.angle>angle);assert.equal(c.run.elapsed,180499);
  assert.ok(c.audio.some(([id])=>id==='ROULETTE_WHEEL_TICK'));
});
test('one account request settles the reward; rapid presses and retries reuse the request and server outcome',async()=>{
  const c=context(false),requests=[];let resolve;
  c.rpc=(name,args)=>{requests.push([name,args]);return new Promise(r=>{resolve=r;});};
  c.run.roulette=c.createStoryRoulette();c.run.fever=true;await c.rouletteButton();
  const pending=c.rouletteButton();await c.rouletteButton();assert.equal(requests.length,1);
  resolve({index:2,bonus:179,result:{game_score_id:12,coins_earned:237,balance:500}});await pending;
  assert.equal(c.run.roulette.phase,'stopping');assert.equal(c.run.result.game_score_id,12);assert.equal(c.accountCrystals,500);
  assert.equal(requests[0][0],'claim_story_roulette_reward');assert.equal(requests[0][1].p_request_id,'request-one');assert.equal(requests[0][1].p_duration_ms,180499);
  assert.equal(c.run.feverCollected,179);c.advanceStoryRoulette(5000);const audioCount=c.audio.length;c.advanceStoryRoulette(5000);assert.equal(c.audio.length,audioCount);
  const retry=context(false);let count=0;const ids=[];
  retry.rpc=async(name,args)=>{ids.push(args.p_request_id);if(count++===0)throw Error('connection lost');return {index:4,bonus:0,result:{game_score_id:22,coins_earned:0,balance:9}};};
  retry.run.roulette=retry.createStoryRoulette();retry.run.fever=true;await retry.rouletteButton();await retry.rouletteButton();assert.equal(retry.run.roulette.phase,'error');
  await retry.rouletteButton();assert.deepEqual(ids,['request-one','request-one']);assert.equal(retry.run.storyReplay,true);assert.equal(retry.run.feverCollected,0);
});
test('warrior passive extensions use the frozen actual time limit in account settlement',async()=>{
  const c=context(false);let args;c.run.storyTimeLimit=320000;c.run.elapsed=280499;
  c.rpc=async(name,payload)=>{args=payload;return {index:2,bonus:119,result:{game_score_id:33,coins_earned:177,balance:177}};};
  c.run.roulette=c.createStoryRoulette();c.run.fever=true;await c.rouletteButton();await c.rouletteButton();
  assert.equal(args.p_time_limit_ms,320000);assert.equal(args.p_duration_ms,280499);
  assert.equal(c.run.roulette.remainingMs,39501);assert.equal(c.run.feverCollected,119);
});
test('resume redraws the ready or retry button after a paused intro or network error',()=>{
  for(const phase of ['ready','error']){
    const c=context();c.run.roulette=c.createStoryRoulette();c.run.roulette.phase=phase;c.run.paused=true;c.run.pausedAt=0;
    Object.assign(c,{closeDialog(){},tick(){}});c.window.wordoriaSound.resumeBGM=()=>{};
    const start=source.indexOf('  function resume()');vm.runInContext(source.slice(start,source.indexOf('  function cancelSpeech()',start)),c);
    c.resume();assert.equal(c.run.paused,false);assert.equal(c.renders,1,'resume must restore the disabled DOM control');
  }
});
test('battle answer shortcuts cannot modify a cleared run during roulette or its intro',()=>{
  for(const state of [{fever:true},{feverTransition:true}]){
    const c=context();Object.assign(c.run,state);c.answerStorySpelling=()=>{throw Error('answered stale question');};
    const start=source.indexOf('  function answer(index)');
    vm.runInContext(source.slice(start,source.indexOf('  function advanceFeverCrystals(',start)),c);
    c.answer(0);assert.equal(c.run.correct,40);assert.equal(c.run.index,40);
  }
});
test('roulette BGM changes on reveal and paused renders never restart music',()=>{
  const c=context();c.page='battle';c.run.roulette=c.createStoryRoulette();c.run.fever=true;c.run.feverAudioPreloaded=true;
  const start=source.indexOf('  function syncBGM(');
  vm.runInContext(source.slice(start,source.indexOf('  const API_TIMEOUT_MS',start)),c);
  c.syncBGM();assert.equal(c.audio.at(-1)[0],'ROULETTE_BGM');
  c.run.roulette.phase='result';c.run.roulette.index=2;c.syncBGM();assert.equal(c.audio.at(-1)[0],'ROULETTE_CHEER');
  const count=c.audio.length;c.run.paused=true;c.syncBGM();assert.equal(c.audio.length,count);
});
test('result focus moves to Continue and background controls become inert until the result closes',()=>{
  const c=context();c.page='battle';c.run.roulette=c.createStoryRoulette();c.run.roulette.phase='result';let focused=0;
  const topbar={},normal={classList:{contains:()=>false}},overlay={classList:{contains:()=>true}};
  c.nodes.set('.topbar',topbar);c.nodes.set('.roulette-screen',{children:[normal,overlay]});c.nodes.set('[data-action="roulette-continue"]',{focus:()=>focused++});c.$=()=>({open:false});
  c.syncRouletteResultFocus();assert.equal(focused,1);assert.equal(topbar.inert,true);assert.equal(normal.inert,true);assert.equal(overlay.inert,false);
  c.run.done=true;c.syncRouletteResultFocus();assert.equal(topbar.inert,false);assert.equal(normal.inert,false);
});
test('late account responses after exit do not update a different battle or wallet',async()=>{
  const c=context(false);let resolve;c.rpc=()=>new Promise(r=>{resolve=r;});c.run.roulette=c.createStoryRoulette();c.run.fever=true;await c.rouletteButton();
  const pending=c.rouletteButton();c.run={done:false};resolve({index:1,bonus:119,result:{game_score_id:1,balance:900,coins_earned:170}});await pending;
  assert.equal(c.accountCrystals,0);assert.equal(c.run.result,undefined);
});
test('account roulette preserves ordinary level-up HP and MP recovery at final confirmation',async()=>{
  const c=context(false);Object.assign(c.run,{hp:1,mp:0});c.stages[c.selectedStage].storyNumber=1;
  Object.assign(c,{stats:()=>({level:c.records.length?2:1}),allCharacters:[],hasNewActiveSkill:()=>false,isWorldEightFinalClear:()=>false,
    storyVitals:()=>({hpMax:3,mpMax:2}),saveStoryVitals(){}});
  const recover=source.indexOf('  function recoverAfterBattle(');
  vm.runInContext(source.slice(recover,source.indexOf('  function storyPotionCount(',recover)),c);
  const save=source.indexOf('  async function saveBattleResult(');
  vm.runInContext(source.slice(save,source.indexOf('  async function saveVargasReward(',save)),c);
  c.rpc=async()=>({index:0,bonus:60,result:{game_score_id:34,coins_earned:118,balance:118}});
  c.run.roulette=c.createStoryRoulette();c.run.fever=true;await c.rouletteButton();await c.rouletteButton();
  await c.saveBattleResult(c.run,true);assert.equal(c.run.hp,3);assert.equal(c.run.mp,2);assert.equal(c.records.length,1);
  await c.saveBattleResult(c.run,true);assert.equal(c.records.length,1);
});
test('result markup shows the frozen seconds, red control, real awarded amount and replay status',()=>{
  const c=context();c.run.roulette=c.createStoryRoulette();c.run.fever=true;
  let html=c.renderStoryRoulette();assert.match(html,/59\.501/);assert.match(html,/roulette-button/);assert.match(html,/data-action="roulette-spin"/);
  c.run.roulette.phase='result';c.run.roulette.index=2;c.run.roulette.bonus=179;c.run.feverCollected=179;
  html=c.renderStoryRoulette();assert.match(html,/role="dialog"/);assert.match(html,/179/);assert.match(html,/roulette-continue/);
  c.run.storyReplay=true;html=c.renderStoryRoulette();assert.match(html,/재도전/);assert.match(html,/\+0/);
});
test('all roulette audio events have nonempty shipped assets and cheering music is a one-shot',()=>{
  const manifest=JSON.parse(readFileSync(new URL('../assets/audio/config/audio-manifest.json',import.meta.url),'utf8'));
  for(const id of ['ROULETTE_BGM','ROULETTE_WHEEL_TICK','ROULETTE_BUTTON','ROULETTE_CHEER','ROULETTE_BLANK']){
    assert.ok(manifest.events[id],id);
    for(const asset of manifest.events[id].sources)assert.ok(existsSync(new URL('../'+asset,import.meta.url)),asset);
  }
  assert.equal(manifest.events.ROULETTE_BGM.loop,true);assert.equal(manifest.events.ROULETTE_CHEER.loop,false);
});
