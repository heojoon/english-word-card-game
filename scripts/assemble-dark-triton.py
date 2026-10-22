"""Pack generated Dark Triton artwork without color-keying foreground colors."""
from pathlib import Path
import json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1] / 'assets/monsters/dark-triton'
CONTRACT = json.loads((ROOT / 'animation-contract.json').read_text(encoding='utf-8'))
W, H, GAP = 480, 320, 50


def extract(path, count):
    im = Image.open(path).convert('RGBA')
    assert im.getchannel('A').getextrema()[0] == 0, f'Opaque source: {path}'
    # Remove only sub-visible alpha dust (<= 8/255), never color-key white hair,
    # dark armor, cyan glows, or violet cloth. Keep generation originals intact.
    im.putalpha(im.getchannel('A').point(lambda a: a if a > 8 else 0))
    alpha = im.getchannel('A')
    columns = [alpha.crop((x, 0, x+1, im.height)).getbbox() is not None for x in range(im.width)]
    cuts = [0]
    for i in range(1, count):
        center, radius = round(im.width*i/count), round(im.width/count*.3)
        spans, start = [], None
        for x in range(center-radius, center+radius+1):
            if not columns[x] and start is None:
                start = x
            elif columns[x] and start is not None:
                spans.append((start, x)); start = None
        if start is not None:
            spans.append((start, center+radius+1))
        assert spans, (path, 'No transparent frame separator', i)
        a, b = max(spans, key=lambda span: span[1]-span[0])
        cuts.append((a+b)//2)
    cuts.append(im.width)
    parts = []
    for a, b in zip(cuts, cuts[1:]):
        cell = im.crop((a, 0, b, im.height))
        box = cell.getbbox()
        assert box and box[0]>0 and box[1]>0 and box[2]<cell.width and box[3]<cell.height, (path, box, 'Clipped source')
        parts.append(cell.crop(box))
    return parts, cuts


def main():
    validation = []
    for action, spec in {**CONTRACT['actions'], **CONTRACT['projectiles']}.items():
        projectile = action in CONTRACT['projectiles']
        names = spec['frames']
        isolated = {
            'stormsurge': ['idle', 'stormsurge-charge', 'stormsurge-release'],
            'trident-throw': ['trident-throw-anticipation', 'trident-throw-aim', 'trident-throw-release'],
            'hit': ['idle', 'hit-impact', 'hit-knockdown'],
        }
        if action in isolated:
            parts, raw_parts, cuts, calibration = [], [], [], []
            for pose in isolated[action]:
                extracted, pose_cuts = extract(ROOT/'source'/f'{pose}-generated.png', 2 if pose=='idle' else 1)
                part = extracted[0]
                raw_parts.append(part)
                # Isolated sources have different canvas sizes. Calibrate their
                # upright silhouette to the 856px idle master before one shared
                # sequence scale. The prone pose retains horizontal body mass.
                target = 410 if pose=='hit-knockdown' else 856
                ratio = target/part.height
                calibration.append({'pose': pose, 'scale': ratio, 'targetHeight': target})
                parts.append(part.resize((round(part.width*ratio), target), Image.Resampling.LANCZOS))
                cuts.append(pose_cuts)
        else:
            parts, cuts = extract(ROOT/'source'/f'{action}-generated.png', len(names))
            raw_parts, calibration = parts, []
        # One shared sequence scale after isolated-source calibration.
        scale = min(240/parts[0].height, (W-32)/max(p.width for p in parts), (H-32)/max(p.height for p in parts))
        if projectile:
            scale = min(210/max(p.height for p in parts), (W-40)/max(p.width for p in parts))
        frames, bounds = [], []
        for folder in [ROOT/action, ROOT/'source-frames'/action, ROOT/'review']:
            folder.mkdir(parents=True, exist_ok=True)
        strip = Image.new('RGBA', (W*len(parts), H))
        spaced = Image.new('RGBA', (W*len(parts)+GAP*(len(parts)-1), H))
        source_cell = max(max(p.size) for p in parts)+80
        master = Image.new('RGBA', (source_cell*len(parts)+GAP*(len(parts)-1), source_cell))
        review = Image.new('RGB', (200*len(parts), 300), '#F7F7FF')
        draw = ImageDraw.Draw(review)
        draw.rectangle((0, 150, review.width, 300), fill='#5751D8')
        for i, part in enumerate(parts):
            raw_parts[i].save(ROOT/'source-frames'/action/f'{i+1:02}.png')
            master.alpha_composite(part, (i*(source_cell+GAP)+(source_cell-part.width)//2, source_cell-40-part.height))
            scaled = part.resize((round(part.width*scale), round(part.height*scale)), Image.Resampling.LANCZOS)
            frame = Image.new('RGBA', (W, H))
            y = (H-scaled.height)//2 if projectile else 312-scaled.height
            frame.alpha_composite(scaled, ((W-scaled.width)//2, y))
            if not projectile:
                # Center the fish-tail mass near the ground, independently of
                # trident reach. Centering the whole silhouette makes the king
                # jump sideways when the weapon extends toward the player.
                weights = [(x, frame.getpixel((x, py))[3])
                           for py in range(245, 312) for x in range(W)
                           if frame.getpixel((x, py))[3] > 128]
                center = sum(x*a for x, a in weights)/sum(a for x, a in weights)
                offset = round(256-center)
                shifted = Image.new('RGBA', (W, H))
                shifted.alpha_composite(frame, (offset, 0))
                frame = shifted
            box = frame.getbbox()
            assert box and box[0]>=8 and box[1]>=8 and box[2]<=W-8 and box[3]<=H-8, (action, i, box)
            frame.save(ROOT/action/f'{i+1:02}.png')
            strip.alpha_composite(frame, (i*W, 0))
            spaced.alpha_composite(frame, (i*(W+GAP), 0))
            thumb = frame.resize((192, 128), Image.Resampling.LANCZOS)
            for row in range(2):
                review.paste(thumb, (i*200+4, row*150+4), thumb)
                draw.text((i*200+8, row*150+134), names[i], fill='#60D9CF' if row else '#24214C')
            frames.append(frame); bounds.append(box)
        stem = f'{"fx" if projectile else "char"}_dark_triton_{action.replace("-", "_")}_strip'
        strip.save(ROOT/f'{stem}.png', optimize=True)
        spaced.save(ROOT/'review'/f'{action}-spaced-50px.png')
        master.save(ROOT/'source'/f'{action}-master-50px.png')
        review.save(ROOT/'review'/f'{action}-mobile-light-violet.png')
        frames[0].save(ROOT/'review'/f'{action}-preview.webp', save_all=True, append_images=frames[1:], duration=spec['durationsMs'], loop=0 if action=='idle' else 1, lossless=True)
        metadata = {
            'image': f'{stem}.png', 'frameWidth': W, 'frameHeight': H,
            'frameCount': len(parts), 'layout': 'horizontal', 'facing': 'left',
            'anchor': {'x': .5, 'y': .5 if projectile else .975},
            'sourceFrameGapPx': GAP, 'sourceScale': scale, 'sourceCuts': cuts,
            'isolatedSourceCalibration': calibration,
            'alphaDustThreshold': 8,
            'effectBoundsPx': bounds, 'loop': action=='idle',
            'finalHold': action=='hit', 'reset': spec.get('reset'),
            'frames': [dict(name=name, durationMs=duration,
                            **({'release': True} if i+1==spec.get('releaseFrame') else {}),
                            **({'hit': True} if i+1==spec.get('hitFrame') else {}),
                            **({'hold': True} if action=='hit' and i==len(parts)-1 else {}))
                       for i, (name, duration) in enumerate(zip(names, spec['durationsMs']))],
            'reviewStatus': 'Offline review only; user approval and in-engine review pending.'
        }
        (ROOT/f'{stem}.json').write_text(json.dumps(metadata, indent=2)+'\n', encoding='utf-8')
        validation.append({'action': action, 'bounds': bounds, 'sourceScale': scale, 'sourceCuts': cuts})
        print(action, bounds)
    (ROOT/'review'/'validation.json').write_text(json.dumps(validation, indent=2)+'\n', encoding='utf-8')


if __name__ == '__main__':
    main()
