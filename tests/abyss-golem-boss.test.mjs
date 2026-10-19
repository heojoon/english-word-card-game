import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const window={};vm.runInNewContext(read('abyss-golem-boss.js'),{window});
const rules=window.WORDORIA_ABYSS_GOLEM,source=read('crystal-game.js');
const code=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b));
const fresh=()=>({...rules.reset(),story:true,hp:20,mp:2,correct:0,index:0,elapsed:0,locked:false,paused:false,done:false,bossAttackSteps:3});

test('200 HP, five minutes; player damage uses contact and actual answers, lethal damage caps at zero',()=>{
  const s=fresh();assert.equal(s.storyTimeLimit,300000);assert.equal(rules.REWARD,300);
  rules.answer(s,true,200);rules.advance(s,199);assert.equal(s.bossHp,200);
  assert.ok(rules.advance(s,1).includes('hit'));assert.equal(s.bossHp,197);assert.equal(s.correct,1);
  rules.advance(s,300);s.bossHp=2;rules.answer(s,true,200);rules.advance(s,200);
  assert.equal(s.bossHp,0);assert.equal(s.guardianPhase,'defeat');
  rules.advance(s,400);assert.equal(rules.visual(s).frame,2);assert.equal(rules.visual(s).action,'hit');
  rules.advance(s,519);assert.equal(s.guardianPhase,'defeat');assert.ok(rules.advance(s,1).includes('victory'));
});

test('stamping rolls once per minute at 80%, damage at foot contact, odd HP rounds down and HP 1 dies',()=>{
  for(const [hp,result] of [[20,10],[3,1],[2,1],[1,0]]){
    const s=fresh();s.hp=hp;rules.advance(s,59999,()=>.79);assert.equal(s.golemStompMs,0);
    assert.ok(rules.advance(s,1,()=>.79).includes('stomp-start'));assert.equal(s.hp,hp);
    rules.advance(s,539,()=>.9);assert.equal(s.hp,hp);assert.equal(rules.visual(s).frame,1);
    const events=rules.advance(s,1,()=>.9);assert.ok(events.includes('stomp-hit'));assert.equal(s.hp,result);
    assert.equal(rules.visual(s).frame,2);
    if(result===0){assert.equal(s.locked,true);assert.equal(s.guardianPhase,'player-defeat');assert.equal(rules.stompMotion(s).progress,1);assert.ok(rules.advance(s,220).includes('defeat-player'));}
  }
  const miss=fresh();rules.advance(miss,60000,()=>.8);assert.equal(miss.golemStompMs,0);assert.equal(miss.hp,20);
  rules.advance(miss,60000,()=>.79);assert.ok(miss.golemStompMs>0);
});

test('bedrock arms each 10 seconds, becomes black, rolls 77% on next attack and consumes one charge',()=>{
  for(const [roll,blocked] of [[.769,true],[.77,false]]){
    const s=fresh();rules.advance(s,9999,()=>.99);assert.equal(s.golemBedrockReady,false);
    assert.ok(rules.advance(s,1,()=>.99).includes('bedrock-start'));rules.advance(s,720);
    assert.equal(rules.visual(s).action,'bedrock-rise');assert.equal(rules.visual(s).frame,2);
    rules.answer(s,true,200);const events=rules.advance(s,200,()=>roll);
    assert.equal(events.includes('blocked'),blocked);assert.equal(s.bossHp,blocked?200:197);
    assert.equal(s.correct,1);assert.equal(s.index,1);assert.equal(s.golemBedrockReady,false);
    if(blocked){assert.equal(rules.visual(s).action,'bedrock-rise');assert.equal(rules.visual(s).frame,2);}
    rules.advance(s,300);rules.answer(s,true,200);rules.advance(s,200,()=>0);assert.equal(s.bossHp,blocked?197:194);
  }
});

test('pause, Ice Time and pet clock freeze exact stomp and guard motion while player contact can finish',()=>{
  const s=fresh();rules.advance(s,60200,()=>0);const pose=JSON.stringify(rules.visual(s)),motion=JSON.stringify(rules.stompMotion(s));
  for(const freeze of ['paused','iceTimeActive','pet']){
    s.paused=freeze==='paused';s.iceTimeActive=freeze==='iceTimeActive';
    rules.advance(s,20000,()=>0,freeze==='pet'?0:20000);
    assert.equal(JSON.stringify(rules.visual(s)),pose);assert.equal(JSON.stringify(rules.stompMotion(s)),motion);assert.equal(s.hp,20);
  }
  s.paused=false;s.iceTimeActive=true;s.golemBedrockReady=false;rules.answer(s,true,200);rules.advance(s,500);
  assert.equal(s.bossHp,197);assert.equal(s.golemStompMs,560);assert.equal(s.hp,20);
});

