#!/usr/bin/env python3

import gzip
import json
import sqlite3
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "assets" / "dictionaries" / "runtime" / "ecdict"
manifest = json.loads((RUNTIME / "manifest.json").read_text(encoding="utf-8"))
with tempfile.TemporaryDirectory(prefix="langlsrw-ecdict-test-") as temp:
    database_path = Path(temp) / "ecdict.sqlite"
    with gzip.open(RUNTIME / manifest["file"], "rb") as source, database_path.open("wb") as target:
        while chunk := source.read(1024 * 1024):
            target.write(chunk)

    connection = sqlite3.connect(database_path)
    try:
        assert connection.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
        count = connection.execute("SELECT count(*) FROM stardict").fetchone()[0]
        assert count == manifest["entryCount"]
        for word in ("hello", "dictionary", "give", "revenue"):
            result = connection.execute(
                "SELECT word, translation FROM stardict WHERE word = ? COLLATE NOCASE", (word,)
            ).fetchone()
            assert result and result[1], f"Missing test entry: {word}"
        fuzzy = connection.execute(
            "SELECT word FROM stardict WHERE sw >= ? ORDER BY sw, word COLLATE NOCASE LIMIT 10",
            ("longtime",),
        ).fetchall()
        assert fuzzy, "Strip-word index returned no matches"
    finally:
        connection.close()

print(f"ECDICT build verified: {count:,} entries")
