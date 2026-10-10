import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const context={window:{}};
vm.runInNewContext(readFileSync(new URL('../guardian-boss.js',import.meta.url),'utf8'),context);
const rules=context.window.WORDORIA_GUARDIAN;
const runtime=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
function state(){return {...rules.reset(),correct:0,index:0,hp:3,locked:false,paused:false,done:false};}
function hit(s){assert.equal(rules.answer(s,true,200),true);return rules.advance(s,500);}
test('boss uses all level words in both directions with a 60-question deck',()=>{
  const c={window:{QUIZ_STAGES:{}}};vm.runInNewContext(readFileSync(new URL('../stage8.js',import.meta.url),'utf8'),c);
  for(const level of ['e','s']){
    const words=c.window.QUIZ_STAGES[level+'14'].words;
    const deck=rules.deck(words,items=>[...items].reverse());
    assert.equal(deck.length,60);
    const first=deck.slice(0,words.length*2);
    for(const entry of words){
      const modes=first.filter(item=>item.entry[0]===entry[0]).map(item=>item.mode).sort();
      assert.equal(JSON.stringify(modes),JSON.stringify(['en-ko','ko-en']));
      assert.equal(deck.filter(item=>item.entry[0]===entry[0]).length,60/words.length);
    }
    assert.ok(deck.every(item=>words.includes(item.entry)));
    assert.ok(deck.slice(1).every((item,i)=>item.entry[0]!==deck[i].entry[0]));
  }
});
test('energy falls only on contact and beams trigger once at 80, 40, 20 and 10 percent',()=>{
  const s=state(),beamHits=[];
  for(let correct=1;correct<=60;correct++){
    assert.equal(rules.answer(s,true,200),true);
    assert.equal(s.bossHp,61-correct);
    assert.deepEqual(Array.from(rules.advance(s,199)),[]);
    assert.equal(s.bossHp,61-correct);
    const contact=rules.advance(s,1);
    assert.ok(contact.includes('hit'));assert.equal(s.bossHp,60-correct);
    rules.advance(s,300);
    if(s.guardianPhase==='beam-charge'){
      beamHits.push(correct);
      assert.equal(s.guardianBlindMs,0);
      rules.advance(s,599);assert.equal(s.guardianBlindMs,0);
      assert.ok(rules.advance(s,1).includes('beam-contact'));
      assert.equal(s.guardianBlindMs,3000);
      assert.equal(s.locked,false);
      rules.advance(s,2999);assert.equal(s.guardianBlindMs,1);
      rules.advance(s,1);assert.equal(s.guardianBlindMs,0);assert.equal(s.locked,false);
    }
    if(correct===60){assert.equal(s.guardianVisual,'defeat');assert.ok(rules.advance(s,700).includes('victory'));}
  }
  assert.deepEqual(beamHits,[12,36,48,54]);
  assert.deepEqual(Array.from(s.guardianThresholds),[48,24,12,6]);
});
test('wrong answers lose player HP without changing boss energy or deck progress; retry clears debuffs',()=>{
  const s=state();assert.equal(rules.answer(s,false,200),true);
  assert.equal(s.hp,2);assert.equal(s.bossHp,60);assert.equal(s.index,0);
  assert.equal(rules.answer(s,true,200),false);
  assert.ok(rules.advance(s,500).includes('ready'));
  assert.equal(s.locked,false);
  s.hp=1;rules.answer(s,false,200);assert.ok(rules.advance(s,500).includes('defeat-player'));
  const retry=state();assert.equal(retry.guardianBlindMs,0);assert.equal(retry.guardianThresholds.length,0);
});
test('reduced motion shortens casting but keeps three seconds of masked answers',()=>{
  const s=state();s.correct=11;s.index=11;s.bossHp=49;s.guardianReducedMotion=true;
  rules.answer(s,true,100);rules.advance(s,250);assert.equal(s.guardianPhase,'beam-charge');
  rules.advance(s,300);assert.equal(s.guardianBlindMs,3000);
  rules.advance(s,3000);assert.equal(s.guardianPhase,'idle');
});
test('masked choices show only their ends and accept answers immediately on beam contact',()=>{
  const s=state();s.question={entry:['treasure','n','숨겨야 하는 정답'],choices:['숨겨야 하는 정답','보기2','보기3','보기4'],answer:'숨겨야 하는 정답',prompt:'treasure',mode:'en-ko'};s.deck=Array(60);s.guardianBlindMs=3000;s.guardianPhase='beam-hold';s.guardianRemaining=300;s.storyTimeLimit=180000;s.elapsed=0;
  const c=vm.createContext({run:s,esc:String,deployedAssetUrl:String,royalSlimeTime:()=>'',battleHeroMarkup:()=>'',storyVitalsMarkup:()=>'',storyBattleActions:()=>'',render(){},battleContactDelay:()=>200,speak(){},performance:{now:()=>1000},window:{WORDORIA_GUARDIAN:rules}});
  vm.runInContext(runtime.slice(runtime.indexOf('  function renderGuardianBattle('),runtime.indexOf('  function advanceGuardianBattle(')),c);
  const html=c.renderGuardianBattle();
  assert.ok(!html.includes('숨겨야 하는 정답'));assert.ok(html.includes('숨◆◆ ◆◆ ◆답'));assert.ok(!html.includes('disabled'));
  c.guardianAnswer(0);assert.equal(s.correct,1);assert.equal(s.guardianBlindMs,3000);
  rules.advance(s,500);assert.equal(s.bossHp,59);assert.equal(s.locked,false);assert.equal(s.guardianBlindMs,2500);
  rules.answer(s,false,200);rules.advance(s,500);assert.equal(s.hp,2);assert.equal(s.guardianBlindMs,2000);
  rules.advance(s,1999);assert.equal(s.guardianBlindMs,1);
  assert.ok(rules.advance(s,1).includes('blind-end'));assert.equal(s.guardianBlindMs,0);
  assert.ok(c.renderGuardianBattle().includes('숨겨야 하는 정답'));
  assert.equal(rules.maskChoice('treasure'),'t◆◆◆◆◆◆e');
  assert.equal(rules.maskChoice('보물 상자'),'보◆ ◆자');
  assert.equal(rules.maskChoice('[명] 보물 상자'),'보◆ ◆자');
  assert.equal(rules.maskChoice('  [동]   살아남다  '),'살◆◆다');
  assert.equal(rules.maskChoice('[형] 아름다운'),'아◆◆운');
  assert.equal(rules.maskChoice('[명] [동] 기록하다'),'기◆◆다');
  assert.equal(rules.maskChoice('  treasure  '),'t◆◆◆◆◆◆e');
  assert.equal(rules.maskChoice('[명]   '),'');
  assert.equal(rules.maskChoice('가'),'가');assert.equal(rules.maskChoice('ab'),'ab');
  assert.match(runtime,/if\(run\.guardian\)\{advanceGuardianBattle\(delta\);return;\}/);
  assert.match(runtime,/if\(run\?\.guardian\)\{guardianAnswer\(index\);return;\}/);
});
test('runtime pauses blindness, advances to the next hidden question on beam contact, and preserves the attack DOM on hit',()=>{
  const s=state();s.correct=12;s.index=12;s.bossHp=48;s.guardianPhase='beam-charge';s.guardianRemaining=600;s.guardianVisual='attack';s.elapsed=0;s.storyTimeLimit=180000;s.deck=Array(60);
  let questions=0,renders=0;
  const c=vm.createContext({run:s,window:{WORDORIA_GUARDIAN:rules},updateWarriorSlash(){},prepareQuestion(){questions++;},render(){renders++;},finishBattle(){assert.fail('unexpected finish');},emitAudio(){},document:{querySelector(){return null;},dispatchEvent(){}},CustomEvent:class{},$:()=>null,royalSlimeTime:()=>''});
  vm.runInContext(runtime.slice(runtime.indexOf('  function advanceGuardianBattle('),runtime.indexOf('  function renderRoyalSlimeBattle(')),c);
  s.paused=true;c.advanceGuardianBattle(2000);assert.equal(s.guardianRemaining,600);assert.equal(s.elapsed,0);
  s.paused=false;c.advanceGuardianBattle(600);assert.equal(questions,1);assert.equal(s.guardianBlindMs,3000);
  s.paused=true;c.advanceGuardianBattle(3000);assert.equal(s.guardianBlindMs,3000);
  s.paused=false;c.advanceGuardianBattle(3000);assert.equal(s.guardianBlindMs,0);assert.equal(s.locked,false);
  questions=0;renders=0;Object.assign(s,state());s.elapsed=0;s.storyTimeLimit=180000;s.deck=Array(60);
  rules.answer(s,true,200);c.advanceGuardianBattle(200);assert.equal(renders,0);assert.equal(s.bossHp,59);
});
test('guardian gets 300 seconds on start and retry and times out at the new boundary',()=>{
  const s={...state(),elapsed:0,deck:Array(60)};
  let result;
  const c=vm.createContext({run:s,window:{WORDORIA_GUARDIAN:rules},updateWarriorSlash(){},render(){},finishBattle(clear,reason){result={clear,reason};},document:{querySelector:()=>null},$:()=>null,royalSlimeTime:()=>''});
  vm.runInContext(runtime.slice(runtime.indexOf('  function advanceGuardianBattle('),runtime.indexOf('  function renderRoyalSlimeBattle(')),c);
  assert.equal(s.storyTimeLimit,300000);
  c.advanceGuardianBattle(180000);assert.equal(result,undefined);
  c.advanceGuardianBattle(119999);assert.equal(result,undefined);
  c.advanceGuardianBattle(1);assert.deepEqual(result,{clear:false,reason:'timeout'});
  assert.equal(state().storyTimeLimit,300000);
});
test('guardian ice skill renders its field and freezes the clock until an answer releases it',()=>{
  const s={...state(),story:true,mp:2,mpMax:2,elapsed:0,storyTimeLimit:180000,deck:Array(60),question:{entry:['treasure','n','보물'],choices:['보물','보기2'],answer:'보물',prompt:'treasure',mode:'en-ko'}};
  const c=vm.createContext({run:s,selectedCharacter:{class:'mage'},performance:{now:()=>1000},setTimeout(){},esc:String,deployedAssetUrl:String,royalSlimeTime:()=>'',battleHeroMarkup:()=>'',storyVitalsMarkup:()=>'',storyBattleActions:()=>'',render(){},updateWarriorSlash(){},battleContactDelay:()=>200,speak(){},emitAudio(){},finishBattle(){assert.fail('unexpected finish');},document:{querySelector:()=>null},$:()=>null,window:{WORDORIA_GUARDIAN:rules}});
  vm.runInContext(runtime.slice(runtime.indexOf('  function renderGuardianBattle('),runtime.indexOf('  function renderRoyalSlimeBattle(')),c);
  vm.runInContext(runtime.slice(runtime.indexOf('  function canActivateMageIceTime('),runtime.indexOf('  function updateWarriorSlash(')),c);
  assert.ok(!c.renderGuardianBattle().includes('ice-time-field'));
  c.activateMageIceTime();assert.equal(s.mp,1);assert.equal(s.iceTimeActive,true);
  const active=c.renderGuardianBattle();assert.match(active,/guardian-boss-arena ice-time-active/);assert.match(active,/ice-time-field/);assert.match(active,/ice-time-announcement/);
  c.advanceGuardianBattle(500);assert.equal(s.elapsed,0);
  s.iceTimePopUntil=0;assert.ok(!c.renderGuardianBattle().includes('ice-time-announcement'));assert.match(c.renderGuardianBattle(),/ice-time-field/);
  c.guardianAnswer(0);assert.equal(s.iceTimeActive,false);assert.ok(!c.renderGuardianBattle().includes('ice-time-field'));
  c.advanceGuardianBattle(100);assert.equal(s.elapsed,100);
});

