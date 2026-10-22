"""Offline alpha/geometry checks and synchronized skill-layer review composites."""
from pathlib import Path
import json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1] / 'assets/monsters/dark-triton'


def main():
    checks = []
    for path in ROOT.glob('*_strip.json'):
        spec = json.loads(path.read_text(encoding='utf-8'))
        im = Image.open(ROOT/spec['image'])
        count = spec['frameCount']
        assert im.mode == 'RGBA' and im.size == (480*count, 320)
        assert im.getchannel('A').getextrema()[0] == 0
        action = path.stem.split('dark_triton_')[1].replace('_strip', '').replace('_', '-')
        spaced = Image.open(ROOT/'review'/f'{action}-spaced-50px.png')
        assert spaced.size == (480*count+50*(count-1), 320)
        for i in range(count-1):
            assert spaced.crop((480+i*530, 0, 530+i*530, 320)).getbbox() is None
        checks.append({'image': spec['image'], 'size': im.size, 'alpha': im.getchannel('A').getextrema(), 'gapsVerified': True})
    for action, fx in [('stormsurge', 'wave'), ('trident-throw', 'trident')]:
        char = [Image.open(ROOT/action/f'{i:02}.png') for i in range(1, 4)]
        projectiles = [Image.open(ROOT/fx/f'{i:02}.png') for i in range(1, 4)]
        idle = Image.open(ROOT/'idle/01.png')
        frames = []
        for ms in range(0, 1250, 50):
            bg = Image.new('RGBA', (640, 240), '#F7F7FF')
            draw = ImageDraw.Draw(bg)
            draw.ellipse((65, 125, 125, 185), outline='#60D9CF', width=3)
            index = 0 if ms < 180 else 1 if ms < 360 else 2
            pose = char[index] if ms < 1100 else idle
            bg.alpha_composite(pose.resize((288, 192), Image.Resampling.LANCZOS), (315, 24))
            flight = ms-360
            if 0 <= flight < 430:
                fi = 0 if flight < 110 else 1 if flight < 250 else 2
                progress = min(1, flight/250)
                center = 345+(95-345)*progress
                bg.alpha_composite(projectiles[fi].resize((200, 133), Image.Resampling.LANCZOS), (round(center-100), 76))
            state = 'CONTACT' if flight >= 250 else 'RELEASE' if flight >= 0 else 'READY'
            draw.text((12, 12), f'{action} | {ms}ms | {state}', fill='#24214C')
            frames.append(bg.convert('RGB'))
        frames[0].save(ROOT/'review'/f'{action}-layered-preview.webp', save_all=True, append_images=frames[1:], duration=50, loop=0, lossless=True)
        sheet = Image.new('RGB', (640, 720), '#F7F7FF')
        for row, index in enumerate([8, 10, 13]):
            sheet.paste(frames[index], (0, row*240))
        sheet.save(ROOT/'review'/f'{action}-release-travel-contact.png')
    report = {'strips': checks, 'contactMs': 610, 'browser': 'not requested; not run', 'userApproval': 'pending'}
    (ROOT/'review'/'asset-checks.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    print(f'Validated {len(checks)} RGBA strips and 50px review gaps; synchronized layer reviews regenerated.')


if __name__ == '__main__':
    main()
