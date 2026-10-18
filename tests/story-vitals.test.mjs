import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
const helpers=source.slice(source.indexOf('  const storyVitalsCache='),source.indexOf('  function potionShopCard('));
function setup(storage=new Map(),local=true){
  const c=vm.createContext({storyBranchAllowed:()=>true,initializeBattlePet(){},stats:()=>({level:1}),combatStats:()=>({hp:100,mp:100}),bossAttackSteps:()=>1,selectedCharacter:{id:'hero',class:'mage'},localMode:local,demoKey:'test',accountUserId:'user',localStateStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},potionInventory:{red_potion_count:2,blue_potion_count:1,equipped_slot_1:null,equipped_slot_2:'blue'},demoState:{},run:null,walletBalance:()=>100,modal:html=>c.modalHtml=html,toast:message=>c.message=message,esc:String,saveDemo(){},console:{error(){}},render(){},closeDialog(){},go:page=>c.page=page,performance:{now:()=>1000},reducedMotion:()=>true,storyStageArmedKey:null,storyMapMoveUntil:0,selectedStoryStage:'one',selectedStoryWorld:1,selectedStage:'one',storyStages:[{key:'one',number:1},{key:'two',number:2},{key:'boss',chapter:1,number:7},{key:'guardian',chapter:2,number:7}],storyStageUnlocked:()=>true,levelReady:()=>true,stageCleared:()=>false,stages:{one:{story:true,words:[]},two:{story:true,words:[]},boss:{story:true,words:Array.from({length:5},(_,i)=>['word'+i,'n','뜻'+i])},guardian:{story:true,guardian:true,words:[]},survival:{words:[]}},clearInterval(){},clearTimeout(){},timerId:null,nextTimer:null,removeBattleReward(){},cancelSpeech(){},buildQuestionDeck:()=>[],prepareQuestion(){},tick(){},shuffle:items=>items.slice(),window:{WORDORIA_GUARDIAN:{reset:()=>({guardian:true,bossHp:60})}},pendingStoryRun:null});
  vm.runInContext(helpers,c);
  vm.runInContext(source.slice(source.indexOf('  function selectStoryStage('),source.indexOf('  function renderStages(')),c);
  vm.runInContext(source.slice(source.indexOf('  function startBattle('),source.indexOf('  function prepareQuestion(')),c);
  vm.runInContext(source.slice(source.indexOf('  const ROYAL_SLIME_REWARD='),source.indexOf('  function prepareRoyalSlimeBoard(')),c);
  c.prepareRoyalSlimeBoard=()=>{};
  return c;
}
test('first play is full; HP 1 / MP 0 persists to another stage and after reload',()=>{
  const storage=new Map(),c=setup(storage);c.startBattle();assert.equal(c.run.hp,2);assert.equal(c.run.mp,2);
  c.run.hp=1;c.run.mp=0;c.persistStoryBattleVitals();c.run.done=true;c.selectedStage='two';c.startBattle();assert.equal(c.run.hp,1);assert.equal(c.run.mp,0);
  const reload=setup(storage);reload.startBattle();assert.equal(reload.run.hp,1);assert.equal(reload.run.mp,0);
});
test('vitals are separate for characters, users and demo/production, independent of stage',()=>{
  const storage=new Map(),c=setup(storage);c.saveStoryVitals({hp:0,mp:0});c.selectedCharacter.id='other';assert.equal(c.storyVitals().hp,2);
  c.selectedCharacter.id='hero';assert.equal(c.storyVitals().hp,0);c.demoKey='another-demo';assert.equal(c.storyVitals().hp,2);
  const account=setup(storage,false);account.saveStoryVitals({hp:1,mp:0});account.accountUserId='other-user';assert.equal(account.storyVitals().hp,2);
});
test('HP 0 blocks first click, confirmation, dialogue entry and retries for all battle types',()=>{
  for(const key of ['one','boss','guardian']){
    const c=setup();c.saveStoryVitals({hp:0,mp:0});c.selectStoryStage(key);assert.match(c.modalHtml,/HP가 0/);assert.match(c.modalHtml,/×2/);
    c.confirmStoryStage(key);assert.equal(c.page,undefined);c.startStoryStage(key);assert.equal(c.page,undefined);
    c.selectedStage=key;c.startBattle();assert.equal(c.run,null);c.startRoyalSlimeBattle();assert.equal(c.run,null);
  }
});
test('both bosses start with saved vitals; surviving retry does not refill',()=>{
  for(const key of ['boss','guardian']){
    const c=setup();c.saveStoryVitals({hp:1,mp:0});c.selectedStage=key;c.startBattle();assert.equal(c.run.hp,1);assert.equal(c.run.mp,0);
    assert.equal(Boolean(c.run.boss||c.run.guardian),true);c.run.done=true;c.startBattle();assert.equal(c.run.hp,1);assert.equal(c.run.mp,0);
  }
});
test('all boss retries require recovery and preserve HP/MP after potion use, before and after first clear',async()=>{
  for(const local of [true,false])for(const cleared of [false,true])for(const kind of ['guardian','blackDragon','shadowSorceress','redReaper','sorcerus','lichDragon']){
    const [chapter,number]={guardian:[2,7],blackDragon:[3,8],shadowSorceress:[4,10],redReaper:[4,20],sorcerus:[5,10],lichDragon:[5,20]}[kind];
    const c=setup(new Map(),local),key=`story-ch${chapter}-${number}`;
    c.selectedStage=key;c.storyStages.push({key,chapter,number});
    c.stages[key]={story:true,[kind]:true,words:[]};c.stageCleared=stage=>cleared&&stage===key;
    c.window[{guardian:'WORDORIA_GUARDIAN',blackDragon:'WORDORIA_BLACK_DRAGON',shadowSorceress:'WORDORIA_SHADOW_SORCERESS',redReaper:'WORDORIA_RED_REAPER',sorcerus:'WORDORIA_SORCERUS',lichDragon:'WORDORIA_LICH_DRAGON'}[kind]]={reset:()=>({guardian:true,[kind]:true,bossHp:100})};
    c.saveStoryVitals({hp:1,mp:0});c.startBattle();
    assert.equal(c.run.hp,1);assert.equal(c.run.mp,0);assert.equal(c.run.storyReplay,cleared);
    c.run.hp=0;c.run.done=true;c.run.clear=false;c.persistStoryBattleVitals();const failed=c.run;
    c.startBattle(true);
    assert.equal(c.run,failed);assert.equal(c.storyVitals().hp,0);assert.equal(c.storyVitals().mp,0);
    assert.match(c.modalHtml,/HP가 0/);
    c.rpc=async name=>name==='equip_story_potions'?[{...c.potionInventory,red_potion_count:1,equipped_slot_1:'red'}]:'red';
    await c.recoverStoryHp(key,{});
    c.startBattle(true);
    assert.notEqual(c.run,failed);assert.equal(c.run.hp,1);assert.equal(c.run.mp,0);
    assert.equal(c.run.elapsed,0);assert.equal(c.run.done,false);assert.equal(c.run.storyReplay,cleared);
    // A timeout retry with remaining HP must also retain spent MP.
    c.run.done=true;c.run.clear=false;c.persistStoryBattleVitals();c.startBattle(true);
    assert.equal(c.run.hp,1);assert.equal(c.run.mp,0);
  }
});

