import json, shutil
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[2]
dest = root / 'assets/story/source/world7c'
dest.mkdir(parents=True, exist_ok=True)
generated = Path('C:/Users/Administrator/.codex/generated_images/01a17087-d665-7ef0-aa8c-3c2189318bd6')
for name, out in [('exec-8688d231-6336-44a5-bfe9-b47cc554901b.png', '01-initial-29-waypoints.png'), ('exec-4b54bd86-4370-4f93-9af5-e343ffd363e4.png', '02-final-30-waypoints.png')]:
    shutil.copy2(generated / name, dest / out)
im = Image.open(dest / '02-final-30-waypoints.png').convert('RGB')
im.save(root / 'assets/story/chapter-7c-royal-dungeon-map.webp', quality=92, method=6)
print('Dimensions:', im.size)
# Detect violet crystal bodies, excluding pale stone and blue water.
pixels = im.load()
seen = set()
components = []
width, height = im.size
def match(x, y):
    r, g, b = pixels[x, y]
    return b > 140 and b > r * 1.08 and r > g * 1.25 and b > g * 1.45
for y in range(height):
    for x in range(width):
        if (x, y) in seen or not match(x, y):
            continue
        stack = [(x, y)]
        seen.add((x, y))
        points = []
        while stack:
            px, py = stack.pop()
            points.append((px, py))
            for nx, ny in [(px-1,py),(px+1,py),(px,py-1),(px,py+1)]:
                if 0 <= nx < width and 0 <= ny < height and (nx,ny) not in seen and match(nx,ny):
                    seen.add((nx,ny))
                    stack.append((nx,ny))
        if len(points) > 70:
            components.append({'area':len(points),'x':round(sum(p[0] for p in points)/len(points),1),'y':round(sum(p[1] for p in points)/len(points),1)})
print(json.dumps(components))

# Manually reviewed pedestal centers in the final 724 x 2172 image.
centers = [(169,121),(293,173),(435,217),(562,236),(458,277),(301,315),(169,369),(299,425),(434,477),(573,514),(450,592),(300,645),(169,691),(300,759),(434,831),(572,862),(447,954),(300,1002),(171,1049),(302,1120),(436,1196),(572,1248),(445,1325),(297,1390),(165,1462),(297,1545),(453,1651),(394,1724),(358,1867),(427,1997)]
positions = [[f'{x/width*100:.3f}%', f'{y/height*100:.3f}%'] for x,y in centers]
layout = {'world':'7C','chapter':10,'stageCount':30,'width':width,'height':height,'progression':'top-to-bottom','midbossStage':10,'finalBossStage':30,'positions':positions,'pixelCenters':centers,'status':'map preview; combat not implemented'}
(root/'assets/story/chapter-7c-map-layout.json').write_text(json.dumps(layout,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
from PIL import ImageDraw
review = im.copy()
draw = ImageDraw.Draw(review)
for i,(x,y) in enumerate(centers,1):
    draw.ellipse((x-17,y-17,x+17,y+17),outline='#FF455B',width=3)
    draw.text((x+18,y-10),str(i),fill='#FF455B',stroke_width=1,stroke_fill='white')
review.save(root/'output/story-map/world7c-coordinate-review.jpg')

source = root/'crystal-game.js'
runtime = source.read_text(encoding='utf-8')
marker = '  function configureStoryContent(world=null){'
assert marker in runtime and 'renderWorldSevenCMap' not in runtime
world = {'number':10,'displayNumber':'7C','unlockAfter':6,'name':'왕국 지하 던전','region':'ROYAL UNDERGROUND DUNGEON','art':'assets/story/chapter-7c-royal-dungeon-map.webp','preview':True,'positions':positions}
runtime = runtime.replace(marker,'  storyWorlds.push('+json.dumps(world,ensure_ascii=False,separators=(',',':'))+');\n'+marker,1)
marker = '  function renderStory(){'
renderer = '''  function renderWorldSevenCMap(){
    const world=storyWorlds.find(world=>world.number===10);
    const navigation='<div class="story-map-navigation" role="navigation" aria-label="스토리 월드 이동"><button type="button" class="story-map-region" data-action="story-world-select" data-world="6">이전 월드</button><button type="button" class="story-map-region" data-action="story-world-select" data-world="9">다음 월드</button></div>';
    const nodes=world.positions.map((position,index)=>{
      const number=index+1,boss=number===10?'인공 심연의 골렘':number===30?'봉인의 수호기사':null;
      return `<button type="button" class="story-map-node story-map-node-${number} locked" style="--story-x:${position[0]};--story-y:${position[1]}" disabled aria-label="스테이지 ${number}${boss?' '+boss:''}, 전투 준비 중"><span class="story-map-node-number">${number}${boss?' ⚔':''}</span></button>`;
    }).join('');
    return `<div class="story-mode-toolbar"><button class="text-btn" data-action="nav" data-page="dungeon">← 모드 선택</button></div><div class="page-title story-map-heading"><div class="eyebrow">STORY MODE · WORLD 7C</div><h1>${esc(world.name)}</h1></div><div class="notice">30개 크리스탈을 따라 지하 던전을 둘러보세요. 전투는 준비 중이에요.<br>10단계 · 인공 심연의 골렘 / 30단계 · 봉인의 수호기사</div><section class="story-world-map story-world-map-10" aria-label="왕국 지하 던전 30단계 지도"><img class="story-world-map-art" src="${esc(deployedAssetUrl(world.art))}" alt="대성당 입구에서 성흔 보관실로 내려가는 왕국 지하 던전의 30개 크리스탈 지도">${navigation}${nodes}</section>`;
  }
'''
runtime = runtime.replace(marker,renderer+marker,1)
marker = "    const world=storyWorlds[selectedStoryWorld-1]||storyWorlds[0],chapterStages="
assert marker in runtime
runtime = runtime.replace(marker,"    if(selectedStoryWorld===10)return renderWorldSevenCMap();\n"+marker,1)
marker = "world.number===6?isAdministrator()?7:9:"
assert marker in runtime
runtime = runtime.replace(marker,"world.number===6?10:",1)
source.write_text(runtime,encoding='utf-8',newline='')
css = root/'crystal-game.css'
with css.open('a',encoding='utf-8',newline='') as out:
    out.write('\n/* World 7C map preview: thirty measured waypoints; combat comes later. */\n.story-world-map-10{aspect-ratio:1/3}\n.story-world-map-10 .story-map-node{height:2.025%}\n.story-world-map-10 .story-map-node:disabled{opacity:1;cursor:default}\n')
