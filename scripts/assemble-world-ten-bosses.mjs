/* Lossless RGBA extraction/packing; FFmpeg only resamples, never color-keys art. */
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {deflateSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=fileURLToPath(new URL('../',import.meta.url));
const contract=JSON.parse(readFileSync(path.join(root,'assets/monsters/world-10/boss-animation-contract.json'),'utf8'));
const W=contract.frameWidth,H=contract.frameHeight,ground=Math.round(H*.975);
function ff(args,input){const r=spawnSync('ffmpeg',['-v','error','-threads','1',...args],{input,maxBuffer:80*1024*1024});if(r.status!==0)throw new Error(r.stderr?.toString()||String(r.error));return r.stdout;}
function load(filename){let png=readFileSync(filename);if(png.toString('ascii',1,4)!=='PNG')png=ff(['-i',filename,'-frames:v','1','-f','image2pipe','-c:v','png','pipe:1']);const w=png.readUInt32BE(16),h=png.readUInt32BE(20);const data=ff(['-i',filename,'-frames:v','1','-f','rawvideo','-pix_fmt','rgba','pipe:1']);assert.equal(data.length,w*h*4);return {w,h,data};}
const table=Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc(b){let c=0xffffffff;for(const v of b)c=table[(c^v)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function chunk(type,b){const t=Buffer.from(type),out=Buffer.alloc(b.length+12);out.writeUInt32BE(b.length);t.copy(out,4);b.copy(out,8);out.writeUInt32BE(crc(Buffer.concat([t,b])),b.length+8);return out;}
function save(filename,im){mkdirSync(path.dirname(filename),{recursive:true});const header=Buffer.alloc(13);header.writeUInt32BE(im.w);header.writeUInt32BE(im.h,4);header[8]=8;header[9]=6;const rows=Buffer.alloc((im.w*4+1)*im.h);for(let y=0;y<im.h;y++)im.data.copy(rows,y*(im.w*4+1)+1,y*im.w*4,(y+1)*im.w*4);writeFileSync(filename,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows,{level:9})),chunk('IEND',Buffer.alloc(0))]));}
function blank(w,h){return {w,h,data:Buffer.alloc(w*h*4)};}
function paste(dest,im,x,y){assert.ok(x>=0&&y>=0&&x+im.w<=dest.w&&y+im.h<=dest.h);for(let j=0;j<im.h;j++)im.data.copy(dest.data,((y+j)*dest.w+x)*4,j*im.w*4,(j+1)*im.w*4);}
function crop(im,b){const [x,y,right,bottom]=b,out=blank(right-x,bottom-y);for(let j=0;j<out.h;j++)im.data.copy(out.data,j*out.w*4,((y+j)*im.w+x)*4,((y+j)*im.w+right)*4);return out;}
function resize(im,w,h){return {w,h,data:ff(['-f','rawvideo','-pix_fmt','rgba','-s',`${im.w}x${im.h}`,'-i','pipe:0','-vf',`scale=${w}:${h}:flags=lanczos`,'-frames:v','1','-f','rawvideo','-pix_fmt','rgba','pipe:1'],im.data)};}
function bounds(im,left=0,right=im.w,threshold=8){let x0=right,y0=im.h,x1=left,y1=0;for(let y=0;y<im.h;y++)for(let x=left;x<right;x++)if(im.data[(y*im.w+x)*4+3]>threshold){x0=Math.min(x0,x);x1=Math.max(x1,x+1);y0=Math.min(y0,y);y1=Math.max(y1,y+1);}assert.ok(x1>x0&&y1>y0);return [Math.max(left,x0-2),Math.max(0,y0-2),Math.min(right,x1+2),Math.min(im.h,y1+2)];}
function split(im){
  const columns=new Uint32Array(im.w);
  for(let y=0;y<im.h;y++)for(let x=0;x<im.w;x++)if(im.data[(y*im.w+x)*4+3]>32)columns[x]++;
  const cuts=[0];
  for(let i=1;i<=2;i++){
    const center=im.w*i/3,start=Math.floor(center-im.w/12),end=Math.ceil(center+im.w/12);
    let best=start;for(let x=start;x<end;x++)if(columns[x]<columns[best]||columns[x]===columns[best]&&Math.abs(x-center)<Math.abs(best-center))best=x;
    cuts.push(best);
  }
  cuts.push(im.w);
  return {boxes:[0,1,2].map(i=>bounds(im,cuts[i],cuts[i+1])),cuts,gutterCounts:cuts.slice(1,3).map(x=>columns[x])};
}
function preview(frames){
  const out=blank(576,328),colors=[[247,247,255],[87,81,216]];
  for(let row=0;row<2;row++)for(let i=0;i<3;i++){
    const tile=resize(frames[i],192,164),color=colors[row];
    for(let y=0;y<164;y++)for(let x=0;x<192;x++){
      const p=(y*192+x)*4,d=((row*164+y)*576+i*192+x)*4,a=tile.data[p+3]/255;
      for(let c=0;c<3;c++)out.data[d+c]=Math.round(tile.data[p+c]*a+color[c]*(1-a));out.data[d+3]=255;
      // One-pixel baseline makes any ground-line drift visible in mobile review.
      if(y===Math.round(164*.975)){out.data[d]=96;out.data[d+1]=217;out.data[d+2]=207;}
    }
  }
  return out;
}
function backdrop(im,color){
  const out=blank(im.w,im.h);
  for(let p=0;p<im.data.length;p+=4){const alpha=im.data[p+3]/255;for(let c=0;c<3;c++)out.data[p+c]=Math.round(im.data[p+c]*alpha+color[c]*(1-alpha));out.data[p+3]=255;}
  return out;
}

