import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
const skin={id:21,code:'sniper_snow_crystal_skin',name:'설원 결정 스나이퍼',slot:'skin',category:'avatar',price:400,
  art_path:'assets/characters/sniper/snow-crystal-skin/char_sniper_female_snow_crystal_profile_thigh_up_v1.webp'};
function runtime(heroClass='sniper',variant='female'){
  const c=vm.createContext({run:null,selectedCharacter:{class:heroClass,avatar_variant:variant,equipped_items:{skin:21}},
    itemById:id=>String(id)==='21'?skin:null,equippedMap:()=>c.selectedCharacter.equipped_items,
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
test('only the female sniper can select the Snow Crystal skin',()=>{
  assert.equal(runtime().skinEligible(skin),true);
  assert.equal(runtime().skinRequirement(skin),'여성 스나이퍼 전용');
  for(const hero of ['warrior','mage','pugilist','ranger'])for(const variant of ['female','male'])
    assert.equal(runtime(hero,variant).skinEligible(skin),false);
  assert.equal(runtime('sniper','male').skinEligible(skin),false);
});
test('equipping changes profile and shared battle art; unequipping restores default',()=>{
  const c=runtime();
  assert.equal(vm.runInContext('imagePath(selectedCharacter)',c),skin.art_path);
  assert.match(c.battleHeroMarkup(),/battle-skin-sniper_snow_crystal_skin/);
  assert.doesNotMatch(c.battleHeroMarkup(),/battle-projectile|<portrait>/);
  c.selectedCharacter.equipped_items={};
  assert.doesNotMatch(c.battleHeroMarkup(),/battle-skin-/);
  assert.match(c.battleHeroMarkup(),/battle-hero-sniper/);
  assert.match(source,/art_path:'assets\/characters\/sniper\/snow-crystal-skin\/char_sniper_female_snow_crystal_profile_thigh_up_v1.webp'/);
});
test('skin uses the existing hitscan contact timing in both motion modes',()=>{
  const c=runtime();assert.equal(c.battleContactDelay(),480);
  c.reducedMotion=()=>true;assert.equal(c.battleContactDelay(),160);
  const root=new URL('../assets/characters/sniper/snow-crystal-skin/',import.meta.url);
  const attack=JSON.parse(readFileSync(new URL('char_sniper_female_snow_crystal_sd_attack_strip.json',root)));
  assert.equal(attack.contactMs,480);assert.equal(attack.reducedContactMs,160);
  const hit=JSON.parse(readFileSync(new URL('char_sniper_female_snow_crystal_sd_hit_strip.json',root)));
  assert.equal(hit.frames.at(-1).finalHold,true);
});
