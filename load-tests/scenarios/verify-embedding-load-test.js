/**
 * Client-Side-Embedding Face-Verify Load Test  (the GPU-less scaling path)
 *
 * WHY THIS EXISTS
 * ---------------
 * FIVUCSAS has two face-verify paths:
 *
 *   1. LEGACY image path — the browser POSTs a face IMAGE to the biometric
 *      processor, which runs MTCNN face-detection + a Facenet512 forward pass on
 *      the CPU-only Hetzner CX43. That is O(100ms–seconds) of heavy ML PER
 *      request and it does NOT scale: it works for one user and collapses under a
 *      few hundred concurrent ones (the box has 8 shared cores). It is also NOT
 *      publicly reachable — the biometric processor is Docker-network-only — so
 *      the existing `verification-load-test.js` can only run against a local stack.
 *      See EMBEDDING_VS_IMAGE.md.
 *
 *   2. NEW client-side-embedding path (THIS TEST) — the browser computes the
 *      512-d Facenet512 embedding locally (onnxruntime-web) and submits ONLY the
 *      vector to the PUBLIC identity API FACE MFA step. The server forwards it to
 *      the biometric processor `/verify-embedding` route, which is just a pgvector
 *      cosine compare against the stored template — O(ms), no image ML, no GPU.
 *      The whole point: the server no longer does per-request face ML, so this
 *      path should sustain FAR higher throughput at FAR lower CPU. This test
 *      measures exactly that: the server-side CAPACITY / latency of the cheap
 *      vector-compare path under concurrent load.
 *
 * WHAT THIS MEASURES (and what it does NOT)
 * -----------------------------------------
 *   - It measures the FULL request path of the GPU-less verify step:
 *     login -> /auth/mfa/step { embedding } -> bio /verify-embedding (pgvector).
 *   - The submitted embedding is RANDOM (512 L2-normalized floats), so it will
 *     NOT match the stored template — the step result will be a non-match. THAT
 *     IS INTENTIONAL. We are stress-testing the server's CAPACITY to accept,
 *     route and run the vector compare, NOT recognition accuracy. A non-match
 *     exercises the identical code path (decrypt template, pgvector cosine,
 *     threshold/aged-adaptation, audit) as a real match, so the latency/CPU it
 *     reports is representative. (A match-rate test is a different, accuracy test.)
 *   - It does NOT measure the client-side cost of computing the embedding
 *     (the ~47 MB model download + the onnx forward pass). That is a one-time,
 *     per-device cost that runs in the user's browser and is NOT a server-scaling
 *     factor. See EMBEDDING_VS_IMAGE.md.
 *
 * MUTATION / SAFETY
 * -----------------
 * This is an AUTHENTICATED scenario: it logs in (writes an audit row + an MFA
 * session) and submits MFA steps (more audit rows). It is therefore OFF by
 * default — opt in with ALLOW_MUTATIONS=true and supply a REAL test account
 * (TEST_USER_EMAIL / TEST_USER_PASSWORD) whose login flow includes a FACE step.
 *
 * The login rate-limiter is 10 logins / 5 min PER IP, so a heavy profile from a
 * single external IP self-throttles. Run `smoke` against prod for a safe taste;
 * run `load`/`stress` against a LOCAL or throwaway stack only — NEVER hammer the
 * shared CX43.
 *
 * RUN
 * ---
 *   # SAFE prod smoke (needs a REAL 2FA test account that reaches a FACE step):
 *   k6 run -e PROFILE=smoke -e ALLOW_MUTATIONS=true \
 *     -e TEST_USER_EMAIL='you@real-test.acct' -e TEST_USER_PASSWORD='...' \
 *     scenarios/verify-embedding-load-test.js
 *
 *   # Heavy capacity run — LOCAL / throwaway stack ONLY:
 *   k6 run -e PROFILE=stress -e ALLOW_MUTATIONS=true -e BASE_URL=http://localhost:8080 \
 *     -e TEST_USER_EMAIL='...' -e TEST_USER_PASSWORD='...' \
 *     scenarios/verify-embedding-load-test.js
 *
 *   # via the wrapper:
 *   LOAD_PROFILE=smoke ALLOW_MUTATIONS=true \
 *     TEST_USER_EMAIL='...' TEST_USER_PASSWORD='...' \
 *     ./run.sh verify-embedding https://api.fivucsas.com
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import config, { profileStages, scenarioThresholds, PROFILE_NAME } from '../config.js';
import auth from '../utils/auth.js';
import { requireMutationsOptIn } from '../utils/guard.js';

// Facenet512 embedding dimensionality. The biometric `/verify-embedding` route
// validates this length EXACTLY (HTTP 422 on any other length) — see
// biometric-processor app/api/schemas/verification.py EMBEDDING_DIMENSION.
const EMBEDDING_DIM = 512;

// ---------------------------------------------------------------------------
// Custom metrics
// ---------------------------------------------------------------------------
// THE headline metric: wall-clock of the POST /auth/mfa/step { embedding } call,
// i.e. the GPU-less verify request as a tenant integrator experiences it.
const embeddingVerifyDuration = new Trend('embedding_verify_duration', true);
// HTTP-2xx rate for the step call (a non-match is still a 2xx — the request was
// served; the body says verified:false). This proves CAPACITY, not recognition.
const embeddingVerifyServed = new Rate('embedding_verify_served');
const embeddingVerifyCompleted = new Counter('embedding_verify_completed');
const loginMfaReached = new Counter('login_mfa_reached');

export const options = {
  stages: profileStages(),
  // smoke relaxes these so a quick prod sanity run REPORTS latency without
  // failing the process; load/stress/spike keep the real thresholds.
  thresholds: scenarioThresholds({
    // The cheap vector compare should be fast end-to-end even under load — that
    // is the whole scaling claim. Generous vs the image path's seconds.
    'embedding_verify_duration': ['p(95)<500', 'p(99)<1000'],
    // The step endpoint should keep serving requests (2xx) under load.
    'embedding_verify_served': ['rate>0.95'],
    'http_req_failed': ['rate<0.05'],
  }),
  gracefulStop: '20s',
};

const BASE = config.identityApiUrl;

/**
 * Build a random, L2-normalized 512-d embedding.
 *
 * Real client embeddings are unit-norm Facenet512 vectors; we mirror that so the
 * payload is byte-for-byte the same SHAPE the server expects (length 512, unit
 * norm). The VALUES are random, so it won't match any stored template — exactly
 * what we want for a capacity test (see the header note).
 */
