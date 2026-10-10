"""Pack reviewed guardian poses into transparent, anchored battle strips."""
from pathlib import Path
import json
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[1]/'assets/monsters/crystal-guardian-golem'
CELL=320
GROUND=312

def subject(image):
    image=image.convert('RGBA')
    # Alpha-only cleanup: keep costume/crystal colors, remove near-zero background noise.
    image.putalpha(image.getchannel('A').point(lambda value:0 if value<16 else value))
    box=image.getchannel('A').point(lambda value:255 if value>100 else 0).getbbox()
    if not box:raise ValueError('empty frame')
    x0,y0,x1,y1=box
    return image.crop((max(0,x0-3),max(0,y0-3),min(image.width,x1+3),min(image.height,y1+3)))

def extract(file,ranges):
    image=Image.open(ROOT/'source'/file)
    return [subject(image.crop((start,0,end,image.height))) for start,end in ranges]

idle=extract('idle-generated.png',[(0,926),(926,1792)])
attack=extract('attack-generated.png',[(0,602),(602,1241),(1241,1855)])
identity=subject(Image.open(ROOT/'source/sd-identity-left.png'))
hit=[identity,subject(Image.open(ROOT/'source/impact-isolated.png')),subject(Image.open(ROOT/'source/knockdown-isolated.png'))]
contract=json.loads((ROOT/'animation-contract.json').read_text())
all_preview=[]
for action,frames in [('idle',idle),('attack',attack),('hit',hit)]:
    # One scale per source family; isolated hit frames share the identity's source scale.
    scale=283/frames[0].height
    if max(frame.width*scale for frame in frames)>304:
        scale=304/max(frame.width for frame in frames)
    strip=Image.new('RGBA',(len(frames)*CELL,CELL))
    gapped=Image.new('RGBA',(len(frames)*CELL+(len(frames)-1)*50,CELL))
    destination=ROOT/action;destination.mkdir(exist_ok=True)
    extracted=ROOT/'source-frames'/action;extracted.mkdir(parents=True,exist_ok=True)
    runtime_frames=[]
    for index,frame in enumerate(frames):
        frame.save(extracted/f'{index+1:02}.png')
        resized=frame.resize((round(frame.width*scale),round(frame.height*scale)),Image.Resampling.LANCZOS)
        canvas=Image.new('RGBA',(CELL,CELL))
        canvas.alpha_composite(resized,((CELL-resized.width)//2,GROUND-resized.height))
        box=canvas.getchannel('A').getbbox()
        assert box[0]>=6 and box[2]<=CELL-6 and box[1]>=6 and box[3]<=GROUND
        canvas.save(destination/f'{index+1:02}.png');runtime_frames.append(canvas)
        strip.alpha_composite(canvas,(index*CELL,0));gapped.alpha_composite(canvas,(index*(CELL+50),0))
    filename=f'crystal-guardian-sd-{action}-strip.png'
    strip.save(ROOT/filename);gapped.save(ROOT/'review'/f'{action}-source-50px.png')
    metadata={**contract['actions'][action],'image':filename,'frameWidth':CELL,'frameHeight':CELL,'layout':'horizontal','facing':'left','anchor':contract['anchor'],'sourceFrameGapPx':50,'scale':scale,'groundLinePx':GROUND,'frames':[{'name':name,'durationMs':duration,**({'hit':True} if action=='attack' and index==2 else {})} for index,(name,duration) in enumerate(zip(contract['actions'][action]['names'],contract['actions'][action]['durationsMs']))],'reviewStatus':'alpha, frame bounds, ground line and offline sequence reviewed; browser review pending user request'}
    (ROOT/filename.replace('.png','.json')).write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
    # Light and violet backgrounds at runtime/mobile display sizes, with frame boundaries.
    composite=Image.new('RGB',(len(frames)*176,2*180+24),'#F7F7FF')
    draw=ImageDraw.Draw(composite);draw.rectangle((0,204,composite.width,composite.height),fill='#5751D8')
    for row in range(2):
        for index,frame in enumerate(runtime_frames):
            small=frame.resize((160,160),Image.Resampling.LANCZOS)
            composite.paste(small,(index*176+8,row*204+18),small)
            draw.line((index*176+8,row*204+174,index*176+168,row*204+174),fill='#60D9CF')
            draw.rectangle((index*176,row*204,index*176+175,row*204+179),outline='#B3AECF')
    composite.save(ROOT/'review'/f'{action}-mobile-light-violet.png')
    previews=[frame.resize((160,160),Image.Resampling.LANCZOS) for frame in runtime_frames]
    previews[0].save(ROOT/'review'/f'{action}-preview.webp',save_all=True,append_images=previews[1:],duration=contract['actions'][action]['durationsMs'],loop=0,lossless=True)
    print(action,strip.size,'alpha verified, safe bounds, ground line',GROUND)
# Single SD preview for asset review.
Image.open(ROOT/'idle/01.png').save(ROOT/'crystal-guardian-sd-left.png')
