"""Measure crystal bodies near visually identified waypoints; write review overlay."""
import json
import re
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[4]
script = (root / 'crystal-game.js').read_text(encoding='utf-8')
positions = json.loads(re.search(r"number:12,displayNumber:'9'.*?positions:(\[\[.*?\]\])", script).group(1))
im = Image.open(root / 'assets/story/chapter-9-dawn-training-map.webp').convert('RGB')
centers = []
for pos in positions:
    x, y = [float(v.rstrip('%')) / 100 * size for v, size in zip(pos, im.size)]
    points = []
    for yy in range(round(y)-18, round(y)+19):
        for xx in range(round(x)-18, round(x)+19):
            r, g, b = im.getpixel((xx, yy))
            if b > r*1.12 and r > g*1.12 and b > 140 and r > 100 and b-g > 55:
                points.append((xx, yy))
    if len(points) < 50:
        raise ValueError(f'Waypoint {len(centers)+1}: no readable crystal body')
    centers.append([round(sum(p[i] for p in points)/len(points), 2) for i in (0, 1)])

normalized = [[f'{x/im.width*100:.3f}%', f'{y/im.height*100:.3f}%'] for x, y in centers]
(Path(__file__).parent / 'measured-waypoints.json').write_text(json.dumps({'dimensions': list(im.size), 'centersPx': centers, 'positions': normalized}, indent=2), encoding='utf-8')
draw = ImageDraw.Draw(im)
for number, (x, y) in enumerate(centers, 1):
    draw.ellipse((x-18, y-18, x+18, y+18), outline='#ff4050', width=2)
    draw.text((x+20, y-5), str(number), fill='#ff2040', stroke_width=1, stroke_fill='white')
im.save(Path(__file__).parent / 'waypoint-review.png')
print(f'Measured {len(centers)} crystal centers on {im.width}x{im.height}')
