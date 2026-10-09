"""Pack verified isolated art with a shared scale and exact 50px review gaps."""
from pathlib import Path
import json
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent.parent
raw = root / 'source/animation'
W, H, SCALE, GROUND = 384, 320, .23, 312
anchors = dict(ready=735, anticipation=720, charge=675, aim=715, peak=617, guard=652, recoil=815, down=627)
names = dict(idle=['ready','breathe-up','breathe-down','ready'], attack=['ready','anticipation','charge','aim','release','attack-peak'], hit=['guard-notice','impact-recoil','knockdown'], projectile=['charge','launch','near-travel','far-travel','contact','star-burst-fade'])

def load_art(key):
    im=Image.open(raw / f'{key}.png').convert('RGBA')
    # Ignore almost invisible background specks when finding the crop, preserve
    # a 16px band around visible art and preserve every alpha value inside it.
    b=im.getchannel('A').point(lambda a:255 if a>8 else 0).getbbox()
    box=(max(0,b[0]-16),max(0,b[1]-16),min(im.width,b[2]+16),min(im.height,b[3]+16))
    return im.crop(box), box, b

def character(key):
    art,box,b=load_art(key)
    art=art.resize((round(art.width*SCALE),round(art.height*SCALE)),Image.Resampling.LANCZOS)
    x=round(W/2+(box[0]-anchors[key])*SCALE)
    y=round(GROUND+(box[1]-b[3])*SCALE)
    assert x>=0 and y>=0 and x+art.width<=W and y+art.height<=H, (key,x,y,art.size)
    im=Image.new('RGBA',(W,H));im.alpha_composite(art,(x,y))
    return im

def effect(key,size,opacity=1):
    art,_,_=load_art(key)
    scale=size/max(art.size)
    art=art.resize((round(art.width*scale),round(art.height*scale)),Image.Resampling.LANCZOS)
    if opacity!=1:art.putalpha(art.getchannel('A').point(lambda a:round(a*opacity)))
    im=Image.new('RGBA',(320,320));im.alpha_composite(art,((320-art.width)//2,(320-art.height)//2));return im

frames={}
ready=character('ready')
idle=[]
for dy in (0,2,-2,0):
    # A gentle grounded breathing deformation; feet and bottom-center stay fixed.
    art=ready.resize((W,H+dy),Image.Resampling.LANCZOS)
    canvas=Image.new('RGBA',(W,H));canvas.alpha_composite(art,(0,-dy));idle.append(ready.copy() if dy==0 else canvas)
frames['idle']=idle
frames['attack']=[character(k) for k in ('ready','anticipation','charge','aim','peak','peak')]
frames['hit']=[character(k) for k in ('guard','recoil','down')]
frames['projectile']=[effect('star-master',s) for s in (112,160,160,160)]+[effect('star-burst',220),effect('star-burst',220,.30)]
report={}
for action,seq in frames.items():
    n=len(seq);w,h=seq[0].size
    (root/action).mkdir(exist_ok=True)
    (root/'source-frames'/action).mkdir(parents=True,exist_ok=True)
    strip=Image.new('RGBA',(n*w,h));spaced=Image.new('RGBA',(n*w+(n-1)*50,h))
    bounds=[]
    for i,im in enumerate(seq):
        im.save(root/action/f'{i+1:02}.png')
        strip.alpha_composite(im,(i*w,0));spaced.alpha_composite(im,(i*(w+50),0))
        bounds.append(im.getchannel('A').getbbox())
        assert im.getchannel('A').getextrema()[0]==0
        assert not im.getchannel('A').crop((0,0,5,h)).getbbox()
        assert not im.getchannel('A').crop((w-5,0,w,h)).getbbox()
    stem=f'char_mage_female_starlight_rose_sd_{action}'
    strip.save(root/f'{stem}_strip.png')
    spaced.save(root/'review'/f'{stem}_spaced_master.png')
    for i in range(n-1):
        assert not spaced.getchannel('A').crop(((i+1)*w+i*50,0,(i+1)*(w+50),h)).getbbox()
    review=Image.new('RGB',(n*round(w*148/h),148*2))
    cellw=round(w*148/h)
    for row,color in enumerate(('#F7F7FF','#5751D8')):
        for i,im in enumerate(seq):
            panel=Image.new('RGBA',(cellw,148),color)
            panel.alpha_composite(im.resize((cellw,148),Image.Resampling.LANCZOS))
            review.paste(panel.convert('RGB'),(i*cellw,row*148))
            d=ImageDraw.Draw(review);d.line((i*cellw,row*148+144,(i+1)*cellw-1,row*148+144),fill='#b8b3da');d.line((i*cellw,row*148,i*cellw,(row+1)*148),fill='#b8b3da')
    review.save(root/'review'/f'{action}-light-violet-mobile.png')
    preview=[Image.alpha_composite(Image.new('RGBA',(w,h),'#5751D8'),im).convert('RGB') for im in seq]
    preview[0].save(root/'review'/f'{action}-preview.gif',save_all=True,append_images=preview[1:],duration=160 if action!='idle' else 400,loop=0)
    durations=[90]*n if action=='attack' else [60]*n if action=='projectile' else [160,160,550] if action=='hit' else [533,533,533,1]
    manifest=dict(image=f'{stem}_strip.png',frameWidth=w,frameHeight=h,frameCount=n,layout='horizontal',facing='right',anchor=dict(x=.5,y=.5 if action=='projectile' else .975),sourceFrameGapPx=50,spacedReviewImage=f'review/{stem}_spaced_master.png',frames=[dict(index=i,name=name,durationMs=durations[i]) for i,name in enumerate(names[action])])
    if action=='attack':manifest['frames'][4]['events']={'release':True};manifest['finalHold']=True;manifest['note']='Release and attack peak deliberately hold the same fully extended active casting drawing.'
    if action=='hit':manifest['frames'][1]['events']={'hit':True};manifest['frames'][2]['finalHold']=True
    if action=='projectile':manifest['frames'][1]['events']={'release':True};manifest['frames'][4]['events']={'hit':True};manifest['frames'][5]['events']={'fade':True};manifest['effectBounds']={'maxWidth':220,'maxHeight':220}
    (root/f'{stem}_strip.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    report[action]=dict(runtimeSize=list(strip.size),spacedSize=list(spaced.size),foregroundBounds=bounds)
for action,keys in [('attack',['ready','anticipation','charge','aim','peak','peak']),('hit',['guard','recoil','down'])]:
    for i,key in enumerate(keys):Image.open(raw/f'{key}.png').save(root/'source-frames'/action/f'{i+1:02}.png')
contract=json.loads((root/'asset-contract.json').read_text(encoding='utf-8'))
contract['runtime'].update(frameWidth=W,frameHeight=H)
contract['status']='Dedicated idle, attack, hit/knockdown and yellow star projectile integrated; browser review pending'
contract['normalization']={'sharedScale':SCALE,'sourceCanvas':[1254,1254],'bodyAnchors':anchors,'runtimeGroundY':GROUND,'note':'384px cells preserve wide hair, staff and lying silhouette. No per-frame fitting scale.'}
contract['timing']={'attackDelayMs':80,'attackDurationMs':450,'projectileDelayMs':380,'projectileDurationMs':300,'releaseMs':440,'contactMs':620,'reducedContactMs':170}
(root/'asset-contract.json').write_text(json.dumps(contract,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(root/'review/animation-validation.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print('Packed idle 4, attack 6, hit 3 and projectile 6 frames; alpha and all 50px gaps verified.')
