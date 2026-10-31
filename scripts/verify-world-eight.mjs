import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parseWorldEightNarrative} from './generate-story-novel.mjs';

const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
const extract=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
const shuffle=input=>{const a=input.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
function content(level='middle'){
  const c=vm.createContext({window:{},document:{createElement:()=>({}),head:{appendChild(){}},currentScript:null,documentElement:{classList:{contains:()=>false}}},learningLevel:()=>level,stageLevel:s=>s.learningLevel||'middle',shuffle,chosenStoryBranch:()=> '6A'});
  for(const file of ['stages.js','elementary-stages.js','stage6.js','stage7.js','stage8.js','stage15.js','stage35.js'])vm.runInContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),c);
  // Published elementary Survival maps are loaded from Supabase at runtime.
  c.window.QUIZ_STAGES['creator:elementary-survival']={name:'day.1',learningLevel:'elementary',creator:true,mapId:'elementary-survival',words:[['apple','n','사과'],['book','n','책'],['cat','n','고양이'],['dog','n','개'],['egg','n','달걀'],['fish','n','물고기']]};
  vm.runInContext('const stages=window.QUIZ_STAGES;'+extract('  const storyStages = [','  const storyStageKey=')+'\nconfigureStoryContent();globalThis.catalog=stages;globalThis.worlds=storyWorlds;globalThis.story=storyStages;',c);
  vm.runInContext(extract('  function buildQuestionDeck(','  async function loadAll('),c);
  vm.runInContext(extract('  function makeSpellingQuestion(','  function formScore('),c);
  return c;
}
test('World 8 shares 30 Days and records; ordinary Type C has 40 questions and Vargas has a 180-answer pool',()=>{
  const records=[];
  for(const level of ['middle','elementary']){
    const c=content(level),stages=c.story.filter(s=>s.chapter===11);
    assert.equal(stages.length,30);
    const days=new Set();
    for(const stage of stages){
      const config=c.catalog[stage.key];days.add(config.vocabularyDay);
      const count=stage.number===30?180:40;
      assert.equal(config.questionType,'C');assert.equal(config.questionCount,count);assert.equal(config.questionTimeMs,3000);assert.equal(config.learningLevel,level);
      assert.ok(config.words.length>=4);assert.equal(new Set(config.words.map(w=>w[0].toLowerCase())).size,config.words.length);
      const deck=c.buildQuestionDeck(config);
      assert.equal(deck.length,count);assert.ok(deck.every(q=>q.mode==='spelling'));
      assert.equal(new Set(deck.slice(0,config.words.length).map(q=>q.entry[0])).size,config.words.length);
      for(let i=1;i<deck.length;i++)assert.notEqual(deck[i].entry[0],deck[i-1].entry[0]);
      if(level==='middle')records.push(config.recordName);else assert.equal(config.recordName,records[stage.number-1]);
    }
    if(level==='middle'){assert.equal(days.size,30);assert.ok([...days].every(day=>day>=1&&day<=30));}
    else assert.deepEqual([...days],[null]);
    const positions=c.worlds.at(-1).positions;assert.equal(positions.length,30);
    positions.forEach((p,i)=>{assert.ok(parseFloat(p[0])>0&&parseFloat(p[0])<100);if(i)assert.ok(parseFloat(p[1])>parseFloat(positions[i-1][1]));});
  }
});
test('World 7 branches and World 8 use elementary Survival words and preserve records across level changes',()=>{
  const c=content('elementary'),middle=content('middle');
  const expected=c.catalog['creator:elementary-survival'].words;
  for(const stage of c.story.filter(s=>[8,9,10,11].includes(s.chapter))){
    const config=c.catalog[stage.key];
    assert.deepEqual(Array.from(config.words),expected);
    assert.equal(config.recordName,middle.catalog[stage.key].recordName);
    assert.equal(config.vocabularyDay,null);
    assert.doesNotMatch(config.desc,/WordMax|Day \d+/);
  }
  vm.runInContext('configureStoryContent();',c);
  assert.deepEqual(Array.from(c.catalog['story-ch7a-1'].words),expected);
  delete c.catalog['creator:elementary-survival'];
  vm.runInContext('configureStoryContent();',c);
  for(const stage of c.story.filter(s=>[8,9,10,11].includes(s.chapter)))assert.equal(c.catalog[stage.key].words.length,0);
});
test('Type C hides one or two internal letters and always has four unique choices and one answer',()=>{
  const c=content();
  for(const config of Object.values(c.catalog).filter(s=>s.storyChapter===11)){
    for(const entry of config.words){
      const q=c.makeSpellingQuestion(entry);
      assert.ok(q.hidden.length===1||q.hidden.length===2);
      assert.equal(q.choices.length,4);assert.equal(new Set(q.choices).size,4);assert.equal(q.choices.filter(x=>x===q.answer).length,1);
      assert.equal(q.prompt[0],entry[0][0]);assert.equal(q.prompt.at(-1),entry[0].at(-1));
      assert.equal(q.hidden.map(i=>entry[0][i]).join(''),q.answer);
      assert.ok(q.hidden.every(i=>i>0&&i<entry[0].length-1&&q.prompt[i]==='□'));
    }
  }
});
test('World 8 unlocks from the correct branch ending and later stages require the previous clear',()=>{
  const c=content();Object.assign(c,{branch:'6A',localHost:false,nativeApp:false,isAdministrator:()=>false,storyBranchAllowed:()=>true,clears:new Set()});
  c.chosenStoryBranch=()=>c.branch;c.stageCleared=key=>c.clears.has(key);
  vm.runInContext(extract('  function storyStageUnlocked(','\n'),c);
  const first=c.story.findIndex(s=>s.key==='story-ch8-1');
  assert.equal(c.storyStageUnlocked(first),false);
  c.clears.add('story-ch7c-30');assert.equal(c.storyStageUnlocked(first),false);
  c.clears.add('story-ch7a-30');assert.equal(c.storyStageUnlocked(first),true);
  assert.equal(c.storyStageUnlocked(first+1),false);c.clears.add('story-ch8-1');assert.equal(c.storyStageUnlocked(first+1),true);
  c.branch='6B';c.clears.delete('story-ch7c-30');assert.equal(c.storyStageUnlocked(first),false);
  c.clears.add('story-ch7c-30');assert.equal(c.storyStageUnlocked(first),true);
  c.clears.delete('story-ch7c-30');c.clears.add('story-ch7b-30');assert.equal(c.storyStageUnlocked(first),true);
});
function battle(){
  const node={classList:{add(){},toggle(){}},textContent:''},pending=[];
  const c=vm.createContext({run:{spelling:true,story:true,question:{entry:['apple','n','사과'],answer:'p',choices:['a','p','c','d']},correct:0,index:0,hp:3,mp:2,iceTimeActive:true,timeStopped:true,deck:Array(40).fill({}),slashExpiresAt:0},pending,document:{querySelectorAll:()=>[],dispatchEvent(){}},CustomEvent:class{},$:()=>node,battleContactDelay:()=>100,reducedMotion:()=>true,setHeroAttackTravel(){},speak(){},performance:{now:()=>0},render(){},setTimeout:fn=>{pending.push(fn);return pending.length;},continueAfterFeedback:()=>{c.run.index++;c.run.locked=false;},finishBattle:(clear,reason)=>{c.run.done=true;c.reason=reason;},consumePugilistWeavingStep:()=>false});
  vm.runInContext(extract('  function answerStorySpelling(','  function renderBattle('),c);return c;
}
test('spelling answers advance once, release ice, reject locked/paused input, and preserve HP on correct answers',()=>{
  const c=battle();c.answerStorySpelling(1);c.answerStorySpelling(1);
  assert.equal(c.run.correct,1);assert.equal(c.run.hp,3);assert.equal(c.run.iceTimeActive,false);assert.equal(c.run.timeStopped,false);
  c.pending.splice(0).forEach(fn=>fn());assert.equal(c.run.index,1);
  for(const key of ['done','paused','locked','stunned','timeoutPending']){const c=battle();c.run[key]=true;c.answerStorySpelling(1);assert.equal(c.run.correct,0);}
});
test('wrong spelling loses HP, retains the current question, and cannot race a timeout',()=>{
  const c=battle();c.answerStorySpelling(0);assert.equal(c.run.hp,2);assert.equal(c.run.index,0);assert.equal(c.run.correct,0);
  c.pending.splice(0).forEach(fn=>fn());assert.equal(c.run.locked,false);
  c.run.hp=1;c.answerStorySpelling(0);c.pending.splice(0).forEach(fn=>fn());assert.equal(c.reason,'hp-zero');
  const timed=battle();timed.answerStorySpelling(1);timed.run.timeoutPending=true;timed.pending.splice(0).forEach(fn=>fn());assert.equal(timed.run.index,0);
});
test('all five World 8 scenes parse dialogue, branch-only passages and real boss art',()=>{
  for(const file of ['1-prologue','midboss-start','midboss-end','boss-start','boss-end']){
    const lines=parseWorldEightNarrative(readFileSync(new URL(`../assets/novel/world-8-${file}.md`,import.meta.url),'utf8'));
    assert.ok(lines.length>10);assert.ok(lines.every(line=>!line.text.includes('BGM:')&&!line.text.startsWith('[')&&line.speaker!=='이야기 연결'));
    if(file==='1-prologue'){assert.ok(lines.some(l=>l.branch==='7a'));assert.ok(lines.some(l=>l.branch==='7b'));assert.ok(lines.some(l=>l.speaker==='아서'&&!l.branch));}
    if(file==='boss-start')assert.ok(lines.some(l=>l.speaker==='바르가스'&&l.artPath.endsWith('char_vargas_world8_standing.webp')));
    if(file==='midboss-start')assert.ok(lines[0].sceneArt.endsWith('char_blackroot_elder_world8_standing.webp'));
  }
});

