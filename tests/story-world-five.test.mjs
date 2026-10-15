import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parseWorldFiveNarrative} from '../scripts/generate-story-novel.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const source=read('crystal-game.js');
function setup(){
  let level='middle';
  const c=vm.createContext({window:{},stages:JSON.parse(read('content/catalog.json')).stages,learningLevel:()=>level,stageLevel:stage=>stage?.learningLevel||'middle',records:[],accountMode:false,localHost:false,nativeApp:false,shuffle:items=>items.slice()});
  vm.runInContext(source.slice(source.indexOf('  const storyStages = ['),source.indexOf('  const storyStageKey='))+'\nthis.storyStages=storyStages;this.storyWorlds=storyWorlds;',c);
  vm.runInContext(source.slice(source.indexOf('  function stageRecordName('),source.indexOf('  function earnedCoins(')),c);
  vm.runInContext(source.slice(source.indexOf('  function buildQuestionDeck('),source.indexOf('  async function loadAll(')),c);
  vm.runInContext(read('story-novel.js'),c);
  c.configureStoryContent();
  return {c,switchLevel(value){level=value;c.configureStoryContent();}};
}

test('World 5 unlocks after World 4 stage 20 and keeps records when the learning level changes',()=>{
  const {c,switchLevel}=setup(),first=c.storyStages.findIndex(stage=>stage.key==='story-ch5-1');
  assert.equal(c.storyStageUnlocked(first),false);
  c.records.push({stage:c.stageRecordName('story-ch4-19'),cleared:true});
  assert.equal(c.storyStageUnlocked(first),false);
  c.records.push({stage:c.stageRecordName('story-ch4-20'),cleared:true});
  assert.equal(c.storyStageUnlocked(first),true);
  for(let number=1;number<=20;number++){
    assert.equal(c.storyStageUnlocked(first+number-1),true);
    if(number<20)assert.equal(c.storyStageUnlocked(first+number),false);
    c.records.push({stage:c.stageRecordName(`story-ch5-${number}`),cleared:true});
  }
  const names=Array.from({length:20},(_,i)=>c.stageRecordName(`story-ch5-${i+1}`));
  switchLevel('elementary');
  for(let number=1;number<=20;number++){
    const key=`story-ch5-${number}`;
    assert.equal(c.stageRecordName(key),names[number-1]);
    assert.equal(c.stageCleared(key),true);
    assert.equal(c.storyStageUnlocked(first+number-1),true);
  }
});

test('World 5 reuses corresponding World 4 pools for both levels without another world boss flag',()=>{
  const {c,switchLevel}=setup();
  for(const level of ['middle','elementary']){
    switchLevel(level);
    for(let number=1;number<=20;number++){
      const stage=c.stages[`story-ch5-${number}`];
      assert.equal(JSON.stringify(stage.words),JSON.stringify(c.stages[`story-ch4-${number}`].words));
      assert.equal(stage.questionCount,level==='middle'?60:40);
      assert.equal(c.buildQuestionDeck(stage).length,stage.questionCount);
      assert.equal(stage.redReaper,false);
      assert.equal(stage.shadowSorceress,false);
      assert.equal(stage.blackDragon,false);
      assert.match(stage.desc,/월드 4 단어 임시 재사용/);
    }
  }
});

