import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const window={};vm.runInNewContext(read('red-reaper-boss.js'),{window});
const boss=window.WORDORIA_RED_REAPER,source=read('crystal-game.js');
const words=Array.from({length:7},(_,i)=>['word'+i,'noun','뜻'+i]);
const shuffle=items=>[...items];
const state=()=>{const s={...boss.reset(),deck:boss.deck(words,shuffle),index:0,correct:0,hp:3,mp:2,elapsed:0};boss.board(s,shuffle);return s;};
const ids=items=>Array.from(items,item=>item.id);
const events=(s,ms,random=()=>1,clock=ms)=>Array.from(boss.advance(s,ms,random,clock));

test('red reaper has requested HP, timer, interval, chance and 10-second effect',()=>{
  assert.equal(boss.HP,120);assert.equal(boss.TIME_MS,340000);assert.equal(boss.INTERVAL_MS,20000);assert.equal(boss.SUCCESS_RATE,.6);assert.equal(boss.HALLUCINATION_MS,10000);
  assert.match(boss.INFO.description,/타락한 천사의 오른팔/);assert.match(boss.INFO.skillDescription,/0.3초.*0.5초/);
});
test('120-question deck exhausts unique cycles without adjacent repeats or duplicate board words',()=>{
  for(let size=5;size<36;size++){
    const pool=Array.from({length:size},(_,i)=>['w'+i,'n','k'+i]),deck=boss.deck(pool,items=>[...items].reverse());
    assert.equal(deck.length,120);
    for(let i=0;i<deck.length;i+=5)assert.equal(new Set(deck.slice(i,i+5).map(x=>x.entry[0])).size,5);
    for(let i=0;i+size<=deck.length;i+=size)assert.equal(new Set(deck.slice(i,i+size).map(x=>x.entry[0])).size,size);
    for(let i=1;i<deck.length;i++)assert.notEqual(deck[i-1].entry[0],deck[i].entry[0]);
  }
});
test('one roll every 20 seconds, 60 percent success boundary, no rerolls on ticks',()=>{
  const s=state();let rolls=0;
  events(s,19999,()=>{rolls++;return 0;});assert.equal(rolls,0);
  assert.ok(events(s,1,()=>{rolls++;return .59999;}).includes('cast-start'));assert.equal(rolls,1);assert.ok(events(s,200).includes('hallucination-start'));
  events(s,19799,()=>{rolls++;return 0;});assert.equal(rolls,1);
  assert.ok(!events(s,1,()=>{rolls++;return .6;}).includes('hallucination-start'));assert.equal(rolls,2);assert.ok(!events(s,200).includes('hallucination-start'));
});
test('left rotates down every 300ms and right up every 500ms while selected IDs remain stable',()=>{
  const s=state();events(s,20000,()=>0);events(s,200);s.selectedKo=2;
  events(s,299);assert.deepEqual(ids(s.matchKo),[0,1,2,3,4]);events(s,1);assert.deepEqual(ids(s.matchKo),[4,0,1,2,3]);
  events(s,199);assert.deepEqual(ids(s.matchEn),[0,1,2,3,4]);events(s,1);assert.deepEqual(ids(s.matchEn),[1,2,3,4,0]);assert.equal(s.selectedKo,2);
  assert.equal(boss.pick(s,'en',2,420),'correct');assert.equal(s.bossHp,120);
});
test('effect expires at 10 seconds with exact shift counts and no further movement',()=>{
  const s=state();events(s,20000,()=>0);events(s,200);const e=events(s,10000);
  assert.equal(e.filter(x=>x==='shift-left').length,33);assert.equal(e.filter(x=>x==='shift-right').length,20);assert.ok(e.includes('hallucination-end'));assert.equal(s.hallucinationMs,0);
  const before=JSON.stringify([s.matchKo,s.matchEn]);events(s,1000);assert.equal(JSON.stringify([s.matchKo,s.matchEn]),before);
});
test('pause freezes all state; ice time freezes interval and card motion but not contact reactions',()=>{
  const s=state();events(s,20000,()=>0);events(s,200);s.paused=true;const before=JSON.stringify(s);events(s,12000,()=>0);assert.equal(JSON.stringify(s),before);
  s.paused=false;s.iceTimeActive=true;const left=s.hallucinationMs,clock=s.reaperSkillElapsed;
  boss.pick(s,'ko',0,420);boss.pick(s,'en',0,420);events(s,420);
  assert.equal(s.bossHp,119);assert.equal(s.hallucinationMs,left);assert.equal(s.reaperSkillElapsed,clock);assert.equal(s.iceTimeActive,true);
});
test('wrong answer releases ice time, HP zero loses, and direct input is rejected during pause/attack',()=>{
  const s=state();s.iceTimeActive=true;s.hp=1;boss.pick(s,'ko',0,420);assert.equal(boss.pick(s,'en',1,420),'wrong');assert.equal(s.iceTimeActive,false);assert.equal(s.hp,0);
  assert.equal(boss.pick(s,'en',0,420),false);assert.ok(events(s,500).includes('defeat-player'));
  const p=state();p.paused=true;assert.equal(boss.pick(p,'ko',0,420),false);
});
test('damage occurs at contact and a five-pair group releases ice and preserves accelerated boss damage',()=>{
  const s=state();s.bossAttackSteps=2;s.iceTimeActive=true;
  for(let i=0;i<5;i++){boss.pick(s,'ko',i,420);boss.pick(s,'en',i,420);const hp=s.bossHp;events(s,419);assert.equal(s.bossHp,hp);events(s,1);assert.ok(s.bossHp<hp);events(s,300);}
  assert.equal(s.correct,10);assert.equal(s.index,10);assert.equal(s.answeredCorrect,5);assert.equal(s.iceTimeActive,false);boss.board(s,shuffle);assert.equal(s.matchKo[0].id,10);
});
test('last hit holds complete knockdown before victory and reset removes all old state',()=>{
  const s=state();s.correct=119;s.index=119;boss.pick(s,'ko',0,420);boss.pick(s,'en',0,420);events(s,420);assert.equal(s.bossHp,0);assert.equal(s.guardianVisual,'defeat');
  assert.ok(!events(s,999).includes('victory'));assert.ok(events(s,1).includes('victory'));assert.equal(s.guardianVisual,'defeat');assert.equal(s.hallucinationMs,0);
  const fresh=state();assert.equal(fresh.bossHp,120);assert.equal(fresh.reaperRolls,0);assert.equal(fresh.selectedKo,null);assert.equal(fresh.guardianPhase,'idle');
});
test('renderer provides matching cards, isolated energy gauge, three images and ice feedback',()=>{
  const run=state();run.reaperCastMs=700;run.hallucinationMs=10000;run.iceTimeActive=true;
  const c=vm.createContext({run,esc:String,royalSlimeTime:()=> '05:40',battleHeroMarkup:()=>'',storyVitalsMarkup:()=>'',iceTimeEffectMarkup:()=>'<i>ice field</i>',storyBattleActions:()=>'',passiveBannerMarkup:()=>''});
  vm.runInContext(source.slice(source.indexOf('  function renderRedReaperBattle('),source.indexOf('  function redReaperPick(')),c);
  const html=c.renderRedReaperBattle();assert.equal((html.match(/data-action="story-pick"/g)||[]).length,10);assert.match(html,/aria-valuenow="120"/);assert.match(html,/reaper-echo-left/);assert.match(html,/reaper-echo-right/);assert.match(html,/ice field/);assert.match(html,/hallucinating/);assert.ok(!html.includes('28%'));
});
test('only completed red reaper victory opens its ending, then atomic reward and retry UI',()=>{
  const pages=[],claims=[];const run={redReaper:true,guardian:true,done:false};
  const c=vm.createContext({timerId:0,nextTimer:0,run,go:p=>pages.push(p),persistStoryBattleVitals(){},clearInterval(){},clearTimeout(){},removeBattleReward(){},cancelSpeech(){},window,claimGuardianReward:()=>claims.push(true),page:'storyChapterFourBossEnd'});
  vm.runInContext(source.slice(source.indexOf('  function finishGuardianBattle('),source.indexOf('  async function claimGuardianReward(')),c);
  c.finishGuardianBattle(true,'boss-defeated');assert.deepEqual(pages,['storyChapterFourBossEnd']);assert.deepEqual(claims,[]);
  vm.runInContext(source.slice(source.indexOf('  function completeStoryDialogue('),source.indexOf('  function epilogueLines(')),c);c.completeStoryDialogue();assert.deepEqual(pages,['storyChapterFourBossEnd','bossResult']);assert.deepEqual(claims,[true]);
  const d=vm.createContext({run:{redReaper:true,clear:false},esc:String,deployedAssetUrl:x=>x,num:String});vm.runInContext(source.slice(source.indexOf('  function renderGuardianResult('),source.indexOf('  async function finishBattle(')),d);assert.match(d.renderGuardianResult(),/red-reaper-retry/);assert.ok(!d.renderGuardianResult().includes('HP'));
});
test('runtime timer freezes with ice, timeout loses, and stale done sessions do nothing',()=>{
  const run=state(),finished=[];run.elapsed=339990;const c=vm.createContext({run,window,updateWarriorSlash(){},document:{querySelector:()=>null},$:()=>null,finishBattle:(...x)=>finished.push(x),Math});
  vm.runInContext(source.slice(source.indexOf('  function advanceRedReaperBattle('),source.indexOf('  function darkIceTimeMarkup(')),c);
  run.iceTimeActive=true;c.advanceRedReaperBattle(1000);assert.equal(run.elapsed,339990);assert.deepEqual(finished,[]);
  run.iceTimeActive=false;c.advanceRedReaperBattle(1000);assert.equal(run.elapsed,340000);assert.deepEqual(finished,[[false,'timeout']]);run.done=true;const before=JSON.stringify(run);c.advanceRedReaperBattle(1000);assert.equal(JSON.stringify(run),before);
});
test('fractional browser ticks and pet clock deltas keep periodic rolls and rotations finite',()=>{
  const s=state();
  for(let i=0;i<2000;i++)events(s,33.3333333333333,()=>0,16.6666666666667);
  assert.equal(s.reaperRolls,1);assert.ok(s.hallucinationMs===0);assert.ok(s.reaperSkillElapsed>33333);
});
test('SD assets have exact runtime slots, genuine RGBA and final knockdown hold',()=>{
  for(const [action,count] of [['idle',2],['attack',3],['hit',3]]){
    const manifest=JSON.parse(read(`assets/monsters/red-reaper/red-reaper-sd-${action}-strip.json`));
    const png=readFileSync(new URL('../assets/monsters/red-reaper/'+manifest.image,import.meta.url));
    assert.equal(png.readUInt32BE(16),448*count);assert.equal(png.readUInt32BE(20),320);assert.equal(png[25],6);assert.equal(manifest.frameCount,count);assert.equal(manifest.anchor.y,.975);assert.equal(manifest.sourceFrameGapPx,50);
    const master=readFileSync(new URL(`../assets/monsters/red-reaper/review/${action}-spaced-master.png`,import.meta.url));assert.equal(master.readUInt32BE(16),count*448+(count-1)*50);
    if(action==='hit'){assert.equal(manifest.finalFrameHold,true);assert.equal(manifest.frameNames[2],'knockdown');}
    if(action==='attack')assert.equal(manifest.frames[1].skillContact,true);
  }
});
test('retry restores HP/MP and creates fresh timers, selections and boss state',()=>{
  const pages=[],c=vm.createContext({run:{redReaper:true,done:true,clear:false,hallucinationMs:10000},selectedStage:'story-ch4-20',selectedCharacter:{id:'hero',class:'mage'},stages:{'story-ch4-20':{redReaper:true,story:true,words}},storyStages:[{key:'story-ch4-20',chapter:4,number:20}],window,storyStagePlayable:()=>true,storyStageUnlocked:()=>true,storyRecoveryBusy:false,storyEntryAllowed:()=>{throw Error('failed retry must not require recovery')},clearInterval(){},clearTimeout(){},timerId:0,nextTimer:0,removeBattleReward(){},levelReady:()=>true,buildQuestionDeck:()=>boss.deck(words,shuffle),storyVitals:()=>({hp:0,hpMax:6,mp:0,mpMax:4}),reducedMotion:()=>false,bossAttackSteps:()=>1,initializeBattlePet(){},stageCleared:()=>false,prepareQuestion(){boss.board(c.run,shuffle);},closeDialog(){},go:p=>pages.push(p),tick(){}});
  vm.runInContext(source.slice(source.indexOf('  function startBattle('),source.indexOf('  function prepareQuestion(')),c);c.startBattle(true);
  assert.equal(c.run.hp,6);assert.equal(c.run.mp,4);assert.equal(c.run.bossHp,120);assert.equal(c.run.hallucinationMs,0);assert.equal(c.run.reaperRolls,0);assert.equal(c.run.elapsed,0);assert.equal(c.run.selectedKo,null);assert.equal(c.run.deck.length,120);assert.deepEqual(pages,['battle']);
});
test('MP potion enables Ice Time reuse after a wrong match releases it',async()=>{
  const run=state();Object.assign(run,{story:true,mp:1,mpMax:1});
  const c=vm.createContext({run,selectedCharacter:{id:'hero',class:'mage'},performance:{now:()=>0},render(){},setTimeout(){},document:{querySelector:()=>null},localMode:true,equippedPotions:()=>['blue'],potionTypes:{blue:{name:'마나 포션'}},potionInventory:{equipped_slot_1:'blue'},demoState:{},saveDemo(){},toast(){}});
  vm.runInContext(source.slice(source.indexOf('  function canActivateMageIceTime('),source.indexOf('  function updateWarriorSlash(')),c);
  vm.runInContext(source.slice(source.indexOf('  async function useStoryPotion('),source.indexOf('\n',source.indexOf('  async function useStoryPotion('))),c);
  c.activateMageIceTime();assert.equal(run.mp,0);assert.equal(run.iceTimeActive,true);
  boss.pick(run,'ko',0,420);boss.pick(run,'en',1,420);events(run,500);assert.equal(run.iceTimeActive,false);
  await c.useStoryPotion(0,{disabled:false});assert.equal(run.mp,1);c.activateMageIceTime();assert.equal(run.mp,0);assert.equal(run.iceTimeActive,true);
});

