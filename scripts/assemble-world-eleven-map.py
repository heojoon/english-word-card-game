"""Place generated panels, export WebP, measure crystals; never paint artwork."""
from pathlib import Path
from PIL import Image, ImageDraw
import hashlib
import json
import math

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/story/source/world-11'
RUNTIME = ROOT / 'assets/story/chapter-11-fallen-star-fortress-map.webp'
SEEDS = [
    [(512,90),(695,198),(780,306),(567,411),(312,511),(207,653),(360,760),(573,870),(751,997),(569,1119),(413,1287),(512,1430)],
    [(512,90),(694,183),(745,307),(511,424),(281,539),(270,670),(512,769),(729,869),(632,987),(511,1398)],
    [(512,90),(694,184),(769,301),(588,409),(363,513),(241,667),(366,769),(604,868),(771,1003),(630,1134),(512,1310)],
    [(512,88),(685,176),(780,276),(613,371),(369,444),(237,548),(391,658),(621,727),(771,821),(614,921),(512,1393)],
]
panels = [Image.open(SOURCE / f'panel-{i:02d}-original.png').convert('RGB') for i in range(1,5)]
assert all(im.size == (1024,1536) for im in panels)
canvas = Image.new('RGB',(1024,6144))
actual, panel_records = [], []
for index,(im,seeds) in enumerate(zip(panels,SEEDS)):
    canvas.paste(im,(0,index*1536))
    local = []
    px = im.load()
    for sx,sy in seeds:
        pixels = []
        for y in range(sy-37,sy+38):
            for x in range(sx-32,sx+33):
                r,g,b = px[x,y]
                if b>145 and b>g*1.2 and r>g*1.06 and b>r*1.03:
                    pixels.append((x,y))
        assert pixels
        left,top = min(p[0] for p in pixels),min(p[1] for p in pixels)
        right,bottom = max(p[0] for p in pixels),max(p[1] for p in pixels)
        x,y = round((left+right)/2,2),round((top+bottom)/2,2)
        local.append({'center':[x,y],'violetBodyBounds':[left,top,right,bottom]})
        actual.append([x,y+index*1536])
    panel_records.append({'panel':index+1,'original':f'assets/story/source/world-11/panel-{index+1:02d}-original.png','size':list(im.size),'count':len(seeds),'measuredWaypoints':local})
assert len(actual)==44
assert all(actual[i][1]>actual[i-1][1] for i in range(1,44))
positions = [[f'{x/1024*100:.3f}%',f'{y/6144*100:.3f}%'] for x,y in actual]
canvas.save(SOURCE/'world-eleven-assembled-original.png')
canvas.save(RUNTIME,'WEBP',quality=91,method=6)
review = canvas.copy()
draw = ImageDraw.Draw(review)
for n,(x,y) in enumerate(actual,1):
    draw.ellipse((x-28,y-28,x+28,y+28),outline='#f70070',width=3)
    draw.text((x+32,y-10),str(n),fill='#1b1749',stroke_width=2,stroke_fill='white')
review.save(SOURCE/'review-waypoints-44.jpg',quality=90)
review.resize((390,2340),Image.Resampling.LANCZOS).save(SOURCE/'review-mobile-390.jpg',quality=92)
canvas.resize((390,2340),Image.Resampling.LANCZOS).save(SOURCE/'review-mobile-art-390.jpg',quality=92)
prompts = json.loads((SOURCE/'prompts.json').read_text(encoding='utf-8'))
nearest = min(math.dist(actual[i],actual[j]) for i in range(44) for j in range(i))
metadata = {
 'date':'2026-11-22','world':11,'title':'낙성 요새의 마지막 수송',
 'tool':'image_gen.imagegen (built-in)','model':'not disclosed by tool',
 'styleReference':'assets/story/chapter-1-library-map.webp',
 'layoutReference':'Approved World11 spec and story; previous original panel for material/road continuity. No existing World11 layout image.',
 'guide':'WORLD_MAP_IMAGE_GUIDE.md','spec':'docs/superpowers/specs/2026-11-22-world-eleven-design.md',
 'prompts':prompts['panels'],'original':'assets/story/source/world-11/world-eleven-assembled-original.png',
 'runtime':str(RUNTIME.relative_to(ROOT)).replace(chr(92),'/'),
 'targetDimensions':[1024,6144],'actualDimensions':list(canvas.size),
 'assembly':'Four original 1024x1536 generated panels directly stacked without resizing or repainting. All road entry/exit edges centered. Panel transitions are visible changes of scenery.',
 'panels':panel_records,'stageCount':44,'positions':positions,'measuredPixelCenters':actual,
 'measurement':'Visually counted gold-rimmed violet crystals; manually localized each body, then measured violet-body bounding-box center inside isolated ROI. Coordinates use crystal bodies, not pedestal bottoms.',
 'progression':'Strictly increasing y: old supply road1-12; unloading yard13-21; chain gate22; maintenance ramparts23-33; courtyard34-43; bottom east gate44.',
 'minimumCenterDistancePixels':round(nearest,3),'minimumCenterDistanceAt390CssPixels':round(nearest*390/1024,3),
 'runtimeSha256':hashlib.sha256(RUNTIME.read_bytes()).hexdigest(),
 'review':{
  'technical':'44 crystals counted (12+10+11+11); increasing measured y validated; no text/UI/people; no clipped waypoint; all original panels and 390px mobile annotated review inspected. All44 annotation circles align with crystal bodies. Panel boundaries have visible scenery transitions; central roads connect.',
  'stage22':'Chained portcullis with side chain drums at waypoint22.',
  'stage44':'Large open east gate with timber bracing and courtyard windlass at bottom waypoint44.',
  'browserAlignment':'pending root integration review','userVisualApproval':'not requested or claimed',
  'artReview':'Warm painterly cream stone, lush varied foliage, clouds and violet crystals compared to chapter1; cargo fortification landmarks preserve this region.',
  'files':['assets/story/source/world-11/review-waypoints-44.jpg','assets/story/source/world-11/review-mobile-390.jpg','assets/story/source/world-11/review-mobile-art-390.jpg']
 }
}
RUNTIME.with_suffix('.generation.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'size':canvas.size,'count':len(actual),'strictlyIncreasingY':True,'minimumCenterDistanceAt390':metadata['minimumCenterDistanceAt390CssPixels'],'runtimeBytes':RUNTIME.stat().st_size,'positions':positions},ensure_ascii=False))
