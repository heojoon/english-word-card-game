import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {inflateSync} from 'node:zlib';

const context=vm.createContext({window:{}});
vm.runInContext(readFileSync(new URL('../world-ten-boss.js',import.meta.url),'utf8'),context);
const boss=context.window.WORDORIA_WORLD_TEN_BOSS;
const state=(kind='lumen',dmg=4)=>({...boss.reset(kind,dmg),elapsed:0,correct:0,hp:8,index:0});

test('HP damage occurs exactly once at contact, independent of 30-question deck length',()=>{
  for(const [kind,hp] of [['lumen',200],['seiran',240]]){
    const s=state(kind);assert.equal(s.bossHp,hp);assert.equal(s.storyTimeLimit,Math.ceil(hp/4)*6000);
    s.index=30;boss.answer(s,true,200);boss.answer(s,true,200);assert.equal(s.correct,1);
    boss.advance(s,199);assert.equal(s.bossHp,hp);boss.advance(s,1);assert.equal(s.bossHp,hp-4);
    boss.advance(s,1000);assert.equal(s.bossHp,hp-4);assert.equal(s.trainingVictoryMs,null);
  }
});

test('Lumen warns at 20 seconds, activates shield after 1 second and expires after four active seconds',()=>{
  const s=state();assert.ok(boss.advance(s,20000).includes('skill-start'));assert.equal(s.trainingSkill.kind,'shield');
  assert.equal(s.trainingSkill.elapsed,0);assert.equal(s.locked,true);
  boss.advance(s,999);assert.equal(s.shieldRemaining,0);boss.advance(s,1);assert.equal(s.shieldRemaining,4000);
  boss.damage(s,1);assert.equal(s.bossHp,199.5);boss.damage(s,4);assert.equal(s.bossHp,197.5);
  boss.advance(s,3999);assert.equal(s.shieldRemaining,1);boss.advance(s,1);assert.equal(s.shieldRemaining,0);
  boss.damage(s,4);assert.equal(s.bossHp,193.5);
});

test('thresholds are queued once in descending order; ongoing player action completes before warning starts',()=>{
  const s=state('seiran');boss.answer(s,true,200);boss.damage(s,190);assert.equal(s.skillQueue.length,3);
  boss.advance(s,200);assert.equal(s.trainingSkill,null);boss.advance(s,780);
  assert.equal(s.trainingSkill.kind,'beam');assert.equal(s.trainingSkill.elapsed,0);
  boss.damage(s,1);assert.equal(s.skillQueue.length,2);
  assert.equal(s.thresholds.join(','),'0.75,0.5,0.25');
});

test('Seiran shuffle preserves question, hidden letters, answer and choice uniqueness',()=>{
  const s=state('seiran');s.question={prompt:'s□gnal',hidden:[1],answer:'i',choices:['i','x','z','y']};
  const before=s.question;boss.advance(s,20000);assert.equal(s.trainingSkill.kind,'mirror');
  assert.ok(!boss.advance(s,999).includes('shuffle'));assert.ok(boss.advance(s,1).includes('shuffle'));
  const old=s.question.choices.join(',');boss.shuffleChoices(s,()=>.99);
  assert.equal(s.question,before);assert.equal(s.question.answer,'i');assert.equal(s.question.hidden.join(','),'1');
  assert.equal(new Set(s.question.choices).size,4);assert.notEqual(s.question.choices.join(','),old);
});

test('Ice Time, pet freeze and pause stop warning/shield/idle clocks; player contact still finishes under freeze',()=>{
  const s=state();boss.advance(s,21000);const elapsed=s.elapsed,shield=s.shieldRemaining,frame=boss.visual(s).frame;
  s.iceTimeActive=true;boss.advance(s,1000);assert.equal(s.elapsed,elapsed);assert.equal(s.shieldRemaining,shield);assert.equal(boss.visual(s).frame,frame);
  s.iceTimeActive=false;boss.advance(s,300);boss.answer(s,true,200);s.iceTimeActive=true;
  const hp=s.bossHp;boss.advance(s,1000);assert.equal(s.bossHp,hp-2);assert.equal(s.trainingAction,null);
  s.iceTimeActive=false;s.petTimeMs=3000;boss.advance(s,500);assert.equal(s.shieldRemaining,shield-300);assert.equal(s.petTimeMs,2500);
  s.paused=true;const time=s.elapsed;boss.advance(s,5000);assert.equal(s.elapsed,time);assert.equal(s.petTimeMs,2500);
});

