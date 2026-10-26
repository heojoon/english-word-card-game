from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw

root=Path('assets/story')
im=Image.open(root/'source/world7b/01-generated.png').convert('RGB')
# Visually identified crystal centers in the 683 x 2048 inspection rendering.
seeds=[(120,93),(272,137),(427,164),(543,194),(425,224),(279,255),(141,283),(278,329),(434,360),(549,399),(435,440),(278,479),(142,522),(279,575),(445,634),(556,713),(434,765),(277,799),(138,853),(277,909),(429,957),(548,1035),(429,1079),(274,1134),(145,1210),(274,1264),(428,1318),(555,1380),(440,1438),(333,1918)]
a=np.array(im).astype(float);r,g,b=a[:,:,0],a[:,:,1],a[:,:,2]
mask=(b>150)&(b>r*1.15)&(b>g*1.25)&(r>g*.8)
positions=[]; overlay=im.copy();draw=ImageDraw.Draw(overlay)
for n,(sx,sy) in enumerate(seeds,1):
    px,py=sx*im.width/683,sy*im.height/2048
    x0,x1=int(px-12),int(px+12);y0,y1=int(py-14),int(py+14)
    ys,xs=np.where(mask[y0:y1,x0:x1]);assert len(xs)>10,(n,len(xs))
    x,y=float(xs.mean()+x0),float(ys.mean()+y0)
    positions.append([f'{x/im.width*100:.3f}%',f'{y/im.height*100:.3f}%'])
    draw.ellipse((x-17,y-17,x+17,y+17),outline='white',width=2)
    draw.text((x+18,y),str(n),fill='white')
assert all(float(positions[i][1][:-1])>float(positions[i-1][1][:-1]) for i in range(1,30))
overlay.save('output/story-map/world7b-coordinate-review.jpg')
art='assets/story/chapter-7b-black-lake-map.webp'
layout=dict(world='7B',stageCount=30,art=art,dimensions=list(im.size),positions=positions,bossStages={'15':'검은 세이렌 기사','30':'검은 세이렌의 대왕'})
(root/'chapter-7b-map-layout.json').write_text(json.dumps(layout,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
prompt=Path('output/story-map/world7b-prompt.txt').read_text(encoding='utf-8')
(root/'source/world7b/01-prompt.txt').write_text(prompt,encoding='utf-8')
manifest=dict(date='2026-10-22',tool='image_gen.imagegen (built-in)',model='미공개',prompt=prompt,styleReference='assets/story/chapter-1-library-map.webp',layoutReference=None,storyReference='assets/novel/world-7b-scenario.md',original='assets/story/source/world7b/01-generated.png',runtime=art,requestedDimensions=[1024,3072],actualDimensions=list(im.size),runtimeDimensions=list(im.size),actualMeasuredStagePositions=positions,layout='assets/story/chapter-7b-map-layout.json',review=dict(technical='30 crystals visually counted, centers measured; browser/build pending',userApproval='not requested / not granted',coordinateEvidence='output/story-map/world7b-coordinate-review.jpg'))
(root/'chapter-7b-black-lake-map.generation.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

p=Path('crystal-game.js');s=p.read_text(encoding='utf-8')
# Derive vocabulary sources directly from 7A to keep both learning levels identical.
needle='  ];\n  const storyWorlds=['
extra="    ,...Array.from({length:30},(_,index)=>{const base=storyStagesPlaceholder;})\n"
# The array cannot reference itself during initialization; append after its declaration.
s=s.replace('  const storyWorlds=[',"  storyStages.push(...storyStages.filter(stage=>stage.chapter===8).map(base=>({...base,chapter:9,key:`story-ch7b-${base.number}`,name:base.number===15?'검은 세이렌 기사':base.number===30?'검은 세이렌의 대왕':`심연의 검은 호수 · ${base.number}단계`})));\n  const storyWorlds=[",1)
w=dict(number=9,displayNumber='7B',unlockAfter=7,name='심연의 검은 호수',region='BLACK LAKE OF THE ABYSS',art=art,positions=positions)
s=s.replace('  function configureStoryContent(world=null){','  storyWorlds.push('+json.dumps(w,ensure_ascii=False,separators=(',',':'))+');\n  function configureStoryContent(world=null){',1)
s=s.replace("chapter===8?'7A':chapter===7?'6A':chapter","chapter===9?'7B':chapter===8?'7A':chapter===7?'6A':chapter")
s=s.replace('desc:chapter===8?','desc:[8,9].includes(chapter)?').replace('questionCount:chapter===8?30','questionCount:[8,9].includes(chapter)?30').replace('...(chapter===8?{questionTimeMs','...([8,9].includes(chapter)?{questionTimeMs')
s=s.replace('[7,8].includes(chapter)', '[7,8,9].includes(chapter)')
s=s.replace('if(stage.chapter===8&&stage.number===1)', 'if([8,9].includes(stage.chapter)&&stage.number===1)')
s=s.replace('world.number===8?7:world.number>=6', '[8,9].includes(world.number)?7:world.number>=6')
s=s.replace('world.number===8?storyWorlds.length+1:', 'world.number===8?9:world.number===9?storyWorlds.length+1:')
s=s.replace("stage.chapter===8&&[15,30].includes(stage.number)?' ⚔'", "[8,9].includes(stage.chapter)&&[15,30].includes(stage.number)?' ⚔'")
p.write_text(s,encoding='utf-8')
p=Path('crystal-game.css');s=p.read_text(encoding='utf-8');s+='\n.story-world-map-9{aspect-ratio:1/3}\n.story-world-map-9 .story-map-navigation{top:auto;bottom:8px}\n.story-world-map-9 .story-map-node{height:2.025%}\n.story-world-map-9 .story-map-hero{left:calc(var(--story-x) - 30px);top:calc(var(--story-y) - 14px)}\n';p.write_text(s,encoding='utf-8')
print(json.dumps(layout,ensure_ascii=False))
