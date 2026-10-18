import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
function setup(reduced=false,bandit=false,golem=false){
  let now=0,sequence=0;
  const timers=[],events=[],classes=new Set(),entries=Array.from({length:10},(_,id)=>({id,entry:[`word${id}`,'n',`뜻${id}`]}));
  const arena={classList:{add:(...values)=>values.forEach(v=>classes.add(v)),remove:(...values)=>values.forEach(v=>classes.delete(v))},querySelector:()=>null};
  const c=vm.createContext({
    run:{story:true,crystalSpider:!bandit&&!golem,banditMob:bandit,golemMob:golem,hp:2,hpMax:2,index:0,correct:0,deck:entries,matchBoard:entries.slice(0,5),matchEn:entries.slice(0,5),matched:new Set(),selectedKo:null,selectedEn:null,slashExpiresAt:0,iceTimeActive:true},
    selectedCharacter:{class:'warrior'},performance:{now:()=>now},reducedMotion:()=>reduced,
    battleContactDelay:()=>reduced?120:710,STORY_QUESTIONS_PER_TURN:5,nextTimer:null,
    render(){},persistStoryBattleVitals(){},storyVitalsMarkup:()=>'',refreshPetBattleFeedback(){},
    playQueuedStoryPair:()=>false,prepareQuestion(){},beginFeverIntro(){},queueStorySelection(){},
    speak(){},equippedMap:()=>({}),itemById:()=>null,
    finishBattle(clear,reason){c.run.done=true;c.reason=reason;},
    document:{querySelector:()=>arena,dispatchEvent:event=>events.push(event.detail.kind)},$:()=>arena,
    CustomEvent:class{constructor(type,init){this.detail=init.detail;}},
    setTimeout(fn,delay=0){timers.push({fn,at:now+delay,id:++sequence});return sequence;}
  });
  vm.runInContext(source.slice(source.indexOf('  function crystalSpiderMobsMarkup('),source.indexOf('  function renderBattle(')),c);
  vm.runInContext(source.slice(source.indexOf('  function storyAttackDuration('),source.indexOf('  function syncBGM(')),c);
  vm.runInContext(source.slice(source.indexOf('  function storyPick('),source.indexOf('  function canSkipLocalBossBattle(')),c);
  function advance(ms){
    const end=now+ms;
    for(let n=0;;n++){
      assert.ok(n<10000,'timer loop');
      timers.sort((a,b)=>a.at-b.at||a.id-b.id);
      if(!timers.length||timers[0].at>end)break;
      const timer=timers.shift();now=timer.at;timer.fn();
    }
    now=end;
  }
  const pick=(ko,en)=>{c.storyPick({dataset:{side:'ko',id:String(ko)}});c.storyPick({dataset:{side:'en',id:String(en)}});};
  return {c,advance,pick,events,classes};
}

test('World 5 has five animated spiders and one contact target; a defeat removes one after knockdown hold',()=>{
  const {c,pick,advance,events}=setup();
  assert.equal((c.crystalSpiderMobsMarkup().match(/enemy story-mob/g)||[]).length,5);
  pick(0,0);
  const html=c.crystalSpiderMobsMarkup();
  assert.equal((html.match(/spider-is-hit/g)||[]).length,1);
  assert.equal((html.match(/enemy story-mob/g)||[]).length,5);
  assert.match(html,/--spider-hit-delay:610ms/);
  assert.equal(c.run.iceTimeActive,true);
  advance(709);assert.deepEqual(events,[]);
  assert.match(c.crystalSpiderMobsMarkup(),/--spider-phase-elapsed:709ms/,'rerender retains current pose timing');
  advance(1);assert.deepEqual(events,['success']);
  advance(259);assert.equal(c.run.pendingDefeat,true);
  advance(1);assert.equal(c.run.pendingDefeat,false);
  assert.equal((c.crystalSpiderMobsMarkup().match(/enemy story-mob/g)||[]).length,4);
});

for(const reduced of [false,true])test(`spider wrong answer damages at contact and releases ice, reduced motion=${reduced}`,()=>{
  const {c,pick,advance,events}=setup(reduced),contact=reduced?90:240,recovery=reduced?120:260;
  pick(0,1);
  assert.equal(c.run.iceTimeActive,false);
  assert.equal(c.run.hp,2);
  assert.equal(c.run.stunned,true);
  assert.equal((c.crystalSpiderMobsMarkup().match(/spider-is-attacking/g)||[]).length,1);
  advance(contact-1);assert.equal(c.run.hp,2);
  advance(1);assert.equal(c.run.hp,1);assert.deepEqual(events,['error']);
  advance(recovery);assert.equal(c.run.stunned,false);
  assert.equal(c.run.spiderAttacking,false);
});

