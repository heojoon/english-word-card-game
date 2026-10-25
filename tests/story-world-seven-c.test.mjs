import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('crystal-game.js');
function setup(){
  let level='middle';
  const c=vm.createContext({window:{},stages:JSON.parse(read('content/catalog.json')).stages,learningLevel:()=>level,stageLevel:s=>s?.learningLevel||'middle',storyBranchPreview:null,run:null,records:[],demoState:{storyBranch:'6B'},accountStoryBranch:null,accountProfile:null,allCharacters:[],accountMode:false,localHost:false,nativeApp:false,shuffle:array=>array.slice().reverse()});
  vm.runInContext(source.slice(source.indexOf('  const storyStages = ['),source.indexOf('  const storyStageKey='))+'\nthis.storyStages=storyStages;this.storyWorlds=storyWorlds;',c);
  vm.runInContext(source.slice(source.indexOf('  function stageRecordName('),source.indexOf('  function earnedCoins(')),c);
  vm.runInContext(source.slice(source.indexOf('  function buildQuestionDeck('),source.indexOf('  async function loadAll(')),c);
  c.configureStoryContent();
  return {c,switchLevel(v){level=v;c.configureStoryContent();}};
}
test('7C shares every 7A/7B word pool and runs six five-pair groups in sixty seconds',()=>{
  const {c,switchLevel}=setup();
  for(const level of ['elementary','middle']){
    switchLevel(level);
    for(let n=1;n<=30;n++){
      const stage=c.stages[`story-ch7c-${n}`];
      assert.deepEqual(stage.words,c.stages[`story-ch7a-${n}`].words);
      assert.deepEqual(stage.words,c.stages[`story-ch7b-${n}`].words);
      assert.equal(stage.questionCount,n===10?200:30);
      assert.equal(stage.questionTimeMs,2000);
      assert.equal(stage.vocabularyDay,n);
      assert.equal(stage.encounterName,n===10?'봉인 병기 아르카온':n===30?'봉인의 수호기사':null);
      assert.equal(stage.arkaon,n===10);
      assert.equal(stage.guardian,false);
      assert.equal(stage.redSkullKnight,false);
      assert.equal(stage.nereus,false);
      assert.equal(stage.darkTriton,false);
      if(n===10)continue; // Dedicated boss clock and deck are covered by arkaon-boss.test.mjs.
      const deck=c.buildQuestionDeck(stage);
      assert.equal(deck.length*stage.questionTimeMs,60000);
      assert.equal(new Set(deck.map(q=>q.entry[0].toLowerCase())).size,Math.min(30,stage.words.length));
      for(let i=0;i<30;i+=5)assert.equal(new Set(deck.slice(i,i+5).map(q=>q.entry[0].toLowerCase())).size,5);
    }
  }
});
test('7C opens after 6B, stays on its branch, and shares progress and replay across learning levels',()=>{
  const {c,switchLevel}=setup(),index=c.storyStages.findIndex(s=>s.key==='story-ch7c-1');
  assert.equal(c.storyStageUnlocked(index),false);
  c.records.push({stage:c.stageRecordName('story-ch6-20'),cleared:true});
  assert.equal(c.storyStageUnlocked(index),true);
  c.demoState.storyBranch='6A';assert.equal(c.storyStageUnlocked(index),false);
  c.demoState.storyBranch='6B';
  const record=c.stageRecordName('story-ch7c-1');
  assert.equal(record,'스토리 7C장 1 · 왕국 지하 던전');
  assert.equal(c.storyStageUnlocked(index+1),false);
  c.records.push({stage:record,cleared:true});
  switchLevel('elementary');
  assert.equal(c.stageRecordName('story-ch7c-1'),record);
  assert.equal(c.stageCleared('story-ch7c-1'),true);
  assert.equal(c.storyStageUnlocked(index+1),true);
});
test('7C background and sentry use shared pause/contact/hit playback with valid strip geometry',()=>{
  const {c}=setup();
  c.selectedStage='story-ch7c-1';c.run={story:true};
  vm.runInContext(source.slice(source.indexOf('  function storyBattleBackgroundClass('),source.indexOf('  function crystalSpiderMobsMarkup(')),c);
  assert.equal(c.storyBattleBackgroundClass(),'world-seven-c-battle');
  for(const action of ['idle','attack','hit']){
    const meta=JSON.parse(read(`assets/monsters/world-7c/arcane-sentry-sd-${action}-strip.json`));
    assert.equal(meta.frameWidth,448);assert.equal(meta.frameHeight,320);
    assert.equal(meta.frameCount,action==='idle'?2:3);
    if(action==='hit')assert.equal(meta.frames.at(-1).hold,true);
  }
  assert.match(source,/sentryMob:Boolean\(source.story&&source.storyChapter===10\)/);
  assert.match(source,/run.sentryMob\?'arcane-sentry-mob'/);
  assert.match(source,/run.sentryMob\?'고대 마도 파수병'/);
  assert.doesNotMatch(source,/if\(selectedStoryWorld===10\)return renderWorldSevenCMap/);
});
