import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
function survivalFeedbackSetup(fast,correct=0){
  const c=vm.createContext({run:{fast,correct,index:correct,deck:Array(6).fill({}),question:{choices:['word'],answer:'word',entry:['word','n','뜻']}},
    selectedCharacter:{class:'warrior'},timerId:0,nextTimer:0,pending:[],popups:0,cleared:false,
    document:{querySelector:()=>null,querySelectorAll:()=>[],dispatchEvent(){}},CustomEvent:class{},
    $:()=>({classList:{add(){}},textContent:''}),earnedCoins:n=>n+Math.floor(n/5),battleContactDelay:()=>100,
    itemById:()=>null,equippedMap:()=>({}),setHeroAttackTravel(){},speak(){},clearInterval(){},clearTimeout(){},
    setTimeout(fn,delay){c.pending.push({fn,delay});return c.pending.length;},
    showBattleReward(){c.popups++;return 1700;},removeBattleReward(){},prepareQuestion(){},render(){},tick(){},
    finishBattle(clear){c.cleared=clear;c.run.done=true;},reducedMotion:()=>false});
  vm.runInContext(source.slice(source.indexOf('  function answer(index)'),source.indexOf('  function advanceFeverCrystals(')),c);
  vm.runInContext(source.slice(source.indexOf('  function continueAfterFeedback()'),source.indexOf('  function updateEnemyApproach(')),c);
  return c;
}
test('survival FAST skips reward popups and their wait, including milestones and the final answer',()=>{
  for(const correct of [0,4,5]){
    const c=survivalFeedbackSetup(true,correct);c.answer(0);
    assert.equal(c.run.correct,correct+1);
    assert.equal(c.run.index,correct);
    assert.equal(c.run.feedbackPending,true);
    while(c.pending.length)c.pending.shift().fn();
    assert.equal(c.popups,0);
    assert.equal(c.run.index,correct+1);
    assert.equal(c.run.feedbackPending,false);
    assert.equal(c.cleared,correct===5);
  }
});
test('survival with FAST off retains the reward popup before the next question',()=>{
  const c=survivalFeedbackSetup(false,4);c.answer(0);
  while(c.popups===0&&c.pending.length)c.pending.shift().fn();
  assert.equal(c.popups,1);
  assert.equal(c.run.index,4);
  assert.equal(c.run.feedbackPending,true);
  assert.equal(c.pending.at(-1).delay,1700);
  c.pending.shift().fn();assert.equal(c.run.index,5);
});
function storyMapSetup(){
  const storyStages=Array.from({length:3},(_,i)=>({key:`stage-${i+1}`,number:i+1,chapter:1}));
  const saved=new Map(),cleared=new Set(),records=[];
  let now=1000;
  const c=vm.createContext({storyStages,stages:Object.fromEntries(storyStages.map(stage=>[stage.key,stage])),
    selectedStoryStage:'stage-1',selectedStoryWorld:1,storyStageArmedKey:null,storyMapMoveUntil:0,
    accountUserId:'account',selectedCharacter:{id:'hero'},player:'guest',
    localStateStorage:{getItem:key=>saved.get(key),setItem:(key,value)=>saved.set(key,value)},
    Date:class extends Date{static now(){return now;}},matchMedia:()=>({matches:false}),
    storyStageUnlocked:index=>index>=0&&index<2,storyStagePlayable:()=>true,levelReady:()=>true,
    storyBranchAllowed:()=>true,stageCleared:key=>cleared.has(key),stageRecordName:key=>key,
    selectedRecords:()=>records,render(){c.renders++;},toast(){},confirmStoryStage:key=>c.entries.push(key),
    renders:0,entries:[],records,cleared,advance:ms=>{now+=ms;}});
  vm.runInContext(source.slice(source.indexOf('  function storyResumeStorageKey('),source.indexOf('  function go(')),c);
  vm.runInContext(source.slice(source.indexOf('  function selectStoryStage('),source.indexOf('  function bossIntroductionMarkup(')),c);
  return c;
}
test('story map moves first, ignores taps during travel, and opens entry on a later tap',()=>{
  const c=storyMapSetup();c.selectStoryStage('stage-2');
  assert.equal(c.selectedStoryStage,'stage-2');assert.equal(c.renders,1);assert.equal(c.entries.length,0);
  c.selectStoryStage('stage-2');assert.equal(c.entries.length,0);
  c.advance(700);c.selectStoryStage('stage-2');assert.equal(c.entries[0],'stage-2');
  c.selectStoryStage('stage-1');assert.equal(c.selectedStoryStage,'stage-1');assert.equal(c.entries.length,1);
  c.selectStoryStage('stage-3');assert.equal(c.selectedStoryStage,'stage-1');
});
test('story resume advances after a clear but preserves manually selected replay positions',()=>{
  const c=storyMapSetup();
  c.localStateStorage.setItem(c.storyResumeStorageKey(),JSON.stringify({key:'stage-1',playedAt:500}));
  c.cleared.add('stage-1');c.records.push({stage:'stage-1',created_at:new Date(900).toISOString()});
  c.restoreLastStoryStage();assert.equal(c.selectedStoryStage,'stage-2');
  c.selectStoryStage('stage-1');c.restoreLastStoryStage();assert.equal(c.selectedStoryStage,'stage-1');
  c.advance(1000);c.records.push({stage:'stage-1',created_at:new Date(1500).toISOString()});
  c.restoreLastStoryStage();assert.equal(c.selectedStoryStage,'stage-2');
  c.cleared.add('stage-2');c.records.push({stage:'stage-2',created_at:new Date(1600).toISOString()});
  c.restoreLastStoryStage();assert.equal(c.selectedStoryStage,'stage-2');
});
// One process, one source read, isolated VM state, and simulated timers.
// Browser and remote SQL checks are explicit, never part of the default suite.
function setup(){
  const entries=Array.from({length:10},(_,i)=>({entry:[`word${i}`,'n',`뜻${i}`],mode:'en-ko'}));
  const c=vm.createContext({run:{story:true,mp:1,mpMax:1,index:0,correct:0,hp:2,deck:entries,matchBoard:entries.slice(0,5),matched:new Set(),matchEn:entries.slice(0,5).map((x,id)=>({...x,id})),selectedKo:null,selectedEn:null,slashExpiresAt:0,elapsed:0,storyTimeLimit:30000,mobs:[]},selectedCharacter:{class:'mage'},performance:{now:()=>1000},render(){},emitAudio(){},speak(){},equippedMap:()=>({}),itemById(){},battleContactDelay:()=>100,reducedMotion:()=>true,document:{dispatchEvent(){},querySelector(){return null;}},CustomEvent:class{},$:()=>null,setTimeout:(fn)=>{c.pending.push(fn);return 1;},clearTimeout(){},clearInterval(){},setInterval:(fn)=>{c.tickCallback=fn;return 1;},pending:[],STORY_QUESTIONS_PER_TURN:5});
  vm.runInContext(source.slice(source.indexOf('  function canActivateMageIceTime()'),source.indexOf('  function updateWarriorSlash(')),c);
  vm.runInContext(source.slice(source.indexOf('  function refreshStorySelections('),source.indexOf('  function syncBGM(')),c);
  vm.runInContext(source.slice(source.indexOf('  function storyPick('),source.indexOf('  async function finishBattle(')),c);
  return c;
}
const pick=(c,side,id)=>c.storyPick({dataset:{side,id:String(id)}});
test('ice time consumes one MP and rejects repeated or unavailable activation',()=>{
  const c=setup();c.activateMageIceTime();assert.equal(c.run.mp,0);assert.equal(c.run.iceTimeActive,true);
  c.run.mp=1;c.activateMageIceTime();assert.equal(c.run.mp,1);
  c.run.iceTimeActive=false;c.activateMageIceTime();assert.equal(c.run.mp,0);assert.equal(c.run.iceTimeActive,true);
  for(const key of ['paused','locked','stunned','done','fever','feverTransition','timeoutPending']){const x=setup();x.run[key]=true;x.activateMageIceTime();assert.equal(x.run.mp,1);assert.equal(Boolean(x.run.iceTimeActive),false);}
  const x=setup();x.selectedCharacter.class='warrior';x.activateMageIceTime();assert.equal(x.run.mp,1);
});
test('partial correct matches keep ice active; an incorrect pair releases both time stops',()=>{
  const c=setup();c.activateMageIceTime();c.run.timeStopped=true;pick(c,'ko',0);pick(c,'en',0);
  assert.equal(c.run.iceTimeActive,true);assert.equal(c.run.timeStopped,false);assert.equal(c.run.correct,1);
  c.pending.splice(0).forEach(fn=>fn());pick(c,'ko',1);pick(c,'en',2);
  assert.equal(c.run.iceTimeActive,false);assert.equal(c.run.mp,0);
});
test('ice pauses the actual battle clock and the clock resumes after release',()=>{
  const c=setup();Object.assign(c,{timerId:0,updateEnemyApproach(){},updateWarriorSlash(){}});
  vm.runInContext(source.slice(source.indexOf('  function tick()'),source.indexOf('  function pause()')),c);
  c.activateMageIceTime();c.tick();c.performance.now=()=>2000;c.tickCallback();assert.equal(c.run.elapsed,0);
  c.run.iceTimeActive=false;c.performance.now=()=>2500;c.tickCallback();assert.equal(c.run.elapsed,500);
});
test('a new wave resets ice while retaining consumed MP',()=>{
  const c=setup();Object.assign(c,{selectedStage:'test',stages:{test:{words:[]}},makeQuestion:()=>({}),activatePassive(){},shuffle:x=>x});
  vm.runInContext(source.slice(source.indexOf('  function prepareQuestion()'),source.indexOf('  function battleHeroMarkup()')),c);
  c.activateMageIceTime();c.run.index=5;c.prepareQuestion();assert.equal(c.run.iceTimeActive,false);assert.equal(c.run.mp,0);
});
test('last wave releases ice before the fever transition',()=>{
  const c=setup();c.run.index=9;c.run.matched=new Set([0,1,2,3]);c.enterFeverTime=()=>{};
  c.selectedStage='earlier-world';c.stages={'earlier-world':{storyChapter:1}};
  const eligibility=source.indexOf('  function storyRouletteEligible(');
  vm.runInContext(source.slice(eligibility,source.indexOf('  function createStoryRoulette(',eligibility)),c);
  const intro=source.indexOf('  function beginFeverIntro(');vm.runInContext(source.slice(intro,source.indexOf('\n',intro)),c);
  c.activateMageIceTime();pick(c,'ko',4);pick(c,'en',4);assert.equal(c.run.iceTimeActive,true);assert.equal(Boolean(c.run.feverTransition),false);
  c.pending.at(-1)();assert.equal(c.run.iceTimeActive,false);assert.equal(c.run.feverTransition,true);
});

