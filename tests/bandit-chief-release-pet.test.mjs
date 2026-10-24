import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
const sql=readFileSync(new URL('../supabase/migrations/20261024065130_bandit_chief_release_pet.sql',import.meta.url),'utf8');
const choiceCode=source.slice(source.indexOf('  async function chooseWorldSixBMidbossEnding('),source.indexOf('  const renderStoryChapterSixBCapital='));

function setup(localMode=false){
  const fox={id:localMode?'local-pet_sparktail_fox':42,code:'pet_sparktail_fox'};
  const calls=[];
  const run={banditChief:true,clear:true,result:{game_score_id:123}};
  const inventory=[];
  const context={run,localMode,selectedCharacter:{id:'hero'},shopItems:[fox],inventory,demoState:{inventory:[]},
    itemOwned:item=>inventory.some(row=>row.item_id===item.id),saveDemo:()=>calls.push('save'),
    rpc:async(name,args)=>{calls.push([name,args]);return [{item_id:fox.id,granted:true}];},
    loadCharacterExtras:async()=>calls.push('reload'),
    document:{querySelectorAll:()=>[],querySelector:()=>null},
    go:page=>calls.push(page),console:{error:()=>{}},storyDialogueIndex:5};
  vm.runInNewContext(choiceCode+'\nthis.choose=chooseWorldSixBMidbossEnding;',context);
  return {context,calls,fox,run,inventory};
}

test('release grants the fox to the cleared character before the ending',async()=>{
  const {context,calls,run}=setup();
  await context.choose('release');
  assert.deepEqual([calls[0][0],calls[0][1].p_game_score_id],['claim_bandit_chief_release_pet',123]);
  assert.equal(run.banditFoxGranted,true);
  assert.equal(run.worldSixBMidbossChoice,'release');
  assert.deepEqual(calls.slice(1),['reload','storyChapterSixBMidbossEnding']);
});

test('arrest gives no pet; guest release is saved once in inventory',async()=>{
  const account=setup();await account.context.choose('arrest');
  assert.deepEqual(account.calls,['storyChapterSixBMidbossEnding']);
  const guest=setup(true);await guest.context.choose('release');
  assert.equal(guest.inventory.length,1);assert.deepEqual(guest.calls,['save','storyChapterSixBMidbossEnding']);
  await guest.context.choose('release');assert.equal(guest.inventory.length,1);
});

test('server validates ownership and cleared 6B boss score before idempotent insert',()=>{
  assert.match(sql,/c\.owner_user_id = auth\.uid\(\)/);
  assert.match(sql,/s\.stage = '스토리 6장 10 · 왕국수도로 가는 길'/);
  assert.match(sql,/s\.cleared is true/);
  assert.match(sql,/on conflict \(character_id,item_id\) do nothing/);
  assert.match(sql,/grant execute on function public\.claim_bandit_chief_release_pet\(bigint\) to authenticated/);
});
