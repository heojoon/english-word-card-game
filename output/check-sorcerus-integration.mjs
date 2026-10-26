import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='C:/git/english-word-card-game',out=root+'/output';
const browser=await chromium.launch({headless:true});
const errors=[],missing=[];
const page=await browser.newPage({viewport:{width:390,height:844}});
page.on('pageerror',error=>errors.push(error.message));
page.on('response',response=>{if(response.status()>=400&&response.url().includes('/assets/monsters/sorcerus/'))missing.push(response.url());});
await page.route('**/crystal-game.js?*',async route=>{
 const response=await route.fetch();const source=await response.text();
 const hook=`window.__sorcerusQa={ready:()=>Boolean(selectedCharacter),contact:()=>battleContactDelay(),start(){selectedCharacter.class='mage';selectedStage='story-ch5-10';startBattle();clearInterval(timerId);},advance:ms=>advanceGuardianBattle(ms),snapshot:()=>({page,hp:run.bossHp,phase:run.guardianPhase,freeze:run.shadowFreezeMs,elapsed:run.elapsed,mp:run.mp,visual:window.WORDORIA_SORCERUS.visual(run)}),correct(){guardianAnswer(run.question.choices.indexOf(run.question.answer));},freezeNext(){run.sorcerusDamage=11;run.sorcerusNextFreeze=12;},healNext(){run.sorcerusStreak=9;run.bossHp=60;run.sorcerusDamage=0;run.sorcerusNextFreeze=12;},lethalNext(){run.bossHp=1;run.sorcerusStreak=0;run.sorcerusDamage=0;run.sorcerusNextFreeze=12;},ice:()=>activateMageIceTime(),pause:()=>pause(),resume(){resume();clearInterval(timerId);},showPose(action,frame){const spec=window.WORDORIA_SORCERUS.ANIMATIONS[action];run.guardianPhase=action==='hit'?'defeat':action;run.guardianVisual=action==='hit'?'defeat':action==='idle'?'idle':'attack';run.sorcerusIdleMs=frame*600;run.sorcerusPhaseMs=spec.durations.slice(0,frame).reduce((a,b)=>a+b,0)*(run.guardianReducedMotion?.5:1);run.shadowFreezeMs=action==='ice-cast'?3000:0;run.sorcerusHealMs=action==='healing'?800:0;render();}};\n  `;
 await route.fulfill({response,body:source.replace('  loadAll().then(',hook+'loadAll().then(')});
});
const qa=(method,...args)=>page.evaluate(([method,args])=>window.__sorcerusQa[method](...args),[method,args]);
try{
 await page.goto('http://127.0.0.1:3105/?demo=1');
 await page.getByRole('button',{name:'손님으로 시작',exact:true}).click();
 await page.waitForFunction(()=>window.__sorcerusQa?.ready());
 await qa('start');await page.locator('.sorcerus-sprite').waitFor();
 await page.evaluate(async()=>{await Promise.all(['idle','ice_time','healing','hit'].map(async action=>{const img=new Image();img.src=`assets/monsters/sorcerus/char_sorcerus_sd_${action}_strip.png`;await img.decode();}));});
 assert.equal((await qa('snapshot')).visual.frame,0);await qa('advance',600);assert.equal((await qa('snapshot')).visual.frame,1);
 const clock=(await qa('snapshot')).elapsed;await qa('ice');await qa('advance',600);assert.equal((await qa('snapshot')).elapsed,clock);assert.equal((await qa('snapshot')).mp,1);assert.equal((await qa('snapshot')).visual.frame,1);
 await page.screenshot({path:out+'/sorcerus-player-ice-mobile.png'});
 await qa('freezeNext');await qa('correct');await qa('advance',await qa('contact'));assert.equal((await qa('snapshot')).visual.frame,0);
 await qa('advance',140);assert.equal((await qa('snapshot')).visual.frame,1);await qa('advance',160);assert.equal((await qa('snapshot')).phase,'ice-cast');
 await qa('advance',319);assert.equal((await qa('snapshot')).freeze,0);await qa('advance',1);assert.equal((await qa('snapshot')).freeze,3000);assert.equal((await qa('snapshot')).visual.frame,2);
 assert.equal(await page.locator('.guardian-answers button:disabled').count(),4);
 await page.screenshot({path:out+'/sorcerus-ice-cast-mobile.png',fullPage:true});
 await qa('pause');const paused=await qa('snapshot');await qa('advance',1000);assert.deepEqual(await qa('snapshot'),paused);await qa('resume');
 await qa('advance',380);await qa('advance',2619);assert.equal((await qa('snapshot')).freeze,1);await qa('advance',1);assert.equal((await qa('snapshot')).freeze,0);assert.equal(await page.locator('.guardian-answers button:disabled').count(),0);
 await qa('healNext');await qa('correct');await qa('advance',(await qa('contact'))+300);assert.equal((await qa('snapshot')).hp,59);await qa('advance',199);assert.equal((await qa('snapshot')).hp,59);await qa('advance',1);assert.equal((await qa('snapshot')).hp,83);assert.equal((await qa('snapshot')).visual.frame,1);
 await page.screenshot({path:out+'/sorcerus-healing-mobile.png',fullPage:true});await qa('advance',1000);
 await qa('lethalNext');await qa('correct');await qa('advance',await qa('contact'));await qa('advance',300);assert.equal((await qa('snapshot')).visual.frame,2);
 await page.screenshot({path:out+'/sorcerus-knockdown-mobile.png',fullPage:true});await qa('advance',699);assert.equal((await qa('snapshot')).page,'battle');await qa('advance',1);await page.waitForFunction(()=>window.__sorcerusQa.snapshot().page==='storyChapterFiveMidbossEnd');
 await page.locator('[data-action="story-dialogue-skip"]').click();assert.equal((await qa('snapshot')).page,'result');
 const bounds=[];
 for(const viewport of [{width:320,height:740},{width:390,height:844},{width:1280,height:900}]){
  await page.setViewportSize(viewport);await qa('start');
  for(const [action,count] of [['idle',2],['ice-cast',4],['healing',3],['hit',3]]){
   const name=action==='ice-cast'?'ice_time':action;const manifest=JSON.parse(await readFile(root+`/assets/monsters/sorcerus/char_sorcerus_sd_${name}_strip.json`,'utf8'));
   for(let frame=0;frame<count;frame++){
    await qa('showPose',action,frame);
    const rect=await page.evaluate(()=>{const a=document.querySelector('#arena').getBoundingClientRect(),s=document.querySelector('.sorcerus-sprite').getBoundingClientRect();return {a:{x:a.x,y:a.y,right:a.right,bottom:a.bottom},s:{x:s.x,y:s.y,width:s.width,height:s.height}};});
    const b=manifest.extraction[frame].runtimeBounds,visible={left:rect.s.x+b[0]/manifest.frameWidth*rect.s.width,right:rect.s.x+b[2]/manifest.frameWidth*rect.s.width,top:rect.s.y+b[1]/320*rect.s.height,bottom:rect.s.y+b[3]/320*rect.s.height};
    assert.ok(visible.left>=rect.a.x-1&&visible.right<=rect.a.right+1,JSON.stringify({viewport,action,frame,visible,rect}));assert.ok(visible.top>=rect.a.y-1&&visible.bottom<=rect.a.bottom+1);
    bounds.push({viewport:viewport.width,action,frame,visible});
   }
  }
  await page.screenshot({path:out+`/sorcerus-knockdown-${viewport.width}.png`,fullPage:true});
 }
 await page.emulateMedia({reducedMotion:'reduce'});await qa('start');await qa('lethalNext');await qa('correct');await qa('advance',await qa('contact'));await qa('advance',150);assert.equal((await qa('snapshot')).visual.frame,2);
 await qa('pause');const reduced=await qa('snapshot');await qa('advance',500);assert.deepEqual(await qa('snapshot'),reduced);
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
 await writeFile(out+'/sorcerus-browser-review.json',JSON.stringify({passed:true,contacts:'ice 320ms; healing 200ms after cast starts',playerIce:'MP and clock/idle pause passed',pause:'frame, timers and contact remain unchanged',defeat:'recoil, final knockdown hold and victory dialogue passed',viewports:[320,390,1280],reducedMotion:'timing and pause passed',assetResponses:'all four sheets loaded',errors,missing,bounds},null,2)+'\n');
 console.log('Sorcerus in-game checks passed: sprites, contact effects, 3s freeze, pause, player Ice Time, final hold, 320/390/1280px bounds, reduced motion and console.');
}finally{await browser.close();}
