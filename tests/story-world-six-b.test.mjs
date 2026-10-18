import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const source=read('crystal-game.js');
function setup(){
  let level='middle';
  const c=vm.createContext({window:{},stages:JSON.parse(read('content/catalog.json')).stages,learningLevel:()=>level,stageLevel:stage=>stage?.learningLevel||'middle',records:[],demoState:{storyBranch:'6B'},accountMode:false,accountProfile:null,localHost:false,nativeApp:false});
  vm.runInContext(source.slice(source.indexOf('  const storyStages = ['),source.indexOf('  const storyStageKey='))+'\nthis.storyStages=storyStages;this.storyWorlds=storyWorlds;',c);
  vm.runInContext(source.slice(source.indexOf('  function stageRecordName('),source.indexOf('  function earnedCoins(')),c);
  c.configureStoryContent();
  return {c,switchLevel(value){level=value;c.configureStoryContent();}};
}
test('6B uses all twenty measured waypoints in downward order and renders the map instead of a boss card',()=>{
  const {c}=setup(),world=c.storyWorlds.find(world=>world.number===6),layout=JSON.parse(read('assets/story/chapter-6b-map-layout.json'));
  assert.equal(world.art,layout.art);assert.ok(existsSync(new URL('../'+world.art,import.meta.url)));
  assert.deepEqual(JSON.parse(JSON.stringify(world.positions)),layout.positions);
  assert.equal(world.positions.length,20);assert.equal(c.storyStages.filter(stage=>stage.chapter===6).length,20);
  for(let i=1;i<20;i++)assert.ok(parseFloat(world.positions[i][1])>parseFloat(world.positions[i-1][1]));
  Object.assign(c,{selectedStoryWorld:6,selectedStoryStage:'story-ch6-1',storyStagePlayable:()=>true,levelReady:stage=>stage.words.length>=4,esc:String,deployedAssetUrl:path=>path,battleHeroMarkup:()=>'',contentEmpty:()=>''});
  vm.runInContext(source.slice(source.indexOf('  function renderStory('),source.indexOf('  function selectStoryWorld(')),c);
  let html=c.renderStory();assert.match(html,/WORLD 6B/);assert.match(html,/story-world-map-6/);
  assert.equal((html.match(/class="story-map-node story-map-node-/g)||[]).length,20);assert.doesNotMatch(html,/bandit-encounter/);
  assert.doesNotMatch(html,/data-stage="story-ch6-1"/);
  c.records.push({stage:c.stageRecordName('story-ch5-20'),cleared:true});html=c.renderStory();
  assert.match(html,/data-stage="story-ch6-1"/);assert.doesNotMatch(html,/data-stage="story-ch6-2"/);
});
test('6B progresses sequentially, preserves legacy boss replay and shares progress across learning levels',()=>{
  const {c,switchLevel}=setup(),index=number=>c.storyStages.findIndex(stage=>stage.key===`story-ch6-${number}`),unlocked=number=>c.storyStageUnlocked(index(number));
  assert.equal(unlocked(1),false);
  c.records.push({stage:c.stageRecordName('story-ch5-20'),cleared:true});
  assert.equal(unlocked(1),true);assert.equal(unlocked(2),false);assert.equal(unlocked(10),false);
  const legacyName=c.stageRecordName('story-ch6-10');
  assert.equal(legacyName,'스토리 6장 10 · 왕국수도로 가는 길');
  c.records.push({stage:legacyName,cleared:true});
  assert.equal(unlocked(10),true);assert.equal(unlocked(11),true);assert.equal(unlocked(12),false);
  for(let number=1;number<=20;number++){
    assert.equal(unlocked(number),true,`stage ${number}`);
    c.records.push({stage:c.stageRecordName(`story-ch6-${number}`),cleared:true});
  }
  switchLevel('elementary');
  assert.equal(c.stageRecordName('story-ch6-10'),legacyName);
  for(let number=1;number<=20;number++){assert.equal(unlocked(number),true);assert.equal(c.stageCleared(`story-ch6-${number}`),true);}
  c.demoState.storyBranch='6A';assert.equal(unlocked(10),false);assert.equal(unlocked(20),false);
});
test('6B matches same-numbered 6A vocabulary and source days for both levels without changing boss rules',()=>{
  const {c,switchLevel}=setup();
  for(const level of ['middle','elementary']){
    switchLevel(level);
    for(let number=1;number<=20;number++){
      const stage=c.stages[`story-ch6-${number}`];
      const day=Math.ceil(number/2),parallel=c.stages[`story-ch6a-${number}`];
      assert.deepEqual(stage.words,parallel.words);
      assert.deepEqual(stage.words,c.stages[`${level==='middle'?'s':'e'}${34+day}`].words);
      assert.deepEqual(stage.source,parallel.source);
      assert.equal(stage.source.sheet,`Day ${day}`);
      assert.equal(stage.words.length,30);
      assert.match(stage.desc,new RegExp(`Day ${day} · 30단어`));
      assert.equal(stage.questionCount,number===10?200:level==='middle'?60:40);
      assert.equal(stage.banditChief,number===10);assert.equal(stage.sorcerus,false);assert.equal(stage.lichDragon,false);
      assert.doesNotMatch(stage.recordName,/초등학생/);
    }
  }
});
