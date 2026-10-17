import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const window={};vm.runInNewContext(read('shadow-sorceress-boss.js'),{window});
const rules=window.WORDORIA_SHADOW_SORCERESS,source=read('crystal-game.js');
const fresh=()=>({...rules.reset(),correct:0,index:0,hp:3,hpMax:3,mp:2,mpMax:2,elapsed:0,locked:false,paused:false,done:false});
const code=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end));

test('shadow boss checks exactly every 30 seconds, with a strict 50% boundary and full 4.5s freeze',()=>{
  const s=fresh();let rolls=0;
  assert.deepEqual(Array.from(rules.advance(s,29999,()=>{rolls++;return 0;})),[]);
  assert.equal(rolls,0);
  assert.ok(rules.advance(s,1,()=>{rolls++;return .499;}).includes('freeze-start'));
  assert.equal(s.shadowFreezeMs,4500);assert.equal(rolls,1);
  assert.equal(rules.answer(s,true,200),false);
  rules.advance(s,4499);assert.equal(s.shadowFreezeMs,1);
  assert.ok(rules.advance(s,1).includes('freeze-end'));
  rules.advance(s,25500,()=>{rolls++;return .5;});
  assert.equal(rolls,2);assert.equal(s.shadowFreezeMs,0);
  assert.equal(rules.answer(s,true,200),true);
});

test('pause freezes skill clock, trap and contact; mage ice freezes schedule but preserves trap release',()=>{
  const s=fresh();rules.advance(s,30000,()=>0);s.paused=true;
  rules.advance(s,100000,()=>0);assert.equal(s.shadowFreezeMs,4500);assert.equal(s.shadowRolls,1);
  s.paused=false;s.iceTimeActive=true;rules.advance(s,4500,()=>0,0);
  assert.equal(s.shadowFreezeMs,0);assert.equal(s.shadowSkillElapsed,30000);
  s.iceTimeActive=false;assert.equal(rules.answer(s,true,250),true);s.paused=true;
  rules.advance(s,250);assert.equal(s.bossHp,100);
  s.paused=false;rules.advance(s,249);assert.equal(s.bossHp,100);
  rules.advance(s,1);assert.equal(s.bossHp,99);
});

test('contact damage, final defeat hold, wrong answers and a fresh retry clear every debuff',()=>{
  const s=fresh();s.correct=99;s.index=99;s.bossHp=1;
  assert.equal(rules.answer(s,true,200),true);assert.equal(s.bossHp,1);
  assert.ok(rules.advance(s,200).includes('hit'));assert.equal(s.bossHp,0);assert.equal(s.guardianVisual,'defeat');
  assert.ok(!rules.advance(s,999).includes('victory'));assert.ok(rules.advance(s,1).includes('victory'));
  assert.equal(s.guardianVisual,'defeat');s.done=true;assert.deepEqual(Array.from(rules.advance(s,30000)),[]);
  const wrong=fresh();wrong.hp=1;rules.answer(wrong,false,200);
  assert.equal(wrong.hp,0);assert.ok(rules.advance(wrong,500).includes('defeat-player'));
  assert.equal(fresh().shadowFreezeMs,0);assert.equal(fresh().bossHp,100);assert.equal(fresh().shadowNextSkillAt,30000);
});

test('large deltas evaluate each boundary once and reduced motion does not shorten the debuff',()=>{
  const s=fresh();let rolls=0;
  rules.advance(s,64500,()=>{rolls++;return 0;});assert.equal(rolls,2);assert.equal(s.shadowFreezeMs,0);
  const reduced=fresh();reduced.guardianReducedMotion=true;
  rules.advance(reduced,30000,()=>0);assert.equal(reduced.shadowFreezeMs,4500);assert.equal(reduced.shadowCastMs,350);
});

test('100-question deck exhausts unique cycles in both directions without adjacent repetition',()=>{
  const words=Array.from({length:30},(_,i)=>['word'+i,'명사','뜻'+i]);
  const deck=rules.deck(words,pool=>[...pool].reverse());assert.equal(deck.length,100);
  for(let i=0;i<90;i+=30)assert.equal(new Set(deck.slice(i,i+30).map(x=>x.entry[0])).size,30);
  for(let i=1;i<100;i++)assert.notEqual(deck[i].entry[0],deck[i-1].entry[0]);
  assert.equal(deck[0].mode,'en-ko');assert.equal(deck[30].mode,'ko-en');
});

