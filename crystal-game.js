(async () => {
  'use strict';

  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const demo = params.get('demo') === '1';
  const localHost = ['localhost', '127.0.0.1'].includes(location.hostname);
  const nativeApp = document.documentElement.classList.contains('native-app') || Boolean(window.Capacitor?.isNativePlatform?.());
  const useLocalDb = params.get('db') === 'local' || (params.get('db') !== 'remote' && localHost && !nativeApp);
  const DB_URL = useLocalDb ? 'http://127.0.0.1:54321' : 'https://uobagmggryhsqlpxhfob.supabase.co';
  const DB_KEY = useLocalDb ? 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH' : 'sb_publishable_NnzXTAh_47i7g5ndSzkxEQ_gy7X-lAz';
  await (window.WORDORIA_CONTENT_READY || Promise.resolve());
  if (!window.WORDORIA_SESSION && !window.WORDORIA_GUEST && document.body.classList.contains('entry-active')) {
    await new Promise(resolve => document.addEventListener('wordoria:entry', resolve, {once:true}));
  }
  const accountSession = window.WORDORIA_SESSION;
  const accountUserId = accountSession?.user?.id || null;
  const accountMode = Boolean(accountUserId) && !demo;
  const stages = window.QUIZ_STAGES || {};
  const builtinStageKeys = Object.keys(stages);
  let stageKeys = builtinStageKeys.slice();
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
    gift:'<path d="M3 9h18v5H3V9Zm2 5v7h14v-7M12 9v12M12 9C0 8 7-3 12 9Zm0 0c12-1 5-12 0 0Z"/>',
    armor:'<path d="m8 3-5 4 3 5 2-1v10h8V11l2 1 3-5-5-4c0 4-8 4-8 0Z"/><path d="M12 8v13"/>',
    worldAdd:'<path d="M3 15 11 5l8 10-8 6-8-6Z"/><path d="M3 15h16M8 9l3 3 3-3M11 15v6M18 3v6M15 6h6"/>',
    profile:'<circle cx="12" cy="8" r="4"/><path d="M4.5 21c.7-5 3.2-7.5 7.5-7.5s6.8 2.5 7.5 7.5"/>',
    mail:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>',
    shield:'<path d="M12 3 5 6v5c0 4.8 2.8 8.1 7 10 4.2-1.9 7-5.2 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>',
    friends:'<path d="M16 21v-2c0-2.2-1.8-4-4-4H6c-2.2 0-4 1.8-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-1a3 3 0 0 1 0 6m5 5v-2c0-1.6-1-3-2.4-3.6"/>',
    group:'<path d="M4 20V9l8-5 8 5v11M8 20v-6h8v6M2 20h20"/>'
  };
  const classDefs = {
    warrior:{label:'전사',title:'CRYSTAL GUARDIAN',trait:'강인함 · 가끔 제한시간 +1초',skill:'수호의 시간',skillDesc:'위기의 순간에 문제 제한시간을 1초 늘려요.',stats:{hp:5,atk:3,def:5,luk:1},paths:{male:'warrior.webp',female:'variants/warrior-female.webp'}},
    mage:{label:'마법사',title:'ARCANE SCHOLAR',trait:'타임 스톱 · 가끔 시간 정지',skill:'타임 스톱',skillDesc:'집중력이 빛나면 문제 시간을 잠시 멈춰요.',stats:{hp:2,atk:5,def:2,luk:3},paths:{male:'mage.webp',female:'variants/mage-female.webp'}},
    pugilist:{label:'권투사',title:'COMBO MASTER',trait:'콤보 마스터 · 3콤보 보너스',skill:'러시 콤보',skillDesc:'3연속 정답마다 보너스 크리스털을 받아요.',stats:{hp:4,atk:5,def:3,luk:2},paths:{male:'variants/pugilist-male.webp',female:'pugilist.webp'}},
    ranger:{label:'궁수',title:'TREASURE HUNTER',trait:'보물 사냥꾼 · 상자 최소 20개',skill:'행운의 화살',skillDesc:'보물상자에서 최소 20 크리스털을 찾아요.',stats:{hp:3,atk:4,def:2,luk:5},paths:{male:'variants/ranger-male.webp',female:'ranger.webp'}}
  };
  const builtinWorlds = [
    {name:'속삭이는 숲',sub:'기초 단어 · 초록 정령의 산책길',code:'F1A2',keys:builtinStageKeys.slice(0,2)},
    {name:'서리 수정 동굴',sub:'동사와 표현 · 푸른 수정의 비밀',code:'I2C3',keys:builtinStageKeys.slice(2,4)},
    {name:'별빛 마법 도서관',sub:'도전 단어 · 잃어버린 마법의 기록',code:'S3L4',keys:builtinStageKeys.slice(4)}
  ];
  let worlds = builtinWorlds.slice(), creatorStageKeys = [], creatorContentError = '';
  const legacyVariant = {warrior:'male',mage:'male',pugilist:'female',ranger:'female'};
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.aura}</svg>`;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num = value => Number(value || 0).toLocaleString('ko-KR');
  const rarityNames = {normal:'일반',special:'스페셜',rare:'레어',unique:'유니크',legendary:'레전더리'};
  const deployedAssetUrl = path => {
    if (!nativeApp || /^(?:https?:|data:|blob:)/i.test(path)) return path;
    const cleanPath = String(path).replace(/^\/+/, '');
    const version = encodeURIComponent(window.WORDORIA_CONTENT_VERSION || 'latest');
    return `${window.WORDORIA_CONTENT_ORIGIN}/${cleanPath}${cleanPath.includes('?') ? '&' : '?'}content=${version}`;
  };
  const creatorHref = () => {
    const url = new URL('map-creator.html', location.href);
    if (params.has('db')) url.searchParams.set('db', params.get('db'));
    return `${url.pathname.split('/').pop()}${url.search}`;
  };
  const itemArt = item => item?.art_path
    ? `<img src="${esc(deployedAssetUrl(item.art_path))}" data-local-art="${esc(item.art_path)}" alt="${esc(item.name)} 아이템 아트">`
    : `<span class="item-icon-text" aria-hidden="true">${esc(item?.icon||'◆')}</span>`;
  const shuffle = input => { const a=input.slice(); for(let i=a.length-1;i;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };

  let page = accountMode ? 'characters' : 'home', filter = 'item', worldIndex = 0, selectedStage = builtinStageKeys[0];
  let players = defaultPlayers.slice(), player = localStorage.getItem('fantasyQuizPlayer') || defaultPlayers[0];
  let allCharacters = [], characters = [], selectedCharacter = null, shopItems = [], inventory = [], redemptions = [], records = [];
  let dbOnline = demo, run = null, timerId = null, nextTimer = null, toastTimer = null;
  let newClass = 'warrior', newVariant = 'male', newAccent = 'violet', newCharacterName = '';
  let accountProfile = null, accountCrystals = 0, availableCharacterTickets = 0, characterCreating = false;

  const demoKey = 'wordoria-production-demo-v1';
  let demoState = {characters:[{id:'demo-mage',player:'율이',name:'블리자드',class:'mage',avatar_variant:'female',accent:'violet',coins:1250,equipped_items:{}}],records:[],inventory:[],redemptions:[],characterTickets:0};
  try { demoState = {...demoState,...JSON.parse(localStorage.getItem(demoKey) || '{}')}; } catch {}
  const saveDemo = () => localStorage.setItem(demoKey, JSON.stringify(demoState));
  const walletBalance = () => accountMode ? accountCrystals : Number(selectedCharacter?.coins || 0);

  function headers(extra={}) { return {'apikey':DB_KEY,'Authorization':`Bearer ${accountSession?.access_token || DB_KEY}`,...extra}; }
  async function apiGet(path){const r=await fetch(`${DB_URL}/rest/v1/${path}`,{headers:headers()});if(!r.ok)throw new Error(await r.text());return r.json();}
  async function apiPost(path,body,prefer='return=representation'){const r=await fetch(`${DB_URL}/rest/v1/${path}`,{method:'POST',headers:headers({'Content-Type':'application/json','Prefer':prefer}),body:JSON.stringify(body)});if(!r.ok)throw new Error(await r.text());const text=await r.text();return text?JSON.parse(text):null;}
  const rpc = (name,body) => apiPost(`rpc/${name}`,body);
  const characterDef = c => classDefs[c?.class] || classDefs.warrior;
  const variantOf = c => c?.avatar_variant || localStorage.getItem(`fantasyQuizAvatar:${c?.id}`) || legacyVariant[c?.class] || 'male';
  const imagePath = c => {
    const skin=itemById(equippedMap(c).skin);
    return skin?.art_path ? deployedAssetUrl(skin.art_path) : `assets/avatars/${characterDef(c).paths[variantOf(c)]}?v=20260917-skins`;
  };
  const slotFor = item => item?.slot || ({crown:'head',cape:'back',wings:'back',aura:'aura',pet:'pet'})[item?.code] || 'aura';
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
  function solvedQuestionCount(record){
    const correct=Math.max(0,Number(record.correct)||0);
    return record.cleared?Math.max(correct,Number(record.total)||0):correct;
  }
  function stats(){
    const rows=selectedRecords(), answered=rows.reduce((n,r)=>n+solvedQuestionCount(r),0), correct=rows.reduce((n,r)=>n+Number(r.correct||0),0), clears=rows.filter(r=>r.cleared).length;
    const level=1+Math.floor(correct/100), exp=(correct%100)*10;
    return {answered,correct,clears,level,exp,accuracy:answered?Math.round(correct/answered*100):0,best:rows.reduce((n,r)=>Math.max(n,Number(r.correct||0)),0)};
  }
  function combatStats(level){
    const equippedItems=Object.values(equippedMap()).map(itemById).filter(Boolean),equipped=equippedItems.length;
    const bonus={hp:0,mp:0,atk:0,def:0,luk:0};
    equippedItems.forEach(item=>{if(Object.prototype.hasOwnProperty.call(bonus,item.stat_key))bonus[item.stat_key]+=Number(item.stat_value||0);});
    const classBonus={warrior:{hp:18,mp:0,atk:3,def:6,luk:0},mage:{hp:0,mp:18,atk:6,def:0,luk:1},pugilist:{hp:8,mp:2,atk:7,def:2,luk:0},ranger:{hp:2,mp:6,atk:5,def:1,luk:5}}[selectedCharacter?.class]||{};
    const hp=72+level*4+(classBonus.hp||0)+bonus.hp,mp=24+level*2+(classBonus.mp||0)+bonus.mp,atk=12+level*2+(classBonus.atk||0)+bonus.atk,def=10+level*2+(classBonus.def||0)+bonus.def,luk=5+Math.floor(level/2)+(classBonus.luk||0)+bonus.luk;
    return {hp,mp,atk,def,luk,power:hp*4+mp*2+atk*12+def*10+luk*8,equipped,bonus};
  }
  function stageRecordName(key){return stages[key]?.recordName||stages[key]?.name;}
  function stageCleared(key){return records.some(r=>r.cleared&&r.stage===stageRecordName(key));}
  function earnedCoins(count,clear=false){const interval=selectedCharacter?.class==='pugilist'?3:5;return count+Math.floor(count/interval)+(clear?10:0);}

  function resetCreatorContent(){
    creatorStageKeys.forEach(key=>delete stages[key]);creatorStageKeys=[];creatorContentError='';
    stageKeys=builtinStageKeys.slice();worlds=builtinWorlds.slice();
    if(worldIndex>=worlds.length)worldIndex=0;
    if(!stages[selectedStage])selectedStage=builtinStageKeys[0];
  }
  function playableWords(rows){
    const seen=new Set();return rows.map(row=>({english:String(row.english||'').trim(),korean:String(row.korean||'').trim(),rowOrder:Number(row.row_order||0)})).filter(row=>{
      const key=row.english.toLocaleLowerCase('en-US');if(!key||!row.korean||seen.has(key))return false;seen.add(key);return true;
    }).sort((a,b)=>a.rowOrder-b.rowOrder).map(row=>[row.english,'단어',row.korean]);
  }
  async function loadCreatorContent(){
    if(!accountMode)return;
    const [worldRows,mapRows,wordRows]=await Promise.all([
      apiGet('worlds?select=id,name,description,world_code&order=created_at.asc'),
      apiGet('maps?select=id,world_id,title,description,total_question_count,visibility,status,created_at&status=eq.published&order=created_at.asc'),
      apiGet('map_words?select=map_id,row_order,english,korean,review_status&review_status=eq.approved&order=map_id.asc,row_order.asc')
    ]);
    const rowsByMap=new Map();wordRows.forEach(row=>{const rows=rowsByMap.get(row.map_id)||[];rows.push(row);rowsByMap.set(row.map_id,rows);});
    const keysByWorld=new Map();
    mapRows.forEach(map=>{
      const words=playableWords(rowsByMap.get(map.id)||[]);if(words.length<4)return;
      const key=`creator:${map.id}`,questionCount=Math.max(1,Math.min(500,Number(map.total_question_count)||words.length));
      stages[key]={name:map.title,desc:map.description||`${words.length}개 단어 · 제작 맵`,words,questionCount,creator:true,mapId:map.id,visibility:map.visibility,recordName:`제작 맵 · ${map.id}`};
      creatorStageKeys.push(key);stageKeys.push(key);
      const keys=keysByWorld.get(map.world_id)||[];keys.push(key);keysByWorld.set(map.world_id,keys);
    });
    worldRows.forEach(world=>{const keys=keysByWorld.get(world.id)||[];if(!keys.length)return;worlds.push({name:world.name,sub:world.description||`선생님이 만든 단어 모험 · ${keys.length}개 맵`,code:world.world_code,keys,creator:true,worldId:world.id});});
  }
  function buildQuestionDeck(source){
    const total=Math.max(1,Math.min(500,Number(source.questionCount)||source.words.length)),deck=[];
    while(deck.length<total){
      const cycle=shuffle(source.words);
      if(deck.length&&cycle.length>1&&cycle[0][0].toLocaleLowerCase('en-US')===deck[deck.length-1].entry[0].toLocaleLowerCase('en-US')){
        const swapIndex=cycle.findIndex(word=>word[0].toLocaleLowerCase('en-US')!==cycle[0][0].toLocaleLowerCase('en-US'));
        if(swapIndex>0)[cycle[0],cycle[swapIndex]]=[cycle[swapIndex],cycle[0]];
      }
      cycle.some(entry=>{if(deck.length>=total)return true;deck.push({entry,mode:Math.random()<.5?'en-ko':'ko-en'});return false;});
    }
    return deck;
  }

  async function loadAll(){
    resetCreatorContent();
    if(demo){
      allCharacters=demoState.characters;shopItems=[
        {id:1,code:'gale_boots',name:'질풍의 장화',category:'avatar',price:100,icon:'◆',description:'첫 모험을 오래 이어갈 수 있도록 체력을 높이는 기본 장화입니다.',slot:'body',rarity:'normal',stars:1,stat_key:'hp',stat_value:12,art_path:'assets/items/equipment/item_gale_boots_normal.webp'},
        {id:2,code:'aura',name:'민트 기억 부적',category:'avatar',price:250,icon:'◆',description:'새 단어를 기억할 때마다 마력을 채워 주는 특별한 부적입니다.',slot:'aura',rarity:'special',stars:2,stat_key:'mp',stat_value:9,art_path:'assets/items/equipment/item_mint_memory_charm_special.webp'},
        {id:3,code:'cape',name:'용기의 망토',category:'avatar',price:450,icon:'◆',description:'수정 장식과 민트 안감이 모험가를 지켜 주는 희귀 망토입니다.',slot:'back',rarity:'rare',stars:3,stat_key:'def',stat_value:7,art_path:'assets/items/equipment/item_courage_cape_rare.webp'},
        {id:4,code:'guardian_armor',name:'수호자의 결정 갑옷',category:'avatar',price:500,icon:'◆',description:'맑은 은빛 판과 세 개의 수호 결정이 방어력을 높입니다.',slot:'body',rarity:'rare',stars:3,stat_key:'def',stat_value:11,art_path:'assets/items/equipment/item_guardian_crystal_armor_rare.webp'},
        {id:6,code:'dawn_blade',name:'새벽 결정검',category:'avatar',price:700,icon:'◆',description:'수정 날개와 공명환이 공격의 빛을 모으는 유니크 결정검입니다.',slot:'weapon',rarity:'unique',stars:4,stat_key:'atk',stat_value:16,art_path:'assets/items/equipment/item_dawn_crystal_sword_unique.webp'},
        {id:7,code:'wings',name:'하늘 결정 날개',category:'avatar',price:900,icon:'◆',description:'민트빛 핵으로 움직이는 유니크 등 장비입니다.',slot:'back',rarity:'unique',stars:4,stat_key:'luk',stat_value:6,art_path:'assets/items/equipment/item_sky_crystal_wings_unique.webp'},
        {id:8,code:'crown',name:'별빛 왕관',category:'avatar',price:1200,icon:'◆',description:'다섯 별의 축복으로 보물 발견의 행운을 높이는 왕관입니다.',slot:'head',rarity:'legendary',stars:5,stat_key:'luk',stat_value:8,art_path:'assets/items/equipment/item_starlight_crown_legendary.webp'},
        {id:9,code:'pet',name:'워드 크리스털 정령',category:'avatar',price:1500,icon:'◆',description:'배운 단어의 빛을 모아 행운을 가져오는 전설의 동행 정령입니다.',slot:'pet',rarity:'legendary',stars:5,stat_key:'luk',stat_value:12,art_path:'assets/items/equipment/item_word_crystal_sprite_legendary.webp'},
        {id:10,code:'ranger_violet_crystal_skin',name:'보랏빛 결정 궁수',category:'avatar',price:2000,icon:'◆',description:'은보랏빛 트윈테일과 결정 장궁으로 모습을 바꾸는 여성 궁수 전용 스킨입니다.',slot:'skin',rarity:'unique',stars:4,stat_key:null,stat_value:0,art_path:'assets/avatars/skins/ranger-female-violet-crystal.webp'},
        {id:11,code:'pugilist_crystal_rose_skin',name:'크리스털 로즈 권투사',category:'avatar',price:2000,icon:'◆',description:'장미빛 결정 건틀릿과 금장 전투복으로 모습을 바꾸는 여성 권투사 전용 스킨입니다. 전용 펀치와 피격 애니메이션이 적용됩니다.',slot:'skin',rarity:'legendary',stars:5,stat_key:null,stat_value:0,art_path:'assets/avatars/skins/pugilist-female-crystal-rose-profile-v2.jpg'},
        {id:5,code:'snack',name:'간식 1개',category:'gift',price:60,icon:'🍪',description:'보호자 승인 후 받을 수 있어요.',rarity:'special',stars:2}
      ];records=demoState.records;dbOnline=true;
    } else {
      try {
        if(accountMode){
          const profileResult=await window.WORDORIA_AUTH_CLIENT.from('profiles').select('display_name,login_id,role,crystal_balance').eq('user_id',accountUserId).single();
          if(profileResult.data){accountProfile=profileResult.data;accountCrystals=Number(profileResult.data.crystal_balance||0);player=profileResult.data.login_id||profileResult.data.display_name||player;}
        }
        [allCharacters,shopItems,records]=await Promise.all([
          apiGet(`game_characters?select=*${accountMode?`&owner_user_id=eq.${accountUserId}`:''}&order=created_at.asc`),
          apiGet('shop_items?select=id,code,name,category,price,icon,description,repeatable,slot,rarity,stars,stat_key,stat_value,art_path&active=eq.true&order=price.asc'),
          apiGet('game_scores?select=player,stage,correct,total,cleared,created_at,character_id,duration_ms,coins_earned,id&order=created_at.desc&limit=1000')
        ]);dbOnline=true;
        if(accountMode){const tickets=await apiGet(`character_creation_tickets?select=id&owner_user_id=eq.${accountUserId}&consumed_by_character_id=is.null`);availableCharacterTickets=tickets.length;}
      } catch(error){console.error(error);dbOnline=false;allCharacters=[];shopItems=[];records=[];}
      if(accountMode&&dbOnline){try{await loadCreatorContent();}catch(error){console.error(error);creatorContentError='제작 월드 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.';}}
    }
    players=accountMode?[player]:unique(defaultPlayers.concat(allCharacters.map(c=>c.player),readCustomPlayers()));
    if(!players.includes(player))player=players[0];
    chooseCharacter();await loadCharacterExtras();setConnection();
  }
  function readCustomPlayers(){try{const v=JSON.parse(localStorage.getItem('fantasyQuizPlayers')||'[]');return Array.isArray(v)?v:[];}catch{return [];}}
  function chooseCharacter(){
    characters=accountMode?allCharacters.slice():allCharacters.filter(c=>c.player===player);
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
    const contextAction=page==='characters'
      ? ''
      : page==='dungeon'
      ? `<a class="world-create-link" href="${creatorHref()}" aria-label="월드 만들기" title="월드 만들기">${icon('worldAdd')}</a>`
      : `<button class="balance" data-action="wallet" aria-label="계정 크리스털 지갑">◆ <span id="balance">${selectedCharacter||accountMode?num(walletBalance()):'—'}</span></button>`;
    $('topbar-action').innerHTML=`${contextAction}<button class="profile-button" data-action="profile" aria-label="내 프로필과 계정 설정" title="내 프로필">${icon('profile')}<i aria-hidden="true"></i></button>`;
    const active=['stages','battle','result'].includes(page)?'dungeon':page;
    const nav=$('nav');
    nav.hidden=page==='battle'||page==='characters';
    nav.innerHTML=[['home','홈'],['dungeon','모험'],['gear','장비'],['shop','상점']].map(([id,label])=>`<button data-action="nav" data-page="${id}" ${active===id?'aria-current="page"':''}>${icon(id)}<span>${label}</span></button>`).join('');
    const renderer={characters:renderCharacterGate,home:renderHome,gear:renderGear,shop:renderShop,dungeon:renderDungeon,stages:renderStages,battle:renderBattle,result:renderResult}[page]||renderHome;
    $('screen').innerHTML=renderer();
  }
  function go(target){page=target;render();$('screen').focus({preventScroll:true});$('screen').scrollTo({top:0,behavior:'instant'});window.scrollTo({top:0,behavior:'instant'});}
  function navigate(target){if(page==='battle'&&run&&!run.done){pause();modal(`<div class="eyebrow">PAUSED</div><h2>이번 도전을 마칠까요?</h2><p>지금까지 맞힌 문제의 보상과 기록은 저장됩니다.</p><div class="actions"><button class="secondary" data-action="resume">계속하기</button><button class="primary" data-action="leave" data-page="${target}">저장하고 이동</button></div>`);return;}go(target);}
  function profileBar(){if(accountMode)return '';return `<div class="profile-switch">${players.map(name=>`<button class="profile-chip ${name===player?'active':''}" data-action="player" data-player="${esc(name)}">${esc(name)}</button>`).join('')}<button class="profile-chip add" data-action="add-player">＋ 유저</button></div>`;}
  function classStatsMarkup(d){return `<div class="class-stat-grid" aria-label="${esc(d.label)} 기본 능력치">${Object.entries({hp:'체력',atk:'공격',def:'방어',luk:'행운'}).map(([key,label])=>`<span><small>${label}</small><i>${'<b></b>'.repeat(d.stats[key])}</i></span>`).join('')}</div>`;}
  function characterCreatorMarkup(){
    const d=classDefs[newClass],first=characters.length===0;
    return `<section class="character-create-panel"><div class="creation-step"><span>${first?'첫 모험가 · 무료':'캐릭터 추가권 사용'}</span><b>${first?'나만의 영웅을 만들어 보세요':`보유 추가권 ${availableCharacterTickets}장`}</b></div><label class="form-label" for="character-name">캐릭터 이름 <small>로그인 아이디와 달라도 괜찮아요</small></label><input id="character-name" class="field character-name-field" maxlength="16" value="${esc(newCharacterName)}" autocomplete="off" placeholder="예: 별빛루나"><label class="form-label">직업과 특수기술</label><div class="class-tabs">${Object.entries(classDefs).map(([id,c])=>`<button class="${id===newClass?'active':''}" data-action="class" data-value="${id}" aria-pressed="${id===newClass}">${c.label}</button>`).join('')}</div><article class="class-preview"><div class="class-preview-art"><img src="assets/avatars/${d.paths[newVariant]}?v=20260917-skins" alt="${esc(d.label)} ${newVariant==='female'?'여성':'남성'} 캐릭터"></div><div class="class-preview-copy"><span>${esc(d.title)}</span><h2>${esc(d.label)}</h2><p>${esc(d.trait)}</p><div class="skill-callout"><b>✦ ${esc(d.skill)}</b><small>${esc(d.skillDesc)}</small></div>${classStatsMarkup(d)}</div></article><label class="form-label">기본 외형</label><div class="variant-switch">${['male','female'].map(v=>`<button class="${v===newVariant?'active':''}" data-action="variant" data-value="${v}" aria-pressed="${v===newVariant}">${v==='male'?'남성':'여성'} 외형</button>`).join('')}</div><label class="form-label">오라 색상</label><div class="accent-row">${['violet','red','blue','green','gold'].map(v=>`<button class="accent-choice ${v===newAccent?'active':''}" data-action="accent" data-value="${v}" aria-label="${v}"></button>`).join('')}</div><div class="character-create-actions">${characters.length?'<button class="secondary" data-action="cancel-character-create">목록으로</button>':''}<button class="primary" data-action="create-character">${first?'첫 캐릭터 만들기':'추가권으로 캐릭터 만들기'} →</button></div></section>`;
  }
  function renderCharacterGate(){
    const creating=characterCreating||!characters.length;
    const loginLabel=accountProfile?.login_id||player;
    if(creating)return `<section class="character-gate"><header class="character-gate-heading"><div><span class="eyebrow">CREATE YOUR HERO</span><h1>${characters.length?'새 모험가 합류':'모험을 함께할 영웅을 만드세요'}</h1><p><b>@${esc(loginLabel)}</b> 계정에 저장됩니다. 캐릭터 이름은 로그인 아이디와 별개예요.</p></div><span class="gate-crystal" title="계정 공용 크리스털">계정 ◆ ${num(walletBalance())}</span></header>${characterCreatorMarkup()}</section>`;
    const canBuy=walletBalance()>=1000;
    return `<section class="character-gate"><header class="character-gate-heading"><div><span class="eyebrow">CHOOSE YOUR HERO</span><h1>오늘의 모험가를 선택하세요</h1><p><b>@${esc(loginLabel)}</b>님의 캐릭터 ${characters.length}명</p></div><span class="gate-crystal" title="계정 공용 크리스털">계정 ◆ ${num(walletBalance())}</span></header><div class="hero-roster">${characters.map(c=>{const d=characterDef(c),active=c.id===selectedCharacter?.id;return `<button class="roster-card ${active?'active':''}" data-action="select-character" data-id="${c.id}" aria-pressed="${active}"><span class="roster-check">${active?'✓':'선택'}</span><span class="roster-art"><img src="${imagePath(c)}" alt="${esc(c.name)}"></span><span class="roster-copy"><small>${esc(d.title)}</small><strong>${esc(c.name)}</strong><span>${esc(d.label)} · ${esc(d.skill)}</span></span><span class="roster-skill"><b>특수기술</b><small>${esc(d.skillDesc)}</small></span>${classStatsMarkup(d)}<span class="roster-wallet">계정 지갑 공유</span></button>`;}).join('')}</div><button class="primary play-character" data-action="enter-game">${esc(selectedCharacter.name)}로 플레이하기 <span>→</span></button><aside class="character-ticket-card"><div class="ticket-icon">＋</div><div><b>캐릭터 추가권</b><p>첫 캐릭터 이후에는 추가권 1장이 필요해요.</p></div>${availableCharacterTickets?`<button class="secondary" data-action="open-character-create">추가권 사용 · ${availableCharacterTickets}장</button>`:`<button class="ticket-buy" data-action="buy-character-ticket" ${canBuy?'':'disabled'}><span>◆ 1,000</span>${canBuy?'추가권 구매':'크리스털 부족'}</button>`}</aside><p class="ticket-note">추가권과 상점 구매는 계정의 공용 크리스털을 사용합니다.</p></section>`;
  }
  function renderHome(){
    if(!selectedCharacter)return `${profileBar()}<div class="panel onboarding"><div class="result-symbol">${icon('sword')}</div><div class="eyebrow" style="color:var(--violet)">WELCOME, ADVENTURER</div><h1>${esc(player)}님의 모험가를 만들어 주세요</h1><p>직업과 모습을 고르면 단어 던전에 바로 입장할 수 있어요.<br>정답이 공격이 되고 크리스털이 보상으로 쌓입니다.</p>${!dbOnline&&!demo?'<div class="db-warning">현재 데이터베이스에 연결할 수 없어 캐릭터를 만들 수 없습니다.</div>':''}<button class="primary" data-action="new-character" ${!dbOnline&&!demo?'disabled':''}>첫 캐릭터 만들기 →</button></div>`;
    const c=selectedCharacter,d=characterDef(c),s=stats();
    return `${profileBar()}<button class="hero" data-action="characters" aria-label="캐릭터 변경"><span class="level">LV.${s.level}</span><span class="hero-player">${esc(player)}의 모험가</span><span class="hero-hint">캐릭터 변경 ›</span><div class="hero-copy"><div class="eyebrow">${d.title}</div><h1>${esc(c.name)}</h1><p>${d.label} · ${d.trait.split(' · ')[0]}</p></div>${portrait()}</button><button class="panel progress-card" style="width:100%" data-action="stats"><span class="row small"><span>다음 레벨까지</span><b>${num(s.exp)} / 1,000 EXP</b></span><div class="xp"><i style="width:${s.exp/10}%"></i></div></button><div class="stats"><button class="panel stat" data-action="stats"><span>최고 콤보</span><b>${s.best}</b></button><button class="panel stat" data-action="stats"><span>정답률</span><b>${s.accuracy}%</b></button><button class="panel stat" data-action="records"><span>클리어</span><b>${s.clears}</b></button></div><button class="primary home-cta" data-action="nav" data-page="dungeon">모험 떠나기 <span class="arrow">→</span></button>`;
  }
  function itemOwned(item){return inventory.some(x=>String(x.item_id)===String(item.id));}
  function isSkin(item){return slotFor(item)==='skin';}
  function shopCategory(item){return item.category==='gift'?'reward':isSkin(item)?'skin':'item';}
  function displayRarity(item){return item.category==='gift'?'special':rarityNames[item.rarity]?item.rarity:isSkin(item)?'unique':'normal';}
  function skinEligible(item,c=selectedCharacter){
    if(item?.code==='ranger_violet_crystal_skin')return c?.class==='ranger'&&variantOf(c)==='female';
    if(item?.code==='pugilist_crystal_rose_skin')return c?.class==='pugilist'&&variantOf(c)==='female';
    return !isSkin(item);
  }
  function skinRequirement(item){return item?.code==='pugilist_crystal_rose_skin'?'여성 권투사 전용':'여성 궁수 전용';}
  function renderItemCard(item,ownedView=false){const owned=itemOwned(item),eq=Object.values(equippedMap()).some(id=>String(id)===String(item.id)),gear=item.category==='avatar',skin=isSkin(item),rarity=displayRarity(item);return `<button class="item" data-action="item" data-id="${item.id}" data-rarity="${rarity}"><span class="item-rarity">${rarityNames[rarity]}</span>${ownedView?`<span class="item-status">${eq?'장착 중':'보유'}</span>`:''}<span class="item-art">${itemArt(item)}</span><b>${esc(item.name)}</b>${gear?`<span class="item-stat">${skin?`${skinRequirement(item)} 스킨`:`${esc(String(item.stat_key||'').toUpperCase())} +${num(item.stat_value)}`}</span>`:''}<small class="${owned?'owned':''}">${owned?(eq?'✓ 장착 중':'✓ 보유 중'):`${num(item.price)} ◆`}</small></button>`;}
  function renderGear(){
    if(!selectedCharacter)return noCharacter('장비를 사용하려면 모험가가 필요해요.');
    const s=stats(),eq=equippedMap(),d=characterDef(selectedCharacter),cs=combatStats(s.level);
    const slotButton=(slot,label,art)=>{const item=itemById(eq[slot]),rarity=item?displayRarity(item):null;return `<button class="gear-status-slot ${item?'equipped':'empty'} ${item?`rarity-${rarity}`:''}" data-action="slot" data-slot="${slot}" aria-label="${label}${item?` ${rarityNames[rarity]} ${item.name} 장착 중`:' 비어 있음'}"><span>${icon(art)}</span><small>${label}</small>${item?`<i>${rarityNames[rarity]}</i>`:''}</button>`;};
    const stat=(label,value,bonus='')=>`<div class="gear-stat"><span>${label}</span><strong>${value}</strong>${bonus?`<small>+${bonus}</small>`:''}</div>`;
    return `<div class="gear-page-title"><div><span>MY ADVENTURER</span><h1>장비와 상태</h1></div><button class="text-btn" data-action="characters">캐릭터 변경 ›</button></div><section class="gear-status-hero"><div class="gear-identity"><span class="level">LV.${s.level}</span><p>${d.title}</p><h2>${esc(selectedCharacter.name)}</h2><small>${d.label} · ${esc(d.trait.split(' · ')[0])}</small></div><div class="gear-stat-rail">${stat('HP',cs.hp,cs.bonus.hp)}${stat('MP',cs.mp,cs.bonus.mp)}${stat('ATK',cs.atk,cs.bonus.atk)}${stat('DEF',cs.def,cs.bonus.def)}${stat('LUK',cs.luk,cs.bonus.luk)}</div><div class="gear-character">${portrait()}<span>전투력 <b>${num(cs.power)}</b></span></div><div class="gear-slot-rail">${slotButton('skin','스킨','profile')}${slotButton('head','머리','crown')}${slotButton('body','몸','armor')}${slotButton('weapon','무기','sword')}${slotButton('back','등','cape')}${slotButton('aura','오라','aura')}${slotButton('pet','펫','pet')}</div></section><button class="panel gear-growth" data-action="stats"><span class="row small"><span>다음 레벨까지</span><b>${num(s.exp)} / 1,000 EXP</b></span><span class="xp"><i style="width:${s.exp/10}%"></i></span><small>정답을 맞히고 좋은 장비를 장착하면 전투력이 함께 올라가요.</small></button><div class="section-title gear-collection-title"><div><span class="eyebrow">COLLECTION</span><h2>내 장비함 <span class="muted small">${inventory.length}</span></h2></div><button class="text-btn" data-action="nav" data-page="shop">상점 가기 ›</button></div>${inventory.length?`<div class="items catalog gear-inventory-grid">${shopItems.filter(itemOwned).map(i=>renderItemCard(i,true)).join('')}</div>`:'<div class="panel empty-state">아직 수집한 장비가 없어요.<br><button class="text-btn" data-action="nav" data-page="shop">상점에서 첫 장비 만나기 →</button></div>'}<div class="sync-note">장착 상태와 아이템 능력치는 캐릭터와 함께 저장됩니다.</div>`;
  }
  function renderShop(){
    if(!selectedCharacter)return noCharacter('상점을 이용하려면 모험가가 필요해요.');
    const visible=shopItems.filter(item=>shopCategory(item)===filter);
    return `<div class="tabs" aria-label="상점 카테고리">${[['item','아이템'],['skin','스킨'],['reward','보상']].map(([key,label])=>`<button data-action="filter" data-filter="${key}" class="${filter===key?'active':''}" aria-pressed="${filter===key}">${label}</button>`).join('')}</div><div class="items catalog">${visible.map(item=>renderItemCard(item)).join('')||'<div class="empty-state">이 카테고리에 판매 중인 상품이 없어요.</div>'}</div><button class="secondary" style="width:100%;margin-top:15px" data-action="requests">보상 신청 내역 (${redemptions.length}) →</button>`;
  }
  function noCharacter(message){return `${title('CHOOSE YOUR HERO','모험가가 필요해요',message)}<button class="primary" data-action="new-character" ${!dbOnline&&!demo?'disabled':''}>캐릭터 만들기 →</button>`;}
  function renderDungeon(){return `<div class="page-title"><div class="eyebrow">WORLD ADVENTURE</div></div><label class="world-search"><span class="world-search-icon" aria-hidden="true">⌕</span><input id="world-search" type="search" autocomplete="off" maxlength="60" placeholder="월드 이름 또는 4자리 고유키 검색" aria-label="월드 이름 또는 고유키 검색"></label><div id="world-list">${worlds.map((w,i)=>{const count=w.keys.filter(stageCleared).length,search=`${w.name} ${w.code}`.toLocaleLowerCase();return `<button class="dungeon-card${w.creator?' creator-world':''}" data-action="world" data-index="${i}" data-world-search="${esc(search)}"><span class="island">${icon('island')}</span><span class="eyebrow world-code" style="color:var(--violet)">WORLD ${esc(w.code)}</span><h2>${esc(w.name)}</h2><p>${esc(w.sub)}</p><span class="row small"><span class="badge">${w.keys.length} MAPS · ${count} CLEAR</span><span>맵 보기 →</span></span></button>`;}).join('')}</div><div id="world-empty" class="panel empty-state" hidden>검색 조건과 일치하는 월드가 없어요.</div>${creatorContentError?`<div class="notice db-warning">${esc(creatorContentError)}</div>`:''}<button class="secondary" style="width:100%" data-action="records">모험 기록 보기</button>`;}
  function renderStages(){const w=worlds[worldIndex]||worlds[0];return `<button class="text-btn" data-action="nav" data-page="dungeon">← 월드 목록</button>${title(`WORLD ${w.code}`,w.name,'도전할 맵을 선택하세요. 마지막에는 보물상자가 기다려요.')}<div class="stage-list">${w.keys.map((key,i)=>{const s=stages[key];return `<button class="stage-btn" data-action="stage" data-stage="${key}"><span class="stage-no">${String(i+1).padStart(2,'0')}</span><span><b>${esc(s.name)}</b><small>${esc(s.desc||`${s.words.length}문제`)}${s.creator?` · ${s.questionCount}문제`:''} · 5초 서바이벌</small>${stageCleared(key)?'<span class="stage-status">✓ CLEAR</span>':''}</span><span>→</span></button>`;}).join('')}</div><div class="notice">정답 +1 ◆ · 콤보 보너스 · 클리어 +10 ◆<br>맵은 횟수 제한 없이 다시 도전할 수 있어요.</div>`;}

  function posMatch(a,b){return a[1]===b[1]||a[1].includes(b[1])||b[1].includes(a[1]);}
  function formScore(a,b){let score=Math.max(0,5-Math.abs(a[0].length-b[0].length));if(a[0][0]===b[0][0])score+=3;if(a[1]===b[1])score+=6;else if(posMatch(a,b))score+=4;return score+Math.random()*2;}
  function makeQuestion(entry,pool,mode){const choices=pool.filter(x=>x[0]!==entry[0]).sort((a,b)=>formScore(entry,b)-formScore(entry,a)).slice(0,8);const enKo=mode==='en-ko',answer=enKo?`[${entry[1]}] ${entry[2]}`:entry[0];return {entry,mode,prompt:enKo?entry[0]:`[${entry[1]}] ${entry[2]}`,answer,choices:shuffle([answer,...shuffle(choices).slice(0,3).map(x=>enKo?`[${x[1]}] ${x[2]}`:x[0])])};}
  function questionDuration(){const cls=selectedCharacter?.class;let duration=5000,skill='';if(cls==='warrior'&&Math.random()<.15){duration=6000;skill='강인함 · TIME +1';}else if(cls==='mage'&&Math.random()<.1){duration=6500;skill='TIME STOP · 1.5초';}return {duration,skill};}
  function removeBattleReward(){document.querySelector('.battle-reward-layer')?.remove();}
  function startBattle(){
    if(!selectedCharacter){closeDialog();go('home');toast('먼저 캐릭터를 만들어 주세요');return;}
    clearInterval(timerId);clearTimeout(nextTimer);removeBattleReward();const source=stages[selectedStage];
    run={deck:buildQuestionDeck(source),index:0,correct:0,elapsed:0,locked:false,paused:false,done:false,clear:false,result:null,chest:false,treasure:0,resultStep:'summary',chestClicks:0};
    prepareQuestion();closeDialog();go('battle');tick();
  }
  function prepareQuestion(){const item=run.deck[run.index],timing=questionDuration();run.question=makeQuestion(item.entry,stages[selectedStage].words,item.mode);run.remaining=timing.duration;run.maxTime=timing.duration;run.skill=timing.skill;run.last=performance.now();run.locked=false;}
  function battleHeroMarkup(){
    const heroClass=selectedCharacter?.class;
    const variant=variantOf(selectedCharacter);
    if(heroClass==='warrior'||heroClass==='mage'||heroClass==='pugilist'||heroClass==='ranger'){
      const classLabel={warrior:'전사',mage:'마법사',pugilist:'권투사',ranger:'궁수'}[heroClass];
      const skin=itemById(equippedMap().skin),skinClass=skin?.code?` battle-skin-${esc(skin.code)}`:'';
      return `<div class="battle-hero battle-hero-${heroClass} battle-hero-${variant}${skinClass}" aria-label="${variant==='female'?'여성':'남성'} ${classLabel}${skin?' · '+esc(skin.name):''}"><span class="battle-sprite" aria-hidden="true"></span>${heroClass==='mage'||heroClass==='ranger'?'<span class="battle-projectile" aria-hidden="true"></span>':''}</div>`;
    }
    return portrait();
  }
  function renderBattle(){const q=run.question,total=run.deck.length,boss=run.index===total-1;return `<div class="battle-top row"><div class="stage-copy"><div class="eyebrow" style="color:var(--violet)">${esc(stages[selectedStage].name)} · ${run.index+1}/${total}</div><b>${esc(stages[selectedStage].desc||'Word Quest')}</b></div><button class="icon-btn" data-action="pause" aria-label="일시정지">${icon('pause')}</button></div><div class="arena ${run.skill?'skill':''}" id="arena"><div class="arena-floor"></div>${battleHeroMarkup()}${run.skill?`<span class="skill-chip">${run.skill}</span>`:''}<div class="arena-time" id="arena-time" aria-label="남은 제한시간"><small>TIME LIMIT</small><strong id="timer">${(run.remaining/1000).toFixed(1)}<span>초</span></strong></div><span class="enemy-label">${boss?'BOSS · 수정 정령':'LV. 1 · 민트 슬라임'}</span><div class="enemy ${boss?'boss':''}"></div><div class="crystal-strike" aria-hidden="true"></div><div class="crystal-shards" aria-hidden="true">${'<i></i>'.repeat(7)}</div><div class="arena-feedback" id="arena-feedback"></div></div><div class="row small" style="margin-top:12px"><b>${run.index} / ${total} 처치</b><span style="color:var(--violet)">${run.correct} COMBO · ◆ +${earnedCoins(run.correct)}</span></div><div class="xp"><i style="width:${run.index/total*100}%"></i></div><div class="question-card"><h1 class="${q.prompt.length>28?'long-question':''}">${esc(q.prompt)}</h1></div><div class="answers">${q.choices.map((answer,i)=>`<button class="answer" data-action="answer" data-index="${i}"><span>${i+1}</span>${esc(answer)}</button>`).join('')}</div>`;}
  function spiritMessage(count){const lines=['좋아! 단어의 힘이 반짝였어.','정확했어! 이 단어는 이제 네 편이야.','멋진 공격이야! 다음 단어도 가 보자.','발음까지 기억하면 더 강해져!','집중력이 크리스털처럼 빛나고 있어!'];return lines[(count-1)%lines.length];}
  function rewardJourney(total,count){const stops=Math.max(1,Math.ceil(total/5)),lit=Math.ceil(count/5);return `<div class="reward-journey" aria-label="${lit}/${stops} 체크포인트"><b class="journey-caption">체크포인트 ${lit} / ${stops}</b><div class="journey-track"><i style="width:${Math.min(100,lit/stops*100)}%"></i><span style="left:${Math.min(100,lit/stops*100)}%"></span></div></div>`;}
  function showBattleReward(q,gain){
    removeBattleReward();
    const total=run.deck.length,count=run.correct,milestone=count%5===0||count===total;
    const layer=document.createElement('div');layer.className=`battle-reward-layer ${milestone?'milestone':'standard'}`;layer.setAttribute('role','status');layer.setAttribute('aria-live','polite');
    layer.innerHTML=`<button class="battle-reward-card" data-action="dismiss-reward" aria-label="정답 보상 확인하고 계속하기"><span class="reward-rays" aria-hidden="true"></span><span class="crystal-spirit" aria-hidden="true"><i></i><b></b></span><span class="spirit-speech">${esc(milestone?`${count}연속 정답! 크리스털 길이 열렸어!`:spiritMessage(count))}</span><span class="reward-kicker">${milestone?'CRYSTAL CHECKPOINT':'CRYSTAL FINISH'}</span><strong>${milestone?`${count} COMBO!`:'정답!'}</strong><span class="reward-word"><b>${esc(q.entry[0])}</b><i>=</i>${esc(q.entry[2])}</span><span class="reward-gain">◆ +${gain} · EXP +10</span>${milestone?rewardJourney(total,count):''}<small>${milestone?(count>=total?'모든 체크포인트를 밝혔어요':'다음 체크포인트를 향해 출발!'):'탭해서 바로 계속하기'}</small></button>`;
    document.querySelector('.phone')?.appendChild(layer);
    requestAnimationFrame(()=>layer.classList.add('show'));
    return milestone?1700:1050;
  }
  function continueAfterFeedback(){
    if(!run||run.done||!run.feedbackPending)return;
    run.feedbackPending=false;clearTimeout(nextTimer);removeBattleReward();run.index++;
    if(run.index>=run.deck.length)return finishBattle(true);
    prepareQuestion();render();if(!run.paused)tick();
  }
  function updateEnemyApproach(){
    const arena=$('arena'),enemy=arena?.querySelector('.enemy'),hero=arena?.querySelector('.battle-hero, .portrait');
    if(!arena||!enemy||!hero||!run)return;
    const progress=Math.min(1,Math.max(0,1-run.remaining/run.maxTime));
    const contactLeft=hero.offsetLeft+hero.offsetWidth*.99;
    const travel=Math.max(0,enemy.offsetLeft-contactLeft);
    arena.style.setProperty('--enemy-approach',`${-travel*progress}px`);
    arena.style.setProperty('--time-progress',`${progress*100}%`);
  }
  function setHeroAttackTravel(){
    const arena=$('arena'),hero=arena?.querySelector('.battle-hero'),enemy=arena?.querySelector('.enemy');
    if(!arena||!hero||!enemy)return;
    const heroBox=hero.getBoundingClientRect(),enemyBox=enemy.getBoundingClientRect();
    const travel=Math.max(0,Math.min(arena.clientWidth*.52,enemyBox.left-heroBox.right+heroBox.width*.28));
    arena.style.setProperty('--hero-travel',`${travel}px`);
  }
  function tick(){clearInterval(timerId);run.last=performance.now();updateEnemyApproach();timerId=setInterval(()=>{if(!run||run.done||run.paused||run.locked)return;const now=performance.now(),delta=now-run.last;run.last=now;run.remaining=Math.max(0,run.remaining-delta);run.elapsed+=delta;const el=$('timer'),timeBox=$('arena-time');if(el)el.firstChild.textContent=(run.remaining/1000).toFixed(1);if(timeBox)timeBox.classList.toggle('danger',run.remaining<2000);updateEnemyApproach();if(run.remaining<=0)answer(-1);},50);}
  function pause(){if(!run||run.done)return;run.paused=true;clearInterval(timerId);}
  function resume(){closeDialog();if(run&&!run.done){run.paused=false;tick();}}
  function cancelSpeech(){if(window.WordoriaNativeSpeech?.cancel)window.WordoriaNativeSpeech.cancel().catch(()=>{});if(window.speechSynthesis)speechSynthesis.cancel();}
  function speak(text){if(window.WordoriaNativeSpeech?.speak){window.WordoriaNativeSpeech.speak(text,{lang:'en-US',rate:.82}).catch(()=>toast('기기 음성 엔진을 사용할 수 없어요'));return;}if(!('speechSynthesis' in window)){toast('이 브라우저에서는 음성 읽기를 지원하지 않아요');return;}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=.82;speechSynthesis.speak(u);}
  function answer(index){
    if(!run||run.done||run.paused||run.locked)return;run.locked=true;clearInterval(timerId);const q=run.question,chosen=q.choices[index],ok=chosen===q.answer;
    document.querySelectorAll('.answer').forEach((button,i)=>{button.disabled=true;button.classList.toggle('correct',q.choices[i]===q.answer);button.classList.toggle('wrong',i===index&&!ok);});
    if(ok){run.correct++;const gain=earnedCoins(run.correct)-earnedCoins(run.correct-1);document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'success'}}));setHeroAttackTravel();$('arena').classList.add('hit');$('arena-feedback').textContent=`${run.correct} COMBO! ◆ +${gain}`;speak(q.entry[0]);run.feedbackPending=true;nextTimer=setTimeout(()=>{nextTimer=setTimeout(continueAfterFeedback,showBattleReward(q,gain));},1050);return;}
    else{document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'error'}}));$('arena').classList.add('wrong');$('arena-feedback').textContent=index<0?'시간 초과!':'아쉬워요!';}
    nextTimer=setTimeout(()=>finishBattle(false,index<0?'timeout':'wrong'),1450);
  }
  async function finishBattle(clear,reason){
    if(run.done)return;run.done=true;run.clear=clear;run.reason=reason;run.feedbackPending=false;clearInterval(timerId);clearTimeout(nextTimer);removeBattleReward();cancelSpeech();
    if(demo){const coins=earnedCoins(run.correct,clear),id=`demo-${Date.now()}`;selectedCharacter.coins+=coins;run.result={game_score_id:id,coins_earned:coins,balance:selectedCharacter.coins};const row={id,player,stage:stageRecordName(selectedStage),correct:run.correct,total:run.deck.length,cleared:clear,character_id:selectedCharacter.id,duration_ms:Math.round(run.elapsed),coins_earned:coins,created_at:new Date().toISOString()};demoState.records.unshift(row);records=demoState.records;saveDemo();}
    else if(dbOnline){try{const rows=await rpc('award_game_result',{p_character_id:selectedCharacter.id,p_stage:stageRecordName(selectedStage),p_correct:run.correct,p_total:run.deck.length,p_cleared:clear,p_duration_ms:Math.round(run.elapsed)});run.result=rows?.[0]||null;if(run.result){if(accountMode)accountCrystals=Number(run.result.balance);else selectedCharacter.coins=run.result.balance;}records=await apiGet('game_scores?select=player,stage,correct,total,cleared,created_at,character_id,duration_ms,coins_earned,id&order=created_at.desc&limit=1000');}catch(error){console.error(error);run.saveError=true;}}
    go('result');
  }
  function clearSummaryMarkup(r,earned){return `<section class="result clear-result"><div class="eyebrow clear-title">STAGE CLEAR</div><h1>클리어!</h1><p class="clear-stage">${esc(stages[selectedStage].name)}</p><div class="clear-stats"><div><span>클리어 타임</span><strong>${(r.elapsed/1000).toFixed(1)}<small>초</small></strong></div><div><span>푼 문제</span><strong>${r.correct}<small> / ${r.deck.length}</small></strong></div><div><span>획득 크리스털</span><strong class="crystal-value">◆ ${num(earned)}</strong></div></div><div class="save-state">${r.saveError?'⚠ 기록 저장에 실패했습니다':demo?'✓ 체험 기록 저장 완료':'✓ 기록 저장 완료'}</div><button class="primary clear-next" data-action="result-next">보상 상자 확인하기 <span>→</span></button></section>`;}
  function chestMarkup(r){const clicks=r.chestClicks||0,progress=clicks/3*100,label=clicks===0?'상자를 터치해 주세요':clicks===1?'좋아요! 한 번 더!':'마지막 한 번!';return `<section class="result chest-result"><div class="eyebrow">CLEAR REWARD</div><h1>보상 상자가 도착했어요!</h1><p>세 번 터치해서 잠든 보물을 깨워 보세요.</p><button class="treasure-chest-button" data-action="chest-tap" style="--chest-progress:${progress}%" aria-label="보상 상자 ${clicks}/3회 열기" ${!r.result?.game_score_id?'disabled':''}><span class="chest-ring" aria-hidden="true"><i></i><i></i><i></i></span><span class="reward-chest" aria-hidden="true"><i class="chest-glow"></i><img class="chest-art chest-art-closed" src="assets/ui/crystal-quest/rewards/ui_reward_chest_guardian_closed.webp" alt=""><img class="chest-art chest-art-open" src="assets/ui/crystal-quest/rewards/ui_reward_chest_guardian_open.webp" alt=""></span><span class="chest-sparkles" aria-hidden="true">✦ ✧ ✦</span></button><div class="chest-progress-copy"><strong>${clicks} / 3</strong><span>${r.result?.game_score_id?label:'보상 기록을 저장해야 상자를 열 수 있어요'}</span></div><div class="chest-pips" aria-hidden="true">${[1,2,3].map(n=>`<i class="${clicks>=n?'filled':''}"></i>`).join('')}</div></section>`;}
  function crystalRewardMarkup(r){return `<section class="result crystal-reveal"><div class="reward-radiance" aria-hidden="true"></div><div class="eyebrow">TREASURE FOUND</div><h1>크리스털 획득!</h1><div class="giant-crystal" aria-hidden="true"><img src="assets/ui/crystal-quest/rewards/ui_reward_crystal_bloom.webp" alt=""></div><div class="reward-amount"><strong>+${num(r.treasure)}</strong><span>크리스털</span></div><p>보상이 계정 지갑에 안전하게 담겼어요.</p><button class="primary reward-claim" data-action="receive-reward">받기</button></section>`;}
  function renderResult(){const r=run,result=r.result,earned=result?.coins_earned??earnedCoins(r.correct,r.clear);if(!r.clear)return `<section class="result"><div class="result-symbol">${icon('aura')}</div><div class="eyebrow" style="color:var(--violet)">KEEP EXPLORING</div><h1>${r.reason==='timeout'?'시간이 다 되었어요':'다음엔 더 멀리 갈 수 있어요'}</h1><p>${esc(stages[selectedStage].name)} · ${r.correct} / ${r.deck.length} 정답<br>이번에 배운 단어는 다음 모험의 힘이 됩니다.</p><div class="reward-number">◆ +${num(earned)}</div><div class="panel row small reward-breakdown"><span>정답 <b>${r.correct}</b></span><span>풀이 시간 <b>${(r.elapsed/1000).toFixed(1)}초</b></span></div><button class="primary" data-action="retry">다시 도전하기 →</button><div class="actions"><button class="secondary" data-action="nav" data-page="dungeon">다른 던전</button><button class="secondary" data-action="nav" data-page="home">홈으로</button></div></section>`;if(r.resultStep==='chest')return chestMarkup(r);if(r.resultStep==='reward')return crystalRewardMarkup(r);return clearSummaryMarkup(r,earned);}

  function showCharacters(){if(accountMode){characterCreating=false;go('characters');return;}modal(`<div class="eyebrow">CHOOSE YOUR HERO</div><h2>모험가 선택</h2>${profileBar()}<div class="character-list">${characters.map(c=>`<button class="character-row ${c.id===selectedCharacter?.id?'active':''}" data-action="select-character" data-id="${c.id}"><img src="${imagePath(c)}" alt=""><span><b>${esc(c.name)}</b><small>${characterDef(c).label} · ${variantOf(c)==='female'?'여성':'남성'}</small></span><span class="wallet">◆ ${num(c.coins)}</span></button>`).join('')||'<div class="empty-state">이 유저는 아직 캐릭터가 없어요.</div>'}</div><button class="primary" data-action="new-character" ${!dbOnline&&!demo?'disabled':''}>＋ 새 캐릭터 만들기</button>`);}
  function showNewPlayer(){modal('<div class="eyebrow">NEW PLAYER</div><h2>새 유저 추가</h2><label class="form-label" for="player-name">유저 이름</label><input id="player-name" class="field" maxlength="12" autocomplete="off" placeholder="예: 엄마"><p>한글, 영문, 숫자, 공백, 밑줄과 하이픈을 사용할 수 있어요.</p><button class="primary" data-action="create-player">유저 추가</button>');setTimeout(()=>$('player-name')?.focus(),0);}
  function showNewCharacter(){newClass='warrior';newVariant='male';newAccent='violet';newCharacterName='';if(accountMode){if(characters.length&&!availableCharacterTickets){go('characters');toast('먼저 캐릭터 추가권을 구매해 주세요');return;}characterCreating=true;go('characters');return;}renderCharacterForm();}
  function renderCharacterForm(){if($('character-name'))newCharacterName=$('character-name').value;if(accountMode){render();return;}const d=classDefs[newClass];modal(`<div class="eyebrow">CREATE YOUR HERO</div><h2>${esc(player)}님의 새 모험가</h2><label class="form-label" for="character-name">캐릭터 이름</label><input id="character-name" class="field" maxlength="16" value="${esc(newCharacterName)}" placeholder="예: 불꽃검 율이"><label class="form-label">직업</label><div class="tabs">${Object.entries(classDefs).map(([id,c])=>`<button class="${id===newClass?'active':''}" data-action="class" data-value="${id}">${c.label}</button>`).join('')}</div><p>${d.trait}</p><label class="form-label">기본 외형</label><div class="choice-grid">${['male','female'].map(v=>`<button class="choice-card ${v===newVariant?'active':''}" data-action="variant" data-value="${v}"><img src="assets/avatars/${d.paths[v]}?v=20260917-skins" alt="">${v==='male'?'남성':'여성'} 캐릭터</button>`).join('')}</div><label class="form-label">오라 색상</label><div class="accent-row">${['violet','red','blue','green','gold'].map(v=>`<button class="accent-choice ${v===newAccent?'active':''}" data-action="accent" data-value="${v}" aria-label="${v}"></button>`).join('')}</div><button class="primary" data-action="create-character">캐릭터 생성 →</button>`);}
  function showItem(id){const item=itemById(id);if(!item)return;const owned=itemOwned(item),eq=Object.values(equippedMap()).some(v=>String(v)===String(id)),gear=item.category==='avatar',skin=isSkin(item),rarity=displayRarity(item),eligible=!skin||skinEligible(item),balance=walletBalance(),disabled=!owned&&(!eligible||balance<item.price),requirement=skin?skinRequirement(item):'';modal(`<div class="eyebrow">${rarityNames[rarity]}${gear?' · 아이템':' · 현실 보상'}</div><div class="item-art item-detail-art" data-rarity="${rarity}">${itemArt(item)}</div><h2>${esc(item.name)}</h2><p>${esc(item.description)}</p>${gear?`<div class="item-detail-stat"><span>${skin?'사용 조건':'장착 능력치'}</span><b>${skin?requirement:`${esc(String(item.stat_key||'').toUpperCase())} +${num(item.stat_value)}`}</b></div>`:''}<div class="row" style="margin-top:18px"><b>${num(item.price)} ◆</b><span class="small muted">계정 보유 ${num(balance)} ◆</span></div><button class="primary" data-action="${owned?'equip':'buy'}" data-id="${item.id}" ${disabled?'disabled':''}>${owned?(eq?'장착 해제':'장착하기'):(!eligible?`${requirement}이에요`:balance<item.price?'크리스털이 부족해요':item.category==='gift'?'보상 신청하기':'구매하기')}</button>`);}
  function showRecords(){const rows=selectedRecords().slice(0,20);modal(`<div class="eyebrow">ADVENTURE JOURNAL</div><h2>모험 기록</h2><p>${esc(selectedCharacter?.name||player)}의 최근 도전입니다.</p>${rows.length?rows.map(r=>`<div class="record-row row"><div><b>${esc(r.stage)}</b><small>${new Date(r.created_at).toLocaleString('ko-KR')} · ${r.correct}/${r.total} 정답</small></div><span>${r.cleared?'CLEAR':'도전'}<small>+${num(r.coins_earned)} ◆</small></span></div>`).join(''):'<div class="notice">아직 모험 기록이 없어요.</div>'}`);}
  function showStats(){const s=stats();modal(`<div class="eyebrow">ADVENTURER STATUS</div><h2>${esc(selectedCharacter.name)} · LV.${s.level}</h2><p>${characterDef(selectedCharacter).label} · ${characterDef(selectedCharacter).trait}</p><div class="record-row row"><span>경험치</span><b>${s.exp} / 1,000</b></div><div class="record-row row"><span>최고 콤보</span><b>${s.best}</b></div><div class="record-row row"><span>누적 정답</span><b>${s.correct} / ${s.answered}</b></div><div class="record-row row"><span>정답률</span><b>${s.accuracy}%</b></div><div class="record-row row"><span>클리어</span><b>${s.clears}</b></div><button class="primary" data-action="records">모험 기록 보기</button>`);}
  function showRequests(){modal(`<div class="eyebrow">REWARD REQUESTS</div><h2>보상 신청 내역</h2><p>현실 보상은 보호자 승인 후 지급됩니다.</p>${redemptions.length?redemptions.map(r=>`<div class="record-row row"><b>${esc(itemById(r.item_id)?.name||'보상')}</b><span class="request-status ${esc(r.status)}">${({pending:'승인 대기',approved:'승인',fulfilled:'지급 완료',cancelled:'취소'})[r.status]||esc(r.status)}</span></div>`).join(''):'<div class="notice">아직 신청한 보상이 없어요.</div>'}`);}
  function rankingMarkup(){const best={};records.filter(r=>r.stage===stageRecordName(selectedStage)).forEach(r=>{const key=r.character_id||r.player,old=best[key];if(!old||Number(r.cleared)>Number(old.cleared)||(r.cleared===old.cleared&&r.correct>old.correct))best[key]=r;});const rows=Object.values(best).sort((a,b)=>Number(b.cleared)-Number(a.cleared)||b.correct-a.correct).slice(0,10);return `<div class="ranking-list">${rows.map((r,i)=>{const c=allCharacters.find(x=>x.id===r.character_id);return `<div class="ranking-row"><span>${i+1}</span><b>${esc(c?.name||r.player)}<small>${esc(r.player)} · ${r.cleared?'CLEAR':'도전'}</small></b><span>${r.correct}/${r.total}</span></div>`;}).join('')||'<div class="notice">아직 랭킹 기록이 없어요. 첫 기록의 주인공이 되어 보세요!</div>'}</div>`;}
  function showMapStart(){const stage=stages[selectedStage];modal(`<div class="eyebrow">MAP RANKING · TOP 10</div><h2>${esc(stage?.name||'맵')}</h2><p>${esc(stage?.desc||'단어 모험')} · 문제당 5초</p>${rankingMarkup()}<button class="primary" data-action="start">START</button>`);}
  function showRankings(){modal(`<div class="eyebrow">CRYSTAL RANKING · TOP 10</div><h2>${esc(stages[selectedStage]?.name||'맵')} 랭킹</h2>${rankingMarkup()}`);}

  const roleLabels={admin:'관리자',teacher:'선생님',student:'학생'};
  function profilePermissions(role){
    if(role==='admin')return ['모든 월드와 맵 관리','사용자 및 계정 권한 관리','공개·비공개 맵 플레이'];
    if(role==='teacher')return ['내 월드와 맵 만들기','AI 단어 추출 및 문제 구성','허용된 비공개 맵 플레이'];
    return ['공개 맵 플레이','허용된 비공개 맵 플레이','학습 기록과 캐릭터 관리'];
  }
  async function loadAccountProfile(){
    if(demo||window.WORDORIA_GUEST)return {display_name:player,login_id:null,role:'student',contact_email:null,contact_email_active:false,guest:true};
    const client=window.WORDORIA_AUTH_CLIENT;
    if(!client)return {display_name:player,login_id:null,role:'student',contact_email:null,contact_email_active:false,guest:true};
    const session=window.WORDORIA_SESSION||(await client.auth.getSession()).data?.session;
    if(!session)return {display_name:player,login_id:null,role:'student',contact_email:null,contact_email_active:false,guest:true};
    const result=await client.from('profiles').select('display_name,login_id,role,contact_email,contact_email_active,contact_email_verified_at,email_reward_granted_at,email_reward_crystals,crystal_balance').eq('user_id',session.user.id).single();
    if(result.error)throw result.error;
    return {...result.data,contact_email:result.data.contact_email||null,guest:false,user_id:session.user.id};
  }
  function profileMarkup(profile){
    const role=profile.role||'student',roleLabel=roleLabels[role]||'학생',permissions=profilePermissions(role),verified=Boolean(profile.contact_email_active&&profile.contact_email_verified_at),email=verified?(profile.contact_email||''):'';
    const emailControl=profile.guest?'<div class="profile-empty">로그인하면 이메일을 인증하고 계정 설정을 관리할 수 있어요.</div>':verified?`<label class="profile-email-label" for="profile-email">인증된 이메일</label><div class="profile-email-row verified"><input id="profile-email" class="field" type="email" value="${esc(email)}" readonly aria-readonly="true"><button class="email-unlink" data-action="ask-unlink-email" aria-label="이메일 연동 해제" title="연동 해제">×</button></div><p class="profile-email-status">✓ 이메일 인증 완료 · 계정 보상 ${num(profile.email_reward_crystals)} ◆</p>`:`<label class="profile-email-label" for="profile-email">인증할 이메일</label><div class="profile-email-row"><input id="profile-email" class="field" type="email" inputmode="email" autocomplete="email" maxlength="254" placeholder="name@example.com"><button class="secondary" data-action="send-profile-code">인증 메일</button></div><p class="profile-email-status pending">6자리 문자+숫자 코드를 이메일로 보내드려요.</p>`;
    const roleControl=verified&&role!=='admin'?`<div class="role-picker" aria-label="계정 권한 선택"><button class="${role==='student'?'active':''}" data-action="select-profile-role" data-role="student" aria-pressed="${role==='student'}">학생</button><button class="${role==='teacher'?'active':''}" data-action="select-profile-role" data-role="teacher" aria-pressed="${role==='teacher'}">선생님</button></div>`:verified&&role==='admin'?'<div class="admin-fixed-note">heojoon48@gmail.com 인증 관리자 · 권한 고정</div>':'';
    return `<section class="profile-sheet"><div class="profile-heading"><span class="profile-gem">${icon('profile')}</span><div><div class="eyebrow">MY CRYSTAL PROFILE</div><h2>${esc(profile.display_name||player)}</h2><span class="role-badge role-${esc(role)}">${icon('shield')} ${esc(roleLabel)}</span></div></div><div class="profile-account-card"><div class="profile-row"><span>로그인 아이디</span><b>${profile.guest?'게스트 모드':esc(profile.login_id||'아이디 정보 없음')}</b></div><div class="profile-row"><span>계정 공용 크리스털</span><b>◆ ${num(profile.guest?walletBalance():profile.crystal_balance)}</b></div><div class="profile-row"><span>계정 권한</span><b>${esc(roleLabel)}</b></div></div><div class="profile-section-title"><span>${icon('mail')}</span><div><b>이메일 인증</b><small>인증을 완료하면 200 크리스털을 한 번 지급해요.</small></div></div>${emailControl}<div class="profile-section-title"><span>${icon('shield')}</span><div><b>내 권한</b><small>${verified?'인증된 계정의 역할을 선택할 수 있어요.':'이메일 인증 후 역할을 선택할 수 있어요.'}</small></div></div>${roleControl}<ul class="permission-list">${permissions.map(item=>`<li>${esc(item)}</li>`).join('')}</ul><div class="profile-future-grid"><button disabled><span>${icon('friends')}</span><b>친구</b><small>친구 추가 · 친구 맺기</small><i>준비 중</i></button><button disabled><span>${icon('group')}</span><b>내 그룹</b><small>그룹 참여 · 구성원 관리</small><i>준비 중</i></button></div><button class="profile-signout" data-action="signout">${profile.guest?'로그인 · 회원가입으로 이동':'로그아웃'}</button></section>`;
  }
  async function showProfile(){
    modal('<div class="profile-loading"><i></i><b>프로필을 불러오는 중…</b></div>');
    try{accountProfile=await loadAccountProfile();if(!accountProfile.guest)accountCrystals=Number(accountProfile.crystal_balance||0);$('dialog-content').innerHTML=profileMarkup(accountProfile);}
    catch(error){console.error(error);$('dialog-content').innerHTML='<div class="eyebrow">MY PROFILE</div><h2>프로필을 불러오지 못했어요</h2><p>네트워크 연결을 확인한 뒤 다시 시도해 주세요.</p><button class="primary" data-action="profile">다시 시도</button>';}
  }
  async function invokeProfileEmail(body){
    const client=window.WORDORIA_AUTH_CLIENT;
    if(!client)throw new Error('로그인 후 이메일을 인증할 수 있어요.');
    const {data,error}=await client.functions.invoke('verify-profile-email',{body});
    if(error){let message=error.message||'요청을 처리하지 못했습니다.';try{const payload=await error.context?.clone().json();if(payload?.error)message=payload.error;}catch{}throw new Error(message);}
    if(data?.error)throw new Error(data.error);
    return data;
  }
  function showVerificationCode(email){
    modal(`<section class="verification-sheet"><div class="verification-icon">${icon('mail')}</div><div class="eyebrow">VERIFY YOUR EMAIL</div><h2>인증코드를 입력해 주세요</h2><p><b>${esc(email)}</b>로 보낸 6자리 문자+숫자 코드입니다.<br>코드는 10분 동안 유효해요.</p><label class="profile-email-label" for="profile-code">인증코드</label><input id="profile-code" class="field verification-code" type="text" inputmode="text" autocomplete="one-time-code" autocapitalize="characters" maxlength="6" placeholder="A1B2C3"><button class="primary" data-action="verify-profile-code" data-email="${esc(email)}">인증 완료</button><button class="text-btn resend-code" data-action="resend-profile-code" data-email="${esc(email)}">인증 메일 다시 보내기</button></section>`);
    setTimeout(()=>$('profile-code')?.focus(),0);
  }
  async function sendProfileCode(button,emailOverride){
    const input=$('profile-email'),email=input?.value.trim().toLocaleLowerCase('en-US')||'';
    const target=(emailOverride||email).trim().toLocaleLowerCase('en-US');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)){toast('올바른 이메일 주소를 입력해 주세요');input?.focus();return;}
    button.disabled=true;button.textContent='발송 중…';
    try{await invokeProfileEmail({action:'send',email:target});showVerificationCode(target);toast('인증 메일을 보냈어요');}
    catch(error){console.error(error);button.disabled=false;button.textContent='다시 시도';toast(error.message);}
  }
  async function verifyProfileCode(button){
    const input=$('profile-code'),code=input?.value.trim().toUpperCase()||'';
    if(!/^[A-Z0-9]{6}$/.test(code)){toast('6자리 문자+숫자 코드를 입력해 주세요');input?.focus();return;}
    button.disabled=true;button.textContent='확인 중…';
    try{const result=await invokeProfileEmail({action:'verify',code});accountProfile=await loadAccountProfile();accountCrystals=Number(accountProfile.crystal_balance||0);$('dialog-content').innerHTML=profileMarkup(accountProfile);render();toast(result.reward?`인증 완료! 계정에 ${result.reward} 크리스털을 받았어요`:'이메일 인증이 완료됐어요');}
    catch(error){console.error(error);button.disabled=false;button.textContent='인증 완료';toast(error.message);input?.select();}
  }
  function askUnlinkEmail(){
    modal(`<section class="unlink-warning"><div class="verification-icon danger">×</div><div class="eyebrow">UNLINK EMAIL</div><h2>정말 이메일 연동을<br>해제하시겠습니까?</h2><p>${esc(accountProfile?.contact_email||'')} 정보는 안전한 기록을 위해 데이터베이스에 유지되지만 미사용 상태로 전환됩니다.</p><div class="actions"><button class="secondary" data-action="cancel-unlink-email">취소</button><button class="danger-action" data-action="confirm-unlink-email">연동 해제</button></div></section>`);
  }
  async function unlinkProfileEmail(button){
    button.disabled=true;button.textContent='해제 중…';
    try{await invokeProfileEmail({action:'unlink'});accountProfile=await loadAccountProfile();$('dialog-content').innerHTML=profileMarkup(accountProfile);toast('이메일 연동을 해제했어요');}
    catch(error){console.error(error);button.disabled=false;button.textContent='다시 시도';toast(error.message);}
  }
  async function selectProfileRole(button){
    const role=button.dataset.role;
    try{await invokeProfileEmail({action:'select-role',role});accountProfile=await loadAccountProfile();$('dialog-content').innerHTML=profileMarkup(accountProfile);toast(`${roleLabels[role]} 권한으로 변경했어요`);}
    catch(error){console.error(error);toast(error.message);}
  }
  async function signOut(){
    const client=window.WORDORIA_AUTH_CLIENT;
    if(!window.WORDORIA_GUEST&&!demo&&client)await client.auth.signOut();
    sessionStorage.removeItem('wordoriaGuest');location.reload();
  }

  async function switchPlayer(name){player=name;localStorage.setItem('fantasyQuizPlayer',player);chooseCharacter();await loadCharacterExtras();closeDialog();go('home');}
  async function createPlayer(){const input=$('player-name'),name=input?.value.trim().replace(/\s+/g,' ');if(!name||!/^[가-힣A-Za-z0-9 _-]{1,12}$/.test(name)){toast('사용할 수 있는 유저 이름을 입력해 주세요');return;}if(players.some(x=>x.toLocaleLowerCase()===name.toLocaleLowerCase())){toast('이미 등록된 유저예요');return;}const custom=readCustomPlayers();custom.push(name);localStorage.setItem('fantasyQuizPlayers',JSON.stringify(unique(custom)));players.push(name);await switchPlayer(name);showNewCharacter();}
  async function createCharacter(button){const input=$('character-name'),name=input?.value.trim();if(!name){toast('캐릭터 이름을 입력해 주세요');input?.focus();return;}button.disabled=true;button.textContent='생성 중…';try{let created;if(demo){if(demoState.characters.filter(c=>c.player===player).length&&!(demoState.characterTickets>0))throw new Error('character creation ticket required');created={id:`demo-${Date.now()}`,player,name,class:newClass,avatar_variant:newVariant,accent:newAccent,coins:0,equipped_items:{}};demoState.characters.push(created);if(demoState.characters.filter(c=>c.player===player).length>1)demoState.characterTickets--;saveDemo();}else if(accountMode){const rows=await rpc('create_account_character',{p_name:name,p_class:newClass,p_avatar_variant:newVariant,p_accent:newAccent});created=Array.isArray(rows)?rows[0]:rows;}else{let rows;try{rows=await apiPost('game_characters',{player,name,class:newClass,avatar_variant:newVariant,accent:newAccent});}catch(error){if(!String(error.message).includes('avatar_variant'))throw error;rows=await apiPost('game_characters',{player,name,class:newClass,accent:newAccent});if(rows?.[0])localStorage.setItem(`fantasyQuizAvatar:${rows[0].id}`,newVariant);}created=rows?.[0];}if(created)localStorage.setItem(`fantasyQuizCharacter:${player}`,created.id);closeDialog();characterCreating=false;await refresh();if(accountMode)go('characters');toast('새 모험가가 길드에 합류했어요!');}catch(error){console.error(error);button.disabled=false;button.textContent='다시 시도';toast(String(error.message).includes('ticket')?'캐릭터 추가권이 필요해요':'캐릭터 생성에 실패했습니다');}}
  async function buyCharacterTicket(button){if(!selectedCharacter||walletBalance()<1000){toast('계정 크리스털이 부족해요');return;}button.disabled=true;button.textContent='구매 중…';try{if(demo){selectedCharacter.coins-=1000;demoState.characterTickets=(demoState.characterTickets||0)+1;availableCharacterTickets=demoState.characterTickets;saveDemo();}else{const rows=await rpc('purchase_character_creation_ticket',{p_payer_character_id:selectedCharacter.id});const result=rows?.[0];if(result){accountCrystals=Number(result.new_balance);availableCharacterTickets=result.available_tickets;}}render();toast('계정 크리스털로 캐릭터 추가권을 구매했어요!');}catch(error){console.error(error);button.disabled=false;button.textContent='다시 시도';toast(String(error.message).includes('not enough')?'계정 크리스털이 부족해요':'추가권을 구매하지 못했어요');}}
  async function purchase(item){if(!item||walletBalance()<item.price)return;if(isSkin(item)&&!skinEligible(item)){toast(`${skinRequirement(item)} 캐릭터만 이 스킨을 구매할 수 있어요`);return;}try{if(demo){selectedCharacter.coins-=item.price;if(item.category==='avatar')demoState.inventory.push({character_id:selectedCharacter.id,item_id:item.id});else demoState.redemptions.unshift({id:Date.now(),character_id:selectedCharacter.id,item_id:item.id,status:'pending',price_paid:item.price,created_at:new Date().toISOString()});saveDemo();}else{const rows=await rpc('purchase_shop_item',{p_character_id:selectedCharacter.id,p_item_id:item.id});if(rows?.[0]){if(accountMode)accountCrystals=Number(rows[0].new_balance);else selectedCharacter.coins=rows[0].new_balance;}}await loadCharacterExtras();closeDialog();render();toast(item.category==='gift'?'보상 신청이 접수되었어요':'구매 완료! 장비함에서 장착해 보세요');}catch(error){console.error(error);toast(String(error.message).includes('female pugilist')?'여성 권투사만 구매할 수 있어요':String(error.message).includes('female ranger')?'여성 궁수만 구매할 수 있어요':String(error.message).includes('not enough')?'계정 크리스털이 부족해요':'구매하지 못했습니다');}}
  async function equip(item){if(!item||!itemOwned(item))return;if(isSkin(item)&&!skinEligible(item)){toast(`${skinRequirement(item)} 캐릭터만 이 스킨을 장착할 수 있어요`);return;}const slot=slotFor(item),map=equippedMap(),isEquipped=String(map[slot])===String(item.id);try{if(demo){if(isEquipped)delete map[slot];else map[slot]=item.id;selectedCharacter.equipped_items=map;saveDemo();}else{await rpc('equip_avatar_slot',{p_character_id:selectedCharacter.id,p_item_id:isEquipped?null:item.id,p_slot:slot});await loadAll();}closeDialog();render();toast(isEquipped?'스킨 장착을 해제했어요':'장착했어요! 캐릭터 모습이 바뀌었어요');}catch(error){console.error(error);toast(String(error.message).includes('female pugilist')?'여성 권투사만 장착할 수 있어요':String(error.message).includes('female ranger')?'여성 궁수만 장착할 수 있어요':'장비 슬롯 기능을 사용하려면 최신 DB 마이그레이션이 필요합니다');}}
  async function claimChestReward(){let reward;if(demo){const min=selectedCharacter.class==='ranger'?20:10;reward=min+Math.floor(Math.random()*(31-min));selectedCharacter.coins+=reward;saveDemo();}else{const rows=await rpc('claim_stage_treasure',{p_character_id:selectedCharacter.id,p_game_score_id:run.result.game_score_id});reward=rows?.[0]?.reward;if(accountMode)accountCrystals=Number(rows?.[0]?.balance??accountCrystals);else selectedCharacter.coins=rows?.[0]?.balance??selectedCharacter.coins;}return reward;}
  function resultNext(){if(!run?.clear)return;run.resultStep='chest';render();requestAnimationFrame(()=>$('screen')?.focus());}
  async function tapChest(button){if(!run?.clear||run.chest||!run.result?.game_score_id||button.classList.contains('opening'))return;run.chestClicks=Math.min(3,(run.chestClicks||0)+1);button.style.setProperty('--chest-progress',`${run.chestClicks/3*100}%`);button.setAttribute('aria-label',`보상 상자 ${run.chestClicks}/3회 열기`);button.classList.remove('shake-one','shake-two');void button.offsetWidth;button.classList.add(run.chestClicks===1?'shake-one':run.chestClicks===2?'shake-two':'opening');document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:run.chestClicks===3?'success':'light'}}));if(run.chestClicks<3){button.parentElement.querySelector('.chest-progress-copy strong').textContent=`${run.chestClicks} / 3`;button.parentElement.querySelector('.chest-progress-copy span').textContent=run.chestClicks===1?'좋아요! 한 번 더!':'마지막 한 번!';button.parentElement.querySelectorAll('.chest-pips i')[run.chestClicks-1]?.classList.add('filled');return;}button.disabled=true;try{const [reward]=await Promise.all([claimChestReward(),new Promise(resolve=>setTimeout(resolve,900))]);run.chest=true;run.treasure=reward;run.resultStep='reward';render();}catch(error){console.error(error);run.chestClicks=2;render();toast('보물상자를 열지 못했어요. 다시 시도해 주세요');}}
  function receiveReward(){if(!run?.chest)return;go('stages');toast(`크리스털 ${num(run.treasure)}개를 받았어요!`);}

  document.addEventListener('click',async event=>{const b=event.target.closest('button[data-action]');if(!b||b.disabled)return;const action=b.dataset.action,id=b.dataset.id;
    if(action==='nav')navigate(b.dataset.page);else if(action==='home')navigate('home');else if(action==='close'){closeDialog();if(page==='battle'&&run?.paused)resume();}
    else if(action==='player')await switchPlayer(b.dataset.player);else if(action==='add-player')showNewPlayer();else if(action==='create-player')await createPlayer();
    else if(action==='characters')showCharacters();else if(action==='select-character'){selectedCharacter=characters.find(c=>c.id===id)||selectedCharacter;localStorage.setItem(`fantasyQuizCharacter:${player}`,selectedCharacter.id);await loadCharacterExtras();if(accountMode)render();else{closeDialog();render();}}
    else if(action==='enter-game'){if(selectedCharacter)go('home');}else if(action==='open-character-create'||action==='new-character')showNewCharacter();else if(action==='cancel-character-create'){characterCreating=false;render();}else if(action==='buy-character-ticket')await buyCharacterTicket(b);else if(action==='class'){if($('character-name'))newCharacterName=$('character-name').value;newClass=b.dataset.value;renderCharacterForm();}else if(action==='variant'){if($('character-name'))newCharacterName=$('character-name').value;newVariant=b.dataset.value;renderCharacterForm();}else if(action==='accent'){if($('character-name'))newCharacterName=$('character-name').value;newAccent=b.dataset.value;renderCharacterForm();}else if(action==='create-character')await createCharacter(b);
    else if(action==='item')showItem(id);else if(action==='filter'){filter=b.dataset.filter;render();}else if(action==='buy')await purchase(itemById(id));else if(action==='equip')await equip(itemById(id));
    else if(action==='slot'){const eq=equippedMap()[b.dataset.slot],owned=shopItems.find(i=>slotFor(i)===b.dataset.slot&&itemOwned(i));if(eq)showItem(eq);else if(owned)showItem(owned.id);else{filter=b.dataset.slot==='skin'?'skin':'item';go('shop');toast('이 슬롯에 어울리는 아이템을 골라 보세요');}}
    else if(action==='world'){worldIndex=Number(b.dataset.index);go('stages');}else if(action==='stage'){selectedStage=b.dataset.stage;showMapStart();}else if(action==='start'||action==='retry')startBattle();
    else if(action==='answer')answer(Number(b.dataset.index));else if(action==='dismiss-reward')continueAfterFeedback();else if(action==='pause'){pause();modal('<div class="eyebrow">PAUSED</div><h2>잠깐의 휴식</h2><p>시간도 함께 멈췄어요. 준비되면 다시 시작하세요.</p><button class="primary" data-action="resume">계속하기</button><button class="text-btn" data-action="leave" data-page="dungeon">도전을 저장하고 던전으로</button>');}else if(action==='resume')resume();else if(action==='leave'){closeDialog();await finishBattle(false,'leave');go(b.dataset.page);}
    else if(action==='speak')speak(run.question.entry[0]);else if(action==='result-next')resultNext();else if(action==='chest-tap')await tapChest(b);else if(action==='receive-reward')receiveReward();else if(action==='records')showRecords();else if(action==='stats')showStats();else if(action==='requests')showRequests();else if(action==='rankings')showRankings();else if(action==='wallet')modal(`<div class="eyebrow">ACCOUNT CRYSTAL WALLET</div><h2>◆ ${num(walletBalance())}</h2><p>계정의 모든 캐릭터가 함께 사용하는 크리스털이에요.<br>어떤 캐릭터로 모아도 같은 지갑에 쌓입니다.</p>`);else if(action==='profile')await showProfile();else if(action==='send-profile-code')await sendProfileCode(b);else if(action==='resend-profile-code')await sendProfileCode(b,b.dataset.email);else if(action==='verify-profile-code')await verifyProfileCode(b);else if(action==='select-profile-role')await selectProfileRole(b);else if(action==='ask-unlink-email')askUnlinkEmail();else if(action==='cancel-unlink-email')$('dialog-content').innerHTML=profileMarkup(accountProfile);else if(action==='confirm-unlink-email')await unlinkProfileEmail(b);else if(action==='signout')await signOut();
  });
  document.addEventListener('input',event=>{
    if(event.target.id!=='world-search')return;
    const query=event.target.value.trim().toLocaleLowerCase();
    let visible=0;
    document.querySelectorAll('[data-world-search]').forEach(card=>{
      const matches=!query||card.dataset.worldSearch.includes(query);
      card.hidden=!matches;
      if(matches)visible++;
    });
    const empty=$('world-empty');
    if(empty)empty.hidden=visible>0;
  });
  document.addEventListener('error', event => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement) || !image.dataset.localArt) return;
    const fallback = image.dataset.localArt;
    delete image.dataset.localArt;
    if (image.getAttribute('src') !== fallback) image.src = fallback;
  }, true);
  $('dialog').addEventListener('cancel',event=>{event.preventDefault();closeDialog();if(page==='battle'&&run?.paused)resume();});
  document.addEventListener('keydown',event=>{if(page==='battle'&&!$('dialog').open&&/^[1-4]$/.test(event.key)){event.preventDefault();answer(Number(event.key)-1);}if(event.key==='Enter'&&$('player-name'))createPlayer();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&page==='battle'&&run&&!run.done&&!run.paused&&!run.feedbackPending){pause();modal('<h2>모험을 잠시 멈췄어요</h2><p>다시 준비되면 계속할 수 있어요.</p><button class="primary" data-action="resume">계속하기</button>');}});
  document.addEventListener('wordoria:native-pause',()=>{if(page==='battle'&&run&&!run.done&&!run.paused&&!run.feedbackPending){pause();modal('<h2>모험을 잠시 멈췄어요</h2><p>앱으로 돌아오면 계속할 수 있어요.</p><button class="primary" data-action="resume">계속하기</button>');}});
  document.addEventListener('wordoria:native-back',()=>{if($('dialog').open){document.querySelector('[data-action=close]')?.click();return;}if(page==='battle'&&run&&!run.done){document.querySelector('[data-action=pause]')?.click();return;}if(page!=='home'){go('home');return;}document.dispatchEvent(new CustomEvent('wordoria:exit'));});

  loadAll().then(()=>render()).catch(error=>{console.error(error);dbOnline=false;setConnection();render();});
})();