function resultContext(localMode=true){
  const pages=[];
  const c=vm.createContext({persistStoryBattleVitals(){},run:{...state(),guardian:true,story:true,correct:60,index:60,bossHp:0,elapsed:120000},localMode,selectedStage:'story-ch2-7',page:'battle',storyDialogueIndex:0,selectedCharacter:{id:'hero',coins:10},player:'test',demoState:{records:[]},records:[],accountCrystals:10,timerId:null,nextTimer:null,clearInterval(){},clearTimeout(){},removeBattleReward(){},cancelSpeech(){},render(){},toast(){},saveDemo(){},stageRecordName:()=> '스토리 2장 7 · 크리스탈 사원 입구',go(page){c.page=page;pages.push(page);},esc:String,num:String,deployedAssetUrl:String});
  vm.runInContext(runtime.slice(runtime.indexOf('  function finishGuardianBattle('),runtime.indexOf('  async function finishBattle(')),c);
  vm.runInContext(runtime.slice(runtime.indexOf('  function completeStoryDialogue('),runtime.indexOf('  function storyDialogueLines(')),c);
  return {c,pages};
}
test('guardian victory waits for ending before the fixed 500 reward and never pays twice',async()=>{
  const {c,pages}=resultContext();c.finishGuardianBattle(true,'boss-defeated');
  assert.deepEqual(pages,['storyChapterTwoBossEnd']);assert.equal(c.selectedCharacter.coins,10);assert.equal(c.demoState.records.length,0);
  c.completeStoryDialogue();assert.equal(c.page,'bossResult');assert.equal(c.selectedCharacter.coins,510);assert.equal(c.run.bossReward,500);
  assert.match(c.renderGuardianResult(),/\+500 크리스털/);
  await c.claimGuardianReward();assert.equal(c.selectedCharacter.coins,510);
  c.run={...state(),guardian:true,correct:60,bossHp:0,elapsed:120000,clear:true};await c.claimGuardianReward();
  assert.equal(c.run.bossReward,0);assert.equal(c.selectedCharacter.coins,510);
});
test('guardian defeat shows the boss and retry/leave without clear records or rewards',()=>{
  for(const reason of ['hp-zero','timeout']){
    const {c,pages}=resultContext();c.run.correct=10;c.run.bossHp=50;c.finishGuardianBattle(false,reason);
    assert.deepEqual(pages,['bossResult']);assert.equal(c.demoState.records.length,0);assert.equal(c.selectedCharacter.coins,10);
    const html=c.renderGuardianResult();assert.match(html,/crystal-guardian-golem\/idle\/01.png/);assert.match(html,/guardian-retry">다시 도전하기/);assert.match(html,/guardian-leave" >떠나기/);assert.ok(!html.includes('크리스털</p>'));
  }
});
test('guardian remote reward retries failed saves and keeps stage progression after success',async()=>{
  const {c}=resultContext(false);c.run.clear=true;c.page='bossResult';let calls=0;
  c.rpc=async(name,params)=>{assert.equal(name,'claim_guardian_boss_reward');assert.equal(params.p_correct,60);if(++calls===1)throw new Error('network');return [{game_score_id:123,reward:500,balance:510}];};
  await c.claimGuardianReward();assert.equal(c.run.rewardError,true);assert.equal(c.records.length,0);
  await c.claimGuardianReward();assert.equal(c.run.rewardError,false);assert.equal(c.accountCrystals,510);assert.equal(c.records[0].cleared,true);
  await c.claimGuardianReward();assert.equal(calls,2);
  assert.match(runtime,/action==='guardian-retry'\)\{startBattle\(\);\}/);
  assert.match(runtime,/action==='guardian-leave'\)\{selectedStoryWorld=2;/);
});
