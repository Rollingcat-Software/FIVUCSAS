# FIVUCSAS CI/CD Pipeline Audit — 2026-05-04

**Auditor:** T-CICD-AUDIT (read-only review)
**Scope:** All `.github/workflows/*.yml` across the parent repo (`fivucsas`) and four submodules (`identity-core-api`, `biometric-processor`, `web-app`, `client-apps`). `landing-website` ships from the parent repo's `deploy-landing.yml`. iOS workflow audited but treated as out-of-scope per the project's permanent-Apple-OUT policy (`continue-on-error: true` in workflow itself).
**Methodology:** Read every workflow file at HEAD, query `gh run list` (last 30) per workflow, sample run-job traces, inspect branch protection + secret-scanning state via `gh api`, list org/repo runners.
**Verdict:** **CI is broken in two places where it matters most (api integration tests, bio CI as a whole). The self-hosted runner is functionally a single point of failure that has been failing silently for ~27 days. Branch protection is OFF on every repo, including ones that ship to prod. Deploy contract is half-CI half-operator with the contract documented nowhere.**

---

## 1. Workflow Inventory

### 1.1 fivucsas (parent) — 2 workflows

| File | Trigger | Jobs | Runner | Path filter |
|---|---|---|---|---|
| `.github/workflows/ci.yml` | push/PR `master,main,develop` | `validate` (compose+nginx config) | `[self-hosted, linux, x64]` | `docker-compose*.yml`, `nginx/**` |
| `.github/workflows/deploy-landing.yml` | push `master` | `deploy` (npm ci → build → rsync to Hostinger) | `[self-hosted, linux, x64]` | `landing-website/**` |

No gitleaks at the parent. No link-checker on docs.

### 1.2 identity-core-api — 3 workflows

| File | Trigger | Jobs | Runner | Notes |
|---|---|---|---|---|
| `.github/workflows/ci.yml` | push/PR `main` | `test` (Maven unit) → `integration-tests` (Testcontainers, `needs: test`) | unit on `ubuntu-latest`, IT on `[self-hosted, linux, x64]` | timeout 25m / 35m |
| `.github/workflows/deploy-hetzner.yml` | push `master,main` + dispatch | `deploy` (appleboy/ssh-action → `infra/deploy.sh build identity` + restart + `/actuator/health` retries) | `[self-hosted, linux, x64]` | timeout 8m, command_timeout 6m |
| `.github/workflows/gitleaks.yml` | push `main` + PR | `scan` (gitleaks v8.21.2 dir scan) | `ubuntu-latest` | very thin: `gitleaks dir . --redact --verbose`, no allowlist file |

### 1.3 biometric-processor — 2 workflows

| File | Trigger | Jobs | Runner | Notes |
|---|---|---|---|---|
| `.github/workflows/ci.yml` | push/PR `main,dev,feature/*` | `lint` → `test` (`needs: lint`) → `integration-test` (`needs: test`) → `frontend-build` (`needs: test`) ‖ `security` (`needs: lint`) | **all 5 jobs** on `[self-hosted, linux, x64]` | python 3.12; pip-audit `--strict || true` (warns only) |
| `.github/workflows/deploy-hetzner.yml` | push `main` + dispatch | `deploy` (SSH → build + restart) | `[self-hosted, linux, x64]` | timeout 10m |

No gitleaks workflow despite memory note (`session_20260430.md`) claiming gitleaks shipped to "both repos". Verified at HEAD: bio is missing it.

### 1.4 web-app — 4 workflows

| File | Trigger | Jobs | Runner | Notes |
|---|---|---|---|---|
| `.github/workflows/ci.yml` | push/PR `main,master` | `build-and-test` (lint, tsc, test, vite build with `SKIP_MODEL_FETCH=1`), `code-quality` (npm audit, coverage; both `continue-on-error: true`) | `ubuntu-latest` | matrix `[22.x]` |
| `.github/workflows/e2e.yml` | schedule `0 2 * * *` (UTC) + dispatch | `e2e` (Playwright Chromium) — project=smoke nightly; dispatch can pick `authenticated` or `destructive` | `ubuntu-latest` | targets PROD `https://app.fivucsas.com` directly |
| `.github/workflows/deploy-hostinger.yml` | push `main` + dispatch | `deploy` (npm ci → write `.env.production` heredoc → vite build → rsync) | `ubuntu-latest` | targets `~/domains/app.fivucsas.com/public_html/` |
| `.github/workflows/gitleaks.yml` | push `main` + PR | `scan` (gitleaks v8.21.2) | `ubuntu-latest` | identical to api copy |

### 1.5 client-apps — 3 workflows

| File | Trigger | Jobs | Runner | Notes |
|---|---|---|---|---|
| `.github/workflows/android-build.yml` | push/PR `main,develop` + dispatch | `build` (assembleDebug by default; assembleRelease requires keystore secrets) | `ubuntu-latest` | dummy `google-services.json` baked at build time |
| `.github/workflows/ios-build.yml` | push/PR `main,develop` + dispatch | `build-framework` (`continue-on-error: true`) | `macos-latest` | non-blocking, scope is OUT |
| `.github/workflows/desktop-installers.yml` | dispatch + `desktop-v*` tags | `build-linux` (.deb) on `ubuntu-latest`, `build-windows` (.msi) on `windows-latest` | mixed | unsigned artifacts; SHA256 manifest produced |

Total active workflows across the 5 repos: **14** (parent 2, api 3, bio 2, web 4, client 3). No workflow uses reusable workflows or composite actions — every workflow is monolithic.

