import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
function setup(localMode=true){
  const c=vm.createContext({localMode,dbOnline:true,selectedCharacter:{id:'one'},player:'player',
    demoState:{characters:[{id:'one',coins:0},{id:'two',coins:0}],records:[]},records:[],
    stageRecordName:()=> 'story-ch7c-10',saveDemo(){},window:{WORDORIA_ARKAON:{TIME_MS:300000}},
    console:{error(){}},accountCrystals:0});
  vm.runInContext(source.slice(source.indexOf('  async function saveArkaonReward('),source.indexOf('  async function saveKeurusReward(')),c);
  return c;
}
const battle=()=>({bossHp:0,correct:50,elapsed:120000});
test('Arkaon pays 400 once across characters; earlier ordinary clear does not consume reward',async()=>{
  const c=setup();c.demoState.records.push({player:'player',stage:'story-ch7c-10',cleared:true});
  const first=battle();await c.saveArkaonReward(first);assert.equal(first.result.coins_earned,400);
  await c.saveArkaonReward(first);assert.equal(c.demoState.characters[0].coins,400);
  c.selectedCharacter.id='two';const replay=battle();await c.saveArkaonReward(replay);
  assert.equal(replay.result.coins_earned,0);assert.equal(replay.storyReplay,true);
  assert.equal(c.demoState.characters[1].coins,0);
});
test('rejects living boss and expired victory without paying',async()=>{
  for(const change of [{bossHp:1},{elapsed:300001},{correct:0}]){
    const c=setup(),b={...battle(),...change};await c.saveArkaonReward(b);
    assert.equal(b.saveError,true);assert.equal(c.demoState.characters[0].coins,0);
  }
});
test('remote reward retries failed saves and uses server wallet and receipt',async()=>{
  const c=setup(false),b=battle();let calls=0;
  c.rpc=async(name,args)=>{calls++;assert.equal(name,'claim_arkaon_reward');assert.equal(args.p_boss_hp,0);if(calls===1)throw Error('offline');return [{game_score_id:42,reward:400,balance:900}];};
  await c.saveArkaonReward(b);assert.equal(b.saveRetryable,true);
  await c.saveArkaonReward(b);assert.equal(b.saveError,false);assert.equal(b.result.coins_earned,400);
  assert.equal(c.accountCrystals,900);assert.equal(c.records[0].id,42);
  await c.saveArkaonReward(b);assert.equal(calls,2);
});
