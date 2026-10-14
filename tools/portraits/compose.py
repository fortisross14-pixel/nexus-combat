"""Place every part on one canonical portrait canvas and render previews.
All placements live in PLACE so the exporter and the app use the same numbers."""
import numpy as np, json
from PIL import Image
from land import landmarks

W, H = 360, 400
EYE_Y, CX, IOD = 165, 180, 100           # canonical eye line, centre and eye distance

def load(n): return Image.open(f'raw/{n}.png').convert('RGBA')
def place(img, scale, ax, ay, tx, ty):
    """Scale `img`, putting its pixel (ax, ay) at canvas point (tx, ty). Returns (image, x, y)."""
    w, h = max(1, round(img.width * scale)), max(1, round(img.height * scale))
    im = img.resize((w, h), Image.LANCZOS)
    return im, round(tx - ax * scale), round(ty - ay * scale)

PLACE = {
 # feature parts: scale and the anchor inside the part (fractions of its size)
 'eye': dict(scale=0.76, ax=0.5, ay=0.6, dx=IOD / 2, dy=0),
 'nose': dict(scale=0.74, ax=0.5, ay=0.66, y=EYE_Y + 0.42 * IOD),
 'mouth': dict(scale=0.56, ax=0.5, ay=0.5, y=EYE_Y + 0.80 * IOD),
}

def base_layer(i):
    L = landmarks(f'base{i}')
    s = IOD / L['iod']
    return place(load(f'blank{i}'), s, L['ex'], L['ey'], CX, EYE_Y)

SKIN_REF = None
def skin_ref():
    global SKIN_REF
    if SKIN_REF is None:
        a = np.asarray(load('blank0')).astype(np.float32); L = landmarks('base0')
        y, x = int(L['ey'] + 0.3 * L['iod']), int(L['ex'] - 0.45 * L['iod'])
        SKIN_REF = np.median(a[y - 6:y + 6, x - 6:x + 6, :3].reshape(-1, 3), 0)
    return SKIN_REF
import cv2
def blended(n):
    """A skin-coloured part (nose, mouth) re-toned to the face skin and feathered so no edge shows."""
    a = np.asarray(load(n)).astype(np.float32)
    al = a[..., 3] / 255
    solid = (al > 0.95).astype(np.uint8)
    dist = cv2.distanceTransform(solid, cv2.DIST_L2, 5)
    ring = (dist > 0) & (dist < 6)
    ringcol = np.median(a[..., :3][ring], 0)
    col = np.clip(a[..., :3] * (skin_ref() / ringcol), 0, 255)
    feather = np.clip(dist / (0.08 * min(a.shape[:2])), 0, 1)
    out = np.dstack([col, 255 * al * feather]).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')

def feature_layers(eye, nose, mouth):
    out = []
    p = PLACE['eye']
    for side, sign in (('L', -1), ('R', 1)):
        im = load(f'eye{side}{eye}')
        out.append(place(im, p['scale'], im.width * p['ax'], im.height * p['ay'], CX + sign * p['dx'], EYE_Y + p['dy']))
    p = PLACE['nose']; im = blended(f'nose{nose}')
    out.append(place(im, p['scale'], im.width * p['ax'], im.height * p['ay'], CX, p['y']))
    p = PLACE['mouth']; im = blended(f'mouth{mouth}')
    out.append(place(im, p['scale'], im.width * p['ax'], im.height * p['ay'], CX, p['y']))
    return out

def render(layers, bg=(36, 56, 72, 255)):
    c = Image.new('RGBA', (W, H), bg)
    for im, x, y in layers: c.alpha_composite(im, (x, y)) if x >= 0 and y >= 0 else c.paste(im, (x, y), im)
    return c

if __name__ == '__main__':
    tiles = []
    for b in range(3):
        for k in range(4):
            tiles.append(render([base_layer(b)] + feature_layers(k, (k + b) % 4, (k * 3 + b) % 4)))
    grid = Image.new('RGBA', (W * 6, H * 2))
    for i, t in enumerate(tiles): grid.paste(t, ((i % 6) * W, (i // 6) * H))
    grid.save('v_compose.png')

HAIR_TWEAK = {6: (1.16, -2), 7: (1.16, 0), 1: (1.04, 0), 3: (1.04, 0), 4: (1.03, 0)}
BEARD = dict(scale=1.0, ay=0.29)
def hair_layer(i, img=None):
    m = json.load(open('raw/hair.json'))[f'hair{i}']
    k, dy = HAIR_TWEAK.get(i, (1.0, 0))
    im = img or load(f'hair{i}')
    return place(im, IOD / m['iod'] * k, m['ex'], m['ey'], CX, EYE_Y + dy)
def beard_layer(i, img=None):
    m = json.load(open('raw/beard.json'))[f'beard{i}']
    im = img or load(f'beardlayer{i}')
    return place(im, BEARD['scale'], m['cx'], m['h'] * BEARD['ay'], CX, EYE_Y + 0.80 * IOD)
