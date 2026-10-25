"""Extract generated RGBA poses and pack battle cells without repainting pixels."""
from pathlib import Path
from collections import deque
import json
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'assets/monsters/world-7c'
W, H, GROUND, GAP = 448, 320, 312, 50
ACTIONS = {'idle': (['ready', 'breath'], [600, 600]),
           'attack': (['ready', 'anticipation', 'sword-contact'], [120, 120, 260]),
           'hit': (['notice', 'impact', 'knockdown'], [100, 100, 160])}


def extract(path, count):
    src = Image.open(path).convert('RGBA')
    pixels = np.array(src)
    mask = pixels[:, :, 3] >= 32
    labels = np.zeros(mask.shape, dtype=np.int32)
    components = []
    height, width = mask.shape
    for y, x in zip(*np.where(mask)):
        if labels[y, x]:
            continue
        number = len(components) + 1
        queue = deque([(int(x), int(y))])
        labels[y, x] = number
        size = 0
        x0 = x1 = int(x)
        y0 = y1 = int(y)
        while queue:
            px, py = queue.popleft()
            size += 1
            x0, x1 = min(x0, px), max(x1, px)
            y0, y1 = min(y0, py), max(y1, py)
            for nx, ny in ((px-1, py), (px+1, py), (px, py-1), (px, py+1)):
                if 0 <= nx < width and 0 <= ny < height and mask[ny, nx] and not labels[ny, nx]:
                    labels[ny, nx] = number
                    queue.append((nx, ny))
        components.append({'id': number, 'size': size, 'box': (x0, y0, x1+1, y1+1)})
    main = sorted(sorted(components, key=lambda c: c['size'], reverse=True)[:count], key=lambda c: c['box'][0])
    buckets = [[] for _ in main]
    for component in components:
        if component['size'] < 8:
            continue  # isolated alpha fringe, never costume color-key removal
        box = component['box']
        cx, cy = (box[0]+box[2])/2, (box[1]+box[3])/2
        def distance(target):
            a, b, c, d = target['box']
            return max(a-cx, 0, cx-c)**2 + max(b-cy, 0, cy-d)**2
        bucket = min(range(count), key=lambda i: distance(main[i]))
        buckets[bucket].append(component['id'])
    result = []
    for bucket in buckets:
        data = pixels.copy()
        data[~np.isin(labels, bucket), 3] = 0
        frame = Image.fromarray(data)
        box = frame.getbbox()
        assert box[0] > 0 and box[1] > 0 and box[2] < width and box[3] < height, (path, box)
        result.append(frame.crop(box))
    return result


def main():
    validation = []
    for action, (names, durations) in ACTIONS.items():
        parts = extract(BASE/'source'/f'{action}-generated.png', len(names))
        scale = 240 / parts[0].height
        for directory in (BASE/action, BASE/'source-frames'/action, BASE/'review'):
            directory.mkdir(parents=True, exist_ok=True)
        strip = Image.new('RGBA', (W*len(parts), H))
        spaced = Image.new('RGBA', (W*len(parts)+GAP*(len(parts)-1), H))
        cell = max(max(p.size) for p in parts)+80
        master = Image.new('RGBA', (cell*len(parts)+GAP*(len(parts)-1), cell))
        review = Image.new('RGB', (180*len(parts), 264), '#F7F7FF')
        draw = ImageDraw.Draw(review)
        draw.rectangle((0,132,review.width,264), fill='#5751D8')
        frames, bounds = [], []
        for i, part in enumerate(parts):
            part.save(BASE/'source-frames'/action/f'{i+1:02}.png')
            master.alpha_composite(part, (i*(cell+GAP)+(cell-part.width)//2, cell-40-part.height))
            resized = part.resize((round(part.width*scale),round(part.height*scale)), Image.Resampling.LANCZOS)
            frame = Image.new('RGBA', (W,H))
            frame.alpha_composite(resized, ((W-resized.width)//2,GROUND-resized.height))
            box = frame.getbbox()
            assert box[0]>=8 and box[1]>=8 and box[2]<=W-8 and box[3]<=GROUND, (action,i,box)
            frame.save(BASE/action/f'{i+1:02}.png')
            strip.alpha_composite(frame,(i*W,0))
            spaced.alpha_composite(frame,(i*(W+GAP),0))
            small = frame.resize((168,120),Image.Resampling.LANCZOS)
            for row in range(2):
                review.paste(small,(i*180+6,row*132+6),small)
            frames.append(frame)
            bounds.append(box)
        filename = f'arcane-sentry-sd-{action}-strip.png'
        strip.save(BASE/filename,optimize=True)
        spaced.save(BASE/'review'/f'{action}-spaced-50px.png')
        master.save(BASE/'source'/f'{action}-master-50px.png')
        review.save(BASE/'review'/f'{action}-light-violet.png')
        frames[0].save(BASE/'review'/f'{action}-preview.webp',save_all=True,append_images=frames[1:],duration=durations,loop=0 if action=='idle' else 1,lossless=True)
        metadata = {'image':filename,'frameWidth':W,'frameHeight':H,'frameCount':len(parts),'layout':'horizontal','facing':'left','anchor':{'x':.5,'y':.975},'groundLinePx':GROUND,'sourceFrameGapPx':GAP,'loop':action=='idle','holdFinal':action!='idle','frames':[{'name':name,'durationMs':duration,**({'hit':True} if (action=='attack' and i==2) or (action=='hit' and i==1) else {}),**({'hold':True} if action=='hit' and i==2 else {})} for i,(name,duration) in enumerate(zip(names,durations))],'reviewStatus':'Offline alpha/bounds/mobile review. In-engine integration and user approval pending.'}
        (BASE/filename.replace('.png','.json')).write_text(json.dumps(metadata,indent=2)+'\n',encoding='utf-8')
        validation.append({'action':action,'scale':scale,'bounds':bounds,'reviewGapPx':GAP})
        print(action,bounds)
    (BASE/'review/validation.json').write_text(json.dumps(validation,indent=2)+'\n',encoding='utf-8')
    bg = ROOT/'assets/environments/world-7c'
    Image.open(bg/'source/royal-dungeon-battle.png').convert('RGB').save(bg/'01-royal-dungeon-battle.webp',quality=90,method=6)
    Image.open(BASE/'source/identity.png').save(BASE/'arcane-sentry-identity.webp',lossless=True)


if __name__ == '__main__':
    main()