test('runtime keeps all answers visible while disabling choices and direct selection during freeze',()=>{
  const s=fresh();s.shadowFreezeMs=4500;s.question={prompt:'word',answer:'답1',choices:['답1','답2','답3','답4']};
  const c=vm.createContext({run:s,window,esc:v=>v,royalSlimeTime:()=> '5:30',battleHeroMarkup:()=>'',storyVitalsMarkup:()=>'',storyBattleActions:()=>'',performance:{now:()=>0}});
  vm.runInContext(code('  function renderGuardianBattle(', '  function canActivatePugilistWeavingStep('),c);
  const markup=c.renderGuardianBattle();
  for(const choice of s.question.choices)assert.ok(markup.includes(choice));
  assert.equal((markup.match(/data-action="answer"[^>]*disabled/g)||[]).length,4);
  assert.match(markup,/dark-ice-prison/);assert.match(markup,/aria-valuemax="100"/);assert.ok(!markup.includes('guardian-beam"'));
  vm.runInContext(code('  function guardianAnswer(', '  function advanceGuardianBattle('),c);
  c.guardianAnswer(0);assert.equal(s.correct,0);assert.equal(s.locked,false);
});

test('entry introduces the boss and skill, ending pays only after victory dialogue and defeat skips it',()=>{
  const c=vm.createContext({window,esc:v=>v,deployedAssetUrl:v=>v});
  vm.runInContext(code('  function bossIntroductionMarkup(', '  function confirmStoryStage('),c);
  const html=c.bossIntroductionMarkup({chapter:4,number:10});
  for(const text of ['쉐도우 소서러스','반전 세계','HP 100','5분 30초','다크 아이스 타임','50%','4.5초'])assert.ok(html.includes(text));
  assert.equal(c.bossIntroductionMarkup({chapter:4,number:9}),'');
  const pages=[],claims=[];Object.assign(c,{page:'storyChapterFourMidbossEnd',run:{done:true,clear:true,shadowSorceress:true},go:p=>pages.push(p),claimGuardianReward:()=>claims.push('claim')});
  vm.runInContext(code('  function completeStoryDialogue(', '  function storyDialogueLines('),c);
  c.completeStoryDialogue();assert.deepEqual(pages,['bossResult']);assert.deepEqual(claims,['claim']);
  const battle=fresh();Object.assign(c,{run:battle,persistStoryBattleVitals(){},clearInterval(){},clearTimeout(){},removeBattleReward(){},cancelSpeech(){},timerId:0,nextTimer:0});
  vm.runInContext(code('  function finishGuardianBattle(', '  async function claimGuardianReward('),c);
  c.finishGuardianBattle(false,'timeout');assert.equal(pages.at(-1),'bossResult');assert.equal(battle.shadowFreezeMs,0);
});

test('demo reward pays 200 only once and supports save retry',async()=>{
  const c=vm.createContext({run:{...fresh(),done:true,clear:true,correct:100,bossHp:0},localMode:true,selectedStage:'story-ch4-10',selectedCharacter:{id:'c',coins:0},player:'p',demoState:{records:[]},records:[],stageRecordName:()=> '스토리 4장 10 · 환각의 숲과 버려진 성',saveDemo(){},render(){},page:'bossResult',toast(){}});
  vm.runInContext(code('  async function claimGuardianReward(', '  function renderGuardianResult('),c);
  await c.claimGuardianReward();assert.equal(c.run.bossReward,200);assert.equal(c.selectedCharacter.coins,200);
  c.run={...fresh(),clear:true,correct:100,bossHp:0};await c.claimGuardianReward();assert.equal(c.run.bossReward,0);assert.equal(c.selectedCharacter.coins,200);
  c.localMode=false;c.rpc=async()=>{throw Error('offline');};c.run={...fresh(),clear:true,correct:100,bossHp:0};
  await c.claimGuardianReward();assert.equal(c.run.rewardError,true);assert.equal(c.run.bossReward,undefined);
  c.rpc=async()=>[{reward:0,balance:200,game_score_id:1}];await c.claimGuardianReward();assert.equal(c.run.rewardError,false);assert.equal(c.run.bossReward,0);
});

