# FIVUCSAS — Local Testing Runbook (run everything from your own PC)

One place that tells you, the owner, how to run every part of FIVUCSAS from your
own machine: the k6 load tests, the web-app test suite, the identity API tests,
the Python ML services, and the Android client. It assumes the components are
checked out as the usual git submodules (`web-app/`, `identity-core-api/`,
`biometric-processor/`, `spoof-detector/`, `client-apps/`).

> Companion docs:
> - `load-tests/RUN_GUIDE.md` + `load-tests/README.md` — full k6 walkthrough.
> - `load-tests/BASELINE_TESTING_GUIDE.md` — bringing up the full local stack.
> - `client-apps/docs/MOBILE_TESTING_GUIDE.md` — Android build/test in depth.
> - `OPERATOR_SECURITY_RUNBOOKS.md` — production / security operations.

---

## 0. Prerequisites

| Tool | Version | Needed for | Install |
|------|---------|-----------|---------|
| **Docker Desktop** (or Engine) | current | identity-core-api tests (Testcontainers); local full stack | docker.com / `apt install docker.io` |
| **Node.js + npm** | **22.x** | web-app (vitest, build, Playwright) | nvm: `nvm install 22 && nvm use 22` |
| **Java JDK** | **21** | identity-core-api; client-apps (Gradle) | Temurin 21 / SDKMAN |
| **Maven** | 3.9+ | identity-core-api (no `mvnw` wrapper in the repo) | `apt install maven` / SDKMAN |
| **Python** | 3.11+ | biometric-processor, spoof-detector (optional locally) | python.org / pyenv |
| **k6** | 0.47+ | load tests | `brew install k6` / `winget install k6` / apt |
| **Android Studio** (+ JDK 21) | latest | client-apps build + emulator/device | developer.android.com |
| **jq** | any | nicer `load-tests/run.sh` summaries (optional) | `apt install jq` / `brew install jq` |

You do **not** need all of these — install only what you intend to run. The fast
"is the platform alive" check (k6 prod smoke) needs only k6.

---

## 1. k6 load tests

The harness lives in `load-tests/`. **Default behaviour is safe.** Profiles are
selected by `PROFILE` / `LOAD_PROFILE`; the default is `smoke` (~5 VUs / ~1 min)
which relaxes the strict thresholds so a prod sanity run reports latency without
failing.

### 1a. Install k6 + go to the kit
```bash
brew install k6            # macOS
winget install k6          # Windows
# Linux: see load-tests/RUN_GUIDE.md §1
cd FIVUCSAS/load-tests
```

### 1b. The prod-safe smoke command (run this first)
Read-only public endpoints, **no credentials**, ~1 minute:
```bash
LOAD_PROFILE=smoke ./run.sh public-read https://api.fivucsas.com
```
`run.sh` writes a JSON summary into `results/` and prints the p95/p99/error
table. (Or raw k6: `k6 run -e PROFILE=smoke scenarios/public-read-load-test.js`.)

Authenticated smoke (login + token refresh). **Requires a REAL, disposable,
password-only prod test account** — the placeholder `loadtest@example.com` does
NOT exist on prod and returns `401`:
```bash
LOAD_PROFILE=smoke ALLOW_MUTATIONS=true \
  TEST_USER_EMAIL='your-real-test@account' \
  TEST_USER_PASSWORD='<the-real-password>' \
  CLIENT_ID='marmara-bys-demo' \
  ./run.sh auth https://api.fivucsas.com
```

### 1c. Full load needs a LOCAL stack
The `load`/`stress`/`spike` profiles are real load — point them at a **local or
throwaway** stack, not prod (`run.sh` refuses non-`smoke` against
`api.fivucsas.com`). Bring the stack up per `load-tests/BASELINE_TESTING_GUIDE.md`,
then e.g.:
```bash
LOAD_PROFILE=load ./run.sh auth http://localhost:8080
```

### 1d. Biometric is internal-only
`enrollment` / `verification` / `multi-tenant` (and the biometric half of
`stress`/`spike`) call the biometric processor, which has **no public route** —
it is reachable only on the internal Docker network with an `X-API-Key`. They
**cannot** run from an external client against prod; use a local stack
(`BIOMETRIC_API_URL=http://localhost:8000`) and supply your own face images via
`TEST_IMAGE_BASE` (there is no public test-image bucket).

