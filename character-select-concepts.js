const heroes=[
  {name:'아이언하트',class:'WARRIOR · 전사',level:18,image:'assets/avatars/warrior.webp',skill:'강인함',copy:'15% 확률로 문제 제한시간이 1초 늘어나요.',icon:'＋1',stats:[['HP',92],['공격',76],['행운',42]]},
  {name:'루미아',class:'MAGE · 마법사',level:14,image:'assets/avatars/variants/mage-female.webp',skill:'Time Stop',copy:'10% 확률로 타이머를 1.5초 동안 멈춰요.',icon:'Ⅱ',stats:[['HP',54],['마법',96],['집중',84]]},
  {name:'로제',class:'FIGHTER · 권투가',level:21,image:'assets/avatars/skins/pugilist-female-crystal-rose-profile-v3.webp',skill:'Combo Master',copy:'3 Combo마다 보너스 코인을 획득해요.',icon:'×3',stats:[['HP',84],['공격',88],['콤보',98]]},
  {name:'실피',class:'ARCHER · 궁수',level:16,image:'assets/avatars/skins/ranger-female-violet-crystal.webp',skill:'Treasure Hunter',copy:'보물상자의 최소 보상이 20 Coin이 돼요.',icon:'◆',stats:[['HP',65],['공격',82],['행운',91]]},
  {name:'카이',class:'FIGHTER · 권투가',level:11,image:'assets/avatars/variants/pugilist-male.webp',skill:'Combo Master',copy:'3 Combo마다 보너스 코인을 획득해요.',icon:'×3',stats:[['HP',86],['공격',84],['콤보',94]]}
];
const modes={
  carousel:['01 · CRYSTAL RING','돌아가는 링에서 한눈에 찾고, 앞으로 온 카드를 다시 눌러 시작해요.'],
  deck:['02 · HERO DECK','소장 카드처럼 겹쳐 넘기며 가장 강한 수집 감각을 전해요.'],
  stage:['03 · SUMMON STAGE','동료들이 무대에 둘러서고 선택한 영웅이 중앙으로 소환돼요.']
};
const slotStyles={
  '-2':{ring:['-158px','30px','34deg','.54','.68'],deck:['-72px','36px','-10deg','.76','.7'],stage:['-154px','54px','30deg','.58','.72']},
  '-1':{ring:['-112px','15px','22deg','.76','.88'],deck:['-38px','17px','-5deg','.88','.88'],stage:['-108px','38px','24deg','.76','.9']},
  '0':{ring:['0px','0px','0deg','1','1'],deck:['0px','0px','0deg','1','1'],stage:['0px','0px','0deg','1','1']},
  '1':{ring:['112px','15px','-22deg','.76','.88'],deck:['38px','17px','5deg','.88','.88'],stage:['108px','38px','-24deg','.76','.9']},
  '2':{ring:['158px','30px','-34deg','.54','.68'],deck:['72px','36px','10deg','.76','.7'],stage:['154px','54px','-30deg','.58','.72']}
};
const phone=document.querySelector('.phone'),orbit=document.querySelector('#orbit'),dots=document.querySelector('#dots'),roster=document.querySelector('#owned-roster');
let current=0,autoTimer,dragStart=null;
heroes.forEach((hero,index)=>{
  const button=document.createElement('button');
  button.type='button';button.className='character-card';button.dataset.index=index;
  button.setAttribute('aria-label',`${hero.name}, ${hero.class.split(' · ')[1]}`);
  button.innerHTML=`<span class="card-face"><img src="${hero.image}" alt=""><span class="card-label"><small>LV.${hero.level} · ${hero.class.split(' · ')[0]}</small><strong>${hero.name}</strong></span></span>`;
  button.addEventListener('click',()=>{if(index===current)openStart();else select(index,true)});
  orbit.append(button);dots.insertAdjacentHTML('beforeend','<i></i>');
  const rosterButton=document.createElement('button');rosterButton.type='button';rosterButton.className='roster-hero';rosterButton.dataset.index=index;rosterButton.setAttribute('aria-label',`${hero.name} 선택`);rosterButton.innerHTML=`<img src="${hero.image}" alt=""><span>${hero.name}</span>`;rosterButton.addEventListener('click',()=>{if(index===current)openStart();else select(index,true)});roster.append(rosterButton);
});
function relative(index){let d=index-current;if(d>heroes.length/2)d-=heroes.length;if(d<-heroes.length/2)d+=heroes.length;return d}
function select(index,user=false){current=(index+heroes.length)%heroes.length;const hero=heroes[current];
  document.querySelectorAll('.character-card').forEach((card,i)=>{const slot=relative(i),distance=Math.abs(slot),styles=slotStyles[String(slot)];card.style.setProperty('--slot',slot);card.style.setProperty('--distance',distance);card.style.setProperty('--depth',10-distance);[['ring',styles.ring],['deck',styles.deck],['stage',styles.stage]].forEach(([prefix,values])=>['x','y','rotate','scale','opacity'].forEach((key,j)=>card.style.setProperty(`--${prefix}-${key}`,values[j])));card.classList.toggle('is-active',i===current);card.tabIndex=0;card.setAttribute('aria-pressed',i===current)});
  document.querySelectorAll('#dots i').forEach((dot,i)=>dot.classList.toggle('active',i===current));
  document.querySelectorAll('.roster-hero').forEach((button,i)=>button.setAttribute('aria-pressed',String(i===current)));
  document.querySelector('#hero-level').textContent=`LV. ${hero.level}`;document.querySelector('#hero-class').textContent=hero.class;document.querySelector('#hero-name').textContent=hero.name;document.querySelector('#skill-name').textContent=hero.skill;document.querySelector('#skill-copy').textContent=hero.copy;document.querySelector('#skill-icon').textContent=hero.icon;document.querySelector('#position').textContent=current+1;
  document.querySelector('#hero-stats').innerHTML=hero.stats.map(([name,value])=>`<div class="stat"><span>${name}<b>${value}</b></span><i style="--value:${value}%"></i></div>`).join('');
  if(user)stopAuto();
}
function openStart(){const hero=heroes[current];document.querySelector('#dialog-name').textContent=hero.name;document.querySelector('#start-dialog').showModal();navigator.vibrate?.(20)}
function restartAuto(){clearInterval(autoTimer);if(!matchMedia('(prefers-reduced-motion: reduce)').matches)autoTimer=setInterval(()=>select(current+1),4300)}
function stopAuto(){clearInterval(autoTimer);autoTimer=null}
function setConcept(concept,updateUrl=false){const safe=modes[concept]?concept:'carousel';document.querySelectorAll('[data-concept]').forEach(link=>{if(link.dataset.concept===safe)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current')});phone.dataset.mode=safe;document.querySelector('#mode-kicker').textContent=modes[safe][0];document.querySelector('#mode-description').textContent=modes[safe][1];if(updateUrl)history.replaceState(null,'',`?concept=${safe}`);if(updateUrl)stopAuto()}
document.querySelectorAll('[data-concept]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();setConcept(link.dataset.concept,true)}));
document.querySelector('.previous').addEventListener('click',()=>select(current-1,true));document.querySelector('.next').addEventListener('click',()=>select(current+1,true));document.querySelector('#play-hint').addEventListener('click',openStart);
document.querySelector('[data-close]').addEventListener('click',()=>document.querySelector('#start-dialog').close());document.querySelector('[data-start]').addEventListener('click',()=>{document.querySelector('#start-dialog').close();toast(`${heroes[current].name} 선택 완료! 모험 화면으로 이동합니다.`)});
document.querySelector('#add-character').addEventListener('click',()=>toast('새 캐릭터 생성 화면으로 이동합니다.'));
function toast(message){const el=document.querySelector('#toast');el.textContent=message;el.classList.add('show');clearTimeout(el.timer);el.timer=setTimeout(()=>el.classList.remove('show'),2200)}
document.addEventListener('keydown',event=>{if(event.key==='ArrowLeft')select(current-1,true);if(event.key==='ArrowRight')select(current+1,true)});
document.querySelector('.card-viewport').addEventListener('pointerdown',event=>dragStart=event.clientX);document.querySelector('.card-viewport').addEventListener('pointerup',event=>{if(dragStart===null)return;const delta=event.clientX-dragStart;if(Math.abs(delta)>38)select(current+(delta<0?1:-1),true);dragStart=null});
setConcept(new URLSearchParams(location.search).get('concept')||'carousel');select(0);restartAuto();
