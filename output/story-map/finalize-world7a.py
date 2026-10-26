from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np
import json, shutil
root=Path('assets/story')
source=root/'source/world7a'; source.mkdir(parents=True,exist_ok=True)
generated=Path('C:/Users/Administrator/.codex/generated_images/01a15d62-f4e1-7451-a5ac-9891e1a75dd6')
for filename,target in [('exec-14dd4997-2f87-4b65-a8be-3b91470309a3.png','01-initial-29-waypoints.png'),('exec-a5e0ed36-2c0b-4f6a-8614-47afb6f7dcc8.png','02-incomplete-correction.png'),('exec-ae356b84-7ff2-4290-b700-095e11acda73.png','03-final-30-waypoints.png')]:
    shutil.copyfile(generated/filename,source/target)
im=Image.open(source/'03-final-30-waypoints.png').convert('RGB')
im.save(root/'chapter-7a-burning-ancient-tower-map.webp',quality=93,method=6)
approx=[(18.85,3.68),(42.27,5.52),(65.81,8.08),(79.77,10.11),(61.4,12.36),(39.99,14.55),(19.27,16.37),(40.12,18.92),(63.54,21.11),(77.14,23.55),(22.51,26.8),(43.3,29.74),(65.95,31.88),(79.42,34.02),(63.81,36.53),(56.63,40.84),(39.5,43.51),(19.27,46.64),(38.6,50.48),(48.07,54.37),(65.75,55.96),(80.04,58.82),(65.26,62.57),(40.33,65.06),(19.27,69.2),(40.81,72.61),(65.4,76.08),(74.79,78.48),(51.3,81.6),(69.96,92.13)]
a=np.array(im).astype(float); r,g,b=a[:,:,0],a[:,:,1],a[:,:,2]
mask=(b>150)&(b>r*1.15)&(b>g*1.25)&(r>g*.8)
positions=[]; overlay=im.copy();d=ImageDraw.Draw(overlay)
for n,(x,y) in enumerate(approx,1):
    x0,x1=int((x-1.2)*im.width/100),int((x+1.2)*im.width/100)
    y0,y1=int((y-.55)*im.height/100),int((y+.55)*im.height/100)
    ys,xs=np.where(mask[y0:y1,x0:x1]); assert len(xs)>10,(n,len(xs))
    cx,cy=xs.mean()+x0,ys.mean()+y0
    positions.append([f'{cx/im.width*100:.3f}%',f'{cy/im.height*100:.3f}%'])
    d.ellipse((cx-17,cy-17,cx+17,cy+17),outline='#ff3264',width=2)
    d.text((cx+17,cy-12),str(n),fill='#ff3264',stroke_width=1,stroke_fill='white')
assert all(float(positions[i][1][:-1])>float(positions[i-1][1][:-1]) for i in range(1,30))
overlay.save('output/story-map/world7a-coordinate-review.jpg')
p=Path('crystal-game.js');s=p.read_text(encoding='utf-8'); lines=s.splitlines()
for i,line in enumerate(lines):
    if 'storyWorlds.push({' in line and '"displayNumber":"7A"' in line:
        world=json.loads(line[line.index('{'):line.rindex('}')+1]);world['positions']=positions
        lines[i]='  storyWorlds.push('+json.dumps(world,ensure_ascii=False,separators=(',',':'))+');'
p.write_text('\n'.join(lines)+'\n',encoding='utf-8')
layout=json.loads((root/'chapter-7a-map-layout.json').read_text(encoding='utf-8'))
layout.update(positions=positions,middleVocabularyDays=list(range(1,31)),middleVocabulary='WordMax Level 3',actualDimensions=list(im.size))
(root/'chapter-7a-map-layout.json').write_text(json.dumps(layout,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'dimensions':im.size,'waypoints':len(positions),'positions':positions}))
