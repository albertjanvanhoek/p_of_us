"""Align the known lyrics (lyrics/lyrics_sheet.json) to the recording -> data/lyrics.json.

Ported from the Honesty-video pipeline: faster-whisper word timestamps (ideally on a Demucs
vocal stem), then a monotonic dynamic-programming match of the expected words to the heard
words. Unmatched words are interpolated between their matched neighbours. Output follows
the pdoom-video lyrics format used by data/lyrics.approx.json (lines -> words), plus the
section of each line, a per-word `matched` flag and the raw transcript for QA.

Runs in GitHub Actions (.github/workflows/align-lyrics.yml), where the model hosts are
reachable. Usage:
  python analysis/align_whisper.py --audio vocals.wav --sheet lyrics/lyrics_sheet.json \
      --out data/lyrics.json --model medium.en
"""
from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path

WORD_RE = re.compile(r"[A-Za-z]+(?:['’][A-Za-z]+)?")


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9']", "", s.lower().replace("’", "'"))


@dataclass
class Tok:
    key: str
    word_i: int  # index into the flat list of display words


@dataclass
class Heard:
    raw: str
    key: str
    start: float
    end: float
    prob: float


def similarity(a: str, b: str) -> float:
    if a == b:
        return 1.0
    return SequenceMatcher(None, a, b).ratio()


def align(expected: list[Tok], heard: list[Heard]) -> list[int | None]:
    """Monotonic edit-distance alignment; returns heard index per expected token (or None)."""
    n, m = len(expected), len(heard)
    inf = float("inf")
    dp = [[inf] * (m + 1) for _ in range(n + 1)]
    bt: list[list[tuple[int, int, str] | None]] = [[None] * (m + 1) for _ in range(n + 1)]
    dp[0][0] = 0.0
    for i in range(n + 1):
        for j in range(m + 1):
            here = dp[i][j]
            if here == inf:
                continue
            if i < n and j < m:
                sim = similarity(expected[i].key, heard[j].key)
                sub = 0.0 if sim == 1 else (0.35 if sim >= 0.75 else (0.7 if sim >= 0.55 else 1.25))
                if here + sub < dp[i + 1][j + 1]:
                    dp[i + 1][j + 1] = here + sub
                    bt[i + 1][j + 1] = (i, j, "match")
            if i < n and here + 0.9 < dp[i + 1][j]:
                dp[i + 1][j] = here + 0.9
                bt[i + 1][j] = (i, j, "skip_expected")
            if j < m and here + 0.65 < dp[i][j + 1]:
                dp[i][j + 1] = here + 0.65
                bt[i][j + 1] = (i, j, "skip_heard")
    mapping: list[int | None] = [None] * n
    i, j = n, m
    while i or j:
        prev = bt[i][j]
        if prev is None:
            break
        pi, pj, op = prev
        if op == "match" and similarity(expected[pi].key, heard[pj].key) >= 0.5:
            mapping[pi] = pj
        i, j = pi, pj
    return mapping


def interpolate(items: list[dict], duration: float, step: float = 0.18) -> None:
    """Fill start/end of unmatched items from their matched neighbours."""
    matched = [i for i, w in enumerate(items) if w["start"] is not None]
    if not matched:
        d = duration / max(1, len(items))
        for i, w in enumerate(items):
            w["start"], w["end"] = i * d, (i + 1) * d
        return
    for i, w in enumerate(items):
        if w["start"] is not None:
            continue
        left = max((k for k in matched if k < i), default=None)
        right = min((k for k in matched if k > i), default=None)
        if left is not None and right is not None:
            span = right - left
            a, b = items[left]["end"], items[right]["start"]
            if b < a:
                b = a
            w["start"] = a + (b - a) * (i - left) / span
            w["end"] = a + (b - a) * (i - left + 1) / span
        elif left is not None:
            k = i - left
            w["start"] = items[left]["end"] + step * (k - 1)
            w["end"] = items[left]["end"] + step * k
        else:
            k = right - i
            w["end"] = max(0.0, items[right]["start"] - step * (k - 1))
            w["start"] = max(0.0, items[right]["start"] - step * k)


def load_sheet(path: str) -> list[tuple[str, str]]:
    """(section, line) in sung order. Sections like outro_a / outro_b map to 'outro'."""
    sheet = json.loads(Path(path).read_text())
    return [(name.split("_")[0], line) for name, lines in sheet.items() for line in lines]


