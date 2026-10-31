import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const c=vm.createContext({window:{}});
for(const file of ['nereus-boss.js','active-skills.js','seal-knight-boss.js'])vm.runInContext(read(file),c);
const b=c.window.WORDORIA_SEAL_KNIGHT,shuffle=rows=>[...rows].reverse();
const words=Array.from({length:7},(_,i)=>['word'+i,'n','뜻'+i]);
function state(extra={}){const s={...b.reset(),story:true,hp:20,hpMax:20,mp:3,correct:0,index:0,bossAttackSteps:4,deck:b.deck(words,shuffle),...extra};b.board(s,shuffle);return s;}
function attack(s,ms=100){const id=s.matchEn.find(x=>!s.matched.has(x.id)).id;assert.equal(b.pick(s,'ko',id,ms),'selected');assert.equal(b.pick(s,'en',id,ms),'correct');return id;}
const advance=(s,ms,clock=ms)=>b.advance(s,ms,shuffle,clock);
test('DMG 4 resolves once at contact and duplicate input is ignored',()=>{
 const s=state();const id=attack(s);assert.equal(b.pick(s,'en',id,100),false);
 advance(s,99);assert.equal(s.bossHp,240);assert.equal(s.correct,0);
 advance(s,1);assert.equal(s.bossHp,236);assert.equal(s.correct,1);advance(s,300);assert.equal(s.bossHp,236);
});
test('HP 180 dies on exactly 45 DMG 4 contacts, never a fixed answer target',()=>{
 const s=state({bossHp:180});let result=[];
 for(let i=0;i<45;i++){attack(s);result=advance(s,100);if(i<44){advance(s,300);if(s.matched.size===5)b.board(s,shuffle);assert.ok(s.bossHp>0);}}
 assert.equal(s.correct,45);assert.equal(s.bossHp,0);assert.ok(advance(s,920).includes('victory'));
 assert.equal(b.visual(s).frame,2);
});
test('deck extends beyond fixed length without duplicate pairs or skipping a unique cycle',()=>{
 const s=state({bossHp:10000});
 for(let i=0;i<250;i++){attack(s);advance(s,100,0);advance(s,300,0);if(s.matched.size===5)b.board(s,shuffle);}
 assert.equal(s.correct,250);assert.equal(s.bossHp,9000);
 const sequence=s.deck.map(x=>x.entry[0]);
 for(let i=0;i<sequence.length-7;i+=7)assert.equal(new Set(sequence.slice(i,i+7)).size,7);
 for(let i=0;i<sequence.length;i+=5)assert.equal(new Set(sequence.slice(i,i+5)).size,Math.min(5,sequence.length-i));
});
test('shield starts at 20s, halves contact and burn damage, ends after 5s',()=>{
 const s=state();advance(s,20000);assert.equal(s.sealShieldMs,5000);
 attack(s);advance(s,100);assert.equal(s.bossHp,238);b.damage(s,2);assert.equal(s.bossHp,237);
 advance(s,4900);assert.equal(s.sealShieldMs,0);b.damage(s,1);assert.equal(s.bossHp,236);
});
test('all crossed HP thresholds queue once, retain order and apply at sword contact',()=>{
 const s=state();b.damage(s,190);assert.deepEqual(Array.from(s.sealThresholds),[180,120,60]);
 advance(s,1);assert.equal(s.hp,20);advance(s,598);assert.equal(s.hp,20);
 advance(s,1);assert.equal(s.hp,19);advance(s,2500);assert.equal(s.hp,17);assert.equal(s.sealQueue.length,0);
 b.damage(s,1);advance(s,1000);assert.equal(s.hp,17);
});
test('ice freezes countdown, idle, shield and new skills but permits attack/reaction; releases on group or wrong',()=>{
 const s=state();advance(s,20000);s.iceTimeActive=true;const clock=s.sealClock,frame=b.visual(s).frame;
 advance(s,4000);assert.equal(s.sealClock,clock);assert.equal(s.sealShieldMs,5000);assert.equal(b.visual(s).frame,frame);
 for(let i=0;i<5;i++){attack(s);advance(s,100);advance(s,300);}
 assert.equal(s.iceTimeActive,false);b.board(s,shuffle);s.iceTimeActive=true;
 b.pick(s,'ko',s.matchKo[0].id,100);b.pick(s,'en',s.matchKo[1].id,100);assert.equal(s.iceTimeActive,false);
});
test('burst, mana shield and pet protection use shared damage routes',()=>{
 const s=state();s.activeSkills=c.window.WORDORIA_ACTIVE_SKILLS.attach(s,'pugilist',{unlocked:true});s.activeSkills.activate();
 attack(s);advance(s,100);assert.equal(s.bossHp,228);
 const mage=state({mp:1});mage.activeSkills=c.window.WORDORIA_ACTIVE_SKILLS.attach(mage,'mage',{unlocked:true});mage.activeSkills.activate();
 b.damage(mage,70);advance(mage,601);assert.equal(mage.hp,20);assert.equal(mage.mp,0);
});
test('pause, clear, death, timeout and external lethal damage cancel pending damage',()=>{
 const s=state();attack(s);s.paused=true;advance(s,1000);assert.equal(s.bossHp,240);
 s.paused=false;b.clear(s);advance(s,1000);assert.equal(s.bossHp,240);assert.equal(s.correct,0);
 const t=state();advance(t,299990);attack(t);advance(t,100);assert.equal(t.bossHp,240);assert.equal(t.correct,0);
 const dead=state();attack(dead);b.damage(dead,240);advance(dead,100);assert.equal(dead.correct,0);assert.equal(dead.bossHp,0);assert.ok(advance(dead,920).includes('victory'));
});
test('combat scheduler rejects burn due at or after deadline, including a delayed frame',()=>{
 const s=state({bossHp:2,sealClock:299990,sealNextShield:300000});
 s.activeSkills=c.window.WORDORIA_ACTIVE_SKILLS.attach(s,'ranger',{unlocked:true,burn:n=>b.damage(s,n)});s.activeSkills.activate();s.activeSkills.advance(990);
 const events=b.advanceCombat(s,1000,shuffle);assert.equal(s.bossHp,2);assert.equal(s.sealClock,300000);assert.ok(events.includes('timeout'));assert.ok(!events.includes('victory'));
 const early=state({bossHp:2,sealClock:299980,sealNextShield:300000});
 early.activeSkills=c.window.WORDORIA_ACTIVE_SKILLS.attach(early,'ranger',{unlocked:true,burn:n=>b.damage(early,n)});early.activeSkills.activate();early.activeSkills.advance(990);
 assert.ok(b.advanceCombat(early,1000,shuffle).includes('victory'));assert.equal(early.sealClock,299990);
});
test('combat scheduler evaluates burn against shield state at its actual tick',()=>{
 for(const [clock,shield,expected] of [[19990,0,239],[24990,10,238]]){
  const s=state({sealClock:clock,sealShieldMs:shield,sealNextShield:clock<20000?20000:40000});
  s.activeSkills=c.window.WORDORIA_ACTIVE_SKILLS.attach(s,'ranger',{unlocked:true,burn:n=>b.damage(s,n)});s.activeSkills.activate();s.activeSkills.advance(990);
  b.advanceCombat(s,10,shuffle);assert.equal(s.bossHp,expected);
 }
});
test('combat scheduler preserves active duration and pet time stop through a large delta',()=>{
 const s=state({sealClock:1000});s.activeSkills=c.window.WORDORIA_ACTIVE_SKILLS.attach(s,'warrior',{unlocked:true});s.activeSkills.activate();
 b.damage(s,70);b.advanceCombat(s,1000,shuffle);assert.equal(s.hp,20);
 vm.runInContext(read('pet-system.js'),c);s.petEffects=c.window.WORDORIA_PETS.attach(s,{code:'pet_prism_guardian_dragon'});s.petTimeMs=3000;
 const clock=s.sealClock;b.advanceCombat(s,4000,shuffle);assert.equal(s.sealClock,clock+1000);assert.equal(s.petTimeMs,0);
});
test('mage activation uses MP 1 and 1.2s feedback, freezes time and supports potion-enabled reuse',()=>{
 const s=state({mp:1});const source=read('crystal-game.js');
 const context=vm.createContext({run:s,selectedCharacter:{class:'mage'},performance:{now:()=>100},render(){},setTimeout(){},document:{querySelector:()=>null}});
 vm.runInContext(source.split('\n').filter(line=>/^  function (canActivateMageIceTime|activateMageIceTime)\(/.test(line)).join('\n'),context);
 context.activateMageIceTime();assert.equal(s.mp,0);assert.equal(s.iceTimePopUntil,1300);
 b.advanceCombat(s,500,shuffle);assert.equal(s.sealClock,0);
 for(let i=0;i<5;i++){attack(s);b.advanceCombat(s,400,shuffle);}assert.equal(s.iceTimeActive,false);
 b.board(s,shuffle);assert.equal(context.canActivateMageIceTime(),false);s.mp=1;context.activateMageIceTime();assert.equal(s.mp,0);assert.equal(s.iceTimeActive,true);
});
test('hint and protection pets work on the five-pair boss board',()=>{
 vm.runInContext(read('pet-system.js'),c);const s=state();s.petEffects=c.window.WORDORIA_PETS.attach(s,{code:'pet'},{random:()=>0});assert.equal(s.petEffects.onQuestion(),true);assert.ok(s.matchEn.some(x=>x.id===s.petHint.pairId));
 const guard=state();guard.petEffects=c.window.WORDORIA_PETS.attach(guard,{code:'pet_pebble_slime'},{random:()=>0});guard.petEffects.onCorrect();b.damage(guard,70);b.advanceCombat(guard,601,shuffle);assert.equal(guard.hp,20);assert.equal(guard.petShield,false);
});
