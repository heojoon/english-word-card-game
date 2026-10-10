import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parseWorldTwoPrologue,parseWorldTwoBoss} from '../scripts/generate-story-novel.mjs';

const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
const markdown=readFileSync(new URL('../assets/novel/world-2-1-prologue.md',import.meta.url),'utf8');
const lines=parseWorldTwoPrologue(markdown);
test('novel keeps every spoken line in original order and closes with the mission',()=>{
  const dialogue=[...markdown.matchAll(/\*\*(.+?)\*\*\s*\n"([^\n]+)"/g)].map(match=>({speaker:match[1],text:match[2]}));
  assert.deepEqual(lines.filter(line=>dialogue.some(d=>d.speaker===line.speaker&&d.text===line.text)).map(({speaker,text})=>({speaker,text})),dialogue);
  assert.equal(lines[0].scene,'approach');
  assert.equal(lines.find(line=>line.text==='우와…….').scene,'temple');
  assert.equal(lines.at(-1).speaker,'MISSION');
  assert.match(lines.at(-1).text,/사원 깊숙한 곳/);
  const context={window:{}};vm.runInNewContext(readFileSync(new URL('../story-novel.js',import.meta.url),'utf8'),context);
  assert.equal(JSON.stringify(context.window.WORDORIA_NOVELS.world2Prologue),JSON.stringify(lines));
});
function setup(stageKey,unlocked=true,ready=true){
  const pages=[],started=[];
  const context=vm.createContext({persistStoryBattleVitals(){},storyEntryAllowed:()=>true,storyStages:[{key:'story-prologue',number:1,intro:true},{key:'story-ch2-1',chapter:2,number:1},{key:'story-ch2-2',chapter:2,number:2},{key:'story-ch2-7',chapter:2,number:7}],stages:{'story-prologue':{},'story-ch2-1':{},'story-ch2-2':{},'story-ch2-7':{}},storyStageUnlocked:()=>unlocked,levelReady:()=>ready,storyDialogueIndex:12,selectedStage:null,selectedStoryStage:null,selectedStoryWorld:1,closeDialog(){},go:p=>pages.push(p),startBattle:()=>started.push(context.selectedStage)});
  vm.runInContext(source.slice(source.indexOf('  function startStoryStage('),source.indexOf('  function renderStages(')),context);
  context.startStoryStage(stageKey);return {context,pages,started};
}
test('world 2 stage 1 always opens its novel before a battle; other entries keep their flow',()=>{
  for(const key of ['story-prologue','story-ch2-1','story-ch2-2']){
    const {context,pages,started}=setup(key);
    assert.deepEqual(pages,key==='story-prologue'?['storyIntro']:key==='story-ch2-1'?['storyChapterTwoIntro']:[]);
    assert.deepEqual(started,key==='story-ch2-2'?[key]:[]);
    if(pages.length)assert.equal(context.storyDialogueIndex,0);
  }
});
test('locked or unavailable vocabulary stages cannot open the novel',()=>{
  for(const args of [[false,true],[true,false]]){const {pages,started}=setup('story-ch2-1',...args);assert.deepEqual(pages,[]);assert.deepEqual(started,[]);}
});
test('completion and skip enter the selected world 2 battle without boss or reward routing',()=>{
  const {context,started}=setup('story-ch2-1');
  context.page='storyChapterTwoIntro';context.bossEncounter=()=>false;
  context.completeRoyalSlimeVictoryStory=()=>assert.fail('boss reward');context.startRoyalSlimeBattle=()=>assert.fail('forest boss');
  vm.runInContext(source.slice(source.indexOf('  function completeStoryDialogue('),source.indexOf('  function storyDialogueLines(')),context);
  context.completeStoryDialogue();assert.deepEqual(started,['story-ch2-1']);
});

test('boss files preserve dialogue, action headings, recovery, and the ending in generated data',()=>{
  const context={window:{}};
  vm.runInNewContext(readFileSync(new URL('../story-novel.js',import.meta.url),'utf8'),context);
  for(const [file,key] of [['start','world2BossStart'],['end','world2BossEnd']]){
    const markdown=readFileSync(new URL(`../assets/novel/world-2-7-boss-${file}.md`,import.meta.url),'utf8');
    const parsed=parseWorldTwoBoss(markdown);
    const dialogue=[...markdown.matchAll(/\*\*(.+?)\*\*\s*\\?\s*\n"([^\n]+)"/g)].map(match=>({speaker:match[1].replace(/\s+/g,' '),text:match[2]}));
    assert.deepEqual(parsed.filter(line=>line.speaker!=='내레이션').map(({speaker,text})=>({speaker,text})),dialogue);
    assert.equal(JSON.stringify(context.window.WORDORIA_NOVELS[key]),JSON.stringify(parsed));
    assert.ok(parsed.every(line=>line.scene==='temple'));
  }
  assert.ok(context.window.WORDORIA_NOVELS.world2BossStart.some(line=>line.text==='HP FULL'));
  assert.equal(context.window.WORDORIA_NOVELS.world2BossEnd.at(-1).text,'TO BE CONTINUED');
});
test('stage 7 opens the encounter and starts battle only after dialogue completion',()=>{
  const {context,pages,started}=setup('story-ch2-7');
  assert.deepEqual(pages,['storyChapterTwoBossStart']);assert.deepEqual(started,[]);
  context.page=pages[0];context.bossEncounter=()=>false;
  vm.runInContext(source.slice(source.indexOf('  function completeStoryDialogue('),source.indexOf('  function storyDialogueLines(')),context);
  context.completeStoryDialogue();assert.deepEqual(started,['story-ch2-7']);
});
test('stage 7 victory shows ending before results; failure and other stages retain results',async()=>{
  for(const [key,clear,replay,expected] of [
    ['story-ch2-7',true,false,'storyChapterTwoBossEnd'],
    ['story-ch2-7',true,true,'storyChapterTwoBossEnd'],
    ['story-ch2-7',false,false,'result'],
    ['story-ch2-2',true,false,'result']
  ]){
    const {context,pages}=setup(key);
    pages.length=0;
    Object.assign(context,{run:{story:true,storyReplay:replay,done:false},localMode:false,dbOnline:false,timerId:null,nextTimer:null,
      clearInterval(){},clearTimeout(){},removeBattleReward(){},cancelSpeech(){},stageCleared:()=>true,emitAudio(){},playStageClearSound(){},document:{dispatchEvent(){}},CustomEvent:class {}});
    vm.runInContext(source.slice(source.indexOf('  async function finishBattle('),source.indexOf('  function clearSummaryMarkup(')),context);
    await context.finishBattle(clear,'test');
    assert.deepEqual(pages,[expected]);
    if(expected==='storyChapterTwoBossEnd'){
      context.page=expected;
      vm.runInContext(source.slice(source.indexOf('  function completeStoryDialogue('),source.indexOf('  function storyDialogueLines(')),context);
      context.completeStoryDialogue();assert.deepEqual(pages,[expected,'result']);
    }
  }
});