test('survival stays independent and stale runs cannot save to another character',()=>{
  const c=setup();c.saveStoryVitals({hp:0,mp:0});c.selectedStage='survival';c.startBattle();assert.equal(c.run.hp,2);assert.equal(c.run.mp,2);assert.equal(c.storyVitals().hp,0);
  c.run={story:true,storyCharacterId:'other',hp:2,mp:2};c.persistStoryBattleVitals();assert.equal(c.storyVitals().hp,0);
});
test('local recovery consumes one stored or equipped potion and retains MP 0',async()=>{
  for(const equipped of [false,true]){
    const c=setup();c.saveStoryVitals({hp:0,mp:0});if(equipped)c.potionInventory.equipped_slot_1='red';
    const count=c.storyHealingCount();await c.recoverStoryHp('two',{});assert.equal(c.storyHealingCount(),count-1);assert.equal(c.storyVitals().hp,1);assert.equal(c.storyVitals().mp,0);
    assert.match(c.modalHtml,/스테이지 입장/);c.startStoryStage('two');assert.equal(c.page,'battle');assert.equal(c.run.hp,1);
  }
});
test('no potion leaves HP 0 and disables recovery',async()=>{
  const c=setup();c.saveStoryVitals({hp:0,mp:0});c.potionInventory.red_potion_count=0;c.showStoryRecovery('one');assert.match(c.modalHtml,/data-action="story-recover"[^>]*disabled/);
  await c.recoverStoryHp('one',{});assert.equal(c.storyVitals().hp,0);
});
test('server recovery uses existing owned loadout and consumption RPCs exactly once',async()=>{
  const c=setup(new Map(),false),calls=[];c.saveStoryVitals({hp:0,mp:0});
  c.rpc=async(name,args)=>{calls.push({name,args});return name==='equip_story_potions'?[{...c.potionInventory,red_potion_count:1,equipped_slot_1:'red'}]:'red';};
  const first=c.recoverStoryHp('one',{});await c.recoverStoryHp('one',{});await first;
  assert.deepEqual(calls.map(x=>x.name),['equip_story_potions','use_story_potion']);assert.equal(calls[1].args.p_slot_index,1);assert.equal(c.storyVitals().hp,1);assert.equal(c.storyHealingCount(),1);
});
test('failed server consumption keeps HP 0 and potion equipped for retry',async()=>{
  const c=setup(new Map(),false);c.saveStoryVitals({hp:0,mp:0});c.rpc=async name=>{if(name==='equip_story_potions')return [{...c.potionInventory,red_potion_count:1,equipped_slot_1:'red'}];throw new Error('offline');};
  await c.recoverStoryHp('one',{});assert.equal(c.storyVitals().hp,0);assert.equal(c.storyHealingCount(),2);
  c.rpc=async name=>{assert.equal(name,'use_story_potion');return 'red';};await c.recoverStoryHp('one',{});assert.equal(c.storyVitals().hp,1);assert.equal(c.storyHealingCount(),1);
});
test('all battle finish paths save depleted vitals before result or dialogue',async()=>{
  for(const kind of ['normal','boss','guardian']){
    const c=setup();c.run={story:true,storyCharacterId:'hero',hp:0,mp:0,boss:kind==='boss',guardian:kind==='guardian'};
    c.storyDialogueIndex=0;c.saveBattleResult=async()=>{};c.document={dispatchEvent(){}};c.CustomEvent=class{};
    for(const [start,end] of [['  function finishRoyalSlimeBattle(','  function completeRoyalSlimeVictoryStory('],['  function finishGuardianBattle(','  async function claimGuardianReward('],['  async function finishBattle(','  async function saveBattleResult(']])vm.runInContext(source.slice(source.indexOf(start),source.indexOf(end)),c);
    await c.finishBattle(false,'hp-zero');assert.equal(c.storyVitals().hp,0);assert.equal(c.storyVitals().mp,0);assert.equal(c.run.done,true);
  }
});

