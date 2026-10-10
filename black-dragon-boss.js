/* Black Dragon: contact-based energy drain, independent of the guardian beam. */
(() => {
  'use strict';
  const HP=60,THRESHOLDS=[48,30,12,6],SUCCESS_RATE=.1;
  function deck(words,shuffle){
    const pool=Array.from(new Map(words.map(entry=>[entry[0].toLowerCase(),entry])).values());
    if(pool.length<4)throw new Error('블랙 드래곤은 네 개 이상의 고유 단어가 필요해요');
    const result=[];
    for(let cycle=0;result.length<HP;cycle++){
      const entries=shuffle([...pool]);
      if(entries[0][0]===result.at(-1)?.entry[0])[entries[0],entries[1]]=[entries[1],entries[0]];
      for(const entry of entries){if(result.length===HP)break;result.push({entry,mode:cycle%2?'ko-en':'en-ko'});}
    }
    return result;
  }
  function reset(){return {guardian:true,blackDragon:true,storyTimeLimit:300000,bossHp:HP,guardianPhase:'idle',guardianRemaining:0,guardianBlindMs:0,guardianThresholds:[],guardianVisual:'idle',drainQueue:[],drainNotice:'',drainSuccess:false};}
  function answer(state,correct,contactMs){
    if(state.done||state.paused||state.locked||state.guardianPhase!=='idle')return false;
    state.locked=true;state.iceTimeActive=false;state.drainNotice='';state.drainSuccess=false;
    state.guardianPhase=correct?'player-attack':'wrong';state.guardianRemaining=correct?contactMs:500;
    state.guardianVisual='idle';
    if(correct){state.answeredCorrect=(state.answeredCorrect||0)+1;const damage=Math.min(HP-state.correct,Math.max(1,state.bossAttackSteps||1));state.correct+=damage;state.index+=damage;state.attack=true;}
    else{state.hp=Math.max(0,state.hp-1);state.stunned=true;}
    return true;
  }
  function advance(state,delta,random=Math.random){
    if(state.paused||state.done)return [];
    const events=[],scale=state.guardianReducedMotion?.5:1;
    let budget=Math.max(0,delta);
    const ready=()=>{state.guardianPhase='idle';state.guardianVisual='idle';state.locked=false;events.push('ready');};
    while(budget>0&&state.guardianPhase!=='idle'){
      const step=Math.min(budget,state.guardianRemaining);budget-=step;state.guardianRemaining-=step;
      if(state.guardianRemaining>0)break;
      switch(state.guardianPhase){
        case 'player-attack':{
          const before=state.bossHp;state.bossHp=Math.max(0,HP-state.correct);
          for(const threshold of THRESHOLDS)if(before>threshold&&state.bossHp<=threshold&&!state.guardianThresholds.includes(threshold)){
            state.guardianThresholds.push(threshold);state.drainQueue.push(threshold);
          }
          state.guardianVisual=state.bossHp?'hit':'defeat';events.push('hit');
          state.guardianPhase=state.bossHp?'hit':'defeat';state.guardianRemaining=(state.bossHp?300:1000)*scale;break;
        }
        case 'hit':
          state.attack=false;
          if(state.drainQueue.length){state.drainQueue.shift();state.guardianPhase='drain-charge';state.guardianRemaining=600*scale;state.guardianVisual='attack';state.drainNotice='에너지 흡수';events.push('drain-start');}
          else ready();break;
        case 'drain-charge':
          state.drainSuccess=random()<SUCCESS_RATE;
          if(state.drainSuccess){state.hp=Math.max(0,state.hp-1);state.stunned=true;}
          state.drainNotice=state.drainSuccess?'에너지 흡수 · HP −1':'에너지 흡수를 막았어요!';
          state.guardianPhase='drain-hold';state.guardianRemaining=700;events.push(state.drainSuccess?'drain-hit':'drain-miss');break;
        case 'drain-hold':
          state.stunned=false;state.drainNotice='';state.drainSuccess=false;
          if(!state.hp){state.guardianPhase='idle';events.push('defeat-player');}
          else if(state.drainQueue.length){state.guardianPhase='hit';state.guardianRemaining=1;}
          else ready();break;
        case 'wrong':
          state.stunned=false;if(state.hp)ready();else{state.guardianPhase='idle';events.push('defeat-player');}break;
        case 'defeat':state.attack=false;state.guardianPhase='idle';events.push('victory');break;
        default:throw new Error('Unknown Black Dragon phase');
      }
    }
    return events;
  }
  window.WORDORIA_BLACK_DRAGON={HP,THRESHOLDS,SUCCESS_RATE,deck,reset,answer,advance};
})();
