"""
Small restart-safe JSON store (no extra dependencies).

Each record is one file: <data_dir>/<namespace>/<id>.json, written atomically
(tmp file + os.replace) so a crash never leaves a half-written record.
IDs are validated against a strict pattern, so a caller-supplied case_id can
never escape the data directory (path traversal).

Retention: `purge_older_than` deletes records past their retention window.
Data dir: SNIFFER_DATA_DIR (default: services/analysis/.data).
"""
from __future__ import annotations

import json
import os
import re
import tempfile
import threading
import time
from pathlib import Path
from typing import Optional

_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
DEFAULT_DIR = Path(__file__).resolve().parents[1] / ".data"


def retention_seconds() -> float:
    days = float(os.getenv("SNIFFER_RETENTION_DAYS", "7"))
    return days * 86400


class JsonStore:
    def __init__(self, namespace: str, base_dir: Optional[Path] = None):
        root = Path(os.getenv("SNIFFER_DATA_DIR", "") or base_dir or DEFAULT_DIR)
        self.dir = root / namespace
        self._lock = threading.Lock()

    def _path(self, key: str) -> Path:
        if not _ID_RE.match(key or ""):
            raise ValueError("invalid record id")
        return self.dir / f"{key}.json"

    def get(self, key: str) -> Optional[dict]:
        try:
            path = self._path(key)
        except ValueError:
            return None
        try:
            with open(path, encoding="utf-8") as handle:
                return json.load(handle)
        except (FileNotFoundError, json.JSONDecodeError, OSError):
            return None

    def set(self, key: str, value: dict) -> bool:
        """Persist a record. Returns False (never raises) if the write fails."""
        try:
            path = self._path(key)
            with self._lock:
                self.dir.mkdir(parents=True, exist_ok=True)
                fd, tmp = tempfile.mkstemp(dir=self.dir, suffix=".tmp")
                try:
                    with os.fdopen(fd, "w", encoding="utf-8") as handle:
                        json.dump(value, handle)
                    os.replace(tmp, path)
                finally:
                    if os.path.exists(tmp):
                        os.unlink(tmp)
            return True
        except (OSError, ValueError, TypeError):
            return False

    def delete(self, key: str) -> None:
        try:
            self._path(key).unlink(missing_ok=True)
        except (OSError, ValueError):
            pass

    def keys(self) -> list[str]:
        if not self.dir.exists():
            return []
        return [p.stem for p in self.dir.glob("*.json")]

    def purge_older_than(self, seconds: float) -> int:
        removed = 0
        cutoff = time.time() - seconds
        for key in self.keys():
            try:
                path = self._path(key)
                if path.stat().st_mtime < cutoff:
                    path.unlink(missing_ok=True)
                    removed += 1
            except (OSError, ValueError):
                continue
        return removed