test('wrong and skill contacts use shared defenses, one damage per contact, with no stale attack after clear',()=>{
  const s=state();const calls=[];s.activeSkills={damage:n=>calls.push(n)};
  boss.answer(s,false,200);boss.advance(s,1000);assert.deepEqual(calls,[1]);assert.equal(s.hp,8);
  boss.damage(s,101);boss.advance(s,0);assert.equal(s.trainingSkill.kind,'shockwave');
  boss.advance(s,1199);assert.equal(calls.length,1);boss.advance(s,1);assert.deepEqual(calls,[1,1]);
  boss.clear(s);boss.advance(s,10000);boss.answer(s,false,0);assert.equal(calls.length,2);
});

test('burst applies once; lethal contact cancels queued skills and holds down until victory',()=>{
  const s=state('seiran');let calls=0;s.activeSkills={attackDamage:n=>{calls++;return n*3;}};
  s.bossHp=10;boss.answer(s,true,200);s.skillQueue.push('beam');
  boss.advance(s,200);assert.equal(s.bossHp,0);assert.equal(calls,1);assert.equal(s.skillQueue.length,0);
  boss.advance(s,110);assert.equal(boss.visual(s).action,'hit');assert.equal(boss.visual(s).frame,2);
  assert.ok(!boss.advance(s,389).includes('victory'));assert.ok(boss.advance(s,1).includes('victory'));
});

test('deadline prevents delayed contact and burn; exit prevents all callbacks',()=>{
  const s=state();s.bossHp=4;s.elapsed=s.storyTimeLimit-1;boss.answer(s,true,200);
  assert.ok(boss.advance(s,1000).includes('timeout'));assert.equal(s.bossHp,4);
  const t=state();boss.answer(t,true,200);t.done=true;assert.equal(boss.advance(t,1000).length,0);assert.equal(t.bossHp,200);
});

test('burn is interleaved with shield expiry, lethal burn cancels later skills without adding answers',()=>{
  const s=state();s.shieldRemaining=500;let until=1000;
  s.activeSkills={nextEventIn:()=>until,advance:dt=>{until-=dt;if(until<=0){boss.damage(s,2);until=1000;}}};
  boss.advance(s,1000);assert.equal(s.bossHp,198);assert.equal(s.correct,0);
  s.bossHp=2;s.skillQueue.push('shockwave');boss.advance(s,1000);assert.equal(s.bossHp,0);assert.equal(s.trainingSkill,null);assert.equal(s.correct,0);
});

test('shared protection expires at its exact boundary before a wrong-answer contact',()=>{
  const s=state();let protectedMs=550;
  s.activeSkills={nextEventIn:()=>protectedMs>0?protectedMs:Infinity,advance:dt=>{protectedMs=Math.max(0,protectedMs-dt);},damage:()=>{if(!protectedMs)s.hp--;}};
  boss.answer(s,false,200);boss.advance(s,550);assert.equal(s.hp,7);
});

test('reduced motion halves attacks and warnings but preserves release/contact order',()=>{
  const s=state();s.reducedMotion=true;boss.answer(s,false,200,true);
  boss.advance(s,274);assert.equal(s.hp,8);boss.advance(s,1);assert.equal(s.hp,7);boss.advance(s,215);
  boss.damage(s,101);boss.advance(s,0);boss.advance(s,599);assert.equal(s.hp,7);boss.advance(s,1);assert.equal(s.hp,6);
});

const runtime=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
const extract=(start,end)=>runtime.slice(runtime.indexOf(start),runtime.indexOf(end,runtime.indexOf(start)));
test('runtime dispatches World 10 skills through shared defense exactly once',()=>{
  const s=state('seiran');s.skillQueue.push('beam');boss.advance(s,0);const calls=[];
  s.activeSkills={damage:n=>calls.push(n),advance:()=>false};
  const node={style:{},setAttribute(){},classList:{toggle(){}}};
  const c=vm.createContext({run:s,reducedMotion:()=>false,window:{WORDORIA_WORLD_TEN_BOSS:boss},$:()=>node,refreshNewSkillFeedback(){},refreshWorldTenBossSprite(){},render(){},prepareQuestion(){},finishBattle(){assert.fail('defense should prevent loss');},document:{querySelector:()=>null,dispatchEvent(){}},CustomEvent:class{}});
  vm.runInContext(extract('  function advanceWorldTenBossBattle(','  function answerStorySpelling('),c);
  assert.equal(typeof c.advanceWorldTenBossBattle,'function');c.advanceWorldTenBossBattle(1200);
  assert.deepEqual(calls,[1]);assert.equal(s.hp,8);
});

