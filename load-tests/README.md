# FIVUCSAS Load Testing Suite

Load / stress / spike testing for the FIVUCSAS platform using **Grafana k6**,
configured for an **external run** from your own PC against the public endpoint
`https://api.fivucsas.com`.

> **👉 Start here: [`RUN_GUIDE.md`](./RUN_GUIDE.md)** — exact install + run
> commands for the author's PC, profiles, result export, and how to read the
> thresholds. This README is the reference; the RUN_GUIDE is the walkthrough.

## ⚠️ Two things to know before you run

1. **Run it from your own PC, not the server.** The generator must be an external
   client; running it on the API's own host skews the numbers and risks prod. All
   defaults already point at `https://api.fivucsas.com`.
2. **Safe by default.** The default scenario (`public-read-load-test.js`) is
   read-only and needs no credentials. Everything that writes data or touches the
   (non-public) biometric processor is **OFF until you set `ALLOW_MUTATIONS=true`**.

## 📊 Scenarios

| Scenario | What it hits | Mutates? | Needs creds? | Runs externally? |
|----------|--------------|----------|--------------|------------------|
| `public-read-load-test.js` | OIDC discovery, JWKS, auth-health, auth-methods, login-config | No | No | **Yes (default)** |
| `auth-load-test.js` | `/auth/login` + `/auth/refresh` | Yes (audit + token rotation) | Yes | Yes (opt-in) |
| `enrollment-load-test.js` | biometric enroll | Yes | Yes | No (biometric host is internal) |
| `verification-load-test.js` | biometric verify | Yes | Yes | No (biometric host is internal) |
| `multi-tenant-load-test.js` | mixed, many tenants | Yes | Yes (pre-seeded) | No |
| `stress-test.js` | mixed (ramp to knee) | Yes | Yes | Partial |
| `spike-test.js` | mixed (sudden surge) | Yes | Yes | Partial |

All scenarios share **profiles** (`-e PROFILE=smoke|load|stress|spike`) and read a
configurable **`BASE_URL`** (default `https://api.fivucsas.com`). No secrets are
baked into the repo — credentials and client_id come from env only.

## 💻 Running from your laptop against prod (read this)

There is a one-command wrapper, **[`run.sh`](./run.sh)**, plus a full
end-to-end runbook at the repo root: **[`LOCAL_TESTING_RUNBOOK.md`](../LOCAL_TESTING_RUNBOOK.md)**
(covers k6 + every other component — web, API, biometric, Android).

```bash
cd FIVUCSAS/load-tests

# SAFE prod smoke — read-only public endpoints, NO credentials, ~1 min:
LOAD_PROFILE=smoke ./run.sh public-read https://api.fivucsas.com
```

What you need to know before pointing it at production:

- **Correct env vars** (NOT prefixed with `K6_`): `IDENTITY_API_URL` (or its
  preferred alias `BASE_URL`), `BIOMETRIC_API_URL`, `TEST_USER_EMAIL`,
  `TEST_USER_PASSWORD`, `CLIENT_ID`, `ALLOW_MUTATIONS`. (`config.js` reads these
  exact names — a `K6_` prefix is ignored.)
- **`LOAD_PROFILE`** is an accepted alias for `PROFILE`: `smoke` (default, safe),
  `load`/`full`, `stress`, `spike`. `smoke` is ~5 VUs / ~1 min and **relaxes the
  strict thresholds** so a quick prod check reports latency without exiting
  non-zero. If both `PROFILE` and `LOAD_PROFILE` are set, `PROFILE` wins.
- **You need a REAL prod test account** for any authenticated/mutating run. The
  placeholder `loadtest@example.com` does **not** exist on prod and will just
  return `401`. Use a disposable, password-only (no-2FA) admin/test user.
- **Only `auth` and `public-read` are reachable from outside.** The biometric
  processor (`enrollment`/`verification`/`multi-tenant` and the biometric half of
  `stress`/`spike`) has **no public route** — it is Docker-network-internal
  behind the API. Those scenarios can only run against a local/VPN stack.

> ## ⛔ SAFETY — never run `stress`/`spike` or any non-`smoke`/high-VU profile against prod
>
> Production is a single shared Hetzner CX43 (15 GiB / 8 cores) hosting ~23
> containers **and** a CI runner. Heavy external load self-DoSes the box, trips
> the per-IP login rate-limiter and fail2ban, and produces meaningless numbers.
> `run.sh` will **refuse** a non-`smoke` profile against `api.fivucsas.com`. Run
> heavy profiles against a **local or throwaway stack only.**

