"""Normalize generated female sniper poses using alpha and reviewed source units."""
from pathlib import Path
import json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1] / 'assets/characters/sniper'
CONTRACT = json.loads((ROOT / 'animation-contract.json').read_text(encoding='utf-8'))
WIDTH, HEIGHT, GROUND = 512, 320, 312
SCALE = 264 / 1040
# Foot centers are reviewed separately from long rifles. Prone head scale is
# matched to upright head scale, rather than fitting its shorter bounding height.
ACTIONS = {
    'idle': [('attack-01', 610), ('idle-02', 617)],
    'attack': [('attack-01', 610), ('attack-02', 567), ('attack-03', 517),
               ('attack-04', 540), ('attack-05-v2', 627), ('attack-06-v2', 610)],
    'hit': [('hit-01', 648), ('hit-02-v2', 663), ('hit-03', 626)]
}

for action, entries in ACTIONS.items():
    spec = CONTRACT['actions'][action]
    frames, normalization = [], []
    for index, (name, foot_center) in enumerate(entries):
        path = ROOT / 'source/battle-generation' / (name + '.png')
        source = Image.open(path).convert('RGBA')
        # Remove only near-invisible alpha noise, preserving all costume colors.
        source.putalpha(source.getchannel('A').point(lambda a: 0 if a < 16 else a))
        bounds = source.getchannel('A').getbbox()
        assert bounds and bounds[0] > 0 and bounds[2] < source.width, (name, bounds)
        cropped = source.crop(bounds)
        unit_scale = 1.22 if name == 'hit-03' else 1040 / cropped.height
        scale = SCALE * unit_scale
        resized = cropped.resize((round(cropped.width*scale), round(cropped.height*scale)), Image.Resampling.LANCZOS)
        x = round(WIDTH/2 - (foot_center-bounds[0])*scale)
        y = GROUND-resized.height
        assert x >= 8 and x+resized.width <= WIDTH-8 and y >= 8
        cell = Image.new('RGBA', (WIDTH, HEIGHT))
        cell.alpha_composite(resized, (x, y))
        extracted = ROOT / 'source-frames' / (action+'-female')
        runtime = ROOT / (action+'-female')
        extracted.mkdir(parents=True, exist_ok=True)
        runtime.mkdir(exist_ok=True)
        cropped.save(extracted / f'{index+1:02}.png')
        cell.save(runtime / f'{index+1:02}.png')
        frames.append(cell)
        normalization.append({'source':str(path.relative_to(ROOT)).replace('\\','/'), 'bounds':bounds,
                              'footCenterPx':foot_center, 'sourceUnitScale':unit_scale, 'runtimeScale':SCALE})
    assert len(frames) == spec['frameCount']
    strip = Image.new('RGBA', (WIDTH*len(frames), HEIGHT))
    gapped = Image.new('RGBA', (WIDTH*len(frames)+50*(len(frames)-1), HEIGHT))
    for i, frame in enumerate(frames):
        strip.alpha_composite(frame, (i*WIDTH, 0))
        gapped.alpha_composite(frame, (i*(WIDTH+50), 0))
    for i in range(len(frames)-1):
        assert gapped.getchannel('A').crop((i*(WIDTH+50)+WIDTH,0,i*(WIDTH+50)+WIDTH+50,HEIGHT)).getbbox() is None
    image_name = f'char_sniper_female_sd_{action}_strip.png'
    strip.save(ROOT / image_name)
    review = ROOT / 'review'
    review.mkdir(exist_ok=True)
    gapped.save(review / f'{action}-source-50px.png')
    manifest_frames = []
    for i, (name, duration) in enumerate(zip(spec['names'], spec['durationsMs'])):
        data = {'index':i, 'name':name, 'durationMs':duration}
        if i == spec.get('releaseFrame'): data['release'] = True
        if i == spec.get('hitFrame'): data['hit'] = True
        if action == 'hit' and i == 2: data['finalHold'] = True
        manifest_frames.append(data)
    manifest = {'image':image_name,'frameWidth':WIDTH,'frameHeight':HEIGHT,'frameCount':len(frames),
                'layout':'horizontal','facing':'right','anchor':CONTRACT['anchor'],
                'sourceFrameGapPx':50,'groundLinePx':GROUND,'frames':manifest_frames,
                'projectile':False,'normalization':normalization,
                'reviewStatus':'normalized alpha/bounds verified; browser review pending'}
    if action == 'attack':
        manifest.update({'contactMs':480,'reducedContactMs':160,'finalActive':True,'frame01MatchesIdle':True,
                         'effectBounds':'Target-local CSS impact, no traveling layer'})
    if action == 'idle': manifest['loop'] = 'alternate'
    (ROOT / image_name.replace('.png','.json')).write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    # Full-resolution and actual 120.5px runtime-height composites on both surfaces.
    for display_height, suffix in [(320,'full'), (121,'mobile')]:
        factor = display_height/HEIGHT
        display_width = round(WIDTH*factor)
        composite = Image.new('RGB',(len(frames)*(display_width+8),2*(display_height+16)),'#F7F7FF')
        draw = ImageDraw.Draw(composite)
        draw.rectangle((0,display_height+16,composite.width,composite.height),fill='#5751D8')
        for row in range(2):
            for i, frame in enumerate(frames):
                small = frame.resize((display_width,display_height),Image.Resampling.LANCZOS)
                x,y = i*(display_width+8)+4,row*(display_height+16)+4
                composite.paste(small,(x,y),small)
                draw.rectangle((x,y,x+display_width-1,y+display_height-1),outline='#B3AECF')
                draw.line((x,y+round(GROUND*factor),x+display_width,y+round(GROUND*factor)),fill='#60D9CF')
        composite.save(review / f'{action}-{suffix}-light-violet.png')
    preview = [frame.resize((194,121),Image.Resampling.LANCZOS) for frame in frames]
    if action == 'idle':
        preview = [preview[0],preview[1]]
    preview[0].save(review / f'{action}-preview.webp',save_all=True,append_images=preview[1:],
                    duration=spec['durationsMs'],loop=0,lossless=True)
    print(action, strip.size, 'RGBA; complete bounds; exact 50px review gaps')
