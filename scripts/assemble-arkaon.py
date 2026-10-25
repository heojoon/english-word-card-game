"""Pack reviewed alpha artwork into contiguous runtime slots and 50px-gapped masters."""
from pathlib import Path
import json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'assets/monsters/arkaon'
CELL, GAP, GROUND = 320, 50, 312
SPECS = {
    'idle': {'cuts': [0, 723, 1449, 2172], 'names': ['ready', 'inhale', 'settle'], 'durations': [350, 350, 350]},
    'attack': {'cuts': [0, 680, 1384, 2172], 'names': ['ready', 'wind-up', 'contact'], 'durations': [300, 300, 300], 'hitFrame': 2},
    'hit': {'cuts': [0, 715, 1413, 2172], 'names': ['guard', 'impact', 'knockdown'], 'durations': [140, 180, 600], 'holdLastFrame': True},
    'reorder': {'names': ['charge', 'spread-runes', 'rearrange'], 'durations': [200, 250, 350]}
}

def main():
    report = {}
    mobile = Image.new('RGB', (384, 4 * 260), '#f7f7ff')
    for row, (action, spec) in enumerate(SPECS.items()):
        source = Image.open(BASE / 'source' / f'{action}.png').convert('RGBA')
        # Alpha-only removal of imperceptible generator noise; never color-key white armor.
        source.putalpha(source.getchannel('A').point(lambda a: 0 if a <= 8 else a))
        cuts = spec.get('cuts')
        if cuts is None:
            # Three independently isolated poses with broad empty gutters.
            alpha = source.getchannel('A')
            empty = [x for x in range(source.width) if alpha.crop((x, 0, x+1, source.height)).getextrema()[1] <= 8]
            cuts = [0]
            for target in [source.width/3, source.width*2/3]:
                candidates = [x for x in empty if abs(x-target) < source.width*.12]
                assert candidates, 'Regenerate crowded poses instead of clipping a character'
                cuts.append(min(candidates, key=lambda x: abs(x-target)))
            cuts.append(source.width)
        raws = [source.crop((cuts[i], 0, cuts[i+1], source.height)) for i in range(3)]
        bounds = [im.getbbox() for im in raws]
        # Use one common scale per sequence; the complete first pose sets the standing scale.
        factor = min(240/(bounds[0][3]-bounds[0][1]), 300/max(b[2]-b[0] for b in bounds))
        frames, transforms = [], []
        raw_w, raw_h = max(im.width for im in raws), source.height
        master = Image.new('RGBA', (3*raw_w+2*GAP, raw_h))
        strip = Image.new('RGBA', (3*CELL, CELL))
        spaced = Image.new('RGBA', (3*CELL+2*GAP, CELL))
        for i, (raw, box) in enumerate(zip(raws, bounds)):
            (BASE/'source-frames'/action).mkdir(parents=True, exist_ok=True)
            (BASE/action).mkdir(exist_ok=True)
            raw.save(BASE/'source-frames'/action/f'{i+1:02}.png')
            master.alpha_composite(raw, (i*(raw_w+GAP)+(raw_w-raw.width)//2, 0))
            crop = raw.crop(box)
            sprite = crop.resize((round(crop.width*factor), round(crop.height*factor)), Image.Resampling.LANCZOS)
            cell = Image.new('RGBA', (CELL, CELL))
            cell.alpha_composite(sprite, ((CELL-sprite.width)//2, GROUND-sprite.height))
            assert cell.getbbox()[0] >= 8 and cell.getbbox()[2] <= CELL-8
            assert cell.getbbox()[1] >= 8 and cell.getbbox()[3] <= GROUND
            cell.save(BASE/action/f'{i+1:02}.png')
            strip.alpha_composite(cell, (i*CELL, 0))
            spaced.alpha_composite(cell, (i*(CELL+GAP), 0))
            frames.append(cell)
            transforms.append({'sourceBox': [cuts[i], 0, cuts[i+1], source.height], 'foregroundBounds': list(box), 'scale': factor, 'runtimeBounds': list(cell.getbbox())})
        name = f'monster_arkaon_sd_{action}_strip'
        strip.save(BASE/f'{name}.png')
        spaced.save(BASE/'review'/f'{action}-spaced-50px.png')
        master.save(BASE/'source-frames'/f'{action}-master-50px.png')
        meta = {'image': name+'.png', 'frameWidth': CELL, 'frameHeight': CELL, 'frameCount': 3, 'layout': 'horizontal', 'facing': 'left', 'anchor': {'x': .5, 'y': .975}, 'sourceFrameGapPx': GAP, 'loop': action=='idle', 'holdLastFrame': spec.get('holdLastFrame', False), 'frames': [{'name': n, 'durationMs': spec['durations'][i], **({'hit': True} if spec.get('hitFrame')==i else {}), **({'hold': True} if action=='hit' and i==2 else {})} for i,n in enumerate(spec['names'])], 'normalization': transforms, 'userApproved': False}
        (BASE/f'{name}.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
        review = Image.new('RGB', (960, 640))
        for j,color in enumerate(['#f7f7ff','#5751d8']):
            bg = Image.new('RGBA', strip.size, color);bg.alpha_composite(strip);review.paste(bg.convert('RGB'), (0,j*320))
            for i,cell in enumerate(frames):
                small=Image.new('RGBA',(128,128),color);small.alpha_composite(cell.resize((128,128),Image.Resampling.LANCZOS));mobile.paste(small.convert('RGB'),(i*128,row*260+j*128))
        review.save(BASE/'review'/f'{action}-alpha-review.png')
        preview=[]
        for cell in frames:
            bg=Image.new('RGBA',(320,320),'#5751d8');bg.alpha_composite(cell);preview.append(bg.convert('RGB'))
        preview[0].save(BASE/'review'/f'{action}-preview.webp',save_all=True,append_images=preview[1:],duration=spec['durations'],loop=0 if action=='idle' else 1)
        for x in [CELL,2*CELL+GAP]:assert spaced.crop((x,0,x+GAP,CELL)).getbbox() is None
        report[action]={'size':list(strip.size),'sourceSize':list(source.size),'frames':transforms,'alpha':list(strip.getchannel('A').getextrema()),'spacedWidth':spaced.width}
    mobile.save(BASE/'review'/'mobile-frame-grid.png')
    standing=Image.open(BASE/'source'/'standing.png').convert('RGBA')
    standing.save(ROOT/'assets/novel/characters/char_arkaon_world7c_standing.webp',quality=93,method=6)
    (BASE/'animation-contract.json').write_text(json.dumps({'name':'봉인 병기 아르카온','facing':'left','frameWidth':320,'frameHeight':320,'anchor':{'x':.5,'y':.975},'sourceFrameGapPx':50,'contactMs':600,'actions':SPECS},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (BASE/'review'/'validation.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print('Packed 12 RGBA frames, four runtime strips, alpha composites and 50px-gapped masters.')

if __name__=='__main__':main()