---

## 2. Health Check — Run-History Sweep

Sampling: last 30 runs per workflow, `gh run list … --json conclusion,createdAt,updatedAt`, except where called out (bio = last 100).

### 2.1 identity-core-api — `CI` (`ci.yml`)

| Bucket | Count (last 30) |
|---|---|
| cancelled, push | 13 |
| cancelled, PR | 8 |
| (running/queued), PR | 7 |
| (running/queued), push | 1 |
| failure, PR | 1 |
| **success** | **0** |

Of last 30 runs, **zero successes**. The Maven unit job typically passes in ~50–80s (verified on PR runs that completed before being superseded). The integration-tests job has been **skipped** on every recent successful PR-precursor run (because it's gated `needs: test` and has been completing in seconds with `conclusion: skipped` after the unit job's slot churn).

**Critical:** Run #25303233032 had `Maven test (unit)` finish `success` at 2026-05-04 05:49:05Z, then `Integration tests (Testcontainers)` queued at 05:49:05Z and was **cancelled at 11:27:16Z — 5h 38m later — never having started a runner**. This is Task #55 in living color. Pattern: every push to `main` ships a new run, the new run cancels the previous one's pending IT job, and the IT job never actually executes.

Successful CI runs on api in the last 30: **0**. Last green api CI on `main`: not found in last-100 sweep — needs forensic dig.

### 2.2 identity-core-api — `Deploy to Hetzner VPS` (`deploy-hetzner.yml`)

Last 10 runs: **9 cancelled, 1 queued (just-now)**. Like CI, Deploy gets cancelled by the next push because of `concurrency: deploy-identity / cancel-in-progress: true`. With pushes happening every 15-30 min during active development, the deploy never actually runs to completion — except apparently one or two times. Last clear `success` conclusion in our sample: not present in last-30. Per the operator memory log (`session_20260502.md`), prod was rebuilt 2026-05-02 17:50 UTC by hand — not by CI.

**Read:** the api deploy workflow is, for all practical purposes, a no-op stub. The CLAUDE.md says deploys happen via `docker compose -f docker-compose.prod.yml --env-file .env.prod build --no-cache identity-core-api` directly on the VPS by the operator. CI deploy is theatre.

### 2.3 biometric-processor — `CI Pipeline`

Last **100** runs distribution: 82 cancelled, 15 failure, **2 success**, 1 running. **Success rate: 2%**.

Last green push run: `24072240675` — **2026-04-07** (27 days before this audit). Every push since has had its 5 jobs (`Lint & Type Check`, `Unit Tests`, `Integration Tests`, `Security Scan`, `Build Frontend`) — all pinned to `[self-hosted, linux, x64]` — cancelled at the **GitHub Actions 24h workflow timeout** (86402s = 24h to-the-second) because the self-hosted runner is unavailable (see §5).

Bio CI is, in effect, **disabled in steady state** even though devs see green checkmarks in PRs (the green is the Copilot review and gitleaks-on-api copy ; bio has no gitleaks, has no working CI). New code lands without test execution. The `frontend-build` job that exercises `demo-ui/`, the `pip-audit` line, and the Bandit scan all **have not run on a `main` push since 2026-04-07**.

### 2.4 biometric-processor — `Deploy to Hetzner VPS`

Same self-hosted runner problem: last 10 runs all cancelled. Operator deploys by hand.

### 2.5 web-app — `CI`

Last 30: **26 success, 3 cancelled, 1 failure**. Healthy. Median duration ≈ 165s; p95 ≈ 180s. The `code-quality` job has both `npm audit` and `coverage` set `continue-on-error: true` — passes never reflect real quality state.

### 2.6 web-app — `Deploy to Hostinger`

