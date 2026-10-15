"""Pack approved spider source poses; alpha-only cleanup and deterministic slots."""
from pathlib import Path
from collections import deque
import json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1] / 'assets/monsters/crystal-spider'
CELL, GROUND, GAP = 320, 312, 50
# Separate generation sizes are calibrated to the same standing creature width.
# One scale is then retained for all poses within each action, including knockdown.
ACTIONS = {
    'idle': {'cuts': [0, 884, 1774], 'scale': .325, 'names': ['ready', 'breathe'], 'durations': [600, 600]},
    'attack': {'cuts': [0, 755, 1443, 2172], 'scale': .39, 'names': ['ready', 'anticipation', 'contact'], 'durations': [120, 120, 260]},
    'hit': {'cuts': [0, 730, 1448, 2163], 'scale': .40, 'names': ['guard', 'impact', 'knockdown'], 'durations': [100, 100, 160]},
}

def clean_alpha(im):
    """Remove faint alpha dust and tiny disconnected islands, never color-key."""
    im = im.convert('RGBA')
    alpha = bytearray(im.getchannel('A').point(lambda a: a if a >= 40 else 0).tobytes())
    width, height = im.size
    seen = bytearray(len(alpha))
    for start, value in enumerate(alpha):
        if not value or seen[start]:
            continue
        queue, component = deque([start]), []
        seen[start] = 1
        while queue:
            pos = queue.popleft()
            component.append(pos)
            x, y = pos % width, pos // width
            neighbors = []
            if x: neighbors.append(pos - 1)
            if x < width - 1: neighbors.append(pos + 1)
            if y: neighbors.append(pos - width)
            if y < height - 1: neighbors.append(pos + width)
            for nxt in neighbors:
                if alpha[nxt] and not seen[nxt]:
                    seen[nxt] = 1
                    queue.append(nxt)
        if len(component) < 120:
            for pos in component: alpha[pos] = 0
    im.putalpha(Image.frombytes('L', im.size, bytes(alpha)))
    return im

for action, config in ACTIONS.items():
    original = Image.open(ROOT / 'source' / f'{action}.png')
    extracted_dir = ROOT / 'source-frames' / action
    runtime_dir, review_dir = ROOT / action, ROOT / 'review'
    for directory in [extracted_dir, runtime_dir, review_dir]: directory.mkdir(parents=True, exist_ok=True)
    frames, sources = [], []
    for index, (left, right) in enumerate(zip(config['cuts'], config['cuts'][1:])):
        isolated = action == 'hit' and index == 1
        part = clean_alpha(Image.open(ROOT / 'source' / 'hit-impact.png') if isolated else original.crop((left, 0, right, original.height)))
        box = part.getbbox()
        assert box and box[0] > 0 and box[2] < part.width and box[1] > 0 and box[3] < part.height, (action, index, 'source clipped', box)
        part = part.crop(box)
        if isolated:
            # Match this independently generated pose to the same source scale.
            part = part.resize((689, round(part.height * 689 / part.width)), Image.Resampling.LANCZOS)
        part.save(extracted_dir / f'{index+1:02}.png')
        sources.append(part)
        scaled = part.resize((round(part.width * config['scale']), round(part.height * config['scale'])), Image.Resampling.LANCZOS)
        canvas = Image.new('RGBA', (CELL, CELL))
        canvas.alpha_composite(scaled, ((CELL - scaled.width)//2, GROUND - scaled.height))
        bounds = canvas.getbbox()
        assert bounds[0] >= 8 and bounds[2] <= CELL-8 and bounds[1] >= 8 and bounds[3] <= GROUND, (action, index, bounds)
        canvas.save(runtime_dir / f'{index+1:02}.png')
        frames.append(canvas)
        print(action, index+1, 'source', part.size, 'runtime', bounds)
    count = len(frames)
    strip = Image.new('RGBA', (CELL * count, CELL))
    spaced = Image.new('RGBA', (CELL * count + GAP * (count-1), CELL))
    # Archive a corrected high-resolution source master with exact 50px gutters.
    source_cell = max(max(p.size) for p in sources) + 80
    source_master = Image.new('RGBA', (source_cell * count + GAP * (count-1), source_cell))
    for i, (frame, part) in enumerate(zip(frames, sources)):
        strip.alpha_composite(frame, (i * CELL, 0))
        spaced.alpha_composite(frame, (i * (CELL+GAP), 0))
        source_master.alpha_composite(part, (i*(source_cell+GAP)+(source_cell-part.width)//2, source_cell-40-part.height))
    filename = f'crystal-spider-sd-{action}-strip.png'
    strip.save(ROOT / filename)
    spaced.save(review_dir / f'{action}-source-50px.png')
    source_master.save(ROOT / 'source' / f'{action}-master-50px.png')
    manifest = {
        'image': filename, 'frameWidth': CELL, 'frameHeight': CELL, 'frameCount': count,
        'layout': 'horizontal', 'facing': 'left', 'anchor': {'x': .5, 'y': .975},
        'groundLinePx': GROUND, 'sourceFrameGapPx': GAP, 'sourceScale': config['scale'],
        'loop': action == 'idle', 'holdFinal': action != 'idle',
        'frames': [{'name': name, 'durationMs': duration,
                    **({'hit': True} if action == 'attack' and i == 2 else {}),
                    **({'hold': True} if action == 'hit' and i == 2 else {})}
                   for i, (name, duration) in enumerate(zip(config['names'], config['durations']))],
        'reviewStatus': 'Offline alpha/bounds/frame review; browser not requested; animation approval not inferred.',
    }
    (ROOT / filename.replace('.png', '.json')).write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
    composite = Image.new('RGB', (count*176, 360), '#F7F7FF')
    draw = ImageDraw.Draw(composite)
    draw.rectangle((0, 180, composite.width, 360), fill='#5751D8')
    for row in range(2):
        for i, frame in enumerate(frames):
            small = frame.resize((128, 128), Image.Resampling.LANCZOS)
            composite.paste(small, (i*176+24, row*180+24), small)
            draw.rectangle((i*176, row*180, i*176+175, row*180+179), outline='#b3aecf')
            draw.line((i*176+24, row*180+149, i*176+152, row*180+149), fill='#60D9CF')
    composite.save(review_dir / f'{action}-mobile-light-violet.png')
    previews = [f.resize((160, 160), Image.Resampling.LANCZOS) for f in frames]
    previews[0].save(review_dir / f'{action}-preview.webp', save_all=True, append_images=previews[1:], duration=config['durations'], loop=0, lossless=True)
