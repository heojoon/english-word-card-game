/* World 9 training encounters: shared Type C rules, contact-timed HP damage. */
(() => {
  'use strict';
  const hpForStage=number=>number===15?200:number===30?220:0;
  const timeLimit=(hp,damage)=>Math.ceil(hp/Math.max(1,damage))*6000;
  function reset(number,damage=1){
    const hp=hpForStage(number);
    return {trainingBoss:true,trainingKind:number===15?'griffin':'iris',bossHp:hp,bossMaxHp:hp,bossAttackSteps:Math.max(1,damage),storyTimeLimit:timeLimit(hp,damage),trainingAction:null,trainingVictoryMs:null,windRemaining:0,windCycle:0,windNext:20000,examPending:0,examThresholds:[],skillQueue:[],trainingSkill:null,trainingHitMs:0,trainingPlayerHitMs:0,trainingNotice:''};
  }
  function damage(s,amount){
    if(s.done||s.paused||s.bossHp<=0)return;
    const before=s.bossHp;s.bossHp=Math.max(0,s.bossHp-Math.max(0,amount));
    if(s.bossHp<before)s.trainingHitMs=110;
    if(s.bossHp>0){
      for(const threshold of s.trainingKind==='griffin'?[.5]:[.75,.5,.25]){
        if(before>s.bossMaxHp*threshold&&s.bossHp<=s.bossMaxHp*threshold&&!s.examThresholds.includes(threshold)){
          s.examThresholds.push(threshold);
          if(s.trainingKind==='griffin')s.skillQueue.push('charge');else s.examPending++;
        }
      }
    }
    if(s.bossHp===0){s.trainingAction=null;s.trainingSkill=null;s.skillQueue=[];s.trainingVictoryMs=500;s.locked=true;s.attack=false;s.stunned=false;s.iceTimeActive=false;s.timeStopped=false;}
  }
  function question(s,entry,base){
    const wind=s.trainingKind==='griffin'&&s.windRemaining>0;
    const exam=s.trainingKind==='iris'&&s.examPending>0;
    if(exam){s.examPending--;s.trainingExamStartedAt=s.elapsed;}
    if(!wind&&s.trainingKind==='griffin')return {...base,trainingExam:false};
    const word=entry[0],indices=Array.from({length:Math.max(0,word.length-2)},(_,i)=>i+1).filter(i=>/[a-z]/i.test(word[i]));
    const count=Math.min(indices.length,s.trainingKind==='iris'?(Math.floor((s.index||0)/5)%2?2:1):Math.max(1,base.hidden?.length||1));
    if(!count)return {...base,trainingExam:exam};
    let candidates=indices.slice();
    if(wind){s.windRemaining--;s.windCycle++;candidates=candidates.filter(i=>!base.hidden?.includes(i)).concat(candidates.filter(i=>base.hidden?.includes(i)));}
    const hidden=candidates.slice(0,count).sort((a,b)=>a-b),answer=hidden.map(i=>word[i]).join('');
    const wrong=[],alphabet='abcdefghijklmnopqrstuvwxyz',offset=Math.floor(Math.random()*26);
    for(let i=0;wrong.length<3;i++){const value=[...answer].map((_,j)=>alphabet[(offset+i*(j+1)+j*7)%26]).join('');if(value.toLowerCase()!==answer.toLowerCase()&&!wrong.includes(value))wrong.push(value);}
    const choices=[answer,...wrong];for(let i=choices.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]];}
    return {entry,mode:'spelling',prompt:[...word].map((letter,i)=>hidden.includes(i)?'□':letter).join(''),meaning:entry[2],hidden,answer,choices,trainingExam:exam,trainingWind:wind};
  }
  function answer(s,correct,contactMs,reduced=false){
    if(s.done||s.paused||s.locked||s.trainingAction||s.bossHp<=0)return;
    s.locked=true;s.iceTimeActive=false;s.timeStopped=false;s.eagleEyeActive=false;
    if(correct){s.correct++;s.attack=true;}else{s.slashCombo=0;}
    const exam=!correct&&s.trainingKind==='iris'&&s.question?.trainingExam;
    s.trainingAction={correct,exam,elapsed:0,contactMs:correct?contactMs:exam?(reduced?600:1200):reduced?275:550,contact:false,duration:exam?(reduced?750:1500):Math.max(correct?contactMs+150:reduced?350:700,reduced?490:980)};
  }
  function advance(s,delta,clockDelta=delta){
    if(s.done||s.paused)return [];
    const events=[];
    if(s.trainingVictoryMs!==null){s.trainingVictoryMs-=delta;if(s.trainingVictoryMs<=0)events.push('victory');return events;}
    const rate=!s.iceTimeActive&&!s.timeStopped&&delta>0?Math.max(0,clockDelta)/delta:0;
    let left=Math.max(0,delta);
    while(left>0){
      const a=s.trainingAction,skill=s.trainingSkill,remaining=Math.max(0,s.storyTimeLimit-s.elapsed);
      if(remaining<=0){events.push('timeout');break;}
      let step=left;
      if(rate>0){step=Math.min(step,remaining/rate);if(skill)step=Math.min(step,((skill.contact?1500:1200)-skill.elapsed)/rate);if(s.trainingKind==='griffin')step=Math.min(step,Math.max(0,s.windNext-s.elapsed)/rate);}
      if(a)step=Math.min(step,Math.max(0,(a.contact?a.duration:a.contactMs)-a.elapsed));
      const active=step*rate;
      s.elapsed=Math.min(s.storyTimeLimit,s.elapsed+active);
      s.trainingHitMs=Math.max(0,s.trainingHitMs-step);s.trainingPlayerHitMs=Math.max(0,s.trainingPlayerHitMs-step);
      if(a)a.elapsed+=step;if(skill)skill.elapsed+=active;
      left=Math.max(0,left-step);
      // Resolve player contact first on an exact tie; a lethal hit cancels the charge.
      if(a&&!a.contact&&a.elapsed>=a.contactMs-1e-7){
        a.contact=true;
        if(a.correct){damage(s,s.activeSkills?.attackDamage(s.bossAttackSteps)??s.bossAttackSteps);events.push('correct-contact');}
        else {s.stunned=true;s.trainingPlayerHitMs=350;events.push('wrong-contact');}
        if(s.trainingVictoryMs!==null)return events;
      }
      if(skill&&!skill.contact&&skill.elapsed>=1200-1e-7){skill.contact=true;s.trainingPlayerHitMs=350;events.push('skill-contact');s.trainingNotice='회랑 돌진!';}
      if(skill&&skill.elapsed>=1500-1e-7){s.trainingSkill=null;s.trainingNotice='';events.push('skill-end');}
      if(s.trainingKind==='griffin'&&s.elapsed>=s.windNext-1e-7){s.windRemaining=3;s.windNext+=20000;s.trainingNotice='바람길 전환 · 다음 3문항 빈칸 위치 변경';events.push('wind');}
      if(a&&a.elapsed>=a.duration-1e-7){s.trainingAction=null;s.attack=false;s.stunned=false;s.locked=false;events.push(a.correct?'next-question':'retry');}
      if(s.elapsed>=s.storyTimeLimit){events.push('timeout');break;}
    }
    // A queued attack begins with a rendered warning, never with old frame time.
    if(!s.trainingSkill&&s.skillQueue.length&&!events.includes('timeout')){s.trainingSkill={kind:s.skillQueue.shift(),elapsed:0,contact:false};s.trainingNotice='회랑 돌진 · 공격 준비!';events.push('skill-start');}
    return events;
  }
  function visual(s){
    if(s.trainingVictoryMs!==null){const elapsed=500-s.trainingVictoryMs;return {action:'hit',frame:elapsed<50?0:elapsed<110?1:2};}
    if(s.trainingHitMs>0)return {action:'hit',frame:s.trainingHitMs>60?0:1};
    if(s.trainingSkill)return {action:'skill',frame:s.trainingSkill.elapsed<600?0:s.trainingSkill.elapsed<1200?1:2};
    if(s.trainingAction&&!s.trainingAction.correct){const a=s.trainingAction;return {action:a.exam?'skill':'attack',frame:a.elapsed<a.contactMs*(a.exam ? 0.5 : 200/550)?0:a.elapsed<a.contactMs?1:2};}
    if(s.trainingKind==='iris'&&s.question?.trainingExam)return {action:'skill',frame:s.elapsed-(s.trainingExamStartedAt||0)<600?0:1};
    return {action:'idle',frame:Math.floor(s.elapsed/325)%3};
  }
  window.WORDORIA_WORLD_NINE_BOSS={hpForStage,timeLimit,reset,damage,answer,advance,question,visual};
})();
