"""Composite exported layers the same way the app does (colour matrices), for quick review."""
import numpy as np, json, random, sys
from PIL import Image
import os
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'src', 'assets', 'portraits')
M = json.load(open(f'{D}/manifest.json')); W, H = M['canvas']; REF = np.array(M['skinRef'])
SKINS = [(247,214,190),(240,196,160),(232,178,135),(222,158,110),(200,138,92),(165,108,72),(125,80,54),(92,60,42)]
HAIRS = [(28,24,26),(58,40,32),(98,64,42),(146,102,62),(200,158,96),(156,72,40),(140,138,136)]
IRIS = [(92,58,36),(60,40,28),(70,120,170),(90,120,70)]
CLOTH = [(200,40,50),(40,70,170),(30,30,34),(30,120,80),(235,235,240)]
def layer(name): return np.asarray(Image.open(f'{D}/{name}.webp').convert('RGBA')).astype(np.float32), M['layers'][name]
def comp(canvas, name, mode=None, color=None):
    if name not in M['layers']: return
    a, L = layer(name)
    rgb = a[..., :3]
    if mode == 'skin': rgb = rgb * (np.array(color) / REF)
    elif mode == 'lum':
        c = np.array(color, np.float32); k = 0.9 - 0.62 * (c.mean() / 255)
        rgb = c * (k * rgb[..., :1] / L['lum'] + (1 - k))
    rgb = np.clip(rgb, 0, 255); al = a[..., 3:] / 255
    x, y, w, h = L['x'], L['y'], L['w'], L['h']
    x0, y0, x1, y1 = max(0, x), max(0, y), min(W, x + w), min(H, y + h)
    if x1 <= x0 or y1 <= y0: return
    sub = canvas[y0:y1, x0:x1]
    s_rgb = rgb[y0 - y:y1 - y, x0 - x:x1 - x]; s_al = al[y0 - y:y1 - y, x0 - x:x1 - x]
    canvas[y0:y1, x0:x1] = sub * (1 - s_al) + s_rgb * s_al
def face(p):
    c = np.zeros((H, W, 3), np.float32); c[:] = (36, 56, 72)
    sk = SKINS[p['skin']]
    o = p['outfit']
    if o: comp(c, f'{o}_skin', 'skin', sk); comp(c, f'{o}_cloth', 'lum', CLOTH[p['cloth']]); comp(c, f'{o}_trim')
    comp(c, f"head{p['head']}", 'skin', sk)
    comp(c, f"nose{p['nose']}", 'skin', sk); comp(c, f"mouth{p['mouth']}", 'skin', sk)
    for s in 'LR':
        comp(c, f"eye{s}{p['eye']}"); comp(c, f"iris{s}{p['eye']}", 'lum', IRIS[p['iris']])
    if p['beard'] is not None: comp(c, f"beard{p['beard']}", 'lum', HAIRS[p['hc']])
    if p['hair'] is not None: comp(c, f"hair{p['hair']}", 'lum', HAIRS[p['hc']])
    return c.astype(np.uint8)
if __name__ == '__main__':
    rnd = random.Random(int(sys.argv[1]) if len(sys.argv) > 1 else 1)
    tiles = []
    for k in range(12):
        p = dict(head=rnd.randrange(3), nose=rnd.randrange(4), mouth=rnd.randrange(4), eye=rnd.randrange(4), iris=rnd.randrange(4),
                 skin=k % 8, hair=rnd.choice([None] + list(range(8))), hc=rnd.randrange(7), beard=rnd.choice([None, None, 0, 1, 2, 3]),
                 outfit=rnd.choice(['gi', 'rash', 'tank', 'singlet']), cloth=rnd.randrange(5))
        tiles.append(face(p))
    g = np.zeros((H * 2, W * 6, 3), np.uint8)
    for i, t in enumerate(tiles): g[(i // 6) * H:(i // 6 + 1) * H, (i % 6) * W:(i % 6 + 1) * W] = t
    Image.fromarray(g).save('v_preview.png')
