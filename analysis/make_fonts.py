# Static Fraunces instances for the renderer (Canvas2D and opentype.js need static outlines).
# Two voices from one variable font: the human (red) cut is soft and wonky, the model (blue)
# cut is crisp (SOFT 0, WONK 0); shared words use the neutral cut. Display optical size (144).
# Run from analysis/: python make_fonts.py  (needs fonttools)
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from pathlib import Path

src = Path('../app/public/fonts/src'); out = Path('../app/public/fonts')
CUTS = {'red': {'SOFT': 100, 'WONK': 1}, 'blue': {'SOFT': 0, 'WONK': 0}, 'mid': {'SOFT': 50, 'WONK': 0}}
jobs = []
for cut, axes in CUTS.items():
    for wt in [400, 700]:
        jobs.append(('Fraunces[SOFT,WONK,opsz,wght].ttf', {**axes, 'opsz': 144, 'wght': wt}, f'Fraunces-{cut}-{wt}.ttf'))
        jobs.append(('Fraunces-Italic[SOFT,WONK,opsz,wght].ttf', {**axes, 'opsz': 144, 'wght': wt}, f'FrauncesItalic-{cut}-{wt}.ttf'))
# text size (captions, colophon)
jobs.append(('Fraunces[SOFT,WONK,opsz,wght].ttf', {'SOFT': 50, 'WONK': 0, 'opsz': 14, 'wght': 400}, 'Fraunces-text-400.ttf'))
jobs.append(('Fraunces-Italic[SOFT,WONK,opsz,wght].ttf', {'SOFT': 50, 'WONK': 0, 'opsz': 14, 'wght': 400}, 'FrauncesItalic-text-400.ttf'))
for s, loc, name in jobs:
    inst = instancer.instantiateVariableFont(TTFont(src / s), loc, updateFontNames=False)
    inst.save(out / name)
print(len(jobs), 'instances')
