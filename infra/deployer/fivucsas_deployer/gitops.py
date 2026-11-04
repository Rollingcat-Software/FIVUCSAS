"""Git operations on a production checkout.

The prod checkouts are submodules of the FIVUCSAS parent: their ``.git`` is a
file pointing at ``/opt/projects/fivucsas/.git/modules/<repo>``, which the
container must mount at the same path (see docker-compose.yml).

Every commit argument is validated as a 40-hex SHA (or is a fixed ref name) and
follows ``--end-of-options``, so nothing that reaches git can be read as an
option. ``--`` is added where git takes pathspecs after the revision.
"""

from __future__ import annotations

from typing import List, Optional

from .decision import Relation, is_sha
from .shell import CommandFailed, Runner

# safe.directory lets the read-only dry run work from another account; the
# identity is needed only because `git stash` records a commit. No credential
# helper: the canonical URL is public and must never prompt.
GIT = ["git", "-c", "safe.directory=*", "-c", "user.name=fivucsas-deployer",
       "-c", "user.email=deployer@localhost", "-c", "credential.helper="]

LOCAL_TIMEOUT_S = 60      # any local git command
NETWORK_TIMEOUT_S = 300   # fetch
LS_REMOTE_TIMEOUT_S = 60
# Upper bound of one move_to: up to seven local commands (head, status, stash
# push, merge/reset, stash pop, and the reset + pop of a restore).
MOVE_BUDGET_S = 7 * LOCAL_TIMEOUT_S
REV_LIST_DEPTH = 500
STASH_PREFIX = "deployer-overrides-"


def _sha(value: str) -> str:
    if not is_sha(value):
        raise ValueError(f"not a commit SHA: {value!r}")
    return value


class Git:
    def __init__(self, runner: Runner, checkout: str, url: str):
        self.runner = runner
        self.checkout = checkout
        self.url = url  # canonical source; the checkout's own 'origin' URL is not used

    def _git(self, *args: str, timeout: int = LOCAL_TIMEOUT_S):
        return self.runner.run(GIT + ["-C", self.checkout, *args], timeout=timeout)

    def _check(self, *args: str, timeout: int = LOCAL_TIMEOUT_S) -> str:
        cmd = GIT + ["-C", self.checkout, *args]
        return self.runner.check(cmd, timeout=timeout).out.strip()

    def head(self) -> str:
        return self._check("rev-parse", "--verify", "HEAD^{commit}")

    def branch(self) -> str:
        res = self._git("symbolic-ref", "--quiet", "--short", "HEAD")
        return res.out.strip() if res.ok else ""

    def has_commit(self, sha: str) -> bool:
        return is_sha(sha) and self._git("cat-file", "-e", "--end-of-options",
                                         f"{sha}^{{commit}}").ok

    def is_ancestor(self, older: str, newer: str) -> bool:
        return self._git("merge-base", "--is-ancestor", "--end-of-options", older, newer).ok

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

    @staticmethod
    def tracking_ref(branch: str) -> str:
        return f"refs/remotes/origin/{branch}"

    def fetch(self, branch: str) -> None:
        """Fetch the canonical URL's branch into refs/remotes/origin/<branch>, forced."""
        self._check("fetch", "--quiet", "--no-tags", "--end-of-options", self.url,
                    f"+refs/heads/{branch}:{self.tracking_ref(branch)}",
                    timeout=NETWORK_TIMEOUT_S)

    def remote_tip(self, branch: str) -> Optional[str]:
        """Branch tip at the canonical URL via the git protocol (no API budget)."""
        res = self._git("ls-remote", "--end-of-options", self.url, f"refs/heads/{branch}",
                        timeout=LS_REMOTE_TIMEOUT_S)
        parts = res.out.split() if res.ok else []
        return parts[0] if parts and is_sha(parts[0]) else None

    def rev_list(self, rev: str, depth: int = REV_LIST_DEPTH) -> List[str]:
        """Up to ``depth`` commits reachable from ``rev``, descendants before ancestors."""
        res = self._git("rev-list", "--topo-order", f"--max-count={depth}", "--end-of-options",
                        rev, "--")
        return [line for line in res.out.split() if is_sha(line)] if res.ok else []

    def on_remote_branch(self, sha: str, branch: str) -> bool:
        return self.is_ancestor(_sha(sha), self.tracking_ref(branch))

    def tracked_changes(self) -> List[str]:
        out = self._check("status", "--porcelain", "--untracked-files=no")
        return [line for line in out.splitlines() if line.strip()]

    def _reset_hard(self, sha: str) -> None:
        self._check("reset", "--hard", "--quiet", "--end-of-options", _sha(sha), "--")

    def move_to(self, sha: str, ff_only: bool) -> None:
        """Move the branch to ``sha`` keeping local tracked overrides.

        Overrides are stashed only if there are any. If they no longer apply on
        top of ``sha`` the checkout is restored to where it was (overrides
        included) and CommandFailed is raised.
        """
        _sha(sha)
        original = self.head()
        stashed = bool(self.tracked_changes())
        if stashed:
            self._check("stash", "push", "--quiet", "-m", f"{STASH_PREFIX}{original[:12]}")
        try:
            if ff_only:
                self._check("merge", "--ff-only", "--quiet", "--end-of-options", sha)
            else:
                self._reset_hard(sha)
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
        self._reset_hard(original)
        self._check("stash", "pop", "--quiet")

    def _leftover_stash(self, sha: str) -> bool:
        """Whether the newest stash is the deployer's, taken while HEAD was ``sha``."""
        res = self._git("stash", "list", "--max-count=1", "--format=%gs")
        return res.ok and res.out.strip().endswith(f"{STASH_PREFIX}{sha[:12]}")

    def recover_to(self, sha: str) -> None:
        """Put the checkout back on ``sha`` with its overrides, after any interruption.

        Also covers a deployer killed between ``stash push`` and ``stash pop``: the
        work tree is then clean and the overrides sit in the newest stash.
        """
        _sha(sha)
        if not self.tracked_changes() and self._leftover_stash(sha):
            self._reset_hard(sha)
            self._check("stash", "pop", "--quiet")
            return
        if self.head() != sha:
            self.move_to(sha, ff_only=False)

    def short_log(self, old: str, new: str, limit: int = 20) -> Optional[str]:
        res = self._git("log", "--oneline", f"--max-count={limit}", "--end-of-options",
                        f"{_sha(old)}..{_sha(new)}", "--")
        return res.out.strip() if res.ok else None
