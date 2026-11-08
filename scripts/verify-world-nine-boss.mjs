import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({window:{}});
vm.runInContext(readFileSync(new URL('../world-nine-boss.js',import.meta.url),'utf8'),context);
const boss=context.window.WORDORIA_WORLD_NINE_BOSS;
const state=(number=15,dmg=4)=>({...boss.reset(number,dmg),elapsed:0,correct:0,hp:3});
test('production boss strips match frame manifests, contact events and held knockdown',()=>{
  for(const kind of ['griffin','iris'])for(const action of ['idle','attack','hit','skill']){
    const path=new URL(`../assets/monsters/world-9/${kind}/${kind}-sd-${action}-strip.json`,import.meta.url),m=JSON.parse(readFileSync(path,'utf8'));
    const png=readFileSync(new URL(m.image,path));assert.equal(png.readUInt32BE(16),m.frameWidth*m.frameCount);assert.equal(png.readUInt32BE(20),m.frameHeight);assert.equal(png[25],6);
    assert.equal(m.frameCount,3);assert.equal(m.facing,'left');assert.equal(m.anchor.y,.975);assert.equal(m.sourceFrameGapPx,50);
    if(action==='attack'||action==='skill')assert.equal(m.frames[2].hit,true);
    if(action==='hit'){assert.equal(m.frames[2].hold,true);assert.equal(m.holdLastFrame,true);assert.equal(m.frameNames[2],'complete-knockdown');}
    const review=readFileSync(new URL(`review/${action}-spaced-50px.png`,path));assert.equal(review.readUInt32BE(16),3*m.frameWidth+100);
  }
});
test('wind queues three future questions without mutating the published question and freezes under Ice Time',()=>{
  const s=state();s.question={prompt:'unchanged'};s.iceTimeActive=true;boss.advance(s,21000);assert.equal(s.windRemaining,0);
  s.iceTimeActive=false;boss.advance(s,20000);assert.equal(s.windRemaining,3);assert.equal(s.question.prompt,'unchanged');
  const base={hidden:[1],choices:['a','b','c','d']};
  const q=boss.question(s,['training','n','훈련'],base);assert.equal(s.windRemaining,2);assert.notEqual(q.hidden.join(','),'1');assert.equal(new Set(q.choices).size,4);
  assert.equal(q.prompt[0],'t');assert.equal(q.prompt.at(-1),'g');
});
test('griffin threshold attack warns once, freezes, and contacts after 1200ms',()=>{
  const s=state();boss.damage(s,100);assert.equal(s.skillQueue.length,1);
  boss.advance(s,0);s.iceTimeActive=true;assert.ok(!boss.advance(s,2000).includes('skill-contact'));
  s.iceTimeActive=false;assert.ok(!boss.advance(s,1199).includes('skill-contact'));assert.ok(boss.advance(s,1).includes('skill-contact'));
  boss.damage(s,1);assert.equal(s.skillQueue.length,0);
});
test('Iris alternates blank count, queues every crossed exam once and preserves short-word choices',()=>{
  const s=state(30);const entry=['training','n','훈련'];
  assert.equal(boss.question(s,entry,{}).hidden.length,1);s.index=5;assert.equal(boss.question(s,entry,{}).hidden.length,2);
  const q=boss.question(s,['cat','n','고양이'],{});assert.equal(q.hidden.length,1);assert.equal(new Set(q.choices).size,4);
  boss.damage(s,170);assert.equal(s.examPending,3);boss.damage(s,1);assert.equal(s.examPending,3);
  const exam=boss.question(s,entry,{});assert.equal(exam.trainingExam,true);assert.equal(s.examPending,2);
  s.question=exam;boss.answer(s,false,200);assert.equal(s.question.trainingExam,true);assert.equal(s.examPending,2);
});
test('duplicate and post-exit answers never count twice',()=>{
  const s=state();boss.answer(s,true,200);boss.answer(s,true,200);assert.equal(s.correct,1);
  s.done=true;assert.deepEqual(Array.from(boss.advance(s,1000)),[]);assert.equal(s.bossHp,200);
});
test('lethal player contact before charge contact cancels the later skill damage',()=>{
  const s=state();s.bossHp=4;s.trainingSkill={kind:'charge',elapsed:1180,contact:false};boss.answer(s,true,10);
  const events=boss.advance(s,33);assert.ok(events.includes('correct-contact'));assert.ok(!events.includes('skill-contact'));assert.equal(s.bossHp,0);
});
test('a newly queued charge gets a full warning and cannot consume elapsed prior to its start',()=>{
  const s=state();boss.damage(s,100);const events=boss.advance(s,1500);assert.ok(events.includes('skill-start'));assert.ok(!events.includes('skill-contact'));assert.equal(s.trainingSkill.elapsed,0);
});
test('skill contact shows a timed player reaction and boss hits remain readable during charge',()=>{
  const s=state();s.trainingSkill={kind:'charge',elapsed:1199,contact:false};assert.ok(boss.advance(s,1).includes('skill-contact'));assert.ok(s.trainingPlayerHitMs>0);
  boss.damage(s,4);assert.equal(boss.visual(s).action,'hit');
});
test('final hit plays notice and recoil before the held nonlethal down frame',()=>{
  const s=state();boss.damage(s,200);assert.equal(boss.visual(s).frame,0);boss.advance(s,100);assert.equal(boss.visual(s).frame,1);boss.advance(s,120);assert.equal(boss.visual(s).frame,2);
});
test('Iris exam uses its dedicated preparation and contact sprite states',()=>{
  const s=state(30);s.examPending=1;s.question=boss.question(s,['training','n','훈련'],{});
  assert.equal(boss.visual(s).action,'skill');assert.equal(boss.visual(s).frame,0);
  boss.advance(s,600);assert.equal(boss.visual(s).frame,1);
  boss.answer(s,false,200);assert.ok(!boss.advance(s,1199).includes('wrong-contact'));
  assert.ok(boss.advance(s,1).includes('wrong-contact'));assert.equal(boss.visual(s).action,'skill');assert.equal(boss.visual(s).frame,2);
});
test('wrong-answer player recoil starts at actual boss contact',()=>{
  const s=state();boss.answer(s,false,200);assert.ok(!s.stunned);boss.advance(s,549);assert.ok(!s.stunned);boss.advance(s,1);assert.equal(s.stunned,true);
});
test('runtime skill and exam contacts each route exactly HP 1 through shared defense',()=>{
  const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8'),start=source.indexOf('  function advanceWorldNineBossBattle(');
  for(const kind of ['skill','exam']){
    const s=state(kind==='exam'?30:15);const calls=[];
    s.activeSkills={advance:()=>false,damage:n=>calls.push(n)};
    if(kind==='skill')s.trainingSkill={kind:'charge',elapsed:1199,contact:false};else{s.question={trainingExam:true};boss.answer(s,false,200);}
    const node={style:{},setAttribute(){}};
    const c=vm.createContext({window:{WORDORIA_WORLD_NINE_BOSS:boss},run:s,$:()=>node,finishBattle(){assert.fail('defense should prevent HP loss');},render(){},refreshNewSkillFeedback(){},refreshWorldNineBossSprite(){},document:{querySelector:()=>null,dispatchEvent(){}},CustomEvent:class{}});
    vm.runInContext(source.slice(start,source.indexOf('  function answerStorySpelling(',start)),c);c.advanceWorldNineBossBattle(kind==='skill'?1:1200);
    assert.deepEqual(calls,[1]);assert.equal(s.hp,3);
  }
});
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
