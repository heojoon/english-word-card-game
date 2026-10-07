import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
const setup=source.slice(source.indexOf('  const stages ='),source.indexOf('  const storyStageKey='));
function content(level){
  const words=prefix=>Array.from({length:8},(_,i)=>[`${prefix}${i}`,'명',`${prefix} 뜻 ${i}`]);
  const stages={};
  for(let n=1;n<=7;n++)stages[`s${n}`]={name:`Stage ${n}`,words:words('middle')};
  const context={window:{QUIZ_STAGES:stages},accountMode:true,accountProfile:{learning_level:level}};
  vm.runInNewContext(setup+';globalThis.api={configureStoryContent,levelReady,storyStages,stages};',context);
  return context;
}
test('existing story names, words and counts remain middle-school content',()=>{
  const {api}=content('middle');api.configureStoryContent();
  assert.equal(api.stages['story-lv1'].recordName,'스토리 LV.1 · 속삭이는 숲');
  assert.equal(api.stages['story-lv1'].words.length,5);
  assert.equal(api.stages['story-lv2'].questionCount,20);
  assert.ok(api.levelReady(api.stages['story-lv1']));
});
test('elementary never falls back to middle-school vocabulary',()=>{
  const {api}=content('elementary');api.configureStoryContent();
  for(const story of api.storyStages){assert.equal(api.stages[story.key].words.length,0);assert.equal(api.levelReady(api.stages[story.key]),false);}
  assert.equal(api.levelReady(api.stages.s1),false);
});
test('same scenario uses separate word pools and clear-record names after switching',()=>{
  const context=content('elementary'),{api}=context;
  api.stages.e1={name:'초등 맵',learningLevel:'elementary',words:Array.from({length:6},(_,i)=>[`easy${i}`,'명','쉬운 뜻'])};
  api.configureStoryContent();
  assert.ok(api.levelReady(api.stages['story-lv1']));
  assert.equal(api.stages['story-lv1'].words[0][0],'easy0');
  assert.equal(api.stages['story-lv1'].recordName,'스토리 LV.1 · 속삭이는 숲 · 초등학생');
  context.accountProfile.learning_level='middle';api.configureStoryContent();
  assert.equal(api.stages['story-lv1'].words[0][0],'middle0');
  assert.equal(api.stages['story-lv1'].recordName,'스토리 LV.1 · 속삭이는 숲');
});
test('current catalog is entirely middle-school vocabulary',()=>{
  const catalog=JSON.parse(readFileSync(new URL('../content/catalog.json',import.meta.url)));
  assert.equal(Object.keys(catalog.stages).length,7);
  assert.ok(Object.values(catalog.stages).every(stage=>stage.learningLevel==='middle'));
});
