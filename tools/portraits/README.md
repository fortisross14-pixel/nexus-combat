# Portrait part library

`sheet.png` is the reference art. These scripts cut it into the transparent layers in
`src/assets/portraits` (heads, eyes, irises, noses, mouths, hairstyles, facial hair, outfits)
and write `manifest.json` with each layer's position on the 360×400 portrait canvas.

Run from this folder (Python 3 with numpy, opencv-python, Pillow, scipy):

    python3 extract.py && python3 fixeyes.py && python3 blank.py && python3 hair.py && python3 beard.py && python3 export.py

`preview.py` composes sample portraits into `v_preview.png` the same way the app does.
The export path at the top of `export.py` points at `src/assets/portraits`; adjust it if you move the repo.
