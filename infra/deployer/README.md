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

1. `git ls-remote https://github.com/Rollingcat-Software/<repo>.git main` (git protocol,
   no API budget) reads the branch tip. The canonical URL is built in, never read from
   the checkout's `origin`, so a changed remote cannot redirect what gets deployed.
2. The GitHub API (`GET /repos/Rollingcat-Software/<repo>/actions/workflows/ci.yml/runs?branch=main&event=push&status=success`)
   is asked for successful CI push runs, but only when the tip moved since the last
   query. While the tip is not green yet (CI still running, or its CI was skipped by
   the workflow's path filter) the API is re-asked with backoff: 5, 10, 20, 40, then
   every 60 minutes. A repository whose tip is already green costs no API calls.
   Only runs whose `head_repository` is `Rollingcat-Software/<repo>` itself and whose
   `head_sha` is a full 40-hex SHA count; a fork's branch named `main` is ignored.
3. `git fetch <canonical URL> +refs/heads/main:refs/remotes/origin/main`, then the
   target is the first green SHA in `git rev-list --topo-order refs/remotes/origin/main`:
   the newest green commit that is an ancestor of (or equal to) the tip, by git order.
   A re-run of an old commit, a run that finished late, or a green commit force-pushed
   off the branch never wins. Commit timestamps are not used. (A dry run never fetches;
   it uses local objects, or run creation time when the tip is not local.)
4. The deployer deploys only if the prod `HEAD` is a strict ancestor of the target
   (fast-forwardable), the target is on `refs/remotes/origin/main`, the checkout is on
   `main`, and the target is not the commit that failed last time. Everything else is
   logged and skipped: up to date, prod ahead, diverged, paused, no green run.

The rules live in `fivucsas_deployer/decision.py` as pure functions with unit tests.
Every SHA handed to git is validated as 40 lowercase hex and placed after
`--end-of-options` (and before `--` where git takes paths), so nothing from the API or
a state file can be read as a git option.

Commits that do not trigger CI (docs-only changes filtered out by `ci.yml` paths) are
not deployed on their own; they go out with the next green commit after them.

## What a deploy does

1. Tag the image the container is running as `<image>:rollback-<old sha, 12 chars>`.
   Write `/state/INFLIGHT.<repo>` (old SHA, new SHA, old image ID, rollback tag; fsync'd)
   before the checkout moves. See "Interrupted deploys" below.
2. `git stash` tracked local changes if there are any, `git merge --ff-only <target>`,
   `git stash pop`. If the local changes no longer apply, the checkout is put back
   exactly as it was and the deploy fails before anything is built.
3. Build: `docker compose -f docker-compose.prod.yml --env-file .env.prod build --no-cache`.
   For `web-app` (no `.env.prod`; Vite reads the checkout's `.env.production`) first
   `npm ci && npm run build` in a throwaway `node:22.21.1-bookworm-slim` container
   running as the deployer's uid:gid (named `fivucsas-deployer-node-build-web-app`, so a
   timed-out build container is removed rather than left running).
4. `docker compose ... up -d --no-build`.
5. Health check:
   * `identity-core-api`: container runs the new image and its Docker health is `healthy`
     (timeout 7 min).
   * `biometric-processor`: same, plus `curl http://localhost:8001/api/v1/health` inside
     `biometric-api` (timeout 10 min).
   * `web-app`: `https://app.fivucsas.com/` answers 200 through Traefik via
     `--resolve app.fivucsas.com:443:127.0.0.1`, retried every 5 s (timeout 2 min).
6. On a failed build the checkout goes back to the old SHA, `:latest` is pointed back at
   the running image, and the running container is untouched. On a failed `up` or health check the rollback tag is moved back to
   `:latest`, the checkout is reset to the old SHA (local changes kept), the service is
   recreated and its health is checked again. Either way the target SHA is written to
   `/state/FAILED.<repo>` and that repository is held until a newer green commit
   appears.
7. On success the three newest `rollback-*` tags per image are kept, older ones untagged,
   and the in-flight marker is removed.

### Timeouts

Every command has a timeout and runs in its own process group. On a timeout the whole
group gets SIGINT (the docker CLI then cancels its BuildKit session, so the daemon
stops the build instead of finishing it and retagging `:latest` after a rollback),
then SIGKILL 30 s later.

| Step | Timeout |
|---|---|
| `npm ci && npm run build` (web-app) | 20 min |
| `docker compose build --no-cache` | 60 min |
| `docker compose up -d` | 5 min |
| health wait | 7 / 10 / 2 min (api / bio / web) |
| `git fetch` | 5 min; other git commands 1 min |
| `docker tag` / `inspect` / `rm` | 1 min |

`docker_ops.max_deploy_seconds` adds these up for a deploy that fails at the last
moment and rolls back: 139 min for `identity-core-api`, 145 for `biometric-processor`,
152 for `web-app`. `stop_grace_period` is 155 min, and `tests/test_docker_ops.py` fails
if a timeout grows past it.

### Interrupted deploys

The checkout `HEAD` alone does not say what is running: between the fast-forward and a
healthy `up`, `HEAD` is already the new commit while the old container still serves.
If the deployer dies in that window (`docker kill`, daemon restart, host reboot, OOM),
`/state/INFLIGHT.<repo>` is still there when it starts again, and before anything else
that repository's cycle reconciles it:

* the new image was built, the container runs it, `HEAD` is the new commit and the
  health check passes: the deploy is recorded as done (nothing is rebuilt);
* otherwise it is rolled back: checkout reset to the old SHA (local overrides kept,
  including overrides left in the stash by a kill between `stash push` and `stash pop`),
  `:latest` pointed back at the rollback image, and the old image health-checked. The
  service is recreated unless its container is already running the old image and
  passes that check (one left `exited` or `created` by a kill between compose's stop
  and recreate is recreated). The interruption count is saved, then the marker is
  removed and the commit is tried again on the next cycle; a commit interrupted twice
  in a row is held in `FAILED.<repo>` like any failed deploy.

Reconcile resets the checkout to the old SHA from the marker even if an operator moved
`HEAD` by hand in the meantime; pause the repository first to keep a manual checkout.

If recovery itself fails the marker stays and the next cycle retries it. That includes a
failed build or rollback whose `:latest` could not be pointed back at the old image:
the marker is kept (and no `up` runs) until `:latest` and the checkout are both back. A pause flag
also pauses recovery. A dry run only reports it. A malformed `INFLIGHT.<repo>` or
`FAILED.<repo>` holds the repository with an error until an operator fixes or removes
the file.

### Database migrations and rollback

A rollback restores the previous image and checkout, **not the database schema**.
`identity-core-api` applies its Flyway migrations on start, so a migration failure shows
up as a failed health check, but a migration that succeeded stays applied when the old
image comes back. Write migrations expand/contract so that is safe:

* expand: add tables, nullable columns or columns with defaults, and indexes in one
  release, and keep the code working with both the old and the new schema;
* migrate the data and switch the code to the new shape in a later release;
* contract: drop or rename the old columns only once no deployed or rollback image
  still reads them (at least one release after the switch; three rollback tags are kept).

A destructive migration (drop, rename, type change, `NOT NULL` without a default) must
not ship in the same release as the code that stops using the old shape. If a rollback
does meet an incompatible schema, pause the repository and repair by hand
(`identity-core-api/docs/RUNBOOK_FLYWAY_V29_REPAIR.md` shows the Flyway repair steps).

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
| Stop | `docker compose stop` (waits up to 155 min for an in-flight deploy to finish or roll back; idle, it stops at once) |
| Stop now | `docker compose kill`; the next start reconciles the interrupted deploy |
| Clear a held recovery | inspect it, then `docker exec fivucsas-deployer rm /state/INFLIGHT.<repo>` |

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
  `no-new-privileges`, `init: true`, and it only mounts the three checkouts, their git
  directories under `/opt/projects/fivucsas/.git/modules/` and its state volume.
* It runs only code that already passed CI on `main` of the canonical repository;
  pull requests, forks and other branches are never considered.
* Command output is redacted before it is logged (URL credentials, `Authorization`
  headers, values of `*KEY*`, `*SECRET*`, `*PASSWORD*`, `*TOKEN*`, `*CREDENTIAL*`).
  This is best effort; builds should not print secrets in the first place.
* No token is used. The unauthenticated API limit is 60 calls per hour per IP and a
  `304` still counts without a token, which is why the API is gated by `ls-remote`.

### Trust model: a merge to `main` is root on mordecai

The deployer builds and runs whatever is on `main` once CI is green, with the Docker
socket. Anyone who can get a commit onto `main` of `identity-core-api`,
`biometric-processor` or `web-app` (merging a pull request, or pushing directly,
including an admin bypassing protection) can therefore run arbitrary code as root on
the production host: a `Dockerfile` `RUN` step, a compose file that bind-mounts `/`, or
a health check. Green CI is not a security review. State on 2026-11-04: all three
`main` branches require one approving review, `enforce_admins` is off, no code-owner
review is required, and only `identity-core-api` has required status checks.
Recommended repository settings (not changed here; the owner decides):

* branch protection on `main` with `enforce_admins` on, so admins cannot push around
  required reviews and checks;
* a `CODEOWNERS` entry requiring owner review for `docker-compose.prod.yml`,
  `Dockerfile*` and `.github/workflows/ci.yml` (and anything else that decides what the
  build runs or what CI checks), with "Require review from Code Owners" enabled;
* required status checks on `biometric-processor` and `web-app` as on
  `identity-core-api`, so a red or skipped CI cannot merge;
* a small set of people with write access, and Actions changes reviewed as carefully as
  code: whoever can change `ci.yml` decides what "green" means.

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
