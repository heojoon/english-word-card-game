import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const window={};vm.runInNewContext(read('morgana-boss.js'),{window});
const rules=window.WORDORIA_MORGANA,source=read('crystal-game.js');
const code=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b));
const shuffle=x=>x.slice().reverse();
const words=Array.from({length:10},(_,i)=>['word'+i,'n','뜻'+i]);
const fresh=()=>{const s={...rules.reset(),story:true,hp:20,hpMax:20,mp:2,mpMax:2,index:0,correct:0,elapsed:0,bossAttackSteps:1,deck:rules.deck(words,shuffle)};rules.board(s,shuffle);return s;};
const hit=(s,id=s.morganaCards.find(c=>!s.matched.has(c.id)).id)=>{
  assert.equal(rules.pick(s,'en',id,200),'selected');assert.equal(rules.pick(s,'ko',id,200),'correct');
  rules.advance(s,200);rules.advance(s,300);
};

test('Morgana uses 200 HP, five minutes and enough unique five-pair boards after a full heal',()=>{
  const s=fresh();assert.equal(s.bossHp,200);assert.equal(s.storyTimeLimit,300000);assert.equal(s.deck.length,400);
  for(let i=0;i<s.deck.length;i+=5)assert.equal(new Set(s.deck.slice(i,i+5).map(x=>x.entry[0])).size,5);
  assert.match(rules.INFO.rewardDescription,/500/);assert.equal(rules.INFO.description,'심연의 주인');
});

test('chaos starts exactly every 20 seconds, shuffles identities and expires after 10 seconds',()=>{
  const s=fresh(),original=s.morganaCards.map(c=>`${c.side}:${c.id}`);
  rules.advance(s,19999);assert.equal(s.chaosMs,0);
  assert.ok(rules.advance(s,1,Math.random,1,shuffle).includes('chaos-start'));assert.equal(s.chaosMs,10000);
  assert.notDeepEqual(s.morganaCards.map(c=>`${c.side}:${c.id}`),original);
  assert.deepEqual(s.morganaCards.map(c=>`${c.side}:${c.id}`).sort(),original.slice().sort());
  const left=s.morganaCards.filter((_,i)=>i%2===0),right=s.morganaCards.filter((_,i)=>i%2===1);
  rules.advance(s,800);assert.equal(s.morganaCards[0],left[1]);assert.equal(s.morganaCards[1],right.at(-1));
  rules.advance(s,9200);assert.equal(s.chaosMs,0);assert.equal(s.chaosAngle,0);
  rules.advance(s,9999);assert.equal(s.chaosMs,0);rules.advance(s,1);assert.equal(s.chaosMs,10000);
});

test('same-column matching works after mixed-language shuffle, including selection across a shift',()=>{
  const s=fresh();rules.advance(s,20000,Math.random,20000,items=>{
    const left=[items[0],items[1],items[4],items[5],items[8]],right=items.filter(x=>!left.includes(x));
    return left.flatMap((x,i)=>[x,right[i]]);
  });
  const card=s.morganaCards[0],mate=s.morganaCards.find(c=>c.id===card.id&&c.side!==card.side);
  assert.equal(s.morganaCards.indexOf(mate)%2,0);
  rules.pick(s,card.side,card.id,200);rules.advance(s,800);
  assert.equal(rules.pick(s,mate.side,mate.id,200),'correct');rules.advance(s,199);assert.equal(s.bossHp,200);
  rules.advance(s,1);assert.equal(s.bossHp,199);assert.equal(s.correct,1);assert.ok(s.matched.has(card.id));
});

test('refresh heals at 30 percent once, subsequent damage subtracts from healed HP and can defeat',()=>{
  const s=fresh();s.bossHp=61;const id=s.morganaCards[0].id;
  rules.pick(s,'ko',id,200);rules.pick(s,'en',id,200);rules.advance(s,199);assert.equal(s.bossHp,61);
  const events=rules.advance(s,1);assert.equal(s.bossHp,200);assert.ok(s.morganaHealUsed);assert.ok(events.includes('heal-start'));
  rules.advance(s,300);hit(s);assert.equal(s.bossHp,199);assert.equal(s.correct,2);
  s.bossHp=1;hit(s);assert.equal(s.bossHp,0);assert.equal(s.guardianPhase,'defeat');assert.equal(s.chaosMs,0);
  assert.ok(rules.advance(s,1000).includes('victory'));
});

