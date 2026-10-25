import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
function setup(saved,records=[]){
  const c=vm.createContext({accountUserId:'account',player:'player',selectedCharacter:{id:'hero'},localStateStorage:{getItem:()=>JSON.stringify(saved)},storyStages:[{key:'first',chapter:1},{key:'last',chapter:6}],stages:{first:{},last:{}},storyBranchAllowed:()=>true,storyStagePlayable:()=>true,storyStageUnlocked:()=>true,levelReady:()=>true,selectedRecords:()=>records,stageRecordName:key=>key,selectedStoryWorld:1,selectedStoryStage:null});
  vm.runInContext(source.slice(source.indexOf('  function storyResumeStorageKey('),source.indexOf('  function go(target)')),c);
  return c;
}
test('story entry restores the last entered stage including an unfinished attempt',()=>{
  const c=setup({key:'last',playedAt:200});c.restoreLastStoryStage();
  assert.equal(c.selectedStoryStage,'last');assert.equal(c.selectedStoryWorld,6);
  assert.equal(c.storyResumeStorageKey(),'wordoria:lastStoryStage:account:hero');
});
test('story entry uses the newest record when storage is missing or older',()=>{
  for(const saved of [null,{key:'first',playedAt:100}]){
    const c=setup(saved,[{stage:'last',created_at:new Date(300).toISOString()},{stage:'first',created_at:new Date(50).toISOString()}]);
    c.restoreLastStoryStage();assert.equal(c.selectedStoryStage,'last');
  }
});
test('inaccessible saved stages fall back to an available stage',()=>{
  const c=setup({key:'last',playedAt:200});c.storyBranchAllowed=chapter=>chapter===1;
  c.restoreLastStoryStage();assert.equal(c.selectedStoryStage,'first');
});
