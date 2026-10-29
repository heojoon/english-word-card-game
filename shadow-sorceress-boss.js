/* Shadow Sorceress: four-choice combat with a periodic visible-answer freeze. */
(() => {
  'use strict';
  const HP=100,TIME_MS=330000,INTERVAL_MS=30000,FREEZE_MS=4500,SUCCESS_RATE=.5;
  const INFO={hp:HP,time:'5분 30초',name:'쉐도우 소서러스',description:'환각의 땅의 거울을 통해 반전 세계에서 소환된 소서러스의 어두움의 인격체',skill:'다크 아이스 타임',skillDescription:'30초마다 50% 확률로 발동합니다. 4.5초 동안 얼음에 갇혀 답은 볼 수 있지만 선택할 수 없어요.'};
  function deck(words,shuffle){
    const pool=Array.from(new Map(words.map(entry=>[entry[0].toLowerCase(),entry])).values());
    if(pool.length<4)throw new Error('쉐도우 소서러스는 네 개 이상의 고유 단어가 필요해요');
    const result=[];
    for(let cycle=0;result.length<HP;cycle++){
      const entries=shuffle([...pool]);
      if(entries[0][0]===result.at(-1)?.entry[0])[entries[0],entries[1]]=[entries[1],entries[0]];
      for(const entry of entries){if(result.length===HP)break;result.push({entry,mode:cycle%2?'ko-en':'en-ko'});}
    }
    return result;
  }
  function reset(){return {guardian:true,shadowSorceress:true,bossMaxHp:HP,storyTimeLimit:TIME_MS,bossHp:HP,guardianPhase:'idle',guardianRemaining:0,guardianBlindMs:0,guardianVisual:'idle',shadowFreezeMs:0,shadowCastMs:0,shadowSkillElapsed:0,shadowNextSkillAt:INTERVAL_MS,shadowRolls:0};}
  function answer(state,correct,contactMs){
    if(state.done||state.paused||state.locked||state.shadowFreezeMs>0||state.guardianPhase!=='idle')return false;
    state.locked=true;state.iceTimeActive=false;
    state.guardianPhase=correct?'player-attack':'wrong';state.guardianRemaining=correct?contactMs:500;
    state.guardianVisual='idle';
    if(correct){const damage=Math.min(HP-state.correct,(state.activeSkills?.attackDamage(Math.max(1,state.bossAttackSteps||1))??Math.max(1,state.bossAttackSteps||1)));state.answeredCorrect=(state.answeredCorrect||0)+1;state.correct+=damage;state.index+=damage;state.attack=true;}
    else{if(state.activeSkills)state.activeSkills.damage(1);else if(state.petEffects)state.petEffects.damage(1);else state.hp=Math.max(0,state.hp-1);state.stunned=true;}
    return true;
  }
  function advance(state,delta,random=Math.random,clockDelta=delta){
    if(state.paused||state.done)return [];
    const events=[],scale=state.guardianReducedMotion?.5:1;
    let budget=Math.max(0,delta);
    const rate=delta>0&&!state.iceTimeActive?Math.max(0,clockDelta)/delta:0;
    while(budget>0){
      let step=budget;
      if(state.guardianPhase!=='idle')step=Math.min(step,state.guardianRemaining);
      if(state.shadowFreezeMs>0)step=Math.min(step,state.shadowFreezeMs);
      if(state.shadowCastMs>0)step=Math.min(step,state.shadowCastMs);
      const canRoll=state.bossHp>0&&state.hp>0;
      if(canRoll&&rate>0)step=Math.min(step,Math.max(0,(state.shadowNextSkillAt-state.shadowSkillElapsed)/rate));
      const frozen=state.shadowFreezeMs>0,casting=state.shadowCastMs>0;
      state.shadowFreezeMs=Math.max(0,state.shadowFreezeMs-step);
      state.shadowCastMs=Math.max(0,state.shadowCastMs-step);
      state.shadowSkillElapsed+=step*rate;budget-=step;
      if(frozen&&!state.shadowFreezeMs)events.push('freeze-end');
      if(casting&&!state.shadowCastMs)events.push('cast-end');
      if(state.guardianPhase!=='idle'){
        state.guardianRemaining-=step;
        if(state.guardianRemaining<=0){
          switch(state.guardianPhase){
            case 'player-attack':
              state.bossHp=Math.max(0,HP-state.correct);state.guardianVisual=state.bossHp?'hit':'defeat';
              state.guardianPhase=state.bossHp?'hit':'defeat';state.guardianRemaining=(state.bossHp?300:1000)*scale;events.push('hit');break;
            case 'hit':state.attack=false;state.guardianPhase='idle';state.guardianVisual='idle';state.locked=false;events.push('ready');break;
            case 'wrong':state.stunned=false;state.guardianPhase='idle';state.locked=false;events.push(state.hp?'ready':'defeat-player');break;
            case 'defeat':state.attack=false;state.guardianPhase='idle';state.shadowFreezeMs=0;state.shadowCastMs=0;events.push('victory');return events;
            default:throw new Error('Unknown Shadow Sorceress phase');
          }
        }
      }
      if(canRoll&&state.bossHp>0&&rate>0&&state.shadowSkillElapsed>=state.shadowNextSkillAt){
        state.shadowNextSkillAt+=INTERVAL_MS;state.shadowRolls++;
        if(random()<SUCCESS_RATE){state.shadowFreezeMs=FREEZE_MS;state.shadowCastMs=700*scale;events.push('freeze-start');}
      }
      if(events.includes('defeat-player'))return events;
    }
    return events;
  }
  window.WORDORIA_SHADOW_SORCERESS={HP,TIME_MS,INTERVAL_MS,FREEZE_MS,SUCCESS_RATE,INFO,deck,reset,answer,advance};
})();
