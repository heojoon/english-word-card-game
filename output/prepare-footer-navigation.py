from pathlib import Path
import json
import shutil
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
dest = root / 'assets/ui/crystal-quest/navigation'
meta = json.loads((dest / 'navigation.generation.json').read_text(encoding='utf-8'))
masters = root / 'output/footer-navigation/source'
masters.mkdir(parents=True, exist_ok=True)
review = Image.new('RGB', (640, 240), '#F7F7FF')
draw = ImageDraw.Draw(review)
draw.rectangle((0, 120, 640, 240), fill='#5751D8')
for i, item in enumerate(meta['icons']):
    src = Path(item['original'])
    shutil.copy2(src, masters / f"{item['id']}.png")
    image = Image.open(src).convert('RGBA')
    alpha = image.getchannel('A')
    assert alpha.getextrema() == (0, 255), item['id']
    image = image.crop(alpha.getbbox())
    image.thumbnail((116, 116), Image.Resampling.LANCZOS)
    runtime = Image.new('RGBA', (128, 128))
    runtime.alpha_composite(image, ((128-image.width)//2, (128-image.height)//2))
    runtime.save(dest / item['file'], 'WEBP', quality=94, method=6)
    saved = Image.open(dest / item['file']).convert('RGBA')
    assert saved.getchannel('A').getextrema() == (0, 255)
    for y in (0, 120):
        review.paste(saved.resize((72, 72), Image.Resampling.LANCZOS), (i*160+44, y+5), saved.resize((72, 72), Image.Resampling.LANCZOS))
        small = saved.resize((36, 36), Image.Resampling.LANCZOS)
        review.paste(small, (i*160+62, y+82), small)
    print(item['id'], saved.size, (dest / item['file']).stat().st_size, 'bytes; alpha OK')
review.save(root / 'output/footer-navigation/review.png')
