"""Pack true-alpha lizardman poses into wide, ground-aligned runtime cells."""
from pathlib import Path
import json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1] / 'assets/monsters/world-7b'
WIDTH, HEIGHT, GROUND, GAP = 480, 320, 312, 50
ACTIONS = {
    'idle': (['ready', 'breath'], [600, 600]),
    'attack': (['ready', 'anticipation', 'spear-contact'], [120, 120, 260]),
    'hit': (['notice', 'impact', 'knockdown'], [100, 100, 160]),
}


def extract(path, count):
    source = Image.open(path).convert('RGBA')
    # Clean faint alpha fringe only. Never key out dark scales or light metal.
    source.putalpha(source.getchannel('A').point(lambda a: a if a >= 32 else 0))
    alpha = source.getchannel('A')
    columns = [alpha.crop((x, 0, x+1, source.height)).getbbox() is not None for x in range(source.width)]
    cuts = [0]
    for n in range(1, count):
        center, radius = round(source.width*n/count), round(source.width/count*.25)
        intervals, start = [], None
        for x in range(center-radius, center+radius+1):
            if not columns[x] and start is None:
                start = x
            elif columns[x] and start is not None:
                intervals.append((start, x)); start = None
        if start is not None:
            intervals.append((start, center+radius+1))
        assert intervals, (path.name, 'missing transparent separator', n)
        left, right = max(intervals, key=lambda span: span[1]-span[0])
        cuts.append((left+right)//2)
    cuts.append(source.width)
    frames = []
    for left, right in zip(cuts, cuts[1:]):
        part = source.crop((left, 0, right, source.height))
        box = part.getbbox()
        assert box and box[0] > 0 and box[1] > 0 and box[2] < part.width and box[3] < part.height, (path.name, box, 'clipped source')
        frames.append(part.crop(box))
    return frames, cuts, source.size


def main():
    validation = []
    for action, (names, durations) in ACTIONS.items():
        if action == 'attack':
            ready, _, _ = extract(ROOT/'source'/'idle-generated.png', 2)
            calibration = json.loads((ROOT/'source'/'attack-layout.json').read_text(encoding='utf-8'))
            parts, cuts, source_size = [ready[0]], [], []
            for pose in ['anticipation', 'contact']:
                isolated, _, size = extract(ROOT/'source'/f'attack-{pose}-generated.png', 1)
                part = isolated[0]
                ratio = calibration['readyHeadWidthPx']/calibration[f'{pose}HeadWidthPx']
                parts.append(part.resize((round(part.width*ratio), round(part.height*ratio)), Image.Resampling.LANCZOS))
                source_size.append(size)
        else:
            parts, cuts, source_size = extract(ROOT/'source'/f'{action}-generated.png', len(names))
        # Each source sheet keeps a constant scale. Match its first standing
        # frame to the same 240px silhouette height, preserving knockdown mass.
        scale = 240 / parts[0].height
        count = len(parts)
        for directory in [ROOT/action, ROOT/'source-frames'/action, ROOT/'review']:
            directory.mkdir(parents=True, exist_ok=True)
        strip = Image.new('RGBA', (count*WIDTH, HEIGHT))
        spaced = Image.new('RGBA', (count*WIDTH+(count-1)*GAP, HEIGHT))
        source_cell = max(max(p.size) for p in parts)+80
        master = Image.new('RGBA', (count*source_cell+(count-1)*GAP, source_cell))
        composite = Image.new('RGB', (count*169, 244), '#F7F7FF')
        draw = ImageDraw.Draw(composite)
        draw.rectangle((0, 122, composite.width, 244), fill='#5751D8')
        frames, boxes = [], []
        for i, part in enumerate(parts):
            part.save(ROOT/'source-frames'/action/f'{i+1:02}.png')
            master.alpha_composite(part, (i*(source_cell+GAP)+(source_cell-part.width)//2, source_cell-40-part.height))
            resized = part.resize((round(part.width*scale), round(part.height*scale)), Image.Resampling.LANCZOS)
            frame = Image.new('RGBA', (WIDTH, HEIGHT))
            frame.alpha_composite(resized, ((WIDTH-resized.width)//2, GROUND-resized.height))
            box = frame.getbbox()
            assert box and box[0]>=8 and box[1]>=8 and box[2]<=WIDTH-8 and box[3]<=GROUND, (action, i, box, 'runtime overflow')
            frame.save(ROOT/action/f'{i+1:02}.png')
            strip.alpha_composite(frame, (i*WIDTH, 0))
            spaced.alpha_composite(frame, (i*(WIDTH+GAP), 0))
            small = frame.resize((153, 102), Image.Resampling.LANCZOS)
            for row in range(2):
                composite.paste(small, (i*169+8, row*122+10), small)
                draw.line((i*169, row*122+109, (i+1)*169, row*122+109), fill='#60D9CF')
            frames.append(frame)
            boxes.append(box)
        filename = f'black-lizardman-sd-{action}-strip.png'
        strip.save(ROOT/filename, optimize=True)
        spaced.save(ROOT/'review'/f'{action}-source-50px.png')
        master.save(ROOT/'source'/f'{action}-master-50px.png')
        composite.save(ROOT/'review'/f'{action}-mobile-light-violet.png')
        frames[0].save(ROOT/'review'/f'{action}-preview.webp', save_all=True, append_images=frames[1:], duration=durations, loop=0 if action=='idle' else 1, lossless=True)
        metadata = {
            'image': filename, 'frameWidth': WIDTH, 'frameHeight': HEIGHT,
            'frameCount': count, 'layout': 'horizontal', 'facing': 'left',
            'anchor': {'x': .5, 'y': .975}, 'groundLinePx': GROUND,
            'sourceFrameGapPx': GAP, 'sourceScale': scale,
            'sourceImageSize': source_size, 'sourceCuts': cuts,
            'loop': action=='idle', 'holdFinal': action!='idle',
            'frames': [{'name': name, 'durationMs': duration,
                        **({'hit': True} if i==2 and action=='attack' else {}),
                        **({'hit': True} if i==1 and action=='hit' else {}),
                        **({'hold': True} if i==2 and action=='hit' else {})}
                       for i, (name, duration) in enumerate(zip(names, durations))],
            'reviewStatus': 'Offline alpha, bounds and mobile frame review; browser checks not requested.'
        }
        (ROOT/filename.replace('.png', '.json')).write_text(json.dumps(metadata, indent=2)+'\n', encoding='utf-8')
        validation.append({'action': action, 'bounds': boxes, 'sourceCuts': cuts, 'scale': scale})
        print(action, 'scale', round(scale, 4), 'bounds', boxes)
    (ROOT/'review'/'validation.json').write_text(json.dumps(validation, indent=2)+'\n', encoding='utf-8')


if __name__ == '__main__':
    main()
