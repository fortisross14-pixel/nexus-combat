"""Export the portrait part library for the app.
Every layer is placed on one canonical 360x400 canvas, cropped, saved as WebP, and listed in
manifest.json with its offset. Colour (skin tone, hair colour, iris, cloth) is applied in the app
with SVG colour matrices, so each part ships once."""
import numpy as np, cv2, json, os, shutil
from PIL import Image
import compose as C

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'src', 'assets', 'portraits')
shutil.rmtree(OUT, ignore_errors=True); os.makedirs(OUT)
manifest = {'canvas': [C.W, C.H], 'layers': {}}

def lab(rgb): return cv2.cvtColor(np.clip(rgb, 0, 255).astype(np.uint8), cv2.COLOR_RGB2LAB).astype(np.float32)
def bleed(arr):
    """Give semi-transparent edge pixels the colour of the nearest solid pixel (no pale paper halo)."""
    rgb = arr[..., :3].astype(np.uint8).copy(); al = arr[..., 3]
    m = (al < 235).astype(np.uint8)
    if m.any() and (al >= 235).any():
        fixed = cv2.inpaint(cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR), m * 255, 3, cv2.INPAINT_TELEA)
        rgb = cv2.cvtColor(fixed, cv2.COLOR_BGR2RGB)
    return np.dstack([rgb, al]).astype(np.uint8)

def save(name, img, x, y, extra=None):
    a = np.asarray(img).copy()
    ys, xs = np.nonzero(a[..., 3] > 3)
    if not len(ys): return
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    x += int(xs.min()); y += int(ys.min())
    a = bleed(a)
    Image.fromarray(a, 'RGBA').save(f'{OUT}/{name}.webp', 'WEBP', quality=86, method=6, alpha_quality=90)
    manifest['layers'][name] = dict(x=int(x), y=int(y), w=int(a.shape[1]), h=int(a.shape[0]), **(extra or {}))

SKIN = C.skin_ref()
manifest['skinRef'] = [round(float(v), 1) for v in SKIN]

# ── Heads (bare skin, features painted out) ──
for i in range(3):
    im, x, y = C.base_layer(i)
    a = np.asarray(im).astype(np.float32)
    yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    # keep the neck, drop the shoulders: the outfit layer brings its own
    # keep only the face: below the ears, follow the drawn jaw line inwards and drop the neck
    # (the outfit layer, drawn underneath, brings the neck and shoulders)
    Lc = lab(a[..., :3])[..., 0]
    cx = C.CX - x; y0 = int(C.EYE_Y + 0.62 * C.IOD - y); chin = int(C.EYE_Y + 1.30 * C.IOD - y)
    keep = (yy < y0).astype(np.float32)
    half = []
    for r in range(y0, min(chin, a.shape[0])):
        row = Lc[r]; ref = np.median(row[int(cx) - 8:int(cx) + 8])
        hw = None
        for side in (1, -1):
            for d in range(10, 120):
                xi = int(cx + side * d)
                if xi < 0 or xi >= a.shape[1] or a[r, xi, 3] < 128 or row[xi] < ref - 34: break
            hw = d if hw is None else max(hw, d)
        half.append(hw)
    half = np.array(half, np.float32)
    # the jaw only narrows going down; smooth it
    for k in range(1, len(half)): half[k] = min(half[k], half[k - 1] + 0.5)
    half = np.convolve(np.pad(half, 3, mode='edge'), np.ones(7) / 7, mode='valid')
    for k, r in enumerate(range(y0, y0 + len(half))):
        keep[r] = np.clip((half[k] + 2 - np.abs(xx[r] - cx)) / 2.5, 0, 1)
    
    a[..., 3] *= keep
    save(f'head{i}', Image.fromarray(a.astype(np.uint8), 'RGBA'), x, y)

# canvas-sized copy of the first head, used to colour-match parts and to clip beards
HEAD0 = np.zeros((C.H, C.W, 4), np.float32)
_im, _x, _y = C.base_layer(0); _a = np.asarray(_im).astype(np.float32)
HEAD0[max(0,_y):_y + _a.shape[0], max(0,_x):_x + _a.shape[1]] = _a[max(0,-_y):, max(0,-_x):][:C.H - max(0,_y), :C.W - max(0,_x)]
FACEMASK = cv2.erode((HEAD0[..., 3] > 128).astype(np.uint8), np.ones((13, 13), np.uint8)).astype(np.float32)
FACEMASK = cv2.GaussianBlur(FACEMASK, (5, 5), 1.5)

