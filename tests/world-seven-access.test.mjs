import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
function setup(role,localHost=false){
  const c=vm.createContext({accountMode:role!==null,accountProfile:role?{role}:null,localHost,nativeApp:false,storyBranchPreview:'6A',accountStoryBranch:'6A',demoState:{storyBranch:'6A'},storyStages:[{key:'a',chapter:8},{key:'b',chapter:9}],stageCleared:()=>true});
  for(const name of ['isAdministrator','chosenStoryBranch','storyBranchAllowed','storyStageUnlocked']){
    vm.runInContext(source.match(new RegExp(`  function ${name}\\([^\\n]+`))[0],c);
  }
  return c;
}
test('World 7A and 7B reject guests, students and teachers even with clears or localhost preview',()=>{
  for(const role of [null,'student','teacher'])for(const local of [false,true]){
    const c=setup(role,local);
    for(const chapter of [8,9])assert.equal(c.storyBranchAllowed(chapter),false);
    for(const index of [0,1])assert.equal(c.storyStageUnlocked(index),false);
    assert.equal(c.storyBranchAllowed(7),true);
    assert.equal(c.storyBranchAllowed(6),false);
  }
});
test('Administrators can enter both World 7 branches',()=>{
  const c=setup('admin');
  for(const chapter of [6,7,8,9])assert.equal(c.storyBranchAllowed(chapter),true);
  for(const index of [0,1])assert.equal(c.storyStageUnlocked(index),true);
});
