import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import vm from 'node:vm';
const root=new URL('../assets/monsters/bandit-chief/',import.meta.url);
const json=p=>JSON.parse(readFileSync(new URL(p,root),'utf8'));
function png(p){
  const b=readFileSync(new URL(p,root));assert.equal(b.subarray(1,4).toString(),'PNG');
  const w=b.readUInt32BE(16),h=b.readUInt32BE(20);assert.equal(b[24],8);assert.equal(b[25],6,'RGBA required');
  const blocks=[];for(let o=8;o<b.length;){const n=b.readUInt32BE(o);if(b.toString('ascii',o+4,o+8)==='IDAT')blocks.push(b.subarray(o+8,o+8+n));o+=n+12;}
  const raw=inflateSync(Buffer.concat(blocks)),out=Buffer.alloc(w*h*4),stride=w*4;
  for(let y=0;y<h;y++){
    const filter=raw[y*(stride+1)],start=y*stride;
    for(let x=0;x<stride;x++){
      const a=x>=4?out[start+x-4]:0,c=y>0&&x>=4?out[start+x-stride-4]:0,up=y>0?out[start+x-stride]:0;
      const q=a+up-c,pa=Math.abs(q-a),pb=Math.abs(q-up),pc=Math.abs(q-c),predict=[0,a,up,Math.floor((a+up)/2),pa<=pb&&pa<=pc?a:pb<=pc?up:c][filter];
      assert.notEqual(predict,undefined,'known PNG filter');out[start+x]=(raw[y*(stride+1)+1+x]+predict)&255;
    }
  }
  return{w,h,data:out};
}
const window={};vm.runInNewContext(readFileSync(new URL('../bandit-chief-boss.js',import.meta.url),'utf8'),{window});
const rules=window.WORDORIA_BANDIT_CHIEF;

test('all boss states ship complete equal RGBA slots, preserved cloth, margins and exact transparent review gaps',()=>{
  for(const action of ['idle','attack','dodge','hit','projectile']){
    const m=json(`char_bandit_chief_sd_${action}_strip.json`),strip=png(m.image),spaced=png(m.spacedReviewImage);
    assert.equal(strip.w,m.frameWidth*m.frameCount);assert.equal(strip.h,m.frameHeight);assert.equal(m.layout,'horizontal');assert.equal(m.facing,'left');assert.equal(m.sourceFrameGapPx,50);
    assert.equal(spaced.w,m.frameCount*m.frameWidth+(m.frameCount-1)*50);assert.equal(spaced.h,m.frameHeight);
    for(let i=0;i<m.frameCount;i++){
      let visible=0,opaque=0,white=0,dark=0;
      for(let y=0;y<strip.h;y++)for(let x=0;x<m.frameWidth;x++){
        const p=(y*strip.w+i*m.frameWidth+x)*4,a=strip.data[p+3];
        if(x<3||x>=m.frameWidth-3||y<3||y>=strip.h-3)assert.ok(a<=1,`${action}/${i}: safe transparent border`);
        if(a>=16)visible++;if(a>=240){opaque++;if(strip.data[p]>180&&strip.data[p+1]>170&&strip.data[p+2]>155)white++;if(strip.data[p]<100&&strip.data[p+1]<100&&strip.data[p+2]<100)dark++;}
      }
      assert.ok(visible>1000&&opaque>visible*.7,`${action}/${i}: real solid character, no translucent matte`);
      assert.ok(white>100&&dark>100,`${action}/${i}: light cloth/metal and black coat/handle remain opaque`);
      if(i<m.frameCount-1)for(let y=0;y<spaced.h;y++)for(let x=0;x<50;x++)assert.equal(spaced.data[(y*spaced.w+i*(m.frameWidth+50)+m.frameWidth+x)*4+3],0,'50 px alpha=0 separator');
    }
  }
});

test('manifest release/recoil/knockdown events and durations match runtime pose selection',()=>{
  for(const action of Object.keys(rules.ANIMATIONS)){
    const m=json(`char_bandit_chief_sd_${action}_strip.json`);assert.deepEqual(m.frames.map(f=>f.durationMs),Array.from(rules.ANIMATIONS[action]));assert.equal(m.frameWidth,448);assert.equal(m.frameHeight,320);assert.deepEqual(m.anchor,{x:.5,y:.975});
  }
  const attack=json('char_bandit_chief_sd_attack_strip.json'),hit=json('char_bandit_chief_sd_hit_strip.json');
  assert.equal(attack.frameCount,6);assert.equal(attack.frames[4].release,true);assert.equal(attack.frames.slice(0,4).reduce((n,f)=>n+f.durationMs,0),320);assert.equal(attack.frames[5].name,'attack-peak');
  assert.equal(hit.frameCount,3);assert.equal(hit.frames[1].hit,true);assert.equal(hit.frames[2].name,'knockdown');assert.equal(hit.finalFrameHold,true);
  assert.ok(readFileSync(new URL('review/animations.html',root)).length>1000);
});
