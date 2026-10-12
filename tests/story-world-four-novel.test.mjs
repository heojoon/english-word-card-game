import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parseWorldFourPrologue} from '../scripts/generate-story-novel.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const source=read('crystal-game.js');
const markdown=read('assets/novel/world-4-1-prologue.md');
const lines=parseWorldFourPrologue(markdown);
const window={};
vm.runInNewContext(read('story-novel.js'),{window});

test('world 4 preserves every dialogue, stage direction and the final joke in order',()=>{
  const spoken=[...markdown.matchAll(/^(아서|소서러스|바이올렛|파이터): (.+)$/gm)].map(([,speaker,text])=>({speaker,text}));
  assert.deepEqual(lines.filter(line=>line.className!=='scene').map(({speaker,text})=>({speaker,text})),spoken);
  assert.deepEqual([...new Set(lines.map(line=>line.sceneNumber))],[0,1,2,3]);
  assert.match(lines[0].text,/타락한 천사에게 추방당한/);
  assert.ok(lines.some(line=>line.text==='(일행이 정신력 회복 물약을 마신다.)'));
  assert.equal(lines.at(-1).speaker,'아서');
  assert.equal(lines.at(-1).text,'맛있겠다...');
  assert.equal(JSON.stringify(window.WORDORIA_NOVELS.world4Prologue),JSON.stringify(lines));
});

test('world 4 first stage respects entry checks and starts its selected battle after the novel',()=>{
  for(const [unlocked,ready,allowed] of [[true,true,true],[false,true,true],[true,false,true],[true,true,false]]){
    const pages=[],started=[];
    const c=vm.createContext({storyStages:[{key:'story-ch4-1',chapter:4,number:1}],stages:{'story-ch4-1':{}},storyStageUnlocked:()=>unlocked,levelReady:()=>ready,storyEntryAllowed:()=>allowed,selectedStage:null,storyDialogueIndex:10,closeDialog(){},go:p=>pages.push(p),startBattle:()=>started.push(c.selectedStage),window,bossEncounter:()=>false});
    vm.runInContext(source.slice(source.indexOf('  function startStoryStage('),source.indexOf('  function renderStages(')),c);
    c.startStoryStage('story-ch4-1');
    assert.deepEqual(pages,unlocked&&ready&&allowed?['storyChapterFourIntro']:[]);
    assert.deepEqual(started,[]);
    if(!unlocked||!ready||!allowed)continue;
    assert.equal(c.storyDialogueIndex,0);
    c.page=pages[0];
    vm.runInContext(source.slice(source.indexOf('  function completeStoryDialogue('),source.indexOf('  function epilogueLines(')),c);
    assert.equal(JSON.stringify(c.storyDialogueLines()),JSON.stringify(lines));
    c.completeStoryDialogue();
    assert.deepEqual(started,['story-ch4-1']);
  }
});

test('world 4 shows scene labels and the battle action on its final dialogue',()=>{
  const c=vm.createContext({page:'storyChapterFourIntro',storyDialogueIndex:lines.length-1,classDefs:{},esc:value=>value,deployedAssetUrl:value=>value,lines});
  vm.runInContext(source.slice(source.indexOf('  function renderStoryScene('),source.indexOf('  const renderStoryIntro=')),c);
  const markup=vm.runInContext("renderStoryScene(lines,'환각의 땅','전투 시작 →')",c);
  assert.match(markup,/story-vn-chapter-four/);
  assert.match(markup,/illusion-scene/);
  assert.match(markup,/사탕 괴물/);
  assert.match(markup,/맛있겠다\.\.\./);
  assert.match(markup,/전투 시작 →/);
});
