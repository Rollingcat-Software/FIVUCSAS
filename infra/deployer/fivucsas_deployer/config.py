"""Static description of the deployable repositories and runtime settings."""

from __future__ import annotations

import os
from dataclasses import dataclass
from enum import Enum
from typing import Mapping, Optional, Tuple

# Overridable only to dry-run against scratch clones; production uses the default.
PROJECTS_ROOT = os.environ.get("DEPLOYER_PROJECTS_ROOT", "/opt/projects/fivucsas")
GITHUB_OWNER = "Rollingcat-Software"


class HealthKind(Enum):
    CONTAINER_HEALTHY = "container-healthy"          # docker health status must become 'healthy'
    CONTAINER_HEALTHY_AND_EXEC = "healthy+exec"      # plus a probe command inside the container
    HTTPS_VIA_TRAEFIK = "https"                      # 200 from Traefik on 127.0.0.1:443


@dataclass(frozen=True)
class RepoSpec:
    name: str
    checkout: str
    ci_workflow: str
    image: str            # repository of the image compose builds (tag :latest)
    container: str
    health: HealthKind
    env_file: Optional[str] = ".env.prod"
    branch: str = "main"
    compose_file: str = "docker-compose.prod.yml"
    exec_probe: Tuple[str, ...] = ()
    https_host: str = ""
    node_build: bool = False
    health_timeout_s: int = 420


REPOS: Mapping[str, RepoSpec] = {
    "identity-core-api": RepoSpec(
        name="identity-core-api",
        checkout=f"{PROJECTS_ROOT}/identity-core-api",
        ci_workflow="ci.yml",
        image="identity-core-api-identity-core-api",
        container="identity-core-api",
        health=HealthKind.CONTAINER_HEALTHY,
    ),
    "biometric-processor": RepoSpec(
        name="biometric-processor",
        checkout=f"{PROJECTS_ROOT}/biometric-processor",
        ci_workflow="ci.yml",
        image="biometric-processor-biometric-api",
        container="biometric-api",
        health=HealthKind.CONTAINER_HEALTHY_AND_EXEC,
        exec_probe=("curl", "-sf", "-o", "/dev/null", "http://localhost:8001/api/v1/health"),
        health_timeout_s=600,
    ),
    "web-app": RepoSpec(
        name="web-app",
        checkout=f"{PROJECTS_ROOT}/web-app",
        ci_workflow="ci.yml",
        image="fivucsas-app",
        container="fivucsas-app",
        health=HealthKind.HTTPS_VIA_TRAEFIK,
        env_file=None,  # static SPA: Vite reads the checkout's .env.production at build time
        https_host="app.fivucsas.com",
        node_build=True,
        health_timeout_s=120,
    ),
}


def _bool(value: Optional[str], default: bool) -> bool:
    if value is None or value.strip() == "":
        return default
    return value.strip().lower() in ("1", "true", "yes", "on")


@dataclass(frozen=True)
class Settings:
    dry_run: bool
    interval_s: int
    state_dir: str
    repos: Tuple[str, ...]
    build_no_cache: bool
    keep_rollback_tags: int
    node_image: str
    api_base: str = "https://api.github.com"
    owner: str = GITHUB_OWNER

    @staticmethod
    def from_env(env: Mapping[str, str] = os.environ) -> "Settings":
        repos = tuple(
            r.strip() for r in env.get("DEPLOYER_REPOS", ",".join(REPOS)).split(",") if r.strip()
        )
        unknown = [r for r in repos if r not in REPOS]
        if unknown:
            raise ValueError(f"DEPLOYER_REPOS names unknown repositories: {unknown}")
        interval = int(env.get("DEPLOYER_INTERVAL_SECONDS", "300"))
        if interval < 60:
            raise ValueError("DEPLOYER_INTERVAL_SECONDS must be at least 60 (GitHub API budget)")
        return Settings(
            dry_run=_bool(env.get("DEPLOYER_DRY_RUN"), False),
            interval_s=interval,
            state_dir=env.get("DEPLOYER_STATE_DIR", "/state"),
            repos=repos,
            build_no_cache=_bool(env.get("DEPLOYER_BUILD_NO_CACHE"), True),
            keep_rollback_tags=int(env.get("DEPLOYER_KEEP_ROLLBACK_TAGS", "3")),
            node_image=env.get("DEPLOYER_NODE_IMAGE", "node:22.21.1-bookworm-slim"),
        )
