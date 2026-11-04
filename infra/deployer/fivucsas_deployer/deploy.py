"""One poll-decide-deploy cycle for one repository."""

from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass
from typing import Dict, List, Optional

from .config import RepoSpec, Settings
from .decision import Action, Decision, Relation, RepoSnapshot, decide, newest_in_order, \
    green_shas, relation_from_compare_status, short, should_query
from .docker_ops import Docker
from .github import GitHubClient, GitHubError, RateLimited
from .gitops import Git
from .shell import CommandFailed, Runner, redact, tail
from .state import InvalidMarker, StateStore

log = logging.getLogger("deployer")

# The same commit interrupted this many times in a row is held like a failure,
# so a deploy that always gets the container killed cannot loop forever.
MAX_INTERRUPTIONS = 2


@dataclass(frozen=True)
class Outcome:
    decision: Decision
    deployed: bool = False
    failed: bool = False
    detail: str = ""


class RepoDeployer:
    def __init__(self, spec: RepoSpec, settings: Settings, runner: Runner,
                 github: GitHubClient, state: StateStore,
                 git: Optional[Git] = None, docker: Optional[Docker] = None,
                 stop: Optional[threading.Event] = None):
        self.spec = spec
        self.settings = settings
        self.github = github
        self.state = state
        self.git = git or Git(runner, spec.checkout, spec.remote_url)
        self.docker = docker or Docker(runner, spec, settings.node_image, settings.build_no_cache)
        self.stop = stop
        self._fetched = False

    # decision ----------------------------------------------------------------
    def _say(self, level: int, msg: str, *args) -> None:
        log.log(level, "[%s] " + msg, self.spec.name, *args)

    def _skip(self, reason: str, level: int = logging.WARNING) -> Outcome:
        self._say(level, "skip: %s", reason)
        return Outcome(Decision(Action.SKIP, reason))

    def cycle(self) -> Outcome:
        name = self.spec.name
        paused = self.state.paused(name)
        try:
            inflight = self.state.inflight(name)
            failed = self.state.failed_sha(name)
        except InvalidMarker as exc:
            return self._skip(f"holding: {exc}", logging.ERROR)
        if inflight is not None:
            if paused:
                return self._skip("paused with an interrupted deploy pending recovery "
                                  f"({short(inflight['old'])} -> {short(inflight['new'])})")
            return self._reconcile(inflight)

        rs = self.state.repo(name)
        prod = self.git.head()
        branch = self.git.branch()
        target: Optional[str] = None
        relation = Relation.UNKNOWN

        if not paused:
            tip = self.git.remote_tip(self.spec.branch)
            if tip is None:
                return self._skip(f"cannot read the tip of {self.spec.remote_url} "
                                  f"{self.spec.branch} (git ls-remote failed)")
            try:
                target = self._green_target(rs, tip)
            except (RateLimited, GitHubError, OSError, ValueError) as exc:
                return self._skip(f"GitHub query failed: {exc}")
            except CommandFailed as exc:
                return self._skip(f"git fetch failed: {tail(exc.result.out, 5)}")
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
                self._say(logging.INFO, "dry run: commits to deploy:\n%s", redact(log_lines))
            return Outcome(decision)
        if self.stop is not None and self.stop.is_set():
            return self._skip("stop requested; not starting a deploy", logging.INFO)
        assert target is not None
        return self._deploy(decision, prod, target)

    def _fetch(self) -> None:
        if not self._fetched:
            self.git.fetch(self.spec.branch)
            self._fetched = True

    def _green_target(self, rs: dict, tip: str) -> Optional[str]:
        """Newest green commit on the branch, asking the GitHub API only when it can have changed.

        ``git ls-remote`` (no API budget) tells whether the branch moved. While the
        tip is already green nothing new can appear, so no API call is made; while
        it is not (CI still running, or a tip CI skipped by its path filter) the
        API is re-asked with exponential backoff.
        """
        poll = rs.get("poll")
        now = time.time()
        if not should_query(now, tip, poll, self.settings.interval_s):
            return poll.get("target")
        runs, _ = self.github.successful_push_runs(
            self.spec.name, self.spec.ci_workflow, self.spec.branch,
            rs.setdefault("runs_cache", {}))
        target = self._newest_on_branch(tip, green_shas(runs, self.spec.full_name,
                                                        self.spec.branch))
        same_tip = bool(poll) and poll.get("tip") == tip
        rs["poll"] = {"tip": tip, "at": now, "target": target,
                      "streak": (poll.get("streak", 0) + 1) if same_tip else 0}
        return target

    def _newest_on_branch(self, tip: str, green: List[str]) -> Optional[str]:
        """Order green SHAs by git ancestry from the canonical branch tip."""
        if not green:
            return None
        if not self.settings.dry_run:
            self._fetch()
            return newest_in_order(self.git.rev_list(Git.tracking_ref(self.spec.branch)), green)
        if self.git.has_commit(tip):
            return newest_in_order(self.git.rev_list(tip), green)
        # Read-only and the tip is not in local objects: run creation time is the
        # best order available. Only a dry run ever uses it.
        self._say(logging.INFO, "dry run: tip %s not in local objects; ordering green runs by "
                  "run creation time", short(tip))
        return green[0]

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
            self._fetch()
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
            self._say(logging.ERROR, "%s missing in the checkout; not deploying",
                      self.spec.env_file)
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
        marker: Dict[str, object] = {"old": old, "new": new, "old_image": old_image,
                                     "rollback_tag": rollback_tag, "started": int(time.time())}
        # From here until the marker is removed, HEAD and the running image may
        # disagree; the marker is what tells the next start to reconcile them.
        if not self.state.set_inflight(name, marker):
            return Outcome(decision, detail="in-flight marker not writable")
        self._say(logging.INFO, "tagged %s:%s; deploying %s -> %s", self.spec.image, rollback_tag,
                  short(old), short(new))

        try:
            self.git.move_to(new, ff_only=True)
        except CommandFailed as exc:
            self._settle(self._head_is(old))
            return self._fail(decision, new, "git fast-forward or override re-apply failed",
                              exc, rollback=False)

        try:
            build = self.docker.build()
            self._say(logging.INFO, "build ok:\n%s", tail(build.out, 5))
        except CommandFailed as exc:
            # A cancelled build must not leave a new :latest behind for a later `up`.
            self._pin_latest(old_image)
            self._settle(self._restore_git(old))
            return self._fail(decision, new, "build failed", exc, rollback=False)

        new_image = self.docker.image_id(f"{self.spec.image}:latest") or ""
        if new_image:
            self.state.set_inflight(name, dict(marker, new_image=new_image))
        try:
            self.docker.up()
        except CommandFailed as exc:
            self._settle(self._rollback(old, rollback_tag, old_image))
            return self._fail(decision, new, "compose up failed", exc, rollback=True)

        healthy, why = self.docker.wait_healthy(new_image)
        if not healthy:
            self._say(logging.ERROR, "health check failed: %s", why)
            self._settle(self._rollback(old, rollback_tag, old_image))
            return self._fail(decision, new, f"health check failed ({why})", None, rollback=True)

        self._record_success(new)
        self._say(logging.INFO, "DEPLOYED %s (%s) in %ds", short(new), why,
                  int(time.monotonic() - started))
        return Outcome(decision, deployed=True)

    def _record_success(self, new: str) -> None:
        name = self.spec.name
        self.state.clear_failed(name)
        self.state.clear_inflight(name)
        rs = self.state.repo(name)
        rs.pop("interrupted", None)
        rs["last_deployed"] = {"sha": new, "at": int(time.time())}
        pruned = self.docker.prune_rollback_tags(self.settings.keep_rollback_tags)
        if pruned:
            self._say(logging.INFO, "pruned old rollback tags: %s", ", ".join(pruned))

    def _settle(self, recovered: bool) -> None:
        """Drop the in-flight marker once prod is back on the old commit, else keep it."""
        if recovered:
            self.state.clear_inflight(self.spec.name)
        else:
            self._say(logging.CRITICAL, "recovery incomplete; the in-flight marker stays and the "
                      "next cycle retries it")

    def _head_is(self, sha: str) -> bool:
        try:
            return self.git.head() == sha
        except CommandFailed:
            return False

    def _fail(self, decision: Decision, sha: str, what: str, exc: Optional[CommandFailed],
              rollback: bool) -> Outcome:
        if exc is not None:
            self._say(logging.ERROR, "%s: %s\n%s", what, redact(" ".join(exc.cmd[:6])),
                      tail(exc.result.out, 60))
        self.state.set_failed(self.spec.name, sha)
        self._say(logging.ERROR, "FAILED %s: %s%s; holding this repo until a newer green commit",
                  short(sha), what, " (rolled back)" if rollback else "")
        return Outcome(decision, failed=True, detail=what)

    def _pin_latest(self, image: str) -> None:
        try:
            self.docker.tag(image, "latest")
        except CommandFailed as exc:
            self._say(logging.CRITICAL, "could not point %s:latest back at %s: %s",
                      self.spec.image, image[:19], tail(exc.result.out, 5))

    def _restore_git(self, old: str) -> bool:
        try:
            self.git.recover_to(old)
            return True
        except CommandFailed as exc:
            self._say(logging.CRITICAL, "could not restore checkout to %s: %s", short(old),
                      tail(exc.result.out, 20))
            return False

    def _rollback(self, old: str, rollback_tag: str, old_image: str,
                  recreate: bool = True) -> bool:
        """Image back to ``old_image``, checkout back to ``old``; True when both are done."""
        self._say(logging.WARNING, "rolling back to %s (%s:%s)", short(old), self.spec.image,
                  rollback_tag)
        try:
            self.docker.tag(f"{self.spec.image}:{rollback_tag}", "latest")
        except CommandFailed:
            self._pin_latest(old_image)  # rollback tag gone: the image ID still names it
        git_ok = self._restore_git(old)
        if not recreate:
            return git_ok
        try:
            self.docker.up(force_recreate=True)
        except CommandFailed as exc:
            self._say(logging.CRITICAL, "rollback compose up failed: %s", tail(exc.result.out, 30))
            return False
        healthy, why = self.docker.wait_healthy(old_image)
        if healthy:
            self._say(logging.WARNING, "rollback healthy (%s)", why)
        else:
            self._say(logging.CRITICAL, "ROLLBACK UNHEALTHY (%s): manual action needed", why)
        return git_ok

    # recovery ----------------------------------------------------------------
    def _reconcile(self, m: dict) -> Outcome:
        """Finish or undo a deploy that a kill, crash or reboot interrupted."""
        old, new, old_image = m["old"], m["new"], m["old_image"]
        new_image = m.get("new_image")
        self._say(logging.WARNING, "found an interrupted deploy %s -> %s (started %s)",
                  short(old), short(new), m.get("started", "?"))
        if self.settings.dry_run:
            return self._skip("dry run: would recover the interrupted deploy "
                              f"{short(old)} -> {short(new)}", logging.INFO)
        running = self.docker.running_image_id()

        if new_image and running == new_image and self._head_is(new):
            healthy, why = self.docker.wait_healthy(new_image)
            if healthy:
                self._record_success(new)
                self._say(logging.WARNING, "DEPLOYED %s: the interrupted deploy had completed "
                          "(%s)", short(new), why)
                return Outcome(Decision(Action.DEPLOY, "completed an interrupted deploy"),
                               deployed=True)

        recovered = self._rollback(old, m["rollback_tag"], old_image,
                                   recreate=running != old_image)
        if not recovered:
            self._say(logging.CRITICAL, "could not recover the interrupted deploy; retrying "
                      "next cycle")
            return Outcome(Decision(Action.SKIP, "recovery of an interrupted deploy failed"),
                           failed=True, detail="recovery failed")
        self.state.clear_inflight(self.spec.name)
        rs = self.state.repo(self.spec.name)
        prev = rs.get("interrupted") or {}
        count = (int(prev.get("count", 0)) + 1) if prev.get("sha") == new else 1
        rs["interrupted"] = {"sha": new, "count": count}
        if count >= MAX_INTERRUPTIONS:
            self.state.set_failed(self.spec.name, new)
            self._say(logging.ERROR, "FAILED %s: interrupted %d times; holding this repo until a "
                      "newer green commit", short(new), count)
            return Outcome(Decision(Action.SKIP, "rolled back an interrupted deploy"),
                           failed=True, detail="interrupted repeatedly")
        self._say(logging.WARNING, "rolled back the interrupted deploy to %s; %s will be retried",
                  short(old), short(new))
        return Outcome(Decision(Action.SKIP, "rolled back an interrupted deploy"))