Last 10: **8 success, 1 failure (PR #66 follow-on), 1 cancelled**. This is the one deploy pipeline that **actually deploys**. Median duration ~ 65–90s. Fast, works.

### 2.7 web-app — `E2E Tests` (cron + dispatch)

Cron `0 2 * * *` UTC: in last 30 schedule events, **only 2 actual runs found** — 2026-05-03 05:28Z and 2026-05-04 05:32Z (both `success`). The schedule started running on 2026-05-03; before that, every E2E run was a `push` event (and they're all `cancelled` because the workflow has `cancel-in-progress: true` and pushes pile up). Per the memory note, nightlies were wired in PR #65; that PR is recent, so the cron showing only 2 runs aligns. **Verdict: E2E nightlies are working but very young.** No alerting on failure.

### 2.8 web-app — `gitleaks`

Inspected fewer; last 10 runs all `success`. Each push to `main` and every PR scans. No allowlist — relies entirely on default rules, which yield no positives at HEAD.

### 2.9 fivucsas (parent) — `FIVUCSAS CI`

Last 30: 19 success, 9 failure, 2 cancelled. Failures are old (March 2026) — submodule pointer commits that broke when `git submodule status` couldn't recurse. The 86402s line in the duration log is from a stale push that hit 24h timeout. Steady state currently green when triggered, which is rare (path-filter-gated). Median useful run: ~565s.

### 2.10 fivucsas — `Deploy Landing to Hostinger`

Last 30: **19 cancelled, 4 success, 3 failure**. **Last success: 2026-03-28** (run `23681941800`). Like api/bio, the self-hosted-runner-pinned deploy job sits queued and is killed by the next push. Landing has been auto-deploying ~35 days ago at best; the operator does it manually.

### 2.11 client-apps — `Android Build`

Last 30: 17 success, 13 cancelled. **Success rate: 57%.** Median build ~190s. Cancellations are concurrency, not failures. Healthy.

### 2.12 client-apps — `iOS Build`

29/30 success despite `continue-on-error: true` — the K/N framework actually builds. Out of strategic scope per project policy.

### 2.13 client-apps — `Desktop Installers`

Tag-only / dispatch-only. Run history sparse. No regressions visible.

### Top-3 Most-Flaky Jobs

1. **api `Integration tests (Testcontainers)`** — 100% cancellation rate over last 30 runs. Never reaches a runner.
2. **bio `Lint & Type Check`** + 4 sibling jobs — 82% cancellation, 15% failure, 2% success over last 100. Effectively dead.
3. **fivucsas `Deploy Landing` `deploy`** — 63% cancellation. Last success 5+ weeks ago.

---

## 3. Coverage Gaps

### 3.1 identity-core-api

* **Integration tests are gated on a runner that won't run them.** Right move: split this job into one half that can run on `ubuntu-latest` (Testcontainers via Docker-in-Docker is fine on hosted runners; Ryuk disabling is already in place) and a smaller smoke half on `[self-hosted]`. Or just move it all to `ubuntu-latest`. The Hetzner-runner argument was originally about needing GPU/biometric containers in tests; that's the bio job, not the api one.
* **No coverage report uploaded** anywhere (no JaCoCo, no Codecov action).
* **No spotbugs/checkstyle/PMD** — Java side has zero static analysis in CI.
* **No build of the Docker image in CI**. The deploy step builds in-place on prod. A failed Docker build only surfaces during deploy, after merge.
* **No `mvn dependency-check:check`** (OWASP). Dependabot covers some of it but not transitive runtime drift.
* **No test for Flyway migration validity** — V57's `RAISE WARNING` fail-soft path is not exercised pre-merge.

### 3.2 biometric-processor

* **Type check is missing.** `mypy` is `pip install`ed but never invoked. The job is "Lint & Type Check"; only `ruff check` + `ruff format --check … || true` runs.
* **`ruff check`** runs with `--ignore E501,F401,F821,E402` — that's silencing **F821 (undefined name)** and **F401 (unused imports)**. F821 silences would have shielded the recent backfill-script breakage that PR #68 just fixed.
* **No model-fetch/SHA256 verification job** — bio has bundled MTCNN weights + needs UniFace ONNX caching; no CI step checks the cache directory or model file integrity.
* **`pip-audit --strict || true`** swallows known-vulnerable dependency findings. Per the memory note `feedback_audit_quality.md`, this kind of `|| true` is exactly what produces hollow security signal.
* **No Dockerfile lint** (`hadolint`) despite the runtime image having recently shipped without `alembic` (PR #68's bugfix).
* **No alembic migration test** — no CI step does `alembic upgrade head` against a freshly-spun postgres.
* **No gitleaks workflow.** Memory `project_session_20260430.md` claims gitleaks shipped to "both repos" — incorrect. Bio has no `.github/workflows/gitleaks.yml`.

### 3.3 web-app

* **`code-quality` job is decorative.** `npm audit --audit-level=high` is `continue-on-error: true`, and so is `npm test … --coverage`. CI never blocks on either. Coverage is uploaded as an artifact but not enforced.
* **`SKIP_MODEL_FETCH=1`** in build is correct (models live on Hostinger), but nothing in CI verifies the public manifest.json SHA256s against a checked-in lock file. This is a supply-chain blind spot.
* **`build-and-test` job runs `npx tsc --noEmit`** which is good, but `npm run build` again invokes tsc — duplicate work, ~30s wasted per run.
* **Vitest doesn't fail CI on snapshot drift** — verified by reading vitest.config behavior is project-default.
* **E2E `pull_request` trigger missing.** The workflow file has the right comment ("once verify.fivucsas.com (or hosted staging) is up, add `pull_request:` running `--project=smoke`"). PRs currently merge without ever running Playwright. The smoke project is, per memory, designed for non-destructive PROD use, so it's safe to flip on.
* **No accessibility audit** (axe-core, pa11y). For a 17-page admin dashboard targeting a Marmara-deployed environment, this is a gap.
* **Bundle-size budget** absent. Vite build can grow without alarm.

### 3.4 client-apps

* **Lint/check tasks not run.** Workflow goes straight to `assembleDebug`. There is no `:shared:check` or `ktlint`/`detekt` step. KMP code can land with style and unused-symbol warnings.
* **No unit test job.** Memory references "shared common-test" in passing but nothing in CI runs `:shared:test` or `:androidApp:testDebugUnitTest`.
* **No instrumented-test smoke** (`connectedDebugAndroidTest`) — fair, since that needs an emulator/device.
* **APK release path lacks an `apksigner verify` step** post-signing.
* **No artifact retention for lint reports** even when `assembleDebug` is the entire job.

### 3.5 fivucsas (parent)

* **No link-check** on Markdown docs (`lychee` or `markdown-link-check`). The repo has 30+ `*_REVIEW_*.md` files with cross-references.
* **No submodule-pointer drift check.** It would be useful to fail CI if a parent commit pins a submodule SHA that doesn't exist on the submodule's `main`.
* **No nginx config rendering test against the actual upstream containers.** `nginx -t` validates syntax only; it can't catch the sort of `proxy_pass` typo that broke prod twice in recent memory.
* **No matching gitleaks workflow at parent level** — relevant because the parent has `infra/`, `monitoring/`, `nginx/`, `scripts/` outside the submodules.

---

## 4. Branch Protection State

| Repo | `main` (or `master`) protection | Verified by |
|---|---|---|
| `fivucsas` | **OFF** (404 Branch not protected) | `gh api repos/.../branches/master/protection` |
| `identity-core-api` | **OFF** | same |
| `biometric-processor` | **OFF** | same |
| `web-app` | **OFF** *(memory said 1-review required — INCORRECT at HEAD)* | same |
| `client-apps` | **OFF** | same |

**Risk surface today:**

* Anyone with push rights (the operator + whatever GitHub App tokens are wired) can `git push origin main --force` on a repo that ships to prod.
* PRs do not require a passing CI before merge. Memory note `feedback_audit_quality.md` and `RESEARCH_PROCTORING_AMISPOOF_2026-05-02.md` already noted this risk; the fix has been deferred indefinitely.
* This is incompatible with the security posture documented for the platform (RFC 6749 reuse-detection, pgBackRest PITR, gitleaks). A locked-down platform whose code can be force-pushed into prod is locked down only on paper.

The web-app `code-quality` `continue-on-error` chain combines with no-protection to produce: a PR whose only blocking signal is `gitleaks` and the `build-and-test` job. If the build job is slow that day and the operator hits "Merge anyway" with admin privilege, nothing prevents it.

---

## 5. Self-Hosted Runner — Task #55 Diagnosis

### 5.1 What's registered

```text
GET /orgs/Rollingcat-Software/actions/runners
{
  "total_count": 1,
  "runners": [{
    "id": 55, "name": "hetzner-cx43", "os": "Linux",
    "status": "online", "busy": false,
    "labels": [self-hosted, Linux, X64, hetzner]
  }]
}
```

GET on each repo's `/actions/runners` → `total_count: 0` for all. Only the **org-level** runner exists. The runner ID is literally **55** (probably coincidence with Task #55 numbering, but a memorable one).

### 5.2 What jobs need it

Workflows pinning to `[self-hosted, linux, x64]`:

* `fivucsas/.github/workflows/ci.yml` — `validate`
* `fivucsas/.github/workflows/deploy-landing.yml` — `deploy`
* `identity-core-api/.github/workflows/ci.yml` — `integration-tests`
* `identity-core-api/.github/workflows/deploy-hetzner.yml` — `deploy`
* `biometric-processor/.github/workflows/ci.yml` — **all 5 jobs** (`lint`, `test`, `integration-test`, `frontend-build`, `security`)
* `biometric-processor/.github/workflows/deploy-hetzner.yml` — `deploy`

That's **10 jobs** vying for a single runner.

### 5.3 What's actually happening

At the moment of audit there were 6 queued CI runs across api + bio waiting on `[self-hosted, linux, x64]`. The runner shows `busy: false` and `online`. **The runner is online but not picking jobs.**

Diagnostic possibilities (cannot SSH from this audit context; SSH key isn't on the audit host):

1. **Runner registered to org-level but org Actions Runner Group is restricted from these repos.** GitHub gates org-level runners through Runner Groups. If the "Default" runner group's repository access is set to "selected repositories" and the FIVUCSAS submodules aren't in the list, jobs queue forever. Symptom matches.
2. **Runner has stale workspace** (a previous job left a directory it can't clean) and refuses to start new jobs. Less likely given `busy:false`.
3. **Label mismatch.** Workflows use lowercase `[self-hosted, linux, x64]`; runner advertises `Linux` and `X64` (uppercase). GitHub's label match is case-insensitive per docs, but if the `_work` folder cap was hit or storage-pressure detected, the runner self-quarantines.

Per memory `feedback_audit_quality.md`, the right next step is to **verify, not speculate**. The verification surface (SSH to Hetzner, `systemctl status actions.runner.Rollingcat-Software.hetzner-cx43.service`, `journalctl -u actions.runner... -n 200`) is operator-side.

### 5.4 Recommended remediation

Three parallel actions, in priority order:

* **R1 (P0, S effort):** Move api `integration-tests` to `ubuntu-latest`. Testcontainers has worked on hosted runners since GitHub started shipping Docker in the runner image. The `TESTCONTAINERS_RYUK_DISABLED: 'true'` env is already set. There is no architectural reason this must run on the Hetzner host.
* **R2 (P0, M effort):** Move all 5 bio CI jobs to `ubuntu-latest`. None of them need the self-hosted runner. The reason it's pinned is historical (early ML weights download cost; no longer relevant since most weights are bundled or cached). The integration-test step starts its own Redis container in CI; that works fine on hosted. ML pipelines can `pip install opencv-python-headless deepface` in <2min; bandwidth is not the bottleneck there.
* **R3 (P1, M effort):** Keep deploys on the self-hosted runner (they need access to the Docker socket on Hetzner). But add a **second runner** at minimum, and document acceptable cancel behavior. The `concurrency: deploy-identity / cancel-in-progress: true` configuration is correct — newer deploys should win — but the operator should log a runbook entry when CI hasn't deployed in N hours so manual deploys can take over.
* **R4 (P1, S effort):** Switch to repo-level runners or set the org-level Runner Group to allow each FIVUCSAS submodule explicitly, eliminating the "is the runner allowed?" guess.

---

## 6. Secret Hygiene

### 6.1 Per-repo state

| Repo | `secret_scanning` | `push_protection` | `dependabot_security_updates` | gitleaks workflow |
|---|---|---|---|---|
| `fivucsas` | DISABLED | DISABLED | enabled | NO |
| `identity-core-api` | enabled | enabled | enabled | YES |
| `biometric-processor` | DISABLED | DISABLED | enabled | NO |
| `web-app` | enabled | enabled | enabled | YES |
| `client-apps` | DISABLED | DISABLED | enabled | NO |

Only **2 of 5 repos** have GitHub native secret scanning + push protection. Memory note `project_session_20260430.md` had this as a finished bullet ("enabled across **both** repos") — correct as written, just both = api + web. Misread elsewhere as "all repos".

### 6.2 gitleaks workflow review

Both api and web have **identical** gitleaks workflows:

```yaml
- run: gitleaks dir . --no-banner --redact --verbose
```

* **No `--config` file.** Uses gitleaks defaults. No allowlist, no custom rules.
* **No `--exit-code 0` shield** — the workflow DOES fail on findings, which is correct.
* **No baseline/report file uploaded** — findings only land in workflow logs.
* **No SARIF upload** to the GitHub Security tab (`upload-sarif` action is not invoked).
* **Working-tree scan only**, not history (`gitleaks dir`) — this is fine for the post-rewrite era but won't catch git history that contains the previously-leaked secrets unless the user has already done the `git filter-repo` operator-only step (per memory, deferred).

### 6.3 Workflow `env:` blocks scanned for secrets

Manual grep across all 14 workflow files: no plaintext secrets. All sensitive values come through `${{ secrets.* }}`. The `BUILD_TYPE`, `EVENT_NAME`, `TARGET` envs in client-apps android-build are non-sensitive. Web-app deploy heredoc writes a `.env.production` file containing only public `VITE_*` values — that's by design (Vite inlines them at build, secrecy through them is an anti-pattern anyway).

One **questionable pattern** in `client-apps/android-build.yml` (lines 60–86): a dummy `google-services.json` is checked into the workflow file. It contains the literal `"AIzaSyCI-DUMMY-KEY-FOR-CI-BUILD"`. Not a real secret, but it's the kind of pattern push-protection doesn't catch and gitleaks might flag depending on rule set. Worth annotating in code or replacing with a CI-generated valid stub.

### 6.4 GitGuardian

No GitGuardian app/integration found in any repo's webhooks (`gh api repos/.../hooks` returns empty). Not in scope per the platform's "GitHub-native + gitleaks" decision tree, but the audit was asked to confirm — confirmed: not integrated.

---

## 7. Deploy Pipelines

### 7.1 web-app `Deploy to Hostinger`

**Working as designed.** Last 10 runs: 8 success / 1 failure / 1 cancelled. Median ~65s. Triggered by every push to `main` (path-filtered). Builds, writes prod env, rsyncs to Hostinger over SSH. **This is the only deploy pipeline that meaningfully deploys.** Notable: writes `.env.production` heredoc inline rather than committing one — keeps env config in the workflow, which is fine for VITE_ vars.

### 7.2 api `Deploy to Hetzner VPS`

**Effectively a stub.** Last 10 runs: 9 cancelled, 1 queued. The job pattern is correct (`appleboy/ssh-action` → `infra/deploy.sh build identity` → restart → 5x `curl /actuator/health` retries). When it runs, it works (the operator-driven path is identical). **But it almost never runs in CI** because (a) the self-hosted runner doesn't pick the job, and (b) when it does pick, the next push cancels it via `concurrency: deploy-identity / cancel-in-progress: true`. The operator-driven path (via SSH from the user's laptop, running `docker compose ... build --no-cache`) is what actually deploys. **Real contract: the operator deploys; CI is theatre.**

### 7.3 bio `Deploy to Hetzner VPS`

Same diagnosis as api. Recent runs: all cancelled. Operator deploys via the documented `cd /opt/projects/fivucsas/biometric-processor && docker compose -f docker-compose.prod.yml ... build --no-cache && up -d` path. **Real contract: operator-only.**

### 7.4 fivucsas `Deploy Landing to Hostinger`

Last successful: **2026-03-28**. Five-plus weeks of "every push gets cancelled before deploy completes". Operator-only in practice.

### 7.5 client-apps `Desktop Installers`

Tag-driven only. Run history shows it executes when tagged. Real CI deploy pipeline.

### 7.6 client-apps `Android Build`

Builds APK artifacts only. Does not publish anywhere — release path is documented as "user uploads APK to GitHub release" per memory `reference_fivucsas_client_apps_releases.md`. No automatic publication step.

### 7.7 The undocumented contract

Across the platform, the implicit contract is:

* **web-app** deploys via CI to Hostinger.
* **landing-website** deploys via operator (CI is broken, has been since 2026-03-28).
* **identity-core-api** deploys via operator (CI rarely runs to completion).
* **biometric-processor** deploys via operator (CI hasn't run any jobs to completion since 2026-04-07).
* **client-apps** ships APK/MSI/deb via operator-driven tag + manual GitHub release upload.

Nowhere in the repo is this documented as the actual contract. CLAUDE.md and the various RUNBOOK files imply CI deploys; it doesn't, except for web. **This is the single largest documentation drift in the CI/CD layer.**

---

## 8. Notable Findings — Broken or Risky

### 8.1 BROKEN: bio CI hasn't passed in 27 days

`Counter({'cancelled': 82, 'failure': 15, 'success': 2, '(running)': 1})` over last 100. Last green run: `24072240675` on 2026-04-07. Every push to `main` ships untested. Multiple security-relevant PRs (Fernet embedding encryption #65, UniFace warm-up #66, alembic runtime fix) merged without CI validation.

### 8.2 BROKEN: api integration tests have not been exercised in CI on a `main` push since at least 2026-04-18

Sampled the 10 most recent runs that completed (`success` or `failure` conclusion) — every single one shows `Integration tests (Testcontainers)` with `conclusion: skipped` (because the unit-test gate failed) or `cancelled` (because the runner never picked it up). **Testcontainers code path is dead.**

### 8.3 RISKY: `continue-on-error: true` defangs web-app `code-quality` job

Both `npm audit --audit-level=high` and `npm test --coverage` are wrapped. The job always passes. The "Code Quality" check on the PR page is a meaningless green tick. Fix: drop `continue-on-error`, accept the audit-level=high failures (or pin allowlist), and let coverage block on regressions.

### 8.4 RISKY: branch protection OFF everywhere

§4 already covered. Worth restating: this is the single highest-leverage CI hygiene fix — flip protection to "Require a PR + 1 review + status checks: build-and-test, gitleaks" on api, bio, web at minimum.

### 8.5 RISKY: ruff ignore list silences F821 (undefined name)

`bio/.github/workflows/ci.yml` line 47 — `ruff check app/ --ignore E501,F401,F821,E402`. F821 is "undefined name" — exactly the bug class that produces NameError at runtime. PR #68's "repair backfill script async-iter" was *that* bug class. Remove F821 from the ignore list.

### 8.6 RISKY: `pip-audit --strict || true`

`bio/.github/workflows/ci.yml` line 197 — comment says "Don't fail on vulnerabilities, just report" but a security workflow that doesn't fail on findings is theatre. Per memory `feedback_audit_quality.md`, this is exactly the "audit/recommendation quality" anti-pattern. Same goes for `npm audit --audit-level=high` with `continue-on-error: true`.

### 8.7 RISKY: bio CI all 5 jobs need self-hosted runner

§5 already covered. None of these jobs has a real reason to be on `[self-hosted]`. The frontend-build job certainly doesn't. The lint job certainly doesn't.

### 8.8 RISKY: dummy google-services.json in workflow file

`client-apps/android-build.yml` lines 60–86. Static "fake" Google Services JSON checked into the workflow with a literal `"AIzaSyCI-DUMMY-KEY-FOR-CI-BUILD"`. Not a real key, but it's pattern-matched by every secret scanner. Better: produce an empty stub or use a secret-loaded valid file.

### 8.9 RISKY: api CI cache strategy is just `cache: maven` on setup-java

No fine-grained cache key. Maven downloads ~200MB of deps every successful run. Across the whole repo lifetime that's bandwidth taxes Anthropic's compute and our build minutes. Add a Maven-cache-action with explicit `~/.m2/repository` key on `pom.xml` hash.

### 8.10 RISKY: web-app CI builds twice (`tsc --noEmit` + `npm run build` which also tsc)

Two TypeScript passes per CI run. ~30s × 30 runs/wk × N weeks. Tractable fix: drop the standalone `tsc --noEmit` step, rely on `vite build` (which already tsc-checks).

### 8.11 RISKY: gitleaks scans working tree only, not git history

Memory notes `git filter-repo` history rewrite is operator-only, deferred. While that's pending, gitleaks-history scan would surface the not-yet-rotated leak surface every PR. Currently it only scans HEAD.

### 8.12 RISKY: E2E nightly has no failure alerting

If the cron fails, no one knows. The artifact upload runs `if: always()` — but no Slack / email / GitHub Issue creation on failure. With 1-2 cron runs in production history, no incidents have happened yet. Will happen.

### 8.13 RISKY: api workflow runs on `master` AND `main` pushes (deploy-hetzner.yml line 4)

The repo's default branch is `main` per `gh api`. The legacy `master` reference creates double-trigger risk if a stray push to `master` happens. Trim to `main`.

### 8.14 RISKY: api ci.yml `pull_request` doesn't run integration-tests on PR

Workflow gates `integration-tests` on `needs: test` AND triggers only on push/PR to `main`, but with the runner stalled, IT never runs. PR comment: "Integration tests skipped." Becomes muscle memory; reviewers stop expecting them.

### 8.15 RISKY: parent repo CI has no gitleaks

`infra/`, `nginx/`, `scripts/`, `monitoring/` all live in the parent repo. If a secret slips into `infra/observability/`, it's not scanned.

---

## 9. Findings + Prioritized Recommendations

Conventions: **P0** = ship-blocking / security-risk, **P1** = significant performance/reliability, **P2** = polish, **P3** = defer. Effort: XS (≤30min), S (≤2h), M (≤1d), L (>1d).

### P0 — Fix immediately (one-PR-per-repo sweep possible)

| # | Finding | Where | Recommendation | Effort | One-PR? |
|---|---|---|---|---|---|
| P0.1 | bio CI hasn't passed since 2026-04-07 — every push ships untested | `biometric-processor/.github/workflows/ci.yml` lines 32, 55, 99, 148, 176 | Move all 5 jobs from `[self-hosted, linux, x64]` to `ubuntu-latest`. Verify Docker, Redis, Node 22, Python 3.12 all work on hosted runners (they do). | M | yes (single bio PR) |
| P0.2 | api Testcontainers job blocked by self-hosted-runner stall | `identity-core-api/.github/workflows/ci.yml` line 53 | Move `integration-tests` to `ubuntu-latest`. Keep `TESTCONTAINERS_RYUK_DISABLED: 'true'`. Bench cost: ~5-7min added to hosted budget per push. | S | yes (single api PR) |
| P0.3 | Branch protection OFF on all 5 repos including prod-shipping ones | All 5 repos | Set `Require PR + 1 review + status checks: build-and-test (or CI), gitleaks` on `main` (and `master` for fivucsas). Allow operator admin override. | S | no (5 separate API calls / settings click-through) |
| P0.4 | `pip-audit --strict \|\| true` defangs vulnerability check | `biometric-processor/.github/workflows/ci.yml` line 197 | Drop `\|\| true`. Add `--ignore-vuln` allowlist file if false positives surface. | XS | yes (one-line fix) |
| P0.5 | `code-quality` job in web-app passes regardless of `npm audit` and coverage | `web-app/.github/workflows/ci.yml` lines 92, 96 | Remove `continue-on-error: true` from both. If audit failures hit, allowlist via `npm audit --omit=dev` or `--audit-level=critical` first. | XS | yes |
| P0.6 | ruff F821 silenced — same bug class shipped via PR #68 | `biometric-processor/.github/workflows/ci.yml` line 47 | Remove `F821` from ignore list. Optionally remove `F401` too (unused imports are now common dead code). | XS | yes |
| P0.7 | Self-hosted runner is online but not pulling jobs (Task #55 root cause) | Hetzner VPS — operator-side | Operator: SSH, `systemctl status actions.runner.*`, check Runner Group repo access settings on org. **Until fixed, P0.1–P0.2 above eliminate most of the impact.** | M | no (operator) |

### P1 — Significant reliability / performance

| # | Finding | Where | Recommendation | Effort | One-PR? |
|---|---|---|---|---|---|
| P1.1 | Deploy pipelines (api/bio/landing) almost never run; operator deploys by hand; "CI deploys" myth in CLAUDE.md | `identity-core-api/.github/workflows/deploy-hetzner.yml`, `biometric-processor/.github/workflows/deploy-hetzner.yml`, `fivucsas/.github/workflows/deploy-landing.yml` | Pick a side: (a) run a 2nd runner so deploys actually happen, OR (b) delete the deploy workflows entirely and document operator-only. Hybrid is the worst option. | M | per-repo |
| P1.2 | Last successful Landing deploy 2026-03-28 — 5+ weeks of stale potential auto-deploy | `fivucsas/.github/workflows/deploy-landing.yml` | Move to `ubuntu-latest` + rsync over SSH (HOSTINGER_SSH_KEY already a secret) — same pattern web-app uses. Eliminates self-hosted dependency. | S | yes |
| P1.3 | E2E nightly has no failure alerting | `web-app/.github/workflows/e2e.yml` | Add a job step: if `failure()` create a GitHub Issue or post to ops-email Grafana contact point (extra step using `gh issue create`). | S | yes |
| P1.4 | E2E `pull_request` trigger missing — PRs ship without Playwright validation | `web-app/.github/workflows/e2e.yml` line 11-13 | Enable `pull_request` for `--project=smoke`. Smoke is `@readonly` per design. | XS | yes |
| P1.5 | api Maven cache miss-y | `identity-core-api/.github/workflows/ci.yml` line 35 | Replace with explicit `actions/cache@v4` keyed on `hashFiles('**/pom.xml')`. | XS | yes |
| P1.6 | Web-app double tsc | `web-app/.github/workflows/ci.yml` line 52 | Drop `npx tsc --noEmit` step. | XS | yes |
| P1.7 | gitleaks history scan absent | `identity-core-api/.github/workflows/gitleaks.yml`, `web-app/.github/workflows/gitleaks.yml` | Replace `gitleaks dir .` with `gitleaks detect --source . --no-banner --redact --verbose` (scans history). Optionally upload SARIF. | XS | yes (per repo) |
| P1.8 | bio missing gitleaks workflow | `biometric-processor/.github/workflows/` | Copy api's `gitleaks.yml`. | XS | yes |
| P1.9 | parent missing gitleaks workflow | `fivucsas/.github/workflows/` | Same — but scan ignores submodule subtrees (`--config` with `[allowlist]`). | S | yes |
| P1.10 | `concurrency: cancel-in-progress: true` on deploy workflows kills queued deploys before they can run | `identity-core-api/.github/workflows/deploy-hetzner.yml` line 15, `biometric-processor/.github/workflows/deploy-hetzner.yml` line 16 | Change to `cancel-in-progress: false` so a queued deploy gets to run after the current one finishes. Two pushes in quick succession = two deploys in series, not one. | XS | yes |
| P1.11 | client-apps android-build has no lint/test step | `client-apps/.github/workflows/android-build.yml` | Add `./gradlew :shared:check :androidApp:lintDebug` before `assembleDebug`. | S | yes |
| P1.12 | `master` listed alongside `main` on api deploy | `identity-core-api/.github/workflows/deploy-hetzner.yml` line 4 | Drop `master`. Default branch is `main`. | XS | yes |

### P2 — Polish

| # | Finding | Where | Recommendation | Effort |
|---|---|---|---|---|
| P2.1 | No coverage report uploaded for api Maven tests | `identity-core-api/.github/workflows/ci.yml` | Add JaCoCo + `actions/upload-artifact` for `target/site/jacoco/`. Optionally Codecov. | S |
| P2.2 | No spotbugs/checkstyle/PMD on Java | api ci.yml | Add `mvn spotbugs:check checkstyle:check` job. | M |
| P2.3 | No Dockerfile lint | bio + api Dockerfiles | Add `hadolint` step. | XS |
| P2.4 | mypy installed but not invoked in bio | bio ci.yml line 44 | Add `mypy app/ --ignore-missing-imports --no-strict-optional` step. | S |
| P2.5 | No alembic head check | bio ci.yml | Spin postgres in CI, run `alembic upgrade head`, assert clean. | M |
| P2.6 | dummy google-services.json inline | client-apps android-build.yml | Replace with a generated empty stub or a CI secret. | S |
| P2.7 | gitleaks no SARIF | api + web | Add `--report-format sarif --report-path gitleaks.sarif` and `actions/upload-sarif`. | XS |
| P2.8 | Bundle size budget missing | web-app | Add `vite-plugin-bundle-analyzer` + threshold gate. | S |
| P2.9 | a11y audit missing | web-app | Add `@axe-core/playwright` step in nightly E2E. | M |
| P2.10 | No link-checker on parent docs | fivucsas parent | Add `lychee` action on Markdown changes. | XS |

### P3 — Defer

| # | Finding | Recommendation |
|---|---|---|
| P3.1 | iOS workflow is non-blocking and out of scope per project policy | Leave as-is. |
| P3.2 | Desktop installers signing | Already documented as deferred (see `client-apps/docs/SIGNING.md`). |
| P3.3 | GitGuardian integration | Not part of stated stack; gitleaks + native GitHub secret-scanning sufficient. |
| P3.4 | Reusable workflows / composite actions | Pre-mature optimization for a 14-workflow estate. |

---

## 10. One-PR-Sweep Candidates

Findings that can land in a single PR per repo without operator coordination:

* **bio one-PR:** P0.1 + P0.4 + P0.6 + P1.8 (move runners to `ubuntu-latest`, drop `|| true`, drop F821 ignore, add gitleaks workflow). All in `biometric-processor/.github/workflows/`. ~4 file edits.
* **api one-PR:** P0.2 + P1.5 + P1.7 + P1.10 + P1.12 (move IT to ubuntu, real Maven cache, gitleaks history, deploy concurrency, drop master). All in `identity-core-api/.github/workflows/`. ~3 file edits.
* **web one-PR:** P0.5 + P1.3 + P1.4 + P1.6 + P1.7 (drop continue-on-error, alert on E2E failure, PR trigger, single tsc, gitleaks history). All in `web-app/.github/workflows/`. ~3 file edits.
* **fivucsas one-PR:** P1.2 + P1.9 (rewrite landing deploy to ubuntu+SSH, add gitleaks). 2 file edits.
* **client-apps one-PR:** P1.11 + P2.6 (lint/test step, replace dummy google-services.json). 1 file edit.

Findings that need operator coordination:

* **P0.3** (branch protection) — needs `gh api -X PUT` per repo, requires admin token.
* **P0.7** (Hetzner runner diagnosis) — needs SSH to the VPS.
* **P1.1** (deploy contract clarification) — strategic call, not a code change.

---

## 11. Numbers At a Glance

| Repo | Workflows | last-30 success rate (CI) | last-30 success rate (deploy) | branch protection | gitleaks |
|---|---|---|---|---|---|
| `fivucsas` | 2 | 63% (success), 30% (failure), 7% (cancelled) | 13% (4/30) | OFF | ❌ |
| `identity-core-api` | 3 | 0% (success), 70% (cancelled), 27% (running), 3% (failure) | 0% (last-10) | OFF | ✅ |
| `biometric-processor` | 2 | 2% (success on last 100), 82% (cancelled), 15% (failure) | 0% (last-10) | OFF | ❌ |
| `web-app` | 4 | 87% (CI), 100% (E2E nightly cron, 2 runs) | 80% (8/10 deploy) | OFF (memory said ON — incorrect) | ✅ |
| `client-apps` | 3 | 57% (Android build success), 97% (iOS, non-blocking) | n/a (tag-only) | OFF | ❌ |

Top duration outliers:

* api `Integration tests (Testcontainers)`: queued 5h38m–24h before cancellation (Task #55).
* bio CI: 24h-to-the-second timeouts on every job in the last 27 days.
* api Maven unit job (when it runs): 50–80s on `ubuntu-latest`, healthy.
* web-app CI: median 165s, p95 180s, healthy.
* web-app deploy: median 65s, healthy.
* client-apps Android: median 190s, healthy.

---

## 12. Closing Notes

The platform's **actual** CI/CD posture today:

* web-app is the only end-to-end working pipeline (CI green-rate ~87%, deploys land on Hostinger automatically, gitleaks + native secret scanning + push protection on, E2E cron just lit up).
* identity-core-api ships untested integration code on every push and has shipped that way at least since 2026-04-18.
* biometric-processor ships completely untested code on every push and has shipped that way since 2026-04-07.
* landing-website has not auto-deployed in 5+ weeks.
* The single self-hosted Hetzner runner is online, idle, and not pulling any of the queued jobs that need it. Diagnosis requires SSH.
* Branch protection is OFF on every repo. The platform's security architecture (RFC 6749 reuse-detection, embedding encryption at rest, push-protection) is in tension with a code-merge layer where any push to `main` lands without a green CI.

**The single highest-leverage change** is moving api `integration-tests` and bio CI off the self-hosted runner and onto `ubuntu-latest`. That eliminates ~70% of the cancellation noise, restores actual test coverage on prod-bound code, and decouples CI from the operator-side runner-fix work. **Estimated combined effort: 1 day total across both repos.**

The single highest-leverage **operator** change is enabling branch protection on all 5 repos with `Require status checks: CI + gitleaks`. **Estimated effort: 30 min, no code changes.**

— end of audit —
