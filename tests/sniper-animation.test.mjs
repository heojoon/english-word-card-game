import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const root=new URL('../assets/characters/sniper/',import.meta.url);
const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');

test('female sniper strips have contiguous RGBA frames and complete 50px review masters',()=>{
  for(const [action,count] of [['idle',2],['attack',6],['hit',3]]){
    const name=`char_sniper_female_sd_${action}_strip`;
    const manifest=JSON.parse(readFileSync(new URL(name+'.json',root)));
    const png=readFileSync(new URL(name+'.png',root));
    assert.equal(manifest.frameCount,count);
    assert.equal(png.readUInt32BE(16),512*count);
    assert.equal(png.readUInt32BE(20),320);
    assert.equal(png[25],6);
    assert.deepEqual(manifest.anchor,{x:.5,y:.975});
    assert.equal(manifest.sourceFrameGapPx,50);
    const review=readFileSync(new URL(`review/${action}-source-50px.png`,root));
    assert.equal(review.readUInt32BE(16),512*count+50*(count-1));
    if(action==='attack'){
      assert.equal(manifest.frames[4].release,true);
      assert.equal(manifest.frames[4].hit,true);
      assert.equal(manifest.frames.at(-1).name,'active-recoil');
      assert.equal(manifest.projectile,false);
    }
    if(action==='hit')assert.equal(manifest.frames.at(-1).finalHold,true);
  }
  assert.deepEqual(readFileSync(new URL('idle-female/01.png',root)),readFileSync(new URL('attack-female/01.png',root)));
});

test('sniper release and contact are simultaneous, with target-local impact and reduced motion',()=>{
  const manifest=JSON.parse(readFileSync(new URL('char_sniper_female_sd_attack_strip.json',root)));
  for(const reduced of [false,true]){
    const c=vm.createContext({selectedCharacter:{class:'sniper',avatar_variant:'female'},
      itemById:()=>null,equippedMap:()=>({}),variantOf:c=>c.avatar_variant,reducedMotion:()=>reduced});
    vm.runInContext(source.slice(source.indexOf('  function battleContactDelay(){'),source.indexOf('  function refreshStorySelections(')),c);
    assert.equal(c.battleContactDelay(),reduced?manifest.reducedContactMs:manifest.contactMs);
  }
  const properties={};
  const arena={getBoundingClientRect:()=>({left:10,top:20}),
    style:{setProperty:(k,v)=>properties[k]=v},
    querySelector:selector=>selector==='.battle-hero'?{
      classList:{contains:c=>c==='battle-hero-sniper'},
      getBoundingClientRect:()=>({left:15,top:50,width:120,height:120})
    }:{getBoundingClientRect:()=>({left:220,top:60,width:60,height:80})}};
  const c=vm.createContext({$:()=>arena});
  vm.runInContext(source.slice(source.indexOf('  function setHeroAttackTravel(){'),source.indexOf('  function tick(){')),c);
  c.setHeroAttackTravel();
  assert.deepEqual(properties,{'--sniper-impact-x':'240px','--sniper-impact-y':'80px'});
});
