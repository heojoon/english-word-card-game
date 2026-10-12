import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
function setup(random=.1){
  let rolls=0;
  const entries=Array.from({length:10},(_,i)=>({entry:[`word${i}`,'n',`meaning${i}`],mode:'en-ko'}));
  const c=vm.createContext({selectedCharacter:{class:'sniper'},run:{deck:entries,index:0,correct:0,remaining:5000,elapsed:0,storyTimeLimit:30000,hp:3,hpMax:3,mp:2,mpMax:2,bossHp:50},
    Math:Object.assign(Object.create(Math),{random:()=>{rolls++;return random;}}),performance:{now:()=>1000},
    selectedStage:'test',stages:{test:{name:'test',words:entries.map(x=>x.entry)}},STORY_QUESTIONS_PER_TURN:5,shuffle:a=>a.slice().reverse(),
    makeQuestion:item=>({prompt:item[0],answer:item[2],choices:['wrong1',item[2],'wrong2','wrong3']}),activatePassive(){},
    esc:String,deployedAssetUrl:String,battleHeroMarkup:()=>'',storyVitalsMarkup:()=>'',iceTimeEffectMarkup:()=>'',passiveBannerMarkup:()=>'',
    storyBattleActions:()=>'',storyBattleBackgroundClass:()=>'',earnedCoins:()=>0,
    royalSlimeTime:()=>'',royalSlimeRemaining:()=>30000,window:{WORDORIA_GUARDIAN:{maskChoice:()=> 'masked'}}});
  const load=(first,last)=>vm.runInContext(source.slice(source.indexOf(first),source.indexOf(last)),c);
  load('  function prepareSniperInsight()','  function makeQuestion(');
  load('  function passiveBannerMarkup()','  function removeBattleReward()');
  load('  function prepareQuestion()','  function battleHeroMarkup()');
  load('  function prepareRoyalSlimeBoard()','  function royalSlimeRemaining()');
  load('  function renderGuardianBattle()','  function iceTimeEffectMarkup()');
  load('  function renderRoyalSlimeBattle()','  function royalSlimePick(');
  load('  function renderBattle()','  function spiritMessage(');
  return {c,rolls:()=>rolls};
}
test('insight has an exact 15 percent threshold and never activates for other classes',()=>{
  for(const [random,active] of [[0,true],[.149999,true],[.15,false],[.199999,false],[.2,false],[.9,false]]){
    const {c,rolls}=setup(random);c.prepareSniperInsight();assert.equal(c.run.sniperInsight,active);assert.equal(rolls(),1);
  }
  const {c,rolls}=setup();c.selectedCharacter.class='mage';c.run.sniperInsight=true;c.prepareSniperInsight();assert.equal(c.run.sniperInsight,false);assert.equal(rolls(),0);
});
test('Type 1 highlights only the actual answer; repeated renders never reroll or consume MP',()=>{
  const {c,rolls}=setup();c.prepareQuestion();const first=c.renderBattle();c.announcement='<div class="arena-combo time-stop-announcement sniper-insight-announcement" role="status" aria-live="polite"><b>심안의 저격</b></div>';assert.ok(first.includes(c.announcement));assert.equal((first.match(/class="sniper-answer-hint"/g)||[]).length,1);
  assert.ok(first.includes('meaning0<small class="sniper-answer-hint">정답'));
  assert.equal(c.renderBattle(),first.replace(c.announcement,''));assert.equal(rolls(),1);assert.equal(c.run.mp,2);assert.equal(c.run.correct,0);
  c.Math.random=()=>.8;c.run.index=1;c.prepareQuestion();assert.ok(!c.renderBattle().includes('sniper-answer-hint'));assert.equal(c.run.sniperInsight,false);
});
test('ordinary Story and royal boss show only two stable color/number pairs across shuffled columns',()=>{
  for(const boss of [false,true]){
    const {c,rolls}=setup();c.run.story=true;c.run.boss=boss;c.prepareQuestion();const html=c.renderBattle();
    for(let pair=1;pair<=5;pair++)assert.equal((html.match(new RegExp(`data-sniper-pair="${pair}"`,'g'))||[]).length,pair<=2?2:0);
    assert.equal((html.match(/class="sniper-pair-label"/g)||[]).length,4);
    const hintedIds=c.run.matchEn.map(x=>x.id).sort((a,b)=>a-b).slice(0,2);
    for(const id of c.run.matchEn.map(x=>x.id)){
      const attrs=c.sniperPairHintAttributes(id),label=c.sniperPairHintMarkup(id);
      if(hintedIds.includes(id)){assert.ok(attrs.includes('aria-description'));assert.ok(attrs.includes('--sniper-pair-color:'));assert.ok(label);}
      else {assert.equal(attrs,'');assert.equal(label,'');}
    }
    assert.equal(rolls(),1);c.run.selectedKo=1;c.run.paused=true;c.renderBattle();assert.equal(rolls(),1);
    c.run.matched.add(hintedIds[0]);c.run.matchEn.reverse();c.renderBattle();assert.equal(rolls(),1);
    for(const id of c.run.matchEn.map(x=>x.id))assert.equal(Boolean(c.sniperPairHintMarkup(id)),hintedIds.includes(id));
    c.run.index=5;c.prepareQuestion();assert.equal(rolls(),2);assert.ok(c.renderBattle().includes('쌍 1'));
    assert.equal(c.sniperPairHintMarkup(hintedIds[0]),'');
    c.Math.random=()=>.9;c.prepareQuestion();assert.ok(!c.renderBattle().includes('data-sniper-pair='));
  }
});
test('both four-choice bosses reveal the correct answer even while guardian text is masked',()=>{
  for(const blackDragon of [false,true]){
    const {c,rolls}=setup();Object.assign(c.run,{guardian:true,blackDragon,story:true,guardianBlindMs:300,guardianVisual:'idle'});c.prepareQuestion();
    const html=c.renderBattle();assert.equal((html.match(/class="sniper-answer-hint"/g)||[]).length,1);assert.ok(html.includes('masked<small class="sniper-answer-hint">정답'));
    c.renderBattle();assert.equal(rolls(),1);assert.equal(c.run.mp,2);
  }
});

