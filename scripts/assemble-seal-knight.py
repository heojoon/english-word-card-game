"""Separate alpha-connected poses, normalize and pack without color-keying armor."""
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter, ImageDraw
import numpy as np
import json

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'assets/monsters/seal-knight'
W,H,GAP,GROUND=384,320,50,312
SPECS={
 'idle':(['guard','inhale','settle'],[350,350,350]),
 'attack':(['ready','anticipation','contact'],[300,300,300]),
 'shield':(['charge','raise','hold'],[200,250,350]),
 'hit':(['notice','strongest-recoil','complete-knockdown'],[140,180,600])
}

def components(im):
    alpha=np.array(im.getchannel('A'))>16
    parent=[];runs=[];prev=[]
    def find(i):
        while parent[i]!=i:
            parent[i]=parent[parent[i]];i=parent[i]
        return i
    for y,row in enumerate(alpha):
        borders=np.flatnonzero(np.diff(np.r_[False,row,False]));current=[]
        for start,end in zip(borders[::2],borders[1::2]):
            i=len(parent);parent.append(i);runs.append((y,int(start),int(end),i));current.append((start,end,i))
            for ps,pe,pi in prev:
                if ps>end:break
                if pe>=start:parent[find(i)]=find(pi)
        prev=current
    groups={}
    for y,x,e,i in runs:groups.setdefault(find(i),[]).append((y,x,e))
    return sorted(groups.values(),key=lambda rs:sum(e-x for _,x,e in rs),reverse=True)

def bounds(runs):
    return min(x for _,x,_ in runs),min(y for y,_,_ in runs),max(e for _,_,e in runs),max(y for y,_,_ in runs)+1

def extract(source):
    groups=components(source)
    mains=sorted(groups[:3],key=lambda rs:bounds(rs)[0])
    assert all(sum(e-x for _,x,e in rs)>50000 for rs in mains)
    # Source silhouettes have interleaved x bounds but DO NOT touch. Masks preserve
    # each complete pose; vertical crops would truncate capes or include a neighbor.
    centers=[(bounds(rs)[0]+bounds(rs)[2])/2 for rs in mains]
    for extra in groups[3:]:
        if sum(e-x for _,x,e in extra)<16:continue
        center=(bounds(extra)[0]+bounds(extra)[2])/2
        mains[min(range(3),key=lambda i:abs(centers[i]-center))].extend(extra)
    frames=[]
    for runs in mains:
        mask=Image.new('L',source.size);draw=ImageDraw.Draw(mask)
        for y,x,e in runs:draw.line((x,y,e-1,y),fill=255)
        mask=mask.filter(ImageFilter.MaxFilter(3))
        cut=source.copy();cut.putalpha(ImageChops.multiply(source.getchannel('A'),mask))
        frames.append(cut.crop(cut.getbbox()))
    return frames

