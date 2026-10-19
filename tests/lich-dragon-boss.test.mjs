import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const window={};vm.runInNewContext(read('lich-dragon-boss.js'),{window});
const rules=window.WORDORIA_LICH_DRAGON,source=read('crystal-game.js');
const code=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b));
const words=Array.from({length:23},(_,i)=>['word'+i,'n','뜻'+i]);
const identity=items=>items.slice();
const fresh=()=>{const s={...rules.reset(),story:true,deck:rules.deck(words,identity),correct:0,index:0,hp:3,hpMax:3,mp:2,mpMax:2,elapsed:0};rules.board(s,identity);return s;};
const hit=(s,id=s.matchEn.find(item=>!s.matched.has(item.id)).id)=>{assert.equal(rules.pick(s,'en',id,200),'selected');assert.equal(rules.pick(s,'ko',id,200),'correct');return rules.advance(s,500,()=>.99);};

test('200 HP, eight minutes and 40 five-pair boards use unique words',()=>{
  const s=fresh();assert.equal(s.bossHp,200);assert.equal(s.storyTimeLimit,480000);assert.equal(s.deck.length,200);
  for(let i=0;i<200;i+=5)assert.equal(new Set(s.deck.slice(i,i+5).map(x=>x.entry[0])).size,5);
  assert.equal(new Set(s.deck.slice(0,23).map(x=>x.entry[0])).size,23);
  assert.equal(s.lichCards.length,10);
  assert.deepEqual(Array.from(s.lichCards.slice(0,2).map(x=>x.side)),['ko','en']);
});

test('tornado fires at ten seconds, shuffles at contact, preserves matched identities and cancels selection',()=>{
  const s=fresh();hit(s);rules.pick(s,'en',1,200);
  rules.advance(s,9499,()=>.99,9499,items=>items.reverse());assert.equal(s.tornadoCasts,0);
  assert.ok(rules.advance(s,1).includes('tornado-start'));assert.equal(s.tornadoCasts,1);
  const before=JSON.stringify(s.lichCards);rules.advance(s,599);assert.equal(JSON.stringify(s.lichCards),before);
  const event=rules.advance(s,1,()=>.99,1,items=>items.reverse());assert.ok(event.includes('tornado-contact'));
  assert.notEqual(JSON.stringify(s.lichCards),before);assert.equal(s.selectedCard,null);assert.equal(s.matched.has(0),true);
  assert.deepEqual(Array.from(s.lichCards,x=>x.side+':'+x.id).sort(),JSON.parse(before).map(x=>x.side+':'+x.id).sort());
  rules.advance(s,9400);assert.equal(s.tornadoCasts,2);
});

test('same-column vertical pairs work in either order; identical card toggles, same-language pairs fail',()=>{
  for(const order of [['ko','en'],['en','ko']]){
    const s=fresh(),id=2,pair=order.map(side=>s.lichCards.find(card=>card.id===id&&card.side===side)),others=s.lichCards.filter(card=>card.id!==id);
    s.lichCards=[pair[0],others[0],pair[1],...others.slice(1)];
    assert.equal(s.lichCards[0].id,s.lichCards[2].id);
    rules.pick(s,order[0],id,200);assert.equal(rules.pick(s,order[1],id,200),'correct');
    rules.advance(s,199);assert.equal(s.bossHp,200);rules.advance(s,1);assert.equal(s.bossHp,199);assert.ok(s.matched.has(id));
  }
  const s=fresh();rules.pick(s,'ko',0,200);rules.pick(s,'ko',0,200);assert.equal(s.selectedCard,null);assert.equal(s.hp,3);
  rules.pick(s,'ko',0,200);assert.equal(rules.pick(s,'ko',1,200),'wrong');assert.equal(s.hp,2);assert.equal(s.bossHp,200);
  assert.equal(rules.pick(s,'en',0,200),false);
});

test('drain triggers once per HP boundary and succeeds strictly below 60 percent',()=>{
  for(const [roll,remaining] of [[.599,2],[.6,3]]){
    const s=fresh();s.correct=39;s.bossHp=161;
    hit(s);assert.equal(s.bossHp,160);assert.equal(s.guardianPhase,'drain-charge');
    rules.advance(s,599,()=>roll);assert.equal(s.hp,3);
    assert.ok(rules.advance(s,1,()=>roll).includes(remaining===2?'drain-hit':'drain-miss'));assert.equal(s.hp,remaining);
    rules.advance(s,700);hit(s);assert.equal(s.drainThresholds.length,1);
  }
  const lethal=fresh();lethal.correct=179;lethal.bossHp=21;lethal.hp=1;hit(lethal);
  rules.advance(lethal,600,()=>0);assert.equal(lethal.hp,0);assert.ok(rules.advance(lethal,700).includes('defeat-player'));
  const shield=fresh();shield.correct=39;shield.bossHp=161;shield.petEffects={damage(){}};hit(shield);rules.advance(shield,600,()=>0);assert.equal(shield.hp,3);
});

