"""Measure violet waypoint bodies without modifying generated artwork."""
from PIL import Image
from pathlib import Path
import json
import sys

path = Path(sys.argv[1])
im = Image.open(path).convert('RGB')
w, h = im.size
px = im.load()
mask = set()
for y in range(h):
    for x in range(w):
        r, g, b = px[x, y]
        if b > 145 and b > g * 1.27 and r > g * 1.12 and b > r * 1.05:
            mask.add(y * w + x)
regions = []
while mask:
    start = mask.pop()
    pending = [start]
    area = []
    while pending:
        p = pending.pop()
        area.append(p)
        x, y = p % w, p // w
        for q in (p - 1 if x else -1, p + 1 if x < w - 1 else -1, p - w, p + w):
            if q in mask:
                mask.remove(q)
                pending.append(q)
    if len(area) >= 250:
        xx = [p % w for p in area]
        yy = [p // w for p in area]
        regions.append({'pixels': len(area), 'bbox': [min(xx), min(yy), max(xx), max(yy)], 'center': [round(sum(xx)/len(xx), 2), round(sum(yy)/len(yy), 2)]})
print(json.dumps({'image': str(path), 'size': [w, h], 'regions': sorted(regions, key=lambda r:r['center'][1])}, indent=2))
