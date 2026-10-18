import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
const start=source.indexOf('function storyMonsterArt(');
const end=source.indexOf(' if(run.guardian)',start);
const context=vm.createContext({});
vm.runInContext(source.slice(start,end),context);
test('World 6A uses its half-broken golem for every mob slot, preserving other worlds',()=>{
  const path='assets/monsters/world-6a/monster_half_broken_golem_sd_left.png';
  for(let slot=0;slot<5;slot++)assert.equal(context.storyMonsterArt(7,slot),path);
  assert.ok(existsSync(new URL('../'+path,import.meta.url)));
  assert.match(context.storyMonsterArt(2,0),/crystal-golem-normal-sd-right/);
  assert.match(context.storyMonsterArt(3,0),/crystal-eye-serpent/);
  assert.match(context.storyMonsterArt(4,0),/crystal_candy/);
  assert.equal(context.storyMonsterArt(6,0),null);
  assert.match(source,/monsterClass=chapter===7\?'half-broken-golem-mob'/);
});

test('World 6A golem animation strips preserve full-width frames, contact events and held knockdown',()=>{
  for(const action of ['attack','hit']){
    const root=new URL('../assets/monsters/world-6a/',import.meta.url);
    const manifest=JSON.parse(readFileSync(new URL(`golem-sd-${action}-strip.json`,root),'utf8'));
    const png=readFileSync(new URL(manifest.image,root));
    assert.equal(manifest.frameWidth,384);assert.equal(manifest.frameHeight,320);
    assert.equal(manifest.frameCount,3);assert.equal(manifest.sourceFrameGapPx,50);
    assert.equal(png.readUInt32BE(16),384*3);assert.equal(png.readUInt32BE(20),320);
    assert.equal(png[25],6);
    const review=readFileSync(new URL(`review/${action}-source-50px.png`,root));
    assert.equal(review.readUInt32BE(16),384*3+100);
    if(action==='attack')assert.equal(manifest.frames[2].hit,true);
    else {assert.equal(manifest.frames[1].hit,true);assert.equal(manifest.frames[2].name,'knockdown');assert.equal(manifest.frames[2].hold,true);}
  }
  assert.match(source,/golemMob:Boolean\(source.story&&source.storyChapter===7\)/);
  assert.match(source,/chapter===5\|\|chapter===6\|\|chapter===7\)\?crystalSpiderMobsMarkup/);
});
