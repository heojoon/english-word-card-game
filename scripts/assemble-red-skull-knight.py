"""Normalize the approved Red Skull Knight source poses into transparent battle strips."""
from pathlib import Path
from PIL import Image
import json

ROOT = Path(__file__).resolve().parents[1] / 'assets/monsters/world-7a/red-skull-knight'
SOURCE = ROOT / 'source'
CELL = (480, 320)
SOURCES = {
    'idle': ('idle-generated.png', [0, 887, 1774], ['ready', 'breath'], [600, 600]),
    'attack': ('attack-generated.png', [0, 700, 1370, 2117], ['guard', 'raise', 'contact'], [200, 220, 300]),
    'hit': ('hit-generated.png', [0, 700, 1360, 2171], ['notice', 'impact', 'knockdown'], [120, 160, 800]),
}

def main():
    prepared = {}
    for action, (name, cuts, _, _) in SOURCES.items():
        source = Image.open(SOURCE / name).convert('RGBA')
        frames = []
        for left, right in zip(cuts, cuts[1:]):
            frame = source.crop((left, 0, right, source.height))
            alpha = frame.getchannel('A').point(lambda value: 255 if value > 8 else 0)
            box = alpha.getbbox()
            if box is None:
                raise ValueError(f'{action}: empty source panel')
            frames.append(frame.crop(box))
        prepared[action] = frames
    # One scale keeps the body and ground line stable across actions.
    scale = min(450 / max(frame.width for frames in prepared.values() for frame in frames),
                300 / max(frame.height for frames in prepared.values() for frame in frames))
    for action, frames in prepared.items():
        name, _, frame_names, durations = SOURCES[action]
        frame_dir = ROOT / action
        frame_dir.mkdir(parents=True, exist_ok=True)
        slots = []
        for index, frame in enumerate(frames, 1):
            size = tuple(max(1, round(value * scale)) for value in frame.size)
            frame = frame.resize(size, Image.Resampling.LANCZOS)
            slot = Image.new('RGBA', CELL)
            slot.alpha_composite(frame, ((CELL[0] - size[0]) // 2, 312 - size[1]))
            if action == 'hit' and index == 3:
                # The crowded generated source leaves a detached cape sliver from frame 2.
                slot.paste((0, 0, 0, 0), (0, 0, 82, 205))
            slot.save(frame_dir / f'{index:02}.png')
            slots.append(slot)
        strip = Image.new('RGBA', (CELL[0] * len(slots), CELL[1]))
        review = Image.new('RGBA', (CELL[0] * len(slots) + 50 * (len(slots) - 1), CELL[1]))
        for i, slot in enumerate(slots):
            strip.alpha_composite(slot, (i * CELL[0], 0))
            review.alpha_composite(slot, (i * (CELL[0] + 50), 0))
        basename = f'char_red_skull_knight_sd_{action}_strip'
        strip.save(ROOT / f'{basename}.png')
        (ROOT / 'review').mkdir(exist_ok=True)
        review.save(ROOT / 'review' / f'{action}-50px.png')
        manifest = {
            'image': f'{basename}.png', 'frameWidth': CELL[0], 'frameHeight': CELL[1],
            'frameCount': len(slots), 'layout': 'horizontal', 'facing': 'left',
            'anchor': {'x': 0.5, 'y': 0.975}, 'sourceFrameGapPx': 50,
            'sourceImage': f'source/{name}', 'sourceCuts': SOURCES[action][1],
            'frames': [{'name': label, 'durationMs': duration, **({'hit': True} if action == 'attack' and label == 'contact' else {})}
                       for label, duration in zip(frame_names, durations)],
            'loop': action == 'idle', 'finalHold': action == 'hit',
            'reviewStatus': 'Technical alpha and frame review; user visual approval pending',
        }
        (ROOT / f'{basename}.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

if __name__ == '__main__':
    main()
