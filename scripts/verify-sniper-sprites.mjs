import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.SNIPER_REVIEW_URL||'http://127.0.0.1:3000';
const review=new URL('../assets/characters/sniper/review/',import.meta.url);
await mkdir(review,{recursive:true});
const browser=await chromium.launch({headless:true});
const report={date:'2026-10-12',checks:[],errors:[],scope:'Production styles in review arena plus actual local demo Survival battle; no account/backend mutations'};
try{
  for(const reducedMotion of ['no-preference','reduce']){
    const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion});
    page.on('pageerror',e=>report.errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))report.errors.push(r.status()+' '+new URL(r.url()).pathname)});
    await page.goto(base+'/assets/characters/sniper/review/preview.html');
    const sprite=page.locator('.battle-sprite');
    assert.match(await sprite.evaluate(e=>getComputedStyle(e).backgroundImage),/idle_strip/);
    await page.locator('[data-state="hit"]').click();
    const before=await page.locator('.crystal-shards').evaluate(e=>{
      e.getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=0});
      return getComputedStyle(e,'::before').opacity;
    });
    assert.equal(Number(before),0);
    const contact=reducedMotion==='reduce'?160:480;
    await page.evaluate(ms=>document.querySelector('#arena').getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=ms}),contact+35);
    assert.ok(Number(await page.locator('.crystal-shards').evaluate(e=>getComputedStyle(e,'::before').opacity))>0);
    assert.match(await sprite.evaluate(e=>getComputedStyle(e).backgroundImage),/attack_strip/);
    assert.equal(await page.locator('.battle-projectile').count(),0);
    assert.equal(await page.locator('.crystal-strike').evaluate(e=>getComputedStyle(e).display),'none');
    await page.screenshot({path:new URL('browser-attack-'+reducedMotion+'.png',review).pathname.replace(/^\/([A-Z]:)/,'$1')});
    await page.evaluate(()=>document.querySelector('#arena').getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=1500}));
    assert.equal(await sprite.evaluate(e=>getComputedStyle(e).backgroundPosition),'100% 0px');
    await page.locator('[data-state="wrong story-stunned"]').click();
    await page.evaluate(()=>document.querySelector('#arena').getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=1500}));
    assert.match(await sprite.evaluate(e=>getComputedStyle(e).backgroundImage),/hit_strip/);
    assert.equal(await sprite.evaluate(e=>getComputedStyle(e).backgroundPosition),'100% 0px');
    assert.equal(await page.locator('.battle-hero').evaluate(e=>getComputedStyle(e).transform),'none');
    await page.screenshot({path:new URL('browser-knockdown-'+reducedMotion+'.png',review).pathname.replace(/^\/([A-Z]:)/,'$1')});
    await page.locator('[data-state=""]').click();
    assert.match(await sprite.evaluate(e=>getComputedStyle(e).backgroundImage),/idle_strip/);
    report.checks.push({viewport:'390x844',reducedMotion,idle:true,attack:true,contactMs:contact,impact:true,knockdownHold:true,reset:true,noProjectile:true});
    await page.close();
  }
  const page=await browser.newPage({viewport:{width:390,height:844}});
  page.setDefaultTimeout(8000);
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.route('**/title-screen.js*',r=>r.abort());
  await page.addInitScript(()=>{
    window.WORDORIA_GUEST=true;
    Math.random=()=>.5;
    localStorage.setItem('fantasyQuizPlayer','sprite-review');
    localStorage.setItem('wordoria-production-demo-v1',JSON.stringify({
      characters:[{id:'review-sniper',player:'sprite-review',name:'Sniper',class:'sniper',avatar_variant:'female',coins:1250,equipped_items:{}}],
      records:[],inventory:[],redemptions:[],potionInventory:{}
    }));
  });
  await page.goto(base+'/?demo=1');
  await page.waitForSelector('[data-page="dungeon"]',{state:'attached'});
  await page.evaluate(()=>{document.querySelector('#entry-screen').remove();document.body.classList.remove('entry-active')});
  await page.locator('[data-page="dungeon"]').first().click();
  await page.locator('[data-action="mode-select"][data-mode="survival"]').click();
  await page.locator('[data-action="world"]').first().click();
  await page.locator('[data-action="stage"]').first().click();
  // Stage selection can show an entry dialog depending on current screen flow.
  const start=page.locator('[data-action="start"]');
  if(await start.count())await start.click();
  await page.waitForSelector('.battle-hero-sniper');
  await page.locator('.arena').screenshot({path:new URL('actual-survival-idle.png',review).pathname.replace(/^\/([A-Z]:)/,'$1')});
  // Read the local bundled vocabulary answer from the visible prompt.
  const index=await page.evaluate(()=>{
    const prompt=document.querySelector('.question-card h1').textContent;
    const words=Object.values(window.QUIZ_STAGES).flatMap(stage=>stage.words);
    const candidates=new Set(words.filter(w=>w[0]===prompt||`[${w[1]}] ${w[2]}`===prompt).flatMap(w=>[w[0],`[${w[1]}] ${w[2]}`]));
    return Array.from(document.querySelectorAll('.answer')).findIndex(b=>{const clone=b.cloneNode(true);clone.querySelectorAll('span,small').forEach(e=>e.remove());return candidates.has(clone.textContent.trim())});
  });
  assert.ok(index>=0,'resolve correct answer from bundled vocabulary');
  await page.locator('.answer').nth(index).click();
  await page.evaluate(()=>document.querySelector('#arena').getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=520}));
  assert.match(await page.locator('.battle-sprite').evaluate(e=>getComputedStyle(e).backgroundImage),/sniper.*attack_strip/);
  await page.locator('.arena').screenshot({path:new URL('actual-survival-contact.png',review).pathname.replace(/^\/([A-Z]:)/,'$1')});
  report.checks.push({actualLocalDemoSurvival:true,correctAnswerAttack:true});
  assert.equal(report.errors.length,0,JSON.stringify(report.errors));
  console.log(JSON.stringify(report));
}finally{
  await writeFile(new URL('browser-review.json',review),JSON.stringify(report,null,2)+'\n');
  await browser.close();
}
