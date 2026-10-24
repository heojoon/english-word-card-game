import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
function setup(role,branch,clears=[]){
  const cleared=new Set(clears);
  const c=vm.createContext({accountMode:role!==null,accountProfile:role?{role}:null,localHost:false,nativeApp:false,storyBranchPreview:null,accountStoryBranch:branch,demoState:{storyBranch:branch},storyStages:[{key:'7a-1',chapter:8,number:1},{key:'7b-1',chapter:9,number:1}],stageCleared:key=>cleared.has(key)});
  for(const name of ['isAdministrator','chosenStoryBranch','storyBranchAllowed','storyStageUnlocked']){
    vm.runInContext(source.match(new RegExp(`  function ${name}\\([^\\n]+`))[0],c);
  }
  return c;
}
test('World 7 follows the permanent World 6 branch and its final clear',()=>{
  for(const role of [null,'student','teacher']){
    for(const [branch,chapter,index,final] of [['6A',8,0,'story-ch6a-20'],['6B',9,1,'story-ch6-20']]){
      const before=setup(role,branch);
      assert.equal(before.storyBranchAllowed(chapter),true);
      assert.equal(before.storyBranchAllowed(chapter===8?9:8),false);
      assert.equal(before.storyStageUnlocked(index),false);
      const wrongClear=setup(role,branch,[branch==='6A'?'story-ch6-20':'story-ch6a-20']);
      assert.equal(wrongClear.storyStageUnlocked(index),false);
      const after=setup(role,branch,[final]);
      assert.equal(after.storyStageUnlocked(index),true);
      assert.equal(after.storyStageUnlocked(1-index),false);
    }
  }
  const undecided=setup('student',null,['story-ch6a-20','story-ch6-20']);
  assert.equal(undecided.storyBranchAllowed(8),false);
  assert.equal(undecided.storyBranchAllowed(9),false);
});
test('Administrators can preview both World 7 branches',()=>{
  const c=setup('admin',null);
  for(const chapter of [6,7,8,9])assert.equal(c.storyBranchAllowed(chapter),true);
  for(const index of [0,1])assert.equal(c.storyStageUnlocked(index),true);
});
