/* Crystal Quest pet catalog and Story battle effects. */
(() => {
  'use strict';
  const definitions = [
    ['pet_pebble_slime','조약돌 슬라임',220,5,'단단한 껍질','shield',.06],
    ['pet_mint_sparrow','민트 참새',660,7,'민트빛 날갯짓','time',.06],
    ['pet_paperboat_rabbit','종이배 토끼',770,8,'행운의 종이배','mp',.06],
    ['pet_sparktail_fox','반짝꼬리 여우',880,10,'반짝꼬리 회복술','hp',.06],
    ['pet_cloudbubble_cat','구름방울 고양이',990,12,'구름 휴식','time',.06],
    ['pet_glass_shell_snail','유리껍질 달팽이',1500,14,'투명 방벽','shield',.06],
    ['pet_blue_ribbon_owl','파란리본 올빼미',2000,16,'야간비행','shield',.10],
    ['pet_bookbud_squirrel','책송이 다람쥐',2500,18,'도토리나누기','mp',.10],
    ['pet_mist_horn_deer','안개뿔 사슴',3000,21,'나무의축복','hp',.10],
    ['pet_prism_guardian_dragon','프리즘 수호룡',4000,25,'드래곤하트','revive',.10]
  ];
  const effectText = {shield:'다음 피격 피해 1회 방어',time:'제한시간 3초 정지',mp:'MP 1 회복',hp:'HP 1 회복',revive:'HP 0일 때 HP 1로 부활 · 전투당 부활 1회'};
  const catalog = definitions.map(([code,name,price,luck,skill,effect,chance]) => ({
    code,name,price,skill,effect,chance,category:'avatar',slot:'pet',stat_key:'luk',stat_value:luck,
    rarity:['pet_mist_horn_deer','pet_prism_guardian_dragon'].includes(code)?'legendary':'unique',
    stars:['pet_mist_horn_deer','pet_prism_guardian_dragon'].includes(code)?5:4,icon:'◆',repeatable:false,active:true,
    art_path:`assets/items/concepts/${code}.png`,
    description:`${skill} · ${Math.round(chance*100)}% 확률 · ${effectText[effect]}`
  }));
  catalog.push({code:'pet',name:'워드 크리스털 정령',price:1500,skill:'정령의 속삭임',effect:'hint',chance:.08,
    category:'avatar',slot:'pet',stat_key:'luk',stat_value:12,rarity:'legendary',stars:5,
    icon:'◆',repeatable:false,active:true,art_path:'assets/items/equipment/item_word_crystal_sprite_legendary.webp',
    description:'정령의 속삭임 · 8% 확률 · 정답 하나 알려주기'});
  function attach(state,item,{random=Math.random,notify=()=>{}}={}) {
    const pet=catalog.find(row=>row.code===item?.code);
    if(!pet||!state.story)return null;
    state.petShield=false;state.petTimeMs=0;state.petRevived=false;
    state.petNotice='';state.petNoticeMs=0;state.petHint=null;
    const allowed=()=>!state.done&&!state.fever&&!state.feverTransition;
    const announce=message=>{state.petNotice=`${pet.skill} · ${message}`;state.petNoticeMs=1600;notify(state.petNotice);};
    return {
      pet,
      onQuestion() {
        state.petHint=null;
        if(!allowed()||state.hp<=0||pet.effect!=='hint')return false;
        const pair=(state.guardian&&!state.elliot&&!state.redReaper&&!state.lichDragon&&!state.morgana)?null:state.matchEn?.find(row=>!state.matched?.has(row.id));
        const question=state.guardian&&!state.elliot&&!state.redReaper&&!state.lichDragon&&!state.morgana?state.question:null;
        if(!pair&&!question||random()>=pet.chance)return false;
        state.petHint=pair?{pairId:pair.id}:{question};
        announce('정답 하나 공개!');
        return true;
      },
      onCorrect() {
        if(!allowed()||state.paused||state.hp<=0||['revive','hint'].includes(pet.effect))return false;
        if(pet.effect==='shield'&&state.petShield||pet.effect==='time'&&state.petTimeMs>0)return false;
        if(['hp','mp'].includes(pet.effect)&&state[pet.effect]>=state[`${pet.effect}Max`])return false;
        if(random()>=pet.chance)return false;
        if(pet.effect==='shield'){state.petShield=true;announce('보호막 준비');}
        else if(pet.effect==='time'){state.petTimeMs=3000;announce('시간 정지 3초');}
        else{state[pet.effect]=Math.min(state[`${pet.effect}Max`],state[pet.effect]+1);announce(`${pet.effect.toUpperCase()} +1`);}
        return true;
      },
      damage(amount) {
        if(!allowed()||state.hp<=0)return 0;
        if(state.petShield){state.petShield=false;announce('피해 방어!');return 0;}
        const before=state.hp;
        state.hp=Math.max(0,state.hp-Math.max(0,amount));
        if(!state.hp&&pet.effect==='revive'&&!state.petRevived&&random()<pet.chance){
          state.hp=1;state.petRevived=true;announce('HP 1로 부활!');
        }
        return before-state.hp;
      },
      advance(delta) {
        if(state.paused||state.done)return 0;
        const step=Math.max(0,delta),frozen=allowed()?Math.min(step,state.petTimeMs):0;
        state.petTimeMs=Math.max(0,state.petTimeMs-step);
        state.petNoticeMs=Math.max(0,state.petNoticeMs-step);
        if(!allowed())this.clear();
        return step-frozen;
      },
      clear(){state.petShield=false;state.petTimeMs=0;state.petNotice='';state.petNoticeMs=0;state.petHint=null;}
    };
  }
  window.WORDORIA_PETS={catalog,attach};
})();
