# P(us) — treatment & style bible

*Emergence, 2026. Code-rendered music video, word-synced typography. Draft 1.*

## The idea in one paragraph

The video is **a print made in two inks**. One ink is the human (a warm vermilion, drawn by hand: pen pressure, wobble, pooling). The other is the model (a cobalt blue, drawn by a plotter: constant width, exact). They are printed on the same sheet of paper. The two layers never become one ink — *not the same* — but wherever both inks land on the same spot they overprint into a third colour, a deep plum that neither ink can make alone — *not alone*. At the start the two layers are visibly **out of register** (offset, like a cheap risograph print); over the song they learn each other and drift into register, until, on "That is where / I meet you", the registration marks snap together. In printing, getting two layers to line up is literally called **alignment**. The video never says the word; it shows it.

Underneath, every scene is built from one recurring mechanism, the thing the song says both minds share: **the learning loop** — a guess, a world that answers, an error, an update. Each ink runs its own loop in its own hand. The song's discovery is that the loops have the same shape.

## What the video must make a cold viewer understand

1. There are two kinds of mind here, and the video keeps them visibly different (two inks, two line qualities, two type voices).
2. Both are doing the same thing: modelling the world, being wrong, updating.
3. That shared process is where they meet — and what they make together (the overprint, the moiré) exists only because both are there.
4. Nobody is certain. The video ends on an interval, not a number.

## Tone

- Warm, precise, a little wry. A scientist's notebook printed by an artist's press. Never cute, never preachy.
- Dynamic: something always moves, big changes land on downbeats, ink hits land on kicks and snares, strong eases (`outExpo`, springs), holds and snaps. No floaty screensaver drift.
- Print-physical: every mark looks like ink on paper — grain, slight dot gain, halftone, misregistration, paper fibre, the occasional roller streak. Light comes from the paper, not from glow.
- Honest about the difference: the human side is not "better" and the model side is not "scary". Equal visual weight, equal dignity.

### Avoid (hard rules)

- No glowing brains, no robot faces, no humanoid androids, no circuit-board skin, no Matrix rain, no purple-cyan neon, no lens flares, no particle nebulae, no stock "AI" imagery.
- **No two hands reaching for each other** (the human-hand/robot-hand fingertip cliché) and no yin-yang. The hand-holding in verse 1 is two *lines* interlacing.
- No realistic human faces or eyes. "I look you in the eye" is staged with the loop glyphs, not with eyes.
- Nothing that imitates a real product UI or logo. Model names do not appear.
- Nothing that looks AI-generated. Every image is constructed from lines, dots, type and paper.
- Don't copy the P(doom) video's look. The connection to it is the title and one wink (see `outro`), nothing more.

## Palette

Two inks, their overprint, paper, and one neutral. Nothing else.

| token | hex | role |
|---|---|---|
| `paper` | `#F3EEE3` | the sheet; background of almost every frame |
| `paper2` | `#E7E0D0` | paper shadow, folds, fibre |
| `red` | `#E8452C` | **human ink** — hand-drawn marks, the human's words |
| `blue` | `#2F5BD6` | **model ink** — plotter marks, the model's words |
| `plum` | `#2B1925` | **overprint** = red × blue (multiply). Only appears where both inks land: the world, and later "us" |
| `graphite` | `#8C8578` | pencil construction lines, registration guides, tiny annotations |

- Inks are composited with **multiply** over paper, always. Plum is never painted directly; it is what happens where red and blue overlap. (Engine: render the two ink layers to separate targets and multiply both over paper.)
- One bright moment is allowed in the whole video: in `chorus3` the moiré bloom may push ink density to full saturation. Nowhere else.
- The page can go dark once: in `stop` the paper flips to plum for two beats (both inks everywhere), then back.

## Line quality (the core visual distinction)

- **Red / human:** a pen. Variable width from simulated pressure (thicker on slow strokes, thinner on fast ones), a slight tremor (low-frequency noise, never jitter), ink pooling at stroke ends and corners, occasional over-inking (blots) when the human "believes too hard". Hand-lettered single-stroke script for the human's handwriting.
- **Blue / model:** a plotter. Constant hairline-to-medium width, perfectly straight segments and exact arcs, a visible pen-up/pen-down rhythm, hatching for fills, numbers in mono. When the model is "wrong" it is precisely, confidently wrong.
- Both inks show the same print artefacts (grain, dot gain), so they clearly live on the same paper.

