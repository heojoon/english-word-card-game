import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const context=vm.createContext({window:{}});
vm.runInContext(read('active-skills.js'),context);
const skills=context.window.WORDORIA_ACTIVE_SKILLS;
function state(overrides={}){return {story:true,hp:5,hpMax:5,mp:3,mpMax:3,correct:0,index:0,bossAttackSteps:2,...overrides};}
function attach(s,cls,options){return s.activeSkills=skills.attach(s,cls,{unlocked:true,...options});}

test('new actives are locked by default and cannot be activated by bypassing the button',()=>{
  for(const cls of Object.keys(skills.definitions)){
    const s=state({guardian:true}),e=skills.attach(s,cls);
    assert.equal(e.unlocked,false);assert.equal(e.ready(),false);assert.equal(e.activate(),false);assert.equal(s.mp,3);
    e.damage(1);assert.equal(s.hp,4);assert.equal(e.attackDamage(2),2);assert.equal(e.hint(),false);
  }
});

test('oath protects every HP point for 20 unpaused seconds and allows potion-enabled reuse',()=>{
  const s=state(),e=attach(s,'warrior');assert.equal(e.activate(),true);assert.equal(s.mp,2);
  assert.equal(e.activate(),false);e.damage(99);assert.equal(s.hp,5);
  s.paused=true;e.advance(40000);s.paused=false;e.advance(19999);e.damage(4);assert.equal(s.hp,5);
  e.advance(1);e.damage(1);assert.equal(s.hp,4);
  s.mp=0;assert.equal(e.activate(),false);s.mp++;assert.equal(e.activate(),true);
});
test('mana shield toggles for free, absorbs equal MP, spills remaining damage and turns off at zero MP',()=>{
  const s=state({mp:2}),e=attach(s,'mage');assert.equal(e.activate(),true);assert.equal(s.mp,2);
  e.damage(1);assert.equal(s.mp,1);assert.equal(s.hp,5);
  assert.equal(e.activate(),true);e.damage(1);assert.equal(s.hp,4);assert.equal(s.mp,1);
  e.activate();assert.equal(e.damage(3),2);assert.equal(s.mp,0);assert.equal(s.hp,2);assert.equal(e.active(),false);
  assert.equal(e.activate(),false);s.mp=1;assert.equal(e.activate(),true);
});
test('pet protection and revival work with the shield and oath',()=>{
  vm.runInContext(read('pet-system.js'),context);
  const s=state({mp:1,hp:1}),e=attach(s,'mage');
  s.petEffects=context.window.WORDORIA_PETS.attach(s,{code:'pet_prism_guardian_dragon'});
  e.activate();s.petShield=true;e.damage(5);assert.equal(s.hp,1);assert.equal(s.mp,1);
  e.damage(3);assert.equal(s.hp,1);assert.equal(s.mp,1);assert.equal(s.petRevived,true);
});
test('burst is boss-only, consumes one MP and triples exactly the next DMG attack',()=>{
  const s=state(),e=attach(s,'pugilist');assert.equal(e.activate(),false);
  s.guardian=true;assert.equal(e.activate(),true);assert.equal(s.mp,2);
  assert.equal(e.attackDamage(1),6);assert.equal(e.attackDamage(2),2);assert.equal(e.active(),false);
});
test('fire arrow deals ten ticks of two, survives question changes, pauses, and cannot stack',()=>{
  const s=state({guardian:true,bossHp:100}),hits=[],e=attach(s,'ranger',{burn:amount=>{hits.push(amount);s.bossHp-=amount;}});
  e.activate();assert.equal(s.mp,2);assert.equal(e.activate(),false);
  e.advance(999);assert.equal(hits.length,0);e.advance(1);assert.equal(s.bossHp,98);
  s.question={};s.paused=true;e.advance(30000);assert.equal(hits.length,1);s.paused=false;
  e.advance(9000);e.advance(30000);assert.equal(hits.length,10);assert.equal(s.bossHp,80);assert.equal(e.active(),false);
});
test('deadeyes starts on the first correct answer and continues for exactly ten seconds without refreshing',()=>{
  const s=state(),e=attach(s,'sniper');e.activate();assert.equal(s.mp,2);assert.equal(e.hint(),false);
  e.advance(20000);assert.equal(e.hint(),false);
  s.correct++;e.observeCorrect();assert.equal(e.hint(),true);
  e.advance(5000);s.correct++;e.observeCorrect();s.question={};assert.equal(e.hint(),true);
  s.paused=true;e.advance(30000);s.paused=false;e.advance(4999);assert.equal(e.hint(),true);
  e.advance(1);assert.equal(e.hint(),false);
});
test('all actives reject unavailable input and clear on fever and battle end',()=>{
  for(const cls of Object.keys(skills.definitions)){
    for(const flag of ['paused','locked','attack','stunned','timeoutPending','potionUsePending','done','fever','feverTransition']){
      const s=state({guardian:true,[flag]:true}),e=attach(s,cls);
      assert.equal(e.activate(),false,`${cls}: ${flag}`);assert.equal(s.mp,3);
    }
    for(const flag of ['done','fever','feverTransition']){
      const s=state({guardian:true}),e=attach(s,cls);e.activate();s[flag]=true;e.advance(1);s[flag]=false;assert.equal(e.active(),false);
    }
  }
});

