"""Pack generated RGBA poses using alpha geometry, without color-key removal."""
import json
import runpy
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'assets/monsters/world-8/ashen-wedge-soldier'
extract = runpy.run_path(str(ROOT / 'scripts/assemble-world7c-sentry.py'))['extract']
W, H, GROUND, GAP = 448, 320, 312, 50


def main():
    contract = json.loads((BASE / 'animation-contract.json').read_text(encoding='utf-8'))
    validation = []
    for action, spec in contract['actions'].items():
        parts = extract(BASE / 'source' / f'{action}-generated.png', len(spec['names']))
        # One scale for every pose in the action, including the horizontal knockdown.
        scale = 240 / parts[0].height
        for directory in [BASE / action, BASE / 'source-frames' / action, BASE / 'review']:
            directory.mkdir(parents=True, exist_ok=True)
        strip = Image.new('RGBA', (W * len(parts), H))
        spaced = Image.new('RGBA', (W * len(parts) + GAP * (len(parts) - 1), H))
        review = Image.new('RGB', (180 * len(parts), 264), '#F7F7FF')
        ImageDraw.Draw(review).rectangle((0, 132, review.width, 264), fill='#5751D8')
        frames, bounds = [], []
        for i, part in enumerate(parts):
            part.save(BASE / 'source-frames' / action / f'{i+1:02}.png')
            resized = part.resize((round(part.width * scale), round(part.height * scale)), Image.Resampling.LANCZOS)
            frame = Image.new('RGBA', (W, H))
            frame.alpha_composite(resized, ((W-resized.width)//2, GROUND-resized.height))
            box = frame.getbbox()
            assert box and box[0] >= 8 and box[1] >= 8 and box[2] <= W-8 and box[3] <= GROUND, (action, i, box)
            frame.save(BASE / action / f'{i+1:02}.png')
            strip.alpha_composite(frame, (i*W, 0))
            spaced.alpha_composite(frame, (i*(W+GAP), 0))
            small = frame.resize((168, 120), Image.Resampling.LANCZOS)
            for row in range(2):
                review.paste(small, (i*180+6, row*132+6), small)
            frames.append(frame)
            bounds.append(box)
        filename = f'ashen-wedge-soldier-sd-{action}-strip.png'
        strip.save(BASE / filename, optimize=True)
        spaced.save(BASE / 'review' / f'{action}-spaced-50px.png')
        review.save(BASE / 'review' / f'{action}-light-violet.png')
        frames[0].save(BASE / 'review' / f'{action}-preview.webp', save_all=True, append_images=frames[1:], duration=spec['durations'], loop=0 if action == 'idle' else 1, lossless=True)
        manifest = {'image': filename, 'frameWidth': W, 'frameHeight': H, 'frameCount': len(parts), 'layout': 'horizontal', 'facing': 'left', 'anchor': {'x': .5, 'y': .975}, 'groundLinePx': GROUND, 'sourceFrameGapPx': GAP, 'loop': action == 'idle', 'holdFinal': action != 'idle', 'frames': [{'name': name, 'durationMs': duration, **({'hit': True} if (action == 'attack' and i == 2) or (action == 'hit' and i == 1) else {}), **({'hold': True} if action == 'hit' and i == 2 else {})} for i, (name, duration) in enumerate(zip(spec['names'], spec['durations']))]}
        (BASE / filename.replace('.png', '.json')).write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
        validation.append({'action': action, 'scale': scale, 'bounds': bounds, 'sourceFrameGapPx': GAP, 'stripSize': strip.size, 'alphaExtrema': strip.getchannel('A').getextrema()})
        print(action, bounds)
    (BASE / 'review' / 'validation.json').write_text(json.dumps(validation, indent=2)+'\n', encoding='utf-8')


if __name__ == '__main__':
    main()