# ── Noses and mouths: skin parts, re-toned and feathered ──
for i in range(4):
    for kind in ('nose', 'mouth'):
        p = C.PLACE[kind]; im = C.blended(f'{kind}{i}')
        im, x, y = C.place(im, p['scale'], im.width * p['ax'], im.height * p['ay'], C.CX, p['y'])
        # match the part's rim to the face skin right underneath it
        a = np.asarray(im).astype(np.float32)
        under = HEAD0[y:y + a.shape[0], x:x + a.shape[1], :3]
        rim = (a[..., 3] > 40) & (a[..., 3] < 200)
        ratio = np.median(under[rim], 0) / np.median(a[..., :3][rim], 0)
        a[..., :3] = np.clip(a[..., :3] * ratio, 0, 255)
        save(f'{kind}{i}', Image.fromarray(a.astype(np.uint8), 'RGBA'), x, y)

# ── Eyes: the lid skin is dropped (the face shows through); the iris is its own layer so it can be tinted ──
for i in range(4):
    for side, sign in (('L', -1), ('R', 1)):
        src = C.load(f'eye{side}{i}'); a = np.asarray(src).astype(np.float32)
        h, w = a.shape[:2]; s = a[..., :3].sum(2); Lb = lab(a[..., :3])
        skinlike = (np.abs(Lb[..., 1] - lab(SKIN[None, None])[0, 0, 1]) < 14) & (Lb[..., 2] > 140) & (Lb[..., 0] > 120)
        yy, xx = np.mgrid[0:h, 0:w]
        lower = yy > h * 0.42
        ys, xs = np.nonzero((s < 150) & lower)
        cy, cx = ys.mean(), xs.mean()
        r = h * 0.21
        disk = (yy - cy) ** 2 + (xx - cx) ** 2 < r * r
        iris = disk & (s < 600) & (s > 150) & (a[..., 3] > 200) & ~skinlike
        rest = a.copy()
        rest[skinlike, 3] = 0
        irisimg = np.zeros_like(a); irisimg[iris] = a[iris]
        # make the iris layer a neutral luminance map, tinted in the app
        lum = (0.3 * a[..., 0] + 0.59 * a[..., 1] + 0.11 * a[..., 2])
        med = float(np.median(lum[iris])) if iris.any() else 100
        irisimg[..., 0] = irisimg[..., 1] = irisimg[..., 2] = np.where(iris, lum, 0)
        rest[iris, :3] = 40; rest[iris, 3] = 255                 # dark under the tint
        p = C.PLACE['eye']; tx = C.CX + sign * p['dx']
        for nm, arr, extra in ((f'eye{side}{i}', rest, None), (f'iris{side}{i}', irisimg, {'lum': round(med, 1)})):
            im, x, y = C.place(Image.fromarray(arr.astype(np.uint8), 'RGBA'), p['scale'], w * p['ax'], h * p['ay'], tx, C.EYE_Y + p['dy'])
            save(nm, im, x, y, extra)

# ── Hair and facial hair: luminance only (tinted in the app) ──
def lum_layer(img):
    a = np.asarray(img).astype(np.float32)
    lum = 0.3 * a[..., 0] + 0.59 * a[..., 1] + 0.11 * a[..., 2]
    med = float(np.median(lum[a[..., 3] > 128]))
    out = np.dstack([lum, lum, lum, a[..., 3]]).astype(np.uint8)
    return Image.fromarray(out, 'RGBA'), med
for i in range(8):
    img, med = lum_layer(C.load(f'hair{i}'))
    im, x, y = C.hair_layer(i, img); save(f'hair{i}', im, x, y, {'lum': round(med, 1)})
