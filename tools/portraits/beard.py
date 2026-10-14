"""Facial hair layers: the darker-than-skin pixels of each lower-face sample, kept with a soft alpha."""
import numpy as np, cv2, json
from PIL import Image

def lab(rgb): return cv2.cvtColor(np.clip(rgb, 0, 255).astype(np.uint8), cv2.COLOR_RGB2LAB).astype(np.float32)
meta = {}
for i in range(4):
    a = np.asarray(Image.open(f'raw/beard{i}.png')).astype(np.float32)
    h, w = a.shape[:2]
    al = a[..., 3] / 255
    Lab = lab(a[..., :3])
    yy, xx = np.mgrid[0:h, 0:w]
    # skin reference: upper cheeks at the crop's sides
    ref = (yy < h * 0.25) & ((xx < w * 0.25) | (xx > w * 0.75)) & (al > 0.9)
    sk = np.median(Lab[ref], 0)
    dL = sk[0] - Lab[..., 0]
    dab = np.sqrt((Lab[..., 1] - sk[1]) ** 2 + (Lab[..., 2] - sk[2]) ** 2)
    beard = np.clip((dL - (10 if i == 0 else 16)) / 30, 0, 1) * np.clip((22 - (Lab[..., 1] - 128 - (sk[1] - 128))) / 10, 0, 1)
    # lips are darker but red: exclude strongly red pixels; the jaw line shadow is excluded by keeping it soft
    red = (Lab[..., 1] - sk[1]) > 6
    beard[red] *= 0.15
    alpha = cv2.GaussianBlur((beard * al).astype(np.float32), (3, 3), 0.6)
    # where the face meets the paper the outline is darker: drop a 3 px rim
    rim = cv2.erode((al > 0.9).astype(np.uint8), np.ones((7, 7), np.uint8))
    alpha *= rim
    out = np.dstack([a[..., :3], alpha * 255]).astype(np.uint8)
    Image.fromarray(out, 'RGBA').save(f'raw/beardlayer{i}.png')
    # anchors: the crop's mouth line and jaw width
    row = int(h * 0.42)
    xs = np.nonzero(al[row] > 0.5)[0]
    meta[f'beard{i}'] = dict(w=w, h=h, jaw=float(xs.max() - xs.min()), cx=float((xs.max() + xs.min()) / 2), mouth=float(row))
json.dump(meta, open('raw/beard.json', 'w'), indent=1)
