"""Docker and docker compose operations for one repository."""

from __future__ import annotations

import os
import time
from typing import Callable, List, Optional, Tuple

from .config import HealthKind, RepoSpec
from .decision import rollback_tags_to_prune
from .shell import Result, Runner

BUILD_TIMEOUT_S = 3600


class Docker:
    def __init__(self, runner: Runner, spec: RepoSpec, node_image: str, no_cache: bool,
                 sleep: Callable[[float], None] = time.sleep,
                 clock: Callable[[], float] = time.monotonic):
        self.runner = runner
        self.spec = spec
        self.node_image = node_image
        self.no_cache = no_cache
        self._sleep = sleep
        self._clock = clock

    # compose -----------------------------------------------------------------
    def _compose(self) -> List[str]:
        cmd = ["docker", "compose", "-f", self.spec.compose_file]
        if self.spec.env_file:
            cmd += ["--env-file", self.spec.env_file]
        return cmd

    def build(self) -> Result:
        if self.spec.node_build:
            self._node_build()
        cmd = self._compose() + ["build"]
        if self.no_cache:
            cmd.append("--no-cache")
        return self.runner.check(cmd, cwd=self.spec.checkout, timeout=BUILD_TIMEOUT_S)

    def _node_build(self) -> None:
        """Vite build in a throwaway node container as the deployer's own uid:gid."""
        user = f"{os.getuid()}:{os.getgid()}" if hasattr(os, "getuid") else "1001:983"
        path = self.spec.checkout
        self.runner.check(
            ["docker", "run", "--rm", "--user", user,
             "-e", "HOME=/tmp", "-e", "npm_config_cache=/tmp/.npm", "-e", "CI=true",
             "-v", f"{path}:{path}", "-w", path, self.node_image,
             "sh", "-c", "npm ci --no-audit --no-fund && npm run build"],
            timeout=BUILD_TIMEOUT_S,
        )

    def up(self, force_recreate: bool = False) -> Result:
        cmd = self._compose() + ["up", "-d", "--no-build"]
        if force_recreate:
            cmd.append("--force-recreate")
        return self.runner.check(cmd, cwd=self.spec.checkout, timeout=600)

    # images ------------------------------------------------------------------
    def env_file_present(self) -> bool:
        return not self.spec.env_file or os.path.exists(
            os.path.join(self.spec.checkout, self.spec.env_file))

    def running_image_id(self) -> Optional[str]:
        res = self.runner.run(["docker", "inspect", "-f", "{{.Image}}", self.spec.container])
        return res.out.strip() if res.ok and res.out.strip() else None

    def image_id(self, ref: str) -> Optional[str]:
        res = self.runner.run(["docker", "image", "inspect", "-f", "{{.Id}}", ref])
        return res.out.strip() if res.ok and res.out.strip() else None

    def tag(self, source: str, tag: str) -> None:
        self.runner.check(["docker", "tag", source, f"{self.spec.image}:{tag}"])

    def prune_rollback_tags(self, keep: int) -> List[str]:
        res = self.runner.run(["docker", "image", "ls", self.spec.image,
                               "--format", "{{.CreatedAt}}\t{{.Tag}}"])
        if not res.ok:
            return []
        rows = sorted((line.split("\t", 1) for line in res.out.splitlines() if "\t" in line),
                      key=lambda r: r[0], reverse=True)
        doomed = rollback_tags_to_prune([tag for _, tag in rows], keep)
        for tag in doomed:
            self.runner.run(["docker", "image", "rm", f"{self.spec.image}:{tag}"])
        return doomed

    # health ------------------------------------------------------------------
    def _container_state(self) -> Tuple[str, str, str]:
        res = self.runner.run(["docker", "inspect", "-f",
                               "{{.Image}}|{{.State.Status}}|"
                               "{{if .State.Health}}{{.State.Health.Status}}{{end}}",
                               self.spec.container])
        if not res.ok:
            return "", "missing", ""
        parts = (res.out.strip().split("|") + ["", "", ""])[:3]
        return parts[0], parts[1], parts[2]

    def wait_healthy(self, expected_image: str) -> Tuple[bool, str]:
        """Poll until the container runs ``expected_image`` and passes its health check."""
        deadline = self._clock() + self.spec.health_timeout_s
        last = "not checked"
        while True:
            ok, last, fatal = self._probe(expected_image)
            if ok:
                return True, last
            if fatal or self._clock() >= deadline:
                return False, last
            self._sleep(5)

    def _probe(self, expected_image: str) -> Tuple[bool, str, bool]:
        image, status, health = self._container_state()
        if status in ("exited", "dead"):
            return False, f"container {status}", True
        if image != expected_image:
            return False, f"container runs {image[:19] or 'nothing'}, expected {expected_image[:19]}", False
        if status != "running":
            return False, f"container {status}", False
        kind = self.spec.health
        if kind in (HealthKind.CONTAINER_HEALTHY, HealthKind.CONTAINER_HEALTHY_AND_EXEC):
            if health == "unhealthy":
                return False, "container unhealthy", True
            if health != "healthy":
                return False, f"container health '{health or 'none'}'", False
            if kind is HealthKind.CONTAINER_HEALTHY_AND_EXEC:
                res = self.runner.run(["docker", "exec", self.spec.container, *self.spec.exec_probe],
                                      timeout=30)
                if not res.ok:
                    return False, "in-container health probe failed", False
            return True, "healthy", False
        # HTTPS through Traefik on this host (the deployer runs with host networking).
        host = self.spec.https_host
        res = self.runner.run(["curl", "-sk", "-o", "/dev/null", "-w", "%{http_code}",
                               "--max-time", "10", "--resolve", f"{host}:443:127.0.0.1",
                               f"https://{host}/"], timeout=30)
        code = res.out.strip()
        if code == "200":
            return True, "HTTP 200", False
        return False, f"HTTP {code or 'no answer'}", False

