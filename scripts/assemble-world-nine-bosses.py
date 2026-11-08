"""Pack approved generated frames without repainting or color-keying their alpha."""
from collections import deque
from pathlib import Path
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'assets/monsters/world-9'
CONTRACT = json.loads((ART / 'boss-animation-contract.json').read_text())

def components(image, expected=12, rows=4):
    w, h = image.size
    mask = bytearray(1 if a > 32 else 0 for a in image.getchannel('A').tobytes())
    boxes = []
    for seed in range(len(mask)):
        if not mask[seed]:
            continue
        mask[seed] = 0
        queue = deque([seed])
        count, x0, y0, x1, y1 = 0, w, h, 0, 0
        while queue:
            pixel = queue.popleft()
            x, y = pixel % w, pixel // w
            count += 1
            x0, y0, x1, y1 = min(x0, x), min(y0, y), max(x1, x+1), max(y1, y+1)
            for t in (pixel-1 if x else -1, pixel+1 if x<w-1 else -1, pixel-w, pixel+w):
                if 0 <= t < len(mask) and mask[t]:
                    mask[t] = 0
                    queue.append(t)
        if count > 5000:
            boxes.append((x0, y0, x1, y1))
    assert len(boxes) == expected, (len(boxes), boxes)
    return sorted(boxes, key=lambda b: (int((b[1]+b[3])/2/(h/rows)), b[0]))

results = {}
for kind in ['iris', 'griffin']:
    dest = ART / kind
    image = Image.open(dest / 'source/generated-sheet.png').convert('RGBA')
    boxes = components(image)
    sources = {a:(image,boxes[r*3:r*3+3],1.0) for r,a in enumerate(CONTRACT['actions'])}
    if kind == 'iris':
        canonical_height = boxes[0][3]-boxes[0][1]
        for action in ['attack','hit','skill']:
            group = Image.open(dest / f'source/{action}-generated.png').convert('RGBA')
            group_boxes = components(group,3,1)
            # First attack/hit frames stand upright. Skill raises the staff 100px
            # above the hairline; measure body height rather than the raised prop.
            height = group_boxes[0][3]-group_boxes[0][1]-(100 if action=='skill' else 0)
            sources[action] = (group,group_boxes,canonical_height/height)
    width, height, ground = (448,384,374) if kind=='iris' else (384,320,312)
    # One scale per identity across every frame and action. Keep the floor stable.
    # Preserve the canonical idle's body scale; widen/tall cells for long props.
    scale = min((height-26)/(boxes[0][3]-boxes[0][1]+4),
                (width-28)/max((b[2]-b[0]+4)*m for _,bs,m in sources.values() for b in bs),
                (height-26)/max((b[3]-b[1]+4)*m for _,bs,m in sources.values() for b in bs))
    details = {}
    for row, (action, contract) in enumerate(CONTRACT['actions'].items()):
        frames, bounds = [], []
        source, action_boxes, multiplier = sources[action]
        for i in range(3):
            b = action_boxes[i]
            box = (max(0,b[0]-2), max(0,b[1]-2), min(source.width,b[2]+2), min(source.height,b[3]+2))
            crop = source.crop(box)
            raw = dest / f'source-frames/{action}'
            raw.mkdir(parents=True, exist_ok=True)
            crop.save(raw / f'{i+1:02}.png')
            frame = Image.new('RGBA', (width, height))
            resized = crop.resize((round(crop.width*scale*multiplier), round(crop.height*scale*multiplier)), Image.Resampling.LANCZOS)
            frame.alpha_composite(resized, ((width-resized.width)//2, ground-resized.height))
            target = dest / action
            target.mkdir(parents=True, exist_ok=True)
            frame.save(target / f'{i+1:02}.png', optimize=True)
            bb = frame.getchannel('A').getbbox()
            assert bb[0]>=8 and bb[2]<=width-8 and bb[1]>=8 and bb[3]<=ground, bb
            assert frame.getchannel('A').getextrema()[0] == 0
            frames.append(frame)
            bounds.append(box)
        strip = Image.new('RGBA', (width*3, height))
        spaced = Image.new('RGBA', (width*3+100, height))
        review = dest / 'review'
        review.mkdir(parents=True, exist_ok=True)
        composite = Image.new('RGB', (576, 320))
        for i, frame in enumerate(frames):
            strip.alpha_composite(frame, (width*i, 0))
            spaced.alpha_composite(frame, ((width+50)*i, 0))
            for r, color in enumerate(['#F7F7FF', '#5751D8']):
                bg = Image.new('RGBA', (192,160), color)
                bg.alpha_composite(frame.resize((192,160), Image.Resampling.LANCZOS))
                composite.paste(bg.convert('RGB'), (192*i, 160*r))
        filename = f'{kind}-sd-{action}-strip.png'
        strip.save(dest / filename, optimize=True)
        spaced.save(review / f'{action}-spaced-50px.png', optimize=True)
        spaced.save(dest / 'source-frames' / f'{action}-approved-spaced-50px.png', optimize=True)
        composite.save(review / f'{action}-light-violet.png')
        frames[0].save(review / f'{action}-preview.webp', save_all=True, append_images=frames[1:], duration=contract['durationsMs'], loop=0, lossless=True)
        manifest = dict(image=filename,frameWidth=width,frameHeight=height,frameCount=3,layout='horizontal',facing='left',anchor=CONTRACT['anchor'],sourceFrameGapPx=50,sourceBounds=bounds,source=f'source/{action}-generated.png' if kind=='iris' and action!='idle' else 'source/generated-sheet.png',sourceScale=scale*multiplier,frameNames=contract['frames'],durationsMs=contract['durationsMs'],loop=action=='idle',holdLastFrame=action!='idle',frames=[dict(name=name,durationMs=duration,**({'hit':True} if action in ['attack','skill'] and i==2 else {}),**({'hold':True} if action=='hit' and i==2 else {})) for i,(name,duration) in enumerate(zip(contract['frames'],contract['durationsMs']))])
        (dest / filename.replace('.png','.json')).write_text(json.dumps(manifest, indent=2)+'\n')
        details[action] = dict(sourceBounds=bounds,stripSize=strip.size,alpha=strip.getchannel('A').getextrema())
    Image.open(dest/'idle/01.png').save(dest/'identity.png')
    results[kind] = dict(scale=scale,actions=details,review='technical frame review pending; no claim of user artwork approval')
(ART/'review-validation.json').write_text(json.dumps(results, indent=2)+'\n')
print(json.dumps(results))
