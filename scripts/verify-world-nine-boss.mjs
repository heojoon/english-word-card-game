import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({window:{}});
vm.runInContext(readFileSync(new URL('../world-nine-boss.js',import.meta.url),'utf8'),context);
const boss=context.window.WORDORIA_WORLD_NINE_BOSS;
const state=(number=15,dmg=4)=>({...boss.reset(number,dmg),elapsed:0,correct:0,hp:3});
test('midboss HP 200 and final HP 220 use DMG and a six-second per-answer budget',()=>{
  for(const [number,hp] of [[15,200],[30,220]]){
    const s=state(number);assert.equal(s.bossHp,hp);assert.equal(s.storyTimeLimit,Math.ceil(hp/4)*6000);
    boss.answer(s,true,200);boss.advance(s,199);assert.equal(s.bossHp,hp);
    boss.advance(s,1);assert.equal(s.bossHp,hp-4);assert.equal(s.correct,1);
    boss.advance(s,200);assert.equal(s.bossHp,hp-4);
  }
});
test('pause freezes contact and countdown; Ice Time freezes countdown while hit feedback completes',()=>{
  const s=state();boss.answer(s,true,200);s.paused=true;boss.advance(s,1000);assert.equal(s.elapsed,0);assert.equal(s.bossHp,200);
  s.paused=false;s.iceTimeActive=true;boss.advance(s,1000);assert.equal(s.elapsed,0);assert.equal(s.bossHp,196);assert.equal(s.trainingAction,null);
  boss.answer(s,false,0);assert.equal(s.iceTimeActive,false);assert.equal(s.timeStopped,false);
  assert.ok(!boss.advance(s,549).includes('wrong-contact'));assert.ok(boss.advance(s,1).includes('wrong-contact'));
});
test('burst damage applies once at contact and zero HP resolves after readable feedback',()=>{
  const s=state();let calls=0;s.activeSkills={attackDamage:n=>{calls++;return n*3;}};s.bossHp=10;
  boss.answer(s,true,200);assert.ok(boss.advance(s,200).includes('correct-contact'));assert.equal(calls,1);assert.equal(s.bossHp,0);
  assert.ok(!boss.advance(s,499).includes('victory'));assert.ok(boss.advance(s,1).includes('victory'));assert.equal(calls,1);
});
test('burn can finish without adding answers and timeout cannot emit victory',()=>{
  const s=state(30);boss.damage(s,220);assert.equal(s.correct,0);assert.ok(boss.advance(s,500).includes('victory'));
  const t=state();assert.ok(boss.advance(t,t.storyTimeLimit).includes('timeout'));assert.equal(t.bossHp,200);
});
test('a delayed frame cannot land an attack beyond the countdown deadline',()=>{
  const s=state();s.bossHp=4;s.elapsed=s.storyTimeLimit-1;boss.answer(s,true,200);
  assert.ok(boss.advance(s,1000).includes('timeout'));assert.equal(s.bossHp,4);assert.equal(s.trainingVictoryMs,null);
});
test('runtime integration bounds contacts and skill ticks at the actual remaining budget',()=>{
  const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
  const node={style:{},setAttribute(){}};let reason,skillDelta;
  const s=state();s.bossHp=4;s.elapsed=s.storyTimeLimit-1;boss.answer(s,true,200);
  s.activeSkills={advance:delta=>{skillDelta=delta;return false;},attackDamage:n=>n};
  const c=vm.createContext({window:{WORDORIA_WORLD_NINE_BOSS:boss},run:s,$:()=>node,finishBattle:(clear,why)=>{reason=why;},render(){},refreshNewSkillFeedback(){},document:{querySelector:()=>null,dispatchEvent(){}},CustomEvent:class{}});
  const start=source.indexOf('  function advanceWorldNineBossBattle(');
  vm.runInContext(source.slice(start,source.indexOf('  function answerStorySpelling(',start)),c);
  c.advanceWorldNineBossBattle(1000);
  assert.equal(skillDelta,1);assert.equal(reason,'timeout');assert.equal(s.bossHp,4);
});
test('both World 9 bosses use shared Ice Time activation, freeze, answer release and MP-enabled reuse',()=>{
  const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
  const start=source.indexOf('  function canActivateMageIceTime(');
  for(const number of [15,30]){
    const s={...state(number),story:true,spelling:true,mp:1};
    const c=vm.createContext({run:s,selectedCharacter:{class:'mage'},performance:{now:()=>100},render(){},setTimeout(){},document:{querySelector:()=>null}});
    vm.runInContext(source.slice(start,source.indexOf('  function updateWarriorSlash(',start)),c);
    c.activateMageIceTime();assert.equal(s.mp,0);assert.equal(s.iceTimeActive,true);assert.equal(s.iceTimePopUntil,1300);
    boss.advance(s,1200);assert.equal(s.elapsed,0);
    boss.answer(s,true,200);assert.equal(s.iceTimeActive,false);boss.advance(s,1000);
    s.mp=1;c.activateMageIceTime();assert.equal(s.mp,0);assert.equal(s.iceTimeActive,true);
    boss.answer(s,false,200);assert.equal(s.iceTimeActive,false);
  }
});
