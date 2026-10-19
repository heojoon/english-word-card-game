/* World 6B: independent skill clocks, with damage resolved at contact. */
(() => {
  'use strict';
  const HP=200,TIME_MS=300000,AXE_INTERVAL_MS=5000,DODGE_INTERVAL_MS=6000;
  const ART='assets/novel/characters/char_bandit_chief_world6b_black_coat_design.png';
  const SPRITE_ROOT='assets/monsters/bandit-chief/';
  const THROW_ORIGIN={x:74,y:167}; // Palm in the normalized 448 x 320 release frame.
  const ANIMATIONS={idle:[400,400,400],attack:[80,80,80,80,80,200],dodge:[100,100,300],hit:[100,200,700]};
  // Wind-up precedes each scheduled release; the five-second cadence is unchanged.
  function visual(state){
    const scale=state.guardianReducedMotion?.5:1,phase=state.guardianPhase;
    let action='idle',elapsed=state.guardianReducedMotion?0:(state.banditIdleMs||0)%1200;
    if(phase==='defeat'){
      action='hit';elapsed=100+(1000*scale-state.guardianRemaining)/scale;
    }else if(state.axeElapsed>=AXE_INTERVAL_MS-320*scale){
      action='attack';elapsed=(state.axeElapsed-(AXE_INTERVAL_MS-320*scale))/scale;
    }else if(state.axeFlightMs>0){
      action='attack';elapsed=320+state.axeElapsed/scale;
    }else if(state.banditDodgeMs>0){
      action='dodge';elapsed=500-state.banditDodgeMs/scale;
    }else if(phase==='hit'&&state.guardianVisual==='hit'){
      action='hit';elapsed=100; // Contact enters impact; only lethal damage reaches knockdown.
    }else if(phase==='player-attack'&&state.guardianRemaining<=100*scale&&!state.banditDodgeReady){
      action='hit';elapsed=0; // Notice the player's attack immediately before contact.
    }
    const durations=ANIMATIONS[action];let frame=0;
    while(frame<durations.length-1&&elapsed>=durations[frame]){elapsed-=durations[frame];frame++;}
    return {action,file:action,width:448,height:320,count:durations.length,frame};
  }
  function projectile(state){
    const scale=state.guardianReducedMotion?.5:1;
    if(state.axeFlightMs<=0)return null;
    const progress=Math.min(1,Math.max(0,1-state.axeFlightMs/(600*scale)));
    return {progress,rotation:state.guardianReducedMotion?-progress*90:-progress*720};
  }
  const INFO={name:'도적 대장',description:'왕국수도로 가는 길을 막아선 도적 대장',hp:HP,time:'5분',art:ART,skill:'도끼 던지기',skillDescription:'5초마다 도끼를 던져 50% 확률로 HP 1 피해를 줘요.',skill2:'회피하기',skill2Description:'6초마다 70% 확률로 다음 정답 공격 1회를 회피해요. 정답과 학습 기록은 유지돼요.'};
  function deck(words,shuffle){
    const pool=Array.from(new Map(words.map(entry=>[entry[0].toLowerCase(),entry])).values());
    if(pool.length<4)throw new Error('도적 대장은 네 개 이상의 고유 단어가 필요해요');
    const result=[];
    for(let cycle=0;result.length<HP;cycle++){
      const entries=shuffle([...pool]);
      if(entries[0][0]===result.at(-1)?.entry[0])[entries[0],entries[1]]=[entries[1],entries[0]];
      for(const entry of entries){if(result.length===HP)break;result.push({entry,mode:cycle%2?'ko-en':'en-ko'});}
    }
    return result;
  }
  function reset(){return {guardian:true,banditChief:true,bossHp:HP,bossMaxHp:HP,storyTimeLimit:TIME_MS,guardianPhase:'idle',guardianVisual:'idle',guardianRemaining:0,axeElapsed:0,dodgeElapsed:0,axeFlightMs:0,banditIdleMs:0,banditDodgeReady:false,banditDodgeMs:0,banditNotice:'',banditNoticeMs:0,banditPendingDamage:0};}
  function clear(state){state.axeFlightMs=0;state.banditDodgeReady=false;state.banditDodgeMs=0;state.banditAxeHit=false;state.banditNotice='';state.banditNoticeMs=0;state.axeElapsed=0;state.dodgeElapsed=0;}
  function answer(state,correct,contactMs){
    if(state.done||state.paused||state.locked||state.guardianPhase!=='idle'||state.hp<=0||state.bossHp<=0)return false;
    state.locked=true;state.guardianPhase=correct?'player-attack':'wrong';
    state.guardianRemaining=correct?Math.max(1,contactMs):500;state.guardianVisual='idle';
    if(correct){state.answeredCorrect=(state.answeredCorrect||0)+1;state.attack=true;state.banditPendingDamage=Math.max(1,state.bossAttackSteps||1);}
    else{damagePlayer(state);state.stunned=true;}
    return true;
  }
  function damagePlayer(state){if(state.petEffects)state.petEffects.damage(1);else state.hp=Math.max(0,state.hp-1);}
  function advance(state,delta,random=Math.random,clockDelta=delta){
    if(state.done||state.paused)return [];
    const events=[],scale=state.guardianReducedMotion?.5:1,rate=delta>0&&!state.iceTimeActive?Math.max(0,clockDelta)/delta:0;
    let budget=Math.max(0,delta);
    function notice(text){state.banditNotice=text;state.banditNoticeMs=1200;state.banditAxeHit=false;}
    while(budget>0){
      const alive=state.bossHp>0&&state.hp>0,phase=state.guardianPhase;
      let step=budget;
      if(phase!=='idle')step=Math.min(step,state.guardianRemaining);
      if(alive&&rate>0)step=Math.min(step,(AXE_INTERVAL_MS-state.axeElapsed)/rate,(DODGE_INTERVAL_MS-state.dodgeElapsed)/rate);
      // Player Ice Time freezes flying axes; player attack/hit feedback still completes.
      if(state.axeFlightMs>0&&rate>0)step=Math.min(step,state.axeFlightMs/rate);
      if(state.banditDodgeMs>0)step=Math.min(step,state.banditDodgeMs);
      if(state.banditNoticeMs>0)step=Math.min(step,state.banditNoticeMs);
      budget-=step;
      const flying=state.axeFlightMs>0,dodging=state.banditDodgeMs>0,noticing=state.banditNoticeMs>0;
      if(alive){state.axeElapsed+=step*rate;state.dodgeElapsed+=step*rate;state.banditIdleMs=(state.banditIdleMs||0)+step*rate;}
      if(flying)state.axeFlightMs=Math.max(0,state.axeFlightMs-step*rate);
      state.banditDodgeMs=Math.max(0,state.banditDodgeMs-step);state.banditNoticeMs=Math.max(0,state.banditNoticeMs-step);
      if(dodging&&!state.banditDodgeMs)events.push('dodge-end');
      if(noticing&&!state.banditNoticeMs){state.banditNotice='';state.banditAxeHit=false;events.push('notice-end');}
      if(phase!=='idle'){
        state.guardianRemaining-=step;
        if(state.guardianRemaining<=0){
          if(phase==='player-attack'){
            state.correct++;state.index++;
            if(state.banditDodgeReady){state.banditDodgeReady=false;state.banditDodgeMs=500*scale;notice('회피! 보스 HP 유지');events.push('dodged');}
            else{state.bossHp=Math.max(0,state.bossHp-state.banditPendingDamage);events.push('hit');}
            state.banditPendingDamage=0;state.guardianVisual=state.bossHp?'hit':'defeat';state.guardianPhase=state.bossHp?'hit':'defeat';state.guardianRemaining=(state.bossHp?300:1000)*scale;
            if(!state.bossHp)clear(state);
          }else if(phase==='defeat'){state.attack=false;events.push('victory');return events;}
          else{state.attack=false;state.stunned=false;state.locked=false;state.guardianPhase='idle';state.guardianVisual='idle';events.push(state.hp?'ready':'defeat-player');if(!state.hp)return events;}
        }
      }
      if(state.bossHp<=0)continue;
      if(flying&&!state.axeFlightMs){
        if(random()<.5){damagePlayer(state);notice('도끼 적중 · HP −1');state.banditAxeHit=true;events.push('axe-hit');if(state.hp<=0){clear(state);events.push('defeat-player');return events;}}
        else{notice('도끼 빗나감');events.push('axe-miss');}
      }
      if(rate>0&&state.axeElapsed>=AXE_INTERVAL_MS){state.axeElapsed=0;state.axeFlightMs=600*scale;notice('도끼 던지기');events.push('axe-start');}
      if(rate>0&&state.dodgeElapsed>=DODGE_INTERVAL_MS){state.dodgeElapsed=0;if(random()<.7){state.banditDodgeReady=true;state.banditDodgeMs=500*scale;notice('회피하기 · 다음 공격 회피 준비');events.push('dodge-start');}}
    }
    return events;
  }
  window.WORDORIA_BANDIT_CHIEF={HP,TIME_MS,AXE_INTERVAL_MS,DODGE_INTERVAL_MS,ART,INFO,SPRITE_ROOT,THROW_ORIGIN,ANIMATIONS,visual,projectile,deck,reset,answer,advance,clear};
})();
