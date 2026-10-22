import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
const code=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b));
function setup(localMode=true){
  const character={id:'hero',coins:100};const c=vm.createContext({localMode,dbOnline:true,selectedCharacter:character,selectedStage:'story-ch6-20',player:'learner',demoState:{characters:[character],records:[]},records:[],accountCrystals:100,stageRecordName:()=> '스토리 6장 20 · 왕국수도로 가는 길',saveDemo(){},run:{elliot:true,clear:true,hp:1,bossHp:250,correct:67,elapsed:240000,storyCharacterId:'hero',deck:Array(67)},go(p){c.page=p;}});
  vm.runInContext(code('  async function saveBattleResult(', '  async function saveSorcerusMidbossReward('),c);vm.runInContext(code('  function resultNext(', '  async function tapChest('),c);return c;
}
test('first trial clear pays exactly 800 with no chests, account-wide receipt prevents repeat rewards',async()=>{
  const c=setup();await c.saveBattleResult(c.run,true);assert.equal(c.selectedCharacter.coins,900);assert.equal(c.run.result.coins_earned,800);assert.equal(c.records[0].treasure_claimed,true);
  c.resultNext();assert.equal(c.page,'story');const other={id:'other',coins:20};c.demoState.characters.push(other);c.selectedCharacter=other;c.run={...c.run,result:null,storyCharacterId:'other'};
  await c.saveBattleResult(c.run,true);assert.equal(other.coins,20);assert.equal(c.run.result.coins_earned,0);assert.equal(c.records.length,1);
});
test('loss pays zero and early, dead or insufficient-damage clear cannot pay',async()=>{
  const c=setup();c.run.hp=0;await c.saveBattleResult(c.run,false);assert.equal(c.selectedCharacter.coins,100);assert.equal(c.records[0].cleared,false);
  for(const patch of [{elapsed:239999},{hp:0},{bossHp:251}]){const c=setup();Object.assign(c.run,patch);await c.saveBattleResult(c.run,true);assert.ok(c.run.saveError);assert.equal(c.records.length,0);}
});
test('storage failure rolls back wallet and retry pays once',async()=>{
  const c=setup();c.saveDemo=()=>{throw Error('quota');};await c.saveBattleResult(c.run,true);assert.equal(c.selectedCharacter.coins,100);assert.equal(c.demoState.records.length,0);
  c.saveDemo=()=>{};await c.saveBattleResult(c.run,true);assert.equal(c.selectedCharacter.coins,900);await c.saveBattleResult(c.run,true);assert.equal(c.selectedCharacter.coins,900);
});
test('account RPC sends the actual trial character, survival duration and both HP values',async()=>{
  const c=setup(false);c.selectedCharacter={id:'other',coins:0};let calls=0,args,resolve;
  c.rpc=(name,input)=>{assert.equal(name,'claim_elliot_reward');args=input;calls++;return new Promise(done=>resolve=done);};
  const first=c.saveBattleResult(c.run,true);await c.saveBattleResult(c.run,true);assert.equal(calls,1);assert.equal(args.p_character_id,'hero');assert.equal(args.p_boss_hp,250);assert.equal(args.p_player_hp,1);assert.equal(args.p_duration_ms,240000);
  resolve([]);await first;assert.ok(c.run.saveRetryable);c.rpc=async()=>[{game_score_id:7,reward:0,balance:900}];await c.saveBattleResult(c.run,true);assert.equal(c.accountCrystals,900);assert.equal(c.run.result.coins_earned,0);
});
