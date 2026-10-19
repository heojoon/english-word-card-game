"""Pack generated three-pose sheets without color-keying or repainting artwork.

Usage: python scripts/assemble-abyss-golem.py
Source selection/scale are recorded in source/layouts.json after visual review.
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1] / 'assets/monsters/abyss-golem'
CELL, GAP, GROUND = 320, 50, 312
LABELS = {'idle': '대기', 'attack': '스매시', 'ground-stamping': '그라운드 스탬핑',
          'bedrock-rise': '배드락라이즈', 'hit': '피격 / 다운'}


def main():
    contract = json.loads((ROOT / 'animation-contract.json').read_text(encoding='utf-8'))
    layouts = json.loads((ROOT / 'source/layouts.json').read_text(encoding='utf-8'))
    mobile = Image.new('RGB', (384, len(layouts) * 146), '#f7f7ff')
    report = {}
    for row, (action, layout) in enumerate(layouts.items()):
        source = Image.open(ROOT / layout['source']).convert('RGBA')
        assert source.getchannel('A').getextrema() == (0, 255), 'True alpha required'
        spec = contract['actions'][action]
        CELL = spec.get('frameWidth', 320)
        GROUND = round(CELL * 0.975)
        count = len(spec['frameNames'])
        assert len(layout['boxes']) == count == 3
        folder = ROOT / action
        raw_folder = ROOT / 'source-frames' / action
        folder.mkdir(parents=True, exist_ok=True)
        raw_folder.mkdir(parents=True, exist_ok=True)
        strip = Image.new('RGBA', (CELL * count, CELL))
        spaced = Image.new('RGBA', (CELL * count + (count - 1) * GAP, CELL))
        effective_boxes = [layout.get('overrides', {}).get(str(i), {}).get('box', box)
                           for i, box in enumerate(layout['boxes'])]
        source_width = max(box[2] - box[0] for box in effective_boxes)
        source_height = max(box[3] - box[1] for box in effective_boxes)
        source_spaced = Image.new('RGBA', (source_width * count + (count - 1) * GAP, source_height))
        frames, transforms = [], []
        for i, box in enumerate(layout['boxes']):
            override = layout.get('overrides', {}).get(str(i))
            frame_source = Image.open(ROOT / override['source']).convert('RGBA') if override else source
            raw = frame_source.crop(tuple(override['box'] if override else box))
            # Preserve painted stone/crystals; remove only alpha <= 8 generation noise.
            raw.putalpha(raw.getchannel('A').point(lambda value: 0 if value <= 8 else value))
            # Explicitly reviewed neighbor slivers in otherwise empty safety bands only.
            for rect in layout.get('confirmedNeighborFragments', {}).get(str(i), []):
                raw.paste((0, 0, 0, 0), tuple(rect))
            raw.save(raw_folder / f'{i+1:02}.png')
            source_spaced.alpha_composite(raw, (i * (source_width + GAP), 0))
            bounds = raw.getbbox()
            assert bounds, (action, i, 'empty frame')
            crop = raw.crop(bounds)
            scale = override['scale'] if override else layout['scale']
            resized = crop.resize((round(crop.width * scale), round(crop.height * scale)), Image.Resampling.LANCZOS)
            assert resized.width <= CELL - 16 and resized.height <= CELL - 16, (action, i, resized.size)
            cell = Image.new('RGBA', (CELL, CELL))
            y = GROUND - resized.height + layout.get('yOffsets', [0, 0, 0])[i]
            assert y >= 8 and y + resized.height <= GROUND
            cell.alpha_composite(resized, ((CELL - resized.width) // 2, y))
            bbox = cell.getbbox()
            assert bbox[0] >= 8 and bbox[2] <= CELL - 8, (action, i, bbox)
            cell.save(folder / f'{i+1:02}.png')
            strip.alpha_composite(cell, (i * CELL, 0))
            spaced.alpha_composite(cell, (i * (CELL + GAP), 0))
            transforms.append({'source': override['source'] if override else layout['source'],
                               'sourceBox': override['box'] if override else box, 'foregroundBounds': list(bounds), 'scale': scale,
                               'runtimeBounds': list(bbox)})
            frames.append(cell)
        base = 'monster_abyss_golem_sd_' + action.replace('-', '_') + '_strip'
        strip.save(ROOT / (base + '.png'))
        spaced.save(ROOT / 'review' / f'{action}-spaced-50px.png')
        source_spaced.save(ROOT / 'source-frames' / f'{action}-spaced-50px.png')
        for gutter in range(count - 1):
            x = (gutter + 1) * CELL + gutter * GAP
            assert spaced.crop((x, 0, x + GAP, CELL)).getbbox() is None
        manifest = {'image': base + '.png', 'actionLabel': LABELS[action],
                    'frameWidth': CELL, 'frameHeight': CELL, 'frameCount': count,
                    'layout': 'horizontal', 'anchor': contract['anchor'], 'facing': 'left',
                    'sourceFrameGapPx': GAP, 'generatedSource': layout['source'],
                    'loop': spec.get('loop', False), 'holdLastFrame': spec.get('holdLastFrame', False),
                    'frames': [{'name': name, 'durationMs': spec['durationMs'][i],
                                **({'hit': True} if i == spec.get('hitFrame') else {}),
                                **({'hold': True} if i == count-1 and spec.get('holdLastFrame') else {})}
                               for i, name in enumerate(spec['frameNames'])],
                    'normalization': transforms,
                    'reviewStatus': 'Alpha and packing checked; visual review recorded in README; production integration pending'}
        (ROOT / (base + '.json')).write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        review = Image.new('RGB', (CELL * count, CELL * 2))
        previews = []
        for j, color in enumerate(['#f7f7ff', '#5751d8']):
            bg = Image.new('RGBA', strip.size, color)
            bg.alpha_composite(strip)
            review.paste(bg.convert('RGB'), (0, j * CELL))
        review.save(ROOT / 'review' / f'{action}-alpha-review.png')
        for i, cell in enumerate(frames):
            bg = Image.new('RGBA', (CELL, CELL), '#5751d8')
            bg.alpha_composite(cell)
            previews.append(bg)
            size = round(CELL * 0.35)
            thumb = Image.new('RGBA', (128, 128))
            thumb.alpha_composite(cell.resize((size, size), Image.Resampling.LANCZOS),
                                  ((128-size)//2, 126-round(GROUND*0.35)))
            mobile.paste(thumb, (i * 128, row * 146 + 18), thumb)
        previews[0].save(ROOT / 'review' / f'{action}-preview.webp', save_all=True,
                         append_images=previews[1:], duration=spec['durationMs'], loop=0, lossless=True)
        draw = ImageDraw.Draw(mobile)
        draw.text((4, row * 146 + 2), action, fill='#24214c')
        for i in range(3):
            draw.rectangle((i*128, row*146+18, (i+1)*128-1, (row+1)*146-1), outline='#c9c4ff')
            draw.line((i*128, row*146+143, (i+1)*128-1, row*146+143), fill='#60d9cf')
        report[action] = {'sheetSize': list(source.size), 'runtimeSize': list(strip.size),
                          'spacedSize': list(spaced.size), 'bounds': [x['runtimeBounds'] for x in transforms]}
    mobile.save(ROOT / 'review/mobile-frame-grid.png')
    (ROOT / 'review/validation.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
