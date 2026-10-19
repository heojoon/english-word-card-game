// Lossless extraction/atlas assembly and FFmpeg resampling only. No color keys or AI-art repainting.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {deflateSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../assets/monsters/bandit-chief/',import.meta.url));
const run=(cmd,args,input)=>{
  const r=spawnSync(cmd,args,{input,maxBuffer:128*1024*1024,windowsHide:true});
  if(r.status!==0)throw new Error(`${cmd}: ${r.stderr?.toString()||r.error}`);
  return r.stdout;
};
const cache=new Map();
function load(name){
  if(cache.has(name))return cache.get(name);
  const p=path.join(root,name),s=JSON.parse(run('ffprobe',['-v','error','-show_entries','stream=width,height','-of','json',p])).streams[0];
  const im={w:s.width,h:s.height,data:run('ffmpeg',['-v','error','-i',p,'-f','rawvideo','-pix_fmt','rgba','-'])};
  cache.set(name,im);return im;
}
const table=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc(b){let n=0xffffffff;for(const v of b)n=table[(n^v)&255]^(n>>>8);return(n^0xffffffff)>>>0;}
function chunk(type,data){const b=Buffer.concat([Buffer.from(type),data]),n=Buffer.alloc(4),c=Buffer.alloc(4);n.writeUInt32BE(data.length);c.writeUInt32BE(crc(b));return Buffer.concat([n,b,c]);}
function png(name,im){
  const h=Buffer.alloc(13);h.writeUInt32BE(im.w,0);h.writeUInt32BE(im.h,4);h[8]=8;h[9]=6;
  const rows=Buffer.alloc(im.h*(im.w*4+1));
  for(let y=0;y<im.h;y++)im.data.copy(rows,y*(im.w*4+1)+1,y*im.w*4,(y+1)*im.w*4);
  mkdirSync(path.dirname(path.join(root,name)),{recursive:true});
  writeFileSync(path.join(root,name),Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',h),chunk('IDAT',deflateSync(rows,{level:9})),chunk('IEND',Buffer.alloc(0))]));
}
function empty(w,h){return {w,h,data:Buffer.alloc(w*h*4)};}
function crop(im,[x,y,w,h]){
  const out=empty(w,h);for(let j=0;j<h;j++)im.data.copy(out.data,j*w*4,((y+j)*im.w+x)*4,((y+j)*im.w+x+w)*4);return out;
}
function paste(out,im,x,y){
  if(x<0||y<0||x+im.w>out.w||y+im.h>out.h)throw new Error(`Frame overflow ${x},${y}: ${im.w}x${im.h} into ${out.w}x${out.h}`);
  for(let j=0;j<im.h;j++)im.data.copy(out.data,((y+j)*out.w+x)*4,j*im.w*4,(j+1)*im.w*4);
}
function bounds(im,threshold=16){let x0=im.w,y0=im.h,x1=-1,y1=-1;
  for(let y=0;y<im.h;y++)for(let x=0;x<im.w;x++)if(im.data[(y*im.w+x)*4+3]>=threshold){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
  return[x0,y0,x1+1,y1+1];
}
function resize(im,w,h){return {w,h,data:run('ffmpeg',['-v','error','-f','rawvideo','-pix_fmt','rgba','-s',`${im.w}x${im.h}`,'-i','-','-vf',`scale=${w}:${h}:flags=lanczos`,'-frames:v','1','-f','rawvideo','-pix_fmt','rgba','-'],im.data)};}
function background(im,color){
  const out=empty(im.w,im.h);for(let p=0;p<im.data.length;p+=4){const a=im.data[p+3]/255;for(let c=0;c<3;c++)out.data[p+c]=Math.round(im.data[p+c]*a+color[c]*(1-a));out.data[p+3]=255;}return out;
}
if(process.argv.includes('--inspect')){
  for(const name of process.argv.slice(3)){
    const im=load(name),cols=[];let begin=null;
    for(let x=0;x<=im.w;x++){let found=false;for(let y=0;x<im.w&&y<im.h;y++)if(im.data[(y*im.w+x)*4+3]>=16){found=true;break;}
      if(found&&begin===null)begin=x;if(!found&&begin!==null){cols.push([begin,x]);begin=null;}}
    console.log(JSON.stringify({name,w:im.w,h:im.h,bounds:bounds(im),columns:cols}));
  }
  process.exit(0);
}
const contract=JSON.parse(readFileSync(path.join(root,'animation-contract.json'),'utf8'));
const spec=JSON.parse(readFileSync(path.join(root,'source/extraction.json'),'utf8'));
const summary={generator:'image_gen built-in',normalization:'FFmpeg Lanczos; lossless crop/atlas packing; no color keys',browser:'not requested; not run',actions:{}};
for(const [action,poses] of Object.entries(spec.actions)){
  const projectile=action==='projectile',w=projectile?320:448,h=320,cells=[],records=[];
  for(const [i,p]of poses.entries()){
    const src=load(p.source),box=p.crop||[0,0,src.w,src.h],frame=crop(src,box),visible=bounds(frame,16);
    // Keep an 8-source-pixel antialias safety band around the complete visible silhouette.
    // Alpha inside that rectangular crop is untouched; no white/black color key is used.
    const b=[Math.max(0,visible[0]-8),Math.max(0,visible[1]-8),Math.min(frame.w,visible[2]+8),Math.min(frame.h,visible[3]+8)];
    png(`source-frames/${action}/${String(i+1).padStart(2,'0')}.png`,frame);
    const ground=p.ground??b[3],pivot=p.pivot??(b[0]+b[2])/2;
    const scale=p.scale??(projectile?200/Math.max(b[2]-b[0],b[3]-b[1]):235/(ground-p.bodyTop));
    const tight=crop(frame,[b[0],b[1],b[2]-b[0],b[3]-b[1]]),small=resize(tight,Math.round(tight.w*scale),Math.round(tight.h*scale));
    const x=Math.round(w/2-(pivot-b[0])*scale),y=projectile?Math.round((h-small.h)/2):Math.round(312-(ground-b[1])*scale);
    if(x<4||y<4||x+small.w>w-4||y+small.h>h-4)throw new Error(`${action} ${i+1}: insufficient safety margin; adjust frame width, not character size: ${x},${y},${small.w},${small.h}`);
    const cell=empty(w,h);paste(cell,small,x,y);png(`${action}/${String(i+1).padStart(2,'0')}.png`,cell);cells.push(cell);
    records.push({...p,scale,normalizedGroundY:projectile?null:312,framingAlphaThreshold:16,sourceSafetyPaddingPx:8,alphaBounds:b});
  }
  const strip=empty(w*cells.length,h),spaced=empty(w*cells.length+50*(cells.length-1),h);
  for(const [i,cell]of cells.entries()){paste(strip,cell,i*w,0);paste(spaced,cell,i*(w+50),0);}
  const filename=`char_bandit_chief_sd_${action}_strip.png`;
  png(filename,strip);png(`review/${action}-spaced-master.png`,spaced);
  const a=contract.actions[action],names=a.frames;
  const manifest={image:filename,frameWidth:w,frameHeight:h,frameCount:cells.length,layout:'horizontal',facing:'left',anchor:projectile?{x:.5,y:.5}:contract.anchor,sourceFrameGapPx:50,spacedReviewImage:`review/${action}-spaced-master.png`,frames:names.map((name,i)=>({index:i,name,durationMs:a.durationMs[i],...(action==='attack'&&i===4?{release:true}:{}),...(action==='hit'&&i===1?{hit:true}:{})})),normalization:records,review:{technical:'complete; inspect review composites',browser:'not requested; not run',userApproval:'not inferred from technical review'}};
  if(action==='hit'){manifest.finalFrameHold=true;manifest.runtimeContactEntryFrame=1;manifest.note='Nonlethal damage holds impact; lethal damage proceeds to prone frame. Notice is shown before player contact.';}
  if(action==='attack')manifest.finalFrameHoldUntil='axe contact; the throwing hand stays empty throughout flight';
  if(projectile)manifest.timeline={releaseMs:320,flightMs:600,contactMs:920,hit:true,rotation:'screen-space clockwise/anticlockwise transform; no redraw; reduced-motion quarter turn'};
  writeFileSync(path.join(root,filename.replace('.png','.json')),JSON.stringify(manifest,null,2)+'\n');
  for(const [label,color]of [['light',[247,247,255]],['violet',[87,81,216]]]){
    const bg=background(spaced,color);png(`review/${action}-${label}.png`,bg);
    // Mobile review includes equal-cell boundaries and the shared 312px ground line.
    for(let x=0;x<bg.w;x++)bg.data.set([96,217,207,255],(312*bg.w+x)*4);
    for(let i=0;i<cells.length;i++)for(const x of [i*(w+50),i*(w+50)+w-1])for(let y=0;y<h;y++)bg.data.set([120,104,239,255],(y*bg.w+x)*4);
    const mobile=resize(bg,Math.round(bg.w/2),160);png(`review/${action}-${label}-mobile.png`,mobile);
  }
  if(cells.length>1){
    const lines=[];for(let i=0;i<cells.length;i++){lines.push(`file '${path.join(root,action,String(i+1).padStart(2,'0')+'.png').replaceAll('\\','/')}'`,`duration ${a.durationMs[i]/1000}`);}
    lines.push(`file '${path.join(root,action,String(cells.length).padStart(2,'0')+'.png').replaceAll('\\','/')}'`);
    const list=path.join(root,'review',`${action}-timeline.ffconcat`);writeFileSync(list,lines.join('\n')+'\n');
    run('ffmpeg',['-v','error','-y','-f','concat','-safe','0','-i',list,'-c:v','libwebp_anim','-lossless','1','-loop','0','-fps_mode','vfr',path.join(root,'review',`${action}-preview.webp`)]);
  }
  summary.actions[action]={frameCount:cells.length,frameWidth:w,frameHeight:h,spacedWidth:spaced.w};
}
writeFileSync(path.join(root,'review/technical-review.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
