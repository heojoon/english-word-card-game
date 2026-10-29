/* World 6A-10. Skill clocks use battle time; damage resolves at sprite contact. */
(() => {
  'use strict';
  const HP=200,TIME_MS=300000,REWARD=300,STAMP_INTERVAL_MS=60000,BEDROCK_INTERVAL_MS=10000;
  const SPRITE_ROOT='assets/monsters/abyss-golem/',ART=SPRITE_ROOT+'monster_abyss_golem_standing.png';
  const ANIMATIONS={idle:[350,350,350],attack:[180,220,180],'ground-stamping':[240,300,220],'bedrock-rise':[180,180,360],hit:[140,180,600]};
  const INFO={name:'심연의 골렘',description:'심연의 지배자의 심복. 심연에서 가장 강하다고 자부하며, 침입자는 묻지도 않고 스매시로 부숴버려요.',hp:HP,time:'5분',art:ART,skill:'그라운드 스탬핑',skillDescription:'1분마다 80% 확률로 도약해 밟아요. 접촉하면 현재 HP가 절반으로 줄고, HP가 1이면 Game Over예요.',skill2:'배드락라이즈',skill2Description:'10초마다 몸을 검게 굳혀 다음 공격 한 번을 77% 확률로 막아요.',rewardDescription:'최초 격파 보상: 300 크리스털 · 계정당 한 번'};
  const motionScale=s=>s.guardianReducedMotion?.5:1;
  function reset(){return {guardian:true,abyssGolem:true,bossHp:HP,bossMaxHp:HP,storyTimeLimit:TIME_MS,guardianPhase:'idle',guardianVisual:'idle',guardianRemaining:0,golemIdleMs:0,golemStampElapsed:0,golemBedrockElapsed:0,golemStompMs:0,golemStompContact:false,golemBedrockMs:0,golemBedrockReady:false,golemNotice:'',golemNoticeMs:0,golemPendingDamage:0,golemWrongContact:false,golemPlayerHit:false};}
  function clear(s){s.golemStompMs=0;s.golemStompContact=false;s.golemBedrockReady=false;s.golemBedrockMs=0;s.golemStampElapsed=0;s.golemBedrockElapsed=0;s.golemNotice='';s.golemNoticeMs=0;s.golemPendingDamage=0;s.golemPlayerHit=false;s.golemFatalPose=null;}
  function deck(words,shuffle){
    const pool=Array.from(new Map(words.map(e=>[e[0].toLowerCase(),e])).values());
    if(pool.length<4)throw Error('심연의 골렘은 네 개 이상의 고유 단어가 필요해요');
    const out=[];
    for(let cycle=0;out.length<HP;cycle++){
      const entries=shuffle([...pool]);if(entries[0][0]===out.at(-1)?.entry[0])[entries[0],entries[1]]=[entries[1],entries[0]];
      for(const entry of entries){if(out.length===HP)break;out.push({entry,mode:cycle%2?'ko-en':'en-ko'});}
    }
    return out;
  }
  function answer(s,correct,contactMs){
    if(s.done||s.paused||s.locked||s.hp<=0||s.bossHp<=0||s.guardianPhase!=='idle')return false;
    s.locked=true;s.guardianPhase=correct?'player-attack':'wrong';s.guardianVisual='idle';
    s.guardianRemaining=correct?Math.max(1,contactMs):580*motionScale(s);s.golemWrongContact=false;
    if(correct){s.answeredCorrect=(s.answeredCorrect||0)+1;s.attack=true;s.golemPendingDamage=(s.activeSkills?.attackDamage(Math.max(1,s.bossAttackSteps||1))??Math.max(1,s.bossAttackSteps||1));}
    else s.stunned=true;
    return true;
  }
  function visual(s){
    const scale=motionScale(s),phase=s.guardianPhase;
    let action='idle',elapsed=s.guardianReducedMotion?0:(s.golemIdleMs||0)%1050;
    if(phase==='player-defeat'){action=s.golemFatalPose;elapsed=ANIMATIONS[action].reduce((a,b)=>a+b,0)-1;}
    else if(phase==='defeat'){action='hit';elapsed=(920*scale-s.guardianRemaining)/scale;}
    else if(s.golemStompMs>0){action='ground-stamping';elapsed=760-s.golemStompMs/scale;}
    else if(phase==='hit'&&s.guardianVisual==='hit'){action='hit';elapsed=140;}
    else if(phase==='wrong'){action='attack';elapsed=580-s.guardianRemaining/scale;}
    else if(s.golemBedrockReady||s.golemBedrockMs>0){action='bedrock-rise';elapsed=s.golemBedrockMs>0?720-s.golemBedrockMs/scale:719;}
    else if(phase==='player-attack'&&s.guardianRemaining<=100*scale){action='hit';elapsed=0;}
    const durations=ANIMATIONS[action];let frame=0;
    while(frame<2&&elapsed>=durations[frame]){elapsed-=durations[frame];frame++;}
    return {action,file:action.replaceAll('-','_'),width:action==='attack'?384:320,height:action==='attack'?384:320,count:3,frame};
  }
  function stompMotion(s){
    if(s.guardianPhase==='player-defeat'&&s.golemFatalPose==='ground-stamping')return {progress:1,lift:0};
    if(s.golemStompMs<=0)return null;
    const elapsed=760-s.golemStompMs/motionScale(s);
    if(elapsed<240)return {progress:0,lift:0};
    if(elapsed<540){const p=(elapsed-240)/300;return {progress:p,lift:s.guardianReducedMotion?0:Math.sin(p*Math.PI)};}
    return {progress:1,lift:0};
  }
  function advance(s,delta,random=Math.random,clockDelta=delta){
    if(s.done||s.paused)return [];
    const events=[],scale=motionScale(s),rate=delta>0&&!s.iceTimeActive?Math.max(0,clockDelta)/delta:0;
    let budget=Math.max(0,delta);
    const notice=text=>{s.golemNotice=text;s.golemNoticeMs=1200;s.golemPlayerHit=false;};
    function fatalPose(action,duration){
      const message=s.golemNotice;clear(s);s.golemNotice=message;s.golemPlayerHit=true;
      s.guardianPhase='player-defeat';s.guardianRemaining=duration*scale;s.golemFatalPose=action;s.locked=true;s.stunned=true;
    }
    while(budget>0){
      const phase=s.guardianPhase,alive=s.bossHp>0&&s.hp>0;
      let step=budget;
      if(phase!=='idle')step=Math.min(step,s.guardianRemaining);
      if(phase==='wrong'&&!s.golemWrongContact)step=Math.min(step,s.guardianRemaining-180*scale);
      if(alive&&rate>0)step=Math.min(step,(STAMP_INTERVAL_MS-s.golemStampElapsed)/rate,(BEDROCK_INTERVAL_MS-s.golemBedrockElapsed)/rate);
      if(s.golemStompMs>0&&rate>0){step=Math.min(step,s.golemStompMs/rate);if(!s.golemStompContact)step=Math.min(step,(s.golemStompMs-220*scale)/rate);}
      if(s.golemBedrockMs>0&&rate>0)step=Math.min(step,s.golemBedrockMs/rate);
      if(s.golemNoticeMs>0)step=Math.min(step,s.golemNoticeMs);
      budget-=step;
      const stomping=s.golemStompMs>0,guarding=s.golemBedrockMs>0,noticing=s.golemNoticeMs>0;
      if(alive){s.golemStampElapsed+=step*rate;s.golemBedrockElapsed+=step*rate;s.golemIdleMs+=step*rate;}
      s.golemStompMs=Math.max(0,s.golemStompMs-step*rate);s.golemBedrockMs=Math.max(0,s.golemBedrockMs-step*rate);s.golemNoticeMs=Math.max(0,s.golemNoticeMs-step);
      if(noticing&&!s.golemNoticeMs){s.golemNotice='';s.golemPlayerHit=false;events.push('notice-end');}
      if(guarding&&!s.golemBedrockMs)events.push('bedrock-set');
      if(phase!=='idle'){
        s.guardianRemaining-=step;
        if(phase==='wrong'&&!s.golemWrongContact&&s.guardianRemaining<=180*scale){
          s.golemWrongContact=true;if(s.activeSkills)s.activeSkills.damage(1);else if(s.petEffects)s.petEffects.damage(1);else s.hp=Math.max(0,s.hp-1);
          s.golemPlayerHit=true;events.push('smash-hit');
          if(s.hp<=0){fatalPose('attack',180);continue;}
        }
        if(s.guardianRemaining<=0){
          if(phase==='player-attack'){
            s.correct++;s.index++;
            const blocked=s.golemBedrockReady&&random()<.77;s.golemBedrockReady=false;s.golemBedrockMs=0;
            if(blocked){s.golemBedrockMs=300*scale;notice('배드락라이즈 · 공격 방어!');events.push('blocked');}
            else{s.bossHp=Math.max(0,s.bossHp-s.golemPendingDamage);events.push('hit');}
            s.golemPendingDamage=0;s.guardianVisual=blocked?'guard':s.bossHp?'hit':'defeat';
            s.guardianPhase=s.bossHp?'hit':'defeat';s.guardianRemaining=(s.bossHp?300:920)*scale;
            if(!s.bossHp)clear(s);
          }else if(phase==='defeat'){s.attack=false;events.push('victory');return events;}
          else if(phase==='player-defeat'){events.push('defeat-player');return events;}
          else{s.attack=false;s.stunned=false;s.locked=false;s.guardianPhase='idle';s.guardianVisual='idle';events.push('ready');}
        }
      }
      if(s.bossHp<=0)continue;
      if(stomping&&!s.golemStompContact&&s.golemStompMs<=220*scale){
        s.golemStompContact=true;if(s.activeSkills)s.activeSkills.damage(Math.ceil(s.hp/2));else s.hp=Math.floor(s.hp/2);notice('그라운드 스탬핑 · HP 절반 감소');s.golemPlayerHit=true;events.push('stomp-hit');
        if(s.hp<=0){fatalPose('ground-stamping',220);continue;}
      }
      if(stomping&&!s.golemStompMs)events.push('stomp-end');
      if(rate>0&&s.golemStampElapsed>=STAMP_INTERVAL_MS){s.golemStampElapsed=0;if(random()<.8){s.golemStompMs=760*scale;s.golemStompContact=false;notice('그라운드 스탬핑!');events.push('stomp-start');}}
      if(rate>0&&s.golemBedrockElapsed>=BEDROCK_INTERVAL_MS){s.golemBedrockElapsed=0;s.golemBedrockReady=true;s.golemBedrockMs=720*scale;notice('배드락라이즈 · 다음 공격 방어 준비');events.push('bedrock-start');}
    }
    return events;
  }
  window.WORDORIA_ABYSS_GOLEM={HP,TIME_MS,REWARD,STAMP_INTERVAL_MS,BEDROCK_INTERVAL_MS,SPRITE_ROOT,ART,ANIMATIONS,INFO,reset,clear,deck,answer,advance,visual,stompMotion};
})();
