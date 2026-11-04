"""Deployer state on the /state volume.

* ``state.json``: ETag cache and last deployed SHA (owned by the running loop).
* ``FAILED.<repo>``: SHA whose deploy failed; the repo is held until a newer
  green commit appears. Kept as its own file so an operator can clear it with
  ``rm`` (or ``--clear-failure``) while the loop runs.
* ``PAUSED`` / ``PAUSED.<repo>``: pause flags.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, Optional

log = logging.getLogger("deployer")

PAUSE_ALL = "PAUSED"
FAILED = "FAILED"


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
        tmp = self.path + ".tmp"
        try:
            os.makedirs(self.directory, exist_ok=True)
            with open(tmp, "w", encoding="utf-8") as fh:
                json.dump(self._data, fh, indent=2, sort_keys=True)
            os.replace(tmp, self.path)
        except OSError as exc:
            log.error("could not persist state to %s: %s", self.path, exc)

    def _flag(self, prefix: str, repo: str) -> str:
        return os.path.join(self.directory, f"{prefix}.{repo}")

    def failed_sha(self, repo: str) -> Optional[str]:
        try:
            with open(self._flag(FAILED, repo), encoding="utf-8") as fh:
                return fh.read().strip() or None
        except FileNotFoundError:
            return None
        except OSError as exc:
            log.error("cannot read failure marker for %s: %s", repo, exc)
            return None

    def set_failed(self, repo: str, sha: str) -> None:
        try:
            with open(self._flag(FAILED, repo), "w", encoding="utf-8") as fh:
                fh.write(sha + "\n")
        except OSError as exc:
            log.error("cannot write failure marker for %s: %s", repo, exc)

    def clear_failed(self, repo: str) -> Optional[str]:
        sha = self.failed_sha(repo)
        try:
            os.remove(self._flag(FAILED, repo))
        except FileNotFoundError:
            pass
        return sha

    def paused(self, repo: str) -> bool:
        return os.path.exists(os.path.join(self.directory, PAUSE_ALL)) or os.path.exists(
            self._flag(PAUSE_ALL, repo)
        )