test('large deltas preserve cadence and reduced motion preserves jump before contact',()=>{
  const s=fresh();s.hp=200;const events=Array.from(rules.advance(s,180760,()=>0));
  assert.equal(events.filter(e=>e==='stomp-start').length,3);assert.equal(events.filter(e=>e==='stomp-hit').length,3);
  assert.equal(events.filter(e=>e==='bedrock-start').length,18);assert.equal(s.hp,25);
  const r=fresh();r.guardianReducedMotion=true;rules.advance(r,60000,()=>0);assert.equal(r.golemStompMs,380);
  rules.advance(r,120);assert.equal(rules.visual(r).frame,1);rules.advance(r,149);assert.equal(r.hp,20);
  assert.ok(rules.advance(r,1).includes('stomp-hit'));assert.equal(r.hp,10);assert.equal(rules.visual(r).frame,2);
});

test('wrong-answer smash also applies damage at declared contact, then unlocks; exits clear all effects',()=>{
  const s=fresh();rules.answer(s,false,200);rules.advance(s,399);assert.equal(s.hp,20);
  assert.ok(rules.advance(s,1).includes('smash-hit'));assert.equal(s.hp,19);assert.equal(rules.visual(s).frame,2);
  rules.advance(s,180);assert.equal(s.locked,false);assert.equal(s.guardianPhase,'idle');
  rules.advance(s,60000,()=>0);rules.clear(s);assert.equal(s.golemStompMs,0);assert.equal(s.golemBedrockReady,false);assert.equal(s.golemNotice,'');
});

test('lethal smash holds contact with inputs locked, and a simultaneous lethal hero hit cancels stamping',()=>{
  const s=fresh();s.hp=1;rules.answer(s,false,200);rules.advance(s,400);assert.equal(s.hp,0);assert.equal(s.guardianPhase,'player-defeat');assert.equal(s.locked,true);assert.equal(rules.visual(s).frame,2);
  assert.equal(rules.answer(s,true,200),false);assert.ok(rules.advance(s,180).includes('defeat-player'));rules.clear(s);assert.equal(s.golemFatalPose,null);
  const t=fresh();t.hp=1;t.bossHp=1;t.golemStompMs=420;t.golemStompContact=false;rules.answer(t,true,200);
  const events=rules.advance(t,200,()=>0);assert.ok(events.includes('hit'));assert.equal(t.bossHp,0);assert.equal(t.hp,1);assert.equal(t.guardianPhase,'defeat');
});

test('unique vocabulary cycles extend beyond 200 correct answers when attacks are blocked',()=>{
  const words=Array.from({length:8},(_,i)=>['word'+i,'n','뜻'+i]);const deck=rules.deck(words,x=>x.slice());
  for(let i=0;i<200;i+=8)assert.equal(new Set(deck.slice(i,i+8).map(x=>x.entry[0])).size,8);
  const s={...fresh(),deck,index:200};const c=vm.createContext({window,run:s,selectedCharacter:{class:'warrior'},selectedStage:'boss',stages:{boss:{words}},buildQuestionDeck:()=>rules.deck(words,x=>x.slice()),makeQuestion:entry=>({entry}),performance:{now:()=>0}});
  vm.runInContext(code('  function prepareQuestion(', '  function initializeBattlePet('),c);c.prepareQuestion();assert.equal(s.deck.length,400);assert.ok(s.question);
});

