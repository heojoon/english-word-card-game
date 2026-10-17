import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
const code=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b));
function setup(localMode=true){
  const character={id:'hero',coins:100},inventory={red_potion_count:2,blue_potion_count:3,equipped_slot_1:'red'};
  const c=vm.createContext({localMode,dbOnline:true,selectedCharacter:character,selectedStage:'story-ch5-10',player:'learner',
    demoState:{characters:[character],records:[],potionInventory:{hero:inventory}},potionInventory:inventory,records:[],accountCrystals:100,
    stageRecordName:()=> '스토리 5장 10 · 보랏빛 수정동굴',saveDemo(){},
    run:{sorcerus:true,clear:true,bossHp:0,correct:135,elapsed:120000,storyCharacterId:'hero',deck:Array(240)},
    esc:String,num:String,stages:{'story-ch5-10':{name:'월드 5 · 10단계'}},go(page){c.page=page;},render(){throw Error('unexpected chest');}});
  vm.runInContext(code('  async function saveBattleResult(', '  function chestMarkup('),c);
  vm.runInContext(code('  function resultNext(', '  async function tapChest('),c);
  return c;
}
test('first guest victory grants exactly 500 crystals and five healing potions without chests',async()=>{
  const c=setup();await c.saveBattleResult(c.run,true);
  assert.equal(c.selectedCharacter.coins,600);assert.equal(c.potionInventory.red_potion_count,7);
  assert.equal(c.potionInventory.blue_potion_count,3);assert.equal(c.potionInventory.equipped_slot_1,'red');
  assert.equal(c.run.result.coins_earned,500);assert.equal(c.run.bossPotionReward,5);assert.equal(c.records.length,1);
  assert.equal(c.records[0].total,135);assert.ok(c.records[0].treasure_claimed);
  assert.match(c.clearSummaryMarkup(c.run,500),/힐링포션 \+5개/);
  c.resultNext();assert.equal(c.page,'story');
  await c.saveBattleResult(c.run,true);assert.equal(c.selectedCharacter.coins,600);
});
test('guest replay across characters and learning levels does not pay again',async()=>{
  const c=setup();await c.saveBattleResult(c.run,true);
  const other={id:'other',coins:20};c.demoState.characters.push(other);c.selectedCharacter=other;
  c.run={...c.run,result:null,storyCharacterId:'other'};await c.saveBattleResult(c.run,true);
  assert.equal(other.coins,20);assert.equal(c.run.bossPotionReward,0);assert.equal(c.run.result.coins_earned,0);
  assert.equal(c.demoState.potionInventory.other,undefined);assert.equal(c.records.length,1);assert.ok(c.run.storyReplay);
});
test('guest storage failure rolls back the wallet, inventory and receipt before retry',async()=>{
  const c=setup();c.saveDemo=()=>{throw Error('quota');};await c.saveBattleResult(c.run,true);
  assert.equal(c.selectedCharacter.coins,100);assert.equal(c.potionInventory.red_potion_count,2);
  assert.equal(c.demoState.records.length,0);assert.equal(c.run.result,undefined);assert.ok(c.run.saveRetryable);
  c.saveDemo=()=>{};await c.saveBattleResult(c.run,true);assert.equal(c.selectedCharacter.coins,600);
});
test('account reward uses the battle character, accepts healed damage, and applies authoritative inventory',async()=>{
  const c=setup(false),calls=[];c.selectedCharacter={id:'other',coins:0};
  c.rpc=async(name,args)=>{calls.push({name,args});return [{game_score_id:7,reward:500,balance:600,healing_potions:5,inventory:{red_potion_count:7}}];};
  await c.saveBattleResult(c.run,true);
  assert.equal(calls[0].name,'claim_sorcerus_midboss_reward');assert.equal(calls[0].args.p_character_id,'hero');
  assert.equal(calls[0].args.p_correct,135);assert.equal(c.accountCrystals,600);
  assert.equal(c.potionInventory.red_potion_count,2);assert.equal(c.records[0].character_id,'hero');
});
test('ambiguous account response can retry safely and duplicate saves are serialized',async()=>{
  const c=setup(false);let calls=0,resolve;
  c.rpc=()=>{calls++;return new Promise(done=>{resolve=done;});};
  const first=c.saveBattleResult(c.run,true);await c.saveBattleResult(c.run,true);assert.equal(calls,1);
  resolve([]);await first;assert.ok(c.run.saveError);assert.ok(c.run.saveRetryable);assert.equal(c.accountCrystals,100);
  c.rpc=async()=>[{game_score_id:8,reward:0,balance:600,healing_potions:0,inventory:{red_potion_count:7}}];
  await c.saveBattleResult(c.run,true);assert.equal(c.accountCrystals,600);assert.equal(c.potionInventory.red_potion_count,7);
  assert.equal(c.run.bossPotionReward,0);assert.equal(c.run.result.game_score_id,8);assert.equal(c.run.saveError,false);
});
test('an uncleared boss cannot receive the fixed reward',async()=>{
  const c=setup();c.run.bossHp=1;await c.saveBattleResult(c.run,true);
  assert.ok(c.run.saveError);assert.equal(c.selectedCharacter.coins,100);assert.equal(c.records.length,0);
});