test('recovery from inventory preserves two equipped mana potions',async()=>{
  for(const local of [true,false]){
    const c=setup(new Map(),local);c.saveStoryVitals({hp:0,mp:0});c.potionInventory.equipped_slot_1='blue';const before=c.potionInventory.blue_potion_count;
    c.rpc=async(name,args)=>{if(name==='use_story_potion')return 'red';return [{...c.potionInventory,red_potion_count:1,blue_potion_count:args.p_slots[0]==='red'?before+1:before,equipped_slot_1:args.p_slots[0],equipped_slot_2:args.p_slots[1]}];};
    await c.recoverStoryHp('one',{});assert.equal(c.storyVitals().hp,1);assert.equal(c.potionInventory.equipped_slot_1,'blue');assert.equal(c.potionInventory.equipped_slot_2,'blue');assert.equal(c.potionInventory.blue_potion_count,before);
  }
});

test('production JSON potion response recovers HP 0 through the real HTTP RPC wrapper',async()=>{
  for(const equipped of [false,true]){
    const storage=new Map(),c=setup(storage,false),requests=[];c.saveStoryVitals({hp:0,mp:0});
    if(equipped)c.potionInventory.equipped_slot_1='red';
    const before=c.storyHealingCount();
    Object.assign(c,{accountMode:true,DB_URL:'https://test.invalid',DB_KEY:'test-key',accountSession:{access_token:'test-token'},window:{WORDORIA_AUTH_CLIENT:{auth:{getSession:async()=>({data:{session:{user:{id:c.accountUserId},access_token:'test-token'}}})}}},fetchWithTimeout:async(url,options)=>{
      requests.push({url,body:JSON.parse(options.body)});
      const inventory={red_potion_count:equipped?2:1,blue_potion_count:1,equipped_slot_1:'red',equipped_slot_2:'blue'};
      const result=url.endsWith('/equip_story_potions')?[inventory]:{...inventory,type:'red',equipped_slot_1:null};
      return {ok:true,text:async()=>JSON.stringify(result)};
    }});
    vm.runInContext(source.slice(source.indexOf('  async function headers('),source.indexOf('  const characterDef =')),c);
    await c.recoverStoryHp('two',{});
    assert.equal(c.storyVitals().hp,1);assert.equal(c.storyVitals().mp,0);assert.equal(c.storyHealingCount(),before-1);
    assert.equal(c.potionInventory.equipped_slot_1,null);assert.equal(c.potionInventory.equipped_slot_2,'blue');assert.match(c.modalHtml,/스테이지 입장/);
    assert.equal(requests.filter(request=>request.url.endsWith('/use_story_potion')).length,1);
    c.startStoryStage('two');assert.equal(c.page,'battle');assert.equal(c.run.hp,1);assert.equal(c.run.mp,0);
    assert.equal(setup(storage,false).storyVitals().hp,1);
  }
});

