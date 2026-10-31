/* World 8-30: defeat HP 180 with contact-timed player DMG. */
(() => {
  'use strict';
  const SPRITE_ROOT='assets/monsters/vargas/';
  const HP=180,QUESTION_TIME_MS=4000,TIME_MS=HP*QUESTION_TIME_MS;
  const timeLimit=(damage=1,questionTimeMs=QUESTION_TIME_MS)=>Math.ceil(HP/Math.max(1,damage))*questionTimeMs;
  const ANIMATIONS={idle:[400,400,400],attack:[250,300,350],hit:[140,180,700],wing:[300,300,400],guard:[250,250,500]};
  const CELLS={idle:[480,320],attack:[640,320],hit:[480,320],wing:[576,384],guard:[480,352]};
  const scale=s=>s.guardianReducedMotion?.5:1;
  function reset(damage=1,questionTimeMs=QUESTION_TIME_MS){return {vargas:true,bossHp:HP,bossMaxHp:HP,storyTimeLimit:timeLimit(damage,questionTimeMs),vargasClock:0,vargasIdleMs:0,vargasAction:'idle',vargasActionMs:0,vargasContact:false,vargasPendingContact:null,vargasQueue:[],vargasNextWing:15000,vargasNextGuard:25000,vargasNotice:'',vargasDefeated:false};}
  function clear(s){s.vargasQueue=[];s.vargasPendingContact=null;s.vargasAction=s.vargasDefeated?'down':'idle';s.vargasActionMs=0;s.vargasContact=false;s.vargasNotice='';s.vargasPlayerHitMs=0;s.iceTimeActive=false;s.timeStopped=false;}
  function correct(s,contactMs){s.vargasPendingContact=Math.max(0,contactMs);}
  function damage(s,amount){
    if(s.done||s.paused||s.vargasDefeated)return;
    s.bossHp=Math.max(0,s.bossHp-Math.max(0,amount));
    if(s.bossHp===0){
      s.vargasDefeated=true;s.vargasPendingContact=null;s.vargasQueue=[];
      s.vargasAction='hit';s.vargasActionMs=0;s.vargasContact=false;s.locked=true;s.stunned=false;
      s.iceTimeActive=false;s.timeStopped=false;
      s.vargasNotice='바르가스를 물리쳤어요!';
    }
  }
  function wrong(s){s.vargasAction='attack';s.vargasActionMs=0;s.vargasContact=false;s.vargasNotice='검은 창 돌진';}
  function begin(s,action){s.vargasAction=action;s.vargasActionMs=0;s.vargasContact=false;s.locked=true;s.vargasNotice=action==='wing'?'검은 날개의 돌풍 · 공격 예고':'명령석의 결계 · 보기 재배열 예고';}
  function advance(s,delta,clockDelta=delta,random=Math.random,shuffle=a=>a){
    const events=[];
    if(s.done||s.paused)return events;
    let left=Math.max(0,delta),ratio=delta>0?Math.max(0,clockDelta)/delta:0;
    while(left>0){
      const step=Math.min(left,20);left-=step;
      const clock=s.iceTimeActive||s.timeStopped||s.vargasDefeated?0:step*ratio;
      s.vargasClock+=clock;s.vargasIdleMs+=clock;
      while(s.vargasClock>=Math.min(s.vargasNextWing,s.vargasNextGuard)){
        if(s.vargasNextWing<=s.vargasNextGuard){s.vargasQueue.push('wing');s.vargasNextWing+=15000;}
        else{s.vargasQueue.push('guard');s.vargasNextGuard+=25000;}
      }
      if(s.vargasPendingContact!==null){
        s.vargasPendingContact-=step;
        if(s.vargasPendingContact<=0){
          s.vargasPendingContact=null;
          const base=Math.max(1,s.bossAttackSteps||1);
          damage(s,s.activeSkills?.attackDamage(base)??base);
          s.vargasAction='hit';s.vargasActionMs=0;s.vargasContact=false;
          s.vargasNotice=s.vargasDefeated?'바르가스를 물리쳤어요!':'';events.push('player-contact');
        }
      }
      const action=s.vargasAction;
      if(action==='idle'){
        if(!s.locked&&!s.stunned&&!s.attack&&clock>0&&s.vargasQueue.length&&!s.vargasDefeated){begin(s,s.vargasQueue.shift());events.push('cast-start');}
        continue;
      }
      // Player contact/recoil/down remain readable during ice or pet time stop.
      const visualDelta=action==='hit'||action==='attack'?step:clock;
      const before=s.vargasActionMs;s.vargasActionMs+=visualDelta;
      const times=ANIMATIONS[action],duration=times.reduce((a,b)=>a+b,0)*scale(s);
      const contact=(times[0]+times[1])*scale(s);
      if(!s.vargasContact&&before<contact&&s.vargasActionMs>=contact){
        s.vargasContact=true;
        if(action==='attack')events.push('wrong-contact');
        if(action==='wing'){s.vargasNotice='검은 날개의 돌풍';if(random()<.35)events.push('wing-contact');else events.push('wing-miss');}
        if(action==='guard'&&s.question){s.question.choices=shuffle(s.question.choices.slice());s.vargasNotice='명령석의 결계 · 보기 위치가 바뀌었어요';events.push('shuffle');}
      }
      const end=action==='hit'&&!s.vargasDefeated?(times[0]+times[1])*scale(s):duration;
      if(s.vargasActionMs>=end){
        if(action==='hit'){events.push(s.vargasDefeated?'victory':'answer-finished');s.vargasAction='down';return events;}
        s.vargasAction='idle';s.vargasActionMs=0;s.vargasNotice='';
        s.locked=false;
        if(action==='attack'){s.stunned=false;events.push('wrong-finished');}else events.push('cast-finished');
      }
    }
    return events;
  }
  function visual(s){
    const action=s.vargasAction==='down'?'hit':s.vargasAction||'idle';
    if(s.vargasAction==='down')return {action:'hit',frame:s.vargasDefeated?2:1,width:480,height:320};
    const times=ANIMATIONS[action],duration=times.reduce((a,b)=>a+b,0)*scale(s);
    let t=action==='idle'?s.vargasIdleMs%duration:s.vargasActionMs,frame=0;
    while(frame<2&&t>=times[frame]*scale(s)){t-=times[frame]*scale(s);frame++;}
    return {action,frame,width:CELLS[action][0],height:CELLS[action][1]};
  }
  window.WORDORIA_VARGAS={HP,TIME_MS,QUESTION_TIME_MS,timeLimit,SPRITE_ROOT,ANIMATIONS,reset,clear,correct,wrong,damage,advance,visual};
})();
