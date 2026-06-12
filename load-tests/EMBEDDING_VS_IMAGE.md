# Embedding vs. Image: the GPU-less face-verify scaling test

This document explains **why** the client-side-embedding face-verify path scales
where the legacy server-side image path does not, **how** to run a fair comparison
with the two k6 scenarios, and **how** to read the result. It is the companion to
[`scenarios/verify-embedding-load-test.js`](./scenarios/verify-embedding-load-test.js)
and [`scenarios/verification-load-test.js`](./scenarios/verification-load-test.js).

---

## 1. The two paths

FIVUCSAS can verify a face two ways. Both end at the same pgvector template store;
the difference is **where the expensive Facenet512 forward pass runs**.

### Legacy image path — server does the ML (HEAVY)

```
browser ──[ face IMAGE ]──▶ identity API ──▶ biometric processor
                                              ├─ MTCNN face detection      (CPU)
                                              ├─ Facenet512 forward pass   (CPU)  ◀── the cost
                                              ├─ quality + passive liveness (CPU)
                                              └─ pgvector cosine compare    (ms)
```

- Endpoint: biometric `/verify` (proxied by the API; **internal Docker network
  only — no public route**).
- Per request the CPU-only Hetzner **CX43 (8 shared cores / 15 GiB, ~23 containers
  + a CI runner)** runs MTCNN + a full Facenet512 inference. That is roughly
  **O(100 ms – several seconds)** of CPU-bound ML, **per verify**.
- Concurrency math: with no GPU and a handful of cores, a few hundred simultaneous
  verifies saturate the CPU, queues build, p95 explodes, and unrelated containers
  on the box suffer. This is the literal **"works for 1 user, collapses at 1000"**
  failure mode.

### New client-side-embedding path — server does a vector compare (CHEAP)

```
browser
  ├─ Facenet512 forward pass in-browser (onnxruntime-web, WASM/WebGPU)  ◀── cost moved here
  └─[ 512-d EMBEDDING ]──▶ identity API ──▶ biometric processor
                                            └─ pgvector cosine compare    (ms)  ◀── all that's left
```

- Endpoint: `POST /api/v1/auth/mfa/step` with
  `{ sessionToken, method: "FACE", data: { embedding: [<512 floats>] } }` —
  the **public** identity API (`api.fivucsas.com`). The server routes the vector
  to the biometric `/verify-embedding` route, which **skips detection, quality,
  liveness and the server-side Facenet512 pass** and runs only the pgvector cosine
  + threshold / aged-adaptation logic.
- Per request the server does **O(ms)** of work — a single indexed vector
  distance, no ML. CPU per verify drops by ~2–3 orders of magnitude.
- Result: the same small box can serve **far more** concurrent verifies at flat,
  low latency. That is the scaling claim this test validates.

> **Security note (don't lose it):** the embedding path carries no image, so it
> performs **no liveness / anti-spoof**. It is only trusted as a login factor when
> paired with a liveness factor (passive or the puzzle layer) enforced at the
> identity layer, and it is flag-gated (`app.auth.client-side-embedding`, default
> OFF). This test is about *server capacity*, not about whether the path is enabled
> for a given tenant.

---

## 2. What the k6 test actually measures (be honest)

The scenario logs in to get an MFA session token, then POSTs the FACE MFA step
with a **random, L2-normalized 512-d vector** and times that request
(`embedding_verify_duration`).

- ✅ **It measures server-side CAPACITY of the cheap path.** A random embedding
  will not match the stored template, but a non-match runs the **identical server
  code path** as a match — decrypt the template, pgvector cosine, threshold /
  aged-adaptation, write the audit row. So the latency and CPU it reports are
  representative of a real verify. Capacity is what "scales to thousands" means.
- ❌ **It does NOT measure recognition accuracy.** Random vectors never match; FAR
  / FRR is a separate accuracy study with real enrolled templates.
- ❌ **It does NOT measure the client-side embedding cost.** Computing the
  embedding in the browser means a **one-time ~47 MB model download** (cached after
  first load) plus an onnx forward pass on the user's own device. That cost is
  **per-device and client-side — it is not a server-scaling factor** and does not
  appear in these server-side numbers. If you care about it, measure it in the
  browser (Lighthouse / Performance panel), not here.

In short: **this proves the server side of the scaling claim** — the part that
actually determines whether the small shared box survives 1000 concurrent users.

---

## 3. How to run BOTH paths

### Image path (legacy, HEAVY) — local stack only

The biometric processor is **not publicly reachable**, so the image scenario can
only run against a local/VPN stack with the full ML container up.

```bash
# Bring up the local stack (Postgres+pgvector, Redis, identity API, biometric ML).
# Then, from load-tests/ — heavy profile is fine here, it's YOUR box:
LOAD_PROFILE=load ALLOW_MUTATIONS=true \
  BIOMETRIC_API_URL=http://localhost:8001 \
  TEST_USER_EMAIL='...' TEST_USER_PASSWORD='...' TEST_IMAGE_BASE='http://localhost:9000/faces' \
  ./run.sh verification http://localhost:8080
```

### Embedding path (new, GPU-less) — public, prod-safe smoke or local heavy

```bash
# SAFE taste against PROD — smoke only (~5 VUs / ~1 min). Needs a REAL 2FA test
# account whose login flow reaches a FACE step:
LOAD_PROFILE=smoke ALLOW_MUTATIONS=true \
  TEST_USER_EMAIL='you@real-test.acct' TEST_USER_PASSWORD='...' \
  ./run.sh verify-embedding https://api.fivucsas.com

# Full capacity comparison — LOCAL / throwaway stack ONLY:
LOAD_PROFILE=stress ALLOW_MUTATIONS=true \
  TEST_USER_EMAIL='...' TEST_USER_PASSWORD='...' \
  ./run.sh verify-embedding http://localhost:8080
```

> ## ⛔ NEVER hammer the CX43
> Only the **`smoke`** profile is allowed against `api.fivucsas.com` — `run.sh`
> refuses anything heavier. The per-IP login limit is **10 logins / 5 min**, so a
> heavy run from one external IP self-throttles anyway and the numbers would be
> garbage. Run `load` / `stress` / `spike` against a **local or throwaway** stack
> where you can also watch server CPU. The image path is local-only regardless
> (the biometric host has no public route).

### Account requirement for the embedding path

The scenario needs a login that produces an **MFA session token** and reaches a
**FACE** step:

- Best: a 2FA/3FA test account whose flow's **first** step is FACE (cleanest
  per-request number).
