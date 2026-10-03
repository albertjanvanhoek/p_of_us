"""Guard for the align-lyrics workflow: keep the committed timings when a re-run is worse.

Whisper on CPU is not bit-for-bit reproducible across runners, so re-aligning the same lyrics
can shift timings and match fewer words. If the lyric lines are unchanged and the new run
matched fewer words than the committed one, the committed data/lyrics.json is restored.
A changed lyric sheet always takes the new result (the counts are not comparable then).

Usage: python analysis/keep_better_alignment.py --old committed.json --new data/lyrics.json
Prints 'accept' or 'keep' on the last line.
"""
import argparse
import json
import shutil
from pathlib import Path


def summary(d: dict) -> tuple[list[str], int]:
    return [line["text"] for line in d["lines"]], int(d["alignment"]["matchedWords"])


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--old", required=True, help="the committed lyrics.json (may be missing)")
    ap.add_argument("--new", required=True, help="the fresh alignment; overwritten when kept")
    ap.add_argument("--force", action="store_true", help="always accept the new alignment")
    args = ap.parse_args()

    new = json.loads(Path(args.new).read_text())
    new_lines, new_matched = summary(new)
    old_path = Path(args.old)
    if args.force or not old_path.is_file() or old_path.stat().st_size == 0:
        print("no committed alignment to compare with" if not args.force else "forced")
        print("accept")
        return
    try:
        old_lines, old_matched = summary(json.loads(old_path.read_text()))
    except (KeyError, ValueError, TypeError) as e:
        print(f"committed alignment unreadable ({e})")
        print("accept")
        return

    if old_lines != new_lines:
        print(f"lyric lines changed; new run matched {new_matched}/{new['alignment']['totalWords']}")
        print("accept")
    elif new_matched < old_matched:
        print(f"new run matched {new_matched} words, committed one {old_matched}: keeping the committed timings")
        shutil.copyfile(old_path, args.new)
        print("keep")
    else:
        print(f"new run matched {new_matched} words, committed one {old_matched}")
        print("accept")


if __name__ == "__main__":
    main()
