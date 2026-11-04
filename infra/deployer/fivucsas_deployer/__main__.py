"""Entry point: ``python3 -m fivucsas_deployer [--once] [--dry-run] [--clear-failure REPO]``."""

from __future__ import annotations

import argparse
import dataclasses
import logging
import signal
import sys
import threading

from .config import REPOS, Settings
from .deploy import RepoDeployer
from .github import GitHubClient
from .shell import Runner
from .state import StateStore

log = logging.getLogger("deployer")


def _parse(argv):
    p = argparse.ArgumentParser(prog="fivucsas_deployer", description=__doc__)
    p.add_argument("--once", action="store_true", help="run one cycle and exit")
    p.add_argument("--dry-run", action="store_true",
                   help="decide and log only: no fetch, tag, build or restart")
    p.add_argument("--clear-failure", metavar="REPO", choices=sorted(REPOS),
                   help="forget the failed SHA of REPO so the same commit is retried, then exit")
    return p.parse_args(argv)


def run_cycle(settings: Settings, state: StateStore, runner: Runner, github: GitHubClient,
              stop: threading.Event) -> None:
    for name in settings.repos:
        if stop.is_set():
            return
        try:
            RepoDeployer(REPOS[name], settings, runner, github, state, stop=stop).cycle()
        except Exception:  # one repo must never take the loop down; log it loudly
            log.exception("[%s] cycle crashed", name)
        finally:
            state.save()


def main(argv=None) -> int:
    logging.basicConfig(stream=sys.stdout, level=logging.INFO,
                        format="%(asctime)s %(levelname)s %(message)s")
    args = _parse(sys.argv[1:] if argv is None else argv)
    settings = Settings.from_env()
    if args.dry_run:
        settings = dataclasses.replace(settings, dry_run=True)
    state = StateStore(settings.state_dir)

    if args.clear_failure:
        removed = state.clear_failed(args.clear_failure)
        log.info("[%s] cleared failed sha %s", args.clear_failure, removed or "(none)")
        return 0

    stop = threading.Event()

    def _term(signum, _frame):
        log.info("signal %s: stopping after the current repository", signum)
        stop.set()

    signal.signal(signal.SIGTERM, _term)
    signal.signal(signal.SIGINT, _term)

    log.info("pull deployer starting: repos=%s interval=%ss dry_run=%s no_cache=%s state=%s",
             ",".join(settings.repos), settings.interval_s, settings.dry_run,
             settings.build_no_cache, settings.state_dir)
    runner = Runner()
    github = GitHubClient(settings.api_base, settings.owner)
    while not stop.is_set():
        run_cycle(settings, state, runner, github, stop)
        if args.once:
            break
        stop.wait(settings.interval_s)
    log.info("pull deployer stopped")
    return 0


if __name__ == "__main__":
    sys.exit(main())