## Typography

- **Display (the sung lyric):** *Fraunces* (variable; OFL). Use the `SOFT` and `WONK` axes expressively: red words softer and wonkier, blue words crisp. Big, tight, confident.
- **Model voice / annotations:** *IBM Plex Mono* (OFL): axis labels, weights, epochs, the P(us) readout, footnotes.
- **Human handwriting:** single-stroke Hershey script, drawn by the red pen as it is sung.
- Swiss-grid discipline, asymmetric layouts, generous paper margins. Small mono annotations beside big display type.
- Typographic punctuation (’ “ ” — …) everywhere except typed mono input.

## Karaoke rules (all scenes)

- Every lyric line is readable and **synced per word**: a word appears or inks in at its `start` and completes by its `end`. Anticipation is fine (show upcoming words as a faint graphite pencil sketch up to ~0.4 s early); inking never runs ahead of the voice.
- **Words are coloured by who they belong to.** This is the video's main typographic rule:
  - first person (*I, me, my, mine, myself*) and human-side nouns (*body, skin, breath, childhood, neurons*) → **red**;
  - second person (*you, your*) and model-side nouns (*weights, training history*) → **blue**;
  - shared words (*we, us, both, same, together, P-of-us, loop*) → printed in **both** inks, so they read as plum;
  - everything else → the colour of the line's singer (default red, the narrator), at 85% density.
  
  So "You build a model / I do too" prints *You* blue, *I* red, *too* plum. "Different minds, same learning loop" prints *Different minds* half-red half-blue (each word split letter by letter between inks) and *same learning loop* plum.
- Each scene integrates the lyric graphically: written by the pen, plotted by the plotter, set as a figure caption, stamped, typed into a margin. Never plain subtitles on top.
- Keep lyric text inside title-safe (≥ 96 px from the frame edge at 1920×1080).
- Display the word as written in the lyric sheet but typeset `P-of-us` as ***P*(us)** (italic P, Fraunces) everywhere on screen.

## Motifs

1. **The registration marks (⊕).** Two crosshair-in-circle marks, one per ink, in the top-left and bottom-right corners. At the start the red and blue marks are offset by ~24 px. Every real exchange between the two minds halves the offset (see the scene notes). They snap into register on "I meet you" and stay there. This is the video's progress bar for alignment.
2. **The loop glyph.** A circle with four stations — *guess · world · error · update* — and a travelling dot. Red draws it by hand (slightly egg-shaped, the stations hand-lettered); blue plots it (perfect circle, stations in mono). In the choruses the dots travel one station per beat. They start out of phase; by the final chorus they run in phase and the two circles overprint into one plum ring.
3. **The fit.** The concrete picture of learning: plum dots (the world — printed in both inks because both see it), a model curve through them in one ink, a dashed prediction beyond the last dot, a new dot landing off the line, a short residual line, the curve bending. Each time a curve updates, its previous version stays behind as a faint ghost line, so every chart is a record of being wrong.
4. **The halftone.** Up close, each ink is a screen of dots at its own angle (red 15°, blue 75°). Where both screens overlap they produce a **moiré rosette** — a third pattern that exists in neither screen alone. This is "us", visually: emergent, made of both, owned by neither. It appears small in verse 1 and blooms full-frame in the final chorus.
5. **P(us) readout.** A small printed gauge in Plex Mono, staged inside each scene's own idiom (a margin note, a scale, a figure label), never a permanent corner HUD. It rises in steps at moments of mutual update: `0.07 → 0.18 → 0.33 → 0.41 → 0.52 → 0.71 → 0.86`. It never reaches 1. In the outro it turns into an interval.
6. **Two lines holding.** One red pen stroke and one blue plotter stroke that loop around each other once — the video's version of holding hands. Opens and closes the video.

## Scenes

