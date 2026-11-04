"""Pure deploy decision logic: no I/O, so every rule is unit-testable."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Iterable, Mapping, Optional


class Relation(Enum):
    """How the production checkout relates to the newest green commit."""

    SAME = "same"            # prod HEAD is the target
    BEHIND = "behind"        # prod HEAD is a strict ancestor of the target (fast-forwardable)
    AHEAD = "ahead"          # the target is an ancestor of prod HEAD (prod already has it)
    DIVERGED = "diverged"    # neither is an ancestor of the other
    UNKNOWN = "unknown"      # could not be determined


class Action(Enum):
    DEPLOY = "deploy"
    SKIP = "skip"


@dataclass(frozen=True)
class Decision:
    action: Action
    reason: str

    @property
    def should_deploy(self) -> bool:
        return self.action is Action.DEPLOY


@dataclass(frozen=True)
class RepoSnapshot:
    """Everything the decision needs, gathered by the caller."""

    prod_sha: str
    prod_branch: str
    expected_branch: str
    target_sha: Optional[str]
    relation: Relation
    failed_sha: Optional[str]
    paused: bool


def pick_target(runs: Iterable[Mapping], branch: str = "main") -> Optional[str]:
    """Return the head SHA of the newest commit whose CI push run succeeded.

    Runs are ordered by the commit timestamp of their head commit, not by run
    creation time, so a re-run of an old commit never wins over a newer commit.
    Anything that is not a successful push run on ``branch`` is ignored even if
    the API filter let it through.
    """
    best_sha: Optional[str] = None
    best_ts = ""
    for run in runs:
        if run.get("event") != "push" or run.get("head_branch") != branch:
            continue
        if run.get("status") != "completed" or run.get("conclusion") != "success":
            continue
        sha = run.get("head_sha")
        if not sha:
            continue
        ts = (run.get("head_commit") or {}).get("timestamp") or run.get("created_at") or ""
        # ISO-8601 UTC strings from the API compare correctly as text.
        if best_sha is None or ts > best_ts:
            best_sha, best_ts = sha, ts
    return best_sha


def decide(snap: RepoSnapshot) -> Decision:
    """Deploy only when prod is strictly behind a green commit it can fast-forward to."""
    if snap.paused:
        return Decision(Action.SKIP, "paused")
    if snap.target_sha is None:
        return Decision(Action.SKIP, "no successful CI push run found on the branch")
    if snap.prod_branch != snap.expected_branch:
        return Decision(
            Action.SKIP,
            f"checkout is on '{snap.prod_branch or 'detached HEAD'}', expected '{snap.expected_branch}'",
        )
    if snap.failed_sha and snap.target_sha == snap.failed_sha:
        return Decision(
            Action.SKIP,
            f"{short(snap.target_sha)} failed to deploy before; waiting for a newer green commit",
        )
    if snap.relation is Relation.SAME:
        return Decision(Action.SKIP, "up to date")
    if snap.relation is Relation.AHEAD:
        return Decision(Action.SKIP, "prod already contains the newest green commit")
    if snap.relation is Relation.DIVERGED:
        return Decision(Action.SKIP, "prod has diverged from the branch; not fast-forwardable")
    if snap.relation is Relation.UNKNOWN:
        return Decision(Action.SKIP, "could not determine ancestry between prod and target")
    return Decision(
        Action.DEPLOY,
        f"prod {short(snap.prod_sha)} is behind green {short(snap.target_sha)}",
    )


def relation_from_compare_status(status: str) -> Relation:
    """Map GitHub's compare API status (base=prod, head=target) to a Relation."""
    return {
        "identical": Relation.SAME,
        "ahead": Relation.BEHIND,   # head (target) is ahead of base (prod)
        "behind": Relation.AHEAD,
        "diverged": Relation.DIVERGED,
    }.get(status, Relation.UNKNOWN)


def should_query(now: float, tip: Optional[str], poll: Optional[Mapping],
                 base_s: int, max_s: int = 3600) -> bool:
    """Whether the GitHub API must be asked for the newest green run.

    ``poll`` is the record of the previous query: the branch tip seen then
    ('tip'), when it ran ('at'), the green commit it found ('target') and how
    many times in a row the tip was unchanged ('streak').
    """
    if not poll or tip is None or poll.get("tip") != tip:
        return True
    if poll.get("target") == tip:
        return False  # tip already green: only a new push can change the answer
    wait = min(max_s, base_s * (2 ** int(poll.get("streak", 0))))
    return now - float(poll.get("at", 0)) >= wait


def rollback_tags_to_prune(tags_newest_first: Iterable[str], keep: int) -> list:
    """Rollback tags beyond the newest ``keep`` ones."""
    rollback = [t for t in tags_newest_first if t.startswith("rollback-")]
    return rollback[keep:]


def short(sha: Optional[str]) -> str:
    return (sha or "")[:12]
