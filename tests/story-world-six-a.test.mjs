import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const source=read('crystal-game.js');
function setup(){
  let level='middle';
  const c=vm.createContext({window:{},stages:JSON.parse(read('content/catalog.json')).stages,learningLevel:()=>level,stageLevel:stage=>stage?.learningLevel||'middle',storyBranchPreview:null,run:null,records:[],demoState:{},accountStoryBranch:null,accountProfile:null,allCharacters:[],accountMode:false,localHost:false,nativeApp:false});
  vm.runInContext(source.slice(source.indexOf('  const storyStages = ['),source.indexOf('  const storyStageKey='))+'\nthis.storyStages=storyStages;this.storyWorlds=storyWorlds;',c);
  vm.runInContext(source.slice(source.indexOf('  function stageRecordName('),source.indexOf('  function earnedCoins(')),c);
  c.configureStoryContent();
  return {c,switchLevel(value){level=value;c.configureStoryContent();}};
}
test('6A and 6B require a permanent branch after World 5 and retain level-independent progress',()=>{
  const {c,switchLevel}=setup();
  const index=key=>c.storyStages.findIndex(s=>s.key===key);
  for(const key of ['story-ch6a-1','story-ch6-10'])assert.equal(c.storyStageUnlocked(index(key)),false);
  c.records.push({stage:c.stageRecordName('story-ch5-20'),cleared:true});
  for(const key of ['story-ch6a-1','story-ch6-10'])assert.equal(c.storyStageUnlocked(index(key)),false);
  assert.equal(c.needsStoryBranchChoice(),true);
  c.demoState.storyBranch='6A';
  assert.equal(c.storyStageUnlocked(index('story-ch6a-1')),true);
  assert.equal(c.storyStageUnlocked(index('story-ch6-10')),false);
  assert.equal(c.storyStageUnlocked(index('story-ch6a-2')),false);
  const first=c.stageRecordName('story-ch6a-1');
  assert.match(first,/6A/);
  c.records.push({stage:first,cleared:true});
  assert.equal(c.storyStageUnlocked(index('story-ch6a-2')),true);
  switchLevel('elementary');
  assert.equal(c.stageRecordName('story-ch6a-1'),first);
  assert.equal(c.stageCleared('story-ch6a-1'),true);
  assert.equal(c.storyStageUnlocked(index('story-ch6a-2')),true);
  assert.equal(c.stageCleared('story-ch6-10'),false);
  assert.equal(c.stages['story-ch6-10'].banditChief,true);
});
test('6A renders twenty matching nodes with only previous and next world navigation',()=>{
  const {c}=setup(),world=c.storyWorlds.find(w=>w.displayNumber==='6A');
  const layout=JSON.parse(read('assets/story/chapter-6a-user-map-layout.json'));
  assert.equal(world.art,layout.art);
  assert.deepEqual(JSON.parse(JSON.stringify(world.positions)),layout.positions);
  assert.equal(world.positions.length,20);
  for(let i=1;i<20;i++)assert.ok(parseFloat(world.positions[i][1])>parseFloat(world.positions[i-1][1]));
  for(let n=1;n<=20;n++){
    const stage=c.stages[`story-ch6a-${n}`];
    assert.equal(stage.questionCount,60);
    assert.deepEqual(stage.words,c.stages[`s${35+Math.floor((n-1)/2)}`].words);
    assert.equal(stage.source.sheet,`Day ${Math.ceil(n/2)}`);
    assert.equal(stage.words.length,30);
    assert.equal(stage.banditChief,false);
    assert.equal(stage.lichDragon,false);
  }
  Object.assign(c,{selectedStoryWorld:world.number,selectedStoryStage:'story-ch6a-1',storyStagePlayable:()=>true,levelReady:stage=>stage.words.length>=4,esc:String,deployedAssetUrl:path=>path,battleHeroMarkup:()=>'',contentEmpty:()=>''});
  vm.runInContext(source.slice(source.indexOf('  function renderStory('),source.indexOf('  function selectStoryWorld(')),c);
  c.demoState.storyBranch='6A';
  let html=c.renderStory();
  assert.match(html,/WORLD 6A/);
  assert.match(html,/보랏빛 수정동굴의 20스테이지/);
  assert.equal((html.match(/class="story-map-node story-map-node-/g)||[]).length,20);
  assert.match(html,/data-world="5"/);
  assert.equal((html.match(/data-action="story-world-select"/g)||[]).length,2);
  assert.doesNotMatch(html,/story-map-branches|story-map-navigation-inline/);
  c.records.push({stage:c.stageRecordName('story-ch5-20'),cleared:true});
  html=c.renderStory();
  assert.match(html,/data-stage="story-ch6a-1"/);
  assert.doesNotMatch(html,/data-stage="story-ch6a-2"/);
});

test('6A imports all ten source sheets in order for both levels without altering shared progress or other worlds',()=>{
  const {c,switchLevel}=setup(),snapshot=JSON.parse(read('content/sources/wordmax-level3-day1-10.json'));
  assert.equal(snapshot.days.length,10);
  const world5=JSON.stringify(c.stages['story-ch5-1'].words);
  for(const level of ['middle','elementary']){
    switchLevel(level);
    for(let day=1;day<=10;day++){
      const original=snapshot.days[day-1];
      assert.equal(original.day,day);
      assert.equal(original.words.length,30);
      assert.equal(new Set(original.words.map(row=>row[0].toLowerCase())).size,30);
      for(const number of [day*2-1,day*2]){
        const stage=c.stages[`story-ch6a-${number}`];
        assert.equal(stage.learningLevel,level);
        assert.equal(stage.questionCount,level==='middle'?60:40);
        assert.deepEqual(JSON.parse(JSON.stringify(stage.words)),original.words);
        assert.deepEqual(JSON.parse(JSON.stringify(stage.source)),original.source);
        assert.match(stage.desc,new RegExp(`Day ${day} · 30단어`));
      }
    }
  }
  switchLevel('middle');
  assert.equal(JSON.stringify(c.stages['story-ch5-1'].words),world5);
  assert.match(read('index.html'),/src="stage35\.js/);
  assert.match(read('scripts/build-web.mjs'),/'stage35\.js'/);
});

test('branch restrictions apply to later stages and localhost; administrators can access both',()=>{
  const {c}=setup(),index=key=>c.storyStages.findIndex(s=>s.key===key);
  c.localHost=true;
  assert.equal(c.storyStageUnlocked(index('story-ch6a-2')),false);
  c.demoState.storyBranch='6B';
  assert.equal(c.storyStageUnlocked(index('story-ch6-10')),true);
  assert.equal(c.storyStageUnlocked(index('story-ch6a-2')),false);
  c.accountMode=true;c.accountProfile={role:'admin'};
  assert.equal(c.storyStageUnlocked(index('story-ch6a-2')),true);
  assert.equal(c.storyStageUnlocked(index('story-ch6-10')),true);
  assert.equal(c.needsStoryBranchChoice(),false);
});

test('choice modal names both stories, blocks closing, and local choice persists once',async()=>{
  const {c}=setup();let html='',options,saves=0,closed=0;
  c.records.push({stage:c.stageRecordName('story-ch5-20'),cleared:true});
  const buttons=[{disabled:false},{disabled:false}],status={textContent:''};
  Object.assign(c,{storyBranchSaving:false,modal:(value,config)=>{html=value;options=config;},$:()=>({querySelectorAll:()=>buttons,querySelector:()=>status}),saveDemo:()=>saves++,closeDialog:()=>closed++,go:()=>{}});
  c.showStoryBranchChoice();
  assert.match(html,/A\. 반전세계로 간 소서러스의 이야기/);
  assert.match(html,/B\. 타락천사를 쫒는 아서의 이야기/);
  assert.match(html,/한 번 선택하면 되돌릴 수 없어요/);
  assert.equal(options.closable,false);
  await c.chooseStoryBranch('6A');
  assert.equal(c.demoState.storyBranch,'6A');assert.equal(c.selectedStoryWorld,7);
  await c.chooseStoryBranch('6B');
  assert.equal(c.demoState.storyBranch,'6A');assert.equal(saves,1);assert.equal(closed,1);
});

test('account save failure permits retry; a concurrent server choice takes precedence',async()=>{
  const {c}=setup();const buttons=[{disabled:false},{disabled:false}],status={textContent:''};let writes=0;
  Object.assign(c,{accountMode:true,accountProfile:{role:'student'},accountUserId:'account',allCharacters:[{id:'hero'}],accountStoryBranch:null,storyBranchSaving:false,$:()=>({querySelectorAll:()=>buttons,querySelector:()=>status}),rpc:async()=>{writes++;throw Error('network');},apiGet:async()=>[],closeDialog(){},go(){}});
  c.records.push({stage:c.stageRecordName('story-ch5-20'),cleared:true,character_id:'hero'});
  await c.chooseStoryBranch('6A');
  assert.equal(c.accountStoryBranch,null);assert.equal(c.storyBranchSaving,false);
  assert.ok(buttons.every(button=>!button.disabled));assert.match(status.textContent,/다시 시도/);
  c.apiGet=async()=>[{branch:'6B'}];
  await c.chooseStoryBranch('6A');
  assert.equal(c.accountStoryBranch,'6B');assert.equal(c.selectedStoryWorld,6);assert.equal(writes,2);
  await c.chooseStoryBranch('6A');assert.equal(writes,2);
});

test('local skipped World 5 shows and selects a branch without persisting progress or account choice',async()=>{
  const {c}=setup();let modalShown=0;
  Object.assign(c,{localHost:true,accountMode:true,accountProfile:{role:'admin'},accountStoryBranch:'6B',run:{lichDragon:true,localBossSkipped:true,done:true,clear:true},storyBranchSaving:false,modal(){modalShown++;},$:()=>({querySelectorAll:()=>[]}),rpc(){throw Error('preview must not call RPC');},saveDemo(){throw Error('preview must not persist');},closeDialog(){},go(){}});
  c.showStoryBranchChoice();assert.equal(modalShown,1);
  await c.chooseStoryBranch('6A');
  assert.equal(c.selectedStoryWorld,7);assert.equal(c.chosenStoryBranch(),'6A');
  assert.equal(c.accountStoryBranch,'6B');assert.equal(c.records.length,0);
  assert.equal(c.demoState.storyBranch,undefined);
  c.nativeApp=true;assert.equal(c.isStoryBranchPreview(),false);assert.equal(c.chosenStoryBranch(),'6B');
  c.nativeApp=false;c.localHost=false;assert.equal(c.isStoryBranchPreview(),false);
});
