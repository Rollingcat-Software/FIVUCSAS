"""One poll-decide-deploy cycle for one repository."""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Optional

from .config import RepoSpec, Settings
from .decision import Action, Decision, Relation, RepoSnapshot, decide, pick_target, \
    relation_from_compare_status, short, should_query
from .docker_ops import Docker
from .github import GitHubClient, GitHubError, RateLimited
from .gitops import Git
from .shell import CommandFailed, Runner, tail
from .state import StateStore

log = logging.getLogger("deployer")


@dataclass(frozen=True)
class Outcome:
    decision: Decision
    deployed: bool = False
    failed: bool = False
    detail: str = ""


class RepoDeployer:
    def __init__(self, spec: RepoSpec, settings: Settings, runner: Runner,
                 github: GitHubClient, state: StateStore,
                 git: Optional[Git] = None, docker: Optional[Docker] = None):
        self.spec = spec
        self.settings = settings
        self.github = github
        self.state = state
        self.git = git or Git(runner, spec.checkout)
        self.docker = docker or Docker(runner, spec, settings.node_image, settings.build_no_cache)

    # decision ----------------------------------------------------------------
    def _say(self, level: int, msg: str, *args) -> None:
        log.log(level, "[%s] " + msg, self.spec.name, *args)

    def cycle(self) -> Outcome:
        rs = self.state.repo(self.spec.name)
        paused = self.state.paused(self.spec.name)
        failed = self.state.failed_sha(self.spec.name)
        prod = self.git.head()
        branch = self.git.branch()
        target: Optional[str] = None
        relation = Relation.UNKNOWN

        if not paused:
            try:
                target = self._green_target(rs)
            except (RateLimited, GitHubError, OSError, ValueError) as exc:
                decision = Decision(Action.SKIP, f"GitHub query failed: {exc}")
                self._say(logging.WARNING, "skip: %s", decision.reason)
                return Outcome(decision)
            if target and target != failed:
                relation = self._relation(prod, target)

        snap = RepoSnapshot(prod, branch, self.spec.branch, target, relation, failed, paused)
        decision = decide(snap)
        notable = relation in (Relation.DIVERGED, Relation.UNKNOWN) and target is not None \
            and not paused and target != failed
        level = logging.WARNING if notable else logging.INFO
        self._say(level, "prod=%s green=%s -> %s (%s)", short(prod), short(target) or "-",
                  decision.action.value, decision.reason)
        if not decision.should_deploy:
            return Outcome(decision)
        if self.settings.dry_run:
            self._say(logging.INFO, "dry run: would tag %s (running in %s) as %s:rollback-%s, "
                      "fast-forward to %s, build, up -d and health-check; env file %s",
                      (self.docker.running_image_id() or "NOT FOUND")[:19], self.spec.container,
                      self.spec.image, short(prod), short(target),
                      "present" if self.docker.env_file_present() else "MISSING")
            log_lines = self.git.short_log(prod, target)
            if log_lines:
                self._say(logging.INFO, "dry run: commits to deploy:\n%s", log_lines)
            return Outcome(decision)
        assert target is not None
        return self._deploy(decision, prod, target)

    def _green_target(self, rs: dict) -> Optional[str]:
        """Newest green commit, asking the GitHub API only when it can have changed.

        ``git ls-remote`` (no API budget) tells whether the branch moved. While the
        tip is already green nothing new can appear, so no API call is made; while
        it is not (CI still running, or a tip CI skipped by its path filter) the
        API is re-asked with exponential backoff.
        """
        tip = self.git.remote_tip(self.spec.branch)
        poll = rs.get("poll")
        now = time.time()
        if not should_query(now, tip, poll, self.settings.interval_s):
            return poll.get("target")
        runs, _ = self.github.successful_push_runs(
            self.spec.name, self.spec.ci_workflow, self.spec.branch,
            rs.setdefault("runs_cache", {}))
        target = pick_target(runs, self.spec.branch)
        same_tip = bool(poll) and tip is not None and poll.get("tip") == tip
        rs["poll"] = {"tip": tip, "at": now, "target": target,
                      "streak": (poll.get("streak", 0) + 1) if same_tip else 0}
        return target

    def _relation(self, prod: str, target: str) -> Relation:
        if prod == target:
            return Relation.SAME
        if self.settings.dry_run:
            # Read-only: never fetch. Use local objects when present, else ask GitHub.
            rel = self.git.relation(prod, target)
            if rel is Relation.UNKNOWN:
                try:
                    rel = relation_from_compare_status(
                        self.github.compare_status(self.spec.name, prod, target))
                except (RateLimited, GitHubError, OSError, ValueError) as exc:
                    self._say(logging.WARNING, "compare failed: %s", exc)
            return rel
        try:
            self.git.fetch(self.spec.branch)
        except CommandFailed as exc:
            self._say(logging.WARNING, "git fetch failed: %s", tail(exc.result.out, 5))
            return Relation.UNKNOWN
        rel = self.git.relation(prod, target)
        if rel is Relation.BEHIND and not self.git.on_remote_branch(target, self.spec.branch):
            self._say(logging.WARNING, "%s is not on origin/%s any more", short(target),
                      self.spec.branch)
            return Relation.UNKNOWN
        return rel

    # deploy ------------------------------------------------------------------
    def _deploy(self, decision: Decision, old: str, new: str) -> Outcome:
        name = self.spec.name
        started = time.monotonic()
        if not self.docker.env_file_present():
            self._say(logging.ERROR, "%s missing in the checkout; not deploying", self.spec.env_file)
            return Outcome(decision, detail="env file missing")
        old_image = self.docker.running_image_id()
        if not old_image:
            self._say(logging.ERROR, "container %s not found; refusing to deploy without a "
                      "rollback image", self.spec.container)
            return Outcome(decision, detail="no running container")
        rollback_tag = f"rollback-{short(old)}"
        try:
            self.docker.tag(old_image, rollback_tag)
        except CommandFailed as exc:
            self._say(logging.ERROR, "could not tag rollback image: %s", tail(exc.result.out, 5))
            return Outcome(decision, detail="rollback tag failed")
        self._say(logging.INFO, "tagged %s:%s; deploying %s -> %s", self.spec.image, rollback_tag,
                  short(old), short(new))

        try:
            self.git.move_to(new, ff_only=True)
        except CommandFailed as exc:
            return self._fail(decision, new, "git fast-forward or override re-apply failed",
                              exc, rollback=False)

        try:
            build = self.docker.build()
            self._say(logging.INFO, "build ok:\n%s", tail(build.out, 5))
        except CommandFailed as exc:
            self._restore_git(old)
            return self._fail(decision, new, "build failed", exc, rollback=False)

        new_image = self.docker.image_id(f"{self.spec.image}:latest") or ""
        try:
            self.docker.up()
        except CommandFailed as exc:
            self._rollback(old, rollback_tag, old_image)
            return self._fail(decision, new, "compose up failed", exc, rollback=True)

        healthy, why = self.docker.wait_healthy(new_image)
        if not healthy:
            self._say(logging.ERROR, "health check failed: %s", why)
            self._rollback(old, rollback_tag, old_image)
            return self._fail(decision, new, f"health check failed ({why})", None, rollback=True)

        self.state.clear_failed(name)
        self.state.repo(name)["last_deployed"] = {"sha": new, "at": int(time.time())}
        pruned = self.docker.prune_rollback_tags(self.settings.keep_rollback_tags)
        if pruned:
            self._say(logging.INFO, "pruned old rollback tags: %s", ", ".join(pruned))
        self._say(logging.INFO, "DEPLOYED %s (%s) in %ds", short(new), why,
                  int(time.monotonic() - started))
        return Outcome(decision, deployed=True)

    def _fail(self, decision: Decision, sha: str, what: str, exc: Optional[CommandFailed],
              rollback: bool) -> Outcome:
        if exc is not None:
            self._say(logging.ERROR, "%s: %s\n%s", what, " ".join(exc.cmd[:6]),
                      tail(exc.result.out, 60))
        self.state.set_failed(self.spec.name, sha)
        self._say(logging.ERROR, "FAILED %s: %s%s; holding this repo until a newer green commit",
                  short(sha), what, " (rolled back)" if rollback else "")
        return Outcome(decision, failed=True, detail=what)

    def _restore_git(self, old: str) -> bool:
        try:
            self.git.move_to(old, ff_only=False)
            return True
        except CommandFailed as exc:
            self._say(logging.CRITICAL, "could not restore checkout to %s: %s", short(old),
                      tail(exc.result.out, 20))
            return False

    def _rollback(self, old: str, rollback_tag: str, old_image: str) -> None:
        self._say(logging.WARNING, "rolling back to %s (%s:%s)", short(old), self.spec.image,
                  rollback_tag)
        try:
            self.docker.tag(f"{self.spec.image}:{rollback_tag}", "latest")
        except CommandFailed as exc:
            self._say(logging.CRITICAL, "could not retag rollback image: %s",
                      tail(exc.result.out, 10))
        self._restore_git(old)
        try:
            self.docker.up(force_recreate=True)
        except CommandFailed as exc:
            self._say(logging.CRITICAL, "rollback compose up failed: %s", tail(exc.result.out, 30))
            return
        healthy, why = self.docker.wait_healthy(old_image)
        if healthy:
            self._say(logging.WARNING, "rollback healthy (%s)", why)
        else:
            self._say(logging.CRITICAL, "ROLLBACK UNHEALTHY (%s): manual action needed", why)