test('Ice Time freezes the countdown and tornado schedule until five pairs complete, wrong answer or exit',()=>{
  const s=fresh();s.iceTimeActive=true;rules.advance(s,30000,()=>0,0);assert.equal(s.tornadoCasts,0);
  hit(s);assert.equal(s.iceTimeActive,true);
  for(let i=1;i<5;i++)hit(s);
  assert.equal(s.iceTimeActive,false);assert.equal(s.bossHp,195);
  rules.board(s,identity);s.iceTimeActive=true;rules.pick(s,'en',5,200);rules.pick(s,'ko',6,200);assert.equal(s.iceTimeActive,false);
  rules.clear(s);assert.equal(s.tornadoContactMs,0);assert.equal(s.drainQueue.length,0);
});

test('pause and reduced motion preserve contact order; large deltas trigger each interval once',()=>{
  const s=fresh();s.paused=true;rules.advance(s,100000);assert.equal(s.tornadoCasts,0);
  s.paused=false;s.guardianReducedMotion=true;rules.advance(s,10000);assert.equal(s.tornadoContactMs,300);
  rules.advance(s,299);assert.equal(s.tornadoNoticeMs,0);assert.ok(rules.advance(s,1).includes('tornado-contact'));
  const large=fresh();rules.advance(large,30500);assert.equal(large.tornadoCasts,3);assert.equal(large.lichNextTornado,40000);
});

test('lethal contact holds the final frame, clears skills and records time before defeat animation',()=>{
  const s=fresh();s.correct=199;s.bossHp=1;s.elapsed=240100;
  rules.pick(s,'en',0,200);rules.pick(s,'ko',0,200);
  rules.advance(s,500);assert.equal(s.bossHp,0);assert.equal(s.guardianVisual,'defeat');assert.equal(s.lichClearElapsed,239800);assert.equal(s.tornadoMs,0);
  assert.ok(!rules.advance(s,699).includes('victory'));assert.ok(rules.advance(s,1).includes('victory'));
  assert.equal(rules.reward(240000),1000);assert.equal(rules.reward(240001),700);
});

