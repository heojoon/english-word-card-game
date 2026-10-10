import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
function setup(reduced=false){
  let now=1000;
  const calls=[];
  const context=vm.createContext({
    storyStages:[{key:'first',chapter:1},{key:'second',chapter:1},{key:'locked',chapter:2}],
    storyWorlds:[{number:1},{number:2}],stages:{first:{},second:{},locked:{}},
    selectedStoryStage:'first',selectedStoryWorld:1,storyStageArmedKey:null,storyMapMoveUntil:0,
    storyStageUnlocked:index=>index<2,levelReady:()=>true,reducedMotion:()=>reduced,
    performance:{now:()=>now},render(){},confirmStoryStage:key=>calls.push(key),
  });
  vm.runInContext(source.slice(source.indexOf('  function selectStoryWorld('),source.indexOf('  function confirmStoryStage(')),context);
  return {context,calls,advance:ms=>{now+=ms;}};
}
test('first click moves; entry requires another click after arrival',()=>{
  const {context:c,calls,advance}=setup();
  c.selectStoryStage('second');assert.equal(c.selectedStoryStage,'second');assert.deepEqual(calls,[]);
  c.selectStoryStage('second');assert.deepEqual(calls,[]);
  advance(650);assert.deepEqual(calls,[]);
  c.selectStoryStage('second');assert.deepEqual(calls,['second']);
});
test('initial stage and reduced motion still require two clicks',()=>{
  for(const key of ['first','second']){
    const {context:c,calls}=setup(true);
    c.selectStoryStage(key);assert.deepEqual(calls,[]);
    c.selectStoryStage(key);assert.deepEqual(calls,[key]);
  }
});
test('locked stages cannot move the hero and changing worlds resets confirmation',()=>{
  const {context:c,calls}=setup(true);
  c.selectStoryStage('locked');assert.equal(c.selectedStoryStage,'first');assert.equal(c.storyStageArmedKey,null);
  c.selectStoryStage('second');c.selectStoryWorld(2);assert.equal(c.storyStageArmedKey,null);
  c.selectStoryStage('second');assert.deepEqual(calls,[]);
});
