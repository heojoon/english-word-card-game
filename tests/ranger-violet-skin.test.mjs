import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
const root=new URL('../assets/characters/ranger/violet-crystal-skin/',import.meta.url);
const contract=JSON.parse(readFileSync(new URL('animation-contract.json',root)));

function runtime({variant='female',equipped=true,reduced=false,heroClass='ranger'}={}){
  const context=vm.createContext({selectedCharacter:{class:heroClass,avatar_variant:variant,equipped_items:equipped?{skin:10}:{}},
    itemById:id=>id===10?{code:'ranger_violet_crystal_skin',name:'보랏빛 결정 궁수'}:null,
    equippedMap:()=>context.selectedCharacter.equipped_items,variantOf:c=>c.avatar_variant,
    reducedMotion:()=>reduced,esc:String,portrait:()=>'<portrait>'});
  for(const [start,end] of [['  function battleContactDelay(){','  function refreshStorySelections('],['  function battleHeroMarkup(){','  function storyBattleActions(']]){
    vm.runInContext(source.slice(source.indexOf(start),source.indexOf(end)),context);
  }
  return context;
}

test('equipping and removing the female ranger skin changes shared battle markup',()=>{
  const c=runtime();
  assert.match(c.battleHeroMarkup(),/battle-hero-ranger battle-hero-female battle-skin-ranger_violet_crystal_skin/);
  assert.match(c.battleHeroMarkup(),/battle-projectile/);
  c.selectedCharacter.equipped_items={};
  assert.doesNotMatch(c.battleHeroMarkup(),/battle-skin-/);
  assert.match(c.battleHeroMarkup(),/battle-hero-female/);
});

test('violet ranger contact follows arrow release and impact in both motion modes',()=>{
  const attack=contract.actions.attack,arrow=contract.actions.projectile;
  const release=attack.cssDelayMs+attack.cssDurationMs*attack.releaseFrame/(attack.frameCount-1);
  const contact=arrow.cssDelayMs+arrow.cssDurationMs*arrow.hitFrame/(arrow.frameCount-1);
  assert.equal(release,arrow.cssDelayMs);
  assert.equal(runtime().battleContactDelay(),contact);
  assert.equal(runtime({reduced:true}).battleContactDelay(),310);
  assert.ok(contact>release);
  assert.equal(runtime({equipped:false}).battleContactDelay(),560);
  assert.equal(runtime({variant:'male'}).battleContactDelay(),560);
  assert.equal(runtime({heroClass:'warrior'}).battleContactDelay(),420);
});

test('runtime strips contain complete contiguous RGBA slots and isolated gameplay events',()=>{
  for(const [action,spec] of Object.entries(contract.actions)){
    const manifest=JSON.parse(readFileSync(new URL(spec.image.replace('.png','.json'),root)));
    const png=readFileSync(new URL(spec.image,root));
    assert.equal(png.readUInt32BE(16),manifest.frameWidth*manifest.frameCount);
    assert.equal(png.readUInt32BE(20),manifest.frameHeight);
    assert.equal(png[25],6,'RGBA PNG color type');
    assert.equal(manifest.frameCount,spec.frameCount);
    assert.equal(manifest.sourceFrameGapPx,50);
    const review=readFileSync(new URL(`review/${action}-source-50px.png`,root));
    assert.equal(review.readUInt32BE(16),manifest.frameWidth*manifest.frameCount+(manifest.frameCount-1)*50);
    if(action==='attack'){
      assert.equal(manifest.frames[4].release,true);
      assert.ok(manifest.frames.every(frame=>!frame.hit),'damage belongs to projectile contact');
      assert.equal(manifest.frames.at(-1).name,'attack_peak');
    }
    if(action==='projectile')assert.equal(manifest.frames[4].hit,true);
    if(action==='hit'){
      assert.equal(manifest.frameCount,3);
      assert.equal(manifest.frames.at(-1).name,'knockdown');
      assert.equal(manifest.frames.at(-1).finalHold,true);
    }
  }
});