> ### ⛔ SAFETY
> Production is a single shared Hetzner CX43 (15 GiB / 8 cores, ~23 containers +
> a CI runner). **Never run `stress`/`spike` or any non-`smoke`/high-VU profile
> against prod** — it self-DoSes the box, trips the per-IP login rate-limiter and
> fail2ban, and yields meaningless numbers. Smoke only against prod.

---

## 2. web-app (React / Vite / TypeScript)

From `web-app/` (Node 22):

```bash
cd web-app
npm ci

# Unit + component tests (vitest)
npm test                      # watch mode; CI uses: npm test -- --run
npm test -- --run             # one-shot, exits when done
npm run test:coverage         # with coverage

# Type-check + production build WITHOUT downloading the ML models
# (the prebuild step normally fetches Facenet/anti-spoof weights; skip it):
SKIP_MODEL_FETCH=1 npm run build
```

`SKIP_MODEL_FETCH=1` makes `scripts/fetch-models.mjs` skip the model download so
the build doesn't need network/model access (the bundle just ships without the
weights — fine for a type-check/CI build).

### Playwright end-to-end
```bash
npx playwright install        # one-time: browser binaries
npx playwright test           # e2e/ specs; defaults to https://app.fivucsas.com
E2E_BASE_URL=http://localhost:5173 npx playwright test   # against a local dev server
```
(`baseURL` defaults to `https://app.fivucsas.com`; override with `E2E_BASE_URL`.)

---

## 3. identity-core-api (Spring Boot / Java 21 / Maven)

**Requires Docker running** — the integration tests use Testcontainers
(PostgreSQL/Redis spun up as containers). There is no `mvnw` wrapper, so `mvn`
must be on your PATH.

```bash
cd identity-core-api
mvn -q test                   # unit + integration (Docker must be up)
mvn -q -DskipITs test         # unit only, skip Testcontainers integration tests
mvn -q package -DskipTests    # build the jar without tests
```

> The Testcontainers integration gate is being greened separately; if it is red
> for reasons unrelated to your change, run `-DskipITs` for a quick unit pass and
> note it. Do not assume green unit tests mean the integration path works.

---

## 4. biometric-processor / spoof-detector (Python / pytest)

Heavy ML dependencies (torch, onnxruntime, face libs). **CI covers these — local
runs are optional** and mainly useful when changing the Python services. Use a
virtualenv so the big deps don't pollute your system Python.

```bash
# biometric-processor
cd biometric-processor
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pytest -m unit                 # fast unit tests only
pytest                         # all (integration tests need a DB; see pytest.ini markers)
deactivate

# spoof-detector
cd spoof-detector
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pytest                         # tests/ (analyzers, domain, session)
deactivate
```

Markers (`pytest.ini`): `unit`, `integration` (needs DB), `e2e`, `slow` (model
loading). `pytest -m "unit and not slow"` is the quickest signal.

---

## 5. client-apps (Android / Kotlin / Gradle)

Full detail is in **`client-apps/docs/MOBILE_TESTING_GUIDE.md`**. Short version:

- Needs **JDK 21** and a **`google-services.json`** (gitignored — copy it into
  `client-apps/app/` from your secure store before building).
- Unit tests run on the host (no emulator needed):
  ```bash
  cd client-apps
  ./gradlew testDebugUnitTest
  ```
- The host can **compile and unit-test** Android, but **cannot run an emulator**
  (no KVM on the build server). For anything that needs a running app —
  especially **login** — install the APK on a **real device**. Build a debug APK:
  ```bash
  ./gradlew assembleDebug      # app/build/outputs/apk/debug/
  ```

---

## 6. Quick reference — "just run the tests"

| Component | One-liner | Needs |
|-----------|-----------|-------|
| Load (prod smoke) | `cd load-tests && LOAD_PROFILE=smoke ./run.sh public-read https://api.fivucsas.com` | k6 |
| web-app | `cd web-app && npm ci && npm test -- --run` | Node 22 |
| web-app build | `cd web-app && SKIP_MODEL_FETCH=1 npm run build` | Node 22 |
| web-app e2e | `cd web-app && npx playwright test` | Node 22 + browsers |
| identity API | `cd identity-core-api && mvn -q test` | Docker + Java 21 + Maven |
| biometric | `cd biometric-processor && pytest -m unit` | Python venv |
| spoof-detector | `cd spoof-detector && pytest` | Python venv |
| Android units | `cd client-apps && ./gradlew testDebugUnitTest` | JDK 21 + google-services.json |

> **Green unit tests ≠ a working product.** For anything user-facing, also drive
> the real GUI (browser for web, a real device for the Android app) and confirm
> persistence end-to-end — not just that the test suite is green.