test('new-question mage passive runs before queued boss warning and cannot deadlock input',()=>{
  const s=state();s.bossHp=102;boss.answer(s,true,200);
  const node={style:{},setAttribute(){},classList:{toggle(){}}};let prepares=0;
  const c=vm.createContext({run:s,reducedMotion:()=>false,selectedCharacter:{class:'mage'},window:{WORDORIA_WORLD_TEN_BOSS:boss},$:()=>node,refreshNewSkillFeedback(){},refreshWorldTenBossSprite(){},render(){},prepareQuestion(){prepares++;s.timeStopped=true;s.locked=false;},finishBattle(){assert.fail('battle should continue');},document:{querySelector:()=>null,dispatchEvent(){}},CustomEvent:class{}});
  vm.runInContext(extract('  function advanceWorldTenBossBattle(','  function answerStorySpelling('),c);
  c.advanceWorldTenBossBattle(980);assert.equal(prepares,1);assert.equal(s.timeStopped,true);
  assert.equal(s.locked,false);assert.equal(s.trainingSkill,null);assert.equal(s.skillQueue.length,1);
  c.advanceWorldTenBossBattle(10000);assert.equal(s.locked,false);
  assert.equal(boss.answer(s,true,200),true);assert.equal(s.timeStopped,false);
});

test('both World 10 bosses retain shared Ice Time MP cost, freeze, answer release and potion reuse',()=>{
  for(const kind of ['lumen','seiran']){
    const s={...state(kind),story:true,spelling:true,mp:1};
    const c=vm.createContext({run:s,selectedCharacter:{class:'mage'},performance:{now:()=>100},render(){},setTimeout(){},document:{querySelector:()=>null}});
    vm.runInContext(extract('  function canActivateMageIceTime(','  function updateWarriorSlash('),c);
    c.activateMageIceTime();assert.equal(s.mp,0);assert.equal(s.iceTimeActive,true);assert.equal(s.iceTimePopUntil,1300);
    boss.advance(s,1200);assert.equal(s.elapsed,0);
    boss.answer(s,true,200);assert.equal(s.iceTimeActive,false);boss.advance(s,1000);
    s.mp=1;c.activateMageIceTime();assert.equal(s.mp,0);assert.equal(s.iceTimeActive,true);
    boss.answer(s,false,200);assert.equal(s.iceTimeActive,false);
  }
  assert.ok(extract('  function renderStorySpellingBattle(','  function worldNineBossMarkup(').includes('iceTimeEffectMarkup()'));
});

