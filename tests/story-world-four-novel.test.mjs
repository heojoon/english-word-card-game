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

const midbossMarkdown=read('assets/novel/world-4-10-midboss-start.md');
const midbossLines=window.WORDORIA_NOVELS.world4MidbossStart;

test('world 4 midboss preserves all dialogue and directions across four scenes',async()=>{
  const {parseWorldFourMidboss}=await import('../scripts/generate-story-novel.mjs');
  const parsed=parseWorldFourMidboss(midbossMarkdown);
  const spoken=[...midbossMarkdown.matchAll(/^([^:\n]+): (.+)$/gm)].filter(([,speaker])=>speaker!=='등장 보스').map(([,speaker,text])=>({speaker,text}));
  assert.deepEqual(parsed.filter(line=>line.speaker!=='내레이션').map(({speaker,text})=>({speaker,text})),spoken);
  assert.deepEqual([...new Set(parsed.map(line=>line.sceneNumber))],[1,2,3,4]);
  assert.equal(JSON.stringify(parsed),JSON.stringify(midbossLines));
  assert.equal(parsed.at(-1).speaker,'소서러스');
  assert.equal(parsed.at(-1).text,'덤벼라!!');
  assert.ok(parsed.some(line=>line.text.includes('이번에는 뚫린 부분이 재생되지')));
  for(const line of parsed.filter(line=>line.artPath))assert.ok(readFileSync(new URL('../'+line.artPath,import.meta.url)).length>0);
});

test('only world 4 stage 10 opens the midboss novel after entry checks and starts its selected stage',()=>{
  for(const [number,unlocked,ready,allowed] of [[10,true,true,true],[10,false,true,true],[10,true,false,true],[10,true,true,false],[9,true,true,true],[11,true,true,true]]){
    const key=`story-ch4-${number}`,pages=[],started=[];
    const c=vm.createContext({storyStages:[{key,chapter:4,number}],stages:{[key]:{}},storyStageUnlocked:()=>unlocked,levelReady:()=>ready,storyEntryAllowed:()=>allowed,selectedStage:null,storyDialogueIndex:5,closeDialog(){},go:p=>pages.push(p),startBattle:()=>started.push(c.selectedStage),window,bossEncounter:()=>false});
    vm.runInContext(source.slice(source.indexOf('  function startStoryStage('),source.indexOf('  function renderStages(')),c);
    c.startStoryStage(key);
    if(!unlocked||!ready||!allowed){assert.deepEqual(pages,[]);assert.deepEqual(started,[]);continue;}
    if(number!==10){assert.deepEqual(pages,[]);assert.deepEqual(started,[key]);continue;}
    assert.deepEqual(pages,['storyChapterFourMidbossStart']);
    assert.equal(c.storyDialogueIndex,0);
    assert.deepEqual(started,[]);
    c.page=pages[0];
    vm.runInContext(source.slice(source.indexOf('  function completeStoryDialogue('),source.indexOf('  function epilogueLines(')),c);
    assert.equal(JSON.stringify(c.storyDialogueLines()),JSON.stringify(midbossLines));
    c.completeStoryDialogue();
    assert.deepEqual(started,[key]);
  }
});

test('midboss final dialogue offers battle entry and shared controls recognize the new page',()=>{
  const c=vm.createContext({page:'storyChapterFourMidbossStart',storyDialogueIndex:midbossLines.length-1,classDefs:{},esc:value=>value,deployedAssetUrl:value=>value,lines:midbossLines});
  vm.runInContext(source.slice(source.indexOf('  function renderStoryScene('),source.indexOf('  const renderStoryIntro=')),c);
  const markup=vm.runInContext("renderStoryScene(lines,'환각의 땅','중간보스 전투 시작 →')",c);
  assert.match(markup,/그림자의 약점/);
  assert.match(markup,/덤벼라!!/);
  assert.match(markup,/중간보스 전투 시작 →/);
  assert.match(markup,/story-dialogue-skip/);
  for(const fragment of [source.slice(source.indexOf('    if(!scene||event.target'),source.indexOf('    if(!scene||event.target')+600),source.slice(source.indexOf("document.addEventListener('keydown'"))])assert.match(fragment,/storyChapterFourMidbossStart/);
});

