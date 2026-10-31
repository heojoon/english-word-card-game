/* World 7C-30: HP combat, shared damage routes and contact-driven skill events. */
(() => {
  'use strict';
  const HP=240,TIME_MS=300000,SHIELD_INTERVAL_MS=20000,SHIELD_MS=5000,CONTACT_MS=600;
  const THRESHOLDS=[180,120,60],SPRITE_ROOT='assets/monsters/seal-knight/';
  const ART='assets/novel/characters/char_seal_knight_world7c_standing.webp';
  const INFO={name:'봉인의 수호기사',description:'성흔의 파편을 지키는 빈 갑옷의 기사. 검과 방패로 동료를 지킬 자격을 시험해요.',hp:HP,time:'5분',art:ART,rewardDescription:'최초 처치 700 크리스탈 · 재클리어 보상 및 피버타임 없음',skill:'봉인의 방패',skillDescription:'20초마다 5초간 받는 모든 피해를 절반으로 줄여요.',skill2:'심판의 검',skill2Description:'HP 75%·50%·25%에 각각 한 번 공격을 예고해요. 검이 닿을 때 HP 1 피해를 받아요.'};
  const ANIMATIONS={idle:[350,350,350],attack:[300,300,300],shield:[200,250,350],hit:[140,180,600]};
  const scale=s=>s.guardianReducedMotion?.5:1;
  function reset(){return {guardian:true,sealKnight:true,sentryMob:false,bossHp:HP,bossMaxHp:HP,storyTimeLimit:TIME_MS,guardianPhase:'idle',guardianVisual:'idle',guardianRemaining:0,sealClock:0,sealNextShield:SHIELD_INTERVAL_MS,sealShieldMs:0,sealCastMs:0,sealContact:false,sealThresholds:[],sealQueue:[],sealNotice:'',sealNoticeMs:0,sealPlayerHit:false,sealStopped:false,selectedKo:null,selectedEn:null,pendingPair:null};}
  function clear(s){s.sealStopped=true;s.sealShieldMs=0;s.sealCastMs=0;s.sealQueue=[];s.sealNotice='';s.sealNoticeMs=0;s.sealPlayerHit=false;s.iceTimeActive=false;s.pendingPair=null;s.selectedKo=null;s.selectedEn=null;s.queuedStoryPairs=[];s.attack=false;}
  function extend(deck,shuffle){
    const board=[];
    while(board.length<5){
      if(!deck.sealCycle.length){
        const used=new Set(board.map(e=>e[0].toLowerCase())),fresh=shuffle([...deck.sealPool]);
        // Reorder the new cycle, never skip its entries or repeat a pair on one board.
        deck.sealCycle=[...fresh.filter(e=>!used.has(e[0].toLowerCase())),...fresh.filter(e=>used.has(e[0].toLowerCase()))];
        if(deck.sealCycle[0]?.[0]===deck.at(-1)?.entry[0]&&deck.sealCycle.length>1)[deck.sealCycle[0],deck.sealCycle[1]]=[deck.sealCycle[1],deck.sealCycle[0]];
      }
      const entry=deck.sealCycle.shift();board.push(entry);deck.push({entry,mode:'match'});
    }
  }
  function deck(words,shuffle){
    const out=[];out.sealPool=Array.from(new Map(words.map(e=>[e[0].toLowerCase(),e])).values());out.sealCycle=[];
    if(out.sealPool.length<5)throw Error('봉인의 수호기사는 서로 다른 단어가 5개 이상 필요해요');
    while(out.length<HP)extend(out,shuffle);
    return out;
  }
  function board(s,shuffle){while(s.deck.length<s.index+5)extend(s.deck,shuffle);window.WORDORIA_NEREUS.board(s,shuffle);}
  function pick(s,side,id,contactMs){if(s.sealStopped||s.sealClock>=TIME_MS)return false;return window.WORDORIA_NEREUS.pick(s,side,id,contactMs);}
  function damage(s,amount){
    if(s.done||s.paused||s.sealStopped||s.hp<=0||s.bossHp<=0||!Number.isFinite(amount)||amount<=0)return 0;
    const before=s.bossHp,hit=Math.min(before,amount*(s.sealShieldMs>0?.5:1));s.bossHp=Math.max(0,before-hit);
    if(s.bossHp>0){for(const hp of THRESHOLDS)if(before>hp&&s.bossHp<=hp&&!s.sealThresholds.includes(hp)){s.sealThresholds.push(hp);s.sealQueue.push(hp);}}
    else{s.sealCastMs=0;s.sealQueue=[];s.sealShieldMs=0;s.pendingPair=null;s.selectedKo=null;s.selectedEn=null;s.iceTimeActive=false;s.guardianPhase='defeat';s.guardianVisual='defeat';s.guardianRemaining=920*scale(s);s.locked=true;}
    return hit;
  }
  function visual(s){
    const m=scale(s);let action='idle',elapsed=s.guardianReducedMotion?0:s.sealClock%1050;
    if(s.guardianPhase==='defeat'){action='hit';elapsed=(920*m-s.guardianRemaining)/m;}
    else if(s.guardianPhase==='hit'){action='hit';elapsed=140;}
    else if(s.sealCastMs>0){action='attack';elapsed=900-s.sealCastMs/m;}
    else if(s.sealShieldMs>0){action='shield';elapsed=Math.min(799,SHIELD_MS-s.sealShieldMs);}
    let frame=0;const durations=ANIMATIONS[action];while(frame<durations.length-1&&elapsed>=durations[frame]){elapsed-=durations[frame];frame++;}
    return {action,frame,count:durations.length,width:384,height:320};
  }
  function advance(s,delta,shuffle,clockDelta=delta,withEffects=false){
    if(s.done||s.paused||s.sealStopped)return [];
    const events=[],m=scale(s);let budget=Math.max(0,delta);
    const clockRate=delta>0?Math.max(0,clockDelta)/delta:0;
    while(budget>0){
      if(s.hp<=0){clear(s);events.push('defeat-player');return events;}
      const rate=!s.iceTimeActive&&s.bossHp>0&&!(withEffects&&s.petTimeMs>0)?clockRate:0;
      if(s.bossHp>0&&s.sealClock>=TIME_MS){clear(s);events.push('timeout');return events;}
      if(s.bossHp>0&&rate>0&&!s.sealCastMs&&s.sealQueue.length){s.sealQueue.shift();s.sealCastMs=900*m;s.sealContact=false;s.sealNotice='심판의 검 · 검격에 대비하세요!';s.sealNoticeMs=900*m;events.push('sword-start');}
      const phase=s.guardianPhase,casting=s.sealCastMs>0,shielding=s.sealShieldMs>0,noticing=s.sealNoticeMs>0;
      let step=budget;
      if(phase!=='idle')step=Math.min(step,Math.max(0,s.guardianRemaining));
      if(rate>0){step=Math.min(step,(s.sealNextShield-s.sealClock)/rate,(TIME_MS-s.sealClock)/rate);if(shielding)step=Math.min(step,s.sealShieldMs/rate);}
      if(casting){step=Math.min(step,s.sealCastMs);if(!s.sealContact)step=Math.min(step,Math.max(0,s.sealCastMs-300*m));}
      if(noticing)step=Math.min(step,s.sealNoticeMs);
      if(withEffects){step=Math.min(step,s.activeSkills?.nextEventIn?.()??Infinity);if(s.petTimeMs>0)step=Math.min(step,s.petTimeMs);}
      budget-=step;s.sealClock+=step*rate;s.sealShieldMs=Math.max(0,s.sealShieldMs-step*rate);s.sealCastMs=Math.max(0,s.sealCastMs-step);s.sealNoticeMs=Math.max(0,s.sealNoticeMs-step);
      if(noticing&&!s.sealNoticeMs){s.sealNotice='';s.sealPlayerHit=false;events.push('notice-end');}
      if(shielding&&!s.sealShieldMs)events.push('shield-end');
      // The timer wins ties with a pending contact. A contact after time expiry cannot win.
      if(s.bossHp>0&&s.sealClock>=TIME_MS){clear(s);events.push('timeout');return events;}
      // Resolve shield boundaries BEFORE a burn due at this same timestamp.
      if(s.bossHp>0&&rate>0&&s.sealClock>=s.sealNextShield){s.sealNextShield+=SHIELD_INTERVAL_MS;s.sealShieldMs=SHIELD_MS;s.sealNotice='봉인의 방패 · 5초간 받는 피해 절반';s.sealNoticeMs=1200;events.push('shield-start');}
      if(withEffects){s.petEffects?.advance(step);if(s.activeSkills?.advance(step))events.push('skill-feedback');}
      // A lethal burn can replace a pending attack with defeat; don't age the
      // newly-created defeat phase using time that elapsed before that burn.
      if(phase!=='idle'&&s.guardianPhase===phase){
        s.guardianRemaining=Math.max(0,s.guardianRemaining-step);
        if(!s.guardianRemaining){
          if(phase==='player-attack'){
            s.matched.add(s.pendingPair);s.pendingPair=null;s.correct++;s.index++;
            damage(s,s.activeSkills?.attackDamage(Math.max(1,s.bossAttackSteps||1))??Math.max(1,s.bossAttackSteps||1));
            if(withEffects)s.petEffects?.onCorrect();
            if(s.matched.size===s.matchBoard.length)s.iceTimeActive=false;
            if(s.bossHp>0){s.guardianPhase='hit';s.guardianVisual='hit';s.guardianRemaining=300*m;}
            events.push('hit');
          }else if(phase==='defeat'){clear(s);events.push('victory');return events;}
          else{s.attack=false;s.stunned=false;s.locked=false;s.guardianPhase='idle';s.guardianVisual='idle';events.push(s.matched.size===s.matchBoard.length?'board-ready':'ready');}
        }
      }
      if(s.bossHp>0&&casting&&!s.sealContact&&s.sealCastMs<=300*m){
        s.sealContact=true;const before=s.hp;
        if(s.activeSkills)s.activeSkills.damage(1);else if(s.petEffects)s.petEffects.damage(1);else s.hp=Math.max(0,s.hp-1);
        s.sealPlayerHit=s.hp<before;s.sealNotice=s.sealPlayerHit?'심판의 검 · HP −1':'심판의 검 · 피해를 막았어요!';s.sealNoticeMs=900;events.push(s.sealPlayerHit?'sword-hit':'sword-blocked');
        if(s.hp<=0){clear(s);events.push('defeat-player');return events;}
      }
    }
    return events;
  }
  const advanceCombat=(s,delta,shuffle)=>advance(s,delta,shuffle,delta,true);
  window.WORDORIA_SEAL_KNIGHT={HP,TIME_MS,SHIELD_INTERVAL_MS,SHIELD_MS,CONTACT_MS,THRESHOLDS,SPRITE_ROOT,ART,INFO,ANIMATIONS,reset,clear,deck,board,pick,damage,visual,advance,advanceCombat};
})();
