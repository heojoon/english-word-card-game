"""Mechanically extract generated RGBA sprites, preserving original art and alpha."""
from collections import deque
from pathlib import Path
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / 'assets/monsters/world-9/training-dummy'
ACTIONS = {'idle': (2, ['ready', 'adjust-gloves'], [600, 600]),
           'attack': (3, ['ready', 'anticipation', 'punch-contact'], [120, 120, 260]),
           'hit': (3, ['notice', 'impact', 'complete-down'], [100, 100, 300])}

def silhouettes(image):
    width, height = image.size
    mask = bytearray(1 if a > 16 else 0 for a in image.getchannel('A').tobytes())
    boxes = []
    for seed in range(len(mask)):
        if not mask[seed]:
            continue
        mask[seed] = 0
        queue = deque([seed])
        count = 0
        x0, y0, x1, y1 = width, height, 0, 0
        while queue:
            pixel = queue.popleft()
            x, y = pixel % width, pixel // width
            count += 1
            x0, y0, x1, y1 = min(x0, x), min(y0, y), max(x1, x+1), max(y1, y+1)
            for target in (pixel-1 if x else -1, pixel+1 if x<width-1 else -1,
                           pixel-width, pixel+width):
                if 0 <= target < len(mask) and mask[target]:
                    mask[target] = 0
                    queue.append(target)
        if count > 5000:
            boxes.append((x0, y0, x1, y1))
    assert len(boxes) == 8, (len(boxes), boxes)
    return sorted(boxes, key=lambda b: (int((b[1]+b[3])/2/(height/3)), b[0]))

sources = {v: Image.open(ROOT / f'source/{v}-generated.png').convert('RGBA') for v in ['basic', 'advanced']}
bounds = {v: silhouettes(im) for v, im in sources.items()}
# One scale for both variants and every action. Do not stretch short down poses.
scale = min(288/max(b[2]-b[0] for boxes in bounds.values() for b in boxes),
            292/max(b[3]-b[1] for boxes in bounds.values() for b in boxes))
validation = {'scale': scale, 'frameWidth': 320, 'frameHeight': 320,
              'groundLinePx': 312, 'sourceFrameGapPx': 50, 'variants': {}}
for variant, image in sources.items():
    dest = ROOT / variant
    review = dest / 'review'
    review.mkdir(parents=True, exist_ok=True)
    cursor = 0
    details = {}
    for action, (count, names, durations) in ACTIONS.items():
        frames = []
        source_boxes = []
        for number in range(count):
            box = bounds[variant][cursor]
            cursor += 1
            # Retain a tiny antialiased band around the connected silhouette.
            box = (max(0, box[0]-2), max(0, box[1]-2), min(image.width, box[2]+2), min(image.height, box[3]+2))
            crop = image.crop(box)
            raw = dest / f'source-frames/{action}'
            raw.mkdir(parents=True, exist_ok=True)
            crop.save(raw / f'{number+1:02}.png')
            resized = crop.resize((round(crop.width*scale), round(crop.height*scale)), Image.Resampling.LANCZOS)
            frame = Image.new('RGBA', (320, 320))
            frame.alpha_composite(resized, ((320-resized.width)//2, 312-resized.height))
            runtime = dest / action
            runtime.mkdir(parents=True, exist_ok=True)
            frame.save(runtime / f'{number+1:02}.png', optimize=True)
            assert frame.getchannel('A').getextrema() == (0, 255)
            bb = frame.getchannel('A').getbbox()
            assert bb[0] >= 8 and bb[2] <= 312 and bb[1] >= 8 and bb[3] <= 312, bb
            frames.append(frame)
            source_boxes.append(list(box))
        strip = Image.new('RGBA', (320*count, 320))
        spaced = Image.new('RGBA', (320*count+50*(count-1), 320))
        for i, frame in enumerate(frames):
            strip.alpha_composite(frame, (i*320, 0))
            spaced.alpha_composite(frame, (i*370, 0))
        filename = f'training-dummy-{variant}-sd-{action}-strip.png'
        strip.save(dest / filename, optimize=True)
        spaced.save(review / f'{action}-spaced-50px.png', optimize=True)
        manifest = {'image': filename, 'frameWidth': 320, 'frameHeight': 320,
                    'frameCount': count, 'layout': 'horizontal', 'facing': 'left',
                    'anchor': {'x': 0.5, 'y': 0.975}, 'sourceFrameGapPx': 50,
                    'source': f'../source/{variant}-generated.png', 'sourceBounds': source_boxes,
                    'frameNames': names, 'durationsMs': durations,
                    'frames': [{'name': name, 'durationMs': duration,
                                **({'hit': True} if action == 'attack' and i == 2 else {}),
                                **({'hold': True} if action == 'hit' and i == 2 else {})}
                               for i, (name, duration) in enumerate(zip(names, durations))],
                    'loop': action == 'idle', 'holdLastFrame': action != 'idle'}
        (dest / filename.replace('.png', '.json')).write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
        composite = Image.new('RGB', (count*160, 320))
        for row, color in enumerate(['#F7F7FF', '#5751D8']):
            for i, frame in enumerate(frames):
                bg = Image.new('RGBA', (160, 160), color)
                bg.alpha_composite(frame.resize((160, 160), Image.Resampling.LANCZOS))
                composite.paste(bg.convert('RGB'), (i*160, row*160))
        composite.save(review / f'{action}-light-violet.png')
        frames[0].save(review / f'{action}-preview.webp', save_all=True, append_images=frames[1:],
                       duration=durations, loop=0, lossless=True)
        details[action] = {'frames': count, 'dimensions': list(strip.size), 'sourceBounds': source_boxes}
    Image.open(dest / 'idle/01.png').save(dest / 'identity.png')
    validation['variants'][variant] = details
(ROOT / 'review-validation.json').write_text(json.dumps(validation, indent=2)+'\n', encoding='utf-8')
print(json.dumps(validation, indent=2))