test('battle recovery respects final bosses, level-ups, ownership and preview mode',()=>{
  let level=3, saved;
  const battle={story:true,storyCharacterId:'hero',hp:1,mp:0};
  const c=vm.createContext({selectedCharacter:{id:'hero'},selectedStage:'final',
    stages:{final:{storyChapter:7,storyNumber:20}},run:battle,
    stats:()=>({level}),storyVitals:()=>({hpMax:9,mpMax:4}),saveStoryVitals:v=>{saved=v;}});
  const start=source.indexOf('  function recoverAfterBattle(');
  const end=source.indexOf('  function storyPotionCount(',start);
  assert.ok(start>=0&&end>start);
  vm.runInContext(source.slice(start,end),c);
  c.recoverAfterBattle(battle,false);assert.equal(saved,undefined);
  c.recoverAfterBattle(battle,true);assert.equal(saved.hp,9);assert.equal(battle.mp,4);
  for(const patch of [{hiddenKind:'king'},{localBossSkipped:true},{storyCharacterId:'other'}]){
    saved=undefined;c.recoverAfterBattle({...battle,...patch},true);assert.equal(saved,undefined);
  }
  c.stages.final.storyNumber=1;level=4;
  c.recoverAfterBattle(battle,false,3);assert.equal(saved.hp,9);
});

