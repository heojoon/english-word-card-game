import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('crystal-game.js');
test('7A normal and scorched skeleton ranges exclude both boss stages and other worlds',()=>{
  const c=vm.createContext({});
  vm.runInContext(source.slice(source.indexOf('  function storySkeletonVariant('),source.indexOf('  function prepareQuestion(')),c);
  for(const level of ['elementary','middle'])for(let n=1;n<=30;n++){
    assert.equal(c.storySkeletonVariant({story:true,storyChapter:8,storyNumber:n,learningLevel:level}),[15,30].includes(n)?null:n<15?'normal':'scorched');
  }
  for(const stage of [null,{story:false,storyChapter:8,storyNumber:1},{story:true,storyChapter:7,storyNumber:1},{story:true,storyChapter:8,storyNumber:31}])assert.equal(c.storySkeletonVariant(stage),null);
});
function setup(){
  let level='middle';
  const c=vm.createContext({window:{},stages:JSON.parse(read('content/catalog.json')).stages,learningLevel:()=>level,stageLevel:s=>s?.learningLevel||'middle',storyBranchPreview:null,run:null,records:[],demoState:{storyBranch:'6A'},accountStoryBranch:null,accountProfile:null,allCharacters:[],accountMode:false,localHost:false,nativeApp:false});
  vm.runInContext(source.slice(source.indexOf('  const storyStages = ['),source.indexOf('  const storyStageKey='))+'\nthis.storyStages=storyStages;this.storyWorlds=storyWorlds;',c);
  vm.runInContext(source.slice(source.indexOf('  function stageRecordName('),source.indexOf('  function earnedCoins(')),c);
  c.configureStoryContent();
  return {c,switchLevel(v){level=v;c.configureStoryContent();}};
}
test('7A uses thirty successive full Level 3 Days, with a 180 HP final boss',()=>{
  const {c}=setup();
  for(let n=1;n<=30;n++){
    const s=c.stages[`story-ch7a-${n}`];
    const original=c.stages[`s${n<=10?n+34:n+4}`];
    assert.equal(s.questionCount,n===30?180:30);
    assert.equal(s.questionTimeMs,2000);
    assert.equal(s.story,true);
    assert.equal(s.words.length,30);
    assert.deepEqual(s.words,original.words);
    assert.equal(s.source.sheet,`Day ${n}`);
    assert.equal(s.encounterName,n===15?'케우르스':n===30?'레드스컬나이트':null);
    assert.equal(s.guardian,false);
  }
  assert.match(source,/storyTimeLimit:deck.length\*\(source.questionTimeMs\|\|3000\)/);
});
test('7A is admin-only and preserves progress between learning levels',()=>{
  const {c,switchLevel}=setup();
  const index=c.storyStages.findIndex(s=>s.key==='story-ch7a-1');
  assert.equal(c.storyStageUnlocked(index),false);
  c.records.push({stage:c.stageRecordName('story-ch6a-20'),cleared:true});
  assert.equal(c.storyStageUnlocked(index),false);
  c.accountMode=true;c.accountProfile={role:'admin'};
  assert.equal(c.storyStageUnlocked(index),true);
  const first=c.stageRecordName('story-ch7a-1');
  c.records.push({stage:first,cleared:true});
  switchLevel('elementary');
  assert.equal(c.stageRecordName('story-ch7a-1'),first);
  assert.equal(c.storyStageUnlocked(index+1),true);
  assert.equal(c.stages['story-ch7a-1'].questionCount,30);
  c.accountProfile={role:'student'};c.accountStoryBranch='6A';
  assert.equal(c.storyStageUnlocked(index),false);
});
test('7A map matches its recorded layout and progresses downward through thirty waypoints',()=>{
  const {c}=setup(),w=c.storyWorlds.find(w=>w.displayNumber==='7A');
  const layout=JSON.parse(read('assets/story/chapter-7a-map-layout.json'));
  assert.equal(w.art,layout.art);
  assert.equal(w.positions.length,30);
  assert.deepEqual(JSON.parse(JSON.stringify(w.positions)),layout.positions);
  for(let i=1;i<30;i++)assert.ok(parseFloat(w.positions[i][1])>parseFloat(w.positions[i-1][1]));
});