function randomUnitEmbedding() {
  const v = new Array(EMBEDDING_DIM);
  let sumSq = 0;
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    // Cheap zero-centred sample; the distribution is irrelevant once normalized.
    const x = Math.random() * 2 - 1;
    v[i] = x;
    sumSq += x * x;
  }
  const norm = Math.sqrt(sumSq) || 1;
  for (let i = 0; i < EMBEDDING_DIM; i++) v[i] = v[i] / norm;
  return v;
}

export function setup() {
  // Hard gate: this writes data + needs real creds. Throws (run aborts) if the
  // operator didn't explicitly opt in.
  requireMutationsOptIn('verify-embedding-load-test');

  console.log('========================================================');
  console.log('FIVUCSAS client-side-embedding face-verify load test');
  console.log('  (GPU-less path: POST /auth/mfa/step { embedding[512] })');
  console.log(`Target : ${BASE}`);
  console.log(`Profile: ${PROFILE_NAME}`);
  console.log('========================================================');

  // Connectivity check + a one-shot probe that the configured account actually
  // reaches a FACE step. We don't HARD-fail the run if FACE isn't step 1 (the
  // flow may put it later), but we warn loudly so the numbers aren't misread.
  const ping = http.get(`${BASE}/api/v1/auth/health`, { tags: { name: 'setup_ping' } });
  if (ping.status !== 200) {
    throw new Error(`Setup failed: ${BASE}/api/v1/auth/health returned ${ping.status} (expected 200). ` +
      'Check BASE_URL and network reachability.');
  }

  const probe = auth.loginForMfa(config.testUserEmail, config.testUserPassword, config.clientId);
  if (!probe) {
    throw new Error('Setup failed: login did not return 200 (bad creds, or 429 rate-limited). ' +
      'Supply a REAL test account in TEST_USER_EMAIL / TEST_USER_PASSWORD.');
  }
  if (!probe.mfaRequired || !probe.mfaSessionToken) {
    console.warn('WARNING: the test account is SINGLE-FACTOR (no MFA step). This scenario ' +
      'needs an account whose login flow includes a FACE step so it can submit the ' +
      'client-side embedding to /auth/mfa/step. The run will continue but the embedding ' +
      'step will not be exercised.');
  } else {
    const step1 = probe.twoFactorMethod || (Array.isArray(probe.availableMethods) && probe.availableMethods.length
      ? JSON.stringify(probe.availableMethods) : '(unknown)');
    console.log(`Account reaches MFA. Step ${probe.currentStep}/${probe.totalSteps}, first method hint: ${step1}`);
    if (probe.twoFactorMethod && probe.twoFactorMethod !== 'FACE') {
      console.warn(`NOTE: the FIRST MFA step is ${probe.twoFactorMethod}, not FACE. The embedding ` +
        'step is still POSTed (the server validates the step+method); for a clean per-request ' +
        'capacity number use a flow whose first step is FACE, or a CHOICE step that offers FACE.');
    }
  }

  return { base: BASE };
}

