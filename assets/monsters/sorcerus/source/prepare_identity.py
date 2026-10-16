"""Pack the generated transparent identity without repainting or color-keying it."""
from pathlib import Path
from PIL import Image, ImageDraw
import json

root = Path(__file__).resolve().parents[1]
source = root / 'source/sorcerus-sd-identity-master.png'
image = Image.open(source).convert('RGBA')
alpha = image.getchannel('A')
if alpha.getextrema() != (0, 255):
    raise ValueError('Expected genuinely transparent exterior and opaque character regions')
if any(alpha.getpixel(point) != 0 for point in [(0, 0), (image.width-1, 0), (0, image.height-1), (image.width-1, image.height-1)]):
    raise ValueError('Exterior corners must be transparent')
visible_bounds = alpha.point(lambda value: 255 if value >= 8 else 0).getbbox()
# Ignore sub-8-alpha exterior dust when measuring the silhouette; preserve the
# source untouched and keep an extra 12px safety band around visible artwork.
bounds = (max(0, visible_bounds[0]-12), max(0, visible_bounds[1]-12),
          min(image.width, visible_bounds[2]+12), min(image.height, visible_bounds[3]+12))
visible = image.crop(bounds)
scale = min(280 / visible.width, 288 / visible.height)
size = tuple(round(value * scale) for value in visible.size)
scaled = visible.resize(size, Image.Resampling.LANCZOS)
cell = Image.new('RGBA', (320, 320))
offset = ((320-size[0])//2, 312-round((visible_bounds[3]-bounds[1])*scale))
cell.alpha_composite(scaled, offset)
name = 'char_sorcerus_sd_identity.png'
cell.save(root / name)
review = root / 'review'
review.mkdir(exist_ok=True)
sheet = Image.new('RGB', (680, 520), '#F7F7FF')
draw = ImageDraw.Draw(sheet)
for i, (label, color) in enumerate([('Moon White', '#F7F7FF'), ('Crystal Violet', '#5751D8')]):
    large = Image.new('RGBA', (320, 320), color)
    large.alpha_composite(cell)
    large.convert('RGB').save(review / f'identity-{label.lower().replace(" ", "-")}.png')
    sheet.paste(large.convert('RGB'), (10+i*340, 30))
    draw.text((10+i*340, 10), label, fill='#24214C')
    small = Image.new('RGBA', (128, 128), color)
    small.alpha_composite(cell.resize((128, 128), Image.Resampling.LANCZOS))
    sheet.paste(small.convert('RGB'), (106+i*340, 380))
    draw.text((10+i*340, 358), '128 px gameplay preview', fill='#24214C')
sheet.save(review / 'identity-review.png')
manifest = {
    'image': name, 'frameWidth': 320, 'frameHeight': 320, 'frameCount': 1,
    'layout': 'single', 'anchor': {'x': .5, 'y': .975}, 'facing': 'left',
    'frameNames': ['battle-ready'], 'frames': [{'name': 'battle-ready', 'duration': 600}],
    'source': 'source/sorcerus-sd-identity-master.png', 'sourceBounds': bounds,
    'visibleSourceBounds': visible_bounds, 'sourceGroundLine': visible_bounds[3],
    'sharedScale': scale, 'runtimeOffset': offset,
    'review': {'technical': 'pending visual inspection', 'userApproval': 'not requested', 'animation': 'identity only; strips planned separately', 'browser': 'not run; no runtime integration'}
}
(root / name.replace('.png', '.json')).write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(json.dumps({'sourceSize': image.size, 'sourceBounds': bounds, 'runtimeBounds': cell.getchannel('A').getbbox(), 'transparentPixels': alpha.histogram()[0], 'output': str(root / name)}))
