"""Deployer state on the /state volume.

* ``state.json``: ETag cache, last deployed SHA, interruption count (owned by the
  running loop).
* ``FAILED.<repo>``: SHA whose deploy failed; the repo is held until a newer
  green commit appears. Kept as its own file so an operator can clear it with
  ``rm`` (or ``--clear-failure``) while the loop runs.
* ``INFLIGHT.<repo>``: written before the checkout moves and removed once the
  deploy succeeded or was rolled back. If it is still there when a cycle starts,
  the previous deploy was interrupted (container killed, host rebooted) and the
  checkout HEAD may name a commit that is not running; the cycle reconciles it
  before anything else.
* ``PAUSED`` / ``PAUSED.<repo>``: pause flags.
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any, Dict, Optional

from .decision import is_sha

log = logging.getLogger("deployer")

PAUSE_ALL = "PAUSED"
FAILED = "FAILED"
INFLIGHT = "INFLIGHT"

IMAGE_ID_RE = re.compile(r"^sha256:[0-9a-f]{64}$")
ROLLBACK_TAG_RE = re.compile(r"^rollback-[0-9a-f]{12}$")


class InvalidMarker(ValueError):
    """A marker file exists but its content is not what the deployer wrote."""


class StateStore:
    def __init__(self, directory: str):
        self.directory = directory
        self.path = os.path.join(directory, "state.json")
        self._data: Dict[str, Dict[str, Any]] = self._load()

    def _load(self) -> Dict[str, Dict[str, Any]]:
        try:
            with open(self.path, encoding="utf-8") as fh:
                data = json.load(fh)
            return data if isinstance(data, dict) else {}
        except FileNotFoundError:
            return {}
        except (OSError, ValueError) as exc:
            log.warning("state file unreadable, starting empty: %s", exc)
            return {}

    def repo(self, name: str) -> Dict[str, Any]:
        return self._data.setdefault(name, {})

    def save(self) -> None:
        """Atomic write; a failure is logged, never fatal (state is a cache plus failure memory)."""
        try:
            self._write_atomic(self.path, json.dumps(self._data, indent=2, sort_keys=True))
        except OSError as exc:
            log.error("could not persist state to %s: %s", self.path, exc)

    def _write_atomic(self, path: str, text: str) -> None:
        os.makedirs(self.directory, exist_ok=True)
        tmp = path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as fh:
            fh.write(text)
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp, path)

    def _flag(self, prefix: str, repo: str) -> str:
        return os.path.join(self.directory, f"{prefix}.{repo}")

    def _read(self, path: str) -> Optional[str]:
        try:
            with open(path, encoding="utf-8") as fh:
                return fh.read()
        except FileNotFoundError:
            return None

    # failure marker ----------------------------------------------------------
    def failed_sha(self, repo: str) -> Optional[str]:
        """The held SHA, or None. Raises InvalidMarker (repo must be held) on junk content."""
        path = self._flag(FAILED, repo)
        try:
            raw = self._read(path)
        except OSError as exc:
            raise InvalidMarker(f"cannot read {path}: {exc}") from exc
        if raw is None:
            return None
        sha = raw.strip()
        if not is_sha(sha):
            raise InvalidMarker(f"{path} does not hold a 40-hex commit SHA; fix or remove it")
        return sha

    def set_failed(self, repo: str, sha: str) -> None:
        if not is_sha(sha):
            raise ValueError(f"refusing to record a non-SHA as failed: {sha!r}")
        try:
            self._write_atomic(self._flag(FAILED, repo), sha + "\n")
        except OSError as exc:
            log.error("cannot write failure marker for %s: %s", repo, exc)

    def clear_failed(self, repo: str) -> Optional[str]:
        """Remove the failure marker whatever it holds; returns its old content."""
        path = self._flag(FAILED, repo)
        try:
            raw = self._read(path)
            os.remove(path)
        except FileNotFoundError:
            return None
        return (raw or "").strip() or None

    # in-flight marker --------------------------------------------------------
    def inflight(self, repo: str) -> Optional[Dict[str, str]]:
        """The interrupted deploy record, or None. Raises InvalidMarker on junk content."""
        path = self._flag(INFLIGHT, repo)
        try:
            raw = self._read(path)
        except OSError as exc:
            raise InvalidMarker(f"cannot read {path}: {exc}") from exc
        if raw is None:
            return None
        try:
            data = json.loads(raw)
        except ValueError as exc:
            raise InvalidMarker(f"{path} is not valid JSON; inspect it, then remove it") from exc
        if not _valid_inflight(data):
            raise InvalidMarker(f"{path} has unexpected content; inspect it, then remove it")
        return data

    def set_inflight(self, repo: str, record: Dict[str, str]) -> bool:
        """Persist the record (fsync'd). False means do not start the deploy."""
        if not _valid_inflight(record):
            raise ValueError(f"invalid in-flight record: {record!r}")
        try:
            self._write_atomic(self._flag(INFLIGHT, repo), json.dumps(record, sort_keys=True))
            return True
        except OSError as exc:
            log.error("cannot write in-flight marker for %s: %s", repo, exc)
            return False

    def clear_inflight(self, repo: str) -> None:
        try:
            os.remove(self._flag(INFLIGHT, repo))
        except FileNotFoundError:
            pass
        except OSError as exc:
            log.error("cannot remove in-flight marker for %s: %s", repo, exc)

    def paused(self, repo: str) -> bool:
        return os.path.exists(os.path.join(self.directory, PAUSE_ALL)) or os.path.exists(
            self._flag(PAUSE_ALL, repo)
        )


def _valid_inflight(data: Any) -> bool:
    if not isinstance(data, dict):
        return False
    if not (is_sha(data.get("old")) and is_sha(data.get("new"))):
        return False
    if not (_matches(IMAGE_ID_RE, data.get("old_image"))
            and _matches(ROLLBACK_TAG_RE, data.get("rollback_tag"))):
        return False
    new_image = data.get("new_image")
    return new_image is None or _matches(IMAGE_ID_RE, new_image)


def _matches(pattern: "re.Pattern[str]", value: Any) -> bool:
    return isinstance(value, str) and pattern.fullmatch(value) is not None
