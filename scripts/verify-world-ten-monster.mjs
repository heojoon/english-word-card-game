import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
function extract(start,end){const i=source.indexOf(start);assert.ok(i>=0,`Missing ${start}`);return source.slice(i,source.indexOf(end,i));}
function battle(reduced=false){
  let now=0;const pending=[],events=[],node={textContent:'',classList:{add(){}}};
  const c=vm.createContext({run:{story:true,spelling:true,starlightScout:true,index:0,correct:0,hp:3,mp:1,iceTimeActive:true,timeStopped:true,question:{entry:['apple','n','사과'],answer:'p',choices:['a','p','c','d']},deck:Array(30).fill({})},
    selectedCharacter:{class:'warrior'},performance:{now:()=>now},reducedMotion:()=>reduced,battleContactDelay:()=>reduced?150:420,
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
test('scout selection covers World 10 ordinary stages only, including optional 1 and 2',()=>{
  const c=battle();
  for(let n=-1;n<=44;n++)assert.equal(c.worldTenCommonMonster({story:true,storyChapter:13,storyNumber:n}),n>=1&&n<=43&&![20,40,43].includes(n));
  for(const data of [{story:true,storyChapter:10,storyNumber:1},{story:true,storyChapter:12,storyNumber:1},{storyChapter:13,storyNumber:1},{story:true,storyChapter:13,storyNumber:1.5}])assert.equal(c.worldTenCommonMonster(data),false);
});
for(const reduced of [false,true]){
  test(`scout reduced=${reduced}: punch damages only at contact, releases Ice Time, retries same question`,()=>{
    const c=battle(reduced),contact=reduced?90:240,q=c.run.question;
    c.answerStorySpelling(0);c.answerStorySpelling(0);
    assert.equal(c.run.hp,3);assert.equal(c.run.spiderAttacking,true);assert.equal(c.run.iceTimeActive,false);
    c.advance(contact-1);assert.equal(c.run.hp,3);c.advance(1);assert.equal(c.run.hp,2);assert.equal(c.events.length,1);
    c.advance(300);assert.equal(c.run.locked,false);assert.equal(c.run.spiderAttacking,false);assert.equal(c.run.question,q);assert.equal(c.run.index,0);
  });
  test(`scout reduced=${reduced}: player contact precedes down hold and next-question reset`,()=>{
    const c=battle(reduced),contact=reduced?150:420;
    c.answerStorySpelling(1);assert.equal(c.run.spiderHitStartedAt,0);c.advance(contact-1);assert.equal(c.events.length,0);
    c.advance(1);assert.equal(c.events[0].kind,'success');
    assert.ok(c.starlightScoutMarkup().includes('spider-is-hit'));
    c.advance(100);assert.equal(c.run.attack,true);assert.equal(c.run.index,0);
    c.advance(1000);assert.equal(c.run.attack,false);assert.equal(c.run.index,1);assert.ok(!c.starlightScoutMarkup().includes('spider-is-hit'));
  });
}
test('scout pause delays contact and replacement battle discards pending damage',()=>{
  const c=battle();c.answerStorySpelling(0);c.advance(100);c.run.paused=true;c.run.pausedAt=100;
  c.advance(1000);assert.equal(c.run.hp,3);c.run.spiderPausedMs=1000;c.run.paused=false;
  c.advance(139);assert.equal(c.run.hp,3);c.advance(1);assert.equal(c.run.hp,2);
  for(const correct of [false,true]){const b=battle();b.answerStorySpelling(correct?1:0);b.run={hp:3,index:0};b.advance(2000);assert.equal(b.run.hp,3);assert.equal(b.run.index,0);}
});
test('real spelling renderer selects scout and leaves boss rendering intact',()=>{
  const c=battle();Object.assign(c,{stages:{stage:{storyChapter:13,name:'observatory'}},selectedStage:'stage',esc:String,
    battleHeroMarkup:()=>'',passiveBannerMarkup:()=>'',storyVitalsMarkup:()=>'',iceTimeEffectMarkup:()=>'',eagleEyeEffectMarkup:()=>'',storyBattleActions:()=>'',worldNineBossMarkup:()=>'<div class="boss-sentinel"></div>'});
  vm.runInContext(extract('  function renderStorySpellingBattle(','  function answerWorldNineBossSpelling('),c);
  c.worldNineBossMarkup=()=>'<div class="boss-sentinel"></div>';
  Object.assign(c.run,{storyTimeLimit:180000,elapsed:0,question:{hidden:['p'],prompt:'a_ple',meaning:'apple',answer:'p',choices:['p','b','c','d']}});
  for(let n=1;n<=43;n++){
    c.run.starlightScout=c.worldTenCommonMonster({story:true,storyChapter:13,storyNumber:n});c.run.trainingBoss=[20,40,43].includes(n);
    const html=c.renderStorySpellingBattle();assert.equal(html.includes('starlight-scout-mob'),!c.run.trainingBoss);
    assert.equal(html.includes('boss-sentinel'),c.run.trainingBoss);
    if(!c.run.trainingBoss){assert.ok(html.includes('<span class="enemy-label">오염된 별빛 정찰병</span>'));assert.ok(html.includes('spider-attack-strip'));assert.ok(html.includes('spider-hit-strip'));}
  }
});
test('sprite manifests pack expected cells and hold down frame',()=>{
  const root=new URL('../assets/monsters/world-10/starlight-scout/',import.meta.url);
  for(const [action,count] of [['idle',2],['attack',3],['hit',3]]){
    const manifest=JSON.parse(readFileSync(new URL(`starlight-scout-sd-${action}-strip.json`,root)));
    const png=readFileSync(new URL(manifest.image,root));assert.equal(png.readUInt32BE(16),count*320);assert.equal(png.readUInt32BE(20),320);
    assert.equal(manifest.frameCount,count);assert.equal(manifest.sourceFrameGapPx,50);assert.deepEqual(manifest.anchor,{x:.5,y:.975});
    if(action==='hit'){assert.equal(manifest.frames[2].name,'complete-down');assert.equal(manifest.frames[2].hold,true);}
    if(action==='attack')assert.equal(manifest.frames[2].hit,true);
  }
});
