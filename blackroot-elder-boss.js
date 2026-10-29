/* World 8-15: preserve the 40-question spelling challenge and shared rewards. */
(() => {
  'use strict';
  const SPRITE_ROOT='assets/monsters/blackroot-elder/';
  const ANIMATIONS={idle:[400,400,400],attack:[250,300,350],hit:[140,180,700],roots:[300,300,400],guard:[250,250,500]};
  const scale=s=>s.guardianReducedMotion?.5:1;
  function reset(){return {blackroot:true,treeClock:0,treeIdleMs:0,treeAction:'idle',treeActionMs:0,treeContact:false,treePendingContact:null,treeQueue:[],treeNextRoots:20000,treeNextGuard:30000,treeNotice:'',treeDefeated:false};}
  function clear(s){s.treeQueue=[];s.treePendingContact=null;s.treeAction='idle';s.treeActionMs=0;s.treeContact=false;s.treeNotice='';s.treePlayerHitMs=0;s.iceTimeActive=false;}
  function correct(s,contactMs){s.treePendingContact=Math.max(0,contactMs);s.treeDefeated=s.index+1>=s.deck.length;}
  function wrong(s){s.treeAction='attack';s.treeActionMs=0;s.treeContact=false;s.treeNotice='가지 내려찍기';}
  function begin(s,action){s.treeAction=action;s.treeActionMs=0;s.treeContact=false;s.locked=true;s.treeNotice=action==='roots'?'뿌리 솟구치기 · 공격 예고':'나무껍질 방벽 · 보기 재배열 예고';}
  function advance(s,delta,clockDelta=delta,random=Math.random,shuffle=a=>a){
    const events=[];
    if(s.done||s.paused)return events;
    let left=Math.max(0,delta),ratio=delta>0?Math.max(0,clockDelta)/delta:0;
    while(left>0){
      const step=Math.min(left,20);left-=step;
      const clock=s.iceTimeActive||s.timeStopped||s.treeDefeated?0:step*ratio;
      s.treeClock+=clock;s.treeIdleMs+=clock;
      while(s.treeClock>=Math.min(s.treeNextRoots,s.treeNextGuard)){
        if(s.treeNextRoots<=s.treeNextGuard){s.treeQueue.push('roots');s.treeNextRoots+=20000;}
        else{s.treeQueue.push('guard');s.treeNextGuard+=30000;}
      }
      if(s.treePendingContact!==null){
        s.treePendingContact-=step;
        if(s.treePendingContact<=0){s.treePendingContact=null;s.treeAction='hit';s.treeActionMs=0;s.treeContact=false;s.treeNotice=s.treeDefeated?'검은 쐐기가 부서졌어요!':'';events.push('player-contact');}
      }
      const action=s.treeAction;
      if(action==='idle'){
        if(!s.locked&&!s.stunned&&!s.attack&&clock>0&&s.treeQueue.length&&!s.treeDefeated){begin(s,s.treeQueue.shift());events.push('cast-start');}
        continue;
      }
      // Player contact/recoil/down remain readable during ice or pet time stop.
      const visualDelta=action==='hit'||action==='attack'?step:clock;
      const before=s.treeActionMs;s.treeActionMs+=visualDelta;
      const times=ANIMATIONS[action],duration=times.reduce((a,b)=>a+b,0)*scale(s);
      const contact=(times[0]+times[1])*scale(s);
      if(!s.treeContact&&before<contact&&s.treeActionMs>=contact){
        s.treeContact=true;
        if(action==='attack')events.push('wrong-contact');
        if(action==='roots'){s.treeNotice='뿌리 솟구치기';if(random()<.3)events.push('root-contact');else events.push('root-miss');}
        if(action==='guard'&&s.question){s.question.choices=shuffle(s.question.choices.slice());s.treeNotice='나무껍질 방벽 · 보기 위치가 바뀌었어요';events.push('shuffle');}
      }
      const end=action==='hit'&&!s.treeDefeated?(times[0]+times[1])*scale(s):duration;
      if(s.treeActionMs>=end){
        if(action==='hit'){events.push(s.treeDefeated?'victory':'answer-finished');s.treeAction='down';return events;}
        s.treeAction='idle';s.treeActionMs=0;s.treeNotice='';
        s.locked=false;
        if(action==='attack'){s.stunned=false;events.push('wrong-finished');}else events.push('cast-finished');
      }
    }
    return events;
  }
  function visual(s){
    const action=s.treeAction==='down'?'hit':s.treeAction||'idle';
    if(s.treeAction==='down')return {action:'hit',frame:s.treeDefeated?2:1,width:384};
    const times=ANIMATIONS[action],duration=times.reduce((a,b)=>a+b,0)*scale(s);
    let t=action==='idle'?s.treeIdleMs%duration:s.treeActionMs,frame=0;
    while(frame<2&&t>=times[frame]*scale(s)){t-=times[frame]*scale(s);frame++;}
    return {action,frame,width:action==='attack'?448:384};
  }
  window.WORDORIA_BLACKROOT_ELDER={SPRITE_ROOT,ANIMATIONS,reset,clear,correct,wrong,advance,visual};
})();
