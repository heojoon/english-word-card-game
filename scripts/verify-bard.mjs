import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const source=read('crystal-game.js');
const context=vm.createContext({window:{}});
vm.runInContext(read('active-skills.js'),context);
const skills=context.window.WORDORIA_ACTIVE_SKILLS;
const state=overrides=>({story:true,hp:1,hpMax:5,mp:2,mpMax:3,correct:0,index:0,...overrides});
const attach=s=>skills.attach(s,'bard');

test('bard male and female share sniper base stats, growth and experience curve at every level',()=>{
  const c=vm.createContext({});
  vm.runInContext(source.slice(source.indexOf('  const classDefs ='),source.indexOf('  const builtinWorlds ='))+';globalThis.defs=classDefs;',c);
  assert.ok(c.defs.bard,'bard is a selectable class');
  assert.deepEqual(c.defs.bard.stats,c.defs.sniper.stats);
  assert.deepEqual(c.defs.bard.growth,c.defs.sniper.growth);
  assert.deepEqual(Object.keys(c.defs.bard.paths),['male','female']);
  assert.match(c.defs.bard.paths.male,/bard-male/);assert.match(c.defs.bard.paths.female,/bard-female/);
  c.equippedMap=()=>({});c.itemById=()=>null;c.selectedCharacter={class:'bard'};
  c.characterDef=character=>c.defs[character.class];
  vm.runInContext(source.slice(source.indexOf('  function combatStats('),source.indexOf('  function bossAttackSteps(')),c);
  for(let level=1;level<=100;level++){
    c.selectedCharacter.class='bard';const bard=c.combatStats(level);
    c.selectedCharacter.class='sniper';assert.deepEqual(bard,c.combatStats(level));
  }
});

test('healing aria is available from creation, costs one MP and heals one capped HP',()=>{
  const s=state(),e=attach(s);
  assert.equal(e.unlocked,true);assert.equal(e.ready(),true);
  assert.equal(e.activate(),true);assert.equal(s.hp,2);assert.equal(s.mp,1);
  s.hp=4;assert.equal(e.activate(),true);assert.equal(s.hp,5);assert.equal(s.mp,0);
  s.mp=2;assert.equal(e.ready(),false);assert.equal(e.activate(),false);assert.equal(s.mp,2);
});

test('healing aria cannot bypass combat input guards or revive a defeated character',()=>{
  for(const flag of ['paused','locked','attack','stunned','timeoutPending','potionUsePending','done','fever','feverTransition']){
    const s=state({[flag]:true}),e=attach(s);assert.equal(e.activate(),false,flag);assert.equal(s.mp,2);assert.equal(s.hp,1);
  }
  for(const changes of [{hp:0},{mp:0},{story:false}]){
    const s=state(changes),e=attach(s);assert.equal(e.activate(),false);assert.equal(s.hp,changes.hp??1);
  }
});

test('healing aria can be reused after a mana potion and persists healed vitals',()=>{
  const s=state({hp:2,mp:1}),e=attach(s);s.activeSkills=e;
  assert.equal(e.activate(),true);assert.equal(s.hp,3);assert.equal(s.mp,0);
  assert.equal(e.activate(),false);
  s.potionUsePending=true;s.mp=1;e.advance(33);assert.equal(e.ready(),false);
  s.potionUsePending=false;e.advance(33);assert.equal(e.ready(),true);
  s.bardVitalsDirty=false;
  assert.equal(e.activate(),true);assert.equal(s.hp,4);assert.equal(s.mp,0);
  assert.match(e.status(),/HP \+1/);assert.equal(s.bardVitalsDirty,true);
  const saved=[];
  const c=vm.createContext({run:s,document:{querySelector:()=>null,querySelectorAll:()=>[]},$:()=>null,
    persistStoryBattleVitals(){saved.push({hp:s.hp,mp:s.mp});},storyVitalsMarkup:()=>'',storyBattleActions:()=>''});
  vm.runInContext(source.slice(source.indexOf('  function refreshNewSkillFeedback('),source.indexOf('  function storyBattleActions(')),c);
  c.refreshNewSkillFeedback();c.refreshNewSkillFeedback();
  assert.deepEqual(saved,[{hp:4,mp:0}]);
});

test('bard readiness changes notify the battle UI when input unlocks without a new answer',()=>{
  for(const flag of ['locked','attack','stunned','potionUsePending','shadowFreezeMs']){
    const s=state({[flag]:1}),e=attach(s);
    e.advance(33);assert.equal(e.ready(),false,flag);
    s[flag]=0;
    assert.equal(e.advance(33),true,`${flag}: refresh the disabled healing button`);
    assert.equal(e.activate(),true);assert.equal(s.hp,2);assert.equal(s.mp,1);
  }
});

test('melody restores MP once per five actual correct answers, ignores wrong answers and caps MP',()=>{
  const s=state({mp:0,hp:3}),e=attach(s);
  for(let n=1;n<=4;n++){s.correct=n;e.observeCorrect();assert.equal(s.mp,0);}
  e.damage(1);s.correct=5;e.observeCorrect();assert.equal(s.mp,1);
  e.observeCorrect();e.advance(1);assert.equal(s.mp,1);
  s.correct=15;e.advance(1);assert.equal(s.mp,3);
  s.correct=20;e.observeCorrect();assert.equal(s.mp,3);
  s.mp=0;e.observeCorrect();assert.equal(s.mp,0,'full-MP awards cannot be banked');
  s.correct=24;e.observeCorrect();assert.equal(s.mp,0);s.correct=25;e.observeCorrect();assert.equal(s.mp,1);
});