const report={};
for(const kind of ['lumen','seiran']){
  const folder=path.join(root,'assets/monsters/world-10',kind),groups={};
  for(const action of Object.keys(contract.actions)){
    if(action==='shield'&&kind!=='lumen')continue;
    const filename=path.join(folder,'source',`${action}-generated.png`);
    if(!existsSync(filename))continue;
    const im=load(filename),splitResult=split(im);
    groups[action]={im,...splitResult};
  }
  report[kind]=Object.fromEntries(Object.entries(groups).map(([a,g])=>[a,{dimensions:[g.im.w,g.im.h],boxes:g.boxes,gutterCounts:g.gutterCounts}]));
  if(process.argv.includes('--inspect'))continue;
  assert.equal(Object.keys(groups).length,kind==='lumen'?5:4,'all actions must be generated');
  const idleHeight=groups.idle.boxes[0][3]-groups.idle.boxes[0][1];
  const actionScale={};
  for(const [action,g] of Object.entries(groups)){
    assert.ok(g.gutterCounts.every(n=>n===0),`${kind}/${action}: foreground crosses a split; regenerate affected unit`);
    const first=g.boxes[0];actionScale[action]=idleHeight/(first[3]-first[1]);
  }
  // Pick a single identity scale, then use only action-source size compensation.
  const scale=Math.min((H-26)/idleHeight,...Object.entries(groups).flatMap(([a,g])=>g.boxes.flatMap(b=>[(W-32)/((b[2]-b[0])*actionScale[a]),(H-26)/((b[3]-b[1])*actionScale[a])])));
  for(const [action,g] of Object.entries(groups)){
    const def=contract.actions[action],frames=[],runtimeBounds=[];
    for(let i=0;i<3;i++){
      const raw=crop(g.im,g.boxes[i]);save(path.join(folder,`source-frames/${action}/${String(i+1).padStart(2,'0')}.png`),raw);
      const factor=scale*actionScale[action],resized=resize(raw,Math.round(raw.w*factor),Math.round(raw.h*factor));
      const frame=blank(W,H);paste(frame,resized,Math.floor((W-resized.w)/2),ground-resized.h);
      const bb=bounds(frame,0,W,16);assert.ok(bb[0]>=8&&bb[1]>=8&&bb[2]<=W-8&&bb[3]<=ground+2,`${kind}/${action}/${i}: unsafe bounds ${bb}`);
      runtimeBounds.push(bb);frames.push(frame);save(path.join(folder,`${action}/${String(i+1).padStart(2,'0')}.png`),frame);
    }
    const strip=blank(W*3,H),spaced=blank(W*3+100,H);
    frames.forEach((im,i)=>{paste(strip,im,i*W,0);paste(spaced,im,i*(W+50),0);});
    const filename=`${kind}-sd-${action}-strip.png`;
    save(path.join(folder,filename),strip);save(path.join(folder,`review/${action}-spaced-50px.png`),spaced);save(path.join(folder,`source-frames/${action}-spaced-50px.png`),spaced);save(path.join(folder,`review/${action}-light-violet.png`),preview(frames));
    const manifest={image:filename,frameWidth:W,frameHeight:H,frameCount:3,layout:'horizontal',facing:'left',anchor:contract.anchor,source:`source/${action}-generated.png`,sourceBounds:g.boxes,sourceDimensions:[g.im.w,g.im.h],sourceScale:scale*actionScale[action],sourceFrameGapPx:50,sourceFrameGapScope:'Normalized source-frames and review masters; generator originals retain their measured variable gutters.',frameNames:def.frames,durationsMs:def.durationsMs,loop:action==='idle',holdLastFrame:action!=='idle',contactMs:def.contactMs,frames:def.frames.map((name,i)=>({name,durationMs:def.durationsMs[i],...(['attack','skill','shield'].includes(action)&&i===2?{hit:true}:{}),...(action==='hit'&&i===2?{hold:true}:{})})),review:{alpha:'preserved generated RGBA; no color-key removal',runtimeBounds,sourceGutterForegroundCounts:g.gutterCounts,browser:'not run; only on user request',artApproval:'user approval not claimed'}};
    if(kind==='seiran'&&action==='skill')manifest.timingOverrides={mirror:contract.timingOverrides['seiran-mirror']};
    if(def.contactMs)manifest.reducedMotionMultiplier=.5;
    writeFileSync(path.join(folder,filename.replace('.png','.json')),JSON.stringify(manifest,null,2)+'\n');
    ff(['-y','-framerate',action==='idle'?'3':'5','-i',path.join(folder,action,'%02d.png'),'-loop','0',path.join(folder,`review/${action}-preview.webp`)]);
  }
  const standing=path.join(root,`assets/novel/characters/source/world-10/${kind}-generated.png`);
  ff(['-y','-i',standing,'-vf','scale=684:1024:force_original_aspect_ratio=decrease','-c:v','libwebp','-quality','90',path.join(root,`assets/novel/characters/char_${kind}_world10_standing.webp`)]);
  const standingImage=load(path.join(root,`assets/novel/characters/char_${kind}_world10_standing.webp`));
  save(path.join(folder,'review/standing-light.png'),backdrop(standingImage,[247,247,255]));
  save(path.join(folder,'review/standing-violet.png'),backdrop(standingImage,[87,81,216]));
  const base=path.join(folder,'idle/01.png');save(path.join(folder,'identity.png'),load(base));
  report[kind].runtime={frameWidth:W,frameHeight:H,sharedScale:scale,status:'packed; visual review pending'};
}
const reportPath=path.join(root,'assets/monsters/world-10',process.argv.includes('--inspect')?'source-inspection.json':'packing-review.json');
writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