test('spider attack respects pause duration and pet shielding at contact',()=>{
  const {c,pick,advance}=setup();
  let damageCalls=0;
  c.run.petEffects={damage(){damageCalls++;}};
  pick(0,1);advance(100);
  c.run.paused=true;advance(500);assert.equal(damageCalls,0);
  c.run.spiderPausedMs=500;c.run.paused=false;
  advance(139);assert.equal(damageCalls,0);
  advance(1);assert.equal(damageCalls,1);assert.equal(c.run.hp,2);
});

test('paused player attacks preserve contact timing and final-frame hold before removing a spider',()=>{
  const {c,pick,advance,events}=setup();
  pick(0,0);advance(300);
  c.run.paused=true;advance(1000);
  assert.deepEqual(events,[]);assert.equal(c.run.pendingDefeat,true);
  c.run.spiderPausedMs=1000;c.run.paused=false;
  advance(409);assert.deepEqual(events,[]);
  advance(1);assert.deepEqual(events,['success']);
  advance(259);assert.equal(c.run.pendingDefeat,true);
  advance(1);assert.equal(c.run.pendingDefeat,false);
});

test('the battle renderer selects animated World 5/6B mobs and keeps existing chapter art',()=>{
  const {c}=setup();
  const begin=source.indexOf('  function renderBattle('),end=source.indexOf('  function spiritMessage(',begin);
  Object.assign(c,{stages:{test:{storyChapter:5,name:'test'}},selectedStage:'test',esc:String,deployedAssetUrl:String,
    storyBattleBackgroundClass:()=>'',battleHeroMarkup:()=>'',passiveBannerMarkup:()=>'',iceTimeEffectMarkup:()=>'',eagleEyeEffectMarkup:()=>'',storyBattleActions:()=>''});
  c.run.matchKo=c.run.matchEn;c.run.elapsed=0;c.run.storyTimeLimit=30000;
  vm.runInContext(source.slice(begin,end),c);
  assert.match(c.renderBattle(),/crystal-spider-mob/);
  c.stages.test.storyChapter=6;c.run.crystalSpider=false;c.run.banditMob=true;
  assert.match(c.renderBattle(),/bandit-mob/);
  c.run.banditMob=false;
  for(const [chapter,art] of [[2,'crystal-golem'],[3,'crystal-eye-serpent'],[4,'monster_crystal_candy']]){
    c.stages.test.storyChapter=chapter;
    const html=c.renderBattle();assert.match(html,new RegExp(art));assert.doesNotMatch(html,/crystal-spider-mob/);
  }
});

test('stale and timed out attacks cannot damage the next battle; lethal contact finishes after the strike',()=>{
  for(const mode of ['exit','timeout']){
    const {c,pick,advance,events}=setup();pick(0,1);
    if(mode==='exit')c.run={story:true,hp:3};else c.run.timeoutPending=true;
    advance(1000);assert.equal(c.run.hp,mode==='exit'?3:2);assert.deepEqual(events,[]);
  }
  const {c,pick,advance}=setup();c.run.hp=1;pick(0,1);
  advance(240);assert.equal(c.run.hp,0);assert.equal(c.run.done,undefined);
  advance(260);assert.equal(c.reason,'hp-zero');
});

for(const monster of ['crystal-spider','bandit'])test(`${monster} manifests describe contiguous RGBA strips with held knockdown and exact review gutters`,()=>{
  for(const [action,count] of [['idle',2],['attack',3],['hit',3]]){
    const root=new URL(`../assets/monsters/${monster}/`,import.meta.url);
    const manifest=JSON.parse(readFileSync(new URL(`${monster}-sd-${action}-strip.json`,root),'utf8'));
    const png=readFileSync(new URL(manifest.image,root));
    assert.equal(png.readUInt32BE(16),count*320);assert.equal(png.readUInt32BE(20),320);
    assert.equal(png[25],6,'RGBA PNG');
    assert.equal(manifest.frameCount,count);assert.equal(manifest.sourceFrameGapPx,50);
    const review=readFileSync(new URL(`review/${action}-source-50px.png`,root));
    assert.equal(review.readUInt32BE(16),count*320+(count-1)*50);
    if(action==='hit'){assert.equal(manifest.frames[2].name,'knockdown');assert.equal(manifest.frames[2].hold,true);}
    if(action==='attack')assert.equal(manifest.frames[2].hit,true);
  }
});

