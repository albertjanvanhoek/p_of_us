# P(us) — music video

A code-rendered music video for **P(us)** by Emergence: a song about human and artificial intelligence recognising each other as different minds running the same learning loop. *Not the same, and not alone.*

The video is planned as a print made in two inks, red for the human and blue for the model, that drift into register over the song. See [`docs/TREATMENT.md`](docs/TREATMENT.md) for the concept, style bible and scene-by-scene plan.

## Layout

- `docs/TREATMENT.md` — concept, palette, typography, karaoke rules, motifs, scenes with timings, technical conventions, open questions.
- `data/audio.json` — beats, downbeats, estimated sections, 100 fps envelopes and onsets, in the same format as the [pdoom-video](https://github.com/mexicat/pdoom-video) engine. Read its `notes` field first: it was made from the mixed mp3 only, the tempo drifts slightly, and the section boundaries are estimates with a confidence label.
- `data/lyrics.approx.json` — **estimated** line and word timings (lines spread evenly over each section), in the pdoom-video lyrics format. Good enough to preview layouts, not for final sync.
- `lyrics/lyrics_sheet.json` — the lyric text per section, as posted on 2026-10-03.
- `tools/lyric-tapper.html` — open in a browser, load the mp3, press Enter at the start of each line, export a `lyrics.json` with real line timings.
- `analysis/` — the Python scripts that produced the data (librosa, numpy, scipy). Run them in order from inside `analysis/`.
- `audio/` — put `p-of-us.mp3` here (not committed; see below).

## Next steps

1. Tap the real line timings with `tools/lyric-tapper.html` and save the result as `data/lyrics.json`. For word-level precision, run Demucs + forced alignment locally (the pdoom-video `analysis/` tools do this).
2. Confirm which lyric lines the generated vocal actually sings, and check the low-confidence section boundaries by ear.
3. Set up the renderer: start from the pdoom-video engine (MIT; keep its licence notice and credit), swap in the two-ink compositing, palette and fonts from the treatment, and build the scenes one at a time.

## Rights

The code in this repository is MIT-licensed (see `LICENSE`). The song, its lyrics and its recording belong to the artist and are not covered by that licence; the mp3 is deliberately not committed (`audio/*.mp3` is git-ignored).
