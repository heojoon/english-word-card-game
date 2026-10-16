"""Extract reviewed poses, preserve alpha, and pack contiguous runtime strips.

Only deterministic framing/packing is performed here; generated originals stay
untouched. Pose coordinates and common anatomical scales live in extraction.json.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import json

ROOT = Path(__file__).resolve().parents[1]
config = json.loads((ROOT/'source/extraction.json').read_text(encoding='utf-8'))
summary = []
for action, spec in config.items():
    width = spec.get('frameWidth', 320)
    cells = []
    extraction = []
    for index, pose in enumerate(spec['poses']):
        source_name = pose.get('source',spec['source'])
        original = Image.open(ROOT/'source'/source_name).convert('RGBA')
        alpha_min,alpha_max = original.getchannel('A').getextrema()
        if alpha_min != 0 or alpha_max < 250:
            raise ValueError(f'{action}: source must have real transparent alpha')
        box = pose['box']
        raw = original.crop(box)
        source_dir = ROOT/'source-frames'/action
        source_dir.mkdir(parents=True, exist_ok=True)
        raw.save(source_dir/f'{index+1:02}.png')
        alpha = raw.getchannel('A')
        bounds = alpha.point(lambda value: 255 if value >= 8 else 0).getbbox()
        # Keep a transparent safety band around visible source art; do not key
        # blue/violet or erase white costume regions.
        cropbox = (max(0,bounds[0]-4),max(0,bounds[1]-4),min(raw.width,bounds[2]+4),min(raw.height,bounds[3]+4))
        crop = raw.crop(cropbox)
        scale = pose.get('scale',spec['scale'])
        resized = crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS)
        anchor_x = pose.get('anchorX',raw.width/2)
        ground = pose['ground']
        offset = (round(width/2-(anchor_x-cropbox[0])*scale),round(312-(ground-cropbox[1])*scale))
        if offset[0]<0 or offset[1]<0 or offset[0]+resized.width>width or offset[1]+resized.height>320:
            raise ValueError((action,index,'crop would occur',offset,resized.size,'widen the cell; preserve body scale'))
        cell = Image.new('RGBA',(width,320))
        cell.alpha_composite(resized,offset)
        out = ROOT/action
        out.mkdir(exist_ok=True)
        cell.save(out/f'{index+1:02}.png')
        cells.append(cell)
        extraction.append({'source':f'source/{source_name}','box':box,'visibleBounds':bounds,'crop':cropbox,'scale':scale,'ground':ground,'anchorX':anchor_x,'runtimeOffset':offset,'runtimeBounds':cell.getchannel('A').getbbox()})
    count = len(cells)
    strip = Image.new('RGBA',(width*count,320))
    spaced = Image.new('RGBA',(width*count+50*(count-1),320))
    for i,cell in enumerate(cells):
        strip.alpha_composite(cell,(i*width,0))
        spaced.alpha_composite(cell,(i*(width+50),0))
    filename = f'char_sorcerus_sd_{action.replace("-","_")}_strip.png'
    strip.save(ROOT/filename)
    review = ROOT/'review'
    spaced.save(review/f'{action}-spaced-master.png')
    # Two light/violet filmstrips at full runtime resolution, with frame labels.
    composite = Image.new('RGB',(spaced.width,700),'#F7F7FF')
    draw = ImageDraw.Draw(composite)
    for row,color in enumerate(['#F7F7FF','#5751D8']):
        bg = Image.new('RGBA',spaced.size,color)
        bg.alpha_composite(spaced)
        composite.paste(bg.convert('RGB'),(0,30+row*350))
        for i,name in enumerate(spec['names']):
            draw.text((i*(width+50)+8,8+row*350),f'{i+1}: {name}',fill='#24214C')
    composite.save(review/f'{action}-review.png')
    # Animated WebP preserves full RGBA; the local HTML viewer also supports
    # frame scrubbing and holds knockdown until a new state is selected.
    cells[0].save(review/f'{action}-preview.webp',save_all=True,append_images=cells[1:],duration=spec['durations'],loop=0 if action!='hit' else 1,lossless=True,method=4)
    frames = [{'name':name,'duration':duration,**({'hit':True} if action=='hit' and i==1 else {}),**({'contact':True} if i==spec.get('contactFrame') else {})} for i,(name,duration) in enumerate(zip(spec['names'],spec['durations']))]
    manifest = {'image':filename,'frameWidth':width,'frameHeight':320,'frameCount':count,'layout':'horizontal','anchor':{'x':.5,'y':.975},'facing':'left','frameNames':spec['names'],'frames':frames,'sourceFrameGapPx':50,'source':f'source/{spec["source"]}','sourceGeometry':'Generated geometry preserved; explicit reviewed extraction coordinates below. Review master has exact 50px transparent gaps. Runtime slots are contiguous.','extraction':extraction,'review':{'technical':'pending frame review','browser':'not requested; asset-only delivery','userApproval':'identity accepted; motion not yet approved'}}
    if action=='idle':manifest['loop']=True;manifest['playback']='ping-pong'
    elif action=='hit':manifest['finalFrameHold']=True
    else:manifest['loop']=False
    if spec.get('note'):manifest['artistNotes']=spec['note']
    (ROOT/filename.replace('.png','.json')).write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    summary.append({'action':action,'size':strip.size,'frameCount':count,'frameWidth':width})
print(json.dumps(summary))
