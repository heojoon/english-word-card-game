import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const layout=JSON.parse(await readFile('assets/story/chapter-7c-map-layout.json','utf8'));
const browser=await chromium.launch({headless:true});
const report=[];
try {
  for(const [name,viewport] of [['mobile',{width:390,height:844}],['desktop',{width:1280,height:900}]]){
    const page=await browser.newPage({viewport,reducedMotion:'reduce'});
    const errors=[],failed=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400&&new URL(r.url()).host==='127.0.0.1:3000')failed.push(r.url());});
    await page.addInitScript(()=>localStorage.setItem('wordoria-production-demo-v1',JSON.stringify({storyBranch:'6B'})));
    await page.goto('http://127.0.0.1:3000/?demo=1',{waitUntil:'networkidle'});
    if(await page.locator('body.entry-active').count())await page.locator('#entry-guest').click();
    await page.waitForFunction(()=>document.querySelector('#screen')?.innerText.length>30);
    await page.locator('#screen [data-page="dungeon"]').click();
    await page.locator('[data-action="mode-select"][data-mode="story"]').click();
    for(const n of [2,3,4,5,6,10])await page.locator(`[data-action="story-world-select"][data-world="${n}"]`).click();
    const map=page.locator('.story-world-map-10');
    await map.locator('img').evaluate(im=>im.decode());
    assert.equal(await map.locator('.story-map-node').count(),30);
    assert.equal(await map.locator('.story-map-node:disabled').count(),30);
    assert.match(await map.locator('.story-map-node-10').getAttribute('aria-label'),/인공 심연의 골렘/);
    assert.match(await map.locator('.story-map-node-30').getAttribute('aria-label'),/봉인의 수호기사/);
    const alignment=await map.evaluate((map,positions)=>{
      const rect=map.getBoundingClientRect();
      return [...map.querySelectorAll('.story-map-node')].map((node,i)=>{
        const r=node.getBoundingClientRect();
        return {stage:i+1,errorX:Math.abs((r.x+r.width/2-rect.x-1)/(rect.width-2)*100-parseFloat(positions[i][0])),errorY:Math.abs((r.y+r.height/2-rect.y-1)/(rect.height-2)*100-parseFloat(positions[i][1]))};
      });
    },layout.positions);
    assert(alignment.every(n=>n.errorX<0.25&&n.errorY<0.25));
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await map.screenshot({path:`output/story-map/world7c-${name}-map.png`});
    await map.locator('.story-map-node-10').scrollIntoViewIfNeeded();
    await page.screenshot({path:`output/story-map/world7c-${name}-midboss.png`});
    await map.locator('.story-map-node-30').scrollIntoViewIfNeeded();
    await page.screenshot({path:`output/story-map/world7c-${name}-bottom.png`});
    await map.locator('[data-world="6"]').click();
    await page.locator('.story-world-map-6').waitFor();
    await page.locator('[data-world="10"]').click();
    await page.locator('.story-world-map-10 [data-world="9"]').click();
    await page.locator('.story-world-map-9').waitFor();
    assert.deepEqual(errors,[]);
    assert.deepEqual(failed,[]);
    report.push({name,viewport,nodes:30,combat:'disabled pending implementation',alignment,errors,failed});
    await page.close();
  }
  await writeFile('output/story-map/world7c-browser-review.json',JSON.stringify(report,null,2));
  console.log('7C mobile and desktop passed: image loading, 30 aligned nodes, 10/30 boss labels, pending combat, 6B/7B navigation, no overflow or page errors.');
}finally{await browser.close();}
