(async () => {
  'use strict';

  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const demo = params.get('demo') === '1';
  const localHost = ['localhost', '127.0.0.1'].includes(location.hostname);
  const nativeApp = document.documentElement.classList.contains('native-app') || Boolean(window.Capacitor?.isNativePlatform?.());
  const novelTest=demo&&localHost&&!nativeApp&&params.get('novelTest')==='world2';
  const bossTest=demo&&localHost&&!nativeApp&&['encounter','battle','victory'].includes(params.get('bossTest'))?params.get('bossTest'):null;
  const DB_URL = 'https://uobagmggryhsqlpxhfob.supabase.co';
  const DB_KEY = 'sb_publishable_NnzXTAh_47i7g5ndSzkxEQ_gy7X-lAz';
  await (window.WORDORIA_CONTENT_READY || Promise.resolve());
  if (!window.WORDORIA_SESSION && !window.WORDORIA_GUEST && document.body.classList.contains('entry-active')) {
    await new Promise(resolve => document.addEventListener('wordoria:entry', resolve, {once:true}));
  }
  const accountSession = window.WORDORIA_SESSION;
  const accountUserId = accountSession?.user?.id || null;
  const accountMode = Boolean(accountUserId) && !demo;
  const guestMode = !accountMode && !demo;
  const localMode = demo || guestMode;
  const stages = window.QUIZ_STAGES || {};
  const builtinStageKeys = Object.keys(stages).filter(key=>!stages[key].storyChapter);
  const learningLabels={elementary:'초등학생',middle:'중학생'};
  function learningLevel(){return accountMode?(accountProfile?.learning_level||'middle'):'middle';}
  function stageLevel(stage){return stage?.learningLevel||'middle';}
  function levelReady(stage){return stage&&stageLevel(stage)===learningLevel()&&stage.words.length>=4;}
  function contentEmpty(){return `<div class="notice">${learningLabels[learningLevel()]}용 맵을 준비 중이에요.</div>`;}
  const storyStages = [
    {number:1,key:'story-prologue',name:'별빛 도서관',desc:'숲으로 떠나기 전 첫 크리스털을 깨워요',intro:true,epilogue:true},
    {number:2,key:'story-lv1',name:'도서관 길목',desc:'별빛 도서관에서 숲으로 이어지는 길'},
    {number:3,key:'story-lv2',name:'속삭임의 오솔길',desc:'나무 사이에 숨은 단어 크리스털'},
    {number:4,key:'story-lv3',name:'달빛 연못',desc:'연못에 비친 숲의 수수께끼'},
    {number:5,key:'story-lv4',name:'고대 나무 터',desc:'오래된 나무가 지키는 비밀'},
    {number:6,key:'story-lv5',name:'안개 다리',desc:'안개 너머의 길을 찾아라'},
    {number:7,key:'story-lv6',name:'숲의 수정 관문',desc:'속삭이는 숲의 마지막 시험',epilogue:true},
    ...Array.from({length:7},(_,index)=>({number:index+1,chapter:2,key:`story-ch2-${index+1}`,name:['사원으로 가는 다리','빛나는 숲길','폭포 앞 크리스탈','굽이진 돌길','구름 다리의 수호석','사원 아래 오솔길','크리스탈 사원 입구'][index],desc:['첫 다리를 건너 사원으로 향해요','나무 사이에서 빛나는 크리스탈을 찾아요','폭포 소리를 들으며 단어를 연결해요','굽이진 길에서 다음 길목을 찾아요','다리 위 수호석에 담긴 단어를 깨워요','오래된 사원의 흔적을 살펴봐요','마지막 크리스탈을 깨워 사원 입구에 도착해요'][index]})),
    // Reuse the matching World 2 vocabulary until World 3's dedicated catalogs are supplied.
    ...Array.from({length:7},(_,index)=>({number:index+1,chapter:3,key:`story-ch3-${index+1}`,sourceNumber:index+8,name:['구름 위 돌다리','하늘 정원의 길','폭포 사이 길목','고대 아치 유적','수정 폭포 테라스','사원으로 오르는 계단','크리스탈 사원'][index],desc:['구름 위 돌다리에서 새로운 모험을 시작해요','햇살 가득한 하늘 정원의 크리스탈을 깨워요','폭포 사이로 이어지는 길을 따라가요','나무다리를 건너 고대 유적의 단어를 찾아요','폭포 옆 테라스의 수정을 밝혀요','계단을 올라 사원의 관문으로 향해요','마지막 크리스탈을 깨워 크리스탈 사원에 도착해요'][index]})),
    {number:8,chapter:3,key:'story-ch3-8',sourceNumber:14,name:'숨겨진 수정 동굴',desc:'구름 너머 동굴 입구의 크리스탈을 깨워요'},
    ...Array.from({length:20},(_,index)=>({number:index+1,chapter:4,key:`story-ch4-${index+1}`,sourceNumber:index+15,part:index<10?1:2,name:`${index<10?'환각의 숲':'안개의 숲과 버려진 성'} · ${index+1}단계`,desc:`WordMax Level 3 · Day ${index+11} · 30문제`})),
    // World 5 temporarily reuses the corresponding World 4 vocabulary for both learning levels.
    ...Array.from({length:20},(_,index)=>({number:index+1,chapter:5,key:`story-ch5-${index+1}`,sourceNumber:index+15,part:index<10?1:2,name:`${index===9?'소서러스':index===19?'부활한 리치 드래곤':index<10?'끝없는 수정 동굴':'수정 탄생의 지하 호수'} · ${index+1}단계`,desc:'보랏빛 수정동굴 · 월드 4 단어 임시 재사용'}))
    ,...Array.from({length:20},(_,index)=>({number:index+1,chapter:7,key:`story-ch6a-${index+1}`,sourceNumber:35+Math.floor(index/2),name:`반전세계 · ${index+1}단계`,desc:`WordMax Level 3 · Day ${Math.floor(index/2)+1} · 30단어`}))
    // World 6B shares the same per-stage vocabulary as World 6A; keep the existing stage 10 boss and record ID.
    ,...Array.from({length:20},(_,index)=>({number:index+1,chapter:6,key:`story-ch6-${index+1}`,sourceNumber:35+Math.floor(index/2),name:index===9?'왕국수도로 가는 길 · 도적 대장':`왕국수도로 가는 길 · ${index+1}단계`,desc:`WordMax Level 3 · Day ${Math.floor(index/2)+1} · 30단어${index===9?' · 도적 대장 · HP 200 · 5분 · 도끼 던지기 · 회피하기':''}`}))
  ];
  const storyWorlds=[
    {number:1,name:'속삭이는 숲',region:'WHISPERING WOODS',art:'assets/story/chapter-1-library-map.webp',positions:[['31%','59.6%'],['38.8%','69.2%'],['56.2%','75%'],['69.4%','66.4%'],['86%','54.7%'],['78.7%','43.6%'],['72.1%','31.3%']]},
    {number:2,name:'크리스탈 사원 입구',region:'CRYSTAL TEMPLE ENTRANCE',art:'assets/story/chapter-2-crystal-temple-map.webp',positions:[['14.7%','46.4%'],['34.7%','40.5%'],['54.7%','53.2%'],['77.4%','55.6%'],['93.9%','64.4%'],['36.9%','25.8%'],['56.7%','21.5%']]},
    {number:3,name:'크리스탈 사원',recordTitle:'하늘 수정 성소',region:'CRYSTAL TEMPLE',art:'assets/story/chapter-3-crystal-sanctuary-map.webp',positions:[['48.25%','83.8%'],['82.84%','67.2%'],['58.12%','55.48%'],['29.15%','46.59%'],['82.66%','47.83%'],['57.01%','38.46%'],['68.73%','25.98%'],['19.1%','18.61%']]}
,
    {"number":4,"name":"환각의 숲","recordTitle":"환각의 숲과 버려진 성","region":"ILLUSION FOREST AND ABANDONED CASTLE","positions":[["13.909%","6.445%"],["27.818%","8.496%"],["40.264%","10.742%"],["56.369%","13.965%"],["69.693%","17.09%"],["83.455%","20.996%"],["76.135%","25.586%"],["63.543%","30.42%"],["25.037%","36.182%"],["80.527%","41.357%"],["74.085%","47.949%"],["73.792%","52.979%"],["51.977%","57.227%"],["24.744%","61.182%"],["41.581%","65.234%"],["56.076%","69.58%"],["30.307%","78.027%"],["48.609%","80.566%"],["76.867%","84.375%"],["78.184%","94.873%"]],"art":"assets/story/chapter-4-illusion-forest-combined-map.webp"},
    {"number":5,"name":"보랏빛 수정동굴","region":"VIOLET CRYSTAL CAVE","art":"assets/story/chapter-5-violet-crystal-cave-map-v2.webp","positions":[["17.423%","4.883%"],["34.993%","8.154%"],["58.565%","10.352%"],["82.87%","12.354%"],["65.739%","16.309%"],["42.02%","19.531%"],["21.376%","23.389%"],["38.653%","27.881%"],["63.25%","31.738%"],["84.48%","35.4%"],["67.643%","42.676%"],["48.755%","47.021%"],["23.572%","52.539%"],["38.799%","58.301%"],["63.69%","62.207%"],["86.676%","67.236%"],["64.275%","73.047%"],["34.7%","78.906%"],["18.741%","84.668%"],["52.123%","90.039%"]]}
  ];
  // Keep World 6B’s existing chapter and record IDs; chapter 7 is the parallel World 6A branch.
  storyWorlds.push({"number":6,"displayNumber":"6B","unlockAfter":5,"name":"왕국수도로 가는 길","region":"ROAD TO THE ROYAL CAPITAL","art":"assets/story/chapter-6b-road-to-capital-20-stage-top-down.webp","positions":[["19.444%","6.543%"],["41.228%","8.594%"],["82.749%","13.965%"],["67.398%","17.92%"],["41.228%","19.873%"],["19.444%","22.998%"],["41.228%","26.123%"],["82.895%","31.494%"],["65.936%","35.156%"],["41.228%","38.135%"],["19.444%","42.139%"],["50.146%","45.02%"],["82.164%","52.393%"],["41.228%","60.107%"],["19.444%","63.867%"],["41.228%","67.578%"],["77.924%","74.17%"],["61.404%","78.369%"],["25.146%","88.818%"],["49.708%","92.627%"]]});
  storyWorlds.push({"number":7,"displayNumber":"6A","unlockAfter":5,"name":"반전세계","region":"INVERTED WORLD","art":"assets/story/chapter-6a-inverted-world-user-map.webp","positions":[["18.741%","6.738%"],["44.07%","8.936%"],["69.693%","10.986%"],["86.091%","14.893%"],["64.861%","17.48%"],["37.921%","20.41%"],["17.862%","24.072%"],["39.531%","27.686%"],["66.471%","30.518%"],["84.041%","33.789%"],["65.154%","37.402%"],["33.821%","40.674%"],["16.105%","43.799%"],["39.971%","47.9%"],["66.618%","51.855%"],["85.359%","57.129%"],["64.275%","62.5%"],["35.286%","67.236%"],["18.302%","73.877%"],["60.322%","87.354%"]]});
  function configureStoryContent(world=null){
    const level=learningLevel();
    const sources=level==='elementary'
      ?storyStages.slice(0,7).map((stage,index)=>world?.code==='7YA8'?stages[world.keys[index]]:null)
      :[1,1,2,3,4,5,1].map(number=>stages[`s${number}`]);
    storyStages.forEach((stage,index)=>{
      const chapter=stage.chapter||1,title=storyWorlds[chapter-1].name;
      const source=chapter>1?stages[`${level==='elementary'?'e':'s'}${stage.sourceNumber||stage.number+7*(chapter-1)}`]:sources[index],pool=source&&stageLevel(source)===level?source.words:[];
      const secondForestStage=chapter===1&&stage.number===2,words=pool;
      const recordName=chapter>1?`스토리 ${(chapter===7?'6A':chapter)}장 ${stage.number} · ${storyWorlds[chapter-1].recordTitle||title}`:secondForestStage?'스토리 LV.1 · 속삭이는 숲':`스토리 ${stage.number} · 속삭이는 숲`;
      stages[stage.key]={name:`${title} · ${stage.number}단계`,recordName,desc:chapter===7&&stage.number===10?stage.desc+' · 심연의 골렘 · HP 200 · 5분 · 보상 300 크리스털':chapter===5?(stage.number===20?'부활한 리치 드래곤 · HP 200 · 에너지 드레인 · 블랙 토네이토':stage.number===10?'이성을 잃은 소서러스 · HP 120 · 아이스 타임 · 힐링':`${stage.desc} · ${level==='middle'?60:40}문제`):chapter===4&&source?(stage.number===10||stage.number===20?source.desc:source.desc.replace(/\d+문제$/,`${level==='middle'?60:40}문제`)):stage.desc,questionCount:chapter===6?(stage.number===10?200:level==='middle'?60:40):chapter===7?(stage.number===10?200:level==='middle'?60:40):chapter===5?(stage.number===20?200:stage.number===10?120:level==='middle'?60:40):chapter===4&&stage.number===20?120:chapter===4&&stage.number===10?100:chapter===4?(level==='middle'?60:40):chapter===3&&stage.number===8?60:chapter>=3?(level==='middle'?35:25):chapter===2&&stage.number===7?60:(chapter>1||secondForestStage)&&level==='middle'?30:20,abyssGolem:chapter===7&&stage.number===10,banditChief:chapter===6&&stage.number===10,sorcerus:chapter===5&&stage.number===10,lichDragon:chapter===5&&stage.number===20,redReaper:chapter===4&&stage.number===20,shadowSorceress:chapter===4&&stage.number===10,guardian:chapter===2&&stage.number===7,blackDragon:chapter===3&&stage.number===8,story:true,storyChapter:chapter,storyNumber:stage.number,learningLevel:level,words,...([6,7].includes(chapter)?{source:source?.source}:{}),sourceMapId:source?.mapId,worldCode:chapter===1&&level==='elementary'?'7YA8':null};
    });
  }
  const storyStageKey=storyStages[0].key;
  let selectedStoryStage=storyStageKey;
  let selectedStoryWorld=1;
  let storyStageArmedKey=null,storyMapMoveUntil=0;
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
    group:'<path d="M4 20V9l8-5 8 5v11M8 20v-6h8v6M2 20h20"/>',
    bag:'<path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2M9 13v1m6-1v1"/>'
  };
  const classDefs = {
    warrior:{label:'전사',title:'CRYSTAL GUARDIAN',trait:'강인함 · 제한시간 +5초',skill:'수호의 방패',skillDesc:'40% 확률로 제한시간이 5초 늘어나요. 스토리에서는 5문제가 한 턴이에요.',stats:{hp:4,mp:1,atk:4,luk:2},growth:{hp:3.6,mp:2.2,atk:4.8,luk:3},paths:{male:'warrior.webp',female:'variants/warrior-female.webp'}},
    mage:{label:'마법사',title:'ARCANE SCHOLAR',trait:'타임 스톱 · 가끔 시간 정지',skill:'타임 스톱',skillDesc:'문제마다 30% 확률로 답을 선택할 때까지 시간이 멈춰요.',stats:{hp:2,mp:2,atk:6,luk:3},growth:{hp:2.6,mp:3.8,atk:5.8,luk:1.5},paths:{male:'mage.webp',female:'variants/mage-female.webp'}},
    pugilist:{label:'권투사',title:'COMBO MASTER',trait:'콤보 마스터 · 3콤보 보너스',skill:'크리스털 가방',skillDesc:'3 콤보당 보너스 +1 크리스털 지급',stats:{hp:4,mp:1,atk:3,luk:3},growth:{hp:4.1,mp:2.1,atk:4,luk:3.3},paths:{male:'variants/pugilist-male.webp',female:'pugilist.webp?v=20260921-alpha'}},
    ranger:{label:'궁수',title:'TREASURE HUNTER',trait:'보물 사냥꾼 · 상자 최소 20개',skill:'행운의 화살',skillDesc:'보물상자에서 최소 20 크리스털을 찾아요.',stats:{hp:3,mp:1,atk:3,luk:4},growth:{hp:3.1,mp:3.1,atk:3.8,luk:4},paths:{male:'variants/ranger-male.webp',female:'ranger.webp'}},
    sniper:{label:'스나이퍼',title:'WHITE SNIPER',trait:'심안의 저격 · 15% 확률로 정답 안내',skill:'심안의 저격',skillDesc:'마음의 눈으로 적을 겨냥한다. 15% 확률로 객관식 정답을 표시하고, 매칭형 정답 2쌍을 같은 색으로 알려줘요.',stats:{hp:3,mp:2,atk:4,luk:2},growth:{hp:2.9,mp:3.5,atk:5.8,luk:1.6},paths:{female:'variants/sniper-female-upper-body.webp'}}
  };
  const builtinWorlds = [
    {name:'속삭이는 숲',sub:'기초부터 도전까지 · 모든 단어가 이어지는 숲길',code:'F1A2',keys:builtinStageKeys.slice()}
  ];
  let worlds = builtinWorlds.slice(), creatorStageKeys = [], creatorContentError = '';
  const legacyVariant = {warrior:'male',mage:'male',pugilist:'female',ranger:'female',sniper:'female'};
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.aura}</svg>`;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num = value => Number(value || 0).toLocaleString('ko-KR');
  const rarityNames = {normal:'일반',special:'스페셜',rare:'레어',unique:'유니크',legendary:'레전더리'};
  const deployedAssetUrl = path => {
    if(path==='assets/avatars/skins/mage-female-starlight-rose.webp')path+='?v=20261009-illustration';
    if (!nativeApp || /^(?:https?:|data:|blob:)/i.test(path)) return path;
    const cleanPath = String(path).replace(/^\/+/, '');
    const version = encodeURIComponent(window.WORDORIA_CONTENT_VERSION || 'latest');
    return `${window.WORDORIA_CONTENT_ORIGIN}/${cleanPath}${cleanPath.includes('?') ? '&' : '?'}content=${version}`;
  };
  const creatorHref = () => {
    const url = new URL('map-creator.html', location.href);
    return `${url.pathname.split('/').pop()}${url.search}`;
  };
  const itemArt = item => item?.art_path
    ? `<img src="${esc(deployedAssetUrl(item.art_path))}" data-local-art="${esc(item.art_path)}" alt="${esc(item.name)} 아이템 아트">`
    : `<span class="item-icon-text" aria-hidden="true">${esc(item?.icon||'◆')}</span>`;
  const shuffle = input => { const a=input.slice(); for(let i=a.length-1;i;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };

  let page = accountMode || guestMode ? 'characters' : 'home', filter = 'item', worldIndex = 0, selectedStage = builtinStageKeys[0];
  let players = bossTest ? ['테스트'] : guestMode ? ['손님'] : defaultPlayers.slice(), player = bossTest ? '테스트' : guestMode ? '손님' : localStorage.getItem('fantasyQuizPlayer') || defaultPlayers[0];
  let allCharacters = [], characters = [], selectedCharacter = null, shopItems = [], inventory = [], redemptions = [], records = [], storySkillIcons = [], storySkillDefinitions = [];
  let potionInventory = {red_potion_count:0,blue_potion_count:0,equipped_slot_1:null,equipped_slot_2:null};
  let worldFourPotionClaims=null,storyPotionEvent=null;
  let dbOnline = demo, run = null, timerId = null, nextTimer = null, toastTimer = null;
  let newClass = 'warrior', newVariant = 'male', newCharacterName = '';
  let accountStoryBranch = null, storyBranchPreview = null, storyBranchSaving = false;
  let accountProfile = null, accountCrystals = 0, availableCharacterTickets = 0, characterCreating = false;
  let characterArmedId = null, characterPreviewId = null, characterSwipeStart = null, suppressCharacterClickUntil = 0;

  const demoKey = bossTest ? 'wordoria-royal-boss-test-v1' : guestMode ? 'wordoria-guest-v1' : 'wordoria-production-demo-v1';
  const localStateStorage = guestMode ? sessionStorage : localStorage;
  let demoState = {characters:[{id:'demo-mage',player:'율이',name:'블리자드',class:'mage',avatar_variant:'female',accent:'violet',coins:1250,equipped_items:{}}],records:[],inventory:[],redemptions:[],potionInventory:{},characterTickets:0};
  if(bossTest)demoState={characters:[{id:'local-boss-warrior',player:'테스트',name:'아서',class:'warrior',avatar_variant:'male',coins:1250,equipped_items:{}}],records:[],inventory:[],redemptions:[],potionInventory:{'local-boss-warrior':{red_potion_count:2,blue_potion_count:2,equipped_slot_1:'red',equipped_slot_2:'blue'}},potionLoadoutModel:1,characterTickets:0};
  if(guestMode)demoState={characters:[],records:[],inventory:[],redemptions:[],potionInventory:{},characterTickets:0};
  try { demoState = {...demoState,...JSON.parse(localStateStorage.getItem(demoKey) || '{}')}; } catch {}
  const saveDemo = () => localStateStorage.setItem(demoKey, JSON.stringify(demoState));
  if(!demoState.potionLoadoutModel){Object.values(demoState.potionInventory||{}).forEach(state=>{state.red_potion_count=Math.max(0,Number(state.red_potion_count||0)-[state.equipped_slot_1,state.equipped_slot_2].filter(type=>type==='red').length);state.blue_potion_count=Math.max(0,Number(state.blue_potion_count||0)-[state.equipped_slot_1,state.equipped_slot_2].filter(type=>type==='blue').length);});demoState.potionLoadoutModel=1;saveDemo();}
  function resetWorldFiveMidbossLocalClears(){
    if(demoState.worldFiveMidbossClearResetVersion===1)return;
    const names=['스토리 5장 10 · 보랏빛 수정동굴','스토리 5장 10 · 보랏빛 수정동굴 · 초등학생'];
    demoState.records=demoState.records.map(row=>row.cleared&&names.includes(row.stage)?{...row,cleared:false}:row);
    demoState.worldFiveMidbossClearResetVersion=1;
    saveDemo();
  }
  if(localMode)resetWorldFiveMidbossLocalClears();
  const walletBalance = () => accountMode ? accountCrystals : Number(selectedCharacter?.coins || 0);
  const emitAudio = (id, type='bgm', options) => document.dispatchEvent(new CustomEvent('wordoria:audio',{detail:{id,type,options}}));
  const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  function battleContactDelay(){
    const skinCode=itemById(equippedMap(selectedCharacter).skin)?.code;
    if(selectedCharacter?.class==='sniper'&&variantOf(selectedCharacter)==='female')return reducedMotion()?160:480;
    if(skinCode==='ranger_violet_crystal_skin'&&variantOf(selectedCharacter)==='female'&&selectedCharacter?.class==='ranger')return reducedMotion()?310:710;
    if(skinCode==='mage_starlight_rose_skin'&&variantOf(selectedCharacter)==='female'&&selectedCharacter?.class==='mage')return reducedMotion()?170:620;
    if(reducedMotion())return skinCode==='mage_arcane_necromancer_skin'?170:skinCode==='pugilist_crystal_noir_skin'?160:selectedCharacter?.class==='mage'?250:120;
    if(skinCode==='mage_arcane_necromancer_skin')return 590;
    if(skinCode==='pugilist_crystal_noir_skin')return 280;
    if(selectedCharacter?.class==='mage')return 590;
    if(skinCode==='warrior_female_golden_radiance_skin')return 480;
    if(skinCode==='warrior_golden_radiance_skin')return 420;
    return {warrior:420,mage:560,pugilist:450,ranger:560}[selectedCharacter?.class]||420;
  }
  function refreshStorySelections(){
    document.querySelectorAll?.('.story-match-item').forEach(button=>{
      const id=Number(button.dataset.id),selected=run[button.dataset.side==='ko'?'selectedKo':'selectedEn']===id;
      const matched=run.matched.has(id)||(run.redReaper&&run.pendingPair===id)||run.queuedStoryPairs?.some(pair=>pair.ko===id&&pair.en===id);
      button.classList.toggle('selected',selected);button.classList.toggle('matched',Boolean(matched));
      button.disabled=Boolean(matched||run.stunned||(run.redReaper&&((run.locked&&!run.attack)||run.paused)));
    });
  }
  function queueStorySelection(button){
    const side=button.dataset.side,id=Number(button.dataset.id);
    if(!['ko','en'].includes(side)||!run.matchEn.some(item=>item.id===id)||run.matched.has(id)||(run.redReaper&&run.pendingPair===id)||run.queuedStoryPairs?.some(pair=>pair.ko===id&&pair.en===id))return;
    run[side==='ko'?'selectedKo':'selectedEn']=id;
    if(run.selectedKo!==null&&run.selectedEn!==null){
      (run.queuedStoryPairs??=[]).push({ko:run.selectedKo,en:run.selectedEn});
      run.selectedKo=null;run.selectedEn=null;
    }
    refreshStorySelections();
  }
  function playQueuedStoryPair(){
    const pair=run.queuedStoryPairs?.shift();if(!pair)return false;
    const selectedKo=run.selectedKo,selectedEn=run.selectedEn;
    run.selectedKo=pair.ko;run.selectedEn=null;
    storyPick({dataset:{side:'en',id:String(pair.en)}});
    run.selectedKo=selectedKo;run.selectedEn=selectedEn;refreshStorySelections();
    return true;
  }
  function storyAttackDuration(arena,contact){
    const animations=arena?.querySelector('.battle-hero')?.getAnimations({subtree:true})||[];
    const ends=animations.map(animation=>animation.effect?.getComputedTiming().endTime).filter(Number.isFinite);
    return Math.max(contact+((run.crystalSpider||run.banditMob||run.golemMob)?(reducedMotion()?170:260):120),...ends,reducedMotion()?300:900);
  }
  function syncBGM(target=page){
    if(target==='battle'){emitAudio(run?.boss||run?.guardian?'BOSS_BGM':run?.story?'FOREST_BGM':run?.index===run?.deck?.length-1?'BOSS_BGM':'BATTLE_BGM','bgm',{crossfadeMs:350});return;}
    if(target==='result'&&run?.clear){emitAudio('ENDING_BGM','bgm',{crossfadeMs:420});return;}
    if(target==='result'){window.wordoriaSound?.fadeOut(300);return;}
    if(['storyChapterFiveIntro','storyChapterFiveMidbossStart','storyChapterFiveMidbossEnd','storyChapterFiveBossStart','storyChapterFiveBossEnd','story','storyIntro','storyEpilogue','storyBossVictory','storyChapterTwoIntro','storyChapterTwoBossStart','storyChapterTwoBossEnd','storyPotionEvent','storyChapterFourIntro','storyChapterFourBossStart','storyChapterFourBossEnd','storyChapterFourMidbossStart','storyChapterFourMidbossEnd','storyChapterThreeIntro','storyChapterThreeBossStart','storyChapterThreeBossEnd'].includes(target)){emitAudio('FOREST_BGM','bgm',{crossfadeMs:350});return;}
    emitAudio('MENU_BGM','bgm',{crossfadeMs:350});
  }

  const API_TIMEOUT_MS=15000;
  async function fetchWithTimeout(url,options={}){const controller=new AbortController();let timedOut=false;const timeout=setTimeout(()=>{timedOut=true;controller.abort();},API_TIMEOUT_MS);try{return await fetch(url,{...options,signal:controller.signal});}catch(error){if(timedOut)throw new Error('데이터베이스 응답 시간이 초과되었어요. 네트워크를 확인한 뒤 다시 연결해 주세요.');throw error;}finally{clearTimeout(timeout);}}
  async function headers(extra={},refresh=false) {
    let token=DB_KEY;
    if(accountMode){
      const auth=window.WORDORIA_AUTH_CLIENT.auth;
      const {data,error}=await (refresh?auth.refreshSession():auth.getSession());
      if(error)throw error;
      if(!data.session?.access_token||data.session.user?.id!==accountUserId)throw new Error('로그인 세션이 종료되었어요. 다시 로그인해 주세요.');
      token=data.session.access_token;
    }
    return {'apikey':DB_KEY,'Authorization':`Bearer ${token}`,...extra};
  }
  async function apiFetch(path,options={},extra={}){
    const url=`${DB_URL}/rest/v1/${path}`;
    let r=await fetchWithTimeout(url,{...options,headers:await headers(extra)});
    // A rejected authentication request has not executed the reward RPC.
    // Retry only 401, never an ambiguous timeout or network failure.
    if(r.status===401&&accountMode)r=await fetchWithTimeout(url,{...options,headers:await headers(extra,true)});
    if(!r.ok){const error=new Error(await r.text());error.status=r.status;throw error;}
    return r;
  }
  async function apiGet(path){const r=await apiFetch(path);return r.json();}
  async function apiPost(path,body,prefer='return=representation'){const r=await apiFetch(path,{method:'POST',body:JSON.stringify(body)},{'Content-Type':'application/json','Prefer':prefer});const text=await r.text();return text?JSON.parse(text):null;}
  const rpc = (name,body) => apiPost(`rpc/${name}`,body);
  const characterDef = c => classDefs[c?.class] || classDefs.warrior;
  const availableVariants = classCode => Object.keys((classDefs[classCode] || classDefs.warrior).paths);
  const variantOf = c => {
    const desired=c?.avatar_variant || localStorage.getItem(`fantasyQuizAvatar:${c?.id}`) || legacyVariant[c?.class] || 'male';
    return availableVariants(c?.class).includes(desired)?desired:availableVariants(c?.class)[0];
  };
  const imagePath = c => {
    const skin=itemById(equippedMap(c).skin);
    return skin?.art_path ? deployedAssetUrl(skin.art_path) : `assets/avatars/${characterDef(c).paths[variantOf(c)]}?v=20260917-skins`;
  };
  const portraitSceneClass = c => c?.class==='mage' && variantOf(c)==='female' && itemById(equippedMap(c).skin)?.code==='mage_starlight_rose_skin' ? 'starlight-rose-scene' : '';
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
    const pet=itemById(equippedMap(c).pet);
    return `<div class="portrait"><img src="${imagePath(c)}" alt="${esc(characterDef(c).label)} ${variantOf(c)==='female'?'여성':'남성'} 캐릭터">${pet?.art_path?`<img class="portrait-pet" src="${esc(deployedAssetUrl(pet.art_path))}" alt="동행 펫 ${esc(pet.name)}">`:''}</div>`;
  }
  function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2400);}
  function modal(html,{closable=true}={}){if(page==='battle'&&run&&!run.done)pause();$('dialog-content').innerHTML=html;document.querySelector('.dialog-close').hidden=!closable;if(!$('dialog').open)$('dialog').showModal();}
  function closeDialog(){if($('dialog').open)$('dialog').close();}
  function title(kicker,name,desc){return `<div class="page-title"><div class="eyebrow">${kicker}</div><h1>${name}</h1><p>${desc}</p></div>`;}
  function unique(values){const seen=new Set();return values.map(v=>String(v).trim()).filter(v=>{const k=v.toLocaleLowerCase();if(!v||seen.has(k))return false;seen.add(k);return true;});}
  function selectedRecords(character=selectedCharacter){return records.filter(r=>!character||!r.character_id||r.character_id===character.id);}
  function solvedQuestionCount(record){
    const correct=Math.max(0,Number(record.correct)||0);
    return record.cleared?Math.max(correct,Number(record.total)||0):correct;
  }
  function levelProgress(correct){
    let level=1,remaining=Math.max(0,Math.floor(Number(correct)||0));
    while(level<100){
      const required=100+Math.floor(level/10)*20;
      if(remaining<required)return {level,exp:remaining*10,expMax:required*10};
      remaining-=required;level++;
    }
    return {level:100,exp:0,expMax:0};
  }
  function stats(character=selectedCharacter){
    const rows=selectedRecords(character), answered=rows.reduce((n,r)=>n+solvedQuestionCount(r),0), correct=rows.reduce((n,r)=>n+Number(r.correct||0),0), clears=rows.filter(r=>r.cleared).length;
    const {level,exp,expMax}=levelProgress(correct);
    return {answered,correct,clears,level,exp,expMax,accuracy:answered?Math.round(correct/answered*100):0,best:rows.reduce((n,r)=>Math.max(n,Number(r.correct||0)),0)};
  }
  function combatStats(level){
    const equippedItems=Object.values(equippedMap()).map(itemById).filter(Boolean),equipped=equippedItems.length;
    const bonus={hp:0,mp:0,atk:0,luk:0};
    equippedItems.forEach(item=>{const key=item.stat_key==='def'?'hp':item.stat_key;if(Object.prototype.hasOwnProperty.call(bonus,key))bonus[key]+=Number(item.stat_value||0);});
    const {stats:base,growth:perLevel}=characterDef(selectedCharacter),growth=Math.max(0,level-1);
    const hp=base.hp*50+growth*perLevel.hp+bonus.hp,mp=base.mp*50+growth*perLevel.mp+bonus.mp,atk=base.atk*50+growth*perLevel.atk+bonus.atk,luk=base.luk*50+growth*perLevel.luk+bonus.luk;
    return {hp,mp,atk,luk,power:hp*4+mp*2+atk*12+luk*8,equipped,bonus};
  }
  function bossAttackSteps(){return Math.max(1,Math.ceil((combatStats(stats().level).atk-200)/100));}
  function stageRecordName(key){const stage=stages[key];return stage?.recordName||(stage?.name+(stageLevel(stage)==='elementary'?' · 초등학생':''));}
  function stageCleared(key){
    const name=stageRecordName(key),legacyName=stages[key]?.story?`${name} · 초등학생`:null;
    return records.some(r=>r.cleared&&(r.stage===name||(legacyName&&r.stage===legacyName))&&(!accountMode||allCharacters.some(character=>character.id===r.character_id)));
  }
  function isAdministrator(){return Boolean(accountMode&&accountProfile?.role==='admin');}
  function chosenStoryBranch(){if(localHost&&!nativeApp&&storyBranchPreview)return storyBranchPreview;return accountMode?accountStoryBranch:demoState.storyBranch||null;}
  function storyBranchAllowed(chapter){return chapter<6||isAdministrator()||chosenStoryBranch()===(chapter===7?'6A':'6B');}
  function isStoryBranchPreview(){return Boolean(localHost&&!nativeApp&&run?.lichDragon&&run.localBossSkipped&&run.done&&run.clear);}
  function needsStoryBranchChoice(){if(isStoryBranchPreview())return !storyBranchPreview;return !isAdministrator()&&!chosenStoryBranch()&&stageCleared('story-ch5-20');}
  function showStoryBranchChoice(){
    if(!needsStoryBranchChoice())return;
    modal(`<section class="story-branch-choice"><div class="eyebrow">STORY · NEXT CHAPTER</div><h2>다음 이야기를 선택해 주세요</h2><p>한 번 선택하면 되돌릴 수 없어요.<br>선택한 월드로 앞으로의 이야기가 고정됩니다.</p><div class="story-branch-options"><button class="primary" data-action="story-branch-choose" data-branch="6A">A. 반전세계로 간 소서러스의 이야기<small>월드 6A · 반전세계</small></button><button class="primary" data-action="story-branch-choose" data-branch="6B">B. 타락천사를 쫒는 아서의 이야기<small>월드 6B · 왕국수도로 가는 길</small></button></div><p class="story-branch-error" role="status"></p></section>`,{closable:false});
  }
  async function chooseStoryBranch(branch){
    if(storyBranchSaving||!needsStoryBranchChoice()||!['6A','6B'].includes(branch))return;
    storyBranchSaving=true;
    $('dialog-content').querySelectorAll('button').forEach(button=>button.disabled=true);
    try{
      if(isStoryBranchPreview()){storyBranchPreview=branch;}
      else if(accountMode){const saved=await rpc('choose_story_branch',{p_branch:branch});accountStoryBranch=saved;}
      else{demoState.storyBranch=branch;saveDemo();}
      selectedStoryWorld=chosenStoryBranch()==='6A'?7:6;selectedStoryStage=chosenStoryBranch()==='6A'?'story-ch6a-1':'story-ch6-1';
      closeDialog();go('story');
    }catch(error){
      // Another device may have committed a different choice first. Reload the server authority.
      if(accountMode){try{const rows=await apiGet(`story_branch_choices?select=branch&user_id=eq.${accountUserId}`);accountStoryBranch=rows[0]?.branch||null;}catch{}}
      if(chosenStoryBranch()){closeDialog();selectedStoryWorld=chosenStoryBranch()==='6A'?7:6;go('story');}
      else{$('dialog-content').querySelectorAll('button').forEach(button=>button.disabled=false);$('dialog-content').querySelector('[role="status"]').textContent='선택을 저장하지 못했어요. 다시 시도해 주세요.';}
    }finally{storyBranchSaving=false;}
  }
  function storyStageUnlocked(index){const stage=storyStages[index];if(!stage)return false;if(!storyBranchAllowed(stage.chapter||1))return false;if(isAdministrator()||(localHost&&!nativeApp))return true;if((stage.chapter===7||stage.chapter===6)&&stage.number===1)return stageCleared('story-ch5-20');if(stage.chapter===6&&stageCleared(stage.key))return true;return index===0||stageCleared(storyStages[index-1].key);}
  function earnedCoins(count,clear=false){const interval=selectedCharacter?.class==='pugilist'?3:5;return count+Math.floor(count/interval)+(clear?10:0);}

  function resetCreatorContent(){
    creatorStageKeys.forEach(key=>delete stages[key]);creatorStageKeys=[];creatorContentError='';
    stageKeys=builtinStageKeys.filter(key=>stageLevel(stages[key])===learningLevel());worlds=builtinWorlds.map(world=>({...world,keys:world.keys.filter(key=>stageKeys.includes(key))})).filter(world=>world.keys.length);
    configureStoryContent();
    if(worldIndex>=worlds.length)worldIndex=0;
    if(!levelReady(stages[selectedStage]))selectedStage=stageKeys[0];
  }
  function playableWords(rows){
    const seen=new Set();return rows.map(row=>({english:String(row.english||'').trim(),korean:String(row.korean||'').trim(),rowOrder:Number(row.row_order||0)})).filter(row=>{
      const key=row.english.toLocaleLowerCase('en-US');if(!key||!row.korean||seen.has(key))return false;seen.add(key);return true;
    }).sort((a,b)=>a.rowOrder-b.rowOrder).map(row=>{
      const labeled=row.korean.match(/^\[(명|동|형|부|전|접|대|감|관|조)\]\s*(.+)$/u);
      return labeled?[row.english,labeled[1],labeled[2]]:[row.english,'단어',row.korean];
    });
  }
  async function loadCreatorContent(){
    if(!accountMode)return;
    const [worldRows,mapRows,wordRows]=await Promise.all([
      apiGet('worlds?select=id,name,description,world_code&order=created_at.asc'),
      apiGet(`maps?select=id,world_id,title,description,total_question_count,visibility,status,learning_level,created_at&status=eq.published&learning_level=eq.${learningLevel()}&order=created_at.asc,id.asc`),
      apiGet('map_words?select=map_id,row_order,english,korean,review_status&review_status=eq.approved&order=map_id.asc,row_order.asc')
    ]);
    const rowsByMap=new Map();wordRows.forEach(row=>{const rows=rowsByMap.get(row.map_id)||[];rows.push(row);rowsByMap.set(row.map_id,rows);});
    const keysByWorld=new Map();
    mapRows.forEach(map=>{
      const words=playableWords(rowsByMap.get(map.id)||[]);if(words.length<4)return;
      const key=`creator:${map.id}`,questionCount=Math.max(1,Math.min(500,Number(map.total_question_count)||words.length));
      stages[key]={name:map.title,desc:map.description||`${words.length}개 단어 · 제작 맵`,words,questionCount,learningLevel:map.learning_level,creator:true,mapId:map.id,visibility:map.visibility,recordName:`제작 맵 · ${map.id}`};
      creatorStageKeys.push(key);stageKeys.push(key);
      const keys=keysByWorld.get(map.world_id)||[];keys.push(key);keysByWorld.set(map.world_id,keys);
    });
    worldRows.forEach(world=>{const keys=keysByWorld.get(world.id)||[];if(!keys.length)return;worlds.push({name:world.name,sub:world.description||`선생님이 만든 단어 모험 · ${keys.length}개 맵`,code:world.world_code,keys,creator:true,worldId:world.id});});
    configureStoryContent(worlds.find(world=>world.creator&&world.code==='7YA8'));
  }
  function buildQuestionDeck(source){
    if(source.abyssGolem)return window.WORDORIA_ABYSS_GOLEM.deck(source.words,shuffle);
    if(source.banditChief)return window.WORDORIA_BANDIT_CHIEF.deck(source.words,shuffle);
    if(source.lichDragon)return window.WORDORIA_LICH_DRAGON.deck(source.words,shuffle);
    if(source.sorcerus)return window.WORDORIA_SORCERUS.deck(source.words,shuffle);
    if(source.redReaper)return window.WORDORIA_RED_REAPER.deck(source.words,shuffle);
    if(source.shadowSorceress)return window.WORDORIA_SHADOW_SORCERESS.deck(source.words,shuffle);
    if(source.blackDragon)return window.WORDORIA_BLACK_DRAGON.deck(source.words,shuffle);
    if(source.guardian)return window.WORDORIA_GUARDIAN.deck(source.words,shuffle);
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
    if(localMode){
      allCharacters=demoState.characters;shopItems=[
        {id:23,code:'corrupted_sword',name:'타락한 검',category:'avatar',price:250,icon:'◆',description:'타락의 힘을 두른 검으로, 상대방을 쓰러트리기 위해 공격에 특화된 장비입니다.',slot:'weapon',rarity:'special',stars:2,stat_key:'atk',stat_value:9,art_path:'assets/items/equipment/item_corrupted_sword_special.webp'},
        {id:24,code:'corrupted_boots',name:'타락한 장화',category:'avatar',price:250,icon:'◆',description:'타락의 힘을 두른 장화로, 상대방을 쓰러트리기 위해 공격에 특화된 장비입니다.',slot:'feet',rarity:'special',stars:2,stat_key:'atk',stat_value:9,art_path:'assets/items/equipment/item_corrupted_boots_special.webp'},
        {id:25,code:'corrupted_helmet',name:'타락한 투구',category:'avatar',price:250,icon:'◆',description:'타락의 힘을 두른 투구로, 상대방을 쓰러트리기 위해 공격에 특화된 장비입니다.',slot:'head',rarity:'special',stars:2,stat_key:'atk',stat_value:8,art_path:'assets/items/equipment/item_corrupted_helmet_special.webp'},
        {id:26,code:'corrupted_cape',name:'타락의 망토',category:'avatar',price:250,icon:'◆',description:'타락의 힘을 두른 망토로, 상대방을 쓰러트리기 위해 공격에 특화된 장비입니다.',slot:'back',rarity:'special',stars:2,stat_key:'atk',stat_value:8,art_path:'assets/items/equipment/item_corrupted_cape_special.webp'},
        {id:27,code:'corrupted_ring',name:'타락의 반지',category:'avatar',price:250,icon:'◆',description:'타락의 힘을 두른 반지로, 상대방을 쓰러트리기 위해 공격에 특화된 장비입니다.',slot:'aura',rarity:'special',stars:2,stat_key:'atk',stat_value:8,art_path:'assets/items/equipment/item_corrupted_ring_special.webp'},
        {id:28,code:'corrupted_armor',name:'타락한 갑옷',category:'avatar',price:250,icon:'◆',description:'타락의 힘을 두른 갑옷으로, 상대방을 쓰러트리기 위해 공격에 특화된 장비입니다.',slot:'body',rarity:'special',stars:2,stat_key:'atk',stat_value:8,art_path:'assets/items/equipment/item_corrupted_armor_special.webp'},
        {id:29,code:'corrupted_staff',name:'타락한 지팡이',category:'avatar',price:400,icon:'◆',description:'타락의 힘을 두른 지팡이로, 상대방을 쓰러트리기 위해 공격에 특화된 장비입니다.',slot:'weapon',rarity:'special',stars:2,stat_key:'atk',stat_value:11,art_path:'assets/items/equipment/item_corrupted_staff_special.webp'},
        {id:21,code:'water_staff',name:'물의 지팡이',category:'avatar',price:110,icon:'◆',description:'맑은 물의 결정이 정신력을 높이는 일반 지팡이입니다.',slot:'weapon',rarity:'normal',stars:1,stat_key:'mp',stat_value:6,art_path:'assets/items/equipment/item_water_staff_normal.webp'},
        {id:22,code:'water_spellbook',name:'물의 마법서',category:'avatar',price:200,icon:'◆',description:'물의 마법이 깃든 책으로 정신력을 높이는 일반 마법서입니다.',slot:'weapon',rarity:'normal',stars:1,stat_key:'mp',stat_value:8,art_path:'assets/items/equipment/item_water_spellbook_normal.webp'},
        {id:16,code:'gale_sword',name:'질풍의 검',category:'avatar',price:100,icon:'◆',description:'가벼운 은빛 칼날과 바람의 결정이 공격을 높이는 일반 검입니다.',slot:'weapon',rarity:'normal',stars:1,stat_key:'atk',stat_value:5,art_path:'assets/items/equipment/item_gale_sword_normal.webp'},
        {id:17,code:'gale_cape',name:'질풍의 망토',category:'avatar',price:100,icon:'◆',description:'바람을 머금은 은보랏빛 천이 체력을 높이는 일반 망토입니다.',slot:'back',rarity:'normal',stars:1,stat_key:'hp',stat_value:5,art_path:'assets/items/equipment/item_gale_cape_normal.webp'},
        {id:18,code:'gale_ring',name:'질풍의 반지',category:'avatar',price:100,icon:'◆',description:'작은 바람의 결정이 정신을 높이는 일반 반지입니다. 오라 슬롯에 장착합니다.',slot:'aura',rarity:'normal',stars:1,stat_key:'mp',stat_value:5,art_path:'assets/items/equipment/item_gale_ring_normal.webp'},
        {id:19,code:'gale_armor',name:'질풍의 갑옷',category:'avatar',price:150,icon:'◆',description:'가벼운 은빛 판과 바람의 결정이 체력을 높이는 일반 갑옷입니다.',slot:'body',rarity:'normal',stars:1,stat_key:'hp',stat_value:5,art_path:'assets/items/equipment/item_gale_armor_normal.webp'},
        {id:20,code:'gale_helmet',name:'질풍의 투구',category:'avatar',price:100,icon:'◆',description:'은빛 날개 장식과 바람의 결정이 체력을 높이는 일반 투구입니다.',slot:'head',rarity:'normal',stars:1,stat_key:'hp',stat_value:5,art_path:'assets/items/equipment/item_gale_helmet_normal.webp'},
        {id:1,code:'gale_boots',name:'질풍의 장화',category:'avatar',price:100,icon:'◆',description:'첫 모험을 오래 이어갈 수 있도록 체력을 높이는 기본 장화입니다.',slot:'feet',rarity:'normal',stars:1,stat_key:'hp',stat_value:12,art_path:'assets/items/equipment/item_gale_boots_normal.webp'},
        {id:2,code:'aura',name:'민트 기억 부적',category:'avatar',price:250,icon:'◆',description:'새 단어를 기억할 때마다 마력을 채워 주는 특별한 부적입니다.',slot:'aura',rarity:'special',stars:2,stat_key:'mp',stat_value:9,art_path:'assets/items/equipment/item_mint_memory_charm_special.webp'},
        {id:3,code:'cape',name:'용기의 망토',category:'avatar',price:450,icon:'◆',description:'수정 장식과 민트 안감이 모험가를 지켜 주는 희귀 망토입니다.',slot:'back',rarity:'rare',stars:3,stat_key:'hp',stat_value:7,art_path:'assets/items/equipment/item_courage_cape_rare.webp'},
        {id:4,code:'guardian_armor',name:'수호자의 결정 갑옷',category:'avatar',price:500,icon:'◆',description:'맑은 은빛 판과 세 개의 수호 결정이 체력을 높입니다.',slot:'body',rarity:'rare',stars:3,stat_key:'hp',stat_value:11,art_path:'assets/items/equipment/item_guardian_crystal_armor_rare.webp'},
        {id:6,code:'dawn_blade',name:'새벽 결정검',category:'avatar',price:700,icon:'◆',description:'수정 날개와 공명환이 공격의 빛을 모으는 유니크 결정검입니다.',slot:'weapon',rarity:'unique',stars:4,stat_key:'atk',stat_value:16,art_path:'assets/items/equipment/item_dawn_crystal_sword_unique.webp'},
        {id:7,code:'wings',name:'하늘 결정 날개',category:'avatar',price:900,icon:'◆',description:'민트빛 핵으로 움직이는 유니크 등 장비입니다.',slot:'back',rarity:'unique',stars:4,stat_key:'luk',stat_value:6,art_path:'assets/items/equipment/item_sky_crystal_wings_unique.webp'},
        {id:8,code:'crown',name:'별빛 왕관',category:'avatar',price:1200,icon:'◆',description:'다섯 별의 축복으로 보물 발견의 행운을 높이는 왕관입니다.',slot:'head',rarity:'legendary',stars:5,stat_key:'luk',stat_value:8,art_path:'assets/items/equipment/item_starlight_crown_legendary.webp'},
        {...window.WORDORIA_PETS.catalog.find(pet=>pet.code==='pet'),id:9},
        {id:10,code:'ranger_violet_crystal_skin',name:'보랏빛 결정 궁수',category:'avatar',price:400,icon:'◆',description:'은보랏빛 트윈테일과 결정 장궁으로 모습을 바꾸는 여성 궁수 전용 스킨입니다.',slot:'skin',rarity:'unique',stars:4,stat_key:null,stat_value:0,art_path:'assets/avatars/skins/ranger-female-violet-crystal.webp'},
        {id:11,code:'pugilist_crystal_rose_skin',name:'크리스털 로즈 권투사',category:'avatar',price:400,icon:'◆',description:'장미빛 결정 건틀릿과 금장 전투복으로 모습을 바꾸는 여성 권투사 전용 스킨입니다. 전용 펀치와 피격 애니메이션이 적용됩니다.',slot:'skin',rarity:'legendary',stars:5,stat_key:null,stat_value:0,art_path:'assets/avatars/skins/pugilist-female-crystal-rose-profile-v3.webp'},
        {id:14,code:'pugilist_crystal_noir_skin',name:'크리스털 누아르 권투사',category:'avatar',price:400,icon:'◆',description:'검은 후드와 금빛 결정 건틀릿을 두른 남성 권투사 전용 스킨입니다. 전용 공격과 피격 애니메이션이 적용됩니다.',slot:'skin',rarity:'legendary',stars:5,stat_key:null,stat_value:0,art_path:'assets/avatars/skins/pugilist-male-crystal-noir-profile-complete-hood.png'},
        {id:12,code:'mage_arcane_necromancer_skin',name:'비전 네크로맨서',category:'avatar',price:400,icon:'◆',description:'해골 지팡이와 보랏빛 영혼불을 두른 남성 마법사 전용 스킨입니다. 전용 주문 공격과 피격/쓰러짐 애니메이션이 적용됩니다.',slot:'skin',rarity:'legendary',stars:5,stat_key:null,stat_value:0,art_path:'assets/avatars/skins/mage-male-arcane-necromancer-profile-v2.webp'},
        {id:15,code:'mage_starlight_rose_skin',name:'별빛 로즈 마법사',category:'avatar',price:400,icon:'◆',description:'분홍 트윈테일과 별·초승달 장식을 두른 여성 마법사 전용 스킨입니다.',slot:'skin',rarity:'legendary',stars:5,stat_key:null,stat_value:0,art_path:'assets/avatars/skins/mage-female-starlight-rose.webp'},
        {id:21,code:'sniper_snow_crystal_skin',name:'설원 결정 스나이퍼',category:'avatar',price:400,icon:'◆',description:'흰 털모자와 붉은 망토, 금장 저격총을 갖춘 여성 스나이퍼 전용 스킨입니다. 전용 대기·사격·피격 애니메이션이 적용됩니다.',slot:'skin',rarity:'legendary',stars:5,stat_key:null,stat_value:0,art_path:'assets/characters/sniper/snow-crystal-skin/char_sniper_female_snow_crystal_profile_thigh_up_v1.webp'},
        {id:13,code:'warrior_golden_radiance_skin',name:'황금빛 광휘의 검사',category:'avatar',price:400,icon:'◆',description:'황금 결정과 성광 대검을 든 남성 전사 전용 스킨입니다. 전용 대검 공격과 피격/쓰러짐 애니메이션이 적용됩니다.',slot:'skin',rarity:'legendary',stars:5,stat_key:null,stat_value:0,art_path:'assets/avatars/skins/warrior-male-golden-radiance.webp'},
      ];shopItems.push(...window.WORDORIA_PETS.catalog.filter(pet=>pet.code!=='pet').map(pet=>({...pet,id:`local-${pet.code}`})));shopItems.sort((a,b)=>a.price-b.price);records=demoState.records;storySkillIcons=[
        {code:'guardian_crystal',label:'수호 결정',icon_key:'shield',gem_color:'#e4e1ff',glow_color:'#c9c4ff',icon_color:'#5751D8'},
        {code:'time_crystal',label:'시간 결정',icon_key:'hourglass',gem_color:'#d9f8f2',glow_color:'#a5e5dc',icon_color:'#2d958b'},
        {code:'combo_crystal',label:'위빙 스텝',icon_key:'combo',asset_path:'assets/ui/skills/active-pugilist-weaving-step.png',gem_color:'#d9f8f2',glow_color:'#60D9CF',icon_color:'#5751D8'},
        {code:'fortune_crystal',label:'행운 결정',icon_key:'arrow',gem_color:'#d9f8f2',glow_color:'#a5e5dc',icon_color:'#2d958b'}
      ];storySkillDefinitions=[
        {class_code:'warrior',skill_code:'guardian_time',skill_name:'수호의 시간',description:'40% 확률로 제한시간을 5초 늘려요. 스토리에서는 5문제가 한 턴이에요.',icon_code:'guardian_crystal'},
        {class_code:'mage',skill_code:'time_stop',skill_name:'타임 스톱',description:'문제마다 30% 확률로 답을 선택할 때까지 시간이 멈춰요.',icon_code:'time_crystal'},
        {class_code:'pugilist',skill_code:'weaving_step',skill_name:'위빙 스텝',description:'MP 1을 소모해 다음 오답 한 번의 HP 감소와 콤보 초기화를 막아요. 틀린 문제는 다시 풀어야 해요.',icon_code:'combo_crystal'},
        {class_code:'ranger',skill_code:'lucky_arrow',skill_name:'행운의 화살',description:'보물상자에서 최소 20 크리스털을 찾아요.',icon_code:'fortune_crystal'}
      ];dbOnline=true;
    } else {
      try {
        if(accountMode){
          const profileController=new AbortController(),profileTimeout=setTimeout(()=>profileController.abort(),API_TIMEOUT_MS);
          let profileResult;
          try{profileResult=await window.WORDORIA_AUTH_CLIENT.from('profiles').select('display_name,login_id,role,learning_level,crystal_balance').eq('user_id',accountUserId).abortSignal(profileController.signal).single();}finally{clearTimeout(profileTimeout);}
          if(profileResult.error)throw profileResult.error;
          if(profileResult.data){accountProfile=profileResult.data;accountCrystals=Number(profileResult.data.crystal_balance||0);player=profileResult.data.login_id||profileResult.data.display_name||player;}
        }
        [allCharacters,shopItems,records]=await Promise.all([
          apiGet(`game_characters?select=*${accountMode?`&owner_user_id=eq.${accountUserId}`:''}&order=created_at.asc`),
          apiGet('shop_items?select=id,code,name,category,price,icon,description,repeatable,slot,rarity,stars,stat_key,stat_value,art_path&active=eq.true&order=price.asc'),
          apiGet('game_scores?select=player,stage,correct,total,cleared,created_at,character_id,duration_ms,coins_earned,id&order=created_at.desc&limit=1000')
        ]);
        if(accountMode){const choices=await apiGet(`story_branch_choices?select=branch&user_id=eq.${accountUserId}`);accountStoryBranch=choices[0]?.branch||null;await loadAccountStoryVitals();}
        dbOnline=true;
        try{[storySkillIcons,storySkillDefinitions]=await Promise.all([
          apiGet('story_skill_icons?select=code,label,icon_key,asset_path,gem_color,glow_color,icon_color&active=eq.true&order=code.asc'),
          apiGet('story_skill_definitions?select=class_code,skill_code,skill_name,description,icon_code&active=eq.true&order=class_code.asc')
        ]);}catch(error){storySkillIcons=[];storySkillDefinitions=[];console.warn('Story skill icon catalog unavailable; using built-in defaults.',error);}
        if(accountMode){const tickets=await apiGet(`character_creation_tickets?select=id&owner_user_id=eq.${accountUserId}&consumed_by_character_id=is.null`);availableCharacterTickets=tickets.length;}
      } catch(error){console.error(error);dbOnline=false;allCharacters=[];shopItems=[];records=[];storySkillIcons=[];storySkillDefinitions=[];}
      resetCreatorContent();
      if(accountMode&&dbOnline){try{await loadCreatorContent();}catch(error){console.error(error);creatorContentError='제작 월드 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.';}}
    }
    players=accountMode||guestMode?[player]:unique(defaultPlayers.concat(allCharacters.map(c=>c.player),readCustomPlayers()));
    if(!players.includes(player))player=players[0];
    chooseCharacter();await loadCharacterExtras();await loadWorldFourPotionClaims();setConnection();
  }
  function readCustomPlayers(){try{const v=JSON.parse(localStorage.getItem('fantasyQuizPlayers')||'[]');return Array.isArray(v)?v:[];}catch{return [];}}
  function chooseCharacter(){
    characters=accountMode?allCharacters.slice():allCharacters.filter(c=>c.player===player);
    const saved=localStorage.getItem(`fantasyQuizCharacter:${player}`);
    selectedCharacter=characters.find(c=>c.id===saved)||characters[0]||null;
    if(selectedCharacter)localStorage.setItem(`fantasyQuizCharacter:${player}`,selectedCharacter.id);
  }
  async function loadCharacterExtras(){
    if(!selectedCharacter){inventory=[];redemptions=[];potionInventory={red_potion_count:0,blue_potion_count:0,equipped_slot_1:null,equipped_slot_2:null};return;}
    if(localMode){inventory=demoState.inventory.filter(x=>x.character_id===selectedCharacter.id);redemptions=demoState.redemptions.filter(x=>x.character_id===selectedCharacter.id);potionInventory={red_potion_count:selectedCharacter.id==='demo-mage'?Number(demoState.redPotions||0):0,blue_potion_count:0,equipped_slot_1:null,equipped_slot_2:null,...(demoState.potionInventory?.[selectedCharacter.id]||{})};return;}
    if(!dbOnline)return;
    try{const cutoff=new Date(Date.now()-30*24*60*60*1000).toISOString();const [owned,pending,completed,potions]=await Promise.all([
      apiGet(`character_inventory?select=item_id,character_id&character_id=eq.${selectedCharacter.id}`),
      apiGet(`reward_redemptions?select=id,item_id,status,price_paid,created_at,fulfilled_at&character_id=eq.${selectedCharacter.id}&status=in.(pending,approved)&order=created_at.desc`),
      apiGet(`reward_redemptions?select=id,item_id,status,price_paid,created_at,fulfilled_at&character_id=eq.${selectedCharacter.id}&status=eq.fulfilled&fulfilled_at=gte.${cutoff}&order=fulfilled_at.desc`),
      rpc('get_story_potion_inventory',{p_character_id:selectedCharacter.id})
    ]);inventory=owned;redemptions=[...pending,...completed];potionInventory=potions?.[0]||{red_potion_count:0,blue_potion_count:0,equipped_slot_1:null,equipped_slot_2:null};}catch(error){console.error(error);inventory=[];redemptions=[];potionInventory={red_potion_count:0,blue_potion_count:0,equipped_slot_1:null,equipped_slot_2:null};}
  }
  function setConnection(){$('connection-status').textContent=guestMode?'손님 모드 · 이 탭에 저장됩니다':localMode?'체험 모드 · 이 브라우저에 저장됩니다':dbOnline?'● 운영 Supabase 연결됨':'데이터베이스 연결이 지연되거나 실패했어요';$('connection-status').classList.toggle('connection-error',!dbOnline);}
  async function loadWorldFourPotionClaims(){
    worldFourPotionClaims=null;
    if(localMode){worldFourPotionClaims=new Set(demoState.worldFourPotionClaims?.[player]||[]);return;}
    if(!accountMode||!dbOnline)return;
    try{const rows=await apiGet('world_four_potion_rewards?select=milestone');worldFourPotionClaims=new Set(rows.map(row=>Number(row.milestone)));}
    catch{toast('탐험 보급 기록을 불러오지 못했어요. 스토리 화면에서 다시 확인해 주세요.');}
  }
  function beginWorldFourPotionEvent(){
    if(selectedStoryWorld!==4||!selectedCharacter||!worldFourPotionClaims)return false;
    const milestone=[4,8,12,16].find(number=>!worldFourPotionClaims.has(number)&&Array.from({length:number},(_,index)=>`story-ch4-${index+1}`).every(stageCleared));
    if(!milestone)return false;
    storyPotionEvent={milestone,characterId:selectedCharacter.id,busy:false,error:false};storyDialogueIndex=0;
    return true;
  }
  function renderStoryPotionEvent(){
    if(storyPotionEvent?.error)return '<section class="result"><h1>물약을 아직 받지 못했어요</h1><p>연결을 확인하고 다시 받아 주세요. 중복 지급 없이 처리됩니다.</p><button class="primary" data-action="world-four-potion-retry">힐링포션 3개 받기 다시 시도</button></section>';
    if(storyPotionEvent?.busy)return '<section class="result" role="status" aria-live="polite"><h1>발견한 물약을 챙기는 중…</h1><p>힐링포션 3개를 가방에 넣고 있어요.</p></section>';
    return renderStoryScene(storyDialogueLines(),'월드 4 · 탐험 보급','힐링포션 3개 받기 →');
  }
  async function claimWorldFourPotionEvent(){
    const event=storyPotionEvent;
    if(!event||event.busy||event.characterId!==selectedCharacter?.id)return;
    event.busy=true;event.error=false;render();
    try{
      let count=3;
      if(localMode){
        const claimed=new Set(demoState.worldFourPotionClaims?.[player]||[]);
        if(claimed.has(event.milestone))count=0;
        else{
          const current=demoState.potionInventory?.[event.characterId]||potionInventory;
          const next={...current,red_potion_count:Number(current.red_potion_count||0)+3};
          claimed.add(event.milestone);
          const previousClaims=demoState.worldFourPotionClaims,previousInventory=demoState.potionInventory;
          demoState.worldFourPotionClaims={...(previousClaims||{}),[player]:[...claimed]};
          demoState.potionInventory={...(previousInventory||{}),[event.characterId]:next};
          try{saveDemo();}catch(error){demoState.worldFourPotionClaims=previousClaims;demoState.potionInventory=previousInventory;throw error;}
          potionInventory=next;
        }
      }else{
        const result=await rpc('claim_world_four_potion_event',{p_character_id:event.characterId,p_milestone:event.milestone});
        if(!result||result.milestone!==event.milestone||!result.inventory)throw new Error('potion reward unavailable');
        count=Number(result.potion_count);
        if(selectedCharacter?.id===event.characterId)potionInventory=result.inventory;
      }
      worldFourPotionClaims.add(event.milestone);
      if(storyPotionEvent===event){storyPotionEvent=null;go('story');toast(count?'힐링포션 3개를 가방에 넣었어요!':'이미 받은 탐험 보급이에요.');}
    }catch{event.error=true;if(storyPotionEvent===event&&page==='storyPotionEvent')render();}
    finally{event.busy=false;}
  }
  async function refresh(){await loadAll();render();}

  let storyDialogueIndex = 0;
  const storyChapterTwoLines=window.WORDORIA_NOVELS.world2Prologue;
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
  const storyBossEncounterLines = [
  {
    "speaker": "내레이션",
    "className": "scene",
    "text": "수많은 적을 쓰러뜨린 아서 일행은 마침내 7번째 관문을 클리어했다."
  },
  {
    "speaker": "파이터",
    "className": "fighter",
    "text": "드디어 7번째 스테이지를 클리어했어"
  },
  {
    "speaker": "소서러스",
    "className": "mage",
    "text": "다들 준비해. 지금까지 얻은 스킬과 아이템을 잘 활용해야 해."
  },
  {
    "speaker": "아서",
    "className": "warrior",
    "text": "조심해!"
  },
  {
    "speaker": "내레이션",
    "className": "scene",
    "text": "쿵!! 바닥이 흔들리더니 거대한 슬라임이 일행의 앞을 가로막는다."
  },
  {
    "speaker": "거대 로얄 슬라임",
    "className": "demon",
    "text": "너희들은 여기서 더 이상 못 지나간다!"
  },
  {
    "speaker": "내레이션",
    "className": "scene",
    "text": "거대 로얄 슬라임이 순식간에 몸을 부풀려 소서러스를 강하게 날려버린다."
  },
  {
    "speaker": "소서러스",
    "className": "mage",
    "text": "으악!"
  },
  {
    "speaker": "내레이션",
    "className": "scene",
    "text": "소서러스는 곧바로 마법을 사용해 공중에서 몸을 바로잡고 안전하게 착지한다."
  },
  {
    "speaker": "소서러스",
    "className": "mage",
    "text": "내 마나만 충분했다면 상대할 수 있을 텐데……."
  },
  {
    "speaker": "내레이션",
    "className": "scene",
    "text": "잠시 고민하던 소서러스의 눈이 번쩍인다."
  },
  {
    "speaker": "소서러스",
    "className": "mage",
    "text": "맞다! 마나 물약!"
  },
  {
    "speaker": "내레이션",
    "className": "scene",
    "text": "소서러스는 가방에서 마나 물약을 꺼내 단숨에 마신다."
  },
  {
    "speaker": "내레이션",
    "className": "scene",
    "text": "한편, 거대 로얄 슬라임과 싸우고 있는 일행. 파이터는 이미 바닥에 쓰러져 있었다."
  },
  {
    "speaker": "파이터",
    "className": "fighter",
    "text": "너무 강해……."
  },
  {
    "speaker": "내레이션",
    "className": "scene",
    "text": "바이올렛은 계속해서 화살을 쏘지만 거대 로얄 슬라임에게 제대로 된 피해를 주지 못한다."
  },
  {
    "speaker": "바이올렛",
    "className": "ranger",
    "text": "내 화살도 안 먹혀……! 무기만 빼앗기지 않았어도……."
  },
  {
    "speaker": "내레이션",
    "className": "scene",
    "text": "결국 남은 것은 아서뿐. 아서는 혼자 거대 로얄 슬라임의 공격을 막으며 버티고 있다."
  },
  {
    "speaker": "아서",
    "className": "warrior",
    "text": "소서러스! 대체 어디로 간 거야!!"
  },
  {
    "speaker": "소서러스",
    "className": "mage",
    "text": "다들 비켜!"
  },
  {
    "speaker": "내레이션",
    "className": "scene",
    "text": "소서러스가 전장으로 돌아온다."
  },
  {
    "speaker": "소서러스",
    "className": "mage",
    "text": "전체 힐!"
  },
  {
    "speaker": "내레이션",
    "className": "scene",
    "text": "파아앗—! 강렬한 빛이 전장을 뒤덮고, 쓰러졌던 동료들의 체력이 빠르게 회복된다."
  },
  {
    "speaker": "파이터",
    "className": "fighter",
    "text": "오…… 다시 힘이 돌아왔어!"
  },
  {
    "speaker": "소서러스",
    "className": "mage",
    "text": "하지만 시간이 없어! 이 마나 물약의 효과는 5분뿐이야! 그 안에 저 녀석을 쓰러뜨려야 해!"
  },
  {
    "speaker": "아서",
    "className": "warrior",
    "text": "……!"
  },
  {
    "speaker": "내레이션",
    "className": "scene",
    "text": "아서는 깨닫는다. 수많은 전투를 거치며 얻어온 능력들, 그리고 아직 제대로 활용하지 못했던 각자의 스킬. 아서가 검을 들어 올린다."
  },
  {
    "speaker": "아서",
    "className": "warrior",
    "text": "얘들아!"
  },
  {
    "speaker": "내레이션",
    "className": "scene",
    "text": "모두가 아서를 바라본다."
  },
  {
    "speaker": "아서",
    "className": "warrior",
    "text": "스킬을 써!!"
  },
  {
    "speaker": "파이터",
    "className": "fighter",
    "text": "스……킬?"
  },
  {
    "speaker": "내레이션",
    "className": "scene",
    "text": "파이터의 눈앞에 익숙한 스킬 아이콘이 떠오른다. 다른 동료들의 스킬도 하나둘 활성화되기 시작한다."
  },
  {
    "speaker": "BOSS BATTLE — 거대 로얄 슬라임",
    "className": "scene",
    "text": "제한 시간 05:00. 정답 50개로 거대 로얄 슬라임을 쓰러뜨려라! 25문제 남으면 시간 흡수로 30초를 빼앗긴다. 지금까지 획득한 스킬과 아이템을 활용하자!"
  }
];
  const storyBossVictoryLines = [
  {
    "speaker": "아서",
    "className": "warrior",
    "text": "설명할 시간 없으니까 빨리! 나부터 쓴다! 소드 클로!"
  },
  {
    "speaker": "거대 로얄 슬라임",
    "className": "demon",
    "text": "크윽……ㅋㅋㅋ 재미있겠군. 하지만 한낱 스킬이 있다고 너희가 뭘 할 수 있지……?"
  },
  {
    "speaker": "소서러스",
    "className": "mage",
    "text": "전투는 이제부터 시작이야! 마나 20배 물약 소모! 익스플로젼 매테오!"
  },
  {
    "speaker": "거대 로얄 슬라임",
    "className": "demon",
    "text": "크악……!"
  },
  {
    "speaker": "바이올렛",
    "className": "ranger",
    "text": "에로우 레인!"
  },
  {
    "speaker": "거대 로얄 슬라임",
    "className": "demon",
    "text": "크아악!"
  },
  {
    "speaker": "파이터",
    "className": "fighter",
    "text": "파워 잽!"
  },
  {
    "speaker": "거대 로얄 슬라임",
    "className": "demon",
    "text": "크으으윽!"
  },
  {
    "speaker": "내레이션",
    "className": "scene",
    "text": "일행의 공격을 받은 거대 로얄 슬라임이 쓰러졌다."
  },
  {
    "speaker": "거대 로얄 슬라임",
    "className": "demon",
    "text": "하지만 이 정도로는……."
  },
  {
    "speaker": "소서러스",
    "className": "mage",
    "text": "아직 끝이 아니야! 아까 20배 물약을 마신 힘을 보여주지…… 네크로맨서로 변신!"
  },
  {
    "speaker": "내레이션",
    "className": "mage",
    "text": "빛이 번쩍이더니 소서러스가 네크로맨서로 변했다.",
    "artPath": "assets/avatars/skins/mage-male-arcane-necromancer-profile-v2.webp",
    "flash": true
  },
  {
    "speaker": "네크로맨서 소서러스",
    "className": "mage",
    "text": "데스 익스플로젼!!!",
    "artPath": "assets/avatars/skins/mage-male-arcane-necromancer-profile-v2.webp"
  },
  {
    "speaker": "거대 로얄 슬라임",
    "className": "demon",
    "text": "크아아아악!!!!"
  },
  {
    "speaker": "내레이션",
    "className": "mage",
    "text": "거대 로얄 슬라임을 쓰러뜨린 소서러스가 원래 모습으로 돌아왔다.",
    "flash": true
  },
  {
    "speaker": "소서러스",
    "className": "mage",
    "text": "얘들아, 가자. 크리스탈 사원으로…… 아, 경험치 챙기자!"
  },
  {
    "speaker": "내레이션",
    "className": "scene",
    "text": "모두가 200 크리스탈을 획득했다."
  },
  {
    "speaker": "모두",
    "className": "party",
    "text": "가자, 크리스탈 사원으로!"
  }
];
  let pendingStoryRun=null;
  function bossEncounter(){return page==='storyEpilogue'&&(stages[selectedStage]?.storyChapter||1)===1&&stages[selectedStage]?.storyNumber===7;}
  function completeStoryDialogue(){if(page==='storyPotionEvent'){claimWorldFourPotionEvent();return;}if(page==='storyChapterFiveBossEnd'){if(run?.lichDragon&&run.done&&run.clear){go('bossResult');if(run.localBossSkipped)showStoryBranchChoice();else claimGuardianReward();}return;}if(page==='storyChapterFiveMidbossEnd'){if(run?.done&&run.clear)go('result');return;}if(page==='storyChapterFourBossEnd'){if(run?.done&&run.clear){if(run.redReaper){go('bossResult');claimGuardianReward();}else go('result');}return;}if(page==='storyChapterFourMidbossEnd'){if(run?.done&&run.clear){if(run.shadowSorceress){go('bossResult');claimGuardianReward();}else go('result');}return;}if(page==='storyChapterThreeBossEnd'){if(run?.blackDragon){go('bossResult');claimGuardianReward();}return;}if(page==='storyChapterTwoBossEnd'){if(run?.guardian){go('bossResult');claimGuardianReward();}else go('result');return;}if(page==='storyBossVictory'){completeRoyalSlimeVictoryStory();return;}if(bossEncounter())startRoyalSlimeBattle();else if(page==='storyEpilogue')go('result');else startBattle();}
  function storyDialogueLines(){if(page==='storyPotionEvent')return window.WORDORIA_NOVELS[`world4Potion${storyPotionEvent.milestone}`];return page==='storyChapterFiveBossEnd'?window.WORDORIA_NOVELS.world5BossEnd:page==='storyChapterFiveIntro'?window.WORDORIA_NOVELS.world5Prologue:page==='storyChapterFiveMidbossStart'?window.WORDORIA_NOVELS.world5MidbossStart:page==='storyChapterFiveMidbossEnd'?window.WORDORIA_NOVELS.world5MidbossEnd:page==='storyChapterFiveBossStart'?window.WORDORIA_NOVELS.world5BossStart:page==='storyChapterFourBossEnd'?window.WORDORIA_NOVELS.world4BossEnd:page==='storyChapterFourBossStart'?window.WORDORIA_NOVELS.world4BossStart:page==='storyChapterFourMidbossEnd'?window.WORDORIA_NOVELS.world4MidbossEnd:page==='storyChapterFourMidbossStart'?window.WORDORIA_NOVELS.world4MidbossStart:page==='storyChapterFourIntro'?window.WORDORIA_NOVELS.world4Prologue:page==='storyChapterThreeBossStart'?window.WORDORIA_NOVELS.world3BossStart:page==='storyChapterThreeBossEnd'?window.WORDORIA_NOVELS.world3BossEnd:page==='storyChapterThreeIntro'?window.WORDORIA_NOVELS.world3Prologue:page==='storyChapterTwoBossStart'?window.WORDORIA_NOVELS.world2BossStart:page==='storyChapterTwoBossEnd'?window.WORDORIA_NOVELS.world2BossEnd:page==='storyChapterTwoIntro'?storyChapterTwoLines:page==='storyBossVictory'?storyBossVictoryLines:page==='storyEpilogue'?epilogueLines():storyIntroLines;}
  function epilogueLines(){return stages[selectedStage]?.storyNumber===7?storyBossEncounterLines:storyEpilogueLines;}
  function renderStoryScene(lines,location,finalLabel){
    const line=lines[storyDialogueIndex], end=storyDialogueIndex===lines.length-1;
    const classKey=line.className==='party'||line.className==='fighter'?'pugilist':line.className;
    const variant=classKey==='mage'?'male':classKey==='ranger'?'female':line.className==='fighter'?'male':classKey==='warrior'?'male':'female';
    const image=(path,name,cls='story-vn-character')=>`<img class="${cls}" src="${esc(deployedAssetUrl(path))}" alt="${esc(name)}">`;
    let speakerArt='';
    if(line.speaker==='거대 로얄 슬라임')speakerArt=image('assets/monsters/royal-slime/royal-slime-standing.png',line.speaker,'story-vn-boss-cg');
    else if(line.className==='duo')speakerArt=`<div class="story-vn-duo">${image('assets/avatars/warrior.webp','아서')}${image('assets/avatars/mage.webp','소서러스')}</div>`;
    else if(line.artPath||line.sceneArt)speakerArt=image(line.artPath||line.sceneArt,line.sceneArt?(line.sceneArtName||'크리스탈 골렘'):line.speaker,`story-vn-character ${line.className} ${line.sceneArt?(line.sceneArtClass||'golem'):''}`);
    else if(classDefs[classKey])speakerArt=image(`assets/avatars/${classDefs[classKey].paths[variant]}?v=20260917-skins`,line.speaker,`story-vn-character ${line.className}`);
    const chapterTwo=['storyChapterTwoIntro','storyChapterTwoBossStart','storyChapterTwoBossEnd'].includes(page);
    const chapterThree=page==='storyChapterThreeIntro';
    const chapterFive=['storyChapterFiveIntro','storyChapterFiveMidbossStart','storyChapterFiveMidbossEnd','storyChapterFiveBossStart','storyChapterFiveBossEnd'].includes(page);
    const chapterFour=['storyPotionEvent','storyChapterFourIntro','storyChapterFourBossStart','storyChapterFourBossEnd','storyChapterFourMidbossStart','storyChapterFourMidbossEnd'].includes(page);
    const bossStartScene=page==='storyChapterThreeBossEnd'?'world-three-cave-scene':page==='storyChapterThreeBossStart'?({5:'world-three-cave-scene',6:'world-three-mine-scene',7:'world-three-lich-dragon-scene'}[line.sceneNumber]):null;
    const scene=chapterFive?'violet-cave-scene':chapterFour?`illusion-scene${page==='storyChapterFourMidbossStart'||line.sceneNumber>=3||line.text.includes('환각이 걷히기')?' illusion-cleared-scene':''}`:bossStartScene||(['storyChapterThreeBossStart','storyChapterThreeBossEnd'].includes(page)?'black-dragon-scene':chapterThree?(line.scene==='festival'?'crystal-festival-scene':'crystal-village-scene'):chapterTwo?(line.scene==='temple'?'temple-scene':'crystal-gate-scene'):page==='storyIntro'?'library-scene':stages[selectedStage]?.storyNumber===7?'crystal-gate-scene':'forest-scene');
    const sceneLabel=chapterFive||chapterFour||chapterThree?line.location:chapterTwo?(line.className==='mission'?'크리스탈 사원 입구 · STAGE START':line.scene==='temple'?'크리스탈 사원':'크리스탈 사원으로 가는 길'):location;
    return `<section class="story-vn ${chapterFive?'story-vn-chapter-five':chapterFour?'story-vn-chapter-four':chapterThree?'story-vn-chapter-three':chapterTwo?'story-vn-chapter-two':''}" data-action="story-dialogue-next" tabindex="0" aria-label="스토리 대화, 눌러서 계속"><div class="story-vn-scene ${scene} ${line.shake?'story-vn-quake':''}"${line.backgroundPath?` style="background-image:url('${esc(deployedAssetUrl(line.backgroundPath))}')"`: ''}><span class="story-vn-orb" aria-hidden="true">◆</span><span class="story-vn-forest">${esc(sceneLabel)}</span>${speakerArt}${line.flash?'<span class="story-vn-transformation-flash" aria-hidden="true"></span>':''}</div><div class="story-vn-dialogue"><span class="story-vn-speaker ${line.className}">${esc(line.speaker)}</span><p>${esc(line.text)}</p><span class="story-vn-progress">${storyDialogueIndex+1} / ${lines.length} <b>${end?finalLabel:'계속 →'}</b></span></div><button class="story-vn-skip" data-action="story-dialogue-skip">대화 건너뛰기</button></section>`;
  }
  const renderStoryIntro=()=>renderStoryScene(storyIntroLines,'대마법 도서관 · 프롤로그','전투 시작 →');
  const renderStoryEpilogue=()=>renderStoryScene(epilogueLines(),stages[selectedStage]?.storyNumber===7?'숲의 수정 관문 · 거대 로얄 슬라임':'속삭이는 숲 · 에필로그',stages[selectedStage]?.storyNumber===7?'보스전 시작 →':'결과 확인 →');

  const renderStoryChapterThreeBossStart=()=>renderStoryScene(window.WORDORIA_NOVELS.world3BossStart,'숨겨진 수정 동굴 · 블랙 드래곤','보스전 시작 →');
  const renderStoryChapterThreeBossEnd=()=>renderStoryScene(window.WORDORIA_NOVELS.world3BossEnd,'숨겨진 수정 동굴 · 승리','보상 확인 →');
  const renderStoryChapterFourMidbossEnd=()=>renderStoryScene(window.WORDORIA_NOVELS.world4MidbossEnd,'환각의 땅 · 쉐도우 소서러스 격파','결과 확인 →');
  const renderStoryChapterFourMidbossStart=()=>renderStoryScene(window.WORDORIA_NOVELS.world4MidbossStart,'환각의 땅 · 쉐도우 소서러스','중간보스 전투 시작 →');
  const renderStoryChapterFourBossEnd=()=>renderStoryScene(window.WORDORIA_NOVELS.world4BossEnd,'환각의 땅 · 붉은 사신 격파','결과 확인 →');
  const renderStoryChapterFourBossStart=()=>renderStoryScene(window.WORDORIA_NOVELS.world4BossStart,'환각의 땅 · 붉은 사신','보스 전투 시작 →');
  const renderStoryChapterFiveIntro=()=>renderStoryScene(window.WORDORIA_NOVELS.world5Prologue,'보랏빛 수정동굴 · 프롤로그','전투 시작 →');
  const renderStoryChapterFiveMidbossStart=()=>renderStoryScene(window.WORDORIA_NOVELS.world5MidbossStart,'보랏빛 수정동굴 · 소서러스','전투 시작 →');
  const renderStoryChapterFiveMidbossEnd=()=>renderStoryScene(window.WORDORIA_NOVELS.world5MidbossEnd,'보랏빛 수정동굴 · 소서러스 격파','결과 확인 →');
  const renderStoryChapterFiveBossEnd=()=>renderStoryScene(window.WORDORIA_NOVELS.world5BossEnd,'보랏빛 수정동굴 · 탈출','보상 확인 →');
  const renderStoryChapterFiveBossStart=()=>renderStoryScene(window.WORDORIA_NOVELS.world5BossStart,'보랏빛 수정동굴 · 부활한 리치 드래곤','전투 시작 →');
  const renderStoryChapterFourIntro=()=>renderStoryScene(window.WORDORIA_NOVELS.world4Prologue,'환각의 땅 · 프롤로그','전투 시작 →');
  const renderStoryChapterThreeIntro=()=>renderStoryScene(window.WORDORIA_NOVELS.world3Prologue,'크리스탈 마을 · 프롤로그','전투 시작 →');
  const renderStoryChapterTwoIntro=()=>renderStoryScene(storyChapterTwoLines,'크리스탈 사원 · 프롤로그','전투 시작 →');
  const renderStoryChapterTwoBossStart=()=>renderStoryScene(window.WORDORIA_NOVELS.world2BossStart,'크리스탈 사원 · 보스','보스전 시작 →');
  const renderStoryChapterTwoBossEnd=()=>renderStoryScene(window.WORDORIA_NOVELS.world2BossEnd,'크리스탈 사원 · 최후의 일격','보상 확인 →');
  const renderStoryBossVictory=()=>renderStoryScene(storyBossVictoryLines,'속삭이는 숲 · 승리의 여정','보상 확인 →');

  function render(){
    if(!run?.done)persistStoryBattleVitals();
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
    $('topbar-action').innerHTML=`${contextAction}<button class="profile-button" data-action="profile" aria-label="내 프로필과 계정 설정" title="내 프로필">${icon('profile')}<i aria-hidden="true"></i></button>${storyAudioButton('topbar-audio-toggle')}`;
    const active=['survival','story','stages','battle','result'].includes(page)?'dungeon':page==='bossResult'?'dungeon':page;
    const nav=$('nav');
    nav.hidden=page==='storyPotionEvent'||page==='storyChapterFiveIntro'||page==='storyChapterFiveMidbossStart'||page==='storyChapterFiveMidbossEnd'||page==='storyChapterFiveBossStart'||page==='storyChapterFiveBossEnd'||page==='storyChapterFourBossEnd'||page==='storyChapterFourBossStart'||page==='storyChapterFourMidbossEnd'||page==='storyChapterFourMidbossStart'||page==='storyChapterFourIntro'||page==='storyChapterThreeBossStart'||page==='storyChapterThreeBossEnd'||page==='storyChapterThreeIntro'||page==='battle'||page==='characters'||page==='storyIntro'||page==='storyEpilogue'||page==='storyBossVictory'||page==='storyChapterTwoIntro'||page==='storyChapterTwoBossStart'||page==='storyChapterTwoBossEnd';
    nav.innerHTML=[['home','홈'],['dungeon','모험'],['gear','장비'],['shop','상점']].map(([id,label])=>`<button data-action="nav" data-page="${id}" ${active===id?'aria-current="page"':''}>${icon(id)}<span>${label}</span></button>`).join('');
    const renderer={storyPotionEvent:renderStoryPotionEvent,storyChapterFiveIntro:renderStoryChapterFiveIntro,storyChapterFiveMidbossStart:renderStoryChapterFiveMidbossStart,storyChapterFiveMidbossEnd:renderStoryChapterFiveMidbossEnd,storyChapterFiveBossStart:renderStoryChapterFiveBossStart,storyChapterFiveBossEnd:renderStoryChapterFiveBossEnd,characters:renderCharacterGate,home:renderHome,gear:renderGear,shop:renderShop,dungeon:renderDungeon,survival:renderSurvival,story:renderStory,storyIntro:renderStoryIntro,storyEpilogue:renderStoryEpilogue,storyBossVictory:renderStoryBossVictory,storyChapterThreeBossStart:renderStoryChapterThreeBossStart,storyChapterThreeBossEnd:renderStoryChapterThreeBossEnd,storyChapterFourIntro:renderStoryChapterFourIntro,storyChapterFourBossStart:renderStoryChapterFourBossStart,storyChapterFourBossEnd:renderStoryChapterFourBossEnd,storyChapterFourMidbossStart:renderStoryChapterFourMidbossStart,storyChapterFourMidbossEnd:renderStoryChapterFourMidbossEnd,storyChapterThreeIntro:renderStoryChapterThreeIntro,storyChapterTwoIntro:renderStoryChapterTwoIntro,storyChapterTwoBossStart:renderStoryChapterTwoBossStart,storyChapterTwoBossEnd:renderStoryChapterTwoBossEnd,stages:renderStages,battle:renderBattle,bossResult:renderRoyalSlimeResult,result:renderResult}[page]||renderHome;
    $('screen').innerHTML=renderer()+localBossSkipMarkup();
    if(page==='battle'&&run?.banditChief)syncBanditChiefBattleVisual();
    if(page==='battle'&&run?.abyssGolem)syncAbyssGolemBattleVisual();
    if(page==='battle'&&run?.story)refreshStorySelections();
    if(page==='battle'&&(selectedCharacter?.class==='sniper'||['mage_starlight_rose_skin','ranger_violet_crystal_skin'].includes(itemById(equippedMap(selectedCharacter).skin)?.code)))setHeroAttackTravel();
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
    if(page==='story'&&!$('dialog').open)showStoryBranchChoice();
  }
  function go(target){if(target==='story'&&beginWorldFourPotionEvent())target='storyPotionEvent';if(target==='story'){storyStageArmedKey=null;storyMapMoveUntil=0;}if(guestMode&&!selectedCharacter)target='characters';if(target==='characters'){characterArmedId=null;characterPreviewId=selectedCharacter?.id||null;}page=target;render();$('screen').focus({preventScroll:true});$('screen').scrollTo({top:0,behavior:'instant'});window.scrollTo({top:0,behavior:'instant'});}
  function navigate(target){if(page==='battle'&&run&&!run.done){pause();modal(`<div class="eyebrow">PAUSED</div><h2>이번 도전을 마칠까요?</h2><p>지금까지 맞힌 문제의 보상과 기록은 저장됩니다.</p><div class="actions"><button class="secondary" data-action="resume">계속하기</button><button class="primary" data-action="leave" data-page="${target}">저장하고 이동</button></div>`);return;}go(target);}
  function profileBar(){if(accountMode||guestMode)return '';return `<div class="profile-switch">${players.map(name=>`<button class="profile-chip ${name===player?'active':''}" data-action="player" data-player="${esc(name)}">${esc(name)}</button>`).join('')}<button class="profile-chip add" data-action="add-player">＋ 유저</button></div>`;}
  function classStatsMarkup(d){return `<div class="class-stat-grid" aria-label="${esc(d.label)} 기본 능력치">${Object.entries({hp:'체력',mp:'정신',atk:'공격',luk:'행운'}).map(([key,label])=>`<span><small>${label}</small><i>${'<b></b>'.repeat(d.stats[key])}</i></span>`).join('')}</div>`;}
  function characterActiveSkillMarkup(classCode,context='select'){
    const skills={
      warrior:{name:'연속 베기',image:'active-warrior-consecutive-slash.png',description:'발동 후 10초 동안 정답을 연속으로 맞힐 때마다 콤보 수 × 2 크리스털을 누적 획득해요.'},
      mage:{name:'아이스 타임',image:'active-mage-ice-time.png',description:'MP 1을 소모해 현재 웨이브의 적을 얼리고 제한시간을 멈춰요. 남은 적을 모두 처치하거나 오답을 고르면 해제돼요.'},
      ranger:{name:'매의 눈',image:'active-ranger-eagle-eye.png',description:'MP 1을 소모해 정답을 표시해요. 객관식은 정답 보기에, 연결하기는 선택한 영어의 한글 정답 카드에 정답 표시가 나타나요. 정답·오답 시 해제돼요.'},
      pugilist:{name:'위빙 스텝',image:'active-pugilist-weaving-step.png',description:'MP 1을 소모해 다음 오답 한 번의 HP 감소와 콤보 초기화를 막아요. 틀린 문제는 다시 풀어야 해요.'}
    };
    const skill=skills[classCode];if(!skill)return '';
    const image=`<img src="${esc(deployedAssetUrl(`assets/ui/skills/${skill.image}`))}" alt="${skill.name} 스킬 아이콘">`;
    if(context==='create')return `<div class="skill-callout active-skill-callout">${image}<div><b>ACTIVE SKILL · ${skill.name}</b><small>${skill.description}</small></div></div>`;
    return `<div class="selected-hero-skill selected-hero-active-skill">${image}<div><small>ACTIVE SKILL · 스토리 모드</small><strong>${skill.name}</strong><p>${skill.description}</p></div></div>`;
  }
  function characterSelectMarkup(){
    const previewCharacter=characters.find(c=>c.id===characterPreviewId)||selectedCharacter;
    const selectedIndex=Math.max(0,characters.findIndex(c=>c.id===previewCharacter?.id));
    const relative=index=>{let value=index-selectedIndex;if(value>characters.length/2)value-=characters.length;if(value<-characters.length/2)value+=characters.length;return value;};
    const cards=characters.map((c,index)=>{const d=characterDef(c),slot=relative(index),distance=Math.abs(slot),active=c.id===characterArmedId,visible=distance<=2;return `<button class="select-hero-card ${active?'active':''} ${visible?'':'out-of-view'}" style="--slot:${slot};--distance:${distance};--depth:${10-distance}" data-action="select-character" data-id="${c.id}" aria-pressed="${active}" aria-label="${esc(c.name)} ${active?'선택됨':'선택'}"><span class="select-card-face ${portraitSceneClass(c)}"><img src="${imagePath(c)}" alt=""><span class="select-card-copy"><small>LV.${stats(c).level} · ${esc(d.label)}</small><b>${esc(c.name)}</b></span>${active?'<i><span aria-hidden="true">✓</span> 선택됨</i>':''}</span></button>`;}).join('');
    const d=characterDef(previewCharacter),s=stats(previewCharacter),armed=characterArmedId===previewCharacter?.id;
    const pages=characters.map((c,index)=>`<button class="character-page-dot ${index===selectedIndex?'current':''}" data-action="character-page" data-index="${index}" aria-label="${index+1}번 ${esc(c.name)} 카드로 이동" aria-current="${index===selectedIndex?'true':'false'}"></button>`).join('');
    return `<section class="character-select" data-view="stage"><div class="character-card-stage" tabindex="0" aria-label="보유 캐릭터 소환 무대. 좌우로 밀거나 방향키로 캐릭터를 둘러보세요"><div class="character-card-orbit">${cards}</div><div class="character-stage-glow" aria-hidden="true"></div><nav class="character-carousel-nav" aria-label="캐릭터 카드 이동"><button data-action="character-step" data-direction="-1" aria-label="이전 캐릭터" ${characters.length<2?'disabled':''}>‹</button><div class="character-page-dots">${pages}</div><button data-action="character-step" data-direction="1" aria-label="다음 캐릭터" ${characters.length<2?'disabled':''}>›</button></nav></div><article class="selected-hero-detail"><div class="selected-hero-title"><span class="level">LV.${s.level}</span><div><small>${esc(d.title)} · ${esc(d.label)}</small><h2>${esc(previewCharacter.name)}</h2></div><b>${armed?'한 번 더 눌러 시작':'카드 선택 대기'}</b></div>${characterActiveSkillMarkup(previewCharacter.class)}<div class="selected-hero-skill">${previewCharacter.class==='warrior'?'<img src="assets/ui/skills/passive-warrior-shield.webp" alt="수호의 방패 아이콘">':previewCharacter.class==='mage'?'<img src="assets/ui/skills/passive-mage-time-stop.webp" alt="타임 스톱 아이콘">':previewCharacter.class==='pugilist'?'<img src="assets/ui/skills/passive-pugilist-crystal-bonus.webp" alt="크리스털 가방 아이콘">':previewCharacter.class==='ranger'?'<img src="assets/ui/skills/passive-ranger-fortune-arrow.webp" alt="행운의 화살 아이콘">':previewCharacter.class==='sniper'?'<img src="assets/ui/skills/passive-sniper-insight.png" alt="심안의 저격 조준 아이콘">':'<span aria-hidden="true">✦</span>'}<div><small>PASSIVE SKILL · ${esc(d.skill)}</small><strong>${esc(d.skillDesc)}</strong></div></div>${classStatsMarkup(d)}</article></section>`;
  }
  function characterCreatorMarkup(){
    const d=classDefs[newClass],first=characters.length===0;
    return `<section class="character-create-panel"><div class="creation-step"><span>${first?'첫 모험가 · 무료':'캐릭터 추가권 사용'}</span><b>${first?'나만의 영웅을 만들어 보세요':`보유 추가권 ${availableCharacterTickets}장`}</b></div><label class="form-label" for="character-name">캐릭터 이름 <small>${guestMode?'손님 캐릭터의 이름은 고정이에요':'로그인 아이디와 달라도 괜찮아요'}</small></label><input id="character-name" class="field character-name-field" maxlength="16" value="${esc(guestMode?'손님':newCharacterName)}" ${guestMode?'readonly aria-readonly="true"':''} autocomplete="off" placeholder="예: 별빛루나"><label class="form-label">직업 스킬</label><div class="class-tabs">${Object.entries(classDefs).map(([id,c])=>`<button class="${id===newClass?'active':''}" data-action="class" data-value="${id}" aria-pressed="${id===newClass}">${c.label}</button>`).join('')}</div><article class="class-preview"><div class="class-preview-art"><img src="assets/avatars/${d.paths[newVariant]}?v=20260917-skins" alt="${esc(d.label)} ${newVariant==='female'?'여성':'남성'} 캐릭터"></div><div class="class-preview-copy"><span>${esc(d.title)}</span><h2>${esc(d.label)}</h2><p>${esc(d.trait)}</p><div class="skill-callout"><b>PASSIVE SKILL · ${esc(d.skill)}</b><small>${esc(d.skillDesc)}</small></div>${characterActiveSkillMarkup(newClass,'create')}${classStatsMarkup(d)}</div></article><label class="form-label">기본 외형</label><div class="variant-switch">${availableVariants(newClass).map(v=>`<button class="${v===newVariant?'active':''}" data-action="variant" data-value="${v}" aria-pressed="${v===newVariant}">${v==='male'?'남성':'여성'} 외형</button>`).join('')}</div><div class="character-create-actions">${characters.length?'<button class="secondary" data-action="cancel-character-create">목록으로</button>':''}<button class="primary" data-action="create-character">${first?'첫 캐릭터 만들기':'추가권으로 캐릭터 만들기'} →</button></div></section>`;
  }
  function renderCharacterGate(){
    const creating=characterCreating||!characters.length;
    const loginLabel=accountProfile?.login_id||player;
    if(creating&&!dbOnline&&!localMode)return `<section class="character-gate"><div class="panel onboarding"><div class="result-symbol">${icon('island')}</div><div class="eyebrow" style="color:var(--danger)">CONNECTION INTERRUPTED</div><h1>계정 데이터를 불러오지 못했어요</h1><p>네트워크를 확인한 뒤 다시 연결해 주세요.</p><button class="primary" data-action="retry-database">다시 연결</button></div></section>`;
    if(creating)return `<section class="character-gate"><header class="character-gate-heading"><div><span class="eyebrow">CREATE YOUR HERO</span><h1>${characters.length?'새 모험가 합류':'모험을 함께할 영웅을 만드세요'}</h1>${guestMode?'<p>직업과 기본 외형을 고르면 손님으로 모험을 시작해요.</p>':''}</div><span class="gate-crystal" title="계정 공용 크리스털">◆ ${num(walletBalance())}</span></header>${characterCreatorMarkup()}</section>`;
    return `<section class="character-gate"><header class="character-gate-heading character-choice-heading"><div><span class="eyebrow">CHOOSE YOUR HERO</span></div>${guestMode?'':'<button class="character-add-button" data-action="open-character-create" aria-label="캐릭터 추가" title="캐릭터 추가">＋</button>'}</header>${characterSelectMarkup()}</section>`;
  }
  function renderHome(){
    if(!selectedCharacter)return `${profileBar()}<div class="panel onboarding"><div class="result-symbol">${icon('sword')}</div><div class="eyebrow" style="color:var(--violet)">WELCOME, ADVENTURER</div><h1>${esc(player)}님의 모험가를 만들어 주세요</h1><p>직업과 모습을 고르면 단어 던전에 바로 입장할 수 있어요.<br>정답이 공격이 되고 크리스털이 보상으로 쌓입니다.</p>${!dbOnline&&!localMode?'<div class="db-warning">현재 데이터베이스에 연결할 수 없어 캐릭터를 만들 수 없습니다.</div>':''}<button class="primary" data-action="new-character" ${!dbOnline&&!localMode?'disabled':''}>첫 캐릭터 만들기 →</button></div>`;
    const c=selectedCharacter,d=characterDef(c),s=stats();
    return `${profileBar()}<button class="hero ${portraitSceneClass(c)}" data-action="characters" aria-label="${guestMode?'캐릭터 정보':'캐릭터 변경'}"><span class="level">LV.${s.level}</span><span class="hero-player">${esc(player)}의 모험가</span><span class="hero-hint">${guestMode?'캐릭터 정보':'캐릭터 변경'} ›</span><div class="hero-copy"><div class="eyebrow">${d.title}</div><h1>${esc(c.name)}</h1><p>${d.label} · ${d.trait.split(' · ')[0]}</p></div>${portrait()}</button><button class="panel progress-card" style="width:100%" data-action="stats"><span class="row small"><span>다음 레벨까지</span><b>${s.expMax?`${num(s.exp)} / ${num(s.expMax)} EXP`:'MAX LEVEL'}</b></span><div class="xp"><i style="width:${s.expMax?s.exp/s.expMax*100:100}%"></i></div></button><div class="stats"><button class="panel stat" data-action="stats"><span>최고 콤보</span><b>${s.best}</b></button><button class="panel stat" data-action="stats"><span>정답률</span><b>${s.accuracy}%</b></button><button class="panel stat" data-action="records"><span>클리어</span><b>${s.clears}</b></button></div><button class="primary home-cta" data-action="nav" data-page="dungeon">모험 떠나기 <span class="arrow">→</span></button>`;
  }
  function itemOwned(item){return inventory.some(x=>String(x.item_id)===String(item.id));}
  function isSkin(item){return slotFor(item)==='skin';}
  function shopCategory(item){return item.category==='gift'?'reward':isSkin(item)?'skin':item.category==='avatar'?({weapon:'weapon',head:'head',body:'body',back:'back',feet:'feet',aura:'accessory',pet:'pet'}[slotFor(item)]||'item'):'item';}
  function displayRarity(item){return item.category==='gift'?'special':rarityNames[item.rarity]?item.rarity:isSkin(item)?'unique':'normal';}
  function skinEligible(item,c=selectedCharacter){
    if(item?.code==='sniper_snow_crystal_skin')return c?.class==='sniper'&&variantOf(c)==='female';
    if(item?.code==='ranger_violet_crystal_skin')return c?.class==='ranger'&&variantOf(c)==='female';
    if(item?.code==='pugilist_crystal_rose_skin')return c?.class==='pugilist'&&variantOf(c)==='female';
    if(item?.code==='pugilist_crystal_noir_skin')return c?.class==='pugilist'&&variantOf(c)==='male';
    if(item?.code==='mage_arcane_necromancer_skin')return c?.class==='mage'&&variantOf(c)==='male';
    if(item?.code==='mage_starlight_rose_skin')return c?.class==='mage'&&variantOf(c)==='female';
    if(item?.code==='warrior_golden_radiance_skin')return c?.class==='warrior'&&variantOf(c)==='male';
    if(item?.code==='warrior_female_golden_radiance_skin')return c?.class==='warrior'&&variantOf(c)==='female';
    return !isSkin(item);
  }
  function skinRequirement(item){if(item?.code==='sniper_snow_crystal_skin')return '여성 스나이퍼 전용';if(item?.code==='pugilist_crystal_rose_skin')return '여성 권투사 전용';if(item?.code==='pugilist_crystal_noir_skin')return '남성 권투사 전용';if(item?.code==='mage_arcane_necromancer_skin')return '남성 마법사 전용';if(item?.code==='mage_starlight_rose_skin')return '여성 마법사 전용';if(item?.code==='warrior_golden_radiance_skin')return '남성 전사 전용';if(item?.code==='warrior_female_golden_radiance_skin')return '여성 전사 전용';return '여성 궁수 전용';}
  function inventoryQuantityMarkup(count){return count!==1?`<span class="item-quantity" aria-label="보유 수량 ${count}개">x${count}</span>`:'';}
  function renderOwnedItemCard(item){
    const count=inventory.filter(row=>String(row.item_id)===String(item.id)).length;
    const equipped=Object.values(equippedMap()).some(id=>String(id)===String(item.id));
    return `<button class="item" data-action="item" data-id="${item.id}" data-rarity="${displayRarity(item)}">${equipped?'<span class="item-status">장착 중</span>':''}<span class="item-art">${itemArt(item)}${inventoryQuantityMarkup(count)}</span><b>${esc(item.name)}</b></button>`;
  }
  function renderItemCard(item,ownedView=false){if(ownedView)return renderOwnedItemCard(item);const owned=itemOwned(item),eq=Object.values(equippedMap()).some(id=>String(id)===String(item.id)),gear=item.category==='avatar',skin=isSkin(item),rarity=displayRarity(item);return `<button class="item" data-action="item" data-id="${item.id}" data-rarity="${rarity}"><span class="item-rarity">${rarityNames[rarity]}</span>${ownedView?`<span class="item-status">${eq?'장착 중':'보유'}</span>`:''}<span class="item-art">${itemArt(item)}</span><b>${esc(item.name)}</b>${gear?`<span class="item-stat">${skin?`${skinRequirement(item)} 스킨`:`${esc(({hp:'체력',mp:'정신',atk:'공격',luk:'행운',def:'체력'}[item.stat_key]||''))} +${num(Math.trunc(item.stat_value))}`}</span>`:''}${window.WORDORIA_PETS.catalog.some(p=>p.code===item.code)?`<span class="item-pet-skill">${esc(item.description)}</span>`:''}<small class="${owned?'owned':''}">${num(item.price)} ◆${owned?' · 보유 중':''}</small></button>`;}
  // Account vitals are restored from Supabase; local storage retains unsynced changes.
  const storyVitalsCache=new Map();
  const pendingStoryVitals=new Map();
  let storyVitalsSync=null;
  let storyRecoveryBusy=false;
  function storyVitalsKey(characterId=selectedCharacter?.id){return `wordoria-story-vitals-v1:${localMode?demoKey:accountUserId||'legacy'}:${characterId}`;}
  async function loadAccountStoryVitals(){
    const rows=await apiGet('story_character_vitals?select=character_id,hp,mp');
    const remote=new Map(rows.map(row=>[row.character_id,row]));
    for(const character of allCharacters){
      const key=storyVitalsKey(character.id);
      if(pendingStoryVitals.has(key))continue;
      let local;
      try{local=JSON.parse(localStateStorage.getItem(key)||'null');}catch{}
      const saved=local?.pending?local:remote.get(character.id)||local;
      if(!Number.isFinite(saved?.hp)||!Number.isFinite(saved?.mp))continue;
      storyVitalsCache.set(key,{hp:saved.hp,mp:saved.mp});
      if(local?.pending||!remote.has(character.id)){
        pendingStoryVitals.set(key,{characterId:character.id,hp:saved.hp,mp:saved.mp});
      }else{
        try{localStateStorage.setItem(key,JSON.stringify({hp:saved.hp,mp:saved.mp}));}catch{}
      }
    }
    await flushStoryVitals();
  }
  async function flushStoryVitals(){
    if(storyVitalsSync)return storyVitalsSync;
    storyVitalsSync=(async()=>{
      while(pendingStoryVitals.size){
        const [key,saved]=pendingStoryVitals.entries().next().value;
        await apiPost('story_character_vitals?on_conflict=character_id',{character_id:saved.characterId,hp:saved.hp,mp:saved.mp},'resolution=merge-duplicates,return=minimal');
        if(pendingStoryVitals.get(key)===saved){
          pendingStoryVitals.delete(key);
          try{localStateStorage.setItem(key,JSON.stringify({hp:saved.hp,mp:saved.mp}));}catch{}
        }
      }
    })();
    try{await storyVitalsSync;}finally{storyVitalsSync=null;}
  }
  function storyVitals(){
    const cs=combatStats(stats().level),hpMax=Math.max(1,Math.floor(cs.hp/50)),mpMax=Math.max(0,Math.floor(cs.mp/50)),key=storyVitalsKey();
    let saved=storyVitalsCache.get(key);
    if(!saved){try{saved=JSON.parse(localStateStorage.getItem(key)||'null');}catch{}}
    const bounded=(value,max)=>Number.isFinite(value)?Math.max(0,Math.min(max,Math.floor(value))):max;
    return {hp:bounded(saved?.hp,hpMax),mp:bounded(saved?.mp,mpMax),hpMax,mpMax};
  }
  function saveStoryVitals(vitals){
    if(!selectedCharacter||!Number.isFinite(vitals?.hp)||!Number.isFinite(vitals?.mp))return;
    const key=storyVitalsKey(),saved={hp:vitals.hp,mp:vitals.mp};
    const previous=storyVitalsCache.get(key);
    const changed=!previous||previous.hp!==saved.hp||previous.mp!==saved.mp;
    storyVitalsCache.set(key,saved);
    const sync=typeof accountMode!=='undefined'&&accountMode;
    if(sync&&changed)pendingStoryVitals.set(key,{characterId:selectedCharacter.id,...saved});
    try{localStateStorage.setItem(key,JSON.stringify({...saved,...(sync&&pendingStoryVitals.has(key)?{pending:true}:{})}));}catch{}
    if(sync&&pendingStoryVitals.size)void flushStoryVitals().catch(()=>{});
  }
  function persistStoryBattleVitals(){
    if(run?.story&&run.storyCharacterId===selectedCharacter?.id)saveStoryVitals(run);
  }
  function storyPotionCount(type){return potionCount(type)+equippedPotions().filter(value=>value===type).length;}
  function storyHealingCount(){return storyPotionCount('red');}
  function showStoryRecovery(stageKey=''){
    const vitals=storyVitals();
    const options=['red','blue'].map(type=>{const item=potionTypes[type],key=type==='red'?'hp':'mp',count=storyPotionCount(type);return `<div class="item-detail-stat"><span>${item.name} 보유 (장착 포함)</span><b>×${count}</b></div><div class="actions"><button class="primary" data-action="story-recover" data-potion="${type}" data-stage="${esc(stageKey)}" ${!count||vitals[key]>=vitals[`${key}Max`]||storyRecoveryBusy?'disabled':''}>${item.name} 사용 · ${key.toUpperCase()} +1</button><button class="secondary" data-action="buy-potion" data-potion="${type}" data-recovery="true" data-stage="${esc(stageKey)}" ${storyRecoveryBusy||walletBalance()<POTION_PRICE?'disabled':''}>${item.name} 구매 · ◆ ${POTION_PRICE}</button></div>`;}).join('');
    modal(`<div class="eyebrow">STORY MODE · RECOVERY</div><h2>${stageKey&&vitals.hp===0?'HP가 0이라 입장할 수 없어요':'물약으로 회복하기'}</h2><p>힐링포션은 HP 1, 마나포션은 MP 1을 회복해요.</p><div class="item-detail-stat"><span>현재 HP / MP</span><b>HP ${vitals.hp} / ${vitals.hpMax} · MP ${vitals.mp} / ${vitals.mpMax}</b></div>${options}${stageKey&&vitals.hp>0?`<button class="primary" data-action="story-start-stage" data-stage="${esc(stageKey)}" ${storyRecoveryBusy?'disabled':''}>스테이지 입장</button>`:''}`,{closable:!storyRecoveryBusy});
  }
  function storyStagePlayable(stageKey){return Boolean(stages[stageKey]);}
  function storyEntryAllowed(stageKey){if(!storyBranchAllowed(stages[stageKey]?.storyChapter||1))return false;if(!storyStagePlayable(stageKey))return false;if(storyRecoveryBusy)return false;if(storyVitals().hp>0)return true;showStoryRecovery(stageKey);return false;}
  async function recoverStoryHp(stageKey,button,type='red'){
    if(storyRecoveryBusy||!selectedCharacter)return;
    const item=potionTypes[type];if(!item)return;const key=type==='red'?'hp':'mp',other=type==='red'?'blue':'red',vitals=storyVitals();if(vitals[key]>=vitals[`${key}Max`]||storyPotionCount(type)<1)return;
    storyRecoveryBusy=true;button.disabled=true;showStoryRecovery(stageKey);
    try{
      const originalSlots=equippedPotions();
      let slots=originalSlots.slice(),index=slots.indexOf(type),restoreLoadout=false;
      if(index<0){
        index=slots.indexOf(null);if(index<0)index=0;
        const replaced=slots[index];restoreLoadout=replaced===other;slots[index]=type;
        if(localMode){potionInventory={...potionInventory,[item.countKey]:potionCount(type)-1,[potionTypes[other].countKey]:potionCount(other)+(replaced===other?1:0),equipped_slot_1:slots[0],equipped_slot_2:slots[1]};demoState.potionInventory={...(demoState.potionInventory||{}),[selectedCharacter.id]:potionInventory};saveDemo();}
        else{
          const rows=await rpc('equip_story_potions',{p_character_id:selectedCharacter.id,p_slots:slots});
          if(!rows?.[0])throw new Error('potion equip failed');potionInventory=rows[0];
        }
      }
      if(localMode){potionInventory={...potionInventory,[`equipped_slot_${index+1}`]:null};demoState.potionInventory={...(demoState.potionInventory||{}),[selectedCharacter.id]:potionInventory};saveDemo();}
      else{
        const used=await rpc('use_story_potion',{p_character_id:selectedCharacter.id,p_slot_index:index+1});
        // Production returns JSON inventory; older servers returned the potion type.
        const usedType=typeof used==='string'?used:used?.type;
        if(usedType!==type)throw new Error('unexpected potion');
        potionInventory=typeof used==='object'&&used!==null
          ?{red_potion_count:used.red_potion_count,blue_potion_count:used.blue_potion_count,equipped_slot_1:used.equipped_slot_1,equipped_slot_2:used.equipped_slot_2}
          :{...potionInventory,[`equipped_slot_${index+1}`]:null};
      }
      vitals[key]=Math.min(vitals[`${key}Max`],vitals[key]+1);saveStoryVitals(vitals);
      if(restoreLoadout){
        if(localMode){potionInventory={...potionInventory,[potionTypes[other].countKey]:potionCount(other)-1,equipped_slot_1:originalSlots[0],equipped_slot_2:originalSlots[1]};demoState.potionInventory={...(demoState.potionInventory||{}),[selectedCharacter.id]:potionInventory};saveDemo();}
        else{
          try{const rows=await rpc('equip_story_potions',{p_character_id:selectedCharacter.id,p_slots:originalSlots});if(!rows?.[0])throw new Error('loadout restore failed');potionInventory=rows[0];}
          catch(error){console.error(error);toast(`${key.toUpperCase()}를 회복했어요. ${potionTypes[other].name}은 장비 화면에서 다시 장착해 주세요.`);return;}
        }
      }
      render();toast(`${item.name}을 사용해 ${key.toUpperCase()} 1을 회복했어요`);
    }catch(error){console.error(error);toast('포션을 사용하지 못했어요. 다시 시도해 주세요.');}
    finally{storyRecoveryBusy=false;showStoryRecovery(stageKey);}
  }
  const potionTypes={red:{name:'힐링포션',countKey:'red_potion_count',slotKey:'equipped_slot_1',className:'red',effect:'HP 회복'},blue:{name:'마나포션',countKey:'blue_potion_count',slotKey:'equipped_slot_2',className:'blue',effect:'MP 회복'}};
  const POTION_PRICE=20;
  function potionCount(type){return Number(potionInventory[potionTypes[type].countKey]||0);}
  function equippedPotions(){return [potionInventory.equipped_slot_1||null,potionInventory.equipped_slot_2||null];}
  function potionShopCard(type){const item=potionTypes[type];return `<button class="item potion-shop-card ${item.className}" data-action="potion-shop-item" data-potion="${type}"><span class="item-rarity">소모품</span><span class="item-art potion-shop-art"><span class="potion-icon ${item.className}" aria-hidden="true"></span></span><b>${item.name}</b><span class="item-stat">${item.effect} · 보유 ×${potionCount(type)}</span><small>◆ ${POTION_PRICE} · 구매하기</small></button>`;}
  function showPotionShopItem(type){const item=potionTypes[type];if(!item)return;modal(`<div class="eyebrow">CONSUMABLE · ${item.effect}</div><div class="item-art item-detail-art potion-detail-art"><span class="potion-icon ${item.className}" aria-hidden="true"></span></div><h2>${item.name}</h2><p>${item.effect} 포션입니다. 구매 후 장비 상태창에서 최대 2개까지 장착할 수 있어요.</p><div class="item-detail-stat"><span>보유 수량</span><b>×${potionCount(type)}</b></div><div class="item-price-line"><b>◆ ${POTION_PRICE}</b><span aria-hidden="true">/</span><b class="item-sale-price" aria-label="판매가 ${Math.floor(POTION_PRICE/5)} 크리스털">◆ ${Math.floor(POTION_PRICE/5)}</b></div><button class="primary" data-action="buy-potion" data-potion="${type}" ${walletBalance()<POTION_PRICE?'disabled':''}>${walletBalance()<POTION_PRICE?'크리스털이 부족해요':'구매하기'}</button>`);}
  async function purchasePotion(type,button){const item=potionTypes[type];if(!item||!selectedCharacter)return;if(walletBalance()<POTION_PRICE){toast('크리스털이 부족해요');return;}button.disabled=true;button.textContent='구매 중…';try{if(localMode){selectedCharacter.coins-=POTION_PRICE;const current={...potionInventory};current[item.countKey]=Number(current[item.countKey]||0)+1;demoState.potionInventory={...(demoState.potionInventory||{}),[selectedCharacter.id]:current};saveDemo();}else{const rows=await rpc('purchase_story_potion',{p_character_id:selectedCharacter.id,p_potion_type:type});const result=rows?.[0];if(result){if(accountMode)accountCrystals=Number(result.new_balance);else selectedCharacter.coins=Number(result.new_balance);}}await loadCharacterExtras();closeDialog();render();if(button.dataset.recovery==='true')showStoryRecovery(button.dataset.stage||'');toast(`${item.name}을(를) 구매했어요`);}catch(error){console.error(error);button.disabled=false;button.textContent='다시 시도';toast(String(error.message).includes('not enough')?'크리스털이 부족해요':'포션을 구매하지 못했어요. 다시 시도해 주세요.');}}
  function potionSlotButton(index){const type=equippedPotions()[index],item=type?potionTypes[type]:null;return `<button class="gear-status-slot gear-status-potion-slot ${item?`equipped ${item.className}`:'empty'}" data-action="potion-slot" data-index="${index}" aria-label="소모품 슬롯 ${index+1}${item?`, ${item.name} 1개 장착`: ', 비어 있음'}" title="${item?`${item.name} · 1개 장착`:'소모품 장착'}"><span>${item?`<span class="potion-icon ${item.className}" aria-hidden="true"></span>`:icon('bag')}</span>${item?'':`<small>도구 ${index+1}</small><i>소모품</i>`}</button>`;}
  function showPotionSlot(index){const equipped=equippedPotions(),available=['red','blue'].filter(type=>potionCount(type)+(equipped[index]===type?1:0)>0),options=available.map(type=>{const item=potionTypes[type],current=equipped[index]===type,remaining=potionCount(type)+(current?1:0)-(current?1:0);return `<button class="potion-choice ${item.className}" data-action="equip-potion" data-slot-index="${index}" data-potion="${type}" ${current?'disabled':''}><span class="potion-icon ${item.className}" aria-hidden="true"></span><span><b>${item.name}</b><small>${item.effect} · 장착 후 남음 ×${remaining}</small></span><strong>${current?'장착 중':'1개 장착'}</strong></button>`;}).join('');modal(`<div class="eyebrow">ADVENTURE TOOLS · SLOT ${index+1}</div><h2>장착할 소모품을 선택해 주세요</h2><p>장착하면 보유 수량에서 1개가 빠집니다. 같은 포션도 각 칸에 1개씩 장착할 수 있어요.</p><div class="potion-choice-list">${options||'<div class="empty-state">보유한 포션이 없어요. 상점에서 포션을 구매해 주세요.</div>'}</div>${equipped[index]?`<button class="secondary potion-unequip" data-action="unequip-potion" data-slot-index="${index}">장착 해제 · 인벤토리로 돌려놓기</button>`:''}`);}
  async function setPotionLoadout(index,type){const current=equippedPotions(),slots=current.slice();slots[index]=type;const nextCounts={red:potionCount('red')+current.filter(value=>value==='red').length-slots.filter(value=>value==='red').length,blue:potionCount('blue')+current.filter(value=>value==='blue').length-slots.filter(value=>value==='blue').length};if(nextCounts.red<0||nextCounts.blue<0){toast('보유 수량이 부족해 장착할 수 없어요');return;}try{if(localMode){potionInventory={...potionInventory,red_potion_count:nextCounts.red,blue_potion_count:nextCounts.blue,equipped_slot_1:slots[0],equipped_slot_2:slots[1]};demoState.potionInventory={...(demoState.potionInventory||{}),[selectedCharacter.id]:potionInventory};saveDemo();}else{await rpc('equip_story_potions',{p_character_id:selectedCharacter.id,p_slots:slots});await loadCharacterExtras();}closeDialog();render();toast(type?'포션을 장착했어요':'포션 장착을 해제했어요');}catch(error){console.error(error);toast(String(error.message).includes('insufficient potion')?'포션 보유 수량이 부족해요':'포션 장착에 실패했어요. 다시 시도해 주세요.');}}
  function potionCollectionCard(type){const item=potionTypes[type],count=storyPotionCount(type),equipped=equippedPotions().includes(type);return `<button class="item potion-shop-card ${item.className}" data-action="potion-collection" data-potion="${type}">${equipped?'<span class="item-status">장착 중</span>':''}<span class="item-art potion-shop-art"><span class="potion-icon ${item.className}" aria-hidden="true"></span>${inventoryQuantityMarkup(count)}</span><b>${item.name}</b></button>`;}
  function showPotionCollection(type){const item=potionTypes[type];if(!item)return;const key=type==='red'?'hp':'mp',vitals=storyVitals();modal(`<div class="eyebrow">CONSUMABLE · ${item.effect}</div><div class="item-art item-detail-art potion-detail-art"><span class="potion-icon ${item.className}" aria-hidden="true"></span></div><h2>${item.name}</h2><div class="item-detail-stat"><span>보유 수량 (장착 포함)</span><b>x${storyPotionCount(type)}</b></div><p>${key.toUpperCase()} ${vitals[key]} / ${vitals[`${key}Max`]}</p><div class="item-price-line"><b>◆ ${POTION_PRICE}</b><span aria-hidden="true">/</span><b class="item-sale-price" aria-label="판매가 ${Math.floor(POTION_PRICE/5)} 크리스털">◆ ${Math.floor(POTION_PRICE/5)}</b></div><div class="item-equip-sale-actions"><button class="secondary" data-action="potion-collection-equip" data-potion="${type}" ${!potionCount(type)?'disabled':''}>장착하기</button><button class="secondary" data-action="sell-potion" data-potion="${type}" ${!storyPotionCount(type)?'disabled':''}>판매하기</button></div><div class="actions"><button class="primary" data-action="story-recover" data-potion="${type}" data-collection="true" ${!storyPotionCount(type)||vitals[key]>=vitals[`${key}Max`]||storyRecoveryBusy?'disabled':''}>사용하기 · ${key.toUpperCase()} +1</button></div>`);}
  let potionAutoEquipBusy=false;
  async function equipPotionToEmptySlot(type,button){
    if(potionAutoEquipBusy||!potionTypes[type])return;
    if(!potionCount(type)){toast('장착할 포션이 없어요');return;}
    const index=equippedPotions().findIndex(value=>!value);
    if(index<0){toast('도구 슬롯이 모두 차 있어요. 포션을 사용하거나 장착을 해제해 주세요.');return;}
    potionAutoEquipBusy=true;if(button)button.disabled=true;
    try{await setPotionLoadout(index,type);}
    finally{potionAutoEquipBusy=false;if(button)button.disabled=false;}
  }

  function renderGear(){
    if(!selectedCharacter)return noCharacter('장비를 사용하려면 모험가가 필요해요.');
    const s=stats(),eq=equippedMap(),cs=combatStats(s.level),vitals=storyVitals();
    const slotButton=(slot,label,art)=>{const item=itemById(eq[slot]),rarity=item?displayRarity(item):null;return `<button class="gear-status-slot ${item?'equipped':'empty'} ${item?`rarity-${rarity}`:''}" data-action="slot" data-slot="${slot}" aria-label="${esc(label)}${item?` ${rarityNames[rarity]} ${esc(item.name)} 장착 중`:' 비어 있음'}" title="${esc(item?`${label} · ${item.name} 장착 중`:label)}"><span class="gear-slot-art">${item?itemArt(item):icon(art)}</span></button>${slot==='pet'?potionSlotButton(0)+potionSlotButton(1):''}`;};
    const stat=(label,value,bonus=0)=>`<div class="gear-stat"><span>${label}</span><strong>${num(Math.trunc(value))}</strong>${Math.trunc(bonus)?`<small>+${num(Math.trunc(bonus))}</small>`:''}</div>`;
    return `<div class="gear-page-title"><div><span>MY ADVENTURER</span><h1>장비</h1></div><button class="text-btn" data-action="characters">캐릭터 변경 ›</button></div><section class="gear-status-hero ${portraitSceneClass(selectedCharacter)}"><div class="gear-identity"><button class="gear-level-exp" data-action="stats" aria-label="레벨 ${s.level}, ${s.expMax?`경험치 ${num(s.exp)} / ${num(s.expMax)}`:'최고 레벨'}, 캐릭터 정보 보기"><span class="level">LV.${s.level}</span><span class="gear-inline-exp">${s.expMax?`<span>EXP</span> <b>${num(s.exp)}</b><span> / ${num(s.expMax)}</span>`:'<b>MAX LEVEL</b>'}</span><span class="gear-current-vitals"><span aria-label="현재 HP ${vitals.hp}"><i class="hp-heart" aria-hidden="true">♥</i>${vitals.hp}</span><span aria-label="현재 MP ${vitals.mp}"><i class="mp-heart" aria-hidden="true">♥</i>${vitals.mp}</span><span class="gear-damage" aria-label="보스 공격 피해 ${bossAttackSteps()}"><svg class="damage-fist" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10V7a2.5 2.5 0 0 1 5-1 2.5 2.5 0 0 1 5 0 2.5 2.5 0 0 1 5 1 2 2 0 0 1 3 2v5c0 2-1.5 4-3 5v3H7v-3c-2.5-1.5-4-4-4-7Z"/><path d="M8 6v5m5-5v5m5-4v5M4 12h9a2.5 2.5 0 0 1 0 5H9m-2 2h11"/></svg>${bossAttackSteps()}</span></span></button><h2>${esc(selectedCharacter.name)}</h2></div><div class="gear-stat-rail">${stat('체력',cs.hp,cs.bonus.hp)}${stat('정신',cs.mp,cs.bonus.mp)}${stat('공격',cs.atk,cs.bonus.atk)}${stat('행운',cs.luk,cs.bonus.luk)}</div><div class="gear-character">${portrait()}<span>전투력 <b>${num(Math.trunc(cs.power))}</b></span></div><div class="gear-slot-rail">${slotButton('head','머리','crown')}${slotButton('body','몸','armor')}${slotButton('weapon','무기','sword')}${slotButton('feet','신발','boots')}${slotButton('back','등','cape')}${slotButton('aura','오라','aura')}${slotButton('skin','스킨','profile')}${slotButton('pet','펫','pet')}</div></section><div class="section-title gear-collection-title"><span class="eyebrow">COLLECTION</span><button class="text-btn" data-action="nav" data-page="shop">상점 가기 ›</button></div><div class="items catalog gear-inventory-grid">${['red','blue'].map(potionCollectionCard).join('')}${shopItems.filter(itemOwned).map(i=>renderItemCard(i,true)).join('')}</div>`;
  }
  function renderShop(){
    if(!selectedCharacter)return noCharacter('상점을 이용하려면 모험가가 필요해요.');
    const visible=shopItems.filter(item=>shopCategory(item)===filter);
    const potionCards=filter==='item'?`${potionShopCard('red')}${potionShopCard('blue')}`:'';
    return `<div class="tabs" aria-label="상점 카테고리">${[['weapon','무기'],['head','모자'],['body','갑옷'],['back','망토'],['feet','신발'],['accessory','악세서리'],['pet','펫'],['item','아이템'],['skin','스킨'],['reward','보상']].map(([key,label])=>`<button data-action="filter" data-filter="${key}" class="${filter===key?'active':''}" aria-pressed="${filter===key}">${label}</button>`).join('')}</div><div class="items catalog">${potionCards}${visible.map(item=>renderItemCard(item)).join('')||(!potionCards?'<div class="empty-state">이 카테고리에 판매 중인 상품이 없어요.</div>':'')}</div><button class="secondary" style="width:100%;margin-top:15px" data-action="requests">보상 신청 내역 (${redemptions.filter(r=>r.status==='pending'||r.status==='approved').length}) →</button>`;
  }
  function noCharacter(message){return `${title('CHOOSE YOUR HERO','모험가가 필요해요',message)}<button class="primary" data-action="new-character" ${!dbOnline&&!localMode?'disabled':''}>캐릭터 만들기 →</button>`;}
  function renderDungeon(){const storyCard=`<button class="mode-card mode-card-story" data-action="mode-select" data-mode="story"><img src="${esc(deployedAssetUrl('assets/ui/crystal-quest/modes/mode-story-card.webp'))}" alt="" loading="lazy"><span class="mode-card-shade"></span><span class="mode-card-copy"><span class="mode-kicker">STORY MODE</span><b>스토리 모드</b><small>이야기를 따라가며<br>잃어버린 단어 크리스털을 찾아요.</small><i>이야기 보기 <span>→</span></i></span></button>`;return `<div class="page-title mode-heading"><div class="eyebrow">WORDORIA ADVENTURE</div><h1>어떤 모험을 떠날까요?</h1><p>원하는 방식으로 단어 크리스털을 모아 보세요.</p></div><section class="mode-select" aria-label="게임 모드 선택"><button class="mode-card mode-card-survival" data-action="mode-select" data-mode="survival"><img src="${esc(deployedAssetUrl('assets/ui/crystal-quest/modes/mode-survival-card.webp'))}" alt="" fetchpriority="high"><span class="mode-card-shade"></span><span class="mode-card-copy"><span class="mode-kicker">SURVIVAL MODE</span><b>서바이벌 모드</b><small>제한시간 안에 정답을 맞히고<br>끝없이 이어지는 모험에 도전해요.</small><i>월드 선택 <span>→</span></i></span></button>${storyCard}</section>${creatorContentError?`<div class="notice db-warning">${esc(creatorContentError)}</div>`:''}<button class="secondary mode-records" data-action="records">모험 기록 보기</button>`;}
  function renderSurvival(){if(!worlds.length)return `<button class="text-btn" data-action="nav" data-page="dungeon">← 모드 선택</button><h1>${learningLabels[learningLevel()]} 서바이벌</h1>${contentEmpty()}`;return `<button class="text-btn mode-back" data-action="nav" data-page="dungeon">← 모드 선택</button><div class="page-title"><div class="eyebrow">SURVIVAL MODE · ${learningLabels[learningLevel()]}</div><h1>월드를 선택하세요</h1></div><label class="world-search"><span class="world-search-icon" aria-hidden="true">⌕</span><input id="world-search" type="search" autocomplete="off" maxlength="60" placeholder="월드 이름 또는 4자리 고유키 검색" aria-label="월드 이름 또는 고유키 검색"></label><div id="world-list">${worlds.map((w,i)=>{const count=w.keys.filter(stageCleared).length,search=`${w.name} ${w.code}`.toLocaleLowerCase();return `<button class="dungeon-card${w.creator?' creator-world':''}" data-action="world" data-index="${i}" data-world-search="${esc(search)}"><span class="island">${icon('island')}</span><span class="eyebrow world-code" style="color:var(--violet)">WORLD ${esc(w.code)}</span><h2>${esc(w.name)}</h2><p>${esc(w.sub)}</p><span class="row small"><span class="badge">${w.keys.length} MAPS · ${count} CLEAR</span><span>맵 보기 →</span></span></button>`;}).join('')}</div><div id="world-empty" class="panel empty-state" hidden>검색 조건과 일치하는 월드가 없어요.</div>${creatorContentError?`<div class="notice db-warning">${esc(creatorContentError)}</div>`:''}<button class="secondary" style="width:100%" data-action="records">모험 기록 보기</button>`;}
  function bgmIconMarkup(enabled){
    const waves=enabled?'<path d="M16 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14"/>':'<path d="m17 9 5 6m0-6-5 6"/>';
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4z"/>${waves}</svg>`;
  }
  function storyAudioButton(className='topbar-audio-toggle'){
    const enabled=!window.wordoriaSound?.settings.bgmMuted;
    const label=enabled?'배경음 끄기':'배경음 켜기';
    return `<button type="button" class="${className}" data-action="toggle-bgm" aria-label="${label}" title="${label}" aria-pressed="${enabled}">${bgmIconMarkup(enabled)}</button>`;
  }
  function syncBGMButtons(){
    const enabled=!window.wordoriaSound?.settings.bgmMuted;
    const label=enabled?'배경음 끄기':'배경음 켜기';
    document.querySelectorAll('[data-action="toggle-bgm"]').forEach(button=>{
      button.setAttribute('aria-pressed',String(enabled));
      button.setAttribute('aria-label',label);
      button.title=label;
      button.innerHTML=bgmIconMarkup(enabled);
    });
  }
  function renderStory(){
    if(!storyBranchAllowed(selectedStoryWorld))selectedStoryWorld=chosenStoryBranch()==='6A'?7:chosenStoryBranch()==='6B'?6:5;
    const world=storyWorlds[selectedStoryWorld-1]||storyWorlds[0],chapterStages=storyStages.filter(stage=>(stage.chapter||1)===world.number);
    const available=stage=>storyStagePlayable(stage.key)&&storyStageUnlocked(storyStages.indexOf(stage))&&levelReady(stages[stage.key]);
    let selected=chapterStages.find(stage=>stage.key===selectedStoryStage&&available(stage));
    if(!selected)selected=chapterStages.find(stage=>available(stage)&&!stageCleared(stage.key))||chapterStages.find(available);
    if(selected)selectedStoryStage=selected.key;
    const previousNumber=world.number>=6&&!isAdministrator()?5:world.number-1,nextNumber=isAdministrator()?world.number+1:world.number===5?(chosenStoryBranch()==='6A'?7:6):world.number>=6?storyWorlds.length+1:world.number+1;
    const worldNavigation=`<div class="story-map-navigation" role="navigation" aria-label="스토리 월드 이동"><button type="button" class="story-map-region" data-action="story-world-select" data-world="${previousNumber}" ${world.number===1?'disabled':''}>이전 월드</button><button type="button" class="story-map-region" data-action="story-world-select" data-world="${nextNumber}" ${nextNumber>storyWorlds.length?'disabled':''}>다음 월드</button></div>`;
    const previousWorld=world.unlockAfter||world.number-1,previousStages=storyStages.filter(stage=>(stage.chapter||1)===previousWorld),previousLast=previousStages.at(-1);
    const notice=!chapterStages.some(stage=>levelReady(stages[stage.key]))?contentEmpty():world.number>1&&!chapterStages.some(stage=>storyStageUnlocked(storyStages.indexOf(stage)))?`<div class="notice">${esc(storyWorlds[previousWorld-1].name)}의 ${previousLast.number}스테이지를 클리어하면 ${esc(world.name)}가 열려요.</div>`:'';
    const maps=(world.parts||[world]).map((map,partIndex)=>{
      const mapStages=world.parts?chapterStages.filter(stage=>stage.part===map.number):chapterStages;
      const selectedPosition=selected&&mapStages.includes(selected)?map.positions[mapStages.indexOf(selected)]:null;
      const activeCharacter=selectedPosition?`<span class="story-map-hero" style="--story-x:${selectedPosition[0]};--story-y:${selectedPosition[1]}" aria-hidden="true">${battleHeroMarkup()}</span>`:'';
      const nodes=mapStages.map((stage,index)=>{
        const clear=stageCleared(stage.key),unlocked=available(stage),active=selected?.key===stage.key,position=map.positions[index];
        const cls=`story-map-node story-map-node-${stage.number} ${clear?'cleared':unlocked?'active':'locked'}${active?' selected':''}`;
        const number=`<span class="story-map-node-number">${stage.number}${unlocked?'':'<span class="story-map-node-lock" aria-hidden="true">🔒</span>'}</span>`,check=clear?'<span class="story-map-node-check" aria-hidden="true">✓</span>':'';
        if(!unlocked||!levelReady(stages[stage.key]))return `<span class="${cls}" style="--story-x:${position[0]};--story-y:${position[1]}" aria-label="스테이지 ${stage.number} 잠김">${number}${check}</span>`;
        return `<button type="button" class="${cls}" style="--story-x:${position[0]};--story-y:${position[1]}" data-action="story-stage-select" data-stage="${stage.key}" aria-current="${active?'step':'false'}" aria-label="스테이지 ${stage.number}${clear?' 클리어, 다시 도전 가능':' 도전 가능'}">${number}${check}</button>`;
      }).join('');
      const mapTitle=world.parts&&world.number!==4?`<h2 class="story-map-part-title">${esc(map.name)} <span>${mapStages[0].number}–${mapStages.at(-1).number}단계</span></h2>`:'';
      return `${mapTitle}<section class="story-world-map story-world-map-${world.number}" aria-label="${esc(map.name)} 스테이지 지도"><img class="story-world-map-art" src="${esc(deployedAssetUrl(map.art))}" alt="${esc(map.name)}의 ${mapStages.length}개 크리스탈 스테이지 지도">${partIndex===0?worldNavigation:''}${world.number===1?'<span class="story-map-label story-map-label-library">별빛 도서관</span>':''}${nodes}${activeCharacter}</section>`;
    }).join('');
    const potionNotice=world.number===4&&accountMode&&worldFourPotionClaims===null?'<div class="notice">탐험 보급 기록을 확인하지 못했어요. <button class="text-btn" data-action="world-four-potion-refresh">보급 이벤트 다시 확인</button></div>':'';
    return `<div class="story-mode-toolbar"><button class="text-btn" data-action="nav" data-page="dungeon">← 모드 선택</button></div><div class="page-title story-map-heading"><div class="eyebrow">STORY MODE · WORLD ${world.displayNumber||world.number}</div><h1>${esc(world.name)}</h1></div>${notice}${potionNotice}${maps}`;
  }
  function selectStoryWorld(number){if(!storyBranchAllowed(number)){if(needsStoryBranchChoice())showStoryBranchChoice();else toast('선택한 이야기의 월드만 갈 수 있어요');return;}if(!storyWorlds.some(world=>world.number===number))return;storyStageArmedKey=null;storyMapMoveUntil=0;selectedStoryWorld=number;if(number===4&&beginWorldFourPotionEvent())go('storyPotionEvent');else render();}
  function selectStoryStage(stageKey){
    const index=storyStages.findIndex(stage=>stage.key===stageKey),stage=storyStages[index];
    if(!stage||!storyStageUnlocked(index)||!levelReady(stages[stage.key]))return;
    if(!storyEntryAllowed(stage.key))return;
    if(storyStageArmedKey===stage.key&&selectedStoryStage===stage.key){
      if(performance.now()>=storyMapMoveUntil)confirmStoryStage(stage.key);
      return;
    }
    const moving=selectedStoryStage!==stage.key;
    selectedStoryStage=stage.key;selectedStoryWorld=stage.chapter||1;storyStageArmedKey=stage.key;
    storyMapMoveUntil=performance.now()+(moving&&!reducedMotion()?650:0);
    render();
  }
  function bossIntroductionMarkup(stage){
    const chapter=stage.chapter||1;
    const info=chapter===7&&stage.number===10?window.WORDORIA_ABYSS_GOLEM.INFO:chapter===6&&stage.number===10?window.WORDORIA_BANDIT_CHIEF.INFO:chapter===5&&stage.number===20?{...window.WORDORIA_LICH_DRAGON.INFO,art:'assets/novel/characters/char_lich_dragon_world5_standing.webp'}
      :chapter===5&&stage.number===10?{...window.WORDORIA_SORCERUS.INFO,art:'assets/novel/characters/char_sorcerus_world5_midboss_standing.webp'}
      :chapter===4&&stage.number===20?{...window.WORDORIA_RED_REAPER.INFO,art:'assets/monsters/red-reaper/red-reaper-standing.png'}
      :chapter===4&&stage.number===10?{...window.WORDORIA_SHADOW_SORCERESS.INFO,art:'assets/monsters/shadow-sorceress/shadow-sorceress-standing.png'}
      :chapter===3&&stage.number===7&&stage.hidden?{name:'숨겨진 크리스탈 유령',description:'크리스탈 사원 안쪽에서 나타나는 차가운 유령',hp:90,time:'3분 30초',skill:'크리스탈 결정 낙하',skillDescription:'보스 에너지가 50%, 20%, 10%에 도달하면 결정을 떨어뜨려 HP를 절반으로 줄여요. HP가 1이면 쓰러집니다.',art:'assets/monsters/crystal-ghost/crystal-ghost.png'}:chapter===3&&stage.number===8?{name:'블랙 드래곤',description:'수정 성소를 지키는 어둠의 드래곤',hp:60,time:'5분',skill:'에너지 흡수',skillDescription:'보스 에너지가 80%, 50%, 20%, 10%에 도달하면 35% 확률로 HP 1을 흡수해요.',art:'assets/novel/characters/char_lich_dragon_standing.png'}
      :chapter===2&&stage.number===7?{name:'크리스탈 가디언 골렘',description:'크리스탈 사원을 지키는 거대한 수호자',hp:60,time:'5분',skill:'크리스탈 빔',skillDescription:'보스 에너지가 80%, 40%, 20%, 10%에 도달하면 빔을 발사해 3초 동안 답안의 일부를 가려요.',art:'assets/monsters/crystal-guardian-golem/crystal-guardian-standing-left.png'}
      :chapter===1&&stage.number===7?{name:'거대 로얄 슬라임',description:'속삭이는 숲의 수정 관문을 지키는 슬라임',hp:50,time:'5분',skill:'시간 흡수',skillDescription:'보스 에너지가 절반이 되면 남은 시간을 30초 흡수해요.',art:'assets/monsters/royal-slime/royal-slime-standing.png'}:null;
    if(!info)return '';
    return `<div class="boss-introduction"><img src="${esc(deployedAssetUrl(info.art))}" alt="${esc(info.name)}"><h3>${esc(info.name)}</h3><p>${esc(info.description)}</p><div class="boss-introduction-stats"><span>HP ${info.hp}</span><span>제한시간 ${info.time}</span></div><div class="boss-introduction-skill"><b>${esc(info.skill)}</b><p>${esc(info.skillDescription)}</p></div>${info.skill2?`<div class="boss-introduction-skill"><b>${esc(info.skill2)}</b><p>${esc(info.skill2Description)}</p></div>`:''}${info.rewardDescription?`<p>${esc(info.rewardDescription)}</p>`:''}</div>`;
  }
  function confirmStoryStage(stageKey){
    const index=storyStages.findIndex(stage=>stage.key===stageKey),stage=storyStages[index];
    if(!stage||!storyStageUnlocked(index)||!levelReady(stages[stage.key]))return;
    if(!storyEntryAllowed(stage.key))return;
    const alreadyCleared=stageCleared(stage.key);
    selectedStoryStage=stage.key;selectedStoryWorld=stage.chapter||1;render();
    modal(`<div class="eyebrow">STAGE ${String(stage.number).padStart(2,'0')}</div><h2>${esc(stage.name)}에 입장할까요?</h2><p>${esc(stage.chapter===4?stages[stage.key].desc:stage.desc)}</p>${bossIntroductionMarkup(stage)}${alreadyCleared?'<p class="notice">이미 클리어한 스테이지예요. 다시 플레이해도 보상은 없어요. 입장하시겠어요?</p>':''}<div class="actions story-enter-actions"><button type="button" class="primary" data-action="story-enter-confirm" data-stage="${stage.key}">예</button><button type="button" class="secondary" data-action="story-enter-cancel">아니오</button></div>`);
  }
  function startStoryStage(stageKey){
    const index=storyStages.findIndex(stage=>stage.key===stageKey),stage=storyStages[index];
    if(!stage||!storyStageUnlocked(index)||!levelReady(stages[stage.key]))return;
    if(!storyEntryAllowed(stage.key))return;
    selectedStoryStage=stage.key;selectedStoryWorld=stage.chapter||1;selectedStage=stage.key;closeDialog();
    if(stage.chapter===3&&stage.number===7&&hasWordCrystalSpirit()){showCrystalGhostEncounter();return;}
    if((stage.chapter||1)===1&&stage.number===7){run={story:true,directBossStage:true,storyReplay:stageCleared(stage.key),result:null};pendingStoryRun=null;storyDialogueIndex=0;go('storyEpilogue');return;}
    if(stage.chapter===3&&stage.number===8){storyDialogueIndex=0;go('storyChapterThreeBossStart');return;}
    if(stage.chapter===5&&[1,10,20].includes(stage.number)){storyDialogueIndex=0;go(stage.number===1?'storyChapterFiveIntro':stage.number===10?'storyChapterFiveMidbossStart':'storyChapterFiveBossStart');return;}
    if(stage.chapter===4&&stage.number===20){storyDialogueIndex=0;go('storyChapterFourBossStart');return;}
    if(stage.chapter===4&&stage.number===10){storyDialogueIndex=0;go('storyChapterFourMidbossStart');return;}
    if(stage.chapter===4&&stage.number===1){storyDialogueIndex=0;go('storyChapterFourIntro');return;}
    if(stage.chapter===3&&stage.number===1){storyDialogueIndex=0;go('storyChapterThreeIntro');return;}
    if(stage.chapter===2&&stage.number===1){storyDialogueIndex=0;go('storyChapterTwoIntro');return;}
    if(stage.chapter===2&&stage.number===7){storyDialogueIndex=0;go('storyChapterTwoBossStart');return;}
    if(stage.intro){storyDialogueIndex=0;go('storyIntro');return;}
    startBattle();
  }
  function renderStages(){const w=worlds[worldIndex]||worlds[0];if(!w)return contentEmpty();return `<button class="text-btn" data-action="nav" data-page="survival">← 월드 목록</button>${title(`WORLD ${w.code}`,w.name,'도전할 맵을 선택하세요. 마지막에는 보물상자가 기다려요.')}<div class="stage-list">${w.keys.map((key,i)=>{const s=stages[key];return `<button class="stage-btn" data-action="stage" data-stage="${key}"><span class="stage-no">${String(i+1).padStart(2,'0')}</span><span><b>${esc(s.name)}</b><small>${esc(s.desc||`${s.words.length}문제`)}${s.creator?` · ${s.questionCount}문제`:''} · 5초 서바이벌</small>${stageCleared(key)?'<span class="stage-status">✓ CLEAR</span>':''}</span><span>→</span></button>`;}).join('')}</div><div class="notice">정답 +1 ◆ · 콤보 보너스 · 클리어 +10 ◆<br>맵은 횟수 제한 없이 다시 도전할 수 있어요.</div>`;}

  function posMatch(a,b){return a[1]===b[1]||a[1].includes(b[1])||b[1].includes(a[1]);}
  function formScore(a,b){let score=Math.max(0,5-Math.abs(a[0].length-b[0].length));if(a[0][0]===b[0][0])score+=3;if(a[1]===b[1])score+=6;else if(posMatch(a,b))score+=4;return score+Math.random()*2;}
  function prepareSniperInsight(){
    run.sniperInsight=selectedCharacter?.class==='sniper'&&Math.random()<.15;
    run.sniperInsightBannerPending=run.sniperInsight;
  }
  function sniperTargetMarkup(){
    return run.sniperInsight?'<img class="sniper-insight-reticle" src="assets/ui/skills/passive-sniper-insight.png" alt="" aria-hidden="true">':'';
  }
  function sniperAnswerHintMarkup(answer){
    return run.sniperInsight&&answer===run.question.answer?'<small class="sniper-answer-hint">정답</small>':'';
  }
  function sniperPairHintAttributes(id){
    if(!run.sniperInsight)return '';
    const pair=run.matchEn.map(item=>item.id).sort((a,b)=>a-b).slice(0,2).indexOf(id);
    if(pair<0)return '';
    const colors=['#5751D8','#147D76','#A44B17','#A73568','#3564A3'];
    return ` data-sniper-pair="${pair+1}" style="--sniper-pair-color:${colors[pair%colors.length]}" aria-description="심안의 저격 · 정답 쌍 ${pair+1}"`;
  }
  function sniperPairHintMarkup(id){
    if(!run.sniperInsight)return '';
    const pair=run.matchEn.map(item=>item.id).sort((a,b)=>a-b).slice(0,2).indexOf(id);
    return pair<0?'':`<small class="sniper-pair-label">쌍 ${pair+1}</small>`;
  }
  function makeQuestion(entry,pool,mode){const choices=pool.filter(x=>x[0]!==entry[0]).sort((a,b)=>formScore(entry,b)-formScore(entry,a)).slice(0,8);const enKo=mode==='en-ko',answer=enKo?`[${entry[1]}] ${entry[2]}`:entry[0];return {entry,mode,prompt:enKo?entry[0]:`[${entry[1]}] ${entry[2]}`,answer,choices:shuffle([answer,...shuffle(choices).slice(0,3).map(x=>enKo?`[${x[1]}] ${x[2]}`:x[0])])};}
  const STORY_QUESTIONS_PER_TURN=5;
  function questionDuration(){const cls=selectedCharacter?.class;let duration=5000,skill='',skillKind='';if(cls==='warrior'&&Math.random()<.4){duration=10000;skill='수호의 시간 · +5초';skillKind='warrior';}else if(cls==='mage'&&Math.random()<.3){skill='타임 스톱 · 답 선택까지';skillKind='mage';}return {duration,skill,skillKind};}
  function activatePassive(){const timing=questionDuration();run.skill=timing.skill;run.skillKind=timing.skillKind;run.storyWarriorBannerPending=Boolean(run.story&&timing.skillKind==='warrior');run.timeStopped=timing.skillKind==='mage';run.timeStopBannerPending=run.timeStopped;if(run.story){if(timing.skillKind==='warrior')run.storyTimeLimit+=5000;}else{run.remaining=timing.duration;run.maxTime=timing.duration;}}
  function passiveBannerMarkup(){
    if(run.sniperInsight&&run.sniperInsightBannerPending){
      run.sniperInsightBannerPending=false;
      return '<div class="arena-combo time-stop-announcement sniper-insight-announcement" role="status" aria-live="polite"><b>심안의 저격</b></div>';
    }
    if(!run.skill||(run.skillKind==='mage'&&!run.timeStopped))return '';
    if(run.skillKind==='mage'){
      if(!run.timeStopBannerPending)return '';
      run.timeStopBannerPending=false;
      return '<div class="arena-combo time-stop-announcement" role="status" aria-live="polite"><b>타임스톱</b></div>';
    }
    if(run.story&&run.skillKind==='warrior'){
      if(!run.storyWarriorBannerPending)return '';
      run.storyWarriorBannerPending=false;
      return '<span class="passive-banner passive-banner-warrior" role="status" aria-live="polite">수호의 방패</span>';
    }
    return `<span class="passive-banner passive-banner-${run.skillKind}" role="status" aria-live="polite">${run.skill}</span>`;
  }
  function removeBattleReward(){document.querySelector('.battle-reward-layer')?.remove();}
  function startBattle(bossRetry=false){
    if(stages[selectedStage]?.story&&(storyStages.find(stage=>stage.key===selectedStage)?.chapter||1)===1&&storyStages.find(stage=>stage.key===selectedStage)?.number===7){startRoyalSlimeBattle();return;}
    if(!selectedCharacter){closeDialog();go('home');toast('먼저 캐릭터를 만들어 주세요');return;}
    clearInterval(timerId);clearTimeout(nextTimer);removeBattleReward();const source=stages[selectedStage];
    if(!levelReady(source)){closeDialog();toast('이 레벨의 맵은 아직 준비 중이에요');return;}
    if(bossRetry&&source.story&&!storyStageUnlocked(storyStages.findIndex(stage=>stage.key===selectedStage)))return;
    if(source.story&&!storyEntryAllowed(selectedStage))return;
    const deck=buildQuestionDeck(source);const cls=selectedCharacter?.class||'warrior',hpMax=cls==='mage'||cls==='ranger'?2:3;run={deck,index:0,correct:0,elapsed:0,locked:false,paused:false,done:false,clear:false,result:null,chest:false,treasure:0,resultStep:'summary',chestClicks:0,story:Boolean(source.story),crystalSpider:Boolean(source.story&&source.storyChapter===5),banditMob:Boolean(source.story&&source.storyChapter===6),golemMob:Boolean(source.story&&source.storyChapter===7),hp:hpMax,hpMax,mobs:[],mobInitialized:false,storyTimeLimit:deck.length*3000,timeStopped:false,iceTimeActive:false,weavingStepActive:false,weavingStepDodging:false,fever:false,feverWords:[],feverNextSpawnAt:0,feverWordSequence:0,slashSkillUsed:false,mp:cls==='mage'?2:cls==='warrior'?1:0,mpMax:cls==='mage'?2:cls==='warrior'?1:0,slashCombo:0,slashBonus:0,slashWindowStartedAt:0,slashExpiresAt:0};
    if(source.story)Object.assign(run,storyVitals(),{storyCharacterId:selectedCharacter.id});
    if(source.abyssGolem)Object.assign(run,window.WORDORIA_ABYSS_GOLEM.reset(),{guardianReducedMotion:reducedMotion(),bossAttackSteps:bossAttackSteps()});
    if(source.banditChief)Object.assign(run,window.WORDORIA_BANDIT_CHIEF.reset(),{guardianReducedMotion:reducedMotion(),bossAttackSteps:bossAttackSteps()});
    if(source.lichDragon)Object.assign(run,window.WORDORIA_LICH_DRAGON.reset(),{guardianReducedMotion:reducedMotion(),bossAttackSteps:bossAttackSteps()});
    if(source.sorcerus)Object.assign(run,window.WORDORIA_SORCERUS.reset(),{guardianReducedMotion:reducedMotion(),bossAttackSteps:bossAttackSteps()});
    if(source.redReaper)Object.assign(run,window.WORDORIA_RED_REAPER.reset(),{guardianReducedMotion:reducedMotion(),bossAttackSteps:bossAttackSteps()});
    if(source.shadowSorceress)Object.assign(run,window.WORDORIA_SHADOW_SORCERESS.reset(),{guardianReducedMotion:reducedMotion(),bossAttackSteps:bossAttackSteps()});
    if(source.blackDragon)Object.assign(run,window.WORDORIA_BLACK_DRAGON.reset(),{guardianReducedMotion:reducedMotion(),bossAttackSteps:bossAttackSteps()});
    if(source.guardian)Object.assign(run,window.WORDORIA_GUARDIAN.reset(),{guardianReducedMotion:reducedMotion(),bossAttackSteps:bossAttackSteps()});
    initializeBattlePet();
    run.storyReplay=Boolean(source.story&&stageCleared(selectedStage));
    prepareQuestion();closeDialog();go('battle');tick();
  }
  function prepareQuestion(){run.eagleEyeActive=false;run.eagleEyeRemoved=[];run.eagleEyePairId=null;run.iceTimeActive=false;if(!run.boss){if(selectedCharacter?.class==='sniper')prepareSniperInsight();else run.sniperInsight=false;}if(run.lichDragon){window.WORDORIA_LICH_DRAGON.board(run,shuffle);run.last=performance.now();run.petEffects?.onQuestion();return;}if(run.redReaper){window.WORDORIA_RED_REAPER.board(run,shuffle);run.last=performance.now();run.petEffects?.onQuestion();return;}if(run.guardian){if((run.sorcerus||run.banditChief||run.abyssGolem)&&run.index+Math.max(1,run.bossAttackSteps||1)>=run.deck.length){const extra=buildQuestionDeck(stages[selectedStage]);if(extra[0].entry[0]===run.deck.at(-1).entry[0])[extra[0],extra[1]]=[extra[1],extra[0]];run.deck.push(...extra);}const item=run.deck[run.index];run.guardianQuestionNumber=run.index+1;run.question=makeQuestion(item.entry,stages[selectedStage].words,item.mode);run.last=performance.now();run.petEffects?.onQuestion();return;}if(run.boss){prepareRoyalSlimeBoard();return;}const item=run.deck[run.index];run.question=makeQuestion(item.entry,stages[selectedStage].words,item.mode);activatePassive();run.last=performance.now();run.locked=false;if(run.story){run.fever=false;const start=Math.floor(run.index/STORY_QUESTIONS_PER_TURN)*STORY_QUESTIONS_PER_TURN;run.matchBoard=run.deck.slice(start,start+STORY_QUESTIONS_PER_TURN);run.matched=new Set();run.queuedStoryPairs=[];run.pendingDefeat=false;run.selectedKo=null;run.selectedEn=null;run.matchFeedback='';run.matchKo=shuffle(run.matchBoard.map((x,i)=>({entry:x.entry,id:start+i})));run.matchEn=shuffle(run.matchBoard.map((x,i)=>({entry:x.entry,id:start+i})));run.mobs=[];run.petEffects?.onQuestion();}}
  function initializeBattlePet(){
    if(!run?.story)return;
    const pet=itemById(equippedMap().pet);
    if(!pet||!itemOwned(pet))return;
    run.petEffects=window.WORDORIA_PETS.attach(run,pet,{notify(){document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'success'}}));}});
  }
  function petAnswerHintMarkup(answer){
    return run.petHint?.question===run.question&&answer===run.question.answer?'<small class="pet-answer-hint">정령의 정답</small>':'';
  }
  function petPairHintMarkup(id){
    return run.petHint?.pairId===id&&!run.matched.has(id)?'<small class="pet-pair-hint">정령의 정답</small>':'';
  }
  function petBattleMarkup(){
    const effect=run?.petEffects;if(!effect||run.done||run.fever||run.feverTransition)return '';
    const pet=effect.pet;
    return `<div class="battle-pet" aria-label="동행 펫 ${esc(pet.name)}"><img src="${esc(deployedAssetUrl(pet.art_path))}" alt="">${run.petShield?'<span class="pet-shield-status" role="status">보호막</span>':''}${run.petTimeMs>0?'<span class="pet-time-status" role="status">시간 정지</span>':''}</div>${run.petNoticeMs>0?`<div class="pet-skill-notice" role="status" aria-live="polite">${esc(run.petNotice)}</div>`:''}`;
  }
  function refreshPetBattleFeedback(){
    const arena=$('arena');
    arena?.querySelector('.battle-pet')?.remove();
    arena?.querySelector('.pet-skill-notice')?.remove();
    arena?.insertAdjacentHTML('beforeend',petBattleMarkup());
    const vitals=arena?.querySelector('.story-vitals');if(vitals)vitals.outerHTML=storyVitalsMarkup();
    const actions=document.querySelector('.story-action-bar');if(actions)actions.outerHTML=storyBattleActions();
  }
  function battleHeroMarkup(){
    const petMarkup=run?.petEffects?petBattleMarkup():'';
    const heroClass=selectedCharacter?.class;
    const variant=variantOf(selectedCharacter);
    if(heroClass==='sniper'&&variant==='female'){
      const skin=itemById(equippedMap().skin),snowSkin=skin?.code==='sniper_snow_crystal_skin';
      return `<div class="battle-hero battle-hero-sniper battle-hero-female${snowSkin?' battle-skin-sniper_snow_crystal_skin':''}" aria-label="여성 스나이퍼${snowSkin?' · '+esc(skin.name):''}"><span class="battle-sprite" aria-hidden="true"></span></div>${petMarkup}`;
    }
    if(heroClass==='warrior'||heroClass==='mage'||heroClass==='pugilist'||heroClass==='ranger'){
      const classLabel={warrior:'전사',mage:'마법사',pugilist:'권투사',ranger:'궁수'}[heroClass];
      const skin=itemById(equippedMap().skin),skinClass=skin?.code?` battle-skin-${esc(skin.code)}`:'';
      const weavingClass=heroClass==='pugilist'&&run?.story?(run.weavingStepDodging?' weaving-step-dodging':run.weavingStepActive?' weaving-step-ready':''):'';
      const weavingFeedback=heroClass==='pugilist'&&run?.story?`${run.weavingStepActive?'<span class="weaving-step-status" role="status">회피 준비</span>':''}${run.weavingStepNotice&&run.weavingStepPopUntil>performance.now()?`<div class="arena-combo weaving-step-announcement" role="status" aria-live="polite"><b>${esc(run.weavingStepNotice)}</b></div>`:''}`:'';
      return `<div class="battle-hero battle-hero-${heroClass} battle-hero-${variant}${skinClass}${weavingClass}" aria-label="${variant==='female'?'여성':'남성'} ${classLabel}${skin?' · '+esc(skin.name):''}"><span class="battle-sprite" aria-hidden="true"></span>${heroClass==='mage'||heroClass==='ranger'?'<span class="battle-projectile" aria-hidden="true"></span>':''}</div>${weavingFeedback}${petMarkup}`;
    }
    return portrait()+petMarkup;
  }
  function storyBattleActions(){
    const defaults={warrior:['연속 베기','guardian_crystal','shield'],mage:['아이스 타임','time_crystal','hourglass'],pugilist:['위빙 스텝','combo_crystal','combo'],ranger:['행운의 화살','fortune_crystal','arrow'],sniper:['심안의 저격',null,'sword']};
    const classCode=selectedCharacter?.class||'warrior',fallback=defaults[classCode]||defaults.warrior;
    const definition=storySkillDefinitions.find(row=>row.class_code===classCode);
    const catalogIcon=storySkillIcons.find(row=>row.code===definition?.icon_code);
    const skill=classCode==='ranger'?'매의 눈':classCode==='mage'?'아이스 타임':classCode==='pugilist'?'위빙 스텝':definition?.skill_name||fallback[0],iconData=catalogIcon||{icon_key:fallback[2],gem_color:'#d9f8f2',glow_color:'#a5e5dc',icon_color:'#2d958b'};
    const color=(value,backup)=>/^#[0-9a-f]{6}$/i.test(value||'')?value:backup;
    const candidatePath=String(iconData.asset_path||'');
    const assetPath=/^assets\/[A-Za-z0-9_./-]+\.(?:png|webp|svg)$/i.test(candidatePath)&&!candidatePath.split('/').includes('..')?candidatePath:'';
    const iceSkill=classCode==='mage',iceReady=iceSkill&&canActivateMageIceTime();
    const eagleSkill=classCode==='ranger',eagleReady=eagleSkill&&canActivateRangerEagleEye();
    const weavingSkill=classCode==='pugilist',weavingReady=weavingSkill&&canActivatePugilistWeavingStep();
    const slashSkill=classCode==='warrior',slashActive=slashSkill&&run.slashExpiresAt>performance.now(),slashReady=slashSkill&&run.mp>=1;
    const art=eagleSkill?`<img src="${esc(deployedAssetUrl('assets/ui/skills/active-ranger-eagle-eye.png'))}" alt="" aria-hidden="true">`:classCode==='sniper'?'<img src="assets/ui/skills/passive-sniper-insight.png" alt="" aria-hidden="true">':weavingSkill?`<img src="${esc(deployedAssetUrl('assets/ui/skills/active-pugilist-weaving-step.png'))}" alt="" aria-hidden="true">`:iceSkill?`<img src="${esc(deployedAssetUrl('assets/ui/skills/active-mage-ice-time.png'))}" alt="" aria-hidden="true">`:slashSkill?`<img src="${esc(deployedAssetUrl('assets/ui/skills/active-warrior-consecutive-slash.png'))}" alt="" aria-hidden="true">`:assetPath?`<img src="${esc(deployedAssetUrl(assetPath))}" alt="" aria-hidden="true">`:icon(iconData.icon_key);
    const skillStyle=`--slash-sweep:${slashSkill&&run.slashSkillUsed&&(slashActive||!slashReady)?Math.min(360,Math.max(0,(1-(run.slashExpiresAt-performance.now())/10000)*360)):0}deg;--skill-gem:${color(iconData.gem_color,'#d9f8f2')};--skill-ring:${color(iconData.glow_color,'#a5e5dc')};--skill-ink:${color(iconData.icon_color,'#2d958b')}`;
    const slots=equippedPotions().map((type,index)=>{
      const item=type?potionTypes[type]:null;
      const usable=Boolean(item)&&!run.fever&&!run.potionUsePending&&!run.locked&&!run.paused&&!run.done&&!run.stunned&&(type==='red'?run.hp<run.hpMax:run.mp<run.mpMax);
      const count=item?potionCount(type):0;
      const artIcon=item?`<span class="potion-icon ${item.className}" aria-hidden="true"></span>`:`<span class="story-action-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></span>`;
      const label=item?`아이템 슬롯 ${index+1}, ${item.name}, 남은 수량 ${count+1}개${usable?', 사용 가능':', 지금 사용할 수 없음'}`:`아이템 슬롯 ${index+1}, 장착된 아이템 없음`;
      return `<button class="story-action-slot story-item-slot ${item?`story-potion-${item.className}`:'story-empty-slot'}" type="button" ${usable?`data-action="use-story-potion" data-slot-index="${index}"`:'disabled'} aria-label="${esc(label)}">${artIcon}<b>${item?esc(item.name):`슬롯 ${index+1}`}</b><small>${item?`×${count+1} · ${type==='red'?`HP ${run.hp}/${run.hpMax}`:`MP ${run.mp}/${run.mpMax}`}`:'비어 있음'}</small></button>`;
    }).join('');
    const iceButton=iceSkill?`<button class="story-action-slot story-skill-slot story-ice-skill ${run.iceTimeActive?'activated':run.mp<1?'used':''}" style="${skillStyle}" type="button" data-action="activate-ice-time" ${iceReady?'':'disabled'} aria-label="아이스 타임 액티브 스킬, MP ${run.mp}/${run.mpMax}, ${run.iceTimeActive?'활성화 중':iceReady?'사용 가능':'지금 사용할 수 없음'}"><span class="story-action-icon" aria-hidden="true">${art}</span><b>${run.iceTimeActive?'아이스 타임 활성':skill}</b><small>${run.iceTimeActive?'시간 정지 · 오답 시 해제':run.mp<1?'MP 1 필요':'MP 1 소모 · 현재 웨이브 정지'}</small></button>`:'';
    const eagleButton=eagleSkill?`<button class="story-action-slot story-skill-slot story-eagle-skill ${run.eagleEyeActive?'activated':eagleReady?'':'used'}" style="${skillStyle}" type="button" data-action="activate-eagle-eye" ${eagleReady?'':'disabled'} aria-label="매의 눈 액티브 스킬, MP ${run.mp}/${run.mpMax}, ${run.eagleEyeActive?'정답 표시 중':eagleReady?'사용 가능':'지금 사용할 수 없음'}"><span class="story-action-icon" aria-hidden="true">${art}</span><b>${run.eagleEyeActive?'매의 눈 활성':'매의 눈'}</b><small role="status">${run.eagleEyeActive?(run.guardian&&!run.redReaper&&!run.lichDragon?'정답 표시 · 답변 시 해제':'영어 선택 → 한글 정답 표시'):run.mp<1?'MP 1 필요':eagleReady?'MP 1 소모 · 정답 표시':'지금 사용할 수 없음'}</small></button>`:'';
    const weavingButton=weavingSkill?`<button class="story-action-slot story-skill-slot story-weaving-skill ${run.weavingStepActive?'activated':weavingReady?'':'used'}" style="${skillStyle}" type="button" data-action="activate-weaving-step" ${weavingReady?'':'disabled'} aria-label="위빙 스텝 액티브 스킬, MP ${run.mp}/${run.mpMax}, ${run.weavingStepActive?'회피 준비 중':weavingReady?'사용 가능':'지금 사용할 수 없음'}"><span class="story-action-icon" aria-hidden="true">${art}</span><b>${run.weavingStepActive?'위빙 스텝 활성':skill}</b><small>${run.weavingStepActive?'다음 오답 1회 · HP / 콤보 보호':run.mp<1?'MP 1 필요':weavingReady?'MP 1 소모 · 오답 1회 회피':'지금 사용할 수 없음'}</small></button>`:'';
    return `<div class="story-action-bar" aria-label="전투 아이템 및 스킬"><div class="story-item-group">${slots}</div>${eagleSkill?eagleButton:weavingSkill?weavingButton:iceSkill?iceButton:`<button class="story-action-slot story-skill-slot ${slashSkill?'story-slash-skill':classCode==='sniper'?'story-sniper-skill':''} ${slashActive?'activated':!slashReady&&run.slashSkillUsed?'used':''}" style="${skillStyle}" type="button" ${slashSkill&&slashReady&&run.mp>0?'data-action="activate-slash"':''} ${slashSkill?`aria-label="연속 베기 액티브 스킬, MP ${run.mp}/${run.mpMax}, ${slashActive?'활성화 중':slashReady?'사용 가능':'마나 부족'}"`:`disabled aria-label="${esc(skill)} 패시브 스킬, 자동 발동"`}><span class="story-action-icon" aria-hidden="true">${art}</span><b>${slashSkill?(slashActive?'연속 베기 활성':slashReady?'연속 베기':'마나 부족'):esc(skill)}</b><small id="slash-skill-status">${slashSkill?(slashActive?`콤보 ${run.slashCombo} · ${Math.max(0,(run.slashExpiresAt-performance.now())/1000).toFixed(1)}초 남음`:slashReady?'MP 1 소모 · 10초간 활성':'MP 1 필요'):classCode==='sniper'?(run.sniperInsight?'정답 안내 중':'15% 확률 · 자동 발동'):'자동 발동'}</small></button>`}</div>`;
  }
  async function useStoryPotion(index,button){if(!run?.story||run.fever||run.done||run.paused||run.locked||run.stunned)return;const type=equippedPotions()[index],item=potionTypes[type];if(!item)return;const canUse=type==='red'?run.hp<run.hpMax:run.mp<run.mpMax;if(!canUse){toast(type==='red'?'체력이 가득 차 있어요':'마나가 가득 차 있어요');return;}button.disabled=true;try{if(localMode){potionInventory={...potionInventory,[`equipped_slot_${index+1}`]:null};demoState.potionInventory={...(demoState.potionInventory||{}),[selectedCharacter.id]:potionInventory};saveDemo();}else{await rpc('use_story_potion',{p_character_id:selectedCharacter.id,p_slot_index:index+1});await loadCharacterExtras();}if(type==='red')run.hp=Math.min(run.hpMax,run.hp+1);else run.mp=Math.min(run.mpMax,run.mp+1);render();toast(`${item.name}을(를) 사용했어요`);}catch(error){console.error(error);button.disabled=false;toast('포션을 사용하지 못했어요. 다시 시도해 주세요.');}}

  const ROYAL_SLIME_REWARD=200, ROYAL_SLIME_RECORD='보스 · 거대 로얄 슬라임';
  const ROYAL_SLIME_HP=50, ROYAL_SLIME_LIMIT=300000, ROYAL_SLIME_ABSORB=30000;
  const CRYSTAL_GHOST_RECORD='보스 · 숨겨진 크리스탈 유령', CRYSTAL_GHOST_HP=90, CRYSTAL_GHOST_REWARD=2200, CRYSTAL_GHOST_LIMIT=210000;
  const CRYSTAL_GHOST_ART='assets/monsters/crystal-ghost/crystal-ghost.png';
  function hasWordCrystalSpirit(){return shopItems.some(item=>item.code==='pet'&&itemOwned(item));}
  function showCrystalGhostEncounter(){
    modal(`<div class="eyebrow">WORLD 3-7 · HIDDEN BOSS</div><img class="ghost-encounter-spirit" src="assets/items/equipment/item_word_crystal_sprite_legendary.webp" alt="워드 크리스탈 정령"><h2>워드 크리스탈 정령</h2><p>크리스탈 사원 안쪽에서 너무나 차갑고 오싹한 기운이 느껴져.. 한번 그쪽으로 가볼래?</p>${bossIntroductionMarkup({chapter:3,number:7,hidden:true})}<div class="actions"><button class="primary" data-action="crystal-ghost-encounter">예</button><button class="secondary" data-action="crystal-ghost-decline">아니오</button></div>`,{closable:false});
  }
  function startCrystalGhostBattle(){
    if(selectedStage!=='story-ch3-7'||!hasWordCrystalSpirit()||!storyStageUnlocked(storyStages.findIndex(stage=>stage.key===selectedStage))||!levelReady(stages[selectedStage]))return;
    pendingStoryRun=null;startRoyalSlimeBattle(true);
  }
  function startRoyalSlimeBattle(crystalGhost=false){
    if(!selectedCharacter||!storyEntryAllowed(selectedStage))return;
    if(!crystalGhost&&!run?.boss)pendingStoryRun=run;
    clearInterval(timerId);clearTimeout(nextTimer);cancelSpeech();
    const source=stages[selectedStage],words=crystalGhost?storyStages.filter(stage=>(stage.chapter||1)<=3).flatMap(stage=>stages[stage.key]?.words||[]):source.words;
    const pool=Array.from(new Map(words.map(entry=>[entry[0].toLocaleLowerCase('en-US'),entry])).values()),total=crystalGhost?CRYSTAL_GHOST_HP:ROYAL_SLIME_HP;
    if(pool.length<5){toast('보스전에는 서로 다른 단어가 5개 이상 필요해요');return;}
    const deck=[];let cycle=[];
    while(deck.length<total){
      const boardWords=new Set(deck.slice(Math.floor(deck.length/5)*5).map(item=>item.entry[0]));
      if(!cycle.length)cycle=shuffle(pool);
      let index=cycle.findIndex(entry=>!boardWords.has(entry[0])&&entry[0]!==deck.at(-1)?.entry[0]);
      if(index<0)index=cycle.findIndex(entry=>!boardWords.has(entry[0]));
      if(index<0){const unused=pool.filter(entry=>!boardWords.has(entry[0]));const entry=shuffle(unused)[0];deck.push({entry,mode:'en-ko'});continue;}
      deck.push({entry:cycle.splice(index,1)[0],mode:'en-ko'});
    }
    const cls=selectedCharacter.class,hpMax=cls==='mage'||cls==='ranger'?2:3;
    run={boss:true,story:true,directBossStage:Boolean(pendingStoryRun?.directBossStage),deck,index:0,correct:0,bossHp:ROYAL_SLIME_HP,absorbed:false,timePenalty:0,elapsed:0,storyTimeLimit:ROYAL_SLIME_LIMIT,hp:hpMax,hpMax,mp:cls==='mage'?2:cls==='warrior'?1:0,mpMax:cls==='mage'?2:cls==='warrior'?1:0,locked:false,paused:false,done:false,stunned:false,fever:false,iceTimeActive:false,weavingStepActive:false,weavingStepDodging:false,mobs:[],slashSkillUsed:false,slashBonus:0,slashCombo:0,slashExpiresAt:0,slashWindowStartedAt:0};
    Object.assign(run,storyVitals(),{storyCharacterId:selectedCharacter.id,bossAttackSteps:bossAttackSteps()});
    if(crystalGhost)Object.assign(run,{crystalGhost:true,bossHp:total,bossMaxHp:total,storyTimeLimit:CRYSTAL_GHOST_LIMIT,directBossStage:false,ghostThresholds:[],ghostFallsPending:0});
    initializeBattlePet();
    closeDialog();prepareRoyalSlimeBoard();go('battle');tick();
  }
  function prepareRoyalSlimeBoard(){
    run.eagleEyeActive=false;run.eagleEyeRemoved=[];run.eagleEyePairId=null;run.iceTimeActive=false;if(selectedCharacter?.class==='sniper')prepareSniperInsight();else run.sniperInsight=false;
    const start=Math.floor(run.index/5)*5;
    run.matchBoard=run.deck.slice(start,start+5);run.matched=new Set();run.queuedStoryPairs=[];run.pendingDefeat=false;run.selectedKo=null;run.selectedEn=null;run.locked=false;run.attack=false;
    const pairs=run.matchBoard.map((item,index)=>({entry:item.entry,id:start+index}));
    run.matchKo=shuffle(pairs);run.matchEn=shuffle(pairs);run.last=performance.now();
    if(run.crystalGhost)activatePassive();
    run.petEffects?.onQuestion();
  }
  function royalSlimeRemaining(){return Math.max(0,(run.crystalGhost?run.storyTimeLimit:ROYAL_SLIME_LIMIT)-run.elapsed-run.timePenalty);}
  function royalSlimeTime(ms){const seconds=Math.ceil(ms/1000);return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
  function updateRoyalSlimeClock(){
    const remaining=royalSlimeRemaining(),timer=$('boss-timer');if(timer)timer.textContent=royalSlimeTime(remaining);
    $('boss-clock')?.classList.toggle('danger',remaining<=30000);
    if(!remaining)finishRoyalSlimeBattle(false,'timeout');
  }
  function storyVitalsMarkup(){
    const hearts=(value,max)=>`<span aria-hidden="true">${'♥'.repeat(Math.max(0,value))}${'♡'.repeat(Math.max(0,max-value))}</span>`;
    const meter=(kind,label,value,max)=>`<div class="story-${kind}" role="meter" aria-label="${label} ${value}/${max}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${value}">${hearts(value,max)}</div>`;
    return `<div class="story-vitals">${meter('hp','체력',run.hp,run.hpMax)}${run.mpMax>0?meter('mp','마나',run.mp,run.mpMax):''}</div>`;
  }
  function renderLichDragonBattle(){
    const scale=run.guardianReducedMotion?.5:1;
    const visual=run.tornadoMs>0&&run.guardianVisual==='idle'?'attack':run.guardianVisual;
    const cards=run.lichCards.map(card=>{
      const {side,id,entry}=card,matched=run.matched.has(id),selected=run.selectedCard?.side===side&&run.selectedCard.id===id;
      return `<button type="button" class="story-match-item ${matched?'matched':''} ${selected?'selected':''}" data-action="lich-pick" data-side="${side}" data-id="${id}" ${matched||run.locked||run.paused||run.stunned?'disabled':''} ${sniperPairHintAttributes(id)} aria-pressed="${selected}"><span>${esc(side==='ko'?entry[2]:entry[0])}</span>${sniperPairHintMarkup(id)}${petPairHintMarkup(id)}${eaglePairHintMarkup(id,side)}</button>`;
    }).join('');
    return `<div class="royal-boss-heading"><div><div class="eyebrow">AMETHYST CAVERN · FINAL BOSS</div><h1>부활한 리치 드래곤</h1></div><div class="royal-boss-clock" id="boss-clock"><small>TIME LEFT</small><strong id="boss-timer">${royalSlimeTime(Math.max(0,run.storyTimeLimit-run.elapsed))}</strong></div></div><div id="arena" class="arena guardian-boss-arena black-dragon-arena lich-dragon-arena world-five-battle world-five-final-boss ${run.paused?'paused':''} ${run.iceTimeActive?'ice-time-active':''} ${run.attack?'hit':''} ${run.stunned?'wrong story-stunned':''} ${run.guardianPhase==='drain-charge'||run.guardianPhase==='drain-hold'?'guardian-casting':''} ${run.guardianPhase==='drain-hold'?'black-dragon-drain-contact':''}"><div class="arena-floor"></div>${battleHeroMarkup()}${run.sniperInsight?passiveBannerMarkup():''}<div class="guardian-enemy"><span class="guardian-sprite guardian-${visual}" role="img" aria-label="부활한 리치 드래곤"></span>${run.sniperInsight?sniperTargetMarkup():''}</div><div class="guardian-health" role="meter" aria-label="보스 HP" aria-valuemin="0" aria-valuemax="200" aria-valuenow="${run.bossHp}"><i style="width:${run.bossHp/2}%"></i></div>${storyVitalsMarkup()}${iceTimeEffectMarkup()}${eagleEyeEffectMarkup()}${run.drainNotice?'<div class="black-dragon-drain" aria-hidden="true"><i></i><i></i><i></i></div>':''}${run.tornadoMs>0?`<div class="lich-tornado-flight" style="--tornado-flight:${600*scale}ms;--tornado-delay:${run.tornadoMs-900*scale}ms" aria-hidden="true"><div class="lich-tornado"><i></i><i></i><i></i><i></i></div></div>`:''}${run.tornadoNoticeMs>0?'<div class="lich-tornado-impact" aria-hidden="true"></div>':''}<div class="royal-boss-skill-notice" role="status" aria-live="polite">${esc(run.drainNotice||(run.tornadoNoticeMs>0?'블랙 토네이토 · 카드가 섞였어요!':run.tornadoMs>0?'블랙 토네이토':''))}</div><div class="crystal-strike" aria-hidden="true"></div><div class="crystal-shards" aria-hidden="true">${'<i></i>'.repeat(7)}</div></div>${storyBattleActions()}<p class="lich-match-instruction">영어와 한글 뜻을 연결하세요 · 같은 열에서도 연결할 수 있어요</p><div class="story-match-board lich-match-board">${cards}</div>`;
  }
  function lichDragonPick(button){
    const rules=window.WORDORIA_LICH_DRAGON,side=button.dataset.side,id=Number(button.dataset.id);
    if(!run?.lichDragon||!rules.canPick(run,side,id))return;
    const selected=run.selectedCard;
    if(selected&&!(selected.side===side&&selected.id===id)&&!rules.isCorrect(run,side,id)&&run.weavingStepActive){run.selectedCard=null;if(consumePugilistWeavingStep())return;}
    const result=rules.pick(run,side,id,battleContactDelay());
    if(!result)return;
    if(result==='selected'){run.eagleEyePairId=run.selectedEn;render();return;}
    run.eagleEyeActive=false;run.eagleEyePairId=null;
    if(result==='correct'){
      if(run.slashExpiresAt>performance.now()){run.slashCombo++;run.slashBonus+=run.slashCombo*2;}
      speak(run.matchEn.find(item=>item.id===id).entry[0]);
    }else document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'error'}}));
    render();
  }
  function advanceLichDragonBattle(delta,clockDelta=delta){
    if(!run?.lichDragon||run.done||run.paused)return;
    if(run.guardianPhase==='defeat')clockDelta=0;
    const remaining=Math.max(0,run.storyTimeLimit-run.elapsed);
    if(!run.iceTimeActive&&clockDelta>remaining){delta*=remaining/clockDelta;clockDelta=remaining;}
    const activeClock=run.iceTimeActive?0:clockDelta;
    run.elapsed+=activeClock;updateWarriorSlash();
    const events=window.WORDORIA_LICH_DRAGON.advance(run,delta,Math.random,activeClock,shuffle);
    for(const event of events){
      if(event==='hit'){run.petEffects?.onCorrect();document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'success'}}));}
      if(event==='tornado-contact'||event==='drain-hit')document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'error'}}));
      if(event==='board-ready')prepareQuestion();
      if(event==='victory'){finishBattle(true,'boss-defeated');return;}
      if(event==='defeat-player'){finishBattle(false,'hp-zero');return;}
    }
    if(events.length){
      // Keep an in-flight player attack on its contact frame when boss effects
      // redraw the cards or projectile; do not restart the hero strip.
      const hero=run.attack?document.querySelector('.battle-hero'):null;
      render();
      if(hero)document.querySelector('.battle-hero')?.replaceWith(hero);
    }
    const timer=$('boss-timer');if(timer)timer.textContent=royalSlimeTime(Math.max(0,run.storyTimeLimit-run.elapsed));
    $('boss-clock')?.classList.toggle('danger',run.storyTimeLimit-run.elapsed<=30000);
    if(run.elapsed>=run.storyTimeLimit&&run.guardianPhase!=='defeat')finishBattle(false,'timeout');
  }
  function renderSorcerusBattle(){
    const frozen=run.shadowFreezeMs>0,healing=run.sorcerusHealMs>0;
    const choices=run.question.choices.map((choice,index)=>`<button class="answer" data-action="answer" data-index="${index}" ${run.locked||run.paused||frozen?'disabled':''}><span>${index+1}</span>${esc(choice)}${run.eagleEyeActive&&choice===run.question.answer?'<small class="eagle-answer-hint" role="status">정답</small>':''}${run.sniperInsight?sniperAnswerHintMarkup(choice):''}${run.petHint?petAnswerHintMarkup(choice):''}</button>`).join('');
    return `<div class="royal-boss-heading"><div><div class="eyebrow">AMETHYST CAVERN · MID BOSS</div><h1>이성을 잃은 소서러스</h1></div><div class="royal-boss-clock" id="boss-clock"><small>TIME LEFT</small><strong id="boss-timer">${royalSlimeTime(Math.max(0,run.storyTimeLimit-run.elapsed))}</strong></div></div><div id="arena" class="arena guardian-boss-arena sorcerus-arena world-five-battle world-five-midboss ${run.paused?'paused':''} ${run.iceTimeActive?'ice-time-active':''} ${frozen?'sorcerus-freezing':''} ${healing?'sorcerus-healing':''} ${run.attack?'hit':''} ${run.stunned?'wrong story-stunned':''}"><div class="arena-floor"></div>${battleHeroMarkup()}${run.sniperInsight?passiveBannerMarkup():''}<div class="guardian-enemy"><span class="guardian-sprite sorcerus-sprite" style="${sorcerusSpriteStyle()}" role="img" aria-label="이성을 잃은 소서러스"></span>${healing?'<div class="sorcerus-heal-light" aria-hidden="true"><i>✦</i><i>✧</i><i>✦</i><i>✧</i><i>✦</i></div>':''}${run.sniperInsight?sniperTargetMarkup():''}</div><div class="guardian-health" role="meter" aria-label="보스 HP" aria-valuemin="0" aria-valuemax="120" aria-valuenow="${run.bossHp}"><i id="guardian-energy-fill" style="width:${run.bossHp/120*100}%"></i></div>${storyVitalsMarkup()}${iceTimeEffectMarkup()}${eagleEyeEffectMarkup()}${frozen?'<img class="sorcerus-ice-field" src="assets/effects/fx_ice_time_field.svg" alt="" aria-hidden="true"><div class="royal-boss-skill-notice sorcerus-ice-notice" role="status">아이스 타임 · 3초간 답을 선택할 수 없어요</div>':''}${healing?`<div class="royal-boss-skill-notice sorcerus-heal-notice" role="status">힐링 · HP +${run.sorcerusHealAmount}</div>`:''}<div class="crystal-strike" aria-hidden="true"></div><div class="crystal-shards" aria-hidden="true">${'<i></i>'.repeat(7)}</div></div>${storyBattleActions()}<div class="question-card guardian-question"><h1>${esc(run.question.prompt)}</h1></div><div class="answers guardian-answers">${choices}</div>`;
  }
  function sorcerusSpriteStyle(){
    const sprite=window.WORDORIA_SORCERUS.visual(run);
    return `width:${sprite.width/320*100}%;background-image:url('assets/monsters/sorcerus/char_sorcerus_sd_${sprite.file}_strip.png');background-size:${sprite.count*100}% 100%;background-position:${sprite.frame/(sprite.count-1)*100}% 0`;
  }
  function syncSorcerusBattleVisual(){
    const sprite=document.querySelector('.sorcerus-sprite');
    if(sprite)sprite.style.cssText=sorcerusSpriteStyle();
  }
  function abyssGolemSpriteStyle(){
    const boss=window.WORDORIA_ABYSS_GOLEM,sprite=boss.visual(run);
    return `width:${sprite.width/320*100}%;height:${sprite.height/320*100}%;background-image:url('${deployedAssetUrl(boss.SPRITE_ROOT+'monster_abyss_golem_sd_'+sprite.file+'_strip.png')}');background-size:300% 100%;background-position:${sprite.frame*50}% 0`;
  }
  function syncAbyssGolemBattleVisual(){
    const sprite=document.querySelector('.abyss-golem-sprite');if(sprite)sprite.style.cssText=abyssGolemSpriteStyle();
    const arena=$('arena'),enemy=arena?.querySelector('.abyss-golem-enemy'),hero=arena?.querySelector('.battle-hero, .portrait');
    if(!arena||!enemy)return;
    const pose=window.WORDORIA_ABYSS_GOLEM.stompMotion(run);
    enemy.style.transform='';
    enemy.style.zIndex=pose?'8':'';
    if(!pose||!hero)return;
    const a=arena.getBoundingClientRect(),h=hero.getBoundingClientRect(),sx=arena.clientWidth/a.width;
    const start=enemy.offsetLeft+enemy.offsetWidth*.5,end=(h.left-a.left+h.width*.5)*sx;
    const distance=(end-start)*(run.guardianReducedMotion?.15:1),lift=pose.lift*Math.max(0,Math.min(28,enemy.offsetTop));
    enemy.style.transform=`translate(${distance*pose.progress}px,${-lift}px)`;
  }
  function renderAbyssGolemBattle(){
    const choices=run.question.choices.map((choice,index)=>`<button class="answer" data-action="answer" data-index="${index}" ${run.locked||run.paused?'disabled':''}><span>${index+1}</span>${esc(choice)}${run.eagleEyeActive&&choice===run.question.answer?'<small class="eagle-answer-hint" role="status">정답</small>':''}${run.sniperInsight?sniperAnswerHintMarkup(choice):''}${run.petHint?petAnswerHintMarkup(choice):''}</button>`).join('');
    return `<div class="royal-boss-heading"><div><div class="eyebrow">WORLD 6A · MID BOSS</div><h1>심연의 골렘</h1></div><div class="royal-boss-clock" id="boss-clock"><small>TIME LEFT</small><strong id="boss-timer">${royalSlimeTime(Math.max(0,run.storyTimeLimit-run.elapsed))}</strong></div></div><div id="arena" class="arena guardian-boss-arena abyss-golem-arena world-six-battle world-six-a-inverted ${run.paused?'paused':''} ${run.iceTimeActive?'ice-time-active':''} ${run.attack?'hit':''} ${run.golemPlayerHit?'wrong story-stunned':''}"><div class="arena-floor"></div>${battleHeroMarkup()}${run.sniperInsight?passiveBannerMarkup():''}<div class="guardian-enemy abyss-golem-enemy"><span class="abyss-golem-sprite" style="${abyssGolemSpriteStyle()}" role="img" aria-label="심연의 골렘"></span>${run.sniperInsight?sniperTargetMarkup():''}</div><div class="guardian-health" role="meter" aria-label="심연의 골렘 HP" aria-valuemin="0" aria-valuemax="200" aria-valuenow="${run.bossHp}"><i id="guardian-energy-fill" style="width:${run.bossHp/2}%"></i></div><span class="abyss-hp-label">HP ${run.bossHp} / 200 · DMG ${run.bossAttackSteps}</span>${storyVitalsMarkup()}${iceTimeEffectMarkup()}${eagleEyeEffectMarkup()}<div class="royal-boss-skill-notice" role="status" aria-live="polite">${esc(run.golemNotice||'')}${run.golemBedrockReady?' · 방어 준비':''}</div><div class="crystal-strike" aria-hidden="true"></div><div class="crystal-shards" aria-hidden="true">${'<i></i>'.repeat(7)}</div></div>${storyBattleActions()}<div class="question-card guardian-question"><h1>${esc(run.question.prompt)}</h1></div><div class="answers guardian-answers">${choices}</div>`;
  }
  function banditChiefSpriteStyle(){
    const boss=window.WORDORIA_BANDIT_CHIEF,sprite=boss.visual(run);
    return `width:${sprite.width/320*100}%;background-image:url('${deployedAssetUrl(boss.SPRITE_ROOT+'char_bandit_chief_sd_'+sprite.file+'_strip.png')}');background-size:${sprite.count*100}% 100%;background-position:${sprite.frame/(sprite.count-1)*100}% 0`;
  }
  function syncBanditChiefBattleVisual(){
    const sprite=document.querySelector('.bandit-chief-sprite');
    if(sprite)sprite.style.cssText=banditChiefSpriteStyle();
    const flight=document.querySelector('.bandit-axe-flight'),pose=window.WORDORIA_BANDIT_CHIEF.projectile(run);
    if(!flight||!pose)return;
    const arena=$('arena'),enemy=arena?.querySelector('.bandit-chief-enemy'),hero=arena?.querySelector('.battle-hero, .portrait');
    if(!arena||!enemy||!hero)return;
    const a=arena.getBoundingClientRect(),e=enemy.getBoundingClientRect(),h=hero.getBoundingClientRect(),p=pose.progress;
    // Scale rect coordinates into local CSS pixels (also works in scaled previews).
    const sx=arena.clientWidth/a.width,sy=arena.clientHeight/a.height;
    const origin=window.WORDORIA_BANDIT_CHIEF.THROW_ORIGIN;
    const startX=(e.left-a.left+e.width*(origin.x/320-.2))*sx,startY=(e.top-a.top+e.height*origin.y/320)*sy;
    const endX=(h.left-a.left+h.width*.5)*sx,endY=(h.top-a.top+h.height*.52)*sy;
    flight.style.left=`${startX+(endX-startX)*p}px`;
    flight.style.top=`${startY+(endY-startY)*p-(run.guardianReducedMotion?0:Math.sin(p*Math.PI)*18)}px`;
    flight.style.setProperty('--axe-angle',`${pose.rotation}deg`);
  }
  function renderBanditChiefBattle(){
    const choices=run.question.choices.map((choice,index)=>`<button class="answer" data-action="answer" data-index="${index}" ${run.locked||run.paused?'disabled':''}><span>${index+1}</span>${esc(choice)}${run.eagleEyeActive&&choice===run.question.answer?'<small class="eagle-answer-hint" role="status">정답</small>':''}${run.sniperInsight?sniperAnswerHintMarkup(choice):''}${run.petHint?petAnswerHintMarkup(choice):''}</button>`).join('');
    return `<div class="royal-boss-heading"><div><div class="eyebrow">WORLD 6B · MID BOSS</div><h1>도적 대장</h1></div><div class="royal-boss-clock" id="boss-clock"><small>TIME LEFT</small><strong id="boss-timer">${royalSlimeTime(Math.max(0,run.storyTimeLimit-run.elapsed))}</strong></div></div><div id="arena" class="arena guardian-boss-arena bandit-chief-arena ${run.paused?'paused':''} ${run.iceTimeActive?'ice-time-active':''} ${run.attack?'hit':''} ${run.stunned||run.banditAxeHit?'wrong story-stunned':''}"><div class="arena-floor"></div>${battleHeroMarkup()}${run.sniperInsight?passiveBannerMarkup():''}<div class="guardian-enemy bandit-chief-enemy"><span class="bandit-chief-sprite" style="${banditChiefSpriteStyle()}" role="img" aria-label="검정 외투를 입고 왼쪽을 바라보는 도적 대장"></span>${run.sniperInsight?sniperTargetMarkup():''}</div><div class="guardian-health" role="meter" aria-label="도적 대장 HP" aria-valuemin="0" aria-valuemax="200" aria-valuenow="${run.bossHp}"><i id="guardian-energy-fill" style="width:${run.bossHp/2}%"></i></div><span class="bandit-hp-label">HP ${run.bossHp} / 200 · DMG ${run.bossAttackSteps}</span>${storyVitalsMarkup()}${iceTimeEffectMarkup()}${eagleEyeEffectMarkup()}${run.axeFlightMs>0?`<div class="bandit-axe-flight" aria-hidden="true"><img src="${esc(deployedAssetUrl(window.WORDORIA_BANDIT_CHIEF.SPRITE_ROOT+'char_bandit_chief_sd_projectile_strip.png'))}" alt=""></div>`:''}<div class="royal-boss-skill-notice" role="status" aria-live="polite">${esc(run.banditNotice||'')}${run.banditDodgeReady?' · 회피 대기':''}</div><div class="crystal-strike" aria-hidden="true"></div><div class="crystal-shards" aria-hidden="true">${'<i></i>'.repeat(7)}</div></div>${storyBattleActions()}<div class="question-card guardian-question"><h1>${esc(run.question.prompt)}</h1></div><div class="answers guardian-answers">${choices}</div>`;
  }
  function renderGuardianBattle(){
    if(run.abyssGolem)return renderAbyssGolemBattle();
    if(run.banditChief)return renderBanditChiefBattle();
    if(run.lichDragon)return renderLichDragonBattle();
    if(run.sorcerus)return renderSorcerusBattle();
    if(run.redReaper)return renderRedReaperBattle();
    const blind=run.guardianBlindMs>0,energy=run.bossHp/(run.bossMaxHp||60)*100;
    const energyGauge=`<div class="guardian-health" role="meter" aria-label="보스 에너지" aria-valuemin="0" aria-valuemax="${run.bossMaxHp||60}" aria-valuenow="${run.bossHp}"><i id="guardian-energy-fill" style="width:${energy}%"></i></div>`;
    const buttons=run.question.choices.map((choice,index)=>`<button class="answer" data-action="answer" data-index="${index}" ${run.locked||run.paused||run.shadowFreezeMs>0?'disabled':''}><span>${index+1}</span>${esc(blind?window.WORDORIA_GUARDIAN.maskChoice(choice):choice)}${run.eagleEyeActive&&choice===run.question.answer?'<small class="eagle-answer-hint" role="status">정답</small>':''}${run.sniperInsight?sniperAnswerHintMarkup(choice):''}${run.petHint?petAnswerHintMarkup(choice):''}</button>`).join('');
    const casting=run.guardianVisual==='attack'||run.shadowCastMs>0;
    const bossName=run.redReaper?'붉은 사신':run.shadowSorceress?'쉐도우 소서러스':run.blackDragon?'블랙 드래곤':'크리스탈 가디언 골렘';
    return `<div class="royal-boss-heading"><div><div class="eyebrow">${run.redReaper?'ILLUSION LAND · FINAL BOSS':run.shadowSorceress?'ILLUSION LAND · MID BOSS':'CRYSTAL TEMPLE · FINAL BOSS'}</div><h1>${bossName}</h1></div><div class="royal-boss-clock" id="boss-clock"><small>TIME LEFT</small><strong id="boss-timer">${royalSlimeTime(Math.max(0,run.storyTimeLimit-run.elapsed))}</strong></div></div><div class="arena guardian-boss-arena${run.shadowSorceress?` shadow-sorceress-arena${run.shadowFreezeMs>0?' dark-ice-frozen':''}`:''}${run.blackDragon?` black-dragon-arena${run.guardianPhase==='drain-hold'?' black-dragon-drain-contact':''}`:''} ${run.iceTimeActive?'ice-time-active':''} ${run.attack?'hit':''} ${run.stunned?'wrong story-stunned':''} ${casting?'guardian-casting':''} ${run.guardianBeamHit?'guardian-beam-contact':''}" id="arena"><div class="arena-floor"></div>${battleHeroMarkup()}${run.sniperInsight?passiveBannerMarkup():''}<div class="guardian-enemy">${run.sniperInsight?sniperTargetMarkup():''}${run.shadowSorceress?'':energyGauge}<span class="guardian-sprite guardian-${run.guardianVisual}${run.shadowCastMs>0&&run.guardianVisual==='idle'?' shadow-casting':''}" role="img" aria-label="왼쪽을 바라보는 ${bossName}"></span></div>${run.shadowSorceress?energyGauge:''}${storyVitalsMarkup()}${iceTimeEffectMarkup()}${eagleEyeEffectMarkup()}${run.shadowSorceress?darkIceTimeMarkup():''}${run.blackDragon?`${casting?'<div class="black-dragon-drain" aria-hidden="true"><i></i><i></i><i></i></div>':''}<div class="royal-boss-skill-notice" role="status" aria-live="polite">${esc(run.drainNotice||'')}</div>`:casting&&!run.shadowSorceress?'<div class="guardian-beam" aria-hidden="true"></div>':''}<div class="crystal-strike" aria-hidden="true"></div><div class="crystal-shards" aria-hidden="true">${'<i></i>'.repeat(7)}</div></div>${storyBattleActions()}<div class="question-card guardian-question"><h1>${esc(run.question.prompt)}</h1></div><div class="answers guardian-answers ${blind?'guardian-blinded':''}">${buttons}</div>`;
  }
  function renderRedReaperBattle(){
    const column=(side,items)=>`<div class="story-match-column" data-reaper-side="${side}">${items.map(item=>`<button class="story-match-item ${run.matched.has(item.id)?'matched':''} ${run[side==='ko'?'selectedKo':'selectedEn']===item.id?'selected':''}" data-action="story-pick" data-side="${side}" data-id="${item.id}" ${run.matched.has(item.id)||(run.locked&&!run.attack)||run.paused?'disabled':''}>${esc(item.entry[side==='ko'?2:0])}${run.eagleEyeActive?eaglePairHintMarkup(item.id,side):''}${run.sniperInsight?sniperPairHintMarkup(item.id):''}${run.petHint?petPairHintMarkup(item.id):''}</button>`).join('')}</div>`;
    const sprite=()=>`<span class="guardian-sprite guardian-${run.guardianVisual}" aria-hidden="true"></span>`;
    return `<div class="royal-boss-heading"><div><div class="eyebrow">ILLUSION LAND · FINAL BOSS</div><h1>붉은 사신</h1></div><div class="royal-boss-clock" id="boss-clock"><small>TIME LEFT</small><strong id="boss-timer">${royalSlimeTime(Math.max(0,run.storyTimeLimit-run.elapsed))}</strong></div></div><div class="arena guardian-boss-arena red-reaper-arena ${run.iceTimeActive?'ice-time-active':''} ${run.attack?'hit':''} ${run.stunned?'wrong story-stunned':''} ${run.reaperCastMs>0||run.hallucinationMs>0?'reaper-casting':''}" style="--reaper-drift-delay:${-run.elapsed}ms;--reaper-cast-delay:${run.reaperCastMs>0?run.reaperCastMs-700*(run.guardianReducedMotion?.5:1):run.hallucinationMs>0?-700*(run.guardianReducedMotion?.5:1):0}ms" id="arena"><div class="arena-floor"></div>${battleHeroMarkup()}${run.sniperInsight?passiveBannerMarkup():''}<div class="guardian-enemy">${run.sniperInsight?sniperTargetMarkup():''}<div class="reaper-body" role="img" aria-label="붉은 사신">${sprite()}<span class="reaper-echo reaper-echo-left">${sprite()}</span><span class="reaper-echo reaper-echo-right">${sprite()}</span><span class="reaper-cast-sprite" aria-hidden="true"></span></div></div><div class="guardian-health" role="meter" aria-label="보스 에너지" aria-valuemin="0" aria-valuemax="120" aria-valuenow="${run.bossHp}"><i id="guardian-energy-fill" style="width:${run.bossHp/120*100}%"></i></div>${storyVitalsMarkup()}${iceTimeEffectMarkup()}${eagleEyeEffectMarkup()}<div class="crystal-strike" aria-hidden="true"></div><div class="crystal-shards" aria-hidden="true">${'<i></i>'.repeat(7)}</div><div class="royal-boss-skill-notice reaper-notice" role="status" aria-live="polite">${run.hallucinationMs>0?'데스 할루시네이션 · 카드가 움직여요!':run.reaperCastMs>0?'데스 할루시네이션':''}</div></div>${storyBattleActions()}<div class="story-match-board reaper-match-board ${run.hallucinationMs>0?'hallucinating':''}">${column('ko',run.matchKo)}${column('en',run.matchEn)}</div>`;
  }
  function redReaperPick(button){
    if(!run?.redReaper||run.done||run.paused||run.stunned||run.weavingStepDodging)return;
    if(run.attack){queueStorySelection(button);return;}
    if(run.locked)return;
    const side=button.dataset.side,id=Number(button.dataset.id);
    if(!['ko','en'].includes(side)||!run.matchEn.some(item=>item.id===id)||run.matched.has(id))return;
    const other=run[side==='ko'?'selectedEn':'selectedKo'];
    if(other!==null&&other!==id&&run.weavingStepActive&&consumePugilistWeavingStep())return;
    if(run.eagleEyeActive&&side==='en'&&run.eagleEyePairId!==id)run.selectedKo=null;
    const result=window.WORDORIA_RED_REAPER.pick(run,side,id,battleContactDelay());
    if(!result)return;
    if(result==='selected'){if(run.eagleEyeActive&&side==='en')run.eagleEyePairId=id;if(run.eagleEyeActive)render();else refreshStorySelections();return;}
    run.eagleEyeActive=false;run.eagleEyePairId=null;
    if(result==='correct'){
      if(run.slashExpiresAt>performance.now()){run.slashCombo++;run.slashBonus+=run.slashCombo*2;}
      speak(run.matchEn.find(item=>item.id===id).entry[0]);
    }
    if(result==='wrong')document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'error'}}));
    render();
  }
  function syncReaperCards(side,items){
    const column=document.querySelector(`[data-reaper-side="${side}"]`);if(!column)return;
    // Move existing nodes; preserve focus, labels, selections and click identity.
    const focused=document.activeElement,restoreFocus=column.contains(focused);
    const nodes=new Map(Array.from(column.children).map(node=>[Number(node.dataset.id),node]));
    for(const item of items){const node=nodes.get(item.id);if(node)column.appendChild(node);}
    if(restoreFocus)focused.focus({preventScroll:true});
  }
  function advanceRedReaperBattle(delta,clockDelta=delta){
    if(!run?.redReaper||run.done||run.paused)return;
    const remaining=Math.max(0,run.storyTimeLimit-run.elapsed);
    if(!run.iceTimeActive&&clockDelta>remaining){delta*=remaining/clockDelta;clockDelta=remaining;}
    run.elapsed+=run.iceTimeActive?0:clockDelta;updateWarriorSlash();
    const events=window.WORDORIA_RED_REAPER.advance(run,delta,Math.random,clockDelta);
    for(const event of events){
      if(event==='victory'){finishBattle(true,'boss-defeated');return;}
      if(event==='defeat-player'){finishBattle(false,'hp-zero');return;}
      if(event==='hit'){if(run.petEffects?.onCorrect())refreshPetBattleFeedback();document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'success'}}));}
      if(event==='board-ready')prepareQuestion();
    }
    const fullRender=events.some(event=>['ready','board-ready'].includes(event));
    if(fullRender){if(!events.includes('ready')||!playQueuedStoryPair())render();}
    else if(events.length){
      if(events.includes('shift-left'))syncReaperCards('ko',run.matchKo);
      if(events.includes('shift-right'))syncReaperCards('en',run.matchEn);
      const fill=$('guardian-energy-fill');if(fill)fill.style.width=`${run.bossHp/120*100}%`;
      document.querySelector('.guardian-health')?.setAttribute('aria-valuenow',String(run.bossHp));
      document.querySelectorAll('.red-reaper-arena .reaper-body .guardian-sprite').forEach(sprite=>{sprite.className=`guardian-sprite guardian-${run.guardianVisual}`;});
      if(events.includes('cast-start'))$('arena')?.style.setProperty('--reaper-cast-delay','0ms');
      $('arena')?.classList.toggle('reaper-casting',run.reaperCastMs>0||run.hallucinationMs>0);
      document.querySelector('.reaper-match-board')?.classList.toggle('hallucinating',run.hallucinationMs>0);
      const notice=document.querySelector('.reaper-notice');if(notice)notice.textContent=run.hallucinationMs>0?'데스 할루시네이션 · 카드가 움직여요!':run.reaperCastMs>0?'데스 할루시네이션':'';
      if(events.includes('hit')){refreshStorySelections();if(!run.iceTimeActive){$('arena')?.classList.remove('ice-time-active');document.querySelector('.ice-time-field')?.remove();document.querySelector('.ice-time-announcement')?.remove();}}
    }
    const timer=$('boss-timer');if(timer)timer.textContent=royalSlimeTime(Math.max(0,run.storyTimeLimit-run.elapsed));
    $('boss-clock')?.classList.toggle('danger',run.storyTimeLimit-run.elapsed<=30000);
    if(run.elapsed>=run.storyTimeLimit)finishBattle(false,'timeout');
  }
  function darkIceTimeMarkup(){
    return run.shadowFreezeMs>0?'<div class="dark-ice-prison" aria-hidden="true"><i></i><i></i><i></i></div><div class="royal-boss-skill-notice dark-ice-notice" role="status" aria-live="polite">다크 아이스 타임 · 얼음에 갇혔어요!</div>':'';
  }
  function iceTimeEffectMarkup(){
    if(!run.iceTimeActive)return '';
    return `<img class="ice-time-field" src="assets/effects/fx_ice_time_field.svg" alt="" aria-hidden="true">${run.iceTimePopUntil>performance.now()?'<div class="arena-combo ice-time-announcement" role="status" aria-live="polite"><b>아이스 타임</b></div>':''}`;
  }
  function eagleEyeEffectMarkup(){
    if(!run.eagleEyeActive)return '';
    return `<img class="eagle-eye-field" src="assets/effects/fx_eagle_eye.svg" alt="" aria-hidden="true">${run.eagleEyePopUntil>performance.now()?'<div class="arena-combo ice-time-announcement eagle-eye-announcement" role="status" aria-live="polite"><b>매의 눈</b></div>':''}`;
  }
  function canActivateRangerEagleEye(){
    return Boolean(run?.story&&selectedCharacter?.class==='ranger'&&!run.done&&!run.paused&&!run.locked&&!run.attack&&!run.stunned&&!run.timeoutPending&&!run.fever&&!run.feverTransition&&!run.potionUsePending&&!run.eagleEyeActive&&run.hp>0&&run.mp>=1&&(!run.guardian||['idle','beam-hold'].includes(run.guardianPhase))&&(run.guardian&&!run.redReaper&&!run.lichDragon?run.question?.choices?.length>1:run.matchEn?.some(item=>!run.matched.has(item.id))));
  }
  function activateRangerEagleEye(){
    if(!canActivateRangerEagleEye())return;
    const battle=run,until=performance.now()+1000;
    run.mp--;run.eagleEyeActive=true;run.eagleEyePairId=run.selectedEn??null;run.eagleEyePopUntil=until;
    if(run.eagleEyePairId===null)run.selectedKo=null;
    run.eagleEyeRemoved=[];
    render();
    setTimeout(()=>{if(run===battle&&run.eagleEyePopUntil===until){run.eagleEyePopUntil=0;document.querySelector('.eagle-eye-announcement')?.remove();}},1000);
  }
  function eaglePairHintMarkup(id,side){
    if(!run.eagleEyeActive||side!=='ko'||id!==run.eagleEyePairId||run.selectedEn!==id||run.matched.has(id))return '';
    return '<small class="eagle-answer-hint" role="status">정답</small>';
  }
  function canActivatePugilistWeavingStep(){
    return Boolean(run?.story&&selectedCharacter?.class==='pugilist'&&!run.done&&!run.paused&&!run.locked&&!run.attack&&!run.stunned&&!run.timeoutPending&&!run.fever&&!run.feverTransition&&!run.potionUsePending&&!run.weavingStepActive&&!run.weavingStepDodging&&run.hp>0&&run.mp>=1&&(!run.guardian||['idle','beam-hold'].includes(run.guardianPhase)));
  }
  function showPugilistWeavingNotice(message){
    const battle=run,until=performance.now()+1200;
    run.weavingStepNotice=message;run.weavingStepPopUntil=until;render();
    setTimeout(()=>{if(run===battle&&run.weavingStepPopUntil===until){run.weavingStepPopUntil=0;document.querySelector('.weaving-step-announcement')?.remove();}},1200);
  }
  function activatePugilistWeavingStep(){
    if(!canActivatePugilistWeavingStep())return;
    run.mp--;run.weavingStepActive=true;showPugilistWeavingNotice('위빙 스텝');
  }
  function consumePugilistWeavingStep(){
    if(!run?.story||selectedCharacter?.class!=='pugilist'||!run.weavingStepActive)return false;
    const battle=run;
    run.weavingStepActive=false;run.weavingStepDodging=true;run.locked=true;
    run.selectedKo=null;run.selectedEn=null;run.timeStopped=false;run.matchFeedback='';run.matchFeedbackType='';
    showPugilistWeavingNotice('회피! · HP / 콤보 유지');
    document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'success'}}));
    nextTimer=setTimeout(()=>{
      if(run!==battle||run.done||run.timeoutPending)return;
      run.weavingStepDodging=false;
      if(!run.guardian||['idle','beam-hold'].includes(run.guardianPhase))run.locked=false;
      if(run.paused||run.locked||!playQueuedStoryPair())render();
    },reducedMotion()?200:500);
    return true;
  }
  function guardianAnswer(index){
    if(run?.redReaper||run?.lichDragon)return;
    if(!run?.guardian||run.done||run.paused||run.locked||run.weavingStepDodging||run.shadowFreezeMs>0||index<0||index>=run.question.choices.length)return;
    run.eagleEyeActive=false;run.eagleEyeRemoved=[];run.eagleEyePairId=null;run.iceTimeActive=false;
    const correct=run.question.choices[index]===run.question.answer;
    if(!correct&&run.weavingStepActive&&consumePugilistWeavingStep())return;
    if(!(run.abyssGolem?window.WORDORIA_ABYSS_GOLEM:run.banditChief?window.WORDORIA_BANDIT_CHIEF:run.sorcerus?window.WORDORIA_SORCERUS:run.shadowSorceress?window.WORDORIA_SHADOW_SORCERESS:run.blackDragon?window.WORDORIA_BLACK_DRAGON:window.WORDORIA_GUARDIAN).answer(run,correct,battleContactDelay()))return;
    if(correct){
      if(run.slashExpiresAt>performance.now()){run.slashCombo++;run.slashBonus+=run.slashCombo*2;}
      speak(run.question.entry[0]);
    }
    render();
  }
  function advanceGuardianBattle(delta,clockDelta=delta){
    if(run?.lichDragon){advanceLichDragonBattle(delta,clockDelta);return;}
    if(run?.redReaper){advanceRedReaperBattle(delta,clockDelta);return;}
    if(!run?.guardian||run.done||run.paused)return;
    if((run.sorcerus||run.banditChief||run.abyssGolem)&&run.guardianPhase==='defeat')clockDelta=0;
    if(run.abyssGolem&&run.guardianPhase==='player-defeat')clockDelta=0;
    if((run.shadowSorceress||run.sorcerus||run.banditChief||run.abyssGolem)&&!run.iceTimeActive&&clockDelta>0){
      const remaining=Math.max(0,run.storyTimeLimit-run.elapsed);
      if(clockDelta>remaining){delta*=remaining/clockDelta;clockDelta=remaining;}
    }
    run.elapsed+=run.iceTimeActive?0:clockDelta;updateWarriorSlash();
    const events=(run.abyssGolem?window.WORDORIA_ABYSS_GOLEM:run.banditChief?window.WORDORIA_BANDIT_CHIEF:run.sorcerus?window.WORDORIA_SORCERUS:run.shadowSorceress?window.WORDORIA_SHADOW_SORCERESS:run.blackDragon?window.WORDORIA_BLACK_DRAGON:window.WORDORIA_GUARDIAN).advance(run,delta,Math.random,run.iceTimeActive?0:clockDelta);
    let petActivated=false;
    for(const event of events){
      if(event==='hit'||event==='dodged'||event==='blocked'){petActivated=Boolean(run.petEffects?.onCorrect());document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'success'}}));}
      if(event==='freeze-start')document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'error'}}));
      if(event==='stomp-hit'||event==='smash-hit')document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'error'}}));
      if(event==='axe-hit')document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'error'}}));
      if(event==='drain-hit')document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'error'}}));
      if(event==='beam-contact'){if(run.index<run.deck.length)prepareQuestion();document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'error'}}));}
      if(event==='ready'&&(run.sorcerus||run.banditChief||run.index<run.deck.length))prepareQuestion();
      if(event==='victory'){finishBattle(true,'boss-defeated');return;}
      if(event==='defeat-player'){finishBattle(false,'hp-zero');return;}
    }
    if(events.length===1&&events[0]==='hit'&&!run.sorcerus&&!run.banditChief&&!run.abyssGolem){
      const fill=$('guardian-energy-fill');
      if(fill)fill.style.width=`${run.bossHp/(run.bossMaxHp||60)*100}%`;
      document.querySelector('.guardian-health')?.setAttribute('aria-valuenow',String(run.bossHp));
      const sprite=document.querySelector('.guardian-sprite');if(sprite)sprite.className=`guardian-sprite guardian-${run.guardianVisual}`;
      if(petActivated)refreshPetBattleFeedback();
    }else if(events.length)render();
    if(run.sorcerus)syncSorcerusBattleVisual();
    if(run.banditChief)syncBanditChiefBattleVisual();
    if(run.abyssGolem)syncAbyssGolemBattleVisual();
    const remaining=Math.max(0,run.storyTimeLimit-run.elapsed),timer=$('boss-timer');
    if(timer)timer.textContent=royalSlimeTime(remaining);
    $('boss-clock')?.classList.toggle('danger',remaining<=30000);
    if(!remaining&&!((run.sorcerus||run.banditChief||run.abyssGolem)&&run.guardianPhase==='defeat')&&!(run.abyssGolem&&run.guardianPhase==='player-defeat'))finishBattle(false,'timeout');
  }

  function renderRoyalSlimeBattle(){
    const ghost=run.crystalGhost,bossName=ghost?'숨겨진 크리스탈 유령':'거대 로얄 슬라임',total=run.bossMaxHp||50;
    const column=(side,items)=>`<div class="story-match-column">${items.map(item=>`<button class="story-match-item ${run.matched.has(item.id)?'matched':''} ${run[side==='ko'?'selectedKo':'selectedEn']===item.id?'selected':''}" data-action="story-pick" data-side="${side}" data-id="${item.id}"${run.sniperInsight?sniperPairHintAttributes(item.id):''} ${run.matched.has(item.id)||run.locked||run.stunned?'disabled':''}>${esc(item.entry[side==='ko'?2:0])}${run.eagleEyeActive?eaglePairHintMarkup(item.id,side):''} ${run.sniperInsight?sniperPairHintMarkup(item.id):''}${run.petHint?petPairHintMarkup(item.id):''}</button>`).join('')}</div>`;
    return `<div class="royal-boss-heading"><div><div class="eyebrow">${ghost?'CRYSTAL TEMPLE · HIDDEN BOSS':'WHISPERING WOODS · FINAL BOSS'}</div><h1>${bossName}</h1></div><div class="royal-boss-clock" id="boss-clock"><small>TIME LEFT</small><strong id="boss-timer">${royalSlimeTime(royalSlimeRemaining())}</strong></div></div><div class="arena royal-boss-arena${ghost?` crystal-ghost-arena ${run.ghostFalling?'ghost-falling':''} ${run.timeStopped?'ghost-time-stopped':''}`:''} ${run.iceTimeActive?'ice-time-active':''} ${run.attack?'hit':''} ${run.stunned?'wrong story-stunned':''}" id="arena"><div class="arena-floor"></div>${battleHeroMarkup()}${ghost||run.sniperInsight?passiveBannerMarkup():''}<div class="royal-slime-boss-wrap">${run.sniperInsight?sniperTargetMarkup():''}<div class="guardian-health royal-slime-health" role="meter" aria-label="${bossName} 에너지" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${run.bossHp}"><i id="boss-hp-fill" style="width:${run.bossHp/total*100}%"></i></div><div class="enemy royal-slime-enemy" aria-label="${bossName}"><img src="${esc(deployedAssetUrl(ghost?CRYSTAL_GHOST_ART:'assets/monsters/royal-slime/royal-slime-sd.png'))}" alt=""></div></div>${run.ghostFalling?'<div class="ghost-crystal-fall" aria-hidden="true"><i></i><i></i><i></i></div>':''}${storyVitalsMarkup()}${iceTimeEffectMarkup()}${eagleEyeEffectMarkup()}<div class="crystal-strike" aria-hidden="true"></div><div class="crystal-shards" aria-hidden="true">${'<i></i>'.repeat(7)}</div><div class="royal-boss-skill-notice" role="status" aria-live="polite">${ghost?esc(run.ghostFallNotice||''):run.absorbNotice?'시간 흡수하기 · −30초':''}</div></div>${storyBattleActions()}<div class="story-match-board">${column('ko',run.matchKo)}${column('en',run.matchEn)}</div>`;
  }
  function royalSlimePick(button){
    if(!run?.boss||run.done||run.paused||run.stunned)return;if(run.attack){queueStorySelection(button);return;}if(run.locked)return;
    const battle=run,side=button.dataset.side,id=Number(button.dataset.id);
    if(!['ko','en'].includes(side)||!run.matchBoard.some((_,index)=>Math.floor(run.index/5)*5+index===id)||run.matched.has(id))return;
    run[side==='ko'?'selectedKo':'selectedEn']=id;
    if(run.eagleEyeActive&&side==='en'&&run.eagleEyePairId!==id){run.eagleEyePairId=id;run.selectedKo=null;}
    if(run.selectedKo===null||run.selectedEn===null){render();return;}
    run.eagleEyeActive=false;run.eagleEyePairId=null;
    if(run.selectedKo!==run.selectedEn){
      if(run.weavingStepActive&&consumePugilistWeavingStep())return;
      run.eagleEyeActive=false;run.eagleEyeRemoved=[];run.eagleEyePairId=null;run.iceTimeActive=false;run.timeStopped=false;run.selectedKo=null;run.selectedEn=null;if(run.petEffects)run.petEffects.damage(1);else run.hp=Math.max(0,run.hp-1);run.stunned=true;run.slashCombo=0;render();
      nextTimer=setTimeout(()=>{if(run!==battle||run.done)return;if(!run.hp){finishRoyalSlimeBattle(false,'hp-zero');return;}run.stunned=false;if(run.crystalGhost&&run.ghostFallsPending){crystalGhostFall(battle);return;}if(!playQueuedStoryPair())render();},reducedMotion()?200:500);return;
    }
    const entry=run.matchEn.find(item=>item.id===id).entry;
    speak(entry[0]);run.timeStopped=false;run.matched.add(id);run.selectedKo=null;run.selectedEn=null;run.correct++;run.index++;run.answeredCorrect=(run.answeredCorrect||0)+1;run.locked=true;run.attack=true;
    if(run.slashExpiresAt>performance.now()){run.slashCombo++;run.slashPop={combo:run.slashCombo,bonus:0};}
    render();
    const contact=battleContactDelay();
    nextTimer=setTimeout(()=>{
      if(run!==battle||run.done)return;
      // A complete five-pair board removes attackSteps waves. Credit defeated
      // questions separately from the number of answers actually supplied.
      if(run.matched.size===run.matchBoard.length){
        const extra=Math.min((run.bossMaxHp||50)-run.index,5*((run.bossAttackSteps||1)-1));
        run.index+=extra;run.correct+=extra;
      }
      run.bossHp=Math.max(0,(run.bossMaxHp||50)-run.correct);if(run.petEffects){if(run.paused)run.petPendingCorrect=true;else if(run.petEffects.onCorrect())refreshPetBattleFeedback();}document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'success'}}));
      if(run.crystalGhost){
        for(const percent of [50,20,10])if(run.bossHp<=run.bossMaxHp*percent/100&&!run.ghostThresholds.includes(percent)){run.ghostThresholds.push(percent);run.ghostFallsPending++;}
      }
      const fill=$('boss-hp-fill');if(fill)fill.style.width=`${run.bossHp/(run.bossMaxHp||50)*100}%`;
      document.querySelector('.royal-slime-health')?.setAttribute('aria-valuenow',String(run.bossHp));
      document.querySelector('.royal-slime-enemy')?.classList.add('royal-slime-recoil');
      if(!run.crystalGhost&&run.correct>=25&&!run.absorbed){run.absorbed=true;run.timePenalty+=ROYAL_SLIME_ABSORB;run.absorbNotice=true;toast('거대 로얄 슬라임의 시간 흡수! −30초');updateRoyalSlimeClock();if(run.done)return;}
      if(run.crystalGhost&&run.ghostFallsPending){
        if(run.index%5===0){run.eagleEyeActive=false;run.eagleEyeRemoved=[];run.eagleEyePairId=null;run.iceTimeActive=false;}
        if(!run.iceTimeActive){run.attack=false;crystalGhostFall(battle);return;}
      }
      if(run.correct===(run.bossMaxHp||50)){finishRoyalSlimeBattle(true,'boss-defeated');return;}
      nextTimer=setTimeout(()=>{if(run!==battle||run.done)return;run.attack=false;run.locked=false;if(playQueuedStoryPair())return;if(run.index%5===0)prepareRoyalSlimeBoard();render();if(run.absorbNotice)setTimeout(()=>{if(run===battle&&!run.done){run.absorbNotice=false;const notice=document.querySelector('.royal-boss-skill-notice');if(notice)notice.textContent='';}},2200);},Math.max(150,(reducedMotion()?300:900)-contact));
    },contact);
  }
  function crystalGhostFall(battle){
    run.eagleEyeActive=false;run.eagleEyeRemoved=[];run.eagleEyePairId=null;run.iceTimeActive=false;run.timeStopped=false;run.selectedKo=null;run.selectedEn=null;run.slashCombo=0;
    run.queuedStoryPairs=[];run.locked=true;run.ghostFalling=true;run.ghostFallNotice='크리스탈 결정 낙하 · HP 절반';render();
    const contact=reducedMotion()?100:320;
    nextTimer=setTimeout(()=>{
      if(run!==battle||run.done)return;
      if(run.paused){nextTimer=setTimeout(()=>crystalGhostFall(battle),100);return;}
      if(run.petEffects)run.petEffects.damage(run.hp<=1?run.hp:Math.floor(run.hp/2));else run.hp=run.hp<=1?0:Math.ceil(run.hp/2);run.stunned=true;persistStoryBattleVitals();render();
      document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'error'}}));
      nextTimer=setTimeout(()=>{
        if(run!==battle||run.done)return;
        run.stunned=false;run.ghostFalling=false;run.ghostFallNotice='';run.ghostFallsPending--;
        if(!run.hp){finishRoyalSlimeBattle(false,'hp-zero');return;}
        if(run.ghostFallsPending>0){crystalGhostFall(battle);return;}
        if(!run.bossHp){finishRoyalSlimeBattle(true,'boss-defeated');return;}
        run.locked=false;if(run.index%5===0)prepareRoyalSlimeBoard();render();
      },reducedMotion()?150:500);
    },contact);
  }
  function finishRoyalSlimeBattle(clear,reason){
    if(!run?.boss||run.done)return;persistStoryBattleVitals();run.weavingStepActive=false;run.weavingStepDodging=false;run.weavingStepNotice='';run.eagleEyeActive=false;run.eagleEyeRemoved=[];run.eagleEyePairId=null;run.iceTimeActive=false;run.petEffects?.clear();run.done=true;run.clear=clear;run.reason=reason;clearInterval(timerId);clearTimeout(nextTimer);cancelSpeech();
    if(run.crystalGhost){run.timeStopped=false;run.ghostFalling=false;run.ghostFallNotice='';go('bossResult');if(clear&&!run.localBossSkipped)claimCrystalGhostReward();return;}
    if(clear){storyDialogueIndex=0;go('storyBossVictory');}
    else{go('bossResult');}
  }

  function completeRoyalSlimeVictoryStory(){
    if(page!=='storyBossVictory'||!run?.boss||!run.clear)return;
    go('bossResult');claimRoyalSlimeReward();
  }

  async function saveRoyalSlimeStageResult(battle){
    if(battle.localBossSkipped||!battle.directBossStage||pendingStoryRun?.result?.game_score_id)return;
    if(!battle.clear||battle.correct!==ROYAL_SLIME_HP)throw new Error('boss not cleared');
    const stageRun={...pendingStoryRun,deck:battle.deck,index:battle.index,correct:battle.correct,elapsed:battle.elapsed,done:true,clear:true,reason:'boss-defeated',chest:false,treasure:0,resultStep:'summary',chestClicks:0,slashBonus:0};
    await saveBattleResult(stageRun,true);
    if(!stageRun.result?.game_score_id)throw new Error('stage seven result unavailable');
    pendingStoryRun=stageRun;
  }

  async function claimRoyalSlimeReward(){
    if(!run?.boss||run.localBossSkipped||!run.clear||run.rewardPending||run.bossReward!==undefined)return;
    const battle=run; battle.rewardPending=true;battle.rewardError=false;
    if(page==='bossResult')render();
    try{
      if(battle.directBossStage)await saveRoyalSlimeStageResult(battle);
      if(localMode){
        const claimed=demoState.records.some(row=>row.player===player&&row.stage===ROYAL_SLIME_RECORD&&row.cleared);
        const reward=claimed?0:ROYAL_SLIME_REWARD;
        if(!claimed){
          const row={id:`demo-boss-${Date.now()}-${Math.random()}`,player,stage:ROYAL_SLIME_RECORD,correct:50,total:50,cleared:true,character_id:selectedCharacter.id,duration_ms:Math.round(battle.elapsed),coins_earned:reward,created_at:new Date().toISOString()};
          selectedCharacter.coins+=reward;demoState.records.unshift(row);records=demoState.records;saveDemo();
        }
        battle.bossReward=reward;
      }else{
        const stageScore=pendingStoryRun?.result?.game_score_id;
        if(!stageScore)throw new Error('stage seven result unavailable');
        const rows=await rpc('claim_royal_slime_reward',{p_character_id:selectedCharacter.id,p_stage_score_id:stageScore,p_correct:battle.correct,p_duration_ms:Math.round(battle.elapsed)});
        const result=rows?.[0];if(!result)throw new Error('boss reward unavailable');
        accountCrystals=Number(result.balance);battle.bossReward=Number(result.reward);
      }
    }catch(error){battle.rewardError=true;toast('보상을 저장하지 못했어요. 다시 시도해 주세요.');}
    finally{battle.rewardPending=false;if(run===battle&&page==='bossResult')render();}
  }

  async function claimCrystalGhostReward(){
    if(!run?.crystalGhost||run.localBossSkipped||!run.clear||run.rewardPending||run.bossReward!==undefined)return;
    const battle=run;battle.rewardPending=true;battle.rewardError=false;render();
    try{
      if(battle.correct!==CRYSTAL_GHOST_HP||battle.bossHp!==0)throw new Error('boss not cleared');
      if(localMode){
        const claimed=demoState.records.some(row=>row.player===player&&row.stage===CRYSTAL_GHOST_RECORD&&row.cleared);
        const reward=claimed?0:CRYSTAL_GHOST_REWARD;
        if(!claimed){
          const row={id:`demo-ghost-${Date.now()}`,player,stage:CRYSTAL_GHOST_RECORD,correct:90,total:90,cleared:true,character_id:battle.storyCharacterId,duration_ms:Math.round(battle.elapsed),coins_earned:reward,treasure_claimed:true,created_at:new Date().toISOString()};
          selectedCharacter.coins+=reward;demoState.records.unshift(row);records=demoState.records;
          // Hidden victory clears 3-7 without granting its ordinary/chest rewards.
          demoState.records.unshift({...row,id:`${row.id}-stage`,stage:stageRecordName('story-ch3-7'),coins_earned:0});
          potionInventory={...potionInventory,blue_potion_count:Number(potionInventory.blue_potion_count||0)+5};
          demoState.potionInventory={...(demoState.potionInventory||{}),[battle.storyCharacterId]:potionInventory};saveDemo();
        }
        battle.bossReward=reward;battle.bossPotionReward=claimed?0:5;
      }else{
        const rows=await rpc('claim_crystal_ghost_boss_reward',{p_character_id:battle.storyCharacterId,p_correct:battle.correct,p_duration_ms:Math.max(1,Math.round(battle.elapsed))});
        const result=rows?.[0];if(!result)throw new Error('boss reward unavailable');
        accountCrystals=Number(result.balance);battle.bossReward=Number(result.reward);battle.bossPotionReward=Number(result.mana_potions);
        records=[{id:result.game_score_id,player,stage:stageRecordName('story-ch3-7'),character_id:battle.storyCharacterId,correct:90,total:90,cleared:true},...records];
        await loadCharacterExtras();
      }
    }catch(error){battle.rewardError=true;toast('보상을 저장하지 못했어요. 다시 시도해 주세요.');}
    finally{battle.rewardPending=false;if(run===battle&&page==='bossResult')render();}
  }
  function renderCrystalGhostResult(){
    const reward=run.rewardPending?'보상 저장 중…':run.rewardError?'보상 저장에 실패했어요':run.bossReward===0?'보상을 이미 받았어요':`◆ +${num(run.bossReward??CRYSTAL_GHOST_REWARD)} 크리스탈 · 마나포션 +${run.bossPotionReward??5}개`;
    return `<section class="result"><div class="eyebrow">WORLD 3-7 · HIDDEN BOSS</div><img class="royal-boss-result-art" src="${esc(deployedAssetUrl(CRYSTAL_GHOST_ART))}" alt="숨겨진 크리스탈 유령"><h1>${run.clear?'숨겨진 크리스탈 유령을 물리쳤어요!':run.reason==='timeout'?'시간이 다 되었어요':'다시 힘을 모아 도전해요'}</h1>${run.clear?`<p class="royal-boss-reward" role="status">${reward}</p>`:''}<div class="actions">${run.rewardError?'<button class="primary" data-action="crystal-ghost-reward-retry">보상 저장 다시 시도</button>':''}${run.clear?'':'<button class="primary" data-action="crystal-ghost-retry">다시 도전하기</button>'}<button class="${run.clear?'primary':'secondary'}" data-action="crystal-ghost-leave" ${run.rewardPending||run.clear&&run.rewardError?'disabled':''}>${run.clear?'월드맵으로':'떠나기'}</button></div></section>`;
  }

  function renderRoyalSlimeResult(){if(run?.localBossSkipped)return localBossPreviewResult();if(run?.crystalGhost)return renderCrystalGhostResult();if(run?.guardian)return renderGuardianResult();return `<section class="result"><div class="eyebrow">WHISPERING WOODS · FINAL BOSS</div><img class="royal-boss-result-art" src="${esc(deployedAssetUrl('assets/monsters/royal-slime/royal-slime-sd.png'))}" alt="거대 로얄 슬라임"><h1>${run.clear?'거대 로얄 슬라임을 물리쳤어요!':run.reason==='timeout'?'시간이 다 되었어요':'다시 힘을 모아 도전해요'}</h1>${run.clear?`<p>정답 ${run.answeredCorrect??run.correct}개 · 보스 HP ${run.bossHp} / 50</p>`:''}${run.clear?`<p class="royal-boss-reward" role="status">${run.rewardPending?'보상 저장 중…':run.rewardError?'보상 저장에 실패했어요':run.bossReward===0?'보상을 이미 받았어요':`◆ +${num(run.bossReward??ROYAL_SLIME_REWARD)} 크리스털`}</p>`:''}<div class="actions">${run.rewardError?'<button class="primary" data-action="boss-reward-retry">보상 저장 다시 시도</button>':''}${run.clear?'':'<button class="primary" data-action="boss-retry">다시 도전하기</button>'}<button class="${run.clear?'primary':'secondary'}" data-action="boss-return" ${run.rewardPending?'disabled':''}>${run.clear&&(!run.directBossStage||pendingStoryRun?.result)?'7스테이지 보상 확인':run.clear?'월드맵으로':'떠나기'}</button></div></section>`;}

  function storyBattleBackgroundClass(){
    const stage=stages[selectedStage];
    if(!run.story)return '';
    if(stage?.storyChapter===6||stage?.storyChapter===7){
      if(run.boss||run.guardian)return '';
      return `world-six-battle ${stage.storyChapter===7?'world-six-a-inverted':'world-six-b-capital-road'}`;
    }
    if(stage?.storyChapter===5)return `world-five-battle ${stage.storyNumber===10?'world-five-midboss':stage.storyNumber===20?'world-five-final-boss':'world-five-cavern'}`;
    if(stage?.storyChapter===4){
      if(stage.storyNumber>=1&&stage.storyNumber<=9)return 'world-four-battle world-four-illusion-forest';
      if(stage.storyNumber>=11&&stage.storyNumber<=19)return 'world-four-battle world-four-misty-forest';
      return '';
    }
    if(stage?.storyChapter!==3)return '';
    if(stage.storyNumber===8)return 'world-three-battle world-three-cave';
    return stage.storyNumber>=6?'world-three-battle world-three-temple':'world-three-battle world-three-waterfall';
  }
  function crystalSpiderMobsMarkup(){
    const count=Math.max(0,run.matchBoard.length-run.matched.size+(run.pendingDefeat?1:0)),target=Math.min(2,count-1);
    const step=reducedMotion()?50:100,delay=Math.max(0,battleContactDelay()-step);
    const started=run.attack?run.spiderHitStartedAt:run.spiderAttackStartedAt,phaseElapsed=started===undefined?0:Math.max(0,performance.now()-(run.spiderPausedMs||0)-started);
    return Array.from({length:count},(_,i)=>`<div class="enemy story-mob crystal-spider-mob ${run.golemMob?'half-broken-golem-mob':run.banditMob?'bandit-mob':''} ${i===target?'crystal-spider-target':''} ${i===target&&run.attack?'spider-is-hit':i===target&&run.spiderAttacking&&!run.timeoutPending?'spider-is-attacking':''}" aria-hidden="true" style="right:${i<3?18+i*46:41+(i-3)*46}px;bottom:${i<3?20:65}px;z-index:${i<3?5:4};--spider-hit-delay:${delay}ms;--spider-hit-duration:${step*2}ms;--spider-phase-elapsed:${phaseElapsed}ms"><span class="crystal-spider-sprite spider-idle-strip"></span><span class="crystal-spider-sprite spider-attack-strip"></span><span class="crystal-spider-sprite spider-hit-strip"></span>${run.sniperInsight?sniperTargetMarkup():''}</div>`).join('');
  }
  function crystalSpiderSchedule(callback,delay){
    const battle=run,deadline=performance.now()-(run.spiderPausedMs||0)+delay;
    function advance(){
      if(run!==battle||run.done||run.timeoutPending)return;
      const remaining=deadline-(performance.now()-(run.spiderPausedMs||0));
      if(run.paused||remaining>0){return setTimeout(advance,run.paused?30:remaining);}
      callback();
    }
    return setTimeout(advance,delay);
  }
  function crystalSpiderWrongAnswer(){
    const battle=run,contact=reducedMotion()?90:240,recovery=reducedMotion()?120:260;
    run.stunned=true;run.spiderAttacking=true;run.spiderContact=false;run.spiderAttackStartedAt=performance.now()-(run.spiderPausedMs||0);render();
    const active=()=>run===battle&&!run.done&&!run.timeoutPending;
    function recover(){
      if(!active())return;
      if(run.paused){nextTimer=setTimeout(recover,30);return;}
      run.spiderAttacking=false;run.spiderContact=false;run.stunned=false;
      if(run.hp<=0){finishBattle(false,'hp-zero');return;}
      if(!playQueuedStoryPair())render();
    }
    function strike(){
      if(!active())return;
      if(run.paused){nextTimer=setTimeout(strike,30);return;}
      run.spiderContact=true;
      if(run.petEffects)run.petEffects.damage(1);else run.hp=Math.max(0,run.hp-1);
      persistStoryBattleVitals();
      const arena=$('arena'),vitals=arena?.querySelector('.story-vitals');
      if(vitals)vitals.outerHTML=storyVitalsMarkup();
      if(run.petEffects)refreshPetBattleFeedback();
      arena?.classList.add('wrong','story-stunned');
      document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'error'}}));
      nextTimer=crystalSpiderSchedule(recover,recovery);
    }
    nextTimer=crystalSpiderSchedule(strike,contact);
  }
  function renderBattle(){ function storyMonsterArt(chapter,index){ if(chapter===7)return 'assets/monsters/world-6a/monster_half_broken_golem_sd_left.png'; if(chapter===4){ const expressions=['angry-01','crying-01','tongue-01','angry-02','tongue-02']; return `assets/monsters/world-4/monster_crystal_candy_${expressions[index%expressions.length]}_left.png`; } return chapter===2?'assets/monsters/crystal-golem/crystal-golem-normal-sd-right.png':chapter===3?'assets/monsters/crystal-eye-serpent/crystal-eye-serpent-sd-left-v1.png':null; } if(run.guardian)return renderGuardianBattle();if(run.boss)return renderRoyalSlimeBattle();if(run.story&&run.feverTransition)return `<section class="fever-intro" role="status" aria-live="assertive"><div class="fever-intro-flames" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><div class="fever-intro-crystal" aria-hidden="true">◆</div><p>BONUS CRYSTAL RUSH</p><h1>FEVER TIME!</h1><span>보너스 크리스털이 깨어나요!</span></section>`;const q=run.question,total=run.deck.length,boss=run.story&&run.index===total-1,chapter=stages[selectedStage]?.storyChapter,monsterArt=storyMonsterArt(chapter,0),monsterClass=chapter===7?'half-broken-golem-mob':chapter===2?'crystal-golem-mob':chapter===3?'crystal-eye-serpent-mob':chapter===4?'crystal-candy-mob':'',mobMarkup=run.story&&(chapter===5||chapter===6||chapter===7)?crystalSpiderMobsMarkup():run.story?Array.from({length:Math.max(0,run.matchBoard.length-run.matched.size+(run.pendingDefeat?1:0))},(_,i)=>`<div class="enemy story-mob ${monsterClass}" aria-hidden="true" style="${monsterArt?`right:${i<3?18+i*46:41+(i-3)*46}px;bottom:${i<3?20:65}px;z-index:${i<3?5:4}`:`right:${18+i*34}px;bottom:${24+(i%2)*35}px`}">${monsterArt?`<img src="${esc(deployedAssetUrl(storyMonsterArt(chapter,i)))}" alt="">`:''}${run.sniperInsight?sniperTargetMarkup():''}</div>`).join(''):`<div class="enemy ${boss?'boss':''}">${run.sniperInsight?sniperTargetMarkup():''}</div>`;const story=run.story,fever=story&&run.fever;return fever?renderFeverBattle():`<div class="battle-top row"><div class="stage-copy"><div class="eyebrow" style="color:var(--violet)">${story?`STORY LV.1 · 웨이브 ${Math.min(Math.floor(run.index/5)+1,Math.ceil(total/5))}/${Math.ceil(total/5)} · `:''}${esc(stages[selectedStage].name)} · ${run.index}/${total}</div></div></div>${story?`<div class="story-time-meter" id="story-time-meter" role="meter" aria-label="남은 시간 ${Math.ceil(Math.max(0,run.storyTimeLimit-run.elapsed)/run.storyTimeLimit*100)}%" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.ceil(Math.max(0,run.storyTimeLimit-run.elapsed)/run.storyTimeLimit*100)}"><div class="story-time-meter-label"><small>TIME LEFT</small><strong id="timer">${Math.ceil(Math.max(0,run.storyTimeLimit-run.elapsed)/run.storyTimeLimit*100)}%</strong></div><div class="story-time-track"><i id="story-time-fill" style="width:${Math.ceil(Math.max(0,run.storyTimeLimit-run.elapsed)/run.storyTimeLimit*100)}%"></i></div></div>`:''}<div class="arena ${storyBattleBackgroundClass()} ${run.skill?'skill':''} ${story&&run.iceTimeActive?'ice-time-active':''} ${story&&run.attack?'hit':''} ${story&&run.stunned&&(!run.spiderAttacking||run.spiderContact||run.timeoutPending)?'wrong story-stunned':''} ${story&&(chapter===5||chapter===6)?'crystal-spider-arena':''} ${run.paused?'paused':''}" id="arena"><div class="arena-floor"></div>${battleHeroMarkup()}${passiveBannerMarkup()}${story?'':`<div class="arena-time" id="arena-time" aria-label="남은 제한시간"><small>TIME LIMIT</small><strong id="timer">${(run.remaining/1000).toFixed(1)}<span>초</span></strong></div>`}${story?storyVitalsMarkup():''}<span class="enemy-label">${story?'':'LV. 1 · 민트 슬라임'}</span>${mobMarkup}${iceTimeEffectMarkup()}${eagleEyeEffectMarkup()}<div class="crystal-strike" aria-hidden="true"></div><div class="crystal-shards" aria-hidden="true">${'<i></i>'.repeat(7)}</div>${story&&run.slashPop?`<div class="arena-combo" role="status" aria-live="polite"><b>COMBO ${run.slashPop.combo}</b><span>◆ +${run.slashPop.bonus}</span></div>`:''}${story?'':`<div class="arena-feedback" id="arena-feedback">${esc(run.matchFeedback||'')}</div>`}</div>${story?'':`<div class="row small story-progress"><b>${run.index} / ${total} 처치</b><span style="color:var(--violet)">${run.correct} 처치 · ◆ +${earnedCoins(run.correct)}</span></div>`}<div class="xp"><i style="width:${run.index/total*100}%"></i></div>${story?`${storyBattleActions()}<div class="story-match-board"><div class="story-match-column">${run.matchKo.map(item=>`<button class="story-match-item ${run.matched.has(item.id)?'matched':''} ${run.selectedKo===item.id?'selected':''}" data-action="story-pick" data-side="ko" data-id="${item.id}"${run.sniperInsight?sniperPairHintAttributes(item.id):''} ${run.matched.has(item.id)?'disabled':''}>${esc(item.entry[2])}${run.eagleEyeActive?eaglePairHintMarkup(item.id,'ko'):''} ${run.sniperInsight?sniperPairHintMarkup(item.id):''}${run.petHint?petPairHintMarkup(item.id):''}</button>`).join('')}</div><div class="story-match-column">${run.matchEn.map(item=>`<button class="story-match-item ${run.matched.has(item.id)?'matched':''} ${run.selectedEn===item.id?'selected':''}" data-action="story-pick" data-side="en" data-id="${item.id}"${run.sniperInsight?sniperPairHintAttributes(item.id):''} ${run.matched.has(item.id)?'disabled':''}>${esc(item.entry[0])} ${run.sniperInsight?sniperPairHintMarkup(item.id):''}${run.petHint?petPairHintMarkup(item.id):''}</button>`).join('')}</div></div>`:` <div class="question-card"><h1 class="${q.prompt.length>28?'long-question':''}">${esc(q.prompt)}</h1></div><div class="answers">${q.choices.map((answer,i)=>`<button class="answer" data-action="answer" data-index="${i}"><span>${i+1}</span>${esc(answer)}${run.sniperInsight?sniperAnswerHintMarkup(answer):''}${run.petHint?petAnswerHintMarkup(answer):''}</button>`).join('')}</div>`}`;}
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
    const arena=$('arena'),hero=arena?.querySelector('.battle-hero'),enemy=arena?.querySelector('.enemy, .guardian-enemy');
    if(!arena||!hero||!enemy)return;
    const heroBox=hero.getBoundingClientRect(),enemyBox=enemy.getBoundingClientRect();
    if(hero.classList.contains('battle-hero-sniper')){
      const arenaBox=arena.getBoundingClientRect();
      arena.style.setProperty('--sniper-impact-x',`${enemyBox.left+enemyBox.width*.5-arenaBox.left}px`);
      arena.style.setProperty('--sniper-impact-y',`${enemyBox.top+enemyBox.height*.5-arenaBox.top}px`);
      return;
    }
    if(hero.classList.contains('battle-skin-mage_starlight_rose_skin')&&hero.classList.contains('battle-hero-female')){
      const origin=heroBox.left+heroBox.width*.83;
      arena.style.setProperty('--hero-travel',`${Math.max(0,enemyBox.left+enemyBox.width*.42-origin)}px`);
      arena.style.setProperty('--star-travel-y',`${enemyBox.top+enemyBox.height*.52-(heroBox.bottom-heroBox.height*(70/148))}px`);
      return;
    }
    if(hero.classList.contains('battle-hero-ranger')&&hero.classList.contains('battle-hero-female')&&hero.classList.contains('battle-skin-ranger_violet_crystal_skin')){
      const origin=heroBox.left+heroBox.width*.83;
      arena.style.setProperty('--hero-travel',`${Math.max(0,enemyBox.left+enemyBox.width*.42-origin)}px`);
      arena.style.setProperty('--violet-travel-y',`${enemyBox.top+enemyBox.height*.52-(heroBox.bottom-heroBox.height*.5)}px`);
      return;
    }
    const travel=Math.max(0,Math.min(arena.clientWidth*.52,enemyBox.left-heroBox.right+heroBox.width*.28));
    arena.style.setProperty('--hero-travel',`${travel}px`);
  }
  function tick(){clearInterval(timerId);run.last=performance.now();updateEnemyApproach();timerId=setInterval(()=>{if(!run||run.done||run.paused||run.timeoutPending||(!run.story&&run.locked))return;const now=performance.now(),delta=now-run.last;run.last=now;const petDelta=run.petEffects?run.petEffects.advance(delta):delta;if(run.petPendingCorrect){run.petPendingCorrect=false;run.petEffects?.onCorrect();render();}if(run.petEffects){document.querySelector('.pet-time-status')?.toggleAttribute('hidden',!(run.petTimeMs>0));document.querySelector('.pet-skill-notice')?.toggleAttribute('hidden',!(run.petNoticeMs>0));}if(run.guardian){advanceGuardianBattle(delta,petDelta);return;}if(run.boss){run.elapsed+=run.iceTimeActive||(run.crystalGhost&&run.timeStopped)?0:petDelta;updateWarriorSlash(now);updateRoyalSlimeClock();return;}updateWarriorSlash(now);if(run.story&&run.feverTransition)return;const activeDelta=run.timeStopped||run.iceTimeActive?0:petDelta;run.elapsed+=activeDelta;if(run.story){const remaining=Math.max(0,run.storyTimeLimit-run.elapsed),el=$('timer'),timeBox=$('arena-time'),meter=$('story-time-meter'),fill=$('story-time-fill');if(run.story&&!run.fever){const percent=Math.ceil(remaining/run.storyTimeLimit*100);if(el)el.textContent=`${percent}%`;if(fill)fill.style.width=`${percent}%`;if(meter){meter.setAttribute('aria-valuenow',String(percent));meter.setAttribute('aria-label',`남은 시간 ${percent}%`);meter.classList.toggle('danger',remaining<10000);}}else{if(el)el.firstChild.textContent=(remaining/1000).toFixed(1);if(timeBox)timeBox.classList.toggle('danger',remaining<10000);}if(run.fever)advanceFeverCrystals();if(remaining<=0){if(run.fever){finishBattle(true,'fever-complete');}else{run.timeoutPending=true;run.stunned=true;run.attack=false;render();document.querySelector('#arena')?.classList.add('wrong','story-stunned');document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'error'}}));nextTimer=setTimeout(()=>finishBattle(false,'timeout'),1200);}}return;}run.remaining=Math.max(0,run.remaining-activeDelta);const el=$('timer'),timeBox=$('arena-time');if(el)el.firstChild.textContent=(run.remaining/1000).toFixed(1);if(timeBox)timeBox.classList.toggle('danger',run.remaining<2000);updateEnemyApproach();if(run.remaining<=0)answer(-1);},33);}
  function pause(){if(!run||run.done)return;run.paused=true;if(run.lichDragon||run.sorcerus||run.shadowSorceress||run.redReaper||run.crystalSpider||run.banditMob||run.golemMob)document.querySelector('#arena')?.classList.add('paused');run.pausedAt=performance.now();clearInterval(timerId);window.wordoriaSound?.pauseBGM();}
  function resume(){closeDialog();if(run&&!run.done){const pausedFor=performance.now()-(run.pausedAt||performance.now());if(run.crystalSpider||run.banditMob||run.golemMob)run.spiderPausedMs=(run.spiderPausedMs||0)+pausedFor;if(run.story){if(run.slashExpiresAt>run.pausedAt)run.slashExpiresAt+=pausedFor;run.mobs.forEach(mob=>mob.startedAt+=pausedFor);if(run.nextMobSpawnAt)run.nextMobSpawnAt+=pausedFor;}run.paused=false;if(run.lichDragon||run.sorcerus||run.shadowSorceress||run.redReaper||run.crystalSpider||run.banditMob||run.golemMob)document.querySelector('#arena')?.classList.remove('paused');run.pausedAt=0;window.wordoriaSound?.resumeBGM();tick();}}
  function cancelSpeech(){if(window.WordoriaNativeSpeech?.cancel)window.WordoriaNativeSpeech.cancel().catch(()=>{});if(window.speechSynthesis)speechSynthesis.cancel();}
  function speak(text){if(window.WordoriaNativeSpeech?.speak){window.WordoriaNativeSpeech.speak(text,{lang:'en-US',rate:.82}).catch(()=>toast('기기 음성 엔진을 사용할 수 없어요'));return;}if(!('speechSynthesis' in window)){toast('이 브라우저에서는 음성 읽기를 지원하지 않아요');return;}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=.82;speechSynthesis.speak(u);}
  function answer(index){if(run?.guardian){guardianAnswer(index);return;}
    if(!run||run.done||run.paused||run.locked)return;run.locked=true;if(!run.story)clearInterval(timerId);run.timeStopped=false;document.querySelector('.passive-banner-mage')?.classList.add('resolved');const q=run.question,chosen=q.choices[index],ok=chosen===q.answer;
    document.querySelectorAll('.answer').forEach((button,i)=>{button.disabled=true;button.classList.toggle('correct',q.choices[i]===q.answer);button.classList.toggle('wrong',i===index&&!ok);});
    if(ok){run.correct++;const gain=earnedCoins(run.correct)-earnedCoins(run.correct-1),contact=battleContactDelay(),rangedMage=selectedCharacter?.class==='sniper'||selectedCharacter?.class==='mage'||(selectedCharacter?.class==='ranger'&&variantOf(selectedCharacter)==='female'&&itemById(equippedMap(selectedCharacter).skin)?.code==='ranger_violet_crystal_skin'),noirPugilist=itemById(equippedMap(selectedCharacter).skin)?.code==='pugilist_crystal_noir_skin';setTimeout(()=>{if(rangedMage||noirPugilist)document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'success'}}));},contact);if(!rangedMage&&!noirPugilist)document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'success'}}));setHeroAttackTravel();$('arena').classList.add('hit');$('arena-feedback').textContent=`${run.correct} COMBO! ◆ +${gain}`;speak(q.entry[0]);run.feedbackPending=true;if(run.story){nextTimer=setTimeout(continueAfterFeedback,reducedMotion()?360:980);return;}nextTimer=setTimeout(()=>{nextTimer=setTimeout(continueAfterFeedback,showBattleReward(q,gain));},1050);return;}
    else{document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'error'}}));$('arena').classList.add('wrong');$('arena-feedback').textContent=index<0?'시간 초과!':'아쉬워요!';}
    nextTimer=setTimeout(()=>finishBattle(false,index<0?'timeout':'wrong'),1450);
  }
  function advanceFeverCrystals(){let changed=false;const now=run.elapsed;const live=run.feverWords.filter(crystal=>!crystal.removeAt||now<crystal.removeAt);if(live.length!==run.feverWords.length){run.feverWords=live;changed=true;}if(now>=run.feverNextSpawnAt&&now<run.storyTimeLimit){const entry=run.deck[Math.floor(Math.random()*run.deck.length)].entry;run.feverWords.push({id:`fever-${++run.feverWordSequence}`,entry,createdAt:now,state:'word',x:26+Math.random()*48,y:12+Math.random()*72});run.feverNextSpawnAt=now+550+Math.random()*400;changed=true;}if(changed)render();}
  function enterFeverTime(){run.fever=true;run.feverTransition=false;run.attack=false;run.locked=false;run.matchFeedback='';run.feverWords=[];run.feverCollected=run.feverCollected||0;run.feverNextSpawnAt=run.elapsed;advanceFeverCrystals();render();}
  function beginFeverIntro(){if(!run||run.done)return;run.feverTransition=true;run.petEffects?.clear();run.weavingStepActive=false;run.weavingStepDodging=false;run.weavingStepNotice='';run.eagleEyeActive=false;run.eagleEyeRemoved=[];run.eagleEyePairId=null;run.iceTimeActive=false;run.attack=false;run.timeStopped=false;run.skill='';speak('Fever Time!');render();nextTimer=setTimeout(enterFeverTime,reducedMotion()?700:1650);}
  function collectFeverCrystal(id){if(!run?.fever||run.done||run.paused)return;const word=run.feverWords.find(item=>item.id===id);if(!word||word.state==='pop')return;if(word.state==='word'){word.state='meaning';render();return;}word.state='pop';word.removeAt=run.elapsed+240;run.feverCollected=(run.feverCollected||0)+1;document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'success'}}));render();}
  function renderFeverBattle(){const left=Math.max(0,run.storyTimeLimit-run.elapsed);return `<div class="fever-screen"><div class="battle-top row"><div class="stage-copy"><div class="eyebrow">BONUS FEVER TIME</div><b>영어 단어를 눌러 뜻을 확인하고, 한 번 더 눌러 터뜨리세요!</b></div></div><div class="fever-hud"><span>남은 시간 · 수집 ${run.feverCollected||0}개</span><strong><span id="timer">${(left/1000).toFixed(1)}</span>초</strong></div><section class="fever-field" aria-label="단어 크리스털">${run.feverWords.map(word=>`<button type="button" class="fever-crystal phase-${word.state}" data-action="fever-pick" data-id="${word.id}" style="--x:${word.x}%;--y:${word.y}%" aria-label="${word.state==='meaning'?`${esc(word.entry[0])}, ${esc(word.entry[2])}. 한 번 더 눌러 터뜨리기`:`${esc(word.entry[0])} 뜻 보기`}" ${word.state==='pop'?'disabled':''}><b>${esc(word.entry[0])}</b>${word.state==='meaning'?`<span>${esc(word.entry[2])}</span>`:''}</button>`).join('')}</section></div>`;}
  function canActivateMageIceTime(){return Boolean(run?.story&&selectedCharacter?.class==='mage'&&!run.done&&!run.paused&&!run.locked&&!run.stunned&&!run.timeoutPending&&!run.fever&&!run.feverTransition&&!run.iceTimeActive&&run.mp>=1&&(run.guardian||run.matchBoard?.length>run.matched?.size));}
  function activateMageIceTime(){if(!canActivateMageIceTime())return;run.mp--;run.iceTimeActive=true;run.last=performance.now();run.iceTimePopUntil=run.last+1200;render();const activeRun=run,popUntil=run.iceTimePopUntil;setTimeout(()=>{if(run===activeRun&&run.iceTimePopUntil===popUntil){run.iceTimePopUntil=0;document.querySelector('.ice-time-announcement')?.remove();}},1200);}
  function updateWarriorSlash(now=performance.now()){
    if(!run?.story||selectedCharacter?.class!=='warrior')return;
    const slot=document.querySelector('.story-slash-skill');if(!slot)return;
    const remaining=Math.max(0,run.slashExpiresAt-now),active=remaining>0,ready=run.mp>=1;
    slot.style.setProperty('--slash-sweep',`${run.slashSkillUsed&&(active||!ready)?(1-remaining/10000)*360:0}deg`);
    slot.classList.toggle('activated',active);slot.classList.toggle('used',run.slashSkillUsed&&!active&&!ready);
    slot.disabled=!ready;slot.dataset.action=ready?'activate-slash':'';
    slot.setAttribute('aria-label',`연속 베기 액티브 스킬, MP ${run.mp}/${run.mpMax}, ${active?'활성화 중':ready?'사용 가능':'마나 부족'}`);
    slot.querySelector('b').textContent=active?'연속 베기 활성':ready?'연속 베기':'마나 부족';
    const status=slot.querySelector('small');if(status)status.textContent=active?`콤보 ${run.slashCombo} · ${(remaining/1000).toFixed(1)}초 남음`:ready?'MP 1 소모 · 10초간 활성':'MP 1 필요';
  }
  function activateWarriorSlash(){if(!run?.story||run.done||run.paused||selectedCharacter?.class!=='warrior'||run.fever||run.feverTransition||run.stunned||run.timeoutPending||run.mp<1)return;run.mp--;run.slashSkillUsed=true;run.slashCombo=0;run.slashWindowStartedAt=0;run.slashExpiresAt=performance.now()+10000;run.slashPop=null;render();}
  function storyPick(button){if(run?.redReaper){redReaperPick(button);return;}if(run?.boss){royalSlimePick(button);return;}if(!run?.story||run.fever||run.done||run.paused||run.stunned||run.timeoutPending)return;if(run.attack){queueStorySelection(button);return;}if(run.locked)return;const side=button.dataset.side,id=Number(button.dataset.id);if(run.matched.has(id))return;if(side==='ko')run.selectedKo=id;else run.selectedEn=id;if(run.eagleEyeActive&&side==='en'&&run.eagleEyePairId!==id){run.eagleEyePairId=id;run.selectedKo=null;}if(run.selectedKo===null||run.selectedEn===null){run.matchFeedback='';run.matchFeedbackType='';render();return;}run.eagleEyeActive=false;run.eagleEyePairId=null;if(run.selectedKo!==run.selectedEn){if(run.weavingStepActive&&consumePugilistWeavingStep())return;run.eagleEyeActive=false;run.eagleEyeRemoved=[];run.eagleEyePairId=null;run.iceTimeActive=false;run.timeStopped=false;run.slashCombo=0;run.slashWindowStartedAt=0;run.slashPop=null;run.matchFeedback='';run.matchFeedbackType='';run.selectedKo=null;run.selectedEn=null;if(run.crystalSpider||run.banditMob||run.golemMob){crystalSpiderWrongAnswer();return;}if(run.petEffects)run.petEffects.damage(1);else run.hp=Math.max(0,run.hp-1);run.stunned=true;render();const arena=$('arena');arena?.classList.add('wrong','story-stunned');document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'error'}}));if(run.hp<=0){setTimeout(()=>finishBattle(false,'hp-zero'),300);return;}setTimeout(()=>{if(!run||run.done)return;run.stunned=false;document.querySelector('#arena')?.classList.remove('wrong','story-stunned');if(!playQueuedStoryPair())render();},500);return;}run.timeStopped=false;const matched=run.matchEn.find(item=>item.id===id)?.entry;if(run.slashExpiresAt>performance.now()){run.slashCombo++;const slashGain=run.slashCombo*2;run.slashBonus+=slashGain;run.slashPop={combo:run.slashCombo,bonus:slashGain};}else{run.slashCombo=0;run.slashPop=null;}run.matchFeedback='';run.matchFeedbackType='';if(matched?.[0])speak(matched[0]);run.matched.add(id);run.pendingDefeat=true;run.selectedKo=null;run.selectedEn=null;run.index++;run.correct++;run.attack=true;run.locked=true;if(run.crystalSpider||run.banditMob||run.golemMob)run.spiderHitStartedAt=performance.now()-(run.spiderPausedMs||0);const noirPugilist=itemById(equippedMap(selectedCharacter).skin)?.code==='pugilist_crystal_noir_skin',contactHaptic=run.crystalSpider||run.banditMob||run.golemMob||noirPugilist||selectedCharacter?.class==='sniper'||['mage_starlight_rose_skin','ranger_violet_crystal_skin'].includes(itemById(equippedMap(selectedCharacter).skin)?.code),contact=battleContactDelay();if(run.crystalSpider||run.banditMob||run.golemMob)crystalSpiderSchedule(()=>document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'success'}})),contact);else setTimeout(()=>{if(contactHaptic)document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'success'}}));},contact);if(!contactHaptic)document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'success'}}));render();const battle=run,arena=$('arena'),duration=storyAttackDuration(arena,contact);
    if(run.petEffects)setTimeout(()=>{if(run!==battle||run.done||run.timeoutPending)return;if(run.paused){run.petPendingCorrect=true;return;}if(run.petEffects.onCorrect())refreshPetBattleFeedback();},contact);
    nextTimer=((run.crystalSpider||run.banditMob||run.golemMob)?crystalSpiderSchedule:setTimeout)(function finishStoryAttack(){
      if(run!==battle||run.done||run.timeoutPending)return;
      if((run.crystalSpider||run.banditMob||run.golemMob)&&run.paused){nextTimer=setTimeout(finishStoryAttack,30);return;}
      run.pendingDefeat=false;run.attack=false;
      run.locked=false;
      if(playQueuedStoryPair())return;
      if(run.index>=run.deck.length){beginFeverIntro();return;}
      if(run.index%STORY_QUESTIONS_PER_TURN===0)prepareQuestion();
      else run.locked=false;
      render();
    },duration);
  }
  function canSkipLocalBossBattle(){
    return Boolean(localHost&&!nativeApp&&page==='battle'&&run?.story&&(run.boss||run.guardian)&&!run.done&&!run.potionUsePending);
  }
  function localBossSkipMarkup(){
    return canSkipLocalBossBattle()?'<div class="actions"><button type="button" class="secondary" data-action="local-boss-skip">보스 전투 스킵 · 로컬</button></div>':'';
  }
  function skipLocalBossBattle(){
    if(!canSkipLocalBossBattle())return;
    // Victory preview only: never persist progress or rewards from a local skip.
    run.localBossSkipped=true;
    run.answeredCorrect??=run.correct;
    run.correct=run.bossMaxHp||(run.guardian?60:ROYAL_SLIME_HP);
    run.index=run.deck.length;run.bossHp=0;run.elapsed=Math.max(1,run.elapsed);
    run.attack=false;run.stunned=false;run.paused=false;
    closeDialog();
    finishBattle(true,'local-boss-skip');
  }
  function localBossPreviewResult(){
    return '<section class="result"><div class="eyebrow">LOCAL PREVIEW</div><h1>보스 전투를 스킵했어요</h1><p>클리어 기록과 보상은 저장하지 않았어요.</p><button class="primary" data-action="nav" data-page="story">월드맵으로</button></section>';
  }
  function finishGuardianBattle(clear,reason){
    if(!run?.guardian||run.done)return;
    persistStoryBattleVitals();
    run.weavingStepActive=false;run.weavingStepDodging=false;run.weavingStepNotice='';run.eagleEyeActive=false;run.eagleEyeRemoved=[];run.eagleEyePairId=null;run.iceTimeActive=false;if(run.redReaper)window.WORDORIA_RED_REAPER.clear(run);run.shadowFreezeMs=0;run.shadowCastMs=0;run.sorcerusHealMs=0;run.sorcerusHealElapsed=0;run.sorcerusQueue=[];run.sorcerusContact=false;run.petEffects?.clear();run.done=true;run.clear=clear;run.reason=reason;
    clearInterval(timerId);clearTimeout(nextTimer);removeBattleReward();cancelSpeech();
    if(run.lichDragon){if(clear&&Number.isFinite(run.lichClearElapsed))run.elapsed=run.lichClearElapsed;window.WORDORIA_LICH_DRAGON.clear(run);if(clear){storyDialogueIndex=0;go('storyChapterFiveBossEnd');}else go('bossResult');return;}
    if(clear){storyDialogueIndex=0;if(run.redReaper)go('storyChapterFourBossEnd');else if(run.shadowSorceress)go('storyChapterFourMidbossEnd');else go(run.blackDragon?'storyChapterThreeBossEnd':'storyChapterTwoBossEnd');}
    else go('bossResult');
  }
  async function claimGuardianReward(){
    if(!run?.guardian||run.localBossSkipped||!run.clear||run.rewardPending||run.bossReward!==undefined)return;
    const battle=run; battle.rewardPending=true;battle.rewardError=false;render();
    try{
      if(battle.correct!==(battle.bossMaxHp||60)||battle.bossHp!==0)throw new Error('boss not cleared');
      if(localMode){
        const stage=stageRecordName(selectedStage);
        const claimed=demoState.records.some(row=>row.player===player&&row.stage===stage&&row.guardianRewardClaimed);
        const reward=claimed?0:battle.lichDragon?window.WORDORIA_LICH_DRAGON.reward(battle.elapsed):battle.redReaper?500:battle.shadowSorceress?200:battle.blackDragon?600:500;
        const row={id:`demo-guardian-${Date.now()}-${Math.random()}`,player,stage,correct:battle.bossMaxHp||60,total:battle.bossMaxHp||60,cleared:true,character_id:selectedCharacter.id,duration_ms:Math.round(battle.elapsed),coins_earned:reward,treasure_claimed:true,guardianRewardClaimed:true,created_at:new Date().toISOString()};
        selectedCharacter.coins+=reward;demoState.records.unshift(row);records=demoState.records;
        battle.result={game_score_id:row.id,coins_earned:reward,balance:selectedCharacter.coins};battle.bossReward=reward;saveDemo();
      }else{
        const rows=await rpc(battle.lichDragon?'claim_lich_dragon_boss_reward':battle.redReaper?'claim_red_reaper_boss_reward':battle.shadowSorceress?'claim_shadow_sorceress_boss_reward':battle.blackDragon?'claim_black_dragon_boss_reward':'claim_guardian_boss_reward',{p_character_id:battle.redReaper||battle.lichDragon?battle.storyCharacterId:selectedCharacter.id,p_correct:battle.lichDragon?battle.bossMaxHp:battle.correct,p_duration_ms:Math.max(1,Math.round(battle.elapsed))});
        const result=rows?.[0];if(!result)throw new Error('boss reward unavailable');
        accountCrystals=Number(result.balance);battle.bossReward=Number(result.reward);battle.result={...result,coins_earned:Number(result.reward)};
        // Keep progression current even if the subsequent record refresh fails.
        records=[{id:result.game_score_id,player,stage:stageRecordName(selectedStage),character_id:selectedCharacter.id,correct:battle.bossMaxHp||60,total:battle.bossMaxHp||60,cleared:true},...records];
      }
    }catch(error){battle.rewardError=true;toast('보상을 저장하지 못했어요. 다시 시도해 주세요.');}
    finally{battle.rewardPending=false;if(run===battle&&page==='bossResult'){render();if(battle.lichDragon&&!battle.rewardError)showStoryBranchChoice();}}
  }
  function renderGuardianResult(){
    if(run?.localBossSkipped)return localBossPreviewResult();
    const bossName=run.lichDragon?'부활한 리치 드래곤':run.redReaper?'붉은 사신':run.shadowSorceress?'쉐도우 소서러스':run.blackDragon?'블랙 드래곤':'크리스탈 가디언 골렘',art=run.lichDragon?'assets/novel/characters/char_lich_dragon_world5_standing.webp':run.redReaper?'assets/monsters/red-reaper/red-reaper-standing.png':run.shadowSorceress?'assets/monsters/shadow-sorceress/shadow-sorceress-standing.png':run.blackDragon?'assets/monsters/black-dragon/idle/01.png':'assets/monsters/crystal-guardian-golem/idle/01.png';
    return `<section class="result"><div class="eyebrow">${run.lichDragon?'AMETHYST CAVERN · FINAL BOSS':run.redReaper?'ILLUSION LAND · FINAL BOSS':run.shadowSorceress?'ILLUSION LAND · MID BOSS':'CRYSTAL TEMPLE · FINAL BOSS'}</div><img class="royal-boss-result-art" src="${esc(deployedAssetUrl(art))}" alt="${bossName}"><h1>${run.clear?`${bossName}을 물리쳤어요!`:run.reason==='timeout'?'시간이 다 되었어요':'다시 힘을 모아 도전해요'}</h1>${run.clear?`<p class="royal-boss-reward" role="status">${run.rewardPending?'보상 저장 중…':run.rewardError?'보상 저장에 실패했어요':run.bossReward===0?'보상을 이미 받았어요':`◆ +${num(run.bossReward??(run.lichDragon?window.WORDORIA_LICH_DRAGON.reward(run.elapsed):run.redReaper?500:run.shadowSorceress?200:run.blackDragon?600:500))} 크리스털`}</p>`:''}${run.lichDragon&&run.clear&&run.bossReward>700?'<p>4분 이내 처치 보너스 +300 크리스털 포함</p>':''}<div class="actions">${run.rewardError?'<button class="primary" data-action="guardian-reward-retry">보상 저장 다시 시도</button>':''}${run.clear?'':`<button class="primary" data-action="${run.lichDragon?'lich-dragon-retry':run.redReaper?'red-reaper-retry':run.shadowSorceress?'shadow-sorceress-retry':run.blackDragon?'black-dragon-retry':'guardian-retry'}">다시 도전하기</button>`}<button class="${run.clear?'primary':'secondary'}" data-action="guardian-leave" ${run.rewardPending||run.clear&&run.rewardError?'disabled':''}>${run.clear?'월드맵으로':'떠나기'}</button></div></section>`;
  }
  async function finishBattle(clear,reason){
    if(run.done)return;if(run.guardian&&!run.sorcerus&&!run.banditChief&&!run.abyssGolem){finishGuardianBattle(clear,reason);return;}if(run.boss){finishRoyalSlimeBattle(clear,reason);return;}persistStoryBattleVitals();run.weavingStepActive=false;run.weavingStepDodging=false;run.weavingStepNotice='';run.eagleEyeActive=false;run.eagleEyeRemoved=[];run.eagleEyePairId=null;run.iceTimeActive=false;run.petEffects?.clear();run.done=true;run.clear=clear;run.reason=reason;run.feedbackPending=false;clearInterval(timerId);clearTimeout(nextTimer);removeBattleReward();cancelSpeech();
    if(run.abyssGolem){window.WORDORIA_ABYSS_GOLEM.clear(run);if(clear)run.deck=run.deck.slice(0,run.correct);}
    if(run.banditChief){window.WORDORIA_BANDIT_CHIEF.clear(run);if(clear)run.deck=run.deck.slice(0,run.correct);}
    if(run.sorcerus){run.shadowFreezeMs=0;run.sorcerusHealMs=0;run.sorcerusHealElapsed=0;run.sorcerusQueue=[];run.sorcerusContact=false;}
    await saveBattleResult(run,clear);
    if(clear&&run.story)storyDialogueIndex=0;
    const storyIndex=storyStages.findIndex(stage=>stage.key===selectedStage),storyStage=storyStages[storyIndex];
    if(clear&&run.story){const next=storyStages.find((stage,index)=>!stageCleared(stage.key)&&storyStageUnlocked(index));if(next){selectedStoryStage=next.key;selectedStoryWorld=next.chapter||1;}}
    go(clear&&run.story&&storyStage?.chapter===5&&storyStage?.number===10?'storyChapterFiveMidbossEnd':clear&&run.story&&storyStage?.chapter===4&&storyStage?.number===20?'storyChapterFourBossEnd':clear&&run.story&&storyStage?.chapter===4&&storyStage?.number===10?'storyChapterFourMidbossEnd':clear&&run.story&&storyStage?.chapter===2&&storyStage?.number===7?'storyChapterTwoBossEnd':clear&&run.story&&(storyStage?.epilogue||((storyStage?.chapter||1)===1&&storyStage?.number===7))?'storyEpilogue':'result');

    if(clear){document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'success'}}));}
  }
  async function saveBattleResult(run,clear){
    if(run.localBossSkipped||run.result?.game_score_id)return;
    if(run.sorcerus&&clear){await saveSorcerusMidbossReward(run);return;}
    if(run.abyssGolem){await saveAbyssGolemReward(run,clear);return;}
    run.saveError=false;run.saveRetryable=false;
    if(localMode){const id=`demo-${Date.now()}-${Math.random()}`,stage=stageRecordName(selectedStage),coins=run.storyReplay?0:earnedCoins(run.correct,clear)+Number(run.slashBonus||0)+Number(run.feverCollected||0);selectedCharacter.coins+=coins;run.result={game_score_id:id,coins_earned:coins,balance:selectedCharacter.coins};const row={id,player,stage,correct:run.correct,total:run.deck.length,cleared:clear,character_id:selectedCharacter.id,duration_ms:Math.round(run.elapsed),coins_earned:coins,created_at:new Date().toISOString()};demoState.records.unshift(row);records=demoState.records;saveDemo();}
    else if(dbOnline){try{const rows=await rpc('award_game_result',{p_character_id:selectedCharacter.id,p_stage:stageRecordName(selectedStage),p_correct:run.correct,p_total:run.deck.length,p_cleared:clear,p_duration_ms:Math.round(run.elapsed),p_slash_bonus:run.storyReplay?0:Number(run.slashBonus||0),p_fever_bonus:run.storyReplay?0:Number(run.feverCollected||0)});run.result=rows?.[0]||null;if(!run.result?.game_score_id)throw new Error('보상 저장 결과를 확인하지 못했어요.');if(run.result){if(accountMode)accountCrystals=Number(run.result.balance);else selectedCharacter.coins=run.result.balance;if(clear&&run.story&&Number(run.result.coins_earned)===0)run.storyReplay=true;}}catch(error){console.error(error);run.saveError=true;run.saveRetryable=error.status>=400&&error.status<500&&error.status!==408;}if(run.result?.game_score_id){try{records=await apiGet('game_scores?select=player,stage,correct,total,cleared,created_at,character_id,duration_ms,coins_earned,id&order=created_at.desc&limit=1000');}catch(error){console.warn('Adventure records refresh failed.',error);}}}
    else{run.saveError=true;run.saveRetryable=true;}
  }
  async function saveAbyssGolemReward(battle,clear){
    if(battle.savingMidbossReward||battle.result?.game_score_id)return;
    battle.savingMidbossReward=true;battle.saveError=false;battle.saveRetryable=false;
    const characterId=battle.storyCharacterId||selectedCharacter.id,stage=stageRecordName('story-ch6a-10');
    try{
      if(clear&&(battle.bossHp!==0||battle.correct<1))throw Error('boss not cleared');
      let result;
      if(localMode){
        const character=demoState.characters.find(c=>c.id===characterId);if(!character)throw Error('character not found');
        const claimed=demoState.records.find(r=>r.player===player&&r.stage===stage&&r.abyssGolemRewardClaimed);
        if(clear&&claimed){
          const old=claimed.cleared;claimed.cleared=true;try{saveDemo();}catch(error){claimed.cleared=old;throw error;}
          result={game_score_id:claimed.id,reward:0,balance:character.coins};
        }else{
          const reward=clear?300:0,oldCoins=character.coins,oldRecords=demoState.records;
          const row={id:`demo-abyss-${Date.now()}-${Math.random()}`,player,stage,correct:battle.correct,total:clear?battle.correct:Math.max(200,battle.correct+1),cleared:clear,character_id:characterId,duration_ms:Math.max(1,Math.round(battle.elapsed)),coins_earned:reward,treasure_claimed:true,abyssGolemRewardClaimed:clear,created_at:new Date().toISOString()};
          character.coins+=reward;demoState.records=[row,...oldRecords];
          try{saveDemo();}catch(error){character.coins=oldCoins;demoState.records=oldRecords;throw error;}
          result={game_score_id:row.id,reward,balance:character.coins};
        }
        records=demoState.records;
      }else{
        if(!dbOnline)throw Error('database unavailable');
        const rows=await rpc('claim_abyss_golem_reward',{p_character_id:characterId,p_correct:battle.correct,p_duration_ms:Math.min(300000,Math.max(1,Math.round(battle.elapsed))),p_cleared:clear});
        result=rows?.[0];if(!result?.game_score_id)throw Error('boss reward unavailable');
        accountCrystals=Number(result.balance);
        const row={id:result.game_score_id,player,stage,character_id:characterId,correct:battle.correct,total:battle.correct,cleared:clear};
        records=[row,...records.filter(r=>r.id!==row.id)];
      }
      battle.result={...result,coins_earned:Number(result.reward)};battle.storyReplay=clear&&Number(result.reward)===0;
    }catch(error){battle.saveError=true;battle.saveRetryable=true;}
    finally{battle.savingMidbossReward=false;}
  }
  async function saveSorcerusMidbossReward(battle){
    if(battle.localBossSkipped||battle.savingMidbossReward||battle.result?.game_score_id)return;
    battle.savingMidbossReward=true;battle.saveError=false;battle.saveRetryable=false;
    const characterId=battle.storyCharacterId||selectedCharacter.id,stage=stageRecordName(selectedStage);
    try{
      if(!battle.clear||battle.bossHp!==0||battle.correct<120)throw new Error('boss not cleared');
      let result;
      if(localMode){
        const character=demoState.characters.find(c=>c.id===characterId);
        if(!character)throw new Error('character not found');
        const claimed=demoState.records.find(row=>row.player===player&&row.stage===stage&&row.sorcerusMidbossRewardClaimed);
        if(claimed){
          const previousClear=claimed.cleared;claimed.cleared=true;
          try{saveDemo();}catch(error){claimed.cleared=previousClear;throw error;}
          result={game_score_id:claimed.id,reward:0,balance:character.coins,healing_potions:0};
        }
        else{
          const previousCoins=character.coins,previousRecords=demoState.records,previousInventory=demoState.potionInventory;
          const current=previousInventory?.[characterId]||potionInventory;
          const next={...current,red_potion_count:Number(current.red_potion_count||0)+5};
          const row={id:`demo-sorcerus-${Date.now()}-${Math.random()}`,player,stage,correct:battle.correct,total:battle.correct,cleared:true,character_id:characterId,duration_ms:Math.max(1,Math.round(battle.elapsed)),coins_earned:500,treasure_claimed:true,sorcerusMidbossRewardClaimed:true,created_at:new Date().toISOString()};
          character.coins+=500;demoState.records=[row,...previousRecords];
          demoState.potionInventory={...(previousInventory||{}),[characterId]:next};
          try{saveDemo();}catch(error){character.coins=previousCoins;demoState.records=previousRecords;demoState.potionInventory=previousInventory;throw error;}
          result={game_score_id:row.id,reward:500,balance:character.coins,healing_potions:5,inventory:next};
        }
        records=demoState.records;
      }else{
        if(!dbOnline)throw new Error('database unavailable');
        const rows=await rpc('claim_sorcerus_midboss_reward',{p_character_id:characterId,p_correct:battle.correct,p_duration_ms:Math.max(1,Math.round(battle.elapsed))});
        result=rows?.[0];if(!result?.game_score_id)throw new Error('boss reward unavailable');
        accountCrystals=Number(result.balance);
        records=[{id:result.game_score_id,player,stage,character_id:characterId,correct:battle.correct,total:battle.correct,cleared:true},...records];
      }
      if(result.inventory&&selectedCharacter?.id===characterId)potionInventory=result.inventory;
      battle.result={...result,coins_earned:Number(result.reward)};
      battle.bossPotionReward=Number(result.healing_potions);battle.storyReplay=Number(result.reward)===0;
    }catch(error){battle.saveError=true;battle.saveRetryable=true;}
    finally{battle.savingMidbossReward=false;}
  }
  function clearSummaryMarkup(r,earned){return `<section class="result clear-result"><div class="clear-portal" aria-hidden="true"><i></i><i></i><i></i></div><div class="clear-shards" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="clear-content"><div class="clear-crown" aria-hidden="true"><i></i></div><div class="eyebrow clear-title">STAGE CLEAR</div><div class="clear-sigil" aria-hidden="true"><i></i><b>◆</b></div><h1>클리어!</h1><p class="clear-stage">${esc(stages[selectedStage].name)}</p><div class="clear-stats"><div><span>클리어 타임</span><strong>${(r.elapsed/1000).toFixed(1)}<small>초</small></strong></div><div><span>푼 문제</span><strong>${r.correct}<small> / ${r.deck.length}</small></strong></div><div><span>획득 크리스털</span><strong class="crystal-value">◆ ${num(earned)}</strong></div></div>${r.sorcerus?`<p role="status">${r.storyReplay?'보상을 이미 받았어요':`힐링포션 +${num(r.bossPotionReward||0)}개를 받았어요`}</p>`:''}<button class="primary clear-next" data-action="result-next">${r.sorcerus||r.abyssGolem?'월드맵으로':r.storyReplay?'계속하기':'보상 상자 확인하기'} <span>→</span></button></div></section>`;}
  function chestMarkup(r){const clicks=r.chestClicks||0,progress=clicks/3*100,label=clicks===0?'상자를 터치해 주세요':clicks===1?'좋아요! 한 번 더!':'마지막 한 번!';return `<section class="result chest-result"><div class="eyebrow">${r.chestKind==="item"?"STORY ITEM · 2 / 2":r.story?"STORY CRYSTAL · 1 / 2":"CLEAR REWARD"}</div><h1>${r.chestKind==="item"?"아이템 상자가 도착했어요!":"보상 상자가 도착했어요!"}</h1><p>세 번 터치해서 잠든 보물을 깨워 보세요.</p><button class="treasure-chest-button" data-action="chest-tap" style="--chest-progress:${progress}%" aria-label="보상 상자 ${clicks}/3회 열기" ${!r.result?.game_score_id?'disabled':''}><span class="chest-ring" aria-hidden="true"><i></i><i></i><i></i></span><span class="reward-chest" aria-hidden="true"><i class="chest-glow"></i><img class="chest-art chest-art-closed" src="assets/ui/crystal-quest/rewards/ui_reward_chest_guardian_closed.webp" alt=""><img class="chest-art chest-art-open" src="assets/ui/crystal-quest/rewards/ui_reward_chest_guardian_open.webp" alt=""></span><span class="chest-sparkles" aria-hidden="true">✦ ✧ ✦</span></button><div class="chest-progress-copy"><strong>${clicks} / 3</strong><span>${r.result?.game_score_id?label:'보상 기록을 저장해야 상자를 열 수 있어요'}</span></div><div class="chest-pips" aria-hidden="true">${[1,2,3].map(n=>`<i class="${clicks>=n?'filled':''}"></i>`).join('')}</div></section>`;}
  function crystalRewardMarkup(r){const alreadyPaid=Number(r.treasure)===0;return `<section class="result crystal-reveal"><div class="reward-radiance" aria-hidden="true"></div><div class="eyebrow">${alreadyPaid?'STAGE REWARD':'TREASURE FOUND'}</div><h1>${alreadyPaid?'보상을 이미 받았어요':'크리스털 획득!'}</h1><div class="giant-crystal" aria-hidden="true"><img src="assets/ui/crystal-quest/rewards/ui_reward_crystal_bloom.webp" alt=""></div><div class="reward-amount"><strong>+${num(r.treasure)}</strong><span>크리스털</span></div><p>${alreadyPaid?'이 스테이지의 크리스털은 이전에 지급되었어요.':'보상이 계정 지갑에 안전하게 담겼어요.'}</p><button class="primary reward-claim" data-action="receive-reward">${alreadyPaid?'계속':'받기'}</button></section>`;}
  function itemRewardMarkup(r){const item=itemById(r.itemReward?.item_id),art=item?.art_path?deployedAssetUrl(item.art_path):'assets/ui/crystal-quest/rewards/ui_reward_chest_guardian_open.webp',name=r.itemReward?.item_name==='빨간 물약'?'힐링포션':r.itemReward?.item_name||'힐링포션';return `<section class="result crystal-reveal item-reveal"><div class="reward-radiance" aria-hidden="true"></div><div class="eyebrow">STORY ITEM FOUND</div><h1>아이템 획득!</h1><div class="giant-crystal" aria-hidden="true"><img src="${esc(art)}" alt=""></div><div class="reward-amount"><strong>${esc(name)}</strong></div><p>힐링포션 ${num(r.itemReward?.potion_count||1)}개${r.itemReward?.item_id?'와 장비 1개를 받았어요.':'를 받았어요.'}</p><button class="primary reward-claim" data-action="receive-reward">계속</button></section>`;}
  async function retryBattleReward(button){
    if(!run?.saveError||!run.saveRetryable||run.savingReward||run.result?.game_score_id)return;
    const battle=run;battle.savingReward=true;button.disabled=true;
    try{await saveBattleResult(battle,battle.clear);}finally{battle.savingReward=false;if(run===battle&&page==='result')render();}
  }
  function renderResult(){const r=run;if(r?.localBossSkipped)return localBossPreviewResult();if(r.saveError&&!r.result?.game_score_id)return `<section class="result"><h1>보상을 저장하지 못했어요</h1><p>이번 도전의 크리스털이 지갑에 반영되었는지 확인하지 못했어요.${r.saveRetryable?' 다시 저장해 주세요.':' 네트워크와 지갑·모험 기록을 확인해 주세요.'}</p>${r.saveRetryable?'<button class="primary" data-action="battle-reward-retry">보상 저장 다시 시도</button>':''}<button class="secondary" data-action="nav" data-page="home">홈으로</button></section>`;const result=r.result,earned=result?.coins_earned??(r.storyReplay?0:earnedCoins(r.correct,r.clear)+Number(r.slashBonus||0)+Number(r.feverCollected||0));if(!r.clear)return `<section class="result"><div class="result-symbol">${icon('aura')}</div><div class="eyebrow" style="color:var(--violet)">KEEP EXPLORING</div><h1>${r.reason==='timeout'?'시간이 다 되었어요':'다음엔 더 멀리 갈 수 있어요'}</h1><p>${esc(stages[selectedStage].name)} · ${r.correct} / ${r.deck.length} 정답<br>이번에 배운 단어는 다음 모험의 힘이 됩니다.</p><div class="reward-number">◆ +${num(earned)}</div><div class="panel row small reward-breakdown"><span>정답 <b>${r.correct}</b></span><span>풀이 시간 <b>${(r.elapsed/1000).toFixed(1)}초</b></span></div><button class="primary" data-action="retry">다시 도전하기 →</button><div class="actions"><button class="secondary" data-action="nav" data-page="dungeon">다른 던전</button><button class="secondary" data-action="nav" data-page="home">홈으로</button></div></section>`;if(r.resultStep==='chest')return chestMarkup(r);if(r.resultStep==='reward')return r.chestKind==='item'?itemRewardMarkup(r):crystalRewardMarkup(r);return clearSummaryMarkup(r,earned);}

  function showCharacters(){if(guestMode){showStats();return;}if(accountMode){characterCreating=false;go('characters');return;}modal(`<div class="eyebrow">CHOOSE YOUR HERO</div><h2>모험가 선택</h2>${profileBar()}<div class="character-list">${characters.map(c=>`<button class="character-row ${c.id===selectedCharacter?.id?'active':''}" data-action="select-character" data-id="${c.id}"><img src="${imagePath(c)}" alt=""><span><b>${esc(c.name)}</b><small>${characterDef(c).label} · ${variantOf(c)==='female'?'여성':'남성'}</small></span><span class="wallet">◆ ${num(c.coins)}</span></button>`).join('')||'<div class="empty-state">이 유저는 아직 캐릭터가 없어요.</div>'}</div><button class="primary" data-action="new-character" ${!dbOnline&&!localMode?'disabled':''}>＋ 새 캐릭터 만들기</button>`);}
  function showNewPlayer(){modal('<div class="eyebrow">NEW PLAYER</div><h2>새 유저 추가</h2><label class="form-label" for="player-name">유저 이름</label><input id="player-name" class="field" maxlength="12" autocomplete="off" placeholder="예: 엄마"><p>한글, 영문, 숫자, 공백, 밑줄과 하이픈을 사용할 수 있어요.</p><button class="primary" data-action="create-player">유저 추가</button>');setTimeout(()=>$('player-name')?.focus(),0);}
  function showNewCharacter(){if(guestMode&&characters.length)return;newClass='warrior';newVariant='male';newCharacterName=guestMode?'손님':'';if(accountMode||guestMode){if(characters.length&&!availableCharacterTickets){modal(`<div class="eyebrow">ADD NEW HERO</div><h2>새 캐릭터 추가</h2><p>캐릭터 추가권은 계정 크리스털 200개로 구매할 수 있어요.</p><div class="row" style="margin:18px 0"><b>◆ 200</b><span class="small muted">보유 ◆ ${num(walletBalance())}</span></div><button class="primary" data-action="buy-character-ticket-and-create" ${walletBalance()<200?'disabled':''}>${walletBalance()<200?'크리스털이 부족해요':'추가하기'}</button>`);return;}characterCreating=true;go('characters');return;}renderCharacterForm();}
  function renderCharacterForm(){if(guestMode){render();return;}if($('character-name'))newCharacterName=$('character-name').value;if(accountMode){render();return;}const d=classDefs[newClass];modal(`<div class="eyebrow">CREATE YOUR HERO</div><h2>${esc(player)}님의 새 모험가</h2><label class="form-label" for="character-name">캐릭터 이름</label><input id="character-name" class="field" maxlength="16" value="${esc(newCharacterName)}" placeholder="예: 불꽃검 율이"><label class="form-label">직업</label><div class="tabs">${Object.entries(classDefs).map(([id,c])=>`<button class="${id===newClass?'active':''}" data-action="class" data-value="${id}">${c.label}</button>`).join('')}</div><p>${d.trait}</p><label class="form-label">기본 외형</label><div class="choice-grid">${availableVariants(newClass).map(v=>`<button class="choice-card ${v===newVariant?'active':''}" data-action="variant" data-value="${v}"><img src="assets/avatars/${d.paths[v]}?v=20260917-skins" alt="">${v==='male'?'남성':'여성'} 캐릭터</button>`).join('')}</div><button class="primary" data-action="create-character">캐릭터 생성 →</button>`);}
  function showItem(id){const item=itemById(id);if(!item)return;const owned=itemOwned(item),eq=Object.values(equippedMap()).some(v=>String(v)===String(id)),gear=item.category==='avatar',skin=isSkin(item),rarity=displayRarity(item),eligible=!skin||skinEligible(item),balance=walletBalance(),purchaseMode=page==='shop'||!owned,disabled=purchaseMode&&(!eligible||balance<item.price),requirement=skin?skinRequirement(item):'';modal(`<div class="eyebrow">${rarityNames[rarity]}${gear?' · 아이템':' · 현실 보상'}</div><div class="item-art item-detail-art" data-rarity="${rarity}">${itemArt(item)}</div><h2>${esc(item.name)}</h2><p>${esc(item.description)}</p>${window.WORDORIA_PETS.catalog.some(p=>p.code===item.code)?`<p class="small muted">${item.code==='pet_prism_guardian_dragon'?'Story HP 0일 때 발동 판정 · 전투당 부활 1회':item.code==='pet'?'Story 새 문제판 시작 시 발동 판정 · 정답 하나 표시':'Story 정답 공격 적중 시 발동 판정'}</p>`:''}${item.code==='wish'?'<p class="small muted">계정당 하루 최대 6장 · 한국시간 자정 초기화</p>':''}${gear?`<div class="item-detail-stat"><span>${skin?'사용 조건':'장착 능력치'}</span><b>${skin?requirement:`${esc(({hp:'체력',mp:'정신',atk:'공격',luk:'행운',def:'체력'}[item.stat_key]||''))} +${num(Math.trunc(item.stat_value))}`}</b></div>`:''}<div class="item-price-line"><b>◆ ${num(item.price)}</b>${gear?`<span aria-hidden="true">/</span><b class="item-sale-price" aria-label="판매가 ${Math.floor(item.price/5)} 크리스털">◆ ${num(Math.floor(item.price/5))}</b>`:''}</div>${!purchaseMode?'<div class="item-equip-sale-actions">':''}<button class="primary" data-action="${purchaseMode?'buy':'equip'}" data-id="${item.id}" ${disabled?'disabled':''}>${!purchaseMode?(eq?'장착 해제':'장착하기'):(!eligible?`${requirement}이에요`:balance<item.price?'크리스털이 부족해요':'구매하기')}</button>${owned&&purchaseMode?`<div class="item-equip-sale-actions"><button class="secondary" data-action="equip" data-id="${item.id}">${eq?'장착 해제':'장착하기'}</button>`:''}${owned&&gear?`<button class="secondary" data-action="sell-item" data-id="${item.id}">판매하기</button>`:''}${owned?'</div>':''}`);}
  function showRecords(){const rows=selectedRecords().slice(0,20);modal(`<div class="eyebrow">ADVENTURE JOURNAL</div><h2>모험 기록</h2><p>${esc(selectedCharacter?.name||player)}의 최근 도전입니다.</p>${rows.length?rows.map(r=>`<div class="record-row row"><div><b>${esc(r.stage)}</b><small>${new Date(r.created_at).toLocaleString('ko-KR')} · ${r.correct}/${r.total} 정답</small></div><span>${r.cleared?'CLEAR':'도전'}<small>+${num(r.coins_earned)} ◆</small></span></div>`).join(''):'<div class="notice">아직 모험 기록이 없어요.</div>'}`);}
  function showStats(){const s=stats();modal(`<div class="eyebrow">ADVENTURER STATUS</div><h2>${esc(selectedCharacter.name)} · LV.${s.level}</h2><p>${characterDef(selectedCharacter).label} · ${characterDef(selectedCharacter).trait}</p><div class="record-row row"><span>경험치</span><b>${s.expMax?`${num(s.exp)} / ${num(s.expMax)}`:'MAX LEVEL'}</b></div><div class="record-row row"><span>최고 콤보</span><b>${s.best}</b></div><div class="record-row row"><span>누적 정답</span><b>${s.correct} / ${s.answered}</b></div><div class="record-row row"><span>정답률</span><b>${s.accuracy}%</b></div><div class="record-row row"><span>클리어</span><b>${s.clears}</b></div><button class="primary" data-action="records">모험 기록 보기</button>`);}
 function showRequests(){const active=redemptions.filter(r=>r.status==='pending'||r.status==='approved');modal(`<div class="request-heading"><div><div class="eyebrow">REWARD REQUESTS</div><h2>보상 신청 내역</h2></div><button class="text-btn" data-action="request-history">지난 신청 내역 →</button></div><p>구매한 보상을 지급했으면 완료해 주세요.</p>${active.length?active.map(r=>`<div class="record-row row reward-request"><div><b>${esc(itemById(r.item_id)?.name||'보상')}</b><small>${new Date(r.created_at).toLocaleString('ko-KR')} · ${num(r.price_paid)} ◆</small></div><button class="secondary" data-action="fulfill-reward" data-id="${r.id}">지급</button></div>`).join(''):'<div class="notice">지급 대기 중인 보상이 없어요.</div>'}`);}
 function showRequestHistory(){const cutoff=Date.now()-30*24*60*60*1000;const completed=redemptions.filter(r=>r.status==='fulfilled'&&new Date(r.fulfilled_at||r.created_at).getTime()>=cutoff);modal(`<div class="request-heading"><div><div class="eyebrow">REWARD HISTORY</div><h2>지난 신청 내역</h2></div><button class="text-btn" data-action="requests">← 신청 내역</button></div><p>최근 30일간 지급한 보상입니다.</p>${completed.length?completed.map(r=>`<div class="record-row row"><div><b>${esc(itemById(r.item_id)?.name||'보상')}</b><small>${new Date(r.fulfilled_at||r.created_at).toLocaleString('ko-KR')} · ${num(r.price_paid)} ◆</small></div><span class="request-status fulfilled">지급 완료</span></div>`).join(''):'<div class="notice">최근 30일간 지급한 보상이 없어요.</div>'}`);}
 async function fulfillReward(id,button){const request=redemptions.find(r=>String(r.id)===String(id));if(!request||!['pending','approved'].includes(request.status))return;if(!localMode&&!accountMode){toast('지급 처리에는 로그인이 필요해요');return;}button.disabled=true;try{if(localMode){request.status='fulfilled';request.fulfilled_at=new Date().toISOString();const original=demoState.redemptions.find(r=>String(r.id)===String(id));if(original){original.status='fulfilled';original.fulfilled_at=request.fulfilled_at;}saveDemo();}else await rpc('fulfill_reward_redemption',{p_redemption_id:Number(id)});await loadCharacterExtras();showRequests();render();toast('완료 되었습니다.');}catch(error){console.error(error);button.disabled=false;toast('지급 처리에 실패했습니다. 다시 시도해 주세요.');}}
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
      const rows=localMode?demoWeeklyRanking(stageName):await rpc('weekly_map_ranking',{p_stage:stageName});
      if(selectedStage===stageKey&&$('dialog').open&&$('weekly-ranking'))$('weekly-ranking').outerHTML=rankingMarkup(rows||[]);
    }catch(error){console.error(error);if(selectedStage===stageKey&&$('dialog').open&&$('weekly-ranking'))$('weekly-ranking').textContent='랭킹을 불러오지 못했어요. 잠시 후 다시 확인해 주세요.';}
  }
  function showMapStart(){showWeeklyRanking(true);}
  function showRankings(){showWeeklyRanking();}

  const noticeKinds={notice:'공지',event:'이벤트',other:'기타'};
  let noticeQueue=[],activeNotice=null,noticeBusy=false,noticeCreatingCharacter=false;
  let noticeRecipients=new Map(),noticeUserSearchVersion=0,noticeRequestId=null,noticePendingPayload=null;
  function noticeRewardArt(reward){
    if(reward.currency==='crystals')return itemArt({name:'크리스털',art_path:'assets/ui/crystal-quest/rewards/ui_reward_crystal_bloom.webp'});
    if(reward.potion_type)return `<span role="img" class="potion-icon ${reward.potion_type==='red'?'red':'blue'}" aria-label="${reward.potion_type==='red'?'힐링포션':'마나포션'}"></span>`;
    return itemArt(reward);
  }
  function noticeItemChoices(){
    return [{key:'crystals',name:'크리스털',currency:'crystals'},...shopItems.filter(item=>item.category==='avatar').map(item=>({...item,key:String(item.id)})),
      {key:'red',name:'힐링포션',potion_type:'red'},{key:'blue',name:'마나포션',potion_type:'blue'}];
  }
  async function showNoticeComposer(){
    if(!accountMode||accountProfile?.role!=='admin')return;
    noticeRecipients=new Map();noticeRequestId=crypto.randomUUID();noticePendingPayload=null;
    modal(`<section class="notice-composer"><button class="text-btn" data-action="profile">← 프로필</button><div class="eyebrow">ADMIN CONTENTS</div><h2>공지 보내기</h2><form id="notice-form"><label>공지 제목<input class="field" name="title" maxlength="100" required></label><label>종류<select class="field" name="kind"><option value="notice">공지</option><option value="event">이벤트</option><option value="other">기타</option></select></label><label>공지 내용<textarea class="field" name="body" rows="6" maxlength="10000" required></textarea></label><fieldset><legend>보낼 대상</legend><div class="notice-audience"><label><input type="radio" name="audience" value="all" checked> 전체</label><label><input type="radio" name="audience" value="selected"> 특정 유저</label></div><small>전체는 발송 시점에 가입한 모든 계정에 보내요.</small><div id="notice-targets" hidden><div class="notice-search"><input id="notice-user-search" class="field" placeholder="아이디 / 이름 검색" maxlength="100" aria-label="공지 대상 검색"><button type="button" class="secondary" data-action="notice-search">검색</button></div><div id="notice-selected" class="notice-selected"></div><div id="notice-users" class="notice-user-list"></div><small>검색 결과는 최대 100명이며 선택한 유저는 검색 후에도 유지돼요.</small></div></fieldset><fieldset><legend>첨부 아이템 · 여러 개 선택 가능</legend><div class="notice-item-list">${noticeItemChoices().map(item=>`<div class="notice-item-row"><label><input type="checkbox" name="reward" value="${esc(item.key)}"><span class="notice-item-art">${noticeRewardArt(item)}</span><span>${esc(item.name)}</span></label><input class="field" type="number" min="1" max="999" step="1" value="1" data-notice-quantity="${esc(item.key)}" aria-label="${esc(item.name)} 수량" disabled></div>`).join('')}</div></fieldset><p id="notice-send-status" role="status"></p><button class="primary" type="submit">보내기</button></form></section>`);
    await searchNoticeUsers();
  }
  async function searchNoticeUsers(){
    const version=++noticeUserSearchVersion,container=$('notice-users');if(!container)return;
    container.textContent='유저를 불러오는 중…';
    try{
      const users=await rpc('admin_notice_users',{p_search:$('notice-user-search')?.value.trim()||''});
      if(version!==noticeUserSearchVersion||!container.isConnected)return;
      container.innerHTML=users.map(user=>`<label><input type="checkbox" data-notice-user="${esc(user.user_id)}" data-label="${esc(user.login_id||user.display_name)}" ${noticeRecipients.has(user.user_id)?'checked':''}><span>${esc(user.display_name)} <small>${esc(user.login_id||'')}</small></span></label>`).join('')||'<p>검색 결과가 없어요.</p>';
    }catch{container.innerHTML='<p>유저를 불러오지 못했어요. 검색 버튼을 눌러 다시 시도해 주세요.</p>';}
  }
  function updateNoticeRecipients(){
    $('notice-selected').innerHTML=`<small>${noticeRecipients.size}명 선택</small>`+[...noticeRecipients].map(([id,label])=>`<button type="button" class="text-btn" data-action="notice-remove-user" data-id="${esc(id)}">${esc(label)} ×</button>`).join('');
  }
  async function sendNotice(form){
    const button=form.querySelector('[type=submit]'),status=$('notice-send-status');if(button.disabled||!form.reportValidity())return;
    const values=new FormData(form),audience=noticePendingPayload?.p_audience||values.get('audience');
    if(!noticePendingPayload&&(!String(values.get('title')||'').trim()||!String(values.get('body')||'').trim())){status.textContent='공지 제목과 내용을 입력해 주세요.';return;}
    if(audience==='selected'&&!noticeRecipients.size){status.textContent='보낼 유저를 한 명 이상 선택해 주세요.';return;}
    const rewards=values.getAll('reward').map(key=>({...(key==='crystals'?{currency:'crystals'}:key==='red'||key==='blue'?{potion_type:key}:{item_id:Number(key)}),quantity:Number(form.querySelector(`[data-notice-quantity="${key}"]`).value)}));
    noticePendingPayload ||= {p_request_id:noticeRequestId,p_title:String(values.get('title')).trim(),p_kind:values.get('kind'),p_body:String(values.get('body')).trim(),p_audience:audience,p_user_ids:[...noticeRecipients.keys()],p_rewards:rewards};
    form.querySelectorAll('input,select,textarea,button').forEach(control=>control.disabled=true);
    button.disabled=true;button.textContent='보내는 중…';status.textContent='';
    // Lock the request contents until its result is known. Retrying uses the same ID.
    try{
      const count=await rpc('send_game_notice',noticePendingPayload);
      noticeRequestId=null;
      modal(`<div class="eyebrow">NOTICE SENT</div><h2>공지를 보냈어요</h2><p>${num(count)}개 계정에 전달했어요.</p><button class="primary" data-action="profile">프로필로 돌아가기</button>`);
    }catch{status.textContent='발송 결과를 확인하지 못했어요. 다시 보내기를 누르면 중복 없이 확인해요.';button.disabled=false;button.textContent='다시 보내기';}
  }
  async function loadLoginNotices(){
    if(!accountMode||activeNotice)return;
    try{noticeQueue=await rpc('pending_game_notices',{});showNextNotice();}
    catch{toast('공지를 불러오지 못했어요. 프로필에서 공지 확인을 눌러 주세요.');}
  }
  function showNextNotice(){
    activeNotice=noticeQueue[0]||null;noticeBusy=false;
    if(!activeNotice){closeDialog();return;}
    const notice=activeNotice,rewards=notice.rewards||[];
    modal(`<section class="login-notice"><span class="role-badge">${esc(noticeKinds[notice.kind]||'공지')}</span><h2>${esc(notice.title)}</h2><div class="notice-body">${esc(notice.body)}</div>${rewards.length?`<div class="notice-rewards" aria-label="첨부 아이템">${rewards.map(reward=>`<span class="notice-reward"><span class="notice-item-art">${noticeRewardArt(reward)}</span><small>×${num(reward.quantity)}</small></span>`).join('')}</div>${notice.rewardClaimed?'<p class="notice-received" role="status">선물을 받았어요.</p>':rewards.every(reward=>reward.currency==='crystals')?'<button class="primary" data-action="notice-claim">받기</button>':characters.length?`<label class="notice-character-label">받을 캐릭터<select id="notice-character" class="field">${characters.map(character=>`<option value="${esc(character.id)}" ${character.id===selectedCharacter?.id?'selected':''}>${esc(character.name)}</option>`).join('')}</select></label><button class="primary" data-action="notice-claim">받기</button>`:'<p>아이템을 받을 캐릭터를 먼저 만들어 주세요.</p><button class="primary" data-action="notice-create-character">캐릭터 만들기</button>'}<small class="notice-close-hint">${notice.rewardClaimed?'닫기를 눌러 공지를 닫아 주세요.':'선물을 받아야 공지를 닫을 수 있어요.'}</small>`:''}<p id="notice-status" role="status"></p><button class="secondary" data-action="notice-dismiss" ${rewards.length&&!notice.rewardClaimed?'disabled':''}>닫기</button></section>`,{closable:false});
  }
  async function finishNotice(claim=false){
    if(!activeNotice||noticeBusy)return;
    const notice=activeNotice,characterId=$('notice-character')?.value||null;
    if(!claim&&(notice.rewards||[]).length&&!notice.rewardClaimed)return;
    if(claim&&notice.rewardClaimed)return;
    if(claim&&!characterId&&(notice.rewards||[]).some(reward=>reward.currency!=='crystals'))return;
    noticeBusy=true;
    document.querySelectorAll('.login-notice button,.login-notice select').forEach(button=>button.disabled=true);
    try{
      await rpc(claim?'claim_game_notice':'dismiss_game_notice',claim?{p_notice_id:notice.id,p_character_id:characterId}:{p_notice_id:notice.id});
    }catch{
      noticeBusy=false;$('notice-status').textContent='처리하지 못했어요. 다시 시도해 주세요.';
      document.querySelectorAll('.login-notice button,.login-notice select').forEach(button=>button.disabled=button.dataset.action==='notice-dismiss'&&Boolean((notice.rewards||[]).length)&&!notice.rewardClaimed);return;
    }
    if(claim){notice.rewardClaimed=true;}else{noticeQueue.shift();activeNotice=null;}
    if(claim){try{if((notice.rewards||[]).some(reward=>reward.currency==='crystals')){accountProfile=await loadAccountProfile();accountCrystals=Number(accountProfile.crystal_balance||0);}await loadCharacterExtras();render();}catch{/* The receipt is already saved; do not retry delivery. */}toast('선물을 받았어요');}
    showNextNotice();
  }
  document.addEventListener('keydown',event=>{if(event.target.id==='notice-user-search'&&event.key==='Enter'){event.preventDefault();void searchNoticeUsers();}});
  document.addEventListener('submit',event=>{if(event.target.id==='notice-form'){event.preventDefault();void sendNotice(event.target);}});
  document.addEventListener('change',event=>{
    const input=event.target;if(!input.closest('#notice-form'))return;
    if(input.name==='audience')$('notice-targets').hidden=input.value!=='selected';
    if(input.name==='reward')input.closest('.notice-item-row').querySelector('input[type=number]').disabled=!input.checked;
    if(input.dataset.noticeUser){if(input.checked)noticeRecipients.set(input.dataset.noticeUser,input.dataset.label);else noticeRecipients.delete(input.dataset.noticeUser);updateNoticeRecipients();}
  });
  $('dialog').addEventListener('cancel',event=>{if(activeNotice){event.preventDefault();void finishNotice();}});

  const roleLabels={admin:'관리자',teacher:'선생님',student:'학생'};
  function profilePermissions(role){
    if(role==='admin')return ['모든 월드와 맵 관리','사용자 및 계정 권한 관리','공개·비공개 맵 플레이'];
    if(role==='teacher')return ['내 월드와 맵 만들기','AI 단어 추출 및 문제 구성','허용된 비공개 맵 플레이'];
    return ['공개 맵 플레이','허용된 비공개 맵 플레이','학습 기록과 캐릭터 관리'];
  }
  async function loadAccountProfile(){
    if(localMode||window.WORDORIA_GUEST)return {display_name:player,login_id:null,role:'student',contact_email:null,contact_email_active:false,guest:true};
    const client=window.WORDORIA_AUTH_CLIENT;
    if(!client)return {display_name:player,login_id:null,role:'student',contact_email:null,contact_email_active:false,guest:true};
    const session=window.WORDORIA_SESSION||(await client.auth.getSession()).data?.session;
    if(!session)return {display_name:player,login_id:null,role:'student',contact_email:null,contact_email_active:false,guest:true};
    const result=await client.from('profiles').select('display_name,login_id,role,learning_level,contact_email,contact_email_active,contact_email_verified_at,email_reward_granted_at,email_reward_crystals,crystal_balance').eq('user_id',session.user.id).single();
    if(result.error)throw result.error;
    return {...result.data,contact_email:result.data.contact_email||null,guest:false,user_id:session.user.id};
  }
  function learningLevelControl(profile){
    const level=profile.learning_level||'middle';
    return `<div class="profile-section-title"><div><b>당신의 레벨</b><small>서바이벌과 스토리 맵은 학습 레벨별로 나뉘어요.</small></div></div><div class="role-picker" aria-label="학습 레벨">${Object.entries(learningLabels).map(([value,label])=>`<button class="${level===value?'active':''}" data-action="select-learning-level" data-level="${value}" aria-pressed="${level===value}" ${profile.role==='admin'?'':'disabled'}>${label}</button>`).join('')}<button disabled>고등학생 · 준비 중</button><button disabled>일반인 · 준비 중</button></div>`;
  }
  async function selectLearningLevel(button){
    if(!isAdministrator()||!learningLabels[button.dataset.level])return;
    button.disabled=true;
    try{await rpc('admin_set_learning_level',{p_user_id:accountUserId,p_learning_level:button.dataset.level});await loadAll();$('dialog-content').innerHTML=profileMarkup(accountProfile);render();toast('학습 레벨을 변경했어요');}
    catch(error){button.disabled=false;toast('학습 레벨 변경에 실패했어요');}
  }
  function profileMarkup(profile){
    const role=profile.role||'student',roleLabel=roleLabels[role]||'학생',permissions=profilePermissions(role),verified=Boolean(profile.contact_email_active&&profile.contact_email_verified_at),email=verified?(profile.contact_email||''):'';
    const emailControl=profile.guest?'<div class="profile-empty">로그인하면 이메일을 인증하고 계정 설정을 관리할 수 있어요.</div>':verified?`<label class="profile-email-label" for="profile-email">인증된 이메일</label><div class="profile-email-row verified"><input id="profile-email" class="field" type="email" value="${esc(email)}" readonly aria-readonly="true"><button class="email-unlink" data-action="ask-unlink-email" aria-label="이메일 연동 해제" title="연동 해제">×</button></div><p class="profile-email-status">✓ 이메일 인증 완료 · 계정 보상 ${num(profile.email_reward_crystals)} ◆</p>`:`<label class="profile-email-label" for="profile-email">인증할 이메일</label><div class="profile-email-row"><input id="profile-email" class="field" type="email" inputmode="email" autocomplete="email" maxlength="254" placeholder="name@example.com"><button class="secondary" data-action="send-profile-code">인증 메일</button></div><p class="profile-email-status pending">6자리 문자+숫자 코드를 이메일로 보내드려요.</p>`;
    const roleControl=verified&&role!=='admin'?`<div class="role-picker" aria-label="계정 권한 선택"><button class="${role==='student'?'active':''}" data-action="select-profile-role" data-role="student" aria-pressed="${role==='student'}">학생</button><button class="${role==='teacher'?'active':''}" data-action="select-profile-role" data-role="teacher" aria-pressed="${role==='teacher'}">선생님</button></div>`:verified&&role==='admin'?'<div class="admin-fixed-note">heojoon48@gmail.com 인증 관리자 · 권한 고정</div>':'';
    return `<section class="profile-sheet"><div class="profile-heading"><span class="profile-gem">${icon('profile')}</span><div><div class="eyebrow">MY CRYSTAL PROFILE</div><h2>${esc(profile.display_name||player)}</h2><span class="role-badge role-${esc(role)}">${icon('shield')} ${esc(roleLabel)}</span></div></div><div class="profile-account-card"><div class="profile-row"><span>로그인 아이디</span><b>${profile.guest?'게스트 모드':esc(profile.login_id||'아이디 정보 없음')}</b></div><div class="profile-row"><span>계정 공용 크리스털</span><b>◆ ${num(profile.guest?walletBalance():profile.crystal_balance)}</b></div><div class="profile-row"><span>계정 권한</span><b>${esc(roleLabel)}</b></div></div><div class="profile-section-title"><span>${icon('mail')}</span><div><b>이메일 인증</b><small>인증을 완료하면 200 크리스털을 한 번 지급해요.</small></div></div>${emailControl}${learningLevelControl(profile)}<div class="profile-section-title"><span>${icon('shield')}</span><div><b>내 권한</b><small>${verified?'인증된 계정의 역할을 선택할 수 있어요.':'이메일 인증 후 역할을 선택할 수 있어요.'}</small></div></div>${roleControl}<ul class="permission-list">${permissions.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>${!profile.guest?`<div class="profile-section-title"><span>${icon('mail')}</span><div><b>콘텐츠</b><small>계정에 도착한 소식을 확인해요.</small></div></div><button class="secondary" data-action="notice-inbox">공지 확인</button>${role==='admin'?'<button class="primary" data-action="notice-compose">공지 보내기</button>':''}`:''}<div class="profile-future-grid"><button disabled><span>${icon('friends')}</span><b>친구</b><small>친구 추가 · 친구 맺기</small><i>준비 중</i></button><button disabled><span>${icon('group')}</span><b>내 그룹</b><small>그룹 참여 · 구성원 관리</small><i>준비 중</i></button></div><button class="profile-signout" data-action="signout">${profile.guest?'로그인 · 회원가입으로 이동':'로그아웃'}</button></section>`;
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
    if(!run?.done)persistStoryBattleVitals();
    try{await flushStoryVitals();}catch{
      toast('HP·MP를 저장하지 못했어요. 연결을 확인하고 로그아웃을 다시 시도해 주세요.');
      return;
    }
    const client=window.WORDORIA_AUTH_CLIENT;
    if(!window.WORDORIA_GUEST&&!localMode&&client)await client.auth.signOut();
    sessionStorage.removeItem('wordoriaGuest');sessionStorage.removeItem('wordoria-guest-v1');location.reload();
  }

  async function switchPlayer(name){if(guestMode)return;player=name;localStorage.setItem('fantasyQuizPlayer',player);chooseCharacter();await loadCharacterExtras();closeDialog();go('home');}
  async function shiftCharacterSelection(direction){
    if(characters.length<2||!selectedCharacter)return;
    const current=Math.max(0,characters.findIndex(c=>c.id===(characterPreviewId||selectedCharacter.id)));
    characterPreviewId=characters[(current+direction+characters.length)%characters.length].id;
    characterArmedId=null;
    render();
  }
  async function createPlayer(){if(guestMode)return;const input=$('player-name'),name=input?.value.trim().replace(/\s+/g,' ');if(!name||!/^[가-힣A-Za-z0-9 _-]{1,12}$/.test(name)){toast('사용할 수 있는 유저 이름을 입력해 주세요');return;}if(players.some(x=>x.toLocaleLowerCase()===name.toLocaleLowerCase())){toast('이미 등록된 유저예요');return;}const custom=readCustomPlayers();custom.push(name);localStorage.setItem('fantasyQuizPlayers',JSON.stringify(unique(custom)));players.push(name);await switchPlayer(name);showNewCharacter();}
  async function createCharacter(button){if(guestMode&&characters.length)return;if(!classDefs[newClass]||!availableVariants(newClass).includes(newVariant))return;const input=$('character-name'),name=guestMode?'손님':input?.value.trim();if(!name){toast('캐릭터 이름을 입력해 주세요');input?.focus();return;}button.disabled=true;button.textContent='생성 중…';try{let created;if(localMode){if(demoState.characters.filter(c=>c.player===player).length&&!(demoState.characterTickets>0))throw new Error('character creation ticket required');created={id:`demo-${Date.now()}`,player,name,class:newClass,avatar_variant:newVariant,accent:'violet',coins:0,equipped_items:{}};demoState.characters.push(created);if(demoState.characters.filter(c=>c.player===player).length>1)demoState.characterTickets--;saveDemo();}else if(accountMode){const rows=await rpc('create_account_character',{p_name:name,p_class:newClass,p_avatar_variant:newVariant,p_accent:'violet'});created=Array.isArray(rows)?rows[0]:rows;}else{let rows;try{rows=await apiPost('game_characters',{player,name,class:newClass,avatar_variant:newVariant,accent:'violet'});}catch(error){if(!String(error.message).includes('avatar_variant'))throw error;rows=await apiPost('game_characters',{player,name,class:newClass,accent:'violet'});if(rows?.[0])localStorage.setItem(`fantasyQuizAvatar:${rows[0].id}`,newVariant);}created=rows?.[0];}if(created)localStorage.setItem(`fantasyQuizCharacter:${player}`,created.id);closeDialog();characterCreating=false;await refresh();if(guestMode)go('home');else if(accountMode)go('characters');toast('새 모험가가 길드에 합류했어요!');if(noticeCreatingCharacter){noticeCreatingCharacter=false;await loadLoginNotices();}}catch(error){console.error(error);button.disabled=false;button.textContent='다시 시도';toast(String(error.message).includes('ticket')?'캐릭터 추가권이 필요해요':'캐릭터 생성에 실패했습니다');}}
  async function buyCharacterTicket(button){if(!selectedCharacter||walletBalance()<200){toast('계정 크리스털이 부족해요');return false;}button.disabled=true;button.textContent='구매 중…';try{if(localMode){selectedCharacter.coins-=200;demoState.characterTickets=(demoState.characterTickets||0)+1;availableCharacterTickets=demoState.characterTickets;saveDemo();}else{const rows=await rpc('purchase_character_creation_ticket',{p_payer_character_id:selectedCharacter.id});const result=rows?.[0];if(result){accountCrystals=Number(result.new_balance);availableCharacterTickets=result.available_tickets;}}render();toast('계정 크리스털로 캐릭터 추가권을 구매했어요!');return true;}catch(error){console.error(error);button.disabled=false;button.textContent='다시 시도';toast(String(error.message).includes('not enough')?'계정 크리스털이 부족해요':'추가권을 구매하지 못했어요');return false;}}
  function wishPurchaseDay(timestamp=Date.now()){
    return new Date(new Date(timestamp).getTime()+9*60*60*1000).toISOString().slice(0,10);
  }
  function localWishPurchaseCount(item){
    const ids=new Set(demoState.characters.filter(c=>c.player===selectedCharacter.player).map(c=>c.id));
    const today=wishPurchaseDay();
    return demoState.redemptions.filter(r=>ids.has(r.character_id)&&String(r.item_id)===String(item.id)&&wishPurchaseDay(r.created_at)===today).length;
  }
  async function purchase(item){if(!item||walletBalance()<item.price)return;if(isSkin(item)&&!skinEligible(item)){toast(`${skinRequirement(item)} 캐릭터만 이 스킨을 구매할 수 있어요`);return;}try{if(localMode){if(item.code==='wish'&&localWishPurchaseCount(item)>=6)throw new Error('wish daily purchase limit');selectedCharacter.coins-=item.price;if(item.category==='avatar')demoState.inventory.push({character_id:selectedCharacter.id,item_id:item.id});else demoState.redemptions.unshift({id:Date.now(),character_id:selectedCharacter.id,item_id:item.id,status:'pending',price_paid:item.price,created_at:new Date().toISOString()});saveDemo();}else{const rows=await rpc('purchase_shop_item',{p_character_id:selectedCharacter.id,p_item_id:item.id});if(rows?.[0]){if(accountMode)accountCrystals=Number(rows[0].new_balance);else selectedCharacter.coins=rows[0].new_balance;}}await loadCharacterExtras();closeDialog();render();toast(item.category==='gift'?'보상 신청이 접수되었어요':'구매 완료! 장비함에서 장착해 보세요');}catch(error){console.error(error);toast(String(error.message).includes('wish daily purchase limit')?'소원권은 계정당 하루 최대 6장까지 구매할 수 있어요':String(error.message).includes('male pugilist')?'남성 권투사만 구매할 수 있어요':String(error.message).includes('female pugilist')?'여성 권투사만 구매할 수 있어요':String(error.message).includes('female ranger')?'여성 궁수만 구매할 수 있어요':String(error.message).includes('not enough')?'계정 크리스털이 부족해요':'구매하지 못했습니다');}}
  let itemSaleBusy=false;
  async function sellOwnedItem(item,type,button){
    if(itemSaleBusy||!selectedCharacter||(!item&&!type)||item&&(!itemOwned(item)||item.category!=='avatar')||type&&!storyPotionCount(type))return;
    const salePrice=Math.floor((type?POTION_PRICE:item.price)/5),name=type?potionTypes[type].name:item.name;
    let sold=false;itemSaleBusy=true;button.disabled=true;
    try{
      if(localMode){
        if(type){
          const current={...potionInventory},slots=equippedPotions();
          if(potionCount(type)>0)current[potionTypes[type].countKey]=potionCount(type)-1;
          else slots[slots.indexOf(type)]=null;
          current.equipped_slot_1=slots[0];current.equipped_slot_2=slots[1];potionInventory=current;
          demoState.potionInventory={...(demoState.potionInventory||{}),[selectedCharacter.id]:current};
        }else{
          const index=demoState.inventory.findIndex(row=>row.character_id===selectedCharacter.id&&String(row.item_id)===String(item.id));
          if(index<0)throw new Error('item not owned');
          demoState.inventory.splice(index,1);
          if(!demoState.inventory.some(row=>row.character_id===selectedCharacter.id&&String(row.item_id)===String(item.id))){
            const map=equippedMap();for(const slot of Object.keys(map))if(String(map[slot])===String(item.id))delete map[slot];
            selectedCharacter.equipped_items=map;
            if(String(selectedCharacter.equipped_item_id)===String(item.id))selectedCharacter.equipped_item_id=null;
          }
        }
        selectedCharacter.coins+=salePrice;saveDemo();
      }else{
        const rows=await rpc('sell_owned_item',{p_character_id:selectedCharacter.id,p_item_id:item?.id||null,p_potion_type:type||null});
        if(accountMode)accountCrystals=Number(rows[0].new_balance);else selectedCharacter.coins=Number(rows[0].new_balance);
      }
      sold=true;await loadCharacterExtras();
      if(!localMode){const updated=await apiGet(`game_characters?select=equipped_items,equipped_item_id&id=eq.${selectedCharacter.id}`);if(updated?.[0])Object.assign(selectedCharacter,updated[0]);}
      closeDialog();render();toast(`${name} 1개 판매 · ◆ ${salePrice}`);
    }catch(error){console.error(error);if(sold){closeDialog();render();toast('판매는 완료됐어요. 최신 장착 상태는 새로고침 후 확인해 주세요.');}else toast('판매하지 못했어요. 보유 수량을 확인하고 다시 시도해 주세요.');}
    finally{itemSaleBusy=false;button.disabled=false;}
  }
  async function equip(item){if(!item||!itemOwned(item))return;if(isSkin(item)&&!skinEligible(item)){toast(`${skinRequirement(item)} 캐릭터만 이 스킨을 장착할 수 있어요`);return;}const slot=slotFor(item),map=equippedMap(),isEquipped=String(map[slot])===String(item.id),skin=isSkin(item);try{if(localMode){if(isEquipped)delete map[slot];else map[slot]=item.id;selectedCharacter.equipped_items=map;saveDemo();}else{await rpc('equip_avatar_slot',{p_character_id:selectedCharacter.id,p_item_id:isEquipped?null:item.id,p_slot:slot});await loadAll();}closeDialog();render();toast(isEquipped?(skin?'스킨 장착을 해제했어요':'장비 장착을 해제했어요'):(skin?'장착했어요! 캐릭터 모습이 바뀌었어요':'장비를 장착했어요'));}catch(error){console.error(error);toast(String(error.message).includes('male pugilist')?'남성 권투사만 장착할 수 있어요':String(error.message).includes('female pugilist')?'여성 권투사만 장착할 수 있어요':String(error.message).includes('female ranger')?'여성 궁수만 장착할 수 있어요':'장비 슬롯 기능을 사용하려면 최신 DB 마이그레이션이 필요합니다');}}
  async function claimChestReward(){
    if(localMode){const min=run.story?30:selectedCharacter.class==='ranger'?20:10,max=run.story?51:31,reward=min+Math.floor(Math.random()*(max-min));selectedCharacter.coins+=reward;saveDemo();return reward;}
    const rows=await rpc('claim_stage_treasure',{p_character_id:selectedCharacter.id,p_game_score_id:run.result.game_score_id});
    if(accountMode)accountCrystals=Number(rows?.[0]?.balance??accountCrystals);else selectedCharacter.coins=rows?.[0]?.balance??selectedCharacter.coins;
    return Number(rows?.[0]?.reward||0);
  }
  async function claimStoryItemReward(){
    if(localMode){const level=stages[selectedStage].storyNumber-1,potions=level>=3?3:Math.max(1,level),rarity=level>=3?'unique':'normal',candidates=shopItems.filter(item=>item.category==='avatar'&&item.slot!=='skin'&&item.rarity===rarity);const item=candidates[Math.floor(Math.random()*candidates.length)];if(item)demoState.inventory.push({character_id:selectedCharacter.id,item_id:item.id});const current={...potionInventory};current.red_potion_count=Number(current.red_potion_count||0)+potions;demoState.potionInventory={...(demoState.potionInventory||{}),[selectedCharacter.id]:current};demoState.redPotions=(demoState.redPotions||0)+potions;saveDemo();await loadCharacterExtras();return {item_id:item?.id||null,item_name:item?.name||'힐링포션',potion_count:potions};}
    const rows=await rpc('claim_story_item_treasure',{p_character_id:selectedCharacter.id,p_game_score_id:run.result.game_score_id});
    await loadCharacterExtras();return rows?.[0];
  }
  function resultNext(){if(!run?.clear)return;if(run.sorcerus||run.abyssGolem){if(!run.result?.game_score_id)return;go('story');return;}if(run.storyReplay){go(selectedStage===storyStages[storyStages.length-1].key?'home':'story');toast('이미 완료한 스테이지예요. 재플레이 보상은 없어요.');return;}run.resultStep='chest';render();requestAnimationFrame(()=>$('screen')?.focus());}
  async function tapChest(button){if(!run?.clear||run.chest||!run.result?.game_score_id||button.classList.contains('opening'))return;run.chestClicks=Math.min(3,(run.chestClicks||0)+1);button.style.setProperty('--chest-progress',`${run.chestClicks/3*100}%`);button.setAttribute('aria-label',`보상 상자 ${run.chestClicks}/3회 열기`);button.classList.remove('shake-one','shake-two');void button.offsetWidth;button.classList.add(run.chestClicks===1?'shake-one':run.chestClicks===2?'shake-two':'opening');document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:run.chestClicks===3?'success':'light'}}));if(run.chestClicks<3){button.parentElement.querySelector('.chest-progress-copy strong').textContent=`${run.chestClicks} / 3`;button.parentElement.querySelector('.chest-progress-copy span').textContent=run.chestClicks===1?'좋아요! 한 번 더!':'마지막 한 번!';button.parentElement.querySelectorAll('.chest-pips i')[run.chestClicks-1]?.classList.add('filled');return;}button.disabled=true;try{const [reward]=await Promise.all([run.chestKind==='item'?claimStoryItemReward():claimChestReward(),new Promise(resolve=>setTimeout(resolve,900))]);run.chest=true;if(run.chestKind==='item')run.itemReward=reward;else run.treasure=reward;run.resultStep='reward';render();}catch(error){console.error(error);run.chestClicks=2;render();toast('보물상자를 열지 못했어요. 다시 시도해 주세요');}}
  function receiveReward(){if(!run?.chest)return;if(run.story&&run.chestKind!=='item'){run.chestKind='item';run.chest=false;run.chestClicks=0;run.resultStep='chest';render();return;}if(run.story){go(selectedStage===storyStages[storyStages.length-1].key?'home':'story');toast('스토리 보상을 받았어요!');return;}go('stages');toast(`크리스털 ${num(run.treasure)}개를 받았어요!`);}
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

    await shiftCharacterSelection(dx<0?1:-1);
  });
  document.addEventListener('pointercancel',()=>{characterSwipeStart=null;});
  document.addEventListener('keydown',async event=>{
    if(!event.target.closest('.character-card-stage')||!['ArrowLeft','ArrowRight'].includes(event.key))return;
    event.preventDefault();

    await shiftCharacterSelection(event.key==='ArrowRight'?1:-1);
  });
  document.addEventListener('click',event=>{if(page!=='battle'||!run||run.done||run.feedbackPending)return;if(event.target.closest('.story-match-item,.fever-crystal,[data-action],dialog'))return;if(event.target.closest('#arena')){if(run.paused)resume();else{pause();modal('<div class="eyebrow">PAUSED</div><h2>잠깐의 휴식</h2><div class="actions pause-actions"><button class="primary" data-action="resume">계속</button><button class="secondary" data-action="leave" data-page="home">홈으로</button></div>',{closable:false});}}});
  document.addEventListener('click',event=>{
    const scene=event.target.closest('.story-vn');
    if(!scene||event.target.closest('.story-vn-skip')||!['storyChapterFiveIntro','storyChapterFiveMidbossStart','storyChapterFiveMidbossEnd','storyChapterFiveBossStart','storyChapterFiveBossEnd','storyIntro','storyEpilogue','storyBossVictory','storyChapterTwoIntro','storyChapterTwoBossStart','storyChapterTwoBossEnd','storyPotionEvent','storyChapterFourIntro','storyChapterFourBossStart','storyChapterFourBossEnd','storyChapterFourMidbossStart','storyChapterFourMidbossEnd','storyChapterThreeIntro','storyChapterThreeBossStart','storyChapterThreeBossEnd'].includes(page))return;
    const lines=storyDialogueLines();
    if(storyDialogueIndex<lines.length-1){storyDialogueIndex++;render();}
    else completeStoryDialogue();
  });
  document.addEventListener('click',async event=>{const button=event.target.closest('button[data-action="retry-database"]');if(!button)return;event.preventDefault();event.stopImmediatePropagation();button.disabled=true;button.textContent='연결 중…';await refresh();toast(dbOnline?'데이터베이스에 다시 연결했어요.':'연결하지 못했어요. 잠시 후 다시 시도해 주세요.');},true);
  document.addEventListener('click',async event=>{const b=event.target.closest('button[data-action]');if(!b||b.disabled)return;const action=b.dataset.action,id=b.dataset.id;
    if(action==='notice-compose'){await showNoticeComposer();return;}
    if(action==='notice-search'){await searchNoticeUsers();return;}
    if(action==='notice-remove-user'){noticeRecipients.delete(id);updateNoticeRecipients();document.querySelectorAll('[data-notice-user]').forEach(input=>{input.checked=noticeRecipients.has(input.dataset.noticeUser);});return;}
    if(action==='notice-inbox'){await loadLoginNotices();return;}
    if(action==='notice-claim'||action==='notice-dismiss'){await finishNotice(action==='notice-claim');return;}
    if(action==='notice-create-character'){noticeCreatingCharacter=true;activeNotice=null;closeDialog();showNewCharacter();return;}
    if(action==='local-boss-skip'){skipLocalBossBattle();return;}
    if(action==='select-character'&&performance.now()<suppressCharacterClickUntil)return;
    if(action==='toggle-bgm'){const sound=window.wordoriaSound;if(sound){await sound.ready;sound.setBGMMuted(!sound.settings.bgmMuted);}syncBGMButtons();}else if(action==='nav')navigate(b.dataset.page);else if(action==='home')navigate('home');else if(action==='close'){closeDialog();if(page==='battle'&&run?.paused)resume();}
    else if(action==='player')await switchPlayer(b.dataset.player);else if(action==='add-player')showNewPlayer();else if(action==='create-player')await createPlayer();
    else if(action==='characters')showCharacters();else if(action==='select-character'){if(accountMode&&characterArmedId===id&&selectedCharacter?.id===id){go('home');return;}selectedCharacter=characters.find(c=>c.id===id)||selectedCharacter;characterPreviewId=selectedCharacter.id;characterArmedId=id;localStorage.setItem(`fantasyQuizCharacter:${player}`,selectedCharacter.id);if(accountMode){render();await loadCharacterExtras();}else{await loadCharacterExtras();closeDialog();render();}}
    else if(action==='character-step')await shiftCharacterSelection(Number(b.dataset.direction));else if(action==='character-page'){characterPreviewId=characters[Number(b.dataset.index)]?.id||selectedCharacter?.id;characterArmedId=null;render();}
    else if(action==='enter-game'){if(selectedCharacter)go('home');}else if(action==='open-character-create'||action==='new-character')showNewCharacter();else if(action==='cancel-character-create'){characterCreating=false;render();}else if(action==='buy-character-ticket')await buyCharacterTicket(b);else if(action==='buy-character-ticket-and-create'){if(await buyCharacterTicket(b)){closeDialog();showNewCharacter();}}else if(action==='class'){if($('character-name'))newCharacterName=$('character-name').value;if(!classDefs[b.dataset.value])return;newClass=b.dataset.value;if(!availableVariants(newClass).includes(newVariant))newVariant=availableVariants(newClass)[0];renderCharacterForm();}else if(action==='variant'){if($('character-name'))newCharacterName=$('character-name').value;if(!availableVariants(newClass).includes(b.dataset.value))return;newVariant=b.dataset.value;renderCharacterForm();}else if(action==='create-character')await createCharacter(b);
    else if(action==='item')showItem(id);else if(action==='potion-shop-item')showPotionShopItem(b.dataset.potion);else if(action==='buy-potion')await purchasePotion(b.dataset.potion,b);else if(action==='filter'){filter=b.dataset.filter;render();}else if(action==='buy'){b.disabled=true;try{await purchase(itemById(id));}finally{b.disabled=false;}}else if(action==='equip')await equip(itemById(id));else if(action==='sell-item')await sellOwnedItem(itemById(id),null,b);else if(action==='sell-potion')await sellOwnedItem(null,b.dataset.potion,b);
    else if(action==='slot'){const eq=equippedMap()[b.dataset.slot],owned=shopItems.find(i=>slotFor(i)===b.dataset.slot&&itemOwned(i));if(eq)showItem(eq);else if(owned)showItem(owned.id);else{filter=shopCategory({category:'avatar',slot:b.dataset.slot});go('shop');toast('이 슬롯에 어울리는 아이템을 골라 보세요');}}
    else if(action==='story-recover'){await recoverStoryHp(b.dataset.stage||'',b,b.dataset.potion||'red');if(b.dataset.collection==='true')showPotionCollection(b.dataset.potion);}else if(action==='story-recovery-shop'){closeDialog();filter='item';go('shop');}
    else if(action==='potion-collection')showPotionCollection(b.dataset.potion);else if(action==='potion-collection-equip')await equipPotionToEmptySlot(b.dataset.potion,b);else if(action==='gear-recovery')showStoryRecovery();else if(action==='potion-slot')showPotionSlot(Number(b.dataset.index));else if(action==='equip-potion')await setPotionLoadout(Number(b.dataset.slotIndex),b.dataset.potion);else if(action==='unequip-potion')await setPotionLoadout(Number(b.dataset.slotIndex),null);
    else if(action==='crystal-ghost-encounter'){startCrystalGhostBattle();}else if(action==='crystal-ghost-decline'){closeDialog();startBattle();}else if(action==='crystal-ghost-retry'){startCrystalGhostBattle();}else if(action==='crystal-ghost-reward-retry'){await claimCrystalGhostReward();}else if(action==='crystal-ghost-leave'){selectedStoryWorld=3;selectedStoryStage='story-ch3-7';pendingStoryRun=null;go('story');}else if(action==='guardian-reward-retry'){await claimGuardianReward();}else if(action==='lich-dragon-retry'){startBattle(true);}else if(action==='red-reaper-retry'){startBattle(true);}else if(action==='shadow-sorceress-retry'){startBattle(true);}else if(action==='black-dragon-retry'){startBattle(true);}else if(action==='guardian-retry'){startBattle();}else if(action==='guardian-leave'){selectedStoryWorld=2;if(run?.blackDragon)selectedStoryWorld=3;if(run?.shadowSorceress||run?.redReaper)selectedStoryWorld=4;if(run?.lichDragon)selectedStoryWorld=5;selectedStoryStage=selectedStage;pendingStoryRun=null;go('story');}else if(action==='boss-reward-retry'){await claimRoyalSlimeReward();}else if(action==='boss-retry'){startRoyalSlimeBattle();}else if(action==='boss-return'){const savedStage=pendingStoryRun;run=savedStage;pendingStoryRun=null;go(savedStage?.clear&&savedStage?.result?'result':'story');}else if(action==='mode-select'){go(b.dataset.mode);}else if(action==='world'){worldIndex=Number(b.dataset.index);go('stages');}else if(action==='story-branch-choose'){await chooseStoryBranch(b.dataset.branch);}else if(action==='story-world-select'){selectStoryWorld(Number(b.dataset.world));}else if(action==='story-stage-select'){selectStoryStage(b.dataset.stage);}else if(action==='story-enter-confirm'){startStoryStage(b.dataset.stage);}else if(action==='story-enter-cancel'){closeDialog();}else if(action==='story-start-stage'||action==='story-lv1'){confirmStoryStage(b.dataset.stage||storyStageKey);}else if(action==='world-four-potion-retry'){await claimWorldFourPotionEvent();}else if(action==='world-four-potion-refresh'){await loadWorldFourPotionClaims();go('story');}else if(action==='story-dialogue-next'){const lines=storyDialogueLines();if(storyDialogueIndex<lines.length-1){storyDialogueIndex++;render();}else completeStoryDialogue();}else if(action==='story-dialogue-skip'){completeStoryDialogue();}else if(action==='stage'){selectedStage=b.dataset.stage;showMapStart();}else if(action==='start'||action==='retry')startBattle(Boolean(action==='retry'&&(run?.sorcerus||run?.banditChief||run?.abyssGolem)));
    else if(action==='battle-reward-retry')await retryBattleReward(b);else if(action==='lich-pick')lichDragonPick(b);else if(action==='answer')answer(Number(b.dataset.index));else if(action==='activate-eagle-eye')activateRangerEagleEye();else if(action==='activate-weaving-step')activatePugilistWeavingStep();else if(action==='activate-ice-time')activateMageIceTime();else if(action==='activate-slash')activateWarriorSlash();else if(action==='use-story-potion')await useStoryPotion(Number(b.dataset.slotIndex),b);else if(action==='story-pick')storyPick(b);else if(action==='fever-pick')collectFeverCrystal(id);else if(action==='dismiss-reward')continueAfterFeedback();else if(action==='pause'){pause();modal('<div class="eyebrow">PAUSED</div><h2>잠깐의 휴식</h2><div class="actions pause-actions"><button class="primary" data-action="resume">계속</button><button class="secondary" data-action="leave" data-page="home">홈으로</button></div>',{closable:false});}else if(action==='resume')resume();else if(action==='leave'){closeDialog();const leavingBoss=run?.boss||run?.guardian;await finishBattle(false,'leave');if(!leavingBoss&&!run.saveError)go(b.dataset.page);}
    else if(action==='speak')speak(run.question.entry[0]);else if(action==='result-next')resultNext();else if(action==='chest-tap')await tapChest(b);else if(action==='receive-reward')receiveReward();else if(action==='records')showRecords();else if(action==='stats')showStats();else if(action==='requests')showRequests();else if(action==='request-history')showRequestHistory();else if(action==='fulfill-reward')await fulfillReward(id,b);else if(action==='rankings')showRankings();else if(action==='wallet')modal(`<div class="eyebrow">ACCOUNT CRYSTAL WALLET</div><h2>◆ ${num(walletBalance())}</h2><p>계정의 모든 캐릭터가 함께 사용하는 크리스털이에요.<br>어떤 캐릭터로 모아도 같은 지갑에 쌓입니다.</p>`);else if(action==='profile')await showProfile();else if(action==='send-profile-code')await sendProfileCode(b);else if(action==='resend-profile-code')await sendProfileCode(b,b.dataset.email);else if(action==='verify-profile-code')await verifyProfileCode(b);else if(action==='select-learning-level')await selectLearningLevel(b);else if(action==='select-profile-role')await selectProfileRole(b);else if(action==='ask-unlink-email')askUnlinkEmail();else if(action==='cancel-unlink-email')$('dialog-content').innerHTML=profileMarkup(accountProfile);else if(action==='confirm-unlink-email')await unlinkProfileEmail(b);else if(action==='signout')await signOut();
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
  document.addEventListener('keydown',event=>{if(page==='battle'&&!run?.boss&&!$('dialog').open&&/^[1-4]$/.test(event.key)){event.preventDefault();answer(Number(event.key)-1);}if(['storyChapterFiveIntro','storyChapterFiveMidbossStart','storyChapterFiveMidbossEnd','storyChapterFiveBossStart','storyChapterFiveBossEnd','storyIntro','storyEpilogue','storyBossVictory','storyChapterTwoIntro','storyChapterTwoBossStart','storyChapterTwoBossEnd','storyPotionEvent','storyChapterFourIntro','storyChapterFourBossStart','storyChapterFourBossEnd','storyChapterFourMidbossStart','storyChapterFourMidbossEnd','storyChapterThreeIntro','storyChapterThreeBossStart','storyChapterThreeBossEnd'].includes(page)&&['Enter',' ','ArrowRight'].includes(event.key)&&!event.target.closest('button')){event.preventDefault();const lines=storyDialogueLines();if(storyDialogueIndex<lines.length-1){storyDialogueIndex++;render();}else completeStoryDialogue();}if(event.key==='Enter'&&$('player-name'))createPlayer();});
  window.addEventListener('pagehide',()=>{if(!run?.done)persistStoryBattleVitals();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&!run?.done)persistStoryBattleVitals();if(document.hidden&&page==='battle'&&run&&!run.done&&!run.paused&&!run.feedbackPending){pause();modal('<h2>모험을 잠시 멈췄어요</h2><p>다시 준비되면 계속할 수 있어요.</p><button class="primary" data-action="resume">계속하기</button>');}});
  document.addEventListener('wordoria:native-pause',()=>{if(page==='battle'&&run&&!run.done&&!run.paused&&!run.feedbackPending){pause();modal('<h2>모험을 잠시 멈췄어요</h2><p>앱으로 돌아오면 계속할 수 있어요.</p><button class="primary" data-action="resume">계속하기</button>');}});
  document.addEventListener('wordoria:native-back',()=>{if(activeNotice){void finishNotice();return;}if($('dialog').open){const closeButton=document.querySelector('[data-action=close]');if(!closeButton.hidden)closeButton.click();return;}if(page==='battle'&&run&&!run.done){document.querySelector('[data-action=pause]')?.click();return;}if(page!=='home'){go('home');return;}document.dispatchEvent(new CustomEvent('wordoria:exit'));});

  window.wordoriaSound?.ready.then(syncBGMButtons);
  loadAll().then(()=>{if(novelTest){selectedStage='story-ch2-1';selectedStoryStage=selectedStage;selectedStoryWorld=2;storyDialogueIndex=0;go('storyChapterTwoIntro');return;}if(bossTest){selectedStage='story-lv6';run={story:true,storyReplay:true,clear:true,elapsed:0,correct:20,deck:buildQuestionDeck(stages[selectedStage]),slashBonus:0,result:{game_score_id:'local-boss-preview',coins_earned:0}};storyDialogueIndex=0;if(bossTest==='battle'||bossTest==='victory'){startRoyalSlimeBattle();if(bossTest==='victory'){run.correct=50;run.index=50;run.bossHp=0;run.elapsed=120000;finishRoyalSlimeBattle(true,'boss-defeated');}}else go('storyEpilogue');return;}if(guestMode&&selectedCharacter)page='home';render();void loadLoginNotices();}).catch(error=>{console.error(error);dbOnline=false;setConnection();render();});
})();
