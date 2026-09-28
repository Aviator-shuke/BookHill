"""Build the Spanish lemma frequency ranks used for the Spanish 词库 categories.

Input:  ../third-party/Spanish/frequency/frequency.csv (doozan/spanish_data, CC BY-SA)
Output: assets/dictionaries/runtime/spanish-wiktionary/frequency.tsv (rank, word, count)
        and the `frequency` entry of that folder's manifest.json.

The browser dictionary Worker imports the TSV into a `langlsrw_frequency` table inside the installed Spanish
dictionary database, so the 70 MB dictionary package itself never has to be rebuilt for frequency changes.

Cleaning rules (see SPANISH.md, "词频表下载与分析"):
1. Drop NOUSAGE rows (unmatched word forms: English names and words, abbreviations), except the preposition "a".
2. Drop proper nouns, single letters, and prefixes.
3. Sum the counts of rows that share a lemma (DUPLICATE rows are other parts of speech).
4. Move the article forms "la" / "las", which upstream merged into the pronoun "ella", to the article "el".
5. Keep one lemma per case-insensitive spelling (the more frequent one), as the dictionary matches case-insensitively.
"""

from __future__ import annotations

import argparse
import csv
import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = ROOT.parent / "third-party" / "Spanish" / "frequency" / "frequency.csv"
DEFAULT_OUTPUT_DIR = ROOT / "assets" / "dictionaries" / "runtime" / "spanish-wiktionary"
EXCLUDED_POS = {"prop", "letter", "prefix"}
KEPT_NOUSAGE = {"a"}
ARTICLE_FORMS_IN_ELLA = ("la", "las")


def usage_counts(usage: str) -> dict[str, int]:
    counts: dict[str, int] = {}
    for item in usage.split("|"):
        count, _, form = item.partition(":")
        if form and count.isdigit():
            counts[form] = counts.get(form, 0) + int(count)
    return counts


def ranked_lemmas(input_path: Path) -> list[tuple[str, int]]:
    totals: dict[str, int] = {}
    moved_to_article = 0
    with input_path.open(encoding="utf-8", newline="") as stream:
        for row in csv.DictReader(stream):
            lemma = row["spanish"].strip()
            if not lemma:
                continue
            if row["flags"] == "NOUSAGE" and lemma not in KEPT_NOUSAGE:
                continue
            if row["pos"] in EXCLUDED_POS:
                continue
            count = int(row["count"])
            if lemma == "ella" and row["pos"] == "pron":
                forms = usage_counts(row["usage"])
                moved = sum(forms.get(form, 0) for form in ARTICLE_FORMS_IN_ELLA)
                count -= moved
                moved_to_article += moved
            totals[lemma] = totals.get(lemma, 0) + count
    if moved_to_article:
        totals["el"] = totals.get("el", 0) + moved_to_article
    ranked = sorted(totals.items(), key=lambda item: (-item[1], item[0]))
    # The dictionary matches words case-insensitively, so keep only the more frequent of lemmas that differ only in
    # case (for example "TIC" and "tic").
    seen: set[str] = set()
    unique = []
    for word, count in ranked:
        if word.casefold() in seen:
            continue
        seen.add(word.casefold())
        unique.append((word, count))
    return unique


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--version", default=date.today().strftime("%Y.%m.%d"))
    parser.add_argument("--source", default="doozan/spanish_data frequency.csv")
    args = parser.parse_args()

    lemmas = ranked_lemmas(args.input)
    output = args.output_dir / "frequency.tsv"
    with output.open("w", encoding="utf-8", newline="\n") as stream:
        stream.write("rank\tword\tcount\n")
        for rank, (word, count) in enumerate(lemmas, 1):
            stream.write(f"{rank}\t{word}\t{count}\n")

    manifest_path = args.output_dir / "manifest.json"
    manifest_text = manifest_path.read_bytes().decode("utf-8")
    manifest_newline = "\r\n" if "\r\n" in manifest_text else "\n"
    manifest = json.loads(manifest_text)
    manifest["frequency"] = {
        "file": output.name,
        "version": args.version,
        "entryCount": len(lemmas),
        "source": args.source,
        "license": "CC BY-SA 3.0 (doozan/spanish_data; FrequencyWords / OpenSubtitles)"
    }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline=manifest_newline)
    print(f"Wrote {len(lemmas)} lemmas to {output} (version {args.version})")


if __name__ == "__main__":
    main()
