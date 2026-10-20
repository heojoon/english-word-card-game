import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
const skin={id:22,code:'mage_shadow_sorceress_skin',name:'쉐도우 소서러스',slot:'skin',category:'avatar',price:800,
  art_path:'assets/avatars/skins/mage-male-shadow-sorceress.webp'};
function runtime(heroClass='mage',variant='male'){
  const c=vm.createContext({run:null,selectedCharacter:{class:heroClass,avatar_variant:variant,equipped_items:{skin:22}},
    itemById:id=>String(id)==='22'?skin:null,equippedMap:()=>c.selectedCharacter.equipped_items,
    variantOf:character=>character.avatar_variant,isSkin:item=>item.slot==='skin',esc:String,portrait:()=>'<portrait>',
    deployedAssetUrl:path=>path,reducedMotion:()=>false});
  for(const [start,end] of [['  function skinEligible(', '  function inventoryQuantityMarkup('],
    ['  function battleHeroMarkup(', '  function storyBattleActions('],
    ['  function battleContactDelay(){','  function refreshStorySelections(']]){
    vm.runInContext(source.slice(source.indexOf(start),source.indexOf(end)),c);
  }
  vm.runInContext(source.slice(source.indexOf('  const imagePath ='),source.indexOf('  const portraitSceneClass')),c);
  return c;
}
test('Shadow Sorceress is restricted to the male mage',()=>{
  assert.equal(runtime().skinEligible(skin),true);
  assert.equal(runtime().skinRequirement(skin),'남성 마법사 전용');
  for(const hero of ['warrior','mage','pugilist','ranger','sniper'])for(const variant of ['female','male'])
    assert.equal(runtime(hero,variant).skinEligible(skin),hero==='mage'&&variant==='male');
});
test('equip changes portrait and shared battle art; unequip restores default',()=>{
  const c=runtime();
  assert.equal(vm.runInContext('imagePath(selectedCharacter)',c),skin.art_path);
  assert.match(c.battleHeroMarkup(),/battle-skin-mage_shadow_sorceress_skin/);
  assert.doesNotMatch(c.battleHeroMarkup(),/battle-projectile|<portrait>/);
  c.selectedCharacter.equipped_items={};
  assert.doesNotMatch(c.battleHeroMarkup(),/battle-skin-/);
  assert.match(c.battleHeroMarkup(),/battle-projectile/);
});
test('damage contact matches the second cast frame in both motion modes',()=>{
  const c=runtime();assert.equal(c.battleContactDelay(),200);
  c.reducedMotion=()=>true;assert.equal(c.battleContactDelay(),60);
  const root=new URL('../assets/monsters/shadow-sorceress/',import.meta.url);
  const attack=JSON.parse(readFileSync(new URL('shadow-sorceress-sd-attack-strip.json',root)));
  assert.equal(attack.frames[0].duration,200);
  assert.equal(attack.frames[1].hit,true);
  const hit=JSON.parse(readFileSync(new URL('shadow-sorceress-sd-hit-strip.json',root)));
  assert.equal(hit.frameCount,3);assert.equal(hit.finalFrameHold,true);
});
