"""Pack generated RGBA Elliot frames, retaining sources and exact 50px review gutters.

This only crops source slots and applies recorded uniform scale/translation; no
color key, body deformation, painted pixels or synthetic motion frames.
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1] / 'assets/monsters/elliot'
W, H, GAP, GROUND = 448, 320, 50, 300


def main():
    contract = json.loads((ROOT / 'animation-contract.json').read_text(encoding='utf-8'))
    layouts = json.loads((ROOT / 'source/layouts.json').read_text(encoding='utf-8'))
    report = {'review': 'technical and frame composites; browser not requested', 'actions': {}}
    mobile = Image.new('RGB', (672, len(layouts) * 340), '#f7f7ff')
    for row, (action, layout) in enumerate(layouts.items()):
        spec = contract['actions'][action]
        frames, raw_frames, transforms = [], [], []
        for index, pose in enumerate(layout):
            source = Image.open(ROOT / pose['source']).convert('RGBA')
            raw = source.crop(tuple(pose['box'])) if 'box' in pose else source.copy()
            # Only discard near-transparent generation specks, never RGB/white clothing.
            raw.putalpha(raw.getchannel('A').point(lambda a: 0 if a <= 8 else a))
            assert raw.getchannel('A').getextrema()[0] == 0
            bounds = raw.getbbox()
            assert bounds
            crop = raw.crop(bounds)
            scale = pose['scale']
            resized = crop.resize((round(crop.width * scale), round(crop.height * scale)), Image.Resampling.LANCZOS)
            x = round(W / 2 + (bounds[0] - pose['pivotX']) * scale)
            y = round(GROUND + (bounds[1] - pose['feetY']) * scale)
            assert x >= 8 and y >= 8 and x + resized.width <= W - 8 and y + resized.height <= H - 4, (action, index, x, y, resized.size)
            cell = Image.new('RGBA', (W, H))
            cell.alpha_composite(resized, (x, y))
            assert cell.getchannel('A').getextrema()[0] == 0
            assert max(cell.getchannel('A').getextrema()) >= 240
            folder, originals = ROOT / action, ROOT / 'source-frames' / action
            folder.mkdir(parents=True, exist_ok=True)
            originals.mkdir(parents=True, exist_ok=True)
            cell.save(folder / f'{index+1:02}.png')
            raw.save(originals / f'{index+1:02}.png')
            frames.append(cell)
            raw_frames.append(raw)
            transforms.append({**pose, 'foregroundBounds': list(bounds), 'runtimeBounds': list(cell.getbbox()), 'groundY': GROUND})
        count = len(frames)
        strip = Image.new('RGBA', (W * count, H))
        spaced = Image.new('RGBA', (W * count + (count-1)*GAP, H))
        source_w, source_h = max(f.width for f in raw_frames), max(f.height for f in raw_frames)
        source_spaced = Image.new('RGBA', (source_w * count + (count-1)*GAP, source_h))
        for i, (frame, raw) in enumerate(zip(frames, raw_frames)):
            strip.alpha_composite(frame, (W*i, 0))
            spaced.alpha_composite(frame, ((W+GAP)*i, 0))
            source_spaced.alpha_composite(raw, ((source_w+GAP)*i, 0))
        for i in range(count-1):
            assert spaced.crop(((i+1)*W+i*GAP, 0, (i+1)*(W+GAP), H)).getbbox() is None
            assert source_spaced.crop(((i+1)*source_w+i*GAP, 0, (i+1)*(source_w+GAP), source_h)).getbbox() is None
        basename = f'char_elliot_sd_{action}_strip'
        strip.save(ROOT / (basename+'.png'), optimize=True)
        spaced.save(ROOT / 'review' / f'{action}-spaced-50px.png', optimize=True)
        source_spaced.save(ROOT / 'source-frames' / f'{action}-spaced-50px.png', optimize=True)
        manifest = {'image': basename+'.png', 'frameWidth': W, 'frameHeight': H, 'frameCount': count,
                    'layout': 'horizontal', 'anchor': contract['anchor'], 'facing': 'left', 'sourceFrameGapPx': GAP,
                    'loop': spec.get('loop', False), 'holdLastFrame': spec.get('holdLastFrame', False),
                    'frames': [{'name': name, 'durationMs': spec['durationMs'][i],
                                **({'hit': True} if i == spec.get('hitFrame') else {}),
                                **({'hold': True} if i == count-1 and spec.get('holdLastFrame') else {})}
                               for i, name in enumerate(spec['frameNames'])],
                    'normalization': transforms, 'review': contract['review']}
        (ROOT / (basename+'.json')).write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
        previews = []
        for j, color in enumerate(['#f7f7ff', '#5751d8']):
            bg = Image.new('RGBA', strip.size, color)
            bg.alpha_composite(strip)
            bg.convert('RGB').save(ROOT / 'review' / f'{action}-{"light" if j == 0 else "violet"}.png')
            thumb = bg.resize((672, 160), Image.Resampling.LANCZOS).convert('RGB')
            draw = ImageDraw.Draw(thumb)
            for separator in [224,448]: draw.line((separator,0,separator,160), fill='#60d9cf')
            draw.line((0,150,672,150), fill='#60d9cf')
            mobile.paste(thumb, (0, row*340 + 20 + j*160))
        ImageDraw.Draw(mobile).text((8,row*340+4), action, fill='#24214c')
        for i, frame in enumerate(frames):
            bg = Image.new('RGBA', (W,H), '#5751d8'); bg.alpha_composite(frame)
            previews.append(bg.convert('RGB'))
        previews[0].save(ROOT / 'review' / f'{action}-preview.webp', save_all=True, append_images=previews[1:], duration=spec['durationMs'], loop=0 if spec.get('loop') else 1, quality=90)
        report['actions'][action] = {'frameCount': count, 'runtimeSize': list(strip.size), 'sourceSize': list(source_spaced.size), 'spacedSize': list(spaced.size), 'bounds': [list(f.getbbox()) for f in frames], 'alpha': 'real alpha; white clothing preserved', 'gaps': 'exactly 50px transparent'}
    mobile.save(ROOT / 'review' / 'mobile-frame-grid.jpg', quality=95)
    (ROOT / 'review' / 'validation.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False))


if __name__ == '__main__':
    main()