export default function () {
  // 1. Login to obtain an MFA session token. (Counts against the per-IP login
  //    rate-limit — that is realistic; heavy profiles belong on a local stack.)
  const loginResult = auth.loginForMfa(config.testUserEmail, config.testUserPassword, config.clientId);
  if (!loginResult || !loginResult.mfaRequired || !loginResult.mfaSessionToken) {
    // Either the login HTTP failed (429/401) or the account isn't multi-factor.
    sleep(1);
    return;
  }
  loginMfaReached.add(1);

  // 2. THE measured call — submit the client-computed embedding to the FACE MFA
  //    step. The server routes it to bio /verify-embedding (pgvector cosine).
  const embedding = randomUnitEmbedding();

  const start = Date.now();
  const res = auth.verifyMfaStep(
    loginResult.mfaSessionToken,
    'FACE',
    { embedding: embedding },
    'mfa_step_embedding'
  );
  const elapsed = Date.now() - start;
  embeddingVerifyDuration.add(elapsed);

  // A request that was SERVED (2xx) proves capacity even when the random
  // embedding doesn't match (body verified:false). 4xx/5xx = not served.
  //  - 200 STEP_COMPLETED / AUTHENTICATED  -> matched (won't happen with random)
  //  - 200 with a non-match / 400          -> served the compare, non-match
  //  - 401 -> session/token rejected ; 422 -> bad embedding length ; 5xx -> error
  const served = res.status >= 200 && res.status < 400;
  embeddingVerifyServed.add(served);

  check(res, {
    'mfa/step embedding was served (2xx/3xx)': () => served,
    'mfa/step not 5xx': (r) => r.status < 500,
    'mfa/step not 422 (embedding length OK)': (r) => r.status !== 422,
  });

  if (!served && res.status === 429) {
    // Per-IP rate-limit hit — back off so we don't spin.
    sleep(2);
  }

  embeddingVerifyCompleted.add(1);

  if (__ITER % 25 === 0) {
    console.log(`embedding verify: status=${res.status} duration=${elapsed}ms`);
  }

  // Paced client think-time (model real users, not a tight CPU hammer).
  sleep(0.5 + Math.random());
}

export function teardown() {
  console.log('Client-side-embedding verify load test completed.');
  console.log('Read: compare embedding_verify_duration p95/p99 + max RPS + server CPU');
  console.log('against the legacy image path (verification-load-test.js). The embedding');
  console.log('path should hold low, flat latency at high concurrency — the GPU-less win.');
}
