/* Observatory bosses: chronological contact, shield and skill clocks. */
(() => {
  'use strict';
  const HP={lumen:200,seiran:240},PERIOD=20000,EPS=1e-7;
  const timeLimit=(hp,damage)=>Math.ceil(hp/Math.max(1,damage))*6000;
  function reset(kind,damage=1){
    if(!HP[kind])throw new Error('Unknown observatory boss');
    return {trainingBoss:true,worldTenBoss:true,observatoryBoss:kind,trainingKind:kind,bossHp:HP[kind],bossMaxHp:HP[kind],bossAttackSteps:Math.max(1,damage),storyTimeLimit:timeLimit(HP[kind],damage),trainingAction:null,trainingSkill:null,trainingVictoryMs:null,trainingHitMs:0,trainingPlayerHitMs:0,trainingNotice:'',skillQueue:[],thresholds:[],shieldRemaining:0,nextSkillAt:PERIOD,worldTenClosed:false,worldTenVisualMs:0};
  }
  function clear(s){
    s.worldTenClosed=true;s.trainingAction=null;s.trainingSkill=null;s.skillQueue=[];
    s.shieldRemaining=0;s.trainingNotice='';s.iceTimeActive=false;s.timeStopped=false;
    s.trainingPlayerHitMs=0;s.attack=false;s.stunned=false;s.locked=true;
  }
  function damage(s,amount){
    if(s.done||s.worldTenClosed||s.paused||s.bossHp<=0||!Number.isFinite(amount)||amount<=0)return;
    const before=s.bossHp;
    s.bossHp=Math.max(0,before-amount*(s.shieldRemaining>0?.5:1));
    s.trainingHitMs=110;
    if(s.bossHp<=0){
      s.trainingAction=null;s.trainingSkill=null;s.skillQueue=[];s.shieldRemaining=0;
      s.trainingVictoryMs=500;s.locked=true;s.attack=false;s.stunned=false;
      s.iceTimeActive=false;s.timeStopped=false;s.trainingNotice=s.trainingKind==='lumen'?'루멘 정지 · 방어 고리 해제':'세이런 제압 · 거짓 신호 차단';
      return;
    }
    for(const threshold of s.trainingKind==='lumen'?[.5]:[.75,.5,.25]){
      if(before>s.bossMaxHp*threshold&&s.bossHp<=s.bossMaxHp*threshold&&!s.thresholds.includes(threshold)){
        s.thresholds.push(threshold);s.skillQueue.push(s.trainingKind==='lumen'?'shockwave':'beam');
      }
    }
  }
  function answer(s,correct,contactMs,reduced=false){
    if(s.done||s.worldTenClosed||s.paused||s.locked||s.trainingAction||s.trainingSkill||s.bossHp<=0)return false;
    s.reducedMotion=reduced;s.locked=true;s.iceTimeActive=false;s.timeStopped=false;s.eagleEyeActive=false;
    if(correct){s.correct++;s.attack=true;}else s.slashCombo=0;
    const contact=correct?Math.max(0,contactMs):(reduced?275:550);
    s.trainingAction={correct,elapsed:0,contactMs:contact,contact:false,duration:Math.max(contact+(reduced?75:150),reduced?490:980)};
    return true;
  }
  function startSkill(s,events){
    if(s.trainingAction||s.trainingSkill||!s.skillQueue.length||s.bossHp<=0||s.iceTimeActive||s.timeStopped||s.petTimeMs>0)return;
    const kind=s.skillQueue.shift(),speed=s.reducedMotion?.5:1;
    s.trainingSkill={kind,elapsed:0,contact:false,contactMs:(kind==='shield'||kind==='mirror'?1000:1200)*speed,duration:(kind==='shield'||kind==='mirror'?1300:1500)*speed};
    s.locked=true;
    s.trainingNotice={shield:'회전 방어 고리 · 방어 준비!',mirror:'반사 분신 · 보기 이동 준비!',shockwave:'양팔 충격파 · 공격 준비!',beam:'지휘봉 광선 · 공격 준비!'}[kind];
    events.push('skill-start');
  }
  function playerDamage(s){
    if(s.activeSkills)s.activeSkills.damage(1);
    else if(s.petEffects)s.petEffects.damage(1);
    else s.hp=Math.max(0,s.hp-1);
    s.trainingPlayerHitMs=350;
  }
  function shuffleChoices(s,random=Math.random){
    if(!s.question?.choices)return;
    const original=s.question.choices,choices=original.slice();
    for(let i=choices.length-1;i>0;i--){const j=Math.min(i,Math.max(0,Math.floor(random()*(i+1))));[choices[i],choices[j]]=[choices[j],choices[i]];}
    if(choices.length>1&&choices.every((c,i)=>c===original[i]))choices.push(choices.shift());
    s.question.choices=choices;
  }
  function advance(s,delta,clockDelta=delta,onNextQuestion){
    if(s.done||s.worldTenClosed||s.paused)return [];
    const events=[];
    if(s.trainingVictoryMs!==null){s.trainingVictoryMs=Math.max(0,s.trainingVictoryMs-Math.max(0,delta));if(!s.trainingVictoryMs)events.push('victory');return events;}
    const ratio=delta>0?Math.max(0,Math.min(1,clockDelta/delta)):1;
    let left=Math.max(0,delta);
    startSkill(s,events);
    while(left>EPS){
      if(s.elapsed>=s.storyTimeLimit-EPS){clear(s);events.push('timeout');break;}
      const a=s.trainingAction,skill=s.trainingSkill;
      const frozen=s.iceTimeActive||s.timeStopped||s.petTimeMs>0,rate=frozen?0:ratio;
      let step=left;
      if(s.petTimeMs>0)step=Math.min(step,s.petTimeMs);
      if(rate>0){
        step=Math.min(step,(s.storyTimeLimit-s.elapsed)/rate,Math.max(0,s.nextSkillAt-s.elapsed)/rate);
        if(s.shieldRemaining>0)step=Math.min(step,s.shieldRemaining/rate);
        if(skill)step=Math.min(step,Math.max(0,(skill.contact?skill.duration:skill.contactMs)-skill.elapsed)/rate);
      }
      if(a)step=Math.min(step,Math.max(0,(a.contact?a.duration:a.contactMs)-a.elapsed));
      const effectBoundary=s.activeSkills?.nextEventIn?.()??Infinity;
      if(effectBoundary>EPS)step=Math.min(step,effectBoundary);
      const active=step*rate;
      s.elapsed=Math.min(s.storyTimeLimit,s.elapsed+active);s.worldTenVisualMs+=active;
      const hadShield=s.shieldRemaining>0;
      s.shieldRemaining=Math.max(0,s.shieldRemaining-active);
      if(hadShield&&!s.shieldRemaining){if(!skill)s.trainingNotice='';events.push('shield-end');}
      s.trainingHitMs=Math.max(0,s.trainingHitMs-step);s.trainingPlayerHitMs=Math.max(0,s.trainingPlayerHitMs-step);
      if(a)a.elapsed+=step;if(skill)skill.elapsed+=active;
      if(s.petEffects)s.petEffects.advance(step);else if(s.petTimeMs>0)s.petTimeMs=Math.max(0,s.petTimeMs-step);
      left=Math.max(0,left-step);
      // The countdown deadline cancels every contact at or after expiry.
      if(s.elapsed>=s.storyTimeLimit-EPS){clear(s);events.push('timeout');break;}
      // Expire shared defenses and apply burns at this exact boundary first.
      // Burn damage sees the updated shield state, never the old frame's state.
      if(s.activeSkills?.advance?.(step))events.push('effects-changed');
      if(s.bossHp<=0)return events;
      if(a&&!a.contact&&a.elapsed>=a.contactMs-EPS){
        a.contact=true;
        if(a.correct){damage(s,s.activeSkills?.attackDamage(s.bossAttackSteps)??s.bossAttackSteps);s.petEffects?.onCorrect();events.push('correct-contact');}
        else {s.stunned=true;playerDamage(s);events.push('wrong-contact');}
      }
      if(s.bossHp<=0)return events;
      if(s.hp<=0){clear(s);events.push('defeat-player');return events;}
      if(skill&&!skill.contact&&skill.elapsed>=skill.contactMs-EPS){
        skill.contact=true;
        if(skill.kind==='shield'){s.shieldRemaining=4000;s.trainingNotice='회전 방어 고리 · 받는 피해 50% 감소';events.push('shield');}
        else if(skill.kind==='mirror'){s.trainingNotice='반사 분신 · 보기 위치 변경';events.push('shuffle');}
        else {playerDamage(s);s.trainingNotice=skill.kind==='beam'?'지휘봉 광선!':'양팔 충격파!';events.push('skill-contact');}
      }
      if(s.hp<=0){clear(s);events.push('defeat-player');return events;}
      if(a&&a.elapsed>=a.duration-EPS){
        s.trainingAction=null;s.attack=false;s.stunned=false;s.locked=Boolean(s.trainingSkill);
        events.push(a.correct?'next-question':'retry');
        // Apply the next question's passive before deciding whether a queued
        // warning can start. A newly frozen question must remain answerable.
        if(a.correct)onNextQuestion?.();
      }
      if(skill&&skill.elapsed>=skill.duration-EPS){s.trainingSkill=null;s.locked=Boolean(s.trainingAction);s.trainingNotice=s.shieldRemaining>0?'회전 방어 고리 · 받는 피해 50% 감소':'';events.push('skill-end');}
      if(rate>0&&s.elapsed>=s.nextSkillAt-EPS){s.nextSkillAt=(Math.floor(s.elapsed/PERIOD)+1)*PERIOD;const kind=s.trainingKind==='lumen'?'shield':'mirror';if(!s.skillQueue.includes(kind))s.skillQueue.push(kind);}
      startSkill(s,events);
    }
    return events;
  }
  function visual(s){
    if(s.trainingVictoryMs!==null){const elapsed=500-s.trainingVictoryMs;return {action:'hit',frame:elapsed<50?0:elapsed<110?1:2};}
    if(s.trainingHitMs>0)return {action:'hit',frame:s.trainingHitMs>60?0:1};
    if(s.trainingSkill){const a=s.trainingSkill;return {action:a.kind==='shield'?'shield':'skill',frame:a.elapsed<a.contactMs/2?0:a.elapsed<a.contactMs?1:2};}
    if(s.trainingAction&&!s.trainingAction.correct){const a=s.trainingAction;return {action:'attack',frame:a.elapsed<a.contactMs*200/550?0:a.elapsed<a.contactMs?1:2};}
    if(s.trainingKind==='lumen'&&s.shieldRemaining>0)return {action:'shield',frame:2};
    return {action:'idle',frame:Math.floor(s.worldTenVisualMs/325)%3};
  }
  window.WORDORIA_WORLD_TEN_BOSS={reset,timeLimit,damage,answer,advance,visual,clear,shuffleChoices};
})();
