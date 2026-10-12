import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
function setup(mode='story'){
  const deck=Array.from({length:10},(_,id)=>({entry:[`word${id}`,'n',`뜻${id}`],mode:'en-ko'}));
  const c=vm.createContext({run:{story:true,hp:1,hpMax:4,mp:1,mpMax:1,index:0,correct:0,elapsed:1200,storyTimeLimit:30000,deck,matchBoard:deck.slice(0,5),matched:new Set(),matchEn:deck.slice(0,5).map((x,id)=>({...x,id})),selectedKo:null,selectedEn:null,slashCombo:3,slashExpiresAt:0,mobs:[],bossHp:50},
    selectedCharacter:{id:'hero',class:'pugilist',avatar_variant:'female'},performance:{now:()=>1000},render(){},speak(){},emitAudio(){},
    pending:[],setTimeout:(fn,delay)=>{c.pending.push({fn,delay});return c.pending.length;},clearTimeout(){},clearInterval(){},nextTimer:0,timerId:0,
    document:{dispatchEvent(){},querySelector:()=>null},CustomEvent:class{},$:()=>null,window:{},
    reducedMotion:()=>false,playQueuedStoryPair:()=>false,queueStorySelection(){},equippedMap:()=>({}),itemById(){},
    battleContactDelay:()=>100,storyAttackDuration:()=>400,STORY_QUESTIONS_PER_TURN:5,beginFeverIntro(){},finishBattle(){},
    esc:String,deployedAssetUrl:String,variantOf:x=>x.avatar_variant,portrait:()=>'',
    storySkillDefinitions:[],storySkillIcons:[],icon:()=>'',equippedPotions:()=>[],canActivateMageIceTime:()=>false});
  c.load=(first,last)=>vm.runInContext(source.slice(source.indexOf(first),source.indexOf(last)),c);
  c.load('  function canActivatePugilistWeavingStep()','  function advanceGuardianBattle(');
  c.load('  function storyPick(','  function finishGuardianBattle(');
  c.load('  function royalSlimePick(','  function crystalGhostFall(');
  c.load('  function battleHeroMarkup()','  async function useStoryPotion(');
  if(mode==='royal'||mode==='ghost')Object.assign(c.run,{boss:true,crystalGhost:mode==='ghost'});
  if(mode==='guardian'||mode==='dragon'){
    for(const file of ['guardian-boss.js','black-dragon-boss.js'])vm.runInContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),c);
    const rules=mode==='dragon'?c.window.WORDORIA_BLACK_DRAGON:c.window.WORDORIA_GUARDIAN;
    Object.assign(c.run,rules.reset(),{guardian:true,blackDragon:mode==='dragon',question:{entry:deck[0].entry,prompt:'word0',choices:['wrong','뜻0','other','another'],answer:'뜻0'}});
  }
  c.wrong=()=>{if(c.run.guardian)c.guardianAnswer(0);else{c.storyPick({dataset:{side:'ko',id:'0'}});c.storyPick({dataset:{side:'en',id:'1'}});}};
  c.release=()=>c.pending.findLast(x=>x.delay===(c.reducedMotion()?200:500)).fn();
  return c;
}

test('activation costs one MP, rejects stacking and unavailable states',()=>{
  const c=setup();c.activatePugilistWeavingStep();assert.equal(c.run.mp,0);assert.equal(c.run.weavingStepActive,true);
  c.run.mp=1;c.activatePugilistWeavingStep();assert.equal(c.run.mp,1);
  for(const key of ['done','paused','locked','attack','stunned','timeoutPending','fever','feverTransition','potionUsePending','weavingStepDodging']){
    const x=setup();x.run[key]=true;x.activatePugilistWeavingStep();assert.equal(x.run.mp,1);assert.ok(!x.run.weavingStepActive);
  }
  for(const patch of [{story:false},{hp:0},{mp:0}]){const x=setup();Object.assign(x.run,patch);x.activatePugilistWeavingStep();assert.ok(!x.run.weavingStepActive);}
  const x=setup();x.selectedCharacter.class='mage';x.activatePugilistWeavingStep();assert.equal(x.run.mp,1);
  const casting=setup('dragon');casting.run.guardianPhase='drain-hold';casting.activatePugilistWeavingStep();assert.equal(casting.run.mp,1);
});

for(const mode of ['story','royal','ghost','guardian','dragon'])test(`${mode}: one wrong answer is dodged without credit, HP loss or combo reset; next wrong damages`,()=>{
  const c=setup(mode),question=c.run.question;c.activatePugilistWeavingStep();c.wrong();
  assert.equal(c.run.weavingStepActive,false);assert.equal(c.run.weavingStepDodging,true);assert.ok(!c.run.stunned);
  assert.equal(c.run.hp,1);assert.equal(c.run.slashCombo,3);assert.equal(c.run.correct,0);assert.equal(c.run.index,0);
  assert.equal(c.run.matched.size,0);assert.equal(c.run.question,question);assert.equal(c.run.elapsed,1200);
  c.wrong();assert.equal(c.run.hp,1);c.release();assert.equal(c.run.locked,false);assert.equal(c.run.weavingStepDodging,false);
  c.wrong();assert.equal(c.run.hp,0);assert.equal(c.run.stunned,true);
});