def transcribe(audio: str, model_name: str) -> tuple[list[Heard], list[dict], float]:
    from faster_whisper import WhisperModel

    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    segments, info = model.transcribe(
        audio,
        language="en",
        word_timestamps=True,
        vad_filter=False,
        beam_size=5,
        condition_on_previous_text=True,
    )
    heard: list[Heard] = []
    segments_out = []
    for seg in segments:
        seg_words = []
        for w in seg.words or []:
            key = norm(w.word)
            if not key:
                continue
            h = Heard(w.word.strip(), key, float(w.start), float(w.end), float(w.probability))
            heard.append(h)
            seg_words.append({"w": h.raw, "start": round(h.start, 3), "end": round(h.end, 3), "p": round(h.prob, 3)})
        segments_out.append({"start": round(float(seg.start), 3), "end": round(float(seg.end), 3),
                             "text": seg.text.strip(), "words": seg_words})
    return heard, segments_out, float(info.duration)


def build(sheet_lines: list[tuple[str, str]], heard: list[Heard], duration: float) -> tuple[list[dict], dict]:
    # Display words are whitespace tokens (as in lyrics.approx.json, e.g. "P-of-us", "too:").
    # Each is split into alignment tokens: "P-of-us" -> p, of, us; "—" -> none.
    display: list[dict] = []
    lines_idx: list[tuple[str, str, int, int]] = []
    expected: list[Tok] = []
    for section, text in sheet_lines:
        first = len(display)
        for w in text.split():
            wi = len(display)
            display.append({"w": w})
            for part in WORD_RE.findall(w):
                expected.append(Tok(norm(part), wi))
        lines_idx.append((section, text, first, len(display)))

    mapping = align(expected, heard)
    toks = []
    for tok, j in zip(expected, mapping):
        h = heard[j] if j is not None else None
        toks.append({"start": h.start if h else None, "end": h.end if h else None,
                     "p": h.prob if h else 0.0, "heard": h.raw if h else None})
    interpolate(toks, duration)

    # merge alignment tokens back into display words
    by_word: dict[int, list[dict]] = {}
    for tok, t in zip(expected, toks):
        by_word.setdefault(tok.word_i, []).append(t)
    for wi, w in enumerate(display):
        ts = by_word.get(wi)
        if ts:
            w["start"], w["end"] = ts[0]["start"], ts[-1]["end"]
            w["matched"] = all(t["heard"] is not None for t in ts)
            w["conf"] = round(min(t["p"] for t in ts), 3)
            heard_raw = [t["heard"] for t in ts if t["heard"]]
            if heard_raw:
                w["heard"] = " ".join(heard_raw)
        else:  # punctuation-only token such as "—": zero-length at the previous word's end
            prev = display[wi - 1]["end"] if wi else 0.0
            w["start"] = w["end"] = prev
            w["matched"], w["conf"] = False, 0.0

    lines = []
    for i, (section, text, a, b) in enumerate(lines_idx):
        words = [{"w": w["w"], "start": round(w["start"], 3), "end": round(max(w["end"], w["start"]), 3),
                  "conf": w["conf"], "matched": w["matched"], **({"heard": w["heard"]} if "heard" in w else {})}
                 for w in display[a:b]]
        lines.append({"i": i, "section": section, "start": words[0]["start"], "end": words[-1]["end"],
                      "text": text, "words": words})
    n_match = sum(1 for t in toks if t["heard"] is not None)
    stats = {"matchedWords": n_match, "totalWords": len(expected),
             "matchFraction": round(n_match / max(1, len(expected)), 4), "duration": round(duration, 3)}
    return lines, stats


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--audio", required=True)
    ap.add_argument("--sheet", default="lyrics/lyrics_sheet.json")
    ap.add_argument("--out", default="data/lyrics.json")
    ap.add_argument("--model", default="medium.en")
    ap.add_argument("--separated", action="store_true", help="audio is a Demucs vocal stem (recorded in the output)")
    args = ap.parse_args()

    sheet_lines = load_sheet(args.sheet)
    heard, segments_out, duration = transcribe(args.audio, args.model)
    lines, stats = build(sheet_lines, heard, duration)

    payload = {
        "lines": lines,
        "extras": [],
        "alignment": {
            "status": "machine-aligned-needs-QA",
            "method": f"faster-whisper {args.model} word timestamps + monotonic dynamic-programming match to known lyrics",
            "vocalsSeparated": args.separated,
            "source": args.sheet,
            **stats,
        },
        "notes": ("Machine-aligned word timings. Words with matched=false were interpolated between their aligned "
                  "neighbours; check them, held notes and repeated choruses by ear before final export. "
                  "conf = Whisper word probability (minimum over the parts of a hyphenated word). "
                  "transcriptSegments = what Whisper heard, for checking which lines are actually sung."),
        "transcriptSegments": segments_out,
    }
    Path(args.out).write_text(json.dumps(payload, ensure_ascii=False, indent=1) + "\n")
    print(json.dumps(payload["alignment"], indent=2))
    for line in lines:
        flag = "" if all(w["matched"] for w in line["words"] if WORD_RE.search(w["w"])) else "  *"
        print(f"{line['start']:7.2f} {line['end']:7.2f} {line['section']:8s} {line['text']}{flag}")


if __name__ == "__main__":
    main()
