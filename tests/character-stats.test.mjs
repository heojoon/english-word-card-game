import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
function setup(cls='warrior',items=[],level=1){
  const c=vm.createContext({selectedCharacter:{class:cls,id:'hero'},stats:()=>({level}),equippedMap:()=>Object.fromEntries(items.map((item,i)=>[i,i])),itemById:i=>items[i],localMode:true,demoKey:'stats',localStateStorage:{getItem:()=>null},accountUserId:null});
  vm.runInContext(source.slice(source.indexOf('  const classDefs ='),source.indexOf('  const builtinWorlds')),c);
  vm.runInContext('function characterDef(c){return classDefs[c.class];}',c);
  vm.runInContext(source.slice(source.indexOf('  function combatStats('),source.indexOf('  function stageRecordName(')),c);
  vm.runInContext(source.slice(source.indexOf('  const storyVitalsCache='),source.indexOf('  function saveStoryVitals(')),c);
  return c;
}
test('LV1 coefficients times 50 and HP/MP points match all four classes',()=>{
  for(const [cls,expected] of Object.entries({warrior:[200,50,200,100],mage:[100,100,250,200],ranger:[150,50,150,200],pugilist:[200,50,150,150]})){
    const c=setup(cls),s=c.combatStats(1),v=c.storyVitals();
    assert.deepEqual([s.hp,s.mp,s.atk,s.luk],expected);
    assert.equal(v.hpMax,expected[0]/50);assert.equal(v.mpMax,expected[1]/50);
    assert.equal('def' in s,false);
  }
});
test('equipment crosses HP and MP point boundaries, including legacy defense bonuses',()=>{
  for(const [bonus,points] of [[49,2],[50,3],[99,3],[100,4]]){
    const c=setup('mage',[{stat_key:'def',stat_value:bonus},{stat_key:'mp',stat_value:bonus}]);
    assert.equal(c.storyVitals().hpMax,points);assert.equal(c.storyVitals().mpMax,points);
  }
});
test('each class gains its configured stats every level while equipment stays additive',()=>{
  const bases={warrior:[200,50,200,100],mage:[100,100,250,200],ranger:[150,50,150,200],pugilist:[200,50,150,150]};
  const gains={warrior:[4,2,4,1],mage:[2,4,5,3],ranger:[3,2,3,4],pugilist:[4,2,3,3]};
  for(const cls of Object.keys(bases))for(const level of [1,2,10,100]){
    const c=setup(cls,[{stat_key:'hp',stat_value:50},{stat_key:'atk',stat_value:7}],level),s=c.combatStats(level);
    assert.deepEqual([s.hp,s.mp,s.atk,s.luk],bases[cls].map((base,i)=>base+(level-1)*gains[cls][i]+[50,0,7,0][i]));
    assert.equal(c.storyVitals().hpMax,Math.floor(s.hp/50));
    assert.equal(c.storyVitals().mpMax,Math.floor(s.mp/50));
  }
});
test('boss attack steps have exact 300/301/400/401 thresholds',()=>{
  for(const [atk,expected] of [[150,1],[300,1],[301,2],[400,2],[401,3],[500,3],[501,4]]){
    const c=setup('warrior',[{stat_key:'atk',stat_value:atk-200}]);
    assert.equal(c.bossAttackSteps(),expected);
  }
});
for(const [file,key] of [['guardian-boss.js','WORDORIA_GUARDIAN'],['black-dragon-boss.js','WORDORIA_BLACK_DRAGON']]){
  test(`${file}: damage waits for contact, crosses skill thresholds, clamps lethal damage`,()=>{
    const c={window:{}};vm.runInNewContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),c);
    const rules=c.window[key],s={...rules.reset(),correct:10,index:10,bossHp:50,hp:4,bossAttackSteps:3};
    rules.answer(s,true,200);assert.equal(s.bossHp,50);assert.equal(s.correct,13);
    rules.advance(s,199);assert.equal(s.bossHp,50);
    rules.advance(s,1);assert.equal(s.bossHp,47);assert.ok(s.guardianThresholds.includes(48));
    const lethal={...rules.reset(),correct:59,index:59,bossHp:1,hp:4,bossAttackSteps:3};
    rules.answer(lethal,true,200);assert.equal(lethal.correct,60);assert.equal(lethal.index,60);
    assert.ok(rules.advance(lethal,1200).includes('victory'));assert.equal(lethal.bossHp,0);
  });
}

test('capacity changes preserve stored damage, depleted HP and MP rather than resetting the character',()=>{
  const c=setup('mage',[{stat_key:'hp',stat_value:50},{stat_key:'mp',stat_value:50}]);
  c.localStateStorage.getItem=()=>JSON.stringify({hp:1,mp:0});
  assert.equal(c.storyVitals().hp,1);assert.equal(c.storyVitals().hpMax,3);assert.equal(c.storyVitals().mp,0);
  c.localStateStorage.getItem=()=>JSON.stringify({hp:0,mp:1});assert.equal(c.storyVitals().hp,0);
});
