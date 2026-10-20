/* World 6A-20: freely mixed matching cards, chaos rotations and one full heal. */
(() => {
  'use strict';
  const HP=200,TIME_MS=300000,INTERVAL_MS=20000,CHAOS_MS=10000,SHIFT_MS=800,HEAL_THRESHOLD=60,HEAL_MS=1600;
  const ART='assets/monsters/morgana/morgana-standing.webp';
  const SPRITE='assets/monsters/morgana/morgana-sd.png';
  const INFO={name:'모르가나',description:'심연의 주인',hp:HP,time:'5분',art:ART,skill:'혼돈의 저주',skillDescription:'20초마다 10초 동안 영어·한글 카드를 모두 섞고 왼쪽 열은 위로, 오른쪽 열은 아래로 움직여요. 같은 열의 위아래 카드도 연결할 수 있어요. 플레이어는 빙글빙글 회전해요.',skill2:'리프레시힐',skill2Description:'HP가 30% 이하가 되면 한 번만 하얀 별빛 원에 감싸여 HP를 100%까지 회복해요.',rewardDescription:'최초 처치 보상 500 크리스털'};
  function deck(words,shuffle){
    const pool=Array.from(new Map(words.map(entry=>[entry[0].toLowerCase(),entry])).values());
    if(pool.length<5)throw Error('모르가나는 서로 다른 단어가 5개 이상 필요해요');
    const result=[];let cycle=[];
    // A full heal requires up to 340 damage. Keep an additional vocabulary reserve.
    while(result.length<400){
      const used=new Set(result.slice(Math.floor(result.length/5)*5).map(x=>x.entry[0].toLowerCase()));
      if(!cycle.length)cycle=shuffle([...pool]);
      let next=cycle.findIndex(entry=>!used.has(entry[0].toLowerCase())&&entry[0]!==result.at(-1)?.entry[0]);
      if(next<0)next=cycle.findIndex(entry=>!used.has(entry[0].toLowerCase()));
      const entry=next>=0?cycle.splice(next,1)[0]:shuffle(pool.filter(entry=>!used.has(entry[0].toLowerCase())))[0];
      result.push({entry,mode:'match'});
    }
    return result;
  }
  function reset(){return {guardian:true,morgana:true,crystalSpider:false,golemMob:false,bossHp:HP,bossMaxHp:HP,storyTimeLimit:TIME_MS,guardianPhase:'idle',guardianVisual:'idle',guardianRemaining:0,morganaSkillElapsed:0,morganaNextChaos:INTERVAL_MS,chaosMs:0,chaosShiftMs:0,chaosAngle:0,morganaHealUsed:false,morganaHealMs:0,selectedCard:null,pendingPair:null};}
  function mix(state,shuffle){
    const cards=shuffle(state.morganaCards.slice());
    // Guarantee a visible change even when the random permutation is the identity.
    if(cards.every((c,i)=>c===state.morganaCards[i]))cards.push(cards.shift());
    state.morganaCards=cards;state.selectedCard=null;state.selectedKo=null;state.selectedEn=null;state.eagleEyePairId=null;
  }
  function board(state,shuffle){
    state.matchBoard=state.deck.slice(state.index,state.index+5);
    const pairs=state.matchBoard.map((item,i)=>({entry:item.entry,id:state.index+i}));
    state.matchKo=shuffle([...pairs]);state.matchEn=shuffle([...pairs]);
    state.morganaCards=state.matchKo.flatMap((item,i)=>[{...item,side:'ko'},{...state.matchEn[i],side:'en'}]);
    state.matched=new Set();state.selectedCard=null;state.selectedKo=null;state.selectedEn=null;state.pendingPair=null;state.queuedStoryPairs=[];state.iceTimeActive=false;
    if(state.chaosMs>0)mix(state,shuffle);
  }
  function canPick(s,side,id){return !s.done&&!s.paused&&!s.locked&&!s.stunned&&!s.weavingStepDodging&&s.guardianPhase==='idle'&&!s.matched.has(id)&&s.morganaCards.some(c=>c.side===side&&c.id===id);}
  const isCorrect=(s,side,id)=>Boolean(s.selectedCard&&s.selectedCard.side!==side&&s.selectedCard.id===id);
  function pick(s,side,id,contactMs){
    if(!canPick(s,side,id))return false;
    const first=s.selectedCard;
    if(!first){s.selectedCard={side,id};s.selectedKo=side==='ko'?id:null;s.selectedEn=side==='en'?id:null;return 'selected';}
    if(first.side===side&&first.id===id){s.selectedCard=null;s.selectedKo=null;s.selectedEn=null;return 'selected';}
    const correct=isCorrect(s,side,id);
    s.selectedCard=null;s.selectedKo=null;s.selectedEn=null;s.locked=true;s.pendingPair=correct?id:null;
    s.guardianPhase=correct?'player-attack':'wrong';s.guardianRemaining=correct?Math.max(1,contactMs):500;
    if(correct)s.attack=true;
    else{s.iceTimeActive=false;s.slashCombo=0;if(s.petEffects)s.petEffects.damage(1);else s.hp=Math.max(0,s.hp-1);s.stunned=true;}
    return correct?'correct':'wrong';
  }
  function clear(s){s.chaosMs=0;s.chaosShiftMs=0;s.chaosAngle=0;s.morganaHealMs=0;s.selectedCard=null;s.selectedKo=null;s.selectedEn=null;s.pendingPair=null;s.queuedStoryPairs=[];s.iceTimeActive=false;}
  function shift(s){
    const left=s.morganaCards.filter((_,i)=>i%2===0),right=s.morganaCards.filter((_,i)=>i%2===1);
    left.push(left.shift());right.unshift(right.pop());
    s.morganaCards=left.flatMap((c,i)=>[c,right[i]]);
  }
  function advance(s,delta,random=Math.random,clockDelta=delta,shuffle=items=>{
    const result=items.slice();for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;
  }){
    if(s.done||s.paused||delta<=0)return [];
    let budget=delta;const events=[],scale=s.guardianReducedMotion?.5:1;
    const ready=()=>{s.guardianPhase='idle';s.guardianVisual='idle';s.locked=false;events.push(s.matched.size===s.matchBoard.length?'board-ready':'ready');};
    while(budget>0){
      const rate=!s.iceTimeActive&&s.bossHp>0&&s.hp>0?Math.max(0,clockDelta)/delta:0;
      let step=budget;
      if(s.guardianPhase!=='idle')step=Math.min(step,s.guardianRemaining);
      if(s.morganaHealMs>0)step=Math.min(step,s.morganaHealMs);
      if(rate>0){
        step=Math.min(step,Math.max(0,(s.morganaNextChaos-s.morganaSkillElapsed)/rate));
        if(s.chaosMs>0)step=Math.min(step,s.chaosMs/rate,(SHIFT_MS-s.chaosShiftMs)/rate);
      }
      const active=s.chaosMs>0,healing=s.morganaHealMs>0;
      s.morganaSkillElapsed+=step*rate;budget-=step;
      if(active){s.chaosMs=Math.max(0,s.chaosMs-step*rate);s.chaosShiftMs+=step*rate;s.chaosAngle=(s.chaosAngle+step*rate*.36)%360;}
      s.morganaHealMs=Math.max(0,s.morganaHealMs-step);
      if(healing&&!s.morganaHealMs)events.push('heal-end');
      if(active){
        if(s.chaosMs>0&&s.chaosShiftMs>=SHIFT_MS){s.chaosShiftMs-=SHIFT_MS;shift(s);events.push('chaos-shift');}
        if(!s.chaosMs){s.chaosShiftMs=0;s.chaosAngle=0;events.push('chaos-end');}
      }
      if(s.guardianPhase!=='idle'){
        s.guardianRemaining-=step;
        if(s.guardianRemaining<=0)switch(s.guardianPhase){
          case 'player-attack':{
            s.matched.add(s.pendingPair);s.pendingPair=null;s.correct++;s.index++;s.answeredCorrect=(s.answeredCorrect||0)+1;
            let damage=1;
            if(s.matched.size===s.matchBoard.length){damage+=5*(Math.max(1,s.bossAttackSteps||1)-1);s.iceTimeActive=false;}
            s.bossHp=Math.max(0,s.bossHp-damage);
            // The single refresh triggers even if a large hit crosses zero at the threshold.
            if(!s.morganaHealUsed&&s.bossHp<=HEAL_THRESHOLD){s.morganaHealUsed=true;s.morganaHealMs=HEAL_MS;s.bossHp=HP;events.push('heal-start');}
            if(!s.bossHp)clear(s);
            s.guardianVisual=s.bossHp?'hit':'defeat';s.guardianPhase=s.guardianVisual;s.guardianRemaining=(s.bossHp?300:1000)*scale;events.push('hit');break;
          }
          case 'hit':s.attack=false;ready();break;
          case 'wrong':s.stunned=false;if(!s.hp){clear(s);events.push('defeat-player');return events;}ready();break;
          case 'defeat':s.attack=false;clear(s);events.push('victory');return events;
          default:throw Error('Unknown Morgana phase');
        }
      }
      if(rate>0&&s.bossHp>0&&s.hp>0&&s.morganaSkillElapsed>=s.morganaNextChaos){
        s.morganaNextChaos+=INTERVAL_MS;s.chaosMs=CHAOS_MS;s.chaosShiftMs=0;s.chaosAngle=0;mix(s,shuffle);events.push('chaos-start');
      }
    }
    return events;
  }
  window.WORDORIA_MORGANA={HP,TIME_MS,INTERVAL_MS,CHAOS_MS,SHIFT_MS,HEAL_THRESHOLD,HEAL_MS,ART,SPRITE,INFO,deck,reset,board,canPick,isCorrect,pick,clear,advance};
})();