for(const reduced of [false,true])test(`World 6B bandits synchronize damage, knockdown hold and pause, reduced=${reduced}`,()=>{
  const {c,pick,advance,events}=setup(reduced,true);
  assert.equal((c.crystalSpiderMobsMarkup().match(/bandit-mob/g)||[]).length,5);
  pick(0,1);
  const contact=reduced?90:240;
  advance(contact-1);assert.equal(c.run.hp,2);
  advance(1);assert.equal(c.run.hp,1);assert.deepEqual(events,['error']);
  advance(reduced?120:260);assert.equal(c.run.stunned,false);
  pick(0,0);const heroContact=reduced?120:710;
  advance(heroContact-1);assert.deepEqual(events,['error']);
  advance(1);assert.deepEqual(events,['error','success']);assert.equal(c.run.pendingDefeat,true);
  advance(400);assert.equal(c.run.pendingDefeat,false);
  assert.equal((c.crystalSpiderMobsMarkup().match(/bandit-mob/g)||[]).length,4);
});

test('World 6B pause preserves contact and the full knockdown hold',()=>{
  const {c,pick,advance,events}=setup(false,true);
  pick(0,0);advance(300);c.run.paused=true;advance(1000);
  assert.deepEqual(events,[]);assert.equal(c.run.pendingDefeat,true);
  c.run.spiderPausedMs=1000;c.run.paused=false;advance(410);
  assert.deepEqual(events,['success']);advance(259);
  assert.equal(c.run.pendingDefeat,true);advance(1);assert.equal(c.run.pendingDefeat,false);
});

for(const reduced of [false,true])test(`World 6A golem attacks and falls at contact, reduced=${reduced}`,()=>{
  const {c,pick,advance,events}=setup(reduced,false,true);
  assert.equal((c.crystalSpiderMobsMarkup().match(/half-broken-golem-mob/g)||[]).length,5);
  pick(0,1);
  const contact=reduced?90:240;
  assert.equal((c.crystalSpiderMobsMarkup().match(/spider-is-attacking/g)||[]).length,1);
  assert.equal(c.run.iceTimeActive,false);
  advance(contact-1);assert.equal(c.run.hp,2);
  advance(1);assert.equal(c.run.hp,1);assert.deepEqual(events,['error']);
  advance(reduced?120:260);assert.equal(c.run.stunned,false);
  pick(0,0);const heroContact=reduced?120:710;
  assert.equal((c.crystalSpiderMobsMarkup().match(/spider-is-hit/g)||[]).length,1);
  advance(heroContact-1);assert.deepEqual(events,['error']);
  advance(1);assert.deepEqual(events,['error','success']);
  advance((reduced?170:260)-1);assert.equal(c.run.pendingDefeat,true);
  advance(400);assert.equal(c.run.pendingDefeat,false);
  assert.equal((c.crystalSpiderMobsMarkup().match(/half-broken-golem-mob/g)||[]).length,4);
});

test('World 6A pauses both attack phases and rejects stale strikes after battle exit',()=>{
  for(const hit of [false,true]){
    const {c,pick,advance,events}=setup(false,false,true);
    pick(0,hit?0:1);advance(100);c.run.paused=true;advance(1000);
    assert.equal(c.run.hp,2);assert.deepEqual(events,[]);
    c.run.spiderPausedMs=1000;c.run.paused=false;
    advance((hit?710:240)-101);assert.deepEqual(events,[]);
    advance(1);assert.deepEqual(events,[hit?'success':'error']);
    if(hit){advance(259);assert.equal(c.run.pendingDefeat,true);advance(1);assert.equal(c.run.pendingDefeat,false);}
  }
  for(const mode of ['exit','timeout']){
    const {c,pick,advance,events}=setup(false,false,true);pick(0,1);
    if(mode==='exit')c.run={story:true,hp:3};else c.run.timeoutPending=true;
    advance(1000);assert.equal(c.run.hp,mode==='exit'?3:2);assert.deepEqual(events,[]);
  }
});
