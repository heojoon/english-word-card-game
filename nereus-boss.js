/* World 7B-15: five-pair matching, three independently rolled spear contacts. */
(() => {
  'use strict';
  const HP=200,TIME_MS=300000,INTERVAL_MS=10000,HIT_CHANCE=.12,SPEED_MS=10000;
  const THROW_INTERVAL_MS=500,RELEASE_MS=400,FLIGHT_MS=600,IMPACT_MS=80,DISSOLVE_MS=120;
  const VOLLEY_MS=RELEASE_MS+2*THROW_INTERVAL_MS+FLIGHT_MS+IMPACT_MS+DISSOLVE_MS;
  const contactAt=index=>RELEASE_MS+index*THROW_INTERVAL_MS+FLIGHT_MS;
  const THRESHOLDS=[100,80,60,40,20],SPRITE_ROOT='assets/monsters/nereus/';
  const ART='assets/novel/characters/char_nereus_world7b_standing.webp';
  const INFO={name:'흑조의 창기사 네레우스',description:'검은 호수의 다리를 지키는 세이렌 기사. 세 갈래 물결처럼 창을 연달아 던지고, 물안개 속으로 사라져 침입자의 눈을 가려요.',hp:HP,time:'5분',art:ART,skill:'삼연창',skillDescription:'10초마다 0.5초 간격으로 1.5초 동안 창을 3번 던져요. 창마다 독립적으로 12% 확률로 플레이어 HP 1을 깎아요.',skill2:'고속이동',skill2Description:'HP 50%·40%·30%·20%·10%에 각각 한 번 발동해요. 몸을 흔들고 사라지며 10초간 모든 영어 카드를 *로 가려요.'};
  const ANIMATIONS={idle:[350,350,350],attack:[200,200,100],speed:[120,120,240],hit:[140,180,600]};
  const scale=s=>s.guardianReducedMotion?.5:1;
  function reset(){return {guardian:true,nereus:true,bossHp:HP,bossMaxHp:HP,storyTimeLimit:TIME_MS,guardianPhase:'idle',guardianVisual:'idle',guardianRemaining:0,nereusClock:0,nereusNextSpear:INTERVAL_MS,nereusVolleyMs:0,nereusContacts:0,nereusSpeedMs:0,nereusSpeedPending:0,nereusThresholds:[],nereusNotice:'',nereusNoticeMs:0,nereusPlayerHit:false,selectedKo:null,selectedEn:null,pendingPair:null};}
  function clear(s){s.nereusVolleyMs=0;s.nereusContacts=0;s.nereusSpeedMs=0;s.nereusSpeedPending=0;s.nereusNotice='';s.nereusNoticeMs=0;s.nereusPlayerHit=false;s.iceTimeActive=false;s.selectedKo=null;s.selectedEn=null;s.pendingPair=null;s.queuedStoryPairs=[];}
  function deck(words,shuffle){
    const pool=Array.from(new Map(words.map(e=>[e[0].toLowerCase(),e])).values());
    if(pool.length<5)throw Error('네레우스는 서로 다른 단어가 5개 이상 필요해요');
    const out=[];let cycle=[];
    while(out.length<HP){
      const board=[];
      while(board.length<5){
        if(!cycle.length){const used=new Set(board.map(e=>e[0].toLowerCase())),fresh=shuffle([...pool]);cycle=[...fresh.filter(e=>!used.has(e[0].toLowerCase())&&e[0]!==out.at(-1)?.entry[0]),...fresh.filter(e=>used.has(e[0].toLowerCase())||e[0]===out.at(-1)?.entry[0])];}
        const entry=cycle.shift();board.push(entry);out.push({entry,mode:'match'});
      }
    }return out;
  }
  function board(s,shuffle){s.matchBoard=s.deck.slice(s.index,s.index+5);const pairs=s.matchBoard.map((x,i)=>({entry:x.entry,id:s.index+i}));s.matchKo=shuffle([...pairs]);s.matchEn=shuffle([...pairs]);s.matched=new Set();s.selectedKo=null;s.selectedEn=null;s.pendingPair=null;s.queuedStoryPairs=[];s.iceTimeActive=false;}
  function pick(s,side,id,contactMs){
    if(s.done||s.paused||s.locked||s.stunned||s.weavingStepDodging||s.hp<=0||s.bossHp<=0||s.guardianPhase!=='idle'||!['ko','en'].includes(side)||s.matched.has(id)||!s.matchEn.some(x=>x.id===id))return false;
    s[side==='ko'?'selectedKo':'selectedEn']=id;if(s.selectedKo===null||s.selectedEn===null)return 'selected';
    const correct=s.selectedKo===s.selectedEn;s.pendingPair=correct?id:null;s.selectedKo=null;s.selectedEn=null;s.locked=true;s.guardianPhase=correct?'player-attack':'wrong';s.guardianRemaining=correct?Math.max(1,contactMs):500*scale(s);
    if(correct){s.attack=true;s.answeredCorrect=(s.answeredCorrect||0)+1;}
    else{s.iceTimeActive=false;s.slashCombo=0;s.stunned=true;if(s.activeSkills)s.activeSkills.damage(1);else if(s.petEffects)s.petEffects.damage(1);else s.hp=Math.max(0,s.hp-1);}
    return correct?'correct':'wrong';
  }
  function hidden(s){return s.nereusSpeedMs>0&&s.nereusSpeedMs<=SPEED_MS-480*scale(s)&&s.guardianPhase!=='defeat';}
  function englishLabel(s,entry){return s.nereusSpeedMs>0?'*'.repeat(Array.from(entry[0]).length):entry[0];}
  function visual(s){
    let action='idle',elapsed=s.guardianReducedMotion?0:s.nereusClock%1050;
    if(s.guardianPhase==='defeat'){action='hit';elapsed=(920*scale(s)-s.guardianRemaining)/scale(s);}
    else if(s.nereusSpeedMs>SPEED_MS-480*scale(s)){action='speed';elapsed=(SPEED_MS-s.nereusSpeedMs)/scale(s);}
    else if(s.guardianPhase==='hit'){action='hit';elapsed=140;}
    else if(s.nereusVolleyMs>0){action='attack';elapsed=Math.min(3*THROW_INTERVAL_MS-1,VOLLEY_MS-s.nereusVolleyMs/scale(s))%THROW_INTERVAL_MS;}
    else if(s.nereusSpeedMs>0){action='speed';elapsed=Math.min(479,(SPEED_MS-s.nereusSpeedMs)/scale(s));}
    const durations=ANIMATIONS[action];let frame=0;while(frame<durations.length-1&&elapsed>=durations[frame]){elapsed-=durations[frame];frame++;}
    return {action,frame,count:durations.length,width:448,height:320};
  }
  function projectiles(s){
    if(s.nereusVolleyMs<=0)return [];
    const elapsed=VOLLEY_MS-s.nereusVolleyMs/scale(s);
    return [0,1,2].flatMap(i=>{const age=elapsed-(RELEASE_MS+i*THROW_INTERVAL_MS);return age>=0&&age<FLIGHT_MS+IMPACT_MS+DISSOLVE_MS?[{id:i,progress:Math.min(1,age/FLIGHT_MS),frame:age<FLIGHT_MS?0:age<FLIGHT_MS+IMPACT_MS?1:2}]:[];});
  }
  function advance(s,delta,random=Math.random,clockDelta=delta){
    if(s.done||s.paused)return [];
    const events=[],m=scale(s);let budget=Math.max(0,delta);
    while(budget>0){
      if(s.hp<=0){clear(s);events.push('defeat-player');return events;}
      const alive=s.bossHp>0,rate=delta>0&&!s.iceTimeActive&&alive?Math.max(0,clockDelta)/delta:0,phase=s.guardianPhase;
      let step=budget;
      if(phase!=='idle')step=Math.min(step,s.guardianRemaining);
      if(rate>0){step=Math.min(step,(s.nereusNextSpear-s.nereusClock)/rate);if(s.nereusSpeedMs>0)step=Math.min(step,s.nereusSpeedMs/rate);}
      if(s.nereusVolleyMs>0){step=Math.min(step,s.nereusVolleyMs);if(s.nereusContacts<3)step=Math.min(step,s.nereusVolleyMs-(VOLLEY_MS-contactAt(s.nereusContacts))*m);}
      if(s.nereusNoticeMs>0)step=Math.min(step,s.nereusNoticeMs);
      const volley=s.nereusVolleyMs>0,speed=s.nereusSpeedMs>0,noticing=s.nereusNoticeMs>0;
      budget-=step;s.nereusClock+=step*rate;s.nereusVolleyMs=Math.max(0,s.nereusVolleyMs-step);s.nereusSpeedMs=Math.max(0,s.nereusSpeedMs-step*rate);s.nereusNoticeMs=Math.max(0,s.nereusNoticeMs-step);
      if(noticing&&!s.nereusNoticeMs){s.nereusNotice='';s.nereusPlayerHit=false;events.push('notice-end');}
      if(speed&&!s.nereusSpeedMs)events.push('speed-end');
      if(phase!=='idle'){
        s.guardianRemaining-=step;
        if(s.guardianRemaining<=0){
          if(phase==='player-attack'){
            s.matched.add(s.pendingPair);s.pendingPair=null;s.correct++;s.index++;
            const old=s.bossHp;s.bossHp=Math.max(0,s.bossHp-(s.activeSkills?.attackDamage(Math.max(1,s.bossAttackSteps||1))??Math.max(1,s.bossAttackSteps||1)));
            if(s.matched.size===s.matchBoard.length)s.iceTimeActive=false;
            if(!s.bossHp)clear(s);
            else for(const hp of THRESHOLDS)if(old>hp&&s.bossHp<=hp&&!s.nereusThresholds.includes(hp)){s.nereusThresholds.push(hp);s.nereusSpeedPending++;}
            s.guardianVisual=s.bossHp?'hit':'defeat';s.guardianPhase=s.guardianVisual;s.guardianRemaining=(s.bossHp?300:920)*m;events.push('hit');
          }else if(phase==='defeat'){events.push('victory');return events;}
          else{s.attack=false;s.stunned=false;s.locked=false;s.guardianPhase='idle';s.guardianVisual='idle';events.push(s.matched.size===s.matchBoard.length?'board-ready':'ready');}
        }
      }
      if(s.bossHp>0&&volley&&s.nereusContacts<3&&s.nereusVolleyMs<=(VOLLEY_MS-contactAt(s.nereusContacts))*m){
        s.nereusContacts++;const hit=random()<HIT_CHANCE;
        if(hit){if(s.activeSkills)s.activeSkills.damage(1);else if(s.petEffects)s.petEffects.damage(1);else s.hp=Math.max(0,s.hp-1);s.nereusPlayerHit=true;}
        s.nereusNotice=hit?'삼연창 · HP −1':'삼연창 · 창을 피했어요!';s.nereusNoticeMs=500;events.push(hit?'spear-hit':'spear-miss');
        if(s.hp<=0){clear(s);events.push('defeat-player');return events;}
      }
      if(volley&&!s.nereusVolleyMs)events.push('volley-end');
      if(s.bossHp>0&&rate>0&&s.nereusClock>=s.nereusNextSpear){s.nereusNextSpear+=INTERVAL_MS;s.nereusVolleyMs=VOLLEY_MS*m;s.nereusContacts=0;s.nereusNotice='삼연창!';s.nereusNoticeMs=1500;events.push('volley-start');}
      if(s.bossHp>0&&!s.nereusSpeedMs&&s.nereusSpeedPending>0){s.nereusSpeedPending--;s.nereusSpeedMs=SPEED_MS;s.nereusNotice='고속이동 · 영어 카드가 가려졌어요!';s.nereusNoticeMs=1200;events.push('speed-start');}
    }return events;
  }
  window.WORDORIA_NEREUS={HP,TIME_MS,INTERVAL_MS,HIT_CHANCE,SPEED_MS,THROW_INTERVAL_MS,RELEASE_MS,FLIGHT_MS,IMPACT_MS,DISSOLVE_MS,VOLLEY_MS,THRESHOLDS,SPRITE_ROOT,ART,INFO,ANIMATIONS,reset,clear,deck,board,pick,advance,visual,hidden,englishLabel,projectiles};
})();