## 🚀 Quick Start

Full walkthrough (install per-OS, profiles, exports, thresholds) is in
[`RUN_GUIDE.md`](./RUN_GUIDE.md). The short version:

```bash
# 1. Install k6 on your PC
winget install k6            # Windows
brew install k6              # macOS
# (Linux: see RUN_GUIDE.md)

# 2. Safe default run — read-only, no credentials, against prod
cd FIVUCSAS/load-tests
k6 run -e PROFILE=smoke scenarios/public-read-load-test.js   # ~1 min sanity
k6 run -e PROFILE=load  scenarios/public-read-load-test.js   # ~6 min normal load

# 3. Export the summary for the thesis
k6 run -e PROFILE=load \
  --summary-export=results/public-read-load-$(date +%Y%m%d).json \
  scenarios/public-read-load-test.js
```

**Override the target** (default is `https://api.fivucsas.com`):
```bash
k6 run -e BASE_URL=https://api.fivucsas.com -e PROFILE=load scenarios/public-read-load-test.js
```

**Authenticated run** (opt-in — see RUN_GUIDE §4):
```bash
k6 run -e ALLOW_MUTATIONS=true \
  -e TEST_USER_EMAIL=... -e TEST_USER_PASSWORD=... \
  -e PROFILE=load scenarios/auth-load-test.js
```

**Using Docker** (read-only scenario):
```bash
docker run --rm -i -v "$(pwd):/tests" -w /tests \
  grafana/k6 run -e PROFILE=smoke /tests/scenarios/public-read-load-test.js
```

## 📁 Project Structure

```
load-tests/
├── RUN_GUIDE.md                    # 👉 START HERE — external-run walkthrough
├── README.md                       # This file (reference)
├── run.sh                          # one-command wrapper (LOAD_PROFILE=smoke ./run.sh auth <url>)
├── config.js                       # Targets, profiles, thresholds, safety flags
├── BASELINE_TESTING_GUIDE.md       # Local full-stack baseline guide (legacy)
│
├── scenarios/
│   ├── public-read-load-test.js   # SAFE default — read-only public endpoints
│   ├── auth-load-test.js          # login + token refresh (opt-in)
│   ├── enrollment-load-test.js    # biometric enroll (opt-in, internal host)
│   ├── verification-load-test.js  # biometric verify (opt-in, internal host)
│   ├── multi-tenant-load-test.js  # multi-tenant mix (opt-in)
│   ├── stress-test.js             # ramp-to-knee (opt-in, -e PROFILE=stress)
│   └── spike-test.js              # sudden surge (opt-in, -e PROFILE=spike)
│
├── utils/
│   ├── auth.js                    # login / refresh helpers
│   ├── biometric.js               # enroll / verify helpers (internal host)
│   └── guard.js                   # ALLOW_MUTATIONS opt-in guard
│
└── results/                        # commit write-ups here; raw *.json ignored
    ├── RESULT_TEMPLATE.md          # paste your k6 summary into a copy of this
    └── README.md
```

## 🎯 Test Scenarios

The **shape** of every run (VU count + duration) comes from the selected
**profile**, not from per-scenario hard-coded numbers — so the table below lists
*what each scenario exercises*, and the profile decides *how hard*. Pick the
profile with `-e PROFILE=...` (or `LOAD_PROFILE=...` for `run.sh`).

| # | Scenario | Exercises | Strict thresholds (non-smoke) | Externally runnable? |
|---|----------|-----------|-------------------------------|----------------------|
| 1 | `public-read-load-test.js` | OIDC discovery, JWKS, auth-health, auth-methods, login-config | `public_read_duration` p95<500ms, `http_req_failed` rate<1% | **Yes — default, no creds** |
| 2 | `auth-load-test.js` | `/auth/login` + `/auth/refresh` | `login_duration` p95<300ms, `token_refresh_duration` p95<200ms | Yes — opt-in, real creds |
| 3 | `enrollment-load-test.js` | biometric enroll | `enrollment_duration` p95<2000ms, success>95% | No — biometric host internal |
| 4 | `verification-load-test.js` | biometric verify | `verification_duration` p95<500ms / p99<1000ms | No — biometric host internal |
| 5 | `multi-tenant-load-test.js` | mixed across 20 tenants | `http_req_duration` p95<1000ms, `tenant_isolation_violations`==0 | No — biometric host internal |
| 6 | `stress-test.js` | mixed ramp-to-knee | degradation expected (`http_req_failed`<10%) | Partial (auth path only) |
| 7 | `spike-test.js` | mixed sudden surge | degradation expected (`http_req_failed`<15%) | Partial (auth path only) |