test('insight announces once per activation inside every battle arena without bottom help',()=>{
  for(const mode of [{},{story:true},{story:true,boss:true},{story:true,guardian:true,guardianVisual:'idle'},{story:true,guardian:true,blackDragon:true,guardianVisual:'idle'}]){
    const {c}=setup();Object.assign(c.run,mode);c.prepareQuestion();
    const first=c.renderBattle(),arenaStart=first.indexOf('id="arena"'),arenaEnd=first.indexOf('<div class="question-card',arenaStart);
    assert.ok(first.includes('time-stop-announcement sniper-insight-announcement'));
    assert.ok(first.indexOf('sniper-insight-announcement')>arenaStart);
    if(arenaEnd>=0)assert.ok(first.indexOf('sniper-insight-announcement')<arenaEnd);
    assert.ok(!first.includes('sniper-insight-notice'));assert.ok(!first.includes('마음의 눈으로 정답을 알려줘요'));
    assert.ok(!c.renderBattle().includes('sniper-insight-announcement'));
    c.run.index=5;c.prepareQuestion();assert.ok(c.renderBattle().includes('sniper-insight-announcement'));
    c.Math.random=()=>.9;c.prepareQuestion();assert.ok(!c.renderBattle().includes('sniper-insight-announcement'));
  }
});

test('insight targets enemies throughout its question group and disappears on inactive groups',()=>{
  for(const mode of [{},{story:true},{story:true,boss:true},{story:true,guardian:true,guardianVisual:'idle'},{story:true,guardian:true,blackDragon:true,guardianVisual:'idle'}]){
    const {c,rolls}=setup();Object.assign(c.run,mode);c.prepareQuestion();
    const first=c.renderBattle();
    assert.equal((first.match(/class="sniper-insight-reticle"/g)||[]).length,mode.story&&!mode.boss&&!mode.guardian?5:1);
    assert.ok(first.includes('src="assets/effects/fx_sniper_insight_reticle.svg"'));
    if(mode.guardian)assert.ok(first.includes('<div class="guardian-enemy"><img class="sniper-insight-reticle"'));
    else if(mode.boss)assert.ok(first.includes('<div class="royal-slime-boss-wrap"><img class="sniper-insight-reticle"'));
    else if(!mode.story)assert.ok(first.includes('<div class="enemy "><img class="sniper-insight-reticle"'));
    assert.ok(c.renderBattle().includes('sniper-insight-reticle'));assert.equal(rolls(),1);
    if(mode.story&&!mode.boss&&!mode.guardian){c.run.matched.add(c.run.matchBoard[0].id);assert.equal((c.renderBattle().match(/class="sniper-insight-reticle"/g)||[]).length,4);}
    c.Math.random=()=>.9;c.run.index=5;c.prepareQuestion();assert.ok(!c.renderBattle().includes('sniper-insight-reticle'));
  }
});
