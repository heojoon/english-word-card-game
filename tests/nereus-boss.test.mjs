import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const window={};vm.runInNewContext(read('nereus-boss.js'),{window});
const boss=window.WORDORIA_NEREUS,shuffle=x=>[...x],words=Array.from({length:7},(_,i)=>['word'+i,'n','뜻'+i]);
const state=()=>{const s={...boss.reset(),deck:boss.deck(words,shuffle),index:0,correct:0,hp:30,mp:2,elapsed:0};boss.board(s,shuffle);return s;};
const step=(s,ms,random=()=>1,clock=ms)=>Array.from(boss.advance(s,ms,random,clock));
function answer(s,id){boss.pick(s,'ko',id,420);return boss.pick(s,'en',id,420);}
test('World 7B-15 has 200 HP, five-minute matching and three independent 12% rolls',()=>{
  assert.equal(boss.HP,200);assert.equal(boss.TIME_MS,300000);assert.equal(boss.HIT_CHANCE,.12);
  const s=state();let rolls=0;step(s,9999,()=>{rolls++;return 0;});assert.equal(rolls,0);
  assert.ok(step(s,1).includes('volley-start'));assert.equal(s.nereusContacts,0);
  step(s,999,()=>{rolls++;return 0;});assert.equal(rolls,0);
  assert.ok(step(s,1,()=>{rolls++;return .11999;}).includes('spear-hit'));assert.equal(s.hp,29);
  assert.ok(step(s,500,()=>{rolls++;return .12;}).includes('spear-miss'));assert.equal(s.hp,29);
  step(s,500,()=>{rolls++;return 0;});assert.equal(rolls,3);assert.equal(s.hp,28);
  step(s,7999,()=>{rolls++;return 1;});assert.equal(rolls,3);
  step(s,1);assert.ok(s.nereusVolleyMs>0);
});
test('five unique pairs per board and unique vocabulary cycles before reuse',()=>{
  for(let size=5;size<=35;size++){
    const pool=Array.from({length:size},(_,i)=>['w'+i,'n','k'+i]),deck=boss.deck(pool,x=>[...x].reverse());assert.equal(deck.length,200);
    for(let i=0;i<200;i+=5)assert.equal(new Set(deck.slice(i,i+5).map(x=>x.entry[0])).size,5);
    for(let i=0;i+size<=200;i+=size)assert.equal(new Set(deck.slice(i,i+size).map(x=>x.entry[0])).size,size);
    for(let i=1;i<200;i++)assert.notEqual(deck[i].entry[0],deck[i-1].entry[0]);
  }
});
test('every HP threshold triggers once; skipped thresholds queue full 10-second windows',()=>{
  const s=state();s.bossHp=101;s.bossAttackSteps=42;answer(s,0);step(s,420);
  assert.deepEqual(Array.from(s.nereusThresholds),[100,80,60]);assert.equal(s.nereusSpeedPending,2);assert.equal(s.nereusSpeedMs,10000);
  assert.equal(boss.englishLabel(s,['hello world']),'***********');
  step(s,300);assert.equal(boss.hidden(s),false);step(s,180);assert.equal(boss.hidden(s),true);
  step(s,9519);assert.equal(s.nereusSpeedMs,1);step(s,1);assert.equal(s.nereusSpeedMs,10000);assert.equal(s.nereusSpeedPending,1);
  step(s,20000);assert.equal(s.nereusSpeedMs,0);assert.equal(s.nereusSpeedPending,0);assert.equal(boss.englishLabel(s,['hello']),'hello');
  s.bossAttackSteps=1;answer(s,1);step(s,420);assert.equal(s.nereusSpeedMs,0);
});
test('all five thresholds trigger at 50/40/30/20/10 percent and survive board transitions',()=>{
  const s=state();s.hp=100;s.bossAttackSteps=20;
  for(let i=0;i<9;i++){
    if(i&&i%5===0)boss.board(s,shuffle);
    answer(s,s.matchEn[i%5].id);step(s,420);step(s,300);
    if(i>=4){assert.ok(s.nereusThresholds.includes(180-i*20));step(s,10000);}
  }
  assert.deepEqual(Array.from(s.nereusThresholds),[100,80,60,40,20]);
});
test('pause freezes everything; ice pauses clock/stealth/idle while attacks resolve',()=>{
  const s=state();s.nereusSpeedMs=8000;s.paused=true;const before=JSON.stringify(s);step(s,12000);assert.equal(JSON.stringify(s),before);
  s.paused=false;s.iceTimeActive=true;const v=JSON.stringify(boss.visual(s));step(s,1200);assert.equal(s.nereusClock,0);assert.equal(s.nereusSpeedMs,8000);assert.equal(JSON.stringify(boss.visual(s)),v);
  answer(s,0);step(s,419);assert.equal(s.bossHp,200);step(s,1);assert.equal(s.bossHp,199);assert.equal(s.iceTimeActive,true);step(s,300);
  for(let i=1;i<5;i++){answer(s,i);step(s,420);step(s,300);}
  assert.equal(s.iceTimeActive,false);boss.board(s,shuffle);assert.ok(s.nereusSpeedMs>0);
});
test('wrong answer releases ice and pause rejects selection',()=>{
  const s=state();s.iceTimeActive=true;boss.pick(s,'ko',0,420);assert.equal(boss.pick(s,'en',1,420),'wrong');assert.equal(s.iceTimeActive,false);assert.equal(s.hp,29);step(s,500);
  s.paused=true;assert.equal(boss.pick(s,'ko',0,420),false);
});
test('shared mage activation spends MP, shows the 1.2-second overlay and allows restored MP reuse',()=>{
  const s=state();s.story=true;s.mp=1;
  const c=vm.createContext({window,run:s,selectedCharacter:{class:'mage'},performance:{now:()=>1000},render(){},setTimeout(){},document:{querySelector:()=>null}});
  const source=read('crystal-game.js');vm.runInContext(source.slice(source.indexOf('  function canActivateMageIceTime()'),source.indexOf('  function updateWarriorSlash(')),c);
  vm.runInContext(source.slice(source.indexOf('  function iceTimeEffectMarkup()'),source.indexOf('  function eagleEyeEffectMarkup()')),c);
  c.activateMageIceTime();assert.equal(s.mp,0);assert.equal(s.iceTimeActive,true);assert.equal(s.iceTimePopUntil,2200);assert.match(c.iceTimeEffectMarkup(),/ice-time-field/);assert.match(c.iceTimeEffectMarkup(),/ice-time-announcement/);
  c.activateMageIceTime();assert.equal(s.mp,0);step(s,1000);assert.equal(s.nereusClock,0);
  boss.pick(s,'ko',0,420);boss.pick(s,'en',1,420);step(s,500);assert.equal(s.iceTimeActive,false);
  s.mp=1; // Same restored MP state supplied by the shared mana-potion handler.
  c.activateMageIceTime();assert.equal(s.mp,0);assert.equal(s.iceTimeActive,true);const clock=s.nereusClock;step(s,1000);assert.equal(s.nereusClock,clock);
});
test('projectile release precedes contact, reduced motion preserves three contacts',()=>{
  for(const reduced of [false,true]){
    const s=state();s.guardianReducedMotion=reduced;const m=reduced?.5:1;step(s,10000);
    step(s,400*m);assert.equal(boss.projectiles(s)[0].progress,0);assert.equal(s.hp,30);
    step(s,600*m,()=>0);assert.equal(boss.projectiles(s)[0].progress,1);assert.equal(s.hp,29);
    step(s,1000*m,()=>0);assert.equal(s.hp,27);assert.equal(s.nereusContacts,3);
  }
});
test('death cancels remaining spears; lethal boss hit holds knockdown and releases all effects',()=>{
  const s=state();s.hp=1;step(s,10000);assert.ok(step(s,1000,()=>0).includes('defeat-player'));assert.equal(s.nereusVolleyMs,0);
  const b=state();b.bossHp=1;b.nereusSpeedMs=5000;answer(b,0);step(b,420);assert.equal(b.bossHp,0);assert.equal(b.nereusSpeedMs,0);assert.equal(b.guardianPhase,'defeat');
  step(b,919);assert.equal(boss.visual(b).frame,2);assert.ok(step(b,1).includes('victory'));
  boss.clear(b);assert.equal(b.nereusSpeedPending,0);assert.equal(b.iceTimeActive,false);
});
test('three visible releases are spaced 500ms apart, with 600ms of flight each',()=>{
  const s=state();step(s,10000);
  const contract=JSON.parse(read('assets/monsters/nereus/animation-contract.json'));
  assert.equal(boss.THROW_INTERVAL_MS,500);assert.equal(boss.FLIGHT_MS,600);
  assert.equal(contract.actions.attack.durationMs.reduce((a,b)=>a+b),500);
  let elapsed=0;
  for(const release of contract.actions.projectile.releaseAtMs){
    step(s,release-elapsed-1);assert.equal(boss.visual(s).frame,1);
    const id=contract.actions.projectile.releaseAtMs.indexOf(release);assert.ok(!boss.projectiles(s).some(p=>p.id===id));
    step(s,1);assert.equal(boss.visual(s).frame,2);assert.equal(boss.projectiles(s).find(p=>p.id===id).progress,0);elapsed=release;
  }
  assert.ok(elapsed<1500);step(s,100);assert.equal(boss.visual(s).frame,2);
  step(s,700);assert.equal(s.nereusVolleyMs,0);assert.equal(boss.projectiles(s).length,0);
  const mid=state();step(mid,10000+950);const flying=boss.projectiles(mid);
  assert.equal(flying.length,2);assert.ok(flying.every(p=>p.frame===0));
  assert.ok(Math.abs(flying[0].progress-550/600)<1e-9);assert.ok(Math.abs(flying[1].progress-50/600)<1e-9);
});
test('a lethal hit on the last timer millisecond finishes the defeat animation before victory',()=>{
  const s=state();s.bossHp=1;s.nereusClock=299999;s.nereusNextSpear=300000;s.elapsed=299999;answer(s,0);s.guardianRemaining=1;
  let outcome=null;const c=vm.createContext({window,run:s,updateWarriorSlash(){},document:{dispatchEvent(){}},CustomEvent:class{},prepareQuestion(){},finishBattle:(clear)=>{outcome=clear;},render(){},syncNereusBattleVisual(){},$:()=>null,royalSlimeTime:()=>''});
  const source=read('crystal-game.js');vm.runInContext(source.slice(source.indexOf('  function advanceNereusBattle'),source.indexOf('  function renderRedReaperBattle')),c);
  c.advanceNereusBattle(33,33);assert.equal(s.bossHp,0);assert.equal(s.elapsed,300000);assert.equal(outcome,null);
  c.advanceNereusBattle(919,919);assert.equal(outcome,null);c.advanceNereusBattle(1,1);assert.equal(outcome,true);
});
test('runtime routes encounter, intro, matching, ice overlay, cleanup and native staging',()=>{
  const s=read('crystal-game.js');assert.match(s,/nereus:chapter===9&&stage.number===15/);assert.match(s,/if\(source.nereus\)return window.WORDORIA_NEREUS.deck/);
  assert.match(s,/if\(run.nereus\)return renderNereusBattle/);assert.match(s,/if\(run\?\.nereus\)\{nereusPick/);
  const renderer=s.slice(s.indexOf('function renderNereusBattle'),s.indexOf('function syncNereusBattleVisual'));
  assert.match(renderer,/iceTimeEffectMarkup\(\)/);assert.match(renderer,/storyBattleActions\(\)/);assert.match(renderer,/boss.englishLabel/);assert.doesNotMatch(renderer,/aria-label="\$\{.*entry\[0\]/);
  assert.match(read('index.html'),/nereus-boss.js/);assert.match(read('scripts/build-web.mjs'),/'nereus-boss.js'/);
});
test('real matching renderer runs with active skill hints and masks every English card',()=>{
  const source=read('crystal-game.js'),s=state();s.nereusSpeedMs=8000;s.eagleEyeActive=true;s.sniperInsight=true;s.petHint=true;
  const c=vm.createContext({window,run:s,esc:String,deployedAssetUrl:x=>x,royalSlimeTime:()=>'',battleHeroMarkup:()=>'',passiveBannerMarkup:()=>'',sniperTargetMarkup:()=>'',storyVitalsMarkup:()=>'',iceTimeEffectMarkup:()=>'',eagleEyeEffectMarkup:()=>'',storyBattleActions:()=>'',eaglePairHintMarkup:()=>'',sniperPairHintMarkup:()=>'',petPairHintMarkup:()=>''});
  vm.runInContext(source.slice(source.indexOf('  function nereusSpriteStyle'),source.indexOf('  function syncNereusBattleVisual')),c);
  const html=c.renderNereusBattle();assert.equal((html.match(/data-action="story-pick"/g)||[]).length,10);assert.equal((html.match(/story-match-item/g)||[]).length,10);
  for(const item of s.matchEn)assert.ok(!html.includes(item.entry[0]));assert.ok(html.includes('*****'));assert.ok(html.includes('가려진 영어 단어'));
});
test('production strips match timing contracts, RGBA cells and declared contact/release frames',()=>{
  const root='assets/monsters/nereus/',contract=JSON.parse(read(root+'animation-contract.json'));
  for(const [action,spec] of Object.entries(contract.actions)){
    const meta=JSON.parse(read(root+`char_nereus_sd_${action}_strip.json`));
    const png=readFileSync(new URL('../'+root+meta.image,import.meta.url));
    assert.equal(png.readUInt32BE(16),meta.frameWidth*3);assert.equal(png.readUInt32BE(20),meta.frameHeight);assert.equal(png[25],6);
    assert.equal(meta.sourceFrameGapPx,50);assert.equal(meta.frameCount,3);
    assert.deepEqual(meta.frames.map(x=>x.durationMs),spec.durationMs);assert.deepEqual(Array.from(boss.ANIMATIONS[action]||spec.durationMs),spec.durationMs);
    if(action==='hit')assert.equal(meta.frames[2].hold,true);
    if(action==='attack')assert.equal(meta.frames[2].release,true);
    if(action==='projectile')assert.equal(meta.frames[1].hit,true);
    for(const transform of meta.normalization){const [l,t,r,b]=transform.runtimeBounds;assert.ok(l>=8&&t>=8&&r<=meta.frameWidth-8&&b<=meta.frameHeight-4);}
  }
});