> **Smoke relaxes thresholds.** When `PROFILE=smoke` (the default), each
> scenario's strict latency/success thresholds are dropped and replaced by a
> single loose error-rate guard, so a tiny prod sanity run **reports** latency
> instead of exiting non-zero. The latency Trends are still collected and
> printed — they just aren't asserted. (`multi-tenant`'s
> `tenant_isolation_violations==0` correctness invariant is kept even in smoke.)

**Profile shapes** (defined once in `config.js`):

| Profile | VUs over time | ~Duration | Use for |
|---------|---------------|-----------|---------|
| `smoke` | 5 | ~1 min | sanity / prod-safe |
| `load` (= `full`) | 20 → 20 → 50 | ~6 min | normal sustained load |
| `stress` | 50 → 100 → 200 → 300 | ~7 min | find capacity knee (local only) |
| `spike` | 20 → **200** → 20 | ~4 min | sudden-surge resilience (local only) |

Run any scenario with the wrapper or k6 directly:
```bash
LOAD_PROFILE=smoke ./run.sh public-read https://api.fivucsas.com   # wrapper
k6 run -e PROFILE=load scenarios/public-read-load-test.js          # raw k6
```

## 📈 Analyzing Results

### Console Output

K6 provides real-time metrics in the console:

```
execution: local
    script: scenarios/auth-load-test.js
    output: -

scenarios: (100.00%) 1 scenario, 200 max VUs, 20m30s max duration

     data_received..................: 15 MB  50 kB/s
     data_sent......................: 8.0 MB 27 kB/s
     http_req_blocked...............: avg=1.2ms    p(95)=3.5ms
     http_req_duration..............: avg=245ms    p(95)=450ms
     http_req_failed................: 0.12%  ✓ 42       ✗ 35258
     http_reqs......................: 35300  117/s
     login_duration.................: avg=210ms    p(95)=380ms
     token_refresh_duration.........: avg=150ms    p(95)=250ms
     vus............................: 200    min=0      max=200
```

### JSON Output

Export results to JSON for detailed analysis:

```bash
k6 run --out json=results/test-results.json scenarios/auth-load-test.js
```

### Grafana Cloud

Stream results to Grafana Cloud for visualization:

```bash
# Set up Grafana Cloud token
export K6_CLOUD_TOKEN=your-token-here

# Run with cloud output
k6 run --out cloud scenarios/auth-load-test.js
```

### HTML Report

Generate HTML report using `k6-reporter`:

```bash
npm install -g k6-reporter
k6 run --out json=results/test-results.json scenarios/auth-load-test.js
k6-reporter results/test-results.json
```

## 🔧 Configuration

### Environment Variables

Pass via `-e KEY=VALUE` on the k6 command line (or shell exports). Nothing is
required for the default read-only run.

| Var | Default | Purpose |
|-----|---------|---------|
| `BASE_URL` | `https://api.fivucsas.com` | identity API target (preferred) |
| `IDENTITY_API_URL` | (alias of `BASE_URL`) | identity API target (config.js reads this exact name — NOT `K6_IDENTITY_API_URL`) |
| `PROFILE` | `smoke` | ramp shape: `smoke`/`load`/`stress`/`spike` (canonical) |
| `LOAD_PROFILE` | (= `PROFILE`) | alias used by `run.sh`; also accepts `full` (= `load`). `PROFILE` wins if both set |
| `ALLOW_MUTATIONS` | `false` | opt-in switch for write/biometric scenarios |
| `TEST_USER_EMAIL` | — | disposable test account (auth/mutating runs) |
| `TEST_USER_PASSWORD` | — | password for that account |
| `CLIENT_ID` | — | OIDC client_id (audit attribution + login-config) |
| `LOGIN_SHARE` | `0.05` | fraction of auth iterations that fully re-login |
| `BIOMETRIC_API_URL` | (= `BASE_URL`) | biometric host — internal only, not public |
| `TEST_IMAGE_BASE` | — | base URL for reachable test face images |

