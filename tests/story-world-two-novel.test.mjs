import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parseWorldTwoPrologue} from '../scripts/generate-story-novel.mjs';

const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
const markdown=readFileSync(new URL('../assets/novel/word-2-prologue.md',import.meta.url),'utf8');
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
  const context=vm.createContext({storyStages:[{key:'story-prologue',number:1,intro:true},{key:'story-ch2-1',chapter:2,number:1},{key:'story-ch2-2',chapter:2,number:2}],stages:{'story-prologue':{},'story-ch2-1':{},'story-ch2-2':{}},storyStageUnlocked:()=>unlocked,levelReady:()=>ready,storyDialogueIndex:12,selectedStage:null,selectedStoryStage:null,selectedStoryWorld:1,closeDialog(){},go:p=>pages.push(p),startBattle:()=>started.push(context.selectedStage)});
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