const bosses=[
  ['guardian','GUARDIAN'],['black-dragon','BLACK_DRAGON'],['shadow-sorceress','SHADOW_SORCERESS'],
  ['sorcerus','SORCERUS'],['bandit-chief','BANDIT_CHIEF'],['abyss-golem','ABYSS_GOLEM'],
  ['elliot','ELLIOT'],['morgana','MORGANA'],['lich-dragon','LICH_DRAGON'],['red-reaper','RED_REAPER'],
  ['red-skull-knight','RED_SKULL_KNIGHT'],['dark-triton','DARK_TRITON'],['nereus','NEREUS'],['arkaon','ARKAON']
];
for(const [file] of bosses)vm.runInContext(read(file+'-boss.js'),context);
function bossState(api){
  const s=state({...api.reset(),deck:Array.from({length:500},(_,i)=>({entry:[`word${i}`,'n',`meaning${i}`]})),elapsed:0,locked:false,selectedKo:null,selectedEn:null});
  if(api.board)api.board(s,items=>items.slice());
  return s;
}
function answer(api,s,correct){
  if(api.answer)return api.answer(s,correct,100);
  api.pick(s,'ko',0,100);return api.pick(s,'en',correct?0:1,100);
}
for(const [file,key] of bosses){
  const api=context.window['WORDORIA_'+key];
  test(`${file}: oath and mana shield intercept the real wrong-answer damage path`,()=>{
    for(const cls of ['warrior','mage']){
      const s=bossState(api),e=attach(s,cls);assert.equal(e.activate(),true,file);
      answer(api,s,false);if(file==='abyss-golem')api.advance(s,400,()=>.99,400);
      assert.equal(s.hp,5,`${file}: ${cls}`);
      assert.equal(s.mp,cls==='warrior'?2:2);
    }
  });
  test(`${file}: burst damage lands at contact, then resets`,()=>{
    const s=bossState(api),e=attach(s,'pugilist'),before=s.bossHp;
    e.activate();answer(api,s,true);assert.equal(s.bossHp,before,'no early damage');
    api.advance(s,100,()=>.99,100,items=>items.slice());
    assert.equal(before-s.bossHp,6,file);assert.equal(e.active(),false);
    assert.equal(e.attackDamage(2),2);
  });
}

const source=read('crystal-game.js');
const extract=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
const burnContext=vm.createContext({window:context.window,ROYAL_SLIME_ABSORB:30000});
vm.runInContext(extract('  function applyFireArrowDamage(','  function newActiveSkillButton('),burnContext);
test('fire damage respects the swordmaster shield and resets inactivity only on damage',()=>{
  const s=bossState(context.window.WORDORIA_ELLIOT);s.elliotClock=61000;s.elliotShieldUntil=70000;
  burnContext.run=s;burnContext.applyFireArrowDamage(2);assert.equal(s.bossHp,500);
  s.elliotShieldUntil=0;burnContext.applyFireArrowDamage(2);assert.equal(s.bossHp,498);assert.equal(s.elliotNextInactivity,71000);
});
test('fire damage preserves the current board and damage credit for old bosses',()=>{
  for(const [file,key] of bosses.slice(0,4)){
    const s=bossState(context.window['WORDORIA_'+key]);attach(s,'ranger');burnContext.run=s;
    const before=s.bossHp;burnContext.applyFireArrowDamage(2);
    assert.equal(s.bossHp,before-2,file);assert.equal(s.correct,2,file);assert.equal(s.index,0,file);
  }
});
test('fire damage queues boss threshold skills and preserves Morgana healing',()=>{
  const dragon=bossState(context.window.WORDORIA_BLACK_DRAGON);attach(dragon,'ranger');dragon.bossHp=49;dragon.correct=11;
  burnContext.run=dragon;burnContext.applyFireArrowDamage(2);assert.deepEqual([...dragon.drainQueue],[48]);
  const morgana=bossState(context.window.WORDORIA_MORGANA);attach(morgana,'ranger');morgana.bossHp=context.window.WORDORIA_MORGANA.HEAL_THRESHOLD+1;
  burnContext.run=morgana;burnContext.applyFireArrowDamage(2);assert.equal(morgana.bossHp,200);assert.equal(morgana.morganaHealUsed,true);
});
test('fire damage cannot heal a defeated boss or affect a paused battle',()=>{
  const s=state({guardian:true,bossHp:1,bossMaxHp:60});attach(s,'ranger');burnContext.run=s;
  s.paused=true;burnContext.applyFireArrowDamage(2);assert.equal(s.bossHp,1);
  s.paused=false;burnContext.applyFireArrowDamage(2);assert.equal(s.bossHp,0);burnContext.applyFireArrowDamage(2);assert.equal(s.bossHp,0);
});

