// Manual map-only QA. Start npm run dev first; uses the installed Playwright browser.
const {chromium}=require('playwright');
let activeBrowser;
(async()=>{
 const browser=await chromium.launch({headless:true});
 activeBrowser=browser;
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('wordoria:lastStoryStage:율이:demo-mage',JSON.stringify({key:'story-ch11-1',playedAt:Date.now()})));
 await page.goto('http://127.0.0.1:3000/?demo=1',{waitUntil:'networkidle'});
 await page.locator('#entry-guest').click();
 await page.waitForFunction(()=>document.querySelectorAll('[data-action="nav"]').length>0);
 await page.locator('[data-action="nav"][data-page="dungeon"]').first().click();
 await page.locator('[data-action="mode-select"][data-mode="story"]').click();
 await page.locator('.story-world-map-14').waitFor();
 const reports=[];
 for(const width of [390,360,320]){
  await page.setViewportSize({width,height:844});
  await page.waitForFunction(()=>{const i=document.querySelector('.story-world-map-14 img');return i?.complete&&i.naturalWidth>0});
  const report=await page.locator('.story-world-map-14').evaluate(map=>{
   const box=map.getBoundingClientRect(),img=map.querySelector('img'),nodes=[...map.querySelectorAll('.story-map-node')].map(n=>{const r=n.getBoundingClientRect();return {number:Number(n.dataset.stage.split('-').at(-1)),x:r.x+r.width/2-box.x,y:r.y+r.height/2-box.y,width:r.width,height:r.height}});
   const overlaps=[];let minDistance=Infinity;
   for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const a=nodes[i],b=nodes[j],dx=Math.abs(a.x-b.x),dy=Math.abs(a.y-b.y);minDistance=Math.min(minDistance,Math.hypot(dx,dy));if(dx<(a.width+b.width)/2&&dy<(a.height+b.height)/2)overlaps.push([a.number,b.number,dx,dy]);}
   return {mapWidth:box.width,mapHeight:box.height,image:[img.naturalWidth,img.naturalHeight],nodeCount:nodes.length,ordered:nodes.every((n,i)=>!i||n.y>nodes[i-1].y),minDistance,rectangularBoundsOverlaps:overlaps,circularTargetsOverlap:minDistance<44,nodes};
  });
  reports.push({viewport:width,...report});
  for(const stage of [1,22,44]){
   const node=page.locator(`[data-stage="story-ch11-${stage}"]`);await node.scrollIntoViewIfNeeded();
   const hit=await node.evaluate(n=>{const b=n.getBoundingClientRect();return document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)?.closest('[data-stage]')?.dataset.stage});
   await page.screenshot({path:`assets/story/source/world-11/browser-${width}-stage-${stage}.png`});
   if(hit!==`story-ch11-${stage}`){console.log(await node.evaluate(n=>{const b=n.getBoundingClientRect();return {rect:b.toJSON(),element:document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)?.outerHTML.slice(0,600)}}));throw Error(`Target ${stage} is obscured at ${width}px: ${hit}`);}
  }
  if(report.nodeCount!==44||!report.ordered||report.circularTargetsOverlap)throw Error(`Map contract failed at ${width}px`);
 }
 require('fs').writeFileSync('assets/story/source/world-11/browser-map-review.json',JSON.stringify({reports,errors},null,2)+'\n');
 console.log(reports.map(({nodes,...r})=>r));
 console.log('errors',errors);
 await browser.close();
})().catch(async e=>{console.error(e.message);await activeBrowser?.close();process.exitCode=1});