test('full battle can solve 340 answers without exhausting vocabulary or repeat healing',()=>{
  const s=fresh();
  while(s.bossHp>0){
    if(s.matched.size===s.matchBoard.length)rules.board(s,shuffle);
    hit(s);
  }
  assert.equal(s.correct,340);assert.equal(s.index,340);assert.equal(s.morganaHealUsed,true);
});

test('pause, Ice Time and pet freeze stop curse cadence, movement and rotation; player contact still resolves',()=>{
  const s=fresh();rules.advance(s,20800);const cards=s.morganaCards.slice(),time=s.chaosMs,angle=s.chaosAngle;
  for(const mode of ['pause','ice','pet']){
    s.paused=mode==='pause';s.iceTimeActive=mode==='ice';rules.advance(s,5000,Math.random,mode==='pet'?0:5000);
    assert.equal(s.chaosMs,time);assert.equal(s.chaosAngle,angle);assert.deepEqual(s.morganaCards,cards);
  }
  s.paused=false;s.iceTimeActive=true;hit(s);assert.equal(s.bossHp,199);assert.equal(s.iceTimeActive,true);
  rules.clear(s);assert.equal(s.iceTimeActive,false);assert.equal(s.chaosMs,0);assert.equal(s.morganaHealMs,0);
});

test('wrong answer releases Ice Time and fatal damage clears boss effects',()=>{
  const s=fresh();s.hp=1;rules.advance(s,20000);s.iceTimeActive=true;
  rules.pick(s,'ko',s.morganaCards[0].id,200);const id=s.morganaCards.find(c=>c.id!==s.selectedCard.id).id;
  assert.equal(rules.pick(s,'en',id,200),'wrong');assert.equal(s.iceTimeActive,false);
  assert.ok(rules.advance(s,500).includes('defeat-player'));assert.equal(s.chaosMs,0);assert.equal(s.hp,0);
});

test('renderer exposes same-column matching, shared Ice Time, heal ring and exact runtime asset',()=>{
  const s=fresh();s.iceTimeActive=true;s.morganaHealMs=1600;
  const c=vm.createContext({window,run:s,esc:String,deployedAssetUrl:x=>x,royalSlimeTime:()=> '05:00',battleHeroMarkup:()=>'',storyVitalsMarkup:()=>'',iceTimeEffectMarkup:()=>'<i class="ice-time-field"></i>',eagleEyeEffectMarkup:()=>'',storyBattleActions:()=>'',sniperPairHintAttributes:()=>'',sniperPairHintMarkup:()=>'',petPairHintMarkup:()=>'',eaglePairHintMarkup:()=>''});
  vm.runInContext(code('  function renderMorganaBattle(', '  function renderLichDragonBattle('),c);const html=c.renderMorganaBattle();
  assert.equal((html.match(/data-action="morgana-pick"/g)||[]).length,10);assert.match(html,/morgana-heal-ring/);assert.match(html,/ice-time-field/);assert.match(html,/aria-valuemax="200"/);assert.match(html,/morgana-sd.png/);
  for(const path of [rules.ART,rules.SPRITE])assert.ok(readFileSync(new URL('../'+path,import.meta.url)).length);
});

test('countdown integration respects freeze and timeout, with victory hold allowed after timer boundary',()=>{
  const s=fresh(),outcomes=[];const c=vm.createContext({window,run:s,Math,shuffle,updateWarriorSlash(){},syncMorganaMotion(){},render(){},document:{querySelector:()=>null,querySelectorAll:()=>[],dispatchEvent(){}},CustomEvent:class{},$:()=>null,finishBattle:(clear,reason)=>outcomes.push([clear,reason])});
  vm.runInContext(code('  function advanceMorganaBattle(', '  function lichDragonPick('),c);
  s.iceTimeActive=true;c.advanceMorganaBattle(5000);assert.equal(s.elapsed,0);assert.equal(s.morganaSkillElapsed,0);
  s.iceTimeActive=false;s.elapsed=299999;c.advanceMorganaBattle(1000);assert.equal(s.elapsed,300000);assert.deepEqual(outcomes,[[false,'timeout']]);
  outcomes.length=0;s.bossHp=0;s.guardianPhase='defeat';s.guardianRemaining=1000;c.advanceMorganaBattle(1000);assert.deepEqual(outcomes,[[true,'boss-defeated']]);
});

