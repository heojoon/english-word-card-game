"""Validate shipping geometry, true alpha, safety bands and review-master gaps."""
from pathlib import Path
from PIL import Image
import json

root = Path(__file__).resolve().parents[1]
expected = {'idle':2, 'ice_time':4, 'healing':3, 'hit':3}
for action,count in expected.items():
    path = root/f'char_sorcerus_sd_{action}_strip.json'
    data = json.loads(path.read_text(encoding='utf-8'))
    assert data['frameCount']==count
    assert len(data['frames'])==count
    assert data['anchor']=={'x':.5,'y':.975}
    assert data['facing']=='left'
    assert all(frame['duration']>0 for frame in data['frames'])
    strip = Image.open(root/data['image'])
    width,height = data['frameWidth'],data['frameHeight']
    assert strip.mode=='RGBA' and strip.size==(width*count,height)
    for i in range(count):
        cell = strip.crop((i*width,0,(i+1)*width,height))
        alpha = cell.getchannel('A')
        amin,amax=alpha.getextrema()
        assert amin==0 and amax>=250
        bounds = alpha.getbbox()
        assert 0<bounds[0]<bounds[2]<width and 0<bounds[1]<bounds[3]<height,(action,i,bounds)
        assert cell.crop((0,0,3,height)).getchannel('A').getextrema()[1]==0,(action,i,'left seam')
        assert cell.crop((width-3,0,width,height)).getchannel('A').getextrema()[1]==0,(action,i,'right seam')
    spaced = Image.open(root/'review'/f'{action.replace("_","-")}-spaced-master.png')
    assert spaced.size==(width*count+50*(count-1),height)
    for i in range(count-1):
        gap = spaced.crop((i*(width+50)+width,0,i*(width+50)+width+50,height))
        assert gap.getchannel('A').getextrema()==(0,0)
    if action=='hit':
        assert data['finalFrameHold'] is True
        assert data['frameNames']==['guard-notice','impact-recoil','knockdown']
    print(f'{action}: {count} frames, {width}x{height}, alpha/safety/gaps/timing passed')
