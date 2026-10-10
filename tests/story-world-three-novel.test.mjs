import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import {parseWorldThreePrologue,parseWorldThreeBoss} from '../scripts/generate-story-novel.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const source=read('crystal-game.js');
const markdown=read('assets/novel/world-3-1-prologue.md');
const lines=parseWorldThreePrologue(markdown);
const window={};
vm.runInNewContext(read('story-novel.js'),{window});

test('world 3 preserves dialogue and thoughts, skips metadata and ends with the goal',()=>{
  const spoken=[...markdown.matchAll(/\*\*(.+?)\*\*\s*\n["']([^\n]+)["']/g)].map(m=>({speaker:m[1],text:m[2]}));
  assert.deepEqual(lines.filter(line=>spoken.some(d=>d.speaker===line.speaker&&d.text===line.text)).map(({speaker,text})=>({speaker,text})),spoken);
  assert.equal(lines.find(line=>line.text==='좋아. 일단 저 아이를 관찰해 보겠어.').speaker,'소서러스 (속마음)');
  assert.equal(lines.find(line=>line.text==='아까부터 저 아이 주변에서만 마력이 흔들리고 있어.').className,'mage');
  assert.ok(lines.every(line=>!/^\[|파일명:|등장인물:|배경:/.test(line.text)));
  assert.equal(lines.at(-1).text,'수상한 꼬마아이의 행방을 추적하라.');
  assert.equal(JSON.stringify(window.WORDORIA_NOVELS.world3Prologue),JSON.stringify(lines));
});

test('world 3 changes background exactly at scene 4 and uses available assets',()=>{
  const context=vm.createContext({page:'storyChapterThreeIntro',storyDialogueIndex:0,classDefs:{},esc:value=>value,deployedAssetUrl:value=>value,stages:{},selectedStage:'story-ch3-1'});
  vm.runInContext(source.slice(source.indexOf('  function renderStoryScene('),source.indexOf('  const renderStoryIntro=')),context);
  context.lines=lines;
  for(let i=0;i<lines.length;i++){
    context.storyDialogueIndex=i;
    const markup=vm.runInContext("renderStoryScene(lines,'프롤로그','전투 시작 →')",context);
    assert.match(markup,lines[i].sceneNumber===4?/crystal-festival-scene/:/crystal-village-scene/);
    assert.equal(lines[i].scene,lines[i].sceneNumber===4?'festival':'village');
  }
  const css=read('crystal-game.css');
  for(const file of ['world3-1-bgi.jpg','world3-2-bgi.jpg']){
    assert.ok(css.includes('assets/novel/bgi/'+file));
    assert.ok(existsSync(new URL('../assets/novel/bgi/'+file,import.meta.url)));
  }
});

test('every child dialogue renders the transparent standing CG',()=>{
  const childLines=lines.filter(line=>line.speaker==='꼬마아이');
  assert.ok(childLines.length>=4);
  const path='assets/novel/characters/char_mysterious_village_child_standing.webp';
  assert.ok(existsSync(new URL('../'+path,import.meta.url)));
  const c=vm.createContext({page:'storyChapterThreeIntro',storyDialogueIndex:0,classDefs:{},esc:value=>value,deployedAssetUrl:value=>value});
  vm.runInContext(source.slice(source.indexOf('  function renderStoryScene('),source.indexOf('  const renderStoryIntro=')),c);
  for(const line of childLines){
    assert.equal(line.className,'village-child');
    assert.equal(line.artPath,path);
    c.lines=[line];
    const markup=vm.runInContext("renderStoryScene(lines,'프롤로그','전투 시작 →')",c);
    assert.ok(markup.includes(`src="${path}"`));
    assert.match(markup,/story-vn-character village-child/);
  }
});

test('world 3 stage 1 opens the novel, respects locks and starts its battle on completion or skip',()=>{
  for(const [unlocked,ready] of [[true,true],[false,true],[true,false]]){
    const pages=[],started=[];
    const c=vm.createContext({storyStages:[{key:'story-ch3-1',chapter:3,number:1}],stages:{'story-ch3-1':{}},storyStageUnlocked:()=>unlocked,levelReady:()=>ready,storyEntryAllowed:()=>true,selectedStage:null,storyDialogueIndex:10,closeDialog(){},go:p=>pages.push(p),startBattle:()=>started.push(c.selectedStage),window,bossEncounter:()=>false});
    vm.runInContext(source.slice(source.indexOf('  function startStoryStage('),source.indexOf('  function renderStages(')),c);
    c.startStoryStage('story-ch3-1');
    assert.deepEqual(pages,unlocked&&ready?['storyChapterThreeIntro']:[]);
    assert.deepEqual(started,[]);
    if(!unlocked||!ready)continue;
    assert.equal(c.storyDialogueIndex,0);
    c.page=pages[0];
    vm.runInContext(source.slice(source.indexOf('  function completeStoryDialogue('),source.indexOf('  function epilogueLines(')),c);
    assert.equal(JSON.stringify(c.storyDialogueLines()),JSON.stringify(lines));
    c.completeStoryDialogue();
    assert.deepEqual(started,['story-ch3-1']);
  }
});


test('world 3 boss start changes background at scenes 5, 6 and 7 without changing the ending',()=>{
  const bossLines=parseWorldThreeBoss(read('assets/novel/world-3-8-boss-start.md'));
  assert.equal(JSON.stringify(window.WORDORIA_NOVELS.world3BossStart),JSON.stringify(bossLines));
  assert.deepEqual([...new Set(bossLines.map(line=>line.sceneNumber))],[5,6,7]);
  const sceneClasses={5:'world-three-cave-scene',6:'world-three-mine-scene',7:'world-three-lich-dragon-scene'};
  const context=vm.createContext({page:'storyChapterThreeBossStart',storyDialogueIndex:0,classDefs:{},esc:value=>value,deployedAssetUrl:value=>value});
  vm.runInContext(source.slice(source.indexOf('  function renderStoryScene('),source.indexOf('  const renderStoryIntro=')),context);
  context.lines=bossLines;
  const childLines=bossLines.filter(line=>line.speaker==='꼬마아이');
  assert.equal(childLines.length,2);
  for(const line of childLines){
    assert.equal(line.className,'village-child');
    assert.equal(line.artPath,'assets/novel/characters/char_mysterious_village_child_standing.webp');
  }
  for(let i=0;i<bossLines.length;i++){
    context.storyDialogueIndex=i;
    const markup=vm.runInContext("renderStoryScene(lines,'보스','보스전 시작 →')",context);
    assert.ok(markup.includes(`story-vn-scene ${sceneClasses[bossLines[i].sceneNumber]}`));
    if(bossLines[i].speaker==='꼬마아이'){
      assert.ok(markup.includes(`src="${bossLines[i].artPath}"`));
      assert.match(markup,/story-vn-character village-child/);
    }
  }
  const css=read('crystal-game.css');
  for(const [number,sceneClass] of Object.entries(sceneClasses)){
    const path=`assets/novel/bgi/world3-${number}-bgi.${number==='5'?'png':'jpg'}`;
    assert.ok(css.includes(`.story-vn-scene.${sceneClass}{background:var(--ink) url('${path}')`));
    assert.ok(existsSync(new URL('../'+path,import.meta.url)));
  }
  context.page='storyChapterThreeBossEnd';
  context.storyDialogueIndex=0;
  context.lines=parseWorldThreeBoss(read('assets/novel/world-3-8-boss-end.md'));
  assert.match(vm.runInContext("renderStoryScene(lines,'승리','보상 확인 →')",context),/story-vn-scene black-dragon-scene/);
});


test('world 3 boss novels advance once per scene click or key and complete at the last beat',()=>{
  const clickStart=source.indexOf("  document.addEventListener('click',event=>{\n    const scene=event.target.closest('.story-vn');");
  const clickEnd=source.indexOf("  document.addEventListener('click',async event=>",clickStart);
  const keyStart=source.indexOf("  document.addEventListener('keydown',event=>{if(page==='battle'");
  const keyEnd=source.indexOf('\n',keyStart);
  for(const page of ['storyChapterThreeBossStart','storyChapterThreeBossEnd']){
    const listeners={};
    let renders=0,completed=0;
    const c=vm.createContext({page,storyDialogueIndex:0,document:{addEventListener:(type,handler)=>{listeners[type]=handler;}},storyDialogueLines:()=>[{},{}],render:()=>renders++,completeStoryDialogue:()=>completed++,$:()=>null});
    vm.runInContext(source.slice(clickStart,clickEnd)+source.slice(keyStart,keyEnd),c);
    const sceneTarget={closest:selector=>selector==='.story-vn'?{}:null};
    listeners.click({target:sceneTarget});
    assert.equal(c.storyDialogueIndex,1);
    assert.equal(renders,1);
    assert.equal(completed,0);
    listeners.click({target:sceneTarget});
    assert.equal(completed,1);
    c.storyDialogueIndex=0;
    const skipTarget={closest:selector=>['.story-vn','.story-vn-skip'].includes(selector)?{}:null};
    listeners.click({target:skipTarget});
    assert.equal(c.storyDialogueIndex,0);
    assert.equal(completed,1);
    for(const key of ['Enter',' ','ArrowRight']){
      c.storyDialogueIndex=0;
      let prevented=false;
      listeners.keydown({key,target:sceneTarget,preventDefault(){prevented=true;}});
      assert.equal(c.storyDialogueIndex,1);
      assert.equal(prevented,true);
    }
    listeners.keydown({key:'Enter',target:sceneTarget,preventDefault(){}});
    assert.equal(completed,2);
    listeners.keydown({key:'Enter',target:{closest:()=>({})},preventDefault(){throw new Error('button should handle its own key');}});
    assert.equal(completed,2);
  }
});
