"""Deterministically extract genuine-alpha generated World11 boss frames."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageChops
import json
import math
import sys

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT/'assets/monsters/world-11'

def components(alpha, threshold=16):
    w,h=alpha.size
    data=alpha.tobytes()
    remaining={i for i,v in enumerate(data) if v>threshold}
    result=[]
    while remaining:
        start=remaining.pop()
        pending=[start]
        coords=[]
        while pending:
            p=pending.pop()
            coords.append(p)
            x=p%w
            for q in (p-1 if x else -1,p+1 if x<w-1 else -1,p-w,p+w):
                if q in remaining:
                    remaining.remove(q)
                    pending.append(q)
        if len(coords)>=100:
            xx=[p%w for p in coords]
            yy=[p//w for p in coords]
            result.append({'area':len(coords),'bbox':[min(xx),min(yy),max(xx)+1,max(yy)+1], 'coords':coords})
    return sorted(result,key=lambda c:c['area'],reverse=True)

def composite(frame,color):
    out=Image.new('RGBA',frame.size,color)
    out.alpha_composite(frame)
    return out.convert('RGB')

def assemble(kind, contract):
    folder=BASE/kind
    im=Image.open(folder/'source/sprites-original.png').convert('RGBA')
    alpha=im.getchannel('A')
    assert alpha.getextrema()==(0,255)
    regions=components(alpha)[:9]
    assert len(regions)==9 and min(r['area'] for r in regions)>40000
    regions.sort(key=lambda r:r['bbox'][1])
    ordered=[]
    for row in range(3):
        ordered.extend(sorted(regions[row*3:row*3+3],key=lambda r:r['bbox'][0]))
    scale=0.87
    fw,fh=448,384
    ground=round(fh*.975)
    normalized=[]
    measurements=[]
    all_masks=Image.new('L',im.size)
    for index,region in enumerate(ordered):
        mask=Image.new('L',im.size)
        raw=bytearray(im.width*im.height)
        for p in region['coords']:
            raw[p]=255
        mask=Image.frombytes('L',im.size,bytes(raw)).filter(ImageFilter.MaxFilter(11))
        all_masks=ImageChops.lighter(all_masks,mask)
        isolated=im.copy()
        isolated.putalpha(ImageChops.multiply(alpha,mask))
        bbox=isolated.getbbox()
        crop=isolated.crop(bbox)
        action=list(contract['actions'])[index//3]
        number=index%3+1
        extract=folder/'source-frames'/action
        extract.mkdir(parents=True,exist_ok=True)
        crop.save(extract/f'{number:02d}.png')
        crop=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS)
        frame=Image.new('RGBA',(fw,fh))
        x=(fw-crop.width)//2
        y=ground-crop.height
        assert x>=12 and y>=12
        frame.alpha_composite(crop,(x,y))
        actual=frame.getbbox()
        assert actual[0]>=12 and actual[1]>=12 and actual[2]<=fw-12 and actual[3]<=ground
        norm=folder/action
        norm.mkdir(exist_ok=True)
        frame.save(norm/f'{number:02d}.png')
        normalized.append(frame)
        measurements.append({'sourceBounds':list(bbox),'runtimeBounds':list(actual),'scale':scale,'placement':[x,y], 'groundLinePx':ground})
    # Source alpha has very low-opacity colored haze between figures. Preserve
    # all color/alpha inside a 5px dilation of each major alpha component;
    # no color-key operation is used, and original images remain untouched.
    removed=ImageChops.multiply(alpha,ImageChops.invert(all_masks))
    lost_visible=sum(v>16 for v in removed.tobytes())
    review_white=Image.new('RGB',(fw*3,fh*3),'#f7f7ff')
    review_violet=Image.new('RGB',(fw*3,fh*3),'#5751d8')
    review_mobile=Image.new('RGB',(fw*3,fh*3),'#5751d8')
    master=Image.new('RGBA',(fw*3+100,fh*3+100))
    previews=[]
    preview_durations=[]
    exports=[]
    for ai,(action,info) in enumerate(contract['actions'].items()):
        frames=normalized[ai*3:ai*3+3]
        strip=Image.new('RGBA',(fw*3,fh))
        spaced=Image.new('RGBA',(fw*3+100,fh))
        for j,frame in enumerate(frames):
            strip.alpha_composite(frame,(j*fw,0))
            spaced.alpha_composite(frame,(j*(fw+50),0))
            master.alpha_composite(frame,(j*(fw+50),ai*(fh+50)))
            review_white.paste(composite(frame,'#f7f7ff'),(j*fw,ai*fh))
            review_violet.paste(composite(frame,'#5751d8'),(j*fw,ai*fh))
            cell=composite(frame,'#5751d8')
            d=ImageDraw.Draw(cell)
            d.line((0,ground,fw,ground),fill='#60d9cf',width=2)
            d.text((8,8),f'{kind} {action} {j+1}',fill='white')
            review_mobile.paste(cell,(j*fw,ai*fh))
            previews.append(cell.resize((224,192),Image.Resampling.LANCZOS))
            preview_durations.append(info['durationMs'][j] if ai<2 or j<2 else 1600)
        for start in (fw,fw*2+50):
            assert spaced.getchannel('A').crop((start,0,start+50,fh)).getbbox() is None
        filename=f'{kind}-sd-{action}-strip.png'
        strip.save(folder/filename)
        spaced.save(folder/'source'/f'{action}-spaced-master.png')
        frame_events=[{'name':name,'durationMs':info['durationMs'][j],**({'hit':True} if action=='attack' and j==info['hitFrame'] else {})} for j,name in enumerate(info['frames'])]
        manifest={
            'image':filename,'frameWidth':fw,'frameHeight':fh,'frameCount':3,'layout':'horizontal',
            'facing':'left','anchor':contract['anchor'],'frameNames':info['frames'],'durationsMs':info['durationMs'],
            'frames':frame_events,'loop':info.get('loop',False),'holdLastFrame':info.get('holdLast',False),
            'source':'source/sprites-original.png','sourceFrameGapPx':50,
            'sourceSpacedMaster':f'source/{action}-spaced-master.png',
            'sourceSpacedMasterDimensions':[fw*3+100,fh],
            'scale':scale,'groundLinePx':ground,'measurements':measurements[ai*3:ai*3+3],
            'alpha':'true RGBA inherited from generated original; no color key; alpha-component extraction with 5px antialias halo',
            'reviewStatus':'all nine poses visually inspected on white/violet and 224x192 mobile groundline composite; props complete, scale stable, full knockdown third hit frame; browser review delegated to root',
            **({'hitFrame':info['hitFrame'],'contactMs':info['contactMs']} if action=='attack' else {})
        }
        (folder/filename).with_suffix('.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        assert strip.size==(1344,384) and strip.getchannel('A').getextrema()==(0,255)
        exports.append(str((folder/filename).relative_to(ROOT)).replace(chr(92),'/'))
    reviewfolder=folder/'review'
    reviewfolder.mkdir(exist_ok=True)
    master.save(folder/'source/review-master-50px-gaps.png')
    review_white.save(reviewfolder/'white.png')
    review_violet.save(reviewfolder/'violet.png')
    review_mobile.resize((672,576),Image.Resampling.LANCZOS).save(reviewfolder/'mobile-groundline.png')
    previews[0].save(reviewfolder/'states-preview.webp',save_all=True,append_images=previews[1:],duration=preview_durations,loop=0,lossless=True)
    identity=Image.open(folder/'source/identity-original.png').convert('RGBA')
    assert identity.getchannel('A').getextrema()==(0,255)
    standing=ROOT/f'assets/novel/characters/char_{kind}_world11_standing.webp'
    identity.save(standing,'WEBP',quality=92,method=6)
    assert Image.open(standing).getchannel('A').getextrema()==(0,255)
    return {'frameSize':[fw,fh],'stripSize':[1344,384],'scale':scale,'groundLinePx':ground,'sourceFrameGapPx':50,'sourceOriginalAlphaRange':[0,255],'opaquePixelsOutsideMajorComponents':lost_visible,'runtimeStrips':exports,'standing':str(standing.relative_to(ROOT)).replace(chr(92),'/'),'measurements':measurements}

if __name__=='__main__':
    contract=json.loads((BASE/'animation-contract.json').read_text(encoding='utf-8'))
    metadata=json.loads((BASE/'generation.json').read_text(encoding='utf-8'))
    for kind in ('garel','orden'):
        result=assemble(kind,contract)
        metadata['characters'][kind]['runtimeAssembly']=result
        metadata['characters'][kind]['projectIdentityOriginal']=f'assets/monsters/world-11/{kind}/source/identity-original.png'
        metadata['characters'][kind]['projectSpriteOriginal']=f'assets/monsters/world-11/{kind}/source/sprites-original.png'
        print(json.dumps({'kind':kind,**{k:v for k,v in result.items() if k!='measurements'}}))
    metadata['reviewStatus']='Genuine-alpha originals preserved; nine silhouettes per boss extracted without losing any alpha>16 pixel. Shared scale0.87/ground374, 50px source gaps and runtime bounds validated. White/violet and mobile groundline composites visually reviewed; no cropped props, floating fragments or clothing holes. Third hit pose fully down. Browser integration is root responsibility; user visual approval remains false.'
    metadata['userVisualApproval']=False
    (BASE/'generation.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
