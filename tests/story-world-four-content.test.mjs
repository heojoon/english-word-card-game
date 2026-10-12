import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const context = {window:{QUIZ_STAGES:{}}};
vm.runInNewContext(read('stage15.js'), context);
const maps = Object.entries(context.window.QUIZ_STAGES);
const elementaryContext = {window:{QUIZ_STAGES:{}}};
vm.runInNewContext(read('elementary-stages.js'),elementaryContext);
const elementaryMaps = Object.entries(elementaryContext.window.QUIZ_STAGES);

test('elementary World 4 selects 600 distinct PDF words and mixes all twenty stages',()=>{
  const snapshot=JSON.parse(read('content/sources/elementary-800.json'));
  assert.equal(snapshot.rows.length,800);
  assert.equal(elementaryMaps.length,20);
  const numbers=elementaryMaps.flatMap(([,stage])=>Array.from(stage.source.sourceNumbers));
  assert.equal(new Set(numbers).size,600);
  const english=elementaryMaps.flatMap(([,stage])=>Array.from(stage.words,row=>row[0].toLowerCase()));
  assert.equal(new Set(english).size,600);
  for(let start=1;start<=800;start+=4)assert.equal(numbers.filter(n=>n>=start&&n<start+4).length,3);
  for(const [key,stage] of elementaryMaps){
    assert.equal(key,`e${stage.storyStage+14}`);
    assert.equal(stage.storyChapter,4);
    assert.equal(stage.learningLevel,'elementary');
    assert.equal(stage.questionCount,30);
    assert.equal(stage.words.length,30);
    assert.equal(stage.storyPart,stage.storyStage<=10?1:2);
    assert.equal(new Set(stage.words.map(row=>row[2])).size,30);
    assert.ok(new Set(stage.words.map(row=>row[0][0].toLowerCase())).size>=10);
    assert.notEqual(JSON.stringify(stage.source.sourceNumbers),JSON.stringify([...stage.source.sourceNumbers].sort((a,b)=>a-b)));
    stage.words.forEach((word,index)=>{
      const original=snapshot.rows[stage.source.sourceNumbers[index]-1];
      assert.equal(original.page,stage.source.pages[index]);
      const correction=stage.source.corrections.find(item=>item.number===original.number);
      assert.equal(word[0],correction?.english||original.english);
      if(correction){assert.equal(correction.originalEnglish,original.english);assert.equal(correction.originalMeaning,original.meaning);assert.equal(word[2],correction.meaning);}
    });
    assert.match(stage.source.sha256,/^[a-f0-9]{64}$/);
  }
});

test('elementary World 4 is included in the web catalog and native staging',()=>{
  const catalog=JSON.parse(read('content/catalog.json'));
  for(const [key,stage] of elementaryMaps)assert.equal(JSON.stringify(catalog.stages[key]),JSON.stringify(stage));
  assert.match(read('index.html'),/src="elementary-stages\.js\?[^\"]+" defer/);
  assert.match(read('scripts/build-web.mjs'),/'elementary-stages\.js'/);
});

test('world 4 maps Day 11–30 to twenty middle-school stages with thirty unique pairs', () => {
  assert.equal(maps.length,20);
  maps.forEach(([key,stage],index) => {
    assert.equal(key,`s${index+15}`);
    assert.equal(stage.storyChapter,4);
    assert.equal(stage.storyStage,index+1);
    assert.equal(stage.storyPart,index<10?1:2);
    assert.equal(stage.source.sheet,`Day ${index+11}`);
    assert.equal(stage.learningLevel,'middle');
    assert.equal(stage.questionCount,30);
    assert.equal(stage.words.length,30);
    assert.equal(new Set(stage.words.map(word=>word[0].toLowerCase())).size,30);
    assert.equal(new Set(stage.words.map(word=>word[2])).size,30);
    assert.ok(stage.words.every(word=>word.length===3&&word.every(value=>value.trim())));
    assert.ok(stage.words.every(word=>word[1]==='—'));
  });
});

test('corrected source errors retain the original meanings and source cell', () => {
  const corrections=maps.flatMap(([,stage])=>stage.source.corrections);
  assert.equal(corrections.length,5);
  for(const [,stage] of maps)for(const correction of stage.source.corrections){
    assert.match(correction.cell,/^D\d+$/);
    assert.notEqual(correction.meaning,correction.originalMeaning);
    assert.equal(stage.words.find(word=>word[0]===correction.english)[2],correction.meaning);
  }
  assert.equal(context.window.QUIZ_STAGES.s25.words.find(word=>word[0]==='entrance')[2],'입구, 입장');
  assert.equal(context.window.QUIZ_STAGES.s32.words.find(word=>word[0]==='inspect')[2],'검사하다, 점검하다');
});

