import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const source=read('crystal-game.js');
function context(){
  const c=vm.createContext({window:{}});vm.runInContext(read('blackroot-elder-boss.js'),c);
  return c.window.WORDORIA_BLACKROOT_ELDER;
}
const state=b=>({...b.reset(),index:0,correct:0,deck:Array(40).fill({}),hp:3,mp:2,question:{choices:['a','b','c','d'],answer:'b'},locked:false,stunned:false,attack:false});
test('roots resolve once at contact, not anticipation, and every contact rolls independently',()=>{
  const b=context(),s=state(b);let rolls=0;
  assert.ok(b.advance(s,20000,20000).includes('cast-start'));
  assert.equal(s.treeAction,'roots');
  assert.ok(!b.advance(s,599,599,()=>{rolls++;return 0;}).includes('root-contact'));assert.equal(rolls,0);
  assert.ok(b.advance(s,1,1,()=>{rolls++;return 0;}).includes('root-contact'));
  b.advance(s,400,400,()=>{rolls++;return 0;});assert.equal(rolls,1);
});
test('large deltas preserve periodic root and guard contacts without duplicate rolls',()=>{
  const b=context(),s=state(b);let rolls=0;
  const events=b.advance(s,61000,61000,()=>{rolls++;return 0;},a=>a.reverse());
  assert.equal(events.filter(e=>e==='root-contact').length,3);
  assert.equal(events.filter(e=>e==='shuffle').length,1);
  assert.equal(rolls,3);assert.equal(s.treeNextRoots,80000);assert.equal(s.treeNextGuard,90000);
});
test('guard shuffles four choices at contact and keeps the same question and answer',()=>{
  const b=context(),s=state(b),q=s.question;s.treeNextRoots=Infinity;
  b.advance(s,30000,30000);b.advance(s,499,499,()=>1,a=>a.reverse());
  assert.equal(q.choices[0],'a');
  const events=b.advance(s,1,1,()=>1,a=>a.reverse());
  assert.ok(events.includes('shuffle'));assert.equal(s.question,q);assert.equal(q.answer,'b');assert.equal(q.choices[0],'d');assert.equal(s.correct,0);
});
test('ice, pet freeze and pause stop clocks, idle and skill casts; player contact and recoil complete',()=>{
  const b=context(),s=state(b);s.iceTimeActive=true;
  b.advance(s,10000,10000);assert.equal(s.treeClock,0);assert.equal(s.treeIdleMs,0);
  s.iceTimeActive=false;b.advance(s,10000,0);assert.equal(s.treeClock,0);
  s.paused=true;b.advance(s,10000,10000);assert.equal(s.treeClock,0);s.paused=false;
  b.advance(s,20000,20000);const ms=s.treeActionMs;s.iceTimeActive=true;b.advance(s,1000,1000);assert.equal(s.treeActionMs,ms);
  s.treeAction='idle';s.locked=true;s.attack=true;b.correct(s,100);const e=b.advance(s,500,0);
  assert.ok(e.includes('player-contact'));assert.ok(e.includes('answer-finished'));assert.equal(s.treeClock,20000);
});
test('wrong answers damage only at branch contact and do not advance learning progress',()=>{
  const b=context(),s=state(b);s.locked=true;s.stunned=true;b.wrong(s);
  assert.ok(!b.advance(s,549,549).includes('wrong-contact'));
  assert.ok(b.advance(s,1,1).includes('wrong-contact'));
  assert.ok(b.advance(s,350,350).includes('wrong-finished'));assert.equal(s.index,0);assert.equal(s.correct,0);assert.equal(s.locked,false);
});
test('the final answer plays all three hit frames and holds knockdown until result',()=>{
  const b=context(),s=state(b);s.index=39;s.locked=true;s.attack=true;b.correct(s,100);
  assert.ok(!b.advance(s,99,99).includes('player-contact'));
  assert.ok(b.advance(s,1,1).includes('player-contact'));assert.equal(b.visual(s).frame,0);
  b.advance(s,330,0);assert.equal(b.visual(s).frame,2);
  assert.ok(b.advance(s,800,0).includes('victory'));assert.equal(b.visual(s).frame,2);
  assert.equal(b.visual(s).action,'hit');
});
test('reduced motion preserves contact order and completion, clear drops all pending events',()=>{
  const b=context(),s=state(b);s.guardianReducedMotion=true;b.wrong(s);
  assert.ok(!b.advance(s,274,274).includes('wrong-contact'));assert.ok(b.advance(s,1,1).includes('wrong-contact'));
  b.correct(s,200);s.treeQueue.push('roots');b.clear(s);s.done=true;
  assert.equal(s.treePendingContact,null);assert.equal(s.treeQueue.length,0);assert.equal(b.advance(s,10000).length,0);
});
function runtime(){
  const b=context(),nodes=new Map();
  const node=()=>({textContent:'',style:{},classList:{toggle(){},add(){}},setAttribute(){}});
  const c=vm.createContext({window:{WORDORIA_BLACKROOT_ELDER:b},run:state(b),Math,performance:{now:()=>0},
    document:{querySelector:()=>null,dispatchEvent(){}},CustomEvent:class{},$:id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);},
    render(){},speak(){},setTimeout(){},updateWarriorSlash(){},battleContactDelay:()=>100,setHeroAttackTravel(){},persistStoryBattleVitals(){},shuffle:a=>a.reverse(),
    consumePugilistWeavingStep:()=>false,prepareQuestion:()=>{c.run.locked=false;},finishBattle:(clear,reason)=>{c.run.done=true;c.outcome={clear,reason};}});
  vm.runInContext(source.slice(source.indexOf('  function blackrootSpriteStyle(){'),source.indexOf('  function renderStorySpellingBattle(){')),c);
  Object.assign(c.run,{story:true,spelling:true,storyTimeLimit:120000,elapsed:0,slashExpiresAt:0,question:{choices:['a','b','c','d'],answer:'b',entry:['apple'],hidden:[1]}});
  return c;
}
test('runtime ignores paused/locked input, releases ice on answers and uses pet/active damage',()=>{
  for(const flag of ['paused','locked','stunned','done','timeoutPending']){const c=runtime();c.run[flag]=true;c.answerBlackrootSpelling(1);assert.equal(c.run.correct,0);}
  const c=runtime();c.run.iceTimeActive=true;c.run.timeStopped=true;c.answerBlackrootSpelling(1);
  assert.equal(c.run.correct,1);assert.equal(c.run.iceTimeActive,false);assert.equal(c.run.timeStopped,false);
  c.advanceBlackrootBattle(99,99);assert.equal(c.run.index,0);c.advanceBlackrootBattle(500,500);assert.equal(c.run.index,1);
  let hits=0;c.run.activeSkills={damage:n=>{hits+=n;}};c.damageBlackrootPlayer();assert.equal(hits,1);assert.equal(c.run.hp,3);
  delete c.run.activeSkills;c.run.petEffects={damage:n=>{hits+=n;}};c.damageBlackrootPlayer();assert.equal(hits,2);
});
test('runtime freezes countdown, releases ice on a wrong answer and permits potion-enabled reuse',()=>{
  const c=runtime();c.run.iceTimeActive=true;c.advanceBlackrootBattle(2000,2000);assert.equal(c.run.elapsed,0);
  c.answerBlackrootSpelling(0);assert.equal(c.run.iceTimeActive,false);c.advanceBlackrootBattle(901,901);assert.equal(c.run.hp,2);assert.equal(c.run.index,0);
  c.selectedCharacter={class:'mage'};vm.runInContext(source.slice(source.indexOf('  function canActivateMageIceTime(){'),source.indexOf('  function storyPick(')),c);
  c.run.mp=0;assert.equal(c.canActivateMageIceTime(),false);c.run.mp=1;assert.equal(c.canActivateMageIceTime(),true);
  c.activateMageIceTime();assert.equal(c.run.mp,0);assert.equal(c.run.iceTimeActive,true);assert.equal(c.run.iceTimePopUntil,1200);
});
test('runtime final clear beats post-answer timeout and normal timeout loses',()=>{
  const c=runtime();c.run.index=39;c.run.correct=39;c.run.elapsed=119999;c.answerBlackrootSpelling(1);c.advanceBlackrootBattle(2000,2000);
  assert.equal(c.outcome.clear,true);assert.equal(c.run.correct,40);assert.equal(c.run.index,40);
  const timed=runtime();timed.run.elapsed=119990;timed.advanceBlackrootBattle(20,20);assert.equal(timed.outcome.reason,'timeout');
});
test('assets, manifests, script order and native staging cover all five actions',()=>{
  for(const action of ['idle','attack','hit','roots','guard']){
    const prefix='assets/monsters/blackroot-elder/monster_blackroot_elder_sd_'+action+'_strip';
    const m=JSON.parse(read(prefix+'.json')),png=readFileSync(new URL('../'+prefix+'.png',import.meta.url));
    assert.equal(png.readUInt32BE(16),m.frameWidth*3);assert.equal(png.readUInt32BE(20),m.frameHeight);assert.equal(png[25],6);assert.equal(m.frameCount,3);
  }
  const html=read('index.html');assert.ok(html.indexOf('blackroot-elder-boss.js')<html.indexOf('crystal-game.js'));
  assert.ok(read('scripts/build-web.mjs').includes("'blackroot-elder-boss.js'"));
  assert.ok(source.includes('source.storyChapter===11&&source.storyNumber===15'));
  const renderer=source.slice(source.indexOf('  function renderBlackrootBattle(){'),source.indexOf('  function answerBlackrootSpelling('));
  assert.ok(renderer.includes('iceTimeEffectMarkup()'));assert.ok(renderer.includes('40'));
});
