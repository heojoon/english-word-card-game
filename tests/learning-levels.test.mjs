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
test('same scenario uses separate word pools and common clear-record names after switching',()=>{
  const context=content('elementary'),{api}=context;
  const keys=Array.from({length:7},(_,i)=>`creator:map-${i+1}`);
  keys.forEach((key,index)=>{api.stages[key]={mapId:`map-${index+1}`,learningLevel:'elementary',words:Array.from({length:30},(_,i)=>[`easy${index+1}-${i}`,'단어','쉬운 뜻'])};});
  api.configureStoryContent({code:'7YA8',keys});
  assert.ok(api.levelReady(api.stages['story-lv1']));
  api.storyStages.forEach((story,index)=>{
    const stage=api.stages[story.key];
    assert.equal(stage.words[0][0],`easy${index+1}-0`);
    assert.equal(stage.sourceMapId,`map-${index+1}`);
    assert.equal(stage.worldCode,'7YA8');
    assert.equal(stage.questionCount,index===1?5:20);
    assert.ok(api.levelReady(stage));
  });
  assert.equal(api.stages['story-lv1'].recordName,'스토리 LV.1 · 속삭이는 숲');
  context.accountProfile.learning_level='middle';api.configureStoryContent();
  assert.equal(api.stages['story-lv1'].words[0][0],'middle0');
  assert.equal(api.stages['story-lv1'].recordName,'스토리 LV.1 · 속삭이는 숲');
});
test('elementary story rejects another world and clears stale content on reload',()=>{
  const {api}=content('elementary');
  api.stages.e1={learningLevel:'elementary',words:Array.from({length:6},()=>['easy','단어','쉬운 뜻'])};
  api.configureStoryContent({code:'OTHER',keys:Array(7).fill('e1')});
  assert.ok(api.storyStages.every(story=>!api.levelReady(api.stages[story.key])));
  api.configureStoryContent({code:'7YA8',keys:Array(7).fill('e1')});
  assert.ok(api.levelReady(api.stages['story-prologue']));
  api.configureStoryContent();
  assert.ok(api.storyStages.every(story=>!api.levelReady(api.stages[story.key])));
});
test('story clears and unlocks survive level changes in both directions',()=>{
  const context=content('middle'),{api}=context;
  context.records=[];context.allCharacters=[{id:'mine'}];
  vm.runInNewContext(source.slice(source.indexOf('  function stageRecordName('),source.indexOf('  function earnedCoins('))+';globalThis.progress={stageCleared,storyStageUnlocked};',context);
  for(const level of ['middle','elementary']){
    context.accountProfile.learning_level=level;api.configureStoryContent();
    context.records=[{stage:api.stages['story-lv1'].recordName,cleared:true,character_id:'mine'}];
    context.accountProfile.learning_level=level==='middle'?'elementary':'middle';api.configureStoryContent();
    assert.equal(context.progress.stageCleared('story-lv1'),true);
    assert.equal(context.progress.storyStageUnlocked(2),true);
    assert.equal(context.progress.storyStageUnlocked(3),false);
  }
  context.records=[{stage:'스토리 LV.1 · 속삭이는 숲 · 초등학생',cleared:true,character_id:'mine'}];
  assert.equal(context.progress.stageCleared('story-lv1'),true);
  context.records[0].character_id='someone-else';
  assert.equal(context.progress.stageCleared('story-lv1'),false);
});
test('creator loading connects the seven approved elementary maps to story',async()=>{
  const context=content('elementary'),{api}=context;
  const maps=Array.from({length:7},(_,i)=>({id:`map-${i+1}`,world_id:'forest',title:`day.${i+1}`,total_question_count:30,learning_level:'elementary'}));
  context.apiGet=async path=>path.startsWith('worlds?')?[{id:'forest',name:'속삭이는 숲',world_code:'7YA8'}]:path.startsWith('maps?')?maps:maps.flatMap(map=>Array.from({length:30},(_,i)=>({map_id:map.id,row_order:i+1,english:`${map.id}-word-${i}`,korean:`뜻 ${i}`})));
  context.worlds=[];context.creatorStageKeys=[];context.stageKeys=[];
  vm.runInNewContext(source.slice(source.indexOf('  function playableWords('),source.indexOf('  function buildQuestionDeck('))+';globalThis.loadCreatorContent=loadCreatorContent;',context);
  await context.loadCreatorContent();
  assert.equal(context.worlds[0].keys.length,7);
  api.storyStages.forEach((story,i)=>{
    assert.equal(api.stages[story.key].sourceMapId,maps[i].id);
    assert.equal(api.stages[story.key].words.length,i===1?5:30);
    assert.ok(api.levelReady(api.stages[story.key]));
  });
});
test('current catalog is entirely middle-school vocabulary',()=>{
  const catalog=JSON.parse(readFileSync(new URL('../content/catalog.json',import.meta.url)));
  assert.equal(Object.keys(catalog.stages).length,7);
  assert.ok(Object.values(catalog.stages).every(stage=>stage.learningLevel==='middle'));
});
