"""Pack reviewed isolated violet-crystal ranger poses; preserve their RGBA alpha."""
from pathlib import Path
import json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1] / 'assets/characters/ranger/violet-crystal-skin'
CONTRACT = json.loads((ROOT / 'animation-contract.json').read_text(encoding='utf-8'))
GROUND = 312

def subject(path, bounds=None):
    im = Image.open(path).convert('RGBA')
    if bounds:
        im = im.crop(bounds)
    # Alpha-only cleanup; never key out white costume or violet crystals.
    im.putalpha(im.getchannel('A').point(lambda a: 0 if a < 16 else a))
    box = im.getchannel('A').getbbox()
    if not box:
        raise ValueError(f'Empty frame: {path}')
    return im.crop(box)

config = json.loads((ROOT / 'source/extraction.json').read_text(encoding='utf-8'))
for action, entries in config['actions'].items():
    specification = CONTRACT['actions'][action]
    width, height = (320, 320) if action == 'projectile' else (480, 320)
    frames = []
    for index, entry in enumerate(entries):
        im = subject(ROOT / 'source' / entry['file'], entry.get('bounds'))
        extracted = ROOT / 'source-frames' / action
        extracted.mkdir(parents=True, exist_ok=True)
        im.save(extracted / f'{index+1:02}.png')
        # Source generators can return different resolutions. Explicit reviewed
        # source-unit scales normalize identity size before the common runtime scale.
        scale = entry['sourceUnitScale'] * config['runtimeScale'][action]
        resized = im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.LANCZOS)
        assert resized.width <= width-16 and resized.height <= height-16, (action, index, resized.size)
        canvas = Image.new('RGBA', (width, height))
        y = (height-resized.height)//2 if action == 'projectile' else GROUND-resized.height
        canvas.alpha_composite(resized, ((width-resized.width)//2, y))
        box = canvas.getchannel('A').getbbox()
        assert box[0] >= 8 and box[2] <= width-8 and box[1] >= 8 and box[3] <= height-8
        target = ROOT / action
        target.mkdir(exist_ok=True)
        canvas.save(target / f'{index+1:02}.png')
        frames.append(canvas)
    assert len(frames) == specification['frameCount']
    strip = Image.new('RGBA', (width*len(frames), height))
    gapped = Image.new('RGBA', (width*len(frames)+50*(len(frames)-1), height))
    for index, frame in enumerate(frames):
        strip.alpha_composite(frame, (index*width, 0))
        gapped.alpha_composite(frame, (index*(width+50), 0))
    review = ROOT / 'review'
    review.mkdir(exist_ok=True)
    strip.save(ROOT / specification['image'])
    gapped.save(review / f'{action}-source-50px.png')
    events = []
    for index, (name, duration) in enumerate(zip(specification['names'], specification['durationsMs'])):
        event = {'index':index, 'name':name, 'durationMs':duration}
        if index == specification.get('releaseFrame'): event['release'] = True
        if index == specification.get('hitFrame'): event['hit'] = True
        if action == 'hit' and index == len(frames)-1: event['finalHold'] = True
        events.append(event)
    manifest = {'image':specification['image'], 'frameWidth':width, 'frameHeight':height,
                'frameCount':len(frames), 'layout':'horizontal', 'facing':'right',
                'anchor':specification.get('anchor', CONTRACT['anchor']), 'sourceFrameGapPx':50,
                'groundLinePx':None if action == 'projectile' else GROUND,
                'frames':events, 'normalization':entries,
                'reviewStatus':'offline reviewed; browser review pending'}
    (ROOT / specification['image'].replace('.png', '.json')).write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
    display_width = round(width*.42)
    display_height = round(height*.42)
    composite = Image.new('RGB', (len(frames)*(display_width+8), 2*(display_height+16)), '#F7F7FF')
    draw = ImageDraw.Draw(composite)
    draw.rectangle((0, display_height+16, composite.width, composite.height), fill='#5751D8')
    for row in range(2):
        for index, frame in enumerate(frames):
            small = frame.resize((display_width,display_height),Image.Resampling.LANCZOS)
            x, y = index*(display_width+8)+4, row*(display_height+16)+4
            composite.paste(small, (x,y), small)
            draw.rectangle((x,y,x+display_width-1,y+display_height-1), outline='#B3AECF')
            draw.line((x,y+round(GROUND*.42),x+display_width,y+round(GROUND*.42)),fill='#60D9CF')
    composite.save(review / f'{action}-mobile-light-violet.png')
    preview = [frame.resize((display_width,display_height),Image.Resampling.LANCZOS) for frame in frames]
    preview[0].save(review / f'{action}-preview.webp',save_all=True,append_images=preview[1:],duration=specification['durationsMs'],loop=0,lossless=True)
    print(action, strip.size, 'safe bounds and alpha verified; review gaps exactly 50px')
Image.open(ROOT / 'attack/01.png').save(ROOT / 'char_ranger_female_violet_crystal_sd_idle.png')
