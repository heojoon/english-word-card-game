import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
const code=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end));
function setup(flags={boss:true},total=50){
  const pages=[],claims=[],cleared=[];
  const context=vm.createContext({
    localHost:true,nativeApp:false,page:'battle',ROYAL_SLIME_HP:50,
    run:{story:true,...flags,deck:Array(total),bossMaxHp:total,correct:3,index:3,bossHp:total-3,elapsed:0,hp:2,mp:1,iceTimeActive:true,attack:true,stunned:true,paused:true},
    timerId:1,nextTimer:2,storyDialogueIndex:4,
    persistStoryBattleVitals(){},removeBattleReward(){},cancelSpeech(){},closeDialog(){},
    clearInterval:id=>cleared.push(id),clearTimeout:id=>cleared.push(id),
    go:page=>{context.page=page;pages.push(page);},claimCrystalGhostReward:()=>claims.push('ghost'),
    finishBattle(clear,reason){if(context.run.guardian)context.finishGuardianBattle(clear,reason);else context.finishRoyalSlimeBattle(clear,reason);},
  });
  vm.runInContext(code('  function canSkipLocalBossBattle(', '  async function claimGuardianReward('),context);
  vm.runInContext(code('  function finishRoyalSlimeBattle(', '  function completeRoyalSlimeVictoryStory('),context);
  return {context,pages,claims,cleared};
}

test('local boss skip completes all boss types through their existing victory flow and preserves HP/MP',()=>{
  for(const [flags,total,page] of [
    [{boss:true},50,'storyBossVictory'],
    [{boss:true,crystalGhost:true},90,'bossResult'],
    [{guardian:true},60,'storyChapterTwoBossEnd'],
    [{guardian:true,blackDragon:true},60,'storyChapterThreeBossEnd'],
    [{guardian:true,shadowSorceress:true},100,'storyChapterFourMidbossEnd'],
  ]){
    const {context:c,pages,claims,cleared}=setup(flags,total);
    assert.match(c.localBossSkipMarkup(),/data-action="local-boss-skip"/);
    c.skipLocalBossBattle();
    assert.equal(c.run.correct,total);assert.equal(c.run.index,total);assert.equal(c.run.bossHp,0);
    assert.equal(c.run.answeredCorrect,3);assert.equal(c.run.hp,2);assert.equal(c.run.mp,1);
    assert.equal(c.run.elapsed,1);assert.equal(c.run.done,true);assert.equal(c.run.clear,true);
    assert.equal(c.run.iceTimeActive,false);assert.equal(c.run.reason,'local-boss-skip');
    assert.deepEqual(pages,[page]);assert.deepEqual(cleared,[1,2]);
    assert.deepEqual(claims,flags.crystalGhost?['ghost']:[]);
    c.skipLocalBossBattle();assert.deepEqual(pages,[page]);assert.equal(c.localBossSkipMarkup(),'');
  }
});

test('skip visibility and execution reject production, native, non-boss, completed and pending-potion states',()=>{
  for(const change of [
    c=>{c.localHost=false;},c=>{c.nativeApp=true;},c=>{c.page='story';},
    c=>{c.run.boss=false;},c=>{c.run.story=false;},c=>{c.run.done=true;},
    c=>{c.run.potionUsePending=true;},c=>{c.run=null;},
  ]){
    const {context:c,pages,cleared}=setup();change(c);
    const before=JSON.stringify(c.run);
    assert.equal(c.localBossSkipMarkup(),'');c.skipLocalBossBattle();
    assert.equal(JSON.stringify(c.run),before);assert.deepEqual(pages,[]);assert.deepEqual(cleared,[]);
  }
});
