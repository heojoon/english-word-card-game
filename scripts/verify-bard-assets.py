"""Validate packed Bard alpha, slots, source/review gutters and gameplay events."""
from pathlib import Path
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / 'assets/characters/bard'
CONTRACT = json.loads((ROOT / 'animation-contract.json').read_text(encoding='utf-8'))


def validate_gapped(path, count, width, height):
    sheet = Image.open(path)
    assert sheet.mode == 'RGBA', (path, sheet.mode)
    assert sheet.size == (count * width + (count - 1) * 50, height), (path, sheet.size)
    for index in range(count):
        x = index * (width + 50)
        assert sheet.getchannel('A').crop((x, 0, x + width, height)).getbbox(), (path, 'blank', index)
        if index < count - 1:
            assert sheet.getchannel('A').crop((x + width, 0, x + width + 50, height)).getbbox() is None, (path, 'nontransparent gap', index)


def validate(path):
    manifest = json.loads(path.read_text(encoding='utf-8'))
    count, width, height = [manifest[key] for key in ['frameCount', 'frameWidth', 'frameHeight']]
    strip = Image.open(ROOT / manifest['image'])
    assert strip.mode == 'RGBA'
    assert strip.size == (count * width, height)
    assert manifest['layout'] == 'horizontal'
    assert manifest['sourceFrameGapPx'] == 50
    assert manifest['facing'] == 'right'
    assert len(manifest['frames']) == count
    assert [frame['index'] for frame in manifest['frames']] == list(range(count))
    assert all(frame['durationMs'] > 0 for frame in manifest['frames'])
    assert manifest['anchor'] == (CONTRACT['projectileAnchor'] if manifest['projectile'] else CONTRACT['anchor'])
    for index in range(count):
        frame = strip.crop((index * width, 0, (index + 1) * width, height))
        alpha = frame.getchannel('A')
        bounds = alpha.getbbox()
        assert bounds and bounds[0] >= 7 and bounds[1] >= 7 and bounds[2] <= width - 7 and bounds[3] <= height - 5, (path, index, bounds)
        assert alpha.getextrema()[0] == 0
        assert alpha.getextrema()[1] >= 200, (path, 'foreground too transparent')
        # Every runtime frame must match its separately saved normalized frame.
        action = 'projectile' if manifest['projectile'] else path.stem.split('_sd_')[1].replace('_strip', '')
        variant = None if manifest['projectile'] else path.stem.split('_')[2]
        frame_dir = action if variant is None else f'{action}-{variant}'
        saved = Image.open(ROOT / frame_dir / f'{index+1:02}.png')
        assert saved.tobytes() == frame.tobytes(), (path, 'runtime packing mismatch', index)
    validate_gapped(ROOT / manifest['reviewMaster'], count, width, height)
    validate_gapped(ROOT / manifest['sourceMaster'], count, manifest['sourceFrameWidth'], manifest['sourceFrameHeight'])
    if '_attack_' in path.name:
        assert count == 6 and manifest['finalActive'] is True
        assert [f['index'] for f in manifest['frames'] if f.get('release')] == [4]
        assert not any(f.get('hit') for f in manifest['frames']), 'Character release must not apply damage.'
        assert sum(f['durationMs'] for f in manifest['frames'][:4]) == CONTRACT['releaseMs']
    if '_hit_' in path.name:
        assert count == 3
        assert manifest['frames'][2]['name'] == 'complete-knockdown'
        assert manifest['frames'][2]['finalHold'] is True
        assert manifest['frames'][1]['hit'] is True
    if manifest['projectile']:
        assert count == 6
        assert [f['index'] for f in manifest['frames'] if f.get('hit')] == [4]
        assert CONTRACT['releaseMs'] + sum(f['durationMs'] for f in manifest['frames'][:4]) == CONTRACT['contactMs']
        assert CONTRACT['contactMs'] * CONTRACT['reducedMotionScale'] == CONTRACT['reducedContactMs']
    print(f'{path.name}: alpha, frames, events and exact 50px source/review gaps verified')


if __name__ == '__main__':
    paths = sorted(ROOT.glob('char_bard*_strip.json'))
    assert len(paths) == 7, f'Expected 7 manifests, found {len(paths)}; finish source generation and packing first.'
    for path in paths:
        validate(path)
    for variant in CONTRACT['variants']:
        profile = ROOT.parents[1] / f'avatars/variants/bard-{variant}.webp'
        assert Image.open(profile).size == (512, 512)
    print('Bard: all seven runtime strips and non-SD profile exports verified.')
