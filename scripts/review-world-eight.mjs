import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const output=new URL('../assets/story/source/world-8/',import.meta.url);
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const errors=[];
const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
await page.addInitScript(()=>{window.WORDORIA_GUEST=true;});
await page.route('**/title-screen.js*',route=>route.fulfill({contentType:'text/javascript',body:''}));
page.on('pageerror',error=>errors.push(error.message));
page.on('response',response=>{if(response.status()>=400&&response.url().startsWith('http://localhost:3000/'))errors.push(`${response.status()} ${response.url()}`);});
// Review-only hooks live in the intercepted response, never in the production file.
await page.route('**/crystal-game.js*',async route=>{
  const response=await route.fetch();
  const text=await response.text();
  const hook=`window.__world8Review={ready(){return Boolean(selectedCharacter);},map(){demoState.storyBranch='6A';selectedStoryWorld=11;selectedStoryStage='story-ch8-1';page='story';render();},battle(number=2){selectedStage='story-ch8-'+number;selectedStoryStage=selectedStage;startBattle();},pause(){pause();},state(){return {page,question:run?.question,index:run?.index,total:run?.deck.length,limit:run?.storyTimeLimit};}};`;
  await route.fulfill({response,body:text.replace(/\}\)\(\);\s*$/,hook+'})();')});
});
await page.goto('http://localhost:3000/?demo=1',{waitUntil:'networkidle'});
try{await page.waitForFunction(()=>window.__world8Review?.ready());}catch(error){console.log({errors,scripts:await page.locator('script[src]').evaluateAll(nodes=>nodes.map(n=>n.src)),body:(await page.locator('body').innerText()).slice(0,300)});await browser.close();throw error;}
await page.evaluate(()=>{document.body.classList.remove('entry-active');document.getElementById('entry-screen')?.remove();window.__world8Review.map();});
const map=page.locator('.story-world-map-11');
try{await map.waitFor();}catch(error){console.log({errors,state:await page.evaluate(()=>window.__world8Review.state()),body:(await page.locator('body').innerText()).slice(0,1200)});await browser.close();throw error;}
await page.waitForFunction(()=>document.querySelector('.story-world-map-11 img').complete);
assert.equal(await map.locator('.story-map-node').count(),30);
const coordinates=JSON.parse(await readFile(new URL('measured-waypoints.json',output),'utf8'));
const alignment=await map.evaluate((el,positions)=>{
  const image=el.querySelector('.story-world-map-art'),box=image.getBoundingClientRect();
  return [...el.querySelectorAll('.story-map-node')].map((node,i)=>{
    const b=node.getBoundingClientRect(),x=b.x+b.width/2,y=b.y+b.height/2;
    return {stage:i+1,dx:Math.abs(x-(box.x+box.width*positions[i][0]/100)),dy:Math.abs(y-(box.y+box.height*positions[i][1]/100)),width:b.width,height:b.height};
  });
},coordinates);
assert.ok(alignment.every(p=>p.dx<1&&p.dy<1));
assert.ok(alignment.every(p=>p.width>=44&&p.height>=44));
await map.screenshot({path:new URL('mobile-map-review.png',output).pathname.replace(/^\/([A-Z]:)/,'$1')});
await page.screenshot({path:new URL('mobile-screen-review.png',output).pathname.replace(/^\/([A-Z]:)/,'$1'),fullPage:true});
await map.locator('.story-map-node-30').scrollIntoViewIfNeeded();
await page.screenshot({path:new URL('mobile-map-bottom-review.png',output).pathname.replace(/^\/([A-Z]:)/,'$1')});
assert.ok(await map.locator('.story-map-node-30').isVisible());
await page.evaluate(()=>window.__world8Review.battle());
await page.locator('.story-spelling-question').waitFor();
const state=await page.evaluate(()=>window.__world8Review.state());
assert.equal(state.total,40);assert.equal(state.limit,120000);assert.equal(state.question.mode,'spelling');
assert.equal(await page.locator('.answer').count(),4);
assert.equal(await page.locator('input:not([type=hidden]):visible').count(),0);
await page.screenshot({path:new URL('mobile-spelling-review.png',output).pathname.replace(/^\/([A-Z]:)/,'$1'),fullPage:true});
await page.evaluate(()=>window.__world8Review.pause());
assert.deepEqual(errors,[]);
await writeFile(new URL('browser-review.json',output),JSON.stringify({viewport:{width:390,height:844},nodeCount:30,alignment,spelling:{choices:4,total:state.total,timeMs:state.limit},errors},null,2)+'\n');
console.log('Mobile World 8: 30 aligned nodes; all touch targets >=44px; 40 Type C choices questions; 120s; no page errors or missing local assets.');
await browser.close();