for i in range(4):
    img, med = lum_layer(C.load(f'beardlayer{i}'))
    im, x, y = C.beard_layer(i, img)
    a = np.asarray(im).astype(np.float32)
    fm = np.zeros(a.shape[:2], np.float32)
    ys0, xs0 = max(0, y), max(0, x); fm_src = FACEMASK[ys0:y + a.shape[0], xs0:x + a.shape[1]]
    fm[ys0 - y:ys0 - y + fm_src.shape[0], xs0 - x:xs0 - x + fm_src.shape[1]] = fm_src
    a[..., 3] *= fm
    save(f'beard{i}', Image.fromarray(a.astype(np.uint8), 'RGBA'), x, y, {'lum': round(med, 1)})

# ── Outfits: a skin layer (tinted like the face) and a cloth layer (tinted with the team colour) plus fixed trim ──
NECK_Y, NECK_SCALE = 258, 1.15
OUTFITS = {'gi': ('outfit_gi_blue', 130), 'rash': ('outfit_rash', 166), 'tank': ('outfit_tank', 144), 'singlet': ('outfit_singlet', 134.5)}
for key, (src, ncx) in OUTFITS.items():
    a = np.asarray(C.load(src)).astype(np.float32); h, w = a.shape[:2]
    Lb = lab(a[..., :3]); sk = lab(SKIN[None, None])[0, 0]
    dab = np.sqrt((Lb[..., 1] - sk[1]) ** 2 + (Lb[..., 2] - sk[2]) ** 2)
    skin = (dab < 16) & (Lb[..., 0] > 70)
    skin = cv2.morphologyEx(skin.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)) > 0
    sat = np.max(a[..., :3], 2) - np.min(a[..., :3], 2)
    lum = 0.3 * a[..., 0] + 0.59 * a[..., 1] + 0.11 * a[..., 2]
    if key == 'gi':  main = (a[..., 2] > a[..., 0] + 30)                       # the blue cloth
    elif key == 'rash': main = (lum < 95) & (sat < 40)                          # black fabric (seams stay grey)
    elif key == 'tank': main = (a[..., 0] > a[..., 1] + 60) & (lum > 60)        # red fabric
    else: main = (a[..., 2] > a[..., 0] + 12) & (lum < 110) & (lum > 30)       # navy fabric
    main &= ~skin
    al = a[..., 3]
    # the cut at the top of the neck fades out so the head's neck shows through
    fade = np.clip((np.arange(h)[:, None] - 2) / 16.0, 0, 1)
    skinA = np.where(skin, al, 0) * fade
    cloth = np.where(main, al, 0)
    trim = np.where(~skin & ~main, al, 0) * fade
    cloth = cloth * np.clip((np.arange(h)[:, None] - 1) / 4.0, 0, 1)
    # shirt cloth is tinted from a neutral luminance map
    mainlum = np.median(lum[main])
    layers = {
        f'{key}_skin': np.dstack([a[..., :3], skinA]),
        f'{key}_cloth': np.dstack([lum, lum, lum, cloth]),
        f'{key}_trim': np.dstack([a[..., :3], trim]),
    }
    if key == 'tank':
        # a bare torso: the tank's cloth and trim painted over with the surrounding skin
        holes = ((~skin) & (al > 30)).astype(np.uint8)
        bgr = cv2.cvtColor(a[..., :3].astype(np.uint8), cv2.COLOR_RGB2BGR)
        bare = cv2.cvtColor(cv2.inpaint(bgr, holes * 255, 9, cv2.INPAINT_TELEA), cv2.COLOR_BGR2RGB).astype(np.float32)
        bare = cv2.GaussianBlur(bare, (0, 0), 1.2) * holes[..., None] + bare * (1 - holes[..., None])
        layers['bare_skin'] = np.dstack([bare, al * fade])
    for nm, arr in layers.items():
        im, x, y = C.place(Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGBA'), NECK_SCALE, ncx, 0, C.CX, NECK_Y)
        save(nm, im, x, y, {'lum': round(float(mainlum), 1)} if nm.endswith('cloth') else None)

json.dump(manifest, open(f'{OUT}/manifest.json', 'w'), indent=1)
tot = sum(os.path.getsize(f'{OUT}/{f}') for f in os.listdir(OUT))
print(len(manifest['layers']), 'layers', round(tot / 1024), 'KB')
