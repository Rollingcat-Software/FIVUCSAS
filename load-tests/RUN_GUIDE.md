# FIVUCSAS Load-Test Run Guide (external client)

This is the step-by-step guide for running the k6 load/stress/spike tests **from
your own PC** against the public endpoint `https://api.fivucsas.com`. The numbers
you collect here go into **thesis Chapter 5 (Performance)**.

> **Why from your own PC and not the server?**
> The API runs on a single shared Hetzner host. If you run the load generator
> *on that same host*, the generator and the service fight for the same CPU, RAM
> and network — so the latency numbers are wrong (skewed by self-contention) and
> you risk degrading the live box. The methodologically correct setup is an
> **external client** driving the public endpoint over the real network. That is
> exactly what this kit is configured for (defaults point at
> `https://api.fivucsas.com`). State this in the thesis: *"load was generated
> from an external workstation against the production HTTPS endpoint."*

> **Is load testing OK right now?** Yes — the demo is over and there are no real
> users (only the developers). Still, be considerate: **start with `smoke`, then
> `load`**, and only go to `stress`/`spike` deliberately. The profiles ramp; they
> do not nuke.

---

## 1. Install k6

### Windows (recommended: winget)
```powershell
winget install k6 --source winget
# or Chocolatey:
choco install k6
```

### macOS
```bash
brew install k6
```

### Linux (Debian/Ubuntu)
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

Verify:
```bash
k6 version       # expect v0.47.0 or later
```

Then get the repo onto your PC and `cd` into the kit:
```bash
git clone https://github.com/Rollingcat-Software/FIVUCSAS.git
cd FIVUCSAS/load-tests
```

---

## 2. The safe default run — public read path (NO credentials needed)

This is the scenario to run first and the one that needs nothing from you. It
exercises only **unauthenticated, read-only, public** endpoints (OIDC discovery,
JWKS, auth-health, auth-methods catalog, public login-config). It writes **no
data** and is **not** subject to the login rate-limiter.

```bash
# Smoke (≈1 min, 5 VUs) — prove it works end-to-end
k6 run -e PROFILE=smoke scenarios/public-read-load-test.js

# Load (≈6 min, 20→50 VUs) — the headline "normal load" number
k6 run -e PROFILE=load scenarios/public-read-load-test.js

# Stress (≈7 min, ramp to 300 VUs) — find the knee of the curve
k6 run -e PROFILE=stress scenarios/public-read-load-test.js

# Spike (≈4 min, sudden 10x surge + recovery)
k6 run -e PROFILE=spike scenarios/public-read-load-test.js
```

`BASE_URL` defaults to `https://api.fivucsas.com`. To target staging or a local
stack instead:
```bash
k6 run -e BASE_URL=https://api.fivucsas.com -e PROFILE=load scenarios/public-read-load-test.js
```

---

## 3. Profiles (staged ramps)

Selected with `-e PROFILE=...`. Defined once in `config.js` and shared by every
scenario, so the same flag means the same shape everywhere.

| Profile  | Shape (VUs over time)                          | Duration | Use it for |
|----------|------------------------------------------------|----------|------------|
| `smoke`  | 5 VUs                                           | ~1 min   | sanity / "does it run" |
| `load`   | 20 → 20 → 50                                     | ~6 min   | normal sustained load |
| `stress` | 50 → 100 → 200 → 300                             | ~7 min   | find capacity knee |
| `spike`  | 20 → **200 (10x)** → 20                          | ~4 min   | sudden-surge resilience |

Default is `smoke` if `PROFILE` is omitted — so a bare `k6 run scenarios/<x>.js`
can never accidentally fire a full stress test.

> Want a harder run? Edit the `PROFILES` object in `config.js`. The numbers are
> deliberately conservative for a single shared host; raise them only if you have
> a throwaway environment.

---

## 4. Authenticated runs (login / refresh) — opt-in

The auth scenario drives the real login + token-refresh path. It is **gated**
because login writes audit rows and refresh **rotates** the refresh token (it is
not a pure read). You must opt in and supply a **disposable test account** via
env (no credentials live in the repo).

```bash
k6 run \
  -e ALLOW_MUTATIONS=true \
  -e TEST_USER_EMAIL="loadtest@example.com" \
  -e TEST_USER_PASSWORD="<the-password>" \
  -e CLIENT_ID="marmara-bys-demo" \
  -e PROFILE=load \
  scenarios/auth-load-test.js
```

- Use a **password-only** account (no 2FA) so login completes in one round-trip.
- **Login rate-limit (important):** the API throttles login to **10 attempts /
  5 min per IP** (Bucket4j). From one external PC you are one IP, so a high-VU
  login flood becomes mostly HTTP 429 and the numbers are meaningless. This
  scenario therefore logs in **once** in setup and mainly exercises
  `/auth/refresh` (which is *not* under the login bucket), re-logging-in only a
  small `LOGIN_SHARE` fraction of iterations (default 5%). If you genuinely want
  to measure raw **login** throughput, ask the operator to temporarily raise
  `APP_RATE_LIMIT_LOGIN_CAPACITY` / `APP_RATE_LIMIT_LOGIN_WINDOW_MINUTES` in
  `.env.prod` for the run (revert after — it is a no-rebuild env flag).

