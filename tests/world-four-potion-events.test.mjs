import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,existsSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const source=read('crystal-game.js');
const window={};vm.runInNewContext(read('story-novel.js'),{window});
function setup(cleared=4){
  const c=vm.createContext({selectedStoryWorld:4,selectedCharacter:{id:'hero'},player:'guest',
    localMode:true,accountMode:false,dbOnline:true,worldFourPotionClaims:new Set(),storyPotionEvent:null,
    storyDialogueIndex:0,page:'story',window,storyStageArmedKey:null,storyMapMoveUntil:0,
    potionInventory:{red_potion_count:2,blue_potion_count:1,equipped_slot_1:'red',equipped_slot_2:'blue'},
    demoState:{potionInventory:{}},saveDemo(){},renders:0,render(){c.renders++;},messages:[],toast:message=>c.messages.push(message),
    pages:[],go:page=>{c.page=page;c.pages.push(page);},
    cleared:new Set(Array.from({length:cleared},(_,i)=>`story-ch4-${i+1}`)),stageCleared:key=>c.cleared.has(key),
    renderStoryScene:lines=>JSON.stringify(lines),apiGet:async()=>[],rpc:async()=>{throw Error('offline');}});
  vm.runInContext(source.slice(source.indexOf('  async function loadWorldFourPotionClaims('),source.indexOf('  async function refresh(')),c);
  vm.runInContext(source.slice(source.indexOf('  function completeStoryDialogue('),source.indexOf('  function epilogueLines(')),c);
  return c;
}

test('discoveries are fixed to 4, 8, 12, 16 and require the cleared prefix, never stage 20',()=>{
  for(let cleared=0;cleared<=20;cleared++){
    const c=setup(cleared),ready=[4,8,12,16].filter(n=>n<=cleared);
    for(const milestone of ready){assert.equal(c.beginWorldFourPotionEvent(),true);assert.equal(c.storyPotionEvent.milestone,milestone);c.worldFourPotionClaims.add(milestone);}
    assert.equal(c.beginWorldFourPotionEvent(),false);
  }
  const gap=setup(8);gap.cleared.delete('story-ch4-3');assert.equal(gap.beginWorldFourPotionEvent(),false);
  const other=setup(20);other.selectedStoryWorld=3;assert.equal(other.beginWorldFourPotionEvent(),false);
  other.selectedStoryWorld=4;other.selectedCharacter=null;assert.equal(other.beginWorldFourPotionEvent(),false);
});

test('each fixed milestone has a distinct complete story and existing runtime backgrounds',()=>{
  const events=JSON.parse(read('assets/novel/world-4-potion-events.json'));
  assert.deepEqual(Object.keys(events),['4','8','12','16']);
  for(const milestone of Object.keys(events)){
    const lines=window.WORDORIA_NOVELS[`world4Potion${milestone}`];assert.equal(lines.length,6);
    assert.match(lines.at(-1).text,/힐링포션 3개/);
    for(const line of lines){assert.ok(line.speaker&&line.text&&line.location);assert.ok(existsSync(new URL('../'+line.backgroundPath,import.meta.url)));}
    const c=setup(Number(milestone));c.worldFourPotionClaims=new Set([4,8,12,16].filter(n=>n<Number(milestone)));
    c.beginWorldFourPotionEvent();c.page='storyPotionEvent';assert.equal(c.storyDialogueLines(),lines);assert.match(c.renderStoryPotionEvent(),/힐링포션/);
  }
});

test('entering story redirects to the pending event before rendering the map',()=>{
  const c=setup();Object.assign(c,{guestMode:true,$:()=>({focus(){},scrollTo(){}})});c.window.scrollTo=()=>{};
  vm.runInContext(source.slice(source.indexOf('  function go('),source.indexOf('  function navigate(')),c);
  c.go('story');assert.equal(c.page,'storyPotionEvent');assert.equal(c.storyDialogueIndex,0);
  c.worldFourPotionClaims.add(4);c.go('story');assert.equal(c.page,'story');
});

test('claim adds exactly three bag potions, preserves equipped potions and survives local reload/character changes',async()=>{
  const c=setup();c.beginWorldFourPotionEvent();c.page='storyPotionEvent';
  await c.claimWorldFourPotionEvent();assert.equal(c.potionInventory.red_potion_count,5);
  assert.equal(c.potionInventory.blue_potion_count,1);assert.equal(c.potionInventory.equipped_slot_1,'red');assert.equal(c.potionInventory.equipped_slot_2,'blue');
  assert.equal(c.page,'story');assert.equal(c.storyPotionEvent,null);
  c.selectedCharacter={id:'other'};await c.loadWorldFourPotionClaims();assert.equal(c.beginWorldFourPotionEvent(),false);
  assert.equal(c.demoState.potionInventory.other,undefined);
});

