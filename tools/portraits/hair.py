"""Lift the hair off each sample head: everything that is neither skin nor paper, above the brows
(and beside the face, for longer styles). The result is a hair-only layer with a soft alpha."""
import numpy as np, cv2, json
from PIL import Image
from land import landmarks

def lab(rgb):
    return cv2.cvtColor(np.clip(rgb, 0, 255).astype(np.uint8), cv2.COLOR_RGB2LAB).astype(np.float32)

meta = {}
for i in range(8):
    n = f'hairhead{i}'
    a = np.asarray(Image.open(f'raw/{n}.png')).astype(np.float32)
    h, w = a.shape[:2]
    L = landmarks(n); ex, ey, iod = L['ex'], L['ey'], L['iod']
    yy, xx = np.mgrid[0:h, 0:w]
    al = a[..., 3] / 255
    Lab = lab(a[..., :3])
    cheek = (yy > ey + 0.3 * iod) & (yy < ey + 0.55 * iod) & (np.abs(xx - ex) > 0.25 * iod) & (np.abs(xx - ex) < 0.5 * iod) & (al > 0.9)
    sk = np.median(Lab[cheek], 0)
    # distance from the skin colour, allowing skin to be darker in shadow (L) but not to change hue much
    dL = sk[0] - Lab[..., 0]
    dab = np.sqrt((Lab[..., 1] - sk[1]) ** 2 + (Lab[..., 2] - sk[2]) ** 2)
    chroma = np.sqrt((Lab[..., 1] - 128) ** 2 + (Lab[..., 2] - 128) ** 2); skc = np.sqrt((sk[1] - 128) ** 2 + (sk[2] - 128) ** 2)
    dull = np.clip((0.85 * skc - chroma) / (0.3 * skc), 0, 1)        # hair is less saturated than skin
    hairness = np.clip((dL - 22) / 26, 0, 1) * np.maximum(dull, np.clip((dL - 60) / 20, 0, 1))
    hue = np.abs(np.arctan2(Lab[..., 2] - 128, Lab[..., 1] - 128) - np.arctan2(sk[2] - 128, sk[1] - 128))
    hairness = np.maximum(hairness, np.clip((hue - 0.22) / 0.12, 0, 1) * np.clip((dab - 12) / 10, 0, 1) * (dL > -10))  # blond / red: a different hue
    # where hair may be: above the brow line across the head, or beside the face down to the jaw
    brow = ey - 0.36 * iod
    region = np.clip((brow - yy) / 12, 0, 1)
    side = np.clip((np.abs(xx - ex) - 0.78 * iod) / 6, 0, 1) * (yy < ey + 1.05 * iod)
    region = np.maximum(region, side)
    # the ears are skin, never hair
    hairness *= region
    alpha = (hairness * al).astype(np.float32)
    alpha = cv2.GaussianBlur(alpha, (3, 3), 0.7)
    m = (alpha > 0.15).astype(np.uint8)
    n_, labm, st, _ = cv2.connectedComponentsWithStats(m)
    keep = np.zeros_like(m)
    for k in range(1, n_):
        if st[k, cv2.CC_STAT_AREA] > 25: keep[labm == k] = 1
    alpha *= cv2.dilate(keep, np.ones((3, 3), np.uint8))
    # luminance of the hair, for re-colouring later
    out = np.dstack([a[..., :3], alpha * 255]).astype(np.uint8)
    ys, xs = np.nonzero(alpha > 0.03)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    Image.fromarray(out[y0:y1, x0:x1], 'RGBA').save(f'raw/hair{i}.png')
    meta[f'hair{i}'] = dict(ex=float(ex - x0), ey=float(ey - y0), iod=float(iod))
json.dump(meta, open('raw/hair.json', 'w'), indent=1)
