"""Eye parts: put the eye whites back. They are the light pixels around the iris, inside the eye's almond."""
import numpy as np, cv2, json
from PIL import Image
SHEET=np.asarray(Image.open('sheet.png').convert('RGB')).astype(np.float32)
boxes=json.load(open('raw/boxes.json'))
for side in 'LR':
    for i in range(4):
        n=f'eye{side}{i}';b=boxes[n]
        a=np.asarray(Image.open(f'raw/{n}.png')).astype(np.float32)
        src=SHEET[b['y']:b['y']+b['h'],b['x']:b['x']+b['w']]
        h,w=a.shape[:2]
        s=src.sum(2)
        lower=np.zeros((h,w),bool);lower[int(h*.45):]=True
        ys,xs=np.nonzero((s<150)&lower)
        cy,cx=ys.mean(),xs.mean()
        ell=np.zeros((h,w),np.uint8);cv2.ellipse(ell,(int(cx),int(cy)),(int(w*.46),int(h*.19)),0,0,360,1,-1)
        dk=np.zeros((h,w),bool);dk[int(h*.42):]=True
        dys,dxs=np.nonzero((s<380)&dk&(a[...,3]>200))
        hull=cv2.convexHull(np.column_stack([dxs,dys]).astype(np.int32))
        almond=np.zeros((h,w),np.uint8);cv2.fillConvexPoly(almond,hull,1)
        light=((s>520)&(ell>0)&(almond>0)).astype(np.uint8)
        n_,lab=cv2.connectedComponents(light)
        # keep light blobs that touch the iris neighbourhood
        near=np.zeros((h,w),np.uint8);cv2.ellipse(near,(int(cx),int(cy)),(int(w*.42),int(h*.12)),0,0,360,1,-1)
        keep=[k for k in range(1,n_) if ((lab==k)&(near>0)).any()]
        sclera=np.isin(lab,keep)
        out=a.copy()
        out[sclera,:3]=src[sclera];out[sclera,3]=255
        halo=(out[...,:3].sum(2)>640)&~sclera
        out[halo,3]=0
        Image.fromarray(out.astype(np.uint8),'RGBA').save(f'raw/{n}.png')