test('shadow retry requires recovery and preserves vitals while resetting combat state',()=>{
  const selectedStage='story-ch4-10',old={...fresh(),done:true,clear:false,hp:0,mp:0,shadowFreezeMs:4400,shadowSkillElapsed:120000};
  const c=vm.createContext({window,run:old,selectedStage,selectedCharacter:{id:'c',class:'mage'},stages:{[selectedStage]:{story:true,shadowSorceress:true,words:[]}},storyStages:[{key:selectedStage,chapter:4,number:10}],storyStagePlayable:()=>true,storyStageUnlocked:()=>true,storyRecoveryBusy:false,storyEntryAllowed:()=>false,storyVitals:()=>({hp:0,hpMax:2,mp:0,mpMax:2}),clearInterval(){},clearTimeout(){},removeBattleReward(){},timerId:0,nextTimer:0,levelReady:()=>true,buildQuestionDeck:()=>Array(100),reducedMotion:()=>false,bossAttackSteps:()=>1,initializeBattlePet(){},stageCleared:()=>false,prepareQuestion(){},closeDialog(){},go(){},tick(){}});
  vm.runInContext(code('  function startBattle(', '  function prepareQuestion('),c);
  c.startBattle(true);assert.equal(c.run,old);
  c.storyEntryAllowed=()=>true;c.storyVitals=()=>({hp:1,hpMax:2,mp:0,mpMax:2});
  c.startBattle(true);assert.equal(c.run.hp,1);assert.equal(c.run.mp,0);assert.equal(c.run.bossHp,100);assert.equal(c.run.shadowFreezeMs,0);assert.equal(c.run.shadowSkillElapsed,0);assert.equal(c.run.elapsed,0);
  c.run=old;c.storyStageUnlocked=()=>false;c.startBattle(true);assert.equal(c.run,old);
});

test('runtime timeout is 330 seconds and player ice consumes MP, freezes clock, releases on answer',()=>{
  const s=fresh();s.elapsed=329999;s.story=true;s.deck=Array(100);s.question={answer:'yes',choices:['yes','no','maybe','other'],entry:['word','n','뜻']};
  const outcomes=[],c=vm.createContext({run:s,window,updateWarriorSlash(){},document:{querySelector:()=>null,dispatchEvent(){}},$:()=>null,royalSlimeTime:()=>'',finishBattle:(clear,reason)=>outcomes.push({clear,reason}),render(){},prepareQuestion(){},selectedCharacter:{class:'mage'},performance:{now:()=>1000},setTimeout(){},CustomEvent:class{},battleContactDelay:()=>200,speak(){}});
  vm.runInContext(code('  function advanceGuardianBattle(', '  function renderRoyalSlimeBattle('),c);
  vm.runInContext(code('  function canActivateMageIceTime(', '  function updateWarriorSlash('),c);
  c.activateMageIceTime();assert.equal(s.mp,1);assert.equal(s.iceTimeActive,true);
  c.advanceGuardianBattle(5000);assert.equal(s.elapsed,329999);assert.equal(s.shadowSkillElapsed,0);assert.equal(outcomes.length,0);
  s.shadowFreezeMs=4500;
  vm.runInContext(code('  function guardianAnswer(', '  function advanceGuardianBattle('),c);
  c.guardianAnswer(0);assert.equal(s.iceTimeActive,true,'blocked answer must not clear player ice');
  s.shadowFreezeMs=0;c.guardianAnswer(0);assert.equal(s.iceTimeActive,false);
  c.advanceGuardianBattle(.5);assert.equal(outcomes.length,0);c.advanceGuardianBattle(.5);
  assert.deepEqual(outcomes,[{clear:false,reason:'timeout'}]);
  s.done=false;s.locked=false;s.guardianPhase='idle';s.mp=1;s.iceTimeActive=false;
  c.activateMageIceTime();assert.equal(s.mp,0);assert.equal(s.iceTimeActive,true,'MP restored by a potion permits reuse');
});