test('runtime builds a complete thirty-question unique cycle for every world 4 map', () => {
  const source=read('crystal-game.js');
  const c=vm.createContext({shuffle:words=>words.slice()});
  vm.runInContext(source.slice(source.indexOf('  function buildQuestionDeck('),source.indexOf('  async function loadAll(')),c);
  for(const [,stage] of maps){
    const deck=c.buildQuestionDeck(stage);
    assert.equal(deck.length,30);
    assert.equal(new Set(deck.map(question=>question.entry[0])).size,30);
    assert.ok(deck.every(question=>['en-ko','ko-en'].includes(question.mode)));
  }
});

test('world 4 bundled vocabulary matches the remote catalog and is excluded from Survival', () => {
  const catalog=JSON.parse(read('content/catalog.json'));
  for(const [key,stage] of maps)assert.equal(JSON.stringify(catalog.stages[key]),JSON.stringify(stage));
  assert.equal(Object.values(catalog.stages).filter(stage=>!stage.storyChapter).length,7);
  assert.match(read('index.html'),/src="stage15\.js\?[^\"]+" defer/);
  assert.match(read('scripts/build-web.mjs'),/'stage15\.js'/);
});

function setupStory(){
  let level='middle';
  const c=vm.createContext({stages:JSON.parse(read('content/catalog.json')).stages,learningLevel:()=>level,
    isAdministrator:()=>true,stageLevel:stage=>stage?.learningLevel||'middle',records:[],accountMode:false,localHost:false,nativeApp:false});
  const source=read('crystal-game.js');
  vm.runInContext(source.slice(source.indexOf('  const storyStages = ['),source.indexOf('  const storyStageKey='))+'\nthis.storyStages=storyStages;this.storyWorlds=storyWorlds;',c);
  vm.runInContext(source.slice(source.indexOf('  function stageRecordName('),source.indexOf('  function earnedCoins(')),c);
  vm.runInContext(source.slice(source.indexOf('  function storyStagePlayable('),source.indexOf('\n',source.indexOf('  function storyStagePlayable('))),c);
  c.shuffle=items=>items.slice();
  vm.runInContext(source.slice(source.indexOf('  function buildQuestionDeck('),source.indexOf('  async function loadAll(')),c);
  c.configureStoryContent();
  return {c,switchLevel(value){level=value;c.configureStoryContent();}};
}

test('world 4 story stages use their exact Day 11–30 pools and six matching waves',()=>{
  const {c}=setupStory(),stages=c.storyStages.filter(stage=>stage.chapter===4);
  assert.equal(stages.length,20);
  stages.forEach((stage,index)=>{
    assert.equal(stage.key,`story-ch4-${index+1}`);
    const content=c.stages[stage.key];
    assert.equal(JSON.stringify(content.words),JSON.stringify(c.stages[`s${index+15}`].words));
    assert.equal(content.questionCount,30);
    assert.equal(content.story,true);
    assert.equal(content.guardian,false);
    assert.equal(content.blackDragon,false);
    const deck=c.buildQuestionDeck(content);
    assert.equal(deck.length/5,6);
    assert.equal(new Set(deck.map(question=>question.entry[0])).size,30);
  });
});

test('world 4 unlocks after world 3 stage 8 and progresses across the map boundary',()=>{
  const {c}=setupStory(),index=c.storyStages.findIndex(stage=>stage.key==='story-ch4-1');
  assert.equal(c.storyStageUnlocked(index),false);
  c.records.push({stage:c.stageRecordName('story-ch3-7'),cleared:true});
  assert.equal(c.storyStageUnlocked(index),false);
  c.records.push({stage:c.stageRecordName('story-ch3-8'),cleared:true});
  assert.equal(c.storyStageUnlocked(index),true);
  for(let number=1;number<=20;number++){
    assert.equal(c.storyStageUnlocked(index+number-1),true);
    if(number<20)assert.equal(c.storyStageUnlocked(index+number),false);
    c.records.push({stage:c.stageRecordName(`story-ch4-${number}`),cleared:true});
  }
});

