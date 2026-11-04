"""Command execution port. Tests replace ``Runner`` with a scripted fake."""

from __future__ import annotations

import logging
import subprocess
from dataclasses import dataclass
from typing import Optional, Sequence

log = logging.getLogger("deployer")


@dataclass(frozen=True)
class Result:
    code: int
    out: str

    @property
    def ok(self) -> bool:
        return self.code == 0


class CommandFailed(RuntimeError):
    def __init__(self, cmd: Sequence[str], result: Result):
        super().__init__(f"command failed ({result.code}): {' '.join(cmd)}")
        self.cmd = list(cmd)
        self.result = result


class Runner:
    """Runs a command, captures combined stdout/stderr, never uses a shell."""

    def run(self, cmd: Sequence[str], cwd: Optional[str] = None, timeout: int = 600) -> Result:
        try:
            proc = subprocess.run(
                list(cmd),
                cwd=cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                timeout=timeout,
                check=False,
            )
            return Result(proc.returncode, proc.stdout or "")
        except subprocess.TimeoutExpired as exc:
            out = exc.stdout if isinstance(exc.stdout, str) else ""
            return Result(124, (out or "") + f"\n[timed out after {timeout}s]")
        except FileNotFoundError as exc:
            return Result(127, str(exc))

    def check(self, cmd: Sequence[str], cwd: Optional[str] = None, timeout: int = 600) -> Result:
        result = self.run(cmd, cwd=cwd, timeout=timeout)
        if not result.ok:
            raise CommandFailed(cmd, result)
        return result


def tail(text: str, lines: int = 40) -> str:
    return "\n".join(text.rstrip().splitlines()[-lines:])
