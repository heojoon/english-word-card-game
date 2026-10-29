/* World 4-20: five-pair combat and timed, identity-preserving card rotations. */
(() => {
  'use strict';
  const HP=120,TIME_MS=340000,INTERVAL_MS=20000,SUCCESS_RATE=.6,HALLUCINATION_MS=10000,LEFT_MS=300,RIGHT_MS=500;
  const INFO={hp:HP,time:'5분 40초',name:'붉은 사신',description:'죽음과 환상의 지배자로 타락한 천사의 오른팔이다. 환상을 보여주며 사람들의 괴로움을 즐긴다.',skill:'데스 할루시네이션',skillDescription:'20초마다 사용하며 성공확률은 60%입니다. 성공하면 10초 동안 왼쪽 카드는 0.3초마다 아래로, 오른쪽 카드는 0.5초마다 위로 순환합니다.'};
  function deck(words,shuffle){
    const pool=Array.from(new Map(words.map(entry=>[entry[0].toLowerCase(),entry])).values());
    if(pool.length<5)throw new Error('붉은 사신은 다섯 개 이상의 고유 단어가 필요해요');
    const result=[];let cycle=[];
    while(result.length<HP){
      const board=[];
      while(board.length<5){
        if(!cycle.length){
          const forbidden=new Set(board.map(entry=>entry[0].toLowerCase()));
          const fresh=shuffle([...pool]);
          cycle=[...fresh.filter(entry=>!forbidden.has(entry[0].toLowerCase())&&entry[0]!==result.at(-1)?.entry[0]),...fresh.filter(entry=>forbidden.has(entry[0].toLowerCase())||entry[0]===result.at(-1)?.entry[0])];
        }
        const entry=cycle.shift();board.push(entry);result.push({entry,mode:'match'});
      }
    }
    return result;
  }
  function reset(){return {guardian:true,redReaper:true,bossMaxHp:HP,bossHp:HP,storyTimeLimit:TIME_MS,guardianPhase:'idle',guardianVisual:'idle',guardianRemaining:0,reaperSkillElapsed:0,reaperNextSkillAt:INTERVAL_MS,reaperRolls:0,reaperCastMs:0,reaperCastContactMs:0,reaperCastSuccess:false,hallucinationMs:0,leftShiftMs:0,rightShiftMs:0,selectedKo:null,selectedEn:null,pendingPair:null};}
  function board(state,shuffle){
    const start=state.index;
    state.matchBoard=state.deck.slice(start,start+5);
    const pairs=state.matchBoard.map((item,i)=>({entry:item.entry,id:start+i}));
    state.matchKo=shuffle([...pairs]);state.matchEn=shuffle([...pairs]);state.matched=new Set();
    state.selectedKo=null;state.selectedEn=null;state.pendingPair=null;state.queuedStoryPairs=[];
    state.iceTimeActive=false;state.leftShiftMs=0;state.rightShiftMs=0;
  }
  function pick(state,side,id,contactMs){
    if(state.done||state.paused||state.locked||state.stunned||state.weavingStepDodging||state.guardianPhase!=='idle'||!['ko','en'].includes(side)||!state.matchEn.some(item=>item.id===id)||state.matched.has(id))return false;
    state[side==='ko'?'selectedKo':'selectedEn']=id;
    if(state.selectedKo===null||state.selectedEn===null)return 'selected';
    const correct=state.selectedKo===state.selectedEn;
    state.pendingPair=correct?id:null;state.selectedKo=null;state.selectedEn=null;state.locked=true;
    state.guardianPhase=correct?'player-attack':'wrong';state.guardianRemaining=correct?contactMs:500;
    if(correct)state.attack=true;
    else{state.iceTimeActive=false;state.slashCombo=0;if(state.activeSkills)state.activeSkills.damage(1);else if(state.petEffects)state.petEffects.damage(1);else state.hp=Math.max(0,state.hp-1);state.stunned=true;}
    return correct?'correct':'wrong';
  }
  function clear(state){state.hallucinationMs=0;state.reaperCastMs=0;state.reaperCastContactMs=0;state.reaperCastSuccess=false;state.leftShiftMs=0;state.rightShiftMs=0;state.iceTimeActive=false;state.selectedKo=null;state.selectedEn=null;state.pendingPair=null;state.queuedStoryPairs=[];}
  function advance(state,delta,random=Math.random,clockDelta=delta){
    if(state.done||state.paused)return [];
    let budget=Math.max(0,delta);const events=[],scale=state.guardianReducedMotion?.5:1;
    while(budget>0){
      const rate=delta>0&&!state.iceTimeActive?Math.max(0,clockDelta)/delta:0;
      let step=budget;
      if(state.guardianPhase!=='idle')step=Math.min(step,state.guardianRemaining);
      if(state.reaperCastMs>0)step=Math.min(step,state.reaperCastMs);
      if(state.reaperCastContactMs>0)step=Math.min(step,state.reaperCastContactMs);
      if(rate>0){
        if(state.bossHp>0&&state.hp>0)step=Math.min(step,Math.max(0,(state.reaperNextSkillAt-state.reaperSkillElapsed)/rate));
        if(state.hallucinationMs>0)step=Math.min(step,state.hallucinationMs/rate,(LEFT_MS-state.leftShiftMs)/rate,(RIGHT_MS-state.rightShiftMs)/rate);
      }
      const active=state.hallucinationMs>0,casting=state.reaperCastMs>0,contactPending=state.reaperCastContactMs>0;
      state.reaperSkillElapsed+=step*rate;state.reaperCastMs=Math.max(0,state.reaperCastMs-step);
      if(active){state.hallucinationMs=Math.max(0,state.hallucinationMs-step*rate);state.leftShiftMs+=step*rate;state.rightShiftMs+=step*rate;}
      state.reaperCastContactMs=Math.max(0,state.reaperCastContactMs-step);
      budget-=step;
      if(casting&&!state.reaperCastMs)events.push('cast-end');
      if(active){
        if(state.leftShiftMs>=LEFT_MS){state.leftShiftMs-=LEFT_MS;state.matchKo.unshift(state.matchKo.pop());events.push('shift-left');}
        if(state.rightShiftMs>=RIGHT_MS){state.rightShiftMs-=RIGHT_MS;state.matchEn.push(state.matchEn.shift());events.push('shift-right');}
        if(!state.hallucinationMs){state.leftShiftMs=0;state.rightShiftMs=0;events.push('hallucination-end');}
      }
      if(state.guardianPhase!=='idle'){
        state.guardianRemaining-=step;
        if(state.guardianRemaining<=0){
          switch(state.guardianPhase){
            case 'player-attack':{
              state.matched.add(state.pendingPair);state.pendingPair=null;state.correct++;state.index++;state.answeredCorrect=(state.answeredCorrect||0)+1;
              if(state.matched.size===state.matchBoard.length){const extra=Math.min(HP-state.correct,5*((state.bossAttackSteps||1)-1));state.correct+=extra;state.index+=extra;state.iceTimeActive=false;}
              if(state.activeSkills){const base=state.bossHp-Math.max(0,HP-state.correct);state.activeSkills.creditDamage(state.activeSkills.attackDamage(base)-base);}state.bossHp=Math.max(0,HP-state.correct);if(!state.bossHp)clear(state);state.guardianVisual=state.bossHp?'hit':'defeat';state.guardianPhase=state.guardianVisual;
              state.guardianRemaining=(state.bossHp?300:1000)*scale;events.push('hit');break;
            }
            case 'hit':state.attack=false;state.guardianVisual='idle';state.guardianPhase='idle';state.locked=false;events.push(state.matched.size===state.matchBoard.length?'board-ready':'ready');break;
            case 'wrong':state.stunned=false;state.guardianPhase='idle';state.locked=false;events.push(state.hp?'ready':'defeat-player');break;
            case 'defeat':state.attack=false;state.guardianPhase='idle';clear(state);events.push('victory');return events;
            default:throw new Error('Unknown Red Reaper phase');
          }
        }
      }
      if(contactPending&&!state.reaperCastContactMs&&state.bossHp>0&&state.hp>0){events.push('cast-contact');if(state.reaperCastSuccess){state.hallucinationMs=HALLUCINATION_MS;state.leftShiftMs=0;state.rightShiftMs=0;events.push('hallucination-start');}state.reaperCastSuccess=false;}
      if(state.bossHp>0&&state.hp>0&&rate>0&&state.reaperSkillElapsed>=state.reaperNextSkillAt){
        state.reaperNextSkillAt+=INTERVAL_MS;state.reaperRolls++;state.reaperCastMs=700*scale;state.reaperCastContactMs=200*scale;state.reaperCastSuccess=random()<SUCCESS_RATE;events.push('cast-start');
      }
      if(events.includes('defeat-player')){clear(state);return events;}
    }
    return events;
  }
  window.WORDORIA_RED_REAPER={HP,TIME_MS,INTERVAL_MS,SUCCESS_RATE,HALLUCINATION_MS,LEFT_MS,RIGHT_MS,INFO,deck,reset,board,pick,clear,advance};
})();
