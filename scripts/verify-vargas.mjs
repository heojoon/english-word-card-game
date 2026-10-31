import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const source=read('crystal-game.js');
function context(){
  const c=vm.createContext({window:{}});vm.runInContext(read('vargas-boss.js'),c);
  return c.window.WORDORIA_VARGAS;
}
const state=b=>({...b.reset(),index:0,correct:0,bossAttackSteps:4,deck:Array(180).fill({}),hp:3,mp:2,question:{choices:['a','b','c','d'],answer:'b'},locked:false,stunned:false,attack:false});
test('wing resolve once at contact, not anticipation, and every contact rolls independently',()=>{
  const b=context(),s=state(b);let rolls=0;
  assert.ok(b.advance(s,15000,15000).includes('cast-start'));
  assert.equal(s.vargasAction,'wing');
  assert.ok(!b.advance(s,599,599,()=>{rolls++;return 0;}).includes('wing-contact'));assert.equal(rolls,0);
  assert.ok(b.advance(s,1,1,()=>{rolls++;return 0;}).includes('wing-contact'));
  b.advance(s,400,400,()=>{rolls++;return 0;});assert.equal(rolls,1);
});
test('large deltas preserve periodic wing and ward contacts without duplicate rolls',()=>{
  const b=context(),s=state(b);let rolls=0;
  const events=b.advance(s,61000,61000,()=>{rolls++;return 0;},a=>a.reverse());
  assert.equal(events.filter(e=>e==='wing-contact').length,4);
  assert.equal(events.filter(e=>e==='shuffle').length,2);
  assert.equal(rolls,4);assert.equal(s.vargasNextWing,75000);assert.equal(s.vargasNextGuard,75000);
});
test('guard shuffles four choices at contact and keeps the same question and answer',()=>{
  const b=context(),s=state(b),q=s.question;s.vargasNextWing=Infinity;
  b.advance(s,25000,25000);b.advance(s,499,499,()=>1,a=>a.reverse());
  assert.equal(q.choices[0],'a');
  const events=b.advance(s,1,1,()=>1,a=>a.reverse());
  assert.ok(events.includes('shuffle'));assert.equal(s.question,q);assert.equal(q.answer,'b');assert.equal(q.choices[0],'d');assert.equal(s.correct,0);
});
test('ice, pet freeze and pause stop clocks, idle and skill casts; player contact and recoil complete',()=>{
  const b=context(),s=state(b);s.iceTimeActive=true;
  b.advance(s,10000,10000);assert.equal(s.vargasClock,0);assert.equal(s.vargasIdleMs,0);
  s.iceTimeActive=false;b.advance(s,10000,0);assert.equal(s.vargasClock,0);
  s.paused=true;b.advance(s,10000,10000);assert.equal(s.vargasClock,0);s.paused=false;
  b.advance(s,15000,15000);const ms=s.vargasActionMs;s.iceTimeActive=true;b.advance(s,1000,1000);assert.equal(s.vargasActionMs,ms);
  s.vargasAction='idle';s.locked=true;s.attack=true;b.correct(s,100);const e=b.advance(s,500,0);
  assert.ok(e.includes('player-contact'));assert.ok(e.includes('answer-finished'));assert.equal(s.vargasClock,15000);
});
test('wrong answers damage only at spear contact and do not advance learning progress',()=>{
  const b=context(),s=state(b);s.locked=true;s.stunned=true;b.wrong(s);
  assert.ok(!b.advance(s,549,549).includes('wrong-contact'));
  assert.ok(b.advance(s,1,1).includes('wrong-contact'));
  assert.ok(b.advance(s,350,350).includes('wrong-finished'));assert.equal(s.index,0);assert.equal(s.correct,0);assert.equal(s.locked,false);
});
test('the final answer plays all three hit frames and holds knockdown until result',()=>{
  const b=context(),s=state(b);s.bossHp=4;s.locked=true;s.attack=true;b.correct(s,100);
  assert.ok(!b.advance(s,99,99).includes('player-contact'));
  assert.ok(b.advance(s,1,1).includes('player-contact'));assert.equal(b.visual(s).frame,0);
  b.advance(s,330,0);assert.equal(b.visual(s).frame,2);
  assert.ok(b.advance(s,800,0).includes('victory'));assert.equal(b.visual(s).frame,2);
  assert.equal(b.visual(s).action,'hit');
  b.clear(s);assert.equal(b.visual(s).frame,2);assert.equal(s.vargasQueue.length,0);
});
test('reduced motion preserves contact order and completion, clear drops all pending events',()=>{
  const b=context(),s=state(b);s.guardianReducedMotion=true;b.wrong(s);
  assert.ok(!b.advance(s,274,274).includes('wrong-contact'));assert.ok(b.advance(s,1,1).includes('wrong-contact'));
  b.correct(s,200);s.vargasQueue.push('wing');b.clear(s);s.done=true;
  assert.equal(s.vargasPendingContact,null);assert.equal(s.vargasQueue.length,0);assert.equal(b.advance(s,10000).length,0);
});
function runtime(){
  const b=context(),nodes=new Map();
  const node=()=>({textContent:'',style:{},classList:{toggle(){},add(){}},setAttribute(){}});
  const c=vm.createContext({window:{WORDORIA_VARGAS:b},run:state(b),Math,performance:{now:()=>0},
    document:{querySelector:()=>null,dispatchEvent(){}},CustomEvent:class{},$:id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);},
    render(){},speak(){},setTimeout(){},updateWarriorSlash(){},battleContactDelay:()=>100,setHeroAttackTravel(){},persistStoryBattleVitals(){},shuffle:a=>a.reverse(),
    consumePugilistWeavingStep:()=>false,prepareQuestion:()=>{c.run.locked=false;},finishBattle:(clear,reason)=>{c.run.done=true;c.outcome={clear,reason};}});
  vm.runInContext(source.slice(source.indexOf('  function vargasSpriteStyle(){'),source.indexOf('  function renderStorySpellingBattle(){')),c);
  Object.assign(c.run,{story:true,spelling:true,storyTimeLimit:120000,elapsed:0,slashExpiresAt:0,question:{choices:['a','b','c','d'],answer:'b',entry:['apple'],hidden:[1]}});
  return c;
}
test('runtime ignores paused/locked input, releases ice on answers and uses pet/active damage',()=>{
  for(const flag of ['paused','locked','stunned','done','timeoutPending']){const c=runtime();c.run[flag]=true;c.answerVargasSpelling(1);assert.equal(c.run.correct,0);}
  const c=runtime();c.run.iceTimeActive=true;c.run.timeStopped=true;c.answerVargasSpelling(1);
  assert.equal(c.run.correct,1);assert.equal(c.run.iceTimeActive,false);assert.equal(c.run.timeStopped,false);
  c.advanceVargasBattle(99,99);assert.equal(c.run.index,0);c.advanceVargasBattle(500,500);assert.equal(c.run.index,1);
  let hits=0;c.run.activeSkills={damage:n=>{hits+=n;}};c.damageVargasPlayer();assert.equal(hits,1);assert.equal(c.run.hp,3);
  delete c.run.activeSkills;c.run.petEffects={damage:n=>{hits+=n;}};c.damageVargasPlayer();assert.equal(hits,2);
});
test('runtime freezes countdown, releases ice on a wrong answer and permits potion-enabled reuse',()=>{
  const c=runtime();c.run.iceTimeActive=true;c.advanceVargasBattle(2000,2000);assert.equal(c.run.elapsed,0);
  c.answerVargasSpelling(0);assert.equal(c.run.iceTimeActive,false);c.advanceVargasBattle(901,901);assert.equal(c.run.hp,2);assert.equal(c.run.index,0);
  c.selectedCharacter={class:'mage'};vm.runInContext(source.slice(source.indexOf('  function canActivateMageIceTime(){'),source.indexOf('  function storyPick(')),c);
  c.run.mp=0;assert.equal(c.canActivateMageIceTime(),false);c.run.mp=1;assert.equal(c.canActivateMageIceTime(),true);
  c.activateMageIceTime();assert.equal(c.run.mp,0);assert.equal(c.run.iceTimeActive,true);assert.equal(c.run.iceTimePopUntil,1200);
});
test('lethal contact before timeout finishes knockdown, but a late contact cannot win',()=>{
  const c=runtime();c.run.index=44;c.run.correct=44;c.run.bossHp=4;c.run.elapsed=119500;c.answerVargasSpelling(1);c.advanceVargasBattle(2000,2000);
  assert.equal(c.outcome.clear,true);assert.equal(c.run.correct,45);assert.equal(c.run.index,45);assert.equal(c.run.deck.length,45);
  const late=runtime();late.run.bossHp=4;late.run.elapsed=119999;late.answerVargasSpelling(1);late.advanceVargasBattle(2000,2000);
  assert.equal(late.outcome.clear,false);assert.equal(late.run.bossHp,4);
  const timed=runtime();timed.run.elapsed=119990;timed.advanceVargasBattle(20,20);assert.equal(timed.outcome.reason,'timeout');
});
test('assets, manifests, script order and native staging cover all five actions',()=>{
  const boss=context(),s=state(boss);
  for(const action of ['idle','attack','hit','wing','guard']){
    const prefix='assets/monsters/vargas/monster_vargas_sd_'+action+'_strip';
    const m=JSON.parse(read(prefix+'.json')),png=readFileSync(new URL('../'+prefix+'.png',import.meta.url));
    assert.equal(png.readUInt32BE(16),m.frameWidth*3);assert.equal(png.readUInt32BE(20),m.frameHeight);assert.equal(png[25],6);assert.equal(m.frameCount,3);
    s.vargasAction=action;const visual=boss.visual(s);assert.equal(visual.width,m.frameWidth);assert.equal(visual.height,m.frameHeight);
    assert.deepEqual(Array.from(boss.ANIMATIONS[action]),m.frames.map(f=>f.durationMs));
  }
  const html=read('index.html');assert.ok(html.indexOf('vargas-boss.js')<html.indexOf('crystal-game.js'));
  assert.ok(read('scripts/build-web.mjs').includes("'vargas-boss.js'"));
  assert.ok(source.includes('source.storyChapter===11&&source.storyNumber===30'));
  const renderer=source.slice(source.indexOf('  function renderVargasBattle(){'),source.indexOf('  function answerVargasSpelling('));
  assert.ok(renderer.includes('iceTimeEffectMarkup()'));assert.ok(renderer.includes('bossHp'));assert.ok(!renderer.includes('/ 40'));
});

