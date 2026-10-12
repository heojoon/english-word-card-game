"""Export supplied/generated sniper artwork without redesigning it."""
from pathlib import Path
from PIL import Image
import json
import shutil
import argparse

root = Path(__file__).resolve().parents[1]
source = root / 'assets/characters/sniper/source'
source.mkdir(parents=True, exist_ok=True)
parser = argparse.ArgumentParser()
parser.add_argument('--standing-input', type=Path)
parser.add_argument('--sd-input', type=Path)
args = parser.parse_args()
inputs = {
    'standing-cg.png': args.standing_input,
    'sd-identity.png': args.sd_input,
}
for name, path in inputs.items():
    destination = source / name
    if not destination.exists():
        if path is None:
            parser.error(f'Missing {name}; supply its input argument.')
        shutil.copy2(path, destination)

standing = Image.open(source / 'standing-cg.png').convert('RGBA')
standing.save(root / 'assets/characters/sniper/char_sniper_female_standing.webp', quality=92)
standing.thumbnail((512, 512), Image.Resampling.LANCZOS)
portrait = Image.new('RGBA', (512, 512))
portrait.alpha_composite(standing, ((512-standing.width)//2, 512-standing.height))
portrait.save(root / 'assets/avatars/variants/sniper-female.webp', quality=90)
sd = Image.open(source / 'sd-identity.png').convert('RGBA')
sd.thumbnail((320, 312), Image.Resampling.LANCZOS)
cell = Image.new('RGBA', (320, 320))
cell.alpha_composite(sd, ((320-sd.width)//2, 312-sd.height))
cell.save(root / 'assets/characters/sniper/char_sniper_female_sd_idle.png')
manifest = {
    'image': 'char_sniper_female_sd_idle.png', 'frameWidth': 320, 'frameHeight': 320,
    'frameCount': 1, 'layout': 'horizontal', 'anchor': {'x': 0.5, 'y': 0.975},
    'frames': [{'name': 'idle', 'durationMs': 1000}],
    'source': 'source/sd-identity.png', 'reviewStatus': 'static-temporary-fallback',
    'notes': 'Female only. Dedicated idle/attack/three-frame knockdown strips are pending; CSS motion is temporary feedback.'
}
(root / 'assets/characters/sniper/char_sniper_female_sd_idle.json').write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
for path in [root / 'assets/avatars/variants/sniper-female.webp', root / 'assets/characters/sniper/char_sniper_female_sd_idle.png']:
    image = Image.open(path)
    print(path.relative_to(root), image.size, image.getchannel('A').getextrema())

review = root / 'assets/characters/sniper/review'
review.mkdir(exist_ok=True)
canvas = Image.new('RGB', (512, 256), '#F7F7FF')
for column, background in enumerate(['#F7F7FF', '#5751D8']):
    canvas.paste(Image.new('RGB', (256, 256), background), (column*256, 0))
    for row, artwork in enumerate([portrait, cell]):
        small = artwork.copy()
        small.thumbnail((128, 128), Image.Resampling.LANCZOS)
        canvas.paste(small, (column*256+64, row*128), small)
canvas.save(review / 'alpha-and-mobile-size.png')
