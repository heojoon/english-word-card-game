import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root=new URL('../assets/monsters/world-7a/',import.meta.url);
const json=p=>JSON.parse(readFileSync(new URL(p,root),'utf8'));
for(const variant of ['normal','scorched'])test(`7A ${variant} skeleton strips preserve RGBA cells, contact and final knockdown`,()=>{
  for(const action of ['idle','attack','hit']){
    const name=`skeleton-${variant}-sd-${action}-strip`;
    const metadata=json(`${name}.json`),count=action==='idle'?2:3;
    const png=readFileSync(new URL(`${name}.png`,root));
    assert.equal(png.readUInt32BE(16),count*416);
    assert.equal(png.readUInt32BE(20),320);
    assert.equal(png[25],6,'RGBA transparency');
    assert.equal(metadata.frameCount,count);
    assert.deepEqual(metadata.anchor,{x:.5,y:.975});
    assert.equal(metadata.sourceFrameGapPx,50);
    const review=readFileSync(new URL(`review/${variant}-${action}-source-50px.png`,root));
    assert.equal(review.readUInt32BE(16),count*416+(count-1)*50);
    if(action==='attack')assert.equal(metadata.frames[2].hit,true);
    if(action==='hit'){
      assert.equal(metadata.frames[2].name,'bone-pile-knockdown');
      assert.equal(metadata.frames[2].hold,true);
      assert.equal(metadata.holdFinal,true);
    }
  }
  for(const row of json('review/validation.json').filter(row=>row.variant===variant)){
    for(const [left,top,right,bottom] of row.bounds){
      assert.ok(left>=8&&right<=408&&top>=8&&bottom<=312,'sprite stays inside its slot');
    }
  }
});
