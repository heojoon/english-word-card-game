import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const window={};vm.runInNewContext(read('bandit-chief-boss.js'),{window});
const rules=window.WORDORIA_BANDIT_CHIEF,source=read('crystal-game.js');
const code=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b));
const fresh=()=>({...rules.reset(),story:true,hp:20,mp:2,correct:0,index:0,elapsed:0,locked:false,paused:false,done:false,bossAttackSteps:3});
test('200 HP / five minutes; DMG 3 applies at contact, counts one answer, and caps lethal damage',()=>{
  const s=fresh();assert.equal(s.storyTimeLimit,300000);rules.answer(s,true,200);rules.advance(s,199);assert.equal(s.bossHp,200);
  assert.ok(rules.advance(s,1).includes('hit'));assert.equal(s.bossHp,197);assert.equal(s.correct,1);assert.equal(s.index,1);
  rules.advance(s,300);s.bossHp=2;rules.answer(s,true,200);rules.advance(s,200);assert.equal(s.bossHp,0);
  assert.equal(s.guardianPhase,'defeat');assert.ok(rules.advance(s,1000).includes('victory'));
});
test('axes launch every five seconds and resolve 50 percent damage at arrival',()=>{
  const s=fresh();rules.advance(s,4999,()=>.5);assert.equal(s.axeFlightMs,0);
  assert.ok(rules.advance(s,1,()=>.5).includes('axe-start'));assert.equal(s.hp,20);
  rules.advance(s,599,()=>.49);assert.equal(s.hp,20);assert.ok(rules.advance(s,1,()=>.49).includes('axe-hit'));assert.equal(s.hp,19);
  rules.advance(s,4400,()=>.9);assert.equal(s.axeFlightMs,600);assert.ok(rules.advance(s,600,()=>.5).includes('axe-miss'));assert.equal(s.hp,19);
});
test('70 percent dodge every six seconds blocks exactly one correct attack while retaining answers',()=>{
  const s=fresh();rules.advance(s,6000,()=>.69);assert.equal(s.banditDodgeReady,true);
  rules.answer(s,true,200);assert.ok(rules.advance(s,200,()=>.9).includes('dodged'));assert.equal(s.bossHp,200);assert.equal(s.correct,1);
  rules.advance(s,300,()=>.9);rules.answer(s,true,200);rules.advance(s,500,()=>.9);assert.equal(s.bossHp,197);assert.equal(s.correct,2);
  const miss=fresh();rules.advance(miss,6000,()=>.7);assert.equal(miss.banditDodgeReady,false);
});
test('pause, Ice Time and pet time stop skill clocks and axes but contact feedback completes',()=>{
  const s=fresh();rules.advance(s,5000,()=>.9);s.paused=true;rules.advance(s,20000);assert.equal(s.axeFlightMs,600);
  s.paused=false;s.iceTimeActive=true;rules.advance(s,20000);assert.equal(s.axeFlightMs,600);assert.equal(s.axeElapsed,0);
  rules.answer(s,true,200);rules.advance(s,500);assert.equal(s.bossHp,197);assert.equal(s.axeFlightMs,600);
  s.iceTimeActive=false;rules.advance(s,1000,()=>.9,0);assert.equal(s.axeFlightMs,600);
  rules.advance(s,600,()=>0);assert.equal(s.hp,19);
});
test('large delta, simultaneous skills, reduced motion and lethal axes retain event ordering',()=>{
  const s=fresh();const events=Array.from(rules.advance(s,30600,()=>0));assert.equal(events.filter(e=>e==='axe-start').length,6);assert.equal(events.filter(e=>e==='axe-hit').length,6);assert.equal(events.filter(e=>e==='dodge-start').length,5);
  const reduced=fresh();reduced.guardianReducedMotion=true;rules.advance(reduced,5000,()=>0);assert.equal(reduced.axeFlightMs,300);rules.advance(reduced,300,()=>0);assert.equal(reduced.hp,19);
  const lethal=fresh();lethal.hp=1;assert.ok(rules.advance(lethal,5600,()=>0).includes('defeat-player'));assert.equal(lethal.hp,0);assert.equal(lethal.axeFlightMs,0);
});
test('decks exhaust unique cycles and extend beyond 200 answers when bosses dodge',()=>{
  const words=Array.from({length:8},(_,i)=>['word'+i,'n','뜻'+i]);
  const deck=rules.deck(words,x=>x.slice());assert.equal(deck.length,200);
  for(let i=0;i<200;i+=8)assert.equal(new Set(deck.slice(i,i+8).map(x=>x.entry[0])).size,8);
  const s={...fresh(),deck,index:200};
  const c=vm.createContext({window,run:s,selectedCharacter:{class:'warrior'},selectedStage:'boss',stages:{boss:{words}},buildQuestionDeck:()=>rules.deck(words,x=>x.slice()),makeQuestion:entry=>({entry}),performance:{now:()=>0}});
  vm.runInContext(code('  function prepareQuestion(', '  function initializeBattlePet('),c);c.prepareQuestion();assert.equal(s.deck.length,400);assert.ok(s.question);
});
test('World 6B unlocks after World 5, keeps records across levels, and ships reference plus rules',()=>{
  let level='middle';const c=vm.createContext({window,stages:JSON.parse(read('content/catalog.json')).stages,learningLevel:()=>level,stageLevel:s=>s?.learningLevel||'middle',records:[],accountMode:false,localHost:false,nativeApp:false});
  vm.runInContext(code('  const storyStages = [','  const storyStageKey=')+'\nthis.storyStages=storyStages;',c);
  vm.runInContext(code('  function stageRecordName(','  function earnedCoins('),c);c.configureStoryContent();
  const i=c.storyStages.findIndex(s=>s.key==='story-ch6-10');assert.equal(c.storyStageUnlocked(i),false);
  c.records.push({stage:c.stageRecordName('story-ch5-20'),cleared:true});assert.equal(c.storyStageUnlocked(i),true);
  const name=c.stageRecordName('story-ch6-10');c.records.push({stage:name,cleared:true});level='elementary';c.configureStoryContent();assert.equal(c.stageRecordName('story-ch6-10'),name);assert.equal(c.stageCleared('story-ch6-10'),true);
  assert.equal(c.stages['story-ch6-10'].banditChief,true);assert.ok(c.stages['story-ch6-10'].words.length>=4);
  assert.ok(readFileSync(new URL('../'+rules.ART,import.meta.url)).length);assert.match(read('index.html'),/src="bandit-chief-boss.js/);assert.match(read('scripts/build-web.mjs'),/'bandit-chief-boss.js'/);
});
test('shared Ice Time freezes countdown, timeout ends combat, and lethal hit hold can complete',()=>{
  const s=fresh(),outcomes=[];const c=vm.createContext({window,run:s,performance:{now:()=>1000},selectedCharacter:{class:'mage'},updateWarriorSlash(){},render(){},$:()=>null,document:{dispatchEvent(){},querySelector:()=>null},CustomEvent:class{},setTimeout(){},finishBattle:(clear,reason)=>outcomes.push([clear,reason])});
  vm.runInContext(code('  function advanceGuardianBattle(','  function renderRoyalSlimeBattle('),c);
  vm.runInContext(code('  function canActivateMageIceTime(','  function updateWarriorSlash('),c);
  c.activateMageIceTime();assert.equal(s.mp,1);c.advanceGuardianBattle(5000);assert.equal(s.elapsed,0);assert.equal(s.axeElapsed,0);
  s.iceTimeActive=false;s.elapsed=299999;c.advanceGuardianBattle(1);assert.deepEqual(outcomes,[[false,'timeout']]);
  outcomes.length=0;s.guardianPhase='defeat';s.guardianRemaining=1000;s.bossHp=0;c.advanceGuardianBattle(1000);assert.deepEqual(outcomes,[[true,'boss-defeated']]);
});
test('answers release Ice Time and a mana potion enables reuse',async()=>{
  const s={...fresh(),mp:1,mpMax:1,question:{entry:['word','n','뜻'],choices:['yes','no'],answer:'yes'}};
  const c=vm.createContext({window,run:s,selectedCharacter:{id:'c',class:'mage'},performance:{now:()=>1000},render(){},document:{querySelector:()=>null},setTimeout(){},battleContactDelay:()=>200,speak(){},equippedPotions:()=>['blue'],potionTypes:{blue:{name:'마나포션'}},localMode:true,potionInventory:{equipped_slot_1:'blue'},demoState:{},saveDemo(){},toast(){}});
  vm.runInContext(code('  function canActivateMageIceTime(','  function updateWarriorSlash('),c);
  vm.runInContext(code('  function guardianAnswer(','  function advanceGuardianBattle('),c);
  vm.runInContext(code('  async function useStoryPotion(','  function royalSlimeTime('),c);
  c.activateMageIceTime();assert.equal(s.mp,0);c.guardianAnswer(0);assert.equal(s.iceTimeActive,false);rules.advance(s,500,()=>.9);
  await c.useStoryPotion(0,{});assert.equal(s.mp,1);c.activateMageIceTime();assert.equal(s.mp,0);assert.equal(s.iceTimeActive,true);
  c.guardianAnswer(1);assert.equal(s.iceTimeActive,false);assert.equal(s.hp,19);
});
test('victory stores actual answer totals and every exit clears boss effects',async()=>{
  for(const clear of [true,false]){
    const s={...fresh(),correct:67,deck:Array(200),axeFlightMs:300,banditDodgeReady:true,iceTimeActive:true},saved=[],pages=[];
    const c=vm.createContext({window,run:s,selectedStage:'story-ch6-10',storyStages:[{key:'story-ch6-10',chapter:6,number:10}],persistStoryBattleVitals(){},clearInterval(){},clearTimeout(){},removeBattleReward(){},cancelSpeech(){},timerId:0,nextTimer:0,saveBattleResult:async(r,won)=>saved.push([won,r.correct,r.deck.length]),stageCleared:()=>true,go:p=>pages.push(p),document:{dispatchEvent(){}},CustomEvent:class{}});
    vm.runInContext(code('  async function finishBattle(','  async function saveBattleResult('),c);await c.finishBattle(clear,clear?'boss-defeated':'leave');
    assert.deepEqual(saved,[[clear,67,clear?67:200]]);assert.deepEqual(pages,['result']);assert.equal(s.axeFlightMs,0);assert.equal(s.banditDodgeReady,false);assert.equal(s.iceTimeActive,false);assert.equal(s.done,true);
  }
});
test('retry requires recovered HP and resets HP, skill clocks and dodge without refilling player vitals',()=>{
  const key='story-ch6-10',old={...fresh(),done:true,hp:0,mp:0,axeElapsed:4000,banditDodgeReady:true};
  const c=vm.createContext({window,run:old,selectedStage:key,selectedCharacter:{id:'c',class:'mage'},stages:{[key]:{story:true,banditChief:true}},storyStages:[{key,chapter:6,number:10}],storyStagePlayable:()=>true,storyStageUnlocked:()=>true,storyEntryAllowed:()=>false,storyVitals:()=>({hp:0,hpMax:2,mp:0,mpMax:2}),clearInterval(){},clearTimeout(){},removeBattleReward(){},timerId:0,nextTimer:0,levelReady:()=>true,buildQuestionDeck:()=>Array(200),reducedMotion:()=>false,bossAttackSteps:()=>3,initializeBattlePet(){},stageCleared:()=>false,prepareQuestion(){},closeDialog(){},go(){},tick(){}});
  vm.runInContext(code('  function startBattle(','  function prepareQuestion('),c);c.startBattle(true);assert.equal(c.run,old);
  c.storyEntryAllowed=()=>true;c.storyVitals=()=>({hp:1,hpMax:2,mp:0,mpMax:2});c.startBattle(true);assert.equal(c.run.hp,1);assert.equal(c.run.mp,0);assert.equal(c.run.bossHp,200);assert.equal(c.run.axeElapsed,0);assert.equal(c.run.banditDodgeReady,false);assert.equal(c.run.bossAttackSteps,3);
});
test('renderer includes shared Ice Time, HP, readable answers and a rotating axe without SD assets',()=>{
  const s={...fresh(),question:{choices:['yes','no','a','b'],prompt:'word',answer:'yes'},axeFlightMs:600,iceTimeActive:true};
  const c=vm.createContext({window,run:s,esc:String,deployedAssetUrl:x=>x,royalSlimeTime:()=>'',battleHeroMarkup:()=>'',storyVitalsMarkup:()=>'',iceTimeEffectMarkup:()=>'<i class="ice-time-field"></i>',eagleEyeEffectMarkup:()=>'',storyBattleActions:()=>''});
  vm.runInContext(code('  function renderBanditChiefBattle(','  function renderGuardianBattle('),c);const html=c.renderBanditChiefBattle();assert.match(html,/ice-time-field/);assert.match(html,/aria-valuemax="200"/);assert.match(html,/bandit-axe-flight/);assert.equal((html.match(/data-action="answer"/g)||[]).length,4);assert.doesNotMatch(html,/_sd_/);
});
