(async () => {
  'use strict';

  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const demo = params.get('demo') === '1';
  const localHost = ['localhost', '127.0.0.1'].includes(location.hostname);
  const nativeApp = document.documentElement.classList.contains('native-app') || Boolean(window.Capacitor?.isNativePlatform?.());
  const useLocalDb = params.get('db') === 'local' && localHost && !nativeApp;
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
  const storyStages = [
    {number:1,key:'story-prologue',name:'별빛 도서관',desc:'숲으로 떠나기 전 첫 크리스털을 깨워요',intro:true,epilogue:true},
    {number:2,key:'story-lv1',name:'도서관 길목',desc:'별빛 도서관에서 숲으로 이어지는 길'},
    {number:3,key:'story-lv2',name:'속삭임의 오솔길',desc:'나무 사이에 숨은 단어 크리스털'},
    {number:4,key:'story-lv3',name:'달빛 연못',desc:'연못에 비친 숲의 수수께끼'},
    {number:5,key:'story-lv4',name:'고대 나무 터',desc:'오래된 나무가 지키는 비밀'},
    {number:6,key:'story-lv5',name:'안개 다리',desc:'안개 너머의 길을 찾아라'},
    {number:7,key:'story-lv6',name:'숲의 수정 관문',desc:'속삭이는 숲의 마지막 시험'}
  ];
  const storyWordPools = [stages.s1?.words,stages.s1?.words,stages.s2?.words,stages.s3?.words,stages.s4?.words,stages.s5?.words,stages.s1?.words];
  storyStages.forEach((stage,index)=>{
    const words=stage.number===2?(storyWordPools[index]||stages.s1?.words||[]).slice(0,5):(storyWordPools[index]||stages.s1?.words||[]);
    stages[stage.key]={name:`속삭이는 숲 · ${stage.number}단계`,recordName:stage.number===2?'스토리 LV.1 · 속삭이는 숲':`스토리 ${stage.number} · 속삭이는 숲`,desc:stage.desc,questionCount:stage.number===2?5:20,story:true,storyNumber:stage.number,words};
  });
  const storyStageKey=storyStages[0].key;
  let selectedStoryStage=storyStageKey;
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
    hourglass:'<path d="M6 3h12M6 21h12M7 4c0 4 2 6 5 8-3 2-5 4-5 8m10-16c0 4-2 6-5 8 3 2 5 4 5 8"/><path d="M9 17h6"/>',
    combo:'<path d="M7 3h10M7 21h10M8 4c0 4 2 6 4 8-2 2-4 4-4 8m8-16c0 4-2 6-4 8 2 2 4 4 4 8"/><path d="m12 8 1.2 2.3L16 11l-2 1.7.2 2.8-2.2-1.3-2.2 1.3.2-2.8-2-1.7 2.8-.7L12 8Z"/>',
    arrow:'<path d="M4 17 17 4m-9 0h9v9"/><path d="M5 8v11h11"/>',
    gift:'<path d="M3 9h18v5H3V9Zm2 5v7h14v-7M12 9v12M12 9C0 8 7-3 12 9Zm0 0c12-1 5-12 0 0Z"/>',
    armor:'<path d="m8 3-5 4 3 5 2-1v10h8V11l2 1 3-5-5-4c0 4-8 4-8 0Z"/><path d="M12 8v13"/>', boots:'<path d="M8 3h7v9l4 3c1.3.9 2 2.1 2 4H8V3Z"/><path d="M8 12h7m-7 3h10M5 19h16"/>',
    worldAdd:'<path d="M3 15 11 5l8 10-8 6-8-6Z"/><path d="M3 15h16M8 9l3 3 3-3M11 15v6M18 3v6M15 6h6"/>',
    profile:'<circle cx="12" cy="8" r="4"/><path d="M4.5 21c.7-5 3.2-7.5 7.5-7.5s6.8 2.5 7.5 7.5"/>',
    mail:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>',
    shield:'<path d="M12 3 5 6v5c0 4.8 2.8 8.1 7 10 4.2-1.9 7-5.2 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>',
    friends:'<path d="M16 21v-2c0-2.2-1.8-4-4-4H6c-2.2 0-4 1.8-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-1a3 3 0 0 1 0 6m5 5v-2c0-1.6-1-3-2.4-3.6"/>',
    group:'<path d="M4 20V9l8-5 8 5v11M8 20v-6h8v6M2 20h20"/>'
  };
  const classDefs = {
    warrior:{label:'전사',title:'CRYSTAL GUARDIAN',trait:'강인함 · 제한시간 +5초',skill:'수호의 방패',skillDesc:'문제마다 40% 확률로 제한시간이 5초 늘어나요.',stats:{hp:5,atk:3,def:5,luk:1},paths:{male:'warrior.webp',female:'variants/warrior-female.webp'}},
    mage:{label:'마법사',title:'ARCANE SCHOLAR',trait:'타임 스톱 · 가끔 시간 정지',skill:'타임 스톱',skillDesc:'문제마다 30% 확률로 타이머가 1.5초 멈춰요.',stats:{hp:2,atk:5,def:2,luk:3},paths:{male:'mage.webp',female:'variants/mage-female.webp'}},
    pugilist:{label:'권투사',title:'COMBO MASTER',trait:'콤보 마스터 · 3콤보 보너스',skill:'크리스털 가방',skillDesc:'3 콤보당 보너스 +1 크리스털 지급',stats:{hp:4,atk:5,def:3,luk:2},paths:{male:'variants/pugilist-male.webp',female:'pugilist.webp?v=20260921-alpha'}},
    ranger:{label:'궁수',title:'TREASURE HUNTER',trait:'보물 사냥꾼 · 상자 최소 20개',skill:'행운의 화살',skillDesc:'보물상자에서 최소 20 크리스털을 찾아요.',stats:{hp:3,atk:4,def:2,luk:5},paths:{male:'variants/ranger-male.webp',female:'ranger.webp'}}
  };
  const builtinWorlds = [
    {name:'속삭이는 숲',sub:'기초부터 도전까지 · 모든 단어가 이어지는 숲길',code:'F1A2',keys:builtinStageKeys.slice()}
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
  let allCharacters = [], characters = [], selectedCharacter = null, shopItems = [], inventory = [], redemptions = [], records = [], storySkillIcons = [], storySkillDefinitions = [];
  let dbOnline = demo, run = null, timerId = null, nextTimer = null, toastTimer = null;
  let newClass = 'warrior', newVariant = 'male', newAccent = 'violet', newCharacterName = '';
  let accountProfile = null, accountCrystals = 0, availableCharacterTickets = 0, characterCreating = false;
  // Story testing suppresses wallet writes until explicitly disabled in-session.
  let storyTestMode = true;
  let characterArmedId = null, characterPreviewId = null, characterSwipeStart = null, suppressCharacterClickUntil = 0;

  const demoKey = 'wordoria-production-demo-v1';
  let demoState = {characters:[{id:'demo-mage',player:'율이',name:'블리자드',class:'mage',avatar_variant:'female',accent:'violet',coins:1250,equipped_items:{}}],records:[],inventory:[],redemptions:[],characterTickets:0};
  try { demoState = {...demoState,...JSON.parse(localStorage.getItem(demoKey) || '{}')}; } catch {}
  const saveDemo = () => localStorage.setItem(demoKey, JSON.stringify(demoState));
  const walletBalance = () => accountMode ? accountCrystals : Number(selectedCharacter?.coins || 0);
  const emitAudio = (id, type='sfx', options) => document.dispatchEvent(new CustomEvent('wordoria:audio',{detail:{id,type,options}}));
  const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  function battleContactDelay(){
    const skinCode=itemById(equippedMap(selectedCharacter).skin)?.code;
    if(reducedMotion())return skinCode==='mage_arcane_necromancer_skin'?170:skinCode==='pugilist_crystal_noir_skin'?160:selectedCharacter?.class==='mage'?250:120;
    if(skinCode==='mage_arcane_necromancer_skin')return 840;
    if(skinCode==='pugilist_crystal_noir_skin')return 330;
    if(selectedCharacter?.class==='mage')return 590;
    if(skinCode==='warrior_golden_radiance_skin')return 780;
    return {warrior:420,mage:560,pugilist:450,ranger:560}[selectedCharacter?.class]||420;
  }
  function syncBGM(target=page){
    if(target==='battle'){emitAudio(run?.story?'FOREST_BGM':run?.index===run?.deck?.length-1?'BOSS_BGM':'BATTLE_BGM','bgm',{crossfadeMs:350});return;}
    if(target==='result'&&run?.clear){emitAudio('ENDING_BGM','bgm',{crossfadeMs:420});return;}
    if(target==='result'){window.wordoriaSound?.fadeOut(300);return;}
    if(['story','storyIntro','storyEpilogue'].includes(target)){emitAudio('FOREST_BGM','bgm',{crossfadeMs:350});return;}
    emitAudio('MENU_BGM','bgm',{crossfadeMs:350});
  }

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
  const slotFor = item => item?.code==='gale_boots' ? 'feet' : item?.slot || ({crown:'head',cape:'back',wings:'back',aura:'aura',pet:'pet'})[item?.code] || 'aura';
  const itemById = id => shopItems.find(item => String(item.id) === String(id));
  function equippedMap(c=selectedCharacter){
    if(!c)return {};
    let map=c.equipped_items;
    if(typeof map==='string'){try{map=JSON.parse(map);}catch{map={};}}
    map={...(map||{})};
    if(map.body&&itemById(map.body)?.code==='gale_boots'){map.feet=map.body;delete map.body;}
    if(c.equipped_item_id){const item=itemById(c.equipped_item_id);if(item&&!map[slotFor(item)])map[slotFor(item)]=item.id;}
    return map;
  }
  function portrait(c=selectedCharacter){
    if(!c)return '';
    return `<div class="portrait"><img src="${imagePath(c)}" alt="${esc(characterDef(c).label)} ${variantOf(c)==='female'?'여성':'남성'} 캐릭터"></div>`;
  }
  function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2400);}
  let gameAudioContext;
  function prepareGameAudio(){
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    if(!AudioContext)return null;
    if(!gameAudioContext)gameAudioContext=new AudioContext();
    if(gameAudioContext.state==='suspended')gameAudioContext.resume().catch(()=>{});
    return gameAudioContext;
  }
  function playStageClearSound(){
    const audio=prepareGameAudio();
    if(!audio||audio.state==='closed')return;
    const start=audio.currentTime+.035,master=audio.createGain();
    master.gain.setValueAtTime(.0001,start);
    master.gain.exponentialRampToValueAtTime(.16,start+.025);
    master.gain.exponentialRampToValueAtTime(.0001,start+1.15);
    master.connect(audio.destination);
    [[523.25,0,.38],[659.25,.16,.44],[783.99,.32,.72],[1046.5,.52,.58]].forEach(([frequency,delay,duration],index)=>{
      const oscillator=audio.createOscillator(),gain=audio.createGain();
      oscillator.type=index===3?'sine':'triangle';
      oscillator.frequency.setValueAtTime(frequency,start+delay);
      oscillator.frequency.exponentialRampToValueAtTime(frequency*1.012,start+delay+duration);
      gain.gain.setValueAtTime(.0001,start+delay);
      gain.gain.exponentialRampToValueAtTime(index===3?.42:.3,start+delay+.018);
      gain.gain.exponentialRampToValueAtTime(.0001,start+delay+duration);
      oscillator.connect(gain);gain.connect(master);oscillator.start(start+delay);oscillator.stop(start+delay+duration+.03);
    });
  }
  function playChestTapSound(tap){
    const audio=prepareGameAudio();
    if(!audio||audio.state==='closed')return;
    const step=Math.max(1,Math.min(3,Number(tap)||1)),start=audio.currentTime+.012,master=audio.createGain();
    master.gain.setValueAtTime(.0001,start);
    master.gain.exponentialRampToValueAtTime(step===3?.2:.14,start+.008);
    master.gain.exponentialRampToValueAtTime(.0001,start+(step===3?.46:.25));
    master.connect(audio.destination);
    const knock=audio.createOscillator(),knockGain=audio.createGain();
    knock.type='triangle';
    knock.frequency.setValueAtTime(150+step*22,start);
    knock.frequency.exponentialRampToValueAtTime(82+step*10,start+.11);
    knockGain.gain.setValueAtTime(.7,start);
    knockGain.gain.exponentialRampToValueAtTime(.0001,start+.13);
    knock.connect(knockGain);knockGain.connect(master);knock.start(start);knock.stop(start+.15);
    const chime=audio.createOscillator(),chimeGain=audio.createGain();
    chime.type='sine';
    chime.frequency.setValueAtTime([523.25,659.25,783.99][step-1],start+.035);
    chimeGain.gain.setValueAtTime(.0001,start+.035);
    chimeGain.gain.exponentialRampToValueAtTime(step===3?.5:.34,start+.048);
    chimeGain.gain.exponentialRampToValueAtTime(.0001,start+(step===3?.42:.22));
    chime.connect(chimeGain);chimeGain.connect(master);chime.start(start+.035);chime.stop(start+(step===3?.45:.25));
  }
  function playCrystalRewardSound(){
    const audio=prepareGameAudio();
    if(!audio||audio.state==='closed')return;
    const start=audio.currentTime+.02,master=audio.createGain();
    master.gain.setValueAtTime(.0001,start);
    master.gain.exponentialRampToValueAtTime(.14,start+.025);
    master.gain.exponentialRampToValueAtTime(.0001,start+1.32);
    master.connect(audio.destination);
    [[659.25,0,.48],[783.99,.11,.5],[1046.5,.23,.68],[1318.51,.38,.76]].forEach(([frequency,delay,duration],index)=>{
      const oscillator=audio.createOscillator(),gain=audio.createGain();
      oscillator.type=index<2?'triangle':'sine';
      oscillator.frequency.setValueAtTime(frequency,start+delay);
      oscillator.frequency.exponentialRampToValueAtTime(frequency*1.018,start+delay+duration);
      gain.gain.setValueAtTime(.0001,start+delay);
      gain.gain.exponentialRampToValueAtTime(index===3?.4:.27,start+delay+.018);
      gain.gain.exponentialRampToValueAtTime(.0001,start+delay+duration);
      oscillator.connect(gain);gain.connect(master);oscillator.start(start+delay);oscillator.stop(start+delay+duration+.03);
    });
  }
  function modal(html,{closable=true}={}){if(page==='battle'&&run&&!run.done)pause();$('dialog-content').innerHTML=html;document.querySelector('.dialog-close').hidden=!closable;if(!$('dialog').open)$('dialog').showModal();}
  function closeDialog(){if($('dialog').open)$('dialog').close();}
  function title(kicker,name,desc){return `<div class="page-title"><div class="eyebrow">${kicker}</div><h1>${name}</h1><p>${desc}</p></div>`;}
  function unique(values){const seen=new Set();return values.map(v=>String(v).trim()).filter(v=>{const k=v.toLocaleLowerCase();if(!v||seen.has(k))return false;seen.add(k);return true;});}
  function selectedRecords(character=selectedCharacter){return records.filter(r=>!character||!r.character_id||r.character_id===character.id);}
  function solvedQuestionCount(record){
    const correct=Math.max(0,Number(record.correct)||0);
    return record.cleared?Math.max(correct,Number(record.total)||0):correct;
  }
  function stats(character=selectedCharacter){
    const rows=selectedRecords(character), answered=rows.reduce((n,r)=>n+solvedQuestionCount(r),0), correct=rows.reduce((n,r)=>n+Number(r.correct||0),0), clears=rows.filter(r=>r.cleared).length;
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
  function storyStageUnlocked(index){return index<=1||stageCleared(storyStages[index-1].key);}
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
        {id:1,code:'gale_boots',name:'질풍의 장화',category:'avatar',price:100,icon:'◆',description:'첫 모험을 오래 이어갈 수 있도록 체력을 높이는 기본 장화입니다.',slot:'feet',rarity:'normal',stars:1,stat_key:'hp',stat_value:12,art_path:'assets/items/equipment/item_gale_boots_normal.webp'},
        {id:2,code:'aura',name:'민트 기억 부적',category:'avatar',price:250,icon:'◆',description:'새 단어를 기억할 때마다 마력을 채워 주는 특별한 부적입니다.',slot:'aura',rarity:'special',stars:2,stat_key:'mp',stat_value:9,art_path:'assets/items/equipment/item_mint_memory_charm_special.webp'},
        {id:3,code:'cape',name:'용기의 망토',category:'avatar',price:450,icon:'◆',description:'수정 장식과 민트 안감이 모험가를 지켜 주는 희귀 망토입니다.',slot:'back',rarity:'rare',stars:3,stat_key:'def',stat_value:7,art_path:'assets/items/equipment/item_courage_cape_rare.webp'},
        {id:4,code:'guardian_armor',name:'수호자의 결정 갑옷',category:'avatar',price:500,icon:'◆',description:'맑은 은빛 판과 세 개의 수호 결정이 방어력을 높입니다.',slot:'body',rarity:'rare',stars:3,stat_key:'def',stat_value:11,art_path:'assets/items/equipment/item_guardian_crystal_armor_rare.webp'},
        {id:6,code:'dawn_blade',name:'새벽 결정검',category:'avatar',price:700,icon:'◆',description:'수정 날개와 공명환이 공격의 빛을 모으는 유니크 결정검입니다.',slot:'weapon',rarity:'unique',stars:4,stat_key:'atk',stat_value:16,art_path:'assets/items/equipment/item_dawn_crystal_sword_unique.webp'},
        {id:7,code:'wings',name:'하늘 결정 날개',category:'avatar',price:900,icon:'◆',description:'민트빛 핵으로 움직이는 유니크 등 장비입니다.',slot:'back',rarity:'unique',stars:4,stat_key:'luk',stat_value:6,art_path:'assets/items/equipment/item_sky_crystal_wings_unique.webp'},
        {id:8,code:'crown',name:'별빛 왕관',category:'avatar',price:1200,icon:'◆',description:'다섯 별의 축복으로 보물 발견의 행운을 높이는 왕관입니다.',slot:'head',rarity:'legendary',stars:5,stat_key:'luk',stat_value:8,art_path:'assets/items/equipment/item_starlight_crown_legendary.webp'},
        {id:9,code:'pet',name:'워드 크리스털 정령',category:'avatar',price:1500,icon:'◆',description:'배운 단어의 빛을 모아 행운을 가져오는 전설의 동행 정령입니다.',slot:'pet',rarity:'legendary',stars:5,stat_key:'luk',stat_value:12,art_path:'assets/items/equipment/item_word_crystal_sprite_legendary.webp'},
        {id:10,code:'ranger_violet_crystal_skin',name:'보랏빛 결정 궁수',category:'avatar',price:400,icon:'◆',description:'은보랏빛 트윈테일과 결정 장궁으로 모습을 바꾸는 여성 궁수 전용 스킨입니다.',slot:'skin',rarity:'unique',stars:4,stat_key:null,stat_value:0,art_path:'assets/avatars/skins/ranger-female-violet-crystal.webp'},
        {id:11,code:'pugilist_crystal_rose_skin',name:'크리스털 로즈 권투사',category:'avatar',price:400,icon:'◆',description:'장미빛 결정 건틀릿과 금장 전투복으로 모습을 바꾸는 여성 권투사 전용 스킨입니다. 전용 펀치와 피격 애니메이션이 적용됩니다.',slot:'skin',rarity:'legendary',stars:5,stat_key:null,stat_value:0,art_path:'assets/avatars/skins/pugilist-female-crystal-rose-profile-v3.webp'},
        {id:14,code:'pugilist_crystal_noir_skin',name:'크리스털 누아르 권투사',category:'avatar',price:400,icon:'◆',description:'검은 후드와 금빛 결정 건틀릿을 두른 남성 권투사 전용 스킨입니다. 전용 공격과 피격 애니메이션이 적용됩니다.',slot:'skin',rarity:'legendary',stars:5,stat_key:null,stat_value:0,art_path:'assets/avatars/skins/pugilist-male-crystal-noir-profile-complete-hood.png'},
        {id:12,code:'mage_arcane_necromancer_skin',name:'비전 네크로맨서',category:'avatar',price:400,icon:'◆',description:'해골 지팡이와 보랏빛 영혼불을 두른 남성 마법사 전용 스킨입니다. 전용 주문 공격과 피격/쓰러짐 애니메이션이 적용됩니다.',slot:'skin',rarity:'legendary',stars:5,stat_key:null,stat_value:0,art_path:'assets/avatars/skins/mage-male-arcane-necromancer-profile-v2.webp'},
        {id:13,code:'warrior_golden_radiance_skin',name:'황금빛 광휘의 검사',category:'avatar',price:400,icon:'◆',description:'황금 결정과 성광 대검을 든 남성 전사 전용 스킨입니다. 전용 대검 공격과 피격/쓰러짐 애니메이션이 적용됩니다.',slot:'skin',rarity:'legendary',stars:5,stat_key:null,stat_value:0,art_path:'assets/avatars/skins/warrior-male-golden-radiance.webp'},
        {id:5,code:'snack',name:'간식 1개',category:'gift',price:60,icon:'🍪',description:'보호자 승인 후 받을 수 있어요.',rarity:'special',stars:2}
      ];records=demoState.records;storySkillIcons=[
        {code:'guardian_crystal',label:'수호 결정',icon_key:'shield',gem_color:'#e4e1ff',glow_color:'#c9c4ff',icon_color:'#5751D8'},
        {code:'time_crystal',label:'시간 결정',icon_key:'hourglass',gem_color:'#d9f8f2',glow_color:'#a5e5dc',icon_color:'#2d958b'},
        {code:'combo_crystal',label:'콤보 결정',icon_key:'combo',gem_color:'#e4e1ff',glow_color:'#c9c4ff',icon_color:'#5751D8'},
        {code:'fortune_crystal',label:'행운 결정',icon_key:'arrow',gem_color:'#d9f8f2',glow_color:'#a5e5dc',icon_color:'#2d958b'}
      ];storySkillDefinitions=[
        {class_code:'warrior',skill_code:'guardian_time',skill_name:'수호의 시간',description:'문제마다 40% 확률로 제한시간을 5초 늘려요.',icon_code:'guardian_crystal'},
        {class_code:'mage',skill_code:'time_stop',skill_name:'타임 스톱',description:'문제마다 30% 확률로 타이머를 1.5초 멈춰요.',icon_code:'time_crystal'},
        {class_code:'pugilist',skill_code:'rush_combo',skill_name:'러시 콤보',description:'3연속 정답마다 보너스 크리스털을 받아요.',icon_code:'combo_crystal'},
        {class_code:'ranger',skill_code:'lucky_arrow',skill_name:'행운의 화살',description:'보물상자에서 최소 20 크리스털을 찾아요.',icon_code:'fortune_crystal'}
      ];dbOnline=true;
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
        try{[storySkillIcons,storySkillDefinitions]=await Promise.all([
          apiGet('story_skill_icons?select=code,label,icon_key,asset_path,gem_color,glow_color,icon_color&active=eq.true&order=code.asc'),
          apiGet('story_skill_definitions?select=class_code,skill_code,skill_name,description,icon_code&active=eq.true&order=class_code.asc')
        ]);}catch(error){storySkillIcons=[];storySkillDefinitions=[];console.warn('Story skill icon catalog unavailable; using built-in defaults.',error);}
        if(accountMode){const tickets=await apiGet(`character_creation_tickets?select=id&owner_user_id=eq.${accountUserId}&consumed_by_character_id=is.null`);availableCharacterTickets=tickets.length;}
      } catch(error){console.error(error);dbOnline=false;allCharacters=[];shopItems=[];records=[];storySkillIcons=[];storySkillDefinitions=[];}
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
    try{const cutoff=new Date(Date.now()-30*24*60*60*1000).toISOString();const [owned,pending,completed]=await Promise.all([
      apiGet(`character_inventory?select=item_id,character_id&character_id=eq.${selectedCharacter.id}`),
      apiGet(`reward_redemptions?select=id,item_id,status,price_paid,created_at,fulfilled_at&character_id=eq.${selectedCharacter.id}&status=in.(pending,approved)&order=created_at.desc`),
      apiGet(`reward_redemptions?select=id,item_id,status,price_paid,created_at,fulfilled_at&character_id=eq.${selectedCharacter.id}&status=eq.fulfilled&fulfilled_at=gte.${cutoff}&order=fulfilled_at.desc`)
    ]);inventory=owned;redemptions=[...pending,...completed];}catch(error){console.error(error);inventory=[];redemptions=[];}
  }
  function setConnection(){$('connection-status').textContent=demo?'체험 모드 · 이 브라우저에 저장됩니다':dbOnline?(useLocalDb?'● 로컬 Supabase 연결됨':'● Supabase 연결됨'):'데이터베이스 연결 실패 · 로컬 Supabase를 실행하거나 ?demo=1을 사용하세요';$('connection-status').classList.toggle('connection-error',!dbOnline);}
  async function refresh(){await loadAll();render();}

  let storyDialogueIndex = 0;
  const storyIntroLines = [
    {speaker:'소서리스',className:'mage',text:'이 책들을 언제 다 치워! 네가 다 어질러 놨잖아.'},
    {speaker:'파이터',className:'fighter',text:'미… 미안…'},
    {speaker:'내레이션',className:'scene',text:'소서리스가 마법을 펼치자 어질러진 책들이 순식간에 정리되었다. 그때, 책 더미 사이에서 낡은 고대 문서 하나가 툭 떨어졌다.'},
    {speaker:'내레이션',className:'scene',text:'소서리스가 문서를 집어 들었다. 마법 도서관을 관리하는 그녀조차 이런 문서는 처음 보았다.'},
    {speaker:'바이올렛',className:'ranger',text:'뭘 그렇게 열심히 봐? (기웃거리며)'},
    {speaker:'소서리스',className:'mage',text:'고대 문서야. 내 마법 도서관에도 이런 건 처음이야…'},
    {speaker:'내레이션',className:'scene',text:'소서리스가 문서를 펼치는 순간, 도서관이 크게 흔들리며 무너져 내렸다. 문서 틈에서 정체를 알 수 없는 팔 하나가 튀어나왔다!'},
    {speaker:'파이터',className:'fighter',text:'이게 뭐야! 에너지 볼!'},
    {speaker:'내레이션',className:'scene',text:'파이터가 에너지 볼을 날렸지만, 공격은 튕겨 나가고 말았다.'},
    {speaker:'???',className:'demon',text:'(문서 밖으로 완전히 빠져나와 악마의 형상을 갖춘다)'},
    {speaker:'소서리스',className:'mage',text:'막아!'},
    {speaker:'바이올렛',className:'ranger',text:'라이트닝 애로우!'},
    {speaker:'내레이션',className:'scene',text:'번개 화살이 악마에게 닿기도 전에 튕겨 나갔다.'},
    {speaker:'소서리스',className:'mage',text:'메테오!'},
    {speaker:'내레이션',className:'scene',text:'하늘에서 거대한 운석이 떨어졌지만, 악마는 가볍게 막아 내고 모두를 날려 버렸다.'},
    {speaker:'소서리스',className:'mage',text:'봉… 봉인…!'},
    {speaker:'???',className:'demon',text:'이 세상을 나처럼 만들어 주겠다!'},
    {speaker:'내레이션',className:'scene',text:'악마는 소서리스의 마력과 파이터의 힘, 바이올렛의 무기를 빼앗고 어둠 속으로 날아갔다.'},
    {speaker:'소서리스',className:'mage',text:'내 마력이…'},
    {speaker:'파이터',className:'fighter',text:'내 힘이…'},
    {speaker:'바이올렛',className:'ranger',text:'내 무기도…'},
    {speaker:'내레이션',className:'scene',text:'모든 것이 뒤집혔다. 악마를 물리치기 위한 세 사람의 모험이 시작된다.'},
    {speaker:'소서리스',className:'mage',text:'일단 대마법 도서관에서 쓸 만한 주문이나 남아 있는 마력, 무기를 찾아보자.'},
    {speaker:'파이터',className:'fighter',text:'제길! 내 힘! (땅을 친다)'},
    {speaker:'바이올렛',className:'ranger',text:'내 무기도 없어졌어. (뾰루퉁한 표정)'},
    {speaker:'소서리스',className:'mage',text:'그렇게 있어 봐야 나아질 건 없어. 따라와!'},
    {speaker:'내레이션',className:'scene',text:'대마법 도서관으로 향하는 길목을 슬라임들이 막아섰다.'},
    {speaker:'모두',className:'party',text:'일단 얘네부터 물리쳐야겠어!'}
  ];
  const storyEpilogueLines = [
    {speaker:'소서리스',className:'mage',text:'좋아! 슬라임을 모두 물리쳤어. 우리 모두 크리스털 200개를 받았어. 이걸로 아이템을 사자!'},
    {speaker:'일행',className:'party',text:'좋아!'},
    {speaker:'내레이션',className:'scene',text:'아이템 상점을 향해 숲길을 걷던 그때, 누군가 일행을 불러 세웠다.'},
    {speaker:'아서',className:'warrior',text:'얘들아, 뭐 해?'},
    {speaker:'바이올렛',className:'ranger',text:'마침 잘됐다! 무기 좀 빌려줘. 내 무기를 빼앗겼어.'},
    {speaker:'아서',className:'warrior',text:'얼마나 필요한데?'},
    {speaker:'바이올렛',className:'ranger',text:'크리스털 10,000개…'},
    {speaker:'아서',className:'warrior',text:'그건 너무 많은데. 안 돼!'},
    {speaker:'소서리스',className:'mage',text:'그럼 우리 원정에 함께하지 않을래?'},
    {speaker:'아서',className:'warrior',text:'좋아. 나도 같이 갈게!'},
    {speaker:'내레이션',className:'scene',text:'아서가 일행에 합류했다. 이제 모험가를 자유롭게 바꿔 가며 전투에 도전할 수 있다. 합류 보상으로 크리스털 200개를 더 받았다.'},
    {speaker:'소서리스',className:'mage',text:'좋았어! 이제 네크로맨서로 전직하자!'}
  ];
  function renderStoryScene(lines,location,finalLabel){
    const line=lines[storyDialogueIndex], end=storyDialogueIndex===lines.length-1;
    const classKey=line.className==='party'||line.className==='fighter'?'pugilist':line.className==='scene'||line.className==='demon'?'mage':line.className;
    const variant=classKey==='mage'?'male':classKey==='ranger'?'female':classKey==='fighter'?'male':classKey==='warrior'?'male':'female';
    const speakerArt=line.className==='scene'||line.className==='demon'?'':`<img class="story-vn-character ${line.className}" src="${esc(deployedAssetUrl(`assets/avatars/${classDefs[classKey].paths[variant]}?v=20260917-skins`))}" alt="${esc(line.speaker)}">`;
    return `<section class="story-vn" data-action="story-dialogue-next" tabindex="0" aria-label="스토리 대화, 눌러서 계속"><div class="story-vn-scene ${page==='storyIntro'?'library-scene':'forest-scene'}"><span class="story-vn-orb" aria-hidden="true">◆</span><span class="story-vn-forest">${location}</span>${speakerArt}</div><div class="story-vn-dialogue"><span class="story-vn-speaker ${line.className}">${line.speaker}</span><p>${esc(line.text)}</p><span class="story-vn-progress">${storyDialogueIndex+1} / ${lines.length} <b>${end?finalLabel:'계속 →'}</b></span></div><button class="story-vn-skip" data-action="story-dialogue-skip">대화 건너뛰기</button></section>`;
  }
  const renderStoryIntro=()=>renderStoryScene(storyIntroLines,'대마법 도서관 · 프롤로그','전투 시작 →');
  const renderStoryEpilogue=()=>renderStoryScene(storyEpilogueLines,'속삭이는 숲 · 에필로그','결과 확인 →');

  function render(){
    const previousHeroTransforms=new Map();
    const previousStoryHero=$('screen').querySelector('.story-map-hero')?.getBoundingClientRect()||null;
    if(page==='characters')document.querySelectorAll('.select-hero-card[data-id]').forEach(card=>previousHeroTransforms.set(card.dataset.id,getComputedStyle(card).transform));
    document.body.dataset.screen=page;
    document.body.dataset.resultStep=page==='result'&&run?.clear?(run.resultStep||'summary'):'';
    const contextAction=page==='characters'||page==='dungeon'||page==='story'
      ? ''
      : page==='survival'
      ? `<a class="world-create-link" href="${creatorHref()}" aria-label="월드 만들기" title="월드 만들기">${icon('worldAdd')}</a>`
      : `<button class="balance" data-action="wallet" aria-label="계정 크리스털 지갑">◆ <span id="balance">${selectedCharacter||accountMode?num(walletBalance()):'—'}</span></button>`;
    $('topbar-action').innerHTML=`${contextAction}<button class="profile-button" data-action="profile" aria-label="내 프로필과 계정 설정" title="내 프로필">${icon('profile')}<i aria-hidden="true"></i></button>`;
    const active=['survival','story','stages','battle','result'].includes(page)?'dungeon':page;
    const nav=$('nav');
    nav.hidden=page==='battle'||page==='characters'||page==='storyIntro'||page==='storyEpilogue';
    nav.innerHTML=[['home','홈'],['dungeon','모험'],['gear','장비'],['shop','상점']].map(([id,label])=>`<button data-action="nav" data-page="${id}" ${active===id?'aria-current="page"':''}>${icon(id)}<span>${label}</span></button>`).join('');
    const renderer={characters:renderCharacterGate,home:renderHome,gear:renderGear,shop:renderShop,dungeon:renderDungeon,survival:renderSurvival,story:renderStory,storyIntro:renderStoryIntro,storyEpilogue:renderStoryEpilogue,stages:renderStages,battle:renderBattle,result:renderResult}[page]||renderHome;
    $('screen').innerHTML=renderer();
    const storyHero=$('screen').querySelector('.story-map-hero');
    if(storyHero&&previousStoryHero&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      const nextRect=storyHero.getBoundingClientRect();
      storyHero.style.setProperty('--map-dx',`${previousStoryHero.left+previousStoryHero.width/2-nextRect.left-nextRect.width/2}px`);
      storyHero.style.setProperty('--map-dy',`${previousStoryHero.top+previousStoryHero.height/2-nextRect.top-nextRect.height/2}px`);
      storyHero.style.transition='none';storyHero.getBoundingClientRect();
      requestAnimationFrame(()=>{storyHero.style.transition='';storyHero.style.setProperty('--map-dx','0px');storyHero.style.setProperty('--map-dy','0px');});
    }
    if(page==='characters'&&previousHeroTransforms.size&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      $('screen').querySelectorAll('.select-hero-card[data-id]').forEach(card=>{
        const previous=previousHeroTransforms.get(card.dataset.id);
        if(!previous)return;
        const next=getComputedStyle(card).transform;
        if(previous===next)return;
        card.animate([{transform:previous},{transform:next}],{duration:560,easing:'cubic-bezier(.2,.78,.22,1)'});
      });
    }
    if(page==='battle'&&run?.story){run.mobs.forEach(mob=>{mob.element=$('arena')?.querySelector(`[data-mob-id="${mob.id}"]`)||null;});}
    syncBGM(page);
  }
  function go(target){if(target==='characters'){characterArmedId=null;characterPreviewId=selectedCharacter?.id||null;}page=target;render();$('screen').focus({preventScroll:true});$('screen').scrollTo({top:0,behavior:'instant'});window.scrollTo({top:0,behavior:'instant'});}
  function navigate(target){if(page==='battle'&&run&&!run.done){pause();modal(`<div class="eyebrow">PAUSED</div><h2>이번 도전을 마칠까요?</h2><p>지금까지 맞힌 문제의 보상과 기록은 저장됩니다.</p><div class="actions"><button class="secondary" data-action="resume">계속하기</button><button class="primary" data-action="leave" data-page="${target}">저장하고 이동</button></div>`);return;}go(target);}
  function profileBar(){if(accountMode)return '';return `<div class="profile-switch">${players.map(name=>`<button class="profile-chip ${name===player?'active':''}" data-action="player" data-player="${esc(name)}">${esc(name)}</button>`).join('')}<button class="profile-chip add" data-action="add-player">＋ 유저</button></div>`;}
  function classStatsMarkup(d){return `<div class="class-stat-grid" aria-label="${esc(d.label)} 기본 능력치">${Object.entries({hp:'체력',atk:'공격',def:'방어',luk:'행운'}).map(([key,label])=>`<span><small>${label}</small><i>${'<b></b>'.repeat(d.stats[key])}</i></span>`).join('')}</div>`;}
  function characterSelectMarkup(){
    const previewCharacter=characters.find(c=>c.id===characterPreviewId)||selectedCharacter;
    const selectedIndex=Math.max(0,characters.findIndex(c=>c.id===previewCharacter?.id));
    const relative=index=>{let value=index-selectedIndex;if(value>characters.length/2)value-=characters.length;if(value<-characters.length/2)value+=characters.length;return value;};
    const cards=characters.map((c,index)=>{const d=characterDef(c),slot=relative(index),distance=Math.abs(slot),active=c.id===characterArmedId,visible=distance<=2;return `<button class="select-hero-card ${active?'active':''} ${visible?'':'out-of-view'}" style="--slot:${slot};--distance:${distance};--depth:${10-distance}" data-action="select-character" data-id="${c.id}" aria-pressed="${active}" aria-label="${esc(c.name)} ${active?'선택됨':'선택'}"><span class="select-card-face"><img src="${imagePath(c)}" alt=""><span class="select-card-copy"><small>LV.${stats(c).level} · ${esc(d.label)}</small><b>${esc(c.name)}</b></span>${active?'<i><span aria-hidden="true">✓</span> 선택됨</i>':''}</span></button>`;}).join('');
    const d=characterDef(previewCharacter),s=stats(previewCharacter),armed=characterArmedId===previewCharacter?.id;
    const pages=characters.map((c,index)=>`<button class="character-page-dot ${index===selectedIndex?'current':''}" data-action="character-page" data-index="${index}" aria-label="${index+1}번 ${esc(c.name)} 카드로 이동" aria-current="${index===selectedIndex?'true':'false'}"></button>`).join('');
    return `<section class="character-select" data-view="stage"><div class="character-card-stage" tabindex="0" aria-label="보유 캐릭터 소환 무대. 좌우로 밀거나 방향키로 캐릭터를 둘러보세요"><div class="character-card-orbit">${cards}</div><div class="character-stage-glow" aria-hidden="true"></div><nav class="character-carousel-nav" aria-label="캐릭터 카드 이동"><button data-action="character-step" data-direction="-1" aria-label="이전 캐릭터" ${characters.length<2?'disabled':''}>‹</button><div class="character-page-dots">${pages}</div><button data-action="character-step" data-direction="1" aria-label="다음 캐릭터" ${characters.length<2?'disabled':''}>›</button></nav></div><article class="selected-hero-detail"><div class="selected-hero-title"><span class="level">LV.${s.level}</span><div><small>${esc(d.title)} · ${esc(d.label)}</small><h2>${esc(previewCharacter.name)}</h2></div><b>${armed?'한 번 더 눌러 시작':'카드 선택 대기'}</b></div><div class="selected-hero-skill">${previewCharacter.class==='warrior'?'<img src="assets/ui/skills/passive-warrior-shield.webp" alt="수호의 방패 아이콘">':previewCharacter.class==='mage'?'<img src="assets/ui/skills/passive-mage-time-stop.webp" alt="타임 스톱 아이콘">':previewCharacter.class==='pugilist'?'<img src="assets/ui/skills/passive-pugilist-crystal-bonus.webp" alt="크리스털 가방 아이콘">':previewCharacter.class==='ranger'?'<img src="assets/ui/skills/passive-ranger-fortune-arrow.webp" alt="행운의 화살 아이콘">':'<span aria-hidden="true">✦</span>'}<div><small>PASSIVE SKILL · ${esc(d.skill)}</small><strong>${esc(d.skillDesc)}</strong></div></div>${classStatsMarkup(d)}</article></section>`;
  }
  function characterCreatorMarkup(){
    const d=classDefs[newClass],first=characters.length===0;
    return `<section class="character-create-panel"><div class="creation-step"><span>${first?'첫 모험가 · 무료':'캐릭터 추가권 사용'}</span><b>${first?'나만의 영웅을 만들어 보세요':`보유 추가권 ${availableCharacterTickets}장`}</b></div><label class="form-label" for="character-name">캐릭터 이름 <small>로그인 아이디와 달라도 괜찮아요</small></label><input id="character-name" class="field character-name-field" maxlength="16" value="${esc(newCharacterName)}" autocomplete="off" placeholder="예: 별빛루나"><label class="form-label">직업과 패시브 스킬</label><div class="class-tabs">${Object.entries(classDefs).map(([id,c])=>`<button class="${id===newClass?'active':''}" data-action="class" data-value="${id}" aria-pressed="${id===newClass}">${c.label}</button>`).join('')}</div><article class="class-preview"><div class="class-preview-art"><img src="assets/avatars/${d.paths[newVariant]}?v=20260917-skins" alt="${esc(d.label)} ${newVariant==='female'?'여성':'남성'} 캐릭터"></div><div class="class-preview-copy"><span>${esc(d.title)}</span><h2>${esc(d.label)}</h2><p>${esc(d.trait)}</p><div class="skill-callout"><b>✦ ${esc(d.skill)}</b><small>${esc(d.skillDesc)}</small></div>${classStatsMarkup(d)}</div></article><label class="form-label">기본 외형</label><div class="variant-switch">${['male','female'].map(v=>`<button class="${v===newVariant?'active':''}" data-action="variant" data-value="${v}" aria-pressed="${v===newVariant}">${v==='male'?'남성':'여성'} 외형</button>`).join('')}</div><label class="form-label">오라 색상</label><div class="accent-row">${['violet','red','blue','green','gold'].map(v=>`<button class="accent-choice ${v===newAccent?'active':''}" data-action="accent" data-value="${v}" aria-label="${v}"></button>`).join('')}</div><div class="character-create-actions">${characters.length?'<button class="secondary" data-action="cancel-character-create">목록으로</button>':''}<button class="primary" data-action="create-character">${first?'첫 캐릭터 만들기':'추가권으로 캐릭터 만들기'} →</button></div></section>`;
  }
  function renderCharacterGate(){
    const creating=characterCreating||!characters.length;
    const loginLabel=accountProfile?.login_id||player;
    if(creating)return `<section class="character-gate"><header class="character-gate-heading"><div><span class="eyebrow">CREATE YOUR HERO</span><h1>${characters.length?'새 모험가 합류':'모험을 함께할 영웅을 만드세요'}</h1><p><b>@${esc(loginLabel)}</b> 계정에 저장됩니다. 캐릭터 이름은 로그인 아이디와 별개예요.</p></div><span class="gate-crystal" title="계정 공용 크리스털">◆ ${num(walletBalance())}</span></header>${characterCreatorMarkup()}</section>`;
    return `<section class="character-gate"><header class="character-gate-heading character-choice-heading"><div><span class="eyebrow">CHOOSE YOUR HERO</span></div><button class="character-add-button" data-action="open-character-create" aria-label="캐릭터 추가" title="캐릭터 추가">＋</button></header>${characterSelectMarkup()}</section>`;
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
    if(item?.code==='pugilist_crystal_noir_skin')return c?.class==='pugilist'&&variantOf(c)==='male';
    if(item?.code==='mage_arcane_necromancer_skin')return c?.class==='mage'&&variantOf(c)==='male';
    if(item?.code==='warrior_golden_radiance_skin')return c?.class==='warrior'&&variantOf(c)==='male';
    if(item?.code==='warrior_female_golden_radiance_skin')return c?.class==='warrior'&&variantOf(c)==='female';
    return !isSkin(item);
  }
  function skinRequirement(item){if(item?.code==='pugilist_crystal_rose_skin')return '여성 권투사 전용';if(item?.code==='pugilist_crystal_noir_skin')return '남성 권투사 전용';if(item?.code==='mage_arcane_necromancer_skin')return '남성 마법사 전용';if(item?.code==='warrior_golden_radiance_skin')return '남성 전사 전용';if(item?.code==='warrior_female_golden_radiance_skin')return '여성 전사 전용';return '여성 궁수 전용';}
  function renderItemCard(item,ownedView=false){const owned=itemOwned(item),eq=Object.values(equippedMap()).some(id=>String(id)===String(item.id)),gear=item.category==='avatar',skin=isSkin(item),rarity=displayRarity(item);return `<button class="item" data-action="item" data-id="${item.id}" data-rarity="${rarity}"><span class="item-rarity">${rarityNames[rarity]}</span>${ownedView?`<span class="item-status">${eq?'장착 중':'보유'}</span>`:''}<span class="item-art">${itemArt(item)}</span><b>${esc(item.name)}</b>${gear?`<span class="item-stat">${skin?`${skinRequirement(item)} 스킨`:`${esc(String(item.stat_key||'').toUpperCase())} +${num(item.stat_value)}`}</span>`:''}<small class="${owned?'owned':''}">${owned?(eq?'✓ 장착 중':'✓ 보유 중'):`${num(item.price)} ◆`}</small></button>`;}
  function renderGear(){
    if(!selectedCharacter)return noCharacter('장비를 사용하려면 모험가가 필요해요.');
    const s=stats(),eq=equippedMap(),d=characterDef(selectedCharacter),cs=combatStats(s.level);
    const slotButton=(slot,label,art)=>{const item=itemById(eq[slot]),rarity=item?displayRarity(item):null;return `<button class="gear-status-slot ${item?'equipped':'empty'} ${item?`rarity-${rarity}`:''}" data-action="slot" data-slot="${slot}" aria-label="${label}${item?` ${rarityNames[rarity]} ${item.name} 장착 중`:' 비어 있음'}" title="${label}"><span>${icon(art)}</span></button>`;};
    const stat=(label,value,bonus='')=>`<div class="gear-stat"><span>${label}</span><strong>${value}</strong>${bonus?`<small>+${bonus}</small>`:''}</div>`;
    return `<div class="gear-page-title"><div><span>MY ADVENTURER</span><h1>장비와 상태</h1></div><button class="text-btn" data-action="characters">캐릭터 변경 ›</button></div><section class="gear-status-hero"><div class="gear-identity"><span class="level">LV.${s.level}</span><p>${d.title}</p><h2>${esc(selectedCharacter.name)}</h2><small>${d.label} · ${esc(d.trait.split(' · ')[0])}</small></div><div class="gear-stat-rail">${stat('HP',cs.hp,cs.bonus.hp)}${stat('MP',cs.mp,cs.bonus.mp)}${stat('ATK',cs.atk,cs.bonus.atk)}${stat('DEF',cs.def,cs.bonus.def)}${stat('LUK',cs.luk,cs.bonus.luk)}</div><div class="gear-character">${portrait()}<span>전투력 <b>${num(cs.power)}</b></span></div><div class="gear-slot-rail">${slotButton('head','머리','crown')}${slotButton('body','몸','armor')}${slotButton('weapon','무기','sword')}${slotButton('feet','신발','boots')}${slotButton('back','등','cape')}${slotButton('aura','오라','aura')}${slotButton('skin','스킨','profile')}${slotButton('pet','펫','pet')}</div></section><button class="panel gear-growth" data-action="stats"><span class="row small"><span>경험치</span><b>${num(s.exp)} / 1,000 EXP</b></span><span class="xp"><i style="width:${s.exp/10}%"></i></span></button><div class="section-title gear-collection-title"><span class="eyebrow">COLLECTION</span><button class="text-btn" data-action="nav" data-page="shop">상점 가기 ›</button></div>${inventory.length?`<div class="items catalog gear-inventory-grid">${shopItems.filter(itemOwned).map(i=>renderItemCard(i,true)).join('')}</div>`:'<div class="panel empty-state">아직 수집한 장비가 없어요.<br><button class="text-btn" data-action="nav" data-page="shop">상점에서 첫 장비 만나기 →</button></div>'}`;
  }
  function renderShop(){
    if(!selectedCharacter)return noCharacter('상점을 이용하려면 모험가가 필요해요.');
    const visible=shopItems.filter(item=>shopCategory(item)===filter);
    return `<div class="tabs" aria-label="상점 카테고리">${[['item','아이템'],['skin','스킨'],['reward','보상']].map(([key,label])=>`<button data-action="filter" data-filter="${key}" class="${filter===key?'active':''}" aria-pressed="${filter===key}">${label}</button>`).join('')}</div><div class="items catalog">${visible.map(item=>renderItemCard(item)).join('')||'<div class="empty-state">이 카테고리에 판매 중인 상품이 없어요.</div>'}</div><button class="secondary" style="width:100%;margin-top:15px" data-action="requests">보상 신청 내역 (${redemptions.filter(r=>r.status==='pending'||r.status==='approved').length}) →</button>`;
  }
  function noCharacter(message){return `${title('CHOOSE YOUR HERO','모험가가 필요해요',message)}<button class="primary" data-action="new-character" ${!dbOnline&&!demo?'disabled':''}>캐릭터 만들기 →</button>`;}
  function isAdministrator(){return Boolean(accountMode&&accountProfile?.role==='admin');}
  function renderDungeon(){const storyCard=`<button class="mode-card mode-card-story" data-action="mode-select" data-mode="story"><img src="${esc(deployedAssetUrl('assets/ui/crystal-quest/modes/mode-story-card.webp'))}" alt="" loading="lazy"><span class="mode-card-shade"></span><span class="mode-card-copy"><span class="mode-kicker">STORY MODE</span><b>스토리 모드</b><small>이야기를 따라가며<br>잃어버린 단어 크리스털을 찾아요.</small><i>이야기 보기 <span>→</span></i></span></button>`;return `<div class="page-title mode-heading"><div class="eyebrow">WORDORIA ADVENTURE</div><h1>어떤 모험을 떠날까요?</h1><p>원하는 방식으로 단어 크리스털을 모아 보세요.</p></div><section class="mode-select" aria-label="게임 모드 선택"><button class="mode-card mode-card-survival" data-action="mode-select" data-mode="survival"><img src="${esc(deployedAssetUrl('assets/ui/crystal-quest/modes/mode-survival-card.webp'))}" alt="" fetchpriority="high"><span class="mode-card-shade"></span><span class="mode-card-copy"><span class="mode-kicker">SURVIVAL MODE</span><b>서바이벌 모드</b><small>제한시간 안에 정답을 맞히고<br>끝없이 이어지는 모험에 도전해요.</small><i>월드 선택 <span>→</span></i></span></button>${storyCard}</section>${creatorContentError?`<div class="notice db-warning">${esc(creatorContentError)}</div>`:''}<button class="secondary mode-records" data-action="records">모험 기록 보기</button>`;}
  function renderSurvival(){return `<button class="text-btn mode-back" data-action="nav" data-page="dungeon">← 모드 선택</button><div class="page-title"><div class="eyebrow">SURVIVAL MODE</div><h1>월드를 선택하세요</h1></div><label class="world-search"><span class="world-search-icon" aria-hidden="true">⌕</span><input id="world-search" type="search" autocomplete="off" maxlength="60" placeholder="월드 이름 또는 4자리 고유키 검색" aria-label="월드 이름 또는 고유키 검색"></label><div id="world-list">${worlds.map((w,i)=>{const count=w.keys.filter(stageCleared).length,search=`${w.name} ${w.code}`.toLocaleLowerCase();return `<button class="dungeon-card${w.creator?' creator-world':''}" data-action="world" data-index="${i}" data-world-search="${esc(search)}"><span class="island">${icon('island')}</span><span class="eyebrow world-code" style="color:var(--violet)">WORLD ${esc(w.code)}</span><h2>${esc(w.name)}</h2><p>${esc(w.sub)}</p><span class="row small"><span class="badge">${w.keys.length} MAPS · ${count} CLEAR</span><span>맵 보기 →</span></span></button>`;}).join('')}</div><div id="world-empty" class="panel empty-state" hidden>검색 조건과 일치하는 월드가 없어요.</div>${creatorContentError?`<div class="notice db-warning">${esc(creatorContentError)}</div>`:''}<button class="secondary" style="width:100%" data-action="records">모험 기록 보기</button>`;}
  function renderStory(){
    let nextIndex=storyStages.findIndex((stage,index)=>!stageCleared(stage.key)&&storyStageUnlocked(index));
    if(nextIndex<0)nextIndex=storyStages.length-1;
    const selectedIndex=storyStages.findIndex(stage=>stage.key===selectedStoryStage);
    if(selectedIndex<0||!storyStageUnlocked(selectedIndex))selectedStoryStage=storyStages[nextIndex].key;
    const selected=storyStages.find(stage=>stage.key===selectedStoryStage)||storyStages[nextIndex];
    const mapPositions=[['34%','41%'],['42%','50%'],['60%','62%'],['69%','50%'],['88%','36%'],['78%','24%'],['83%','6%']];
    const selectedPosition=mapPositions[storyStages.indexOf(selected)];
    const activeCharacter=`<span class="story-map-hero" style="--story-x:${selectedPosition[0]};--story-y:${selectedPosition[1]}" aria-hidden="true">${battleHeroMarkup()}${stageCleared(selected.key)?'<span class="story-map-hero-check">✓</span>':''}</span>`;
    const nodes=storyStages.map((stage,index)=>{
      const clear=stageCleared(stage.key),unlocked=storyStageUnlocked(index),active=selected.key===stage.key,position=mapPositions[index];
      const cls=`story-map-node story-map-node-${stage.number} ${clear?'cleared':unlocked?'active':'locked'}${active?' selected':''}`;
      const number=`<span class="story-map-node-number">${stage.number}</span>`,check=clear?'<span class="story-map-node-check" aria-hidden="true">✓</span>':'';
      if(!unlocked)return `<span class="${cls}" style="--story-x:${position[0]};--story-y:${position[1]}" aria-label="스테이지 ${stage.number} 잠김">${number}${check}</span>`;
      return `<button type="button" class="${cls}" style="--story-x:${position[0]};--story-y:${position[1]}" data-action="story-stage-select" data-stage="${stage.key}" aria-label="스테이지 ${stage.number}${clear?' 클리어, 다시 도전 가능':' 도전 가능'}">${number}${check}</button>`;
    }).join('');
    return `<button class="text-btn mode-back" data-action="nav" data-page="dungeon">← 모드 선택</button><div class="page-title story-map-heading"><div class="eyebrow">STORY MODE · CHAPTER 1</div><h1>속삭이는 숲</h1></div><section class="story-world-map" aria-label="속삭이는 숲 스테이지 지도"><img class="story-world-map-art" src="${esc(deployedAssetUrl('assets/story/chapter-1-library-map.webp'))}" alt="별빛 도서관과 숲길을 잇는 크리스털 스테이지 지도"><span class="story-map-region">WHISPERING WOODS</span><span class="story-map-label story-map-label-library">별빛 도서관</span>${nodes}${activeCharacter}</section>`;
  }
  function confirmStoryStage(stageKey){
    const index=storyStages.findIndex(stage=>stage.key===stageKey),stage=storyStages[index];
    if(!stage||!storyStageUnlocked(index))return;
    selectedStoryStage=stage.key;render();
    modal(`<div class="eyebrow">STAGE ${String(stage.number).padStart(2,'0')}</div><h2>${esc(stage.name)}에 입장할까요?</h2><p>${esc(stage.desc)}</p><div class="actions story-enter-actions"><button type="button" class="primary" data-action="story-enter-confirm" data-stage="${stage.key}">예</button><button type="button" class="secondary" data-action="story-enter-cancel">아니오</button></div>`);
  }
  function startStoryStage(stageKey){
    const index=storyStages.findIndex(stage=>stage.key===stageKey),stage=storyStages[index];
    if(!stage||!storyStageUnlocked(index))return;
    selectedStoryStage=stage.key;selectedStage=stage.key;closeDialog();
    if(stage.intro){storyDialogueIndex=0;go('storyIntro');return;}
    startBattle();
  }
  function renderStages(){const w=worlds[worldIndex]||worlds[0];return `<button class="text-btn" data-action="nav" data-page="survival">← 월드 목록</button>${title(`WORLD ${w.code}`,w.name,'도전할 맵을 선택하세요. 마지막에는 보물상자가 기다려요.')}<div class="stage-list">${w.keys.map((key,i)=>{const s=stages[key];return `<button class="stage-btn" data-action="stage" data-stage="${key}"><span class="stage-no">${String(i+1).padStart(2,'0')}</span><span><b>${esc(s.name)}</b><small>${esc(s.desc||`${s.words.length}문제`)}${s.creator?` · ${s.questionCount}문제`:''} · 5초 서바이벌</small>${stageCleared(key)?'<span class="stage-status">✓ CLEAR</span>':''}</span><span>→</span></button>`;}).join('')}</div><div class="notice">정답 +1 ◆ · 콤보 보너스 · 클리어 +10 ◆<br>맵은 횟수 제한 없이 다시 도전할 수 있어요.</div>`;}

  function posMatch(a,b){return a[1]===b[1]||a[1].includes(b[1])||b[1].includes(a[1]);}
  function formScore(a,b){let score=Math.max(0,5-Math.abs(a[0].length-b[0].length));if(a[0][0]===b[0][0])score+=3;if(a[1]===b[1])score+=6;else if(posMatch(a,b))score+=4;return score+Math.random()*2;}
  function makeQuestion(entry,pool,mode){const choices=pool.filter(x=>x[0]!==entry[0]).sort((a,b)=>formScore(entry,b)-formScore(entry,a)).slice(0,8);const enKo=mode==='en-ko',answer=enKo?`[${entry[1]}] ${entry[2]}`:entry[0];return {entry,mode,prompt:enKo?entry[0]:`[${entry[1]}] ${entry[2]}`,answer,choices:shuffle([answer,...shuffle(choices).slice(0,3).map(x=>enKo?`[${x[1]}] ${x[2]}`:x[0])])};}
  function questionDuration(){const cls=selectedCharacter?.class;let duration=5000,freezeDuration=0,skill='',skillKind='';if(cls==='warrior'&&Math.random()<.4){duration=10000;skill='수호의 시간 · +5초';skillKind='warrior';}else if(cls==='mage'&&Math.random()<.3){freezeDuration=1500;skill='타임 스톱 · 1.5초';skillKind='mage';}return {duration,freezeDuration,skill,skillKind};}
  function activatePassive(){const timing=questionDuration();run.skill=timing.skill;run.skillKind=timing.skillKind;run.freezeRemaining=timing.freezeDuration;if(run.story){if(timing.skillKind==='warrior')run.storyTimeLimit+=5000;}else{run.remaining=timing.duration;run.maxTime=timing.duration;}}
  function removeBattleReward(){document.querySelector('.battle-reward-layer')?.remove();}
  function startBattle(){
    if(!selectedCharacter){closeDialog();go('home');toast('먼저 캐릭터를 만들어 주세요');return;}
    clearInterval(timerId);clearTimeout(nextTimer);removeBattleReward();const source=stages[selectedStage];
    const deck=buildQuestionDeck(source);const cls=selectedCharacter?.class||'warrior',hpMax=cls==='mage'||cls==='ranger'?2:3;run={deck,index:0,correct:0,elapsed:0,locked:false,paused:false,done:false,clear:false,result:null,chest:false,treasure:0,resultStep:'summary',chestClicks:0,story:Boolean(source.story),hp:hpMax,hpMax,mobs:[],mobInitialized:false,storyTimeLimit:deck.length*3000,freezeRemaining:0,fever:false,feverWords:[],feverNextSpawnAt:0,feverWordSequence:0};
    prepareQuestion();closeDialog();go('battle');tick();
  }
  function prepareQuestion(){const item=run.deck[run.index];run.question=makeQuestion(item.entry,stages[selectedStage].words,item.mode);activatePassive();run.last=performance.now();run.locked=false;if(run.story){run.fever=false;const start=Math.floor(run.index/5)*5;run.matchBoard=run.deck.slice(start,start+5);run.matched=new Set();run.selectedKo=null;run.selectedEn=null;run.matchFeedback='';run.matchKo=shuffle(run.matchBoard.map((x,i)=>({entry:x.entry,id:start+i})));run.matchEn=shuffle(run.matchBoard.map((x,i)=>({entry:x.entry,id:start+i})));run.mobs=[];}}
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
  function storyBattleActions(){
    const defaults={warrior:['수호의 시간','guardian_crystal','shield'],mage:['타임 스톱','time_crystal','hourglass'],pugilist:['러시 콤보','combo_crystal','combo'],ranger:['행운의 화살','fortune_crystal','arrow']};
    const classCode=selectedCharacter?.class||'warrior',fallback=defaults[classCode]||defaults.warrior;
    const definition=storySkillDefinitions.find(row=>row.class_code===classCode);
    const catalogIcon=storySkillIcons.find(row=>row.code===definition?.icon_code);
    const skill=definition?.skill_name||fallback[0],iconData=catalogIcon||{icon_key:fallback[2],gem_color:'#d9f8f2',glow_color:'#a5e5dc',icon_color:'#2d958b'};
    const color=(value,backup)=>/^#[0-9a-f]{6}$/i.test(value||'')?value:backup;
    const candidatePath=String(iconData.asset_path||'');
    const assetPath=/^assets\/[A-Za-z0-9_./-]+\.(?:png|webp|svg)$/i.test(candidatePath)&&!candidatePath.split('/').includes('..')?candidatePath:'';
    const art=assetPath?`<img src="${esc(deployedAssetUrl(assetPath))}" alt="" aria-hidden="true">`:icon(iconData.icon_key);
    const skillStyle=`--skill-gem:${color(iconData.gem_color,'#d9f8f2')};--skill-ring:${color(iconData.glow_color,'#a5e5dc')};--skill-ink:${color(iconData.icon_color,'#2d958b')}`;
    return `<div class="story-action-bar" aria-label="전투 아이템 및 스킬"><div class="story-item-group"><button class="story-action-slot story-empty-slot" type="button" disabled aria-label="아이템 슬롯 1, 장착된 아이템 없음"><span class="story-action-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></span></button><button class="story-action-slot story-empty-slot" type="button" disabled aria-label="아이템 슬롯 2, 장착된 아이템 없음"><span class="story-action-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></span></button></div><button class="story-action-slot story-skill-slot" style="${skillStyle}" type="button" disabled aria-label="${esc(skill)} 패시브 스킬, 자동 발동"><span class="story-action-icon" aria-hidden="true">${art}</span></button></div>`;
  }
  function renderBattle(){if(run.story&&run.feverTransition)return `<section class="fever-intro" role="status" aria-live="assertive"><div class="fever-intro-flames" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><div class="fever-intro-crystal" aria-hidden="true">◆</div><p>BONUS CRYSTAL RUSH</p><h1>FEVER TIME!</h1><span>보너스 크리스털이 깨어나요!</span></section>`;const q=run.question,total=run.deck.length,boss=run.story&&run.index===total-1,mobMarkup=run.story?Array.from({length:Math.max(0,run.matchBoard.length-run.matched.size)},(_,i)=>`<div class="enemy story-mob" aria-hidden="true" style="right:${18+i*34}px;bottom:${24+(i%2)*35}px"></div>`).join(''):`<div class="enemy ${boss?'boss':''}"></div>`;const story=run.story,fever=story&&run.fever;return fever?renderFeverBattle():`<div class="battle-top row"><div class="stage-copy"><div class="eyebrow" style="color:var(--violet)">${story?`STORY LV.1 · 웨이브 ${Math.min(Math.floor(run.index/5)+1,Math.ceil(total/5))}/${Math.ceil(total/5)} · `:''}${esc(stages[selectedStage].name)} · ${run.index}/${total}</div></div></div>${story?`<div class="story-time-meter" id="story-time-meter" role="meter" aria-label="남은 시간 ${Math.ceil(Math.max(0,run.storyTimeLimit-run.elapsed)/run.storyTimeLimit*100)}%" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.ceil(Math.max(0,run.storyTimeLimit-run.elapsed)/run.storyTimeLimit*100)}"><div class="story-time-meter-label"><small>TIME LEFT</small><strong id="timer">${Math.ceil(Math.max(0,run.storyTimeLimit-run.elapsed)/run.storyTimeLimit*100)}%</strong></div><div class="story-time-track"><i id="story-time-fill" style="width:${Math.ceil(Math.max(0,run.storyTimeLimit-run.elapsed)/run.storyTimeLimit*100)}%"></i></div></div>`:''}<div class="arena ${run.skill?'skill':''} ${story&&run.attack?'hit':''} ${story&&run.stunned?'wrong story-stunned':''}" id="arena"><div class="arena-floor"></div>${battleHeroMarkup()}${run.skill&&(run.skillKind!=='mage'||run.freezeRemaining>0)?`<span class="passive-banner passive-banner-${run.skillKind}" role="status" aria-live="polite">${run.skill}</span>`:''}${story?'':`<div class="arena-time" id="arena-time" aria-label="남은 제한시간"><small>TIME LIMIT</small><strong id="timer">${(run.remaining/1000).toFixed(1)}<span>초</span></strong></div>`}${story?`<div class="story-hp" aria-label="체력 ${run.hp}/${run.hpMax}">${'♥'.repeat(run.hp)}${'♡'.repeat(Math.max(0,run.hpMax-run.hp))}</div>`:''}<span class="enemy-label">${story?'':'LV. 1 · 민트 슬라임'}</span>${mobMarkup}<div class="crystal-strike" aria-hidden="true"></div><div class="crystal-shards" aria-hidden="true">${'<i></i>'.repeat(7)}</div>${story?'':`<div class="arena-feedback" id="arena-feedback">${esc(run.matchFeedback||'')}</div>`}</div>${story?'':`<div class="row small story-progress"><b>${run.index} / ${total} 처치</b><span style="color:var(--violet)">${run.correct} 처치 · ◆ +${earnedCoins(run.correct)}</span></div>`}<div class="xp"><i style="width:${run.index/total*100}%"></i></div>${story?`${storyBattleActions()}<div class="story-match-board"><div class="story-match-column">${run.matchKo.map(item=>`<button class="story-match-item ${run.matched.has(item.id)?'matched':''} ${run.selectedKo===item.id?'selected':''}" data-action="story-pick" data-side="ko" data-id="${item.id}" ${run.matched.has(item.id)?'disabled':''}>${esc(item.entry[2])}</button>`).join('')}</div><div class="story-match-column">${run.matchEn.map(item=>`<button class="story-match-item ${run.matched.has(item.id)?'matched':''} ${run.selectedEn===item.id?'selected':''}" data-action="story-pick" data-side="en" data-id="${item.id}" ${run.matched.has(item.id)?'disabled':''}>${esc(item.entry[0])}</button>`).join('')}</div></div>`:`<div class="question-card"><h1 class="${q.prompt.length>28?'long-question':''}">${esc(q.prompt)}</h1></div><div class="answers">${q.choices.map((answer,i)=>`<button class="answer" data-action="answer" data-index="${i}"><span>${i+1}</span>${esc(answer)}</button>`).join('')}</div>`}`;}
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
    run.feedbackPending=false;clearTimeout(nextTimer);removeBattleReward();run.index++;if(run.story)run.mobs=[];
    if(run.index>=run.deck.length)return finishBattle(true);
    prepareQuestion();render();if(!run.paused)tick();
  }
  function updateEnemyApproach(){
    const arena=$('arena'),enemy=arena?.querySelector('.enemy'),hero=arena?.querySelector('.battle-hero, .portrait');
    if(!arena||!enemy||!hero||!run)return;
    const progress=run.story?0:Math.min(1,Math.max(0,1-run.remaining/run.maxTime));
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
  function consumeFreeze(delta){const frozen=Math.min(delta,run.freezeRemaining||0);run.freezeRemaining=Math.max(0,(run.freezeRemaining||0)-frozen);if(frozen&&run.freezeRemaining===0)document.querySelector('.passive-banner-mage')?.classList.add('resolved');return delta-frozen;}
  function tick(){clearInterval(timerId);run.last=performance.now();updateEnemyApproach();timerId=setInterval(()=>{if(!run||run.done||run.paused||run.timeoutPending||(!run.story&&run.locked))return;const now=performance.now(),delta=now-run.last;run.last=now;if(run.story&&run.feverTransition)return;const activeDelta=consumeFreeze(delta);run.elapsed+=activeDelta;if(run.story){const remaining=Math.max(0,run.storyTimeLimit-run.elapsed),el=$('timer'),timeBox=$('arena-time'),meter=$('story-time-meter'),fill=$('story-time-fill');if(run.story&&!run.fever){const percent=Math.ceil(remaining/run.storyTimeLimit*100);if(el)el.textContent=`${percent}%`;if(fill)fill.style.width=`${percent}%`;if(meter){meter.setAttribute('aria-valuenow',String(percent));meter.setAttribute('aria-label',`남은 시간 ${percent}%`);meter.classList.toggle('danger',remaining<10000);}}else{if(el)el.firstChild.textContent=(remaining/1000).toFixed(1);if(timeBox)timeBox.classList.toggle('danger',remaining<10000);}if(run.fever)advanceFeverCrystals();if(remaining<=0){if(run.fever){finishBattle(true,'fever-complete');}else{run.timeoutPending=true;run.stunned=true;run.attack=false;render();document.querySelector('#arena')?.classList.add('wrong','story-stunned');emitAudio('PLAYER_HIT');document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'error'}}));nextTimer=setTimeout(()=>finishBattle(false,'timeout'),1200);}}return;}run.remaining=Math.max(0,run.remaining-activeDelta);const el=$('timer'),timeBox=$('arena-time');if(el)el.firstChild.textContent=(run.remaining/1000).toFixed(1);if(timeBox)timeBox.classList.toggle('danger',run.remaining<2000);updateEnemyApproach();if(run.remaining<=0)answer(-1);},33);}
  function pause(){if(!run||run.done)return;run.paused=true;run.pausedAt=performance.now();clearInterval(timerId);window.wordoriaSound?.pauseBGM();}
  function resume(){closeDialog();if(run&&!run.done){const pausedFor=performance.now()-(run.pausedAt||performance.now());if(run.story){run.mobs.forEach(mob=>mob.startedAt+=pausedFor);if(run.nextMobSpawnAt)run.nextMobSpawnAt+=pausedFor;}run.paused=false;run.pausedAt=0;window.wordoriaSound?.resumeBGM();tick();}}
  function cancelSpeech(){if(window.WordoriaNativeSpeech?.cancel)window.WordoriaNativeSpeech.cancel().catch(()=>{});if(window.speechSynthesis)speechSynthesis.cancel();}
  function speak(text){if(window.WordoriaNativeSpeech?.speak){window.WordoriaNativeSpeech.speak(text,{lang:'en-US',rate:.82}).catch(()=>toast('기기 음성 엔진을 사용할 수 없어요'));return;}if(!('speechSynthesis' in window)){toast('이 브라우저에서는 음성 읽기를 지원하지 않아요');return;}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=.82;speechSynthesis.speak(u);}
  function answer(index){
    if(!run||run.done||run.paused||run.locked)return;run.locked=true;if(!run.story)clearInterval(timerId);document.querySelector('.passive-banner-mage')?.classList.add('resolved');const q=run.question,chosen=q.choices[index],ok=chosen===q.answer;
    document.querySelectorAll('.answer').forEach((button,i)=>{button.disabled=true;button.classList.toggle('correct',q.choices[i]===q.answer);button.classList.toggle('wrong',i===index&&!ok);});
    if(ok){run.correct++;const gain=earnedCoins(run.correct)-earnedCoins(run.correct-1),contact=battleContactDelay(),rangedMage=selectedCharacter?.class==='mage',noirPugilist=itemById(equippedMap(selectedCharacter).skin)?.code==='pugilist_crystal_noir_skin',attackEvent=run.skill?'ATTACK_SPECIAL':selectedCharacter?.class==='pugilist'?'ATTACK_HEAVY':'ATTACK_LIGHT';emitAudio(attackEvent);setTimeout(()=>{emitAudio('ENEMY_HIT');if(run.correct%5===0)emitAudio('CRITICAL_HIT');if(rangedMage||noirPugilist)document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'success'}}));},contact);setTimeout(()=>emitAudio('ENEMY_DEATH'),contact+150);if(!rangedMage&&!noirPugilist)document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'success'}}));setHeroAttackTravel();$('arena').classList.add('hit');$('arena-feedback').textContent=`${run.correct} COMBO! ◆ +${gain}`;speak(q.entry[0]);run.feedbackPending=true;if(run.story){nextTimer=setTimeout(continueAfterFeedback,reducedMotion()?360:980);return;}nextTimer=setTimeout(()=>{nextTimer=setTimeout(continueAfterFeedback,showBattleReward(q,gain));},1050);return;}
    else{emitAudio('ATTACK_LIGHT');setTimeout(()=>emitAudio('PLAYER_HIT'),reducedMotion()?100:210);document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'error'}}));$('arena').classList.add('wrong');$('arena-feedback').textContent=index<0?'시간 초과!':'아쉬워요!';setTimeout(()=>emitAudio('PLAYER_DEATH'),reducedMotion()?260:650);}
    nextTimer=setTimeout(()=>finishBattle(false,index<0?'timeout':'wrong'),1450);
  }
  function advanceFeverCrystals(){let changed=false;const now=run.elapsed;const live=run.feverWords.filter(crystal=>!crystal.removeAt||now<crystal.removeAt);if(live.length!==run.feverWords.length){run.feverWords=live;changed=true;}if(now>=run.feverNextSpawnAt&&now<run.storyTimeLimit){const entry=run.deck[Math.floor(Math.random()*run.deck.length)].entry;run.feverWords.push({id:`fever-${++run.feverWordSequence}`,entry,createdAt:now,state:'word',x:26+Math.random()*48,y:12+Math.random()*72});run.feverNextSpawnAt=now+550+Math.random()*400;changed=true;}if(changed)render();}
  function enterFeverTime(){run.fever=true;run.feverTransition=false;run.attack=false;run.locked=false;run.matchFeedback='';run.feverWords=[];run.feverCollected=run.feverCollected||0;run.feverNextSpawnAt=run.elapsed;advanceFeverCrystals();render();}
  function beginFeverIntro(){if(!run||run.done)return;run.feverTransition=true;run.attack=false;run.freezeRemaining=0;run.skill='';emitAudio('CRITICAL_HIT');speak('Fever Time!');render();nextTimer=setTimeout(enterFeverTime,reducedMotion()?700:1650);}
  function collectFeverCrystal(id){if(!run?.fever||run.done||run.paused)return;const word=run.feverWords.find(item=>item.id===id);if(!word||word.state==='pop')return;if(word.state==='word'){word.state='meaning';emitAudio('FEVER_BALLOON_SQUEAK');render();return;}word.state='pop';word.removeAt=run.elapsed+240;run.feverCollected=(run.feverCollected||0)+1;emitAudio('FEVER_BALLOON_POP');document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'success'}}));render();}
  function renderFeverBattle(){const left=Math.max(0,run.storyTimeLimit-run.elapsed);return `<div class="fever-screen"><div class="battle-top row"><div class="stage-copy"><div class="eyebrow">BONUS FEVER TIME</div><b>영어 단어를 눌러 뜻을 확인하고, 한 번 더 눌러 터뜨리세요!</b></div></div><div class="fever-hud"><span>남은 시간 · 수집 ${run.feverCollected||0}개</span><strong><span id="timer">${(left/1000).toFixed(1)}</span>초</strong></div><section class="fever-field" aria-label="단어 크리스털">${run.feverWords.map(word=>`<button type="button" class="fever-crystal phase-${word.state}" data-action="fever-pick" data-id="${word.id}" style="--x:${word.x}%;--y:${word.y}%" aria-label="${word.state==='meaning'?`${esc(word.entry[0])}, ${esc(word.entry[2])}. 한 번 더 눌러 터뜨리기`:`${esc(word.entry[0])} 뜻 보기`}" ${word.state==='pop'?'disabled':''}><b>${esc(word.entry[0])}</b>${word.state==='meaning'?`<span>${esc(word.entry[2])}</span>`:''}</button>`).join('')}</section></div>`;}
  function storyPick(button){if(!run?.story||run.fever||run.done||run.paused||run.stunned||run.locked)return;const side=button.dataset.side,id=Number(button.dataset.id);if(run.matched.has(id))return;if(side==='ko')run.selectedKo=id;else run.selectedEn=id;if(run.selectedKo===null||run.selectedEn===null){run.matchFeedback='';run.matchFeedbackType='';render();return;}if(run.selectedKo!==run.selectedEn){run.matchFeedback='';run.matchFeedbackType='';run.selectedKo=null;run.selectedEn=null;run.hp=Math.max(0,run.hp-1);run.stunned=true;render();const arena=$('arena');arena?.classList.add('wrong','story-stunned');document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'error'}}));emitAudio('PLAYER_HIT');if(run.hp<=0){setTimeout(()=>finishBattle(false,'hp-zero'),300);return;}setTimeout(()=>{if(!run||run.done)return;run.stunned=false;document.querySelector('#arena')?.classList.remove('wrong','story-stunned');render();},500);return;}const matched=run.matchEn.find(item=>item.id===id)?.entry;run.matchFeedback='';run.matchFeedbackType='';if(matched?.[0])speak(matched[0]);run.matched.add(id);run.selectedKo=null;run.selectedEn=null;run.index++;run.correct++;run.attack=true;run.locked=true;run.freezeRemaining=0;run.skill='';const noirPugilist=itemById(equippedMap(selectedCharacter).skin)?.code==='pugilist_crystal_noir_skin',contact=battleContactDelay();emitAudio(selectedCharacter?.class==='pugilist'?'ATTACK_HEAVY':'ATTACK_LIGHT');setTimeout(()=>{emitAudio('ENEMY_HIT');if(noirPugilist)document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'success'}}));},contact);if(!noirPugilist)document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'success'}}));render();const arena=$('arena');if(arena){setTimeout(()=>arena.classList.remove('hit'),reducedMotion()?300:900);}if(run.index>=run.deck.length){run.feverTransition=true;nextTimer=setTimeout(beginFeverIntro,Math.max(300,contact+120));return;}if(run.index%5===0){nextTimer=setTimeout(()=>{run.attack=false;prepareQuestion();render();},reducedMotion()?300:900);return;}run.selectedKo=null;run.selectedEn=null;nextTimer=setTimeout(()=>{run.attack=false;run.locked=false;activatePassive();render();},reducedMotion()?300:900); }
  async function finishBattle(clear,reason){
    if(run.done)return;run.done=true;run.clear=clear;run.reason=reason;run.feedbackPending=false;clearInterval(timerId);clearTimeout(nextTimer);removeBattleReward();cancelSpeech();
    if(demo){const coins=earnedCoins(run.correct,clear),id=`demo-${Date.now()}`;if(!(run.story&&storyTestMode))selectedCharacter.coins+=coins;run.result={game_score_id:id,coins_earned:coins,balance:selectedCharacter.coins};const row={id,player,stage:stageRecordName(selectedStage),correct:run.correct,total:run.deck.length,cleared:clear,character_id:selectedCharacter.id,duration_ms:Math.round(run.elapsed),coins_earned:coins,created_at:new Date().toISOString()};demoState.records.unshift(row);records=demoState.records;saveDemo();}
    else if(dbOnline){try{const isStoryTest=run.story&&storyTestMode;const rows=await rpc(isStoryTest?'record_game_result_without_reward':'award_game_result',{p_character_id:selectedCharacter.id,p_stage:stageRecordName(selectedStage),p_correct:run.correct,p_total:run.deck.length,p_cleared:clear,p_duration_ms:Math.round(run.elapsed)});run.result=rows?.[0]||null;if(run.result){if(accountMode)accountCrystals=Number(run.result.balance);else selectedCharacter.coins=run.result.balance;}records=await apiGet('game_scores?select=player,stage,correct,total,cleared,created_at,character_id,duration_ms,coins_earned,id&order=created_at.desc&limit=1000');}catch(error){console.error(error);run.saveError=true;}}
    if(clear&&run.story)storyDialogueIndex=0;
    const storyIndex=storyStages.findIndex(stage=>stage.key===selectedStage),storyStage=storyStages[storyIndex];
    if(clear&&run.story){const next=storyStages.find((stage,index)=>!stageCleared(stage.key)&&storyStageUnlocked(index));if(next)selectedStoryStage=next.key;}
    if(clear&&storyStage?.epilogue){storyDialogueIndex=0;go('storyEpilogue');}
    else if(clear&&run.story&&storyIndex===storyStages.length-1)go('home');
    else go(run.story?'story':'result');
    emitAudio(clear?'GAME_VICTORY':'GAME_DEFEAT');
    if(clear){playStageClearSound();document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'success'}}));}
  }
  function clearSummaryMarkup(r,earned){return `<section class="result clear-result"><div class="clear-portal" aria-hidden="true"><i></i><i></i><i></i></div><div class="clear-shards" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="clear-content"><div class="clear-crown" aria-hidden="true"><i></i></div><div class="eyebrow clear-title">STAGE CLEAR</div><div class="clear-sigil" aria-hidden="true"><i></i><b>◆</b></div><h1>클리어!</h1><p class="clear-stage">${esc(stages[selectedStage].name)}</p><div class="clear-stats"><div><span>클리어 타임</span><strong>${(r.elapsed/1000).toFixed(1)}<small>초</small></strong></div><div><span>푼 문제</span><strong>${r.correct}<small> / ${r.deck.length}</small></strong></div><div><span>획득 크리스털</span><strong class="crystal-value">◆ ${num(earned)}</strong></div></div><button class="primary clear-next" data-action="result-next">보상 상자 확인하기 <span>→</span></button></div></section>`;}
  function chestMarkup(r){const clicks=r.chestClicks||0,progress=clicks/3*100,label=clicks===0?'상자를 터치해 주세요':clicks===1?'좋아요! 한 번 더!':'마지막 한 번!';return `<section class="result chest-result"><div class="eyebrow">CLEAR REWARD</div><h1>보상 상자가 도착했어요!</h1><p>세 번 터치해서 잠든 보물을 깨워 보세요.</p><button class="treasure-chest-button" data-action="chest-tap" style="--chest-progress:${progress}%" aria-label="보상 상자 ${clicks}/3회 열기" ${!r.result?.game_score_id?'disabled':''}><span class="chest-ring" aria-hidden="true"><i></i><i></i><i></i></span><span class="reward-chest" aria-hidden="true"><i class="chest-glow"></i><img class="chest-art chest-art-closed" src="assets/ui/crystal-quest/rewards/ui_reward_chest_guardian_closed.webp" alt=""><img class="chest-art chest-art-open" src="assets/ui/crystal-quest/rewards/ui_reward_chest_guardian_open.webp" alt=""></span><span class="chest-sparkles" aria-hidden="true">✦ ✧ ✦</span></button><div class="chest-progress-copy"><strong>${clicks} / 3</strong><span>${r.result?.game_score_id?label:'보상 기록을 저장해야 상자를 열 수 있어요'}</span></div><div class="chest-pips" aria-hidden="true">${[1,2,3].map(n=>`<i class="${clicks>=n?'filled':''}"></i>`).join('')}</div></section>`;}
  function crystalRewardMarkup(r){return `<section class="result crystal-reveal"><div class="reward-radiance" aria-hidden="true"></div><div class="eyebrow">TREASURE FOUND</div><h1>크리스털 획득!</h1><div class="giant-crystal" aria-hidden="true"><img src="assets/ui/crystal-quest/rewards/ui_reward_crystal_bloom.webp" alt=""></div><div class="reward-amount"><strong>+${num(r.treasure)}</strong><span>크리스털</span></div><p>보상이 계정 지갑에 안전하게 담겼어요.</p><button class="primary reward-claim" data-action="receive-reward">받기</button></section>`;}
  function renderResult(){const r=run,result=r.result,earned=result?.coins_earned??earnedCoins(r.correct,r.clear);if(!r.clear)return `<section class="result"><div class="result-symbol">${icon('aura')}</div><div class="eyebrow" style="color:var(--violet)">KEEP EXPLORING</div><h1>${r.reason==='timeout'?'시간이 다 되었어요':'다음엔 더 멀리 갈 수 있어요'}</h1><p>${esc(stages[selectedStage].name)} · ${r.correct} / ${r.deck.length} 정답<br>이번에 배운 단어는 다음 모험의 힘이 됩니다.</p><div class="reward-number">◆ +${num(earned)}</div><div class="panel row small reward-breakdown"><span>정답 <b>${r.correct}</b></span><span>풀이 시간 <b>${(r.elapsed/1000).toFixed(1)}초</b></span></div><button class="primary" data-action="retry">다시 도전하기 →</button><div class="actions"><button class="secondary" data-action="nav" data-page="dungeon">다른 던전</button><button class="secondary" data-action="nav" data-page="home">홈으로</button></div></section>`;if(r.resultStep==='chest')return chestMarkup(r);if(r.resultStep==='reward')return crystalRewardMarkup(r);return clearSummaryMarkup(r,earned);}

  function showCharacters(){if(accountMode){characterCreating=false;go('characters');return;}modal(`<div class="eyebrow">CHOOSE YOUR HERO</div><h2>모험가 선택</h2>${profileBar()}<div class="character-list">${characters.map(c=>`<button class="character-row ${c.id===selectedCharacter?.id?'active':''}" data-action="select-character" data-id="${c.id}"><img src="${imagePath(c)}" alt=""><span><b>${esc(c.name)}</b><small>${characterDef(c).label} · ${variantOf(c)==='female'?'여성':'남성'}</small></span><span class="wallet">◆ ${num(c.coins)}</span></button>`).join('')||'<div class="empty-state">이 유저는 아직 캐릭터가 없어요.</div>'}</div><button class="primary" data-action="new-character" ${!dbOnline&&!demo?'disabled':''}>＋ 새 캐릭터 만들기</button>`);}
  function showNewPlayer(){modal('<div class="eyebrow">NEW PLAYER</div><h2>새 유저 추가</h2><label class="form-label" for="player-name">유저 이름</label><input id="player-name" class="field" maxlength="12" autocomplete="off" placeholder="예: 엄마"><p>한글, 영문, 숫자, 공백, 밑줄과 하이픈을 사용할 수 있어요.</p><button class="primary" data-action="create-player">유저 추가</button>');setTimeout(()=>$('player-name')?.focus(),0);}
  function showNewCharacter(){newClass='warrior';newVariant='male';newAccent='violet';newCharacterName='';if(accountMode){if(characters.length&&!availableCharacterTickets){modal(`<div class="eyebrow">ADD NEW HERO</div><h2>새 캐릭터 추가</h2><p>캐릭터 추가권은 계정 크리스털 200개로 구매할 수 있어요.</p><div class="row" style="margin:18px 0"><b>◆ 200</b><span class="small muted">보유 ◆ ${num(walletBalance())}</span></div><button class="primary" data-action="buy-character-ticket-and-create" ${walletBalance()<200?'disabled':''}>${walletBalance()<200?'크리스털이 부족해요':'추가하기'}</button>`);return;}characterCreating=true;go('characters');return;}renderCharacterForm();}
  function renderCharacterForm(){if($('character-name'))newCharacterName=$('character-name').value;if(accountMode){render();return;}const d=classDefs[newClass];modal(`<div class="eyebrow">CREATE YOUR HERO</div><h2>${esc(player)}님의 새 모험가</h2><label class="form-label" for="character-name">캐릭터 이름</label><input id="character-name" class="field" maxlength="16" value="${esc(newCharacterName)}" placeholder="예: 불꽃검 율이"><label class="form-label">직업</label><div class="tabs">${Object.entries(classDefs).map(([id,c])=>`<button class="${id===newClass?'active':''}" data-action="class" data-value="${id}">${c.label}</button>`).join('')}</div><p>${d.trait}</p><label class="form-label">기본 외형</label><div class="choice-grid">${['male','female'].map(v=>`<button class="choice-card ${v===newVariant?'active':''}" data-action="variant" data-value="${v}"><img src="assets/avatars/${d.paths[v]}?v=20260917-skins" alt="">${v==='male'?'남성':'여성'} 캐릭터</button>`).join('')}</div><label class="form-label">오라 색상</label><div class="accent-row">${['violet','red','blue','green','gold'].map(v=>`<button class="accent-choice ${v===newAccent?'active':''}" data-action="accent" data-value="${v}" aria-label="${v}"></button>`).join('')}</div><button class="primary" data-action="create-character">캐릭터 생성 →</button>`);}
  function showItem(id){const item=itemById(id);if(!item)return;const owned=itemOwned(item),eq=Object.values(equippedMap()).some(v=>String(v)===String(id)),gear=item.category==='avatar',skin=isSkin(item),rarity=displayRarity(item),eligible=!skin||skinEligible(item),balance=walletBalance(),disabled=!owned&&(!eligible||balance<item.price),requirement=skin?skinRequirement(item):'';modal(`<div class="eyebrow">${rarityNames[rarity]}${gear?' · 아이템':' · 현실 보상'}</div><div class="item-art item-detail-art" data-rarity="${rarity}">${itemArt(item)}</div><h2>${esc(item.name)}</h2><p>${esc(item.description)}</p>${gear?`<div class="item-detail-stat"><span>${skin?'사용 조건':'장착 능력치'}</span><b>${skin?requirement:`${esc(String(item.stat_key||'').toUpperCase())} +${num(item.stat_value)}`}</b></div>`:''}<div class="row" style="margin-top:18px"><b>${num(item.price)} ◆</b><span class="small muted">계정 보유 ${num(balance)} ◆</span></div><button class="primary" data-action="${owned?'equip':'buy'}" data-id="${item.id}" ${disabled?'disabled':''}>${owned?(eq?'장착 해제':'장착하기'):(!eligible?`${requirement}이에요`:balance<item.price?'크리스털이 부족해요':'구매하기')}</button>`);}
  function showRecords(){const rows=selectedRecords().slice(0,20);modal(`<div class="eyebrow">ADVENTURE JOURNAL</div><h2>모험 기록</h2><p>${esc(selectedCharacter?.name||player)}의 최근 도전입니다.</p>${rows.length?rows.map(r=>`<div class="record-row row"><div><b>${esc(r.stage)}</b><small>${new Date(r.created_at).toLocaleString('ko-KR')} · ${r.correct}/${r.total} 정답</small></div><span>${r.cleared?'CLEAR':'도전'}<small>+${num(r.coins_earned)} ◆</small></span></div>`).join(''):'<div class="notice">아직 모험 기록이 없어요.</div>'}`);}
  function showStats(){const s=stats();modal(`<div class="eyebrow">ADVENTURER STATUS</div><h2>${esc(selectedCharacter.name)} · LV.${s.level}</h2><p>${characterDef(selectedCharacter).label} · ${characterDef(selectedCharacter).trait}</p><div class="record-row row"><span>경험치</span><b>${s.exp} / 1,000</b></div><div class="record-row row"><span>최고 콤보</span><b>${s.best}</b></div><div class="record-row row"><span>누적 정답</span><b>${s.correct} / ${s.answered}</b></div><div class="record-row row"><span>정답률</span><b>${s.accuracy}%</b></div><div class="record-row row"><span>클리어</span><b>${s.clears}</b></div><button class="primary" data-action="records">모험 기록 보기</button>`);}
 function showRequests(){const active=redemptions.filter(r=>r.status==='pending'||r.status==='approved');modal(`<div class="request-heading"><div><div class="eyebrow">REWARD REQUESTS</div><h2>보상 신청 내역</h2></div><button class="text-btn" data-action="request-history">지난 신청 내역 →</button></div><p>구매한 보상을 지급했으면 완료해 주세요.</p>${active.length?active.map(r=>`<div class="record-row row reward-request"><div><b>${esc(itemById(r.item_id)?.name||'보상')}</b><small>${new Date(r.created_at).toLocaleString('ko-KR')} · ${num(r.price_paid)} ◆</small></div><button class="secondary" data-action="fulfill-reward" data-id="${r.id}">지급</button></div>`).join(''):'<div class="notice">지급 대기 중인 보상이 없어요.</div>'}`);}
 function showRequestHistory(){const cutoff=Date.now()-30*24*60*60*1000;const completed=redemptions.filter(r=>r.status==='fulfilled'&&new Date(r.fulfilled_at||r.created_at).getTime()>=cutoff);modal(`<div class="request-heading"><div><div class="eyebrow">REWARD HISTORY</div><h2>지난 신청 내역</h2></div><button class="text-btn" data-action="requests">← 신청 내역</button></div><p>최근 30일간 지급한 보상입니다.</p>${completed.length?completed.map(r=>`<div class="record-row row"><div><b>${esc(itemById(r.item_id)?.name||'보상')}</b><small>${new Date(r.fulfilled_at||r.created_at).toLocaleString('ko-KR')} · ${num(r.price_paid)} ◆</small></div><span class="request-status fulfilled">지급 완료</span></div>`).join(''):'<div class="notice">최근 30일간 지급한 보상이 없어요.</div>'}`);}
 async function fulfillReward(id,button){const request=redemptions.find(r=>String(r.id)===String(id));if(!request||!['pending','approved'].includes(request.status))return;if(!demo&&!accountMode){toast('지급 처리에는 로그인이 필요해요');return;}button.disabled=true;try{if(demo){request.status='fulfilled';request.fulfilled_at=new Date().toISOString();const original=demoState.redemptions.find(r=>String(r.id)===String(id));if(original){original.status='fulfilled';original.fulfilled_at=request.fulfilled_at;}saveDemo();}else await rpc('fulfill_reward_redemption',{p_redemption_id:Number(id)});await loadCharacterExtras();showRequests();render();toast('완료 되었습니다.');}catch(error){console.error(error);button.disabled=false;toast('지급 처리에 실패했습니다. 다시 시도해 주세요.');}}
  function weekStartKst(){
    const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(new Date()).filter(part=>part.type!=='literal').map(part=>[part.type,Number(part.value)]));
    const day=Date.UTC(parts.year,parts.month-1,parts.day),weekday=new Date(day).getUTCDay();
    return day-((weekday+6)%7)*86400000-9*3600000;
  }
  function demoWeeklyRanking(stage){
    const start=weekStartKst(),best=new Map();
    records.filter(r=>r.stage===stage&&r.cleared&&Number.isFinite(Number(r.duration_ms))&&r.duration_ms!=null&&new Date(r.created_at).getTime()>=start&&new Date(r.created_at).getTime()<start+7*86400000).forEach(r=>{
      const c=allCharacters.find(character=>character.id===r.character_id),key=c?.owner_user_id||r.player,old=best.get(key);
      if(!old||Number(r.duration_ms)<Number(old.duration_ms))best.set(key,{character_name:c?.name||r.player,character_class:c?.class,avatar_variant:variantOf(c),duration_ms:Number(r.duration_ms)});
    });
    return [...best.values()].sort((a,b)=>a.duration_ms-b.duration_ms).slice(0,3);
  }
  const clearTimeLabel=ms=>{const total=Math.round(Number(ms)/100)/10,minutes=Math.floor(total/60),seconds=(total-minutes*60).toFixed(1);return minutes?`${minutes}분 ${seconds.padStart(4,'0')}초`:`${seconds}초`;};
  function rankingMarkup(rows){
    if(!rows.length)return '<div class="ranking-empty"><span aria-hidden="true">◇</span><b>이번 주 클리어 기록이 없어요</b><small>첫 클리어로 시상대의 주인공이 되어 보세요!</small></div>';
    return `<div class="ranking-podium" aria-label="이번 주 클리어 타임 상위 3명">${[1,0,2].map(index=>{const r=rows[index];if(!r)return `<div class="podium-slot podium-empty" aria-hidden="true"></div>`;const cls=classDefs[r.character_class],variant=r.avatar_variant==='female'?'female':'male',avatar=cls?.paths[variant];return `<div class="podium-slot podium-place-${index+1}"><div class="podium-hero">${index===0?'<span class="podium-crown" aria-hidden="true">♛</span>':''}<span class="podium-avatar">${avatar?`<img src="${esc(deployedAssetUrl(`assets/avatars/${avatar}`))}" alt="">`:'◆'}</span><b class="podium-name">${esc(r.character_name||'모험가')}</b><span class="podium-time">${clearTimeLabel(r.duration_ms)}</span></div><div class="podium-step"><strong>${index+1}</strong><small>위</small></div></div>`;}).join('')}</div><p class="ranking-rule">이번 주 클리어 · 사용자별 최고 기록 · 빠른 시간순</p>`;
  }
  async function showWeeklyRanking(startBattle=false){
    const stageKey=selectedStage,stage=stages[stageKey],stageName=stageRecordName(stageKey);
    modal(`<div class="map-rank-header"><div class="eyebrow">WEEKLY MAP RANKING · TOP 3</div><h2>${esc(stage?.name||'맵')}</h2><p>이번 주 주간랭킹 <span>월요일~일요일 · 한국시간</span></p></div><div id="weekly-ranking" class="ranking-loading" role="status">랭킹을 불러오는 중…</div>${startBattle?'<button class="primary" data-action="start">모험 시작 →</button>':''}`);
    try{
      const rows=demo?demoWeeklyRanking(stageName):await rpc('weekly_map_ranking',{p_stage:stageName});
      if(selectedStage===stageKey&&$('dialog').open&&$('weekly-ranking'))$('weekly-ranking').outerHTML=rankingMarkup(rows||[]);
    }catch(error){console.error(error);if(selectedStage===stageKey&&$('dialog').open&&$('weekly-ranking'))$('weekly-ranking').textContent='랭킹을 불러오지 못했어요. 잠시 후 다시 확인해 주세요.';}
  }
  function showMapStart(){showWeeklyRanking(true);}
  function showRankings(){showWeeklyRanking();}

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
  async function shiftCharacterSelection(direction){
    if(characters.length<2||!selectedCharacter)return;
    const current=Math.max(0,characters.findIndex(c=>c.id===(characterPreviewId||selectedCharacter.id)));
    characterPreviewId=characters[(current+direction+characters.length)%characters.length].id;
    characterArmedId=null;
    render();
  }
  async function createPlayer(){const input=$('player-name'),name=input?.value.trim().replace(/\s+/g,' ');if(!name||!/^[가-힣A-Za-z0-9 _-]{1,12}$/.test(name)){toast('사용할 수 있는 유저 이름을 입력해 주세요');return;}if(players.some(x=>x.toLocaleLowerCase()===name.toLocaleLowerCase())){toast('이미 등록된 유저예요');return;}const custom=readCustomPlayers();custom.push(name);localStorage.setItem('fantasyQuizPlayers',JSON.stringify(unique(custom)));players.push(name);await switchPlayer(name);showNewCharacter();}
  async function createCharacter(button){const input=$('character-name'),name=input?.value.trim();if(!name){toast('캐릭터 이름을 입력해 주세요');input?.focus();return;}button.disabled=true;button.textContent='생성 중…';try{let created;if(demo){if(demoState.characters.filter(c=>c.player===player).length&&!(demoState.characterTickets>0))throw new Error('character creation ticket required');created={id:`demo-${Date.now()}`,player,name,class:newClass,avatar_variant:newVariant,accent:newAccent,coins:0,equipped_items:{}};demoState.characters.push(created);if(demoState.characters.filter(c=>c.player===player).length>1)demoState.characterTickets--;saveDemo();}else if(accountMode){const rows=await rpc('create_account_character',{p_name:name,p_class:newClass,p_avatar_variant:newVariant,p_accent:newAccent});created=Array.isArray(rows)?rows[0]:rows;}else{let rows;try{rows=await apiPost('game_characters',{player,name,class:newClass,avatar_variant:newVariant,accent:newAccent});}catch(error){if(!String(error.message).includes('avatar_variant'))throw error;rows=await apiPost('game_characters',{player,name,class:newClass,accent:newAccent});if(rows?.[0])localStorage.setItem(`fantasyQuizAvatar:${rows[0].id}`,newVariant);}created=rows?.[0];}if(created)localStorage.setItem(`fantasyQuizCharacter:${player}`,created.id);closeDialog();characterCreating=false;await refresh();if(accountMode)go('characters');toast('새 모험가가 길드에 합류했어요!');}catch(error){console.error(error);button.disabled=false;button.textContent='다시 시도';toast(String(error.message).includes('ticket')?'캐릭터 추가권이 필요해요':'캐릭터 생성에 실패했습니다');}}
  async function buyCharacterTicket(button){if(!selectedCharacter||walletBalance()<200){toast('계정 크리스털이 부족해요');return false;}button.disabled=true;button.textContent='구매 중…';try{if(demo){selectedCharacter.coins-=200;demoState.characterTickets=(demoState.characterTickets||0)+1;availableCharacterTickets=demoState.characterTickets;saveDemo();}else{const rows=await rpc('purchase_character_creation_ticket',{p_payer_character_id:selectedCharacter.id});const result=rows?.[0];if(result){accountCrystals=Number(result.new_balance);availableCharacterTickets=result.available_tickets;}}render();toast('계정 크리스털로 캐릭터 추가권을 구매했어요!');return true;}catch(error){console.error(error);button.disabled=false;button.textContent='다시 시도';toast(String(error.message).includes('not enough')?'계정 크리스털이 부족해요':'추가권을 구매하지 못했어요');return false;}}
  async function purchase(item){if(!item||walletBalance()<item.price)return;if(isSkin(item)&&!skinEligible(item)){toast(`${skinRequirement(item)} 캐릭터만 이 스킨을 구매할 수 있어요`);return;}try{if(demo){selectedCharacter.coins-=item.price;if(item.category==='avatar')demoState.inventory.push({character_id:selectedCharacter.id,item_id:item.id});else demoState.redemptions.unshift({id:Date.now(),character_id:selectedCharacter.id,item_id:item.id,status:'pending',price_paid:item.price,created_at:new Date().toISOString()});saveDemo();}else{const rows=await rpc('purchase_shop_item',{p_character_id:selectedCharacter.id,p_item_id:item.id});if(rows?.[0]){if(accountMode)accountCrystals=Number(rows[0].new_balance);else selectedCharacter.coins=rows[0].new_balance;}}await loadCharacterExtras();closeDialog();render();toast(item.category==='gift'?'보상 신청이 접수되었어요':'구매 완료! 장비함에서 장착해 보세요');}catch(error){console.error(error);toast(String(error.message).includes('male pugilist')?'남성 권투사만 구매할 수 있어요':String(error.message).includes('female pugilist')?'여성 권투사만 구매할 수 있어요':String(error.message).includes('female ranger')?'여성 궁수만 구매할 수 있어요':String(error.message).includes('not enough')?'계정 크리스털이 부족해요':'구매하지 못했습니다');}}
  async function equip(item){if(!item||!itemOwned(item))return;if(isSkin(item)&&!skinEligible(item)){toast(`${skinRequirement(item)} 캐릭터만 이 스킨을 장착할 수 있어요`);return;}const slot=slotFor(item),map=equippedMap(),isEquipped=String(map[slot])===String(item.id),skin=isSkin(item);try{if(demo){if(isEquipped)delete map[slot];else map[slot]=item.id;selectedCharacter.equipped_items=map;saveDemo();}else{await rpc('equip_avatar_slot',{p_character_id:selectedCharacter.id,p_item_id:isEquipped?null:item.id,p_slot:slot});await loadAll();}closeDialog();render();toast(isEquipped?(skin?'스킨 장착을 해제했어요':'장비 장착을 해제했어요'):(skin?'장착했어요! 캐릭터 모습이 바뀌었어요':'장비를 장착했어요'));}catch(error){console.error(error);toast(String(error.message).includes('male pugilist')?'남성 권투사만 장착할 수 있어요':String(error.message).includes('female pugilist')?'여성 권투사만 장착할 수 있어요':String(error.message).includes('female ranger')?'여성 궁수만 장착할 수 있어요':'장비 슬롯 기능을 사용하려면 최신 DB 마이그레이션이 필요합니다');}}
  async function claimChestReward(){let reward;if(demo){const min=selectedCharacter.class==='ranger'?20:10;reward=min+Math.floor(Math.random()*(31-min));if(!(run.story&&storyTestMode)){selectedCharacter.coins+=reward;saveDemo();}}else{const rows=await rpc(run.story&&storyTestMode?'claim_stage_treasure_without_reward':'claim_stage_treasure',{p_character_id:selectedCharacter.id,p_game_score_id:run.result.game_score_id});reward=rows?.[0]?.reward;if(accountMode)accountCrystals=Number(rows?.[0]?.balance??accountCrystals);else selectedCharacter.coins=rows?.[0]?.balance??selectedCharacter.coins;}return reward;}
  function resultNext(){if(!run?.clear)return;run.resultStep='chest';render();requestAnimationFrame(()=>$('screen')?.focus());}
  async function tapChest(button){if(!run?.clear||run.chest||!run.result?.game_score_id||button.classList.contains('opening'))return;run.chestClicks=Math.min(3,(run.chestClicks||0)+1);playChestTapSound(run.chestClicks);button.style.setProperty('--chest-progress',`${run.chestClicks/3*100}%`);button.setAttribute('aria-label',`보상 상자 ${run.chestClicks}/3회 열기`);button.classList.remove('shake-one','shake-two');void button.offsetWidth;button.classList.add(run.chestClicks===1?'shake-one':run.chestClicks===2?'shake-two':'opening');document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:run.chestClicks===3?'success':'light'}}));if(run.chestClicks<3){button.parentElement.querySelector('.chest-progress-copy strong').textContent=`${run.chestClicks} / 3`;button.parentElement.querySelector('.chest-progress-copy span').textContent=run.chestClicks===1?'좋아요! 한 번 더!':'마지막 한 번!';button.parentElement.querySelectorAll('.chest-pips i')[run.chestClicks-1]?.classList.add('filled');return;}button.disabled=true;try{const [reward]=await Promise.all([claimChestReward(),new Promise(resolve=>setTimeout(resolve,900))]);run.chest=true;run.treasure=reward;run.resultStep='reward';render();playCrystalRewardSound();}catch(error){console.error(error);run.chestClicks=2;render();toast('보물상자를 열지 못했어요. 다시 시도해 주세요');}}
  function receiveReward(){if(!run?.chest)return;go('stages');toast(`크리스털 ${num(run.treasure)}개를 받았어요!`);}

  document.addEventListener('pointerdown',prepareGameAudio,{once:true,passive:true});
  document.addEventListener('pointerdown',event=>{
    const stage=event.target.closest('.character-card-stage');
    if(!stage)return;
    characterSwipeStart={pointerId:event.pointerId,x:event.clientX,y:event.clientY};
  });
  document.addEventListener('pointerup',async event=>{
    const start=characterSwipeStart;
    characterSwipeStart=null;
    if(!start||start.pointerId!==event.pointerId)return;
    const dx=event.clientX-start.x,dy=event.clientY-start.y;
    if(Math.abs(dx)<44||Math.abs(dx)<=Math.abs(dy))return;
    suppressCharacterClickUntil=performance.now()+450;
    emitAudio('UI_CLICK');
    await shiftCharacterSelection(dx<0?1:-1);
  });
  document.addEventListener('pointercancel',()=>{characterSwipeStart=null;});
  document.addEventListener('keydown',async event=>{
    if(!event.target.closest('.character-card-stage')||!['ArrowLeft','ArrowRight'].includes(event.key))return;
    event.preventDefault();
    emitAudio('UI_CLICK');
    await shiftCharacterSelection(event.key==='ArrowRight'?1:-1);
  });
  document.addEventListener('click',event=>{if(page!=='battle'||!run||run.done||run.feedbackPending)return;if(event.target.closest('.story-match-item,.fever-crystal,[data-action],dialog'))return;if(event.target.closest('#arena')){if(run.paused)resume();else{pause();modal('<div class="eyebrow">PAUSED</div><h2>잠깐의 휴식</h2><div class="actions pause-actions"><button class="primary" data-action="resume">계속</button><button class="secondary" data-action="leave" data-page="home">홈으로</button></div>',{closable:false});}}});
  document.addEventListener('click',event=>{
    const scene=event.target.closest('.story-vn');
    if(!scene||event.target.closest('.story-vn-skip')||!['storyIntro','storyEpilogue'].includes(page))return;
    const lines=page==='storyEpilogue'?storyEpilogueLines:storyIntroLines;
    if(storyDialogueIndex<lines.length-1){storyDialogueIndex++;render();}
    else if(page==='storyEpilogue')go('home');
    else startBattle();
  });
  document.addEventListener('click',async event=>{const b=event.target.closest('button[data-action]');if(!b||b.disabled)return;const action=b.dataset.action,id=b.dataset.id;
    if(action==='select-character'&&performance.now()<suppressCharacterClickUntil)return;
    if(['close','cancel-character-create'].includes(action))emitAudio('UI_CANCEL');else if(['start','retry','resume','create-character','buy','equip','receive-reward'].includes(action))emitAudio('UI_CONFIRM');else if(action!=='answer'&&action!=='fever-pick')emitAudio('UI_CLICK');
    if(action==='nav')navigate(b.dataset.page);else if(action==='home')navigate('home');else if(action==='close'){closeDialog();if(page==='battle'&&run?.paused)resume();}
    else if(action==='player')await switchPlayer(b.dataset.player);else if(action==='add-player')showNewPlayer();else if(action==='create-player')await createPlayer();
    else if(action==='characters')showCharacters();else if(action==='select-character'){if(accountMode&&characterArmedId===id&&selectedCharacter?.id===id){go('home');return;}selectedCharacter=characters.find(c=>c.id===id)||selectedCharacter;characterPreviewId=selectedCharacter.id;characterArmedId=id;localStorage.setItem(`fantasyQuizCharacter:${player}`,selectedCharacter.id);if(accountMode){render();await loadCharacterExtras();}else{await loadCharacterExtras();closeDialog();render();}}
    else if(action==='character-step')await shiftCharacterSelection(Number(b.dataset.direction));else if(action==='character-page'){characterPreviewId=characters[Number(b.dataset.index)]?.id||selectedCharacter?.id;characterArmedId=null;render();}
    else if(action==='enter-game'){if(selectedCharacter)go('home');}else if(action==='open-character-create'||action==='new-character')showNewCharacter();else if(action==='cancel-character-create'){characterCreating=false;render();}else if(action==='buy-character-ticket')await buyCharacterTicket(b);else if(action==='buy-character-ticket-and-create'){if(await buyCharacterTicket(b)){closeDialog();showNewCharacter();}}else if(action==='class'){if($('character-name'))newCharacterName=$('character-name').value;newClass=b.dataset.value;renderCharacterForm();}else if(action==='variant'){if($('character-name'))newCharacterName=$('character-name').value;newVariant=b.dataset.value;renderCharacterForm();}else if(action==='accent'){if($('character-name'))newCharacterName=$('character-name').value;newAccent=b.dataset.value;renderCharacterForm();}else if(action==='create-character')await createCharacter(b);
    else if(action==='item')showItem(id);else if(action==='filter'){filter=b.dataset.filter;render();}else if(action==='buy')await purchase(itemById(id));else if(action==='equip')await equip(itemById(id));
    else if(action==='slot'){const eq=equippedMap()[b.dataset.slot],owned=shopItems.find(i=>slotFor(i)===b.dataset.slot&&itemOwned(i));if(eq)showItem(eq);else if(owned)showItem(owned.id);else{filter=b.dataset.slot==='skin'?'skin':'item';go('shop');toast('이 슬롯에 어울리는 아이템을 골라 보세요');}}
    else if(action==='mode-select'){go(b.dataset.mode);}else if(action==='world'){worldIndex=Number(b.dataset.index);go('stages');}else if(action==='story-stage-select'){confirmStoryStage(b.dataset.stage);}else if(action==='story-enter-confirm'){startStoryStage(b.dataset.stage);}else if(action==='story-enter-cancel'){closeDialog();}else if(action==='story-start-stage'||action==='story-lv1'){confirmStoryStage(b.dataset.stage||storyStageKey);}else if(action==='story-dialogue-next'){const lines=page==='storyEpilogue'?storyEpilogueLines:storyIntroLines;if(storyDialogueIndex<lines.length-1){storyDialogueIndex++;render();}else if(page==='storyEpilogue'){if(storyStages.find(stage=>stage.key===selectedStage)?.key===storyStages[storyStages.length-1].key)go('home');else go('story');}else startBattle();}else if(action==='story-dialogue-skip'){if(page==='storyEpilogue'){if(storyStages.find(stage=>stage.key===selectedStage)?.key===storyStages[storyStages.length-1].key)go('home');else go('story');}else startBattle();}else if(action==='stage'){selectedStage=b.dataset.stage;showMapStart();}else if(action==='start'||action==='retry')startBattle();
    else if(action==='answer')answer(Number(b.dataset.index));else if(action==='story-pick')storyPick(b);else if(action==='fever-pick')collectFeverCrystal(id);else if(action==='dismiss-reward')continueAfterFeedback();else if(action==='pause'){pause();modal('<div class="eyebrow">PAUSED</div><h2>잠깐의 휴식</h2><div class="actions pause-actions"><button class="primary" data-action="resume">계속</button><button class="secondary" data-action="leave" data-page="home">홈으로</button></div>',{closable:false});}else if(action==='resume')resume();else if(action==='leave'){closeDialog();await finishBattle(false,'leave');go(b.dataset.page);}
    else if(action==='speak')speak(run.question.entry[0]);else if(action==='result-next')resultNext();else if(action==='chest-tap')await tapChest(b);else if(action==='receive-reward')receiveReward();else if(action==='records')showRecords();else if(action==='stats')showStats();else if(action==='requests')showRequests();else if(action==='request-history')showRequestHistory();else if(action==='fulfill-reward')await fulfillReward(id,b);else if(action==='rankings')showRankings();else if(action==='wallet')modal(`<div class="eyebrow">ACCOUNT CRYSTAL WALLET</div><h2>◆ ${num(walletBalance())}</h2><p>계정의 모든 캐릭터가 함께 사용하는 크리스털이에요.<br>어떤 캐릭터로 모아도 같은 지갑에 쌓입니다.</p>`);else if(action==='profile')await showProfile();else if(action==='send-profile-code')await sendProfileCode(b);else if(action==='resend-profile-code')await sendProfileCode(b,b.dataset.email);else if(action==='verify-profile-code')await verifyProfileCode(b);else if(action==='select-profile-role')await selectProfileRole(b);else if(action==='ask-unlink-email')askUnlinkEmail();else if(action==='cancel-unlink-email')$('dialog-content').innerHTML=profileMarkup(accountProfile);else if(action==='confirm-unlink-email')await unlinkProfileEmail(b);else if(action==='signout')await signOut();
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
  $('dialog').addEventListener('cancel',event=>{event.preventDefault();if(document.querySelector('.dialog-close').hidden)return;closeDialog();if(page==='battle'&&run?.paused)resume();});
  document.addEventListener('keydown',event=>{if(page==='battle'&&!$('dialog').open&&/^[1-4]$/.test(event.key)){event.preventDefault();answer(Number(event.key)-1);}if(['storyIntro','storyEpilogue'].includes(page)&&['Enter',' ','ArrowRight'].includes(event.key)&&!event.target.closest('button')){event.preventDefault();const lines=page==='storyEpilogue'?storyEpilogueLines:storyIntroLines;if(storyDialogueIndex<lines.length-1){storyDialogueIndex++;render();}else if(page==='storyEpilogue'){if(selectedStage===storyStages[storyStages.length-1].key)go('home');else go('story');}else startBattle();}if(event.key==='Enter'&&$('player-name'))createPlayer();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&page==='battle'&&run&&!run.done&&!run.paused&&!run.feedbackPending){pause();modal('<h2>모험을 잠시 멈췄어요</h2><p>다시 준비되면 계속할 수 있어요.</p><button class="primary" data-action="resume">계속하기</button>');}});
  document.addEventListener('wordoria:native-pause',()=>{if(page==='battle'&&run&&!run.done&&!run.paused&&!run.feedbackPending){pause();modal('<h2>모험을 잠시 멈췄어요</h2><p>앱으로 돌아오면 계속할 수 있어요.</p><button class="primary" data-action="resume">계속하기</button>');}});
  document.addEventListener('wordoria:native-back',()=>{if($('dialog').open){const closeButton=document.querySelector('[data-action=close]');if(!closeButton.hidden)closeButton.click();return;}if(page==='battle'&&run&&!run.done){document.querySelector('[data-action=pause]')?.click();return;}if(page!=='home'){go('home');return;}document.dispatchEvent(new CustomEvent('wordoria:exit'));});

  loadAll().then(()=>render()).catch(error=>{console.error(error);dbOnline=false;setConnection();render();});
})();
