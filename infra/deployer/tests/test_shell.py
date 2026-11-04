import os
import shutil
import sys
import time
import unittest

from fivucsas_deployer.shell import CommandFailed, Result, Runner, redact, tail


def _alive(pid):
    """True while ``pid`` runs; a zombie (killed, not yet reaped) counts as gone."""
    try:
        with open(f"/proc/{pid}/stat") as fh:
            return fh.read().rsplit(")", 1)[1].split()[0] not in ("Z", "X")
    except FileNotFoundError:
        return False


class RedactTest(unittest.TestCase):
    def test_redact_WhenUrlCarriesCredentials_ShouldMaskThem(self):
        out = redact("fatal: unable to access 'https://user:ghp_abc123@github.com/o/r.git/'")
        self.assertNotIn("ghp_abc123", out)
        self.assertNotIn("user:", out)
        self.assertIn("https://***@github.com/o/r.git/", out)

    def test_redact_WhenSecretAssignments_ShouldMaskValuesKeepNames(self):
        text = ("JWT_SECRET=s3cr3t DB_PASSWORD: 'p w' api_key=abc "
                "GITHUB_TOKEN=\"tok\" AWS_SECRET_ACCESS_KEY=xyz")
        out = redact(text)
        for secret in ("s3cr3t", "p w", "abc", "tok", "xyz"):
            self.assertNotIn(secret, out)
        for name in ("JWT_SECRET=***", "DB_PASSWORD: ***", "api_key=***", "GITHUB_TOKEN=***"):
            self.assertIn(name, out)

    def test_redact_WhenAuthorizationHeader_ShouldMaskIt(self):
        out = redact("Authorization: Bearer eyJhbGciOi.payload.sig")
        self.assertNotIn("eyJhbGciOi", out)

    def test_redact_WhenNothingSecret_ShouldLeaveTextUnchanged(self):
        text = "#12 [build 3/7] RUN mvn -q package\nStep done in 3.2s"
        self.assertEqual(redact(text), text)

    def test_tail_WhenLogging_ShouldRedact(self):
        self.assertEqual(tail("ok\nREDIS_PASSWORD=hunter2", 1), "REDIS_PASSWORD=***")

    def test_commandFailed_WhenCommandHasCredentialUrl_ShouldNotLeakItInMessage(self):
        exc = CommandFailed(["git", "fetch", "https://x:pw@h/r"], Result(1, ""))
        self.assertNotIn("pw@", str(exc))


@unittest.skipIf(sys.platform == "win32" or shutil.which("sh") is None, "POSIX only")
class RunnerTest(unittest.TestCase):
    def test_run_WhenCommandSucceeds_ShouldCaptureOutput(self):
        res = Runner().run(["sh", "-c", "echo out; echo err >&2"])
        self.assertTrue(res.ok)
        self.assertIn("out", res.out)
        self.assertIn("err", res.out)

    def test_run_WhenBinaryMissing_ShouldReturn127(self):
        self.assertEqual(Runner().run(["no-such-binary-xyz"]).code, 127)

    def test_run_WhenTimeout_ShouldKillTheWholeProcessGroup(self):
        # The background sleep stands in for a compose/buildx plugin child; it
        # ignores SIGINT (async child of a non-interactive shell), so it also
        # proves the SIGKILL escalation.
        started = time.monotonic()
        res = Runner(kill_grace_s=1).run(["sh", "-c", "sleep 60 & echo $!; wait"], timeout=1)
        self.assertEqual(res.code, 124)
        self.assertLess(time.monotonic() - started, 20)
        child = int(res.out.split()[0])
        deadline = time.monotonic() + 5
        while _alive(child) and time.monotonic() < deadline:
            time.sleep(0.1)
        self.assertFalse(_alive(child), "grandchild survived the timeout")

    def test_run_WhenCommandRuns_ShouldPutItInItsOwnProcessGroup(self):
        res = Runner().run([sys.executable, "-c", "import os; print(os.getpgid(0))"])
        self.assertNotEqual(int(res.out.strip()), os.getpgid(0))


if __name__ == "__main__":
    unittest.main()
