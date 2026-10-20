import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
const code=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b));
function setup(localMode=true){
  const character={id:'hero',coins:100};const c=vm.createContext({localMode,dbOnline:true,selectedCharacter:character,selectedStage:'story-ch6a-20',player:'learner',demoState:{characters:[character],records:[]},records:[],accountCrystals:100,stageRecordName:()=> '스토리 6A장 20 · 반전세계',saveDemo(){},run:{morgana:true,clear:true,bossHp:0,correct:67,elapsed:120000,storyCharacterId:'hero',deck:Array(67)},go(p){c.page=p;}});
  vm.runInContext(code('  async function saveBattleResult(', '  async function saveSorcerusMidbossReward('),c);vm.runInContext(code('  function resultNext(', '  async function tapChest('),c);return c;
}
test('guest first clear pays exactly 500, bypasses chests and does not repeat across characters or reset progress',async()=>{
  const c=setup();await c.saveBattleResult(c.run,true);assert.equal(c.selectedCharacter.coins,600);assert.equal(c.run.result.coins_earned,500);assert.equal(c.records[0].total,67);assert.equal(c.records[0].treasure_claimed,true);
  c.resultNext();assert.equal(c.page,'story');const other={id:'other',coins:20};c.demoState.characters.push(other);c.selectedCharacter=other;c.records[0].cleared=false;c.run={...c.run,result:null,storyCharacterId:'other'};
  await c.saveBattleResult(c.run,true);assert.equal(other.coins,20);assert.equal(c.run.result.coins_earned,0);assert.equal(c.records.length,1);assert.equal(c.records[0].cleared,true);
});
test('failure gives zero crystals and never marks clear',async()=>{
  const c=setup();c.run.clear=false;c.run.bossHp=20;await c.saveBattleResult(c.run,false);assert.equal(c.selectedCharacter.coins,100);assert.equal(c.run.result.coins_earned,0);assert.equal(c.records[0].cleared,false);
});
test('guest storage failure rolls back wallet and receipt so retry pays once',async()=>{
  const c=setup();c.saveDemo=()=>{throw Error('quota');};await c.saveBattleResult(c.run,true);assert.equal(c.selectedCharacter.coins,100);assert.equal(c.demoState.records.length,0);assert.ok(c.run.saveRetryable);
  c.saveDemo=()=>{};await c.saveBattleResult(c.run,true);assert.equal(c.selectedCharacter.coins,600);
});
test('account uses battle character and authoritative balance, serializes saves, retries ambiguous response',async()=>{
  const c=setup(false);let calls=0,resolve,args;c.selectedCharacter={id:'other',coins:0};c.rpc=(name,input)=>{assert.equal(name,'claim_morgana_reward');args=input;calls++;return new Promise(done=>resolve=done);};
  const first=c.saveBattleResult(c.run,true);await c.saveBattleResult(c.run,true);assert.equal(calls,1);assert.equal(args.p_character_id,'hero');assert.equal(args.p_cleared,true);
  resolve([]);await first;assert.ok(c.run.saveRetryable);assert.equal(c.accountCrystals,100);
  c.rpc=async()=>[{game_score_id:7,reward:0,balance:600}];await c.saveBattleResult(c.run,true);assert.equal(c.accountCrystals,600);assert.equal(c.run.result.coins_earned,0);assert.equal(c.run.saveError,false);assert.equal(c.records[0].cleared,true);
});
test('uncleared boss cannot claim victory and offline failures remain retryable',async()=>{
  const c=setup();c.run.bossHp=1;await c.saveBattleResult(c.run,true);assert.ok(c.run.saveError);assert.equal(c.selectedCharacter.coins,100);
  const remote=setup(false);remote.dbOnline=false;await remote.saveBattleResult(remote.run,true);assert.ok(remote.run.saveRetryable);assert.equal(remote.records.length,0);
});
