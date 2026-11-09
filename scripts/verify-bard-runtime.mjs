import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../crystal-game.css',import.meta.url),'utf8');
const extract=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b));

test('both bard variants render full character and separate music-note projectile layers',()=>{
  for(const avatar_variant of ['male','female']){
    const c=vm.createContext({selectedCharacter:{class:'bard',avatar_variant},run:{},variantOf:c=>c.avatar_variant,portrait:()=>'<portrait-fallback>',petBattleMarkup:()=>''});
    vm.runInContext(extract('  function battleHeroMarkup(','  function ensureNewActiveSkills('),c);
    const html=c.battleHeroMarkup();
    assert.match(html,new RegExp(`battle-hero-bard battle-hero-${avatar_variant}`));
    assert.match(html,/class="battle-sprite"/);assert.match(html,/class="battle-projectile"/);assert.doesNotMatch(html,/portrait-fallback/);
  }
});

test('bard damage contact is 640ms, or 256ms under reduced motion',()=>{
  for(const motion of [false,true]){
    const c=vm.createContext({selectedCharacter:{class:'bard'},itemById:()=>null,equippedMap:()=>({}),reducedMotion:()=>motion});
    vm.runInContext(extract('  function battleContactDelay(','  function refreshStorySelections('),c);
    assert.equal(c.battleContactDelay(),motion?256:640);
  }
});

function travel(enemyRect,actualTargetRect){
  const vars=new Map(),heroRect={left:20,top:70,width:120.5,height:120.5,right:140.5,bottom:190.5};
  const target=rect=>({getBoundingClientRect:()=>rect});
  const hero={classList:{contains:name=>name==='battle-hero-bard'},getBoundingClientRect:()=>heroRect};
  const arena={clientWidth:380,style:{setProperty:(key,value)=>vars.set(key,parseFloat(value))},getBoundingClientRect:()=>({left:5,top:10}),querySelector:selector=>selector==='.battle-hero'?hero:selector==='.crystal-spider-target'?(actualTargetRect?target(actualTargetRect):null):target(enemyRect)};
  const c=vm.createContext({$:()=>arena});vm.runInContext(extract('  function setHeroAttackTravel(','  function tick('),c);c.setHeroAttackTravel();
  return {vars,origin:{x:heroRect.left+heroRect.width*.64,y:heroRect.top+heroRect.height*.47}};
}

test('music-note travel follows the current enemy distance and vertical position',()=>{
  for(const rect of [{left:160,top:80,width:40,height:60},{left:280,top:35,width:90,height:130}]){
    const {vars,origin}=travel(rect);
    assert.equal(vars.get('--bard-flight-x'),rect.left+rect.width*.5-origin.x);
    assert.equal(vars.get('--bard-flight-y'),rect.top+rect.height*.5-origin.y);
    assert.equal(vars.get('--bard-impact-x'),rect.left+rect.width*.5-5);
    assert.equal(vars.get('--bard-impact-y'),rect.top+rect.height*.5-10);
    assert.equal(vars.has('--hero-travel'),false,'bard never lunges toward the enemy');
  }
});

test('music notes target the active mob instead of the first mob in the arena',()=>{
  const rect={left:240,top:60,width:70,height:80},{vars}=travel({left:110,top:50,width:30,height:40},rect);
  assert.equal(vars.get('--bard-impact-x'),270);assert.equal(vars.get('--bard-impact-y'),90);
});

