import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const output=new URL('../assets/monsters/world-8/ashen-wedge-soldier/review/',import.meta.url);
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const errors=[],checks=[];
try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  await page.addInitScript(()=>{window.WORDORIA_GUEST=true;});
  await page.route('**/title-screen.js*',route=>route.fulfill({contentType:'text/javascript',body:''}));
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400&&response.url().startsWith('http://localhost:3000/'))errors.push(`${response.status()} ${response.url()}`);});
  await page.route('**/crystal-game.js*',async route=>{
    const response=await route.fetch(),text=await response.text();
    const hook=`window.__wedgeReview={ready(){return Boolean(selectedCharacter);},battle(number=2){selectedCharacter.class='mage';selectedStage='story-ch8-'+number;selectedStoryStage=selectedStage;startBattle();run.hp=run.hpMax;run.mp=2;run.timeStopped=false;render();},answer(correct=true){answerStorySpelling(run.question.choices.findIndex(x=>(x===run.question.answer)===correct));},pause(){pause();},resume(){resume();},ice(){activateMageIceTime();},state(){return {index:run.index,hp:run.hp,mp:run.mp,elapsed:run.elapsed,attack:run.attack,attacking:run.spiderAttacking,locked:run.locked,paused:run.paused,ice:run.iceTimeActive,wedge:run.wedgeMob,contact:battleContactDelay()};}};`;
    await route.fulfill({response,body:text.replace(/\}\)\(\);\s*$/,hook+'})();')});
  });
  await page.goto('http://localhost:3000/?demo=1',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.__wedgeReview?.ready());
  await page.evaluate(()=>{document.body.classList.remove('entry-active');document.getElementById('entry-screen')?.remove();window.__wedgeReview.battle();});
  const mob=page.locator('.ashen-wedge-soldier-mob');
  await mob.waitFor();
  await page.waitForFunction(()=>[...document.querySelectorAll('.ashen-wedge-soldier-mob span')].every(el=>getComputedStyle(el).backgroundImage.includes('ashen-wedge-soldier')));
  const geometry=await mob.evaluate(el=>{const b=el.getBoundingClientRect(),a=el.closest('.arena').getBoundingClientRect();return {width:b.width,height:b.height,clip:getComputedStyle(el).clipPath,inside:b.left>=a.left&&b.right<=a.right+1};});
  assert.equal(geometry.width,196);assert.equal(geometry.height,140);assert.equal(geometry.clip,'none');assert.equal(geometry.inside,true);
  await page.screenshot({path:fileURLToPath(new URL('mobile-idle.png',output)),fullPage:true});
  await page.evaluate(()=>window.__wedgeReview.ice());
  assert.equal((await page.evaluate(()=>window.__wedgeReview.state())).ice,true);
  const frozen=await page.evaluate(()=>({time:window.__wedgeReview.state().elapsed,play:getComputedStyle(document.querySelector('.ashen-wedge-soldier-mob .spider-idle-strip')).animationPlayState}));
  await page.waitForTimeout(180);
  assert.equal((await page.evaluate(()=>window.__wedgeReview.state())).elapsed,frozen.time);assert.equal(frozen.play,'paused');
  checks.push('Ice Time freezes countdown and idle sprite');
  await page.evaluate(()=>window.__wedgeReview.answer());
  const contact=(await page.evaluate(()=>window.__wedgeReview.state())).contact;
  await page.waitForTimeout(contact+150);
  await page.evaluate(()=>window.__wedgeReview.pause());
  const down=await mob.locator('.spider-hit-strip').evaluate(el=>({position:getComputedStyle(el).backgroundPosition,visible:getComputedStyle(el).visibility}));
  assert.equal(down.position,'100% 0px');assert.equal(down.visible,'visible');
  await page.screenshot({path:fileURLToPath(new URL('mobile-knockdown.png',output)),fullPage:true});
  await page.waitForTimeout(250);assert.equal((await page.evaluate(()=>window.__wedgeReview.state())).index,0);
  await page.evaluate(()=>window.__wedgeReview.resume());
  await page.waitForFunction(()=>window.__wedgeReview.state().index===1);
  assert.equal(await mob.locator('.spider-idle-strip').evaluate(el=>getComputedStyle(el).visibility),'visible');
  checks.push('Contact-aligned hit reaches final knockdown, holds during pause, resets next question');
  await page.evaluate(()=>{window.__wedgeReview.answer(false);window.__wedgeReview.pause();});
  const hp=(await page.evaluate(()=>window.__wedgeReview.state())).hp;
  await page.waitForTimeout(300);assert.equal((await page.evaluate(()=>window.__wedgeReview.state())).hp,hp);
  await page.evaluate(()=>window.__wedgeReview.resume());
  await page.waitForFunction(hp=>window.__wedgeReview.state().hp===hp-1,hp);
  await page.screenshot({path:fileURLToPath(new URL('mobile-thrust.png',output)),fullPage:true});
  await page.waitForFunction(()=>!window.__wedgeReview.state().locked);
  assert.equal((await page.evaluate(()=>window.__wedgeReview.state())).index,1);
  checks.push('Wrong-answer thrust pauses before contact and retries the same question after damage');
  for(const width of [320,768]){
    await page.setViewportSize({width,height:844});
    const bounds=await mob.boundingBox();assert.ok(bounds.width>170&&bounds.height>=128);
    await page.screenshot({path:fileURLToPath(new URL(`viewport-${width}.png`,output)),fullPage:true});
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>window.__wedgeReview.battle());
  assert.equal(await mob.locator('.spider-idle-strip').evaluate(el=>getComputedStyle(el).animationName),'none');
  await page.evaluate(()=>window.__wedgeReview.answer());
  await page.waitForFunction(()=>window.__wedgeReview.state().index===1);
  checks.push('320px/768px layout and reduced-motion first-to-last playback');
  for(const stage of [15,30]){await page.evaluate(stage=>window.__wedgeReview.battle(stage),stage);assert.equal(await mob.count(),0);}
  assert.deepEqual(errors,[]);
  await writeFile(new URL('browser-validation.json',output),JSON.stringify({checks,geometry,errors},null,2)+'\n');
  console.log(JSON.stringify({checks,geometry,errors}));
}finally{await browser.close();}
