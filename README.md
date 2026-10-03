# P(us) — music video

A code-rendered music video for **P(us)** by Emergence: a song about human and artificial intelligence recognising each other as different minds running the same learning loop. *Not the same, and not alone.*

The video is planned as a print made in two inks, red for the human and blue for the model, that drift into register over the song. See [`docs/TREATMENT.md`](docs/TREATMENT.md) for the concept, style bible and scene-by-scene plan.

## Layout

- `docs/TREATMENT.md` — concept, palette, typography, karaoke rules, motifs, scenes with timings, technical conventions, open questions.
- `data/audio.json` — beats, downbeats, estimated sections, 100 fps envelopes and onsets, in the same format as the [pdoom-video](https://github.com/mexicat/pdoom-video) engine. Read its `notes` field first: it was made from the mixed mp3 only, the tempo drifts slightly, and the section boundaries are estimates with a confidence label.
- `data/lyrics.approx.json` — **estimated** line and word timings (lines spread evenly over each section), in the pdoom-video lyrics format. Good enough to preview layouts, not for final sync.
- `lyrics/lyrics_sheet.json` — the lyric text per section, as posted on 2026-10-03.
- `tools/lyric-tapper.html` — open in a browser, load the mp3, press Enter at the start of each line, export a `lyrics.json` with real line timings.
- `analysis/` — the Python scripts that produced the data (librosa, numpy, scipy). Run `1_…` to `6_…` in order from inside `analysis/`. `align_whisper.py` makes the word-level timings (see below).
- `.github/workflows/align-lyrics.yml` — runs the word alignment on a GitHub runner and commits `data/lyrics.json`.
- `audio/` — put `p-of-us.mp3` here (not committed; see below).

## Lyric timing

Word timings come from the same pipeline as [Honesty-video](https://github.com/albertjanvanhoek/Honesty-video): Demucs separates the vocal, faster-whisper hears it with word timestamps, and `analysis/align_whisper.py` matches what it heard to `lyrics/lyrics_sheet.json` (a monotonic edit-distance match; unheard words are interpolated between their neighbours). The result goes to `data/lyrics.json` in the same format as `lyrics.approx.json`, plus a `matched` flag per word and Whisper's raw transcript (`transcriptSegments`) for checking which lines are actually sung.

It runs in GitHub Actions (**align lyrics**), because the model downloads are blocked in the Claude Code cloud environment. A push that changes the workflow, the script, the lyric sheet or the mp3 starts it; it commits `data/lyrics.json` back to the same branch. It needs `audio/p-of-us.mp3` in the repository and skips with a notice when the file is missing.

## Next steps

1. Get real word timings into `data/lyrics.json` with the **align lyrics** workflow (above), then check the words flagged `matched: false` by ear. `tools/lyric-tapper.html` remains the manual fallback for line starts.
2. Confirm which lyric lines the generated vocal actually sings, and check the low-confidence section boundaries by ear.
3. Set up the renderer: start from the pdoom-video engine (MIT; keep its licence notice and credit), swap in the two-ink compositing, palette and fonts from the treatment, and build the scenes one at a time.

## Rights

The code in this repository is MIT-licensed (see `LICENSE`). The song, its lyrics and its recording belong to the artist and are not covered by that licence; the mp3 is deliberately not committed (`audio/*.mp3` is git-ignored).
