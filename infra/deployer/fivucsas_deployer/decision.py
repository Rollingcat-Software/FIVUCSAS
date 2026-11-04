"""Pure deploy decision logic: no I/O, so every rule is unit-testable."""

from __future__ import annotations

import re
from dataclasses import dataclass
from enum import Enum
from typing import Iterable, List, Mapping, Optional, Sequence


SHA_RE = re.compile(r"^[0-9a-f]{40}$")


def is_sha(value: object) -> bool:
    """A full lowercase hex commit SHA, the only form passed on to git."""
    return isinstance(value, str) and SHA_RE.fullmatch(value) is not None


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


def green_shas(runs: Iterable[Mapping], full_name: str, branch: str = "main") -> List[str]:
    """Head SHAs of successful CI push runs on ``branch`` of ``full_name`` itself.

    Anything else is ignored even if the API filter let it through: other events,
    other branches, unfinished or failed runs, runs whose head repository is not
    ``owner/repo`` (a fork's branch can share the name ``main``), and head SHAs
    that are not 40 lowercase hex characters. Ordered newest run first by run
    creation time (a re-run keeps its ``created_at``), without duplicates.
    """
    keep = []
    for run in runs:
        if run.get("event") != "push" or run.get("head_branch") != branch:
            continue
        if run.get("status") != "completed" or run.get("conclusion") != "success":
            continue
        if (run.get("head_repository") or {}).get("full_name") != full_name:
            continue
        sha = run.get("head_sha")
        if not is_sha(sha):
            continue
        keep.append((run.get("created_at") or "", sha))
    # ISO-8601 UTC strings from the API compare correctly as text.
    keep.sort(key=lambda r: r[0], reverse=True)
    seen, ordered = set(), []
    for _, sha in keep:
        if sha not in seen:
            seen.add(sha)
            ordered.append(sha)
    return ordered


def newest_in_order(branch_order: Sequence[str], green: Iterable[str]) -> Optional[str]:
    """The first green SHA in ``branch_order`` (``git rev-list --topo-order <tip>``).

    That is the newest green commit that is an ancestor of (or equal to) the
    branch tip, by git order: never a commit from a force-pushed-away history and
    never an older commit whose CI happened to finish or re-run later.
    """
    wanted = set(green)
    for sha in branch_order:
        if sha in wanted:
            return sha
    return None


def decide(snap: RepoSnapshot) -> Decision:
    """Deploy only when prod is strictly behind a green commit it can fast-forward to."""
    if snap.paused:
        return Decision(Action.SKIP, "paused")
    if snap.target_sha is None:
        return Decision(Action.SKIP, "no green CI push run on the branch tip's history")
    if snap.prod_branch != snap.expected_branch:
        return Decision(
            Action.SKIP,
            f"checkout is on '{snap.prod_branch or 'detached HEAD'}', "
            f"expected '{snap.expected_branch}'",
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
