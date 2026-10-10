"""Pack generated Black Dragon poses; alpha-only cleanup, no color removal."""
from pathlib import Path
import json
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[1]/'assets/monsters/black-dragon'
# Wide wings require 384px cells; do not shrink the body to fit default cells.
CELL=384
GROUND=round(CELL*.975)
CONTRACT={
 'idle':{'ranges':[(0,900),(900,1983)],'scale':.375,'names':['ready','breathe'],'durations':[600,600]},
 'attack':{'ranges':[(0,630),(630,1425),(1425,2172)],'scale':.47,'names':['ready','anticipation','absorb-contact'],'durations':[300,300,700]},
 'hit':{'ranges':[(0,698),(698,1350),(1350,2043)],'scale':.50,'names':['guard','impact','knockdown'],'durations':[150,150,700]}}
for action,contract in CONTRACT.items():
 im=Image.open(ROOT/'source'/f'{action}.png').convert('RGBA')
 im.putalpha(im.getchannel('A').point(lambda x:0 if x<16 else x))
 frames=[]
 for index,(left,right) in enumerate(contract['ranges']):
  part=im.crop((left,0,right,im.height))
  box=part.getchannel('A').point(lambda x:255 if x>100 else 0).getbbox()
  part=part.crop(box)
  extracted=ROOT/'source-frames'/action;extracted.mkdir(parents=True,exist_ok=True)
  part.save(extracted/f'{index+1:02}.png')
  scaled=part.resize((round(part.width*contract['scale']),round(part.height*contract['scale'])),Image.Resampling.LANCZOS)
  canvas=Image.new('RGBA',(CELL,CELL));canvas.alpha_composite(scaled,((CELL-scaled.width)//2,GROUND-scaled.height))
  bounds=canvas.getchannel('A').getbbox();assert bounds[0]>=6 and bounds[2]<=CELL-6 and bounds[1]>=6 and bounds[3]<=GROUND,(action,index,bounds)
  dest=ROOT/action;dest.mkdir(exist_ok=True);canvas.save(dest/f'{index+1:02}.png');frames.append(canvas)
 strip=Image.new('RGBA',(CELL*len(frames),CELL));review=Image.new('RGBA',(CELL*len(frames)+50*(len(frames)-1),CELL))
 for i,frame in enumerate(frames):strip.alpha_composite(frame,(i*CELL,0));review.alpha_composite(frame,(i*(CELL+50),0))
 name=f'black-dragon-sd-{action}-strip.png';strip.save(ROOT/name);review.save(ROOT/'review'/f'{action}-source-50px.png')
 metadata={'image':name,'frameWidth':CELL,'frameHeight':CELL,'frameCount':len(frames),'layout':'horizontal','facing':'left','anchor':{'x':.5,'y':.975},'sourceFrameGapPx':50,'cellSizeReason':'Wide complete dragon wings; keep body scale and effects readable.','scale':contract['scale'],'groundLinePx':GROUND,'frames':[{'name':n,'durationMs':d,**({'hit':True} if action=='attack' and i==2 else {}),**({'hold':True} if action=='hit' and i==2 else {})} for i,(n,d) in enumerate(zip(contract['names'],contract['durations']))],'reviewStatus':'Offline alpha, bounds and frame review complete; browser unverified; user approval not inferred'}
 (ROOT/name.replace('.png','.json')).write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
 composite=Image.new('RGB',(len(frames)*176,360),'#F7F7FF');draw=ImageDraw.Draw(composite);draw.rectangle((0,180,composite.width,360),fill='#5751D8')
 for row in range(2):
  for i,frame in enumerate(frames):
   small=frame.resize((160,160),Image.Resampling.LANCZOS);composite.paste(small,(i*176+8,row*180+8),small)
   draw.rectangle((i*176,row*180,i*176+175,row*180+179),outline='#b3aecf');draw.line((i*176+8,row*180+164,i*176+168,row*180+164),fill='#60D9CF')
 composite.save(ROOT/'review'/f'{action}-mobile-light-violet.png')
 previews=[f.resize((160,160)) for f in frames];previews[0].save(ROOT/'review'/f'{action}-preview.webp',save_all=True,append_images=previews[1:],duration=contract['durations'],loop=0,lossless=True)
 print(action,strip.size,'bounds and alpha checked')
