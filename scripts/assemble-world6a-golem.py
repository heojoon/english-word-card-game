"""Normalize reviewed isolated golem poses; run with `uv run --with pillow python ...`."""
import json
from pathlib import Path
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[1]/'assets/monsters/world-6a'
W,H,GAP=384,320,50
# Match source head/stone-block scale to the identity. The wide punch was generated
# with additional canvas and needs calibration, rather than a per-pose fit-to-cell.
SCALE={'ready':.24,'anticipation':.24,'contact':.30,'notice':.24,'impact':.24,'knockdown':.24}
SOURCES={'ready':'source/half-broken-golem-generated.png','anticipation':'source-frames/attack/02-anticipation.png','contact':'source-frames/attack/03-contact.png','notice':'source/half-broken-golem-generated.png','impact':'source-frames/hit/02-impact.png','knockdown':'source-frames/hit/03-knockdown.png'}
def frame(name):
    im=Image.open(ROOT/SOURCES[name]).convert('RGBA')
    # Remove only near-transparent generation noise; do not color-key stone/glow.
    a=im.getchannel('A').point(lambda v:0 if v<=8 else v);im.putalpha(a)
    box=im.getbbox();crop=im.crop(box);scale=SCALE[name]
    crop=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS)
    assert crop.width<=W-16 and crop.height<=H-16,(name,crop.size)
    cell=Image.new('RGBA',(W,H));cell.alpha_composite(crop,((W-crop.width)//2,312-crop.height))
    return cell,{'source':SOURCES[name],'sourceBounds':list(box),'scale':scale,'runtimeBounds':list(cell.getbbox())}
for action,names in [('attack',['ready','anticipation','contact']),('hit',['notice','impact','knockdown'])]:
    folder=ROOT/action;folder.mkdir(exist_ok=True)
    strip=Image.new('RGBA',(W*3,H));review=Image.new('RGBA',(W*3+GAP*2,H));transforms=[];frames=[]
    for i,name in enumerate(names):
        cell,transform=frame(name);transforms.append(transform)
        cell.save(folder/f'{i+1:02}.png');strip.alpha_composite(cell,(i*W,0));review.alpha_composite(cell,(i*(W+GAP),0))
        frames.append(cell)
    filename=f'golem-sd-{action}-strip.png';strip.save(ROOT/filename);review.save(ROOT/f'review/{action}-source-50px.png')
    durations=[120,120,260] if action=='attack' else [100,100,160]
    meta={'image':filename,'frameWidth':W,'frameHeight':H,'frameCount':3,'layout':'horizontal','anchor':{'x':.5,'y':.975},'facing':'left','sourceFrameGapPx':50,'loop':False,'frames':[{'name':name,'durationMs':durations[i],**({'hit':True} if i==(2 if action=='attack' else 1) else {}),**({'hold':True} if action=='hit' and i==2 else {})} for i,name in enumerate(names)],'normalization':transforms,'reviewStatus':'Frame-by-frame/alpha reviewed; browser validation pending'}
    (ROOT/filename.replace('.png','.json')).write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
    composite=Image.new('RGB',(W*3,H*2))
    for row,color in enumerate(['#F7F7FF','#5751D8']):
        bg=Image.new('RGBA',strip.size,color);bg.alpha_composite(strip);composite.paste(bg.convert('RGB'),(0,row*H))
    composite.save(ROOT/f'review/{action}-alpha-review.png')
    preview=[Image.new('RGBA',(W,H),'#5751D8') for _ in names]
    for bg,cell in zip(preview,frames):bg.alpha_composite(cell)
    preview[0].save(ROOT/f'review/{action}-preview.webp',save_all=True,append_images=preview[1:],duration=durations,loop=0,lossless=True)
    print(action,[t['runtimeBounds'] for t in transforms])
idle,_=frame('ready');idle.save(ROOT/'monster_half_broken_golem_sd_idle_wide.png')
# Mobile-scale sheet with slot/grid and fixed ground line.
mobile=Image.new('RGB',(384,204),'#F7F7FF');draw=ImageDraw.Draw(mobile)
for row,action in enumerate(['attack','hit']):
    for i in range(3):
        im=Image.open(ROOT/action/f'{i+1:02}.png').resize((122,102),Image.Resampling.LANCZOS)
        mobile.paste(im,(i*128,row*102),im)
        draw.rectangle((i*128,row*102,i*128+122,row*102+101),outline='#c9c4ff')
        draw.line((i*128,row*102+99,i*128+122,row*102+99),fill='#60D9CF')
mobile.save(ROOT/'review/mobile-frame-grid.png')