const endingMarkdown=read('assets/novel/world-4-10-midboss-end.md');
const endingLines=window.WORDORIA_NOVELS.world4MidbossEnd;

test('world 4 ending preserves final attacks and dissolution, with reward contract in the source',async()=>{
  const {parseWorldFourMidbossEnd}=await import('../scripts/generate-story-novel.mjs');
  const parsed=parseWorldFourMidbossEnd(endingMarkdown);
  const spoken=[...endingMarkdown.matchAll(/^([^:\n]+): (.+)$/gm)].map(([,speaker,text])=>({speaker,text}));
  assert.deepEqual(parsed.filter(line=>line.speaker!=='내레이션').map(({speaker,text})=>({speaker,text})),spoken);
  assert.equal(JSON.stringify(parsed),JSON.stringify(endingLines));
  assert.ok(parsed.every(line=>line.sceneNumber===5));
  assert.ok(parsed.some(line=>line.text==='(쉐도우 소서러스가 완전히 소멸한다.)'));
  assert.equal(parsed.at(-1).text,'쉐도우 소서러스 격파!');
  assert.match(endingMarkdown,/# MID BOSS CLEAR!/);
  assert.match(endingMarkdown,/# \+200 크리스털/);
  assert.ok(!parsed.some(line=>line.text.includes('200')),'do not present an unimplemented reward as paid');
});

test('only cleared world 4 boss stages route to endings, and completion or skip shows saved results',async()=>{
  for(const [chapter,number,clear] of [[4,10,true],[4,10,false],[4,20,true],[4,20,false],[4,19,true],[4,9,true],[3,10,true],[3,20,true]]){
    const key=`story-ch${chapter}-${number}`,pages=[],saved=[];
    const c=vm.createContext({run:{story:true,done:false,petEffects:{clear(){}}},selectedStage:key,storyStages:[{key,chapter,number}],storyStageCleared:()=>true,stageCleared:()=>true,storyStageUnlocked:()=>true,persistStoryBattleVitals(){},clearInterval(){},clearTimeout(){},timerId:null,nextTimer:null,removeBattleReward(){},cancelSpeech(){},saveBattleResult:async(r,success)=>{saved.push(success);r.result={game_score_id:1};},go:p=>pages.push(p),document:{dispatchEvent(){}},CustomEvent:function(){},window});
    vm.runInContext(source.slice(source.indexOf('  async function finishBattle('),source.indexOf('  async function saveBattleResult(')),c);
    await c.finishBattle(clear);
    assert.deepEqual(saved,[clear]);
    const endingPage=chapter===4&&clear?(number===20?'storyChapterFourBossEnd':number===10?'storyChapterFourMidbossEnd':null):null;
    assert.deepEqual(pages,[endingPage||'result']);
    if(endingPage){
      c.page=pages[0];
      vm.runInContext(source.slice(source.indexOf('  function completeStoryDialogue('),source.indexOf('  function epilogueLines(')),c);
      assert.equal(JSON.stringify(c.storyDialogueLines()),JSON.stringify(number===20?window.WORDORIA_NOVELS.world4BossEnd:endingLines));
      c.completeStoryDialogue();
      assert.deepEqual(pages,[endingPage,'result']);
      assert.deepEqual(saved,[true],'ending completion must not save or pay again');
    }
  }
});

test('each world 4 scene uses its own existing background and renders that asset',()=>{
  const groups=[window.WORDORIA_NOVELS.world4Prologue,window.WORDORIA_NOVELS.world4MidbossStart,window.WORDORIA_NOVELS.world4MidbossEnd];
  const backgrounds=new Set();
  for(const group of groups){
    for(const line of group){
      assert.ok(line.backgroundPath);
      assert.ok(readFileSync(new URL('../'+line.backgroundPath,import.meta.url)).length>0);
      backgrounds.add(line.backgroundPath);
    }
    for(const sceneNumber of new Set(group.map(line=>line.sceneNumber))){
      const index=group.findIndex(line=>line.sceneNumber===sceneNumber),line=group[index];
      const c=vm.createContext({page:'storyChapterFourMidbossStart',storyDialogueIndex:index,classDefs:{},esc:value=>value,deployedAssetUrl:value=>value,lines:group});
      vm.runInContext(source.slice(source.indexOf('  function renderStoryScene('),source.indexOf('  const renderStoryIntro=')),c);
      const markup=vm.runInContext("renderStoryScene(lines,'환각의 땅','계속 →')",c);
      assert.ok(markup.includes(`background-image:url('${line.backgroundPath}')`));
    }
  }
  assert.equal(backgrounds.size,8);
});

const bossMarkdown=read('assets/novel/world-4-20-boss-start.md');
const bossLines=window.WORDORIA_NOVELS.world4BossStart;

test('world 4 final boss preserves four scenes, echo speaker and fallen angel reveal',async()=>{
  const {parseWorldFourBossStart}=await import('../scripts/generate-story-novel.mjs');
  const parsed=parseWorldFourBossStart(bossMarkdown);
  assert.equal(JSON.stringify(parsed),JSON.stringify(bossLines));
  assert.deepEqual([...new Set(parsed.map(line=>line.sceneNumber))],[1,2,3,4]);
  const spoken=[...bossMarkdown.matchAll(/^([^:\n]+): (.+)$/gm)].filter(([,speaker])=>speaker!=='스토리 연결').map(([,speaker,text])=>({speaker,text}));
  assert.deepEqual(parsed.filter(line=>!['내레이션','WORLD 4 · FINAL BOSS'].includes(line.speaker)).map(({speaker,text})=>({speaker,text})),spoken);
  assert.equal(parsed.find(line=>line.speaker==='??? (메아리)').className,'mystery');
  assert.ok(parsed.some(line=>line.speaker==='붉은 사신'&&line.text==='타락한 천사님의 오른팔이다...!!!!'));
  assert.deepEqual(parsed.slice(-3).map(line=>line.text),['붉은 사신','죽음과 환상의 지배자','타락한 천사의 오른팔']);
  assert.ok(!parsed.some(line=>line.text.startsWith('스토리 연결:')));
});

test('world 4-20 entry checks precede the novel and completion or skip starts only its battle',()=>{
  for(const [unlocked,ready,allowed] of [[true,true,true],[false,true,true],[true,false,true],[true,true,false]]){
    const pages=[],started=[];
    const c=vm.createContext({storyStages:[{key:'story-ch4-20',chapter:4,number:20}],stages:{'story-ch4-20':{}},storyStageUnlocked:()=>unlocked,levelReady:()=>ready,storyEntryAllowed:()=>allowed,selectedStage:null,storyDialogueIndex:10,closeDialog(){},go:p=>pages.push(p),startBattle:()=>started.push(c.selectedStage),window,bossEncounter:()=>false});
    vm.runInContext(source.slice(source.indexOf('  function startStoryStage('),source.indexOf('  function renderStages(')),c);
    c.startStoryStage('story-ch4-20');
    assert.deepEqual(pages,unlocked&&ready&&allowed?['storyChapterFourBossStart']:[]);
    assert.deepEqual(started,[]);
    if(!unlocked||!ready||!allowed)continue;
    assert.equal(c.storyDialogueIndex,0);
    c.page=pages[0];
    vm.runInContext(source.slice(source.indexOf('  function completeStoryDialogue('),source.indexOf('  function epilogueLines(')),c);
    assert.equal(JSON.stringify(c.storyDialogueLines()),JSON.stringify(bossLines));
    for(const index of [0,bossLines.length-1]){
      c.storyDialogueIndex=index;
      c.completeStoryDialogue();
    }
    assert.deepEqual(started,['story-ch4-20','story-ch4-20']);
    assert.deepEqual(pages,['storyChapterFourBossStart']);
  }
});

test('world 4 final boss title renders with the final battle action and scene label',()=>{
  const c=vm.createContext({page:'storyChapterFourBossStart',storyDialogueIndex:bossLines.length-1,classDefs:{},esc:value=>value,deployedAssetUrl:value=>value,lines:bossLines});
  vm.runInContext(source.slice(source.indexOf('  function renderStoryScene('),source.indexOf('  const renderStoryIntro=')),c);
  const markup=vm.runInContext("renderStoryScene(lines,'환각의 땅 · 붉은 사신','보스 전투 시작 →')",c);
  assert.match(markup,/story-vn-chapter-four/);
  assert.match(markup,/붉은 사신의 등장/);
  assert.match(markup,/WORLD 4 · FINAL BOSS/);
  assert.match(markup,/타락한 천사의 오른팔/);
  assert.match(markup,/보스 전투 시작 →/);
});


const finalEndingMarkdown=read('assets/novel/world-4-20-boss-end.md');
const finalEndingLines=window.WORDORIA_NOVELS.world4BossEnd;

test('world 4 final ending preserves all dialogue and directions across scenes 5 to 8',async()=>{
  const {parseWorldFourBossEnd}=await import('../scripts/generate-story-novel.mjs');
  const parsed=parseWorldFourBossEnd(finalEndingMarkdown);
  assert.equal(JSON.stringify(parsed),JSON.stringify(finalEndingLines));
  assert.deepEqual([...new Set(parsed.map(line=>line.sceneNumber))],[5,6,7,8]);
  const spoken=[...finalEndingMarkdown.matchAll(/^([^:\n]+): (.+)$/gm)].map(([,speaker,text])=>({speaker,text}));
  assert.deepEqual(parsed.filter(line=>!['내레이션','WORLD 4 · FINAL BOSS'].includes(line.speaker)).map(({speaker,text})=>({speaker,text})),spoken);
  const directions=finalEndingMarkdown.split(/\n\s*\n/).map(block=>block.trim()).filter(block=>block.startsWith('('));
  assert.deepEqual(parsed.filter(line=>line.speaker==='내레이션').map(line=>line.text),directions);
  for(const line of parsed.filter(line=>line.speaker==='네크로맨서 소서러스')){
    assert.equal(line.className,'mage');
    assert.ok(readFileSync(new URL('../'+line.artPath,import.meta.url)).length>0);
  }
  assert.equal(parsed.at(-1).text,'붉은 사신 격파');
});

test('world 4 final ending renders its clear title and cannot start a battle or complete a loss',()=>{
  const c=vm.createContext({page:'storyChapterFourBossEnd',storyDialogueIndex:finalEndingLines.length-1,classDefs:{},esc:value=>value,deployedAssetUrl:value=>value,lines:finalEndingLines});
  vm.runInContext(source.slice(source.indexOf('  function renderStoryScene('),source.indexOf('  const renderStoryIntro=')),c);
  const markup=vm.runInContext("renderStoryScene(lines,'환각의 땅','결과 확인 →')",c);
  assert.match(markup,/story-vn-chapter-four/);
  assert.match(markup,/무영창의 일격/);
  assert.match(markup,/붉은 사신 격파/);
  assert.match(markup,/결과 확인 →/);
  for(const [done,clear] of [[true,true],[true,false],[false,true]]){
    const pages=[];
    const state=vm.createContext({page:'storyChapterFourBossEnd',run:{done,clear},go:p=>pages.push(p),startBattle(){throw new Error('ending must not restart battle');}});
    vm.runInContext(source.slice(source.indexOf('  function completeStoryDialogue('),source.indexOf('  function epilogueLines(')),state);
    state.completeStoryDialogue();
    assert.deepEqual(pages,done&&clear?['result']:[]);
  }
});


test('all eight final boss scenes use their own background files and render them',()=>{
  const paths=new Set();
  for(const [page,lines] of [['storyChapterFourBossStart',bossLines],['storyChapterFourBossEnd',finalEndingLines]]){
    for(const line of lines){
      assert.equal(line.backgroundPath,`assets/novel/bgi/world4-boss-scene-${String(line.sceneNumber).padStart(2,'0')}.webp`);
      assert.ok(readFileSync(new URL('../'+line.backgroundPath,import.meta.url)).length>0);
      paths.add(line.backgroundPath);
    }
    for(const sceneNumber of new Set(lines.map(line=>line.sceneNumber))){
      const index=lines.findIndex(line=>line.sceneNumber===sceneNumber);
      const c=vm.createContext({page,storyDialogueIndex:index,classDefs:{},esc:value=>value,deployedAssetUrl:value=>value,lines});
      vm.runInContext(source.slice(source.indexOf('  function renderStoryScene('),source.indexOf('  const renderStoryIntro=')),c);
      const markup=vm.runInContext("renderStoryScene(lines,'환각의 땅','계속 →')",c);
      assert.ok(markup.includes(`background-image:url('${lines[index].backgroundPath}')`));
    }
  }
  assert.equal(paths.size,8);
});
