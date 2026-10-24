"""Normalize the approved Keurus poses into transparent battle strips."""
from pathlib import Path
from PIL import Image, ImageEnhance
import json

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/monsters/world-7a/keurus'
SOURCE = OUT / 'source'
ORIGINALS = {
    'idle': SOURCE / 'idle-generated.png',
    'stomp': SOURCE / 'stomp-generated.png',
    'down': SOURCE / 'down-generated.png',
}
CELL = (512, 320)
GROUND = 312


def normalized(path, max_width=460, max_height=274):
    image = Image.open(path).convert('RGBA')
    alpha = image.getchannel('A')
    mask = alpha.point(lambda value: 255 if value > 32 else 0)
    box = mask.getbbox()
    image = image.crop(box)
    scale = min(max_width / image.width, max_height / image.height)
    image = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', CELL)
    canvas.alpha_composite(image, ((CELL[0] - image.width) // 2, GROUND - image.height))
    return canvas


def offset(image, x=0, y=0, angle=0):
    if angle:
        image = image.rotate(angle, Image.Resampling.BICUBIC, expand=False, center=(CELL[0] / 2, GROUND))
    canvas = Image.new('RGBA', CELL)
    canvas.alpha_composite(image, (x, y))
    return canvas


def write_strip(action, frames, names, durations, hit=None, loop=False):
    folder = OUT / action
    review = OUT / 'review'
    folder.mkdir(parents=True, exist_ok=True)
    review.mkdir(parents=True, exist_ok=True)
    sheet = Image.new('RGBA', (CELL[0] * len(frames), CELL[1]))
    spaced = Image.new('RGBA', (CELL[0] * len(frames) + 50 * (len(frames) - 1), CELL[1]))
    for i, frame in enumerate(frames):
        frame.save(folder / f'{i+1:02}.png')
        sheet.alpha_composite(frame, (CELL[0] * i, 0))
        spaced.alpha_composite(frame, ((CELL[0] + 50) * i, 0))
    stem = f'keurus-sd-{action}-strip'
    sheet.save(OUT / f'{stem}.png')
    spaced.save(review / f'{action}-source-50px.png')
    manifest = {
        'image': f'{stem}.png', 'frameWidth': CELL[0], 'frameHeight': CELL[1],
        'frameCount': len(frames), 'layout': 'horizontal', 'facing': 'left',
        'anchor': {'x': .5, 'y': .975}, 'groundLinePx': GROUND,
        'sourceFrameGapPx': 50, 'loop': loop, 'holdFinal': action == 'hit',
        'frames': [dict(name=name, durationMs=duration,
                        **({'hit': True} if i == hit else {}),
                        **({'hold': True} if action == 'hit' and i == len(frames)-1 else {}))
                   for i, (name, duration) in enumerate(zip(names, durations))],
    }
    (OUT / f'{stem}.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def main():
    idle = normalized(ORIGINALS['idle'])
    stomp = normalized(ORIGINALS['stomp'])
    down = normalized(ORIGINALS['down'])
    write_strip('idle', [idle, offset(idle, y=-4)], ['grounded', 'breath'], [520, 520], loop=True)
    write_strip('attack', [idle, offset(idle, x=-8, y=-4, angle=3), stomp],
                ['ready', 'weight-shift', 'stone-stomp-contact'], [180, 190, 340], hit=2)
    recoil = ImageEnhance.Brightness(offset(stomp, x=12, y=-2)).enhance(1.2)
    write_strip('hit', [idle, recoil, down], ['notice', 'impact', 'complete-knockdown'],
                [100, 130, 300], hit=1)


if __name__ == '__main__':
    main()
