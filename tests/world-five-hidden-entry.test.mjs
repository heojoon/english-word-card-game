import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
function loadFunction(context,name){
  const start=source.indexOf(`  function ${name}(`);
  vm.runInContext(source.slice(start,source.indexOf('\n  function ',start+1)),context);
}

test('5-9 hidden entry renders fever and starts its timer without an ordinary battle board',async()=>{
  for(const localMode of [true,false]){
    const calls=[],toasts=[],screens=[];
    const context=vm.createContext({
      localMode,selectedCharacter:{id:'hero'},selectedStage:'story-ch5-9',page:'story',
      stages:{'story-ch5-9':{storyChapter:5}},run:null,timerId:null,nextTimer:null,
      performance:{now:()=>0},crypto:{randomUUID:()=> 'local-session'},
      rpc:async(name,args)=>{calls.push({name,args});return 'remote-session';},
      buildQuestionDeck:()=>[{entry:['crystal','noun','수정']}],
      storyVitals:()=>({hp:3,hpMax:3,mp:2,mpMax:2}),bossAttackSteps:()=>1,
      clearInterval(){},clearTimeout(){},removeBattleReward(){},closeDialog(){},
      esc:String,royalSlimeTime:ms=>String(ms/1000),toast:message=>toasts.push(message),
      tick:()=>calls.push('timer'),
    });
    context.render=()=>{if(context.page==='battle')screens.push(context.renderBattle());};
    context.go=page=>{context.page=page;context.render();};
    vm.runInContext('let worldFiveHiddenUnlocked=true,hiddenStarting=false;',context);
    const start=source.indexOf('  async function startWorldFiveHidden(');
    vm.runInContext(source.slice(start,source.indexOf('  function prepareHiddenKingBoard(',start)),context);
    for(const name of ['renderBattle','renderFeverBattle','advanceFeverCrystals'])loadFunction(context,name);

    await context.startWorldFiveHidden('fever');

    assert.deepEqual(toasts,[]);
    assert.equal(context.page,'battle');
    assert.equal(context.run.hiddenKind,'fever');
    assert.equal(context.run.matchBoard,undefined);
    assert.equal(context.run.feverWords.length,1);
    assert.match(screens.at(-1),/HIDDEN FEVER/);
    assert.match(screens.at(-1),/crystal/);
    assert.equal(calls.at(-1),'timer');
    if(!localMode)assert.equal(calls[0].name,'begin_world_five_hidden');
  }
});

test('ordinary story fever also renders before accessing the matching board',()=>{
  const context=vm.createContext({run:{story:true,fever:true},renderFeverBattle:()=> 'fever'});
  loadFunction(context,'renderBattle');
  assert.equal(context.renderBattle(),'fever');
});
