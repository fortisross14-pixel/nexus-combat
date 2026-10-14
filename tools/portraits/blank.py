import numpy as np, cv2
from PIL import Image
from land import landmarks
def feature_mask(name):
    a=np.asarray(Image.open(f'raw/{name}.png')).astype(np.float32)
    L=landmarks(name);ex,ey,iod=L['ex'],L['ey'],L['iod']
    h,w=a.shape[:2];yy,xx=np.mgrid[0:h,0:w]
    s=a[...,:3].sum(2);al=a[...,3]>200
    # brows + eyes: anything clearly darker than skin or white, in the eye band
    band=(yy>ey-0.62*iod)&(yy<ey+0.22*iod)&(np.abs(xx-ex)<0.80*iod)
    skin=np.median(a[...,:3][(yy>ey+0.25*iod)&(yy<ey+0.45*iod)&(np.abs(xx-ex)>0.25*iod)&(np.abs(xx-ex)<0.55*iod)&al],axis=0)
    dev=np.abs(a[...,:3]-skin).sum(2)
    eyes=band&al&(dev>55)
    eyes=cv2.dilate(eyes.astype(np.uint8),np.ones((7,7),np.uint8))
    m=np.zeros((h,w),np.uint8)
    cv2.ellipse(m,(int(ex),int(ey+0.40*iod)),(int(0.26*iod),int(0.30*iod)),0,0,360,1,-1)   # nose
    cv2.ellipse(m,(int(ex),int(ey+0.79*iod)),(int(0.48*iod),int(0.21*iod)),0,0,360,1,-1)  # mouth + lip shadow
    return np.maximum(eyes,m),a,skin
if __name__=='__main__':
    outs=[]
    for i in range(3):
        m,a,skin=feature_mask(f'base{i}')
        rgb=a[...,:3].astype(np.uint8).copy()
        bgr=cv2.cvtColor(rgb,cv2.COLOR_RGB2BGR)
        res=cv2.inpaint(bgr,m*255,9,cv2.INPAINT_TELEA)
        res=cv2.cvtColor(res,cv2.COLOR_BGR2RGB)
        # soften the repaired zone so it reads as smooth skin
        blur=cv2.GaussianBlur(res,(0,0),4)
        mm=cv2.GaussianBlur(m.astype(np.float32),(0,0),3)[...,None]
        res=(res*(1-mm)+blur*mm).astype(np.uint8)
        out=np.dstack([res,a[...,3].astype(np.uint8)])
        Image.fromarray(out,'RGBA').save(f'raw/blank{i}.png')
        dbg=rgb.copy();dbg[m>0]=(dbg[m>0]*.5+np.array([0,255,0])*.5).astype(np.uint8)
        outs+= [dbg,res]
    H=max(o.shape[0] for o in outs)
    row=np.concatenate([np.pad(o,((0,H-o.shape[0]),(0,4),(0,0)),constant_values=40) for o in outs],1)
    Image.fromarray(row).resize((row.shape[1]*2,H*2)).save('v_blank.png')