test('World 8 runtime selects all five scenes, filters branch dialogue, and returns endings to results',()=>{
  const novels={};vm.runInNewContext(readFileSync(new URL('../story-novel.js',import.meta.url),'utf8'),{window:novels});
  const c=vm.createContext({window:novels,stages:{'story-ch8-1':{storyChapter:11}},selectedStage:'story-ch8-1',branch:'6A',chosenStoryBranch:()=>c.branch,startBattle:()=>{c.destination='battle';},go:page=>{c.destination=page;}});
  vm.runInContext(extract('  function worldSevenNovelKey(){','  function renderStoryChapterSeven(){'),c);
  vm.runInContext(extract('  function completeStoryDialogue(){','  function epilogueLines(){'),c);
  for(const phase of ['Intro','MidbossStart','MidbossEnd','BossStart','BossEnd']){
    c.page=`storyChapterSeven${phase}`;
    assert.equal(c.worldSevenNovelKey(),`world8${phase==='Intro'?'Prologue':phase}`);
    const lines=c.storyDialogueLines();assert.ok(lines.length>10);
    c.completeStoryDialogue();assert.equal(c.destination,phase.endsWith('End')?'result':'battle');
  }
  c.page='storyChapterSevenIntro';
  for(const branch of ['6A','6B']){
    c.branch=branch;const lines=c.storyDialogueLines();
    assert.ok(lines.some(l=>l.branch===(branch==='6A'?'7a':'7b')));
    assert.ok(lines.every(l=>!l.branch||l.branch===(branch==='6A'?'7a':'7b')));
    assert.ok(lines.some(l=>l.speaker==='엘리엇'&&l.artPath?.endsWith('char_elliot_world6b_standing.webp')));
  }
});