test('fever crystals emit one tap and one collection event and reject duplicate input',()=>{
  const events=[];
  const c=vm.createContext({run:{fever:true,elapsed:0,storyTimeLimit:1000,feverWords:[{id:'gem',state:'word'}]},
    emitAudio:(...args)=>events.push(args),render(){},document:{dispatchEvent(){}},CustomEvent:class{}});
  const start=source.indexOf('  function collectFeverCrystal(');
  vm.runInContext(source.slice(start,source.indexOf('  function renderFeverBattle(',start)),c);
  c.collectFeverCrystal('gem');assert.equal(c.run.feverWords[0].state,'meaning');
  c.collectFeverCrystal('gem');c.collectFeverCrystal('gem');
  assert.equal(c.run.feverCollected,1);
  assert.deepEqual(events,[['FEVER_CRYSTAL_TAP','sfx'],['FEVER_CRYSTAL_POP','sfx']]);
});

test('generated fever and battle audio references real runtime assets',()=>{
  const manifest=JSON.parse(readFileSync(new URL('../assets/audio/config/audio-manifest.json',import.meta.url),'utf8'));
  for(const id of ['BATTLE_BGM','BOSS_BGM','FEVER_BGM','FEVER_CRYSTAL_TAP','FEVER_CRYSTAL_POP'])for(const asset of manifest.events[id].sources){
    assert.ok(readFileSync(new URL('../'+asset,import.meta.url)).length>0,asset);
  }
});

