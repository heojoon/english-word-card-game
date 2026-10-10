/* Crystal Guardian Golem: local battle rules, shared by both learning levels. */
(() => {
  'use strict';
  const HP=60, BLIND_MS=3000, THRESHOLDS=[48,24,12,6];
  function maskChoice(choice){
    const text=choice.replace(/^(?:\s*\[[^\]]*\])+\s*/u,'').trim();
    const chars=Array.from(text),visible=chars.map((char,index)=>/\S/u.test(char)?index:-1).filter(index=>index>=0);
    return chars.map((char,index)=>index===visible[0]||index===visible.at(-1)||/\s/u.test(char)?char:'◆').join('');
  }
  function deck(words,shuffle){
    const pool=Array.from(new Map(words.map(entry=>[entry[0].toLowerCase(),entry])).values());
    if(![20,30].includes(pool.length))throw new Error('크리스탈 가디언 골렘은 해당 레벨의 20개 또는 30개 단어가 필요해요');
    const result=[];
    for(let cycle=0;cycle<HP/pool.length;cycle++){
      const entries=shuffle(pool);
      if(entries[0][0]===result.at(-1)?.entry[0])[entries[0],entries[1]]=[entries[1],entries[0]];
      entries.forEach((entry,index)=>result.push({entry,mode:cycle===0?'en-ko':cycle===1?'ko-en':index%2?'ko-en':'en-ko'}));
    }
    return result;
  }
  function reset(){return {guardian:true,storyTimeLimit:210000,bossHp:HP,guardianPhase:'idle',guardianRemaining:0,guardianBlindMs:0,guardianThresholds:[],guardianPendingBeam:false,guardianBeamHit:false,guardianVisual:'idle'};}
  function answer(state,correct,contactMs){
    if(state.locked||!['idle','beam-hold'].includes(state.guardianPhase))return false;
    state.locked=true;
    state.guardianPhase=correct?'player-attack':'wrong';
    state.guardianRemaining=correct?contactMs:500;
    state.guardianVisual='idle';state.guardianBeamHit=false;
    if(correct){state.correct++;state.index++;state.attack=true;}
    else{state.hp=Math.max(0,state.hp-1);state.stunned=true;}
    return true;
  }
  function advance(state,delta){
    const events=[];
    const durationScale=state.guardianReducedMotion?0.5:1;
    let budget=Math.max(0,delta);
    function advanceMask(step){
      const before=state.guardianBlindMs;
      state.guardianBlindMs=Math.max(0,before-step);
      if(before>0&&!state.guardianBlindMs)events.push('blind-end');
    }
    while(budget>0&&state.guardianPhase!=='idle'){
      const step=Math.min(budget,state.guardianRemaining);
      state.guardianRemaining-=step;advanceMask(step);budget-=step;
      if(state.guardianRemaining>0)break;
      switch(state.guardianPhase){
        case 'player-attack':
          state.bossHp=HP-state.correct;state.guardianVisual=state.bossHp?'hit':'defeat';events.push('hit');
          if(THRESHOLDS.includes(state.bossHp)&&!state.guardianThresholds.includes(state.bossHp)){
            state.guardianThresholds.push(state.bossHp);state.guardianPendingBeam=true;
          }
          state.guardianPhase=state.bossHp?'hit':'defeat';state.guardianRemaining=(state.bossHp?300:1000)*durationScale;
          break;
        case 'hit':
          state.attack=false;
          if(state.guardianPendingBeam){
            state.guardianPendingBeam=false;state.guardianPhase='beam-charge';state.guardianRemaining=600*durationScale;state.guardianVisual='attack';state.guardianBeamHit=false;events.push('beam-start');
          }else{state.guardianPhase='idle';state.guardianVisual='idle';state.locked=false;events.push('ready');}
          break;
        case 'beam-charge':
          state.guardianBlindMs=BLIND_MS;state.guardianBeamHit=true;state.locked=false;state.guardianPhase='beam-hold';state.guardianRemaining=300*durationScale;events.push('beam-contact');
          break;
        case 'beam-hold':
          state.guardianVisual='idle';state.guardianPhase='idle';state.guardianBeamHit=false;events.push('beam-end');break;
        case 'wrong':
          state.stunned=false;state.guardianPhase='idle';state.locked=false;events.push(state.hp?'ready':'defeat-player');break;
        case 'defeat':
          state.guardianPhase='idle';events.push('victory');break;
        default:throw new Error('Unknown guardian phase');
      }
    }
    advanceMask(budget);
    return events;
  }
  window.WORDORIA_GUARDIAN={HP,BLIND_MS,THRESHOLDS,maskChoice,deck,reset,answer,advance};
})();
