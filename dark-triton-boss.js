/* World 7B-30: matching, tidal card shuffle and threshold trident throws. */
(() => {
  'use strict';
  const HP=220,TIME_MS=300000,INTERVAL_MS=10000;
  const THRESHOLDS=[110,88,66,44,22],RELEASE_MS=360,CONTACT_MS=610,SKILL_MS=790;
  const SPRITE_ROOT='assets/monsters/dark-triton/',ART=SPRITE_ROOT+'dark-triton-standing.png';
  const INFO={name:'다크 트라이튼',description:'검은 호수의 메아리에 잠식된 인어 왕. 조개 왕좌에 군림하며 크리스털 삼지창으로 검은 물결을 다스려요.',hp:HP,time:'5분',art:ART,skill:'스톰서지',skillDescription:'10초마다 해일을 날려 한글·영어 카드를 무작위로 섞어요.',skill2:'트라이던트 쓰루',skill2Description:'HP 50%·40%·30%·20%·10%에 각각 한 번 삼지창을 던져 플레이어 HP를 1 깎아요.'};
  const ANIMATIONS={idle:[600,600],stormsurge:[180,180,240],'trident-throw':[180,180,240],hit:[120,140,600]};
  const scale=s=>s.guardianReducedMotion ? .4 : 1;
  function reset(){return {guardian:true,darkTriton:true,bossHp:HP,bossMaxHp:HP,storyTimeLimit:TIME_MS,guardianPhase:'idle',guardianRemaining:0,tritonClock:0,tritonNextStorm:INTERVAL_MS,tritonQueue:[],tritonThresholds:[],tritonSkill:null,tritonSkillMs:0,tritonContact:false,tritonNotice:'',tritonNoticeMs:0,tritonPlayerHit:false,selectedKo:null,selectedEn:null,pendingPair:null};}
  function clear(s){s.tritonQueue=[];s.tritonSkill=null;s.tritonSkillMs=0;s.tritonContact=false;s.tritonNotice='';s.tritonNoticeMs=0;s.tritonPlayerHit=false;s.iceTimeActive=false;s.selectedKo=null;s.selectedEn=null;s.pendingPair=null;s.queuedStoryPairs=[];}
  function deck(words,shuffle){
    const pool=Array.from(new Map(words.map(e=>[e[0].toLowerCase(),e])).values());
    if(pool.length<5)throw Error('다크 트라이튼은 서로 다른 단어가 5개 이상 필요해요');
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
    else{s.iceTimeActive=false;s.timeStopped=false;s.slashCombo=0;s.stunned=true;if(s.activeSkills)s.activeSkills.damage(1);else if(s.petEffects)s.petEffects.damage(1);else s.hp=Math.max(0,s.hp-1);}
    return correct?'correct':'wrong';
  }
  function visual(s){
    let action='idle',elapsed=s.guardianReducedMotion?0:s.tritonClock%1200;
    if(s.guardianPhase==='defeat'){action='hit';elapsed=860-s.guardianRemaining/scale(s);}
    else if(s.guardianPhase==='hit'){action='hit';elapsed=120;}
    else if(s.tritonSkill){action=s.tritonSkill;elapsed=s.tritonSkillMs/scale(s);}
    const durations=ANIMATIONS[action];let frame=0;while(frame<durations.length-1&&elapsed>=durations[frame]){elapsed-=durations[frame];frame++;}
    return {action,frame,count:durations.length,width:480,height:320};
  }
  function projectiles(s){
    if(!s.tritonSkill)return [];
    const elapsed=s.tritonSkillMs/scale(s),age=elapsed-RELEASE_MS;
    return age>=0&&elapsed<SKILL_MS?[{kind:s.tritonSkill==='stormsurge'?'wave':'trident',progress:Math.min(1,age/250),frame:age<110?0:age<250?1:2}]:[];
  }
  function startQueuedSkill(s,events){
    if(s.bossHp<=0||s.guardianPhase!=='idle'||s.iceTimeActive||!s.tritonQueue.length)return;
    s.tritonSkill=s.tritonQueue.shift();s.tritonSkillMs=0;s.tritonContact=false;s.guardianPhase='boss-skill';s.guardianRemaining=SKILL_MS*scale(s);s.locked=true;
    s.tritonNotice=s.tritonSkill==='stormsurge'?'스톰서지!':'트라이던트 쓰루!';s.tritonNoticeMs=1200;events.push('skill-start');
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
      if(rate>0)step=Math.min(step,Math.max(0,s.tritonNextStorm-s.tritonClock)/rate);
      if(s.tritonSkill){const edge=s.tritonSkillMs<RELEASE_MS*m?RELEASE_MS*m:!s.tritonContact?CONTACT_MS*m:SKILL_MS*m;step=Math.min(step,Math.max(0,edge-s.tritonSkillMs));}
      if(s.tritonNoticeMs>0)step=Math.min(step,s.tritonNoticeMs);
      budget-=step;s.tritonClock+=step*rate;
      if(s.tritonNoticeMs>0){s.tritonNoticeMs=Math.max(0,s.tritonNoticeMs-step);if(!s.tritonNoticeMs){s.tritonNotice='';s.tritonPlayerHit=false;events.push('notice-end');}}
      if(s.tritonSkill){
        const before=s.tritonSkillMs;s.tritonSkillMs+=step;
        if(before<RELEASE_MS*m&&s.tritonSkillMs>=RELEASE_MS*m)events.push('release');
        if(!s.tritonContact&&s.tritonSkillMs>=CONTACT_MS*m){
          s.tritonContact=true;
          if(s.tritonSkill==='stormsurge'){shuffleBoard(s,shuffle);s.tritonNotice='스톰서지 · 카드가 섞였어요!';events.push('shuffle');}
          else{if(s.activeSkills)s.activeSkills.damage(1);else if(s.petEffects)s.petEffects.damage(1);else s.hp=Math.max(0,s.hp-1);s.tritonPlayerHit=true;s.tritonNotice='트라이던트 쓰루 · HP −1';events.push('trident-hit');}
          s.tritonNoticeMs=900;
          if(s.hp<=0){clear(s);events.push('defeat-player');return events;}
        }
      }
      if(phase!=='idle'){
        s.guardianRemaining=Math.max(0,s.guardianRemaining-step);
        if(!s.guardianRemaining){
          if(phase==='player-attack'){
            s.matched.add(s.pendingPair);s.pendingPair=null;s.correct++;s.index++;
            const old=s.bossHp;s.bossHp=Math.max(0,old-(s.activeSkills?.attackDamage(Math.max(1,s.bossAttackSteps||1))??Math.max(1,s.bossAttackSteps||1)));
            if(s.matched.size===s.matchBoard.length)s.iceTimeActive=false;
            if(!s.bossHp)clear(s);
            else for(const hp of THRESHOLDS)if(old>hp&&s.bossHp<=hp&&!s.tritonThresholds.includes(hp)){s.tritonThresholds.push(hp);s.tritonQueue.push('trident-throw');}
            s.guardianPhase=s.bossHp?'hit':'defeat';s.guardianRemaining=(s.bossHp?300:860)*m;events.push('hit');
          }else if(phase==='defeat'){events.push('victory');return events;}
          else{
            s.tritonSkill=null;s.tritonSkillMs=0;s.tritonContact=false;s.attack=false;s.stunned=false;s.locked=false;s.guardianPhase='idle';
            events.push(phase!=='boss-skill'&&s.matched.size===s.matchBoard.length?'board-ready':'ready');
          }
        }
      }
      if(s.bossHp>0&&rate>0&&s.tritonClock>=s.tritonNextStorm){s.tritonNextStorm+=INTERVAL_MS;s.tritonQueue.push('stormsurge');}
      startQueuedSkill(s,events);
    }return events;
  }
  window.WORDORIA_DARK_TRITON={HP,TIME_MS,INTERVAL_MS,THRESHOLDS,RELEASE_MS,CONTACT_MS,SKILL_MS,SPRITE_ROOT,ART,INFO,ANIMATIONS,reset,clear,deck,board,pick,advance,visual,projectiles,shuffleBoard};
})();