test('correct answers and new waves preserve the pending dodge',()=>{
  const c=setup();c.activatePugilistWeavingStep();
  c.storyPick({dataset:{side:'ko',id:'0'}});c.storyPick({dataset:{side:'en',id:'0'}});
  assert.equal(c.run.correct,1);assert.equal(c.run.weavingStepActive,true);c.pending.find(x=>x.delay===400).fn();
  Object.assign(c,{selectedStage:'test',stages:{test:{words:[]}},makeQuestion:()=>({}),activatePassive(){},shuffle:x=>x});
  c.load('  function prepareQuestion()','  function battleHeroMarkup()');c.run.index=5;c.prepareQuestion();
  assert.equal(c.run.weavingStepActive,true);assert.equal(c.run.mp,0);
  for(const mode of ['guardian','dragon']){
    const x=setup(mode);x.activatePugilistWeavingStep();x.guardianAnswer(1);
    assert.equal(x.run.weavingStepActive,true);assert.equal(x.run.correct,1);
  }
});

test('real mana potion flow enables reuse after dodge and reduced motion keeps feedback',async()=>{
  const c=setup();c.reducedMotion=()=>true;c.activatePugilistWeavingStep();c.wrong();
  assert.match(c.battleHeroMarkup(),/weaving-step-dodging/);assert.match(c.battleHeroMarkup(),/회피! · HP \/ 콤보 유지/);
  c.release();Object.assign(c,{localMode:false,potionTypes:{blue:{name:'마나포션'}},equippedPotions:()=>['blue'],potionCount:()=>0,rpc:async()=>[],loadCharacterExtras:async()=>{},toast(){}});
  c.load('  async function useStoryPotion(','  const ROYAL_SLIME_REWARD');await c.useStoryPotion(0,{});
  assert.equal(c.run.mp,1);assert.match(c.storyBattleActions(),/data-action="activate-weaving-step"/);
  c.activatePugilistWeavingStep();assert.equal(c.run.mp,0);assert.equal(c.run.weavingStepActive,true);
  assert.match(c.battleHeroMarkup(),/회피 준비/);assert.match(c.storyBattleActions(),/위빙 스텝 활성/);
});

test('fever, exit and results clear the dodge; stale callbacks cannot unlock another battle',async()=>{
  const c=setup();c.activatePugilistWeavingStep();c.wrong();const callback=c.pending.find(x=>x.delay===500).fn;
  const replacement={locked:true};c.run=replacement;callback();assert.equal(replacement.locked,true);
  for(const mode of ['story','royal','guardian','dragon','ghost']){
    const x=setup(mode);Object.assign(x,{persistStoryBattleVitals(){},removeBattleReward(){},cancelSpeech(){},go(){},saveBattleResult:async()=>{},selectedStage:'test',storyStages:[],run:x.run});
    x.activatePugilistWeavingStep();
    x.load('  function finishRoyalSlimeBattle(','  async function claimRoyalSlimeReward(');
    x.load('  function finishGuardianBattle(','  async function claimGuardianReward(');
    x.load('  async function finishBattle(','  async function saveBattleResult(');
    await x.finishBattle(false,'leave');assert.equal(x.run.weavingStepActive,false);assert.equal(x.run.weavingStepNotice,'');
  }
  const x=setup();x.activatePugilistWeavingStep();x.load('  function beginFeverIntro(','  function collectFeverCrystal(');x.enterFeverTime=()=>{};x.beginFeverIntro();assert.equal(x.run.weavingStepActive,false);
});

test('boss special attacks bypass weaving protection and retain it for the next wrong answer',()=>{
  const c=setup('ghost');c.run.hp=4;c.run.ghostFallsPending=1;c.run.ghostThresholds=[];
  Object.assign(c,{persistStoryBattleVitals(){},tick(){}});c.load('  function crystalGhostFall(','  function finishRoyalSlimeBattle(');
  c.activatePugilistWeavingStep();c.crystalGhostFall(c.run);c.pending.find(x=>x.delay===320).fn();
  assert.equal(c.run.hp,2);assert.equal(c.run.weavingStepActive,true);
  const dragon=setup('dragon');dragon.run.hp=4;dragon.activatePugilistWeavingStep();
  Object.assign(dragon.run,{guardianPhase:'drain-charge',guardianRemaining:1});
  dragon.window.WORDORIA_BLACK_DRAGON.advance(dragon.run,1,()=>0);
  assert.equal(dragon.run.hp,3);assert.equal(dragon.run.weavingStepActive,true);
});

test('dodge recovery cannot unlock a new boss cast or consume queued input while paused',()=>{
  const c=setup('guardian');c.activatePugilistWeavingStep();c.wrong();
  c.run.guardianPhase='beam-charge';c.release();assert.equal(c.run.locked,true);
  const x=setup();let queued=0;x.playQueuedStoryPair=()=>{queued++;return false;};
  x.activatePugilistWeavingStep();x.wrong();x.run.paused=true;x.release();assert.equal(queued,0);assert.equal(x.run.paused,true);
});
