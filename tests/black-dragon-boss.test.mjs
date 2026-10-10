import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const context={window:{}};
vm.runInNewContext(readFileSync(new URL('../black-dragon-boss.js',import.meta.url),'utf8'),context);
const rules=context.window.WORDORIA_BLACK_DRAGON;
const state=()=>({...rules.reset(),correct:0,index:0,hp:8,locked:false,paused:false,done:false});
test('energy drain tries once at 80/50/20/10 percent and damages only on successful contact',()=>{
  const s=state();let rolls=0;const attempts=[];
  for(let n=1;n<=60;n++){
    assert.ok(rules.answer(s,true,200));assert.equal(s.bossHp,61-n);
    rules.advance(s,199);assert.equal(s.bossHp,61-n);
    assert.ok(rules.advance(s,1).includes('hit'));assert.equal(s.bossHp,60-n);
    const events=rules.advance(s,300);
    if(events.includes('drain-start')){
      attempts.push(s.bossHp);const hp=s.hp;
      rules.advance(s,599,()=>{assert.fail('roll before contact');});assert.equal(s.hp,hp);
      assert.ok(rules.advance(s,1,()=>{rolls++;return .099;}).includes('drain-hit'));assert.equal(s.hp,hp-1);
      rules.advance(s,700);assert.equal(s.locked,false);
    }
    if(n===60){assert.equal(s.guardianVisual,'defeat');assert.ok(rules.advance(s,700).includes('victory'));assert.equal(s.guardianVisual,'defeat');}
  }
  assert.deepEqual(attempts,[48,30,12,6]);assert.equal(rolls,4);
});
test('10 percent boundary fails, pause freezes the cast, and reduced motion preserves damage',()=>{
  const s=state();s.correct=11;s.bossHp=49;s.guardianReducedMotion=true;
  rules.answer(s,true,100);rules.advance(s,250);assert.equal(s.guardianPhase,'drain-charge');
  s.paused=true;assert.deepEqual(Array.from(rules.advance(s,9999)),[]);assert.equal(s.guardianRemaining,300);
  s.paused=false;assert.ok(rules.advance(s,300,()=>.1).includes('drain-miss'));assert.equal(s.hp,8);
  assert.equal(s.guardianBlindMs,0);assert.equal(s.locked,true);rules.advance(s,700);assert.equal(s.locked,false);
});
test('fatal drain, wrong answer, finished guard, and fresh retry state',()=>{
  const s=state();s.hp=1;s.correct=11;s.bossHp=49;rules.answer(s,true,100);rules.advance(s,1000,()=>0);
  assert.equal(s.hp,0);assert.ok(rules.advance(s,700).includes('defeat-player'));
  s.done=true;assert.equal(rules.answer(s,true,100),false);assert.deepEqual(Array.from(rules.advance(s,1000)),[]);
  const fresh=state();assert.equal(fresh.bossHp,60);assert.equal(fresh.guardianThresholds.length,0);assert.equal(fresh.drainQueue.length,0);assert.equal(fresh.drainNotice,'');
  fresh.hp=1;rules.answer(fresh,false,100);assert.ok(rules.advance(fresh,500).includes('defeat-player'));assert.equal(fresh.bossHp,60);
});
test('level decks exhaust a unique cycle and avoid immediate repeats',()=>{
  for(const count of [20,30,35]){
    const words=Array.from({length:count},(_,i)=>['word'+i,'n','뜻'+i]);
    const deck=rules.deck(words,items=>items.reverse());assert.equal(deck.length,60);
    for(let i=0;i<60;i+=count)assert.equal(new Set(deck.slice(i,i+count).map(x=>x.entry[0])).size,Math.min(count,60-i));
    assert.ok(deck.slice(1).every((x,i)=>x.entry[0]!==deck[i].entry[0]));
    assert.ok(deck.some(x=>x.mode==='en-ko'));assert.ok(deck.some(x=>x.mode==='ko-en'));
  }
});
test('runtime routes cave entry, victory story, reward and leave to world 3',()=>{
  const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
  assert.match(source,/stage.chapter===3&&stage.number===8.*go\('storyChapterThreeBossStart'\)/);
  assert.match(source,/go\(run.blackDragon\?'storyChapterThreeBossEnd':'storyChapterTwoBossEnd'\)/);
  assert.match(source,/claim_black_dragon_boss_reward/);assert.match(source,/if\(run\?\.blackDragon\)selectedStoryWorld=3/);
  assert.match(source,/\$\{iceTimeEffectMarkup\(\)\}/);
  assert.match(source,/source.blackDragon\)Object.assign\(run,window.WORDORIA_BLACK_DRAGON.reset/);
});
test('runtime retry blocks depleted HP and preserves recovered HP/MP while clearing drain state',()=>{
 const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
 const c=vm.createContext({run:{blackDragon:true,done:true,hp:0,mp:0,drainNotice:'old'},selectedStage:'cave',storyStages:[{key:'cave',chapter:3,number:8}],selectedCharacter:{id:'hero',class:'mage'},stages:{cave:{story:true,blackDragon:true}},window:{WORDORIA_BLACK_DRAGON:rules},clearInterval(){},clearTimeout(){},timerId:1,nextTimer:1,cancelSpeech(){},removeBattleReward(){},levelReady:()=>true,storyEntryAllowed:()=>false,storyVitals:()=>({hp:1,hpMax:2,mp:0,mpMax:2}),bossAttackSteps:()=>1,buildQuestionDeck:()=>Array(60),reducedMotion:()=>false,stageCleared:()=>false,prepareQuestion(){},closeDialog(){},go(){},tick(){}});
 vm.runInContext(source.slice(source.indexOf('  function startBattle('),source.indexOf('  function prepareQuestion(')),c);
 c.startBattle(true);assert.equal(c.run.hp,0);assert.equal(c.run.drainNotice,'old');c.storyEntryAllowed=()=>true;c.startBattle(true);assert.equal(c.run.hp,1);assert.equal(c.run.mp,0);assert.equal(c.run.bossHp,60);assert.equal(c.run.storyTimeLimit,300000);assert.equal(c.run.drainNotice,'');assert.equal(c.run.guardianThresholds.length,0);assert.equal(c.run.locked,false);assert.equal(c.run.elapsed,0);
});
test('runtime drain feedback and ice field render; pause freezes clock and attack contact',()=>{
 const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8'),s=state();
 Object.assign(s,{iceTimeActive:true,elapsed:0,deck:Array(60),question:{choices:['뜻','답2','답3','답4'],prompt:'word',answer:'뜻'},story:true,mp:2,mpMax:2});
 const c=vm.createContext({run:s,window:{WORDORIA_BLACK_DRAGON:rules},esc:String,deployedAssetUrl:String,battleHeroMarkup:()=>'',storyVitalsMarkup:()=>'',storyBattleActions:()=>'',royalSlimeTime:()=>'',performance:{now:()=>1000},updateWarriorSlash(){},prepareQuestion(){s.iceTimeActive=false;},render(){},finishBattle(){},document:{querySelector(){return null;},dispatchEvent(){}},CustomEvent:class{},$:()=>null});
 vm.runInContext(source.slice(source.indexOf('  function renderGuardianBattle('),source.indexOf('  function guardianAnswer(')),c);
 vm.runInContext(source.slice(source.indexOf('  function advanceGuardianBattle('),source.indexOf('  function renderRoyalSlimeBattle(')),c);
 assert.match(c.renderGuardianBattle(),/블랙 드래곤/);assert.match(c.renderGuardianBattle(),/ice-time-active/);assert.match(c.renderGuardianBattle(),/ice-time-field/);
 c.advanceGuardianBattle(1000);assert.equal(s.elapsed,0);
 s.iceTimeActive=false;s.correct=11;s.bossHp=49;rules.answer(s,true,200);s.paused=true;c.advanceGuardianBattle(5000);assert.equal(s.elapsed,0);assert.equal(s.bossHp,49);s.paused=false;c.advanceGuardianBattle(500);assert.equal(s.bossHp,48);assert.match(c.renderGuardianBattle(),/에너지 흡수/);assert.match(c.renderGuardianBattle(),/black-dragon-drain/);
});
test('five minute timeout respects the exact boundary',()=>{
 const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8'),s=state();s.elapsed=299999;let reason;
 const c=vm.createContext({run:s,window:{WORDORIA_BLACK_DRAGON:rules},updateWarriorSlash(){},document:{querySelector(){return null;}},$:()=>null,finishBattle(clear,value){reason=value;},royalSlimeTime:()=>''});
 vm.runInContext(source.slice(source.indexOf('  function advanceGuardianBattle('),source.indexOf('  function renderRoyalSlimeBattle(')),c);
 c.advanceGuardianBattle(.5);assert.equal(reason,undefined);c.advanceGuardianBattle(.5);assert.equal(reason,'timeout');
});
test('Black Dragon displays and pays 600 crystals once, including after replay',async()=>{
 const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
 const c=vm.createContext({run:{...state(),story:true,clear:true,correct:60,bossHp:0,elapsed:300000},localMode:true,selectedStage:'cave',selectedCharacter:{id:'hero',coins:10},player:'test',demoState:{records:[]},records:[],render(){},toast(){},saveDemo(){},stageRecordName:()=> '스토리 3장 8 · 하늘 수정 성소',page:'bossResult',esc:String,num:String,deployedAssetUrl:String});
 vm.runInContext(source.slice(source.indexOf('  async function claimGuardianReward('),source.indexOf('  async function finishBattle(')),c);
 assert.match(c.renderGuardianResult(),/\+600 크리스털/);await c.claimGuardianReward();assert.equal(c.selectedCharacter.coins,610);assert.equal(c.run.bossReward,600);
 c.run={...state(),clear:true,correct:60,bossHp:0,elapsed:300000};await c.claimGuardianReward();assert.equal(c.selectedCharacter.coins,610);assert.equal(c.run.bossReward,0);
});
test('boss novel parser preserves both dragon speaker names',async()=>{
 const {parseWorldThreeBoss}=await import('../scripts/generate-story-novel.mjs');
 for(const name of ['블랙 드래곤','리치 드래곤']){
  const lines=parseWorldThreeBoss(`**${name}**\n"대사"`);
  assert.equal(lines[0].speaker,name);assert.equal(lines[0].className,'black-dragon');assert.equal(lines[0].text,'대사');assert.equal(lines[0].artPath,'assets/novel/characters/char_lich_dragon_standing.png');
 }
});
