"""Exercises the real git binary against throwaway local repositories."""

import os
import shutil
import subprocess
import tempfile
import unittest

from fivucsas_deployer.decision import Relation
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
        self.git = Git(Runner(), self.prod)

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


if __name__ == "__main__":
    unittest.main()
