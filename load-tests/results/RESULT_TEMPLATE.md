# Load-test run — <SCENARIO> / <PROFILE>

> Copy this file to `results/<YYYY-MM-DD>-<scenario>-<profile>.md`, fill it in
> from your k6 output, and commit it. One file per run.

## Run metadata

| Field | Value |
|-------|-------|
| Date / time (local) | `YYYY-MM-DD HH:MM TZ` |
| Scenario | `scenarios/public-read-load-test.js` |
| Profile | `smoke` / `load` / `stress` / `spike` |
| Target (`BASE_URL`) | `https://api.fivucsas.com` |
| Generator location | e.g. *Istanbul, home fibre, <ISP>* |
| Network RTT to target | `ping api.fivucsas.com` → `__ ms avg` |
| k6 version | `k6 version` → `v0.__.__` |
| Exact command | `k6 run -e PROFILE=load --summary-export=results/....json scenarios/public-read-load-test.js` |

## Headline numbers

| Metric | Value | Threshold | Pass? |
|--------|-------|-----------|-------|
| `http_reqs` (total / per-sec) | `_____ / ___ /s` | — | — |
| `http_req_failed` | `__._%` | `< 1%` | ✓/✗ |
| `http_req_duration` avg | `___ ms` | — | — |
| `http_req_duration` p95 | `___ ms` | `< 500 ms` | ✓/✗ |
| `http_req_duration` p99 | `___ ms` | — | — |
| `public_read_duration` p95 | `___ ms` | `< 500 ms` | ✓/✗ |
| `login_duration` p95 (auth runs) | `___ ms` | `< 300 ms` | ✓/✗ |
| `token_refresh_duration` p95 (auth runs) | `___ ms` | `< 200 ms` | ✓/✗ |
| max VUs | `___` | — | — |

## Per-endpoint breakdown (optional, from the `name` tag)

| Endpoint | p95 | failure % |
|----------|-----|-----------|
| `oidc_discovery` | `___ ms` | `__%` |
| `jwks` | `___ ms` | `__%` |
| `auth_health` | `___ ms` | `__%` |
| `auth_methods` | `___ ms` | `__%` |
| `login_config` | `___ ms` | `__%` |

## Raw k6 summary

```
<paste the full end-of-test k6 output block here>
```

## Notes / observations

- Did any threshold fail? Why (rate-limit 429s, network RTT, real degradation)?
- Where was the knee of the curve (stress profile)?
- How fast did it recover after the spike (spike profile)?
- Anything to flag for the thesis write-up?
