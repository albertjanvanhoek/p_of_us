# P(us) — music video

A code-rendered music video for **P(us)** by Emergence: a song about human and artificial intelligence recognising each other as different minds running the same learning loop. *Not the same, and not alone.*

The video is planned as a print made in two inks, red for the human and blue for the model, that drift into register over the song. See [`docs/TREATMENT.md`](docs/TREATMENT.md) for the concept, style bible and scene-by-scene plan.

## Layout

- `docs/TREATMENT.md` — concept, palette, typography, karaoke rules, motifs, scenes with timings, technical conventions, open questions.
- `data/audio.json` — beats, downbeats, sections, 100 fps envelopes and onsets, in the same format as the [pdoom-video](https://github.com/mexicat/pdoom-video) engine. Read its `notes` field first: it was made from the mixed mp3 only, the tempo drifts slightly, and the sections come from the aligned lyrics (`analysis/7_sections_from_lyrics.py`): each starts at the downbeat nearest its first sung line.
- `data/lyrics.json` — **machine-aligned** line and word timings (see Lyric timing), in the pdoom-video lyrics format. Use this one.
- `data/lyrics.approx.json` — the earlier evenly-spread estimate; superseded by `lyrics.json`.
- `lyrics/lyrics_sheet.json` — the sung lyric per section: the version posted on 2026-10-03 plus the post-chorus and repeats the recording contains.
- `tools/lyric-tapper.html` — open in a browser, load the mp3, press Enter at the start of each line, export a `lyrics.json` with real line timings.
- `analysis/` — the Python scripts that produced the data (librosa, numpy, scipy). Run `1_…` to `7_…` in order from inside `analysis/`. `align_whisper.py` makes the word-level timings (see below); `make_fonts.py` the static Fraunces instances.
- `app/` — the renderer (see Renderer).
- `.github/workflows/` — `align-lyrics` (word alignment on a GitHub runner, commits `data/lyrics.json`), `build` (typechecks and builds the renderer), `render-preview` (renders a section to MP4), `render-final` (the whole video on parallel runners).
- `audio/p-of-us.mp3` — the song (committed so the alignment workflow can read it; see Rights).

## Renderer

`app/` is the renderer: TypeScript + three.js, run with [bun](https://bun.sh) + Vite. It is built on the engine of [pdoom-video](https://github.com/mexicat/pdoom-video) by Giacomo Magnanini (MIT; its licence notice is in `app/src/engine/LICENSE-pdoom-video`): every frame is a deterministic function of song time, lyrics are word-synced, and the offline export renders 60 fps with adaptive motion blur. What is ours:

- **The press** (`src/engine/press.ts`, `src/engine/post.ts`): scenes lay down ink *coverage* (red, blue, graphite) instead of colour; the final pass prints it on paper: the red and blue plates offset by the song's registration (24 → 12 → 6 → 4 → 2 → 1 → 0 px at the moments in the treatment), halftone screens at 15° and 75°, ink bleeding along the paper fibre, dot gain, and the inks multiplied over the paper so that red × blue lands exactly on plum.
- **Karaoke** (`src/scenes/_karaoke.ts`): who each word belongs to (I/me/my → red, you/your → blue, we/us/same/loop → both inks, *Different minds* split letter by letter, everything else in the singer's ink at 85%), set in Fraunces cut for the voice (soft and wonky for red, crisp for blue; static instances from `analysis/make_fonts.py`), inked word by word as it is sung with a pencil sketch just before.
- **The two hands** (`src/scenes/_pen.ts`): the red pen (pressure, tremor, ink pooling) and the blue plotter (constant width, exact arcs, pen-down dots).
- **The edit** (`src/timeline.ts`): one entry per scene of the treatment, anchored to the aligned lyrics. Scenes that are not built yet fall back to `typeset` (the lyric on paper in the karaoke rule), so the whole song always plays.

All scenes of the treatment are built (first versions): `hold`, `screens`, `fit`, `overlay` ×2, `loop` ×3, `marks`, `recognize`, `register`, `meet`, `interval`. Shared motifs: `_fit.ts` (the chart), `_glyph.ts` (the loop glyph), `_pen.ts`, `_karaoke.ts`.

### Preview

```sh
cd app
bun install
bunx vite          # http://localhost:5173 (?t=47 starts at 0:47; space, ←/→, [ ], l, h as in pdoom-video)
```

Stills and clips: `bun scripts/render.ts stills --t 5.7,63.9`, `bun scripts/render.ts sheet --from 47 --to 81 --n 12`, `bun scripts/render.ts video --from 47 --to 81 --out ../out/chorus1.mp4`. On Linux without a GPU set `CHROME_PATH` to a Chrome/Chromium binary; it renders with SwiftShader (about 0.5 s per frame).

Without a local setup: GitHub → Actions → **render preview** → Run workflow, pick a section, and download the MP4 from the run's artifacts (a section takes about 10–15 minutes at 30 fps, no motion blur).

### Thumbnail

`docs/thumbnail.jpg` (1280×720, for YouTube) and `docs/thumbnail-moire.jpg` (the same over the chorus 3 moiré) are printed by the same press as the video (`src/scenes/thumb.ts`). Regenerate: `bun scripts/render.ts stills --t 1 --thumb a --scale 2 --out ../out/thumb/a`, then `ffmpeg -i ../out/thumb/a/f_0001.00.png -vf scale=1280:720:flags=lanczos -q:v 2 ../docs/thumbnail.jpg` (`--thumb b` for the moiré version).

### Render the video (no GPU needed)

GitHub → Actions → **render final** → Run workflow (from `main`). It splits the song into frame ranges rendered on parallel runners (software GL, about 2.3 s per frame with light motion blur), joins them without re-encoding and adds the song: one MP4 in the run's artifacts. Defaults: 1080p, 30 fps, 4 sub-frames per frame, 12 parts, CRF 18, about 25–35 minutes in total. On a Mac with a GPU the same can be rendered locally: `bun scripts/render.ts video --samples auto --shutter 0.2 --out ../out/p-of-us.mp4`.

## Lyric timing

Word timings come from the same pipeline as [Honesty-video](https://github.com/albertjanvanhoek/Honesty-video): Demucs separates the vocal, faster-whisper hears it with word timestamps, and `analysis/align_whisper.py` matches what it heard to `lyrics/lyrics_sheet.json` (a monotonic edit-distance match; unheard words are interpolated between their neighbours). The result goes to `data/lyrics.json` in the same format as `lyrics.approx.json`, plus a `matched` flag per word and Whisper's raw transcript (`transcriptSegments`) for checking which lines are actually sung.

It runs in GitHub Actions (**align lyrics**), because the model downloads are blocked in the Claude Code cloud environment. A push that changes the workflow, the script, the lyric sheet or the mp3 starts it; it commits `data/lyrics.json` back to the same branch. It needs `audio/p-of-us.mp3` in the repository and skips with a notice when the file is missing. Whisper on CPU is not exactly reproducible across runners, so a re-run with unchanged lyric lines that matches fewer words keeps the committed timings (`analysis/keep_better_alignment.py`; tick **force** on a manual run to override). Whenever the timings change, the workflow also re-derives the sections in `data/audio.json`.

## Next steps

1. Spot-check `data/lyrics.json` by ear, especially the words flagged `matched: false` and the new post-chorus line ("You learn from me, I learn from you" is as Whisper heard it).
2. Watch a full render (**render final**) and note what to change per scene.
3. Decide on the open treatment questions that the aligned timing raised: the `press` intro has no instrumental to live in (merged into `hold`), the post-chorus has no scene of its own yet (it runs inside `loop`), and the bass drop comes as chorus 3 begins rather than on "meet".

## Credits

- Engine: [pdoom-video](https://github.com/mexicat/pdoom-video) by Giacomo Magnanini, MIT.
- Fonts: Fraunces (Undercase Type) and IBM Plex Mono, SIL Open Font License (`app/public/fonts/src/OFL-*.txt`); single-stroke Hershey and EMS fonts from the `hersheytext` package (OFL / public domain), as in pdoom-video.

## Rights

The code in this repository is MIT-licensed (see `LICENSE`). The song, its lyrics and its recording belong to the artist and are not covered by that licence. `audio/p-of-us.mp3` is included only so the analysis and alignment can run; other mp3 files in `audio/` stay git-ignored.
