#!/usr/bin/env python3
"""Build a browser-ready Spanish dictionary package from Kaikki JSONL."""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import os
import shutil
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE_JSONL = ROOT.parent / "third-party" / "Spanish" / "kaikki.org-dictionary-Spanish.jsonl"
DEFAULT_OUTPUT_DIR = ROOT / "assets" / "dictionaries" / "runtime" / "spanish-wiktionary"
SCHEMA_VERSION = 1
BUILD_BATCH_SIZE = 5_000
MAX_LINES_PER_FIELD = 30


SCHEMA = """
CREATE TABLE stardict (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE,
  word VARCHAR(128) COLLATE NOCASE NOT NULL UNIQUE,
  sw VARCHAR(128) COLLATE NOCASE NOT NULL,
  phonetic VARCHAR(128),
  definition TEXT,
  translation TEXT,
  pos VARCHAR(64),
  collins INTEGER DEFAULT 0,
  oxford INTEGER DEFAULT 0,
  tag VARCHAR(128),
  bnc INTEGER DEFAULT NULL,
  frq INTEGER DEFAULT NULL,
  exchange TEXT,
  detail TEXT,
  audio TEXT
);
CREATE UNIQUE INDEX stardict_1 ON stardict (id);
CREATE UNIQUE INDEX stardict_2 ON stardict (word);
CREATE INDEX stardict_3 ON stardict (sw, word COLLATE NOCASE);
CREATE INDEX sd_1 ON stardict (word COLLATE NOCASE);
CREATE TABLE dictionary_meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
"""

UPSERT_SQL = """
INSERT INTO stardict (
  word, sw, phonetic, definition, translation, pos, collins, oxford,
  tag, bnc, frq, exchange, detail, audio
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(word) DO UPDATE SET
  phonetic = CASE
    WHEN stardict.phonetic IS NULL OR stardict.phonetic = '' THEN excluded.phonetic
    ELSE stardict.phonetic
  END,
  definition = CASE
    WHEN excluded.definition IS NULL OR excluded.definition = '' THEN stardict.definition
    WHEN stardict.definition IS NULL OR stardict.definition = '' THEN excluded.definition
    ELSE stardict.definition || char(10) || char(10) || excluded.definition
  END,
  translation = CASE
    WHEN excluded.translation IS NULL OR excluded.translation = '' THEN stardict.translation
    WHEN stardict.translation IS NULL OR stardict.translation = '' THEN excluded.translation
    ELSE stardict.translation || char(10) || excluded.translation
  END,
  pos = CASE
    WHEN excluded.pos IS NULL OR excluded.pos = '' THEN stardict.pos
    WHEN stardict.pos IS NULL OR stardict.pos = '' THEN excluded.pos
    WHEN instr(',' || stardict.pos || ',', ',' || excluded.pos || ',') > 0 THEN stardict.pos
    ELSE stardict.pos || ',' || excluded.pos
  END,
  tag = CASE
    WHEN excluded.tag IS NULL OR excluded.tag = '' THEN stardict.tag
    WHEN stardict.tag IS NULL OR stardict.tag = '' THEN excluded.tag
    WHEN instr(' ' || stardict.tag || ' ', ' ' || excluded.tag || ' ') > 0 THEN stardict.tag
    ELSE stardict.tag || ' ' || excluded.tag
  END,
  exchange = CASE
    WHEN excluded.exchange IS NULL OR excluded.exchange = '' THEN stardict.exchange
    WHEN stardict.exchange IS NULL OR stardict.exchange = '' THEN excluded.exchange
    WHEN instr(char(10) || stardict.exchange || char(10), char(10) || excluded.exchange || char(10)) > 0 THEN stardict.exchange
    ELSE stardict.exchange || char(10) || excluded.exchange
  END,
  detail = CASE
    WHEN excluded.detail IS NULL OR excluded.detail = '' THEN stardict.detail
    WHEN stardict.detail IS NULL OR stardict.detail = '' THEN excluded.detail
    ELSE stardict.detail || char(10) || char(10) || excluded.detail
  END
"""


def stripword(word: str) -> str:
    return "".join(char for char in word if char.isalnum()).casefold()


def compact_lines(lines: list[str], limit: int = MAX_LINES_PER_FIELD) -> str:
    output: list[str] = []
    seen: set[str] = set()
    for line in lines:
        normalized = " ".join(str(line or "").split())
        if not normalized:
            continue
        key = normalized.casefold()
        if key in seen:
            continue
        seen.add(key)
        output.append(normalized)
        if len(output) >= limit:
            break
    return "\n".join(output)


