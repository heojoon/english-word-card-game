import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const window={};vm.runInNewContext(read('sorcerus-boss.js'),{window});
const rules=window.WORDORIA_SORCERUS,source=read('crystal-game.js');
const code=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b));
const fresh=()=>({...rules.reset(),correct:0,index:0,hp:3,mp:2,locked:false,paused:false,done:false});
function hit(s,damage=1){s.bossAttackSteps=damage;assert.equal(rules.answer(s,true,200),true);const events=Array.from(rules.advance(s,500));while(['ice-cast','healing'].includes(s.guardianPhase))events.push(...rules.advance(s,s.guardianRemaining));return events;}

test('120 HP takes damage only at contact, freezes at each 12 damage, and releases at exactly 3 seconds',()=>{
  const s=fresh();hit(s,11);assert.equal(s.bossHp,109);assert.equal(s.shadowFreezeMs,0);
  s.bossAttackSteps=1;rules.answer(s,true,200);rules.advance(s,199);assert.equal(s.bossHp,109);
  rules.advance(s,1);assert.equal(s.bossHp,108);assert.equal(s.shadowFreezeMs,0);rules.advance(s,300);assert.equal(s.guardianPhase,'ice-cast');rules.advance(s,319);assert.equal(s.shadowFreezeMs,0);assert.ok(rules.advance(s,1).includes('freeze-start'));assert.equal(s.shadowFreezeMs,3000);
  assert.equal(rules.answer(s,true,200),false);rules.advance(s,2999);assert.equal(s.shadowFreezeMs,1);
  assert.ok(rules.advance(s,1).includes('freeze-end'));assert.equal(rules.answer(s,true,200),true);
  rules.advance(s,500);hit(s,11);assert.equal(s.bossHp,96);assert.ok(s.shadowFreezeMs>0);
});

test('healing repeats every ten consecutive answers, restores 24 capped at 120, and wrong answers reset the streak',()=>{
  const s=fresh();
  for(let i=0;i<9;i++)hit(s);
  assert.equal(s.bossHp,111);assert.equal(s.sorcerusHealMs,0);
  assert.ok(hit(s).includes('heal-start'));assert.equal(s.bossHp,120);assert.equal(s.sorcerusHealAmount,10);assert.equal(s.sorcerusStreak,0);
  for(let i=0;i<9;i++){if(s.shadowFreezeMs)rules.advance(s,s.shadowFreezeMs);hit(s);}
  if(s.shadowFreezeMs)rules.advance(s,s.shadowFreezeMs);
  assert.ok(hit(s).includes('heal-start'));assert.equal(s.sorcerusStreak,0);
  const reset=fresh();reset.sorcerusStreak=9;rules.answer(reset,false,200);rules.advance(reset,500);hit(reset);
  assert.equal(reset.sorcerusStreak,1);assert.equal(reset.sorcerusHealMs,0);
  const full=fresh();full.bossHp=60;full.sorcerusStreak=9;hit(full);assert.equal(full.bossHp,83);assert.equal(full.sorcerusHealAmount,24);
});

test('healing and freezing can trigger together; lethal hits suppress both skills and hold defeat',()=>{
  const s=fresh();s.sorcerusStreak=9;s.sorcerusDamage=11;s.bossHp=50;
  const events=hit(s);assert.ok(events.includes('heal-start'));assert.ok(events.includes('freeze-start'));assert.equal(s.bossHp,73);
  assert.equal(s.sorcerusNextFreeze,24);
  const final=fresh();final.bossHp=1;final.sorcerusDamage=119;final.sorcerusNextFreeze=120;final.sorcerusStreak=9;
  rules.answer(final,true,200);assert.deepEqual(Array.from(rules.advance(final,200)),['hit']);assert.equal(final.bossHp,0);assert.equal(final.guardianVisual,'defeat');
  assert.ok(!rules.advance(final,999).includes('victory'));assert.ok(rules.advance(final,1).includes('victory'));assert.equal(final.shadowFreezeMs,0);
});

test('pause, reduced motion and large deltas retain skill durations and end feedback',()=>{
  const s=fresh();s.guardianReducedMotion=true;rules.answer(s,true,200);s.paused=true;rules.advance(s,10000);assert.equal(s.bossHp,120);
  s.paused=false;s.bossAttackSteps=12;s.sorcerusPendingDamage=12;rules.advance(s,510);assert.equal(s.shadowFreezeMs,3000);
  s.paused=true;rules.advance(s,5000);assert.equal(s.shadowFreezeMs,3000);s.paused=false;s.iceTimeActive=true;
  assert.ok(rules.advance(s,3000).includes('freeze-end'));
  const big=fresh();rules.answer(big,true,200);const events=rules.advance(big,10000);assert.equal(big.bossHp,119);assert.equal(events.filter(e=>e==='hit').length,1);assert.equal(big.locked,false);
});