test('battle music distinguishes normal story, bosses, hidden king and fever',()=>{
  const events=[];
  const c=vm.createContext({page:'battle',run:null,emitAudio:id=>events.push(id),window:{}});
  const start=source.indexOf('  function syncBGM(');
  vm.runInContext(source.slice(start,source.indexOf('  const API_TIMEOUT_MS',start)),c);
  for(const [state,expected] of [
    [{story:true,index:0,deck:[1]},'BATTLE_BGM'],
    [{story:true,index:19,deck:Array(20)},'BATTLE_BGM'],
    [{story:true,boss:true},'BOSS_BGM'],
    [{story:true,guardian:true},'BOSS_BGM'],
    [{story:true,keurus:true},'BOSS_BGM'],
    [{story:true,hiddenKind:'king'},'BOSS_BGM'],
    [{story:true,fever:true},'FEVER_BGM'],
    [{story:true,boss:true,fever:true},'FEVER_BGM'],
    [{index:0,deck:[1,2]},'BATTLE_BGM'],
    [{index:1,deck:[1,2]},'BOSS_BGM'],
  ]){c.run=state;c.syncBGM();assert.equal(events.at(-1),expected);}
  c.syncBGM('story');assert.equal(events.at(-1),'FOREST_BGM');
});

test('BGM loading deduplicates renders and cancellation prevents stale playback',async()=>{
  const c=vm.createContext({wordoriaSound:{}});
  vm.runInContext(readFileSync(new URL('../sound-manager.js',import.meta.url),'utf8'),c);
  const manager=new c.SoundManager();
  await manager.ready;
  manager.manifest={events:{FEVER:{category:'bgm',sources:['fever.mp3']}}};
  let resolveBuffer,loads=0,starts=0;
  manager.loadBuffer=()=>{loads++;return new Promise(resolve=>{resolveBuffer=resolve;});};
  manager.ensureContext=()=>({state:'running',currentTime:0,
    createBufferSource:()=>({connect(){},start(){starts++;}}),
    createGain:()=>({gain:{value:0},connect(){}})});
  manager.fadeIn=async()=>{};
  const loading=manager.playBGM('FEVER');await Promise.resolve();
  await manager.playBGM('FEVER');assert.equal(loads,1);
  manager.stopBGM();resolveBuffer({});await loading;assert.equal(starts,0);
  const retry=manager.playBGM('FEVER');await Promise.resolve();
  resolveBuffer({});await retry;
  assert.equal(starts,1);assert.equal(manager.bgm.id,'FEVER');
});

