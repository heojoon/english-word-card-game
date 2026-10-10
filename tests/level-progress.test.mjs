import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
function setup(records=[]){
  const c=vm.createContext({records,selectedCharacter:{id:'hero'}});
  vm.runInContext(source.slice(source.indexOf('  function selectedRecords('),source.indexOf('  function combatStats(')),c);
  return c;
}
test('each level boundary through 100 uses the target level decade and carries excess answers',()=>{
  const c=setup();let total=0;
  assert.deepEqual({...c.levelProgress(0)},{level:1,exp:0,expMax:1000});
  for(let target=2;target<=100;target++){
    const required=100+Math.floor((target-1)/10)*20;
    total+=required;
    const before=c.levelProgress(total-1),at=c.levelProgress(total);
    assert.equal(before.level,target-1);assert.equal(before.exp,(required-1)*10);assert.equal(before.expMax,required*10);
    assert.equal(at.level,target);assert.equal(at.exp,0);
    if(target<100){assert.equal(c.levelProgress(total+3).exp,30);assert.equal(at.expMax,(100+Math.floor(target/10)*20)*10);}
  }
  assert.equal(total,18900);
  assert.deepEqual({...c.levelProgress(total+99999)},{level:100,exp:0,expMax:0});
});
test('stats applies accumulated correct answers per character with variable EXP maximum',()=>{
  const c=setup([{character_id:'hero',correct:900,total:900,cleared:true},{character_id:'hero',correct:15,total:20},{character_id:'other',correct:9999,total:9999}]);
  const s=c.stats();assert.equal(s.level,10);assert.equal(s.exp,150);assert.equal(s.expMax,1200);assert.equal(s.correct,915);
});