```bash
# Example: authenticated SMOKE run against prod (safe, ~1 min)
# Replace the email/password with a REAL disposable prod test account —
# loadtest@example.com does NOT exist on prod and will 401.
k6 run \
  -e BASE_URL=https://api.fivucsas.com \
  -e ALLOW_MUTATIONS=true \
  -e TEST_USER_EMAIL='your-real-test@account' \
  -e TEST_USER_PASSWORD='<the-real-password>' \
  -e CLIENT_ID=marmara-bys-demo \
  -e PROFILE=smoke \
  scenarios/auth-load-test.js
```

> **No secrets in the repo.** Credentials only ever come from these env vars.
> **`PROFILE=load` and above are for a local/throwaway stack, not prod.**

### Custom Thresholds

Edit `config.js` to adjust performance thresholds:

```javascript
thresholds: {
  http_req_duration: ['p(95)<500'],      // 95% < 500ms
  http_req_failed: ['rate<0.01'],        // < 1% failures
  enrollment_duration: ['p(95)<2000'],   // Enrollment < 2s
  verification_duration: ['p(95)<500'],  // Verification < 500ms
}
```

### Load Stages

Adjust load patterns in each scenario file:

```javascript
stages: [
  { duration: '2m', target: 50 },   // Ramp up to 50 VUs over 2 minutes
  { duration: '5m', target: 50 },   // Hold at 50 VUs for 5 minutes
  { duration: '2m', target: 100 },  // Ramp to 100 VUs
  { duration: '2m', target: 0 },    // Ramp down
]
```

## 🎯 Performance Baselines

Expected performance metrics for a properly configured system:

| Operation | Target | Threshold | Notes |
|-----------|--------|-----------|-------|
| Login | p95 < 300ms | p99 < 500ms | JWT generation |
| Token Refresh | p95 < 200ms | p99 < 400ms | Token rotation |
| Enrollment | p95 < 2000ms | p99 < 3000ms | Includes ML processing |
| Verification | p95 < 500ms | p99 < 1000ms | Embedding comparison |
| API Calls | p95 < 200ms | p99 < 500ms | General API operations |

**Throughput Targets**:
- Logins: 100-200 req/sec
- Token Refresh: 500-1000 req/sec
- Enrollments: 20-50 req/sec (ML-bound)
- Verifications: 100-200 req/sec

**Resource Limits**:
- Database connections: 50-100 concurrent
- Redis connections: 20-50 concurrent
- ML workers: 2-5 concurrent jobs

## 🐛 Troubleshooting

### Connection Refused

```
ERRO[0001] Connection refused
```

**Solution**: Confirm the target is reachable from your network:
```bash
# Public liveness (no auth needed) — should print {"status":"UP"} / 200
curl -i https://api.fivucsas.com/api/v1/auth/health

# OIDC discovery — should be 200 with an "issuer" field
curl -i https://api.fivucsas.com/.well-known/openid-configuration
```
If these fail from your PC but work elsewhere, it is a network/ISP-routing issue
to the Hetzner datacenter, not the test kit. See RUN_GUIDE.md §8.

### High Error Rate

```
http_req_failed: 45.2% ✗ 4520 ✓ 5480
```

**Solution**:
1. Check service logs for errors
2. Verify database connections not exhausted
3. Check Redis connectivity
4. Review ML worker capacity

### Slow Performance

```
http_req_duration: avg=5.2s p(95)=12s
```

**Solution**:
1. Add database indexes (see audit logs correlation_id)
2. Increase connection pool size
3. Add more ML workers
4. Enable Redis caching
5. Profile slow endpoints

## 📚 Additional Resources

- [FIVUCSAS Run Guide (start here)](./RUN_GUIDE.md)
- [FIVUCSAS Baseline Testing Guide (local full-stack)](./BASELINE_TESTING_GUIDE.md)
- [k6 Documentation](https://k6.io/docs/)
- [Load Testing Best Practices](https://k6.io/docs/testing-guides/test-types/)
- [Grafana Cloud k6](https://grafana.com/products/cloud/k6/)

## 🤝 Contributing

To add new test scenarios:

1. Create new file in `scenarios/`
2. Import utilities from `utils/`
3. Define `options` with stages and thresholds
4. Implement `setup()`, `default()`, and `teardown()`
5. Document in this README
6. Test locally before committing

## 📝 License

Copyright © 2025 FIVUCSAS. All rights reserved.