test('legacy boss damage credits never count as melody answers and partial groups keep progress',()=>{
  const s=state({answeredCorrect:0,mp:0,guardian:true}),e=attach(s);
  s.correct=40;s.index=40;s.answeredCorrect=4;e.observeCorrect();assert.equal(s.mp,0);
  s.correct=50;s.index=50;s.answeredCorrect=5;e.observeCorrect();assert.equal(s.mp,1);
  s.matchEn=[];s.correct=60;s.answeredCorrect=9;e.observeCorrect();assert.equal(s.mp,1);
  s.answeredCorrect=10;e.observeCorrect();assert.equal(s.mp,2);
});

test('melody stops during pause, fever and battle completion and can resume safely',()=>{
  for(const flag of ['paused','fever','feverTransition','done']){
    const s=state({mp:0}),e=attach(s);s[flag]=true;s.correct=5;e.observeCorrect();assert.equal(s.mp,0,flag);
  }
  const s=state({mp:0}),e=attach(s);s.correct=4;e.observeCorrect();s.paused=true;e.advance(10);s.paused=false;s.correct=5;e.advance(1);assert.equal(s.mp,1);
});

test('creation and battle UI show bard healing without a World 8 gate or missing icon',()=>{
  const s=state(),effect=attach(s),c=vm.createContext({window:context.window,characters:[],characterPreviewId:null,selectedCharacter:{class:'bard'},run:{...s,activeSkills:effect},esc:String,icon:name=>`<svg data-icon="${name}"></svg>`,deployedAssetUrl:String,hasNewActiveSkill:()=>true});
  vm.runInContext(source.slice(source.indexOf('  function characterActiveSkillMarkup('),source.indexOf('  function characterSelectMarkup(')),c);
  const creation=c.characterActiveSkillMarkup('bard','create');
  assert.match(creation,/치유의 아리아/);assert.match(creation,/처음부터 사용 가능/);assert.doesNotMatch(creation,/바르가스|미습득|undefined/);
  vm.runInContext(source.slice(source.indexOf('  function newActiveSkillButton('),source.indexOf('  function refreshNewSkillFeedback(')),c);
  const button=c.newActiveSkillButton();assert.match(button,/data-action="activate-new-skill"/);assert.match(button,/MP 1.*HP 1/);assert.doesNotMatch(button,/undefined|월드 8/);
});

test('real guardian answers award melody by answers rather than damage',()=>{
  vm.runInContext(read('guardian-boss.js'),context);
  const boss=context.window.WORDORIA_GUARDIAN,s=state({...boss.reset(),bossAttackSteps:3,mp:0,hp:5}),e=attach(s);s.activeSkills=e;
  for(let i=1;i<=5;i++){
    assert.equal(boss.answer(s,true,100),true);e.observeCorrect();
    assert.equal(s.answeredCorrect,i);assert.equal(s.correct,i*3);assert.equal(s.mp,i===5?1:0);
    boss.advance(s,3000);
  }
});

test('passive MP recovery refreshes visible vitals and persists only once',()=>{
  const s=state({mp:0,hp:3}),effect=attach(s);s.activeSkills=effect;
  const vitals={outerHTML:''},actions={outerHTML:''};let saves=0;
  const c=vm.createContext({run:s,document:{querySelector:selector=>selector==='.story-vitals'?vitals:selector==='.story-action-bar'?actions:null,querySelectorAll:()=>[]},$:()=>null,persistStoryBattleVitals(){saves++;},storyVitalsMarkup:()=>`MP ${s.mp}`,storyBattleActions:()=>`HP ${s.hp} MP ${s.mp}`});
  vm.runInContext(source.slice(source.indexOf('  function refreshNewSkillFeedback('),source.indexOf('  function storyBattleActions(')),c);
  s.correct=5;c.refreshNewSkillFeedback();assert.equal(s.mp,1);assert.equal(vitals.outerHTML,'MP 1');assert.equal(actions.outerHTML,'HP 3 MP 1');assert.equal(saves,1);
  c.refreshNewSkillFeedback();assert.equal(s.mp,1);assert.equal(saves,1);
});

test('unchanged bard feedback preserves action controls between pointer press and click',()=>{
  const s=state(),effect=attach(s);s.activeSkills=effect;
  const writes=[];
  const nodes=new Map();
  const createNode=selector=>({set outerHTML(value){writes.push(selector);nodes.set(selector,createNode(selector));}});
  for(const selector of ['.story-vitals','.story-action-bar','.story-new-skill'])nodes.set(selector,createNode(selector));
  const c=vm.createContext({run:s,document:{querySelector:selector=>nodes.get(selector),querySelectorAll:()=>[]},$:()=>null,
    persistStoryBattleVitals(){},storyVitalsMarkup:()=>`HP ${s.hp} MP ${s.mp}`,storyBattleActions:()=>`actions ${s.hp} ${s.mp}`,
    newActiveSkillButton:()=>`heal ${effect.ready()}`});
  vm.runInContext(source.slice(source.indexOf('  function refreshNewSkillFeedback('),source.indexOf('  function storyBattleActions(')),c);
  c.refreshNewSkillFeedback();writes.length=0;
  c.refreshNewSkillFeedback();assert.deepEqual(writes,[],'timer feedback must not detach a pressed button when nothing changed');
  s.correct=5;s.mp=0;c.refreshNewSkillFeedback();
  assert.ok(writes.includes('.story-action-bar'),'MP recovery still updates the item and skill controls');
});
