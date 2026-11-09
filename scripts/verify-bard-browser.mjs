import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
const base=process.env.BARD_REVIEW_URL||'http://127.0.0.1:3000';
const out=new URL('../output/playwright/bard/',import.meta.url);
await mkdir(out,{recursive:true});
const path=name=>new URL(name,out).pathname.replace(/^\/([A-Z]:)/,'$1');
const report={scope:'Local demo Survival and production CSS preview; no account/backend writes',checks:[],errors:[]};
const browser=await chromium.launch({headless:true});
const gameSource=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
const redrawSource=gameSource.slice(gameSource.indexOf('  function replaceScreenMarkup('),gameSource.indexOf('  function render(){'));
try{
  for(const variant of ['male','female']){
    const page=await browser.newPage({viewport:{width:390,height:844}});
    page.setDefaultTimeout(10000);
    page.on('pageerror',error=>report.errors.push(error.message));
    page.on('response',response=>{if(response.status()>=400&&response.url().startsWith(base))report.errors.push(`${response.status()} ${new URL(response.url()).pathname}`);});
    await page.route('**/title-screen.js*',route=>route.fulfill({contentType:'application/javascript',body:''}));
    await page.addInitScript(variant=>{
      window.WORDORIA_GUEST=true;Math.random=()=>.5;
      localStorage.setItem('fantasyQuizPlayer','bard-review');
      localStorage.setItem('wordoria-production-demo-v1',JSON.stringify({characters:[{id:'review-bard',player:'bard-review',name:'Bard',class:'bard',avatar_variant:variant,coins:1250,equipped_items:{}}],records:[],inventory:[],redemptions:[],potionInventory:{}}));
    },variant);
    await page.goto(base+'/?demo=1');
    await page.waitForSelector('[data-page="dungeon"]',{state:'attached'});
    await page.evaluate(()=>{document.querySelector('#entry-screen')?.remove();document.body.classList.remove('entry-active');});
    await page.locator('[data-page="dungeon"]').first().click();
    await page.locator('[data-action="mode-select"][data-mode="survival"]').click();
    await page.locator('[data-action="world"]').first().click();
    await page.locator('[data-action="stage"]').first().click();
    if(await page.locator('[data-action="start"]').count())await page.locator('[data-action="start"]').click();
    await page.waitForSelector(`.battle-hero-bard.battle-hero-${variant}`);
    assert.match(await page.locator('.battle-sprite').evaluate(e=>getComputedStyle(e).backgroundImage),new RegExp(`bard_${variant}_sd_idle`));
    await page.locator('.arena').screenshot({path:path(`actual-${variant}-idle.png`)});
    const answer=await page.evaluate(()=>{
      const prompt=document.querySelector('.question-card h1').textContent;
      const words=Object.values(window.QUIZ_STAGES).flatMap(stage=>stage.words);
      const answers=new Set(words.filter(w=>w[0]===prompt||`[${w[1]}] ${w[2]}`===prompt).flatMap(w=>[w[0],`[${w[1]}] ${w[2]}`]));
      return Array.from(document.querySelectorAll('.answer')).findIndex(button=>{const clone=button.cloneNode(true);clone.querySelectorAll('span,small').forEach(e=>e.remove());return answers.has(clone.textContent.trim());});
    });
    assert.ok(answer>=0,'resolve answer from bundled vocabulary');
    await page.locator('.answer').nth(answer).click();
    const frame=await page.locator('.battle-hero-bard').evaluate(hero=>{
      const arena=hero.closest('.arena');
      arena.getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=650;});
      const sprite=getComputedStyle(hero.querySelector('.battle-sprite')),projectile=getComputedStyle(hero.querySelector('.battle-projectile'));
      return {image:sprite.backgroundImage,frame:sprite.backgroundPosition,projectile:projectile.backgroundImage,travel:arena.style.getPropertyValue('--bard-flight-x'),visible:projectile.display,opacity:projectile.opacity};
    });
    assert.match(frame.image,new RegExp(`bard_${variant}_sd_attack`));assert.equal(frame.frame,'100% 0px');
    assert.match(frame.projectile,/bard_sd_projectile/);assert.ok(parseFloat(frame.travel)>0);assert.equal(frame.visible,'block');assert.ok(Number(frame.opacity)>0);
    await page.locator('.arena').screenshot({path:path(`actual-${variant}-contact.png`)});
    report.checks.push({actualDemoSurvival:true,variant,idle:true,attack:true,projectileContact:true,frame});
    await page.close();
  }
  for(const variant of ['male','female'])for(const width of [320,390])for(const reducedMotion of ['no-preference','reduce']){
    const page=await browser.newPage({viewport:{width,height:844},reducedMotion});
    page.on('pageerror',error=>report.errors.push(error.message));
    page.on('response',response=>{if(response.status()>=400&&response.url().startsWith(base))report.errors.push(`${response.status()} ${new URL(response.url()).pathname}`);});
    await page.goto(base+'/assets/characters/bard/review/preview.html');
    await page.evaluate(variant=>window.bardPreview.setVariant(variant),variant);
    await page.evaluate(()=>window.bardPreview.setState('attack'));
    const contact=reducedMotion==='reduce'?256:640;
    const before=await page.locator('.battle-projectile').evaluate(node=>{node.getAnimations().forEach(a=>{a.pause();a.currentTime=0;});return getComputedStyle(node).opacity;});
    assert.equal(Number(before),0,'projectile hidden during anticipation');
    await page.evaluate(ms=>document.querySelector('#arena').getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=ms;}),contact);
    assert.equal(await page.locator('.battle-projectile').evaluate(node=>getComputedStyle(node).backgroundPosition),'80% 0px');
    await page.locator('#arena').screenshot({path:path(`preview-${variant}-${width}-${reducedMotion}-contact.png`)});
    await page.evaluate(()=>window.bardPreview.setState('wrong'));
    await page.evaluate(()=>document.querySelector('#arena').getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=2000;}));
    const down=await page.locator('.battle-sprite').evaluate(node=>({image:getComputedStyle(node).backgroundImage,frame:getComputedStyle(node).backgroundPosition,transform:getComputedStyle(node.parentElement).transform}));
    assert.match(down.image,new RegExp(`bard_${variant}_sd_hit`));assert.equal(down.frame,'100% 0px');assert.equal(down.transform,'none');
    await page.locator('#arena').screenshot({path:path(`preview-${variant}-${width}-${reducedMotion}-down.png`)});
    await page.evaluate(()=>window.bardPreview.setState('idle'));
    assert.match(await page.locator('.battle-sprite').evaluate(node=>getComputedStyle(node).backgroundImage),new RegExp(`bard_${variant}_sd_idle`));
    await page.locator('#paused').check();
    assert.equal(await page.locator('.battle-sprite').evaluate(node=>getComputedStyle(node).animationPlayState),'paused');
    report.checks.push({productionCSSPreview:true,variant,width,reducedMotion,contact,anticipationHidden:true,contactFrame:true,downHold:true,idleReset:true,pause:true});
    await page.close();
  }
  {
    const page=await browser.newPage({viewport:{width:390,height:844}});
    await page.goto(base+'/assets/characters/bard/review/preview.html');
    const result=await page.evaluate(redrawSource=>{
      const arena=document.querySelector('#arena'),screen=document.createElement('div');screen.id='screen';arena.before(screen);screen.append(arena);
      window.bardPreview.setState('attack');
      const run={attack:true};arena.bardBattle=run;
      const redraw=new Function('page','selectedCharacter','run','$',redrawSource+';return replaceScreenMarkup;')('battle',{class:'bard'},run,id=>document.getElementById(id));
      const checks=[];
      for(const state of ['paused','running','finished']){
        const animation=document.querySelector('.battle-sprite').getAnimations()[0];
        if(state==='paused'){animation.pause();animation.currentTime=650;}
        else if(state==='running'){animation.play();animation.currentTime=300;}
        else{animation.finish();animation.currentTime=650;}
        const before={currentTime:animation.currentTime,playState:animation.playState};
        redraw(document.querySelector('#arena').outerHTML);
        void document.querySelector('.battle-sprite').offsetWidth;
        const current=document.querySelector('.battle-sprite').getAnimations()[0];
        checks.push({state,before,currentTime:current.currentTime,playState:current.playState});
      }
      return checks;
    },redrawSource);
    for(const check of result){assert.ok(Math.abs(check.currentTime-check.before.currentTime)<2,`contact redraw retained ${JSON.stringify(check)}`);assert.equal(check.playState,check.before.playState);}
    report.checks.push({actualCSSRedrawContinuity:true,result});
    await page.close();
  }
  assert.equal(report.errors.length,0,JSON.stringify(report.errors));
  console.log(JSON.stringify(report,null,2));
}finally{await writeFile(new URL('browser-review.json',out),JSON.stringify(report,null,2)+'\n');await browser.close();}
