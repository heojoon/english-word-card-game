"""Normalize generated Blackroot Elder poses; never repaint or color-key artwork."""
from pathlib import Path
import json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'assets/monsters/blackroot-elder'
CELL, GAP, GROUND = 384, 50, 374


def extract(filename, count, index):
    source = Image.open(BASE / 'source' / filename).convert('RGBA')
    cuts = [0]
    alpha = source.getchannel('A')
    for j in range(1, count):
        target = source.width * j / count
        if j not in (index, index + 1):
            cuts.append(round(target))
            continue
        candidates = [x for x in range(int(target - 75), int(target + 75))
                      if alpha.crop((x, 0, x + 1, source.height)).getextrema()[1] <= 16]
        assert candidates, f'Overlapping poses: regenerate {filename}'
        cuts.append(min(candidates, key=lambda x: abs(x - target)))
    cuts.append(source.width)
    raw = source.crop((cuts[index], 0, cuts[index + 1], source.height))
    # Alpha-only cleanup of nearly invisible generator noise; retain wood and magic colors.
    raw.putalpha(raw.getchannel('A').point(lambda a: 0 if a <= 16 else a))
    bounds = raw.getbbox()
    assert bounds and bounds[0] > 0 and bounds[2] < raw.width, filename
    return raw, {'file': filename, 'sourceSize': list(source.size),
                 'sourceBox': [cuts[index], 0, cuts[index + 1], source.height]}


def main():
    contract = json.loads((BASE / 'animation-contract.json').read_text(encoding='utf-8'))
    ready = ('attack.png', 3, 0, 300 / 568)
    specs = {
        'idle': [ready, ('idle-revision.png', 2, 0, 300 / 790), ('idle-revision.png', 2, 1, 300 / 724)],
        'attack': [ready, ('attack-revision.png', 2, 0, 300 / 730), ('attack-revision.png', 2, 1, 300 / 700)],
        'hit': [('hit.png', 3, i, 300 / 605) for i in range(3)],
        'roots': [('roots.png', 3, i, 300 / 630) for i in range(3)],
        'guard': [('guard.png', 3, i, 300 / 695) for i in range(3)]
    }
    (BASE / 'review').mkdir(exist_ok=True)
    mobile = Image.new('RGB', (3 * 128, 5 * 280), '#f7f7ff')
    draw = ImageDraw.Draw(mobile)
    report = {}
    for row, (action, items) in enumerate(specs.items()):
        width = 448 if action == 'attack' else CELL
        (BASE / action).mkdir(exist_ok=True)
        (BASE / 'source-frames' / action).mkdir(parents=True, exist_ok=True)
        strip = Image.new('RGBA', (3 * width, CELL))
        spaced = Image.new('RGBA', (3 * width + 2 * GAP, CELL))
        frames, raw_frames, transforms = [], [], []
        for i, (filename, count, index, scale) in enumerate(items):
            raw, origin = extract(filename, count, index)
            raw.save(BASE / 'source-frames' / action / f'{i+1:02}.png')
            raw_frames.append(raw)
            box = raw.getbbox()
            crop = raw.crop(box)
            sprite = crop.resize((round(crop.width * scale), round(crop.height * scale)), Image.Resampling.LANCZOS)
            cell = Image.new('RGBA', (width, CELL))
            assert sprite.width <= width - 16 and sprite.height <= GROUND - 8, (action, i, sprite.size)
            cell.alpha_composite(sprite, ((width - sprite.width) // 2, GROUND - sprite.height))
            cell.save(BASE / action / f'{i+1:02}.png')
            strip.alpha_composite(cell, (i * width, 0))
            spaced.alpha_composite(cell, (i * (width + GAP), 0))
            frames.append(cell)
            transforms.append({**origin, 'foregroundBounds': list(box), 'scale': scale, 'runtimeBounds': list(cell.getbbox())})
        raw_size = (max(f.width for f in raw_frames), max(f.height for f in raw_frames))
        master = Image.new('RGBA', (3 * raw_size[0] + 2 * GAP, raw_size[1]))
        for i, raw in enumerate(raw_frames):
            master.alpha_composite(raw, (i * (raw_size[0] + GAP) + (raw_size[0] - raw.width) // 2, raw_size[1] - raw.height))
        master.save(BASE / 'source-frames' / f'{action}-master-50px.png')
        stem = f'monster_blackroot_elder_sd_{action}_strip'
        strip.save(BASE / f'{stem}.png')
        spaced.save(BASE / 'review' / f'{action}-spaced-50px.png')
        spec = contract['actions'][action]
        meta = {'image': stem + '.png', 'frameWidth': width, 'frameHeight': CELL,
                'frameCount': 3, 'layout': 'horizontal', 'facing': 'left', 'anchor': contract['anchor'],
                'sourceFrameGapPx': GAP, 'loop': spec.get('loop', False),
                'holdLastFrame': spec.get('holdLastFrame', False), 'frameIndexBase': 0,
                'frames': [{'name': name, 'durationMs': spec['durationsMs'][i],
                            **({'hit': True} if spec.get('contactFrameIndex') == i else {}),
                            **({'hold': True} if spec.get('holdLastFrame') and i == 2 else {})}
                           for i, name in enumerate(spec['names'])],
                'normalization': transforms, 'userApproved': False, 'browserReviewed': False}
        for key in ['contactFrameIndex', 'contactMs', 'normalHitEndFrameIndex']:
            if key in spec:
                meta[key] = spec[key]
        (BASE / f'{stem}.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        review = Image.new('RGB', (width * 3, CELL * 2))
        for j, color in enumerate(['#f7f7ff', '#5751d8']):
            bg = Image.new('RGBA', strip.size, color)
            bg.alpha_composite(strip)
            review.paste(bg.convert('RGB'), (0, j * CELL))
            for i, cell in enumerate(frames):
                small = Image.new('RGBA', (128, 128), color)
                thumb = cell.copy()
                thumb.thumbnail((128, 128), Image.Resampling.LANCZOS)
                small.alpha_composite(thumb, ((128-thumb.width)//2, 128-thumb.height))
                mobile.paste(small.convert('RGB'), (128 * i, row * 280 + 20 + j * 128))
        draw.text((8, row * 280 + 3), action, fill='#24214c')
        review.save(BASE / 'review' / f'{action}-light-violet.png')
        previews = []
        for cell in frames:
            bg = Image.new('RGBA', cell.size, '#5751d8')
            bg.alpha_composite(cell)
            previews.append(bg.convert('RGB'))
        previews[0].save(BASE / 'review' / f'{action}-preview.webp', save_all=True,
                         append_images=previews[1:], duration=spec['durationsMs'], loop=0 if action == 'idle' else 1)
        for i in range(2):
            x = width + i * (width + GAP)
            assert spaced.crop((x, 0, x + GAP, CELL)).getbbox() is None
        report[action] = {'stripSize': list(strip.size), 'alphaRange': list(strip.getchannel('A').getextrema()),
                          'frameBounds': [list(f.getbbox()) for f in frames],
                          'reviewGapPx': GAP, 'sourceMasterSize': list(master.size), 'normalization': transforms}
    mobile.save(BASE / 'review/mobile-frame-grid.png')
    (BASE / 'review/validation.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print('Packed 15 RGBA frames, 5 runtime strips and separate 50px-gapped masters; alpha and bounds checks passed.')


if __name__ == '__main__':
    main()
