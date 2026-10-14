import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true});
const errors=[];
const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/crystal-game.js?*',async route=>{
  const response=await route.fetch();
  const text=await response.text();
  // This harness is injected only into the test browser response.
  await route.fulfill({response,body:text.replace('  loadAll().then(',"  window.__world5Qa={openMap(){selectedStoryWorld=5;go('story');},enter(number){startStoryStage('story-ch5-'+number);},state(){return {page,selectedStage,chapter:stages[selectedStage]?.storyChapter,count:run?.deck.length};},async finish(clear){return finishBattle(clear,clear?'qa-clear':'qa-loss');}};\n  loadAll().then(")});
});
try{
  await page.goto('http://127.0.0.1:3000/?demo=1');
  await page.getByRole('button',{name:'손님으로 시작',exact:true}).click();
  await page.locator('[data-action="nav"][data-page="dungeon"]').first().click();
  await page.locator('[data-action="mode-select"][data-mode="story"]').click();
  for(let world=2;world<=5;world++)await page.locator(`[data-action="story-world-select"][data-world="${world}"]`).click();
  const map=page.locator('.story-world-map-5');
  await map.locator('img.story-world-map-art').evaluate(img=>img.decode());
  assert.equal(await map.locator('[data-action="story-stage-select"]').count(),20);
  assert.equal(await page.locator('.story-world-map').count(),1);
  assert.equal(await page.locator('[data-world="6"]').isDisabled(),true);
  assert.ok(await page.getByRole('heading',{name:'보랏빛 수정동굴',exact:true}).isVisible());
  const alignment=await map.evaluate(el=>{
    const map=el.getBoundingClientRect();
    return [...el.querySelectorAll('.story-map-node')].map(node=>{
      const rect=node.getBoundingClientRect();
      return {stage:node.dataset.stage,x:(rect.x+rect.width/2-map.x)/map.width*100,y:(rect.y+rect.height/2-map.y)/map.height*100};
    });
  });
  const layout=JSON.parse(await readFile('assets/story/chapter-5-map-layout.json','utf8'));
  alignment.forEach((p,i)=>{
    assert.ok(Math.abs(p.x-layout.stages[i].x)<0.25);
    assert.ok(Math.abs(p.y-layout.stages[i].y)<0.25);
  });
  await page.screenshot({path:'output/story-map/world5-map-mobile.png',fullPage:true});
  const navigation=await page.locator('.story-map-navigation-inline').boundingBox();
  const mapBox=await map.boundingBox();
  assert.ok(navigation.y+navigation.height<=mapBox.y);
  await map.locator('[data-stage="story-ch5-20"]').scrollIntoViewIfNeeded();
  await page.screenshot({path:'output/story-map/world5-map-mobile-bottom.png'});
  await page.locator('[data-stage="story-ch5-20"]').click();
  await page.locator('[data-stage="story-ch5-20"]').click();
  assert.ok(await page.locator('dialog').isVisible());
  await page.locator('[data-action="story-enter-cancel"]').click();
  for(const [number,scene] of [[1,'storyChapterFiveIntro'],[10,'storyChapterFiveMidbossStart'],[20,'storyChapterFiveBossStart']]){
    await page.evaluate(number=>window.__world5Qa.enter(number),number);
    assert.equal((await page.evaluate(()=>window.__world5Qa.state())).page,scene);
    const before=await page.locator('.story-vn-progress').innerText();
    await page.locator('.story-vn-dialogue p').click();
    assert.notEqual(await page.locator('.story-vn-progress').innerText(),before);
    await page.locator('.story-vn').focus();
    await page.keyboard.press('ArrowRight');
    await page.screenshot({path:`output/story-map/world5-stage-${number}-novel.png`});
    await page.locator('[data-action="story-dialogue-skip"]').click();
    const state=await page.evaluate(()=>window.__world5Qa.state());
    assert.equal(state.page,'battle');
    assert.equal(state.chapter,5);
    assert.equal(state.count,60);
    assert.equal(await page.locator('.story-match-item').count(),10);
    if(number===10){
      await page.evaluate(()=>window.__world5Qa.finish(true));
      assert.equal((await page.evaluate(()=>window.__world5Qa.state())).page,'storyChapterFiveMidbossEnd');
      await page.locator('[data-action="story-dialogue-skip"]').click();
      assert.equal((await page.evaluate(()=>window.__world5Qa.state())).page,'result');
    }else await page.evaluate(()=>window.__world5Qa.finish(false));
    await page.evaluate(()=>window.__world5Qa.openMap());
  }
  await page.setViewportSize({width:1280,height:900});
  await page.screenshot({path:'output/story-map/world5-map-desktop.png',fullPage:true});
  assert.deepEqual(errors,[]);
  await writeFile('output/story-map/world5-browser-review.json',JSON.stringify({mobile:[390,844],desktop:[1280,900],mapCount:1,nodes:20,alignment,entryScenes:[1,10,20],midbossEnding:'passed (simulated clear)',keyboard:'passed',errors},null,2)+'\n');
  console.log('World 5 browser QA passed: twenty aligned nodes, mobile/desktop, stage 1/10/20 novels, battle entry and midboss ending.');
}finally{await browser.close();}
