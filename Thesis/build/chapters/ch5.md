# 5. SOFTWARE TESTING

A multi-tenant biometric authentication platform earns trust in two ways: through the
discipline of its engineering and the evidence of its tests. Chapter 4 reported how
FIVUCSAS was built; this chapter reports how we convinced ourselves that it works, and how
a graduation committee, an auditor, or a future maintainer can convince themselves of the
same.
Testing a system like this is unusually demanding. It spans five programming languages and
five test technologies, and it must exercise cryptographic protocols (OAuth 2.0, OIDC, JWT),
relational and vector data stores, asynchronous machine-learning pipelines, real-time
WebSocket proctoring, and a security property, multi-tenant data isolation, whose failure
would be both catastrophic and silent. We therefore treated testing not as an afterthought
bolted on at the end but as a first-class artifact developed alongside the code, wired into
continuous integration, and gated against regression on every pull request.

Throughout, the chapter separates what was *authored* from what was *executed*. We counted
tests by grepping the canonical source trees rather than trusting summary tables, and we
distinguish test-method counts from file counts and CI-executed counts from authored counts.
Where a number is a *target* rather than a *measured* result, as with most load-test
thresholds, we say so. For the most marketing-prone part of the system, the anti-spoofing
evaluation, we report only what was actually measured against the ISO/IEC 30107-3 metric
definitions [CITE:iso30107-3].

## 5.1 Testing Strategy and Levels

FIVUCSAS adopted the classic test pyramid, adapted for a polyglot microservice system. A
broad base of fast, isolated **unit tests** verifies individual classes, functions, and React
components without external dependencies. Above it, a narrower band of **integration tests**
exercises the seams (service-to-database, service-to-cache, service-to-service) against real
backing stores rather than mocks, and a still narrower layer of **end-to-end (E2E) tests**
drives the real browser through complete user flows. Specialized **performance** and
**security** suites sit on top, validating the non-functional requirements: latency,
throughput, isolation, and vulnerability posture. Table 5.1 summarizes each level: its
scope, its tooling, and its coverage intent.

[[TABLE: Test strategy, scope, tooling, and coverage intent by level]]

| Test level | Scope | Tools | Coverage intent |
|---|---|---|---|
| Unit | Individual classes, functions, components | JUnit 5, pytest, Vitest | Domain & application logic, line/branch coverage gate |
| Integration | Service ↔ database, ↔ cache, ↔ service | Testcontainers [CITE:testcontainers], pytest, Spring context | API contracts, persistence, transactional behavior |
| End-to-end | Full user flows in a real browser | Playwright [CITE:playwright] | Critical paths (login, MFA, enrollment, verification, CRUD) |
| Architecture | Hexagonal boundary rules | ArchUnit | Layering, no-leak invariants, WebAuthn write boundary |
| Performance / load | Latency, throughput, stress, spike | k6 [CITE:k6] | Non-functional requirement targets |
| Security | Vulnerability, secrets, isolation | Bandit, pip-audit, gitleaks, Dependabot, isolation ITs | OWASP Top 10 surface [CITE:owasp-top10], no cross-tenant leak |

