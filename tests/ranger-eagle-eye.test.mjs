import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
function setup(mode='story'){
  const deck=Array.from({length:10},(_,id)=>({entry:[`word${id}`,'n',`${id===0?'사과':'뜻'}${id}`],mode:'en-ko'}));
  const c=vm.createContext({run:{story:true,hp:3,hpMax:3,mp:1,mpMax:1,index:0,correct:0,elapsed:1200,storyTimeLimit:30000,deck,matchBoard:deck.slice(0,5),matched:new Set(),matchEn:deck.slice(0,5).map((x,id)=>({...x,id})),matchKo:deck.slice(0,5).map((x,id)=>({...x,id})),selectedKo:null,selectedEn:null,slashExpiresAt:0,mobs:[],bossHp:50,guardianVisual:'idle',guardianPhase:'idle',question:{entry:deck[0].entry,prompt:'word0',answer:'사과0',choices:['오답1','사과0','오답2','오답3']}},
    selectedCharacter:{id:'hero',class:'ranger',avatar_variant:'female'},performance:{now:()=>1000},render(){},speak(){},shuffle:x=>x.slice().reverse(),
    pending:[],setTimeout:(fn,delay)=>{c.pending.push({fn,delay});return c.pending.length;},clearTimeout(){},clearInterval(){},nextTimer:0,timerId:0,
    document:{dispatchEvent(){},querySelector:()=>null},CustomEvent:class{},$:()=>null,window:{},
    reducedMotion:()=>false,playQueuedStoryPair:()=>false,queueStorySelection(){},refreshStorySelections(){},equippedMap:()=>({}),itemById(){},CRYSTAL_GHOST_ART:'ghost.png',
    battleContactDelay:()=>100,storyAttackDuration:()=>400,STORY_QUESTIONS_PER_TURN:5,beginFeverIntro(){},finishBattle(){},
    esc:String,deployedAssetUrl:String,variantOf:x=>x.avatar_variant,portrait:()=>'',storySkillDefinitions:[{class_code:'ranger',skill_name:'행운의 화살'}],storySkillIcons:[],icon:()=>'',equippedPotions:()=>[],
    selectedStage:'test',stages:{test:{name:'test',words:deck.map(x=>x.entry)}},makeQuestion:entry=>({entry,choices:['wrong',entry[2]],answer:entry[2]}),activatePassive(){},
    passiveBannerMarkup:()=>'',sniperTargetMarkup:()=>'',storyBattleBackgroundClass:()=>'',royalSlimeTime:()=>'',royalSlimeRemaining:()=>30000,earnedCoins:()=>0});
  c.load=(first,last)=>vm.runInContext(source.slice(source.indexOf(first),source.indexOf(last)),c);
  c.load('  function canActivateRangerEagleEye()','  function canActivatePugilistWeavingStep()');
  c.load('  function battleHeroMarkup()','  async function useStoryPotion(');
  c.load('  function storyVitalsMarkup()','  function syncReaperCards(');
  c.load('  function renderGuardianBattle()','  function iceTimeEffectMarkup()');
  c.load('  function guardianAnswer(','  function advanceGuardianBattle(');
  c.load('  function renderRoyalSlimeBattle()','  function crystalGhostFall(');
  c.load('  function iceTimeEffectMarkup()','  function canActivateRangerEagleEye()');
  c.load('  function storyPick(','  function finishGuardianBattle(');
  c.load('  function renderBattle()','  function spiritMessage(');
  if(['royal','ghost'].includes(mode))Object.assign(c.run,{boss:true,crystalGhost:mode==='ghost'});
  if(['guardian','dragon','shadow','reaper'].includes(mode)){
    const file={guardian:'guardian-boss.js',dragon:'black-dragon-boss.js',shadow:'shadow-sorceress-boss.js',reaper:'red-reaper-boss.js'}[mode];
    vm.runInContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),c);
    const rules=c.window[{guardian:'WORDORIA_GUARDIAN',dragon:'WORDORIA_BLACK_DRAGON',shadow:'WORDORIA_SHADOW_SORCERESS',reaper:'WORDORIA_RED_REAPER'}[mode]];
    Object.assign(c.run,rules.reset(),{guardian:true});
    if(mode==='reaper')rules.board(c.run,c.shuffle);
  }
  c.pick=(side,id)=>c.storyPick({dataset:{side,id:String(id)}});
  return c;
}