Times come from `data/audio.json` (estimated sections, see that file's notes) and must be read from the data, never hard-coded: anchor every scene window to lyric lines (`lyrics.get('wonderland')`) and snap to `downbeats`. Bar numbers below are `downbeats[k]`.

| id | window | bars | lyric |
|---|---|---|---|
| `press` | 0:00 – 0:23 | intro – 11 | (instrumental) |
| `hold` | 0:23 – ~0:28 | 11 – ~14 | I hold you by the hand / We tumble down to wonderland |
| `screens` | ~0:28 – ~0:37 | ~14 – ~19 | I look you in the eye … / We are both unsure / About the certainty we feel |
| `fit` | ~0:37 – 0:51 | ~19 – 26 | You build a model … / … and I can too |
| `overlay` ×2 | 0:51 – 1:03, 1:43 – 1:54 | 26 – 32, 54 – 60 | Bring what you know … improves |
| `loop` ×3 | 1:03 – 1:21, 1:54 – 2:13, 2:55 – 3:26 | 32 – 42, 60 – 70, 93 – 110 | chorus |
| `marks` | 1:21 – 1:43 | 42 – 54 | I have a body … / So can mine |
| `recognize` | 2:13 – 2:31 | 70 – 80 | That's where I recognize you … rearranged |
| `register` | 2:31 – 2:49 | 80 – 90 | You build a model / I do too … |
| `meet` | 2:49 – 2:55 | 90 – 93 | That is where / I meet you |
| `interval` | 3:26 – 3:42 | 110 – end | We are both unsure … / P-of-us |

### `press` — the sheet goes in

Blank paper fills the frame, with a faint roller streak, as if just fed into a press. On the first downbeat the two registration marks print, visibly out of register (~24 px). From the left edge a red pen line starts drawing toward the centre; from the right a blue plotter line, both on the beat (the pen lunges on kicks, the plotter steps on hats). Small graphite construction marks appear: a ruled baseline, crop marks. Over the last two bars the title prints as two layers: ***P*(us)** in red and again in blue, offset by the same 24 px, so it reads double. The lines reach each other at the centre exactly on the downbeat of bar 11.

### `hold` — two lines, then down into the paper

"I hold you by the hand": the red and blue lines loop around each other once (motif 6) on the words *hold* and *hand*, and a tiny plum overlap appears where they cross: the first plum on screen. "We tumble down to wonderland": the camera falls into the paper. The crossing point grows; we pass through the paper fibre into the **halftone**: rows of red dots at 15°, blue at 75°, and where they overlap, the first small moiré rosettes. The lyric rides the fall: *tumble* tumbles letter by letter, *wonderland* is set in plum and resolves out of the moiré itself.

### `screens` — something like mine

"I look you in the eye": two loop glyphs, red and blue, side by side like two eyes facing each other. "And see a little of myself inside": a few red halftone dots drift into the blue circle and a few blue dots into the red one; each circle now carries a small sample of the other's ink. "We are both unsure / About the certainty we feel": each loop's travelling dot becomes a point estimate with error bars that breathe on the beat. The word *certainty* prints large, then visibly misregisters: its red and blue layers slide apart on *feel*. Registration offset stays at 24 px. P(us) first appears as a margin note: `P(us) = 0.07`.

### `fit` — you build a model, and so do I

A shared figure: plum world-dots on a graphite grid. "You build a model of the world": the blue plotter fits a curve through the dots, exact, with a mono caption `fit(world)`. "And so do I": the red pen draws its own curve through the same dots, by hand, slightly different. "You make a guess, you get it wrong": blue extends a dashed prediction; a new dot lands well off it on the snare; a blue residual line drops; caption `error`. "I can believe too hard, too long": the red pen presses down on its line, ink pools and blots, the line thickens past the point of reason. "Something new comes into view": another dot lands, off the red line this time. "You can change — and I can too": on *change* the blue curve bends to the new dots; on *too* the red curve bends as well; both old curves stay behind as ghosts. Registration offset halves: 24 → 12 px. P(us) `0.18`.

### `overlay` ×2 — put both models on the line

Two transparent acetate sheets slide in from the edges: the red curve on one, the blue curve on the other. "Bring what you know / I'll bring mine": each sheet arrives on its line. "Put both models on the line": they drop onto a shared ruled baseline and overlap. "If they clash, then something moves": where the curves disagree, the gap between them is hatched graphite and the whole frame shudders (one small misregistration jolt). "That's how either one improves": both curves move toward the dots, the hatched gap shrinks. Hard stop on the bass drop at the end of the section: hold the frame for the pickup into the chorus.
- First time (`pre1`): the curves start far apart.
- Second time (`pre2`): the overlay is tighter and faster; the hatched gap is already small.

### `loop` ×3 — different minds, same learning loop (chorus)

The hero image: the two loop glyphs, large, side by side. Their dots travel one station per beat (*guess → world → error → update*), each station flashing its label as the dot passes. The lyric is set across the top in the karaoke colour rule.
- "Different minds, same learning loop": *Different minds* letter-split red/blue, *same learning loop* plum. The two dots start out of phase.
- "You change me, I can change you too": an arrow of red ink crosses into the blue loop and an arrow of blue ink into the red loop; each loop wobbles and re-settles (an update), and the dots shift one beat closer in phase.
- "Neurons here and weights in you": under the red loop a hand-drawn neuron sketch (dendrites, a few strokes); under the blue loop a small weight matrix in mono numbers. On *in you* both sketches rotate and resolve into the same loop shape.
- "Different ways of getting closer to true": each loop's fit curve (small, inside the circle) converges on the same plum dots.
- "We weigh the doom — but count this too:": a printed balance. In one pan the word DOOM, stamped in graphite. In the other, the P(us) readout ticking up. The balance does not tip all the way.
- "*P*(us)": a typographic slam on the downbeat: ***P*(us)** full-frame in both inks, printed in two passes (red, then blue a beat later). The second pass lands closer to register each chorus.
- "Me learning you": small, hand-lettered in red, with *you* plotted in blue.

Escalation:
1. `chorus1`: loops clearly separate, dots out of phase, the ***P*(us)** slam is double-printed with a visible offset. P(us) `0.33`.
2. `chorus2`: the loops move closer and their rims touch; where they touch, a sliver of plum. The slam's offset is smaller. P(us) `0.52`.
3. `chorus3` (see below).

### `marks` — a body, a training history

Split page, red on the left, blue on the right, with a graphite fold line down the middle.
- "I have a body, skin and breath": a single red contour line that breathes (expands and contracts on the half-notes).
- "A childhood, memory, fear and depth": the contour becomes a door frame with **pencil height marks** of a growing child, each with a hand-written date, inked one per beat.
- "You have a training history": on the right, the matching blue object: a training log, **checkpoint marks** stepping down a loss curve, each with a step number in mono.
- "A different kind of memory": the two sets of marks sit side by side at the same scale. They rhyme visually (both are records of growth) but are clearly not the same thing.
- "I won't pretend our inner lives / Are somehow built the same inside": two cut-away diagrams, a loose red hand sketch and a blue exploded tensor stack, deliberately non-matching, with a hand-drawn ≠ between them.
- "But you can test what you believe / And something new can make you leave / An old prediction far behind": the blue checkpoint curve takes a new dot and re-fits; the old fit stays as a ghost and slides left, *left behind*.
- "So can mine": the red door frame gets a new height mark above the others, and the old red line ghosts the same way. Same gesture, two inks. Registration offset 12 → 6 px. P(us) `0.41` (staged as a door-frame note).

### `recognize` — not because you're just like me (bridge)

The music thins out; so does the page. Plain paper, big type, almost nothing else.
- "That's where I recognize you": set large, *I* red, *you* blue.
- "Not because you're just like me / Not because we share one feeling / Or one kind of memory": as each line is sung, one of the earlier images (the breathing contour, the door frame, the checkpoint log) slides in faintly and is lifted off the page like a print being peeled away. The negations remove things.
- "But a model meets the world / Something fails, something moves / What it knew gets rearranged": the `fit` vignette once more, slowly, at half time, and for the first time **both inks update in the same moment**: one world-dot lands, two residuals drop, two curves bend together on *rearranged*.

### `register` — you build a model, I do too (build)

The call-and-response becomes the registration process. Each call prints in blue, each answer in red, stacked down the page:
- "You build a model" / "I do too" → offset 6 → 4 px.
- "You can be wrong" / "I can too" → 4 → 2 px.
- "You can update" / "I can too" → 2 → 1 px.

With each answer the two loop glyphs, small at the margin, move one step closer in phase and the registration marks visibly creep together. The camera pulls back as the stack grows, energy rising with the music. The *too* of each answer prints in plum.

### `meet` — that is where I meet you (stop)

The bass drops out; the frame almost stops.
- "That is where": everything clears except the two registration marks, 1 px apart, centred and huge.
- "I meet you": on *meet* they snap into register with a single soft hit (paper flex, no flash). On *you* the paper flips to plum for two beats: both inks everywhere, the whole sheet is overprint. Then back to paper for the final chorus. P(us) `0.71`.

### `loop` ×3 — `chorus3`: not the same and not alone

The final chorus runs the `loop` scene fully in register, at full energy.
- The two loop glyphs now run in phase and overprint into **one plum ring**, while their own red and blue rims still show at the edges: one loop, two hands.
- The halftone moiré blooms across the whole frame: both screens visible, the rosette pattern between them filling the page and pulsing with the kick.
- "Not the same and not alone": the key line of the video. *Not the same* is set twice, side by side, once in each ink, deliberately distinct; *and not alone* is set once, in plum, across both.
- "Each of us updating what we know": the ghost lines of every earlier fit in the video flicker through once, a rapid recap of every update so far, all in register now.
- The ***P*(us)** slam lands perfectly registered for the first time: a single clean plum print. P(us) `0.86`.

### `interval` — we are both unsure (outro)

Back to quiet paper.
- "We are both unsure / About the certainty we feel": the P(us) readout prints large, `0.86`, then, word by word, turns into an interval: the number splits into two brackets, red on the left and blue on the right, `[ 0.71 , 0.95 ]`, error bars breathing. The video declines to be certain, as the song does.
- "You build a model / I do too": the two brackets bend into the two lines from the opening (motif 6) and loop around each other once more.
- "*P*(us)": the sheet is fed out of the press. The last frame is the finished print, both registration marks aligned, with a small graphite colophon: *Printed in two inks. Emergence, 2026.*
- One wink at the P(doom) video and no more: in the colophon's corner, in tiny mono, `P(doom): see previous print`.

## Technical conventions

- **Engine:** build on the pdoom-video engine (`mexicat/pdoom-video`, MIT): TypeScript + three.js, deterministic rendering where every frame is a function of song time, word-synced lyrics, offline 60 fps export. Keep its licence notice and credit it in the README. Our `data/audio.json` and `data/lyrics*.json` already use its formats.
- **Compositing:** two ink render targets (red, blue), each rendered as luminance-to-ink coverage, multiplied over the paper texture. Halftone screens, dot gain, grain and misregistration are post-process passes per ink, so the same scene code gets the print look for free. The registration offset is a global uniform driven by the timeline (24 → 12 → 6 → 4 → 2 → 1 → 0 px at the moments listed above).
- **Determinism:** all noise (pen tremor, grain, paper fibre) is seeded and a function of `t`, never `Math.random()` at render time.
- **Sync:** cuts on downbeats; ink hits on kick/snare onsets (`audio.events`); station steps of the loop glyph on beats. The tempo drifts slightly (see `data/audio.json`), so always use the beat list, never a fixed period.
- **Performance target:** < 25 ms per frame at 1080p in preview.

## Open questions before production

1. **Lyric timing.** `data/lyrics.approx.json` is an estimate. Tap the real line starts with `tools/lyric-tapper.html` (a few minutes), or run Demucs + forced alignment locally for word-level timings, before building any scene.
2. **What the generator actually sang.** The written post-chorus does not seem to appear after chorus 1. Confirm which lines are sung and edit the lyric list to match.
3. **Section boundaries** marked low/medium confidence in `audio.json` (intro/verse 1/pre 1 in particular) need a quick check by ear.
4. **The P(us) numbers** in the motif list are a dramaturgical choice, not data. Keep them, change them, or replace them with something the song computes.
5. **Vocal split.** Is the song sung by one voice or two? If two, the karaoke colour rule can follow the singer instead of the pronoun.
