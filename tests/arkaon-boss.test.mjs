import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const window={};for(const file of ['nereus-boss.js','arkaon-boss.js'])vm.runInNewContext(read(file),{window});
const boss=window.WORDORIA_ARKAON,shuffle=x=>[...x].reverse(),words=Array.from({length:7},(_,i)=>['word'+i,'n','뜻'+i]);
const state=()=>{const s={...boss.reset(),deck:boss.deck(words,shuffle),index:0,correct:0,hp:20,mp:1,story:true};boss.board(s,shuffle);return s;};
const step=(s,ms,random=()=>1)=>Array.from(boss.advance(s,ms,shuffle,ms,random));
const answer=(s,id)=>{boss.pick(s,'ko',id,420);return boss.pick(s,'en',id,420);};
test('shockwave warns before contact, rolls once, and honors reduced motion',()=>{
  for(const reduced of [false,true]){const s=state();s.guardianReducedMotion=reduced;const m=reduced?.5:1;let rolls=0;
    assert.ok(step(s,20000).includes('wave-start'));assert.equal(boss.visual(s).frame,0);
    step(s,599*m,()=>{rolls++;return 0;});assert.equal(s.hp,20);assert.equal(rolls,0);
    assert.ok(step(s,m,()=>{rolls++;return 0;}).includes('wave-hit'));assert.equal(boss.visual(s).frame,2);assert.equal(s.hp,19);
    step(s,300*m,()=>{rolls++;return 0;});assert.equal(rolls,1);
  }
});
test('rearrangement preserves matched slots and pending correct contact',()=>{
  const s=state();answer(s,0);step(s,420);step(s,300);const matched=s.matchEn.findIndex(x=>x.id===0);
  s.arkaonClock=29900;s.arkaonNextWave=40000;answer(s,1);step(s,100);
  assert.equal(s.arkaonShufflePending,true);assert.equal(s.pendingPair,1);step(s,320);assert.ok(s.matched.has(1));
  assert.ok(step(s,300).includes('reorder'));assert.equal(s.matchEn[matched].id,0);assert.equal(new Set(s.matchEn.map(x=>x.id)).size,5);
});
test('pause freezes all state; ice freezes idle and skill clocks while attacks finish',()=>{
  const s=state();s.paused=true;const before=JSON.stringify(s);step(s,60000);assert.equal(JSON.stringify(s),before);
  s.paused=false;s.iceTimeActive=true;const visual=JSON.stringify(boss.visual(s));step(s,30000);assert.equal(s.arkaonClock,0);assert.equal(JSON.stringify(boss.visual(s)),visual);
  for(let id=0;id<5;id++){answer(s,id);step(s,420);step(s,300);assert.equal(s.iceTimeActive,id<4);}
  assert.equal(s.correct,5);assert.equal(s.bossHp,195);
});
test('wrong answer, exit, and defeat release ice; defeat holds complete knockdown',()=>{
  const s=state();s.iceTimeActive=true;boss.pick(s,'ko',0,420);assert.equal(boss.pick(s,'en',1,420),'wrong');assert.equal(s.hp,19);assert.equal(s.iceTimeActive,false);step(s,500);
  s.bossHp=1;s.arkaonCastMs=800;s.iceTimeActive=true;answer(s,0);step(s,420);assert.equal(s.arkaonCastMs,0);assert.equal(s.iceTimeActive,false);step(s,919);assert.equal(boss.visual(s).frame,2);assert.ok(step(s,1).includes('victory'));
  const b=state();b.iceTimeActive=true;boss.clear(b);assert.equal(b.iceTimeActive,false);
});
test('shared ice activation spends MP, shows 1.2s feedback, and supports potion reuse',()=>{
  const s=state(),c=vm.createContext({window,run:s,selectedCharacter:{class:'mage'},performance:{now:()=>1000},render(){},setTimeout(){},document:{querySelector:()=>null}}),source=read('crystal-game.js');
  vm.runInContext(source.slice(source.indexOf('  function canActivateMageIceTime()'),source.indexOf('  function updateWarriorSlash(')),c);
  vm.runInContext(source.slice(source.indexOf('  function iceTimeEffectMarkup()'),source.indexOf('  function eagleEyeEffectMarkup()')),c);
  c.activateMageIceTime();assert.equal(s.mp,0);assert.equal(s.iceTimePopUntil,2200);assert.match(c.iceTimeEffectMarkup(),/ice-time-announcement/);step(s,1000);assert.equal(s.arkaonClock,0);
  boss.pick(s,'ko',0,420);boss.pick(s,'en',1,420);step(s,500);s.mp=1;c.activateMageIceTime();assert.equal(s.mp,0);assert.equal(s.iceTimeActive,true);
});
test('five unique pairs, contact-based damage, large attack and vocabulary cycles',()=>{
  const s=state();assert.equal(boss.TIME_MS,300000);assert.equal(s.deck.length,200);
  for(let i=0;i<200;i+=5)assert.equal(new Set(s.deck.slice(i,i+5).map(x=>x.entry[0])).size,5);
  s.bossAttackSteps=50;answer(s,0);step(s,419);assert.equal(s.bossHp,200);step(s,1);assert.equal(s.bossHp,150);
});
test('runtime art preserves animation geometry, contact frame, and held knockdown',()=>{
  for(const action of ['idle','attack','reorder','hit']){
    const meta=JSON.parse(read(`assets/monsters/arkaon/monster_arkaon_sd_${action}_strip.json`));
    const png=readFileSync(new URL(`../assets/monsters/arkaon/${meta.image}`,import.meta.url));
    assert.equal(png.readUInt32BE(16),meta.frameWidth*meta.frameCount);assert.equal(png.readUInt32BE(20),meta.frameHeight);
    assert.equal(png[25],6);assert.equal(meta.sourceFrameGapPx,50);assert.equal(meta.anchor.y,.975);
    assert.deepEqual(meta.frames.map(f=>f.durationMs),Array.from(boss.ANIMATIONS[action]));
    if(action==='attack'){assert.equal(meta.frames[2].hit,true);assert.equal(meta.frames.slice(0,2).reduce((n,f)=>n+f.durationMs,0),boss.CONTACT_MS);}
    if(action==='hit'){assert.equal(meta.frames[2].hold,true);assert.equal(meta.frames[2].name,'knockdown');}
  }
  const source=read('crystal-game.js');
  assert.match(source,/if\(source.arkaon\)Object.assign\(run,window.WORDORIA_ARKAON.reset/);
  assert.match(source,/if\(run.arkaon\)return renderArkaonBattle/);
  assert.match(source,/run.arkaon\?'storyChapterSevenMidbossEnd'/);
  assert.match(read('scripts/build-web.mjs'),/'arkaon-boss.js'/);
  const c={window:{}};vm.runInNewContext(read('story-novel.js'),c);
  assert.ok(c.window.WORDORIA_NOVELS.world7cMidbossStart.some(line=>line.speaker==='아르카온'&&line.artPath===boss.ART));
});
