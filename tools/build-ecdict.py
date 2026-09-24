#!/usr/bin/env python3
"""Build the browser-ready SQLite dictionary from the complete ECDICT archive."""

from __future__ import annotations

import csv
import gzip
import hashlib
import json
import os
import shutil
import sqlite3
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE_DIR = ROOT.parent / "third-party" / "ECDICT-master"
SOURCE_DIR = Path(os.environ.get("ECDICT_SOURCE_DIR", str(DEFAULT_SOURCE_DIR))).expanduser().resolve()
SOURCE_CSV = SOURCE_DIR / "ecdict.csv"
OUTPUT_DIR = ROOT / "assets" / "dictionaries" / "runtime" / "ecdict"
OUTPUT_DB = OUTPUT_DIR / "ecdict.sqlite"
OUTPUT_PACKAGE = OUTPUT_DIR / "ecdict.sqlite.gz"
OUTPUT_MANIFEST = OUTPUT_DIR / "manifest.json"
OUTPUT_LICENSE = OUTPUT_DIR / "LICENSE"
SCHEMA_VERSION = 1
BUILD_BATCH_SIZE = 10_000


SCHEMA = """
CREATE TABLE stardict (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE,
  word VARCHAR(64) COLLATE NOCASE NOT NULL UNIQUE,
  sw VARCHAR(64) COLLATE NOCASE NOT NULL,
  phonetic VARCHAR(64),
  definition TEXT,
  translation TEXT,
  pos VARCHAR(16),
  collins INTEGER DEFAULT 0,
  oxford INTEGER DEFAULT 0,
  tag VARCHAR(64),
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

INSERT_SQL = """
INSERT OR IGNORE INTO stardict (
  word, sw, phonetic, definition, translation, pos, collins, oxford,
  tag, bnc, frq, exchange, detail, audio
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
"""


def stripword(word: str) -> str:
    return "".join(char for char in word if char.isalnum()).lower()


def decode_text(value: str | None) -> str | None:
    if value is None:
        return None
    output: list[str] = []
    index = 0
    while index < len(value):
        char = value[index]
        if char == "\\" and index + 1 < len(value):
            escaped = value[index + 1]
            if escaped == "n":
                output.append("\n")
            elif escaped == "r":
                output.append("\r")
            elif escaped == "\\":
                output.append("\\")
            else:
                output.extend(("\\", escaped))
            index += 2
        else:
            output.append(char)
            index += 1
    return "".join(output)


def optional_int(value: str | None) -> int | None:
    value = (value or "").strip()
    if not value or value == "0":
        return None
    try:
        return int(value)
    except ValueError:
        return None


def row_values(row: list[str]) -> tuple[object, ...] | None:
    if not row or not row[0].strip():
        return None
    row = (row + [""] * 13)[:13]
    word = row[0].strip()
    text_fields = [decode_text(value) for value in row]
    return (
        word,
        stripword(word),
        text_fields[1],
        text_fields[2],
        text_fields[3],
        text_fields[4],
        optional_int(row[5]),
        optional_int(row[6]),
        text_fields[7],
        optional_int(row[8]),
        optional_int(row[9]),
        text_fields[10],
        text_fields[11],
        text_fields[12],
    )


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def compress_database() -> None:
    temporary_package = OUTPUT_PACKAGE.with_suffix(".gz.building")
    temporary_package.unlink(missing_ok=True)
    with OUTPUT_DB.open("rb") as source, temporary_package.open("wb") as target:
        with gzip.GzipFile(filename=OUTPUT_DB.name, mode="wb", fileobj=target, compresslevel=9, mtime=0) as zipped:
            shutil.copyfileobj(source, zipped, length=1024 * 1024)
    OUTPUT_PACKAGE.unlink(missing_ok=True)
    temporary_package.replace(OUTPUT_PACKAGE)


def build_database(source_csv: Path, source_name: str, dictionary_version: str) -> int:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    temporary_db = OUTPUT_DB.with_suffix(".sqlite.building")
    temporary_db.unlink(missing_ok=True)

    connection = sqlite3.connect(temporary_db)
    try:
        connection.executescript(SCHEMA)
        connection.execute("PRAGMA journal_mode=OFF")
        connection.execute("PRAGMA synchronous=OFF")
        connection.execute("PRAGMA temp_store=MEMORY")
        batch: list[tuple[object, ...]] = []
        processed = 0

        with source_csv.open("r", encoding="utf-8", newline="") as stream:
            reader = csv.reader(stream)
            next(reader, None)
            for row in reader:
                values = row_values(row)
                if values is None:
                    continue
                batch.append(values)
                if len(batch) >= BUILD_BATCH_SIZE:
                    connection.executemany(INSERT_SQL, batch)
                    processed += len(batch)
                    batch.clear()
                    if processed % 100_000 == 0:
                        print(f"Imported {processed:,} source rows...")
            if batch:
                connection.executemany(INSERT_SQL, batch)

        entry_count = connection.execute("SELECT count(*) FROM stardict").fetchone()[0]
        metadata = {
            "dictionary_id": "ecdict",
            "dictionary_version": dictionary_version,
            "schema_version": str(SCHEMA_VERSION),
            "source": source_name,
            "entry_count": str(entry_count),
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

    OUTPUT_DB.unlink(missing_ok=True)
    temporary_db.replace(OUTPUT_DB)
    return entry_count


def main() -> None:
    dictionary_version = datetime.now(timezone.utc).strftime("%Y.%m.%d")
    if not SOURCE_CSV.exists():
        raise FileNotFoundError(f"ECDICT basic CSV was not found: {SOURCE_CSV}")
    source_name = SOURCE_CSV.name
    print(f"Building from {source_name} ({SOURCE_CSV.stat().st_size:,} bytes)")
    entry_count = build_database(SOURCE_CSV, source_name, dictionary_version)

    shutil.copy2(SOURCE_DIR / "LICENSE", OUTPUT_LICENSE)
    print("Compressing browser package...")
    compress_database()
    manifest = {
        "schemaVersion": SCHEMA_VERSION,
        "id": "ecdict",
        "name": "ECDICT 英汉词典",
        "version": dictionary_version,
        "format": "sqlite+gzip",
        "file": "ecdict.sqlite.gz",
        "entryCount": entry_count,
        "databaseBytes": OUTPUT_DB.stat().st_size,
        "downloadBytes": OUTPUT_PACKAGE.stat().st_size,
        "sha256": sha256_file(OUTPUT_DB),
        "packageSha256": sha256_file(OUTPUT_PACKAGE),
        "source": source_name,
        "license": "MIT",
    }
    OUTPUT_MANIFEST.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    OUTPUT_DB.unlink()
    print(f"Built {entry_count:,} entries: {OUTPUT_PACKAGE}")


if __name__ == "__main__":
    main()