test('World 5 exposes one continuous map with twenty nodes in descending order',()=>{
  const {c}=setup(),layout=JSON.parse(read('assets/story/chapter-5-map-layout.json')),world=c.storyWorlds[4];
  assert.equal(world.name,'보랏빛 수정동굴');
  assert.equal(world.art,layout.art);
  assert.ok(readFileSync(new URL('../'+world.art,import.meta.url)).length);
  assert.equal(JSON.stringify(world.positions),JSON.stringify(layout.stages.map(p=>[`${p.x}%`,`${p.y}%`])));
  assert.equal(world.positions.length,20);
  for(let i=1;i<20;i++)assert.ok(parseFloat(world.positions[i][1])>parseFloat(world.positions[i-1][1]));
  Object.assign(c,{selectedStoryWorld:5,selectedStoryStage:'story-ch5-11',storyStagePlayable:()=>true,storyStageUnlocked:()=>true,levelReady:stage=>stage.words.length>=4,esc:String,deployedAssetUrl:path=>path,battleHeroMarkup:()=>'<i>hero</i>',contentEmpty:()=>''});
  vm.runInContext(source.slice(source.indexOf('  function renderStory('),source.indexOf('  function selectStoryWorld(')),c);
  const html=c.renderStory();
  assert.equal((html.match(/class="story-world-map /g)||[]).length,1);
  assert.equal((html.match(/data-action="story-stage-select"/g)||[]).length,20);
  assert.match(html,/data-stage="story-ch5-20"/);
  assert.match(html,/data-world="6" disabled/);
});

test('World 5 novels preserve spoken lines and stage entries enforce the usual checks',()=>{
  const {c}=setup();
  for(const [key,file] of [['world5Prologue','world-5-1-prologue.md'],['world5MidbossStart','world-5-midboss-start.md'],['world5MidbossEnd','world-5-midboss-end.md'],['world5BossStart','world-5-20-boss-start.md']]){
    const markdown=read('assets/novel/'+file),lines=parseWorldFiveNarrative(markdown);
    assert.equal(JSON.stringify(lines),JSON.stringify(c.window.WORDORIA_NOVELS[key]));
    const spoken=[...markdown.matchAll(/^([^:\n]+): (.+)$/gm)].filter(([,speaker])=>!speaker.startsWith('#')&&speaker!=='월드 5의 핵심 목표').map(([,speaker,text])=>({speaker,text}));
    assert.equal(JSON.stringify(lines.filter(line=>line.speaker!=='내레이션'&&line.speaker!=='월드 5의 핵심 목표').map(({speaker,text})=>({speaker,text}))),JSON.stringify(spoken));
    assert.ok(!lines.some(line=>line.text.startsWith('![')));
  }
  for(const number of [1,2,10,11,20])for(const allowed of [true,false]){
    const pages=[],started=[];
    Object.assign(c,{storyStageUnlocked:()=>true,levelReady:()=>true,storyEntryAllowed:()=>allowed,closeDialog(){},go:p=>pages.push(p),startBattle:()=>started.push(c.selectedStage)});
    vm.runInContext(source.slice(source.indexOf('  function startStoryStage('),source.indexOf('  function renderStages(')),c);
    c.startStoryStage(`story-ch5-${number}`);
    const page={1:'storyChapterFiveIntro',10:'storyChapterFiveMidbossStart',20:'storyChapterFiveBossStart'}[number];
    assert.deepEqual(pages,allowed&&page?[page]:[]);
    assert.deepEqual(started,allowed&&!page?[`story-ch5-${number}`]:[]);
  }
});

test('World 5 boss CGs follow possession and recovery without replacing other appearances',()=>{
  const parse=file=>parseWorldFiveNarrative(read('assets/novel/'+file));
  const mage='assets/novel/characters/char_sorcerus_world5_midboss_standing.webp';
  const dragon='assets/novel/characters/char_lich_dragon_world5_standing.webp';
  const start=parse('world-5-midboss-start.md').filter(line=>line.speaker==='소서러스');
  assert.ok(start.some(line=>line.sceneNumber===4&&line.artPath===mage));
  assert.ok(start.filter(line=>line.sceneNumber<4).every(line=>!line.artPath));
  const end=parse('world-5-midboss-end.md').filter(line=>line.speaker==='소서러스');
  assert.ok(end.some(line=>line.sceneNumber===1&&line.artPath===mage));
  assert.ok(end.filter(line=>line.sceneNumber>1).every(line=>!line.artPath));
  const boss=parse('world-5-20-boss-start.md');
  assert.ok(boss.some(line=>line.speaker==='리치 드래곤'));
  assert.ok(boss.filter(line=>line.speaker==='리치 드래곤').every(line=>line.artPath===dragon));
  assert.ok(boss.filter(line=>line.speaker!=='리치 드래곤').every(line=>!line.artPath));
  for(const path of [mage,dragon])assert.ok(readFileSync(new URL('../'+path,import.meta.url)).length>0);
});

test('World 5 midboss ending only completes a saved win and never restarts the battle',()=>{
  for(const [done,clear] of [[true,true],[true,false],[false,true]]){
    const pages=[],c=vm.createContext({page:'storyChapterFiveMidbossEnd',run:{done,clear},go:p=>pages.push(p),startBattle(){throw new Error('must not restart');}});
    vm.runInContext(source.slice(source.indexOf('  function completeStoryDialogue('),source.indexOf('  function epilogueLines(')),c);
    c.completeStoryDialogue();
    assert.deepEqual(pages,done&&clear?['result']:[]);
  }
});