def first_ipa(entry: dict[str, Any]) -> str:
    for sound in entry.get("sounds") or []:
        ipa = str(sound.get("ipa") or "").strip()
        if ipa:
            return ipa
    return ""


def sense_lines(entry: dict[str, Any]) -> list[str]:
    lines: list[str] = []
    for sense in entry.get("senses") or []:
        glosses = sense.get("glosses") or sense.get("raw_glosses") or []
        form_of = [item.get("word") for item in sense.get("form_of") or [] if item.get("word")]
        tags = [tag for tag in sense.get("tags") or [] if tag not in {"form-of"}]
        prefix = ""
        if tags:
            prefix = f"({', '.join(tags)}) "
        if glosses:
            lines.extend(f"{prefix}{gloss}" for gloss in glosses)
        elif form_of:
            lines.append(f"{prefix}form of {', '.join(form_of)}")
    return lines


def example_lines(entry: dict[str, Any]) -> list[str]:
    lines: list[str] = []
    for sense in entry.get("senses") or []:
        for example in sense.get("examples") or []:
            text = example.get("text")
            english = example.get("english")
            if text and english:
                lines.append(f"{text} = {english}")
            elif text:
                lines.append(str(text))
    return lines


def exchange_lines(entry: dict[str, Any]) -> list[str]:
    lines: list[str] = []
    for sense in entry.get("senses") or []:
        for item in sense.get("form_of") or []:
            word = str(item.get("word") or "").strip()
            if word:
                lines.append(f"0:{word}")
    for form in entry.get("forms") or []:
        form_word = str(form.get("form") or "").strip()
        if not form_word or form_word == entry.get("word"):
            continue
        tags = ",".join(str(tag) for tag in form.get("tags") or [] if tag)
        label = tags or "form"
        lines.append(f"{label}:{form_word}")
    return lines


def detail_json(entry: dict[str, Any]) -> str:
    detail = {
        "source": "kaikki.org",
        "lang": entry.get("lang"),
        "lang_code": entry.get("lang_code"),
        "pos": entry.get("pos"),
        "etymology": entry.get("etymology_text"),
        "hyphenation": entry.get("hyphenation") or entry.get("hyphenations"),
    }
    return json.dumps({key: value for key, value in detail.items() if value}, ensure_ascii=False)


def row_values(entry: dict[str, Any]) -> tuple[object, ...] | None:
    if entry.get("lang_code") != "es":
        return None
    word = str(entry.get("word") or "").strip()
    if not word:
        return None
    glosses = compact_lines(sense_lines(entry))
    examples = compact_lines(example_lines(entry), limit=12)
    definition = glosses
    if examples:
        definition = f"{definition}\n\nExamples:\n{examples}" if definition else f"Examples:\n{examples}"
    pos = str(entry.get("pos") or "").strip()
    tags = []
    if any(sense.get("form_of") for sense in entry.get("senses") or []):
        tags.append("form-of")
    if any("idiomatic" in (sense.get("tags") or []) for sense in entry.get("senses") or []):
        tags.append("idiom")
    return (
        word,
        stripword(word),
        first_ipa(entry),
        definition,
        glosses,
        pos,
        0,
        0,
        " ".join(tags),
        None,
        None,
        compact_lines(exchange_lines(entry), limit=80),
        detail_json(entry),
        "",
    )


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def compress_database(output_db: Path, output_package: Path) -> None:
    temporary_package = output_package.with_suffix(".gz.building")
    temporary_package.unlink(missing_ok=True)
    with output_db.open("rb") as source, temporary_package.open("wb") as target:
        with gzip.GzipFile(filename=output_db.name, mode="wb", fileobj=target, compresslevel=9, mtime=0) as zipped:
            shutil.copyfileobj(source, zipped, length=1024 * 1024)
    output_package.unlink(missing_ok=True)
    temporary_package.replace(output_package)


