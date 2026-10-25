import {readFile, writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const classes={'아서':'warrior','소서러스':'mage','파이터':'fighter','바이올렛':'ranger','아서 & 소서러스':'duo','크리스탈 정령':'spirit','크리스탈 골렘':'golem'};
const artRoot='assets/story/chapter-2-prologue/';
const midbossArt='assets/monsters/crystal-golem/crystal-golem-midboss.png';
const guardianArt='assets/monsters/crystal-guardian-golem/crystal-guardian-standing-left.png';
export function parseWorldTwoPrologue(markdown){
  const lines=[];
  let scene='approach',mission=false,golem=false,missionText='';
  for(const raw of markdown.replace(/\r\n/g,'\n').split(/\n\s*\n/)){
    const block=raw.trim();
    if(!block||block==='---')continue;
    if(block.startsWith('#')){
      if(/^### 크리스탈 사원$/.test(block))scene='temple';
      if(block.includes('STAGE START'))mission=true;
      if(block.includes('크리스탈 골렘'))golem=true;
      continue;
    }
    if(mission){if(block.startsWith('**MISSION**'))missionText=block.replace(/^\*\*MISSION\*\*\s*/, '').replace(/\*\*/g,'').replace(/\s*\n\s*/g,' ');continue;}
    const dialogue=block.match(/^\*\*(.+?)\*\*\s*\n["“]([\s\S]*?)["”]$/);
    const speaker=dialogue?.[1]||'내레이션';
    const text=(dialogue?.[2]||block).replace(/\*\*/g,'').replace(/\s*\n\s*/g,' ');
    const className=classes[speaker]||(speaker==='???'?'mystery':'scene');
    const line={speaker,className,text,scene};
    if(className==='spirit')line.artPath=artRoot+'crystal-spirit.png';
    if(className==='golem')line.artPath=midbossArt;
    if(/번쩍|콰앙|쿠구구궁/.test(text))line.flash=true;
    if(/쿵|콰앙|쿠구구궁/.test(text))line.shake=true;
    if(golem&&(className==='scene'||className==='mystery'))line.sceneArt=midbossArt;
    lines.push(line);
  }
  lines.push({speaker:'MISSION',className:'mission',text:missionText,scene:'temple',sceneArt:midbossArt});
  if(!missionText||lines.length<2||!lines.some(line=>line.className==='golem'))throw new Error('World 2 prologue is incomplete');
  return lines;
}
export function parseWorldTwoBoss(markdown){
  const lines=[];
  const clean=text=>text.replace(/&#x20;/g,' ').replace(/\\\s*\n/g,' ').replace(/\*\*/g,'').replace(/\s*\n\s*/g,' ').trim();
  for(const raw of markdown.replace(/\r\n/g,'\n').split(/\n\s*\n/)){
    const block=raw.trim();
    if(!block||block==='---')continue;
    // The document title is metadata; later headings are story and battle beats.
    if(lines.length===0&&/^#{1,2} 크리스탈 사원 입구/.test(block))continue;
    const dialogue=block.match(/^\*\*(.+?)\*\*\s*\\?\s*\n["“]([\s\S]*?)["”]$/);
    const speaker=dialogue?clean(dialogue[1]).replace(/\s+/g,' '):'내레이션';
    const text=clean(dialogue?.[2]||block.replace(/^#+\s*/,''));
    const className=classes[speaker]||(/골렘/.test(speaker)?'golem':speaker==='???'?'mystery':'scene');
    const line={speaker,className,text,scene:'temple'};
    if(className==='spirit')line.artPath=artRoot+'crystal-spirit.png';
    if(className==='golem')line.artPath=guardianArt;
    if(/콰|파아|낙뢰|전체 회복|앱솔루트/.test(text))line.flash=true;
    if(/쿵|콰|쩌/.test(text))line.shake=true;
    lines.push(line);
  }
  if(!lines.some(line=>line.className==='golem'))throw new Error('World 2 boss story is incomplete');
  return lines;
}
export function parseWorldThreePrologue(markdown){
  const lines=[];
  let sceneNumber=0,location='',thoughtSpeaker='',mission=false,missionText='';
  for(const raw of markdown.replace(/\r\n/g,'\n').split(/\n\s*\n/)){
    const block=raw.trim();
    if(!block||block==='---')continue;
    const heading=block.match(/^## SCENE (\d+)\. (.+)$/);
    if(heading){sceneNumber=Number(heading[1]);location=heading[2];thoughtSpeaker='';continue;}
    if(block.startsWith('#')){if(block.includes('PROLOGUE COMPLETE'))mission=true;continue;}
    if(!sceneNumber)continue;
    if(mission){const goal=block.match(/^\*\*다음 목표: (.+)\*\*$/);if(goal)missionText=goal[1];continue;}
    if(/^\*\*(배경|등장인물):/.test(block)||/^\*\*\[(연출|BGM):/.test(block))continue;
    const dialogue=block.match(/^\*\*(.+?)\*\*\s*\n["“'‘]([\s\S]*?)["”'’]$/);
    const continuation=!dialogue&&thoughtSpeaker&&/^['‘][\s\S]*['’]$/.test(block);
    const speaker=dialogue?.[1]||(continuation?thoughtSpeaker:'내레이션');
    thoughtSpeaker=speaker.includes('(속마음)')?speaker:'';
    const text=(dialogue?.[2]||(continuation?block.slice(1,-1):block)).replace(/\*\*/g,'').replace(/\s*\n\s*/g,' ');
    const line={speaker,className:classes[speaker.replace(/\s*\(속마음\)$/,'')]||'scene',text,scene:sceneNumber===4?'festival':'village',sceneNumber,location};
    if(speaker==='꼬마아이'){line.className='village-child';line.artPath='assets/novel/characters/char_mysterious_village_child_standing.webp';}
    if(/번쩍/.test(text))line.flash=true;
    lines.push(line);
  }
  if(!missionText||sceneNumber!==4||!lines.length)throw new Error('World 3 prologue is incomplete');
  lines.push({speaker:'MISSION',className:'mission',text:missionText,scene:'festival',sceneNumber:4,location});
  return lines;
}
export function parseWorldThreeBoss(markdown){
  const lines=[];
  let sceneNumber=0;
  for(const raw of markdown.replace(/\r\n/g,'\n').split(/\n\s*\n/)){
    const block=raw.trim();
    const heading=block.match(/^### SCENE (\d+)\. (.+)$/);
    if(heading){sceneNumber=Number(heading[1]);continue;}
    if(!block||block.startsWith('#'))continue;
    const dialogue=block.match(/^\*\*(.+?)\*\*\s*\n["“]([\s\S]*?)["”]$/);
    const speaker=dialogue?.[1]||'내레이션';
    const line={speaker,className:classes[speaker]||(['블랙 드래곤','리치 드래곤'].includes(speaker)?'black-dragon':'scene'),text:(dialogue?.[2]||block).replace(/\s*\n\s*/g,' '),scene:'cave'};
    if(sceneNumber)line.sceneNumber=sceneNumber;
    if(speaker==='꼬마아이'){line.className='village-child';line.artPath='assets/novel/characters/char_mysterious_village_child_standing.webp';}
    if(['블랙 드래곤','리치 드래곤'].includes(speaker))line.artPath='assets/novel/characters/char_lich_dragon_standing.png';
    lines.push(line);
  }
  if(!lines.some(line=>line.className==='black-dragon'))throw new Error('World 3 boss story is incomplete');
  return lines;
}
export function parseWorldFourPrologue(markdown){
  const lines=[];
  let sceneNumber=0,location='환각의 땅 · 프롤로그';
  for(const raw of markdown.replace(/\r\n/g,'\n').split(/\n\s*\n/)){
    const block=raw.trim();
    if(!block)continue;
    const heading=block.match(/^## Scene (\d+)\. (.+)$/);
    if(heading){sceneNumber=Number(heading[1]);location=heading[2];continue;}
    if(block.startsWith('#')||block==='(월드 4 프롤로그 종료)')continue;
    const dialogue=block.match(/^(아서|소서러스|바이올렛|파이터):\s*([\s\S]+)$/);
    const speaker=dialogue?.[1]||'내레이션';
    const text=(dialogue?.[2]||block.replace(/^배경:\s*/, '')).replace(/\s*\n\s*/g,' ');
    lines.push({speaker,className:classes[speaker]||'scene',text,scene:'illusion',sceneNumber,location,backgroundPath:`assets/novel/bgi/world4-prologue-scene-${String(Math.max(1,sceneNumber)).padStart(2,'0')}.webp`});
  }
  if(sceneNumber!==3||!lines.some(line=>line.speaker==='파이터')||lines.at(-1)?.text!=='맛있겠다...')throw new Error('World 4 prologue is incomplete');
  return lines;
}
export function parseWorldFourMidboss(markdown){
  const lines=[];
  const speakers={...classes,'그림자 소서러스':'shadow-mage','쉐도우 소서러스':'shadow-mage','네크로맨서 소서러스':'mage','골드 아서':'warrior','자주빛 바이올렛':'ranger'};
  const art={'그림자 소서러스':'assets/monsters/shadow-sorceress/shadow-sorceress-standing.png','쉐도우 소서러스':'assets/monsters/shadow-sorceress/shadow-sorceress-standing.png','네크로맨서 소서러스':'assets/avatars/skins/mage-male-arcane-necromancer-profile-v2.webp','골드 아서':'assets/avatars/skins/warrior-male-golden-radiance.webp','자주빛 바이올렛':'assets/avatars/skins/ranger-female-violet-crystal.webp'};
  let sceneNumber=0,location='환각의 땅 · 중간보스전 · 쉐도우 소서러스';
  for(const raw of markdown.replace(/\r\n/g,'\n').split(/\n\s*\n/)){
    const block=raw.trim();
    const heading=block.match(/^## Scene (\d+)\. (.+)$/);
    if(heading){sceneNumber=Number(heading[1]);location=heading[2];continue;}
    if(!sceneNumber||!block||block.startsWith('#')||block==='중간보스 전투 시작'||block.startsWith('WORLD 4 ·'))continue;
    const dialogue=block.match(/^([^:\n]+):\s*([\s\S]+)$/);
    const speaker=dialogue?.[1]||'내레이션';
    const text=(dialogue?.[2]||block).replace(/\s*\n\s*/g,' ');
    const line={speaker,className:speakers[speaker]||'scene',text,scene:'illusion',sceneNumber,location,backgroundPath:`assets/novel/bgi/world4-midboss-scene-${String(sceneNumber).padStart(2,'0')}.webp`};
    if(art[speaker])line.artPath=art[speaker];
    if(/강렬한 빛이|황금빛 갑옷|어둠의 마력이|자주빛 크리스탈의 힘/.test(text))line.flash=true;
    if(/충격파가 사방으로/.test(text))line.shake=true;
    lines.push(line);
  }
  if(sceneNumber!==4||!lines.some(line=>line.className==='shadow-mage')||lines.at(-1)?.text!=='덤벼라!!')throw new Error('World 4 midboss story is incomplete');
  return lines;
}
export function parseWorldFourMidbossEnd(markdown){
  const lines=[];
  let sceneNumber=0,location='환각의 땅 · 쉐도우 소서러스 · 클리어 이벤트';
  for(const raw of markdown.replace(/\r\n/g,'\n').split(/\n\s*\n/)){
    const block=raw.trim();
    const heading=block.match(/^## Scene (\d+)\. (.+)$/);
    if(heading){sceneNumber=Number(heading[1]);location=heading[2];continue;}
    // Reward headings remain in the source contract until a dedicated reward RPC exists.
    if(!sceneNumber||!block||block.startsWith('#')||block==='중간보스 격파 보상'||block==='(월드 4 중간보스 클리어 시나리오 종료)')continue;
    const dialogue=block.match(/^([^:\n]+):\s*([\s\S]+)$/);
    const speaker=dialogue?.[1]||'내레이션';
    const text=(dialogue?.[2]||block).replace(/\s*\n\s*/g,' ');
    const line={speaker,className:classes[speaker]||(speaker==='쉐도우 소서러스'?'shadow-mage':'scene'),text,scene:'illusion',sceneNumber,location,backgroundPath:`assets/novel/bgi/world4-midboss-scene-${String(sceneNumber).padStart(2,'0')}.webp`};
    if(speaker==='쉐도우 소서러스')line.artPath='assets/monsters/shadow-sorceress/shadow-sorceress-standing.png';
    if(/눈부신 빛|강렬한 빛/.test(text))line.flash=true;
    lines.push(line);
  }
  if(sceneNumber!==5||lines.at(-1)?.text!=='쉐도우 소서러스 격파!'||!lines.some(line=>line.text.includes('샤이닝 소드')))throw new Error('World 4 midboss ending is incomplete');
  return lines;
}
function parseWorldFourFinalBoss(markdown,ending=false){
  const lines=[];
  let sceneNumber=0,location='환각의 땅 · 버려진 성 · 붉은 사신',titleCard=false;
  for(const raw of markdown.replace(/\r\n/g,'\n').split(/\n\s*\n/)){
    const block=raw.trim();
    const heading=block.match(/^## Scene (\d+)\. (.+)$/);
    if(heading){sceneNumber=Number(heading[1]);location=heading[2];continue;}
    if(!sceneNumber||!block||block.startsWith('(월드 4 최종보스')||block.startsWith('스토리 연결:'))continue;
    if(block==='WORLD 4 · FINAL BOSS'){titleCard=true;continue;}
    if(block.startsWith('#')&&!(titleCard&&block===(ending?'# 붉은 사신 격파':'# 붉은 사신')))continue;
    const dialogue=block.match(/^([^:\n]+):\s*([\s\S]+)$/);
    const speaker=titleCard?'WORLD 4 · FINAL BOSS':dialogue?.[1]||'내레이션';
    const text=(dialogue?.[2]||block.replace(/^#\s*/, '')).replace(/\s*\n\s*/g,' ');
    const line={speaker,className:titleCard?'mission':classes[speaker]||(speaker==='네크로맨서 소서러스'?'mage':speaker.startsWith('???')?'mystery':speaker==='붉은 사신'?'red-reaper':'scene'),text,scene:'illusion',sceneNumber,location,backgroundPath:`assets/novel/bgi/world4-boss-scene-${String(sceneNumber).padStart(2,'0')}.webp`};
    if(speaker==='붉은 사신'||(titleCard&&!ending)||text==='(어둠 속에서 붉은 사신이 모습을 드러낸다.)')line.artPath='assets/monsters/red-reaper/red-reaper-standing.png';
    if(speaker==='네크로맨서 소서러스')line.artPath='assets/avatars/skins/mage-male-arcane-necromancer-profile-v2.webp';
    if(text==='(순간 계단을 감싸던 환각 마법이 깨진다.)'||text==='(소서러스가 네크로맨서로 변신한다.)'||text==='(순간 붉은 사신의 몸에 강력한 마법이 발동한다.)')line.flash=true;
    if(/^\(콰/.test(text)){line.flash=true;line.shake=true;}
    lines.push(line);
  }
  if(sceneNumber!==(ending?8:4)||!lines.some(line=>line.speaker==='붉은 사신')||lines.at(-1)?.text!==(ending?'붉은 사신 격파':'타락한 천사의 오른팔'))throw new Error('World 4 final boss story is incomplete');
  return lines;
}
export const parseWorldFourBossStart=markdown=>parseWorldFourFinalBoss(markdown);
export const parseWorldFourBossEnd=markdown=>parseWorldFourFinalBoss(markdown,true);
export function parseWorldFiveNarrative(markdown,backgroundGroup){
  const lines=[];
  const midbossStart=markdown.startsWith('# 월드 5 — 중간보스 도입');
  const midbossEnd=markdown.startsWith('# 월드 5 — 중간보스 격파');
  const prologue=markdown.startsWith('# 월드 5 — 프롤로그');
  const bossEnd=backgroundGroup==='boss-end';
  const backgroundSet=backgroundGroup||(prologue?'prologue':midbossStart?'midboss-start':midbossEnd?'midboss-end':'boss-start');
  let spiderVisible=false;
  let sceneNumber=0,location='보랏빛 수정동굴';
  const speakers={...classes,'파이터 & 아서':'party','다크 소서러스':'mage','어둠의 소서러스':'mage','갈등의 화신':'mystery','리치 드래곤':'black-dragon','모두':'party','아서 & 바이올렛 & 파이터':'party','효과음':'scene'};
  for(const raw of markdown.replace(/\r\n/g,'\n').split(/\n\s*\n/)){
    const block=raw.trim();
    if(bossEnd&&block.startsWith('## 다음 스토리'))break;
    const heading=block.match(/^## Scene (\d+)\. (.+)$/);
    if(heading){sceneNumber=Number(heading[1]);location=heading[2];continue;}
    if(bossEnd&&block.startsWith('배경:'))continue;
    if(!sceneNumber||!block||block.startsWith('#')||block.startsWith('(월드 5')||block==='중간보스 전투 시작'||block==='보스 전투 시작')continue;
    const dialogue=bossEnd&&block.startsWith('[')?null:block.match(/^([^:\n]+):\s*([\s\S]+)$/);
    const speaker=dialogue?.[1]||'내레이션';
    const line={speaker,className:speakers[speaker]||'scene',text:(dialogue?.[2]||block).replace(/\s*\n\s*/g,' '),scene:'violet-cave',sceneNumber,location,backgroundPath:`assets/novel/bgi/world5-${backgroundSet}-scene-${String(sceneNumber).padStart(2,'0')}.webp`};
    if(bossEnd)line.backgroundPath='assets/novel/bgi/world5-boss-start-scene-04.webp';
    if(prologue&&sceneNumber===3&&line.text.includes('크리스탈 거미들이야'))spiderVisible=true;
    if(spiderVisible){line.sceneArt='assets/monsters/crystal-spider/design-reference.png';line.sceneArtName='크리스탈 거미';line.sceneArtClass='crystal-spider';}
    if(speaker==='월드 5의 핵심 목표')line.className='mission';
    if(speaker==='리치 드래곤')line.artPath='assets/novel/characters/char_lich_dragon_world5_standing.webp';
    if(['다크 소서러스','어둠의 소서러스'].includes(speaker))line.artPath='assets/novel/characters/char_dark_sorcerus_world5_standing.webp';
    if(speaker==='소서러스'&&bossEnd)line.artPath='assets/avatars/mage.webp';
    else if(speaker==='소서러스'&&((midbossStart&&sceneNumber>=4)||(midbossEnd&&sceneNumber===1)))line.artPath='assets/novel/characters/char_sorcerus_world5_midboss_standing.webp';
    if(/새하얗게|휘감는다|백색 플래시/.test(line.text))line.flash=true;
    if(/거세게 흔들|벽에 부딪|화면 흔들림/.test(line.text))line.shake=true;
    lines.push(line);
  }
  if(!lines.length||sceneNumber<3)throw new Error('World 5 narrative is incomplete');
  return lines;
}
export function parseWorldSixANarrative(markdown,{section='all',location='반전세계'}={}){
  const lines=[];
  const backgroundPath='assets/environments/world-6a/01-inverted-world-battle.webp';
  const speakerClasses={...classes,'쉐도우 소서러스(변신)':'mage','다크 소서러스':'mage','소서러스(머릿속)':'mage','심연의 골렘':'golem','모르가나':'mystery'};
  const artPaths={
    '다크 소서러스':'assets/novel/characters/char_dark_sorcerus_world5_standing.webp',
    '쉐도우 소서러스(변신)':'assets/novel/characters/char_dark_sorcerus_world5_standing.webp',
    '심연의 골렘':'assets/monsters/abyss-golem/monster_abyss_golem_standing.png',
    '모르가나':'assets/novel/characters/char_morgana_world6a_standing.webp'
  };
  let active=section==='all'||section==='prelude';
  for(const raw of markdown.replace(/\r\n/g,'\n').split('\n')){
    const block=raw.trim();
    if(!block)continue;
    if(/^### 모르가나를\s*죽인다\.?$/.test(block)){active=section==='kill';continue;}
    if(/^### 모르가나를\s*살린다\.?$/.test(block)){active=section==='spare';continue;}
    if(section==='prelude'&&block.includes('선택지가 나온다'))break;
    if(!active||block==='---'||block.startsWith('#')||block.startsWith('- 다음')||block.startsWith('- 보상'))continue;
    const dialogue=block.match(/^([^:\n]+?)\s*:\s*([\s\S]+)$/);
    const speaker=(dialogue?.[1]||'내레이션').trim();
    const text=(dialogue?.[2]||block).replace(/^\[|\]$/g,'').replace(/\s*\n\s*/g,' ').trim();
    if(!text||text.includes('선택지가 나온다')||/HP\s*,\s*MP\s*가 각각 0/.test(text))continue;
    const line={speaker,className:speakerClasses[speaker]||(speaker==='???'?'mystery':'scene'),text,scene:'inverted-world',location,backgroundPath};
    if(artPaths[speaker])line.artPath=artPaths[speaker];
    if(/폭발|콰아|눈빛이 검게|마력 구체/.test(text))line.flash=true;
    if(/진동|흔들림|벽에 처박|무너지고/.test(text))line.shake=true;
    lines.push(line);
  }
  if(!lines.length)throw new Error(`World 6A narrative section is incomplete: ${section}`);
  return lines;
}
export function parseWorldSixBNarrative(markdown,{section='all',location='왕국수도로 가는 길'}={}){
  const lines=[];
  const backgroundPath='assets/environments/world-6b/01-capital-road-battle.webp';
  const speakerClasses={...classes,'도적 대장':'bandit-chief','도적 대장의 속마음':'bandit-chief','엘리엇':'elliot'};
  const artPaths={
    '엘리엇':'assets/novel/characters/char_elliot_world6b_standing.webp',
    '도적 대장':'assets/novel/characters/char_bandit_chief_world6b_standing.png',
    '도적 대장의 속마음':'assets/novel/characters/char_bandit_chief_world6b_standing.png'
  };
  let sceneNumber=0,sceneLocation=location,active=section==='all'||section==='prelude';
  for(const raw of markdown.replace(/\r\n/g,'\n').split(/\n\s*\n/)){
    const block=raw.trim();
    if(!block)continue;
    const sceneHeading=block.match(/^## Scene (\d+)\. (.+)$/);
    if(sceneHeading){sceneNumber=Number(sceneHeading[1]);sceneLocation=sceneHeading[2];continue;}
    if(/^## 선택\./.test(block)){if(section==='prelude')break;active=false;continue;}
    if(/^### A\. 풀어준다/.test(block)){active=section==='release';continue;}
    if(/^### B\. 풀어주지 않고 수도로 데려간다/.test(block)){active=section==='arrest';continue;}
    if(/^## (보상 및 후속 연결 메모|게임 연결 메모|후속 연결 메모|전투 계약)/.test(block))break;
    if(!active||!sceneNumber||block.startsWith('#')||block.startsWith('- ')||block.startsWith('다음 스토리:')||block.startsWith('영어 단어 게임')||block.startsWith('왕국 수도로 가는 길')||block.startsWith('기사단장 엘리엇의 저택')||block.startsWith('배경:')||block.startsWith('일반 적:'))continue;
    const dialogue=block.startsWith('[')?null:block.match(/^([^:\n]+?):\s*([\s\S]+)$/);
    const speaker=(dialogue?.[1]||'내레이션').trim();
    const text=(dialogue?.[2]||block).replace(/^\[|\]$/g,'').replace(/\s*\/\s*BGM:[\s\S]*$/,'').replace(/\s*\/\s*제한 시간[\s\S]*$/,'').replace(/\s*\n\s*/g,' ').trim();
    if(!text)continue;
    const line={speaker,className:speakerClasses[speaker]||(speaker==='???'?'mystery':'scene'),text,scene:'capital-road',sceneNumber,location:sceneLocation,backgroundPath};
    if(artPaths[speaker])line.artPath=artPaths[speaker];
    if(/달려든다|치켜들|강력한 검기|오러/.test(text))line.flash=true;
    if(/거친 발소리|쓰러져/.test(text))line.shake=true;
    lines.push(line);
  }
  if(!lines.length)throw new Error(`World 6B narrative section is incomplete: ${section}`);
  return lines;
}
export function parseWorldSevenNarrative(markdown,{world,location}={}){
  const lines=[];
  const speakerClasses={...classes,'다크 소서러스':'mage','모르가나':'mystery','타락하기 전의 천사':'mystery','천사':'mystery'};
  for(const raw of markdown.replace(/\r\n/g,'\n').split(/\n\s*\n/)){
    const block=raw.trim();
    if(!block||block.startsWith('#')||block==='---')continue;
    const dialogue=block.startsWith('(')?null:block.match(/^([^:\n]+?):\s*([\s\S]+)$/);
    const speaker=(dialogue?.[1]||'내레이션').trim();
    const text=(dialogue?.[2]||block).replace(/\s*\n\s*/g,' ').trim();
    const line={speaker,className:speakerClasses[speaker]||'scene',text,scene:`world-${world}`,location,
      backgroundPath:world==='7c'?'assets/story/chapter-7c-royal-dungeon-map.webp':world==='7a'?'assets/story/chapter-7a-burning-ancient-tower-map.webp':'assets/story/chapter-7b-black-lake-map.webp'};
    if(speaker==='다크 소서러스')line.artPath='assets/novel/characters/char_dark_sorcerus_world5_standing.webp';
    if(speaker==='모르가나')line.artPath='assets/novel/characters/char_morgana_world6a_standing.webp';
    if(world==='7b'&&['검은 세이렌의 대왕','다크 트라이튼'].includes(speaker)){
      line.speaker='다크 트라이튼';line.className='dark-triton';
      line.artPath='assets/monsters/dark-triton/dark-triton-standing.png';
    }
    if(world==='7b'&&speaker==='검은 세이렌 기사'){
      line.speaker='네레우스';line.className='nereus';
      line.artPath='assets/novel/characters/char_nereus_world7b_standing.webp';
    }
    if(world==='7c'&&speaker==='인공 심연의 골렘'){line.speaker='아르카온';line.className='arkaon';line.artPath='assets/novel/characters/char_arkaon_world7c_standing.webp';}
    lines.push(line);
  }
  if(!lines.length)throw new Error(`World ${world} narrative is incomplete`);
  return lines;
}
export async function generateStoryNovel(){
  const novels={};
  for(const [key,filename,parse] of [
    ['world2Prologue','world-2-1-prologue.md',parseWorldTwoPrologue],
    ['world2BossStart','world-2-7-boss-start.md',parseWorldTwoBoss],
    ['world2BossEnd','world-2-7-boss-end.md',parseWorldTwoBoss],
    ['world3Prologue','world-3-1-prologue.md',parseWorldThreePrologue],
    ['world3BossStart','world-3-8-boss-start.md',parseWorldThreeBoss],
    ['world3BossEnd','world-3-8-boss-end.md',parseWorldThreeBoss],
    ['world4Prologue','world-4-1-prologue.md',parseWorldFourPrologue],
    ['world4MidbossStart','world-4-10-midboss-start.md',parseWorldFourMidboss],
    ['world4MidbossEnd','world-4-10-midboss-end.md',parseWorldFourMidbossEnd],
    ['world4BossStart','world-4-20-boss-start.md',parseWorldFourBossStart],
    ['world4BossEnd','world-4-20-boss-end.md',parseWorldFourBossEnd],
    ['world5Prologue','world-5-1-prologue.md',markdown=>parseWorldFiveNarrative(markdown,'prologue')],
    ['world5MidbossStart','world-5-midboss-start.md',markdown=>parseWorldFiveNarrative(markdown,'midboss-start')],
    ['world5MidbossEnd','world-5-midboss-end.md',markdown=>parseWorldFiveNarrative(markdown,'midboss-end')],
    ['world5BossStart','world-5-20-boss-start.md',markdown=>parseWorldFiveNarrative(markdown,'boss-start')],
    ['world5BossEnd','world-5-20-boss-end.md',markdown=>parseWorldFiveNarrative(markdown,'boss-end')],
    ['world6aPrologue','world-6a-1-prologue.md',markdown=>parseWorldSixANarrative(markdown,{location:'반전세계 · 프롤로그'})],
    ['world6aMidbossStart','world-6a-midboss-start.md',markdown=>parseWorldSixANarrative(markdown,{location:'반전세계 · 심연의 유적'})],
    ['world6aMidbossEnd','world-6a-midboss-end.md',markdown=>parseWorldSixANarrative(markdown,{location:'반전세계 · 심연의 골렘 격파'})],
    ['world6aBossStart','world-6a-boss-start.md',markdown=>parseWorldSixANarrative(markdown,{location:'반전세계 · 모르가나의 왕좌'})],
    ['world6aBossEndPrelude','world-6a-boss-end.md',markdown=>parseWorldSixANarrative(markdown,{section:'prelude',location:'반전세계 · 모르가나 격파'})],
    ['world6aBossEndKill','world-6a-boss-end.md',markdown=>parseWorldSixANarrative(markdown,{section:'kill',location:'반전세계 · 저주의 결말'})],
    ['world6aBossEndSpare','world-6a-boss-end.md',markdown=>parseWorldSixANarrative(markdown,{section:'spare',location:'반전세계 · 자비의 결말'})],
    ['world6bPrologue','world-6b-1-prologue.md',markdown=>parseWorldSixBNarrative(markdown,{location:'왕국수도로 가는 길 · 프롤로그'})],
    ['world6bMidbossStart','world-6b-midboss-start.md',markdown=>parseWorldSixBNarrative(markdown,{location:'왕국수도로 가는 길 · 도적 대장'})],
    ['world6bMidbossEndPrelude','world-6b-midboss-end.md',markdown=>parseWorldSixBNarrative(markdown,{section:'prelude',location:'왕국수도로 가는 길 · 도적 대장 격파'})],
    ['world6bMidbossEndRelease','world-6b-midboss-end.md',markdown=>parseWorldSixBNarrative(markdown,{section:'release',location:'왕국수도로 가는 길 · 도적 대장 석방'})],
    ['world6bMidbossEndArrest','world-6b-midboss-end.md',markdown=>parseWorldSixBNarrative(markdown,{section:'arrest',location:'왕국수도로 가는 길 · 수도 이송'})],
    ['world6bCapital','world-6b-capital.md',markdown=>parseWorldSixBNarrative(markdown,{location:'워드 왕국 수도'})],
    ['world6bBossStart','world-6b-boss-start.md',markdown=>parseWorldSixBNarrative(markdown,{location:'기사단장 엘리엇의 저택'})],
    ['world6bBossEnd','world-6b-boss-end.md',markdown=>parseWorldSixBNarrative(markdown,{location:'기사단장 엘리엇의 저택 · 시험 통과'})]
  ])novels[key]=parse(await readFile(new URL('../assets/novel/'+filename,import.meta.url),'utf8'));
  for(const [phase,file] of [['MidbossStart','midboss-start'],['MidbossEnd','midboss-end']])novels[`world7c${phase}`]=parseWorldSevenNarrative(await readFile(new URL(`../assets/novel/world-7c-${file}.md`,import.meta.url),'utf8'),{world:'7c',location:'왕국 지하 던전 · 봉인의 돌다리'});
  for(const world of ['7a','7b']){
    const location=world==='7a'?'심연의 불타는 고대 탑':'심연의 검은 호수';
    for(const [key,file] of [['Prologue','1-prologue'],['MidbossStart','midboss-start'],['MidbossEnd','midboss-end'],['BossStart','boss-start'],['BossEnd','boss-end'],...(world==='7b'?[['Epilogue','epilogue']]:[])]){
      novels[`world${world}${key}`]=parseWorldSevenNarrative(await readFile(new URL(`../assets/novel/world-${world}-${file}.md`,import.meta.url),'utf8'),{world,location});
    }
  }
  const potionEvents=JSON.parse(await readFile(new URL('../assets/novel/world-4-potion-events.json',import.meta.url),'utf8'));
  if(JSON.stringify(Object.keys(potionEvents))!==JSON.stringify(['4','8','12','16']))throw new Error('World 4 potion milestones must be exactly 4, 8, 12, 16');
  for(const milestone of [4,8,12,16]){
    const lines=potionEvents[milestone];
    if(!Array.isArray(lines)||lines.length<2||lines.some(line=>!line.text||!line.speaker||!line.location))throw new Error('World 4 potion event is incomplete');
    novels[`world4Potion${milestone}`]=lines.map(line=>({...line,scene:'illusion',sceneNumber:milestone>=12?3:1,backgroundPath:`assets/novel/bgi/world4-prologue-scene-${milestone>=12?'03':'01'}.webp`}));
  }
  await writeFile(new URL('../story-novel.js',import.meta.url),`// Generated from assets/novel/ by scripts/generate-story-novel.mjs.\nwindow.WORDORIA_NOVELS = ${JSON.stringify(novels,null,2)};\n`);
  console.log(`Prepared visual novels: ${Object.entries(novels).map(([key,lines])=>`${key}: ${lines.length}`).join(' / ')} beats.`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await generateStoryNovel();