test('boss strips keep RGBA, correct slot sizes, safe margins, contact metadata and held knockdown',()=>{
  for(const kind of ['lumen','seiran'])for(const action of ['idle','attack','hit','skill',...(kind==='lumen'?['shield']:[])]){
    const base=new URL(`../assets/monsters/world-10/${kind}/`,import.meta.url),m=JSON.parse(readFileSync(new URL(`${kind}-sd-${action}-strip.json`,base),'utf8'));
    const png=readFileSync(new URL(m.image,base));assert.equal(png.readUInt32BE(16),m.frameWidth*3);assert.equal(png.readUInt32BE(20),m.frameHeight);assert.equal(png[25],6);
    assert.equal(m.frameCount,3);assert.equal(m.facing,'left');assert.equal(m.anchor.y,.975);
    if(action==='hit'){assert.equal(m.frameNames[2],'complete-knockdown');assert.equal(m.frames[2].hold,true);assert.equal(m.holdLastFrame,true);}
    if(['attack','skill','shield'].includes(action))assert.equal(m.frames[2].hit,true);
    if(kind==='seiran'&&action==='skill')assert.equal(m.timingOverrides.mirror.contactMs,1000);
    const review=readFileSync(new URL(`review/${action}-spaced-50px.png`,base));assert.equal(review.readUInt32BE(16),m.frameWidth*3+100);
    const blocks=[];for(let p=8;p<review.length;){const size=review.readUInt32BE(p);if(review.toString('ascii',p+4,p+8)==='IDAT')blocks.push(review.subarray(p+8,p+8+size));p+=size+12;}
    const raw=inflateSync(Buffer.concat(blocks)),width=m.frameWidth*3+100,rowBytes=width*4+1;
    let whitePixels=0;
    for(let y=0;y<m.frameHeight;y++){
      assert.equal(raw[y*rowBytes],0,'packer writes unfiltered scanlines');
      for(let x=0;x<width;x++){
        const p=y*rowBytes+1+x*4,alpha=raw[p+3];
        if(x>=m.frameWidth&&x<m.frameWidth+50||x>=2*m.frameWidth+50&&x<2*m.frameWidth+100)assert.equal(alpha,0,'exact 50px transparent gutter');
        if(raw[p]>200&&raw[p+1]>190&&raw[p+2]>190&&alpha>=250)whitePixels++;
      }
    }
    assert.ok(whitePixels>100,'white armor/highlights retain solid alpha');
    assert.ok(m.review.runtimeBounds.every(b=>b[0]>=8&&b[1]>=8&&b[2]<=m.frameWidth-8&&b[3]<=m.frameHeight-7));
  }
});

test('production reset dispatch preserves Astra and World 9 and selects exact World 10 identities',()=>{
  const c=vm.createContext({window:{WORDORIA_WORLD_TEN_BOSS:boss},bossAttackSteps:()=>4});
  vm.runInContext(readFileSync(new URL('../world-nine-boss.js',import.meta.url),'utf8'),c);
  const resetLine=runtime.split('\n').find(line=>line.includes('if(source.trainingBossHp)Object.assign'));
  for(const [kind,hp] of [['lumen',200],['seiran',240],['astra',180]]){
    c.run={hp:3,mp:1};c.source={storyChapter:13,observatoryBoss:kind,trainingBossHp:hp};vm.runInContext(resetLine,c);
    assert.equal(c.run.bossHp,hp);assert.equal(Boolean(c.run.worldTenBoss),kind!=='astra');assert.equal(c.run.hp,3);assert.equal(c.run.mp,1);
  }
  c.run={};c.source={storyChapter:12,storyNumber:15,trainingBossHp:200};vm.runInContext(resetLine,c);assert.equal(c.run.trainingKind,'griffin');assert.equal(c.run.worldTenBoss,undefined);
});

test('direct navigation clears boss events and effects while preserving current HP and MP',()=>{
  const s=state();s.mp=1;boss.answer(s,false,200);s.skillQueue.push('shockwave');let persisted=0,cleared=0;
  s.activeSkills={clear:()=>cleared++};s.petEffects={clear:()=>cleared++};
  const node={focus(){},scrollTo(){}};
  const c=vm.createContext({page:'battle',run:s,guestMode:false,window:{WORDORIA_WORLD_TEN_BOSS:boss,scrollTo(){}},persistStoryBattleVitals:()=>persisted++,clearInterval(){},clearTimeout(){},timerId:1,nextTimer:2,cancelSpeech(){},render(){},$:()=>node});
  vm.runInContext(extract('  function go(','  function navigate('),c);c.go('home');
  assert.equal(s.done,true);assert.equal(persisted,1);assert.equal(cleared,2);assert.equal(s.hp,8);assert.equal(s.mp,1);
  assert.equal(boss.advance(s,10000).length,0);assert.equal(s.trainingAction,null);assert.equal(s.skillQueue.length,0);
});

test('both bosses progress beyond 30 answers to HP zero rather than a deck-complete win',()=>{
  for(const kind of ['lumen','seiran']){
    const s=state(kind);s.hp=100;
    for(let n=0;n<80&&s.bossHp>0;n++){
      while(s.locked)boss.advance(s,100);
      assert.equal(boss.answer(s,true,200),true);boss.advance(s,980);s.index++;
      if(s.index===30)assert.ok(s.bossHp>0);
    }
    assert.equal(s.bossHp,0);assert.ok(s.correct>=50);assert.ok(s.elapsed<s.storyTimeLimit);
    assert.ok(boss.advance(s,500).includes('victory'));
  }
});
