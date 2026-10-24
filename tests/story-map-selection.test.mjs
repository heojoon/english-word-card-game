import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
function setup(reduced=false){
  let now=1000;
  const calls=[];
  const context=vm.createContext({storyBranchAllowed:()=>true,storyEntryAllowed:()=>true,
    storyStages:[{key:'first',chapter:1},{key:'second',chapter:1},{key:'locked',chapter:2}],
    storyWorlds:[{number:1},{number:2}],stages:{first:{},second:{},locked:{}},
    selectedStoryStage:'first',selectedStoryWorld:1,storyStageArmedKey:null,storyMapMoveUntil:0,
    storyStageUnlocked:index=>index<2,levelReady:()=>true,reducedMotion:()=>reduced,
    performance:{now:()=>now},render(){},confirmStoryStage:key=>calls.push(key),
  });
  vm.runInContext(source.slice(source.indexOf('  function selectStoryWorld('),source.indexOf('  function confirmStoryStage(')),context);
  return {context,calls,advance:ms=>{now+=ms;}};
}
test('tapping an unlocked map node selects it and opens its introduction',()=>{
  const {context:c,calls}=setup();
  c.selectStoryStage('second');assert.equal(c.selectedStoryStage,'second');assert.deepEqual(calls,['second']);
});
test('initial stage and reduced motion open the introduction on one tap',()=>{
  for(const key of ['first','second']){
    const {context:c,calls}=setup(true);
    c.selectStoryStage(key);assert.deepEqual(calls,[key]);
  }
});
test('locked stages cannot open an introduction and world changes reset selection state',()=>{
  const {context:c,calls}=setup(true);
  c.selectStoryStage('locked');assert.equal(c.selectedStoryStage,'first');assert.equal(c.storyStageArmedKey,null);
  c.selectStoryStage('second');c.selectStoryWorld(2);assert.equal(c.storyStageArmedKey,null);
  c.selectStoryStage('second');assert.deepEqual(calls,['second','second']);
});