test('bard frame playback and projectile flight preserve release-before-contact timing',()=>{
  const has=pattern=>assert.ok(pattern.test(css),`CSS contract: ${pattern}`);
  has(/bard-attack-frames \.5s steps\(5,end\) both/);
  has(/bard-projectile-frames \.3s steps\(5,end\) \.4s both/);
  has(/bard-projectile-flight \.24s linear \.4s both/);
  has(/--bard-contact:\.64s/);
  has(/bard-projectile-frames \.12s steps\(5,end\) \.16s both/);
  has(/bard-projectile-flight \.096s linear \.16s both/);
  has(/--bard-contact:\.256s/);
  has(/bard-hit-frames \.2s steps\(2,end\) both!important/);
  has(/\.arena\.paused:has\(\.battle-hero-bard\)[^{]*\{animation-play-state:paused!important\}/);
  has(/\.arena:is\(\.wrong,\.story-stunned\) \.battle-hero-bard\{--battle-cell-aspect:1\.2\}/);
  has(/@keyframes bard-projectile-flight\{0%\{opacity:0;/);
});

test('plain Story and Survival bard pause and resume freeze the arena without changing other classes',()=>{
  for(const story of [false,true])for(const cls of ['bard','warrior']){
    const classes=new Set(),s={story,mobs:[],paused:false,done:false};let ticks=0;
    const c=vm.createContext({run:s,selectedCharacter:{class:cls},performance:{now:()=>100},timerId:0,clearInterval(){},closeDialog(){},tick(){ticks++;},window:{wordoriaSound:{pauseBGM(){},resumeBGM(){}}},document:{querySelector:()=>({classList:{add:name=>classes.add(name),remove:name=>classes.delete(name)}})}});
    vm.runInContext(extract('  function pause(){','  function cancelSpeech('),c);
    c.pause();assert.equal(s.paused,true);assert.equal(classes.has('paused'),cls==='bard');
    c.resume();assert.equal(s.paused,false);assert.equal(classes.has('paused'),false);assert.equal(ticks,1);
  }
});

test('Survival bard success haptics wait for normal or reduced-motion projectile contact',()=>{
  for(const reduced of [false,true]){
    const pending=[],haptics=[],node={classList:{add(){},toggle(){}},textContent:''};
    const c=vm.createContext({run:{story:false,done:false,paused:false,locked:false,correct:0,index:0,question:{choices:['word'],answer:'word',entry:['word','n','뜻']}},selectedCharacter:{class:'bard'},reducedMotion:()=>reduced,timerId:0,nextTimer:0,
      document:{querySelector:()=>null,querySelectorAll:()=>[],dispatchEvent:event=>haptics.push(event.detail)},CustomEvent:class{constructor(type,options){Object.assign(this,options);}},$:()=>node,
      earnedCoins:n=>n,itemById:()=>null,equippedMap:()=>({}),clearInterval(){},setTimeout(fn,delay){pending.push({fn,delay});return pending.length;},setHeroAttackTravel(){},speak(){},showBattleReward:()=>0,continueAfterFeedback(){},finishBattle(){}});
    c.bardSchedule=c.setTimeout;
    vm.runInContext(extract('  function battleContactDelay(','  function refreshStorySelections('),c);
    vm.runInContext(extract('  function answer(index)','  function advanceFeverCrystals('),c);
    c.answer(0);assert.equal(haptics.length,0,'no success haptic during anticipation');
    const contact=pending.find(item=>item.delay===(reduced?256:640));assert.ok(contact);contact.fn();
    assert.equal(haptics.length,1);assert.equal(haptics[0].kind,'success');
  }
});

test('rendering at contact preserves the ongoing bard hero but resets idle, new attacks and new battles',()=>{
  let arena=null,serial=0;
  const animation=(target,name,currentTime=0,playState='running')=>({effect:{target},animationName:name,currentTime,playState,playbackRate:1,pause(){this.playState='paused';},play(){this.playState='running';},finish(){this.playState='finished';this.currentTime=500;}});
  const makeHero=()=>{const target={};return {id:++serial,animations:[animation(target,'attack'),animation(target,'flight'),animation(target,'burst')],getAnimations(){return this.animations;}};};
  const screen={set innerHTML(markup){
    const hit=markup.includes('hit'),hero=makeHero();
    arena={hero,classList:{contains:name=>name==='hit'&&hit},querySelector:selector=>selector==='.battle-hero-bard'?arena.hero:selector==='.battle-hero'?{replaceWith:old=>{old.animations=old.animations.map(a=>animation(a.effect.target,a.animationName));arena.hero=old;}}:null};
  }};
  const c=vm.createContext({page:'battle',run:{attack:false},selectedCharacter:{class:'bard'},$:id=>id==='screen'?screen:arena});
  vm.runInContext(extract('  function replaceScreenMarkup(','  function render(){'),c);
  c.replaceScreenMarkup('idle');const idle=arena.hero;
  c.run.attack=true;c.replaceScreenMarkup('hit');const attack=arena.hero;assert.notEqual(attack,idle);
  const originals=attack.animations;
  originals[0].currentTime=640;originals[0].playState='finished';originals[1].currentTime=640;originals[1].playState='paused';originals[2].currentTime=650;
  c.replaceScreenMarkup('hit');assert.equal(arena.hero,attack);
  assert.notEqual(attack.animations[0],originals[0],'disconnect/reinsert recreates animation instances');
  assert.deepEqual(attack.animations.map(a=>[a.currentTime,a.playState]),[[640,'finished'],[640,'paused'],[650,'running']]);
  c.run.attack=false;c.replaceScreenMarkup('idle');assert.notEqual(arena.hero,attack);
  c.run.attack=true;c.replaceScreenMarkup('hit');assert.notEqual(arena.hero,attack);
  const previous=arena.hero;c.run={attack:true};c.replaceScreenMarkup('hit');assert.notEqual(arena.hero,previous,'a new battle starts a new animation');
});

test('bard contact/reset timers count unpaused time and discard callbacks from replaced battles',()=>{
  let now=0,nextId=0;const timers=new Map(),events=[];
  const c=vm.createContext({run:{paused:false,done:false},performance:{now:()=>now},setTimeout(fn,delay){const id=++nextId;timers.set(id,{fn,at:now+delay});return id;}});
  vm.runInContext(extract('  function bardSchedule(','  function crystalSpiderWrongAnswer('),c);
  const advance=ms=>{const end=now+ms;while(true){const next=[...timers.entries()].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;now=next[1].at;timers.delete(next[0]);next[1].fn();}now=end;};
  c.bardSchedule(()=>events.push('contact'),640);c.bardSchedule(()=>events.push('reset'),980);
  advance(300);c.run.paused=true;advance(2000);assert.deepEqual(events,[]);
  c.run.spiderPausedMs=2000;c.run.paused=false;advance(339);assert.deepEqual(events,[]);advance(1);assert.deepEqual(events,['contact']);
  advance(339);assert.deepEqual(events,['contact']);advance(1);assert.deepEqual(events,['contact','reset']);
  c.bardSchedule(()=>events.push('stale'),100);c.run={paused:false,done:false};advance(200);assert.equal(events.includes('stale'),false);
  c.run.timeoutPending=true;c.bardSchedule(()=>events.push('wrong-final-hold'),80);advance(80);assert.equal(events.at(-1),'wrong-final-hold');
});

test('real Survival, Story and hidden-king bard callbacks wait through a mid-attack pause',()=>{
  for(const mode of ['survival','story','hidden','royal','spelling']){
    let now=0,nextId=0;const timers=new Map(),events=[];
    const entry=['word','n','뜻'],node={classList:{add(){},toggle(){}},textContent:'',style:{},setAttribute(){}};
    const s={story:mode!=='survival',paused:false,done:false,locked:false,attack:false,correct:0,index:0,hp:3,hpMax:3,mp:2,mpMax:2,fast:true,deck:Array(10).fill({}),question:{choices:['word'],answer:'word',entry},matched:new Set(),matchEn:[{id:0,entry}],matchBoard:Array(5).fill({}),selectedKo:null,selectedEn:null,bossHp:100,bossDamage:0,bossAttackSteps:2};
    const c=vm.createContext({run:s,selectedCharacter:{class:'bard'},performance:{now:()=>now},setTimeout(fn,delay){const id=++nextId;timers.set(id,{fn,at:now+delay});return id;},clearTimeout:id=>timers.delete(id),clearInterval(){},timerId:0,nextTimer:0,STORY_QUESTIONS_PER_TURN:5,
      document:{querySelector:()=>null,querySelectorAll:()=>[],dispatchEvent:event=>events.push(event.detail.kind)},CustomEvent:class{constructor(type,options){Object.assign(this,options);}},$:()=>node,reducedMotion:()=>false,battleContactDelay:()=>640,storyAttackDuration:()=>980,
      render(){},speak(){},setHeroAttackTravel(){},itemById:()=>null,equippedMap:()=>({}),earnedCoins:n=>n,continueAfterFeedback(){events.push('reset');},playQueuedStoryPair:()=>false,beginFeverIntro(){},prepareQuestion(){},prepareHiddenKingBoard(){},prepareRoyalSlimeBoard(){},finishBattle(){events.push('finish');}});
    vm.runInContext(extract('  function bardSchedule(','  function crystalSpiderWrongAnswer('),c);
    if(mode==='survival'){vm.runInContext(extract('  function answer(index)','  function advanceFeverCrystals('),c);c.answer(0);}
    else if(mode==='spelling'){vm.runInContext(extract('  function answerStorySpelling(','  function renderBattle('),c);c.answerStorySpelling(0);}
    else{
      if(mode==='royal'){s.boss=true;s.bossHp=50;}
      const start=mode==='hidden'?'  function hiddenKingPick(':mode==='royal'?'  function royalSlimePick(':'  function storyPick(button)',end=mode==='hidden'?'  function renderHiddenKing(':mode==='royal'?'  function crystalGhostFall(':'  function canSkipLocalBossBattle(';
      vm.runInContext(extract(start,end),c);
      const pick=mode==='hidden'?c.hiddenKingPick:mode==='royal'?c.royalSlimePick:c.storyPick;pick({dataset:{side:'ko',id:'0'}});pick({dataset:{side:'en',id:'0'}});
    }
    const advance=ms=>{const end=now+ms;while(true){const next=[...timers.entries()].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;now=next[1].at;timers.delete(next[0]);next[1].fn();}now=end;};
    advance(300);s.paused=true;advance(2000);assert.deepEqual(events,[],mode);assert.equal(s.bossHp,mode==='royal'?50:100);
    s.spiderPausedMs=2000;s.paused=false;advance(339);assert.deepEqual(events,[]);advance(1);assert.deepEqual(events,['success'],mode);
    if(mode==='hidden')assert.equal(s.bossHp,98);
    advance(mode==='survival'?410:340);
    if(mode==='survival'||mode==='spelling')assert.deepEqual(events,['success','reset']);else assert.equal(s.attack,false,mode);
  }
});
