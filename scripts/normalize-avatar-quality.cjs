// Local alpha extraction. Decode source PNGs to <name>.rgb first with FFmpeg.
// Output <name>.rgba buffers (1254 × 1254) are encoded separately with FFmpeg.
// See assets/avatars/source/quality-upgrade-20260911/README.md.
const fs = require('node:fs');
const path = require('node:path');
const out = process.argv[2] || '/tmp/wordoria-avatar-quality';
fs.mkdirSync(out, {recursive:true});
function inside(x,y,points){let hit=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const [a,b]=points[i],[c,d]=points[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)hit=!hit;}return hit;}
// Hand-reviewed keep regions protect silver armor / blade from neutral-color
// extraction. Coordinates refer to a 512px review rendering.
const keep={
 'warrior-male':[
  [[48,204],[81,188],[117,185],[174,209],[175,257],[146,280],[203,310],[289,352],[308,423],[370,512],[158,512],[132,443],[79,414],[60,390],[61,354],[44,316]],
  [[509,111],[501,140],[480,173],[455,205],[409,267],[367,318],[339,347],[318,358],[288,354],[317,323],[348,285],[383,241],[420,197],[460,153]]
 ],
 'ranger-female':[[[111,382],[246,380],[318,402],[315,483],[280,512],[119,512]],[[304,221],[365,216],[392,244],[351,301],[302,286]]],
 'mage-male':[[[438,145],[465,142],[488,174],[474,201],[440,208],[414,179]]]
};
function cutout(name) {
 const w=1254,h=1254,n=w*h;
 const rgb=fs.readFileSync(path.join(out,`${name}.rgb`));
 const candidate=new Uint8Array(n), seen=new Uint8Array(n), removed=new Uint8Array(n);
 const queue=new Int32Array(n);
 const dark=name==='ranger-female';
 for(let i=0;i<n;i++){
  const r=rgb[i*3],g=rgb[i*3+1],b=rgb[i*3+2];
  const hi=Math.max(r,g,b),lo=Math.min(r,g,b);
  candidate[i]=dark?(hi<48):(hi-lo<22&&lo>100);
 }
 // Flood neutral regions; retain isolated highlights unless a large component
 // has the alternating mid-gray and white distribution of a checkerboard.
 for(let start=0;start<n;start++){
  if(!candidate[start]||seen[start])continue;
  let head=0,tail=1,edge=false,gray=0,white=0;
  queue[0]=start;seen[start]=1;
  while(head<tail){
   const i=queue[head++],x=i%w,y=Math.floor(i/w);
   if(x===0||y===0||x===w-1||y===h-1)edge=true;
   if(rgb[i*3]<205)gray++;if(rgb[i*3]>225)white++;
   for(const j of [x>0?i-1:-1,x<w-1?i+1:-1,y>0?i-w:-1,y<h-1?i+w:-1])
    if(j>=0&&candidate[j]&&!seen[j]){seen[j]=1;queue[tail++]=j;}
  }
  if(edge||(name!=='warrior-male'&&!dark&&tail>180&&gray/tail>.15&&white/tail>.15))
   for(let k=0;k<tail;k++)removed[queue[k]]=1;
 }
 for(let i=0;i<n;i++){
  const x=(i%w)*512/w,y=Math.floor(i/w)*512/h;
  const r=rgb[i*3],g=rgb[i*3+1],b=rgb[i*3+2],hi=Math.max(r,g,b),lo=Math.min(r,g,b);
  if(name==='pugilist-female'&&candidate[i]&&(
   inside(x,y,[[93,15],[159,12],[150,71],[90,72]])||
   inside(x,y,[[325,115],[435,124],[438,163],[380,169],[344,209],[301,213],[289,176]])||
   inside(x,y,[[139,333],[190,329],[171,363],[143,361]])
  ))removed[i]=1;
  if(name==='ranger-female'&&hi<65&&x>300&&y<300)removed[i]=1;
  if(name==='mage-male'&&hi-lo<60&&lo>155&&((x>354&&y<268)||(x<102&&y>206&&y<294)))removed[i]=1;
  if((keep[name]||[]).some(poly=>inside(x,y,poly)))removed[i]=0;
 }
 const rgba=Buffer.alloc(n*4);
 for(let i=0;i<n;i++){
  rgb.copy(rgba,i*4,i*3,i*3+3);
  rgba[i*4+3]=removed[i]?0:255;
 }
 const dest=path.join(out,`${name}.rgba`);
 fs.writeFileSync(dest,rgba);
 console.log(name,`${Math.round(removed.reduce((s,x)=>s+x,0)/n*100)}% transparent`,dest);
}
for(const name of ['mage-male','warrior-male','pugilist-female','ranger-female'])cutout(name);
