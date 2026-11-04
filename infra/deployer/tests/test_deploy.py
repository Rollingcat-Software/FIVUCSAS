"""Orchestration tests with in-memory fakes for git, docker and GitHub."""

import json
import os
import shutil
import tempfile
import threading
import unittest

from fivucsas_deployer.config import REPOS, Settings
from fivucsas_deployer.decision import Relation
from fivucsas_deployer.deploy import RepoDeployer
from fivucsas_deployer.github import RateLimited
from fivucsas_deployer.shell import CommandFailed, Result
from fivucsas_deployer.state import StateStore

OLD, NEW, NEWER = "1" * 40, "2" * 40, "3" * 40
OLD_IMG, NEW_IMG = "sha256:" + "a" * 64, "sha256:" + "b" * 64
FULL_NAME = REPOS["identity-core-api"].full_name


def failed(cmd="x"):
    return CommandFailed([cmd], Result(1, "boom"))


def green_run(sha, created="2026-11-04T10:00:00Z", repo=FULL_NAME):
    return {"head_sha": sha, "head_branch": "main", "event": "push", "status": "completed",
            "conclusion": "success", "created_at": created,
            "head_repository": {"full_name": repo}}


class FakeGitHub:
    def __init__(self, target=NEW, error=None, compare="ahead", runs=None):
        self.error, self.compare = error, compare
        self.runs = runs if runs is not None else ([] if target is None else [green_run(target)])
        self.calls = 0

    def successful_push_runs(self, repo, workflow, branch, cache):
        self.calls += 1
        if self.error:
            raise self.error
        return list(self.runs), False

    def compare_status(self, repo, base, head):
        return self.compare


class FakeGit:
    def __init__(self, head=OLD, relation=Relation.BEHIND, move_fails_for=(), tip=NEW,
                 order=(NEWER, NEW, OLD), on_hook=None):
        self._head, self._relation, self.tip = head, relation, tip
        self.move_fails_for = set(move_fails_for)
        self.order = list(order)
        self.on_hook = on_hook
        self.fetched = 0
        self.moves = []

    def head(self):
        return self._head

    def branch(self):
        return "main"

    def has_commit(self, sha):
        return True

    def relation(self, prod, target):
        return self._relation

    def fetch(self, branch):
        self.fetched += 1

    def remote_tip(self, branch):
        return self.tip

    def rev_list(self, rev, depth=500):
        return self.order

    def on_remote_branch(self, sha, branch):
        return True

    def move_to(self, sha, ff_only):
        if self.on_hook:
            self.on_hook(sha)
        self.moves.append((sha, ff_only))
        if sha in self.move_fails_for:
            raise failed("git")
        self._head = sha

    def recover_to(self, sha):
        self.moves.append((sha, False))
        self._head = sha

    def short_log(self, old, new, limit=20):
        return "2222222 change"


class FakeDocker:
    def __init__(self, build_ok=True, healthy=(True,), running=OLD_IMG):
        self.build_ok = build_ok
        self.healthy = list(healthy)
        self.running = running
        self.tags, self.ups, self.waits = [], [], []
        self.built = 0

    def env_file_present(self):
        return True

    def running_image_id(self):
        return self.running

    def image_id(self, ref):
        return NEW_IMG

    def tag(self, source, tag):
        self.tags.append((source, tag))

    def build(self):
        self.built += 1
        if not self.build_ok:
            raise failed("docker compose build")
        return Result(0, "built")

    def up(self, force_recreate=False):
        self.ups.append(force_recreate)
        return Result(0, "")

    def wait_healthy(self, expected_image):
        self.waits.append(expected_image)
        ok = self.healthy.pop(0) if self.healthy else True
        return ok, "healthy" if ok else "container unhealthy"

    def prune_rollback_tags(self, keep):
        return []


class RepoDeployerTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.state = StateStore(self.tmp)
        self.spec = REPOS["identity-core-api"]

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def deployer(self, git=None, docker=None, github=None, dry_run=False, stop=None):
        settings = Settings.from_env({"DEPLOYER_DRY_RUN": "true" if dry_run else "false"})
        self.git = git or FakeGit()
        self.docker = docker or FakeDocker()
        self.github = github or FakeGitHub()
        return RepoDeployer(self.spec, settings, None, self.github, self.state,
                            git=self.git, docker=self.docker, stop=stop)

    def marker_path(self):
        return os.path.join(self.tmp, f"INFLIGHT.{self.spec.name}")

    def write_marker(self, **extra):
        record = {"old": OLD, "new": NEW, "old_image": OLD_IMG,
                  "rollback_tag": f"rollback-{OLD[:12]}", "started": 1}
        record.update(extra)
        with open(self.marker_path(), "w") as fh:
            json.dump(record, fh)

    # deploy ------------------------------------------------------------------
    def test_cycle_WhenBehindAndHealthy_ShouldTagBuildUpAndRecordSuccess(self):
        out = self.deployer().cycle()
        self.assertTrue(out.deployed)
        self.assertEqual(self.docker.tags, [(OLD_IMG, f"rollback-{OLD[:12]}")])
        self.assertEqual(self.git.moves, [(NEW, True)])
        self.assertEqual(self.docker.built, 1)
        self.assertEqual(self.docker.ups, [False])
        self.assertEqual(self.docker.waits, [NEW_IMG])
        self.assertIsNone(self.state.failed_sha(self.spec.name))
        self.assertEqual(self.state.repo(self.spec.name)["last_deployed"]["sha"], NEW)

    def test_cycle_WhenDeploying_ShouldWriteInflightMarkerBeforeMovingAndRemoveItAfter(self):
        seen = []
        git = FakeGit(on_hook=lambda sha: seen.append(self.state.inflight(self.spec.name)))
        self.deployer(git=git).cycle()
        self.assertEqual(seen[0]["old"], OLD)
        self.assertEqual(seen[0]["new"], NEW)
        self.assertEqual(seen[0]["old_image"], OLD_IMG)
        self.assertFalse(os.path.exists(self.marker_path()))

    def test_cycle_WhenHealthCheckFails_ShouldRollBackImageAndGitAndHoldRepo(self):
        out = self.deployer(docker=FakeDocker(healthy=(False, True))).cycle()
        self.assertTrue(out.failed)
        rollback = f"{self.spec.image}:rollback-{OLD[:12]}"
        self.assertIn((rollback, "latest"), self.docker.tags)
        self.assertEqual(self.git.moves, [(NEW, True), (OLD, False)])
        self.assertEqual(self.docker.ups, [False, True])
        self.assertEqual(self.docker.waits, [NEW_IMG, OLD_IMG])
        self.assertEqual(self.state.failed_sha(self.spec.name), NEW)
        self.assertFalse(os.path.exists(self.marker_path()))

        # Same green commit next cycle: held, nothing touched.
        again = self.deployer(git=FakeGit(head=OLD)).cycle()
        self.assertFalse(again.deployed)
        self.assertEqual(self.docker.built, 0)

    def test_cycle_WhenNewerGreenCommitAfterFailure_ShouldTryAgain(self):
        self.state.set_failed(self.spec.name, NEW)
        out = self.deployer(github=FakeGitHub(target=NEWER), git=FakeGit(tip=NEWER)).cycle()
        self.assertTrue(out.deployed)
        self.assertIsNone(self.state.failed_sha(self.spec.name))

    def test_cycle_WhenBuildFails_ShouldRestoreGitPinLatestAndNotTouchContainer(self):
        out = self.deployer(docker=FakeDocker(build_ok=False)).cycle()
        self.assertTrue(out.failed)
        self.assertEqual(self.git.moves, [(NEW, True), (OLD, False)])
        self.assertEqual(self.docker.ups, [])
        self.assertIn((OLD_IMG, "latest"), self.docker.tags)
        self.assertEqual(self.state.failed_sha(self.spec.name), NEW)
        self.assertFalse(os.path.exists(self.marker_path()))

    def test_cycle_WhenOverridesConflict_ShouldNotBuildAndHoldRepo(self):
        out = self.deployer(git=FakeGit(move_fails_for={NEW})).cycle()
        self.assertTrue(out.failed)
        self.assertEqual(self.docker.built, 0)
        self.assertEqual(self.state.failed_sha(self.spec.name), NEW)
        self.assertFalse(os.path.exists(self.marker_path()))

    def test_cycle_WhenNoRunningContainer_ShouldRefuseWithoutMarkingFailure(self):
        out = self.deployer(docker=FakeDocker(running=None)).cycle()
        self.assertFalse(out.deployed)
        self.assertEqual(self.git.moves, [])
        self.assertIsNone(self.state.failed_sha(self.spec.name))

    def test_cycle_WhenStopRequested_ShouldNotStartADeploy(self):
        stop = threading.Event()
        stop.set()
        out = self.deployer(stop=stop).cycle()
        self.assertFalse(out.deployed)
        self.assertEqual(self.git.moves, [])
        self.assertEqual(self.docker.tags, [])

    def test_cycle_WhenDryRun_ShouldNeverFetchMoveOrBuild(self):
        out = self.deployer(dry_run=True).cycle()
        self.assertTrue(out.decision.should_deploy)
        self.assertEqual(self.git.fetched, 0)
        self.assertEqual(self.git.moves, [])
        self.assertEqual(self.docker.tags, [])
        self.assertEqual(self.docker.built, 0)

    def test_cycle_WhenDryRunAndTargetNotLocal_ShouldAskGitHubCompare(self):
        out = self.deployer(git=FakeGit(relation=Relation.UNKNOWN),
                            github=FakeGitHub(compare="ahead"), dry_run=True).cycle()
        self.assertTrue(out.decision.should_deploy)

    # target selection --------------------------------------------------------
    def test_cycle_WhenOlderCommitsRunFinishedLater_ShouldPickNewestByGitOrder(self):
        runs = [green_run(OLD, created="2026-11-04T12:00:00Z"),
                green_run(NEW, created="2026-11-04T09:00:00Z")]
        out = self.deployer(github=FakeGitHub(runs=runs), git=FakeGit(order=(NEW, OLD))).cycle()
        self.assertTrue(out.deployed)
        self.assertEqual(self.git.moves[0], (NEW, True))

    def test_cycle_WhenGreenCommitNotOnBranchHistory_ShouldIgnoreIt(self):
        gone = "4" * 40  # green, newest run, but force-pushed away from main
        runs = [green_run(gone, created="2026-11-05T00:00:00Z"), green_run(NEW)]
        out = self.deployer(github=FakeGitHub(runs=runs), git=FakeGit(order=(NEW, OLD))).cycle()
        self.assertEqual(self.git.moves[0], (NEW, True))
        self.assertTrue(out.deployed)

    def test_cycle_WhenOnlyRunIsFromAFork_ShouldNotDeploy(self):
        runs = [green_run(NEW, repo="attacker/identity-core-api")]
        out = self.deployer(github=FakeGitHub(runs=runs)).cycle()
        self.assertFalse(out.decision.should_deploy)
        self.assertEqual(self.git.moves, [])

    def test_cycle_WhenLsRemoteFails_ShouldSkipWithoutApiCall(self):
        out = self.deployer(git=FakeGit(tip=None)).cycle()
        self.assertFalse(out.decision.should_deploy)
        self.assertEqual(self.github.calls, 0)

    def test_cycle_WhenFailureMarkerMalformed_ShouldHoldRepoWithoutApiCall(self):
        with open(os.path.join(self.tmp, f"FAILED.{self.spec.name}"), "w") as fh:
            fh.write("--upload-pack=evil\n")
        out = self.deployer().cycle()
        self.assertFalse(out.decision.should_deploy)
        self.assertIn("holding", out.decision.reason)
        self.assertEqual(self.github.calls, 0)

    # interrupted deploys -----------------------------------------------------
    def test_cycle_WhenInterruptedAfterHealthyUp_ShouldCompleteWithoutRebuilding(self):
        self.write_marker(new_image=NEW_IMG)
        out = self.deployer(git=FakeGit(head=NEW), docker=FakeDocker(running=NEW_IMG)).cycle()
        self.assertTrue(out.deployed)
        self.assertEqual(self.docker.built, 0)
        self.assertEqual(self.git.moves, [])
        self.assertFalse(os.path.exists(self.marker_path()))
        self.assertEqual(self.state.repo(self.spec.name)["last_deployed"]["sha"], NEW)

    def test_cycle_WhenInterruptedBeforeUp_ShouldRestoreCheckoutAndLatestWithoutRecreate(self):
        self.write_marker()
        out = self.deployer(git=FakeGit(head=NEW), docker=FakeDocker(running=OLD_IMG)).cycle()
        self.assertFalse(out.deployed)
        self.assertEqual(self.git.moves, [(OLD, False)])
        self.assertIn((f"{self.spec.image}:rollback-{OLD[:12]}", "latest"), self.docker.tags)
        self.assertEqual(self.docker.ups, [])
        self.assertEqual(self.docker.built, 0)
        self.assertFalse(os.path.exists(self.marker_path()))
        self.assertIsNone(self.state.failed_sha(self.spec.name))

    def test_cycle_WhenInterruptedWithNewImageUnhealthy_ShouldRollBackAndRecreate(self):
        self.write_marker(new_image=NEW_IMG)
        docker = FakeDocker(running=NEW_IMG, healthy=(False, True))
        self.deployer(git=FakeGit(head=NEW), docker=docker).cycle()
        self.assertEqual(docker.ups, [True])
        self.assertEqual(docker.waits, [NEW_IMG, OLD_IMG])
        self.assertEqual(self.git.moves, [(OLD, False)])
        self.assertFalse(os.path.exists(self.marker_path()))

    def test_cycle_WhenSameCommitInterruptedTwice_ShouldHoldIt(self):
        self.write_marker()
        self.deployer(git=FakeGit(head=NEW)).cycle()
        self.assertIsNone(self.state.failed_sha(self.spec.name))
        self.write_marker()
        out = self.deployer(git=FakeGit(head=NEW)).cycle()
        self.assertTrue(out.failed)
        self.assertEqual(self.state.failed_sha(self.spec.name), NEW)

    def test_cycle_WhenInterruptedAndThenDeployedNormally_ShouldResetInterruptionCount(self):
        self.write_marker()
        self.deployer(git=FakeGit(head=NEW)).cycle()
        self.deployer().cycle()
        self.assertNotIn("interrupted", self.state.repo(self.spec.name))

    def test_cycle_WhenInterruptedAndDryRun_ShouldTouchNothingAndKeepMarker(self):
        self.write_marker()
        out = self.deployer(git=FakeGit(head=NEW), dry_run=True).cycle()
        self.assertFalse(out.deployed)
        self.assertEqual(self.git.moves, [])
        self.assertEqual(self.docker.tags, [])
        self.assertTrue(os.path.exists(self.marker_path()))

    def test_cycle_WhenInterruptedAndPaused_ShouldWait(self):
        self.write_marker()
        open(os.path.join(self.tmp, f"PAUSED.{self.spec.name}"), "w").close()
        self.deployer(git=FakeGit(head=NEW)).cycle()
        self.assertEqual(self.git.moves, [])
        self.assertTrue(os.path.exists(self.marker_path()))

    # API budget ----------------------------------------------------------------
    def test_cycle_WhenPaused_ShouldNotCallGitHub(self):
        open(os.path.join(self.tmp, f"PAUSED.{self.spec.name}"), "w").close()
        out = self.deployer().cycle()
        self.assertEqual(out.decision.reason, "paused")
        self.assertEqual(self.github.calls, 0)

    def test_cycle_WhenRateLimited_ShouldSkipQuietly(self):
        out = self.deployer(github=FakeGitHub(error=RateLimited("x"))).cycle()
        self.assertFalse(out.deployed)
        self.assertEqual(self.git.fetched, 0)

    def test_cycle_WhenBranchTipAlreadyGreenAndUnchanged_ShouldNotCallApiAgain(self):
        self.deployer(git=FakeGit(head=NEW, order=(NEW, OLD))).cycle()
        github = self.github
        self.deployer(git=FakeGit(head=NEW, order=(NEW, OLD)), github=github).cycle()
        self.assertEqual(github.calls, 1)

    def test_cycle_WhenBranchTipMoves_ShouldCallApiAgain(self):
        self.deployer(git=FakeGit(head=NEW)).cycle()
        github = self.github
        self.deployer(git=FakeGit(head=NEW, tip="9" * 40), github=github).cycle()
        self.assertEqual(github.calls, 2)

    def test_cycle_WhenProdAlreadyAtGreen_ShouldReportUpToDate(self):
        out = self.deployer(git=FakeGit(head=NEW, order=(NEW, OLD))).cycle()
        self.assertEqual(out.decision.reason, "up to date")
        self.assertEqual(self.git.moves, [])


if __name__ == "__main__":
    unittest.main()