function unlockState(localMode=true){
  const heroes=[{id:'warrior-a',class:'warrior',coins:0},{id:'mage',class:'mage',coins:0},{id:'warrior-b',class:'warrior',coins:0}];
  const stage='스토리 8장 30 · 잿빛 종이 울리는 마을';
  const c=vm.createContext({allCharacters:heroes,selectedCharacter:heroes[0],characterActiveSkillUnlocks:[],
    localMode,accountMode:!localMode,dbOnline:true,accountCrystals:0,player:'tester',selectedStage:'story-ch8-30',
    WORLD_EIGHT_FINAL_RECORD:stage,window:{WORDORIA_ACTIVE_SKILLS:{definitions:{warrior:{name:'불굴의 맹세'},mage:{name:'마나 실드'}}}},
    demoState:{characters:heroes,records:[]},records:[],stats:()=>({level:1}),stageRecordName:()=>stage,
    earnedCoins:correct=>correct+10,saveDemo(){},recoverAfterBattle(){},toast(){}});
  vm.runInContext(extract('  function hasNewActiveSkill(','  function readCustomPlayers('),c);
  vm.runInContext(extract('  async function saveBattleResult(','  async function saveKeurusReward('),c);
  return c;
}
const finalBattle=hero=>({story:true,spelling:true,storyStageKey:'story-ch8-30',storyCharacterId:hero.id,correct:40,deck:Array(40).fill({}),elapsed:60000});

test('HP 180 defeat saves 45 actual answers, pays the account once and unlocks each clearing character',async()=>{
  const c=unlockState();
  for(const [i,hero] of c.allCharacters.entries()){
    c.selectedCharacter=hero;
    const battle={...finalBattle(hero),vargas:true,bossHp:0,correct:45,deck:Array(45).fill({})};c.run=battle;
    assert.equal(c.isWorldEightFinalClear(battle,true),true);
    await c.saveBattleResult(battle,true);
    assert.equal(battle.result.coins_earned,i===0?55:0);
    assert.equal(c.hasNewActiveSkill(hero),true);
    const saved=c.demoState.records[0];assert.equal(saved.correct,45);assert.equal(saved.total,45);assert.equal(saved.vargasHpDefeated,true);
  }
  const invalid={...finalBattle(c.selectedCharacter),vargas:true,bossHp:1};
  assert.equal(c.isWorldEightFinalClear(invalid,true),false);
});

