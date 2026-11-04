# Pull deployer

Production deploys for `identity-core-api`, `biometric-processor` and `web-app` on
mordecai. A small container on the production host polls GitHub, and when a newer
commit on `main` has a green CI run it fast-forwards the prod checkout, rebuilds,
restarts and health-checks the service, rolling back on failure.

Why pull: the repositories are public, so a self-hosted Actions runner on the prod
host would let a fork pull request run code there, and pushing over SSH needs a
private key stored in GitHub. The deployer needs neither: no inbound port, no GitHub
secret, no runner. It reads the public GitHub API without a token.

## How it decides

Every 5 minutes, for each repository in turn:

1. `git ls-remote origin main` (git protocol, no API budget) reads the branch tip.
2. The GitHub API (`GET /repos/Rollingcat-Software/<repo>/actions/workflows/ci.yml/runs?branch=main&event=push&status=success`)
   is asked for successful CI push runs, but only when the tip moved since the last
   query. While the tip is not green yet (CI still running, or its CI was skipped by
   the workflow's path filter) the API is re-asked with backoff: 5, 10, 20, 40, then
   every 60 minutes. A repository whose tip is already green costs no API calls.
3. The target is the run whose head commit is newest (by commit time, so a re-run of
   an old commit never wins).
4. After `git fetch origin main` the deployer deploys only if the prod `HEAD` is a
   strict ancestor of the target (fast-forwardable), the target is still on
   `origin/main`, the checkout is on `main`, and the target is not the commit that
   failed last time. Everything else is logged and skipped: up to date, prod ahead,
   diverged, paused, no green run.

The rules live in `fivucsas_deployer/decision.py` as pure functions with unit tests.

Commits that do not trigger CI (docs-only changes filtered out by `ci.yml` paths) are
not deployed on their own; they go out with the next green commit after them.

## What a deploy does

1. Tag the image the container is running as `<image>:rollback-<old sha, 12 chars>`.
2. `git stash` tracked local changes if there are any, `git merge --ff-only <target>`,
   `git stash pop`. If the local changes no longer apply, the checkout is put back
   exactly as it was and the deploy fails before anything is built.
3. Build: `docker compose -f docker-compose.prod.yml --env-file .env.prod build --no-cache`.
   For `web-app` (no `.env.prod`; Vite reads the checkout's `.env.production`) first
   `npm ci && npm run build` in a throwaway `node:22.21.1-bookworm-slim` container
   running as the deployer's uid:gid.
4. `docker compose ... up -d --no-build`.
5. Health check:
   * `identity-core-api`: container runs the new image and its Docker health is `healthy`
     (timeout 7 min).
   * `biometric-processor`: same, plus `curl http://localhost:8001/api/v1/health` inside
     `biometric-api` (timeout 10 min).
   * `web-app`: `https://app.fivucsas.com/` answers 200 through Traefik via
     `--resolve app.fivucsas.com:443:127.0.0.1`, retried every 5 s (timeout 2 min).
6. On a failed build the checkout goes back to the old SHA and the running container
   is untouched. On a failed `up` or health check the rollback tag is moved back to
   `:latest`, the checkout is reset to the old SHA (local changes kept), the service is
   recreated and its health is checked again. Either way the target SHA is written to
   `/state/FAILED.<repo>` and that repository is held until a newer green commit
   appears.
7. On success the three newest `rollback-*` tags per image are kept, older ones untagged.

Database migrations need nothing special: `identity-core-api` applies its Flyway
migrations on start, so a migration failure shows up as a failed health check.

Everything is logged to stdout: `docker logs -f fivucsas-deployer`.

## Install (on mordecai, as `developer`)

Prerequisites, once:

* `identity-core-api`: its two former local overrides must be in `.env.prod` and the
  checkout's `docker-compose.prod.yml` must be clean (see the identity-core-api PR that
  made them env-driven). Otherwise the stash pop conflicts on the first deploy and the
  repository is held.
* The GitHub `Deploy to Hetzner` workflows are removed from the three repositories,
  so nothing else deploys.

The compose project name is fixed (`fivucsas-deployer`), so it can be run from any
copy of this directory, for example the FIVUCSAS checkout after it includes this
change, or a fresh clone:

```bash
git clone --depth 1 https://github.com/Rollingcat-Software/FIVUCSAS.git ~/fivucsas-deployer-src
cd ~/fivucsas-deployer-src/infra/deployer
docker compose build
docker compose run --rm deployer --dry-run --once   # decisions only, touches nothing
docker compose up -d
docker logs -f fivucsas-deployer
```

Upgrade: pull the new source, then `docker compose up -d --build`. The state volume
survives.

## Uninstall

```bash
cd <this directory>
docker compose down                       # stop and remove the container, keep state
docker compose down -v --rmi all          # also drop the state volume and the image
```

## Operate

| Need | Command |
|---|---|
| Pause everything | `docker exec fivucsas-deployer touch /state/PAUSED` |
| Pause one repo | `docker exec fivucsas-deployer touch /state/PAUSED.web-app` |
| Resume | `docker exec fivucsas-deployer rm /state/PAUSED` (or `PAUSED.<repo>`) |
| Retry a commit that failed | `docker exec fivucsas-deployer rm /state/FAILED.<repo>` |
| See what it would do | `docker compose run --rm deployer --dry-run --once` |
| Stop | `docker compose stop` (waits up to 30 min for an in-flight deploy to finish or roll back) |

A pause or stop takes effect between repositories, never in the middle of a deploy.

Manual rollback, if ever needed:
`docker tag <image>:rollback-<sha> <image>:latest`, reset the checkout to `<sha>`, then
`docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --no-build --force-recreate`
(as uid 1001, for example from a `docker:27.5.1-cli` helper container).

Images: `identity-core-api-identity-core-api`, `biometric-processor-biometric-api`,
`fivucsas-app`.

## Settings

Environment variables in `docker-compose.yml` (all optional):

| Variable | Default | Meaning |
|---|---|---|
| `DEPLOYER_INTERVAL_SECONDS` | `300` | cycle length, minimum 60 |
| `DEPLOYER_DRY_RUN` | `false` | decide and log only |
| `DEPLOYER_REPOS` | all three | comma-separated subset |
| `DEPLOYER_BUILD_NO_CACHE` | `true` | `build --no-cache`, as the manual deploys did |
| `DEPLOYER_KEEP_ROLLBACK_TAGS` | `3` | rollback tags kept per image |
| `DEPLOYER_UID` / `DEPLOYER_GID` | `1001` / `983` | owner of the checkouts / docker socket group |

## Security notes

* The container mounts the Docker socket, which is root-equivalent on the host. It
  has no other privilege: read-only root filesystem, all capabilities dropped,
  `no-new-privileges`, and it only mounts the three checkouts and its state volume.
* It runs only code that already passed CI on `main`; pull requests, forks and other
  branches are never considered.
* No token is used. The unauthenticated API limit is 60 calls per hour per IP and a
  `304` still counts without a token, which is why the API is gated by `ls-remote`.

## Known gaps

* The prod compose files interpolate secrets through `--env-file .env.prod`, which
  `engineering-principles.md` section 7 discourages in favour of an absolute
  `env_file:`. The deployer follows today's prod convention; moving the services to
  `env_file:` is a separate change per repository.

## Tests

```bash
cd infra/deployer
python3 -m unittest discover -s tests -t .
```

The git tests use the real `git` binary on throwaway repositories; the rest use fakes.
CI runs them in `.github/workflows/deployer-tests.yml`.
