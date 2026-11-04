import os
import re
import unittest

from fivucsas_deployer.config import REPOS
from fivucsas_deployer.docker_ops import NODE_BUILD_TIMEOUT_S, Docker, max_deploy_seconds
from fivucsas_deployer.shell import CommandFailed, Result

COMPOSE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                       "docker-compose.yml")


def _seconds(value):
    total = 0
    for amount, unit in re.findall(r"(\d+)([hms])", value):
        total += int(amount) * {"h": 3600, "m": 60, "s": 1}[unit]
    return total


class ScriptedRunner:
    def __init__(self, fail_on=()):
        self.fail_on = fail_on
        self.calls = []

    def run(self, cmd, cwd=None, timeout=600):
        self.calls.append((list(cmd), timeout))
        if any(word in cmd for word in self.fail_on):
            return Result(124, "[timed out]")
        return Result(0, "")

    def check(self, cmd, cwd=None, timeout=600):
        res = self.run(cmd, cwd, timeout)
        if not res.ok:
            raise CommandFailed(cmd, res)
        return res


@unittest.skipUnless(os.path.exists(COMPOSE), "docker-compose.yml not next to the tests")
class ComposeContractTest(unittest.TestCase):
    def setUp(self):
        with open(COMPOSE, encoding="utf-8") as fh:
            self.compose = fh.read()

    def test_stopGracePeriod_WhenComparedToWorstCaseDeploy_ShouldCoverEveryRepo(self):
        grace = _seconds(re.search(r"stop_grace_period:\s*(\S+)", self.compose).group(1))
        for name, spec in REPOS.items():
            with self.subTest(repo=name):
                self.assertGreaterEqual(grace, max_deploy_seconds(spec))

    def test_compose_WhenDeployerStarts_ShouldRunAnInitProcess(self):
        self.assertRegex(self.compose, r"\n\s+init:\s*true")

    def test_compose_WhenCheckoutsAreSubmodules_ShouldMountTheirGitDirsAtTheSamePath(self):
        for name in REPOS:
            path = f"/opt/projects/fivucsas/.git/modules/{name}"
            with self.subTest(repo=name):
                self.assertIn(f"- {path}:{path}\n", self.compose)
                self.assertNotIn(f"{path}:{path}:ro", self.compose)


class NodeBuildTest(unittest.TestCase):
    def test_build_WhenNodeBuildTimesOut_ShouldRemoveItsContainerAndNotRunComposeBuild(self):
        spec = REPOS["web-app"]
        runner = ScriptedRunner(fail_on=("npm ci --no-audit --no-fund && npm run build",))
        docker = Docker(runner, spec, "node:x", no_cache=True)
        with self.assertRaises(CommandFailed):
            docker.build()
        cmds = [c for c, _ in runner.calls]
        rm = ["docker", "rm", "-f", docker.node_build_container]
        self.assertEqual(cmds[0], rm)    # leftover from an earlier kill
        self.assertEqual(cmds[-1], rm)   # the one this timeout left behind
        run = cmds[1]
        self.assertIn("--name", run)
        self.assertEqual(runner.calls[1][1], NODE_BUILD_TIMEOUT_S)
        self.assertFalse(any("compose" in c for c in cmds))


if __name__ == "__main__":
    unittest.main()
