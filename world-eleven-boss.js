/* World 11: five-pair matching boards with contact-driven HP combat. */
(() => {
  'use strict';
  const KINDS=Object.freeze({garel:{name:'쇄문장 가렐',hp:200},orden:{name:'병참관 오르덴',hp:240}});
  const ANIMATIONS={idle:[400,400,400],attack:[300,250,300],hit:[140,180,600]};
  const scale=s=>s.guardianReducedMotion?.5:1;
  const timeLimit=(hp,dmg)=>Math.max(180,Math.ceil(hp/Math.max(1,dmg))*6)*1000;
  function reset(kind,dmg=1){
    if(!KINDS[kind])throw Error('Unknown World 11 boss');
    const hp=KINDS[kind].hp;
    return {guardian:true,worldElevenBoss:kind,bossHp:hp,bossMaxHp:hp,bossAttackSteps:Math.max(1,dmg),storyTimeLimit:timeLimit(hp,dmg),guardianPhase:'idle',guardianRemaining:0,fortressClock:0,fortressIdleMs:0,fortressStopped:false,fortressWrongContact:false,pendingPair:null,selectedKo:null,selectedEn:null,answeredCorrect:0};
  }
  function clear(s){
    s.fortressStopped=true;s.pendingPair=null;s.selectedKo=null;s.selectedEn=null;s.queuedStoryPairs=[];s.iceTimeActive=false;s.timeStopped=false;s.attack=false;s.locked=true;
  }
  function extend(out,shuffle){
    const cycle=shuffle(out.fortressPool.slice());
    if(cycle[0][0]===out.at(-1)?.entry[0])[cycle[0],cycle[1]]=[cycle[1],cycle[0]];
    out.push(...cycle.map(entry=>({entry,mode:'match'})));
  }
  function deck(words,shuffle){
    if(words.length!==30||new Set(words.map(e=>e[0].toLowerCase())).size!==30||new Set(words.map(e=>e[2])).size!==30)throw Error('World 11 requires 30 distinct pairs');
    const out=[];out.fortressPool=words.slice();extend(out,shuffle);return out;
  }
  function board(s,shuffle){
    while(s.deck.length<s.index+5)extend(s.deck,shuffle);
    s.matchBoard=s.deck.slice(s.index,s.index+5);const pairs=s.matchBoard.map((x,i)=>({entry:x.entry,id:s.index+i}));
    s.matchKo=shuffle(pairs.slice());s.matchEn=shuffle(pairs.slice());s.matched=new Set();s.pendingPair=null;s.selectedKo=null;s.selectedEn=null;s.queuedStoryPairs=[];s.iceTimeActive=false;
  }
  function pick(s,side,id,contactMs){
    if(s.done||s.paused||s.fortressStopped||s.locked||s.stunned||s.weavingStepDodging||s.hp<=0||s.bossHp<=0||s.elapsed>=s.storyTimeLimit||s.guardianPhase!=='idle'||!['ko','en'].includes(side)||s.matched.has(id)||!s.matchEn.some(x=>x.id===id))return false;
    s[side==='ko'?'selectedKo':'selectedEn']=id;
    if(s.selectedKo===null||s.selectedEn===null)return 'selected';
    const correct=s.selectedKo===s.selectedEn;s.pendingPair=correct?id:null;s.selectedKo=null;s.selectedEn=null;s.locked=true;s.timeStopped=false;
    s.guardianPhase=correct?'player-attack':'wrong';s.guardianRemaining=correct?Math.max(1,contactMs):850*scale(s);s.fortressWrongContact=false;
    if(correct)s.attack=true;
    else{s.iceTimeActive=false;s.slashCombo=0;s.stunned=true;}
    return correct?'correct':'wrong';
  }
  function damage(s,amount){
    if(s.done||s.paused||s.fortressStopped||s.hp<=0||s.bossHp<=0||!Number.isFinite(amount)||amount<=0)return 0;
    const applied=Math.min(s.bossHp,amount);s.bossHp=Math.max(0,s.bossHp-applied);
    if(!s.bossHp){s.guardianPhase='defeat';s.guardianRemaining=920*scale(s);s.locked=true;s.pendingPair=null;s.iceTimeActive=false;s.timeStopped=false;s.selectedKo=null;s.selectedEn=null;}
    return applied;
  }
  function visual(s){
    const m=scale(s);let action='idle',elapsed=s.guardianReducedMotion?0:s.fortressIdleMs%1200;
    if(s.guardianPhase==='wrong'){action='attack';elapsed=850-s.guardianRemaining/m;}
    else if(s.guardianPhase==='hit'){action='hit';elapsed=140;}
    else if(s.guardianPhase==='defeat'||s.bossHp===0){action='hit';elapsed=s.fortressStopped?920:920-s.guardianRemaining/m;}
    const durations=ANIMATIONS[action];let frame=0;
    while(frame<durations.length-1&&elapsed>=durations[frame]){elapsed-=durations[frame];frame++;}
    return {action,frame,count:3,width:448,height:384};
  }
  function advance(s,delta,shuffle){
    if(s.done||s.paused||s.fortressStopped||!Number.isFinite(delta)||delta<=0)return [];
    const events=[],m=scale(s);let budget=delta;
    while(budget>0){
      if(s.hp<=0){clear(s);events.push('defeat-player');break;}
      const phase=s.guardianPhase,clockOn=s.bossHp>0&&!s.iceTimeActive&&!s.timeStopped&&!(s.petTimeMs>0);
      let step=Math.min(budget,50,s.activeSkills?.nextEventIn?.()??Infinity);
      if(phase!=='idle')step=Math.min(step,s.guardianRemaining);
      if(phase==='wrong'&&!s.fortressWrongContact)step=Math.min(step,Math.max(0,s.guardianRemaining-300*m));
      if(s.petTimeMs>0)step=Math.min(step,s.petTimeMs);
      if(clockOn)step=Math.min(step,Math.max(0,s.storyTimeLimit-s.elapsed));
      budget-=step;
      if(clockOn){s.elapsed+=step;s.fortressClock=s.elapsed;s.fortressIdleMs+=step;}
      // Expiry wins a tie with contact and cannot award a late victory.
      if(s.bossHp>0&&s.elapsed>=s.storyTimeLimit){clear(s);events.push('timeout');break;}
      s.petEffects?.advance(step);
      if(s.activeSkills?.advance(step))events.push('skill-feedback');
      // Burn damage can replace a pending action with the knockdown state.
      if(phase!==s.guardianPhase)continue;
      if(phase==='idle')continue;
      s.guardianRemaining=Math.max(0,s.guardianRemaining-step);
      if(phase==='wrong'&&!s.fortressWrongContact&&s.guardianRemaining<=300*m){
        s.fortressWrongContact=true;
        if(s.activeSkills)s.activeSkills.damage(1);else if(s.petEffects)s.petEffects.damage(1);else s.hp=Math.max(0,s.hp-1);
        events.push('wrong-contact');if(s.hp<=0){clear(s);events.push('defeat-player');break;}
      }
      if(s.guardianRemaining>0)continue;
      if(phase==='player-attack'){
        s.matched.add(s.pendingPair);s.pendingPair=null;s.correct++;s.index++;s.answeredCorrect++;
        const amount=s.activeSkills?.attackDamage(s.bossAttackSteps)??s.bossAttackSteps;damage(s,amount);
        s.activeSkills?.observeCorrect?.();s.petEffects?.onCorrect();
        if(s.matched.size===s.matchBoard.length)s.iceTimeActive=false;
        if(s.bossHp>0){s.guardianPhase='hit';s.guardianRemaining=300*m;}
        events.push('hit');
      }else if(phase==='defeat'){
        clear(s);events.push('victory');break;
      }else{
        s.attack=false;s.stunned=false;s.locked=false;s.guardianPhase='idle';
        events.push(s.matched.size===s.matchBoard.length?'board-ready':'ready');
        // The renderer supplies the next board; no unused large delta can skip it.
        if(s.matched.size===s.matchBoard.length)break;
      }
    }
    return events;
  }
  window.WORDORIA_WORLD_ELEVEN_BOSS={KINDS,ANIMATIONS,timeLimit,reset,clear,deck,board,pick,damage,visual,advance};
})();