- Acceptable: a flow where FACE is offered as a **CHOICE** step. The scenario
  still POSTs the FACE step; the server validates the step + method. If the first
  step is some other factor, `setup()` prints a warning so you don't misread the
  numbers — prefer a FACE-first flow for the headline figure.
- A single-factor (password-only) account produces no MFA step; the scenario warns
  and the embedding step is not exercised.

No credentials are committed — supply them via env only.

---

## 4. How to read the result

Run both, export the summaries (`run.sh` writes `results/*.summary.json`), and
compare three things. While the **heavy** runs execute, watch the server with
`docker stats` / `top` (or `LC_ALL=C sar -u`) on the box under test.

| Signal | Image path (`verification_duration`) | Embedding path (`embedding_verify_duration`) | What it tells you |
|--------|--------------------------------------|----------------------------------------------|-------------------|
| **p95 / p99 latency** | high and **rises sharply** with VUs (CPU-bound ML queues) | **low and stays flat** as VUs climb | the embedding compare doesn't queue on CPU |
| **Max sustained RPS** before p95 blows past target | low (a handful of cores doing Facenet512) | **much higher** (vector compare is ~free) | headroom = how many concurrent users the box survives |
| **Server CPU** at a fixed RPS | near-saturated, ML threads pegged | **a fraction** of it | the GPU-less win, in one number |

**What "scales to thousands" looks like in the data:** as you raise the profile
(`smoke → load → stress`) on a local stack, the **image** path's p95 climbs steeply
and the error rate rises as the CPU saturates and requests time out, while the
**embedding** path's p95 stays roughly flat and the box's CPU barely moves. The
ratio of max-sustainable-RPS (embedding ÷ image) at equal latency is the concrete
scaling factor to quote.

**Caveats when quoting numbers:**

- Run the load generator from a **different** machine than the server under test —
  co-locating them shares CPU/RAM and skews both paths.
- Compare at **equal hardware** and **equal profile**. The image path being
  local-only means the apples-to-apples comparison is **local-vs-local**; the prod
  `smoke` of the embedding path is only a sanity taste of the public path, not the
  capacity comparison.
- The embedding number is **server capacity**. Add the separate per-device
  client-embedding cost (§2) if you want an end-to-end user-perceived figure.

---

## 5. One-paragraph summary

Moving the Facenet512 forward pass into the browser turns the server's face-verify
work from a heavy, CPU-bound MTCNN + Facenet512 inference (the legacy image path,
hundreds of milliseconds to seconds per request on a GPU-less shared box) into a
single pgvector cosine compare (milliseconds). The `verify-embedding-load-test.js`
scenario drives the public `POST /auth/mfa/step { embedding[512] }` path under the
standard k6 profiles and reports `embedding_verify_duration`; compared against the
legacy `verification-load-test.js` it should show dramatically lower, flatter p95/p99
and far higher sustainable RPS at a fraction of the server CPU — the concrete
evidence that the GPU-less path scales to thousands of users where the image path
collapses. The one cost it deliberately does **not** count is the one-time,
per-device client model download + onnx pass, which is a browser cost, not a
server-scaling factor.
