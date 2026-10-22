"""Normalize generated skeleton poses without color-keying the ivory bones."""
from pathlib import Path
import argparse
import json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1] / 'assets/monsters/world-7a'
WIDTH, CELL, GROUND, GAP = 416, 320, 312, 50
ACTIONS = {
    'idle': (['ready', 'rattle'], [600, 600]),
    'attack': (['ready', 'anticipation', 'sword-contact'], [120, 120, 260]),
    'hit': (['notice', 'impact', 'bone-pile-knockdown'], [100, 100, 160]),
}


def extract(path, count):
    im = Image.open(path).convert('RGBA')
    # Alpha-only cleanup; no ivory/white/violet color removal.
    im.putalpha(im.getchannel('A').point(lambda a: a if a >= 32 else 0))
    alpha = im.getchannel('A')
    columns = [alpha.crop((x, 0, x+1, im.height)).getbbox() is not None for x in range(im.width)]
    cuts = [0]
    for n in range(1, count):
        center = round(im.width*n/count)
        radius = round(im.width/count*.24)
        clear = []
        start = None
        for x in range(center-radius, center+radius+1):
            if not columns[x] and start is None:
                start = x
            elif columns[x] and start is not None:
                clear.append((start, x)); start = None
        if start is not None:
            clear.append((start, center+radius+1))
        assert clear, (path.name, 'no transparent frame separator', n)
        left, right = max(clear, key=lambda interval: interval[1]-interval[0])
        cuts.append((left+right)//2)
    cuts.append(im.width)
    frames = []
    for left, right in zip(cuts, cuts[1:]):
        part = im.crop((left, 0, right, im.height))
        box = part.getbbox()
        assert box and box[0] > 0 and box[2] < part.width and box[1] > 0 and box[3] < part.height, (path.name, box, 'clipped source')
        frames.append(part.crop(box))
    return frames, cuts, im.size


parser = argparse.ArgumentParser()
parser.add_argument('--variant', choices=['normal', 'scorched', 'both'], default='both')
args = parser.parse_args()
validation = []
variants = ['normal', 'scorched'] if args.variant == 'both' else [args.variant]
for variant in variants:
    extracted = {}
    for action, (names, durations) in ACTIONS.items():
        if action == 'hit':
            parts, cuts, source_size = extract(ROOT/'source'/f'{variant}-hit-pair-generated.png', 2)
            down, _, _ = extract(ROOT/'source'/f'{variant}-hit-down-generated.png', 1)
            layout = json.loads((ROOT/'source'/'hit-layout.json').read_text(encoding='utf-8'))[variant]
            # Independent down pose is calibrated by skull width against the
            # standing pose before the common action scale is applied.
            ratio = layout['standingSkullWidthPx']/layout['downSkullWidthPx']
            part = down[0]
            parts.append(part.resize((round(part.width*ratio), round(part.height*ratio)), Image.Resampling.LANCZOS))
        else:
            parts, cuts, source_size = extract(ROOT/'source'/f'{variant}-{action}-generated.png', len(names))
        extracted[action] = (parts, cuts, source_size)
    # Match first standing poses across actions. Use a wider cell to contain
    # the fallen sword/pile without shrinking the character for its props.
    scales = {action: 240/parts[0].height for action, (parts, _, _) in extracted.items()}
    for action, (parts, cuts, source_size) in extracted.items():
        names, durations = ACTIONS[action]
        count = len(parts)
        scale = scales[action]
        runtime_dir = ROOT/variant/action
        source_dir = ROOT/'source-frames'/variant/action
        review_dir = ROOT/'review'
        for directory in [runtime_dir, source_dir, review_dir]:
            directory.mkdir(parents=True, exist_ok=True)
        strip = Image.new('RGBA', (count*WIDTH, CELL))
        spaced = Image.new('RGBA', (count*WIDTH+(count-1)*GAP, CELL))
        composite = Image.new('RGB', (count*149, 244), '#F7F7FF')
        draw = ImageDraw.Draw(composite)
        draw.rectangle((0, 122, composite.width, 244), fill='#5751D8')
        frames, boxes = [], []
        source_cell = max(max(p.size) for p in parts)+80
        master = Image.new('RGBA', (count*source_cell+(count-1)*GAP, source_cell))
        for i, part in enumerate(parts):
            part.save(source_dir/f'{i+1:02}.png')
            master.alpha_composite(part, (i*(source_cell+GAP)+(source_cell-part.width)//2, source_cell-40-part.height))
            resized = part.resize((round(part.width*scale), round(part.height*scale)), Image.Resampling.LANCZOS)
            frame = Image.new('RGBA', (WIDTH, CELL))
            frame.alpha_composite(resized, ((WIDTH-resized.width)//2, GROUND-resized.height))
            box = frame.getbbox()
            assert box[0] >= 8 and box[2] <= WIDTH-8 and box[1] >= 8 and box[3] <= GROUND, (variant, action, i, box)
            frame.save(runtime_dir/f'{i+1:02}.png')
            strip.alpha_composite(frame, (i*WIDTH, 0))
            spaced.alpha_composite(frame, (i*(WIDTH+GAP), 0))
            for row in range(2):
                small = frame.resize((133, 102), Image.Resampling.LANCZOS)
                composite.paste(small, (i*149+8, row*122+10), small)
                draw.line((i*149, row*122+109, (i+1)*149, row*122+109), fill='#60D9CF')
            frames.append(frame)
            boxes.append(box)
        filename = f'skeleton-{variant}-sd-{action}-strip.png'
        strip.save(ROOT/filename, optimize=True)
        spaced.save(review_dir/f'{variant}-{action}-source-50px.png')
        master.save(ROOT/'source'/f'{variant}-{action}-master-50px.png')
        composite.save(review_dir/f'{variant}-{action}-mobile-light-violet.png')
        frames[0].save(review_dir/f'{variant}-{action}-preview.webp', save_all=True, append_images=frames[1:], duration=durations, loop=0 if action=='idle' else 1, lossless=True)
        manifest = {
            'image': filename, 'frameWidth': WIDTH, 'frameHeight': CELL, 'frameCount': count,
            'layout': 'horizontal', 'facing': 'left', 'anchor': {'x': .5, 'y': .975},
            'groundLinePx': GROUND, 'sourceFrameGapPx': GAP, 'sourceScale': scale,
            'sourceImageSize': source_size, 'sourceCuts': cuts,
            'loop': action=='idle', 'holdFinal': action!='idle',
            'frames': [{'name': name, 'durationMs': duration,
                        **({'hit': True} if action=='attack' and i==2 else {}),
                        **({'hold': True} if action=='hit' and i==2 else {})}
                       for i, (name, duration) in enumerate(zip(names, durations))],
            'reviewStatus': 'Offline bounds/alpha and frame review; browser review not requested; user visual approval not inferred.'
        }
        (ROOT/filename.replace('.png', '.json')).write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
        validation.append({'variant': variant, 'action': action, 'bounds': boxes, 'sourceCuts': cuts, 'scale': scale})
        print(variant, action, 'scale', round(scale, 4), 'bounds', boxes)
(ROOT/'review'/'validation.json').write_text(json.dumps(validation, indent=2)+'\n', encoding='utf-8')
