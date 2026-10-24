/* World 7A-30: matching, flame shuffle and threshold sword strikes. */
(() => {
  'use strict';
  const HP=180,TIME_MS=330000,INTERVAL_MS=12000;
  const THRESHOLDS=[90,45],RELEASE_MS=360,CONTACT_MS=610,SKILL_MS=790;
  const SPRITE_ROOT='assets/monsters/world-7a/red-skull-knight/',ART='assets/novel/characters/char_red_skull_knight_world7a_standing.webp';
  const INFO={name:'레드스컬나이트',description:'불타는 고대 탑의 마지막 지휘관. 차원 포털 미러를 지켜요.',hp:HP,time:'5분',art:ART,skill:'화염 파동',skillDescription:'12초마다 불길로 양쪽 카드를 다시 섞어요.',skill2:'홍염 참격',skill2Description:'HP 50%·25%에 각각 한 번 검을 휘둘러 플레이어 HP를 1 깎아요.'};
  const ANIMATIONS={idle:[600,600],attack:[200,220,300],hit:[120,160,800]};
  const scale=s=>s.guardianReducedMotion ? .4 : 1;
  function reset(){return {guardian:true,redSkullKnight:true,bossHp:HP,bossMaxHp:HP,storyTimeLimit:TIME_MS,guardianPhase:'idle',guardianRemaining:0,knightClock:0,knightNextStorm:INTERVAL_MS,knightQueue:[],knightThresholds:[],knightSkill:null,knightSkillMs:0,knightContact:false,knightNotice:'',knightNoticeMs:0,knightPlayerHit:false,selectedKo:null,selectedEn:null,pendingPair:null};}
  function clear(s){s.knightQueue=[];s.knightSkill=null;s.knightSkillMs=0;s.knightContact=false;s.knightNotice='';s.knightNoticeMs=0;s.knightPlayerHit=false;s.iceTimeActive=false;s.selectedKo=null;s.selectedEn=null;s.pendingPair=null;s.queuedStoryPairs=[];}
  function deck(words,shuffle){
    const pool=Array.from(new Map(words.map(e=>[e[0].toLowerCase(),e])).values());
    if(pool.length<5)throw Error('레드스컬나이트은 서로 다른 단어가 5개 이상 필요해요');
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
  function shuffleBoard(s,shuffle){
    for(const key of ['matchKo','matchEn']){const old=s[key],next=shuffle([...old]);s[key]=next.length>1&&next.every((x,i)=>x.id===old[i].id)?[...next.slice(1),next[0]]:next;}
    s.selectedKo=null;s.selectedEn=null;s.pendingPair=null;s.queuedStoryPairs=[];s.eagleEyeActive=false;s.eagleEyePairId=null;s.eagleEyeRemoved=[];
  }
  function pick(s,side,id,contactMs){
    if(s.done||s.paused||s.locked||s.stunned||s.weavingStepDodging||s.hp<=0||s.bossHp<=0||s.guardianPhase!=='idle'||!['ko','en'].includes(side)||s.matched.has(id)||!s.matchEn.some(x=>x.id===id))return false;
    s[side==='ko'?'selectedKo':'selectedEn']=id;if(s.selectedKo===null||s.selectedEn===null)return 'selected';
    const correct=s.selectedKo===s.selectedEn;s.pendingPair=correct?id:null;s.selectedKo=null;s.selectedEn=null;s.locked=true;s.guardianPhase=correct?'player-attack':'wrong';s.guardianRemaining=correct?Math.max(1,contactMs):500*scale(s);
    if(correct){s.attack=true;s.answeredCorrect=(s.answeredCorrect||0)+1;}
    else{s.iceTimeActive=false;s.timeStopped=false;s.slashCombo=0;s.stunned=true;if(s.petEffects)s.petEffects.damage(1);else s.hp=Math.max(0,s.hp-1);}
    return correct?'correct':'wrong';
  }
  function visual(s){
    let action='idle',elapsed=s.guardianReducedMotion?0:s.knightClock%1200;
    if(s.guardianPhase==='defeat'){action='hit';elapsed=860-s.guardianRemaining/scale(s);}
    else if(s.guardianPhase==='hit'){action='hit';elapsed=120;}
    else if(s.knightSkill){action='attack';elapsed=s.knightSkillMs/scale(s);}
    const durations=ANIMATIONS[action];let frame=0;while(frame<durations.length-1&&elapsed>=durations[frame]){elapsed-=durations[frame];frame++;}
    return {action,frame,count:durations.length,width:480,height:320};
  }
  function projectiles(s){
    if(!s.knightSkill)return [];
    const elapsed=s.knightSkillMs/scale(s),age=elapsed-RELEASE_MS;
    return age>=0&&elapsed<SKILL_MS?[{kind:s.knightSkill==='flame-wave'?'wave':'slash',progress:Math.min(1,age/250),frame:age<110?0:age<250?1:2}]:[];
  }
  function startQueuedSkill(s,events){
    if(s.bossHp<=0||s.guardianPhase!=='idle'||s.iceTimeActive||!s.knightQueue.length)return;
    s.knightSkill=s.knightQueue.shift();s.knightSkillMs=0;s.knightContact=false;s.guardianPhase='boss-skill';s.guardianRemaining=SKILL_MS*scale(s);s.locked=true;
    s.knightNotice=s.knightSkill==='flame-wave'?'화염 파동!':'홍염 참격!';s.knightNoticeMs=1200;events.push('skill-start');
  }
  function advance(s,delta,shuffle,clockDelta=delta){
    if(s.done||s.paused)return [];
    const events=[],m=scale(s);let budget=Math.max(0,delta);
    while(budget>0){
      if(s.hp<=0){clear(s);events.push('defeat-player');return events;}
      startQueuedSkill(s,events);
      const phase=s.guardianPhase,rate=delta>0&&!s.iceTimeActive&&s.bossHp>0?Math.max(0,clockDelta)/delta:0;
      let step=budget;
      if(phase!=='idle')step=Math.min(step,s.guardianRemaining);
      if(rate>0)step=Math.min(step,Math.max(0,s.knightNextStorm-s.knightClock)/rate);
      if(s.knightSkill){const edge=s.knightSkillMs<RELEASE_MS*m?RELEASE_MS*m:!s.knightContact?CONTACT_MS*m:SKILL_MS*m;step=Math.min(step,Math.max(0,edge-s.knightSkillMs));}
      if(s.knightNoticeMs>0)step=Math.min(step,s.knightNoticeMs);
      budget-=step;s.knightClock+=step*rate;
      if(s.knightNoticeMs>0){s.knightNoticeMs=Math.max(0,s.knightNoticeMs-step);if(!s.knightNoticeMs){s.knightNotice='';s.knightPlayerHit=false;events.push('notice-end');}}
      if(s.knightSkill){
        const before=s.knightSkillMs;s.knightSkillMs+=step;
        if(before<RELEASE_MS*m&&s.knightSkillMs>=RELEASE_MS*m)events.push('release');
        if(!s.knightContact&&s.knightSkillMs>=CONTACT_MS*m){
          s.knightContact=true;
          if(s.knightSkill==='flame-wave'){shuffleBoard(s,shuffle);s.knightNotice='화염 파동 · 카드가 섞였어요!';events.push('shuffle');}
          else{if(s.petEffects)s.petEffects.damage(1);else s.hp=Math.max(0,s.hp-1);s.knightPlayerHit=true;s.knightNotice='홍염 참격 · HP −1';events.push('trident-hit');}
          s.knightNoticeMs=900;
          if(s.hp<=0){clear(s);events.push('defeat-player');return events;}
        }
      }
      if(phase!=='idle'){
        s.guardianRemaining=Math.max(0,s.guardianRemaining-step);
        if(!s.guardianRemaining){
          if(phase==='player-attack'){
            s.matched.add(s.pendingPair);s.pendingPair=null;s.correct++;s.index++;
            const old=s.bossHp;s.bossHp=Math.max(0,old-Math.max(1,s.bossAttackSteps||1));
            if(s.matched.size===s.matchBoard.length)s.iceTimeActive=false;
            if(!s.bossHp)clear(s);
            else for(const hp of THRESHOLDS)if(old>hp&&s.bossHp<=hp&&!s.knightThresholds.includes(hp)){s.knightThresholds.push(hp);s.knightQueue.push('flame-slash');}
            s.guardianPhase=s.bossHp?'hit':'defeat';s.guardianRemaining=(s.bossHp?300:860)*m;events.push('hit');
          }else if(phase==='defeat'){events.push('victory');return events;}
          else{
            s.knightSkill=null;s.knightSkillMs=0;s.knightContact=false;s.attack=false;s.stunned=false;s.locked=false;s.guardianPhase='idle';
            events.push(phase!=='boss-skill'&&s.matched.size===s.matchBoard.length?'board-ready':'ready');
          }
        }
      }
      if(s.bossHp>0&&rate>0&&s.knightClock>=s.knightNextStorm){s.knightNextStorm+=INTERVAL_MS;s.knightQueue.push('flame-wave');}
      startQueuedSkill(s,events);
    }return events;
  }
  window.WORDORIA_RED_SKULL_KNIGHT={HP,TIME_MS,INTERVAL_MS,THRESHOLDS,RELEASE_MS,CONTACT_MS,SKILL_MS,SPRITE_ROOT,ART,INFO,ANIMATIONS,reset,clear,deck,board,pick,advance,visual,projectiles,shuffleBoard};
})();
