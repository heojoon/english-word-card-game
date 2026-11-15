"""Extract generated RGBA scout poses and pack deterministic runtime strips."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / 'assets/monsters/world-10/starlight-scout'
ACTIONS = {
    'idle': (['ready', 'lens-adjust'], [600, 600]),
    'attack': (['ready', 'anticipation', 'punch-contact'], [120, 120, 260]),
    'hit': (['notice', 'impact', 'complete-down'], [100, 100, 300]),
}

def boxes(image, count):
    # Projection locates separated poses without color-keying white armor.
    alpha = image.getchannel('A')
    pixels = alpha.load()
    occupied = [sum(pixels[x, y] > 16 for y in range(image.height)) > 3 for x in range(image.width)]
    spans, start = [], None
    for x, active in enumerate(occupied + [False]):
        if active and start is None:
            start = x
        if not active and start is not None:
            if x - start > 40:
                spans.append((start, x))
            start = None
    assert len(spans) == count, spans
    result = []
    for left, right in spans:
        bounds = alpha.crop((left, 0, right, image.height)).point(lambda a: 255 if a > 16 else 0).getbbox()
        result.append((max(0, left-2), max(0, bounds[1]-2), min(image.width, right+2), min(image.height, bounds[3]+2)))
    return result

validation = {'frameSize': [320, 320], 'groundLinePx': 312, 'sourceFrameGapPx': 50, 'actions': {}}
for action, (names, durations) in ACTIONS.items():
    image = Image.open(ROOT / f'source/{action}-generated.png')
    assert image.mode == 'RGBA'
    bounds = boxes(image, len(names))
    # Source sheets differ in resolution. Match standing height, not canvas size;
    # keep one scale within each action, including the horizontal down pose.
    scale = min(286 / (bounds[0][3]-bounds[0][1]),
                304 / max(b[2]-b[0] for b in bounds),
                304 / max(b[3]-b[1] for b in bounds))
    frames = []
    for i, box in enumerate(bounds):
        raw = image.crop(box)
        for folder in ['source-frames', action]:
            (ROOT / folder / action if folder == 'source-frames' else ROOT / folder).mkdir(parents=True, exist_ok=True)
        raw.save(ROOT / f'source-frames/{action}/{i+1:02}.png')
        pose = raw.resize((round(raw.width*scale), round(raw.height*scale)), Image.Resampling.LANCZOS)
        frame = Image.new('RGBA', (320, 320))
        frame.alpha_composite(pose, ((320-pose.width)//2, 312-pose.height))
        bb = frame.getchannel('A').getbbox()
        assert bb[0] >= 8 and bb[1] >= 8 and bb[2] <= 312 and bb[3] <= 312, bb
        assert frame.getchannel('A').getextrema() == (0, 255)
        frame.save(ROOT / f'{action}/{i+1:02}.png', optimize=True)
        frames.append(frame)
    review = ROOT / 'review'
    review.mkdir(exist_ok=True)
    strip = Image.new('RGBA', (320*len(frames), 320))
    spaced = Image.new('RGBA', (320*len(frames)+50*(len(frames)-1), 320))
    composite = Image.new('RGB', (160*len(frames), 320))
    for i, frame in enumerate(frames):
        strip.alpha_composite(frame, (320*i, 0))
        spaced.alpha_composite(frame, (370*i, 0))
        for row, color in enumerate(['#F7F7FF', '#5751D8']):
            bg = Image.new('RGBA', (160, 160), color)
            bg.alpha_composite(frame.resize((160, 160), Image.Resampling.LANCZOS))
            composite.paste(bg.convert('RGB'), (160*i, 160*row))
    filename = f'starlight-scout-sd-{action}-strip.png'
    strip.save(ROOT / filename, optimize=True)
    spaced.save(review / f'{action}-spaced-50px.png', optimize=True)
    composite.save(review / f'{action}-light-violet.png')
    frames[0].save(review / f'{action}-preview.webp', save_all=True, append_images=frames[1:], duration=durations, loop=0, lossless=True)
    manifest = {'image': filename, 'frameWidth': 320, 'frameHeight': 320, 'frameCount': len(frames),
                'layout': 'horizontal', 'facing': 'left', 'anchor': {'x': 0.5, 'y': 0.975},
                'source': f'source/{action}-generated.png', 'sourceFrameGapPx': 50,
                'sourceBounds': bounds, 'scale': scale, 'frameNames': names, 'durationsMs': durations,
                'frames': [{'name': name, 'durationMs': duration,
                            **({'hit': True} if action == 'attack' and i == 2 else {}),
                            **({'hold': True} if action == 'hit' and i == 2 else {})}
                           for i, (name, duration) in enumerate(zip(names, durations))],
                'loop': action == 'idle', 'holdLastFrame': action != 'idle'}
    (ROOT / filename.replace('.png', '.json')).write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
    validation['actions'][action] = {'sourceSize': image.size, 'sourceBounds': bounds, 'scale': scale,
                                     'runtimeSize': strip.size, 'alphaExtrema': strip.getchannel('A').getextrema()}
validation['sourceNote'] = 'Generator returned different resolutions and approximate gutters. Exact 50px transparent gutters reconstructed in review sheets; runtime slots contiguous.'
(ROOT / 'review/validation.json').write_text(json.dumps(validation, indent=2)+'\n', encoding='utf-8')
print(json.dumps(validation, indent=2))
