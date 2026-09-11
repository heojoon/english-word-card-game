(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const demo = params.get('demo') === '1';
  const localHost = ['localhost', '127.0.0.1'].includes(location.hostname);
  const nativeApp = document.documentElement.classList.contains('native-app') || Boolean(window.Capacitor?.isNativePlatform?.());
  const useLocalDb = params.get('db') === 'local' || (params.get('db') !== 'remote' && localHost && !nativeApp);
  const DB_URL = useLocalDb ? 'http://127.0.0.1:54321' : 'https://uobagmggryhsqlpxhfob.supabase.co';
  const DB_KEY = useLocalDb ? 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH' : 'sb_publishable_NnzXTAh_47i7g5ndSzkxEQ_gy7X-lAz';
  const stages = window.QUIZ_STAGES || {};
  const stageKeys = Object.keys(stages);
  const defaultPlayers = ['율이', '아빠', '손님'];
  const icons = {
    home:'<path d="M3 10 12 3l9 7v10H5V10M9 20v-7h6v7"/>', gear:'<path d="m8 3-5 4 3 5 2-1v10h8V11l2 1 3-5-5-4c0 4-8 4-8 0Z"/>',
    dungeon:'<path d="m4 3 13 13M3 3l1 5 11 11 4-4L8 4 3 3Zm11 14 5 5m-5-1 7-7M21 3 9 15m12-12-1 5-5 5M7 17l-5 5m0-7 7 7"/>',
    shop:'<path d="M3 9h18l-2-6H5L3 9Zm1 1v11h16V10M9 21v-7h6v7M3 9c0 4 4 4 5 0 0 4 4 4 4 0 0 4 4 4 4 0 1 4 5 4 5 0"/>',
    crown:'<path d="m3 7 4 4 5-7 5 7 4-4-3 13H6L3 7Z"/><path d="M6 16h12"/>', cape:'<path d="M8 3h8l5 18-9-3-9 3L8 3Z"/><path d="M8 3c0 5 8 5 8 0M12 7v10"/>',
    aura:'<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z"/>', pet:'<path d="M3 16c0-14 18-14 18 0 0 7-18 7-18 0Z"/><path d="M8 13v2m8-2v2m-6 2q2 2 4 0"/>',
    sword:'<path d="m14 3 7-1-1 7-11 11-5-5L14 3ZM3 13l8 8m-7-3-3 3M16 6l-8 9"/>', chest:'<path d="M3 10V7c0-5 18-5 18 0v3M3 10h18v11H3V10Zm7-3h4v8h-4V7Z"/><path d="M6 11v10m12-10v10"/>',
    island:'<path d="m2 15 10-13 10 13-10 8-10-8Zm0 0h20M8 7l4 3 4-3m-4 8v8"/>', sound:'<path d="M4 9h4l5-5v16l-5-5H4V9Zm12-2c4 3 4 7 0 10m3-13c6 5 6 11 0 16"/>',
    pause:'<path d="M8 5v14m8-14v14"/>', trophy:'<path d="M7 3h10v6c0 7-10 7-10 0V3Zm0 2H3v4c0 3 4 3 4 3m10-7h4v4c0 3-4 3-4 3m-5 3v6m-4 0h8"/>',
    gift:'<path d="M3 9h18v5H3V9Zm2 5v7h14v-7M12 9v12M12 9C0 8 7-3 12 9Zm0 0c12-1 5-12 0 0Z"/>'
  };
  const classDefs = {
    warrior:{label:'전사',title:'CRYSTAL GUARDIAN',trait:'강인함 · 가끔 제한시간 +1초',paths:{male:'warrior.webp',female:'variants/warrior-female.webp'}},
    mage:{label:'마법사',title:'ARCANE SCHOLAR',trait:'타임 스톱 · 가끔 시간 정지',paths:{male:'mage.webp',female:'variants/mage-female.webp'}},
    pugilist:{label:'권투사',title:'COMBO MASTER',trait:'콤보 마스터 · 3콤보 보너스',paths:{male:'variants/pugilist-male.webp',female:'pugilist.webp'}},
    ranger:{label:'궁수',title:'TREASURE HUNTER',trait:'보물 사냥꾼 · 상자 최소 20개',paths:{male:'variants/ranger-male.webp',female:'ranger.webp'}}
  };
  const worlds = [
    {name:'속삭이는 숲',sub:'기초 단어 · 초록 정령의 산책길',tag:'CHAPTER 01',keys:stageKeys.slice(0,2)},
    {name:'서리 수정 동굴',sub:'동사와 표현 · 푸른 수정의 비밀',tag:'CHAPTER 02',keys:stageKeys.slice(2,4)},
    {name:'별빛 마법 도서관',sub:'도전 단어 · 잃어버린 마법의 기록',tag:'CHAPTER 03',keys:stageKeys.slice(4,6)}
  ];
  const legacyVariant = {warrior:'male',mage:'male',pugilist:'female',ranger:'female'};
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.aura}</svg>`;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num = value => Number(value || 0).toLocaleString('ko-KR');
  const shuffle = input => { const a=input.slice(); for(let i=a.length-1;i;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };

  let page = 'home', filter = 'all', worldIndex = 0, selectedStage = stageKeys[0];
  let players = defaultPlayers.slice(), player = localStorage.getItem('fantasyQuizPlayer') || defaultPlayers[0];
  let allCharacters = [], characters = [], selectedCharacter = null, shopItems = [], inventory = [], redemptions = [], records = [];
  let dbOnline = demo, run = null, timerId = null, nextTimer = null, toastTimer = null;
  let newClass = 'warrior', newVariant = 'male', newAccent = 'violet', newCharacterName = '';

  const demoKey = 'wordoria-production-demo-v1';
  let demoState = {characters:[{id:'demo-mage',player:'율이',name:'블리자드',class:'mage',avatar_variant:'female',accent:'violet',coins:1250,equipped_items:{}}],records:[],inventory:[],redemptions:[]};
  try { demoState = {...demoState,...JSON.parse(localStorage.getItem(demoKey) || '{}')}; } catch {}
  const saveDemo = () => localStorage.setItem(demoKey, JSON.stringify(demoState));

  function headers(extra={}) { return {'apikey':DB_KEY,'Authorization':`Bearer ${DB_KEY}`,...extra}; }
  async function apiGet(path){const r=await fetch(`${DB_URL}/rest/v1/${path}`,{headers:headers()});if(!r.ok)throw new Error(await r.text());return r.json();}
  async function apiPost(path,body,prefer='return=representation'){const r=await fetch(`${DB_URL}/rest/v1/${path}`,{method:'POST',headers:headers({'Content-Type':'application/json','Prefer':prefer}),body:JSON.stringify(body)});if(!r.ok)throw new Error(await r.text());const text=await r.text();return text?JSON.parse(text):null;}
  const rpc = (name,body) => apiPost(`rpc/${name}`,body);
  const characterDef = c => classDefs[c?.class] || classDefs.warrior;
  const variantOf = c => c?.avatar_variant || localStorage.getItem(`fantasyQuizAvatar:${c?.id}`) || legacyVariant[c?.class] || 'male';
  const imagePath = c => `assets/avatars/${characterDef(c).paths[variantOf(c)]}`;
  const slotFor = item => ({crown:'head',cape:'back',wings:'back',aura:'aura',pet:'pet'})[item?.code] || 'aura';
  const itemById = id => shopItems.find(item => String(item.id) === String(id));
  function equippedMap(c=selectedCharacter){
    if(!c)return {};
    let map=c.equipped_items;
    if(typeof map==='string'){try{map=JSON.parse(map);}catch{map={};}}
    map={...(map||{})};
    if(c.equipped_item_id){const item=itemById(c.equipped_item_id);if(item&&!map[slotFor(item)])map[slotFor(item)]=item.id;}
    return map;
  }
  function portrait(c=selectedCharacter){
    if(!c)return '';
    const eq=equippedMap(c);
    return `<div class="portrait">${eq.aura?'<div class="equipped-aura"></div>':''}${eq.back?'<div class="equipped-back"></div>':''}<img src="${imagePath(c)}" alt="${esc(characterDef(c).label)} ${variantOf(c)==='female'?'여성':'남성'} 캐릭터">${eq.head?icon('crown').replace('<svg ','<svg class="equipped-head" '):''}${eq.pet?`<div class="equipped-pet">${icon('pet')}</div>`:''}</div>`;
  }
  function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2400);}
  function modal(html){if(page==='battle'&&run&&!run.done)pause();$('dialog-content').innerHTML=html;if(!$('dialog').open)$('dialog').showModal();}
  function closeDialog(){if($('dialog').open)$('dialog').close();}
  function title(kicker,name,desc){return `<div class="page-title"><div class="eyebrow">${kicker}</div><h1>${name}</h1><p>${desc}</p></div>`;}
  function unique(values){const seen=new Set();return values.map(v=>String(v).trim()).filter(v=>{const k=v.toLocaleLowerCase();if(!v||seen.has(k))return false;seen.add(k);return true;});}
  function selectedRecords(){return records.filter(r=>!selectedCharacter||!r.character_id||r.character_id===selectedCharacter.id);}
  function stats(){
    const rows=selectedRecords(), answered=rows.reduce((n,r)=>n+Number(r.total||0),0), correct=rows.reduce((n,r)=>n+Number(r.correct||0),0), clears=rows.filter(r=>r.cleared).length;
    const level=1+Math.floor(correct/100), exp=(correct%100)*10;
    return {answered,correct,clears,level,exp,accuracy:answered?Math.round(correct/answered*100):0,best:rows.reduce((n,r)=>Math.max(n,Number(r.correct||0)),0)};
  }
  function stageCleared(key){return records.some(r=>r.cleared&&r.stage===stages[key]?.name);}
  function earnedCoins(count,clear=false){const interval=selectedCharacter?.class==='pugilist'?3:5;return count+Math.floor(count/interval)+(clear?10:0);}

  async function loadAll(){
    if(demo){
      allCharacters=demoState.characters;shopItems=[
        {id:1,code:'crown',name:'황금 왕관',category:'avatar',price:30,icon:'👑',description:'모험가의 머리 위에서 빛나는 왕관입니다.'},
        {id:2,code:'cape',name:'불꽃 망토',category:'avatar',price:40,icon:'🧥',description:'따뜻한 불꽃빛 망토입니다.'},
        {id:3,code:'aura',name:'별빛 오라',category:'avatar',price:50,icon:'✨',description:'캐릭터 주변을 감싸는 별빛입니다.'},
        {id:4,code:'wings',name:'천사 날개',category:'avatar',price:70,icon:'🪽',description:'가벼운 빛의 날개입니다.'},
        {id:5,code:'snack',name:'간식 1개',category:'gift',price:60,icon:'🍪',description:'보호자 승인 후 받을 수 있어요.'}
      ];records=demoState.records;dbOnline=true;
    } else {
      try {
        [allCharacters,shopItems,records]=await Promise.all([
          apiGet('game_characters?select=*&order=created_at.asc'),
          apiGet('shop_items?select=id,code,name,category,price,icon,description,repeatable&active=eq.true&order=price.asc'),
          apiGet('game_scores?select=player,stage,correct,total,cleared,created_at,character_id,duration_ms,coins_earned,id&order=created_at.desc&limit=1000')
        ]);dbOnline=true;
      } catch(error){console.error(error);dbOnline=false;allCharacters=[];shopItems=[];records=[];}
    }
    players=unique(defaultPlayers.concat(allCharacters.map(c=>c.player),readCustomPlayers()));
    if(!players.includes(player))player=players[0];
    chooseCharacter();await loadCharacterExtras();setConnection();
  }
  function readCustomPlayers(){try{const v=JSON.parse(localStorage.getItem('fantasyQuizPlayers')||'[]');return Array.isArray(v)?v:[];}catch{return [];}}
  function chooseCharacter(){
    characters=allCharacters.filter(c=>c.player===player);
    const saved=localStorage.getItem(`fantasyQuizCharacter:${player}`);
    selectedCharacter=characters.find(c=>c.id===saved)||characters[0]||null;
    if(selectedCharacter)localStorage.setItem(`fantasyQuizCharacter:${player}`,selectedCharacter.id);
  }
  async function loadCharacterExtras(){
    if(!selectedCharacter){inventory=[];redemptions=[];return;}
    if(demo){inventory=demoState.inventory.filter(x=>x.character_id===selectedCharacter.id);redemptions=demoState.redemptions.filter(x=>x.character_id===selectedCharacter.id);return;}
    if(!dbOnline)return;
    try{[inventory,redemptions]=await Promise.all([
      apiGet(`character_inventory?select=item_id,character_id&character_id=eq.${selectedCharacter.id}`),
      apiGet(`reward_redemptions?select=id,item_id,status,price_paid,created_at&character_id=eq.${selectedCharacter.id}&order=created_at.desc&limit=20`)
    ]);}catch(error){console.error(error);inventory=[];redemptions=[];}
  }
  function setConnection(){$('connection-status').textContent=demo?'체험 모드 · 이 브라우저에 저장됩니다':dbOnline?(useLocalDb?'● 로컬 Supabase 연결됨':'● Supabase 연결됨'):'데이터베이스 연결 실패 · 로컬 Supabase를 실행하거나 ?demo=1을 사용하세요';$('connection-status').classList.toggle('connection-error',!dbOnline);}
  async function refresh(){await loadAll();render();}

  function render(){
    document.body.dataset.screen=page;
    $('balance').textContent=selectedCharacter?num(selectedCharacter.coins):'—';
    const active=['stages','battle','result'].includes(page)?'dungeon':page;
    $('nav').innerHTML=[['home','홈'],['gear','장비'],['dungeon','던전'],['shop','상점']].map(([id,label])=>`<button data-action="nav" data-page="${id}" ${active===id?'aria-current="page"':''}>${icon(id)}<span>${label}</span></button>`).join('');
    const renderer={home:renderHome,gear:renderGear,shop:renderShop,dungeon:renderDungeon,stages:renderStages,battle:renderBattle,result:renderResult}[page]||renderHome;
    $('screen').innerHTML=renderer();
  }
  function go(target){page=target;render();$('screen').focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
  function navigate(target){if(page==='battle'&&run&&!run.done){pause();modal(`<div class="eyebrow">PAUSED</div><h2>이번 도전을 마칠까요?</h2><p>지금까지 맞힌 문제의 보상과 기록은 저장됩니다.</p><div class="actions"><button class="secondary" data-action="resume">계속하기</button><button class="primary" data-action="leave" data-page="${target}">저장하고 이동</button></div>`);return;}go(target);}
  function profileBar(){return `<div class="profile-switch">${players.map(name=>`<button class="profile-chip ${name===player?'active':''}" data-action="player" data-player="${esc(name)}">${esc(name)}</button>`).join('')}<button class="profile-chip add" data-action="add-player">＋ 유저</button></div>`;}
  function renderHome(){
    if(!selectedCharacter)return `${profileBar()}<div class="panel onboarding"><div class="result-symbol">${icon('sword')}</div><div class="eyebrow" style="color:var(--violet)">WELCOME, ADVENTURER</div><h1>${esc(player)}님의 모험가를 만들어 주세요</h1><p>직업과 모습을 고르면 단어 던전에 바로 입장할 수 있어요.<br>정답이 공격이 되고 크리스털이 보상으로 쌓입니다.</p>${!dbOnline&&!demo?'<div class="db-warning">현재 데이터베이스에 연결할 수 없어 캐릭터를 만들 수 없습니다.</div>':''}<button class="primary" data-action="new-character" ${!dbOnline&&!demo?'disabled':''}>첫 캐릭터 만들기 →</button></div>`;
    const c=selectedCharacter,d=characterDef(c),s=stats();
    return `${profileBar()}<button class="hero" data-action="characters" aria-label="캐릭터 변경"><span class="level">LV.${s.level}</span><span class="hero-player">${esc(player)}의 모험가</span><span class="hero-hint">캐릭터 변경 ›</span><div class="hero-copy"><div class="eyebrow">${d.title}</div><h1>${esc(c.name)}</h1><p>${d.label} · ${d.trait.split(' · ')[0]}</p></div>${portrait()}</button><button class="panel progress-card" style="width:100%" data-action="stats"><span class="row small"><span>다음 레벨까지</span><b>${num(s.exp)} / 1,000 EXP</b></span><div class="xp"><i style="width:${s.exp/10}%"></i></div></button><div class="stats"><button class="panel stat" data-action="stats"><span>최고 콤보</span><b>${s.best}</b></button><button class="panel stat" data-action="stats"><span>정답률</span><b>${s.accuracy}%</b></button><button class="panel stat" data-action="records"><span>클리어</span><b>${s.clears}</b></button></div><div class="section-title"><h2>오늘의 상점</h2><button class="text-btn" data-action="nav" data-page="shop">모두 보기 ›</button></div><div class="items">${shopItems.slice(0,3).map(item=>renderItemCard(item)).join('')||'<div class="empty-state">상점 상품을 불러오지 못했어요.</div>'}</div><button class="primary home-cta" data-action="nav" data-page="dungeon">WORD DUNGEON 입장 <span class="arrow">→</span></button>`;
  }
  function itemOwned(item){return inventory.some(x=>String(x.item_id)===String(item.id));}
  function renderItemCard(item,ownedView=false){const owned=itemOwned(item),eq=Object.values(equippedMap()).some(id=>String(id)===String(item.id));return `<button class="item" data-action="item" data-id="${item.id}">${ownedView?`<span class="badge">${eq?'장착 중':'보유'}</span>`:''}<span class="item-art"><span class="item-icon-text" aria-hidden="true">${esc(item.icon||'◆')}</span></span><b>${esc(item.name)}</b><small class="${owned?'owned':''}">${owned?(eq?'✓ 장착 중':'✓ 보유 중'):`${num(item.price)} ◆`}</small></button>`;}
  function renderGear(){
    if(!selectedCharacter)return noCharacter('장비를 사용하려면 모험가가 필요해요.');
    const s=stats(),eq=equippedMap();
    return `${title('MY COLLECTION','나만의 모험가','수집한 장비를 장착하고 새로운 모습으로 모험을 떠나요.')}<div class="equipment-stage"><span class="level">LV.${s.level}</span>${portrait()}</div><div class="row"><h2 style="font-size:17px;margin-top:15px">${esc(selectedCharacter.name)}</h2><button class="text-btn" data-action="characters">캐릭터 변경 ›</button></div><div class="slots">${[['head','머리','crown'],['back','등','cape'],['aura','오라','aura'],['pet','펫','pet']].map(([slot,label,art])=>`<button class="slot" data-action="slot" data-slot="${slot}"><span class="slot-art">${icon(art)}</span><span>${eq[slot]?esc(itemById(eq[slot])?.name||label):`${label} · 비어 있음`}</span></button>`).join('')}</div><div class="section-title"><h2>내 장비함 <span class="muted small">${inventory.length}</span></h2><button class="text-btn" data-action="nav" data-page="shop">상점 가기 ›</button></div>${inventory.length?`<div class="items catalog">${shopItems.filter(itemOwned).map(i=>renderItemCard(i,true)).join('')}</div>`:'<div class="panel empty-state">아직 수집한 장비가 없어요.<br><button class="text-btn" data-action="nav" data-page="shop">상점에서 첫 장비 만나기 →</button></div>'}<div class="sync-note">장착 상태는 캐릭터와 함께 저장됩니다.</div>`;
  }
  function renderShop(){
    if(!selectedCharacter)return noCharacter('상점을 이용하려면 모험가가 필요해요.');
    const visible=shopItems.filter(i=>filter==='all'||(filter==='reward'?i.category==='gift':i.category==='avatar'));
    return `${title('CRYSTAL BOUTIQUE','모험을 빛내는 상점','열심히 모은 크리스털로 나만의 이야기를 꾸며요.')}<div class="panel row"><span class="small muted">${esc(selectedCharacter.name)}의 크리스털</span><b style="color:var(--violet)">◆ ${num(selectedCharacter.coins)}</b></div><div class="tabs" aria-label="상점 분류">${[['all','전체'],['avatar','아바타'],['reward','현실 보상']].map(([key,label])=>`<button data-action="filter" data-filter="${key}" class="${filter===key?'active':''}" aria-pressed="${filter===key}">${label}</button>`).join('')}</div><div class="items catalog">${visible.map(item=>renderItemCard(item)).join('')||'<div class="empty-state">판매 중인 상품이 없어요.</div>'}</div><button class="secondary" style="width:100%;margin-top:15px" data-action="requests">보상 신청 내역 (${redemptions.length}) →</button>`;
  }
  function noCharacter(message){return `${title('CHOOSE YOUR HERO','모험가가 필요해요',message)}<button class="primary" data-action="new-character" ${!dbOnline&&!demo?'disabled':''}>캐릭터 만들기 →</button>`;}
  function renderDungeon(){return `${title('WORD DUNGEON','오늘은 어디로 떠날까요?','한 단어, 한 번의 공격. 잃어버린 크리스털을 되찾아요.')}${worlds.map((w,i)=>{const count=w.keys.filter(stageCleared).length;return `<button class="dungeon-card" data-action="world" data-index="${i}"><span class="island">${icon('island')}</span><span class="eyebrow" style="color:var(--violet)">${w.tag}</span><h2>${w.name}</h2><p>${w.sub}</p><span class="row small"><span class="badge">${w.keys.length} STAGES · ${count} CLEAR</span><span>탐험하기 →</span></span></button>`;}).join('')}<div class="notice">각 문제는 5초 서바이벌로 진행됩니다. 오답 또는 시간 초과 시 종료되지만, 그전까지 획득한 크리스털은 저장돼요.</div><button class="secondary" style="width:100%" data-action="records">모험 기록 보기</button>`;}
  function renderStages(){const w=worlds[worldIndex];return `<button class="text-btn" data-action="nav" data-page="dungeon">← 던전 목록</button>${title(w.tag,w.name,'도전할 길을 선택하세요. 마지막에는 보물상자가 기다려요.')}<div class="stage-list">${w.keys.map((key,i)=>{const s=stages[key];return `<button class="stage-btn" data-action="stage" data-stage="${key}"><span class="stage-no">${String(stageKeys.indexOf(key)+1).padStart(2,'0')}</span><span><b>${esc(s.name)}</b><small>${esc(s.desc||`${s.words.length}문제`)} · 5초 서바이벌</small>${stageCleared(key)?'<span class="stage-status">✓ CLEAR</span>':''}</span><span>→</span></button>`;}).join('')}</div><div class="notice">정답 +1 ◆ · 콤보 보너스 · 클리어 +10 ◆<br>스테이지는 횟수 제한 없이 다시 도전할 수 있어요.</div>`;}

  function posMatch(a,b){return a[1]===b[1]||a[1].includes(b[1])||b[1].includes(a[1]);}
  function formScore(a,b){let score=Math.max(0,5-Math.abs(a[0].length-b[0].length));if(a[0][0]===b[0][0])score+=3;if(a[1]===b[1])score+=6;else if(posMatch(a,b))score+=4;return score+Math.random()*2;}
  function makeQuestion(entry,pool,mode){const choices=pool.filter(x=>x[0]!==entry[0]).sort((a,b)=>formScore(entry,b)-formScore(entry,a)).slice(0,8);const enKo=mode==='en-ko',answer=enKo?`[${entry[1]}] ${entry[2]}`:entry[0];return {entry,mode,prompt:enKo?entry[0]:`[${entry[1]}] ${entry[2]}`,answer,choices:shuffle([answer,...shuffle(choices).slice(0,3).map(x=>enKo?`[${x[1]}] ${x[2]}`:x[0])])};}
  function questionDuration(){const cls=selectedCharacter?.class;let duration=5000,skill='';if(cls==='warrior'&&Math.random()<.15){duration=6000;skill='강인함 · TIME +1';}else if(cls==='mage'&&Math.random()<.1){duration=6500;skill='TIME STOP · 1.5초';}return {duration,skill};}
  function startBattle(){
    if(!selectedCharacter){closeDialog();go('home');toast('먼저 캐릭터를 만들어 주세요');return;}
    clearInterval(timerId);clearTimeout(nextTimer);const source=stages[selectedStage];
    run={deck:shuffle(source.words).map(w=>({entry:w,mode:Math.random()<.5?'en-ko':'ko-en'})),index:0,correct:0,elapsed:0,locked:false,paused:false,done:false,clear:false,result:null,chest:false,treasure:0};
    prepareQuestion();closeDialog();go('battle');tick();
  }
  function prepareQuestion(){const item=run.deck[run.index],timing=questionDuration();run.question=makeQuestion(item.entry,stages[selectedStage].words,item.mode);run.remaining=timing.duration;run.maxTime=timing.duration;run.skill=timing.skill;run.last=performance.now();run.locked=false;}
  function renderBattle(){const q=run.question,total=run.deck.length,boss=run.index===total-1;return `<div class="battle-top row"><div class="stage-copy"><div class="eyebrow" style="color:var(--violet)">${esc(stages[selectedStage].name)} · ${run.index+1}/${total}</div><b>${esc(stages[selectedStage].desc||'Word Quest')}</b></div><button class="icon-btn" data-action="pause" aria-label="일시정지">${icon('pause')}</button></div><div class="arena ${run.skill?'skill':''}" id="arena"><div class="arena-floor"></div>${portrait()}${run.skill?`<span class="skill-chip">${run.skill}</span>`:''}<span class="enemy-label">${boss?'BOSS · 수정 정령':'LV. 1 · 민트 슬라임'}</span><div class="enemy ${boss?'boss':''}"></div><div class="arena-feedback" id="arena-feedback"></div></div><div class="row small" style="margin-top:12px"><b>${run.index} / ${total} 처치</b><span style="color:var(--violet)">${run.correct} COMBO · ◆ +${earnedCoins(run.correct)}</span></div><div class="xp"><i style="width:${run.index/total*100}%"></i></div><div class="question-card"><div class="question-meta">${q.mode==='en-ko'?'영어 → 뜻 · 알맞은 뜻을 골라 주세요':'뜻 → 영어 · 알맞은 단어를 골라 주세요'}</div><h1 class="${q.prompt.length>28?'long-question':''}">${esc(q.prompt)}</h1><div class="row"><button class="icon-btn" data-action="speak" aria-label="영어 발음 듣기">${icon('sound')}</button><span id="timer" class="timer">${(run.remaining/1000).toFixed(1)} 초</span></div></div><div class="answers">${q.choices.map((answer,i)=>`<button class="answer" data-action="answer" data-index="${i}"><span>${i+1}</span>${esc(answer)}</button>`).join('')}</div><div class="battle-help" id="battle-help" aria-live="polite">정답이 곧 공격이 됩니다. 키보드 1–4로도 답할 수 있어요.</div>`;}
  function tick(){clearInterval(timerId);run.last=performance.now();timerId=setInterval(()=>{if(!run||run.done||run.paused||run.locked)return;const now=performance.now(),delta=now-run.last;run.last=now;run.remaining=Math.max(0,run.remaining-delta);run.elapsed+=delta;const el=$('timer');if(el){el.textContent=`${(run.remaining/1000).toFixed(1)} 초`;el.classList.toggle('danger',run.remaining<2000);}if(run.remaining<=0)answer(-1);},50);}
  function pause(){if(!run||run.done)return;run.paused=true;clearInterval(timerId);}
  function resume(){closeDialog();if(run&&!run.done){run.paused=false;tick();}}
  function speak(text){if(!('speechSynthesis' in window)){toast('이 브라우저에서는 음성 읽기를 지원하지 않아요');return;}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=.82;speechSynthesis.speak(u);}
  function answer(index){
    if(!run||run.done||run.paused||run.locked)return;run.locked=true;clearInterval(timerId);const q=run.question,chosen=q.choices[index],ok=chosen===q.answer;
    document.querySelectorAll('.answer').forEach((button,i)=>{button.disabled=true;button.classList.toggle('correct',q.choices[i]===q.answer);button.classList.toggle('wrong',i===index&&!ok);});
    if(ok){run.correct++;document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'success'}}));$('arena').classList.add('hit');$('arena-feedback').textContent=`${run.correct} COMBO! ◆ +${earnedCoins(run.correct)-earnedCoins(run.correct-1)}`;$('battle-help').textContent='정답! 단어의 힘으로 몬스터를 물리쳤어요.';speak(q.entry[0]);}
    else{document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'error'}}));$('arena').classList.add('wrong');$('arena-feedback').textContent=index<0?'시간 초과!':'아쉬워요!';$('battle-help').textContent=`정답: ${q.entry[0]} = ${q.entry[2]}`;}
    nextTimer=setTimeout(()=>{if(!ok)return finishBattle(false,index<0?'timeout':'wrong');run.index++;if(run.index>=run.deck.length)return finishBattle(true);prepareQuestion();render();tick();},900);
  }
  async function finishBattle(clear,reason){
    if(run.done)return;run.done=true;run.clear=clear;run.reason=reason;clearInterval(timerId);clearTimeout(nextTimer);if(window.speechSynthesis)speechSynthesis.cancel();
    if(demo){const coins=earnedCoins(run.correct,clear),id=`demo-${Date.now()}`;selectedCharacter.coins+=coins;run.result={game_score_id:id,coins_earned:coins,balance:selectedCharacter.coins};const row={id,player,stage:stages[selectedStage].name,correct:run.correct,total:run.deck.length,cleared:clear,character_id:selectedCharacter.id,duration_ms:Math.round(run.elapsed),coins_earned:coins,created_at:new Date().toISOString()};demoState.records.unshift(row);records=demoState.records;saveDemo();}
    else if(dbOnline){try{const rows=await rpc('award_game_result',{p_character_id:selectedCharacter.id,p_stage:stages[selectedStage].name,p_correct:run.correct,p_total:run.deck.length,p_cleared:clear,p_duration_ms:Math.round(run.elapsed)});run.result=rows?.[0]||null;if(run.result)selectedCharacter.coins=run.result.balance;records=await apiGet('game_scores?select=player,stage,correct,total,cleared,created_at,character_id,duration_ms,coins_earned,id&order=created_at.desc&limit=1000');}catch(error){console.error(error);run.saveError=true;}}
    go('result');
  }
  function renderResult(){const r=run,result=r.result,earned=result?.coins_earned??earnedCoins(r.correct,r.clear);return `<section class="result"><div class="result-symbol">${icon(r.clear?'trophy':'aura')}</div><div class="eyebrow" style="color:var(--violet)">${r.clear?'STAGE CLEAR':'KEEP EXPLORING'}</div><h1>${r.clear?'크리스털을 되찾았어요!':r.reason==='timeout'?'시간이 다 되었어요':'다음엔 더 멀리 갈 수 있어요'}</h1><p>${esc(stages[selectedStage].name)} · ${r.correct} / ${r.deck.length} 정답<br>${r.clear?'당신의 단어가 던전을 다시 빛나게 했어요.':'이번에 배운 단어는 다음 모험의 힘이 됩니다.'}</p><div class="reward-number">◆ +${num(earned)}</div><div class="panel row small reward-breakdown"><span>정답 <b>${r.correct}</b> · 클리어 <b>${r.clear?'+10':'—'}</b></span><span>풀이 시간 <b>${(r.elapsed/1000).toFixed(1)}초</b></span></div><div class="save-state">${r.saveError?'⚠ 기록 저장에 실패했습니다':demo?'✓ 체험 기록 저장 완료':'✓ Supabase 기록 저장 완료'}</div>${r.clear?`<button class="chest" data-action="chest" ${r.chest||!result?.game_score_id?'disabled':''}>${icon('chest')}<b>${r.chest?`보물상자 +${r.treasure} ◆ 획득 완료`:'보물상자 열기'}</b><div class="small" style="margin-top:7px">${r.chest?'보상이 지갑에 추가되었어요':'추가 크리스털 10–30개를 얻어요'}</div></button>`:''}<button class="primary" data-action="retry">다시 도전하기 →</button><div class="actions"><button class="secondary" data-action="nav" data-page="dungeon">다른 던전</button><button class="secondary" data-action="nav" data-page="home">홈으로</button></div></section>`;}

  function showCharacters(){modal(`<div class="eyebrow">CHOOSE YOUR HERO</div><h2>모험가 선택</h2>${profileBar()}<div class="character-list">${characters.map(c=>`<button class="character-row ${c.id===selectedCharacter?.id?'active':''}" data-action="select-character" data-id="${c.id}"><img src="${imagePath(c)}" alt=""><span><b>${esc(c.name)}</b><small>${characterDef(c).label} · ${variantOf(c)==='female'?'여성':'남성'}</small></span><span class="wallet">◆ ${num(c.coins)}</span></button>`).join('')||'<div class="empty-state">이 유저는 아직 캐릭터가 없어요.</div>'}</div><button class="primary" data-action="new-character" ${!dbOnline&&!demo?'disabled':''}>＋ 새 캐릭터 만들기</button>`);}
  function showNewPlayer(){modal('<div class="eyebrow">NEW PLAYER</div><h2>새 유저 추가</h2><label class="form-label" for="player-name">유저 이름</label><input id="player-name" class="field" maxlength="12" autocomplete="off" placeholder="예: 엄마"><p>한글, 영문, 숫자, 공백, 밑줄과 하이픈을 사용할 수 있어요.</p><button class="primary" data-action="create-player">유저 추가</button>');setTimeout(()=>$('player-name')?.focus(),0);}
  function showNewCharacter(){newClass='warrior';newVariant='male';newAccent='violet';newCharacterName='';renderCharacterForm();}
  function renderCharacterForm(){if($('character-name'))newCharacterName=$('character-name').value;const d=classDefs[newClass];modal(`<div class="eyebrow">CREATE YOUR HERO</div><h2>${esc(player)}님의 새 모험가</h2><label class="form-label" for="character-name">캐릭터 이름</label><input id="character-name" class="field" maxlength="16" value="${esc(newCharacterName)}" placeholder="예: 불꽃검 율이"><label class="form-label">직업</label><div class="tabs">${Object.entries(classDefs).map(([id,c])=>`<button class="${id===newClass?'active':''}" data-action="class" data-value="${id}">${c.label}</button>`).join('')}</div><p>${d.trait}</p><label class="form-label">기본 외형</label><div class="choice-grid">${['male','female'].map(v=>`<button class="choice-card ${v===newVariant?'active':''}" data-action="variant" data-value="${v}"><img src="assets/avatars/${d.paths[v]}" alt="">${v==='male'?'남성':'여성'} 캐릭터</button>`).join('')}</div><label class="form-label">오라 색상</label><div class="accent-row">${['violet','red','blue','green','gold'].map(v=>`<button class="accent-choice ${v===newAccent?'active':''}" data-action="accent" data-value="${v}" aria-label="${v}"></button>`).join('')}</div><button class="primary" data-action="create-character">캐릭터 생성 →</button>`);}
  function showItem(id){const item=itemById(id);if(!item)return;const owned=itemOwned(item),eq=Object.values(equippedMap()).some(v=>String(v)===String(id));modal(`<div class="eyebrow">${item.category==='gift'?'REAL WORLD REWARD':'CRYSTAL COLLECTION'}</div><div class="item-art"><span class="item-icon-text">${esc(item.icon||'◆')}</span></div><h2>${esc(item.name)}</h2><p>${esc(item.description)}</p><div class="row" style="margin-top:18px"><b>${num(item.price)} ◆</b><span class="small muted">보유 ${num(selectedCharacter.coins)} ◆</span></div><button class="primary" data-action="${owned?'equip':'buy'}" data-id="${item.id}" ${!owned&&selectedCharacter.coins<item.price?'disabled':''}>${owned?(eq?'장착 해제':'장착하기'):(selectedCharacter.coins<item.price?'크리스털이 부족해요':item.category==='gift'?'보상 신청하기':'구매하기')}</button>`);}
  function showRecords(){const rows=selectedRecords().slice(0,20);modal(`<div class="eyebrow">ADVENTURE JOURNAL</div><h2>모험 기록</h2><p>${esc(selectedCharacter?.name||player)}의 최근 도전입니다.</p>${rows.length?rows.map(r=>`<div class="record-row row"><div><b>${esc(r.stage)}</b><small>${new Date(r.created_at).toLocaleString('ko-KR')} · ${r.correct}/${r.total} 정답</small></div><span>${r.cleared?'CLEAR':'도전'}<small>+${num(r.coins_earned)} ◆</small></span></div>`).join(''):'<div class="notice">아직 모험 기록이 없어요.</div>'}`);}
  function showStats(){const s=stats();modal(`<div class="eyebrow">ADVENTURER STATUS</div><h2>${esc(selectedCharacter.name)} · LV.${s.level}</h2><p>${characterDef(selectedCharacter).label} · ${characterDef(selectedCharacter).trait}</p><div class="record-row row"><span>경험치</span><b>${s.exp} / 1,000</b></div><div class="record-row row"><span>최고 콤보</span><b>${s.best}</b></div><div class="record-row row"><span>누적 정답</span><b>${s.correct} / ${s.answered}</b></div><div class="record-row row"><span>정답률</span><b>${s.accuracy}%</b></div><div class="record-row row"><span>클리어</span><b>${s.clears}</b></div><button class="primary" data-action="records">모험 기록 보기</button>`);}
  function showRequests(){modal(`<div class="eyebrow">REWARD REQUESTS</div><h2>보상 신청 내역</h2><p>현실 보상은 보호자 승인 후 지급됩니다.</p>${redemptions.length?redemptions.map(r=>`<div class="record-row row"><b>${esc(itemById(r.item_id)?.name||'보상')}</b><span class="request-status ${esc(r.status)}">${({pending:'승인 대기',approved:'승인',fulfilled:'지급 완료',cancelled:'취소'})[r.status]||esc(r.status)}</span></div>`).join(''):'<div class="notice">아직 신청한 보상이 없어요.</div>'}`);}
  function showRankings(){const best={};records.filter(r=>r.stage===stages[selectedStage]?.name).forEach(r=>{const key=r.character_id||r.player,old=best[key];if(!old||Number(r.cleared)>Number(old.cleared)||(r.cleared===old.cleared&&r.correct>old.correct))best[key]=r;});const rows=Object.values(best).sort((a,b)=>Number(b.cleared)-Number(a.cleared)||b.correct-a.correct).slice(0,10);modal(`<div class="eyebrow">CRYSTAL RANKING</div><h2>${esc(stages[selectedStage]?.name||'스테이지')} 랭킹</h2><div class="ranking-list">${rows.map((r,i)=>{const c=allCharacters.find(x=>x.id===r.character_id);return `<div class="ranking-row"><span>${i+1}</span><b>${esc(c?.name||r.player)}<small>${esc(r.player)} · ${r.cleared?'CLEAR':'도전'}</small></b><span>${r.correct}/${r.total}</span></div>`;}).join('')||'<div class="notice">아직 랭킹 기록이 없어요.</div>'}</div>`);}

  async function switchPlayer(name){player=name;localStorage.setItem('fantasyQuizPlayer',player);chooseCharacter();await loadCharacterExtras();closeDialog();go('home');}
  async function createPlayer(){const input=$('player-name'),name=input?.value.trim().replace(/\s+/g,' ');if(!name||!/^[가-힣A-Za-z0-9 _-]{1,12}$/.test(name)){toast('사용할 수 있는 유저 이름을 입력해 주세요');return;}if(players.some(x=>x.toLocaleLowerCase()===name.toLocaleLowerCase())){toast('이미 등록된 유저예요');return;}const custom=readCustomPlayers();custom.push(name);localStorage.setItem('fantasyQuizPlayers',JSON.stringify(unique(custom)));players.push(name);await switchPlayer(name);showNewCharacter();}
  async function createCharacter(button){const input=$('character-name'),name=input?.value.trim();if(!name){toast('캐릭터 이름을 입력해 주세요');return;}button.disabled=true;button.textContent='생성 중…';try{let created;if(demo){created={id:`demo-${Date.now()}`,player,name,class:newClass,avatar_variant:newVariant,accent:newAccent,coins:0,equipped_items:{}};demoState.characters.push(created);saveDemo();}else{let rows;try{rows=await apiPost('game_characters',{player,name,class:newClass,avatar_variant:newVariant,accent:newAccent});}catch(error){if(!String(error.message).includes('avatar_variant'))throw error;rows=await apiPost('game_characters',{player,name,class:newClass,accent:newAccent});if(rows?.[0])localStorage.setItem(`fantasyQuizAvatar:${rows[0].id}`,newVariant);}created=rows?.[0];}if(created)localStorage.setItem(`fantasyQuizCharacter:${player}`,created.id);closeDialog();await refresh();toast('새 모험가가 길드에 합류했어요!');}catch(error){console.error(error);button.disabled=false;button.textContent='캐릭터 생성 →';toast('캐릭터 생성에 실패했습니다');}}
  async function purchase(item){if(!item||selectedCharacter.coins<item.price)return;try{if(demo){selectedCharacter.coins-=item.price;if(item.category==='avatar')demoState.inventory.push({character_id:selectedCharacter.id,item_id:item.id});else demoState.redemptions.unshift({id:Date.now(),character_id:selectedCharacter.id,item_id:item.id,status:'pending',price_paid:item.price,created_at:new Date().toISOString()});saveDemo();}else{const rows=await rpc('purchase_shop_item',{p_character_id:selectedCharacter.id,p_item_id:item.id});if(rows?.[0])selectedCharacter.coins=rows[0].new_balance;}await loadCharacterExtras();closeDialog();render();toast(item.category==='gift'?'보상 신청이 접수되었어요':'구매 완료! 장비함에서 장착해 보세요');}catch(error){console.error(error);toast(String(error.message).includes('not enough')?'크리스털이 부족해요':'구매하지 못했습니다');}}
  async function equip(item){if(!item||!itemOwned(item))return;const slot=slotFor(item),map=equippedMap(),isEquipped=String(map[slot])===String(item.id);try{if(demo){if(isEquipped)delete map[slot];else map[slot]=item.id;selectedCharacter.equipped_items=map;saveDemo();}else{await rpc('equip_avatar_slot',{p_character_id:selectedCharacter.id,p_item_id:isEquipped?null:item.id,p_slot:slot});await loadAll();}closeDialog();render();toast(isEquipped?'장착을 해제했어요':'장착했어요! 캐릭터 모습이 바뀌었어요');}catch(error){console.error(error);toast('장비 슬롯 기능을 사용하려면 최신 DB 마이그레이션이 필요합니다');}}
  async function claimChest(button){if(!run?.clear||run.chest||!run.result?.game_score_id)return;button.classList.add('loading');button.disabled=true;try{let reward;if(demo){const min=selectedCharacter.class==='ranger'?20:10;reward=min+Math.floor(Math.random()*(31-min));selectedCharacter.coins+=reward;saveDemo();}else{const rows=await rpc('claim_stage_treasure',{p_character_id:selectedCharacter.id,p_game_score_id:run.result.game_score_id});reward=rows?.[0]?.reward;selectedCharacter.coins=rows?.[0]?.balance??selectedCharacter.coins;}run.chest=true;run.treasure=reward;document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'success'}}));render();toast(`보물 발견! +${reward} ◆`);}catch(error){console.error(error);button.classList.remove('loading');button.disabled=false;toast('보물상자 기능을 사용하려면 최신 DB 마이그레이션이 필요합니다');}}

  document.addEventListener('click',async event=>{const b=event.target.closest('button[data-action]');if(!b||b.disabled)return;const action=b.dataset.action,id=b.dataset.id;
    if(action==='nav')navigate(b.dataset.page);else if(action==='home')navigate('home');else if(action==='close'){closeDialog();if(page==='battle'&&run?.paused)resume();}
    else if(action==='player')await switchPlayer(b.dataset.player);else if(action==='add-player')showNewPlayer();else if(action==='create-player')await createPlayer();
    else if(action==='characters')showCharacters();else if(action==='select-character'){selectedCharacter=characters.find(c=>c.id===id)||selectedCharacter;localStorage.setItem(`fantasyQuizCharacter:${player}`,selectedCharacter.id);await loadCharacterExtras();closeDialog();render();}
    else if(action==='new-character')showNewCharacter();else if(action==='class'){newClass=b.dataset.value;renderCharacterForm();}else if(action==='variant'){newVariant=b.dataset.value;renderCharacterForm();}else if(action==='accent'){newAccent=b.dataset.value;renderCharacterForm();}else if(action==='create-character')await createCharacter(b);
    else if(action==='item')showItem(id);else if(action==='filter'){filter=b.dataset.filter;render();}else if(action==='buy')await purchase(itemById(id));else if(action==='equip')await equip(itemById(id));
    else if(action==='slot'){const eq=equippedMap()[b.dataset.slot],owned=shopItems.find(i=>slotFor(i)===b.dataset.slot&&itemOwned(i));if(eq)showItem(eq);else if(owned)showItem(owned.id);else{filter='avatar';go('shop');toast('이 슬롯에 어울리는 아이템을 골라 보세요');}}
    else if(action==='world'){worldIndex=Number(b.dataset.index);go('stages');}else if(action==='stage'){selectedStage=b.dataset.stage;modal(`<div class="eyebrow">READY TO EXPLORE</div><h2>${esc(stages[selectedStage].name)}</h2><p>${esc(stages[selectedStage].desc)}를 모두 맞혀 수정 정령을 물리치세요.<br>문제당 5초, 오답 또는 시간 초과 시 종료됩니다.</p><button class="primary" data-action="start">준비됐어요 · 전투 시작 →</button><button class="text-btn" data-action="rankings">이 스테이지 랭킹 보기</button>`);}else if(action==='start'||action==='retry')startBattle();
    else if(action==='answer')answer(Number(b.dataset.index));else if(action==='pause'){pause();modal('<div class="eyebrow">PAUSED</div><h2>잠깐의 휴식</h2><p>시간도 함께 멈췄어요. 준비되면 다시 시작하세요.</p><button class="primary" data-action="resume">계속하기</button><button class="text-btn" data-action="leave" data-page="dungeon">도전을 저장하고 던전으로</button>');}else if(action==='resume')resume();else if(action==='leave'){closeDialog();await finishBattle(false,'leave');go(b.dataset.page);}
    else if(action==='speak')speak(run.question.entry[0]);else if(action==='chest')await claimChest(b);else if(action==='records')showRecords();else if(action==='stats')showStats();else if(action==='requests')showRequests();else if(action==='rankings')showRankings();else if(action==='wallet')modal(`<div class="eyebrow">CRYSTAL WALLET</div><h2>◆ ${num(selectedCharacter?.coins)}</h2><p>단어를 맞히고 모은 모험의 빛이에요.<br>아바타 장비와 보호자 보상에 사용할 수 있습니다.</p>`);
  });
  $('dialog').addEventListener('cancel',event=>{event.preventDefault();closeDialog();if(page==='battle'&&run?.paused)resume();});
  document.addEventListener('keydown',event=>{if(page==='battle'&&!$('dialog').open&&/^[1-4]$/.test(event.key)){event.preventDefault();answer(Number(event.key)-1);}if(event.key==='Enter'&&$('player-name'))createPlayer();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&page==='battle'&&run&&!run.done&&!run.paused){pause();modal('<h2>모험을 잠시 멈췄어요</h2><p>다시 준비되면 계속할 수 있어요.</p><button class="primary" data-action="resume">계속하기</button>');}});
  document.addEventListener('wordoria:native-pause',()=>{if(page==='battle'&&run&&!run.done&&!run.paused){pause();modal('<h2>모험을 잠시 멈췄어요</h2><p>앱으로 돌아오면 계속할 수 있어요.</p><button class="primary" data-action="resume">계속하기</button>');}});
  document.addEventListener('wordoria:native-back',()=>{if($('dialog').open){document.querySelector('[data-action=close]')?.click();return;}if(page==='battle'&&run&&!run.done){document.querySelector('[data-action=pause]')?.click();return;}if(page!=='home'){go('home');return;}document.dispatchEvent(new CustomEvent('wordoria:exit'));});

  loadAll().then(()=>render()).catch(error=>{console.error(error);dbOnline=false;setConnection();render();});
})();
