"""Pack generated Vargas poses without repainting or color-keying costume colors."""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw

BASE = Path(__file__).resolve().parents[1] / 'assets/monsters/vargas'
GAP = 50


def extract(filename, box):
    original = Image.open(BASE / 'source' / filename).convert('RGBA')
    raw = original.crop(box or (0, 0, *original.size))
    # Alpha-only noise cleanup; RGB, white clothing and crystal colors are untouched.
    alpha = np.array(raw.getchannel('A'))
    alpha[alpha <= 16] = 0
    # Generated sheets occasionally contain disconnected one-pixel vertical guide
    # fragments in otherwise empty gutters. Identify by connectivity, never color.
    parent, runs, previous = [], [], []
    def root(n):
        while parent[n] != n:
            parent[n] = parent[parent[n]]
            n = parent[n]
        return n
    for y, row in enumerate(alpha):
        transitions = np.diff(np.r_[False, row > 0, False].astype(np.int8))
        current = []
        for left, right in zip(np.where(transitions == 1)[0], np.where(transitions == -1)[0]):
            label = len(parent)
            parent.append(label)
            for pl, pr, pi in previous:
                if pr >= left and pl <= right:
                    parent[root(pi)] = root(label)
            runs.append((int(left), int(right), y, label))
            current.append((left, right, label))
        previous = current
    components = {}
    for left, right, y, label in runs:
        key = root(label)
        c = components.setdefault(key, [left, y, right, y + 1, 0])
        c[0], c[1] = min(c[0], left), min(c[1], y)
        c[2], c[3], c[4] = max(c[2], right), max(c[3], y + 1), c[4] + right - left
    rejected = {key for key, c in components.items()
                if c[4] <= 8 or (c[2] - c[0] <= 2 and c[3] - c[1] > 40)}
    for left, right, y, label in runs:
        if root(label) in rejected:
            alpha[y, left:right] = 0
    raw.putalpha(Image.fromarray(alpha))
    return raw, {'source': filename, 'sourceBox': list(box) if box else None,
                 'alphaNoiseComponentsRemoved': len(rejected)}


