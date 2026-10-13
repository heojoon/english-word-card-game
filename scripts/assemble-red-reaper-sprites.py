"""Pack reviewed real-alpha Red Reaper poses; no color-key or background editing."""
from pathlib import Path
from PIL import Image, ImageDraw
import json
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/monsters/red-reaper'
# Source body-top/ground coordinates and ground pivot keep body size stable,
# independent of the long scythe and cast glow. Recoil deliberately tilts the body.
poses={
 'idle':[(190,1147,780),(255,1180,690)],
 'attack':[(225,1195,700),(241,1169,740),(195,1170,735)],
 'hit':[(288,1150,720),(264,1192,735),(None,None,None)]}
names={'idle':['ready','breath'],'attack':['anticipation','illusion-cast','hold'],'hit':['notice','impact','knockdown']}
durations={'idle':[600,600],'attack':[200,200,300],'hit':[140,160,700]}
review=OUT/'review';review.mkdir(exist_ok=True)
for action,contracts in poses.items():
 frames=[];records=[]
 for index,(top,ground,pivot) in enumerate(contracts,1):
  path=OUT/'source'/f'{action}-{index:02}.png'
  im=Image.open(path).convert('RGBA')
  if im.getchannel('A').getextrema()[0]!=0:raise ValueError(f'Opaque source: {path}')
  bounds=im.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox()
  if action=='hit' and index==3:
   # Same head scale as upright poses; complete knockdown stays on ground.
   scale=.26;ground=bounds[3];pivot=(bounds[0]+bounds[2])/2
  else:scale=235/(ground-top)
  cropped=im.crop(bounds);scaled=cropped.resize((round(cropped.width*scale),round(cropped.height*scale)),Image.Resampling.LANCZOS)
  x=round(224-(pivot-bounds[0])*scale);y=round(312-(ground-bounds[1])*scale)
  if x<2 or y<2 or x+scaled.width>446 or y+scaled.height>318:raise ValueError((path,'overflow',x,y,scaled.size))
  cell=Image.new('RGBA',(448,320));cell.alpha_composite(scaled,(x,y))
  folder=OUT/action;folder.mkdir(exist_ok=True);cell.save(folder/f'{index:02}.png');frames.append(cell)
  sourceframes=OUT/'source-frames'/action;sourceframes.mkdir(parents=True,exist_ok=True);im.save(sourceframes/f'{index:02}.png')
  records.append({'source':str(path.relative_to(OUT)),'framingAlphaThreshold':16,'scale':scale,'groundLine':ground,'pivotX':pivot,'bodyTop':top,'normalizedGroundY':312})
 strip=Image.new('RGBA',(448*len(frames),320));spaced=Image.new('RGBA',(448*len(frames)+50*(len(frames)-1),320))
 for index,frame in enumerate(frames):strip.alpha_composite(frame,(index*448,0));spaced.alpha_composite(frame,(index*498,0))
 filename=f'red-reaper-sd-{action}-strip.png';strip.save(OUT/filename);spaced.save(review/f'{action}-spaced-master.png')
 manifest={'image':filename,'frameWidth':448,'frameHeight':320,'frameCount':len(frames),'layout':'horizontal','facing':'left','anchor':{'x':.5,'y':.975},'sourceFrameGapPx':50,'frameNames':names[action],'frames':[{'name':name,'duration':ms,**({'skillContact':True} if action=='attack' and i==1 else {})} for i,(name,ms) in enumerate(zip(names[action],durations[action]))],'normalization':records,'review':{'technical':'pending','browser':'not requested','userApproval':'standing concept 03; SD poses not separately user-approved'}}
 if action=='hit':manifest['finalFrameHold']=True
 (OUT/filename.replace('.png','.json')).write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 for label,color in [('light','#F7F7FF'),('violet','#5751D8')]:
  canvas=Image.new('RGBA',spaced.size,color);canvas.alpha_composite(spaced)
  ImageDraw.Draw(canvas).line((0,312,canvas.width,312),fill='#60D9CF',width=1)
  canvas.convert('RGB').save(review/f'{action}-{label}.jpg')
 mobile=[]
 for frame in frames:
  canvas=Image.new('RGBA',(180,150),'#5751D8');canvas.alpha_composite(frame.resize((180,129),Image.Resampling.LANCZOS),(0,21));mobile.append(canvas.convert('RGB'))
 mobile[0].save(review/f'{action}-mobile.gif',save_all=True,append_images=mobile[1:],duration=durations[action],loop=0)
print('Assembled RGBA strips, manifests, 50px-gapped masters and mobile previews.')