test('world 4 retains shared records across learning levels and uses each level vocabulary',()=>{
  const {c,switchLevel}=setupStory(),name=c.stageRecordName('story-ch4-10');
  c.records.push({stage:name,cleared:true});
  switchLevel('elementary');
  assert.equal(c.stageRecordName('story-ch4-10'),name);
  assert.equal(c.stageCleared('story-ch4-10'),true);
  assert.equal(c.storyStageUnlocked(c.storyStages.findIndex(stage=>stage.key==='story-ch4-11')),true);
  for(const stage of c.storyStages.filter(stage=>stage.chapter===4)){
    const content=c.stages[stage.key],source=c.stages[`e${stage.sourceNumber}`];
    assert.equal(content.words.length,30);
    assert.equal(JSON.stringify(content.words),JSON.stringify(source.words));
    assert.match(content.desc,/교육부지정 초등영단어 800/);
    assert.equal(new Set(c.buildQuestionDeck(content).map(question=>question.entry[0])).size,30);
  }
  switchLevel('middle');
  assert.equal(c.stages['story-ch4-10'].words.length,30);
  assert.equal(c.stageCleared('story-ch4-10'),true);
});

test('world 4 entry confirmation describes the selected learning-level source',()=>{
  const {c,switchLevel}=setupStory();
  Object.assign(c,{storyStageUnlocked:()=>true,levelReady:()=>true,storyEntryAllowed:()=>true,
    render:()=>{},esc:String,modal:html=>{c.modalHtml=html;}});
  const source=read('crystal-game.js');
  vm.runInContext(source.slice(source.indexOf('  function confirmStoryStage('),source.indexOf('  function startStoryStage(')),c);
  c.confirmStoryStage('story-ch4-1');
  assert.match(c.modalHtml,/WordMax Level 3/);
  switchLevel('elementary');
  c.confirmStoryStage('story-ch4-1');
  assert.match(c.modalHtml,/교육부지정 초등영단어 800/);
  assert.ok(!c.modalHtml.includes('WordMax'));
});

test('world 4 renders twenty descending stage buttons on one continuous map',()=>{
  const {c}=setupStory(),layout=JSON.parse(read('assets/story/chapter-4-map-layout.json'));
  const world=c.storyWorlds[3];
  assert.equal(world.parts,undefined);
  assert.equal(world.art,layout.art);
  assert.equal(JSON.stringify(world.positions),JSON.stringify(layout.stages.map(stage=>[`${stage.x}%`,`${stage.y}%`])));
  for(let index=1;index<layout.stages.length;index++)assert.ok(layout.stages[index].y>layout.stages[index-1].y);
  Object.assign(c,{selectedStoryWorld:4,selectedStoryStage:'story-ch4-11',
    levelReady:stage=>stage.words.length>=4,esc:value=>String(value),deployedAssetUrl:path=>path,
    battleHeroMarkup:()=>'<i>hero</i>',storyAudioButton:()=>'',contentEmpty:()=>'<div>준비 중</div>'});
  c.storyStageUnlocked=()=>true;
  const source=read('crystal-game.js');
  vm.runInContext(source.slice(source.indexOf('  function renderStory('),source.indexOf('  function selectStoryWorld(')),c);
  const html=c.renderStory();
  assert.equal((html.match(/data-action="story-stage-select"/g)||[]).length,20);
  assert.equal((html.match(/class="story-map-hero"/g)||[]).length,1);
  const sections=html.split('<section class="story-world-map');
  assert.equal(sections.length,2);
  assert.ok(sections[1].includes('data-stage="story-ch4-11"'));
  assert.ok(sections[1].includes('data-stage="story-ch4-20"'));
  assert.match(read('crystal-game.css'),/\.story-world-map-4\{aspect-ratio:1\/3\}/);
});

test('World 4 rejects student, teacher and guest direct entry before recovery or battle',()=>{
  const {c}=setupStory();
  const source=read('crystal-game.js');
  Object.assign(c,{storyRecoveryBusy:false,toast:()=>{},storyVitals:()=>({hp:2}),showStoryRecovery:()=>{throw new Error('must not open recovery');}});
  vm.runInContext(source.slice(source.indexOf('  function storyEntryAllowed('),source.indexOf('\n',source.indexOf('  function storyEntryAllowed('))),c);
  for(const role of ['student','teacher',null]){
    c.isAdministrator=()=>false;
    assert.equal(c.storyEntryAllowed('story-ch4-1'),false);
    assert.equal(c.storyEntryAllowed('story-ch4-20'),false);
    assert.equal(c.storyEntryAllowed('story-ch3-1'),true);
  }
  c.isAdministrator=()=>true;
  assert.equal(c.storyEntryAllowed('story-ch4-1'),true);
});
