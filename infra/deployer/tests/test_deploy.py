"""Orchestration tests with in-memory fakes for git, docker and GitHub."""

import os
import shutil
import tempfile
import unittest

from fivucsas_deployer.config import REPOS, Settings
from fivucsas_deployer.decision import Relation
from fivucsas_deployer.deploy import RepoDeployer
from fivucsas_deployer.github import RateLimited
from fivucsas_deployer.shell import CommandFailed, Result
from fivucsas_deployer.state import StateStore

OLD, NEW = "1" * 40, "2" * 40


def failed(cmd="x"):
    return CommandFailed([cmd], Result(1, "boom"))


class FakeGitHub:
    def __init__(self, target=NEW, error=None, compare="ahead"):
        self.target, self.error, self.compare = target, error, compare
        self.calls = 0

    def successful_push_runs(self, repo, workflow, branch, cache):
        self.calls += 1
        if self.error:
            raise self.error
        runs = [] if self.target is None else [{
            "head_sha": self.target, "head_branch": "main", "event": "push",
            "status": "completed", "conclusion": "success", "created_at": "t",
            "head_commit": {"timestamp": "t"}}]
        return runs, False

    def compare_status(self, repo, base, head):
        return self.compare


class FakeGit:
    def __init__(self, head=OLD, relation=Relation.BEHIND, move_fails_for=(), tip=NEW):
        self._head, self._relation, self.tip = head, relation, tip
        self.move_fails_for = set(move_fails_for)
        self.fetched = 0
        self.moves = []

    def head(self):
        return self._head

    def branch(self):
        return "main"

    def relation(self, prod, target):
        return self._relation

    def fetch(self, branch):
        self.fetched += 1

    def remote_tip(self, branch):
        return self.tip

    def on_remote_branch(self, sha, branch):
        return True

    def move_to(self, sha, ff_only):
        self.moves.append((sha, ff_only))
        if sha in self.move_fails_for:
            raise failed("git")
        self._head = sha

    def short_log(self, old, new, limit=20):
        return "2222222 change"


class FakeDocker:
    def __init__(self, build_ok=True, healthy=(True,), running="sha256:old"):
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
        return "sha256:new"

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

    def deployer(self, git=None, docker=None, github=None, dry_run=False):
        settings = Settings.from_env({"DEPLOYER_DRY_RUN": "true" if dry_run else "false"})
        self.git = git or FakeGit()
        self.docker = docker or FakeDocker()
        self.github = github or FakeGitHub()
        return RepoDeployer(self.spec, settings, None, self.github, self.state,
                            git=self.git, docker=self.docker)

    def test_cycle_WhenBehindAndHealthy_ShouldTagBuildUpAndRecordSuccess(self):
        out = self.deployer().cycle()
        self.assertTrue(out.deployed)
        self.assertEqual(self.docker.tags, [("sha256:old", f"rollback-{OLD[:12]}")])
        self.assertEqual(self.git.moves, [(NEW, True)])
        self.assertEqual(self.docker.built, 1)
        self.assertEqual(self.docker.ups, [False])
        self.assertEqual(self.docker.waits, ["sha256:new"])
        self.assertIsNone(self.state.failed_sha(self.spec.name))
        self.assertEqual(self.state.repo(self.spec.name)["last_deployed"]["sha"], NEW)

    def test_cycle_WhenHealthCheckFails_ShouldRollBackImageAndGitAndHoldRepo(self):
        out = self.deployer(docker=FakeDocker(healthy=(False, True))).cycle()
        self.assertTrue(out.failed)
        rollback = f"{self.spec.image}:rollback-{OLD[:12]}"
        self.assertIn((rollback, "latest"), self.docker.tags)
        self.assertEqual(self.git.moves, [(NEW, True), (OLD, False)])
        self.assertEqual(self.docker.ups, [False, True])
        self.assertEqual(self.docker.waits, ["sha256:new", "sha256:old"])
        self.assertEqual(self.state.failed_sha(self.spec.name), NEW)

        # Same green commit next cycle: held, nothing touched.
        again = self.deployer(git=FakeGit(head=OLD)).cycle()
        self.assertFalse(again.deployed)
        self.assertEqual(self.docker.built, 0)

    def test_cycle_WhenNewerGreenCommitAfterFailure_ShouldTryAgain(self):
        self.state.set_failed(self.spec.name, NEW)
        newer = "3" * 40
        out = self.deployer(github=FakeGitHub(target=newer)).cycle()
        self.assertTrue(out.deployed)
        self.assertIsNone(self.state.failed_sha(self.spec.name))

    def test_cycle_WhenBuildFails_ShouldRestoreGitWithoutTouchingContainer(self):
        out = self.deployer(docker=FakeDocker(build_ok=False)).cycle()
        self.assertTrue(out.failed)
        self.assertEqual(self.git.moves, [(NEW, True), (OLD, False)])
        self.assertEqual(self.docker.ups, [])
        self.assertEqual(self.state.failed_sha(self.spec.name), NEW)

    def test_cycle_WhenOverridesConflict_ShouldNotBuildAndHoldRepo(self):
        out = self.deployer(git=FakeGit(move_fails_for={NEW})).cycle()
        self.assertTrue(out.failed)
        self.assertEqual(self.docker.built, 0)
        self.assertEqual(self.state.failed_sha(self.spec.name), NEW)

    def test_cycle_WhenNoRunningContainer_ShouldRefuseWithoutMarkingFailure(self):
        out = self.deployer(docker=FakeDocker(running=None)).cycle()
        self.assertFalse(out.deployed)
        self.assertEqual(self.git.moves, [])
        self.assertIsNone(self.state.failed_sha(self.spec.name))

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
        self.deployer(git=FakeGit(head=NEW)).cycle()
        github = self.github
        self.deployer(git=FakeGit(head=NEW), github=github).cycle()
        self.assertEqual(github.calls, 1)

    def test_cycle_WhenBranchTipMoves_ShouldCallApiAgain(self):
        self.deployer(git=FakeGit(head=NEW)).cycle()
        github = self.github
        self.deployer(git=FakeGit(head=NEW, tip="9" * 40), github=github).cycle()
        self.assertEqual(github.calls, 2)

    def test_cycle_WhenProdAlreadyAtGreen_ShouldNotFetch(self):
        out = self.deployer(git=FakeGit(head=NEW)).cycle()
        self.assertEqual(out.decision.reason, "up to date")
        self.assertEqual(self.git.fetched, 0)


if __name__ == "__main__":
    unittest.main()
