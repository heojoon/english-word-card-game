/* World 5 midboss. Damage and healing resolve at their animation contact frames. */
(() => {
  'use strict';
  const HP=120,FREEZE_MS=3000,HEAL=5,HEAL_INTERVAL_MS=15000,DAMAGE_INTERVAL=12,TIME_MS=360000;
  const INFO={name:'이성을 잃은 소서러스',hp:HP,time:'6분',description:'보랏빛 수정동굴에서 이성을 잃은 소서러스',skill:'아이스 타임',skillDescription:'누적 피해가 12(최대 HP의 10%) 늘 때마다 3초 동안 답은 볼 수 있지만 선택할 수 없어요.',skill2:'힐링',skill2Description:'15초마다 HP 5를 회복해요.'};
  function deck(words,shuffle){
    const pool=Array.from(new Map(words.map(entry=>[entry[0].toLowerCase(),entry])).values());
    if(pool.length<4)throw new Error('소서러스는 네 개 이상의 고유 단어가 필요해요');
    const result=[];
    for(let cycle=0;result.length<HP;cycle++){
      const entries=shuffle([...pool]);
      if(entries[0][0]===result.at(-1)?.entry[0])[entries[0],entries[1]]=[entries[1],entries[0]];
      for(const entry of entries){if(result.length===HP)break;result.push({entry,mode:cycle%2?'ko-en':'en-ko'});}
    }
    return result;
  }
  const ANIMATIONS={idle:{file:'idle',width:320,durations:[600,600]},'ice-cast':{file:'ice_time',width:384,durations:[140,180,180,200],contact:320},healing:{file:'healing',width:320,durations:[200,400,600],contact:200},hit:{file:'hit',width:448,durations:[140,160,700]}};
  function reset(){return {guardian:true,sorcerus:true,crystalSpider:false,bossHp:HP,bossMaxHp:HP,storyTimeLimit:TIME_MS,guardianPhase:'idle',guardianRemaining:0,guardianVisual:'idle',guardianBlindMs:0,shadowFreezeMs:0,sorcerusDamage:0,sorcerusNextFreeze:DAMAGE_INTERVAL,sorcerusHealElapsed:0,sorcerusHealMs:0,sorcerusHealAmount:0,sorcerusPhaseMs:0,sorcerusIdleMs:0,sorcerusQueue:[],sorcerusContact:false};}
  function visual(state){
    const phase=state.guardianPhase,action=state.guardianVisual==='defeat'||phase==='defeat'||phase==='hit'?'hit':ANIMATIONS[phase]?phase:'idle',animation=ANIMATIONS[action],scale=state.guardianReducedMotion?.5:1;
    let elapsed=action==='idle'?(state.guardianReducedMotion?0:(state.sorcerusIdleMs||0)%1200):(state.sorcerusPhaseMs||0)/scale,frame=0;
    while(frame<animation.durations.length-1&&elapsed>=animation.durations[frame]){elapsed-=animation.durations[frame];frame++;}
    return {action,file:animation.file,width:animation.width,frame,count:animation.durations.length};
  }
  function answer(state,correct,contactMs){
    if(state.done||state.paused||state.locked||state.shadowFreezeMs>0||state.guardianPhase!=='idle')return false;
    state.locked=true;state.iceTimeActive=false;state.guardianVisual='idle';state.sorcerusPhaseMs=0;
    state.guardianPhase=correct?'player-attack':'wrong';state.guardianRemaining=correct?Math.max(1,contactMs):500;
    if(correct){
      state.sorcerusPendingDamage=Math.min(state.bossHp,(state.activeSkills?.attackDamage(Math.max(1,state.bossAttackSteps||1))??Math.max(1,state.bossAttackSteps||1)));
      state.answeredCorrect=(state.answeredCorrect||0)+1;state.correct+=state.sorcerusPendingDamage;state.index+=state.sorcerusPendingDamage;state.attack=true;
    }else{
      if(state.activeSkills)state.activeSkills.damage(1);else if(state.petEffects)state.petEffects.damage(1);else state.hp=Math.max(0,state.hp-1);
      state.stunned=true;
    }
    return true;
  }
  function advance(state,delta,random,clockDelta=delta){
    if(state.paused||state.done)return [];
    const events=[],scale=state.guardianReducedMotion?.5:1;
    let budget=Math.max(0,delta);
    const clockRate=delta>0&&!state.iceTimeActive?Math.max(0,clockDelta)/delta:0;
    while(budget>0){
      let step=budget;
      const healClock=state.bossHp>0&&state.guardianPhase!=='defeat'&&clockRate>0;
      if(healClock)step=Math.min(step,(HEAL_INTERVAL_MS-state.sorcerusHealElapsed)/clockRate);
      if(state.guardianPhase!=='idle')step=Math.min(step,state.guardianRemaining);
      const animation=ANIMATIONS[state.guardianPhase];
      if(animation?.contact&&!state.sorcerusContact)step=Math.min(step,Math.max(0,animation.contact*scale-state.sorcerusPhaseMs));
      if(state.shadowFreezeMs>0)step=Math.min(step,state.shadowFreezeMs);
      if(state.sorcerusHealMs>0)step=Math.min(step,state.sorcerusHealMs);
      const frozen=state.shadowFreezeMs>0,healing=state.sorcerusHealMs>0;
      state.shadowFreezeMs=Math.max(0,state.shadowFreezeMs-step);state.sorcerusHealMs=Math.max(0,state.sorcerusHealMs-step);budget-=step;
      if(healClock){
        state.sorcerusHealElapsed+=step*clockRate;
        if(state.sorcerusHealElapsed>=HEAL_INTERVAL_MS){state.sorcerusHealElapsed=0;state.sorcerusQueue.push('healing');}
      }
      if(frozen&&!state.shadowFreezeMs)events.push('freeze-end');
      if(healing&&!state.sorcerusHealMs)events.push('heal-end');
      if(state.guardianPhase==='idle'){if(!state.iceTimeActive&&!(state.petTimeMs>0))state.sorcerusIdleMs+=step;if(!state.shadowFreezeMs&&state.sorcerusQueue.length)nextSkill();continue;}
      state.sorcerusPhaseMs+=step;
      state.guardianRemaining-=step;
      if(animation?.contact&&!state.sorcerusContact&&state.sorcerusPhaseMs>=animation.contact*scale){
        state.sorcerusContact=true;
        if(state.guardianPhase==='ice-cast'){state.shadowFreezeMs+=FREEZE_MS;events.push('freeze-start');}
        else{const before=state.bossHp;state.bossHp=Math.min(HP,before+HEAL);state.sorcerusHealAmount=state.bossHp-before;state.sorcerusHealMs=1000*scale;events.push('heal-start');}
      }
      if(state.guardianRemaining>0)continue;
      switch(state.guardianPhase){
        case 'player-attack':{
          const damage=state.sorcerusPendingDamage;state.sorcerusPendingDamage=0;
          state.bossHp=Math.max(0,state.bossHp-damage);state.sorcerusDamage+=damage;
          state.guardianVisual=state.bossHp?'hit':'defeat';state.guardianPhase=state.bossHp?'hit':'defeat';state.sorcerusPhaseMs=0;state.guardianRemaining=(state.bossHp?300:1000)*scale;events.push('hit');
          if(!state.bossHp){state.shadowFreezeMs=0;state.sorcerusHealMs=0;state.sorcerusQueue=[];break;}
          // Count actual damage, so healing never erases progress toward the next cast.
          while(state.sorcerusDamage>=state.sorcerusNextFreeze){state.sorcerusNextFreeze+=DAMAGE_INTERVAL;state.sorcerusQueue.push('ice-cast');}
          break;}
        case 'hit':state.attack=false;nextSkill();events.push('ready');break;
        case 'ice-cast':case 'healing':nextSkill();events.push('cast-end');break;
        case 'wrong':state.stunned=false;state.guardianPhase='idle';state.locked=false;events.push(state.hp?'ready':'defeat-player');break;
        case 'defeat':state.attack=false;state.guardianPhase='idle';events.push('victory');return events;
        default:throw new Error('Unknown Sorcerus phase');
      }
    }
    return events;
    function nextSkill(){
      state.sorcerusPhaseMs=0;state.sorcerusContact=false;
      const next=state.sorcerusQueue.shift();state.guardianPhase=next||'idle';state.guardianVisual=next?'attack':'idle';state.locked=Boolean(next);
      if(next){state.guardianRemaining=ANIMATIONS[next].durations.reduce((a,b)=>a+b,0)*scale;events.push('cast-start');}
    }
  }
  window.WORDORIA_SORCERUS={HP,FREEZE_MS,HEAL,HEAL_INTERVAL_MS,DAMAGE_INTERVAL,TIME_MS,INFO,ANIMATIONS,visual,deck,reset,answer,advance};
})();