test('HP 180 loses exactly DMG 4 at contact once; 40 answers do not end the fight, 45 defeat it',()=>{
  const c=runtime();c.run.vargasNextWing=Infinity;c.run.vargasNextGuard=Infinity;
  c.answerVargasSpelling(1);assert.equal(c.run.bossHp,180);
  c.advanceVargasBattle(99,99);assert.equal(c.run.bossHp,180);
  c.advanceVargasBattle(1,1);assert.equal(c.run.bossHp,176);
  c.advanceVargasBattle(1000,1000);assert.equal(c.run.bossHp,176);
  for(let i=1;i<40;i++){c.answerVargasSpelling(1);c.advanceVargasBattle(1500,1500);}
  assert.equal(c.run.correct,40);assert.equal(c.run.bossHp,20);assert.equal(c.run.done,undefined);
  for(let i=40;i<45;i++){c.answerVargasSpelling(1);c.advanceVargasBattle(1500,1500);}
  assert.equal(c.run.bossHp,0);assert.equal(c.run.correct,45);assert.equal(c.outcome.clear,true);
  const hp=c.run.bossHp;c.advanceVargasBattle(10000,10000);assert.equal(c.run.bossHp,hp);
});

test('burst is consumed at contact and fire-arrow defeat preserves learning count and knockdown',()=>{
  const b=context(),s=state(b);let used=0;s.activeSkills={attackDamage:n=>{used++;return n*3;}};
  b.correct(s,100);b.advance(s,99,99);assert.equal(used,0);assert.equal(s.bossHp,180);
  b.advance(s,1,1);assert.equal(used,1);assert.equal(s.bossHp,168);
  s.bossHp=2;s.correct=17;b.damage(s,2);assert.equal(s.bossHp,0);assert.equal(s.correct,17);
  assert.equal(s.vargasPendingContact,null);assert.ok(b.advance(s,2000,0).includes('victory'));assert.equal(b.visual(s).frame,2);
});

test('Vargas budgets four seconds per required base-DMG answer',()=>{
 const b=context();
 for(const damage of [1,3,4,7,180,200])assert.equal(b.reset(damage).storyTimeLimit,Math.ceil(180/damage)*4000);
 assert.equal(b.reset(0).storyTimeLimit,720000);
});