def build_database(source_jsonl: Path, output_db: Path, dictionary_version: str, limit: int | None = None) -> int:
    output_db.parent.mkdir(parents=True, exist_ok=True)
    temporary_db = output_db.with_suffix(".sqlite.building")
    temporary_db.unlink(missing_ok=True)

    connection = sqlite3.connect(temporary_db)
    try:
        connection.executescript(SCHEMA)
        connection.execute("PRAGMA journal_mode=OFF")
        connection.execute("PRAGMA synchronous=OFF")
        connection.execute("PRAGMA temp_store=MEMORY")
        batch: list[tuple[object, ...]] = []
        processed = 0

        with source_jsonl.open("r", encoding="utf-8") as stream:
            for line_number, line in enumerate(stream, 1):
                if limit is not None and processed >= limit:
                    break
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                except json.JSONDecodeError as error:
                    raise ValueError(f"Invalid JSON on line {line_number}: {error}") from error
                values = row_values(entry)
                if values is None:
                    continue
                batch.append(values)
                processed += 1
                if len(batch) >= BUILD_BATCH_SIZE:
                    connection.executemany(UPSERT_SQL, batch)
                    batch.clear()
                    if processed % 100_000 == 0:
                        print(f"Imported {processed:,} Kaikki entries...")
            if batch:
                connection.executemany(UPSERT_SQL, batch)

        entry_count = connection.execute("SELECT count(*) FROM stardict").fetchone()[0]
        metadata = {
            "dictionary_id": "spanish-wiktionary",
            "dictionary_version": dictionary_version,
            "schema_version": str(SCHEMA_VERSION),
            "source": source_jsonl.name,
            "entry_count": str(entry_count),
            "language_id": "es",
            "license": "CC BY-SA 4.0",
            "built_at": datetime.now(timezone.utc).isoformat(),
        }
        connection.executemany(
            "INSERT INTO dictionary_meta(key, value) VALUES (?, ?)", metadata.items()
        )
        connection.commit()
        connection.execute("ANALYZE")
        connection.execute("VACUUM")
        check = connection.execute("PRAGMA integrity_check").fetchone()[0]
        if check != "ok":
            raise RuntimeError(f"SQLite integrity check failed: {check}")
    finally:
        connection.close()

    output_db.unlink(missing_ok=True)
    temporary_db.replace(output_db)
    return entry_count


def write_license(output_license: Path) -> None:
    output_license.write_text(
        "\n".join(
            [
                "Spanish Wiktionary dictionary package",
                "",
                "Source: Kaikki.org Spanish Wiktionary JSONL export",
                "Source data derives from Wiktionary and is distributed under CC BY-SA 4.0.",
                "Kaikki.org project: https://kaikki.org/",
                "Wiktionary: https://www.wiktionary.org/",
                "License: https://creativecommons.org/licenses/by-sa/4.0/",
                "",
                "The local runtime package is generated by langLSRW tooling from the",
                "owner-provided upstream JSONL file kept outside the deployed web app.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source",
        type=Path,
        default=Path(os.environ.get("SPANISH_SOURCE_JSONL", str(DEFAULT_SOURCE_JSONL))),
        help="Path to kaikki.org-dictionary-Spanish.jsonl.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(os.environ.get("SPANISH_DICTIONARY_OUTPUT_DIR", str(DEFAULT_OUTPUT_DIR))),
        help="Directory for generated runtime dictionary files.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=int(os.environ["SPANISH_BUILD_LIMIT"]) if os.environ.get("SPANISH_BUILD_LIMIT") else None,
        help="Optional source-entry limit for smoke tests.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    source_jsonl = args.source.expanduser().resolve()
    output_dir = args.output_dir.expanduser().resolve()
    output_db = output_dir / "spanish-wiktionary.sqlite"
    output_package = output_dir / "spanish-wiktionary.sqlite.gz"
    output_manifest = output_dir / "manifest.json"
    output_license = output_dir / "LICENSE"
    dictionary_version = datetime.now(timezone.utc).strftime("%Y.%m.%d")

    if not source_jsonl.exists():
        raise FileNotFoundError(f"Kaikki Spanish JSONL was not found: {source_jsonl}")

    print(f"Building from {source_jsonl.name} ({source_jsonl.stat().st_size:,} bytes)")
    if args.limit:
        print(f"Smoke-test limit: {args.limit:,} source entries")
    entry_count = build_database(source_jsonl, output_db, dictionary_version, args.limit)
    print("Compressing browser package...")
    compress_database(output_db, output_package)
    write_license(output_license)
    manifest = {
        "schemaVersion": SCHEMA_VERSION,
        "id": "spanish-wiktionary",
        "languageId": "es",
        "name": "西语 Wiktionary 词典",
        "version": dictionary_version,
        "format": "sqlite+gzip",
        "file": "spanish-wiktionary.sqlite.gz",
        "entryCount": entry_count,
        "databaseBytes": output_db.stat().st_size,
        "downloadBytes": output_package.stat().st_size,
        "sha256": sha256_file(output_db),
        "packageSha256": sha256_file(output_package),
        "source": source_jsonl.name,
        "license": "CC BY-SA 4.0",
        "notes": "Meanings are Wiktionary/Kaikki English glosses; Chinese learning explanations are a later cached layer.",
    }
    output_manifest.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    output_db.unlink()
    print(f"Built {entry_count:,} entries: {output_package}")


if __name__ == "__main__":
    main()
