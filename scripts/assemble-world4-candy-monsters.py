"""Separate the approved ensemble into five alpha-preserving runtime sprites."""
from collections import deque
from pathlib import Path
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'assets/monsters/world-4'
SOURCE = DEST / 'monster_crystal_candy_five_left_concept.png'
image = Image.open(SOURCE).convert('RGBA')
width, height = image.size
alpha = image.getchannel('A')
# Discard nearly invisible generation haze connecting otherwise separate subjects.
mask = bytearray(value > 16 for value in alpha.tobytes())
components = []
for seed in range(width * height):
    if not mask[seed]:
        continue
    mask[seed] = 0
    queue = deque([seed])
    pixels = []
    while queue:
        pixel = queue.popleft()
        pixels.append(pixel)
        x, y = pixel % width, pixel // width
        for target in (pixel - 1 if x else -1,
                       pixel + 1 if x < width - 1 else -1,
                       pixel - width, pixel + width):
            if 0 <= target < len(mask) and mask[target]:
                mask[target] = 0
                queue.append(target)
    components.append(pixels)

large = [pixels for pixels in components if len(pixels) > 1000]
assert len(large) == 5, 'Expected five separated monster silhouettes'
large.sort(key=lambda pixels: (min(p // width for p in pixels) // 400,
                               min(p % width for p in pixels)))
centers = [(sum(p % width for p in pixels) / len(pixels),
            sum(p // width for p in pixels) / len(pixels)) for pixels in large]
for pixels in components:
    if len(pixels) > 1000:
        continue
    x, y = pixels[0] % width, pixels[0] // width
    nearest = min(range(5), key=lambda i: (x-centers[i][0])**2 + (y-centers[i][1])**2)
    large[nearest].extend(pixels)

bounds = [(min(p % width for p in pixels), min(p // width for p in pixels),
           max(p % width for p in pixels)+1, max(p // width for p in pixels)+1)
          for pixels in large]
scale = min(296 / max(b[2]-b[0] for b in bounds),
            296 / max(b[3]-b[1] for b in bounds))
names = ['angry-01', 'crying-01', 'tongue-01', 'angry-02', 'tongue-02']
entries = []
for name, pixels, box in zip(names, large, bounds):
    isolated_alpha = Image.new('L', image.size)
    values = bytearray(width * height)
    original_alpha = alpha.tobytes()
    for pixel in pixels:
        values[pixel] = original_alpha[pixel]
    isolated_alpha.frombytes(bytes(values))
    isolated = image.copy()
    isolated.putalpha(isolated_alpha)
    cropped = isolated.crop(box)
    resized = cropped.resize((round(cropped.width * scale), round(cropped.height * scale)),
                             Image.Resampling.LANCZOS)
    frame = Image.new('RGBA', (320, 320))
    frame.alpha_composite(resized, ((320-resized.width)//2, 312-resized.height))
    filename = f'monster_crystal_candy_{name}_left.png'
    frame.save(DEST / filename, optimize=True)
    entries.append({'image': filename, 'expression': name, 'sourceBounds': list(box)})

(DEST / 'monster_crystal_candy_runtime.json').write_text(json.dumps({
    'source': SOURCE.name, 'facing': 'left', 'frameWidth': 320, 'frameHeight': 320,
    'anchor': {'x': 0.5, 'y': 0.975}, 'sprites': entries,
    'notes': 'Five individual static monster poses; existing battle bob and contact feedback apply.'
}, indent=2) + '\n', encoding='utf-8')
print('Exported five transparent 320 x 320 candy monsters.')
