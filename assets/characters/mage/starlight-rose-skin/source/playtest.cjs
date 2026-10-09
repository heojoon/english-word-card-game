const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const repo=path.resolve(__dirname,'../../../../../');
const review=path.resolve(__dirname,'../review');
const story=process.argv.includes('--story');
(async()=>{
  const browser=await chromium.launch({headless:true});
  const results=[];
  for(const [width,reduced] of story?[[390,false],[390,true]]:[[360,false],[430,false],[390,true]]){
    const page=await browser.newPage({viewport:{width,height:844},reducedMotion:reduced?'reduce':'no-preference'});
    const errors=[],failedAssets=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.url().includes('starlight-rose')&&r.status()>=400)failedAssets.push(r.url())});
    await page.route('**/crystal-game.js?*',route=>{
      const source=fs.readFileSync(path.join(repo,'crystal-game.js'),'utf8').replace('  loadAll().then',"  window.__animationTest={question:()=>run.question,freezeClock:()=>clearInterval(timerId),contact:battleContactDelay,travel:setHeroAttackTravel};\n  loadAll().then");
      return route.fulfill({contentType:'application/javascript',body:source});
    });
    await page.addInitScript(()=>{
      localStorage.setItem('wordoria-production-demo-v1',JSON.stringify({characters:[{id:'demo-mage',player:'율이',name:'별빛루나',class:'mage',avatar_variant:'female',accent:'violet',coins:1000,equipped_items:{skin:15}}],inventory:[{character_id:'demo-mage',item_id:15}],records:[],redemptions:[],potionInventory:{},characterTickets:0}));
      window.skinEvents=[];document.addEventListener('wordoria:audio',e=>window.skinEvents.push({id:e.detail.id,time:performance.now()}));
    });
    await page.goto('http://127.0.0.1:3000/?demo=1');
    await page.locator('#entry-guest').click();
    await page.locator('[data-action=nav][data-page=dungeon]').first().click();
    if(story){
      await page.locator('[data-action=mode-select][data-mode=story]').click();
      await page.locator('[data-action=story-stage-select]').first().click();
      await page.locator('[data-action=story-enter-confirm]').click();
      if(await page.locator('[data-action=story-dialogue-skip]').count())await page.locator('[data-action=story-dialogue-skip]').click();
    }else{
    await page.locator('[data-action=mode-select][data-mode=survival]').click();
    await page.locator('[data-action=world]').first().click();
    await page.locator('[data-action=stage]').first().click();
    await page.locator('[data-action=start]').click();
    }
    await page.evaluate(()=>window.__animationTest.freezeClock());
    const state=()=>page.locator('.battle-sprite').evaluate(e=>({image:getComputedStyle(e).backgroundImage,size:getComputedStyle(e).backgroundSize,position:getComputedStyle(e).backgroundPosition,animation:getComputedStyle(e).animationName,transform:getComputedStyle(e).transform}));
    assert.match((await state()).image,/starlight_rose_sd_idle/);
    // Decode all layers before timed checks to avoid network-dependent first-frame blanks.
    await page.evaluate(async()=>{await Promise.all(['idle','attack','hit','projectile'].map(action=>new Promise((resolve,reject)=>{const i=new Image();i.onload=resolve;i.onerror=reject;i.src=`assets/characters/mage/starlight-rose-skin/char_mage_female_starlight_rose_sd_${action}_strip.png`;})))});
    if(story){
      const id=await page.locator('[data-action=story-pick][data-side=ko]').first().getAttribute('data-id');
      await page.locator(`[data-action=story-pick][data-side=ko][data-id='${id}']`).click();
      await page.locator(`[data-action=story-pick][data-side=en][data-id='${id}']`).click();
    }else{
    const correct=await page.evaluate(()=>{const q=window.__animationTest.question();return q.choices.indexOf(q.answer)});
    await page.locator('.answer').nth(correct).click();
    }
    assert.match((await state()).image,/starlight_rose_sd_attack/);
    await page.waitForTimeout(reduced?220:680);
    const timing=await page.evaluate(()=>{const launch=window.skinEvents.findLast(e=>e.id.startsWith('ATTACK_'));const contact=window.skinEvents.findLast(e=>e.id==='ENEMY_HIT');return {actual:contact.time-launch.time,expected:window.__animationTest.contact()}});
    assert.ok(Math.abs(timing.actual-timing.expected)<110,JSON.stringify(timing));
    // Freeze CSS at the exact contact frame and compare the effect center with enemy.
    const alignment=await page.evaluate(reduced=>{
      window.__animationTest.travel();
      const effect=document.querySelector('.battle-projectile');
      for(const a of effect.getAnimations()){a.pause();a.currentTime=reduced?170:620;}
      const e=effect.getBoundingClientRect(),target=document.querySelector('.enemy').getBoundingClientRect();
      return {deltaX:Math.abs(e.left+e.width/2-(target.left+target.width*.42)),deltaY:Math.abs(e.top+e.height/2-(target.top+target.height*.52))};
    },reduced);
    assert.ok(alignment.deltaX<5&&alignment.deltaY<5,JSON.stringify(alignment));
    await page.screenshot({clip:story?undefined:await page.locator('#arena').boundingBox(),path:path.join(review,`${story?'story':'battle'}-contact-${width}-${reduced?'reduced':'normal'}.png`)});
    await page.waitForTimeout(2100);
    await page.evaluate(()=>window.__animationTest.freezeClock());
    assert.match((await state()).image,/starlight_rose_sd_idle/);
    if(story){
      const id=await page.locator('[data-action=story-pick][data-side=ko]:enabled').first().getAttribute('data-id');
      await page.locator(`[data-action=story-pick][data-side=ko][data-id='${id}']`).click();
      await page.locator(`[data-action=story-pick][data-side=en]:enabled:not([data-id='${id}'])`).first().click();
    }else{
    const wrong=await page.evaluate(()=>{const q=window.__animationTest.question();return q.choices.findIndex(v=>v!==q.answer)});
    await page.locator('.answer').nth(wrong).click();
    }
    await page.waitForTimeout(reduced?160:380);
    assert.match((await state()).image,/starlight_rose_sd_hit/);
    assert.match((await state()).position,/^100% 0(?:%|px)$/);
    const held=await state();await page.waitForTimeout(story?50:140);assert.equal((await state()).position,held.position);
    await page.screenshot({clip:story?undefined:await page.locator('#arena').boundingBox(),path:path.join(review,`${story?'story':'battle'}-knockdown-${width}-${reduced?'reduced':'normal'}.png`)});
    assert.deepEqual(errors,[]);assert.deepEqual(failedAssets,[]);
    results.push({width,reduced,timing,alignment,finalKnockdownHeld:true,errors,failedAssets});
    await page.close();
  }
  fs.writeFileSync(path.join(review,story?'story-browser-validation.json':'browser-validation.json'),JSON.stringify(results,null,2)+'\n');
  await browser.close();console.log((story?'Story':'Survival')+' battle: idle, release/contact timing, travel alignment, reset and held knockdown passed at mobile widths and reduced motion.');
})().catch(e=>{console.error(e);process.exit(1)});
