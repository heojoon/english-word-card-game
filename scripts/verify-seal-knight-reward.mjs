import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
function setup(localMode=true){
 const c=vm.createContext({localMode,dbOnline:true,selectedCharacter:{id:'one'},player:'player',demoState:{characters:[{id:'one',coins:0},{id:'two',coins:0}],records:[]},records:[],stageRecordName:()=> 'story-ch7c-30',saveDemo(){},window:{WORDORIA_SEAL_KNIGHT:{TIME_MS:300000}},console:{error(){}},accountCrystals:0});
 vm.runInContext(source.slice(source.indexOf('  async function saveSealKnightReward('),source.indexOf('  async function saveArkaonReward(')),c);return c;
}
const battle=()=>({bossHp:0,correct:12,elapsed:120000});
test('Seal Knight pays 700 once across characters, independently of earlier ordinary clears',async()=>{
 const c=setup();c.demoState.records.push({player:'player',stage:'story-ch7c-30',cleared:true});
 const first=battle();await c.saveSealKnightReward(first);assert.equal(first.result.coins_earned,700);
 await c.saveSealKnightReward(first);assert.equal(c.demoState.characters[0].coins,700);
 c.selectedCharacter.id='two';const replay=battle();await c.saveSealKnightReward(replay);assert.equal(replay.result.coins_earned,0);assert.equal(replay.storyReplay,true);
 assert.equal(c.demoState.characters[1].coins,0);assert.equal(c.records[0].correct,12);assert.equal(c.records[0].total,12);
});
test('rejects living boss, expired and malformed victories without paying',async()=>{
 for(const change of [{bossHp:1},{elapsed:300001},{correct:-1},{correct:NaN},{elapsed:NaN}]){const c=setup(),b={...battle(),...change};await c.saveSealKnightReward(b);assert.equal(b.saveError,true);assert.equal(c.demoState.characters[0].coins,0);}
});
test('HP-zero victory caused entirely by fire arrow keeps zero learning answers',async()=>{
 const c=setup(),b={...battle(),correct:0};await c.saveSealKnightReward(b);assert.equal(b.result.coins_earned,700);assert.equal(c.records[0].correct,0);assert.equal(c.records[0].total,1);
});
test('remote reward retries saves and uses account wallet receipt',async()=>{
 const c=setup(false),b=battle();let calls=0;
 c.rpc=async(name,args)=>{calls++;assert.equal(name,'claim_seal_knight_reward');assert.equal(args.p_correct,12);assert.equal(args.p_boss_hp,0);if(calls===1)throw Error('offline');return [{game_score_id:42,reward:700,balance:900}];};
 await c.saveSealKnightReward(b);assert.equal(b.saveRetryable,true);await c.saveSealKnightReward(b);assert.equal(b.saveError,false);assert.equal(b.result.coins_earned,700);assert.equal(c.accountCrystals,900);await c.saveSealKnightReward(b);assert.equal(calls,2);
});
test('failed local persistence rolls back wallet and first-reward receipt',async()=>{
 const c=setup(),b=battle();c.saveDemo=()=>{throw Error('storage full');};await c.saveSealKnightReward(b);assert.equal(c.demoState.characters[0].coins,0);assert.equal(c.demoState.records.length,0);c.saveDemo=()=>{};await c.saveSealKnightReward(b);assert.equal(b.result.coins_earned,700);
});
test('runtime connects burn, stage, input, renderer and cleanup to Seal Knight',()=>{
 for(const token of ['sealKnight:chapter===10&&stage.number===30','if(source.sealKnight)','if(run.sealKnight)return renderSealKnightBattle()','if(run?.sealKnight){sealKnightPick(button);return;}','window.WORDORIA_SEAL_KNIGHT.damage(run,amount)','if(run.sealKnight&&clear){await saveSealKnightReward(run);return;}'])assert.ok(source.includes(token),token);
 const renderer=source.slice(source.indexOf('  function renderSealKnightBattle('),source.indexOf('  function syncSealKnightBattleVisual('));assert.ok(renderer.includes('iceTimeEffectMarkup()'));assert.ok(renderer.includes('aria-valuemax="240"'));
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.ok(html.indexOf('nereus-boss.js')<html.indexOf('seal-knight-boss.js'));assert.ok(html.indexOf('seal-knight-boss.js')<html.indexOf('crystal-game.js'));
});
test('fire-arrow lethal damage retains the defeat animation and leaving cancels pending contacts',()=>{
 assert.ok(source.includes('!run.hiddenKind&&!run.vargas&&!run.sealKnight'));
 const go=source.slice(source.indexOf('  function go(target)'),source.indexOf('  function renderClassSkillCallout('));
 assert.ok(go.includes('window.WORDORIA_SEAL_KNIGHT.clear(run)'));
});