test('World 6A stage 10 preserves record IDs, learning-level progress and sequential unlocking',()=>{
  let level='middle';const c=vm.createContext({window,stages:JSON.parse(read('content/catalog.json')).stages,learningLevel:()=>level,stageLevel:s=>s?.learningLevel||'middle',storyBranchPreview:null,run:null,records:[],demoState:{storyBranch:'6A'},accountMode:false,localHost:false,nativeApp:false});
  vm.runInContext(code('  const storyStages = [','  const storyStageKey=')+'\nthis.storyStages=storyStages;',c);
  vm.runInContext(code('  function stageRecordName(','  function earnedCoins('),c);c.configureStoryContent();
  const i=c.storyStages.findIndex(s=>s.key==='story-ch6a-10');assert.equal(c.storyStageUnlocked(i),false);
  c.records.push({stage:c.stageRecordName('story-ch6a-9'),cleared:true});assert.equal(c.storyStageUnlocked(i),true);
  const name=c.stageRecordName('story-ch6a-10');assert.equal(name,'스토리 6A장 10 · 반전세계');
  c.records.push({stage:name,cleared:true});level='elementary';c.configureStoryContent();assert.equal(c.stageRecordName('story-ch6a-10'),name);assert.equal(c.stageCleared('story-ch6a-10'),true);
  assert.equal(c.stages['story-ch6a-10'].abyssGolem,true);assert.equal(c.stages['story-ch6a-10'].questionCount,200);
  assert.equal(c.storyStageUnlocked(i+1),true);assert.ok(readFileSync(new URL('../'+rules.ART,import.meta.url)).length);
  assert.match(read('index.html'),/src="abyss-golem-boss.js/);assert.match(read('scripts/build-web.mjs'),/'abyss-golem-boss.js'/);
});

test('shared Ice Time stops actual countdown, timeout ends combat, and lethal pose hold can finish',()=>{
  const s=fresh(),outcomes=[];const c=vm.createContext({window,run:s,performance:{now:()=>1000},selectedCharacter:{class:'mage'},updateWarriorSlash(){},render(){},syncAbyssGolemBattleVisual(){},$:()=>null,document:{dispatchEvent(){},querySelector:()=>null},CustomEvent:class{},setTimeout(){},finishBattle:(clear,reason)=>outcomes.push([clear,reason])});
  vm.runInContext(code('  function advanceGuardianBattle(','  function renderRoyalSlimeBattle('),c);
  vm.runInContext(code('  function canActivateMageIceTime(','  function updateWarriorSlash('),c);
  c.activateMageIceTime();assert.equal(s.mp,1);c.advanceGuardianBattle(5000);assert.equal(s.elapsed,0);assert.equal(s.golemStampElapsed,0);
  s.iceTimeActive=false;s.elapsed=299999;c.advanceGuardianBattle(1);assert.deepEqual(outcomes,[[false,'timeout']]);
  outcomes.length=0;s.guardianPhase='defeat';s.guardianRemaining=920;s.bossHp=0;c.advanceGuardianBattle(920);assert.deepEqual(outcomes,[[true,'boss-defeated']]);
});

test('answer releases Ice Time and a mana potion enables reuse',async()=>{
  const s={...fresh(),mp:1,mpMax:1,question:{entry:['word','n','뜻'],choices:['yes','no'],answer:'yes'}};
  const c=vm.createContext({window,run:s,selectedCharacter:{id:'c',class:'mage'},performance:{now:()=>1000},render(){},document:{querySelector:()=>null},setTimeout(){},battleContactDelay:()=>200,speak(){},equippedPotions:()=>['blue'],potionTypes:{blue:{name:'마나포션'}},localMode:true,potionInventory:{equipped_slot_1:'blue'},demoState:{},saveDemo(){},toast(){}});
  vm.runInContext(code('  function canActivateMageIceTime(','  function updateWarriorSlash('),c);vm.runInContext(code('  function guardianAnswer(','  function advanceGuardianBattle('),c);vm.runInContext(code('  async function useStoryPotion(','  function royalSlimeTime('),c);
  c.activateMageIceTime();c.guardianAnswer(0);assert.equal(s.iceTimeActive,false);rules.advance(s,500);
  await c.useStoryPotion(0,{});assert.equal(s.mp,1);c.activateMageIceTime();assert.equal(s.iceTimeActive,true);
  c.guardianAnswer(1);assert.equal(s.iceTimeActive,false);rules.advance(s,400);assert.equal(s.hp,19);
});

test('renderer has SD assets, shared Ice Time, 200 HP, four choices and black guard frame',()=>{
  const s={...fresh(),question:{choices:['yes','no','a','b'],prompt:'word',answer:'yes'},iceTimeActive:true,golemBedrockReady:true};
  const c=vm.createContext({window,run:s,esc:String,deployedAssetUrl:x=>x,royalSlimeTime:()=>'',battleHeroMarkup:()=>'',storyVitalsMarkup:()=>'',iceTimeEffectMarkup:()=>'<i class="ice-time-field"></i>',eagleEyeEffectMarkup:()=>'',storyBattleActions:()=>''});
  vm.runInContext(code('  function abyssGolemSpriteStyle(','  function banditChiefSpriteStyle('),c);const html=c.renderAbyssGolemBattle();
  assert.match(html,/ice-time-field/);assert.match(html,/aria-valuemax="200"/);assert.match(html,/bedrock_rise_strip.png/);assert.match(html,/background-position:100%/);assert.equal((html.match(/data-action="answer"/g)||[]).length,4);assert.doesNotMatch(html,/standing.png/);
});

test('every shipped strip matches timing, frame count, facing, alpha contract and contact/hold metadata',()=>{
  for(const [action,durations] of Object.entries(rules.ANIMATIONS)){
    const file=rules.SPRITE_ROOT+'monster_abyss_golem_sd_'+action.replaceAll('-','_')+'_strip';const m=JSON.parse(read(file+'.json'));
    assert.equal(m.frameCount,3);assert.equal(m.facing,'left');assert.deepEqual(m.frames.map(f=>f.durationMs),Array.from(durations));
    assert.ok(readFileSync(new URL('../'+file+'.png',import.meta.url)).length);
    if(action==='attack'||action==='ground-stamping')assert.equal(m.frames[2].hit,true);
    if(action==='hit')assert.equal(m.frames[2].hold,true);
  }
});

test('all exits clear skill state and save actual totals without fixed-reward treasure chests',async()=>{
  for(const clear of [true,false]){
    const s={...fresh(),correct:67,deck:Array(200),golemStompMs:300,golemBedrockReady:true,iceTimeActive:true},saved=[];
    const c=vm.createContext({window,run:s,selectedStage:'story-ch6a-10',storyStages:[{key:'story-ch6a-10',chapter:7,number:10}],persistStoryBattleVitals(){},clearInterval(){},clearTimeout(){},removeBattleReward(){},cancelSpeech(){},timerId:0,nextTimer:0,saveBattleResult:async(r,won)=>saved.push([won,r.correct,r.deck.length]),stageCleared:()=>true,go(){},document:{dispatchEvent(){}},CustomEvent:class{}});
    vm.runInContext(code('  async function finishBattle(','  async function saveBattleResult('),c);await c.finishBattle(clear,clear?'boss-defeated':'leave');
    assert.deepEqual(saved,[[clear,67,clear?67:200]]);assert.equal(s.golemStompMs,0);assert.equal(s.golemBedrockReady,false);assert.equal(s.iceTimeActive,false);
  }
});

test('retry requires recovered HP and resets boss HP and clocks without refilling player vitals',()=>{
  const key='story-ch6a-10',old={...fresh(),done:true,hp:0,mp:0,golemStampElapsed:59000,golemBedrockReady:true};
  const c=vm.createContext({window,run:old,selectedStage:key,selectedCharacter:{id:'c',class:'mage'},stages:{[key]:{story:true,abyssGolem:true}},storyStages:[{key,chapter:7,number:10}],storyStageUnlocked:()=>true,storyEntryAllowed:()=>false,storyVitals:()=>({hp:0,hpMax:2,mp:0,mpMax:2}),clearInterval(){},clearTimeout(){},removeBattleReward(){},timerId:0,nextTimer:0,levelReady:()=>true,buildQuestionDeck:()=>Array(200),reducedMotion:()=>false,bossAttackSteps:()=>3,initializeBattlePet(){},stageCleared:()=>false,prepareQuestion(){},closeDialog(){},go(){},tick(){}});
  vm.runInContext(code('  function startBattle(','  function prepareQuestion('),c);c.startBattle(true);assert.equal(c.run,old);
  c.storyEntryAllowed=()=>true;c.storyVitals=()=>({hp:1,hpMax:2,mp:0,mpMax:2});c.startBattle(true);assert.equal(c.run.hp,1);assert.equal(c.run.mp,0);assert.equal(c.run.bossHp,200);assert.equal(c.run.golemStampElapsed,0);assert.equal(c.run.golemBedrockReady,false);
});

test('stomp targets actual hero position across narrow/wide/scaled viewports without cumulative drift',()=>{
  for(const width of [296,366,600])for(const zoom of [1,.8]){
    const s=fresh();s.golemStompMs=220;s.golemStompContact=true;
    const rect=(left,top,w,h)=>({left:left*zoom+12,top:top*zoom+40,width:w*zoom,height:h*zoom});
    const enemy={offsetLeft:width-170,offsetWidth:156,offsetTop:30,style:{}},hero={getBoundingClientRect:()=>rect(10,50,100,140)};
    const arena={clientWidth:width,getBoundingClientRect:()=>rect(0,0,width,210),querySelector:q=>q.includes('abyss-golem-enemy')?enemy:hero};
    const c=vm.createContext({window,run:s,deployedAssetUrl:x=>x,$:()=>arena,document:{querySelector:()=>({style:{}})}});
    vm.runInContext(code('  function abyssGolemSpriteStyle(','  function renderAbyssGolemBattle('),c);c.syncAbyssGolemBattleVisual();
    const expected=`translate(${60-(width-170+78)}px,0px)`;assert.equal(enemy.style.transform,expected);assert.equal(enemy.style.zIndex,'8');c.syncAbyssGolemBattleVisual();assert.equal(enemy.style.transform,expected);
    s.golemStompMs=0;c.syncAbyssGolemBattleVisual();assert.equal(enemy.style.transform,'');assert.equal(enemy.style.zIndex,'');
  }
});

test('entry shows full-body standing CG, both skills and fixed reward',()=>{
  const c=vm.createContext({window,esc:String,deployedAssetUrl:x=>x});vm.runInContext(code('  function bossIntroductionMarkup(','  function confirmStoryStage('),c);
  const html=c.bossIntroductionMarkup({chapter:7,number:10});assert.match(html,/monster_abyss_golem_standing.png/);assert.match(html,/300/);assert.match(html,/그라운드 스탬핑/);assert.match(html,/배드락라이즈/);assert.doesNotMatch(html,/_strip.png/);
});
