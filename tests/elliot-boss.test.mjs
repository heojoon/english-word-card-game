import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const window={};vm.runInNewContext(read('elliot-boss.js'),{window});
const rules=window.WORDORIA_ELLIOT;
const fresh=()=>({...rules.reset(),elliotNextInactivity:Infinity,hp:100,hpMax:100,index:0,correct:0,elapsed:0,bossAttackSteps:1});
const hit=(s,damage=1)=>{s.bossAttackSteps=damage;assert.ok(rules.answer(s,true,200));rules.advance(s,200);rules.advance(s,300);};

test('Elliot uses 500 HP, 90 seconds, 800 crystals and stable vocabulary cycles',()=>{
  const s=fresh();assert.equal(s.bossHp,500);assert.equal(s.storyTimeLimit,90000);assert.equal(rules.REWARD,800);
  const words=Array.from({length:10},(_,i)=>['w'+i,'n','뜻'+i]);const deck=rules.deck(words,x=>x.reverse());
  assert.equal(deck.length,500);for(let i=0;i<500;i+=10)assert.equal(new Set(deck.slice(i,i+10).map(x=>x.entry[0])).size,10);
  for(let i=1;i<deck.length;i++)assert.notEqual(deck[i-1].entry[0],deck[i].entry[0]);
});
test('Aura Sword starts every 20 seconds and damages only on the declared contact frame',()=>{
  const s=fresh();rules.advance(s,19999);assert.equal(s.hp,100);
  assert.ok(rules.advance(s,1).includes('aura-start'));assert.equal(s.hp,100);assert.equal(rules.visual(s).frame,0);
  rules.advance(s,399);assert.equal(s.hp,100);assert.ok(rules.advance(s,1).includes('aura-hit'));assert.equal(s.hp,99);assert.equal(rules.visual(s).frame,2);
  rules.advance(s,180);assert.equal(rules.visual(s).action,'idle');rules.advance(s,19420);assert.equal(s.elliotAction,'attack');
});
test('shield blocks all contact damage for exactly ten seconds while recording correct answers',()=>{
  const s=fresh();assert.ok(rules.advance(s,60000).includes('shield-start'));assert.ok(rules.shielded(s));
  const hp=s.bossHp;hit(s,30);assert.equal(s.bossHp,hp);assert.equal(s.correct,1);
  rules.advance(s,9499);assert.ok(rules.shielded(s));rules.advance(s,1);assert.equal(rules.shielded(s),false);
  hit(s,30);assert.equal(s.bossHp,hp-30);
});
test('simultaneous shield and sword retain the sword cast and apply a single hit after shield pose',()=>{
  const s=fresh();rules.advance(s,60000);const hp=s.hp;assert.equal(s.elliotAction,'shield');
  rules.advance(s,600);assert.equal(s.elliotAction,'attack');rules.advance(s,399);assert.equal(s.hp,hp);rules.advance(s,1);assert.equal(s.hp,hp-1);
});
test('victory requires survival only; zero boss HP never wins early',()=>{
  for(const hp of [500,251,250,0]){const s=fresh();s.bossHp=hp;assert.equal(rules.won(s),false);const events=rules.advance(s,89999);assert.ok(!events.includes('victory'));assert.ok(rules.advance(s,1).includes('victory'));assert.equal(s.elapsed,90000);}
  const s=fresh();s.hp=0;assert.ok(rules.advance(s,90000).includes('defeat-player'));assert.equal(rules.won(s),false);
});
test('large clock steps and small clock steps produce the same skills, HP and outcome',()=>{
  const a=fresh(),b=fresh();a.bossHp=b.bossHp=250;let hits=0;
  for(let i=0;i<90000;i+=25)hits+=rules.advance(a,25).filter(x=>x==='aura-hit').length;
  const events=rules.advance(b,900000);assert.equal(a.hp,b.hp);assert.equal(hits,4);assert.equal(a.elapsed,90000);assert.equal(b.elapsed,90000);assert.ok(events.includes('victory'));
});
test('pause, Ice Time and pet stop freeze skill clocks, shield and enemy poses; player contact completes',()=>{
  const s=fresh();rules.advance(s,20200);const before={hp:s.hp,clock:s.elliotClock,pose:s.elliotActionMs};
  s.paused=true;rules.advance(s,10000);assert.equal(s.elliotClock,before.clock);s.paused=false;
  s.iceTimeActive=true;assert.ok(rules.answer(s,true,200));rules.advance(s,5000);assert.equal(s.bossHp,499);assert.equal(s.elliotClock,before.clock);assert.equal(s.elliotActionMs,before.pose);assert.equal(s.hp,before.hp);
  s.iceTimeActive=false;rules.advance(s,10000,Math.random,0);assert.equal(s.elliotClock,before.clock);
  rules.advance(s,200);assert.equal(s.hp,before.hp-1);
  rules.advance(s,40000-s.elliotClock);const end=s.elliotShieldUntil;s.iceTimeActive=true;rules.advance(s,20000);assert.equal(s.elliotShieldUntil,end);
});
test('lethal aura respects pet damage/revival and prevents a dead player from winning',()=>{
  const s=fresh();s.hp=1;s.bossHp=250;assert.ok(rules.advance(s,20400).includes('defeat-player'));assert.equal(s.hp,0);
  const p=fresh();p.hp=1;p.petEffects={damage(n){assert.equal(n,1);p.hp=1;}};assert.ok(!rules.advance(p,20400).includes('defeat-player'));assert.equal(p.hp,1);
});
test('reduced motion preserves contact and cleanup resets shield, queue and Ice Time',()=>{
  const s=fresh();s.guardianReducedMotion=true;rules.advance(s,20000);rules.advance(s,199);assert.equal(s.hp,100);rules.advance(s,1);assert.equal(s.hp,99);
  rules.advance(s,40000-s.elliotClock);s.iceTimeActive=true;rules.clear(s);assert.equal(s.elliotShieldUntil,0);assert.equal(s.elliotAuraPending,0);assert.equal(s.iceTimeActive,false);
});
test('actual mage skill and mana potion enable Ice Time reuse; full boards and mistakes release it',async()=>{
  const source=read('crystal-game.js');
  const s={...fresh(),story:true,mp:1,mpMax:1,question:{choices:['yes','no'],answer:'yes',entry:['word','n','뜻']}};
  s.deck=rules.deck(Array.from({length:7},(_,i)=>['word'+i,'n','뜻'+i]),x=>x);rules.board(s,x=>x);
  const c=vm.createContext({window,run:s,localMode:true,selectedCharacter:{id:'hero',class:'mage'},performance:{now:()=>1000},render(){},toast(){},speak(){},saveDemo(){},potionInventory:{equipped_slot_1:'blue'},demoState:{potionInventory:{}},equippedPotions:()=>['blue'],potionTypes:{blue:{name:'마나포션'}},battleContactDelay:()=>200});
  c.setTimeout=()=>1;
  vm.runInContext(source.slice(source.indexOf('  function canActivateMageIceTime()'),source.indexOf('  function updateWarriorSlash(')),c);
  vm.runInContext(source.slice(source.indexOf('  function elliotPick('),source.indexOf('  function advanceElliotBattle(')),c);
  c.document={dispatchEvent(){}};c.CustomEvent=function(){};
  const potionStart=source.indexOf('  async function useStoryPotion(');vm.runInContext(source.slice(potionStart,source.indexOf('\n',potionStart)),c);
  c.activateMageIceTime();assert.equal(s.mp,0);assert.equal(s.iceTimeActive,true);rules.advance(s,10000);assert.equal(s.elapsed,0);
  for(let id=0;id<5;id++){
    c.elliotPick({dataset:{side:'ko',id}});c.elliotPick({dataset:{side:'en',id}});
    assert.equal(s.iceTimeActive,true);rules.advance(s,500);assert.equal(s.iceTimeActive,id<4);
  }
  assert.equal(s.bossHp,495);rules.board(s,x=>x);
  await c.useStoryPotion(0,{disabled:false});assert.equal(s.mp,1);assert.equal(c.potionInventory.equipped_slot_1,null);
  c.activateMageIceTime();assert.equal(s.mp,0);assert.equal(s.iceTimeActive,true);c.elliotPick({dataset:{side:'ko',id:5}});c.elliotPick({dataset:{side:'en',id:6}});assert.equal(s.iceTimeActive,false);assert.equal(s.hp,99);
  rules.clear(s);assert.equal(s.iceTimeActive,false);
});
test('matching pairs apply player DMG only at contact, reject repeats and renew complete boards',()=>{
  const s=fresh();s.bossAttackSteps=7;s.deck=rules.deck(Array.from({length:7},(_,i)=>['w'+i,'n','뜻'+i]),x=>x.reverse());rules.board(s,x=>x);
  for(let i=0;i<500;i+=5)assert.equal(new Set(s.deck.slice(i,i+5).map(x=>x.entry[0])).size,5);
  for(let id=0;id<5;id++){
    assert.equal(rules.pick(s,'ko',id,200),'selected');assert.equal(rules.pick(s,'en',id,200),'correct');
    const hp=s.bossHp;rules.advance(s,199);assert.equal(s.bossHp,hp);rules.advance(s,1);assert.equal(s.bossHp,hp-7);
    const events=rules.advance(s,300);assert.ok(events.includes(id===4?'board-ready':'ready'));assert.equal(rules.pick(s,'ko',id,200),false);
  }
  assert.equal(s.correct,5);rules.board(s,x=>x);assert.equal(s.matchBoard.length,5);assert.equal(s.matchEn[0].id,5);assert.equal(s.matched.size,0);
});
test('Elliot renderer uses matching controls, numeric HP and no boss gauge',()=>{
  const source=read('crystal-game.js');const renderer=source.slice(source.indexOf('  function renderElliotBattle('),source.indexOf('  function elliotPick('));
  assert.ok(renderer.includes('data-action="story-pick"'));assert.ok(renderer.includes('HP ${run.bossHp} / 500'));
  assert.ok(!renderer.includes('guardian-health'));assert.ok(!renderer.includes('guardian-answer'));assert.ok(renderer.includes('1분 30초'));
});
test('ranger and spirit hints work on Elliot matching boards without a multiple-choice question',()=>{
  const source=read('crystal-game.js'),s={...fresh(),story:true,mp:1,deck:rules.deck(Array.from({length:5},(_,i)=>['w'+i,'n','뜻'+i]),x=>x)};
  rules.board(s,x=>x);
  const c=vm.createContext({window,run:s,selectedCharacter:{class:'ranger'}});
  vm.runInContext(source.slice(source.indexOf('  function canActivateRangerEagleEye('),source.indexOf('  function activateRangerEagleEye(')),c);
  assert.equal(c.canActivateRangerEagleEye(),true);
  vm.runInContext(read('pet-system.js'),c);const pets=c.window.WORDORIA_PETS;
  const effect=pets.attach(s,pets.catalog.find(p=>p.code==='pet'),{random:()=>0});
  assert.equal(effect.onQuestion(),true);assert.equal(s.petHint.pairId,0);
});
test('capital story leads to trial introduction, then battle; success dialogue returns to results',()=>{
  const source=read('crystal-game.js');const start=source.indexOf('  function completeStoryDialogue()');
  // Entering stage 20 often retains the already-finished stage 19 run.
  const c=vm.createContext({page:'storyChapterSixBCapital',run:{done:true},storyDialogueIndex:4,bossEncounter:()=>false,startBattle(){c.started=true;},go(p){c.page=p;}});
  vm.runInContext(source.slice(start,source.indexOf('\n',start)),c);
  c.completeStoryDialogue();assert.equal(c.page,'storyChapterSixBBossStart');assert.equal(c.storyDialogueIndex,0);
  c.completeStoryDialogue();assert.equal(c.started,true);c.page='storyChapterSixBBossEnd';c.run.done=true;c.completeStoryDialogue();assert.equal(c.page,'result');
});