function royalBattle(overrides={}){
  const entries=Array.from({length:5},(_,id)=>({id,entry:[`word${id}`,'n',`meaning${id}`]}));
  const s=state({boss:true,bossHp:50,bossMaxHp:50,matchBoard:entries,matchEn:entries,matchKo:entries,matched:new Set(),selectedKo:null,selectedEn:null,...overrides});
  const callbacks=[],c=vm.createContext({run:s,callbacks,performance:{now:()=>0},render(){},speak(){},battleContactDelay:()=>100,setTimeout:fn=>{callbacks.push(fn);return callbacks.length;},reducedMotion:()=>true,document:{dispatchEvent(){},querySelector(){return null;}},CustomEvent:class{},$:()=>null,ROYAL_SLIME_ABSORB:30000});
  vm.runInContext(extract('  function royalSlimePick(','  function crystalGhostFall('),c);
  return {s,c,callbacks};
}
test('World 1 burst uses DMG ×3 on both the first and last pair, only at contact',()=>{
  for(const completed of [0,4]){
    const {s,c,callbacks}=royalBattle({correct:completed,index:completed,bossHp:50-completed,matched:new Set(Array.from({length:completed},(_,i)=>i))});
    const e=attach(s,'pugilist');e.activate();
    c.royalSlimePick({dataset:{side:'ko',id:String(completed)}});c.royalSlimePick({dataset:{side:'en',id:String(completed)}});
    assert.equal(s.bossHp,50-completed);callbacks.shift()();assert.equal(s.bossHp,50-completed-6);assert.equal(e.active(),false);
  }
});
test('World 1 damage goes through oath and mana shield',()=>{
  for(const cls of ['warrior','mage']){
    const {s,c}=royalBattle();attach(s,cls).activate();
    c.royalSlimePick({dataset:{side:'ko',id:'0'}});c.royalSlimePick({dataset:{side:'en',id:'1'}});
    assert.equal(s.hp,5);assert.equal(s.mp,2);
  }
});
test('World 8 spelling wrong answers also respect both defensive actives',()=>{
  for(const cls of ['warrior','mage']){
    const s=state({spelling:true,question:{answer:'p',choices:['a','p','c','d']}}),node={classList:{add(){}},textContent:''};attach(s,cls).activate();
    const c=vm.createContext({run:s,document:{querySelectorAll:()=>[],dispatchEvent(){}},CustomEvent:class{},$:()=>node,setTimeout:()=>1});
    vm.runInContext(extract('  function answerStorySpelling(','  function renderBattle('),c);c.answerStorySpelling(0);
    assert.equal(s.hp,5);assert.equal(s.mp,2);assert.equal(s.correct,0);
  }
});
test('deadeye DOM hints move to the next unmatched pair and clear at expiry',()=>{
  const nodes=Array.from({length:4},(_,i)=>({dataset:{id:String(i%2)},classes:new Set(),hints:0,classList:{add(name){nodes[i].classes.add(name);},remove(name){nodes[i].classes.delete(name);}},insertAdjacentHTML(){this.hints++;}}));
  const s=state({matchEn:[{id:0},{id:1}],matched:new Set()}),effect=attach(s,'sniper');effect.activate();s.correct++;effect.observeCorrect();
  const doc={querySelector:()=>null,querySelectorAll(selector){
    if(selector==='.story-match-item')return nodes;
    if(selector==='.deadeye-target')return nodes.filter(n=>n.classes.has('deadeye-target'));
    if(selector==='.deadeye-hint')return nodes.filter(n=>n.hints).map(n=>({remove(){n.hints=0;}}));
    return [];
  }};
  const c=vm.createContext({run:s,document:doc,$:()=>null});
  vm.runInContext(extract('  function refreshNewSkillFeedback(','  function storyBattleActions('),c);
  c.refreshNewSkillFeedback();assert.deepEqual(nodes.map(n=>n.hints),[1,0,1,0]);
  s.matched.add(0);s.correct++;c.refreshNewSkillFeedback();assert.deepEqual(nodes.map(n=>n.hints),[0,1,0,1]);
  effect.advance(10000);c.refreshNewSkillFeedback();assert.deepEqual(nodes.map(n=>n.hints),[0,0,0,0]);
});