def main():
    report={};mobile=Image.new('RGB',(3*154,4*260),'#f7f7ff')
    for row,(action,(names,durations)) in enumerate(SPECS.items()):
        source=Image.open(BASE/'source'/f'{action}.png').convert('RGBA')
        raws=extract(source)
        # The ready pose is the same full standing pose in every action. Use its
        # helmet-to-foot height to normalize all actions to the same 240px identity.
        factor=240/raws[0].height
        assert max(im.width*factor for im in raws)<=W-16,'Widen runtime cell, never shrink character for effects'
        assert max(im.height*factor for im in raws)<=H-20
        frames=[];transforms=[]
        raw_w=max(im.width for im in raws);raw_h=max(im.height for im in raws)
        original_master=Image.new('RGBA',(3*raw_w+2*GAP,raw_h))
        spaced=Image.new('RGBA',(3*W+2*GAP,H));strip=Image.new('RGBA',(3*W,H))
        for i,raw in enumerate(raws):
            for folder in [BASE/'source-frames'/action,BASE/action]:folder.mkdir(parents=True,exist_ok=True)
            raw.save(BASE/'source-frames'/action/f'{i+1:02}.png')
            original_master.alpha_composite(raw,(i*(raw_w+GAP)+(raw_w-raw.width)//2,raw_h-raw.height))
            sprite=raw.resize((round(raw.width*factor),round(raw.height*factor)),Image.Resampling.LANCZOS)
            frame=Image.new('RGBA',(W,H));frame.alpha_composite(sprite,((W-sprite.width)//2,GROUND-sprite.height))
            box=frame.getbbox();assert box[0]>=8 and box[2]<=W-8 and box[1]>=8 and box[3]<=GROUND
            frame.save(BASE/action/f'{i+1:02}.png');frames.append(frame)
            strip.alpha_composite(frame,(i*W,0));spaced.alpha_composite(frame,(i*(W+GAP),0))
            transforms.append({'sourceBoundsSize':list(raw.size),'scale':factor,'runtimeBounds':list(box)})
        name=f'monster_seal_knight_sd_{action}_strip'
        strip.save(BASE/f'{name}.png');spaced.save(BASE/'review'/f'{action}-spaced-50px.png')
        original_master.save(BASE/'source-frames'/f'{action}-master-50px.png')
        metadata={'image':name+'.png','frameWidth':W,'frameHeight':H,'frameCount':3,'layout':'horizontal','facing':'left','anchor':{'x':.5,'y':.975},'sourceFrameGapPx':GAP,'loop':action=='idle','holdLastFrame':action in ['hit','shield'],'hitFrameIndexBase':0,'frames':[{'name':n,'durationMs':durations[i],**({'hit':True} if action=='attack' and i==2 else {}),**({'hold':True} if action in ['hit','shield'] and i==2 else {})} for i,n in enumerate(names)],'normalization':transforms,'userApproved':False}
        (BASE/f'{name}.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        review=Image.new('RGB',(W*3,H*2))
        preview=[]
        for j,color in enumerate(['#f7f7ff','#5751d8']):
            bg=Image.new('RGBA',strip.size,color);bg.alpha_composite(strip);review.paste(bg.convert('RGB'),(0,j*H))
            for i,frame in enumerate(frames):
                small=Image.new('RGBA',(154,128),color);small.alpha_composite(frame.resize((154,128),Image.Resampling.LANCZOS));mobile.paste(small.convert('RGB'),(i*154,row*260+j*128))
        review.save(BASE/'review'/f'{action}-alpha-review.png')
        for frame in frames:
            bg=Image.new('RGBA',(W,H),'#5751d8');bg.alpha_composite(frame);preview.append(bg.convert('RGB'))
        preview[0].save(BASE/'review'/f'{action}-preview.webp',save_all=True,append_images=preview[1:],duration=durations,loop=0 if action=='idle' else 1)
        for i in range(2):assert spaced.crop((W+i*(W+GAP),0,W+i*(W+GAP)+GAP,H)).getbbox() is None
        report[action]={'sourceSize':list(source.size),'runtimeSize':list(strip.size),'alphaExtrema':list(strip.getchannel('A').getextrema()),'frames':transforms,'spacedWidth':spaced.width,'extraction':'alpha connected components; no vertical cuts or color keys'}
    mobile.save(BASE/'review/mobile-frame-grid.png')
    (BASE/'review/validation.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    contract={'name':'봉인의 수호기사','world':'7C','stage':30,'facing':'left','frameWidth':W,'frameHeight':H,'anchor':{'x':.5,'y':.975},'sourceFrameGapPx':GAP,'contactMs':600,'hitFrameIndexBase':0,'runtimeGapPx':0,'actions':{k:{'frameNames':v[0],'durationsMs':v[1]} for k,v in SPECS.items()},'cellWidthReason':'Sword anticipation and contact arc require 384px; preserve 240px helmet-to-foot character scale.','review':{'offlineAlpha':True,'mobile128px':True,'browser':False,'userApproved':False}}
    (BASE/'animation-contract.json').write_text(json.dumps(contract,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Packed 12 complete RGBA frames, 4 strips at 1152x320, 50px-gapped masters and mobile alpha reviews.')

if __name__=='__main__':main()
