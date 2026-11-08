import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
function extract(start,end){const i=source.indexOf(start);assert.ok(i>=0,`Missing ${start}`);return source.slice(i,source.indexOf(end,i));}
function battle(variant='basic',reduced=false){
  let now=0;const pending=[],events=[],node={textContent:'',classList:{add(){}}};
  const c=vm.createContext({run:{story:true,spelling:true,trainingDummyVariant:variant,index:0,correct:0,hp:3,mp:1,iceTimeActive:true,timeStopped:true,question:{entry:['apple','n','사과'],answer:'p',choices:['a','p','c','d']},deck:Array(40).fill({})},
    performance:{now:()=>now},reducedMotion:()=>reduced,battleContactDelay:()=>reduced?150:420,
    setTimeout(fn,delay){pending.push({fn,at:now+delay});return pending.length;},
    document:{querySelectorAll:()=>[],dispatchEvent:event=>events.push({kind:event.detail.kind,at:now})},CustomEvent:class{constructor(name,data){Object.assign(this,data);}},$:()=>node,
    render(){},persistStoryBattleVitals(){},setHeroAttackTravel(){},speak(){},consumePugilistWeavingStep:()=>false,
    continueAfterFeedback(){c.run.index++;c.run.locked=false;},finishBattle(){c.run.done=true;}});
  vm.runInContext(extract('  function crystalSpiderSchedule(','  function crystalSpiderWrongAnswer('),c);
  vm.runInContext(extract('  function worldEightCommonMonster(','  function blackrootSpriteStyle('),c);
  vm.runInContext(extract('  function answerStorySpelling(','  function renderBattle('),c);
  c.advance=ms=>{const end=now+ms;for(let i=0;i<1000;i++){pending.sort((a,b)=>a.at-b.at);if(!pending.length||pending[0].at>end){now=end;return;}const job=pending.shift();now=job.at;job.fn();}throw Error('Timer did not settle');};
  c.events=events;return c;
}
test('World 9 dummy variants follow exact stage ranges and exclude bosses and other worlds',()=>{
  const c=battle();
  for(let n=1;n<=30;n++)assert.equal(c.worldNineTrainingDummyVariant({story:true,storyChapter:12,storyNumber:n}),[15,30].includes(n)?'':n<15?'basic':'advanced');
  for(const data of [{story:true,storyChapter:11,storyNumber:1},{storyChapter:12,storyNumber:1},{story:true,storyChapter:12,storyNumber:0},{story:true,storyChapter:12,storyNumber:31}])assert.equal(c.worldNineTrainingDummyVariant(data),'');
});
for(const variant of ['basic','advanced'])for(const reduced of [false,true]){
  test(`${variant}, reduced=${reduced}: wrong punch damages at contact and retries same question`,()=>{
    const c=battle(variant,reduced),contact=reduced?90:240,q=c.run.question;
    c.answerStorySpelling(0);c.answerStorySpelling(0);
    assert.equal(c.run.hp,3);assert.equal(c.run.spiderAttacking,true);assert.equal(c.run.iceTimeActive,false);
    c.advance(contact-1);assert.equal(c.run.hp,3);c.advance(1);assert.equal(c.run.hp,2);assert.equal(c.events.length,1);
    c.advance(300);assert.equal(c.run.locked,false);assert.equal(c.run.spiderAttacking,false);assert.equal(c.run.question,q);assert.equal(c.run.index,0);
  });
  test(`${variant}, reduced=${reduced}: correct contact triggers down and holds through next question`,()=>{
    const c=battle(variant,reduced),contact=reduced?150:420;
    c.answerStorySpelling(1);c.advance(contact-1);assert.equal(c.events.length,0);c.advance(1);assert.equal(c.events[0].kind,'success');
    c.advance(reduced?100:300);assert.equal(c.run.attack,true);assert.equal(c.run.index,0);
    c.advance(1000);assert.equal(c.run.attack,false);assert.equal(c.run.index,1);
  });
}
test('pause delays punch contact; stale callbacks cannot damage replacement battles',()=>{
  const c=battle();c.answerStorySpelling(0);c.advance(100);c.run.paused=true;c.run.pausedAt=100;
  c.advance(1000);assert.equal(c.run.hp,3);c.run.spiderPausedMs=1000;c.run.paused=false;
  c.advance(139);assert.equal(c.run.hp,3);c.advance(1);assert.equal(c.run.hp,2);
  for(const correct of [false,true]){const b=battle();b.answerStorySpelling(correct?1:0);b.run={hp:3,index:0};b.advance(2000);assert.equal(b.run.hp,3);assert.equal(b.run.index,0);}
});
test('markup selects exact variant and no temporary crystal for World 9 common battles',()=>{
  for(const variant of ['basic','advanced']){
    const c=battle(variant);c.run.sniperInsight=false;
    const markup=c.trainingDummyMarkup();assert.ok(markup.includes(`training-dummy-${variant}`));assert.ok(markup.includes('spider-idle-strip'));assert.ok(markup.includes('spider-attack-strip'));assert.ok(markup.includes('spider-hit-strip'));
  }
});
test('real spelling renderer shows both dummy variants and leaves boss placeholders intact',()=>{
  const c=battle();
  Object.assign(c,{stages:{stage:{storyChapter:12,name:'training'}},selectedStage:'stage',esc:String,
    battleHeroMarkup:()=>'',passiveBannerMarkup:()=>'',storyVitalsMarkup:()=>'',
    iceTimeEffectMarkup:()=>'',eagleEyeEffectMarkup:()=>'',storyBattleActions:()=>''});
  vm.runInContext(extract('  function renderStorySpellingBattle(','  function answerWorldNineBossSpelling('),c);
  Object.assign(c.run,{storyTimeLimit:240000,elapsed:0,question:{hidden:['p'],prompt:'a_ple',meaning:'apple',answer:'p',choices:['p','b','c','d']}});
  for(const number of [1,14,15,16,29,30]){
    c.run.trainingDummyVariant=c.worldNineTrainingDummyVariant({story:true,storyChapter:12,storyNumber:number});
    const markup=c.renderStorySpellingBattle();
    assert.equal(markup.includes('training-dummy-mob'),![15,30].includes(number));
    if(![15,30].includes(number))assert.ok(markup.includes(`training-dummy-${number<15?'basic':'advanced'}`));
  }
});