test('activation spends one MP, preserves clock/progress/HP, and rejects unavailable states',()=>{
  const c=setup();c.activateRangerEagleEye();assert.equal(c.run.mp,0);assert.equal(c.run.eagleEyeActive,true);
  assert.equal(c.run.elapsed,1200);assert.equal(c.run.correct,0);assert.equal(c.run.hp,3);
  c.run.mp=1;c.activateRangerEagleEye();assert.equal(c.run.mp,1);
  for(const key of ['paused','locked','attack','done','stunned','timeoutPending','fever','feverTransition','potionUsePending']){
    const x=setup();x.run[key]=true;x.activateRangerEagleEye();assert.equal(x.run.mp,1);assert.ok(!x.run.eagleEyeActive);
  }
  for(const patch of [{story:false},{hp:0},{mp:0},{matched:new Set([0,1,2,3,4])}]){
    const x=setup();Object.assign(x.run,patch);x.activateRangerEagleEye();assert.ok(!x.run.eagleEyeActive);
  }
  const x=setup();x.selectedCharacter.class='mage';x.activateRangerEagleEye();assert.equal(x.run.mp,1);
  const cast=setup('dragon');cast.run.guardianPhase='drain-hold';cast.activateRangerEagleEye();assert.equal(cast.run.mp,1);
});

for(const mode of ['story','royal','ghost','reaper'])test(`${mode}: one stable pair hint; correct/wrong consumes it without automatic answer credit`,()=>{
  for(const correct of [true,false]){
    const c=setup(mode);c.activateRangerEagleEye();c.pick('en',0);
    assert.match(c.renderBattle(),/뜻 첫 글자: 사…/);
    assert.equal(c.run.correct,0);assert.equal(c.run.index,0);
    c.pick('en',1);assert.equal(c.run.eagleEyePairId,0);
    assert.equal(c.eaglePairHintMarkup(1,'en'),'');assert.equal(c.eaglePairHintMarkup(0,'ko'),'');
    c.pick('en',0);c.pick('ko',correct?0:1);
    assert.equal(c.run.eagleEyeActive,false);assert.ok(!c.renderBattle().includes('뜻 첫 글자:'));
    if(!correct){assert.equal(c.run.hp,2);assert.equal(c.run.correct,0);}
    else assert.equal(c.run.hp,3);
  }
});

for(const mode of ['guardian','dragon','shadow'])test(`${mode}: exactly two wrong options are excluded; render is stable and excluded clicks do nothing`,()=>{
  const c=setup(mode);c.activateRangerEagleEye();
  assert.equal(c.run.eagleEyeRemoved.length,2);assert.ok(!c.run.eagleEyeRemoved.includes(1));
  const html=c.renderBattle();assert.equal((html.match(/data-eagle-excluded="true"/g)||[]).length,2);
  assert.equal(c.renderBattle(),html);assert.equal(c.run.mp,0);
  c.guardianAnswer(c.run.eagleEyeRemoved[0]);assert.equal(c.run.eagleEyeActive,true);assert.equal(c.run.hp,3);assert.equal(c.run.correct,0);
  c.guardianAnswer(1);assert.equal(c.run.eagleEyeActive,false);assert.equal(c.run.correct,1);assert.equal(c.run.hp,3);
  const wrong=setup(mode);wrong.activateRangerEagleEye();
  wrong.guardianAnswer(wrong.run.question.choices.findIndex((choice,index)=>choice!==wrong.run.question.answer&&!wrong.run.eagleEyeRemoved.includes(index)));
  assert.equal(wrong.run.eagleEyeActive,false);assert.equal(wrong.run.correct,0);assert.equal(wrong.run.hp,2);
});

test('activation with an English selection targets it; reordered cards retain the hint identity',()=>{
  const c=setup('reaper');c.pick('en',0);c.activateRangerEagleEye();
  c.run.matchEn.reverse();c.run.matchKo.reverse();assert.match(c.renderBattle(),/뜻 첫 글자: 사…/);
  assert.equal(c.eaglePairHintMarkup(1,'en'),'');
});

test('mana potion enables reuse after answering and every class/gender shows the active skill description',async()=>{
  const c=setup('guardian');c.activateRangerEagleEye();c.guardianAnswer(1);c.run.locked=false;c.run.attack=false;c.run.guardianPhase='idle';
  Object.assign(c,{localMode:false,potionTypes:{blue:{name:'마나포션'}},equippedPotions:()=>['blue'],potionCount:()=>0,rpc:async()=>[],loadCharacterExtras:async()=>{},toast(){}});
  c.load('  async function useStoryPotion(','  const ROYAL_SLIME_REWARD');await c.useStoryPotion(0,{});
  assert.equal(c.run.mp,1);c.activateRangerEagleEye();assert.equal(c.run.mp,0);assert.equal(c.run.eagleEyeActive,true);
  assert.match(c.storyBattleActions(),/매의 눈 활성/);assert.match(c.storyBattleActions(),/activate-eagle-eye/);
  c.load('  function characterActiveSkillMarkup(','  function characterSelectMarkup(');
  for(const variant of ['male','female']){c.selectedCharacter.avatar_variant=variant;assert.match(c.characterActiveSkillMarkup('ranger'),/매의 눈/);assert.match(c.characterActiveSkillMarkup('ranger','create'),/오답 2개/);}
});

