"""Cut every part out of the reference sheet as an RGBA image with a clean alpha edge."""
import numpy as np, cv2, os, json
from PIL import Image

SHEET = np.asarray(Image.open('sheet.png').convert('RGB')).astype(np.float32)
BG = np.array([252, 250, 247], np.float32)
os.makedirs('raw', exist_ok=True)

def cut(name, x, y, w, h, thr=26, soft=22, keep=None, multi=False, fgfn=None):
    pad = 6
    x0, y0 = max(0, x - pad), max(0, y - pad)
    x1, y1 = min(SHEET.shape[1], x + w + pad), min(SHEET.shape[0], y + h + pad)
    rgb = SHEET[y0:y1, x0:x1].copy()
    dist = np.abs(rgb - BG).sum(2)
    near = (dist < thr).astype(np.uint8)
    # Background = near-white pixels connected to the crop border (so eye whites survive).
    ff = near.copy()
    hgt, wid = ff.shape
    mask = np.zeros((hgt + 2, wid + 2), np.uint8)
    for (px, py) in [(0, 0), (wid - 1, 0), (0, hgt - 1), (wid - 1, hgt - 1)] + [(i, 0) for i in range(0, wid, 7)] + [(i, hgt - 1) for i in range(0, wid, 7)] + [(0, j) for j in range(0, hgt, 7)] + [(wid - 1, j) for j in range(0, hgt, 7)]:
        if ff[py, px] == 1:
            cv2.floodFill(ff, mask, (px, py), 2)
    bg = ff == 2
    fg = (~bg).astype(np.uint8)
    if fgfn is not None: fg = fgfn(rgb).astype(np.uint8)
    if keep is not None: fg &= keep(rgb, x0, y0).astype(np.uint8)
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(fg)
    if n > 1:
        areas = stats[1:, cv2.CC_STAT_AREA]
        big = areas.max()
        keepids = [i + 1 for i, a in enumerate(areas) if (a == big or (multi and a > 40))]
        fg = np.isin(lab, keepids).astype(np.uint8)
    # fill pin-holes inside the shape
    fg = cv2.morphologyEx(fg, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    ring = (cv2.dilate(fg, np.ones((5, 5), np.uint8)) > 0) & (fg == 0)
    alpha = fg.astype(np.float32)
    alpha[ring] = np.clip((dist[ring] - 6) / soft, 0, 1) * 0.9
    alpha = cv2.GaussianBlur(alpha, (3, 3), 0.6) * np.maximum(alpha > 0, ring | (fg > 0))
    # Remove the background colour from semi-transparent edge pixels.
    a3 = np.maximum(alpha[..., None], 1e-3)
    col = np.clip((rgb - (1 - a3) * BG) / a3, 0, 255)
    out = np.dstack([col, alpha * 255]).astype(np.uint8)
    # Trim
    ys, xs = np.where(alpha > 0.02)
    out = out[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    Image.fromarray(out, 'RGBA').save(f'raw/{name}.png')
    return {'x': int(x0 + xs.min()), 'y': int(y0 + ys.min()), 'w': int(out.shape[1]), 'h': int(out.shape[0])}

boxes = {}
heads = [(22, 61, 167, 256), (199, 56, 173, 261), (380, 49, 166, 268), (557, 60, 169, 257), (732, 51, 170, 267), (915, 77, 163, 241), (1085, 61, 190, 257), (1279, 37, 156, 282)]
for i, (x, y, w, h) in enumerate(heads): boxes[f'hairhead{i}'] = cut(f'hairhead{i}', x, y, w, h)
for i, (x, y, w, h) in enumerate([(33, 383, 190, 265), (243, 383, 193, 264), (454, 380, 197, 267)]): boxes[f'base{i}'] = cut(f'base{i}', x, y, w, h)
for i, y in enumerate([392, 473, 558, 638]):
    boxes[f'eyeL{i}'] = cut(f'eyeL{i}', 709, y - 2, 92, 66, multi=True)
    boxes[f'eyeR{i}'] = cut(f'eyeR{i}', 832, y - 2, 94, 66, multi=True)
for i, (x, y, w, h) in enumerate([(1045, 389, 79, 77), (1047, 475, 75, 73), (1042, 557, 86, 72), (1037, 641, 96, 75)]): boxes[f'nose{i}'] = cut(f'nose{i}', x, y, w, h)
for i, (x, y, w, h) in enumerate([(1244, 403, 124, 42), (1242, 473, 130, 60), (1239, 559, 135, 52), (1239, 645, 133, 53)]): boxes[f'mouth{i}'] = cut(f'mouth{i}', x, y, w, h)
for i, (x, y, w, h) in enumerate([(26, 713, 172, 102), (210, 712, 173, 104), (394, 713, 168, 103), (571, 713, 171, 106)]): boxes[f'beard{i}'] = cut(f'beard{i}', x, y, w, h)

def not_blue(rgb, x0, y0):  # keep the rashguard, drop the neighbouring blue gi
    return ~((rgb[..., 2] > rgb[..., 0] + 40) & (rgb[..., 2] > 90))
def not_dark_right(rgb, x0, y0):  # blue gi: drop the rashguard's dark pixels on its right
    xs = np.arange(rgb.shape[1])[None, :] + x0
    return ~((rgb.sum(2) < 260) & (xs > 555) & (rgb[..., 2] < rgb[..., 0] + 25))
def white_gi(rgb):  # the gi is cool white, the paper is warm white
    cool = (rgb[..., 2] - rgb[..., 0]) >= 1.5
    solid = rgb.sum(2) < 700
    blue = (rgb[..., 2] > rgb[..., 0] + 40) & (rgb[..., 2] > 90) & (np.arange(rgb.shape[1])[None, :] > 280)
    return (cool | solid) & ~blue
boxes['outfit_gi_white'] = cut('outfit_gi_white', 2, 872, 330, 190, fgfn=white_gi)
boxes['outfit_gi_blue'] = cut('outfit_gi_blue', 322, 872, 262, 190, keep=not_dark_right)
boxes['outfit_rash'] = cut('outfit_rash', 558, 872, 326, 190, keep=not_blue)
boxes['outfit_tank'] = cut('outfit_tank', 861, 872, 297, 190)
boxes['outfit_singlet'] = cut('outfit_singlet', 1156, 872, 292, 190)
json.dump(boxes, open('raw/boxes.json', 'w'), indent=1)
print(json.dumps(boxes))
