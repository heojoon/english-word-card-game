import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
function setup({total=6,index=0,endTime=1200,reduced=false}={}){
  const timers=[],frames=[],events=[];
  const run={story:true,index,correct:index,deck:Array.from({length:total},()=>({})),matchBoard:Array.from({length:Math.min(5,total)},()=>({})),matched:new Set(Array.from({length:index},(_,i)=>i)),selectedKo:index,selectedEn:null,matchEn:[{id:index,entry:['word','','뜻']}],matchKo:[],hp:3,hpMax:3,mp:1,mpMax:1,elapsed:0,storyTimeLimit:60000};
  const context={run,nextTimer:null,selectedCharacter:{class:'warrior'},selectedStage:0,stages:[{storyChapter:2,name:'World 2'}],STORY_QUESTIONS_PER_TURN:5,performance:{now:()=>0},reducedMotion:()=>reduced,battleContactDelay:()=>420,itemById:()=>null,equippedMap:()=>({}),speak:()=>{},emitAudio:event=>events.push(event),document:{dispatchEvent:()=>{}},CustomEvent:class{},$:()=>({querySelector:()=>({getAnimations:()=>[{effect:{getComputedTiming:()=>({endTime})}},{effect:{getComputedTiming:()=>({endTime:Infinity})}}]})}),setTimeout:(fn,delay)=>{timers.push({fn,delay});return timers.length;},esc:String,deployedAssetUrl:x=>x,battleHeroMarkup:()=>'',passiveBannerMarkup:()=>'',storyBattleActions:()=>'',storyVitalsMarkup:()=>'',prepareQuestion:()=>{context.prepared=true;context.run.locked=false;context.run.matched=new Set();},beginFeverIntro:()=>{context.feverStarted=true;},render:()=>frames.push(context.renderBattle())};
  vm.createContext(context);
  for(const [start,end] of [['  function iceTimeEffectMarkup(', '  function guardianAnswer('],['  function refreshStorySelections(', '  function syncBGM('],['  function renderBattle(', '\n',],['  function storyPick(', '  async function finishBattle(']]){
    const from=source.indexOf(start);vm.runInContext(source.slice(from,source.indexOf(end,from)),context);
  }
  context.storyPick({dataset:{side:'en',id:String(index)}});
  return {context,run,timers,frames,events};
}
const mobCount=html=>(html.match(/class="enemy story-mob /g)||[]).length;
test('correct answer keeps all mobs through attack, then removes exactly one',()=>{
  const {context,run,timers,frames,events}=setup();
  assert.equal(run.matched.size,1);assert.equal(run.locked,true);
  assert.equal(mobCount(frames.at(-1)),5);
  assert.equal(timers.at(-1).delay,1200);
  timers.at(-1).fn();
  assert.equal(mobCount(frames.at(-1)),4);assert.equal(run.locked,false);
  assert.deepEqual(events,[],'story actions do not emit sound effects');
});
test('last answer defers fever screen until attack finishes',()=>{
  const {context,timers,frames}=setup({total:1});
  assert.equal(mobCount(frames.at(-1)),1);assert.equal(context.feverStarted,undefined);
  timers.at(-1).fn();assert.equal(context.feverStarted,true);
});
test('wave change and reduced motion wait for the complete action',()=>{
  const {context,timers,frames}=setup({total:6,index:4,endTime:280,reduced:true});
  assert.equal(mobCount(frames.at(-1)),1);assert.equal(context.prepared,undefined);
  assert.equal(timers.at(-1).delay,540);
  timers.at(-1).fn();assert.equal(context.prepared,true);
});
test('old attack callback cannot alter a replaced battle',()=>{
  const {context,timers}=setup();context.run={done:false};
  timers.at(-1).fn();assert.equal(context.run.pendingDefeat,undefined);
});
test('answers entered during an attack queue without restarting it or losing a partial selection',()=>{
  const {context,run,timers,frames}=setup();
  run.matchEn.push(...[1,2,3].map(id=>({id,entry:['word','','뜻']})));
  const pick=(side,id)=>context.storyPick({dataset:{side,id:String(id)}});
  pick('ko',1);pick('en',1);pick('ko',2);pick('en',2);pick('ko',3);
  assert.equal(frames.length,1,'selecting answers does not rebuild the animated arena');
  assert.equal(timers.length,2,'queued input does not restart the attack timer');
  assert.equal(run.queuedStoryPairs.length,2);
  assert.equal(run.selectedKo,3);
  timers[1].fn();
  assert.equal(run.correct,2);assert.equal(mobCount(frames.at(-1)),4);
  assert.equal(run.selectedKo,3);
  timers[3].fn();
  assert.equal(run.correct,3);assert.equal(mobCount(frames.at(-1)),3);
  assert.equal(run.selectedKo,3);
  timers[5].fn();
  assert.equal(run.attack,false);assert.equal(mobCount(frames.at(-1)),2);
  assert.equal(run.selectedKo,3);
});
test('queued correct pairs cannot be submitted twice',()=>{
  const {context,run}=setup();run.matchEn.push({id:1,entry:['word','','뜻']});
  for(let n=0;n<2;n++)for(const side of ['ko','en'])context.storyPick({dataset:{side,id:'1'}});
  assert.equal(run.queuedStoryPairs.length,1);
});