test('skipping the story uses the same reward operation and cannot skip the reward',async()=>{
  const c=setup();c.beginWorldFourPotionEvent();c.page='storyPotionEvent';
  c.completeStoryDialogue();await Promise.resolve();assert.equal(c.potionInventory.red_potion_count,5);assert.ok(c.worldFourPotionClaims.has(4));
});

test('account request failure remains retryable and repeated clicks issue only one request',async()=>{
  const c=setup();c.localMode=false;c.accountMode=true;c.beginWorldFourPotionEvent();c.page='storyPotionEvent';
  let reject,calls=0;c.rpc=async(name,args)=>{calls++;assert.equal(name,'claim_world_four_potion_event');assert.equal(args.p_milestone,4);return new Promise((_,no)=>{reject=no;});};
  const request=c.claimWorldFourPotionEvent();await c.claimWorldFourPotionEvent();assert.equal(calls,1);
  reject(Error('offline'));await request;assert.equal(c.storyPotionEvent.error,true);assert.equal(c.storyPotionEvent.busy,false);
  assert.ok(!c.worldFourPotionClaims.has(4));assert.equal(c.potionInventory.red_potion_count,2);assert.match(c.renderStoryPotionEvent(),/다시 시도/);
  c.rpc=async()=>({milestone:4,potion_count:3,inventory:{...c.potionInventory,red_potion_count:5}});
  await c.claimWorldFourPotionEvent();assert.ok(c.worldFourPotionClaims.has(4));assert.equal(c.potionInventory.red_potion_count,5);
});

test('server retry after an ambiguous response acknowledges the existing reward without local addition',async()=>{
  const c=setup();c.localMode=false;c.accountMode=true;c.beginWorldFourPotionEvent();
  c.rpc=async()=>({milestone:4,potion_count:0,already_claimed:true,inventory:{...c.potionInventory,red_potion_count:5}});
  await c.claimWorldFourPotionEvent();assert.equal(c.potionInventory.red_potion_count,5);assert.ok(c.worldFourPotionClaims.has(4));
});

test('storage failure rolls back guest receipt and inventory so the reward can be retried',async()=>{
  const c=setup();c.beginWorldFourPotionEvent();c.saveDemo=()=>{throw Error('quota');};
  await c.claimWorldFourPotionEvent();assert.equal(c.demoState.worldFourPotionClaims,undefined);assert.equal(c.demoState.potionInventory.hero,undefined);
  assert.equal(c.potionInventory.red_potion_count,2);assert.ok(!c.worldFourPotionClaims.has(4));
  c.saveDemo=()=>{};await c.claimWorldFourPotionEvent();assert.equal(c.potionInventory.red_potion_count,5);
});

test('unavailable account receipt history never assumes unclaimed rewards',async()=>{
  const c=setup();c.localMode=false;c.accountMode=true;c.apiGet=async()=>{throw Error('offline');};
  await c.loadWorldFourPotionClaims();assert.equal(c.worldFourPotionClaims,null);assert.equal(c.beginWorldFourPotionEvent(),false);
  c.apiGet=async()=>[{milestone:4},{milestone:8}];await c.loadWorldFourPotionClaims();assert.ok(c.worldFourPotionClaims.has(4));assert.ok(c.worldFourPotionClaims.has(8));
});

test('progress and receipts are shared across learning levels and account characters',()=>{
  const c=setup(0);Object.assign(c,{accountMode:true,stageLevel:()=> 'middle',allCharacters:[{id:'hero'},{id:'other'}],
    stages:Object.fromEntries(Array.from({length:4},(_,i)=>[`story-ch4-${i+1}`,{story:true,recordName:`스토리 4장 ${i+1} · 환각의 숲과 버려진 성`}])),
    records:Array.from({length:4},(_,i)=>({character_id:i%2?'other':'hero',cleared:true,stage:`스토리 4장 ${i+1} · 환각의 숲과 버려진 성${i%2?' · 초등학생':''}`}))});
  vm.runInContext(source.slice(source.indexOf('  function stageRecordName('),source.indexOf('  function storyStageUnlocked(')),c);
  assert.equal(c.beginWorldFourPotionEvent(),true);assert.equal(c.storyPotionEvent.milestone,4);
  c.worldFourPotionClaims.add(4);c.selectedCharacter={id:'other'};assert.equal(c.beginWorldFourPotionEvent(),false);
});
