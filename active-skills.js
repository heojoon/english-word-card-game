/* Shared Story active skills. Durations use unpaused combat time, not wall time. */
(() => {
  'use strict';
  const definitions={
    warrior:{name:'불굴의 맹세',icon:'shield',description:'MP 1 · 20초간 HP가 줄어들지 않아요.'},
    mage:{name:'마나 실드',icon:'shield',description:'켜기 무료 · 피격 시 HP 대신 같은 양의 MP를 소모해요. 다시 누르면 꺼져요.'},
    pugilist:{name:'폭렬권',icon:'combo',description:'MP 1 · 다음 보스 공격의 피해량이 3배가 돼요.',bossOnly:true},
    ranger:{name:'파이어 애로우',icon:'arrow',description:'MP 1 · 보스에게 1초마다 피해 2, 10초간 총 20 피해를 줘요.',bossOnly:true},
    sniper:{name:'데드아이즈',icon:'sword',description:'MP 1 · 첫 정답부터 10초간 다음 정답의 힌트를 계속 보여줘요.'}
  };
  const isBoss=s=>Boolean(s.guardian||s.boss||s.keurus||s.vargas||s.hiddenKind==='king');
  function attach(s,classCode,{burn=()=>{},unlocked=false}={}){
    const definition=definitions[classCode];
    let oathMs=0,shield=false,burst=false,burnMs=0,burnTick=0,deadeyeArmed=false,deadeyeMs=0;
    let lastCorrect=s.correct||0,dirty=false;
    const allowed=()=>s.story&&!s.done&&!s.fever&&!s.feverTransition;
    const busy=()=>s.paused||s.locked||s.attack||s.stunned||s.timeoutPending||s.potionUsePending||s.weavingStepDodging||s.shadowFreezeMs>0||s.hp<=0;
    const active=()=>classCode==='warrior'?oathMs>0:classCode==='mage'?shield:classCode==='pugilist'?burst:classCode==='ranger'?burnMs>0:deadeyeArmed||deadeyeMs>0;
    const effects={
      definition,
      unlocked,
      ready(){return Boolean(unlocked&&definition&&allowed()&&!busy()&&(!definition.bossOnly||isBoss(s))&&(classCode==='mage'?shield||s.mp>0:!active()&&s.mp>=1));},
      activate(){
        if(!this.ready())return false;
        dirty=true;
        if(classCode==='mage'){shield=!shield;return true;}
        s.mp--;
        if(classCode==='warrior')oathMs=20000;
        if(classCode==='pugilist')burst=true;
        if(classCode==='ranger'){burnMs=10000;burnTick=0;}
        if(classCode==='sniper'){deadeyeArmed=true;lastCorrect=s.correct||0;}
        return true;
      },
      observeCorrect(){
        const correct=s.correct||0;
        if(deadeyeArmed&&correct>lastCorrect){deadeyeArmed=false;deadeyeMs=10000;}
        lastCorrect=correct;
      },
      hint(){return allowed()&&deadeyeMs>0;},
      damage(amount){
        if(!allowed()||s.paused||s.hp<=0)return 0;
        let remaining=Math.max(0,amount);
        dirty=true;
        if(oathMs>0)return 0;
        // Pet protection precedes mana absorption, and revival remains in the pet pipeline.
        if(s.petShield&&s.petEffects)return s.petEffects.damage(remaining);
        if(shield){const absorbed=Math.min(s.mp,remaining);s.mp-=absorbed;remaining-=absorbed;if(s.mp<=0)shield=false;}
        if(!remaining)return 0;
        if(s.petEffects)return s.petEffects.damage(remaining);
        const before=s.hp;s.hp=Math.max(0,s.hp-remaining);return before-s.hp;
      },
      attackDamage(amount){
        if(!allowed()||!burst)return amount;
        burst=false;return Math.max(1,s.bossAttackSteps||amount)*3;
      },
      // Legacy bosses derive HP from credited damage in `correct`. Keep the question
      // cursor unchanged so a damage tick never changes the currently visible board.
      creditDamage(amount){
        const max=s.bossMaxHp||(s.boss?50:s.shadowSorceress?100:s.blackDragon?60:s.redReaper?120:s.lichDragon?200:60);
        s.correct=Math.max(0,Math.min(max,(s.correct||0)+amount));
      },
      // Exact next effect boundary lets HP bosses interleave burns with their clock.
      nextEventIn(){return Math.min(oathMs>0?oathMs:Infinity,deadeyeMs>0?deadeyeMs:Infinity,burnMs>0?Math.min(burnMs,1000-burnTick):Infinity);},
      advance(delta){
        if(!allowed()){this.clear();return false;}
        if(s.paused)return false;
        const before=this.status(),correctChanged=lastCorrect!==(s.correct||0),wasDirty=dirty;dirty=false;
        this.observeCorrect();
        const step=Math.max(0,delta);
        oathMs=Math.max(0,oathMs-step);deadeyeMs=Math.max(0,deadeyeMs-step);
        const burning=Math.min(step,burnMs);burnMs=Math.max(0,burnMs-step);burnTick+=burning;
        while(burnTick>=1000){burnTick-=1000;if(s.bossHp>0)burn(2);}
        return wasDirty||correctChanged||before!==this.status();
      },
      status(){
        if(!allowed())return '';
        if(oathMs>0)return `HP 보호 · ${Math.ceil(oathMs/1000)}초`;
        if(shield)return '켜짐 · 피격 시 MP 소모';
        if(burst)return '다음 공격 ×3';
        if(burnMs>0)return `화상 · ${Math.ceil(burnMs/1000)}초`;
        if(deadeyeArmed)return '첫 정답 대기';
        if(deadeyeMs>0)return `정답 힌트 · ${Math.ceil(deadeyeMs/1000)}초`;
        return '';
      },
      active,
      clear(){oathMs=0;shield=false;burst=false;burnMs=0;burnTick=0;deadeyeArmed=false;deadeyeMs=0;}
    };
    return effects;
  }
  window.WORDORIA_ACTIVE_SKILLS={definitions,isBoss,attach};
})();