def main():
    contract = json.loads((BASE / 'animation-contract.json').read_text(encoding='utf-8'))
    ready = ('attack.png', (0, 0, 746, 724), .55, 380)
    specs = {
        'idle': [ready, ('idle-revision.png', (0, 0, 1074, 732), .44, 550),
                 ('idle-revision.png', (1074, 0, 2149, 732), .44, 550)],
        'attack': [ready, ('attack.png', (746, 0, 1370, 724), .55, 285),
                   ('attack.png', (1370, 0, 2172, 724), .55, 540)],
        'hit': [('hit.png', (0, 0, 707, 724), .55, 380),
                ('hit.png', (707, 0, 1448, 724), .55, 410),
                ('hit.png', (1448, 0, 2172, 724), .55, 362)],
        'wing': [('wing-draft.png', (0, 0, 695, 724), .50, 370),
                 ('wing-draft.png', (710, 0, 1435, 724), .52, 360),
                 ('wing-contact.png', None, .38, 840)],
        'guard': [ready, ('guard-charge.png', None, .32, 740),
                  ('guard-contact.png', None, .32, 730)]
    }
    mobile = Image.new('RGB', (768, len(specs) * 344), '#f7f7ff')
    draw = ImageDraw.Draw(mobile)
    report = {}
    for row, (action, poses) in enumerate(specs.items()):
        width, height = (576, 384) if action == 'wing' else (480, 352) if action == 'guard' else (640, 320) if action == 'attack' else (480, 320)
        ground = round(height * .975)
        frames, raws, origins = [], [], []
        (BASE / action).mkdir(exist_ok=True)
        (BASE / 'source-frames' / action).mkdir(parents=True, exist_ok=True)
        for i, (filename, box, scale, foot_x) in enumerate(poses):
            raw, origin = extract(filename, box)
            raw.save(BASE / 'source-frames' / action / f'{i+1:02}.png')
            bounds = raw.getbbox()
            assert bounds, (action, i)
            crop = raw.crop(bounds)
            sprite = crop.resize((round(crop.width * scale), round(crop.height * scale)), Image.Resampling.LANCZOS)
            x = round(width / 2 - (foot_x - bounds[0]) * scale)
            y = ground - sprite.height
            assert x >= 8 and x + sprite.width <= width - 8 and y >= 8, (action, i, sprite.size, x, y)
            cell = Image.new('RGBA', (width, height))
            cell.alpha_composite(sprite, (x, y))
            cell.save(BASE / action / f'{i+1:02}.png')
            frames.append(cell)
            raws.append(raw)
            origins.append({**origin, 'foregroundBounds': list(bounds), 'scale': scale,
                            'sourceFootAnchorX': foot_x, 'runtimeBounds': list(cell.getbbox())})
        strip = Image.new('RGBA', (width * 3, height))
        spaced = Image.new('RGBA', (width * 3 + GAP * 2, height))
        for i, cell in enumerate(frames):
            strip.alpha_composite(cell, (i * width, 0))
            spaced.alpha_composite(cell, (i * (width + GAP), 0))
        raw_w, raw_h = max(f.width for f in raws), max(f.height for f in raws)
        master = Image.new('RGBA', (raw_w * 3 + GAP * 2, raw_h))
        for i, raw in enumerate(raws):
            master.alpha_composite(raw, (i * (raw_w + GAP), raw_h - raw.height))
        master.save(BASE / 'source-frames' / f'{action}-master-50px.png')
        stem = f'monster_vargas_sd_{action}_strip'
        strip.save(BASE / f'{stem}.png')
        spaced.save(BASE / 'review' / f'{action}-spaced-50px.png')
        spec = contract['actions'][action]
        meta = {'image': stem + '.png', 'frameWidth': width, 'frameHeight': height, 'frameCount': 3,
                'layout': 'horizontal', 'facing': 'left', 'anchor': contract['anchor'], 'sourceFrameGapPx': GAP,
                'frameIndexBase': 0, 'loop': spec.get('loop', False), 'holdLastFrame': spec.get('holdLastFrame', False),
                'frames': [{'name': name, 'durationMs': spec['durationsMs'][i],
                            **({'hit': True} if spec.get('contactFrameIndex') == i else {}),
                            **({'hold': True} if spec.get('holdLastFrame') and i == 2 else {})}
                           for i, name in enumerate(spec['names'])], 'normalization': origins,
                'userApproved': False, 'browserReviewed': False}
        for key in ['contactFrameIndex', 'contactMs', 'normalHitEndFrameIndex']:
            if key in spec:
                meta[key] = spec[key]
        (BASE / f'{stem}.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        review = Image.new('RGB', (width * 3, height * 2))
        for j, color in enumerate(['#f7f7ff', '#5751d8']):
            bg = Image.new('RGBA', strip.size, color)
            bg.alpha_composite(strip)
            review.paste(bg.convert('RGB'), (0, j * height))
            for i, cell in enumerate(frames):
                # Fixed pixels-per-unit, matching runtime CSS for wide/tall cells.
                thumb = cell.resize((round(width * .4), round(height * .4)), Image.Resampling.LANCZOS)
                small = Image.new('RGBA', (256, 160), color)
                small.alpha_composite(thumb, ((256 - thumb.width) // 2, 160 - thumb.height))
                guide = ImageDraw.Draw(small)
                guide.line((0, 156, 255, 156), fill='#60d9cf88')
                mobile.paste(small.convert('RGB'), (256 * i, row * 344 + 24 + j * 160))
        draw.text((8, row * 344 + 4), action, fill='#24214c')
        review.save(BASE / 'review' / f'{action}-light-violet.png')
        previews = []
        for cell in frames:
            bg = Image.new('RGBA', cell.size, '#5751d8')
            bg.alpha_composite(cell)
            previews.append(bg)
        previews[0].save(BASE / 'review' / f'{action}-preview.webp', save_all=True,
                         append_images=previews[1:], duration=spec['durationsMs'], loop=0 if action == 'idle' else 1)
        for i in range(2):
            x = width + i * (width + GAP)
            assert spaced.crop((x, 0, x + GAP, height)).getbbox() is None
        report[action] = {'stripSize': list(strip.size), 'frameBounds': [list(f.getbbox()) for f in frames],
                          'alphaRange': list(strip.getchannel('A').getextrema()), 'normalization': origins,
                          'reviewGapPx': GAP, 'sourceMasterSize': list(master.size)}
    mobile.save(BASE / 'review/mobile-frame-grid.png')
    (BASE / 'review/validation.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print('Packed 15 Vargas frames, RGBA strips, 50px-gapped masters, light/violet and mobile reviews.')


if __name__ == '__main__':
    main()
