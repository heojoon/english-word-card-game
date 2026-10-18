"""Normalize generated bandit poses; preserve alpha and source masters."""
from pathlib import Path
import json
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parents[1] / 'assets/monsters/bandit'
contract = json.loads((ROOT / 'animation-contract.json').read_text())
for action, spec in contract['actions'].items():
    src = Image.open(ROOT / f'source/{action}-generated.png').convert('RGBA')
    count = spec['count']
    poses = []
    for i in range(count):
        pose = src.crop((round(i*src.width/count), 0, round((i+1)*src.width/count), src.height))
        isolated = ROOT / f'source/{action}-isolated-{i+1:02}.png'
        if isolated.exists():
            pose = Image.open(isolated).convert('RGBA')
        override = ROOT / f'source/{action}-{spec["names"][i]}-generated.png'
        if override.exists():
            pose = Image.open(override).convert('RGBA')
        # Resample isolated re-generations to the original source character scale.
        if override.exists():
            box = pose.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox()
            pose = pose.crop(box)
            target_height = 595 if action=='attack' else (330 if i==2 else 740)
            pose = pose.resize((round(pose.width*target_height/pose.height),target_height),Image.Resampling.LANCZOS)
        # Alpha threshold locates visible content only, without keying costume colors.
        box = pose.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox()
        poses.append(pose.crop(box))
    # One common scale per sequence; standing first frame calibrates body height.
    scale = min(280 / poses[0].height, 298 / max(p.width for p in poses), 296 / max(p.height for p in poses))
    frames = []
    for i, pose in enumerate(poses):
        pose = pose.resize((round(pose.width*scale), round(pose.height*scale)), Image.Resampling.LANCZOS)
        frame = Image.new('RGBA', (320,320))
        frame.alpha_composite(pose, ((320-pose.width)//2,312-pose.height))
        folder = ROOT / action
        folder.mkdir(exist_ok=True)
        frame.save(folder / f'{i+1:02}.png')
        frames.append(frame)
    strip = Image.new('RGBA',(320*count,320))
    spaced = Image.new('RGBA',(320*count+50*(count-1),320))
    for i, frame in enumerate(frames):
        strip.alpha_composite(frame,(320*i,0))
        spaced.alpha_composite(frame,(370*i,0))
    image = f'bandit-sd-{action}-strip.png'
    strip.save(ROOT / image)
    spaced.save(ROOT / f'review/{action}-source-50px.png')
    manifest = dict(image=image,frameWidth=320,frameHeight=320,frameCount=count,layout='horizontal',anchor=contract['anchor'],sourceFrameGapPx=50,loop=spec['loop'],frames=[])
    for i, name in enumerate(spec['names']):
        frame = dict(name=name,durationMs=spec['durationsMs'][i])
        if action=='attack' and i==2: frame['hit']=True
        if action=='hit' and i==2: frame['hold']=True
        manifest['frames'].append(frame)
    (ROOT / image.replace('.png','.json')).write_text(json.dumps(manifest,indent=2)+'\n')
    for color, label in [('#F7F7FF','light'),('#5751D8','violet')]:
        board=Image.new('RGB',(count*160,180),color)
        for i, frame in enumerate(frames):
            thumb=frame.resize((160,160),Image.Resampling.LANCZOS)
            board.paste(thumb,(i*160,0),thumb)
            ImageDraw.Draw(board).text((i*160+5,164),spec['names'][i],fill='black' if label=='light' else 'white')
        board.save(ROOT/f'review/{action}-{label}.jpg')
    previews=[]
    for frame in frames:
        bg=Image.new('RGBA',(128,128),'#5751D8');bg.alpha_composite(frame.resize((128,128),Image.Resampling.LANCZOS));previews.append(bg.convert('RGB'))
    previews[0].save(ROOT/f'review/{action}-mobile.gif',save_all=True,append_images=previews[1:],duration=spec['durationsMs'],loop=0 if action=='idle' else 1)
    print(action,src.size,'scale',round(scale,4),'bounds',[f.getbbox() for f in frames])
