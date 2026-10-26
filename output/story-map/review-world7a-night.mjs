import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
const report=[];
try {
  for(const [name,viewport] of [['mobile',{width:390,height:844}],['desktop',{width:1280,height:900}]]){
    const page=await browser.newPage({viewport,reducedMotion:'reduce'});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>localStorage.setItem('wordoria-production-demo-v1',JSON.stringify({storyBranch:'6A'})));
    await page.goto('http://127.0.0.1:3000/?demo=1',{waitUntil:'networkidle'});
    if(await page.locator('body.entry-active').count())await page.locator('#entry-guest').click();
    await page.waitForFunction(()=>document.querySelector('#screen')?.innerText.length>30);
    await page.locator('#screen [data-page="dungeon"]').click();
    await page.locator('[data-action="mode-select"][data-mode="story"]').click();
    for(const n of [2,3,4,5,7,8])await page.locator(`[data-action="story-world-select"][data-world="${n}"]`).click();
    const map=page.locator('.story-world-map-8');
    await map.locator('img.story-world-map-art').evaluate(im=>im.decode());
    const nodes=await map.locator('.story-map-node').count();
    if(nodes!==30)throw Error(`Expected 30 nodes, got ${nodes}`);
    const screenshot=`output/story-map/world7a-night-${name}-map.png`;
    await map.screenshot({path:screenshot});
    await map.locator('.story-map-node-30').scrollIntoViewIfNeeded();
    await page.screenshot({path:`output/story-map/world7a-night-${name}-bottom.png`});
    const alignment=await map.locator('.story-map-node').evaluateAll(nodes=>nodes.map(n=>({stage:n.dataset.stage,x:n.style.getPropertyValue('--story-x'),y:n.style.getPropertyValue('--story-y')})));
    report.push({viewport,nodes,screenshot,alignment,errors});
    if(errors.length)throw Error(errors.join('\n'));
    await page.close();
  }
  await writeFile('output/story-map/world7a-night-browser-review.json',JSON.stringify(report,null,2));
  console.log('Mobile and desktop: 30 map nodes, image loaded, zero page errors.');
} finally {await browser.close();}