test('next wave, fever, exit and every result path clear the hint',async()=>{
  const wave=setup();wave.activateRangerEagleEye();wave.load('  function prepareQuestion()','  function battleHeroMarkup()');wave.prepareQuestion();assert.equal(wave.run.eagleEyeActive,false);assert.equal(wave.run.mp,0);
  const royal=setup('royal');royal.activateRangerEagleEye();royal.load('  function prepareRoyalSlimeBoard()','  function royalSlimeRemaining()');royal.prepareRoyalSlimeBoard();assert.equal(royal.run.eagleEyeActive,false);
  const fever=setup();fever.activateRangerEagleEye();fever.enterFeverTime=()=>{};fever.load('  function beginFeverIntro(','  function collectFeverCrystal(');fever.beginFeverIntro();assert.equal(fever.run.eagleEyeActive,false);
  for(const mode of ['story','royal','ghost','guardian','dragon','shadow','reaper']){
    const c=setup(mode);c.activateRangerEagleEye();
    Object.assign(c,{persistStoryBattleVitals(){},removeBattleReward(){},cancelSpeech(){},go(){},saveBattleResult:async()=>{},storyStages:[]});
    c.load('  function finishRoyalSlimeBattle(','  async function claimRoyalSlimeReward(');
    c.load('  function finishGuardianBattle(','  async function claimGuardianReward(');
    c.load('  async function finishBattle(','  async function saveBattleResult(');
    await c.finishBattle(false,'leave');assert.equal(c.run.eagleEyeActive,false);assert.equal(c.run.eagleEyeRemoved.length,0);
  }
});

for(const mode of ['story','royal','ghost','reaper'])test(`${mode}: Korean-first selection cannot consume the skill before its hint is visible`,()=>{
  const c=setup(mode);
  c.pick('ko',1);c.activateRangerEagleEye();
  assert.equal(c.run.selectedKo,null);
  c.pick('ko',1);c.pick('en',0);
  assert.equal(c.run.eagleEyeActive,true);assert.equal(c.run.selectedKo,null);
  assert.equal(c.run.hp,3);assert.equal(c.run.correct,0);
  assert.match(c.renderBattle(),/뜻 첫 글자: 사…/);
  c.pick('ko',0);assert.equal(c.run.eagleEyeActive,false);
});

test('pair hint skips part-of-speech labels and whitespace',()=>{
  const c=setup();c.run.matchEn[0].entry[2]='  [명] [동]  사과';
  c.activateRangerEagleEye();c.pick('en',0);
  assert.match(c.eaglePairHintMarkup(0,'en'),/뜻 첫 글자: 사…/);
});

for(const mode of ['story','royal','ghost','guardian','dragon','shadow','reaper'])test(`${mode}: eye appears over enemies and activation lettering expires at one second`,()=>{
  const c=setup(mode);let now=1000;c.performance.now=()=>now;
  assert.ok(!c.renderBattle().includes('eagle-eye-field'));
  c.activateRangerEagleEye();
  assert.match(c.renderBattle(),/eagle-eye-field/);
  assert.match(c.renderBattle(),/arena-combo ice-time-announcement eagle-eye-announcement/);
  assert.match(c.renderBattle(),/<b>매의 눈<\/b>/);
  const expiry=c.pending.find(timer=>timer.delay===1000);assert.ok(expiry);
  now=1999;assert.match(c.renderBattle(),/eagle-eye-announcement/);
  now=2000;expiry.fn();
  assert.ok(!c.renderBattle().includes('eagle-eye-announcement'));
  assert.match(c.renderBattle(),/eagle-eye-field/);
  if(c.run.guardian&&!c.run.redReaper)c.guardianAnswer(1);
  else {c.pick('en',0);c.pick('ko',0);}
  assert.ok(!c.renderBattle().includes('eagle-eye-field'));
});

test('an old activation expiry cannot remove a new battle announcement',()=>{
  const c=setup();c.activateRangerEagleEye();const expiry=c.pending.find(timer=>timer.delay===1000);
  c.run={eagleEyePopUntil:2000};expiry.fn();assert.equal(c.run.eagleEyePopUntil,2000);
});
