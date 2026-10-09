"""Normalize the identity master without repainting or removing foreground pixels."""
import json
import runpy
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
master = Image.open(root / 'source/identity-master.png').convert('RGBA')
subject = master.crop(master.getchannel('A').getbbox())

def normalize(size, margin, baseline):
    scale = min((size - margin * 2) / subject.width, (baseline - margin) / subject.height)
    art = subject.resize((round(subject.width * scale), round(subject.height * scale)), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (size, size))
    canvas.alpha_composite(art, ((size - art.width) // 2, baseline - art.height))
    return canvas

ready = normalize(320, 12, 312)
ready.save(root / 'char_mage_female_starlight_rose_sd_ready.png')
avatar_path = root.parents[2] / 'avatars/skins/mage-female-starlight-rose.webp'
# Display art comes from the approved illustration, never the SD master.
runpy.run_path(str(root / 'source/export-profile.py'), run_name='__main__')
profile = Image.open(avatar_path)

for size in (320, 148):
    art = ready if size == 320 else ready.resize((size, size), Image.Resampling.LANCZOS)
    review = Image.new('RGB', (size * 2, size))
    for col, color in enumerate(('#F7F7FF', '#5751D8')):
        panel = Image.new('RGBA', (size, size), color)
        panel.alpha_composite(art)
        review.paste(panel.convert('RGB'), (col * size, 0))
    review.save(root / f'review/identity-light-violet-{size}.png')

alpha = ready.getchannel('A')
bounds = alpha.getbbox()
assert ready.mode == 'RGBA' and alpha.getextrema() == (0, 255)
assert bounds[0] >= 12 and bounds[1] >= 12 and bounds[2] <= 308 and bounds[3] <= 312
(root / 'review/validation.json').write_text(json.dumps({
    'masterSize': list(master.size), 'runtimeSize': list(ready.size),
    'runtimeForegroundBounds': list(bounds), 'alphaRange': list(alpha.getextrema()),
    'mobileReviewPx': 148, 'profileSize': list(profile.size),
    'animationCreated': False, 'gameIntegrated': False
}, indent=2) + '\n', encoding='utf-8')
print('Exported transparent SD identity, approved illustration WebP and light/violet review images.')
