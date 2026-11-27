import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const root=new URL('../',import.meta.url),source=readFileSync(new URL('crystal-game.js',root),'utf8');
const extract=(a,b)=>{const start=source.indexOf(a);assert.ok(start>=0,a);const end=source.indexOf(b,start);assert.ok(end>start,b);return source.slice(start,end);};
function content(level='middle'){
  const words=Array.from({length:30},(_,i)=>[`word${i}`,'단어',`뜻${i}`]);
  const levels=Object.fromEntries(['elementary','middle'].map(level=>[level,Array.from({length:44},(_,i)=>({number:i+1,name:`주제 ${i+1}`,words:words.map(row=>row.slice())}))]));
  const c=vm.createContext({window:{QUIZ_STAGES:{},WORDORIA_WORLD_ELEVEN_CONTENT:{levels}},learningLabels:{elementary:'초등학생',middle:'중학생'},learningLevel:()=>level,stageLevel:s=>s.learningLevel||'middle',shuffle:a=>a.slice().reverse(),chosenStoryBranch:()=> '6A'});
  vm.runInContext('const stages=window.QUIZ_STAGES;'+extract('  const storyStages = [','  const storyStageKey=')+'\nconfigureStoryContent();globalThis.catalog=stages;globalThis.worlds=storyWorlds;globalThis.story=storyStages;',c);return c;
}
function bossContext(kind='garel',dmg=4){
  const c=vm.createContext({window:{}});vm.runInContext(readFileSync(new URL('world-eleven-boss.js',root),'utf8'),c);
  const boss=c.window.WORDORIA_WORLD_ELEVEN_BOSS,words=Array.from({length:30},(_,i)=>[`word${i}`,'명',`뜻${i}`]),shuffle=a=>a.slice().reverse();
  const s={...boss.reset(kind,dmg),deck:boss.deck(words,shuffle),hp:3,mp:2,hpMax:3,mpMax:2,index:0,correct:0,elapsed:0,story:true};boss.board(s,shuffle);return {boss,s,shuffle,c};
}
test('World 11 has 44 matching stages and records shared across levels',()=>{
  for(const level of ['elementary','middle']){
    const c=content(level),world=c.worlds.find(w=>w.displayNumber==='11'),stages=c.story.filter(s=>s.chapter===14);
    assert.ok(world);assert.equal(stages.length,44);assert.equal(world.positions.length,44);
    for(const [i,s]of stages.entries()){
      const cfg=c.catalog[s.key];assert.equal(cfg.questionCount,30);assert.equal(cfg.questionType,'B');assert.equal(cfg.questionTimeMs,6000);
      assert.equal(cfg.learningLevel,level);assert.equal(cfg.recordName,`스토리 11장 ${i+1} · 낙성 요새의 마지막 수송`);
      assert.equal(cfg.words,c.window.WORDORIA_WORLD_ELEVEN_CONTENT.levels[level][i].words);
      assert.equal(s.prerequisite,i?`story-ch11-${i}`:'story-ch10-40');
      if(i)assert.ok(parseFloat(world.positions[i][1])>parseFloat(world.positions[i-1][1]));
    }
    assert.equal(c.catalog['story-ch11-22'].worldElevenBoss,'garel');assert.equal(c.catalog['story-ch11-44'].worldElevenBoss,'orden');
    assert.equal(stages.filter(s=>s.worldElevenBoss).length,2);
  }
});
test('World 11 unlocks on World 10 main ending across either branch',()=>{
  const c=content();Object.assign(c,{localHost:false,nativeApp:false,isAdministrator:()=>false,clears:new Set()});c.stageCleared=k=>c.clears.has(k);
  vm.runInContext(extract('  function storyBranchAllowed(','  function isStoryBranchPreview(')+extract('  function storyStageUnlocked(','\n'),c);
  const unlocked=k=>c.storyStageUnlocked(c.story.findIndex(s=>s.key===k));
  assert.equal(unlocked('story-ch11-1'),false);c.clears.add('story-ch10-40');assert.equal(unlocked('story-ch11-1'),true);assert.equal(unlocked('story-ch11-2'),false);
  c.clears.add('story-ch11-1');assert.equal(unlocked('story-ch11-2'),true);
});
test('Practice exposes the same 44 pools in Survival without Story flags or level mixing',()=>{
  for(const level of ['elementary','middle']){
    const c=content(level);c.stageKeys=[];c.worlds=[];
    vm.runInContext(extract('  function configureWorldElevenPractice(','  function resetCreatorContent('),c);c.configureWorldElevenPractice();
    assert.equal(c.worlds.length,1);assert.equal(c.worlds[0].keys.length,44);
    for(const [i,key]of c.worlds[0].keys.entries()){
      const p=c.catalog[key];assert.equal(p.words,c.catalog[`story-ch11-${i+1}`].words);assert.equal(p.questionCount,30);assert.equal(p.learningLevel,level);assert.equal(Boolean(p.story),false);assert.notEqual(p.questionType,'B');
    }
    c.configureWorldElevenPractice();assert.equal(c.worlds.length,1);assert.equal(c.stageKeys.length,44);
  }
});
test('Boss damage happens once at contact, continues after 30 answers, and wins only at HP zero',()=>{
  const {boss,s,shuffle}=bossContext();
  for(let i=0;i<50;i++){
    const id=s.matchEn.find(x=>!s.matched.has(x.id)).id,previous=s.bossHp;
    assert.equal(boss.pick(s,'en',id,200),'selected');assert.equal(boss.pick(s,'ko',id,200),'correct');assert.equal(s.bossHp,previous);
    assert.equal(boss.pick(s,'ko',id,200),false);boss.advance(s,199,shuffle);assert.equal(s.bossHp,previous);
    assert.ok(boss.advance(s,1,shuffle).includes('hit'));assert.equal(s.bossHp,previous-4);assert.equal(s.correct,i+1);
    const events=boss.advance(s,1000,shuffle);
    if(i===29){assert.equal(s.bossHp,80);assert.equal(events.includes('victory'),false);}
    if(i===49){assert.ok(events.includes('victory'));assert.equal(s.bossHp,0);assert.equal(boss.visual(s).frame,2);}
    else if(events.includes('board-ready'))boss.board(s,shuffle);
  }
});
test('Boss cycles exhaust 30 unique pairs, avoid immediate repeats and never duplicate a board',()=>{
  const {boss,s,shuffle}=bossContext();let previous;
  for(let cycle=0;cycle<3;cycle++){
    const seen=new Set();for(let b=0;b<6;b++){
      boss.board(s,shuffle);assert.equal(new Set(s.matchEn.map(x=>x.entry[0])).size,5);
      for(const row of s.matchBoard){assert.notEqual(row.entry[0],previous);assert.ok(!seen.has(row.entry[0]));seen.add(row.entry[0]);previous=row.entry[0];}
      s.index+=5;
    }assert.equal(seen.size,30);
  }
});
test('Ice Time freezes clock and idle, survives individual correct pairs, releases on board end/wrong/exit, and can reuse',()=>{
  const {boss,s,shuffle}=bossContext();s.iceTimeActive=true;boss.advance(s,1200,shuffle);assert.equal(s.elapsed,0);assert.equal(boss.visual(s).frame,0);
  for(let i=0;i<5;i++){
    const id=s.matchEn.find(x=>!s.matched.has(x.id)).id;boss.pick(s,'en',id,200);boss.pick(s,'ko',id,200);boss.advance(s,200,shuffle);
    assert.equal(s.iceTimeActive,i<4);boss.advance(s,300,shuffle);
  }
  boss.board(s,shuffle);s.iceTimeActive=true;const ids=s.matchEn.map(x=>x.id);boss.pick(s,'ko',ids[0],200);boss.pick(s,'en',ids[1],200);assert.equal(s.iceTimeActive,false);
  const hp=s.hp;boss.advance(s,549,shuffle);assert.equal(s.hp,hp);boss.advance(s,1,shuffle);assert.equal(s.hp,hp-1);boss.advance(s,1000,shuffle);
  s.iceTimeActive=true;const before=s.elapsed;boss.advance(s,1000,shuffle);assert.equal(s.elapsed,before);boss.clear(s);assert.equal(s.iceTimeActive,false);assert.equal(boss.advance(s,1000,shuffle).length,0);
});
test('Pause, timer boundary, burn damage and delayed callbacks cannot create extra contact or victory',()=>{
  const {boss,s,shuffle}=bossContext();const id=s.matchEn[0].id;boss.pick(s,'en',id,200);boss.pick(s,'ko',id,200);
  s.paused=true;boss.advance(s,1000,shuffle);assert.equal(s.bossHp,200);s.paused=false;
  s.elapsed=s.storyTimeLimit-100;assert.ok(boss.advance(s,200,shuffle).includes('timeout'));assert.equal(s.bossHp,200);
  const b=bossContext('orden');assert.equal(b.s.bossMaxHp,240);b.boss.damage(b.s,240);assert.equal(b.s.bossHp,0);assert.ok(b.boss.advance(b.s,1000,b.shuffle).includes('victory'));
  const c=bossContext();boss.clear(c.s);assert.equal(boss.pick(c.s,'en',0,200),false);assert.equal(boss.damage(c.s,10),0);
});
test('World 11 novel phases and runtime integration use matching-specific routes',()=>{
  assert.match(source,/storyChapter===14\?'11'/);assert.match(source,/stage\.chapter===14&&\[1,22,44\]/);
  assert.match(source,/run\?\.worldElevenBoss\)\{worldElevenPick/);assert.match(source,/if\(run\.worldElevenBoss\)\{advanceWorldElevenBattle/);
  const render=extract('  function renderWorldElevenBattle(','  function worldElevenPick(');assert.match(render,/iceTimeEffectMarkup\(\)/);assert.match(render,/battleHeroMarkup\(\)/);
  assert.match(source,/chapter===14\?44/);assert.doesNotMatch(source,/storyChapter===14\)\{finishBattle\(true/);
});

test('World 11 ordinary clears enter crystal fever and collect one crystal after two taps',()=>{
  const battle={story:true,deck:[{entry:['star','명','별']}],elapsed:60000,storyTimeLimit:180000,feverWordSequence:0,feverWords:[],mp:1};
  const c=vm.createContext({run:battle,selectedStage:'story-ch11-1',stages:{'story-ch11-1':{storyChapter:14}},selectedCharacter:{class:'mage'},window:{},render(){},speak(){},emitAudio(){},reducedMotion:()=>true,setTimeout(){},document:{dispatchEvent(){}},CustomEvent:function(){}});
  vm.runInContext(extract('  function advanceFeverCrystals(','  function renderFeverBattle(')+extract('  function storyRouletteEligible(','  function createStoryRoulette('),c);
  c.beginFeverIntro();assert.equal(battle.feverTransition,true);assert.equal(battle.roulette,undefined);assert.equal(battle.iceTimeActive,false);
  c.enterFeverTime();assert.equal(battle.fever,true);assert.equal(battle.feverTransition,false);assert.equal(battle.elapsed,60000);assert.equal(battle.storyTimeLimit,180000);
  const id=battle.feverWords[0].id;c.collectFeverCrystal(id);assert.equal(battle.feverWords[0].state,'meaning');assert.equal(battle.feverCollected,0);
  c.collectFeverCrystal(id);assert.equal(battle.feverCollected,1);c.collectFeverCrystal(id);assert.equal(battle.feverCollected,1);
  battle.paused=true;c.advanceFeverCrystals();const next=battle.feverWords.find(w=>w.state==='word');if(next)c.collectFeverCrystal(next.id);assert.equal(battle.feverCollected,1);
});
test('World 11 matching bosses retain ranger hints and the spirit pet hint',()=>{
  const {s,c}=bossContext();Object.assign(c,{run:s,selectedCharacter:{class:'ranger'}});
  vm.runInContext(extract('  function canActivateRangerEagleEye(','  function activateRangerEagleEye('),c);
  assert.equal(c.canActivateRangerEagleEye(),true);
  vm.runInContext(readFileSync(new URL('pet-system.js',root),'utf8'),c);
  const pet=c.window.WORDORIA_PETS.attach(s,{code:'pet'},{random:()=>0});assert.equal(pet.onQuestion(),true);assert.equal(s.petHint.pairId,s.matchEn[0].id);
});
test('Mage Ice Time consumes MP once, shows 1.2-second announcement, and potion MP enables reuse',()=>{
  const {s,c,boss,shuffle}=bossContext();Object.assign(c,{run:s,selectedCharacter:{class:'mage'},performance:{now:()=>100},render(){},setTimeout(){},document:{querySelector:()=>null}});
  vm.runInContext(extract('  function canActivateMageIceTime(','  function activateWarriorSlash('),c);
  s.mp=1;c.activateMageIceTime();assert.equal(s.mp,0);assert.equal(s.iceTimeActive,true);assert.equal(s.iceTimePopUntil,1300);
  assert.equal(c.canActivateMageIceTime(),false);boss.clear(s);assert.equal(s.iceTimeActive,false);
  Object.assign(s,boss.reset('garel',4),{mp:0,locked:false});boss.board(s,shuffle);assert.equal(c.canActivateMageIceTime(),false);
  s.mp=1;assert.equal(c.canActivateMageIceTime(),true);c.activateMageIceTime();assert.equal(s.mp,0);assert.equal(s.iceTimeActive,true);
});
test('Common burst, mana shield, burn and bard passives apply to real World 11 contact events',()=>{
  for(const kind of ['garel','orden']){
    const {s,c,boss,shuffle}=bossContext(kind);vm.runInContext(readFileSync(new URL('active-skills.js',root),'utf8'),c);
    s.activeSkills=c.window.WORDORIA_ACTIVE_SKILLS.attach(s,'pugilist',{unlocked:true});assert.equal(s.activeSkills.activate(),true);
    const id=s.matchEn[0].id;boss.pick(s,'ko',id,200);boss.pick(s,'en',id,200);boss.advance(s,199,shuffle);assert.equal(s.bossHp,s.bossMaxHp);
    boss.advance(s,1,shuffle);assert.equal(s.bossHp,s.bossMaxHp-12);assert.equal(s.correct,1);assert.equal(s.answeredCorrect,1);boss.advance(s,300,shuffle);
    s.activeSkills=c.window.WORDORIA_ACTIVE_SKILLS.attach(s,'mage',{unlocked:true});s.mp=2;assert.equal(s.activeSkills.activate(),true);
    const ids=s.matchEn.filter(x=>!s.matched.has(x.id)).map(x=>x.id);boss.pick(s,'ko',ids[0],200);boss.pick(s,'en',ids[1],200);boss.advance(s,550,shuffle);assert.equal(s.hp,3);assert.equal(s.mp,1);boss.advance(s,300,shuffle);
    s.activeSkills=c.window.WORDORIA_ACTIVE_SKILLS.attach(s,'ranger',{unlocked:true,burn:n=>boss.damage(s,n)});s.mp=2;assert.equal(s.activeSkills.activate(),true);s.bossHp=2;
    boss.advance(s,999,shuffle);assert.equal(s.bossHp,2);boss.advance(s,1,shuffle);assert.equal(s.bossHp,0);assert.ok(boss.advance(s,1000,shuffle).includes('victory'));
  }
  const {s,c,boss,shuffle}=bossContext();vm.runInContext(readFileSync(new URL('active-skills.js',root),'utf8'),c);
  s.activeSkills=c.window.WORDORIA_ACTIVE_SKILLS.attach(s,'bard');s.mp=0;
  for(let i=0;i<5;i++){const id=s.matchEn.find(x=>!s.matched.has(x.id)).id;boss.pick(s,'ko',id,1);boss.pick(s,'en',id,1);boss.advance(s,1,shuffle);boss.advance(s,300,shuffle);}
  assert.equal(s.correct,5);assert.equal(s.mp,1);
});
test('Five World 11 novel phases are generated with source endings and dedicated boss art',()=>{
  const c=vm.createContext({window:{}});vm.runInContext(readFileSync(new URL('story-novel.js',root),'utf8'),c);
  for(const phase of ['Prologue','MidbossStart','MidbossEnd','BossStart','BossEnd']){
    const lines=c.window.WORDORIA_NOVELS[`world11${phase}`];assert.ok(lines.length>10);assert.ok(lines.every(l=>l.backgroundPath==='assets/story/chapter-11-fallen-star-fortress-map.webp'));
  }
  assert.equal(c.window.WORDORIA_NOVELS.world11MidbossStart[0].sceneArtName,'쇄문장 가렐');assert.equal(c.window.WORDORIA_NOVELS.world11BossStart[0].sceneArtName,'병참관 오르덴');
});
test('Survival practice builds exactly 30 four-choice questions with unique answers and no answer label leak',()=>{
  const c=vm.createContext({window:{},Math,shuffle:a=>a.slice().reverse()});vm.runInContext(readFileSync(new URL('world-eleven-content.js',root),'utf8'),c);
  vm.runInContext(extract('  function buildQuestionDeck(','  async function loadAll(')+extract('  function posMatch(','  const STORY_QUESTIONS_PER_TURN='),c);
  for(const level of ['elementary','middle'])for(const pool of c.window.WORDORIA_WORLD_ELEVEN_CONTENT.levels[level]){
    const deck=c.buildQuestionDeck({words:pool.words,questionCount:30});assert.equal(deck.length,30);assert.equal(new Set(deck.map(x=>x.entry[0])).size,30);
    for(const item of deck){const q=c.makeQuestion(item.entry,pool.words,item.mode);assert.equal(q.choices.length,4);assert.equal(new Set(q.choices).size,4);assert.ok(q.choices.includes(q.answer));assert.ok(['단어','표현'].includes(item.entry[1]));}
  }
});