test('freeze markup retains readable answers, disables all choices, and uses shared mage ice artwork',()=>{
  const s=fresh();s.shadowFreezeMs=3000;s.sorcerusHealMs=1200;s.sorcerusHealAmount=24;s.question={prompt:'word',choices:['정답','오답1','오답2','오답3'],answer:'정답'};
  const c=vm.createContext({window,run:s,esc:String,royalSlimeTime:()=>'',battleHeroMarkup:()=>'',storyVitalsMarkup:()=>'',iceTimeEffectMarkup:()=>'',eagleEyeEffectMarkup:()=>'',storyBattleActions:()=>''});
  vm.runInContext(code('  function renderSorcerusBattle(', '  function renderGuardianBattle('),c);
  const html=c.renderSorcerusBattle();for(const choice of s.question.choices)assert.ok(html.includes(choice));
  assert.equal((html.match(/data-action="answer"[^>]*disabled/g)||[]).length,4);
  assert.match(html,/fx_ice_time_field.svg/);assert.match(html,/sorcerus-heal-light/);assert.match(html,/힐링 · HP \+24/);assert.match(html,/aria-valuemax="120"/);
});

test('healing extends the question deck and runtime keeps mage ice and timeout behavior',()=>{
  const words=Array.from({length:30},(_,i)=>['word'+i,'n','뜻'+i]);
  const deck=rules.deck(words,x=>x.slice());assert.equal(deck.length,120);
  for(let i=0;i<120;i+=30)assert.equal(new Set(deck.slice(i,i+30).map(x=>x.entry[0])).size,30);
  const s={...fresh(),story:true,deck,index:120,elapsed:0};
  const outcomes=[],c=vm.createContext({window,run:s,selectedStage:'test',stages:{test:{words}},selectedCharacter:{class:'mage'},buildQuestionDeck:()=>rules.deck(words,x=>x.slice()),makeQuestion:entry=>({entry,choices:['yes','no'],answer:'yes'}),performance:{now:()=>1000},render(){},syncSorcerusBattleVisual(){},updateWarriorSlash(){},$:()=>null,finishBattle:(clear,reason)=>outcomes.push([clear,reason]),document:{dispatchEvent(){},querySelector:()=>null},CustomEvent:class{},setTimeout(){}});
  vm.runInContext(code('  function prepareQuestion(', '  function initializeBattlePet('),c);c.prepareQuestion();assert.equal(s.deck.length,240);assert.ok(s.question);
  vm.runInContext(code('  function advanceGuardianBattle(', '  function renderRoyalSlimeBattle('),c);
  vm.runInContext(code('  function canActivateMageIceTime(', '  function updateWarriorSlash('),c);
  c.activateMageIceTime();assert.equal(s.mp,1);assert.equal(s.iceTimeActive,true);c.advanceGuardianBattle(5000);assert.equal(s.elapsed,0);
  s.iceTimeActive=false;s.elapsed=s.storyTimeLimit-1;c.advanceGuardianBattle(1);assert.deepEqual(outcomes,[[false,'timeout']]);
});

