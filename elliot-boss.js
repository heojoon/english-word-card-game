/* World 6B-20: a five-minute swordmaster trial, not an HP-race kill. */
(() => {
  'use strict';
  const HP=500,TIME_MS=300000,REWARD=800,AURA_INTERVAL_MS=20000,SHIELD_INTERVAL_MS=60000,SHIELD_MS=10000;
  const SPRITE_ROOT='assets/monsters/elliot/',ART='assets/novel/characters/char_elliot_world6b_standing.webp';
  const ANIMATIONS={idle:[400,400,400],attack:[180,220,180],shield:[200,200,200],hit:[120,180,600]};
  const INFO={name:'엘리엇',description:'전 세계에 다섯 명뿐인 소드마스터 중 한 명. 아서의 스승이자 왕국의 기사단장으로, 누구도 범접하지 못할 실력의 벽을 넘어선 자예요.',hp:HP,time:'5분',art:ART,skill:'오러 소드',skillDescription:'20초마다 황금빛 검으로 돌진해 HP 1 피해를 줘요.',skill2:'광휘의 방패',skill2Description:'1분마다 검을 바닥에 꽂고 황금 오러를 일으켜 10초 동안 모든 피해를 막아요.',rewardDescription:'5분 동안 생존하고 보스 HP를 250 이하로 낮추면 승리! 최초 보상 800 크리스털 · 계정당 한 번'};
  const scale=s=>s.guardianReducedMotion?.5:1;
  function reset(){return {guardian:true,elliot:true,bossHp:HP,bossMaxHp:HP,storyTimeLimit:TIME_MS,guardianPhase:'idle',guardianVisual:'idle',guardianRemaining:0,elliotClock:0,elliotNextAura:AURA_INTERVAL_MS,elliotNextShield:SHIELD_INTERVAL_MS,elliotShieldUntil:0,elliotAction:'idle',elliotActionMs:0,elliotAuraPending:0,elliotContact:false,elliotNotice:'',elliotNoticeMs:0,elliotPlayerHit:false,elliotPendingDamage:0};}
  function clear(s){s.elliotAction='idle';s.elliotActionMs=0;s.elliotAuraPending=0;s.elliotShieldUntil=0;s.elliotNotice='';s.elliotNoticeMs=0;s.elliotPlayerHit=false;s.elliotPendingDamage=0;s.iceTimeActive=false;}
  const shielded=s=>s.elliotClock<s.elliotShieldUntil;
  const won=s=>s.elliotClock>=TIME_MS&&s.hp>0&&s.bossHp<=250;
  function deck(words,shuffle){
    const pool=Array.from(new Map(words.map(e=>[e[0].toLowerCase(),e])).values());
    if(pool.length<4)throw Error('엘리엇은 네 개 이상의 고유 단어가 필요해요');
    const out=[];
    for(let cycle=0;out.length<HP;cycle++){
      const entries=shuffle([...pool]);if(entries[0][0]===out.at(-1)?.entry[0])[entries[0],entries[1]]=[entries[1],entries[0]];
      for(const entry of entries){if(out.length===HP)break;out.push({entry,mode:cycle%2?'ko-en':'en-ko'});}
    }
    return out;
  }
  function answer(s,correct,contactMs){
    if(s.done||s.paused||s.locked||s.hp<=0||s.elliotClock>=TIME_MS||s.guardianPhase!=='idle')return false;
    s.locked=true;s.guardianPhase=correct?'player-attack':'wrong';s.guardianVisual='idle';
    s.guardianRemaining=correct?Math.max(1,contactMs):500*scale(s);
    if(correct){s.answeredCorrect=(s.answeredCorrect||0)+1;s.attack=true;s.elliotPendingDamage=Math.max(1,s.bossAttackSteps||1);}
    else{if(s.petEffects)s.petEffects.damage(1);else s.hp=Math.max(0,s.hp-1);s.stunned=true;}
    return true;
  }
  function visual(s){
    let action=s.elliotAction,elapsed=action==='idle'?(s.guardianReducedMotion?0:s.elliotClock%1200):580-s.elliotActionMs/scale(s);
    if(action==='shield')elapsed=600-s.elliotActionMs/scale(s);
    if(action==='idle'&&shielded(s)){action='shield';elapsed=599;}
    if(action==='idle'&&s.guardianPhase==='hit'&&s.guardianVisual==='hit'){action='hit';elapsed=120;}
    const durations=ANIMATIONS[action];let frame=0;
    while(frame<durations.length-1&&elapsed>=durations[frame]){elapsed-=durations[frame];frame++;}
    return {action,file:action,width:448,height:320,count:durations.length,frame};
  }
  function motion(s){
    if(s.elliotAction!=='attack')return 0;
    const t=580-s.elliotActionMs/scale(s);
    if(t<=180)return 0;if(t<400)return (t-180)/220;
    return Math.max(0,1-(t-400)/180);
  }
  function advance(s,delta,random=Math.random,clockDelta=delta){
    if(s.done||s.paused)return [];
    const events=[],rate=delta>0&&!s.iceTimeActive?Math.max(0,clockDelta)/delta:0,m=scale(s);
    let budget=Math.max(0,delta);
    const notice=text=>{s.elliotNotice=text;s.elliotNoticeMs=1200;s.elliotPlayerHit=false;};
    while(budget>0){
      if(s.hp<=0){events.push('defeat-player');return events;}
      if(s.elliotClock>=TIME_MS){events.push(won(s)?'victory':'trial-failed');return events;}
      const phase=s.guardianPhase,action=s.elliotAction,noticing=s.elliotNoticeMs>0;
      let step=budget;
      if(phase!=='idle')step=Math.min(step,s.guardianRemaining);
      if(rate>0){
        step=Math.min(step,(TIME_MS-s.elliotClock)/rate,(s.elliotNextAura-s.elliotClock)/rate,(s.elliotNextShield-s.elliotClock)/rate);
        if(shielded(s))step=Math.min(step,(s.elliotShieldUntil-s.elliotClock)/rate);
        if(action!=='idle')step=Math.min(step,s.elliotActionMs/rate);
        if(action==='attack'&&!s.elliotContact)step=Math.min(step,(s.elliotActionMs-180*m)/rate);
      }
      if(noticing)step=Math.min(step,s.elliotNoticeMs);
      budget-=step;s.elliotClock+=step*rate;s.elapsed=s.elliotClock;
      if(action!=='idle')s.elliotActionMs=Math.max(0,s.elliotActionMs-step*rate);
      s.elliotNoticeMs=Math.max(0,s.elliotNoticeMs-step);
      if(noticing&&!s.elliotNoticeMs){s.elliotNotice='';s.elliotPlayerHit=false;events.push('notice-end');}
      // Clock boundaries are applied before contact. At 60s the shield already blocks.
      if(rate>0&&s.elliotClock>=s.elliotNextShield&&s.elliotClock<TIME_MS){
        s.elliotNextShield+=SHIELD_INTERVAL_MS;s.elliotShieldUntil=s.elliotClock+SHIELD_MS;
        s.elliotAction='shield';s.elliotActionMs=600*m;notice('광휘의 방패 · 10초간 피해 무효');events.push('shield-start');
      }
      if(phase!=='idle'){
        s.guardianRemaining-=step;
        if(s.guardianRemaining<=0){
          if(phase==='player-attack'){
            s.correct++;s.index++;
            if(shielded(s)){notice('광휘의 방패 · 피해 방어');events.push('blocked');s.guardianVisual='guard';}
            else{s.bossHp=Math.max(0,s.bossHp-s.elliotPendingDamage);events.push('hit');s.guardianVisual='hit';}
            s.elliotPendingDamage=0;s.guardianPhase='hit';s.guardianRemaining=300*m;
          }else{s.attack=false;s.stunned=false;s.locked=false;s.guardianPhase='idle';s.guardianVisual='idle';events.push('ready');}
        }
      }
      if(action==='attack'&&!s.elliotContact&&s.elliotActionMs<=180*m){
        s.elliotContact=true;if(s.petEffects)s.petEffects.damage(1);else s.hp=Math.max(0,s.hp-1);
        notice('오러 소드 · HP −1');s.elliotPlayerHit=true;events.push('aura-hit');
        if(s.hp<=0){events.push('defeat-player');return events;}
      }
      if(action!=='idle'&&s.elliotAction===action&&!s.elliotActionMs){s.elliotAction='idle';events.push('action-end');}
      if(rate>0&&s.elliotClock>=s.elliotNextAura&&s.elliotClock<TIME_MS){s.elliotNextAura+=AURA_INTERVAL_MS;s.elliotAuraPending++;}
      if(s.elliotAction==='idle'&&s.elliotAuraPending>0){s.elliotAuraPending--;s.elliotAction='attack';s.elliotActionMs=580*m;s.elliotContact=false;notice('오러 소드!');events.push('aura-start');}
      if(s.elliotShieldUntil>0&&s.elliotClock>=s.elliotShieldUntil){s.elliotShieldUntil=0;events.push('shield-end');}
      if(s.elliotClock>=TIME_MS){events.push(won(s)?'victory':'trial-failed');return events;}
    }
    return events;
  }
  window.WORDORIA_ELLIOT={HP,TIME_MS,REWARD,AURA_INTERVAL_MS,SHIELD_INTERVAL_MS,SHIELD_MS,SPRITE_ROOT,ART,ANIMATIONS,INFO,reset,clear,deck,answer,advance,visual,motion,shielded,won};
})();