---

## 5. Biometric / mutating scenarios (enroll, verify, multi-tenant, stress, spike)

These are **OFF by default** and require `ALLOW_MUTATIONS=true`. Two reasons:

1. They **write real data** (registrations, biometric enrollments, audit rows).
2. They call the **biometric processor**, which has **no public route** — it is
   reachable only on the internal Docker network with an `X-API-Key`. So **these
   cannot run from an external client against production at all.** Running them
   externally will just fail to connect to the biometric host.

If you have internal/VPN reach (e.g. the operator's WireGuard exits the Hetzner
host) or a local stack, then and only then:

```bash
k6 run -e ALLOW_MUTATIONS=true \
  -e TEST_USER_EMAIL=... -e TEST_USER_PASSWORD=... \
  -e BIOMETRIC_API_URL=http://<internal-host>:8001 \
  -e TEST_IMAGE_BASE=https://<your-bucket>/faces \
  -e PROFILE=load \
  scenarios/enrollment-load-test.js
```

There is **no canonical public test-image bucket** — supply your own reachable
face images via `TEST_IMAGE_BASE` (yields `{TEST_IMAGE_BASE}/face-{n}.jpg`). The
`multi-tenant-load-test.js` additionally assumes many pre-seeded tenant-admin and
per-tenant user accounts; it will not create them.

For the thesis, the **public-read** and **authenticated auth** runs are the
defensible external-client numbers. The biometric latency figures are better
sourced from the in-cluster baselines (the biometric processor is internal by
design).

---

## 6. Exporting results (commit these for the thesis)

```bash
# Human-readable end-of-test summary as JSON (recommended)
k6 run -e PROFILE=load \
  --summary-export=results/public-read-load-$(date +%Y%m%d-%H%M%S).json \
  scenarios/public-read-load-test.js

# Full time-series (every data point) — large, optional
k6 run -e PROFILE=load \
  --out json=results/public-read-load-timeseries-$(date +%Y%m%d-%H%M%S).json \
  scenarios/public-read-load-test.js

# Plain-text console capture (Windows PowerShell): use Tee-Object
k6 run -e PROFILE=load scenarios/public-read-load-test.js | Tee-Object results/public-read-load.txt
```

`--summary-export` writes the aggregated metrics (the p50/p95/p99, counts, rates).
`--out json` writes raw samples for graphing. The `results/` folder is **git-
ignored for `*.json`** so big raw dumps don't bloat the repo — but the
`results/RESULT_TEMPLATE.md` (and any `.txt`/`.md` you commit) **are** tracked.
Paste your summary into a copy of the template and commit it.

---

## 7. Reading the thresholds (pass/fail)

k6 prints a per-metric line at the end; a `✓` means the threshold passed, `✗`
means it failed (and k6 exits non-zero). The targets baked into this kit:

| Metric                     | Threshold        | Meaning |
|----------------------------|------------------|---------|
| `http_req_failed`          | `rate < 0.01`    | < 1% of requests errored (read path) |
| `public_read_duration` p95 | `< 500 ms`       | 95% of public reads under 0.5s |
| `login_duration` p95       | `< 300 ms`       | 95% of logins under 0.3s |
| `token_refresh_duration` p95 | `< 200 ms`     | 95% of refreshes under 0.2s |
| `enrollment_duration` p95  | `< 2000 ms`      | ML-bound; internal runs only |
| `verification_duration`    | p95 `< 500 ms`, p99 `< 1000 ms` | internal runs only |

For `stress`/`spike` the failure-rate thresholds are intentionally looser (you
*expect* degradation) — see each scenario file.

> **Honest methodology note for the thesis:** these numbers are end-to-end from
> an external client over real HTTPS (TLS handshake + internet RTT included), not
> server-side service timings. That is the *right* number to report for a SaaS —
> it is what a tenant integrator actually experiences — but say so explicitly,
> and note your client's location/network, since RTT to the Hetzner datacenter
> varies by ISP.

---

## 8. Troubleshooting

- **`429 Too Many Requests` on login:** the per-IP login bucket (10/5min). Expected
  if you crank login VUs from one IP — see §4. Use the refresh-heavy default or
  raise the server limit for the run.
- **`401` on `GET /`:** by design — the API root is an API origin, not a page. The
  read scenario does not hit it.
- **`403` on `/actuator/health`:** admin-IP-gated externally. Not used by the kit;
  use `/api/v1/auth/health` (public) for liveness.
- **Connection refused / DNS fail on the biometric host:** expected externally —
  the biometric processor has no public route (§5).
- **High p95 vs the table:** check your own network RTT first (`ping`/`tracert`
  to `api.fivucsas.com`); some Turkish ISPs route poorly to Hetzner.
