import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import {parseWorldSevenNarrative} from '../scripts/generate-story-novel.mjs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('crystal-game.js');
const slice=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end));

test('all World 7 scenes preserve dialogue, narration and available art',()=>{
  const context={window:{}};
  vm.runInNewContext(read('story-novel.js'),context);
  for(const world of ['7a','7b'])for(const [phase,file] of [['Prologue','1-prologue'],['MidbossStart','midboss-start'],['MidbossEnd','midboss-end'],['BossStart','boss-start'],['BossEnd','boss-end'],...(world==='7b'?[['Epilogue','epilogue']]:[])]){
    const lines=parseWorldSevenNarrative(read(`assets/novel/world-${world}-${file}.md`),{world,location:'location'});
    assert.ok(lines.length>10);
    assert.equal(lines[0].speaker,'내레이션');
    assert.ok(lines.some(line=>line.speaker==='소서러스'&&line.className==='mage'));
    assert.ok(lines.some(line=>line.speaker==='다크 소서러스'&&line.artPath));
    assert.equal(context.window.WORDORIA_NOVELS[`world${world}${phase}`].length,lines.length);
    for(const line of lines)for(const path of [line.artPath,line.backgroundPath].filter(Boolean))assert.ok(existsSync(new URL('../'+path,import.meta.url)),path);
  }
});

test('World 7 entry and dialogue completion route each milestone and the 7B epilogue',()=>{
  const c=vm.createContext({stages:{},storyStageUnlocked:()=>true,levelReady:()=>true,storyEntryAllowed:()=>true,closeDialog(){},go(p){c.page=p;},startBattle(){c.page='battle';}});
  vm.runInContext(slice('  function startStoryStage(','  function renderStages('),c);
  vm.runInContext(slice('  function worldSevenNovelKey(','  function storyDialogueLines('),c);
  for(const chapter of [8,9])for(const [number,phase] of [[1,'Intro'],[15,'MidbossStart'],[30,'BossStart'],[2,null]]){
    const stage={key:'stage',chapter,number};c.storyStages=[stage];c.stages.stage={storyChapter:chapter};
    c.startStoryStage('stage');
    assert.equal(c.page,phase?`storyChapterSeven${phase}`:'battle');
    if(phase){assert.equal(c.worldSevenNovelKey(),`world${chapter===8?'7a':'7b'}${phase==='Intro'?'Prologue':phase}`);c.completeStoryDialogue();assert.equal(c.page,'battle');}
    c.page='storyChapterSevenMidbossEnd';c.completeStoryDialogue();assert.equal(c.page,'result');
    c.page='storyChapterSevenBossEnd';c.completeStoryDialogue();
    assert.equal(c.page,chapter===8?'result':'storyChapterSevenEpilogue');
    if(chapter===9){assert.equal(c.storyDialogueIndex,0);c.completeStoryDialogue();assert.equal(c.page,'result');}
  }
});

test('pause world exit returns to the active world for normal battles and all boss families',async()=>{
  const handler=source.split("else if(action==='leave'){")[1].split('\n')[0];
  const body=handler.slice(0,handler.lastIndexOf('}'));
  for(const type of [{},{boss:true},{guardian:true},{guardian:true,morgana:true}]){
    const c=vm.createContext({run:{story:true,...type},b:{dataset:{page:'story'}},selectedStage:'active',stages:{active:{storyChapter:9}},selectedStoryWorld:1,pendingStoryRun:{},closeDialog(){},finishBattle:async()=>{c.run.done=true;},go:p=>{c.page=p;}});
    await vm.runInContext(`(async()=>{${body}})()`,c);
    assert.equal(c.page,'story');assert.equal(c.selectedStoryWorld,9);assert.equal(c.selectedStoryStage,'active');assert.equal(c.pendingStoryRun,null);
    c.run.saveError=true;c.page='battle';
    await vm.runInContext(`(async()=>{${body}})()`,c);
    assert.equal(c.page,'battle');
  }
  const c=vm.createContext({run:{story:true}});
  vm.runInContext(slice('  function pauseActionsMarkup(','  function pause()'),c);
  assert.match(c.pauseActionsMarkup(),/data-page="story">월드로/);
  c.run.story=false;assert.doesNotMatch(c.pauseActionsMarkup(),/data-page="story"/);
});

test('World 7 victory shows ending dialogue while defeat and ordinary stages show results',async()=>{
  for(const chapter of [8,9])for(const number of [2,15,30])for(const clear of [true,false]){
    const stage={key:'active',chapter,number};
    const c=vm.createContext({run:{story:true,deck:[],correct:0},selectedStage:'active',storyStages:[stage],persistStoryBattleVitals(){},clearInterval(){},clearTimeout(){},removeBattleReward(){},cancelSpeech(){},timerId:0,nextTimer:0,saveBattleResult:async()=>{},stageCleared:()=>true,storyStageUnlocked:()=>true,go:p=>{c.page=p;},document:{dispatchEvent(){}},CustomEvent:class{}});
    vm.runInContext(slice('  async function finishBattle(','  async function saveBattleResult('),c);
    await c.finishBattle(clear,clear?'complete':'leave');
    assert.equal(c.page,clear&&number!==2?`storyChapterSeven${number===15?'MidbossEnd':'BossEnd'}`:'result');
    assert.equal(c.run.done,true);
  }
});
