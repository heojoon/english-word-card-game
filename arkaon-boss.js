/* World 7C-10. Matching answers and boss attacks resolve at their contact frames. */
(() => {
  'use strict';
  const HP=200,TIME_MS=300000,INTERVAL_MS=20000,SHUFFLE_MS=30000,CONTACT_MS=600;
  const SPRITE_ROOT='assets/monsters/arkaon/',ART='assets/novel/characters/char_arkaon_world7c_standing.webp';
  const INFO={name:'봉인 병기 아르카온',description:'인공 심연의 골렘. 왕국 지하 던전의 마력 회로와 연결되어 돌다리와 봉인을 지키는 고대 수호 병기예요.',hp:HP,time:'5분',art:ART,skill:'봉인 충격파',skillDescription:'20초마다 두 주먹을 들어 공격을 예고해요. 지면에 닿는 순간 35% 확률로 HP 1을 깎아요.',skill2:'마력 재배열',skill2Description:'30초마다 마력 회로를 돌려 아직 맞히지 않은 한글·영어 카드 위치를 섞어요. 맞힌 카드는 유지돼요.'};
  const ANIMATIONS={idle:[350,350,350],attack:[300,300,300],reorder:[200,250,350],hit:[140,180,600]};
  const scale=s=>s.guardianReducedMotion?.5:1;
  function reset(){return {guardian:true,arkaon:true,sentryMob:false,bossHp:HP,bossMaxHp:HP,storyTimeLimit:TIME_MS,guardianPhase:'idle',guardianVisual:'idle',guardianRemaining:0,arkaonClock:0,arkaonNextWave:INTERVAL_MS,arkaonNextShuffle:SHUFFLE_MS,arkaonCastMs:0,arkaonContact:false,arkaonReorderMs:0,arkaonShufflePending:false,arkaonNotice:'',arkaonNoticeMs:0,arkaonPlayerHit:false,selectedKo:null,selectedEn:null,pendingPair:null};}
  function clear(s){s.arkaonCastMs=0;s.arkaonContact=false;s.arkaonReorderMs=0;s.arkaonShufflePending=false;s.arkaonNotice='';s.arkaonNoticeMs=0;s.arkaonPlayerHit=false;s.iceTimeActive=false;s.selectedKo=null;s.selectedEn=null;s.pendingPair=null;s.queuedStoryPairs=[];}
  // Share the established five-pair vocabulary cycle and selection rules with 7B.
  const deck=(words,shuffle)=>window.WORDORIA_NEREUS.deck(words,shuffle);
  const board=(s,shuffle)=>window.WORDORIA_NEREUS.board(s,shuffle);
  const pick=(s,side,id,contactMs)=>window.WORDORIA_NEREUS.pick(s,side,id,contactMs);
  function visual(s){
    const m=scale(s);let action='idle',elapsed=s.guardianReducedMotion?0:s.arkaonClock%1050;
    if(s.guardianPhase==='defeat'){action='hit';elapsed=(920*m-s.guardianRemaining)/m;}
    else if(s.arkaonCastMs>0){action='attack';elapsed=900-s.arkaonCastMs/m;}
    else if(s.guardianPhase==='hit'){action='hit';elapsed=140;}
    else if(s.arkaonReorderMs>0){action='reorder';elapsed=800-s.arkaonReorderMs/m;}
    const durations=ANIMATIONS[action];let frame=0;while(frame<durations.length-1&&elapsed>=durations[frame]){elapsed-=durations[frame];frame++;}
    return {action,frame,count:durations.length,width:320,height:320};
  }
  function rearrange(s,shuffle){
    for(const key of ['matchKo','matchEn']){const remaining=shuffle(s[key].filter(x=>!s.matched.has(x.id)));s[key]=s[key].map(x=>s.matched.has(x.id)?x:remaining.shift());}
    s.selectedKo=null;s.selectedEn=null;s.eagleEyeActive=false;s.eagleEyePairId=null;s.arkaonShufflePending=false;s.arkaonReorderMs=800*scale(s);s.arkaonNotice='마력 재배열 · 남은 카드가 섞였어요!';s.arkaonNoticeMs=1400;
  }
  function advance(s,delta,shuffle,clockDelta=delta,random=Math.random){
    if(s.done||s.paused)return [];
    const events=[],m=scale(s);let budget=Math.max(0,delta);
    while(budget>0){
      if(s.hp<=0){clear(s);events.push('defeat-player');return events;}
      const rate=delta>0&&!s.iceTimeActive&&s.bossHp>0?Math.max(0,clockDelta)/delta:0,phase=s.guardianPhase;
      let step=budget;
      if(phase!=='idle')step=Math.min(step,s.guardianRemaining);
      if(rate>0)step=Math.min(step,(s.arkaonNextWave-s.arkaonClock)/rate,(s.arkaonNextShuffle-s.arkaonClock)/rate);
      if(s.arkaonCastMs>0){step=Math.min(step,s.arkaonCastMs);if(!s.arkaonContact)step=Math.min(step,s.arkaonCastMs-300*m);}
      if(s.arkaonNoticeMs>0)step=Math.min(step,s.arkaonNoticeMs);
      const casting=s.arkaonCastMs>0,noticing=s.arkaonNoticeMs>0;
      budget-=step;s.arkaonClock+=step*rate;s.arkaonCastMs=Math.max(0,s.arkaonCastMs-step);s.arkaonReorderMs=Math.max(0,s.arkaonReorderMs-step);s.arkaonNoticeMs=Math.max(0,s.arkaonNoticeMs-step);
      if(noticing&&!s.arkaonNoticeMs){s.arkaonNotice='';s.arkaonPlayerHit=false;events.push('notice-end');}
      if(phase!=='idle'){
        s.guardianRemaining-=step;
        if(s.guardianRemaining<=0){
          if(phase==='player-attack'){
            s.matched.add(s.pendingPair);s.pendingPair=null;s.correct++;s.index++;s.bossHp=Math.max(0,s.bossHp-Math.max(1,s.bossAttackSteps||1));
            if(s.matched.size===s.matchBoard.length)s.iceTimeActive=false;
            if(!s.bossHp)clear(s);
            s.guardianPhase=s.bossHp?'hit':'defeat';s.guardianVisual=s.guardianPhase;s.guardianRemaining=(s.bossHp?300:920)*m;events.push('hit');
          }else if(phase==='defeat'){events.push('victory');return events;}
          else{s.attack=false;s.stunned=false;s.locked=false;s.guardianPhase='idle';s.guardianVisual='idle';events.push(s.matched.size===s.matchBoard.length?'board-ready':'ready');}
        }
      }
      if(s.bossHp>0&&casting&&!s.arkaonContact&&s.arkaonCastMs<=300*m){
        s.arkaonContact=true;const hit=random()<.35;
        if(hit){if(s.petEffects)s.petEffects.damage(1);else s.hp=Math.max(0,s.hp-1);s.arkaonPlayerHit=true;}
        s.arkaonNotice=hit?'봉인 충격파 · HP −1':'봉인 충격파 · 충격을 피했어요!';s.arkaonNoticeMs=1000;events.push(hit?'wave-hit':'wave-miss');
        if(s.hp<=0){clear(s);events.push('defeat-player');return events;}
      }
      if(s.bossHp>0&&rate>0&&s.arkaonClock>=s.arkaonNextWave){s.arkaonNextWave+=INTERVAL_MS;s.arkaonCastMs=900*m;s.arkaonContact=false;s.arkaonNotice='봉인 충격파 · 충격에 대비하세요!';s.arkaonNoticeMs=900*m;events.push('wave-start');}
      if(s.bossHp>0&&rate>0&&s.arkaonClock>=s.arkaonNextShuffle){s.arkaonNextShuffle+=SHUFFLE_MS;s.arkaonShufflePending=true;}
      if(s.bossHp>0&&!s.iceTimeActive&&s.arkaonShufflePending&&s.guardianPhase==='idle'&&s.matched.size<s.matchBoard.length){rearrange(s,shuffle);events.push('reorder');}
    }return events;
  }
  window.WORDORIA_ARKAON={HP,TIME_MS,INTERVAL_MS,SHUFFLE_MS,CONTACT_MS,SPRITE_ROOT,ART,INFO,ANIMATIONS,reset,clear,deck,board,pick,visual,advance};
})();