test('stage 20 retains shared progression and vocabulary for both levels; entry displays original art and skills',()=>{
  let level='middle';const c=vm.createContext({window,stages:JSON.parse(read('content/catalog.json')).stages,learningLevel:()=>level,stageLevel:s=>s?.learningLevel||'middle',storyBranchPreview:null,run:null,records:[],demoState:{storyBranch:'6A'},accountMode:false,localHost:false,nativeApp:false,esc:String,deployedAssetUrl:x=>x});
  vm.runInContext(code('  const storyStages = [','  const storyStageKey=')+'\nthis.storyStages=storyStages;',c);vm.runInContext(code('  function stageRecordName(','  function earnedCoins('),c);c.configureStoryContent();
  const name=c.stageRecordName('story-ch6a-20');c.records.push({stage:name,cleared:true});level='elementary';c.configureStoryContent();
  assert.equal(c.stages['story-ch6a-20'].morgana,true);assert.equal(c.stageRecordName('story-ch6a-20'),name);assert.equal(c.stageCleared('story-ch6a-20'),true);
  vm.runInContext(code('  function bossIntroductionMarkup(','  function confirmStoryStage('),c);const html=c.bossIntroductionMarkup({chapter:7,number:20});
  assert.match(html,/혼돈의 저주/);assert.match(html,/리프레시힐/);assert.match(html,/500/);assert.match(html,/morgana-standing.webp/);
});

test('five-pair completion releases Ice Time and a mana potion enables another activation',async()=>{
  const s=fresh();s.mp=s.mpMax=1;
  const c=vm.createContext({window,run:s,selectedCharacter:{id:'c',class:'mage'},performance:{now:()=>1000},render(){},document:{querySelector:()=>null},setTimeout(){},equippedPotions:()=>['blue'],potionTypes:{blue:{name:'마나포션'}},localMode:true,potionInventory:{equipped_slot_1:'blue'},demoState:{},saveDemo(){},toast(){}});
  vm.runInContext(code('  function canActivateMageIceTime(','  function updateWarriorSlash('),c);
  vm.runInContext(code('  async function useStoryPotion(','  function royalSlimeTime('),c);
  c.activateMageIceTime();assert.equal(s.mp,0);assert.equal(s.iceTimeActive,true);
  for(let i=0;i<4;i++){hit(s);assert.equal(s.iceTimeActive,true);}
  hit(s);assert.equal(s.iceTimeActive,false);
  rules.board(s,shuffle);await c.useStoryPotion(0,{});assert.equal(s.mp,1);
  c.activateMageIceTime();assert.equal(s.mp,0);assert.equal(s.iceTimeActive,true);
});

test('spirit pet hints target an unmatched pair in the Morgana board',()=>{
  const c=vm.createContext({window:{}});vm.runInContext(read('pet-system.js'),c);
  const s=fresh(),pet=c.window.WORDORIA_PETS;
  s.petEffects=pet.attach(s,pet.catalog[10],{random:()=>0});
  assert.ok(s.petEffects);assert.equal(s.petEffects.onQuestion(),true);assert.equal(s.petHint.pairId,s.matchEn[0].id);
});

test('every battle exit clears curse, heal and selection before saving real totals',async()=>{
  for(const clear of [true,false]){
    const s={...fresh(),correct:114,chaosMs:5000,morganaHealMs:500,iceTimeActive:true},saved=[];
    const c=vm.createContext({window,run:s,selectedStage:'story-ch6a-20',storyStages:[{key:'story-ch6a-20',chapter:7,number:20}],persistStoryBattleVitals(){},clearInterval(){},clearTimeout(){},removeBattleReward(){},cancelSpeech(){},timerId:0,nextTimer:0,saveBattleResult:async(r,won)=>saved.push([won,r.correct,r.deck.length]),stageCleared:()=>true,go(){},document:{dispatchEvent(){}},CustomEvent:class{}});
    vm.runInContext(code('  async function finishBattle(','  async function saveBattleResult('),c);await c.finishBattle(clear,clear?'boss-defeated':'leave');
    assert.deepEqual(saved,[[clear,114,clear?114:400]]);assert.equal(s.chaosMs,0);assert.equal(s.morganaHealMs,0);assert.equal(s.iceTimeActive,false);
  }
});