test('lobby music persists selection and mute independently and rejects invalid tracks',async()=>{
  const manifest=JSON.parse(readFileSync(new URL('../assets/audio/config/audio-manifest.json',import.meta.url),'utf8'));
  let saved;
  const c=vm.createContext({wordoriaSound:{}});
  vm.runInContext(readFileSync(new URL('../sound-manager.js',import.meta.url),'utf8'),c);
  const options={fetch:async()=>({ok:true,json:async()=>manifest}),storage:{getItem:()=>saved,setItem:(key,value)=>{saved=value;}}};
  const manager=new c.SoundManager(options);await manager.ready;
  assert.equal(manager.lobbyBGM(),'PHONK_CRYSTAL_BGM');
  assert.equal(manager.setLobbyTrack('PHONK_MOONLIGHT_BGM'),true);
  manager.setBGMMuted(true);manager.setBGMVolume(0.27);
  assert.equal(manager.setLobbyTrack('BOSS_BGM'),false);
  const restored=new c.SoundManager(options);await restored.ready;
  assert.equal(restored.lobbyBGM('FOREST_BGM'),'PHONK_MOONLIGHT_BGM');
  assert.equal(restored.settings.bgmMuted,true);assert.equal(restored.settings.bgmVolume,0.27);
  restored.setLobbyTrack('auto');
  assert.equal(restored.lobbyBGM('MENU_BGM'),'MENU_BGM');
  assert.equal(restored.lobbyBGM('FOREST_BGM'),'FOREST_BGM');
  restored.settings.lobbyTrack='removed-track';assert.equal(restored.lobbyBGM(),'MENU_BGM');
});

test('chosen lobby music follows home and world while combat keeps its dedicated soundtrack',()=>{
  const events=[];
  const c=vm.createContext({page:'home',run:null,emitAudio:id=>events.push(id),window:{wordoriaSound:{lobbyBGM:()=> 'PHONK_MINT_BGM',preloadAudio(){}}}});
  const start=source.indexOf('  function syncBGM(');
  vm.runInContext(source.slice(start,source.indexOf('  const API_TIMEOUT_MS',start)),c);
  for(const page of ['home','dungeon','world','survival','story','storyIntro']){
    c.syncBGM(page);assert.equal(events.at(-1),'PHONK_MINT_BGM');
  }
  for(const [state,id] of [[{story:true},'BATTLE_BGM'],[{story:true,boss:true},'BOSS_BGM'],[{story:true,fever:true},'FEVER_BGM']]){
    c.run=state;c.syncBGM('battle');assert.equal(events.at(-1),id);
  }
});

test('every lobby selection has real audio and both browser formats for phonk tracks',()=>{
  const manifest=JSON.parse(readFileSync(new URL('../assets/audio/config/audio-manifest.json',import.meta.url),'utf8'));
  assert.equal(manifest.lobbyTracks.filter(track=>track.id.startsWith('PHONK_')).length,3);
  for(const track of manifest.lobbyTracks){
    const entry=manifest.events[track.id];assert.equal(entry.loop,true);
    for(const asset of entry.sources)assert.ok(readFileSync(new URL('../'+asset,import.meta.url)).length>10000,asset);
    if(track.id.startsWith('PHONK_'))assert.deepEqual(entry.sources.map(path=>path.split('.').at(-1)),['ogg','mp3']);
  }
});

test('hidden-page music defers playback and resumes only after prior audio unlock',async()=>{
  const listeners=new Map();
  const document={hidden:true,addEventListener:(id,fn)=>listeners.set(id,fn),removeEventListener:(id)=>listeners.delete(id)};
  const c=vm.createContext({wordoriaSound:{},document});
  vm.runInContext(readFileSync(new URL('../sound-manager.js',import.meta.url),'utf8'),c);
  const manager=new c.SoundManager();await manager.ready;
  manager.manifest={events:{LOBBY:{category:'bgm',sources:['lobby.ogg']}}};
  await manager.playBGM('LOBBY');assert.equal(manager.pendingBGM.id,'LOBBY');assert.equal(manager.context,null);
  let suspended=0,resumed=0;
  manager.context={suspend:async()=>{suspended++;}};
  manager.unlock=async()=>{resumed++;};
  const visibility=listeners.get('visibilitychange');
  visibility();assert.equal(suspended,0);
  manager.unlocked=true;visibility();assert.equal(suspended,1);
  document.hidden=false;visibility();assert.equal(resumed,1);
});
