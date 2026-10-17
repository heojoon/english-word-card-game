"""Pack reviewed Snow Crystal poses without altering their generated artwork."""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFilter, ImageChops

ROOT = Path(__file__).resolve().parents[1] / 'assets/characters/sniper/snow-crystal-skin'
contract = json.loads((ROOT / 'animation-contract.json').read_text(encoding='utf-8'))
poses = json.loads((ROOT / 'source/battle-generation/poses.json').read_text(encoding='utf-8'))
W, H, GROUND = 512, 320, 312
review = ROOT / 'review'
review.mkdir(exist_ok=True)

for action, spec in contract['actions'].items():
    frames, records = [], []
    for i, pose in enumerate(poses[action]):
        source = ROOT / pose['source']
        im = Image.open(source).convert('RGBA')
        # Keep alpha near the visible silhouette, including its antialiasing.
        # Generated originals contain near-invisible noise far from the subject.
        # This mask uses alpha only, never costume colors or a color key.
        alpha = im.getchannel('A')
        support = alpha.point(lambda a: 255 if a >= 32 else 0).filter(ImageFilter.MaxFilter(5))
        im.putalpha(ImageChops.multiply(alpha, support))
        bounds = im.getchannel('A').getbbox()
        assert bounds, source
        extracted = im.crop(bounds)
        scale = pose['runtimeScale'] * pose['sourceUnitScale']
        size = (round(extracted.width * scale), round(extracted.height * scale))
        small = extracted.resize(size, Image.Resampling.LANCZOS)
        x = round(W / 2 - (pose['anchorX'] - bounds[0]) * scale)
        y = GROUND - small.height
        assert x >= 8 and x + small.width <= W - 8 and y >= 8, (source, size, x, y)
        cell = Image.new('RGBA', (W, H))
        cell.alpha_composite(small, (x, y))
        for directory, image in [('source-frames/' + action + '-female', extracted), (action + '-female', cell)]:
            folder = ROOT / directory
            folder.mkdir(parents=True, exist_ok=True)
            image.save(folder / f'{i+1:02}.png')
        frames.append(cell)
        pose['sourceBounds'] = list(bounds)
        pose['runtimeBounds'] = list(cell.getchannel('A').getbbox())
        record = {'index': i, 'name': spec['names'][i], 'durationMs': spec['durationsMs'][i]}
        if i == spec.get('releaseFrame'): record['release'] = True
        if i == spec.get('hitFrame'): record['hit'] = True
        if action == 'hit' and i == 2: record['finalHold'] = True
        records.append(record)
    assert len(frames) == spec['frameCount']
    strip = Image.new('RGBA', (W * len(frames), H))
    spaced = Image.new('RGBA', (W * len(frames) + 50 * (len(frames)-1), H))
    for i, frame in enumerate(frames):
        strip.alpha_composite(frame, (i*W, 0))
        spaced.alpha_composite(frame, (i*(W+50), 0))
    for i in range(len(frames)-1):
        assert spaced.getchannel('A').crop((i*(W+50)+W, 0, i*(W+50)+W+50, H)).getbbox() is None
    filename = f'char_sniper_female_snow_crystal_sd_{action}_strip.png'
    strip.save(ROOT / filename)
    spaced.save(review / f'{action}-source-50px.png')
    manifest = {'image': filename, 'frameWidth': W, 'frameHeight': H, 'frameCount': len(frames),
                'layout': 'horizontal', 'facing': 'right', 'anchor': contract['anchor'],
                'sourceFrameGapPx': 50, 'groundLinePx': GROUND, 'frames': records,
                'alphaCleanup': 'Alpha >=32 support expanded 2px, retains source edge alpha; no RGB color key',
                'normalization': poses[action], 'projectile': False,
                'reviewStatus': 'Asset review only; not registered in production runtime'}
    if action == 'attack':
        manifest.update({'contactMs':480, 'reducedContactMs':160, 'finalActive':True,
                         'frame01MatchesIdle':True, 'impact':'target-local hitscan crystal flash'})
    if action == 'idle': manifest['loop'] = 'alternate'
    if action == 'hit': manifest['finalHold'] = True
    (ROOT / filename.replace('.png', '.json')).write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
    for height, suffix in [(320, 'full'), (121, 'mobile')]:
        width = round(W * height/H)
        composite = Image.new('RGB', ((width+8)*len(frames), (height+28)*2), '#F7F7FF')
        draw = ImageDraw.Draw(composite)
        draw.rectangle((0, height+28, composite.width, composite.height), fill='#5751D8')
        for row in range(2):
            for i, frame in enumerate(frames):
                small = frame.resize((width, height), Image.Resampling.LANCZOS)
                x, y = i*(width+8)+4, row*(height+28)+20
                composite.paste(small, (x,y), small)
                draw.rectangle((x,y,x+width-1,y+height-1), outline='#B3AECF')
                draw.line((x,y+round(GROUND*height/H),x+width-1,y+round(GROUND*height/H)), fill='#60D9CF')
                draw.text((x,y-16), str(i+1)+': '+spec['names'][i], fill='#24214C' if row==0 else 'white')
        composite.save(review / f'{action}-{suffix}-light-violet.png')
    durations = list(spec['durationsMs'])
    if action == 'hit': durations[-1] = 1800
    preview = [f.resize((384,240),Image.Resampling.LANCZOS) for f in frames]
    preview[0].save(review / f'{action}-preview.webp', save_all=True, append_images=preview[1:],
                    duration=durations, loop=0, lossless=True)
    print(action, strip.size, 'RGBA; exact 50px review gaps; bounds passed')