test('wrong potion response cannot recover HP',async()=>{
  const c=setup(new Map(),false);c.saveStoryVitals({hp:0,mp:0});c.potionInventory.equipped_slot_1='red';
  c.rpc=async()=>({type:'blue',red_potion_count:2,blue_potion_count:1,equipped_slot_1:null,equipped_slot_2:'blue'});
  await c.recoverStoryHp('one',{});assert.equal(c.storyVitals().hp,0);assert.match(c.message,/사용하지 못했어요/);
});


test('mana recovery at HP zero consumes one blue potion and preserves HP and red loadout',async()=>{
  for(const local of [true,false]){
    const c=setup(new Map(),local);c.saveStoryVitals({hp:0,mp:0});
    c.potionInventory={red_potion_count:2,blue_potion_count:1,equipped_slot_1:'red',equipped_slot_2:'red'};
    c.rpc=async(name,args)=>{
      if(name==='use_story_potion')return {...c.potionInventory,type:'blue',equipped_slot_1:null};
      return [{...c.potionInventory,red_potion_count:args.p_slots[0]==='blue'?3:2,blue_potion_count:0,equipped_slot_1:args.p_slots[0],equipped_slot_2:args.p_slots[1]}];
    };
    await c.recoverStoryHp('one',{},'blue');
    assert.equal(c.storyVitals().hp,0);assert.equal(c.storyVitals().mp,1);
    assert.equal(c.storyPotionCount('blue'),0);assert.equal(c.storyPotionCount('red'),4);
    assert.equal(c.potionInventory.equipped_slot_1,'red');assert.equal(c.potionInventory.equipped_slot_2,'red');
    assert.match(c.modalHtml,/data-potion="blue"/);assert.doesNotMatch(c.modalHtml,/story-enter-confirm/);
  }
});

test('equipment recovery offers both purchases and does not consume potions at full vitals',async()=>{
  const c=setup();c.showStoryRecovery();assert.match(c.modalHtml,/힐링포션 구매/);assert.match(c.modalHtml,/마나포션 구매/);
  assert.doesNotMatch(c.modalHtml,/story-enter-confirm/);
  const before=JSON.stringify(c.potionInventory);await c.recoverStoryHp('',{},'blue');await c.recoverStoryHp('',{},'red');
  assert.equal(JSON.stringify(c.potionInventory),before);
});

test('collection potions show total counts and offer equip and use at HP zero',async()=>{
  const c=setup();
  vm.runInContext(source.slice(source.indexOf('  function inventoryQuantityMarkup('),source.indexOf('  function renderOwnedItemCard(')),c);
  vm.runInContext(source.slice(source.indexOf('  function potionCollectionCard('),source.indexOf('  function renderGear(')),c);
  c.saveStoryVitals({hp:0,mp:0});
  assert.match(c.potionCollectionCard('red'),/x2/);
  assert.match(c.potionCollectionCard('blue'),/x2/);
  c.showPotionCollection('blue');
  assert.match(c.modalHtml,/data-action="potion-collection-equip"/);
  assert.match(c.modalHtml,/data-action="story-recover"[^>]*>사용하기/);
  c.setPotionLoadout=async(index,type)=>{assert.equal(index,0);assert.equal(type,'red');};
  await c.equipPotionToEmptySlot('red',{});
  c.saveStoryVitals({hp:2,mp:2});c.showPotionCollection('blue');
  assert.match(c.modalHtml,/data-action="story-recover"[^>]*disabled/);
});