test('all five pairs can be selected during the first attack and resolve once in order',()=>{
  const run=state(),spoken=[],finished=[];
  const c=vm.createContext({run,window,performance:{now:()=>0},battleContactDelay:()=>420,speak:x=>spoken.push(x),updateWarriorSlash(){},document:{querySelector:()=>null,querySelectorAll:()=>[],dispatchEvent(){}},$:()=>null,CustomEvent:class{},Math,royalSlimeTime:()=>'',prepareQuestion(){boss.board(run,shuffle);},finishBattle:(...x)=>finished.push(x),render(){c.refreshStorySelections();}});
  vm.runInContext(source.slice(source.indexOf('  function refreshStorySelections('),source.indexOf('  function storyAttackDuration(')),c);
  vm.runInContext(source.slice(source.indexOf('  function redReaperPick('),source.indexOf('  function darkIceTimeMarkup(')),c);
  c.storyPick=button=>c.redReaperPick(button);
  const pick=(side,id)=>c.redReaperPick({dataset:{side,id:String(id)}});
  pick('ko',0);pick('en',0);
  // The current pair cannot be queued again; other pairs remain selectable.
  pick('ko',0);assert.equal(run.selectedKo,null);
  for(let id=1;id<5;id++){pick('ko',id);pick('en',id);}
  assert.equal(run.queuedStoryPairs.length,4);assert.equal(run.correct,0);assert.equal(run.bossHp,120);
  // Hallucination changes display order, never the queued card identities.
  run.hallucinationMs=10000;
  for(let id=0;id<5;id++){
    c.advanceRedReaperBattle(419);assert.equal(run.correct,id);
    c.advanceRedReaperBattle(1);assert.equal(run.correct,id+1);assert.equal(run.bossHp,119-id);
    c.advanceRedReaperBattle(300);
  }
  assert.equal(run.queuedStoryPairs.length,0);assert.equal(run.index,5);assert.equal(run.matchKo[0].id,5);
  assert.equal(spoken.length,5);assert.deepEqual(finished,[]);
});

