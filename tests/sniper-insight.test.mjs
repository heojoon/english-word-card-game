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
    storyBattleActions:()=>c.sniperInsightNoticeMarkup(),storyBattleBackgroundClass:()=>'',earnedCoins:()=>0,
    royalSlimeTime:()=>'',royalSlimeRemaining:()=>30000,window:{WORDORIA_GUARDIAN:{maskChoice:()=> 'masked'}}});
  const load=(first,last)=>vm.runInContext(source.slice(source.indexOf(first),source.indexOf(last)),c);
  load('  function prepareSniperInsight()','  function makeQuestion(');
  load('  function prepareQuestion()','  function battleHeroMarkup()');
  load('  function prepareRoyalSlimeBoard()','  function royalSlimeRemaining()');
  load('  function renderGuardianBattle()','  function iceTimeEffectMarkup()');
  load('  function renderRoyalSlimeBattle()','  function royalSlimePick(');
  load('  function renderBattle()','  function spiritMessage(');
  return {c,rolls:()=>rolls};
}
test('insight has an exact 20 percent threshold and never activates for other classes',()=>{
  for(const [random,active] of [[0,true],[.199999,true],[.2,false],[.9,false]]){
    const {c,rolls}=setup(random);c.prepareSniperInsight();assert.equal(c.run.sniperInsight,active);assert.equal(rolls(),1);
  }
  const {c,rolls}=setup();c.selectedCharacter.class='mage';c.run.sniperInsight=true;c.prepareSniperInsight();assert.equal(c.run.sniperInsight,false);assert.equal(rolls(),0);
});
test('Type 1 highlights only the actual answer; repeated renders never reroll or consume MP',()=>{
  const {c,rolls}=setup();c.prepareQuestion();const first=c.renderBattle();assert.equal((first.match(/class="sniper-answer-hint"/g)||[]).length,1);
  assert.ok(first.includes('meaning0<small class="sniper-answer-hint">정답'));
  assert.equal(c.renderBattle(),first);assert.equal(rolls(),1);assert.equal(c.run.mp,2);assert.equal(c.run.correct,0);
  c.Math.random=()=>.8;c.run.index=1;c.prepareQuestion();assert.ok(!c.renderBattle().includes('sniper-answer-hint'));assert.equal(c.run.sniperInsight,false);
});
test('ordinary Story and royal boss show five stable color/number pairs across shuffled columns',()=>{
  for(const boss of [false,true]){
    const {c,rolls}=setup();c.run.story=true;c.run.boss=boss;c.prepareQuestion();const html=c.renderBattle();
    for(let pair=1;pair<=5;pair++)assert.equal((html.match(new RegExp(`data-sniper-pair="${pair}"`,'g'))||[]).length,2);
    for(const id of c.run.matchEn.map(x=>x.id)){
      const attrs=c.sniperPairHintAttributes(id);assert.ok(attrs.includes('aria-description'));assert.ok(attrs.includes('--sniper-pair-color:'));
    }
    assert.equal(rolls(),1);c.run.selectedKo=1;c.run.paused=true;c.renderBattle();assert.equal(rolls(),1);
    c.run.index=5;c.prepareQuestion();assert.equal(rolls(),2);assert.ok(c.renderBattle().includes('쌍 1'));
  }
});
test('both four-choice bosses reveal the correct answer even while guardian text is masked',()=>{
  for(const blackDragon of [false,true]){
    const {c,rolls}=setup();Object.assign(c.run,{guardian:true,blackDragon,story:true,guardianBlindMs:300,guardianVisual:'idle'});c.prepareQuestion();
    const html=c.renderBattle();assert.equal((html.match(/class="sniper-answer-hint"/g)||[]).length,1);assert.ok(html.includes('masked<small class="sniper-answer-hint">정답'));
    c.renderBattle();assert.equal(rolls(),1);assert.equal(c.run.mp,2);
  }
});
