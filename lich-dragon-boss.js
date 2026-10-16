/* World 5-20: ten identity-preserving cards, drain thresholds and timed tornadoes. */
(() => {
  'use strict';
  const HP=200,TIME_MS=480000,INTERVAL_MS=10000,SUCCESS_RATE=.6,THRESHOLDS=[160,100,40,20];
  const INFO={name:'부활한 리치 드래곤',hp:HP,time:'8분',description:'깨어진 영혼을 보랏빛 수정의 힘으로 재결합해 돌아온 리치 드래곤. 동료들에게 당했던 마법까지 흡수해 모험가들을 막아선다.',skill:'에너지 드레인',skillDescription:'HP 80%·50%·20%·10%에 처음 도달하면 60% 확률로 플레이어 HP 1을 흡수해요.',skill2:'블랙 토네이토',skill2Description:'10초마다 검은 회오리를 발사해요. 적중하면 10개 카드가 섞여 같은 열의 위아래 카드도 정답 쌍이 될 수 있어요.',rewardDescription:'최초 처치 700 크리스털 · 4분 이내 처치 시 300 크리스털 추가'};
  const reward=elapsed=>700+(elapsed<=240000?300:0);
  function deck(words,shuffle){
    const pool=Array.from(new Map(words.map(entry=>[entry[0].toLowerCase(),entry])).values());
    if(pool.length<5)throw new Error('리치 드래곤은 서로 다른 단어가 5개 이상 필요해요');
    const result=[];let cycle=[];
    while(result.length<HP){
      const used=new Set(result.slice(Math.floor(result.length/5)*5).map(item=>item.entry[0].toLowerCase()));
      if(!cycle.length)cycle=shuffle([...pool]);
      let next=cycle.findIndex(entry=>!used.has(entry[0].toLowerCase())&&entry[0]!==result.at(-1)?.entry[0]);
      if(next<0)next=cycle.findIndex(entry=>!used.has(entry[0].toLowerCase()));
      // A cycle boundary may leave only a word already on this board. Draw an
      // unused word from the next cycle without consuming the pending entries.
      const entry=next>=0?cycle.splice(next,1)[0]:shuffle(pool.filter(entry=>!used.has(entry[0].toLowerCase())))[0];
      result.push({entry,mode:'match'});
    }
    return result;
  }
  function reset(){return {guardian:true,lichDragon:true,crystalSpider:false,bossHp:HP,bossMaxHp:HP,storyTimeLimit:TIME_MS,guardianPhase:'idle',guardianVisual:'idle',guardianRemaining:0,drainQueue:[],drainThresholds:[],drainNotice:'',drainSuccess:false,lichSkillElapsed:0,lichNextTornado:INTERVAL_MS,tornadoMs:0,tornadoContactMs:0,tornadoNoticeMs:0,tornadoCasts:0,selectedCard:null};}
  function board(state,shuffle){
    const start=state.index;
    state.matchBoard=state.deck.slice(start,start+5);
    const pairs=state.matchBoard.map((item,i)=>({entry:item.entry,id:start+i}));
    state.matchKo=shuffle([...pairs]);state.matchEn=shuffle([...pairs]);
    state.lichCards=state.matchKo.flatMap((item,i)=>[{...item,side:'ko'},{...state.matchEn[i],side:'en'}]);
    state.matched=new Set();state.selectedCard=null;state.selectedKo=null;state.selectedEn=null;state.pendingPair=null;state.queuedStoryPairs=[];state.iceTimeActive=false;
  }
  function canPick(state,side,id){return !state.done&&!state.paused&&!state.locked&&!state.stunned&&!state.weavingStepDodging&&state.guardianPhase==='idle'&&!state.matched.has(id)&&state.lichCards.some(card=>card.side===side&&card.id===id);}
  function isCorrect(state,side,id){return Boolean(state.selectedCard&&state.selectedCard.side!==side&&state.selectedCard.id===id);}
  function pick(state,side,id,contactMs){
    if(!canPick(state,side,id))return false;
    const first=state.selectedCard;
    if(!first){state.selectedCard={side,id};state.selectedKo=side==='ko'?id:null;state.selectedEn=side==='en'?id:null;return 'selected';}
    if(first.side===side&&first.id===id){state.selectedCard=null;state.selectedKo=null;state.selectedEn=null;return 'selected';}
    const correct=isCorrect(state,side,id);
    state.selectedCard=null;state.selectedKo=null;state.selectedEn=null;state.locked=true;state.pendingPair=correct?id:null;
    state.guardianPhase=correct?'player-attack':'wrong';state.guardianRemaining=correct?Math.max(1,contactMs):500;
    if(correct)state.attack=true;
    else{state.iceTimeActive=false;state.slashCombo=0;if(state.petEffects)state.petEffects.damage(1);else state.hp=Math.max(0,state.hp-1);state.stunned=true;}
    return correct?'correct':'wrong';
  }
  function clear(state){state.tornadoMs=0;state.tornadoContactMs=0;state.tornadoNoticeMs=0;state.drainQueue=[];state.drainNotice='';state.drainSuccess=false;state.selectedCard=null;state.selectedKo=null;state.selectedEn=null;state.pendingPair=null;state.iceTimeActive=false;}
  function advance(state,delta,random=Math.random,clockDelta=delta,shuffle=items=>{
    const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;
  }){
    if(state.done||state.paused)return [];
    let budget=Math.max(0,delta);const events=[],scale=state.guardianReducedMotion?.5:1;
    const ready=()=>{state.guardianPhase='idle';state.guardianVisual='idle';state.locked=false;events.push(state.matched.size===state.matchBoard.length?'board-ready':'ready');};
    while(budget>0){
      const rate=!state.iceTimeActive&&state.bossHp>0&&state.hp>0?Math.max(0,clockDelta)/delta:0;
      let step=budget;
      if(state.guardianPhase!=='idle')step=Math.min(step,state.guardianRemaining);
      if(state.tornadoMs>0)step=Math.min(step,state.tornadoMs);
      if(state.tornadoContactMs>0)step=Math.min(step,state.tornadoContactMs);
      if(state.tornadoNoticeMs>0)step=Math.min(step,state.tornadoNoticeMs);
      if(rate>0)step=Math.min(step,Math.max(0,(state.lichNextTornado-state.lichSkillElapsed)/rate));
      const flying=state.tornadoContactMs>0,visible=state.tornadoMs>0,notice=state.tornadoNoticeMs>0;
      state.lichSkillElapsed+=step*rate;state.tornadoMs=Math.max(0,state.tornadoMs-step);state.tornadoContactMs=Math.max(0,state.tornadoContactMs-step);state.tornadoNoticeMs=Math.max(0,state.tornadoNoticeMs-step);budget-=step;
      if(visible&&!state.tornadoMs||notice&&!state.tornadoNoticeMs)events.push('tornado-end');
      if(state.guardianPhase!=='idle'){
        state.guardianRemaining-=step;
        if(state.guardianRemaining<=0)switch(state.guardianPhase){
          case 'player-attack':{
            state.matched.add(state.pendingPair);state.pendingPair=null;state.correct++;state.index++;state.answeredCorrect=(state.answeredCorrect||0)+1;
            if(state.matched.size===state.matchBoard.length){const extra=Math.min(HP-state.correct,5*(Math.max(1,state.bossAttackSteps||1)-1));state.correct+=extra;state.index+=extra;state.iceTimeActive=false;}
            const before=state.bossHp;state.bossHp=Math.max(0,HP-state.correct);
            for(const value of THRESHOLDS)if(before>value&&state.bossHp<=value&&!state.drainThresholds.includes(value)){state.drainThresholds.push(value);state.drainQueue.push(value);}
            if(!state.bossHp){state.lichClearElapsed=state.elapsed-budget*rate;clear(state);}
            state.guardianVisual=state.bossHp?'hit':'defeat';state.guardianPhase=state.guardianVisual;state.guardianRemaining=(state.bossHp?300:1000)*scale;events.push('hit');break;
          }
          case 'hit':
            state.attack=false;
            if(state.drainQueue.length){state.drainQueue.shift();state.guardianPhase='drain-charge';state.guardianVisual='attack';state.guardianRemaining=600*scale;state.drainNotice='에너지 드레인';events.push('drain-start');}else ready();break;
          case 'drain-charge':{
            const before=state.hp;state.drainSuccess=random()<SUCCESS_RATE;
            if(state.drainSuccess){if(state.petEffects)state.petEffects.damage(1);else state.hp=Math.max(0,state.hp-1);}
            state.drainSuccess=state.hp<before;state.stunned=state.drainSuccess;state.drainNotice=state.drainSuccess?'에너지 드레인 · HP −1':'에너지 드레인을 막았어요!';state.guardianPhase='drain-hold';state.guardianRemaining=700;events.push(state.drainSuccess?'drain-hit':'drain-miss');break;
          }
          case 'drain-hold':state.stunned=false;state.drainNotice='';state.drainSuccess=false;if(!state.hp){clear(state);events.push('defeat-player');return events;}if(state.drainQueue.length){state.guardianPhase='hit';state.guardianRemaining=1;}else ready();break;
          case 'wrong':state.stunned=false;if(!state.hp){clear(state);events.push('defeat-player');return events;}ready();break;
          case 'defeat':state.attack=false;state.guardianPhase='idle';clear(state);events.push('victory');return events;
          default:throw new Error('Unknown Lich Dragon phase');
        }
      }
      if(flying&&!state.tornadoContactMs&&state.bossHp>0&&state.hp>0){
        state.lichCards=shuffle([...state.lichCards]);state.selectedCard=null;state.selectedKo=null;state.selectedEn=null;state.eagleEyePairId=null;state.tornadoNoticeMs=1200;events.push('tornado-contact');
      }
      if(rate>0&&state.bossHp>0&&state.hp>0&&state.lichSkillElapsed>=state.lichNextTornado){state.lichNextTornado+=INTERVAL_MS;state.tornadoCasts++;state.tornadoMs=900*scale;state.tornadoContactMs=600*scale;events.push('tornado-start');}
    }
    return events;
  }
  window.WORDORIA_LICH_DRAGON={HP,TIME_MS,INTERVAL_MS,SUCCESS_RATE,THRESHOLDS,INFO,reward,deck,reset,board,canPick,isCorrect,pick,clear,advance};
})();
