import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
function setup({account=true,statuses=[200],recordFailure=false}={}){
  const calls=[];
  let session={user:{id:'owner'},access_token:'current-token'};
  const context=vm.createContext({
    accountMode:account,accountUserId:'owner',accountSession:{access_token:'expired-token'},
    DB_KEY:'public-key',DB_URL:'https://example.test',localMode:false,dbOnline:true,
    window:{WORDORIA_AUTH_CLIENT:{auth:{getSession:async()=>({data:{session}}),refreshSession:async()=>{
      session={...session,access_token:'refreshed-token'};return {data:{session}};
    }}}},
    fetchWithTimeout:async(url,options)=>{
      calls.push({url,options});
      if(recordFailure&&options.method!=='POST')throw new Error('records unavailable');
      const status=statuses.shift()??200;
      return {status,ok:status===200,text:async()=>status===200?JSON.stringify([{game_score_id:1,coins_earned:6,balance:106}]):'unauthorized',json:async()=>[]};
    },
    run:{story:false,correct:5,deck:Array(20),elapsed:15000,clear:false},
    selectedCharacter:{id:'hero',class:'mage',coins:0},selectedStage:'forest',
    stageRecordName:()=> 'survival-test',accountCrystals:100,records:[],
    page:'result',render(){},console:{error(){},warn(){}},
    stages:{forest:{name:'forest'}},esc:String,num:String,icon:()=>'',
  });
  vm.runInContext(source.slice(source.indexOf('  async function headers('),source.indexOf('  const characterDef')),context);
  vm.runInContext(source.slice(source.indexOf('  async function saveBattleResult('),source.indexOf('  function clearSummaryMarkup(')),context);
  vm.runInContext(source.slice(source.indexOf('  async function retryBattleReward('),source.indexOf('\n\n  function showCharacters(')),context);
  return {context,calls,setSession:value=>{session=value;}};
}
test('survival rewards use the current session and update the shared wallet',async()=>{
  const {context,calls}=setup();await context.saveBattleResult(context.run,false);
  assert.equal(calls[0].options.headers.Authorization,'Bearer current-token');
  assert.equal(JSON.parse(calls[0].options.body).p_fever_bonus,0);
  assert.equal(context.accountCrystals,106);
  assert.equal(context.selectedCharacter.coins,0);
});
test('401 refreshes authentication and retries the same reward once',async()=>{
  const {context,calls}=setup({statuses:[401,200]});await context.saveBattleResult(context.run,false);
  assert.equal(calls[1].options.headers.Authorization,'Bearer refreshed-token');
  assert.equal(calls[0].options.body,calls[1].options.body);
  assert.equal(calls.filter(call=>call.options.method==='POST').length,2);
  assert.equal(context.accountCrystals,106);
});
test('failed authentication shows no false reward and supports a later safe retry',async()=>{
  const {context,calls}=setup({statuses:[401,401]});await context.saveBattleResult(context.run,false);
  assert.equal(context.accountCrystals,100);
  assert.equal(context.run.saveError,true);
  assert.match(context.renderResult(),/보상 저장 다시 시도/);
  assert.doesNotMatch(context.renderResult(),/◆ \+6/);
  await context.retryBattleReward({disabled:false});
  assert.equal(context.accountCrystals,106);
  assert.equal(context.run.saveError,false);
  await context.saveBattleResult(context.run,false);
  assert.equal(calls.filter(call=>call.options.method==='POST').length,3);
});
test('records refresh failure never retries an already paid reward',async()=>{
  const {context,calls}=setup({recordFailure:true});await context.saveBattleResult(context.run,false);
  assert.equal(context.accountCrystals,106);
  assert.equal(context.run.saveError,false);
  await context.saveBattleResult(context.run,false);
  assert.equal(calls.filter(call=>call.options.method==='POST').length,1);
});
test('guest requests retain their public key and never use account tokens',async()=>{
  const {context,calls}=setup({account:false});await context.apiGet('game_scores');
  assert.equal(calls[0].options.headers.Authorization,'Bearer public-key');
});
test('signed-out or different-user sessions cannot submit the original account reward',async()=>{
  for(const session of [null,{user:{id:'someone-else'},access_token:'other-token'}]){
    const {context,calls,setSession}=setup();setSession(session);
    await context.saveBattleResult(context.run,false);
    assert.equal(calls.length,0);
    assert.equal(context.accountCrystals,100);
    assert.equal(context.run.saveError,true);
  }
});
test('ambiguous network failures are never automatically retried',async()=>{
  const {context,calls}=setup();
  context.fetchWithTimeout=async()=>{calls.push({});throw new Error('network interrupted');};
  await context.saveBattleResult(context.run,false);
  assert.equal(calls.length,1);
  assert.equal(context.run.saveRetryable,false);
  assert.doesNotMatch(context.renderResult(),/data-action="battle-reward-retry"/);
});
