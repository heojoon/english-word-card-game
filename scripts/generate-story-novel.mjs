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
export async function generateStoryNovel(){
  const novels={};
  for(const [key,filename,parse] of [
    ['world2Prologue','world-2-1-prologue.md',parseWorldTwoPrologue],
    ['world2BossStart','world-2-7-boss-start.md',parseWorldTwoBoss],
    ['world2BossEnd','world-2-7-boss-end.md',parseWorldTwoBoss],
    ['world3Prologue','world-3-1-prologue.md',parseWorldThreePrologue],
    ['world3BossStart','world-3-8-boss-start.md',parseWorldThreeBoss],
    ['world3BossEnd','world-3-8-boss-end.md',parseWorldThreeBoss]
  ])novels[key]=parse(await readFile(new URL('../assets/novel/'+filename,import.meta.url),'utf8'));
  await writeFile(new URL('../story-novel.js',import.meta.url),`// Generated from assets/novel/*.md by scripts/generate-story-novel.mjs.\nwindow.WORDORIA_NOVELS = ${JSON.stringify(novels,null,2)};\n`);
  console.log(`Prepared visual novels: ${Object.entries(novels).map(([key,lines])=>`${key}: ${lines.length}`).join(' / ')} beats.`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await generateStoryNovel();
