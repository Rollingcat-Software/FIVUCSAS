"""Exercises the real git binary against throwaway local repositories."""

import os
import shutil
import subprocess
import tempfile
import unittest

from fivucsas_deployer.decision import Relation, newest_in_order
from fivucsas_deployer.gitops import Git
from fivucsas_deployer.shell import CommandFailed, Runner


def sh(cwd, *args):
    env = dict(os.environ, GIT_AUTHOR_NAME="t", GIT_AUTHOR_EMAIL="t@t", GIT_COMMITTER_NAME="t",
               GIT_COMMITTER_EMAIL="t@t", GIT_CONFIG_GLOBAL=os.devnull, GIT_CONFIG_NOSYSTEM="1")
    return subprocess.run(["git", *args], cwd=cwd, env=env, check=True, text=True,
                          stdout=subprocess.PIPE, stderr=subprocess.STDOUT).stdout.strip()


@unittest.skipIf(shutil.which("git") is None, "git not installed")
class GitTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.origin = os.path.join(self.tmp, "origin")
        os.makedirs(self.origin)
        sh(self.origin, "init", "-q", "-b", "main")
        self._commit("compose.yml", "FLAG: \"true\"\nOTHER: 1\n", "c1")
        self.c1 = sh(self.origin, "rev-parse", "HEAD")
        self.prod = os.path.join(self.tmp, "prod")
        sh(self.tmp, "clone", "-q", self.origin, self.prod)
        self.git = Git(Runner(), self.prod, self.origin)

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def _commit(self, name, content, msg):
        with open(os.path.join(self.origin, name), "w", newline="\n") as fh:
            fh.write(content)
        sh(self.origin, "add", name)
        sh(self.origin, "commit", "-q", "-m", msg)
        return sh(self.origin, "rev-parse", "HEAD")

    def _read(self, name):
        with open(os.path.join(self.prod, name)) as fh:
            return fh.read()

    def test_relation_WhenOriginMovedAndFetched_ShouldReportBehindThenSame(self):
        c2 = self._commit("app.txt", "v2\n", "c2")
        self.assertIs(self.git.relation(self.c1, c2), Relation.UNKNOWN)  # object not fetched yet
        self.git.fetch("main")
        self.assertIs(self.git.relation(self.c1, c2), Relation.BEHIND)
        self.assertIs(self.git.relation(c2, self.c1), Relation.AHEAD)
        self.assertTrue(self.git.on_remote_branch(c2, "main"))
        self.assertEqual(self.git.branch(), "main")

    def test_moveTo_WhenLocalOverrideStillApplies_ShouldFastForwardAndKeepOverride(self):
        c2 = self._commit("app.txt", "v2\n", "c2")
        with open(os.path.join(self.prod, "compose.yml"), "w", newline="\n") as fh:
            fh.write("FLAG: \"false\"\nOTHER: 1\n")
        self.git.fetch("main")
        self.git.move_to(c2, ff_only=True)
        self.assertEqual(self.git.head(), c2)
        self.assertIn('FLAG: "false"', self._read("compose.yml"))
        self.assertEqual(len(self.git.tracked_changes()), 1)

    def test_moveTo_WhenOverrideConflicts_ShouldRestoreOriginalCheckoutAndRaise(self):
        c2 = self._commit("compose.yml", "FLAG: ${FLAG:-true}\nOTHER: 1\n", "c2")
        with open(os.path.join(self.prod, "compose.yml"), "w", newline="\n") as fh:
            fh.write("FLAG: \"false\"\nOTHER: 1\n")
        self.git.fetch("main")
        with self.assertRaises(CommandFailed):
            self.git.move_to(c2, ff_only=True)
        self.assertEqual(self.git.head(), self.c1)
        self.assertIn('FLAG: "false"', self._read("compose.yml"))

    def test_moveTo_WhenRollingBack_ShouldResetToOldShaKeepingOverride(self):
        c2 = self._commit("app.txt", "v2\n", "c2")
        self.git.fetch("main")
        self.git.move_to(c2, ff_only=True)
        with open(os.path.join(self.prod, "compose.yml"), "w", newline="\n") as fh:
            fh.write("FLAG: \"false\"\nOTHER: 1\n")
        self.git.move_to(self.c1, ff_only=False)
        self.assertEqual(self.git.head(), self.c1)
        self.assertIn('FLAG: "false"', self._read("compose.yml"))

    def test_moveTo_WhenCleanCheckout_ShouldNotCreateStash(self):
        c2 = self._commit("app.txt", "v2\n", "c2")
        self.git.fetch("main")
        self.git.move_to(c2, ff_only=True)
        self.assertEqual(sh(self.prod, "stash", "list"), "")

    def _override_compose(self):
        with open(os.path.join(self.prod, "compose.yml"), "w", newline="\n") as fh:
            fh.write("FLAG: \"false\"\nOTHER: 1\n")

    def test_fetchAndRemoteTip_WhenOriginRemotePointsElsewhere_ShouldUseCanonicalUrl(self):
        c2 = self._commit("app.txt", "v2\n", "c2")
        evil = os.path.join(self.tmp, "evil")
        sh(self.tmp, "clone", "-q", self.origin, evil)
        with open(os.path.join(evil, "app.txt"), "w", newline="\n") as fh:
            fh.write("evil\n")
        sh(evil, "add", "app.txt")
        sh(evil, "commit", "-q", "-m", "evil")
        sh(self.prod, "remote", "set-url", "origin", evil)
        self.assertEqual(self.git.remote_tip("main"), c2)
        self.git.fetch("main")
        self.assertEqual(sh(self.prod, "rev-parse", "refs/remotes/origin/main"), c2)
        self.assertTrue(self.git.on_remote_branch(c2, "main"))

    def test_fetch_WhenCanonicalBranchWasForcePushed_ShouldOverwriteTrackingRef(self):
        c2 = self._commit("app.txt", "v2\n", "c2")
        self.git.fetch("main")
        sh(self.origin, "reset", "-q", "--hard", self.c1)
        c2b = self._commit("app.txt", "v2b\n", "c2b")
        self.git.fetch("main")
        self.assertEqual(sh(self.prod, "rev-parse", "refs/remotes/origin/main"), c2b)
        self.assertFalse(self.git.on_remote_branch(c2, "main"))

    def test_revList_WhenGreenCommitsKnown_ShouldPickNewestByAncestry(self):
        c2 = self._commit("app.txt", "v2\n", "c2")
        c3 = self._commit("app.txt", "v3\n", "c3")
        self.git.fetch("main")
        order = self.git.rev_list(Git.tracking_ref("main"))
        self.assertEqual(order[:3], [c3, c2, self.c1])
        self.assertEqual(newest_in_order(order, [self.c1, c2]), c2)

    def test_recoverTo_WhenKilledBetweenStashPushAndPop_ShouldRestoreOldShaWithOverride(self):
        c2 = self._commit("app.txt", "v2\n", "c2")
        self.git.fetch("main")
        self._override_compose()
        # What move_to had done when the container was killed: stash pushed, merged, no pop.
        sh(self.prod, "stash", "push", "-q", "-m", f"deployer-overrides-{self.c1[:12]}")
        sh(self.prod, "merge", "--ff-only", "-q", c2)
        self.git.recover_to(self.c1)
        self.assertEqual(self.git.head(), self.c1)
        self.assertIn('FLAG: "false"', self._read("compose.yml"))
        self.assertEqual(sh(self.prod, "stash", "list"), "")

    def test_recoverTo_WhenMovedForwardWithOverride_ShouldResetKeepingOverride(self):
        c2 = self._commit("app.txt", "v2\n", "c2")
        self.git.fetch("main")
        self._override_compose()
        self.git.move_to(c2, ff_only=True)
        self.git.recover_to(self.c1)
        self.assertEqual(self.git.head(), self.c1)
        self.assertIn('FLAG: "false"', self._read("compose.yml"))

    def test_recoverTo_WhenAlreadyOnSha_ShouldLeaveCheckoutAlone(self):
        self._override_compose()
        self.git.recover_to(self.c1)
        self.assertEqual(self.git.head(), self.c1)
        self.assertIn('FLAG: "false"', self._read("compose.yml"))

    def test_commands_WhenArgumentIsNotASha_ShouldRefuseBeforeRunningGit(self):
        for bad in ("--upload-pack=touch /tmp/x", "HEAD", "a" * 39):
            with self.subTest(bad=bad):
                with self.assertRaises(ValueError):
                    self.git.move_to(bad, ff_only=True)
                self.assertFalse(self.git.has_commit(bad))
        self.assertEqual(self.git.head(), self.c1)

    def test_shortLog_WhenRangeGiven_ShouldListCommits(self):
        c2 = self._commit("app.txt", "v2\n", "c2")
        self.git.fetch("main")
        self.assertIn("c2", self.git.short_log(self.c1, c2))


if __name__ == "__main__":
    unittest.main()
