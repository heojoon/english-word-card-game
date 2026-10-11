// Local-only QA hooks are injected into served responses, never the shipped game.
import {chromium} from 'playwright';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const review=new URL('../assets/characters/ranger/violet-crystal-skin/review/',import.meta.url);
const browser=await chromium.launch({headless:true});
const results=[];
try{
  for(const [width,reduced] of [[360,false],[390,true],[430,false]]){
    const page=await browser.newPage({viewport:{width,height:844},reducedMotion:reduced?'reduce':'no-preference'});
    const errors=[],failedAssets=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('response',response=>{if(response.url().includes('violet-crystal-skin')&&response.status()>=400)failedAssets.push(response.url());});
    await page.route('**/*',async route=>{
      const url=route.request().url();
      if(!url.startsWith('http://127.0.0.1:3000'))return route.abort();
      const pathname=new URL(url).pathname;
      if(pathname==='/')return route.fulfill({contentType:'text/html',body:readFileSync(new URL('../index.html',import.meta.url),'utf8').replace(/<script src="title-screen.js[^>]*><\/script>/,'').replace('class="entry-active"','')});
      if(pathname==='/crystal-game.js'){
        let body=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
        body=body.replace('  loadAll().then(',`  window.__violetQA={start(){selectedStage=Object.keys(stages).find(key=>!stages[key].story);startBattle();clearInterval(timerId);},go,render,answer,equip,battleContactDelay,state:()=>run,character:()=>selectedCharacter,shop:()=>shopItems,travel:setHeroAttackTravel};\n  loadAll().then(`);
        return route.fulfill({contentType:'text/javascript',body});
      }
      return route.continue();
    });
    await page.addInitScript(()=>{
      localStorage.setItem('fantasyQuizPlayer','QA');
      localStorage.setItem('wordoria-production-demo-v1',JSON.stringify({characters:[{id:'qa-violet',player:'QA',name:'Violet',class:'ranger',avatar_variant:'female',coins:1500,equipped_items:{skin:10}}],inventory:[{character_id:'qa-violet',item_id:10}],records:[],redemptions:[],potionLoadoutModel:1}));
    });
    await page.goto('http://127.0.0.1:3000/?demo=1');
    await page.waitForFunction(()=>window.__violetQA?.character());
    await page.evaluate(()=>document.querySelector('#entry-screen')?.remove());
    assert.match(await page.locator('.portrait img').first().getAttribute('src'),/ranger-female-violet-crystal/);
    await page.evaluate(()=>window.__violetQA.go('shop'));
    await page.locator('[data-action="filter"][data-filter="skin"]').click();
    assert.ok(await page.locator('img[src*="ranger-female-violet-crystal"]').count(),'shop keeps the original portrait');
    await page.evaluate(()=>window.__violetQA.start());
    await page.locator('.battle-skin-ranger_violet_crystal_skin').waitFor();
    const sprite=page.locator('.battle-hero .battle-sprite');
    const idle=await sprite.evaluate(node=>getComputedStyle(node).backgroundImage);
    assert.match(idle,/violet_crystal_sd_attack/);
    await page.locator('#arena').screenshot({path:new URL(`battle-idle-${width}.png`,review).pathname.replace(/^\/([A-Za-z]:)/,'$1')});
    const timing=await page.evaluate(()=>{
      const qa=window.__violetQA,run=qa.state();
      const index=run.question.choices.indexOf(run.question.answer);
      qa.answer(index);
      const hero=document.querySelector('.battle-hero');
      getComputedStyle(hero.querySelector('.battle-projectile')).animationName;
      const samples=[...hero.getAnimations({subtree:true})].map(animation=>{
        animation.pause();return {name:animation.animationName,duration:animation.effect.getTiming().duration,delay:animation.effect.getTiming().delay};
      });
      const enemy=getComputedStyle(document.querySelector('.enemy'));
      return {samples,contact:qa.battleContactDelay(),enemyAnimation:enemy.animationName,enemyDelay:parseFloat(enemy.animationDelay)*1000,arena:document.querySelector('#arena').className,projectileAnimation:getComputedStyle(hero.querySelector('.battle-projectile')).animationName,paused:run.paused,locked:run.locked,index};
    });
    assert.equal(timing.contact,reduced?310:840);
    assert.equal(timing.enemyAnimation,'enemy-knockout');
    assert.equal(timing.enemyDelay,timing.contact);
    const shot=timing.samples.find(sample=>sample.name==='violet-arrow-frames');
    assert.ok(shot,JSON.stringify(timing));
    const attack=timing.samples.find(sample=>sample.name==='ranger-attack-frames');
    assert.ok(Math.abs(shot.delay-(attack.delay+attack.duration*4/5))<.01,'arrow starts at character release');
    assert.ok(Math.abs(shot.delay+shot.duration*4/5-timing.contact)<.01,'contact matches projectile hit frame');
    await page.evaluate(contact=>{for(const animation of document.querySelector('.battle-hero').getAnimations({subtree:true})){animation.pause();animation.currentTime=contact;}},timing.contact+1);
    await page.locator('#arena').screenshot({path:new URL(`battle-contact-${width}.png`,review).pathname.replace(/^\/([A-Za-z]:)/,'$1')});
    await page.evaluate(()=>{const arena=document.querySelector('#arena');arena.classList.remove('hit');arena.classList.add('wrong');});
    await page.waitForTimeout(50);
    const hit=await sprite.evaluate(node=>{const animation=node.getAnimations()[0];animation.pause();animation.currentTime=290;return {image:getComputedStyle(node).backgroundImage,position:getComputedStyle(node).backgroundPosition};});
    assert.match(hit.image,/violet_crystal_sd_hit/);
    assert.equal(hit.position,'100% 0px','final knockdown holds');
    await page.locator('#arena').screenshot({path:new URL(`battle-knockdown-${width}.png`,review).pathname.replace(/^\/([A-Za-z]:)/,'$1')});
    await page.evaluate(async()=>{await window.__violetQA.equip(window.__violetQA.shop().find(item=>item.id===10));});
    assert.match(await sprite.evaluate(node=>getComputedStyle(node).backgroundImage),/char_ranger_female_sd_attack_strip/);
    await page.evaluate(async()=>{await window.__violetQA.equip(window.__violetQA.shop().find(item=>item.id===10));});
    assert.match(await sprite.evaluate(node=>getComputedStyle(node).backgroundImage),/violet_crystal_sd_attack/);
    await page.evaluate(()=>{const c=window.__violetQA.character();c.avatar_variant='male';window.__violetQA.render();});
    assert.match(await sprite.evaluate(node=>getComputedStyle(node).backgroundImage),/char_ranger_male_sd_attack_strip/);
    assert.deepEqual(errors,[]);
    assert.deepEqual(failedAssets,[]);
    results.push({width,reduced,timing,errors,failedAssets,checks:['skin portrait and shop','idle','attack/release/contact and enemy reaction','knockdown final hold','equip/unequip reset','male base isolation']});
    await page.close();
  }
  writeFileSync(new URL('browser-validation.json',review),JSON.stringify({localOnly:true,results},null,2)+'\n');
  const root=new URL('../',review);
  for(const file of ['animation-contract.json','char_ranger_female_violet_crystal_sd_attack_strip.json','char_ranger_female_violet_crystal_sd_hit_strip.json','char_ranger_female_violet_crystal_sd_projectile_strip.json']){
    const url=new URL(file,root),data=JSON.parse(readFileSync(url,'utf8'));
    data.reviewStatus='Technical frame and mobile browser review passed; not user art approval';
    data.browserReview='review/browser-validation.json';
    writeFileSync(url,JSON.stringify(data,null,2)+'\n');
  }
  console.log('Violet ranger browser QA passed at 360/390/430px, including reduced motion.');
}finally{await browser.close();}
