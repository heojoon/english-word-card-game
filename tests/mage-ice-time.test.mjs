import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
function setup(){
  const entries=Array.from({length:10},(_,i)=>({entry:[`word${i}`,'n',`뜻${i}`],mode:'en-ko'}));
  const c=vm.createContext({run:{story:true,mp:1,mpMax:1,index:0,correct:0,hp:2,deck:entries,matchBoard:entries.slice(0,5),matched:new Set(),matchEn:entries.slice(0,5).map((x,id)=>({...x,id})),selectedKo:null,selectedEn:null,slashExpiresAt:0,elapsed:0,storyTimeLimit:30000,mobs:[]},selectedCharacter:{class:'mage'},performance:{now:()=>1000},render(){},emitAudio(){},speak(){},equippedMap:()=>({}),itemById(){},battleContactDelay:()=>100,reducedMotion:()=>true,document:{dispatchEvent(){},querySelector(){return null;}},CustomEvent:class{},$:()=>null,setTimeout:(fn)=>{c.pending.push(fn);return 1;},clearTimeout(){},clearInterval(){},setInterval:(fn)=>{c.tickCallback=fn;return 1;},pending:[],STORY_QUESTIONS_PER_TURN:5});
  vm.runInContext(source.slice(source.indexOf('  function canActivateMageIceTime()'),source.indexOf('  function updateWarriorSlash(')),c);
  vm.runInContext(source.slice(source.indexOf('  function storyPick('),source.indexOf('  async function finishBattle(')),c);
  return c;
}
const pick=(c,side,id)=>c.storyPick({dataset:{side,id:String(id)}});
test('ice time consumes one MP and rejects repeated or unavailable activation',()=>{
  const c=setup();c.activateMageIceTime();assert.equal(c.run.mp,0);assert.equal(c.run.iceTimeActive,true);
  c.run.mp=1;c.activateMageIceTime();assert.equal(c.run.mp,1);
  c.run.iceTimeActive=false;c.activateMageIceTime();assert.equal(c.run.mp,0);assert.equal(c.run.iceTimeActive,true);
  for(const key of ['paused','locked','stunned','done','fever','feverTransition','timeoutPending']){const x=setup();x.run[key]=true;x.activateMageIceTime();assert.equal(x.run.mp,1);assert.equal(Boolean(x.run.iceTimeActive),false);}
  const x=setup();x.selectedCharacter.class='warrior';x.activateMageIceTime();assert.equal(x.run.mp,1);
});
test('partial correct matches keep ice active; an incorrect pair releases both time stops',()=>{
  const c=setup();c.activateMageIceTime();c.run.timeStopped=true;pick(c,'ko',0);pick(c,'en',0);
  assert.equal(c.run.iceTimeActive,true);assert.equal(c.run.timeStopped,false);assert.equal(c.run.correct,1);
  c.pending.splice(0).forEach(fn=>fn());pick(c,'ko',1);pick(c,'en',2);
  assert.equal(c.run.iceTimeActive,false);assert.equal(c.run.mp,0);
});
test('ice pauses the actual battle clock and the clock resumes after release',()=>{
  const c=setup();Object.assign(c,{timerId:0,updateEnemyApproach(){},updateWarriorSlash(){}});
  vm.runInContext(source.slice(source.indexOf('  function tick()'),source.indexOf('  function pause()')),c);
  c.activateMageIceTime();c.tick();c.performance.now=()=>2000;c.tickCallback();assert.equal(c.run.elapsed,0);
  c.run.iceTimeActive=false;c.performance.now=()=>2500;c.tickCallback();assert.equal(c.run.elapsed,500);
});
test('a new wave resets ice while retaining consumed MP',()=>{
  const c=setup();Object.assign(c,{selectedStage:'test',stages:{test:{words:[]}},makeQuestion:()=>({}),activatePassive(){},shuffle:x=>x});
  vm.runInContext(source.slice(source.indexOf('  function prepareQuestion()'),source.indexOf('  function battleHeroMarkup()')),c);
  c.activateMageIceTime();c.run.index=5;c.prepareQuestion();assert.equal(c.run.iceTimeActive,false);assert.equal(c.run.mp,0);
});
test('last wave releases ice before the fever transition',()=>{
  const c=setup();c.run.index=9;c.run.matched=new Set([0,1,2,3]);c.beginFeverIntro=()=>{};
  c.activateMageIceTime();pick(c,'ko',4);pick(c,'en',4);assert.equal(c.run.iceTimeActive,false);assert.equal(c.run.feverTransition,true);
});
