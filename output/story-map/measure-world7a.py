from PIL import Image,ImageDraw
import numpy as np
from collections import deque
im=Image.open('C:/Users/Administrator/.codex/generated_images/01a15d62-f4e1-7451-a5ac-9891e1a75dd6/exec-a5e0ed36-2c0b-4f6a-8614-47afb6f7dcc8.png').convert('RGB')
a=np.array(im).astype(float); r,g,b=a[:,:,0],a[:,:,1],a[:,:,2]
m=(b>150)&(b>r*1.15)&(b>g*1.25)&(r>g*.8)
found=[]
for y,x in zip(*np.where(m)):
    if not m[y,x]: continue
    q=[(x,y)]; m[y,x]=False; pixels=[]
    for xx,yy in q:
        pixels.append((xx,yy))
        for nx,ny in [(xx-1,yy),(xx+1,yy),(xx,yy-1),(xx,yy+1)]:
            if 0<=nx<im.width and 0<=ny<im.height and m[ny,nx]: m[ny,nx]=False; q.append((nx,ny))
    if len(pixels)<90:continue
    xs,ys=zip(*pixels); x0,x1,y0,y1=min(xs),max(xs),min(ys),max(ys)
    found.append((x0,x1,y0,y1,len(pixels)))
d=ImageDraw.Draw(im)
for i,(x0,x1,y0,y1,n) in enumerate(sorted(found,key=lambda z:z[2])):
    d.rectangle((x0,y0,x1,y1),outline='red',width=2); d.text((x1+3,y0),str(i),fill='red')
    print(i,round((x0+x1)/2/im.width*100,2),round((y0+y1)/2/im.height*100,2),n)
im.resize((724,2172)).save('output/story-map/world7a-detection.jpg')
