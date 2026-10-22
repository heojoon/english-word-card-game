"""Pack AI-drawn poses without repainting or synthesizing animation frames.

Originals stay untouched. Only source slot extraction, uniform resampling,
translation and transparent RGBA strip/review packing happen here.
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1] / 'assets/monsters/nereus'
GAP = 50


def sheet_slots(filename):
    im = Image.open(ROOT / 'source' / filename).convert('RGBA')
    alpha = im.getchannel('A').point(lambda a: 255 if a > 8 else 0)
    # Projection finds genuinely empty vertical gutters, never cuts through a pose.
    projection = alpha.resize((im.width, 1), Image.Resampling.BOX)
    active = [v > 0 for v in projection.getdata()]
    runs, start = [], None
    for x, value in enumerate(active + [False]):
        if value and start is None:
            start = x
        elif not value and start is not None:
            runs.append((start, x))
            start = None
    assert len(runs) == 3, (filename, runs)
    cuts = [0] + [(runs[i][1] + runs[i + 1][0]) // 2 for i in range(2)] + [im.width]
    return [{'source': filename, 'box': [cuts[i], 0, cuts[i+1], im.height]} for i in range(3)]


def main():
    contract = json.loads((ROOT / 'animation-contract.json').read_text(encoding='utf-8'))
    layouts = {
        'idle': [{**p, 'scale': .40} for p in sheet_slots('idle-sheet.png')],
        'attack': [{'source': f'attack-{i:02}.png', 'scale': .28} for i in range(1, 4)],
        'speed': [{'source': f'speed-{i:02}.png', 'scale': .28} for i in range(1, 4)],
        'hit': [{'source': 'hit-sheet.png', 'box': [0, 0, 676, 721], 'scale': .40},
                {'source': 'hit-02.png', 'scale': .25}, {'source': 'hit-03.png', 'scale': .25}],
        'projectile': [{**p, 'scale': .60} for p in sheet_slots('projectile-sheet.png')]
    }
    report = {'browser': 'not run; explicit user request required', 'userApproved': False, 'actions': {}}
    mobile = Image.new('RGB', (672, len(layouts)*330), '#f7f7ff')
    for row, (action, poses) in enumerate(layouts.items()):
        spec = contract['actions'][action]
        w, h = spec.get('frameWidth', 448), spec.get('frameHeight', 320)
        anchor = spec.get('anchor', contract['anchor'])
        frames, raws, transforms = [], [], []
        for i, pose in enumerate(poses):
            im = Image.open(ROOT / 'source' / pose['source']).convert('RGBA')
            raw = im.crop(pose['box']) if 'box' in pose else im.copy()
            raw.putalpha(raw.getchannel('A').point(lambda a: 0 if a <= 8 else a))
            bounds = raw.getbbox()
            assert bounds and raw.getchannel('A').getextrema()[0] == 0
            # The feet share the exact same baseline. Foot midpoint, not a moving
            # cape/weapon silhouette, defines the horizontal character anchor.
            if action == 'projectile':
                pivot = (bounds[0]+bounds[2])/2
                baseline = (bounds[1]+bounds[3])/2
            elif action == 'hit' and i == 2:
                pivot = (bounds[0]+bounds[2])/2
                baseline = bounds[3]
            else:
                baseline = bounds[3]
                foot_band = max(24, round((bounds[3]-bounds[1])*.05))
                foot = raw.getchannel('A').crop((0, max(0, baseline-foot_band), raw.width, baseline)).point(lambda a: 255 if a > 100 else 0).getbbox()
                assert foot
                pivot = (foot[0]+foot[2])/2
            scale = pose['scale']
            cropped = raw.crop(bounds)
            resized = cropped.resize((round(cropped.width*scale), round(cropped.height*scale)), Image.Resampling.LANCZOS)
            x = round(w*anchor['x']+(bounds[0]-pivot)*scale)
            y = round(h*anchor['y']+(bounds[1]-baseline)*scale)
            assert x >= 8 and y >= 8 and x+resized.width <= w-8 and y+resized.height <= h-4, (action, i, bounds, (x,y), resized.size)
            cell = Image.new('RGBA', (w,h));cell.alpha_composite(resized,(x,y))
            for folder in [ROOT/action, ROOT/'source-frames'/action]:folder.mkdir(parents=True,exist_ok=True)
            cell.save(ROOT/action/f'{i+1:02}.png');raw.save(ROOT/'source-frames'/action/f'{i+1:02}.png')
            frames.append(cell);raws.append(raw)
            transforms.append({**pose, 'pivotX': pivot, 'feetY': baseline, 'runtimeBounds': list(cell.getbbox()), 'scale': scale})
        strip=Image.new('RGBA',(w*3,h));spaced=Image.new('RGBA',(w*3+GAP*2,h))
        source_w,source_h=max(f.width for f in raws),max(f.height for f in raws)
        source_spaced=Image.new('RGBA',(source_w*3+GAP*2,source_h))
        for i,(frame,raw) in enumerate(zip(frames,raws)):
            strip.alpha_composite(frame,(i*w,0));spaced.alpha_composite(frame,(i*(w+GAP),0));source_spaced.alpha_composite(raw,(i*(source_w+GAP),0))
        for i in range(2):
            assert spaced.crop(((i+1)*w+i*GAP,0,(i+1)*(w+GAP),h)).getbbox() is None
            assert source_spaced.crop(((i+1)*source_w+i*GAP,0,(i+1)*(source_w+GAP),source_h)).getbbox() is None
        name=f'char_nereus_sd_{action}_strip'
        strip.save(ROOT/(name+'.png'),optimize=True);spaced.save(ROOT/'review'/f'{action}-spaced-50px.png',optimize=True)
        source_spaced.save(ROOT/'source-frames'/f'{action}-spaced-50px.png',optimize=True)
        manifest={'image':name+'.png','frameWidth':w,'frameHeight':h,'frameCount':3,'layout':'horizontal','anchor':anchor,'facing':'left','sourceFrameGapPx':50,'loop':spec.get('loop',False),'holdLastFrame':spec.get('holdLastFrame',False),'normalization':transforms,'review':contract['review'],
                  'frames':[{'name':n,'durationMs':spec['durationMs'][i],**({'hit':True} if i==spec.get('hitFrame') else {}),**({'release':True} if i==spec.get('releaseFrame') else {}),**({'hold':True} if i==2 and spec.get('holdLastFrame') else {})} for i,n in enumerate(spec['frameNames'])]}
        (ROOT/(name+'.json')).write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        for j,color in enumerate(['#f7f7ff','#5751d8']):
            bg=Image.new('RGBA',strip.size,color);bg.alpha_composite(strip);bg.convert('RGB').save(ROOT/'review'/f'{action}-{"light" if j==0 else "violet"}.png')
            thumb=bg.resize((672,160),Image.Resampling.LANCZOS).convert('RGB');draw=ImageDraw.Draw(thumb)
            for x in [224,448]:draw.line((x,0,x,160),fill='#60d9cf')
            if action!='projectile':draw.line((0,156,672,156),fill='#60d9cf')
            mobile.paste(thumb,(0,row*330+10+j*160))
        ImageDraw.Draw(mobile).text((8,row*330),action,fill='#24214c')
        preview=[]
        for frame in frames:
            bg=Image.new('RGBA',(w,h),'#5751d8');bg.alpha_composite(frame);preview.append(bg.convert('RGB'))
        preview[0].save(ROOT/'review'/f'{action}-preview.webp',save_all=True,append_images=preview[1:],duration=spec['durationMs'],loop=0 if spec.get('loop') else 1,quality=90)
        report['actions'][action]={'frameCount':3,'dimensions':list(strip.size),'bounds':[list(f.getbbox()) for f in frames],'alpha':'real RGBA, no color key','gaps':'50px verified','framesReviewed':contract['review']['technical'].startswith('passed')}
    mobile.save(ROOT/'review/mobile-frame-grid.jpg',quality=95)
    (ROOT/'source/layouts.json').write_text(json.dumps(layouts,indent=2)+'\n',encoding='utf-8')
    report['sources']={p.name:{'dimensions':list(Image.open(p).size),'mode':Image.open(p).mode} for p in sorted((ROOT/'source').glob('*.png'))}
    (ROOT/'review/validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False))


if __name__=='__main__':main()
