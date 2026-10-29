import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
function extract(start,end){const i=source.indexOf(start);assert.ok(i>=0);return source.slice(i,source.indexOf(end,i));}
function battle(reduced=false){
  let now=0;const pending=[],events=[],node={textContent:'',classList:{add(){}}};
  const c=vm.createContext({run:{story:true,spelling:true,wedgeMob:true,index:0,correct:0,hp:3,mp:1,iceTimeActive:true,timeStopped:true,question:{entry:['apple','n','사과'],answer:'p',choices:['a','p','c','d']},deck:Array(40).fill({})},
    performance:{now:()=>now},reducedMotion:()=>reduced,battleContactDelay:()=>reduced?150:420,
    setTimeout(fn,delay){pending.push({fn,at:now+delay});return pending.length;},
    document:{querySelectorAll:()=>[],dispatchEvent:event=>events.push({kind:event.detail.kind,at:now})},CustomEvent:class{constructor(name,data){Object.assign(this,data);}},$:()=>node,
    render(){c.renders=(c.renders||0)+1;},persistStoryBattleVitals(){},setHeroAttackTravel(){},speak(){},consumePugilistWeavingStep:()=>false,
    continueAfterFeedback(){c.run.index++;c.run.locked=false;},finishBattle(clear,reason){c.run.done=true;c.reason=reason;}});
  vm.runInContext(extract('  function crystalSpiderSchedule(','  function crystalSpiderWrongAnswer('),c);
  vm.runInContext(extract('  function worldEightCommonMonster(','  function renderStorySpellingBattle('),c);
  vm.runInContext(extract('  function answerStorySpelling(','  function renderBattle('),c);
  c.advance=ms=>{const end=now+ms;for(let i=0;i<1000;i++){pending.sort((a,b)=>a.at-b.at);if(!pending.length||pending[0].at>end){now=end;return;}const job=pending.shift();now=job.at;job.fn();}throw Error('Timer did not settle');};
  c.events=events;return c;
}
test('World 8 common troop excludes both boss stages and every other world',()=>{
  const c=battle();for(let n=1;n<=30;n++)assert.equal(c.worldEightCommonMonster({story:true,storyChapter:11,storyNumber:n}),![15,30].includes(n));
  assert.equal(c.worldEightCommonMonster({story:true,storyChapter:10,storyNumber:2}),false);
  assert.equal(c.worldEightCommonMonster({storyChapter:11,storyNumber:2}),false);
});
test('wrong spelling thrust deals damage at contact, retains the question and resets for retry',()=>{
  for(const reduced of [false,true]){
    const c=battle(reduced),contact=reduced?90:240,recovery=reduced?120:260,q=c.run.question;
    c.answerStorySpelling(0);c.answerStorySpelling(0);
    assert.equal(c.run.hp,3);assert.equal(c.run.spiderAttacking,true);assert.equal(c.run.iceTimeActive,false);
    c.advance(contact-1);assert.equal(c.run.hp,3);c.advance(1);assert.equal(c.run.hp,2);assert.equal(c.events.length,1);
    c.advance(recovery);assert.equal(c.run.locked,false);assert.equal(c.run.spiderAttacking,false);assert.equal(c.run.question,q);assert.equal(c.run.index,0);
  }
});
test('correct spelling keeps the down state until next question, with one contact event',()=>{
  const c=battle();c.answerStorySpelling(1);c.answerStorySpelling(1);
  assert.equal(c.run.attack,true);assert.equal(c.run.correct,1);assert.equal(c.run.hp,3);
  c.advance(419);assert.equal(c.events.length,0);c.advance(1);assert.equal(c.events[0].kind,'success');
  c.advance(300);assert.equal(c.run.attack,true);assert.equal(c.run.index,0);
  c.advance(260);assert.equal(c.run.attack,false);assert.equal(c.run.index,1);
});
test('pausing before thrust contact delays actual damage; resume uses the same phase clock',()=>{
  const c=battle();c.answerStorySpelling(0);c.advance(100);c.run.paused=true;c.run.pausedAt=100;
  c.advance(1000);assert.equal(c.run.hp,3);c.run.spiderPausedMs=1000;c.run.paused=false;
  c.advance(139);assert.equal(c.run.hp,3);c.advance(1);assert.equal(c.run.hp,2);
});
test('timeout, exit and stale battle callbacks never damage or advance a later battle',()=>{
  for(const stop of ['timeoutPending','done','replacement']){
    for(const answer of [0,1]){
      const c=battle();c.answerStorySpelling(answer);const old=c.run;
      if(stop==='replacement')c.run={hp:3,index:0};else c.run[stop]=true;
      c.advance(1500);assert.equal(c.run.hp,3);assert.equal(c.run.index,0);assert.equal(c.events.length,0);assert.equal(old.hp,3);
    }
  }
});