function accountSetup(storage=new Map(),server=new Map()){
  const c=setup(storage,false);
  c.accountMode=true;c.allCharacters=[c.selectedCharacter];
  c.apiGet=async()=>Array.from(server,([character_id,vitals])=>({character_id,...vitals}));
  c.apiPost=async(path,row)=>{server.set(row.character_id,{hp:row.hp,mp:row.mp});};
  vm.runInContext(source.slice(source.indexOf('  async function signOut('),source.indexOf('  async function switchPlayer(')),c);
  c.sessionStorage={removeItem(){}};
  c.window.WORDORIA_AUTH_CLIENT={auth:{signOut:async()=>{c.signedOut=true;}}};
  c.location={reload(){c.reloaded=true;}};
  return c;
}
test('logout saves live HP/MP before auth removal; fresh login restores server vitals without browser storage',async()=>{
  const server=new Map(),c=accountSetup(new Map(),server);
  c.run={story:true,storyCharacterId:'hero',hp:0,mp:0};
  c.window.WORDORIA_AUTH_CLIENT.auth.signOut=async()=>{
    assert.deepEqual(server.get('hero'),{hp:0,mp:0});c.signedOut=true;
  };
  await c.signOut();assert.equal(c.signedOut,true);assert.equal(c.reloaded,true);
  const login=accountSetup(new Map(),server);await login.loadAccountStoryVitals();
  assert.equal(login.storyVitals().hp,0);assert.equal(login.storyVitals().mp,0);
});
test('failed save prevents logout and preserves pending vitals for retry and next login',async()=>{
  const storage=new Map(),server=new Map(),c=accountSetup(storage,server);
  c.apiPost=async()=>{throw new Error('offline');};
  c.run={story:true,storyCharacterId:'hero',hp:1,mp:0};
  await c.signOut();assert.equal(c.signedOut,undefined);assert.equal(c.reloaded,undefined);
  assert.match(c.message,/저장하지 못했어요/);
  assert.equal(JSON.parse(storage.get('wordoria-story-vitals-v1:user:hero')).pending,true);
  const login=accountSetup(storage,server);server.set('hero',{hp:2,mp:2});
  await login.loadAccountStoryVitals();assert.equal(login.storyVitals().hp,1);assert.equal(login.storyVitals().mp,0);
  assert.deepEqual(server.get('hero'),{hp:1,mp:0});
  assert.equal(JSON.parse(storage.get('wordoria-story-vitals-v1:user:hero')).pending,undefined);
});
test('remote vitals override stale synced local data, and old browser-only records migrate once',async()=>{
  const storage=new Map(),server=new Map(),c=accountSetup(storage,server);
  storage.set('wordoria-story-vitals-v1:user:hero',JSON.stringify({hp:1,mp:0}));
  await c.loadAccountStoryVitals();assert.deepEqual(server.get('hero'),{hp:1,mp:0});
  server.set('hero',{hp:0,mp:1});
  const login=accountSetup(storage,server);await login.loadAccountStoryVitals();
  assert.equal(login.storyVitals().hp,0);assert.equal(login.storyVitals().mp,1);
});
test('serialized writes retain latest vitals and captured character when selection changes',async()=>{
  const server=new Map(),c=accountSetup(new Map(),server);let release;
  c.apiPost=async(path,row)=>{if(!release)await new Promise(resolve=>{release=resolve;});server.set(row.character_id,{hp:row.hp,mp:row.mp});};
  c.saveStoryVitals({hp:2,mp:1});c.saveStoryVitals({hp:1,mp:0});
  c.selectedCharacter={id:'other',class:'mage'};c.saveStoryVitals({hp:0,mp:0});
  release();await c.flushStoryVitals();
  assert.deepEqual(server.get('hero'),{hp:1,mp:0});assert.deepEqual(server.get('other'),{hp:0,mp:0});
});
test('unchanged renders do not write to server again',async()=>{
  const c=accountSetup();let calls=0;c.apiPost=async()=>{calls++;};
  c.saveStoryVitals({hp:1,mp:0});await c.flushStoryVitals();
  c.saveStoryVitals({hp:1,mp:0});await c.flushStoryVitals();assert.equal(calls,1);
});
test('logout after post-battle potion recovery cannot overwrite recovery with the completed run',async()=>{
  const server=new Map(),c=accountSetup(new Map(),server);
  c.run={story:true,storyCharacterId:'hero',done:true,hp:0,mp:0};
  c.saveStoryVitals({hp:1,mp:1});await c.signOut();
  assert.deepEqual(server.get('hero'),{hp:1,mp:1});assert.equal(c.reloaded,true);
});
