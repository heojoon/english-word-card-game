import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const window={};vm.runInNewContext(read('dark-triton-boss.js'),{window});
const boss=window.WORDORIA_DARK_TRITON,shuffle=x=>[...x].reverse();
const words=Array.from({length:7},(_,i)=>['word'+i,'n','뜻'+i]);
const state=()=>{const s={...boss.reset(),deck:boss.deck(words,shuffle),index:0,correct:0,hp:30,mp:2,elapsed:0};boss.board(s,shuffle);return s;};
const step=(s,ms,clock=ms)=>Array.from(boss.advance(s,ms,shuffle,clock));
function answer(s,id){boss.pick(s,'ko',id,420);return boss.pick(s,'en',id,420);}

test('220 HP, five minutes, unique five-pair boards and vocabulary cycles for both pool sizes',()=>{
  assert.equal(boss.HP,220);assert.equal(boss.TIME_MS,300000);
  for(let size=5;size<36;size++){
    const pool=Array.from({length:size},(_,i)=>['w'+i,'n','k'+i]),deck=boss.deck(pool,shuffle);
    assert.equal(deck.length,220);
    for(let i=0;i<220;i+=5)assert.equal(new Set(deck.slice(i,i+5).map(x=>x.entry[0])).size,5);
    for(let i=0;i+size<=220;i+=size)assert.equal(new Set(deck.slice(i,i+size).map(x=>x.entry[0])).size,size);
    for(let i=1;i<220;i++)assert.notEqual(deck[i].entry[0],deck[i-1].entry[0]);
  }
});
test('storm starts every ten seconds; release precedes contact and shuffle preserves answered cards',()=>{
  const s=state();s.matched.add(s.matchEn[0].id);s.selectedKo=s.matchKo[1].id;
  const ko=s.matchKo.map(x=>x.id),en=s.matchEn.map(x=>x.id),matched=[...s.matched];
  step(s,9999);assert.equal(s.tritonSkill,null);step(s,1);assert.equal(s.tritonSkill,'stormsurge');
  step(s,359);assert.equal(boss.projectiles(s).length,0);assert.deepEqual(s.matchKo.map(x=>x.id),ko);
  assert.ok(step(s,1).includes('release'));assert.equal(boss.projectiles(s)[0].progress,0);
  step(s,249);assert.equal(s.selectedKo,ko[1]);assert.ok(step(s,1).includes('shuffle'));
  assert.notDeepEqual(s.matchKo.map(x=>x.id),ko);assert.notDeepEqual(s.matchEn.map(x=>x.id),en);
  assert.deepEqual([...s.matched],matched);assert.equal(s.selectedKo,null);assert.equal(s.hp,30);
  step(s,180);assert.equal(s.tritonSkill,null);step(s,9210);assert.equal(s.tritonSkill,'stormsurge');
});
test('all crossed HP thresholds queue exactly one throw apiece, including multi-threshold hits',()=>{
  const s=state();s.bossHp=111;s.bossAttackSteps=90;answer(s,s.matchEn[0].id);
  step(s,420);assert.deepEqual(Array.from(s.tritonThresholds),[110,88,66,44,22]);
  step(s,300);assert.equal(s.tritonSkill,'trident-throw');
  for(let i=0;i<5;i++){
    step(s,609);assert.equal(s.hp,30-i);assert.ok(step(s,1).includes('trident-hit'));assert.equal(s.hp,29-i);step(s,180);
  }
  assert.equal(s.tritonSkill,null);assert.equal(s.tritonQueue.length,0);
  s.bossAttackSteps=1;answer(s,s.matchEn[1].id);step(s,720);assert.equal(s.tritonQueue.length,0);
});
test('pause freezes everything; ice freezes countdown/idle and defers queued casts; wrong releases it',()=>{
  const s=state();s.paused=true;const before=JSON.stringify(s);step(s,12000);assert.equal(JSON.stringify(s),before);
  s.paused=false;s.iceTimeActive=true;s.tritonQueue.push('stormsurge');const v=JSON.stringify(boss.visual(s));
  step(s,1200);assert.equal(s.tritonClock,0);assert.equal(JSON.stringify(boss.visual(s)),v);assert.equal(s.tritonSkill,null);
  answer(s,s.matchEn[0].id);step(s,420);assert.equal(s.bossHp,219);assert.equal(s.iceTimeActive,true);step(s,300);
  boss.pick(s,'ko',s.matchEn[1].id,420);assert.equal(boss.pick(s,'en',s.matchEn[2].id,420),'wrong');assert.equal(s.iceTimeActive,false);
  step(s,500);assert.equal(s.tritonSkill,'stormsurge');s.iceTimeActive=true;
  step(s,610);assert.equal(s.tritonClock,500);assert.equal(s.tritonContact,true);
});
test('ice ends at five-pair group completion, shared MP activation/overlay works again after potion restoration',()=>{
  const s=state();s.story=true;s.mp=1;
  const c=vm.createContext({window,run:s,selectedCharacter:{class:'mage'},performance:{now:()=>1000},render(){},setTimeout(){},document:{querySelector:()=>null}});
  const source=read('crystal-game.js');
  vm.runInContext(source.slice(source.indexOf('  function canActivateMageIceTime()'),source.indexOf('  function updateWarriorSlash(')),c);
  vm.runInContext(source.slice(source.indexOf('  function iceTimeEffectMarkup()'),source.indexOf('  function eagleEyeEffectMarkup()')),c);
  c.activateMageIceTime();assert.equal(s.mp,0);assert.equal(s.iceTimePopUntil,2200);assert.match(c.iceTimeEffectMarkup(),/ice-time-announcement/);assert.match(c.iceTimeEffectMarkup(),/ice-time-field/);
  for(const item of [...s.matchEn]){answer(s,item.id);step(s,420);step(s,300);}
  assert.equal(s.iceTimeActive,false);boss.board(s,shuffle);s.mp=1;c.activateMageIceTime();assert.equal(s.mp,0);assert.equal(s.iceTimeActive,true);
  const clock=s.tritonClock;step(s,1200);assert.equal(s.tritonClock,clock);
});
test('reduced motion preserves release before a single contact; clear/death cancels queued attacks',()=>{
  for(const reduced of [false,true]){
    const s=state();s.guardianReducedMotion=reduced;const m=reduced?.4:1;s.tritonQueue=['trident-throw'];
    step(s,360*m);assert.equal(boss.projectiles(s)[0].progress,0);assert.equal(s.hp,30);
    step(s,250*m);assert.equal(s.hp,29);step(s,180*m);assert.equal(s.tritonSkill,null);
  }
  const s=state();s.hp=1;s.tritonQueue=['trident-throw','stormsurge'];assert.ok(step(s,610).includes('defeat-player'));assert.equal(s.hp,0);assert.equal(s.tritonQueue.length,0);assert.equal(boss.projectiles(s).length,0);
});
test('lethal contact cancels pending skills, holds fully down frame, and permits last-millisecond victory',()=>{
  const s=state();s.bossHp=1;s.tritonClock=299999;s.tritonNextStorm=300000;s.elapsed=299999;answer(s,s.matchEn[0].id);s.guardianRemaining=1;
  let outcome=null;
  const c=vm.createContext({window,run:s,shuffle,emitAudio(){},updateWarriorSlash(){},document:{dispatchEvent(){}},CustomEvent:class{},prepareQuestion(){},finishBattle:(clear)=>{outcome=clear;},render(){},syncDarkTritonBattleVisual(){},$:()=>null,royalSlimeTime:()=>''});
  const source=read('crystal-game.js');vm.runInContext(source.slice(source.indexOf('  function advanceDarkTritonBattle'),source.indexOf('  function nereusSpriteStyle')),c);
  c.advanceDarkTritonBattle(33,33);assert.equal(s.bossHp,0);assert.equal(s.elapsed,300000);assert.equal(outcome,null);
  c.advanceDarkTritonBattle(859,859);assert.equal(boss.visual(s).frame,2);assert.equal(outcome,null);c.advanceDarkTritonBattle(1,1);assert.equal(outcome,true);
  assert.equal(s.tritonQueue.length,0);assert.equal(s.iceTimeActive,false);
});
test('real runtime selection reaches the boss instead of being rejected; renderer uses SD and shared active skills',()=>{
  const source=read('crystal-game.js'),s=state();let renders=0;
  const c=vm.createContext({window,run:s,esc:String,deployedAssetUrl:x=>x,royalSlimeTime:()=>'',battleHeroMarkup:()=>'',passiveBannerMarkup:()=>'',sniperTargetMarkup:()=>'',storyVitalsMarkup:()=>'',iceTimeEffectMarkup:()=>'<ice/>',eagleEyeEffectMarkup:()=>'',storyBattleActions:()=>'<actions/>',eaglePairHintMarkup:()=>'',sniperPairHintMarkup:()=>'',petPairHintMarkup:()=>'',battleContactDelay:()=>420,render(){renders++;},syncDarkTritonBattleVisual(){},performance:{now:()=>1000},speak(){},document:{dispatchEvent(){}},CustomEvent:class{}});
  vm.runInContext(source.slice(source.indexOf('  function darkTritonSpriteStyle'),source.indexOf('  function syncDarkTritonBattleVisual')),c);
  vm.runInContext(source.slice(source.indexOf('  function darkTritonPick'),source.indexOf('  function advanceDarkTritonBattle')),c);
  const id=s.matchEn[0].id;c.darkTritonPick({dataset:{side:'ko',id:String(id)}});c.darkTritonPick({dataset:{side:'en',id:String(id)}});
  assert.equal(s.guardianPhase,'player-attack');assert.equal(renders,2);
  const html=c.renderDarkTritonBattle();assert.match(html,/FINAL BOSS/);assert.match(html,/다크 트라이튼/);assert.match(html,/<ice\/>/);assert.match(html,/<actions\/>/);assert.equal((html.match(/data-action="story-pick"/g)||[]).length,10);assert.match(html,/char_dark_triton_idle_strip.png/);
});
test('runtime and native staging include boss, sprite contracts agree with release/contact and final hold',()=>{
  assert.match(read('index.html'),/dark-triton-boss.js/);assert.match(read('scripts/build-web.mjs'),/'dark-triton-boss.js'/);
  const source=read('crystal-game.js');assert.match(source,/darkTriton:chapter===9&&stage.number===30/);assert.match(source,/if\(run.darkTriton\)return renderDarkTritonBattle/);assert.match(source,/if\(run\?\.darkTriton\)\{darkTritonPick/);
  const root='assets/monsters/dark-triton/',contract=JSON.parse(read(root+'animation-contract.json'));
  for(const [action,spec] of Object.entries({...contract.actions,...contract.projectiles})){
    const fx=action in contract.projectiles,stem=`${fx?'fx':'char'}_dark_triton_${action.replaceAll('-','_')}_strip`,meta=JSON.parse(read(root+stem+'.json'));
    assert.ok(existsSync(new URL('../'+root+meta.image,import.meta.url)));assert.equal(meta.frameWidth,480);assert.equal(meta.frameHeight,320);assert.equal(meta.sourceFrameGapPx,50);
    assert.deepEqual(meta.frames.map(f=>f.durationMs),spec.durationsMs);
    if(spec.releaseFrame)assert.equal(meta.frames[spec.releaseFrame-1].release,true);
    if(spec.hitFrame)assert.equal(meta.frames[spec.hitFrame-1].hit,true);
    if(action==='hit')assert.equal(meta.frames[2].hold,true);
  }
});
test('7B narrative uses the standing CG for Dark Triton while preserving other speakers',async()=>{
  const {parseWorldSevenNarrative}=await import('../scripts/generate-story-novel.mjs');
  const lines=parseWorldSevenNarrative(read('assets/novel/world-7b-boss-start.md'),{world:'7b',location:'호수 밑의 왕좌'});
  const kings=lines.filter(line=>line.speaker==='다크 트라이튼');assert.ok(kings.length>0);
  for(const line of kings){assert.equal(line.className,'dark-triton');assert.equal(line.artPath,boss.ART);}
  for(const line of lines.filter(line=>line.speaker==='소서러스'))assert.notEqual(line.artPath,boss.ART);
  const w={};vm.runInNewContext(read('story-novel.js'),{window:w});
  const built=Object.values(w.WORDORIA_NOVELS).flat().filter(line=>line.speaker==='다크 트라이튼');assert.ok(built.length>0);assert.ok(built.every(line=>line.artPath===boss.ART));
});
