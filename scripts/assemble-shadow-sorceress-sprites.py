"""Normalize reviewed generated poses to stable 512px masters and 320px runtime cells."""
from pathlib import Path
from PIL import Image, ImageDraw
import json, shutil
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/monsters/shadow-sorceress'
GEN=Path('/Users/hjoon/.codex/generated_images/01a130e8-a3e9-7f20-92d1-a8ddce688c82')
# Generation originals are preserved; frame crops are extraction, never color-key edits.
files={'idle':'exec-33074a85-447d-40be-b3ca-82a480216d12.png','hit':'exec-f6d72746-7dd3-41a8-98a9-0b539e51590a.png','anticipation':'exec-7dd6bbf7-0a9c-4d06-8f43-99bc601d21bf.png','cast':'exec-cf53f2bc-3dca-4075-b65f-bb4d47554ca5.png'}
for action,name in files.items():
    target=OUT/'source'/f'{action}-generated.png'
    if not target.exists():shutil.copy2(GEN/name,target)
# source name, crop rectangle, scale to common body height, ground line in original coordinates
frames={
'idle':[('idle',(0,0,918,856),390/692,821),('idle',(918,0,1837,856),390/692,821)],
'attack':[('anticipation',(0,0,1254,1254),390/908,1148),('cast',(0,0,1254,1254),390/960,1155),('cast',(0,0,1254,1254),390/960,1155)],
'hit':[('hit',(0,0,720,759),390/470,655),('hit',(720,0,1335,759),390/470,655),('hit',(1335,0,2072,759),390/470,665)]}
names={'idle':['ready','breath'],'attack':['anticipation','cast','hold'],'hit':['notice','impact','knockdown']}
durations={'idle':[600,600],'attack':[200,200,300],'hit':[140,160,700]}
review=OUT/'review';review.mkdir(exist_ok=True)
for action,poses in frames.items():
    master_dir=OUT/'source-frames'/action;master_dir.mkdir(parents=True,exist_ok=True)
    runtime_dir=OUT/action;runtime_dir.mkdir(exist_ok=True)
    frame_width=448 if action=='hit' else 384
    master_width=round(frame_width*512/320)
    masters=[];cells=[];records=[]
    for index,(src,box,scale,ground) in enumerate(poses):
        image=Image.open(OUT/'source'/f'{src}-generated.png').convert('RGBA').crop(box)
        # Locate visible alpha for framing only, preserving original alpha values inside the crop.
        bbox=image.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox()
        crop=image.crop(bbox)
        scaled=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS)
        x=(master_width-scaled.width)//2;y=round(499-(ground-box[1]-bbox[1])*scale)
        if x<0 or y<0 or x+scaled.width>master_width or y+scaled.height>512:raise ValueError((action,index,'outside master',x,y,scaled.size))
        master=Image.new('RGBA',(master_width,512));master.alpha_composite(scaled,(x,y))
        master.save(master_dir/f'{index+1:02}.png');masters.append(master)
        cell=master.resize((frame_width,320),Image.Resampling.LANCZOS)
        cell.save(runtime_dir/f'{index+1:02}.png');cells.append(cell)
        records.append({'source':f'source/{src}-generated.png','crop':box,'bodyScale':scale,'groundLine':ground})
    strip=Image.new('RGBA',(frame_width*len(cells),320))
    spaced=Image.new('RGBA',(master_width*len(masters)+50*(len(masters)-1),512))
    for i,(cell,master) in enumerate(zip(cells,masters)):
        strip.alpha_composite(cell,(i*frame_width,0));spaced.alpha_composite(master,(i*(master_width+50),0))
    filename=f'shadow-sorceress-sd-{action}-strip.png'
    strip.save(OUT/filename);spaced.save(review/f'{action}-spaced-master.png')
    manifest={'image':filename,'frameWidth':frame_width,'frameHeight':320,'frameCount':len(cells),'layout':'horizontal','anchor':{'x':.5,'y':.975},'facing':'left','sourceFrameGapPx':50,'frameNames':names[action],'frames':[{'name':name,'duration':duration,**({'hit':True} if action=='attack' and i==1 else {})} for i,(name,duration) in enumerate(zip(names[action],durations[action]))],'extraction':records,'review':{'technical':'pending','browser':'not requested','userApproval':'concept 01 only'}}
    if action=='hit':manifest['finalFrameHold']=True
    (OUT/filename.replace('.png','.json')).write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    for label,color in [('light','#F7F7FF'),('violet','#5751D8')]:
        bg=Image.new('RGBA',spaced.size,color);bg.alpha_composite(spaced);bg.convert('RGB').save(review/f'{action}-{label}.jpg')
    previews=[Image.new('RGBA',(180,180),'#5751D8') for cell in cells]
    for bg,cell in zip(previews,cells):bg.alpha_composite(cell.resize((180,round(180*320/frame_width)),Image.Resampling.LANCZOS),(0,180-round(180*320/frame_width)))
    previews[0].convert('RGB').save(review/f'{action}-mobile.gif',save_all=True,append_images=[p.convert('RGB') for p in previews[1:]],duration=durations[action],loop=0)
print('Prepared shadow boss masters, frames, strips, manifests and light/violet/mobile reviews.')