test('World 5 intro describes both skills and entry/build include the boss rules',()=>{
  const c=vm.createContext({window,esc:String,deployedAssetUrl:x=>x});
  vm.runInContext(code('  function bossIntroductionMarkup(', '  function confirmStoryStage('),c);
  const html=c.bossIntroductionMarkup({chapter:5,number:10});
  for(const text of ['이성을 잃은 소서러스','HP 120','아이스 타임','3초','힐링','10연속','20%'])assert.ok(html.includes(text));
  assert.match(read('index.html'),/src="sorcerus-boss.js/);assert.match(read('scripts/build-web.mjs'),/'sorcerus-boss.js'/);
  assert.match(code('  async function finishBattle(', '  async function saveBattleResult('),/run.guardian&&!run.sorcerus/);
});

test('win saves through the normal Story path, opens World 5 ending, and clears effects on every exit',async()=>{
  for(const clear of [true,false]){
    const s={...fresh(),story:true,shadowFreezeMs:2500,sorcerusHealMs:800,deck:Array(120)},pages=[],saves=[];
    const c=vm.createContext({run:s,selectedStage:'story-ch5-10',storyStages:[{key:'story-ch5-10',chapter:5,number:10}],persistStoryBattleVitals(){},clearInterval(){},clearTimeout(){},removeBattleReward(){},cancelSpeech(){},timerId:0,nextTimer:0,saveBattleResult:async(battle,won)=>saves.push(won),stageCleared:()=>true,go:page=>pages.push(page),document:{dispatchEvent(){}},CustomEvent:class{}});
    vm.runInContext(code('  async function finishBattle(', '  async function saveBattleResult('),c);
    await c.finishBattle(clear,clear?'boss-defeated':'leave');
    assert.deepEqual(saves,[clear]);assert.deepEqual(pages,[clear?'storyChapterFiveMidbossEnd':'result']);
    assert.equal(s.shadowFreezeMs,0);assert.equal(s.sorcerusHealMs,0);assert.equal(s.iceTimeActive,false);assert.equal(s.done,true);
  }
});

test('midboss retry restores vitals and resets healing, damage and freeze while checking stage access',()=>{
  const key='story-ch5-10',old={...fresh(),done:true,clear:false,hp:0,mp:0,shadowFreezeMs:2500,sorcerusDamage:100,sorcerusStreak:9};
  const c=vm.createContext({window,run:old,selectedStage:key,selectedCharacter:{id:'c',class:'mage'},stages:{[key]:{story:true,sorcerus:true}},storyStages:[{key,chapter:5,number:10}],storyStagePlayable:()=>true,storyStageUnlocked:()=>true,storyRecoveryBusy:false,storyEntryAllowed:()=>false,storyVitals:()=>({hp:0,hpMax:2,mp:0,mpMax:2}),clearInterval(){},clearTimeout(){},removeBattleReward(){},timerId:0,nextTimer:0,levelReady:()=>true,buildQuestionDeck:()=>Array(120),reducedMotion:()=>false,bossAttackSteps:()=>1,initializeBattlePet(){},stageCleared:()=>false,prepareQuestion(){},closeDialog(){},go(){},tick(){}});
  vm.runInContext(code('  function startBattle(', '  function prepareQuestion('),c);
  c.startBattle(true);assert.equal(c.run.hp,2);assert.equal(c.run.mp,2);assert.equal(c.run.bossHp,120);assert.equal(c.run.shadowFreezeMs,0);assert.equal(c.run.sorcerusDamage,0);assert.equal(c.run.sorcerusStreak,0);
  c.run=old;c.storyStagePlayable=()=>false;c.startBattle(true);assert.equal(c.run,old);
});

test('animation manifests match runtime frame sizes, timing and exact contact boundaries',()=>{
  for(const [action,spec] of Object.entries(rules.ANIMATIONS)){
    const file=JSON.parse(read(`assets/monsters/sorcerus/char_sorcerus_sd_${spec.file}_strip.json`));
    assert.equal(file.frameWidth,spec.width);assert.equal(file.frameCount,spec.durations.length);
    assert.deepEqual(file.frames.map(frame=>frame.duration),Array.from(spec.durations));
  }
  const s=fresh();s.sorcerusStreak=9;s.bossHp=60;
  rules.answer(s,true,200);rules.advance(s,500);assert.equal(s.guardianPhase,'healing');assert.equal(s.bossHp,59);
  assert.equal(rules.visual(s).frame,0);rules.advance(s,199);assert.equal(s.bossHp,59);
  assert.ok(rules.advance(s,1).includes('heal-start'));assert.equal(s.bossHp,83);assert.equal(rules.visual(s).frame,1);
  s.paused=true;rules.advance(s,10000);assert.equal(rules.visual(s).frame,1);
  s.paused=false;rules.advance(s,1000);assert.equal(s.guardianPhase,'idle');assert.equal(s.locked,false);
});

test('idle stops under player Ice Time, damage advances to recoil, and defeat holds the final slot',()=>{
  const s=fresh();rules.advance(s,600);assert.equal(rules.visual(s).frame,1);
  s.iceTimeActive=true;rules.advance(s,600);assert.equal(rules.visual(s).frame,1);
  s.iceTimeActive=false;s.bossHp=1;rules.answer(s,true,200);rules.advance(s,200);
  assert.equal(rules.visual(s).action,'hit');assert.equal(rules.visual(s).frame,0);
  rules.advance(s,140);assert.equal(rules.visual(s).frame,1);
  rules.advance(s,160);assert.equal(rules.visual(s).frame,2);
  s.paused=true;rules.advance(s,10000);assert.equal(rules.visual(s).frame,2);
  s.paused=false;assert.ok(rules.advance(s,700).includes('victory'));assert.equal(rules.visual(s).frame,2);
  const reduced=fresh();reduced.guardianReducedMotion=true;rules.advance(reduced,600);assert.equal(rules.visual(reduced).frame,0);
});

test('a lethal contact before timeout completes the knockdown without losing to its hold duration',()=>{
  const s={...fresh(),story:true,elapsed:rules.TIME_MS,guardianPhase:'defeat',guardianVisual:'defeat',guardianRemaining:1000,sorcerusPhaseMs:0,bossHp:0};
  const outcomes=[],c=vm.createContext({window,run:s,updateWarriorSlash(){},render(){},syncSorcerusBattleVisual(){},$:()=>null,finishBattle:(clear,reason)=>outcomes.push([clear,reason])});
  vm.runInContext(code('  function advanceGuardianBattle(', '  function renderRoyalSlimeBattle('),c);
  c.advanceGuardianBattle(999);assert.deepEqual(outcomes,[]);assert.equal(s.elapsed,rules.TIME_MS);
  c.advanceGuardianBattle(1);assert.deepEqual(outcomes,[[true,'boss-defeated']]);
});
