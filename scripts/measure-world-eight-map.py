"""Measure violet waypoint centers; never modifies the generated artwork."""
from PIL import Image
import colorsys
import json

im = Image.open('assets/story/chapter-8-silver-bell-village-map.webp').convert('RGB')
w, h = im.size
mask = set()
for y in range(h):
    for x in range(w):
        r, g, b = im.getpixel((x, y))
        hue, sat, val = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        if .64 < hue < .81 and sat > .40 and val > .68:
            mask.add((x, y))
parts = []
while mask:
    seed = mask.pop()
    pending = [seed]
    part = [seed]
    while pending:
        x, y = pending.pop()
        for q in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
            if q in mask:
                mask.remove(q)
                pending.append(q)
                part.append(q)
    if len(part) >= 30:
        xs, ys = zip(*part)
        parts.append({'area':len(part),'x':round(sum(xs)/len(xs)/w*100,3),'y':round(sum(ys)/len(ys)/h*100,3),'bounds':[min(xs),min(ys),max(xs),max(ys)]})
print(json.dumps(sorted(parts,key=lambda p:p['y']),indent=2))
