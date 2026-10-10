import {readFile, writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const classes={'아서':'warrior','소서러스':'mage','파이터':'fighter','바이올렛':'ranger','아서 & 소서러스':'duo','크리스탈 정령':'spirit','크리스탈 골렘':'golem'};
const artRoot='assets/story/chapter-2-prologue/';
const midbossArt='assets/monsters/crystal-golem/crystal-golem-midboss.png';
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
export async function generateStoryNovel(){
  const source=await readFile(new URL('../assets/novel/word-2-prologue.md',import.meta.url),'utf8');
  const lines=parseWorldTwoPrologue(source);
  await writeFile(new URL('../story-novel.js',import.meta.url),`// Generated from assets/novel/word-2-prologue.md by scripts/generate-story-novel.mjs.\nwindow.WORDORIA_NOVELS = {world2Prologue: ${JSON.stringify(lines,null,2)}};\n`);
  console.log(`Prepared World 2 visual novel: ${lines.length} scenes.`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await generateStoryNovel();
