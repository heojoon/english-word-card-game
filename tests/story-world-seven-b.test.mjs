import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('crystal-game.js');
function setup(){
  let level='middle';
  const c=vm.createContext({window:{},stages:JSON.parse(read('content/catalog.json')).stages,learningLevel:()=>level,stageLevel:s=>s?.learningLevel||'middle',storyBranchPreview:null,run:null,records:[],demoState:{storyBranch:'6A'},accountStoryBranch:null,accountProfile:null,allCharacters:[],accountMode:false,localHost:false,nativeApp:false});
  vm.runInContext(source.slice(source.indexOf('  const storyStages = ['),source.indexOf('  const storyStageKey='))+'\nthis.storyStages=storyStages;this.storyWorlds=storyWorlds;',c);
  vm.runInContext(source.slice(source.indexOf('  function stageRecordName('),source.indexOf('  function earnedCoins(')),c);
  c.configureStoryContent();
  return {c,switchLevel(v){level=v;c.configureStoryContent();}};
}
test('7B shares all thirty 7A vocabulary pools; Nereus has a dedicated 200-HP matching battle',()=>{
  const {c,switchLevel}=setup();
  for(const level of ['elementary','middle']){
    switchLevel(level);
    for(let n=1;n<=30;n++){
      const a=c.stages[`story-ch7a-${n}`],b=c.stages[`story-ch7b-${n}`];
      assert.deepEqual(b.words,a.words);
      assert.equal(b.questionCount,n===30?220:n===15?200:a.questionCount);
      assert.equal(b.nereus,n===15);
      assert.equal(b.darkTriton,n===30);
      assert.equal(b.questionTimeMs,a.questionTimeMs);
      assert.equal(b.vocabularyDay,a.vocabularyDay);
      assert.deepEqual(b.source,a.source);
      assert.equal(b.encounterName,n===15?'흑조의 창기사 네레우스':n===30?'다크 트라이튼':null);
    }
  }
});
test('7B opens after 6B completion and retains shared progress across learning levels',()=>{
  const {c,switchLevel}=setup(),index=c.storyStages.findIndex(s=>s.key==='story-ch7b-1');
  assert.equal(c.storyStageUnlocked(index),false);
  c.records.push({stage:c.stageRecordName('story-ch6-20'),cleared:true});
  assert.equal(c.storyStageUnlocked(index),false);
  c.demoState.storyBranch='6B';
  assert.equal(c.storyStageUnlocked(index),true);
  c.accountMode=true;c.accountProfile={role:'admin'};
  assert.equal(c.storyStageUnlocked(index),true);
  const record=c.stageRecordName('story-ch7b-1');
  assert.match(record,/스토리 7B장 1/);
  c.records.push({stage:record,cleared:true});
  switchLevel('elementary');
  assert.equal(c.stageRecordName('story-ch7b-1'),record);
  assert.equal(c.storyStageUnlocked(index+1),true);
  c.accountMode=false;c.accountProfile={role:'teacher'};c.accountStoryBranch='6B';
  assert.equal(c.storyStageUnlocked(index),true);
});
test('7B runtime follows thirty measured crystal centers from top to bottom',()=>{
  const {c}=setup(),world=c.storyWorlds.find(w=>w.displayNumber==='7B');
  const layout=JSON.parse(read('assets/story/chapter-7b-map-layout.json'));
  assert.equal(world.art,layout.art);
  assert.equal(world.unlockAfter,6);
  assert.equal(world.positions.length,30);
  assert.deepEqual(JSON.parse(JSON.stringify(world.positions)),layout.positions);
  for(let i=1;i<30;i++)assert.ok(parseFloat(world.positions[i][1])>parseFloat(world.positions[i-1][1]));
});

test('7B ordinary lizardmen exclude both boss stages and other worlds',()=>{
  const {c}=setup();
  vm.runInContext(source.slice(source.indexOf('  function storyLizardMob('),source.indexOf('  function prepareQuestion(')),c);
  for(let n=1;n<=30;n++){
    assert.equal(c.storyLizardMob(c.stages[`story-ch7b-${n}`]),![15,30].includes(n));
    assert.equal(c.storyLizardMob(c.stages[`story-ch7a-${n}`]),false);
  }
  for(const stage of [null,{}, {story:false,storyChapter:9,storyNumber:1}, {story:true,storyChapter:9,storyNumber:0}, {story:true,storyChapter:9,storyNumber:31}])assert.equal(c.storyLizardMob(stage),false);
});
