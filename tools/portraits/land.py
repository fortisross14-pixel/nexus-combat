import numpy as np
from PIL import Image
def landmarks(name):
    a=np.asarray(Image.open(f'raw/{name}.png')).astype(float)
    al=a[...,3]>200;h,w=al.shape
    r,g,b=a[...,0],a[...,1],a[...,2]
    white=al&(r>215)&(g>210)&(b>200)&(np.abs(r-b)<40)
    white[:int(h*.2)]=False;white[int(h*.7):]=False
    ys,xs=np.nonzero(white)
    mid=np.median(xs)
    L=xs<mid;R=~L
    lx,ly=xs[L].mean(),ys[L].mean();rx,ry=xs[R].mean(),ys[R].mean()
    return dict(ex=(lx+rx)/2,ey=(ly+ry)/2,iod=rx-lx,w=w,h=h)
if __name__=='__main__':
    for n in [f'base{i}' for i in range(3)]+[f'hairhead{i}' for i in range(8)]:
        L=landmarks(n);print(n,{k:round(float(v),1) for k,v in L.items()})
