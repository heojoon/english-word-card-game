"""Package imagegen's three seam repairs without moving any stage crystal."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/story/source/world-11-continuity'
RUNTIME = ROOT / 'assets/story/chapter-11-fallen-star-fortress-map.webp'
META = RUNTIME.with_suffix('.generation.json')
metadata = json.loads(META.read_text(encoding='utf-8'))
original = Image.open(SOURCE / 'previous-runtime.webp').convert('RGB')
canvas = original.copy()
centers = metadata['measuredPixelCenters']
repairs = []
for index, seam_y in enumerate([1536, 3072, 4608], 1):
    generated = Image.open(SOURCE / f'seam-{index}-generated.png').convert('RGB')
    patch = generated.resize((1024, 768), Image.Resampling.LANCZOS)
    mask = Image.new('L', (1024, 768))
    # Full generated terrain across the old cut, softly joined to preserved art.
    for y in range(768):
        distance = abs(y - 384)
        opacity = max(0, min(1, (264 - distance) / 144))
        ImageDraw.Draw(mask).line((0, y, 1023, y), fill=round(opacity * 255))
    protection = Image.new('L', (1024, 768), 255)
    draw = ImageDraw.Draw(protection)
    for x, y in centers:
        local_y = y - (seam_y - 384)
        if -100 < local_y < 868:
            draw.ellipse((x-67, local_y-75, x+67, local_y+66), fill=0)
    protection = protection.filter(ImageFilter.GaussianBlur(8))
    from PIL import ImageChops
    mask = ImageChops.multiply(mask, protection)
    canvas.paste(patch, (0, seam_y - 384), mask)
    repairs.append({'seamY': seam_y, 'cropBounds': [0, seam_y-384, 1024, seam_y+384],
                    'generatedOriginal': f'assets/story/source/world-11-continuity/seam-{index}-generated.png',
                    'generatedDimensions': list(generated.size), 'runtimeCropDimensions': [1024,768]})
canvas.save(SOURCE / 'continuous-map-original.png')
canvas.save(RUNTIME, 'WEBP', quality=91, method=6)
canvas.resize((390,2340), Image.Resampling.LANCZOS).save(SOURCE / 'review-mobile.jpg', quality=94)
for index, y in enumerate([1536,3072,4608],1):
    canvas.crop((0,y-384,1024,y+384)).save(SOURCE / f'seam-{index}-review.jpg', quality=94)
metadata['continuityRevision'] = {
    'date': '2026-11-25', 'tool': 'image_gen.imagegen (built-in)', 'model': 'not disclosed by tool',
    'prompt': (SOURCE / 'prompt.txt').read_text(encoding='utf-8'),
    'styleReference': 'assets/story/chapter-1-library-map.webp',
    'layoutReferences': [f'assets/story/source/world-11-continuity/seam-{i}-input.png' for i in range(1,4)],
    'previousRuntime': 'assets/story/source/world-11-continuity/previous-runtime.webp',
    'original': 'assets/story/source/world-11-continuity/continuous-map-original.png',
    'repairs': repairs, 'stageCount':44, 'positionsChanged':False,
    'method': 'Generated terrain across all three panel cuts, normalized to input crop dimensions, feathered into unchanged surroundings; original waypoint regions protected.',
    'technicalReview': 'pending', 'browserReview': 'pending', 'userVisualApproval': 'not claimed'
}
metadata['runtimeSha256'] = hashlib.sha256(RUNTIME.read_bytes()).hexdigest()
META.write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
assert len(centers)==44 and canvas.size==(1024,6144)
print(json.dumps({'size':canvas.size,'stageCount':len(centers),'runtimeBytes':RUNTIME.stat().st_size}))
