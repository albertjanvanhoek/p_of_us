"""Re-derive the song sections in data/audio.json from the aligned lyrics (data/lyrics.json).

Each section starts at the downbeat nearest to its first sung line; it ends where the next one
starts. Replaces the energy-based estimates that 5_make_audio_json.py writes (run this after 5).
"""
import json
import re
import numpy as np

A = json.load(open("../data/audio.json"))
L = json.load(open("../data/lyrics.json"))
db = np.array(A["downbeats"])

first = {}
for line in L["lines"]:
    first.setdefault(line["section"], line["start"])
order = sorted(first, key=first.get)

def bar_of(t):
    k = int(np.argmin(np.abs(db - t)))
    return k, float(db[k])

starts = []
for i, name in enumerate(order):
    if i == 0 and first[name] < db[0]:
        starts.append((name, None, 0.0))  # sung from the top, before the first full bar
    else:
        k, t = bar_of(first[name])
        starts.append((name, k, t))

sections = []
for i, (name, k, t) in enumerate(starts):
    nk, nt = (starts[i + 1][1], starts[i + 1][2]) if i + 1 < len(starts) else (None, A["duration"])
    sections.append({"name": name, "start": round(t, 3), "end": round(nt, 3), "bars": [k, nk],
                     "firstLine": round(first[name], 3), "confidence": "aligned"})

A["sections"] = sections
note = ("Sections: re-derived from the Whisper-aligned lyrics by analysis/7_sections_from_lyrics.py "
        "(each starts at the downbeat nearest its first sung line; firstLine = that line's start). ")
# replace the energy-based section notes written by 5_make_audio_json.py (idempotent)
A["notes"] = re.sub(r"Sections: (estimated|re-derived).*?(?=Envelopes:)", note, A["notes"], flags=re.S)
json.dump(A, open("../data/audio.json", "w"))
for s in sections:
    print(f"{s['name']:8s} {s['start']:7.2f} - {s['end']:7.2f}  bars {s['bars']}  first line {s['firstLine']:7.2f}")