test('runtime renders all ten mixed cards with shared skills, dragon strips and contact projectile',()=>{
  const s=fresh();s.tornadoMs=900;s.tornadoNoticeMs=100;s.iceTimeActive=true;
  const c=vm.createContext({run:s,esc:String,royalSlimeTime:()=>'',battleHeroMarkup:()=>'',storyVitalsMarkup:()=>'',storyBattleActions:()=>'',iceTimeEffectMarkup:()=>'<i>ice</i>',eagleEyeEffectMarkup:()=>'',sniperPairHintAttributes:()=>'',sniperPairHintMarkup:()=>'',petPairHintMarkup:()=>'',eaglePairHintMarkup:()=>''});
  vm.runInContext(code('  function renderLichDragonBattle(', '  function lichDragonPick('),c);
  const html=c.renderLichDragonBattle();assert.equal((html.match(/data-action="lich-pick"/g)||[]).length,10);
  assert.match(html,/부활한 리치 드래곤/);assert.match(html,/aria-valuemax="200"/);assert.match(html,/lich-tornado-flight/);assert.match(html,/ice-time-active/);
  assert.match(read('index.html'),/src="lich-dragon-boss.js/);assert.match(read('scripts/build-web.mjs'),/'lich-dragon-boss.js'/);
});

test('local rewards are 700 plus an inclusive four-minute 300 bonus, with zero replay rewards',async()=>{
  for(const [elapsed,reward] of [[240000,1000],[240001,700]]){
    const s={...fresh(),clear:true,bossHp:0,correct:200,elapsed};
    const c=vm.createContext({window,run:s,localMode:true,selectedStage:'story-ch5-20',selectedCharacter:{id:'hero',coins:0},player:'p',demoState:{records:[]},records:[],stageRecordName:()=> 'stage',render(){},showStoryBranchChoice(){},saveDemo(){},toast(){},page:'bossResult',showStoryBranchChoice(){},esc:String,num:String,deployedAssetUrl:x=>x});
    vm.runInContext(code('  async function claimGuardianReward(', '  async function finishBattle('),c);
    await c.claimGuardianReward();assert.equal(s.bossReward,reward);assert.equal(c.selectedCharacter.coins,reward);
    if(reward===1000)assert.match(c.renderGuardianResult(),/보너스 \+300/);
    delete s.bossReward;await c.claimGuardianReward();assert.equal(s.bossReward,0);assert.equal(c.selectedCharacter.coins,reward);
  }
});

test('runtime freezes real time and tornado schedule, releases on wrong, and reuses Ice Time after a mana potion',async()=>{
  const s=fresh(),c=vm.createContext({window,run:s,Math,selectedCharacter:{id:'hero',class:'mage'},performance:{now:()=>1000},setTimeout(){},render(){},updateWarriorSlash(){},document:{querySelector:()=>null,dispatchEvent(){}},CustomEvent:class{},$:()=>null,shuffle:identity,localMode:true,equippedPotions:()=>['blue'],potionTypes:{blue:{name:'마나포션'}},potionInventory:{},demoState:{},saveDemo(){},toast(){}});
  vm.runInContext(code('  function advanceLichDragonBattle(', '  function renderSorcerusBattle('),c);
  vm.runInContext(code('  function canActivateMageIceTime(', '  function updateWarriorSlash('),c);
  vm.runInContext(code('  async function useStoryPotion(', '  const ROYAL_SLIME_REWARD='),c);
  c.activateMageIceTime();assert.equal(s.mp,1);c.advanceLichDragonBattle(20000);assert.equal(s.elapsed,0);assert.equal(s.tornadoCasts,0);
  rules.pick(s,'en',0,200);rules.pick(s,'ko',1,200);assert.equal(s.iceTimeActive,false);
  rules.advance(s,500);c.activateMageIceTime();assert.equal(s.mp,0);assert.equal(s.iceTimeActive,true);
  s.iceTimeActive=false;await c.useStoryPotion(0,{});assert.equal(s.mp,1);
  c.activateMageIceTime();assert.equal(s.mp,0);assert.equal(s.iceTimeActive,true);
});

test('runtime accepts a kill at the time limit and lets its final-frame hold finish',()=>{
  const s=fresh();s.correct=199;s.bossHp=1;s.elapsed=479900;rules.pick(s,'en',0,100);rules.pick(s,'ko',0,100);
  const outcomes=[],c=vm.createContext({window,run:s,Math,shuffle:identity,document:{querySelector:()=>null,dispatchEvent(){}},CustomEvent:class{},$:()=>null,render(){},updateWarriorSlash(){},finishBattle:(won,reason)=>outcomes.push([won,reason])});
  vm.runInContext(code('  function advanceLichDragonBattle(', '  function renderSorcerusBattle('),c);
  c.advanceLichDragonBattle(100);assert.equal(s.bossHp,0);assert.deepEqual(outcomes,[]);
  c.advanceLichDragonBattle(999);assert.equal(s.elapsed,480000);assert.deepEqual(outcomes,[]);
  c.advanceLichDragonBattle(1);assert.deepEqual(outcomes,[[true,'boss-defeated']]);
  const timeout=fresh();timeout.elapsed=479999;c.run=timeout;c.advanceLichDragonBattle(1);assert.deepEqual(outcomes.at(-1),[false,'timeout']);
});

test('account reward failure can be retried and uses the battle owner and new RPC',async()=>{
  const s={...fresh(),clear:true,bossHp:0,correct:200,elapsed:240000,storyCharacterId:'owner'},calls=[];
  const c=vm.createContext({window,run:s,localMode:false,selectedStage:'story-ch5-20',selectedCharacter:{id:'other'},player:'p',records:[],stageRecordName:()=> 'stage',render(){},toast(){},page:'bossResult',showStoryBranchChoice(){},rpc:async(name,args)=>{calls.push([name,args]);if(calls.length===1)throw Error('offline');return [{game_score_id:1,reward:1000,balance:1000}];}});
  vm.runInContext(code('  async function claimGuardianReward(', '  function renderGuardianResult('),c);
  await c.claimGuardianReward();assert.equal(s.rewardError,true);assert.equal(s.rewardPending,false);
  await c.claimGuardianReward();assert.equal(s.rewardError,false);assert.equal(s.bossReward,1000);assert.equal(c.records[0].total,200);
  assert.equal(calls[1][0],'claim_lich_dragon_boss_reward');assert.deepEqual(JSON.parse(JSON.stringify(calls[1][1])),{p_character_id:'owner',p_correct:200,p_duration_ms:240000});
});

test('finish clears boss skills and routes actual victory through its ending before rewards',()=>{
  for(const clear of [true,false]){
    const s={...fresh(),tornadoMs:900,tornadoContactMs:600,drainQueue:[100],iceTimeActive:true,lichClearElapsed:240000},pages=[],claims=[];
    const c=vm.createContext({window,run:s,persistStoryBattleVitals(){},clearInterval(){},clearTimeout(){},removeBattleReward(){},cancelSpeech(){},timerId:0,nextTimer:0,go:p=>pages.push(p),claimGuardianReward:()=>claims.push(true)});
    vm.runInContext(code('  function finishGuardianBattle(', '  async function claimGuardianReward('),c);
    c.finishGuardianBattle(clear,clear?'boss-defeated':'leave');assert.deepEqual(pages,[clear?'storyChapterFiveBossEnd':'bossResult']);assert.equal(claims.length,0);
    if(clear)assert.equal(c.storyDialogueIndex,0);
    assert.equal(s.tornadoMs,0);assert.equal(s.tornadoContactMs,0);assert.equal(s.drainQueue.length,0);assert.equal(s.iceTimeActive,false);
    if(clear)assert.equal(s.elapsed,240000);
  }
});

test('World 5 victory completion and skip enter rewards once; defeats and preview skips never claim',()=>{
  for(const state of [{lichDragon:true,done:true,clear:true},{lichDragon:true,done:true,clear:false},{lichDragon:true,done:true,clear:true,localBossSkipped:true},{lichDragon:true,done:false,clear:true}]){
    const pages=[],claims=[],branches=[];
    const c=vm.createContext({page:'storyChapterFiveBossEnd',run:state,go:p=>{pages.push(p);c.page=p;},claimGuardianReward:()=>claims.push(true),showStoryBranchChoice:()=>branches.push(true),bossEncounter:()=>false,startBattle(){assert.fail('ending must not restart combat');}});
    vm.runInContext(code('  function completeStoryDialogue(', '  function storyDialogueLines('),c);
    c.completeStoryDialogue();
    const valid=state.done&&state.clear;
    assert.deepEqual(pages,valid?['bossResult']:[]);
    assert.equal(claims.length,valid&&!state.localBossSkipped?1:0);
    assert.equal(branches.length,valid&&state.localBossSkipped?1:0);
  }
  assert.match(source,/action==='story-dialogue-skip'\)\{completeStoryDialogue\(\)/);
});

test('generated World 5 ending preserves dialogue and only includes story beats with available art',()=>{
  const w={};vm.runInNewContext(read('story-novel.js'),{window:w});
  const lines=w.WORDORIA_NOVELS.world5BossEnd,markdown=read('assets/novel/world-5-20-boss-end.md');
  const story=markdown.split('## Scene 01.')[1].split('## 다음 스토리')[0];
  const spoken=story.split(/\n\s*\n/).map(block=>block.trim()).filter(block=>!block.startsWith('[')&&!block.startsWith('배경:')).map(block=>block.match(/^([^:\n]+):\s*([\s\S]+)$/)).filter(Boolean).map(match=>[match[1],match[2]]);
  assert.deepEqual(Array.from(lines.filter(l=>l.speaker!=='내레이션'),l=>[l.speaker,l.text]),spoken);
  for(const line of lines.filter(l=>l.speaker==='소서러스'))assert.equal(line.artPath,'assets/avatars/mage.webp');
  for(const line of lines.filter(l=>l.speaker==='어둠의 소서러스'))assert.equal(line.artPath,'assets/novel/characters/char_dark_sorcerus_world5_standing.webp');
  assert.equal(new Set(lines.map(l=>l.sceneNumber)).size,3);
  assert.ok(lines.some(l=>l.shake));
  if(story.includes('백색 플래시'))assert.ok(lines.some(l=>l.flash));
  assert.doesNotMatch(lines.map(l=>l.text).join(' '),/연출 제안|BGM:|다음 스토리|world-6/);
  for(const line of lines)for(const path of [line.backgroundPath,line.artPath].filter(Boolean))assert.ok(readFileSync(new URL('../'+path,import.meta.url)).length);
  assert.match(source,/storyChapterFiveBossEnd:renderStoryChapterFiveBossEnd/);
});
