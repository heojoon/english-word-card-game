/* World 9 training encounters: shared Type C rules, contact-timed HP damage. */
(() => {
  'use strict';
  const hpForStage=number=>number===15?200:number===30?220:0;
  const timeLimit=(hp,damage)=>Math.ceil(hp/Math.max(1,damage))*6000;
  function reset(number,damage=1){
    const hp=hpForStage(number);
    return {trainingBoss:true,bossHp:hp,bossMaxHp:hp,bossAttackSteps:Math.max(1,damage),storyTimeLimit:timeLimit(hp,damage),trainingAction:null,trainingVictoryMs:null};
  }
  function damage(s,amount){
    if(s.done||s.paused||s.bossHp<=0)return;
    s.bossHp=Math.max(0,s.bossHp-Math.max(0,amount));
    if(s.bossHp===0){s.trainingAction=null;s.trainingVictoryMs=500;s.locked=true;s.attack=false;s.stunned=false;s.iceTimeActive=false;s.timeStopped=false;}
  }
  function answer(s,correct,contactMs,reduced=false){
    s.locked=true;s.iceTimeActive=false;s.timeStopped=false;s.eagleEyeActive=false;
    if(correct){s.correct++;s.attack=true;}else{s.stunned=true;s.slashCombo=0;}
    s.trainingAction={correct,elapsed:0,contactMs:correct?contactMs:550,contact:false,duration:Math.max(correct?contactMs+150:700,reduced?360:980)};
  }
  function advance(s,delta,clockDelta=delta){
    if(s.done||s.paused)return [];
    const events=[];
    const remaining=Math.max(0,s.storyTimeLimit-s.elapsed);
    const running=!s.iceTimeActive&&!s.timeStopped&&s.trainingVictoryMs===null;
    const active=running?Math.min(Math.max(0,clockDelta),remaining):0;
    const visualDelta=running&&clockDelta>0?Math.min(delta,remaining*delta/clockDelta):delta;
    s.elapsed+=active;
    if(s.trainingVictoryMs!==null){s.trainingVictoryMs-=delta;if(s.trainingVictoryMs<=0)events.push('victory');return events;}
    const a=s.trainingAction;
    if(a){
      a.elapsed+=visualDelta;
      if(!a.contact&&a.elapsed>=a.contactMs){
        a.contact=true;
        if(a.correct){damage(s,s.activeSkills?.attackDamage(s.bossAttackSteps)??s.bossAttackSteps);events.push('correct-contact');}
        else events.push('wrong-contact');
      }
      if(s.trainingVictoryMs===null&&a.elapsed>=a.duration){s.trainingAction=null;s.attack=false;s.stunned=false;s.locked=false;events.push(a.correct?'next-question':'retry');}
    }
    if(s.trainingVictoryMs===null&&s.elapsed>=s.storyTimeLimit)events.push('timeout');
    return events;
  }
  window.WORDORIA_WORLD_NINE_BOSS={hpForStage,timeLimit,reset,damage,answer,advance};
})();
