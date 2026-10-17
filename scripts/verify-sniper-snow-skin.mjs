import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.SNOW_SNIPER_REVIEW_URL||'http://127.0.0.1:3000';
const review=new URL('../assets/characters/sniper/snow-crystal-skin/review/',import.meta.url);
await mkdir(review,{recursive:true});
const browser=await chromium.launch({headless:true});
const report={scope:'Actual local demo UI and battle; isolated browser state, no production account mutations',checks:[],errors:[],resourceWarnings:[]};
const snow='snow-crystal-skin';
try{
  for(const [width,reducedMotion] of [[390,'no-preference'],[320,'reduce']]){
    const page=await browser.newPage({viewport:{width,height:844},reducedMotion});
    page.setDefaultTimeout(10000);
    page.on('pageerror',e=>report.errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base)){
      const path=new URL(r.url()).pathname;
      (path.startsWith('/assets/audio/')?report.resourceWarnings:report.errors).push(r.status()+' '+path);
    }});
    await page.route('**/title-screen.js*',r=>r.abort());
    await page.route('**/*.supabase.co/**',r=>r.abort());
    await page.addInitScript(()=>{
      window.WORDORIA_GUEST=true;Math.random=()=>.5;
      localStorage.setItem('fantasyQuizPlayer','snow-review');
      if(!localStorage.getItem('wordoria-production-demo-v1'))localStorage.setItem('wordoria-production-demo-v1',JSON.stringify({
        characters:[{id:'snow-review-sniper',player:'snow-review',name:'Snow Sniper',class:'sniper',avatar_variant:'female',coins:2000,equipped_items:{}}],
        records:[],inventory:[],redemptions:[],potionInventory:{}
      }));
    });
    await page.goto(base+'/?demo=1');
    await page.waitForSelector('[data-page="shop"]',{state:'attached'});
    await page.evaluate(()=>{document.querySelector('#entry-screen')?.remove();document.body.classList.remove('entry-active')});
    await page.locator('[data-page="shop"]').first().click();
    await page.locator('[data-action="filter"][data-filter="skin"]').click();
    const card=page.locator('.item[data-id="21"]');await card.waitFor();
    assert.match(await card.locator('img').getAttribute('src'),/profile_thigh_up_v1.webp/);
    await page.screenshot({path:new URL(`shop-${width}.png`,review).pathname.replace(/^\/([A-Z]:)/,'$1')});
    await card.click();await page.locator('[data-action="buy"][data-id="21"]').click();
    await page.waitForFunction(()=>!document.querySelector('#dialog').open);
    await page.locator('.item[data-id="21"]').click();
    await page.locator('[data-action="equip"][data-id="21"]').click();
    await page.waitForFunction(()=>!document.querySelector('#dialog').open);
    await page.locator('[data-page="home"]').first().click();
    assert.match(await page.locator('.hero .portrait img').first().getAttribute('src'),/profile_thigh_up_v1.webp/);
    await page.screenshot({path:new URL(`profile-${width}.png`,review).pathname.replace(/^\/([A-Z]:)/,'$1')});
    await page.locator('[data-page="gear"]').first().click();
    assert.match(await page.locator('.gear-character .portrait img').first().getAttribute('src'),/profile_thigh_up_v1.webp/);
    await page.locator('.item[data-id="21"]').click();await page.locator('[data-action="equip"][data-id="21"]').click();
    await page.waitForFunction(()=>!document.querySelector('#dialog').open);
    assert.doesNotMatch(await page.locator('.gear-character .portrait img').first().getAttribute('src'),/snow-crystal/);
    await page.locator('.item[data-id="21"]').click();await page.locator('[data-action="equip"][data-id="21"]').click();
    await page.waitForFunction(()=>!document.querySelector('#dialog').open);
    await page.reload();
    await page.waitForSelector('[data-page="dungeon"]',{state:'attached'});
    await page.evaluate(()=>{document.querySelector('#entry-screen')?.remove();document.body.classList.remove('entry-active')});
    await page.locator('[data-page="dungeon"]').first().click();
    await page.locator('[data-action="mode-select"][data-mode="survival"]').click();
    await page.locator('[data-action="world"]').first().click();await page.locator('[data-action="stage"]').first().click();
    if(await page.locator('[data-action="start"]').count())await page.locator('[data-action="start"]').click();
    await page.waitForSelector('.battle-skin-sniper_snow_crystal_skin');
    const sprite=page.locator('.battle-sprite');
    const style=()=>sprite.evaluate(e=>({image:getComputedStyle(e).backgroundImage,size:getComputedStyle(e).backgroundSize,position:getComputedStyle(e).backgroundPosition}));
    assert.match((await style()).image,/snow.crystal.*idle_strip/);
    await page.locator('.arena').screenshot({path:new URL(`battle-idle-${width}.png`,review).pathname.replace(/^\/([A-Z]:)/,'$1')});
    const correct=await page.evaluate(()=>{
      const prompt=document.querySelector('.question-card h1').textContent;
      const words=Object.values(window.QUIZ_STAGES).flatMap(stage=>stage.words);
      const candidates=new Set(words.filter(w=>w[0]===prompt||`[${w[1]}] ${w[2]}`===prompt).flatMap(w=>[w[0],`[${w[1]}] ${w[2]}`]));
      return [...document.querySelectorAll('.answer')].findIndex(b=>{const clone=b.cloneNode(true);clone.querySelectorAll('span,small').forEach(e=>e.remove());return candidates.has(clone.textContent.trim())});
    });
    assert.ok(correct>=0);await page.locator('.answer').nth(correct).click();
    await page.evaluate(()=>document.querySelector('#arena').getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=520}));
    assert.match((await style()).image,/snow.crystal.*attack_strip/);assert.equal((await style()).size,'600% 100%');
    assert.ok(Number(await page.locator('.crystal-shards').evaluate(e=>getComputedStyle(e,'::before').opacity))>0||reducedMotion==='reduce');
    await page.locator('.arena').screenshot({path:new URL(`battle-attack-${width}.png`,review).pathname.replace(/^\/([A-Z]:)/,'$1')});
    // Final knockdown holds until battle state changes; inspect using the actual arena and production CSS.
    await page.evaluate(()=>{const a=document.querySelector('#arena');a.classList.remove('hit');a.classList.add('wrong','story-stunned');a.getAnimations({subtree:true}).forEach(x=>{x.pause();x.currentTime=1500})});
    assert.match((await style()).image,/snow.crystal.*hit_strip/);assert.equal((await style()).size,'300% 100%');assert.equal((await style()).position,'100% 0px');
    await page.locator('.arena').screenshot({path:new URL(`battle-knockdown-${width}.png`,review).pathname.replace(/^\/([A-Z]:)/,'$1')});
    await page.evaluate(()=>{const a=document.querySelector('#arena');a.classList.remove('wrong','story-stunned')});
    assert.match((await style()).image,/snow.crystal.*idle_strip/);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    report.checks.push({width,reducedMotion,shopProfile:true,purchase:true,equipUnequip:true,persisted:true,homeAndGearProfile:true,actualSurvivalAttack:true,productionCssKnockdownHold:true,reset:true});
    await page.close();
  }
  assert.equal(report.errors.length,0,JSON.stringify(report.errors));
  console.log(JSON.stringify(report));
}finally{
  await writeFile(new URL('integration-browser-review.json',review),JSON.stringify(report,null,2)+'\n');
  await browser.close();
}