test('queued wrong pair waits for preceding contact and retry clears the queue',()=>{
  const run=state();boss.pick(run,'ko',0,420);boss.pick(run,'en',0,420);
  const c=vm.createContext({run,document:{querySelectorAll:()=>[]}});
  vm.runInContext(source.slice(source.indexOf('  function refreshStorySelections('),source.indexOf('  function storyAttackDuration(')),c);
  c.queueStorySelection({dataset:{side:'ko',id:'1'}});c.queueStorySelection({dataset:{side:'en',id:'2'}});
  assert.equal(run.hp,3);events(run,720);assert.equal(run.correct,1);
  c.storyPick=button=>boss.pick(run,button.dataset.side,Number(button.dataset.id),420);
  assert.equal(c.playQueuedStoryPair(),true);assert.equal(run.hp,2);assert.equal(run.guardianPhase,'wrong');
  boss.clear(run);assert.equal(run.queuedStoryPairs.length,0);
});

test('sway leaves energy stationary, pauses with Ice Time, and respects reduced motion',()=>{
  const css=read('crystal-game.css');
  assert.match(css,/@keyframes reaper-drift[^\n]+translateX\(-1cm\)[^\n]+translateX\(1cm\)/);
  assert.match(css,/\.reaper-body\{animation:reaper-drift 8s ease-in-out infinite/);
  assert.match(css,/ice-time-active \.reaper-body[^\n]+animation-play-state:paused/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\.red-reaper-arena \.reaper-body\{animation:none/);
});

test('card buttons stay enabled during attack except current and queued correct pairs',()=>{
  const run=state();boss.pick(run,'ko',0,420);boss.pick(run,'en',0,420);run.queuedStoryPairs.push({ko:1,en:1});
  const buttons=Array.from({length:5},(_,id)=>({dataset:{id:String(id),side:'ko'},classList:{toggle(){}},disabled:false}));
  const c=vm.createContext({run,document:{querySelectorAll:()=>buttons}});
  vm.runInContext(source.slice(source.indexOf('  function refreshStorySelections('),source.indexOf('  function queueStorySelection(')),c);
  c.refreshStorySelections();assert.deepEqual(buttons.map(x=>x.disabled),[true,true,false,false,false]);
  run.paused=true;c.refreshStorySelections();assert.ok(buttons.every(x=>x.disabled));
  run.paused=false;run.stunned=true;c.refreshStorySelections();assert.ok(buttons.every(x=>x.disabled));
});

test('local first reward and result display are 500, replay grants zero',async()=>{
  const c=vm.createContext({run:{guardian:true,redReaper:true,clear:true,correct:120,bossMaxHp:120,bossHp:0,elapsed:1000},localMode:true,selectedStage:'story-ch4-20',selectedCharacter:{id:'hero',coins:0},player:'guest',demoState:{records:[]},records:[],stageRecordName:()=> '스토리 4장 20 · 환각의 숲과 버려진 성',render(){},saveDemo(){},toast(){},page:'bossResult',esc:String,num:String,deployedAssetUrl:x=>x});
  vm.runInContext(source.slice(source.indexOf('  async function claimGuardianReward('),source.indexOf('  async function finishBattle(')),c);
  assert.match(c.renderGuardianResult(),/\+500 크리스털/);
  await c.claimGuardianReward();assert.equal(c.run.bossReward,500);assert.equal(c.selectedCharacter.coins,500);assert.equal(c.demoState.records[0].coins_earned,500);
  delete c.run.bossReward;await c.claimGuardianReward();assert.equal(c.run.bossReward,0);assert.equal(c.selectedCharacter.coins,500);
});

test('successful hallucination holds casting clones after cast ends and releases at effect end',()=>{
  const run=state(),classes=new Map();
  const arena={style:{setProperty(){}},classList:{toggle:(name,on)=>classes.set(name,on)}};
  const c=vm.createContext({run,window,Math,esc:String,royalSlimeTime:()=>'',battleHeroMarkup:()=>'',storyVitalsMarkup:()=>'',iceTimeEffectMarkup:()=>'',storyBattleActions:()=>'',passiveBannerMarkup:()=>'',updateWarriorSlash(){},syncReaperCards(){},document:{querySelector:()=>null,querySelectorAll:()=>[]},$:id=>id==='arena'?arena:null});
  vm.runInContext(source.slice(source.indexOf('  function renderRedReaperBattle('),source.indexOf('  function redReaperPick(')),c);
  vm.runInContext(source.slice(source.indexOf('  function advanceRedReaperBattle('),source.indexOf('  function darkIceTimeMarkup(')),c);
  events(run,20000,()=>0);events(run,200);c.advanceRedReaperBattle(500);
  assert.equal(run.reaperCastMs,0);assert.ok(run.hallucinationMs>0);assert.equal(classes.get('reaper-casting'),true);
  assert.match(c.renderRedReaperBattle(),/red-reaper-arena[^"\n]*reaper-casting/);assert.match(c.renderRedReaperBattle(),/--reaper-cast-delay:-700ms/);
  c.advanceRedReaperBattle(9499);assert.equal(classes.get('reaper-casting'),true);
  c.advanceRedReaperBattle(1);assert.equal(run.hallucinationMs,0);assert.equal(classes.get('reaper-casting'),false);
  assert.doesNotMatch(c.renderRedReaperBattle(),/red-reaper-arena[^"\n]*reaper-casting/);
  const failed=state();events(failed,20000,()=>.9);events(failed,700);assert.equal(failed.reaperCastMs,0);assert.equal(failed.hallucinationMs,0);
});