The guiding principle was **defense-in-depth in the test suite itself**. The most
security-critical property of the platform (that one tenant can never read, write, or even
detect another tenant's data) is not verified at a single level but at three: an ArchUnit
boundary test freezes the rule that domain code never bypasses the tenant filter; unit tests
exercise the filter logic in isolation; and a set of named Testcontainers integration tests
(`CrossTenantIsolationIT`, `TenantSwitcherIsolationIT`, and others) prove the property
end-to-end against a real PostgreSQL instance. Crucially, the continuous-integration pipeline
does not merely *run* those isolation tests; it parses the JUnit surefire XML afterward and
**asserts that they actually executed**, a guard we added specifically because a silently
skipped security test is worse than no test at all.

A second principle was **realism at the seams**. Spring Boot's testing support makes it easy
to mock a repository, but a mock cannot reproduce a Flyway migration, a pgvector cosine
operator, a Redis `SET … EX NX` race, or a Hibernate `@Filter` SQL rewrite. We therefore ran
integration tests against real backing services via Testcontainers (throwaway Docker
containers spun up per test run) so that the most subtle bugs, such as a migration that fails
on an empty pgvector extension or an off-by-one in a token bucket, surfaced in CI rather than
in production.

## 5.2 Test Environment and Tools

The test toolchain mirrors the production stack so that tests exercise the same runtime
behavior the platform actually relies on. The principal tools and their roles are listed
in Table 5.2.

[[TABLE: Test tooling per module, with role and execution environment]]

| Module | Primary test tool | Role | Where it runs |
|---|---|---|---|
| Identity Core API (Java 21) | **JUnit 5** + Spring Boot Test + **Testcontainers** + ArchUnit | Unit, integration, isolation, boundary | GitHub-hosted `ubuntu-latest`; Postgres+Redis via Testcontainers |
| Biometric Processor (Python 3.12) | **pytest** + httpx test client | Unit, integration, e2e, benchmark | `ubuntu-latest`; real `redis:7-alpine` + `pgvector/pgvector:pg16` services |
| Web dashboard / hosted login (React) | **Vitest** + React Testing Library | Unit & component | `ubuntu-latest`, Node 22 |
| Web E2E | **Playwright** [CITE:playwright] | Full-browser user flows | `ubuntu-latest` headless Chromium |
| Mobile / desktop clients (Kotlin) | **JUnit** (commonTest / androidTest / desktopTest) | Shared & platform logic | `ubuntu-latest` (+ `macos-latest`, `windows-latest` for platform builds) |
| Load / performance | **k6** [CITE:k6] | Scripted VU load, stress, spike | Ad-hoc against staging |
| Security (static / secrets / deps) | **Bandit**, **pip-audit**, **gitleaks** v8.21.2, **Dependabot** | SAST, CVE scan, secret scan, dep hygiene | CI on every push/PR |

Continuous integration ties these tools together, with each repository carrying its own
GitHub Actions workflows. The Identity Core API runs a two-job pipeline: a fast Maven unit job
(`mvn -B -ntp -T 2C test`, JDK 21 Temurin, with a JaCoCo coverage gate) and a slower
integration job (`RUN_INTEGRATION=true`, `mvn -Dtest='*IntegrationTest,*IT' verify`) that
brings up a real `redis:7-alpine` and a Testcontainers PostgreSQL. The latter retags
`pgvector/pgvector:pg16` as `postgres:16-alpine` so that Flyway's very first migration, which
installs the `vector` extension, succeeds against a database that actually has pgvector.
The biometric processor runs five jobs: Ruff lint plus format check (with mypy installed), a
unit-test job with coverage to Codecov, an integration-test job backed by real Redis and
pgvector services, a security job (Bandit static analysis plus a pip-audit CVE scan), and a
frontend build. The web app runs ESLint, a `tsc --noEmit` type check, the Vitest suite, a
production Vite build (with `SKIP_MODEL_FETCH=1` so CI does not download the ~12 MB card-detection model),
a separate code-quality job, and the Playwright E2E suite in its own workflow.

Two caveats about the test environment need stating. First, the heaviest integration
tests are **environment-gated by design**. The biometric processor's full machine-learning
lifespan tests are guarded behind `RUN_FULL_STACK_INTEGRATION=true` and
`RUN_PROCTORING_INTEGRATION=true`. On a lightweight CI runner that lacks the pinned,
digest-locked ONNX stack, they skip rather than segfault, and they run only inside the
production-equivalent Docker ML stack. The production host itself cannot execute the Java
Testcontainers integration tests, because its sandboxed deploy shell has no Docker socket, so
those tests are verified through GitHub-hosted CI instead. Second, the Identity API
integration gate had a documented history of test-infrastructure rot, and during the project's
most intense authentication-hardening sprint a small number of pull requests were merged with
an administrator override while that gate was being repaired. We record this instead of
concealing it: the gate has since had its `continue-on-error` escape hatch removed, so a failing
isolation test now blocks an ordinary merge, with any administrator override leaving a documented
trail. The gate's trustworthiness was being *restored*, not taken
for granted.

## 5.3 Unit Testing

Unit testing is the broad base of the pyramid and the bulk of the authored test corpus. The
counts below were obtained by grepping the canonical source trees (counting `@Test`
annotations, `def test_` functions, and `it()`/`test()` blocks), with throwaway worktrees,
build directories, and duplicated scratch copies excluded. They are *authored* method counts,
not *passing* counts, because some tests are environment-gated or marked skip/xfail at runtime.

In the **Identity Core API**, we authored **1,595 `@Test` methods across 179 test files**, all
under `src/test/java`, with no stray tests in the main source set. A further **22
`@ParameterizedTest` methods** each expand into several executed cases at runtime, so the true
executed count exceeds 1,595. These tests mix pure unit tests over domain and application
logic, Spring-context tests, Testcontainers integration tests, and ArchUnit boundary tests.
The unit-level work concentrates on the security-sensitive logic that is hardest to get right
and most dangerous to get wrong: password hashing with bcrypt
[CITE:bcrypt], JWT issuance and validation including issuer/audience checks [CITE:jwt-rfc7519],
the multi-method MFA dispatcher, TOTP used-code replay prevention, the OAuth 2.0 / PKCE
authorization-code machinery [CITE:oauth2-rfc6749,pkce-rfc7636], and the Bucket4j rate-limiter.
A full execution of this suite shortly before submission (JDK 21, `mvn -o test`, 2026-06-07)
finished green: **1,670 tests run, 0 failures, 0 errors, 67 skipped**. The skipped cases are
the Docker-gated Testcontainers integration tests, and the executed count exceeds the authored
method count because parameterized tests expand at runtime.

In the **biometric processor**, we authored **888 `def test_` functions across 68 test
files**. By directory these break down as 683 unit tests, 167 integration tests, 22 e2e tests,
10 benchmarks, and 6 manual tests. The unit suite covers the algorithm-level building blocks:
the eye-aspect-ratio and mouth-aspect-ratio computations that drive the Biometric Puzzle
[CITE:soukupova2016-ear], cosine-similarity comparison over L2-normalized embeddings, the
texture/moiré/frequency/color liveness scoring, the MRZ TD1/TD3 parser, and the eMRTD
passive-authentication crypto. A representative bare-host CI baseline recorded **647 passed,
1 skipped, and 1 xfailed** in `tests/unit/`, and **50 passed with 111 skipped** in
`tests/integration/`; the skipped integration tests are the ML-lifespan and full-stack cases
that run only inside the Docker ML stack. The gap between the 888 authored and the roughly 700
executed on a bare host is therefore deliberate, not a sign of neglect.

In the **web dashboard and hosted login**, we authored **1,025 Vitest cases across 105 test
files** using Vitest with React Testing Library. These verify React hooks (face detection,
quality scoring, challenge state), API-client error handling, i18n string coverage in both
English and Turkish, and the authentication-flow builder UI logic.

In the **Kotlin Multiplatform clients**, we authored **561 `@Test` methods across 64 test
files**: 489 in the shared `commonTest` set, 30 Android instrumented tests, 25 in
`desktopTest`, and 17 Android JVM unit tests. Table 5.3 consolidates the inventory. The
shared `commonTest` set exercises the cross-platform domain layer once and reuses it across
Android and desktop targets.

[[TABLE: Final grep-verified authored automated test inventory per module (confirming the planned inventory of §3.2.4)]]

| Module | Tool | Files | Authored test cases |
|---|---|---|---|
| Identity Core API | JUnit 5 | 179 | 1,595 (+22 parameterized) |
| Web dashboard (unit/component) | Vitest | 105 | 1,025 |
| Web dashboard (E2E) | Playwright | 28 | 336 |
| Mobile / desktop clients | Kotlin / JUnit | 64 | 561 |
| Biometric processor | pytest | 68 | 888 |
| **Total** | | **444** | **≈ 4,405 authored** |

The headline figure for the thesis is therefore **approximately 4,400 authored automated test
cases across five test technologies**, materially higher than the "~1,800+" figure that appears
in an older internal summary. We report the verified, grep-derived figure because it is the
accurate one: the older summary counted only a subset and predates later test growth.

## 5.4 Integration Testing

Integration tests verify the seams between components against real infrastructure rather than
test doubles, on the principle that the subtlest and most expensive bugs live where two
technologies meet. The Identity Core API's integration layer runs against a real PostgreSQL 16
database with pgvector (provisioned by Testcontainers [CITE:testcontainers] from the
`pgvector/pgvector` image; production runs PostgreSQL 17) and a real Redis instance. This matters because several of the
platform's behaviors cannot be faithfully mocked: a Flyway migration that installs and depends
on the pgvector extension; the Hibernate `@Filter(tenantFilter)` SQL rewrite that enforces
tenant isolation; the Redis-backed token bucket whose correctness depends on atomic
increments; and the `SET key 1 EX NX` marker that prevents TOTP code replay within a time
step. Each of these was exercised end-to-end in an integration test so that a regression
surfaces in CI rather than in production.

The biometric processor's integration suite (167 authored tests) verifies the FastAPI route
handlers against a real pgvector database and Redis, including the enroll → store → verify
round-trip on the `face_embeddings` table with its IVFFlat cosine index, the
embedding-cipher store-of-record path (Fernet-encrypted `embedding_ciphertext` alongside the
plaintext search vector), and the voice enrollment centroid computation. The heaviest
machine-learning integration tests, those that actually load TensorFlow, DeepFace, and the
UniFace MiniFASNet ONNX model, are gated behind `RUN_FULL_STACK_INTEGRATION=true` and run
only inside the pinned Docker ML stack, because a floating-dependency rebuild was found to
segfault the ONNX preload under the hardened `read_only` + `cap_drop` runtime.
Table 5.4 lists representative integration and isolation test cases.

[[TABLE: Representative integration and isolation test cases]]

| Test ID | Category | Description | Expected result |
|---|---|---|---|
| TC-INT-001 | Persistence | User created via API persists across Flyway-migrated schema | Row present, tenant_id set |
| TC-INT-002 | pgvector | Enroll then 1:1 verify same face | Cosine distance < threshold, `verified=true` |
| TC-INT-003 | pgvector | 1:N search returns enrolled identity | Match within capped distance |
| TC-INT-004 | Redis | TOTP code reused within same time step | Second attempt rejected (replay marker) |
| TC-INT-005 | Redis | Rate-limit bucket exhausted | HTTP 429 after burst |
| TC-ISO-001 | Multi-tenancy | Query tenant A's user under tenant B scope | Not visible (404 / empty) |
| TC-ISO-002 | Multi-tenancy | 1:N face search scoped to caller's tenant | No cross-tenant candidates |
| TC-ISO-003 | Multi-tenancy | Tenant switcher cannot leak foreign data | Isolation preserved |

The cross-tenant isolation integration tests are both the most important and the most actively
guarded in the suite. The CI pipeline runs them, then parses the surefire XML and asserts that
`CrossTenantIsolationIT`, `TenantSwitcherIsolationIT`, `IdentityBiometricConsentIT`,
`IdentityBackfillIT`, and `RoleUnificationBackfillIT` each actually executed. A failing
isolation test now blocks an ordinary pull-request merge, and the `continue-on-error` escape
hatch that once allowed them to be skipped quietly was removed (§5.2 records the
administrator-override history).

## 5.5 End-to-End Testing

End-to-end tests close the loop by driving a real headless browser through complete user
flows, exercising the React front-end, the hosted OIDC login page, the Identity API, the
biometric processor, PostgreSQL, and Redis as one integrated system. We used Playwright
[CITE:playwright] for this layer because of its reliable auto-waiting, multi-browser support,
and tight integration with the React/TypeScript toolchain. The suite comprises **336
`test(...)` cases across 28 spec files** in `web-app/e2e/`.

The E2E coverage is broad and maps directly onto the platform's critical paths: login
(including the extended and MFA variants), forgot/reset password, the full CRUD lifecycles for
users, tenants, and roles, biometric enrollment and per-user enrollment, NFC enrollment, face
and voice search, the verification flows together with session and dashboard state, the
authentication-flow builder, multi-step authentication, device and session management, audit-log
browsing, analytics, settings, navigation, card detection, and dedicated visual-audit and smoke
suites. The test cases named in Table 5.5 are representative of the authentication and verification
flows that the committee will recognize as the product's spine.

[[TABLE: Representative end-to-end (Playwright) test cases]]

| Test ID | Category | Description | Expected result |
|---|---|---|---|
| TC-AUTH-001 | Authentication | Valid login with correct credentials | 200 OK, JWT access + refresh issued |
| TC-AUTH-002 | Authentication | Login with invalid password | 401 Unauthorized |
| TC-AUTH-003 | Authentication | Login to locked account | 423 Locked |
| TC-AUTH-004 | Authentication | Token refresh with valid refresh token | 200 OK, new token pair |
| TC-AUTH-005 | Authentication | Token refresh with revoked token | 401 Unauthorized |
| TC-MFA-001 | MFA / step-up | Password + TOTP second factor | Step-up satisfied, session elevated |
| TC-MFA-002 | MFA / step-up | QR cross-device sign-in | Session bound to scanned device |
| TC-USER-001 | User management | Create user with valid data | 201 Created |
| TC-USER-002 | User management | Create user with duplicate email | 409 Conflict |
| TC-RBAC-001 | Authorization | Access with sufficient permissions | 200 OK |
| TC-RBAC-002 | Authorization | Access with insufficient permissions | 403 Forbidden |
| TC-VER-001 | Verification | Enrolled user passes liveness + face match | Verified, access granted |

These end-to-end tests are the closest automated proxy we have for a real user's experience,
and several genuine defects surfaced through them. An async login-config race that briefly
blanked the hosted login page, and a default-flow 500 in the flow builder, were both caught by
a browser-level test before reaching production. The lesson, consistent with the project's own
engineering retrospectives, is that green unit tests are necessary but not sufficient: more
than one bug survived a large green unit suite and was exposed only by driving the real
product, which is why the E2E layer exists.

## 5.6 Performance and Load Testing

Performance testing was conducted with **Grafana k6** [CITE:k6], the project's maintained
load-testing tool.[^locust] The `load-tests/` suite consists of a global configuration of
thresholds, shared authentication and biometric helper modules, and **six scenarios**:
`auth-load-test.js`, `enrollment-load-test.js`, `verification-load-test.js`,
`multi-tenant-load-test.js`, `stress-test.js`, and `spike-test.js`. The load patterns ramp to
200 virtual users in the authentication and verification scenarios, climb as high as 1,500 in
the stress scenario, and use a 20×-baseline burst in the spike scenario.

The status of the numbers attached to these scenarios must be stated plainly. The per-scenario
thresholds encoded in the k6 configuration are **targets derived from the non-functional
requirements, not measured production benchmarks**; Table 5.6 records them with that caveat.

One measured snapshot does exist. During the June 2026 poster evaluation we timed the deployed
service from a client: end-to-end 1:1 face verification completed in roughly 410 ms at the 95th
percentile (median about 380 ms, P99 about 450 ms), an authentication round-trip in roughly
66 ms, and the JWKS document fetch in roughly 62 ms, all against the production CX43 host
(8 vCPU, no GPU). These are spot measurements under light load rather than a sustained k6
campaign, but they sit inside the latency targets of Section 2.2 (login p95 under 300 ms, token
refresh under 200 ms, verification under 500 ms) at the percentiles that matter; the measured
66 ms authentication round-trip sits well inside both the login and refresh budgets.

[^locust]: Locust was evaluated early in the project and superseded by k6; we cite k6 as the
maintained load-testing tool.

[[TABLE: k6 load-test thresholds (NFR targets, not measured production results)]]

| Scenario / operation | Threshold (target) | Nature |
|---|---|---|
| Login | p95 < 300 ms | Target |
| Token refresh | p95 < 200 ms | Target |
| Enrollment (ML-bound) | p95 < 2000 ms | Target |
| Verification | p95 < 500 ms, p99 < 1000 ms | Target |
| Overall failure rate | < 1 % | Target |
| Multi-tenant isolation | 0 isolation violations | Target / asserted |

The position for the thesis is therefore clear: the load-testing *harness* is real, scripted,
and runnable, and its thresholds encode the latency and reliability budgets the system was
designed to meet, but a full instrumented production benchmark run with published percentile
distributions remains future work. The capacity figures that appear in the parent deployment
descriptor ("1000+ concurrent users, ~120 enrollments/sec, p95 < 500 ms") are likewise **design
estimates** carried in a compose-file header, and we do **not** present them as measured results.
The one threshold that is more than a target is the multi-tenant scenario's assertion of zero
isolation violations, which aligns with the isolation property that the integration ITs verify
independently.

One architectural ceiling bounds all of these numbers: the entire production system runs on a
single CPU-only Hetzner CX43 (8 vCPU, 16 GB RAM, no GPU). This constraint shaped the model
choices (every model is CPU-safe) and limits the achievable throughput. The parent compose's
two-replica, read-replica HA layout is a scaling plan, not the live single-VPS deployment, and
horizontal scaling under Kubernetes is named as future work in Chapter 7.

## 5.7 Security Testing

Security testing for FIVUCSAS combines automated CI gates with security-invariant tests, and
we are careful to separate what is *implemented and enforced* from what is *documented intent*.
The implemented, CI-enforced security testing comprises four automated tools plus the
isolation integration tests:

- **Bandit** runs as a static application security testing (SAST) pass over the Python
  codebase (`bandit -r app/ -ll`) in the biometric processor's CI security job, flagging unsafe
  patterns such as insecure deserialization, shell injection, and weak cryptographic usage.
- **pip-audit** scans the Python dependency tree for known CVEs in the same job.
- **gitleaks** v8.21.2 runs on every push and pull request for both the Identity API and the
  web app, scanning the full git history (`fetch-depth: 0`); it is the authoritative secrets
  gate, and the team treats a gitleaks finding as the real blocker even when other scanners
  produce false positives on cryptographic pseudocode.
- **Dependabot** runs weekly, grouped, to keep dependencies patched.
- The **cross-tenant isolation Testcontainers ITs** function as security-invariant gates:
  they are required by branch protection on Identity API pull requests and
  asserted-to-have-executed whenever the integration lane runs (documented administrator
  overrides occurred while the lane was being repaired, §5.2), making multi-tenant data
  isolation a continuously re-verified guarantee backed by a
  defense-in-depth Hibernate `@Filter(tenantFilter)` on the tenant-scoped entities.

The reference framework for the threat model is the **OWASP Top 10** and the OWASP API
Security Top 10 [CITE:owasp-top10]; the security architecture document maps the platform's
controls onto those categories. One gap between plan and implementation must be flagged
plainly. The original test plan listed OWASP ZAP and Snyk for dynamic scanning and Trivy/Clair
for container scanning, alongside annual penetration testing. In the shipped pipelines, there
is **no automated OWASP ZAP, Snyk, or Trivy job** wired into GitHub Actions; the implemented
automated security testing is the Bandit + pip-audit + gitleaks + Dependabot + isolation-IT
combination above, while ZAP/Snyk/Trivy and annual penetration testing remain documented
aspirations and manual practices rather than CI-enforced gates. We label them accordingly so
that no reader mistakes intent for implementation; Table 5.7 records the split.

[[TABLE: Implemented (CI-enforced) versus documented-intent security testing]]

| Control | Tool | Status |
|---|---|---|
| Python SAST | Bandit | Implemented (CI) |
| Python dependency CVE scan | pip-audit | Implemented (CI, report-only) |
| Secret scanning | gitleaks v8.21.2 | Implemented (CI, full history) |
| Dependency update hygiene | Dependabot | Implemented (weekly) |
| Cross-tenant isolation gate | Testcontainers ITs | Implemented (required + asserted) |
| Dynamic app scanning (DAST) | OWASP ZAP | Documented intent (not CI-wired) |
| SCA / container scanning | Snyk / Trivy | Documented intent (not CI-wired) |
| Penetration testing | Manual / external | Documented intent (annual) |

Beyond automated tooling, several authentication-bypass and spoofing concerns were addressed
at the design and test level. The platform enforces server-side authentication decisions: the
browser is treated as untrusted, so the client-side geometry embedding is recorded log-only and
never used for an auth decision. JWTs carry validated issuer and audience claims; refresh tokens
are revocable via a Redis blacklist; the admin surfaces (Swagger, actuator) are IP-allowlisted
at the edge; and rate limiting plus per-IP `X-Forwarded-For` hardening close a
credential-stuffing and rate-limit-bypass surface.

## 5.8 Biometric and Liveness Experimental Evaluation

The biometric and liveness subsystem is the project's research-facing core, and it is also
where the temptation to over-claim is greatest. This section reports the anti-spoofing and
liveness evaluation carefully: it describes the evaluation apparatus, states which metrics were
implemented to the relevant standard, and reports only what was actually measured,
distinguishing targets from measured results throughout.

### 5.8.1 Presentation Attack Detection metrics and the evaluation harness

Anti-spoofing is, in the language of the international standard, **Presentation Attack
Detection (PAD)**, and the correct way to report it is with the metrics defined in ISO/IEC
30107-3 [CITE:iso30107-3]:

- **APCER** (Attack Presentation Classification Error Rate): the proportion of *attack*
  presentations (printed photos, screen replays, masks) wrongly classified as *bona fide*.
- **BPCER** (Bona-fide Presentation Classification Error Rate): the proportion of *genuine*
  presentations wrongly classified as *attacks* (the false-reject side that frustrates real
  users).
- **ACER** (Average Classification Error Rate): their mean, `ACER = (APCER + BPCER) / 2`.
- **EER** (Equal Error Rate) and the operating-point pairs `FAR@FRR` / `FRR@FAR`.

[[EQ: ACER]]
$ \mathrm{ACER} = \dfrac{\mathrm{APCER} + \mathrm{BPCER}}{2} $

These metrics are **implemented in code** in the `spoof-detector`
library (`src/metrics/iso30107.py`), which computes `apcer`, `bpcer`, `acer`, `eer`,
`far_at_frr`, and `frr_at_far`, complete with bootstrap confidence intervals. This means the
evaluation harness exists and produces standard-conformant numbers when fed a labeled dataset.

### 5.8.2 The amispoof analyzer pipeline under evaluation

The system under test is the FIVUCSAS anti-spoofing pipeline, exposed for live experimentation
as **amispoof**, an in-browser anti-spoofing tester deployed at `amispoof.fivucsas.com` and
built from the TypeScript port of the `spoof-detector` library (onnxruntime-web with a WebGPU
and Web Worker pool). The pipeline is a layered, multi-signal design. The Python library ships
**13 analyzers** (among them `MiniFASNetAnalyzer`, `TextureAnalyzer`, `MoireAnalyzer`,
`ScreenReplayAnalyzer`, `ScreenFlickerAnalyzer`, `TemporalAnalyzer`, `RPPGAnalyzer`,
`BlinkAnalyzer`, `MicroTremorAnalyzer`, and a `DeviceBoundaryAnalyzer`); the browser port
extends this to **26 analyzers** with browser-only signals such as flash-reflection, gaze,
expression-dynamics, and 3-D pose-consistency detectors. A `HybridFusionEvaluator`
fuses the strongest signals (a weighted combination of the pretrained MiniFASNet model
[CITE:minifasnet], a flash-response cue, a moiré-pattern cue, and a device-replay cue) and
declares a presentation a spoof when the fused score exceeds a decision threshold of **0.45**.
A multi-class fuser maps signals onto a spoof taxonomy (`REAL`, `STATIC_IMAGE`, `VIDEO_REPLAY`,
`MASK_3D`, `HEAVY_MAKEUP`, `AR_FILTER`, `DEEPFAKE_INJECT`). A distinctive design choice is the
`LivenessProver`, which operates on a "guilty until proven innocent" basis: a session begins
classified as a spoof, and the subject must accumulate passive (and optionally active-challenge)
evidence until the score reaches 60, at which point liveness is considered proven.

When this pipeline is wired into the production `/verify` and `/enroll` endpoints, the
always-on path is the UniFace MiniFASNet passive-liveness gate plus a single-frame EAR veto
(rejecting both-eyes-closed photo signals at an EAR threshold of 0.18), with the full fusion
layers opt-in behind feature flags. Critically, the entire anti-spoofing pipeline is
**fail-soft**: every layer is wrapped in exception handling so that an anti-spoofing bug can
never hard-block a legitimate user by raising, a deliberate availability-over-strictness
trade-off. Table 5.8 lists representative biometric and liveness test cases.

[[TABLE: Representative biometric and liveness test cases]]

| Test ID | Category | Description | Expected result |
|---|---|---|---|
| TC-BIO-001 | Face detection | Valid face image | Face detected with coordinates |
| TC-BIO-002 | Face detection | Image without a face | No-face-detected error |
| TC-BIO-003 | Quality | High-quality image | Quality score above threshold |
| TC-BIO-004 | Quality | Blurry image | Quality score below threshold (Laplacian variance low) |
| TC-BIO-005 | Enrollment | Valid enrollment | Embedding stored (encrypted + indexed) |
| TC-BIO-006 | Verification | Matching faces | Cosine distance below threshold (`verified=true`) |
| TC-BIO-007 | Verification | Non-matching faces | Cosine distance above threshold (`verified=false`) |
| TC-LIVE-001 | Liveness | Valid blink | EAR drop then re-open detected |
| TC-LIVE-002 | Liveness | Valid smile | MAR increase above ratio detected |
| TC-LIVE-003 | Liveness | Static photo attack | Presentation classified as spoof |

### 5.8.3 What Was Actually Measured and What Was Not

The unit and integration tests verify the **algorithmic behavior** of the liveness signals
directly: that the EAR computation registers a blink as a closed-then-open transition below
0.21, that the MAR computation registers a smile when the mouth-aspect ratio exceeds 0.4 with a
baseline ratio above 1.3, that the texture/moiré/frequency/color detector down-scores a flat,
screen-like presentation, and that a both-eyes-closed still frame triggers the EAR veto. These
behavioral assertions are real, automated, and passing. The browser port additionally carries
**276 Vitest cases** covering each analyzer, the pipeline assembler, the quality gates, and a
small CASIA-FASD micro-benchmark harness (`CasiaFasdMicroBench`).

What we do **not** report is a headline accuracy number for the fused system. An internal
learned-fuser experiment once produced a "100% accuracy / ACER 0.00%" figure on a 120-video
subset, and the number briefly surfaced in early promotional material. That result is
**unverified**, flagged internally for a reproducibility review before any use in a paper, and
we therefore do **not** cite it as an experimental result of this thesis; the final project
poster does not carry it either. The defensible statement is this: the ISO/IEC 30107-3
metric harness is implemented and capable of producing APCER/BPCER/ACER/EER (the metrics
defined in §5.8.1) with confidence intervals, the analyzer behaviors are verified by automated
tests, and the pipeline is deployed and demonstrable live at `amispoof.fivucsas.com`. But a
full, reproducible PAD benchmark on a standard public dataset (for example CASIA-FASD or a
Replay-Attack corpus), reported as measured APCER/BPCER/ACER with confidence intervals, is
**evaluation that is ongoing and is named as future work**. We prefer a smaller, defensible
claim to a larger, unverifiable one.

The face-verification behavior, by contrast, is concrete and grounded in the shipped
configuration. Verification compares L2-normalized Facenet512 embeddings [CITE:schroff2015-facenet]
by cosine *distance* (`distance = 1 − cosine similarity`) and declares a match when the
distance falls below the configured threshold: production `VERIFICATION_THRESHOLD = 0.4`,
relaxed to `0.55` for embeddings older than two years via an adaptive-threshold rule whose
validator enforces that the aged threshold is never stricter than the standard one (a guard
added after an earlier inversion bug). The 1:N search path uses the same cosine operator over a
pgvector ANN index (the migration-defined IVFFlat baseline, `vector_cosine_ops` with
`lists = 100`, upgraded operationally to HNSW on the deployed instance) [CITE:pgvector], with
cross-tenant search forbidden. These are the operating parameters of the deployed verifier.

The recognition model itself, as opposed to the fused anti-spoofing system, was measured in a
controlled benchmark whose headline figures also appear on the project poster. The evaluation
enrolled 1,342 face images across 100 identities and scored 12,062 verification pairs over
three public benchmarks. On LFW (5,600 pairs) the FaceNet-512 pipeline reached an AUC of
0.9943 with an equal-error rate of 1.93%; at a 0.45 distance threshold the false-accept rate
was 0.27% and the genuine-accept rate 95.6%. On CFP-FP (1,378 frontal-to-profile pairs) the
AUC was 0.9845, and on AgeDB-30, which pairs faces across a 30-year age gap, 0.9475. These are
controlled measurements on public datasets under our own preprocessing: they characterize the
discriminative power of the embedding model, not the end-to-end production service with its
liveness and quality gates, and we label them accordingly.

## 5.9 Multi-Tenant Isolation Testing

Multi-tenant isolation is the single most consequential security property of a SaaS identity
platform: a leak across the tenant boundary would expose one customer's users, biometric
enrollments, and audit trail to another. We therefore tested it more aggressively than any
other property, at three independent levels of the test suite.

At the **architecture level**, an ArchUnit boundary test freezes the rule that domain and
application code does not bypass the tenant-scoping mechanism: for instance, that code does
not directly import or mutate the raw `User` entity in ways that would escape the filter, and
that the WebAuthn write boundary is respected. At the **unit level**, the tenant-filter logic
and the tenant-scoped repository methods are tested in isolation. At the **integration level**,
the named Testcontainers ITs (`CrossTenantIsolationIT`, `TenantSwitcherIsolationIT`,
`IdentityBiometricConsentIT`, `IdentityBackfillIT`, and `RoleUnificationBackfillIT`) prove the
property end-to-end against a real PostgreSQL database with the Hibernate
`@Filter(tenantFilter)` active on the tenant-scoped entities.

The defining feature of this testing is the **meta-assertion in CI**: after running the
integration suite, the pipeline parses the surefire XML and asserts that those isolation tests
actually executed, failing the build if any was silently skipped. This guards against the most
insidious failure mode of all: a security test that is present in the repository, appears to
pass, but in fact never ran. The biometric processor's `/search` (1:N face search) and
`/voice/search` endpoints enforce the same tenant scoping at the data layer, and the k6
multi-tenant load scenario independently asserts zero isolation violations under concurrent
load. The property is thus verified statically, in isolation, in integration, and under load:
defense-in-depth applied to the test strategy itself, as Table 5.9 traces.

[[TABLE: Multi-tenant isolation verification across test levels]]

| Level | Mechanism | What it proves |
|---|---|---|
| Architecture | ArchUnit boundary rule | Domain code cannot bypass tenant filter |
| Unit | Filter / scoped-repository tests | Filter logic correct in isolation |
| Integration | `CrossTenantIsolationIT` et al. (Testcontainers) | No cross-tenant read/write on real DB |
| CI meta-gate | Surefire-XML execution assertion | The isolation tests actually ran |
| Load | k6 `multi-tenant-load-test.js` | Isolation holds under concurrency |

## 5.10 Results Summary and Discussion

The testing program produced a large, multi-technology, CI-integrated body of evidence. The
verified inventory is **approximately 4,405 authored automated test cases across 444 test
files in five technologies**: 1,595 JUnit 5 methods (plus 22 parameterized) in the Identity
Core API, 1,025 Vitest cases in the web dashboard, 336 Playwright E2E cases, 561 Kotlin
methods in the clients, and 888 pytest functions in the biometric processor. A large subset of
these runs on every continuous-integration pipeline; the heaviest machine-learning and
Testcontainers-dependent integration tests run inside the Docker ML and integration stacks
rather than on the lightweight CI runners, by deliberate design. The pipelines enforce coverage
gates (JaCoCo for Java, Codecov for Python), type and lint checks, and a security battery
(Bandit, pip-audit, gitleaks, Dependabot) on every change, and they treat cross-tenant
isolation as a non-negotiable, execution-asserted gate.

Two findings deserve emphasis. First, the project demonstrated empirically that **green unit
tests are necessary but not sufficient**: as §5.5 showed, real defects survived large green
unit suites and were caught only by end-to-end browser testing or by exercising the live
product. The E2E and integration layers proved essential; that is the
strongest practical lesson of the chapter. Second, the value of the
**execution-asserting CI gate** for security tests was borne out: parsing surefire output to
prove that isolation tests ran, rather than trusting a green checkmark, is a small piece of
test infrastructure with outsized assurance value.

Four limitations bound these results, each detailed earlier and drawn together here. The
Identity API integration gate passed through a period of test-infrastructure rot before being
hardened (§5.2); its skip escape hatch is now removed. The load-testing harness is real and
scripted, but its thresholds are NFR *targets* rather than measured benchmarks, and the
deployment descriptor's capacity figures are design estimates (§5.6). The dynamic- and
container-scanning tools named in early plans (OWASP ZAP, Snyk, Trivy) and annual penetration
testing are documented intent, not CI-wired controls (§5.7). And while the ISO/IEC 30107-3 PAD
metric harness [CITE:iso30107-3] is implemented and the liveness analyzer behaviors are
verified by automated tests, a full reproducible PAD benchmark on a standard public dataset
remains future work, and we do not adopt the unverified "100% accuracy" poster figure (§5.8.3).
Taken together, the evidence supports a confident but measured conclusion: FIVUCSAS is
extensively and reproducibly tested for its functional and isolation guarantees, while its
performance and PAD evaluation are scaffolded and partially measured, with the remaining
benchmarking work clearly scoped as future work in Chapter 7.
