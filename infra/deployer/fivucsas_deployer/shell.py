"""Command execution port. Tests replace ``Runner`` with a scripted fake."""

from __future__ import annotations

import logging
import os
import re
import signal
import subprocess
from dataclasses import dataclass
from typing import Optional, Sequence

log = logging.getLogger("deployer")

# After a timeout the command's process group gets SIGINT first (the docker CLI
# cancels its BuildKit session on interrupt, so the daemon stops the build instead
# of finishing it and retagging :latest later), then SIGKILL after this grace.
KILL_GRACE_S = 30


@dataclass(frozen=True)
class Result:
    code: int
    out: str

    @property
    def ok(self) -> bool:
        return self.code == 0


class CommandFailed(RuntimeError):
    def __init__(self, cmd: Sequence[str], result: Result):
        super().__init__(f"command failed ({result.code}): {redact(' '.join(cmd))}")
        self.cmd = list(cmd)
        self.result = result


class Runner:
    """Runs a command, captures combined stdout/stderr, never uses a shell.

    Every command runs in its own session (process group). That keeps the
    container's SIGTERM away from an in-flight build, and lets a timeout kill the
    whole tree (``docker`` plus its ``compose``/``buildx`` plugin children), not
    just the direct child.
    """

    def __init__(self, kill_grace_s: float = KILL_GRACE_S):
        self.kill_grace_s = kill_grace_s

    def run(self, cmd: Sequence[str], cwd: Optional[str] = None, timeout: int = 600) -> Result:
        try:
            proc = subprocess.Popen(
                list(cmd),
                cwd=cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                start_new_session=True,
            )
        except FileNotFoundError as exc:
            return Result(127, str(exc))
        try:
            out, _ = proc.communicate(timeout=timeout)
            return Result(proc.returncode, out or "")
        except subprocess.TimeoutExpired:
            out = self._kill_group(proc)
            return Result(124, out + f"\n[timed out after {timeout}s; process group killed]")

    def _kill_group(self, proc: subprocess.Popen) -> str:
        for sig, wait in ((signal.SIGINT, self.kill_grace_s), (signal.SIGKILL, None)):
            try:
                os.killpg(proc.pid, sig)
            except (ProcessLookupError, PermissionError):
                pass
            try:
                out, _ = proc.communicate(timeout=wait)
                return out or ""
            except subprocess.TimeoutExpired:
                continue
        return ""

    def check(self, cmd: Sequence[str], cwd: Optional[str] = None, timeout: int = 600) -> Result:
        result = self.run(cmd, cwd=cwd, timeout=timeout)
        if not result.ok:
            raise CommandFailed(cmd, result)
        return result


_URL_CREDENTIALS = re.compile(r"([a-z][a-z0-9+.-]*://)[^/\s@]+@", re.IGNORECASE)
_AUTH_HEADER = re.compile(r"(authorization\s*[:=]\s*)(?:(?:bearer|basic|token)\s+)?\S+",
                          re.IGNORECASE)
_SECRET_ASSIGNMENT = re.compile(
    r"\b([A-Z0-9_.-]*(?:KEY|SECRET|PASSWORD|PASSWD|TOKEN|CREDENTIALS?)[A-Z0-9_.-]*)"
    r"(\s*[=:]\s*)(\"[^\"]*\"|'[^']*'|\S+)",
    re.IGNORECASE)


def redact(text: str) -> str:
    """Mask obvious secrets before command output reaches the log.

    Best effort, not a guarantee: URL credentials, ``Authorization`` headers, and
    values assigned to names containing KEY, SECRET, PASSWORD, TOKEN or CREDENTIAL.
    """
    text = _URL_CREDENTIALS.sub(r"\1***@", text)
    text = _AUTH_HEADER.sub(r"\1***", text)
    return _SECRET_ASSIGNMENT.sub(r"\1\2***", text)


def tail(text: str, lines: int = 40) -> str:
    """Last ``lines`` lines of command output, redacted for logging."""
    return redact("\n".join(text.rstrip().splitlines()[-lines:]))