// Keep the existing periodic-skill tests isolated; exercise the real inactivity clock here.
test('ten seconds without damage triggers two consecutive swords and repeats',()=>{
 const s={...fresh(),elliotNextInactivity:rules.INACTIVITY_MS};
 assert.ok(!rules.advance(s,9999).includes('aura-start'));
 assert.ok(rules.advance(s,1).includes('inactivity-punish'));assert.equal(s.elliotAction,'attack');
 const events=rules.advance(s,1160);assert.equal(events.filter(x=>x==='aura-hit').length,2);assert.equal(s.hp,98);
 assert.ok(rules.advance(s,8840).includes('inactivity-punish'));
});
test('only actual damage resets inactivity; frozen clocks do not advance it',()=>{
 const s={...fresh(),elliotNextInactivity:10000};rules.advance(s,2000);hit(s,7);assert.equal(s.elliotNextInactivity,12200);
 s.paused=true;rules.advance(s,10000);s.paused=false;s.iceTimeActive=true;rules.advance(s,10000);s.iceTimeActive=false;rules.advance(s,10000,Math.random,0);assert.equal(s.elliotClock,2500);
 s.elliotShieldUntil=10000;hit(s);assert.equal(s.elliotNextInactivity,12200);
 assert.ok(rules.advance(s,9200).includes('inactivity-punish'));
});

test('warning starts three seconds before punishment, counts down and cancels on damage',()=>{
 const s={...fresh(),elliotNextInactivity:rules.INACTIVITY_MS};
 assert.ok(!rules.advance(s,6999).includes('inactivity-warning'));assert.equal(rules.warning(s),'');
 assert.ok(rules.advance(s,1).includes('inactivity-warning'));assert.ok(rules.warning(s).includes('3'));
 rules.advance(s,1000);assert.ok(rules.warning(s).includes('2'));
 s.iceTimeActive=true;rules.advance(s,5000);assert.equal(s.elliotClock,8000);assert.ok(rules.warning(s).includes('2'));s.iceTimeActive=false;
 hit(s);assert.equal(rules.warning(s),'');assert.equal(s.elliotNextInactivity,18200);
 assert.ok(rules.advance(s,6700).includes('inactivity-warning'));
 assert.ok(rules.advance(s,3000).includes('inactivity-punish'));assert.equal(rules.warning(s),'');
 rules.clear(s);assert.equal(rules.warning(s),'');
});
