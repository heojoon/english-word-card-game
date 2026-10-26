from pathlib import Path
import json, shutil
import numpy as np
from PIL import Image, ImageDraw

root=Path('assets/story'); source=root/'source/world7a'
runtime=root/'chapter-7a-burning-ancient-tower-map.webp'
manifest=root/'chapter-7a-burning-ancient-tower-map.generation.json'
layout=json.loads((root/'chapter-7a-map-layout.json').read_text(encoding='utf-8'))
generated=Path('C:/Users/Administrator/.codex/generated_images/01a15d62-f4e1-7451-a5ac-9891e1a75dd6/exec-57f3e6ca-7309-45b0-a2f8-22b4a9303063.png')
night=Image.open(generated).convert('RGB'); day=Image.open(runtime).convert('RGB')
assert abs(night.width/night.height-day.width/day.height)<.001
a=np.array(night).astype(float);r,g,b=a[:,:,0],a[:,:,1],a[:,:,2]
mask=(b>150)&(b>r*1.15)&(b>g*1.25)&(r>g*.8)
measured=[]; overlay=night.copy();draw=ImageDraw.Draw(overlay)
for n,p in enumerate(layout['positions'],1):
    x,y=map(lambda s:float(s.rstrip('%')),p)
    x0,x1=int((x-1.4)*night.width/100),int((x+1.4)*night.width/100)
    y0,y1=int((y-.65)*night.height/100),int((y+.65)*night.height/100)
    ys,xs=np.where(mask[y0:y1,x0:x1]);assert len(xs)>20,(n,len(xs))
    cx,cy=xs.mean()+x0,ys.mean()+y0
    measured.append([f'{cx/night.width*100:.3f}%',f'{cy/night.height*100:.3f}%'])
    assert abs(cx/night.width*100-x)<.8 and abs(cy/night.height*100-y)<.5,n
    px,py=x*night.width/100,y*night.height/100
    draw.ellipse((px-16,py-16,px+16,py+16),outline='white',width=2)
    draw.text((px+18,py),str(n),fill='white')
overlay.save('output/story-map/world7a-night-coordinate-review.jpg')
old=np.array(day.resize(night.size)).astype(float)
luma=lambda a:np.median(a[:,:,0]*.2126+a[:,:,1]*.7152+a[:,:,2]*.0722)
ratio=float(luma(a)/luma(old));assert ratio<.7,ratio

day_backup=source/'04-day-runtime.webp'
history=source/'04-day-generation.json'
assert not day_backup.exists() and not history.exists(),'Do not overwrite preserved day version'
shutil.copyfile(runtime,day_backup);shutil.copyfile(manifest,history)
final=source/'05-late-night-generated.png';shutil.copyfile(generated,final)
night.save(runtime,quality=93,method=6)
m=dict(date='2026-10-21',tool='image_gen.imagegen (built-in)',model='미공개',editType='lighting-weather',timeOfDay='late night / midnight',styleReference='assets/story/chapter-1-library-map.webp',layoutReference=str(day_backup).replace('\\','/'),previousGenerationRecord=str(history).replace('\\','/'),storyReference='assets/novel/world-7a-scenario.md',requestedDimensions=list(day.size),actualDimensions=list(night.size),runtime=str(runtime).replace('\\','/'),original=str(final).replace('\\','/'),layout='assets/story/chapter-7a-map-layout.json',prompt=(source/'05-late-night-prompt.txt').read_text(encoding='utf-8'),references=['assets/story/chapter-1-library-map.webp',str(day_backup).replace('\\','/')],runtimeStagePositions=layout['positions'],actualMeasuredStagePositions=measured,review=dict(technical='Image review passed; browser review and build pending',userApproval='not requested / not granted',waypointCount=30,waypointMeasurement='All 30 previously recorded centers have a visible violet crystal within the local inspection window; measured highlight centroids remain within 0.8% x / 0.5% y of runtime coordinates. Original geometry and runtime coordinates preserved.',medianLuminanceRatio=ratio,lighting='Deep indigo night, cool blue shadows, dark clouds, local amber flames and violet crystal/portal lighting. Existing paths and all 30 pedestals visually inspected.',browserEvidence='output/story-map/world7a-night-browser-review.json'))
manifest.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(dict(dimensions=night.size,waypoints=len(measured),medianLuminanceRatio=ratio)))
