import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
const helpers=source.slice(source.indexOf('  const storyVitalsCache='),source.indexOf('  function potionShopCard('));
function setup(storage=new Map(),local=true){
  const c=vm.createContext({selectedCharacter:{id:'hero',class:'mage'},localMode:local,demoKey:'test',accountUserId:'user',localStateStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},potionInventory:{red_potion_count:2,blue_potion_count:1,equipped_slot_1:null,equipped_slot_2:'blue'},demoState:{},run:null,modal:html=>c.modalHtml=html,toast:message=>c.message=message,esc:String,saveDemo(){},console:{error(){}},render(){},closeDialog(){},go:page=>c.page=page,performance:{now:()=>1000},reducedMotion:()=>true,storyStageArmedKey:null,storyMapMoveUntil:0,selectedStoryStage:'one',selectedStoryWorld:1,selectedStage:'one',storyStages:[{key:'one',number:1},{key:'two',number:2},{key:'boss',chapter:1,number:7},{key:'guardian',chapter:2,number:7}],storyStageUnlocked:()=>true,levelReady:()=>true,stageCleared:()=>false,stages:{one:{story:true,words:[]},two:{story:true,words:[]},boss:{story:true,words:Array.from({length:5},(_,i)=>['word'+i,'n','뜻'+i])},guardian:{story:true,guardian:true,words:[]},survival:{words:[]}},clearInterval(){},clearTimeout(){},timerId:null,nextTimer:null,removeBattleReward(){},cancelSpeech(){},buildQuestionDeck:()=>[],prepareQuestion(){},tick(){},shuffle:items=>items.slice(),window:{WORDORIA_GUARDIAN:{reset:()=>({guardian:true,bossHp:60})}},pendingStoryRun:null});
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
    Object.assign(c,{DB_URL:'https://test.invalid',DB_KEY:'test-key',accountSession:{access_token:'test-token'},fetchWithTimeout:async(url,options)=>{
      requests.push({url,body:JSON.parse(options.body)});
      const inventory={red_potion_count:equipped?2:1,blue_potion_count:1,equipped_slot_1:'red',equipped_slot_2:'blue'};
      const result=url.endsWith('/equip_story_potions')?[inventory]:{...inventory,type:'red',equipped_slot_1:null};
      return {ok:true,text:async()=>JSON.stringify(result)};
    }});
    vm.runInContext(source.slice(source.indexOf('  function headers('),source.indexOf('  const characterDef =')),c);
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