test('account HP defeat sends HP 0 and actual answers to the dedicated receipt RPC',async()=>{
  const c=unlockState(false),hero=c.allCharacters[0];
  const battle={...finalBattle(hero),vargas:true,bossHp:0,correct:45,deck:Array(45).fill({})};c.run=battle;
  let payload;c.rpc=async(name,args)=>{assert.equal(name,'claim_vargas_reward');payload=args;return [{game_score_id:987,coins_earned:64,balance:100}];};
  c.apiGet=async()=>[{character_id:hero.id,class_code:hero.class}];
  await c.saveBattleResult(battle,true);
  assert.equal(payload.p_correct,45);assert.equal(payload.p_boss_hp,0);assert.equal(payload.p_duration_ms,60000);
  assert.equal(c.accountCrystals,100);assert.equal(c.hasNewActiveSkill(hero),true);
  const failed=unlockState(false);failed.rpc=async()=>{throw Error('unavailable');};
  const retry={...finalBattle(failed.allCharacters[0]),vargas:true,bossHp:0,correct:45};failed.run=retry;
  await failed.saveBattleResult(retry,true);assert.equal(retry.saveError,true);assert.equal(failed.hasNewActiveSkill(failed.allCharacters[0]),false);
});
test('first World 8 clear rewards the account and unlocks only the clearing character',async()=>{
  const c=unlockState(),hero=c.allCharacters[0],battle=finalBattle(hero);c.run=battle;
  assert.equal(c.hasNewActiveSkill(hero),false);await c.saveBattleResult(battle,true);
  assert.equal(battle.result.coins_earned,50);assert.equal(battle.newActiveSkillUnlocked,'불굴의 맹세');
  assert.equal(c.hasNewActiveSkill(hero),true);assert.equal(c.hasNewActiveSkill(c.allCharacters[1]),false);assert.equal(c.hasNewActiveSkill(c.allCharacters[2]),false);
});
test('another class and another character of the same class unlock without repeated crystal rewards',async()=>{
  const c=unlockState();
  for(const [i,hero] of c.allCharacters.entries()){
    c.selectedCharacter=hero;const battle=finalBattle(hero);battle.storyReplay=i>0;c.run=battle;
    await c.saveBattleResult(battle,true);assert.equal(battle.result.coins_earned,i===0?50:0);assert.equal(c.hasNewActiveSkill(hero),true);
  }
  const replay=finalBattle(c.selectedCharacter);replay.storyReplay=true;c.run=replay;await c.saveBattleResult(replay,true);
  assert.equal(replay.result.coins_earned,0);assert.equal(replay.newActiveSkillUnlocked,undefined);
  assert.equal(Object.keys(c.demoState.characterActiveSkillUnlocks).length,3);
});
test('account zero-reward clears refresh durable unlocks even when score history is empty',async()=>{
  const c=unlockState(false),hero=c.allCharacters[1],battle=finalBattle(hero);c.selectedCharacter=hero;c.run=battle;
  const queries=[];c.rpc=async()=>[{game_score_id:'saved',coins_earned:0,balance:100}];
  c.apiGet=async query=>{queries.push(query);return query.startsWith('character_active_skill_unlocks?')?[{character_id:hero.id,class_code:hero.class}]:[];};
  await c.saveBattleResult(battle,true);
  assert.equal(battle.result.coins_earned,0);assert.equal(battle.newActiveSkillUnlocked,'마나 실드');assert.equal(c.hasNewActiveSkill(hero),true);
  assert.equal(c.records.length,0);assert.ok(queries.some(query=>query.startsWith('character_active_skill_unlocks?')));
  assert.equal(c.hasNewActiveSkill(c.allCharacters[0]),false);
  c.learningLevel='elementary';assert.equal(c.hasNewActiveSkill(hero),true);
});
test('failed saves, losses, midbosses and preview skips do not unlock additional actives',async()=>{
  const c=unlockState(),hero=c.allCharacters[0];
  for(const patch of [{storyStageKey:'story-ch8-15'},{localBossSkipped:true},{correct:39},{elapsed:120001}]){
    assert.equal(c.isWorldEightFinalClear({...finalBattle(hero),...patch},true),false);
  }
  assert.equal(c.isWorldEightFinalClear(finalBattle(hero),false),false);
  const battle=finalBattle(hero);await c.updateWorldEightSkillUnlock(battle,false);assert.equal(c.hasNewActiveSkill(hero),false);
});
test('old local character clears backfill independently of shared progress and survive record trimming',async()=>{
  const c=unlockState(),hero=c.allCharacters[0];c.demoState.records=[{character_id:hero.id,stage:c.WORLD_EIGHT_FINAL_RECORD,correct:40,total:40,cleared:true,duration_ms:60000}];
  assert.equal(c.hasNewActiveSkill(hero),true);assert.equal(c.hasNewActiveSkill(c.allCharacters[2]),false);
  const battle=finalBattle(hero);battle.result={game_score_id:'saved'};await c.updateWorldEightSkillUnlock(battle,true);
  c.demoState.records=[];assert.equal(c.hasNewActiveSkill(hero),true);assert.equal(battle.newActiveSkillUnlocked,undefined);
});
