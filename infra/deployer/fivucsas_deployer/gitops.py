"""Git operations on a production checkout."""

from __future__ import annotations

from typing import List, Optional

from .decision import Relation
from .shell import CommandFailed, Runner

# safe.directory lets the read-only dry run work from another account; the
# identity is needed only because `git stash` records a commit.
GIT = ["git", "-c", "safe.directory=*", "-c", "user.name=fivucsas-deployer",
       "-c", "user.email=deployer@localhost"]


class Git:
    def __init__(self, runner: Runner, checkout: str):
        self.runner = runner
        self.checkout = checkout

    def _git(self, *args: str, timeout: int = 120):
        return self.runner.run(GIT + ["-C", self.checkout, *args], timeout=timeout)

    def _check(self, *args: str, timeout: int = 120) -> str:
        cmd = GIT + ["-C", self.checkout, *args]
        return self.runner.check(cmd, timeout=timeout).out.strip()

    def head(self) -> str:
        return self._check("rev-parse", "HEAD")

    def branch(self) -> str:
        res = self._git("symbolic-ref", "--quiet", "--short", "HEAD")
        return res.out.strip() if res.ok else ""

    def has_commit(self, sha: str) -> bool:
        return self._git("cat-file", "-e", f"{sha}^{{commit}}").ok

    def is_ancestor(self, older: str, newer: str) -> bool:
        return self._git("merge-base", "--is-ancestor", older, newer).ok

    def relation(self, prod: str, target: str) -> Relation:
        if prod == target:
            return Relation.SAME
        if not (self.has_commit(prod) and self.has_commit(target)):
            return Relation.UNKNOWN
        if self.is_ancestor(prod, target):
            return Relation.BEHIND
        if self.is_ancestor(target, prod):
            return Relation.AHEAD
        return Relation.DIVERGED

    def fetch(self, branch: str) -> None:
        self._check("fetch", "--quiet", "origin", branch, timeout=300)

    def remote_tip(self, branch: str) -> Optional[str]:
        """Branch tip on origin via the git protocol (read-only, no API budget)."""
        res = self._git("ls-remote", "origin", f"refs/heads/{branch}", timeout=60)
        parts = res.out.split() if res.ok else []
        return parts[0] if parts and len(parts[0]) == 40 else None

    def on_remote_branch(self, sha: str, branch: str) -> bool:
        return self.is_ancestor(sha, f"origin/{branch}")

    def tracked_changes(self) -> List[str]:
        out = self._check("status", "--porcelain", "--untracked-files=no")
        return [line for line in out.splitlines() if line.strip()]

    def move_to(self, sha: str, ff_only: bool) -> None:
        """Move the branch to ``sha`` keeping local tracked overrides.

        Overrides are stashed only if there are any. If they no longer apply on
        top of ``sha`` the checkout is restored to where it was (overrides
        included) and CommandFailed is raised.
        """
        original = self.head()
        stashed = bool(self.tracked_changes())
        if stashed:
            self._check("stash", "push", "--quiet", "-m", f"deployer-overrides-{original[:12]}")
        try:
            if ff_only:
                self._check("merge", "--ff-only", "--quiet", sha)
            else:
                self._check("reset", "--hard", "--quiet", sha)
        except CommandFailed:
            if stashed:
                self._restore_stash(original)
            raise
        if stashed:
            pop = self._git("stash", "pop", "--quiet")
            if not pop.ok:
                # Overrides conflict with the new tree: put everything back as it was.
                self._restore_stash(original)
                raise CommandFailed(["git", "stash", "pop"], pop)

    def _restore_stash(self, original: str) -> None:
        self._check("reset", "--hard", "--quiet", original)
        self._check("stash", "pop", "--quiet")

    def short_log(self, old: str, new: str, limit: int = 20) -> Optional[str]:
        res = self._git("log", "--oneline", f"-{limit}", f"{old}..{new}")
        return res.out.strip() if res.ok else None
