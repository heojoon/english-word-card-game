(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const icons = {
    home:'<path d="M3 10 12 3l9 7v10H5V10M9 20v-7h6v7"/>',
    gear:'<path d="m8 3-5 4 3 5 2-1v10h8V11l2 1 3-5-5-4c0 4-8 4-8 0Z"/>',
    dungeon:'<path d="m4 3 13 13M3 3l1 5 11 11 4-4L8 4 3 3Zm11 14 5 5m-5-1 7-7M21 3 9 15m12-12-1 5-5 5M7 17l-5 5m0-7 7 7"/>',
    shop:'<path d="M3 9h18l-2-6H5L3 9Zm1 1v11h16V10M9 21v-7h6v7M3 9c0 4 4 4 5 0 0 4 4 4 4 0 0 4 4 4 4 0 1 4 5 4 5 0"/>',
    crown:'<path d="m3 7 4 4 5-7 5 7 4-4-3 13H6L3 7Z"/><path d="M6 16h12"/><circle cx="12" cy="3" r="1"/>',
    cape:'<path d="M8 3h8l5 18-9-3-9 3L8 3Z"/><path d="M8 3c0 5 8 5 8 0M12 7v10"/>',
    aura:'<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z"/><path d="m20 1 1 2 2 1-2 1-1 2-1-2-2-1 2-1Z"/>',
    pet:'<path d="M3 16c0-14 18-14 18 0 0 7-18 7-18 0Z"/><path d="M8 13v2m8-2v2m-6 2q2 2 4 0"/>',
    sword:'<path d="m14 3 7-1-1 7-11 11-5-5L14 3ZM3 13l8 8m-7-3-3 3M16 6l-8 9"/>',
    chest:'<path d="M3 10V7c0-5 18-5 18 0v3M3 10h18v11H3V10Zm7-3h4v8h-4V7Z"/><path d="M6 11v10m12-10v10"/>',
    island:'<path d="m2 15 10-13 10 13-10 8-10-8Zm0 0h20M8 7l4 3 4-3m-4 8v8"/>',
    sound:'<path d="M4 9h4l5-5v16l-5-5H4V9Zm12-2c4 3 4 7 0 10m3-13c6 5 6 11 0 16"/>',
    pause:'<path d="M8 5v14m8-14v14"/>',
    trophy:'<path d="M7 3h10v6c0 7-10 7-10 0V3Zm0 2H3v4c0 3 4 3 4 3m10-7h4v4c0 3-4 3-4 3m-5 3v6m-4 0h8"/>',
    gift:'<path d="M3 9h18v5H3V9Zm2 5v7h14v-7M12 9v12M12 9C0 8 7-3 12 9Zm0 0c12-1 5-12 0 0Z"/>'
  };
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.aura}</svg>`;
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num = n => n.toLocaleString('ko-KR');
  const classes = [
    {id:'mage',label:'마법사',name:'블리자드',title:'ARCANE SCHOLAR',trait:'서리 기록관',paths:['mage.webp','variants/mage-female.webp']},
    {id:'warrior',label:'전사',name:'아이언하트',title:'CRYSTAL GUARDIAN',trait:'크리스털 수호자',paths:['warrior.webp','variants/warrior-female.webp']},
    {id:'pugilist',label:'권투사',name:'레드스트라이크',title:'COMBO MASTER',trait:'불꽃의 도전자',paths:['variants/pugilist-male.webp','pugilist.webp']},
    {id:'ranger',label:'궁수',name:'로빈리프',title:'FOREST SEEKER',trait:'숲의 단어 수호자',paths:['variants/ranger-male.webp','ranger.webp']}
  ];
  const items = [
    {id:'crown',name:'별빛 왕관',slot:'head',price:300,art:'crown',desc:'반짝이는 별빛을 머리 위에. 모험가에게 어울리는 황금 왕관입니다.'},
    {id:'cape',name:'불꽃 망토',slot:'back',price:500,art:'cape',desc:'따뜻한 불꽃빛 망토. 장착하면 캐릭터 뒤로 황금빛 실루엣이 펼쳐집니다.'},
    {id:'aura',name:'서리 오라',slot:'aura',price:700,art:'aura',desc:'서리 결정이 만들어 낸 민트빛 오라. 캐릭터를 은은하게 감싸 줍니다.'},
    {id:'pet',name:'민트 슬라임',slot:'pet',price:900,art:'pet',desc:'작고 말랑한 모험 친구. 언제나 당신의 곁에서 응원합니다.'},
    {id:'snack',name:'간식 교환권',slot:'reward',price:200,art:'gift',desc:'오늘의 학습 보상! 교환하면 보호자 승인 대기 목록에 추가됩니다.'},
    {id:'time',name:'놀이 시간 30분',slot:'reward',price:400,art:'gift',desc:'모험 뒤 달콤한 휴식. 보호자에게 놀이 시간 보상을 신청합니다.'}
  ];
  const worlds = [
    {name:'속삭이는 숲',sub:'기초 단어 · 초록 정령의 산책길',tag:'CHAPTER 01',stages:['숲의 입구','정령의 오솔길','오래된 나무']},
    {name:'서리 수정 동굴',sub:'동사와 표현 · 푸른 수정의 비밀',tag:'CHAPTER 02',stages:['빛나는 동굴','얼음 다리','수정의 심장']},
    {name:'별빛 마법 도서관',sub:'도전 단어 · 잃어버린 마법의 기록',tag:'CHAPTER 03',stages:['잊힌 서가','달빛 회랑','마지막 기록']}
  ];
  const questions = [
    ['survive','살아남다',['조사하다','살아남다','지우다','반복하다']],
    ['discover','발견하다',['기다리다','기억하다','발견하다','움직이다']],
    ['protect','보호하다',['보호하다','빌리다','여행하다','도착하다']],
    ['brave','용감한',['조용한','배고픈','느린','용감한']],
    ['treasure','보물',['약속','보물','날씨','그림자']]
  ];
  const KEY='wordoria-playable-preview-v1';
  const initial=()=>({coins:1250,level:12,exp:650,character:0,gender:0,owned:[],equipped:{},clears:18,best:24,answered:100,correct:91,records:[],requests:[]});
  let state=initial();
  try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved&&Array.isArray(saved.owned)&&Array.isArray(saved.records)&&saved.equipped&&Number.isFinite(saved.coins))state={...state,...saved};}catch{}
  let page='home',filter='all',world=0,stage=0,run=null,timer=null,nextTimer=null,toastTimer=null;
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}};
  const character=()=>classes[state.character]||classes[0];
  const imagePath=()=>`assets/avatars/${character().paths[state.gender===1?1:0]}`;
  const itemById=id=>items.find(item=>item.id===id);
  function portrait(){return `<div class="portrait">${state.equipped.aura?'<div class="equipped-aura"></div>':''}${state.equipped.back?'<div class="equipped-back"></div>':''}<img src="${imagePath()}" alt="${character().label} ${state.gender?'여성':'남성'} 캐릭터">${state.equipped.head?icon('crown').replace('<svg ','<svg class="equipped-head" '):''}${state.equipped.pet?`<div class="equipped-pet">${icon('pet')}</div>`:''}</div>`;}
  function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2500);}
  function modal(html){if(page==='battle'&&run&&!run.done)pause();$('dialog-content').innerHTML=html;if(!$('dialog').open)$('dialog').showModal();}
  function close(){ $('dialog').close();if(page==='battle'&&run&&!run.done&&run.paused){run.paused=false;tick();} }
  function title(kicker,name,desc){return `<div class="page-title"><div class="eyebrow">${kicker}</div><h1>${name}</h1><p>${desc}</p></div>`;}
  function itemCard(item,inventory=false){const owned=state.owned.includes(item.id),equipped=state.equipped[item.slot]===item.id;return `<button class="item" data-action="item" data-id="${item.id}">${inventory?`<span class="badge">${equipped?'장착 중':'보유'}</span>`:''}<span class="item-art">${icon(item.art)}</span><b>${item.name}</b><small class="${owned?'owned':''}">${owned?(equipped?'✓ 장착 중':'✓ 보유 중'):`${num(item.price)} ◆`}</small></button>`;}
  function render(){
    document.body.dataset.screen=page;
    $('balance').textContent=num(state.coins);
    const active=['stages','battle','result'].includes(page)?'dungeon':page;
    $('nav').innerHTML=[['home','홈'],['gear','장비'],['dungeon','던전'],['shop','상점']].map(([id,label])=>`<button data-action="nav" data-page="${id}" ${active===id?'aria-current="page"':''}>${icon(id)}<span>${label}</span></button>`).join('');
    const renderers={home:home,gear:gear,shop:shop,dungeon:dungeon,stages:stages,battle:battle,result:result};
    $('screen').innerHTML=renderers[page]();
  }
  function go(target){page=target;render();$('screen').focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
  function navigate(target){if(page==='battle'&&run&&!run.done){pause();modal(`<div class="eyebrow">PAUSED</div><h2>잠시 쉬어 갈까요?</h2><p>현재까지 얻은 보상은 유지돼요.<br>이동하면 이번 도전은 종료됩니다.</p><div class="actions"><button class="secondary" data-action="resume">계속하기</button><button class="primary" data-action="leave" data-page="${target}">이동하기</button></div>`);return;}go(target);}
  function home(){const c=character();return `<button class="hero" data-action="characters" aria-label="캐릭터 변경"><span class="level">LV.${state.level}</span><span class="hero-hint">캐릭터 변경 ›</span><div class="hero-copy"><div class="eyebrow">${c.title}</div><h1>${c.name}</h1><p>${c.label} · ${c.trait}</p></div>${portrait()}</button><button class="panel progress-card" style="width:100%" data-action="stats"><span class="row small"><span>다음 레벨까지</span><b>${num(state.exp)} / 1,000 EXP</b></span><div class="xp"><i style="width:${state.exp/10}%"></i></div></button><div class="stats"><button class="panel stat" data-action="stats"><span>최고 콤보</span><b>${state.best}</b></button><button class="panel stat" data-action="stats"><span>정답률</span><b>${Math.round(state.correct/state.answered*100)}%</b></button><button class="panel stat" data-action="records"><span>클리어</span><b>${state.clears}</b></button></div><div class="section-title"><h2>오늘의 상점</h2><button class="text-btn" data-action="nav" data-page="shop">모두 보기 ›</button></div><div class="items">${items.slice(0,3).map(item=>itemCard(item)).join('')}</div><button class="primary home-cta" data-action="nav" data-page="dungeon">WORD DUNGEON 입장 <span class="arrow">→</span></button>`;}
  function gear(){return `${title('MY COLLECTION','나만의 모험가','장비를 장착하고, 새로운 모습으로 모험을 떠나요.')}<div class="equipment-stage"><span class="level">LV.${state.level}</span>${portrait()}</div><div class="row"><h2 style="font-size:17px;margin-top:15px">${character().name}</h2><button class="text-btn" data-action="characters">캐릭터 변경 ›</button></div><div class="slots">${[['head','머리','crown'],['back','등','cape'],['aura','오라','aura'],['pet','펫','pet']].map(([slot,label,art])=>`<button class="slot" data-action="slot" data-slot="${slot}">${icon(art)}<span>${state.equipped[slot]?itemById(state.equipped[slot]).name:`${label} · 비어 있음`}</span></button>`).join('')}</div><div class="section-title"><h2>내 장비함 <span class="muted small">${state.owned.length}</span></h2><button class="text-btn" data-action="nav" data-page="shop">상점 가기 ›</button></div>${state.owned.length?`<div class="items catalog">${items.filter(i=>state.owned.includes(i.id)).map(i=>itemCard(i,true)).join('')}</div>`:'<div class="panel"><p class="small muted">아직 수집한 장비가 없어요.<br><br>상점에서 첫 아이템을 골라 보세요.</p><button class="primary" style="margin-top:15px" data-action="nav" data-page="shop">첫 장비 만나기 →</button></div>'}`;}
  function shop(){return `${title('CRYSTAL BOUTIQUE','모험을 빛내는 상점','열심히 모은 크리스털로 나만의 이야기를 꾸며요.')}<div class="panel row"><span class="small muted">사용 가능한 크리스털</span><b style="color:var(--violet)">◆ ${num(state.coins)}</b></div><div class="tabs" aria-label="상점 분류">${[['all','전체'],['avatar','아바타'],['reward','현실 보상']].map(([key,label])=>`<button data-action="filter" data-filter="${key}" class="${filter===key?'active':''}" aria-pressed="${filter===key}">${label}</button>`).join('')}</div><div class="items catalog">${items.filter(i=>filter==='all'||(filter==='reward'?i.slot==='reward':i.slot!=='reward')).map(i=>itemCard(i)).join('')}</div><button class="secondary" style="width:100%;margin-top:15px" data-action="requests">보상 신청 내역 (${state.requests.length}) →</button>`;}
  function dungeon(){return `${title('WORD DUNGEON','오늘은 어디로 떠날까요?','한 단어, 한 번의 공격. 잃어버린 크리스털을 되찾아요.')} ${worlds.map((w,i)=>`<button class="dungeon-card" data-action="world" data-index="${i}"><span class="island">${icon('island')}</span><span class="eyebrow" style="color:var(--violet)">${w.tag}</span><h2>${w.name}</h2><p>${w.sub}</p><span class="row small"><span class="badge">3 STAGES · 체험 가능</span><span>탐험하기 →</span></span></button>`).join('')}<div class="notice">각 스테이지는 5문제 체험으로 구성됩니다. 문제당 5초, 오답 또는 시간 초과 시 도전이 종료돼요.</div><button class="secondary" style="width:100%" data-action="records">모험 기록 보기</button>`;}
  function stages(){return `<button class="text-btn" data-action="nav" data-page="dungeon">← 던전 목록</button>${title(worlds[world].tag,worlds[world].name,'도전할 길을 선택하세요. 마지막에는 보물상자가 기다려요.')}<div class="stage-list">${worlds[world].stages.map((name,i)=>`<button class="stage-btn" data-action="stage" data-index="${i}"><span class="stage-no">0${i+1}</span><span><b>${name}</b><small>5문제 · 5초 서바이벌 · 클리어 +10 ◆</small></span><span>→</span></button>`).join('')}</div><div class="notice">정답 +1 ◆ · 5콤보 +1 ◆<br>오답 전까지 모은 크리스털과 경험치는 유지됩니다.</div>`;}
  function start(){clearInterval(timer);clearTimeout(nextTimer);run={index:0,correct:0,coins:0,exp:0,remaining:5000,paused:false,locked:false,done:false,clear:false,chest:false,elapsed:0,offset:(world+stage)%questions.length};close();go('battle');tick();}
  const question=()=>questions[(run.index+run.offset)%questions.length];
  function battle(){const q=question();return `<div class="battle-top row"><div><div class="eyebrow" style="color:var(--violet)">STAGE ${world+1}-${stage+1}</div><b>${worlds[world].stages[stage]}</b></div><button class="icon-btn" data-action="pause" aria-label="일시정지">${icon('pause')}</button></div><div class="arena" id="arena"><div class="arena-floor"></div>${portrait()}<span class="enemy-label">${run.index===4?'BOSS · 수정 정령':'LV. 1 · 민트 슬라임'}</span><div class="enemy ${run.index===4?'boss':''}"></div><div class="arena-feedback" id="arena-feedback"></div></div><div class="row small" style="margin-top:12px"><b>${run.index} / 5 처치</b><span style="color:var(--violet)">${run.correct} COMBO · ◆ +${run.coins}</span></div><div class="xp"><i style="width:${run.index*20}%"></i></div><div class="question-card"><div class="row"><span class="question-meta">영어 → 뜻 · 알맞은 뜻을 골라 주세요</span></div><h1>${q[0]}</h1><div class="row"><button class="icon-btn" data-action="speak" aria-label="영어 발음 듣기">${icon('sound')}</button><span id="timer" class="timer">5.0 초</span></div></div><div class="answers">${q[2].map((answer,i)=>`<button class="answer" data-action="answer" data-index="${i}"><span>${i+1}</span>${answer}</button>`).join('')}</div><div class="battle-help" id="battle-help" aria-live="polite">정답이 곧 마법이 됩니다. 키보드 1–4로도 답할 수 있어요.</div>`;}
  function tick(){clearInterval(timer);run.last=performance.now();timer=setInterval(()=>{if(!run||run.done||run.paused||run.locked)return;const now=performance.now(),delta=now-run.last;run.last=now;run.remaining=Math.max(0,run.remaining-delta);run.elapsed+=delta;const el=$('timer');if(el){el.textContent=`${(run.remaining/1000).toFixed(1)} 초`;el.classList.toggle('danger',run.remaining<2000);}if(run.remaining<=0)answer(-1);},50);}
  function pause(){if(!run||run.done)return;run.paused=true;clearInterval(timer);}
  function resume(){close();if(run&&!run.done){run.paused=false;tick();}}
  function addExp(amount){state.exp+=amount;while(state.exp>=1000){state.exp-=1000;state.level++;}}
  function answer(index){if(!run||run.done||run.paused||run.locked)return;run.locked=true;clearInterval(timer);const q=question(),ok=q[2][index]===q[1];state.answered++;if(ok){state.correct++;run.correct++;const interval=character().id==='pugilist'?3:5;const gain=1+(run.correct%interval===0?1:0);run.coins+=gain;run.exp+=10;state.coins+=gain;addExp(10);state.best=Math.max(state.best,run.correct);$('arena').classList.add('hit');$('arena-feedback').textContent=`${run.correct} COMBO! +${gain} ◆`;}else{$('arena-feedback').textContent=index===-1?'시간 초과!':'아쉬워요!';}document.querySelectorAll('.answer').forEach((button,i)=>{button.disabled=true;button.classList.toggle('correct',q[2][i]===q[1]);button.classList.toggle('wrong',i===index&&!ok);});$('battle-help').textContent=ok?'정답! 크리스털 + 경험치 획득':`정답: ${q[0]} = ${q[1]}`;$('balance').textContent=num(state.coins);save();nextTimer=setTimeout(()=>{if(!run||run.done)return;if(!ok)return finish(false);run.index++;if(run.index===5)return finish(true);run.locked=false;run.remaining=5000;render();if(!run.paused)tick();},850);}
  function finish(clear){if(run.done)return;clearInterval(timer);clearTimeout(nextTimer);run.done=true;run.clear=clear;if(clear){run.coins+=10;run.exp+=100;state.coins+=10;addExp(100);state.clears++;}state.records.unshift({stage:`${worlds[world].name} · ${worlds[world].stages[stage]}`,clear,score:run.correct,coins:run.coins,time:new Date().toLocaleDateString('ko-KR')});state.records=state.records.slice(0,20);save();close();go('result');}
  function result(){return `<section class="result"><div class="result-symbol">${icon(run.clear?'trophy':'aura')}</div><div class="eyebrow" style="color:var(--violet)">${run.clear?'STAGE CLEAR':'KEEP EXPLORING'}</div><h1>${run.clear?'크리스털을 되찾았어요!':'다음엔 더 멀리 갈 수 있어요'}</h1><p>${worlds[world].stages[stage]} · ${run.correct} / 5 정답<br>${run.clear?'당신의 단어가 숲을 다시 빛나게 했어요.':'이번에 배운 단어는 다음 모험의 힘이 됩니다.'}</p><div class="reward-number">◆ +${run.coins}</div><div class="panel row small"><span>획득 경험치 <b>+${run.exp} EXP</b></span><span>풀이 시간 <b>${(run.elapsed/1000).toFixed(1)}초</b></span></div>${run.clear?`<button class="chest" data-action="chest" ${run.chest?'disabled':''}>${icon('chest')}<b>${run.chest?`보물상자 보상 +${run.treasure} ◆ 획득 완료`:'보물상자 열기'}</b><div class="small" style="margin-top:7px">${run.chest?'보상이 지갑에 추가되었어요':'누르면 추가 크리스털 10–30개를 얻어요'}</div></button>`:''}<button class="primary" data-action="retry">다시 도전하기 →</button><div class="actions"><button class="secondary" data-action="nav" data-page="dungeon">다른 던전</button><button class="secondary" data-action="nav" data-page="home">홈으로</button></div></section>`;}
  function showItem(id){const item=itemById(id);if(!item)return;const owned=state.owned.includes(id),equipped=state.equipped[item.slot]===id;modal(`<div class="eyebrow">${item.slot==='reward'?'REAL WORLD REWARD':'CRYSTAL COLLECTION'}</div><div class="item-art">${icon(item.art)}</div><h2>${item.name}</h2><p>${item.desc}</p><div class="row" style="margin-top:18px"><b>${num(item.price)} ◆</b><span class="small muted">보유 ${num(state.coins)} ◆</span></div><button class="primary" data-action="${owned?'equip':'buy'}" data-id="${id}" ${!owned&&state.coins<item.price?'disabled':''}>${owned?(equipped?'장착 해제':'장착하기'):(state.coins<item.price?'크리스털이 부족해요':item.slot==='reward'?'보상 신청하기':'구매하기')}</button>${!owned&&state.coins<item.price?'<button class="text-btn" data-action="wallet">시안용 크리스털 충전 →</button>':''}`);}
  function showCharacters(){modal(`<div class="eyebrow">CHOOSE YOUR HERO</div><h2>어떤 모습으로 떠날까요?</h2><p>직업마다 남녀 캐릭터를 선택할 수 있어요.<br>시안에서는 장비와 성장 기록을 공유합니다.</p><div class="character-grid">${classes.flatMap((c,i)=>c.paths.map((path,g)=>`<button class="character-option ${state.character===i&&state.gender===g?'active':''}" data-action="character" data-index="${i}" data-gender="${g}"><img src="assets/avatars/${path}" alt=""><b>${c.label} · ${g?'여성':'남성'}</b></button>`)).join('')}</div>`);}
  function records(){modal(`<div class="eyebrow">ADVENTURE JOURNAL</div><h2>모험 기록</h2><p>총 ${state.clears}회 클리어 · 최고 ${state.best}콤보</p>${state.records.length?state.records.map(r=>`<div class="record-row row"><div><b>${esc(r.stage)}</b><small>${esc(r.time)} · ${r.score}/5 정답</small></div><span>${r.clear?'CLEAR':'도전'}<small>+${r.coins} ◆</small></span></div>`).join(''):'<div class="notice">시안의 초기 기록은 18회 클리어입니다.<br>새로 도전하면 이곳에 상세 기록이 쌓여요.</div>'}`);}
  function requests(){modal(`<div class="eyebrow">REWARD REQUESTS</div><h2>보상 신청 내역</h2><p>시안에서는 보호자 승인 대기 상태까지 체험할 수 있어요.</p>${state.requests.length?state.requests.map(r=>`<div class="record-row row"><b>${itemById(r).name}</b><span class="badge">승인 대기</span></div>`).join(''):'<div class="notice">아직 신청한 보상이 없어요.</div>'}`);}
  document.addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(!b||b.disabled)return;const a=b.dataset.action,id=b.dataset.id;
    if(a==='nav')navigate(b.dataset.page);
    else if(a==='home')navigate('home');
    else if(a==='close'){close();if(page==='battle')resume();}
    else if(a==='characters')showCharacters();
    else if(a==='character'){state.character=Number(b.dataset.index);state.gender=Number(b.dataset.gender);save();close();render();toast(`${character().label} 캐릭터로 변경했어요`);}
    else if(a==='item')showItem(id);
    else if(a==='filter'){filter=b.dataset.filter;render();}
    else if(a==='buy'){const item=itemById(id);if(!item||state.coins<item.price||state.owned.includes(id))return;state.coins-=item.price;if(item.slot==='reward')state.requests.push(id);else state.owned.push(id);save();render();if(item.slot==='reward'){requests();toast('보상 신청이 접수되었어요');}else{showItem(id);toast('구매 완료! 이제 장착할 수 있어요');}}
    else if(a==='equip'){const item=itemById(id);if(!item||!state.owned.includes(id))return;if(state.equipped[item.slot]===id)delete state.equipped[item.slot];else state.equipped[item.slot]=id;save();close();render();toast(state.equipped[item.slot]?'장착했어요! 캐릭터 모습이 바뀌었어요':'장착을 해제했어요');}
    else if(a==='slot'){const owned=items.find(i=>i.slot===b.dataset.slot&&state.owned.includes(i.id));if(owned)showItem(owned.id);else{filter='avatar';go('shop');toast('이 슬롯에 어울리는 아이템을 골라 보세요');}}
    else if(a==='world'){world=Number(b.dataset.index);go('stages');}
    else if(a==='stage'){stage=Number(b.dataset.index);modal(`<div class="eyebrow">READY TO EXPLORE</div><h2>${worlds[world].stages[stage]}</h2><p>5개의 단어로 정령을 물리치세요.<br>문제당 5초, 오답 또는 시간 초과 시 종료됩니다.<br>정답 크리스털은 실패해도 남아요.</p><button class="primary" data-action="start">준비됐어요 · 전투 시작 →</button>`);}
    else if(a==='start'||a==='retry')start();
    else if(a==='answer')answer(Number(b.dataset.index));
    else if(a==='pause'){pause();modal('<div class="eyebrow">PAUSED</div><h2>잠깐의 휴식</h2><p>시간도 함께 멈췄어요. 준비되면 다시 시작하세요.</p><button class="primary" data-action="resume">계속하기</button><button class="text-btn" data-action="leave" data-page="dungeon">도전을 마치고 던전으로</button>');}
    else if(a==='resume')resume();
    else if(a==='leave'){if(run&&!run.done)finish(false);close();go(b.dataset.page);}
    else if(a==='speak'){if(window.WordoriaNativeSpeech?.speak){window.WordoriaNativeSpeech.speak(question()[0],{lang:'en-US',rate:.8}).catch(()=>toast('기기 음성 엔진을 사용할 수 없어요'));}else if('speechSynthesis' in window){speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(question()[0]);utterance.lang='en-US';utterance.rate=.8;speechSynthesis.speak(utterance);}else toast('이 브라우저에서는 음성 읽기를 지원하지 않아요');}
    else if(a==='chest'&&run&&run.clear&&!run.chest){run.chest=true;const min=character().id==='ranger'?20:10;run.treasure=min+Math.floor(Math.random()*(31-min));state.coins+=run.treasure;run.coins+=run.treasure;if(state.records[0])state.records[0].coins=run.coins;save();render();toast(`보물 발견! +${run.treasure} ◆`);}
    else if(a==='records')records();
    else if(a==='stats')modal(`<div class="eyebrow">ADVENTURER STATUS</div><h2>${character().name} · LV.${state.level}</h2><p>${character().label} · ${character().trait}</p><div class="record-row row"><span>경험치</span><b>${state.exp} / 1,000</b></div><div class="record-row row"><span>최고 콤보</span><b>${state.best}</b></div><div class="record-row row"><span>누적 정답</span><b>${state.correct} / ${state.answered}</b></div><div class="record-row row"><span>클리어</span><b>${state.clears}</b></div><button class="primary" data-action="records">모험 기록 보기</button>`);
    else if(a==='requests')requests();
    else if(a==='wallet')modal(`<div class="eyebrow">CRYSTAL WALLET</div><h2>◆ ${num(state.coins)}</h2><p>단어를 맞히고 모은 모험의 빛이에요.<br>시안에서는 무료로 충전해 구매를 체험할 수 있어요.</p><button class="primary" data-action="charge">시안용 1,000 ◆ 충전</button>`);
    else if(a==='charge'){state.coins+=1000;save();close();render();toast('시안용 크리스털 1,000개 충전 완료');}
    else if(a==='reset'){if(page==='battle')pause();modal('<h2>시안을 처음으로 돌릴까요?</h2><p>이 시안에서 구매한 장비와 플레이 기록을 초기화합니다.</p><button class="primary" data-action="confirm-reset">초기화하기</button>');}
    else if(a==='confirm-reset'){clearInterval(timer);clearTimeout(nextTimer);state=initial();run=null;save();close();go('home');toast('처음 모습으로 돌아왔어요');}
  });
  $('dialog').addEventListener('cancel',e=>{e.preventDefault();close();if(page==='battle')resume();});
  document.addEventListener('keydown',e=>{if(page==='battle'&&!$('dialog').open&&/^[1-4]$/.test(e.key)){e.preventDefault();answer(Number(e.key)-1);}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&page==='battle'&&run&&!run.done&&!run.paused){pause();modal('<h2>모험을 잠시 멈췄어요</h2><p>다시 준비되면 계속할 수 있어요.</p><button class="primary" data-action="resume">계속하기</button>');}});
  render();
})();
