# FIVUCSAS — Poster Presentation Script

> CSE4297 / CSE4298 Capstone Project · Marmara University · Spring 2025–2026
> Authors: Ahmet Abdullah Gültekin · Ayşe Gülsüm Eren · Ayşenur Arıcı
> Supervisor: Doç. Dr. Mustafa Ağaoğlu
> Date: 2026-05-19

This script is what to **say** at the poster — the poster shows headlines + visuals; you provide the depth.

---

## 1 · Opening (30 seconds)

> "Welcome. This is **FIVUCSAS** — Face & Identity Verification using Cloud-based SaaS Models. Think of it as the **private-sector e-Devlet button**, or **reCAPTCHA for biometric identity**: a single hosted-login redirect that any application can adopt instead of writing its own auth.
>
> The project is production-deployed at <span style="font-family:monospace">fivucsas.com</span> with Marmara University as the live anchor tenant. Everything you see on this poster runs on **one Hetzner CX43 — eight vCPUs, sixteen gigabytes of RAM, no GPU**."

---

## 2 · "What problems does FIVUCSAS solve?" (60 sec — pitch)

> "Two audiences, one button.
>
> **For end users:** you stop registering on every site. One FIVUCSAS account, ten authentication methods (password, email OTP, SMS OTP, TOTP, QR code, face, voice, fingerprint, hardware key, NFC document). The mental model is e-Devlet's "Sign in with e-Devlet" button, but for the entire private sector.
>
> **For developers:** you stop writing login and register pages. Drop in our `<FIVUCSAS />` button, configure the OIDC discovery URL, and your tenant gets biometric authentication without writing a line of ML code. The mental model is reCAPTCHA's one-line drop-in, but for ten-factor identity instead of bot defence."

---

## 3 · Comparison panel (45 sec)

Point to the **side-by-side table** on the poster (e-Devlet · reCAPTCHA · FIVUCSAS columns).

> "On a feature-by-feature basis, FIVUCSAS is the only one that combines biometric authentication, NFC document verification, ten composable MFA factors, multi-tenant application-layer tenant isolation, KVKK and GDPR compliance, and ISO/IEC 30107-3 Level 1 anti-spoofing readiness — in an open-source, self-hostable stack."

Anticipated jury question: *"How is this different from Auth0 / Okta?"*

> "Three differences. **One,** Auth0 treats biometrics as a device-local feature; we treat it as a tenant-controlled server-side decision. **Two,** Auth0 doesn't read government ID NFC chips natively — we do, on both Turkish T.C. ID and ICAO 9303 passports. **Three,** Auth0 charges per active user; we are self-hostable on a single sixteen-gigabyte VM."

---

## 4 · System Architecture (60 sec)

Point to the **single-row architecture strip**: Client → Traefik → Identity Core + Biometric Processor → PostgreSQL · Redis · Hetzner CX43.

> "Two services, hexagonal architecture. The **Identity Core** is Spring Boot in Java — it owns auth flows, OAuth 2.0 / OIDC issuance, MFA composition, and tenant configuration. The **Biometric Processor** is FastAPI in Python — it owns face detection, embedding, liveness detection. They talk via a hexagonal port-adapter boundary with an API key on the internal Docker network. PostgreSQL with pgvector handles embedding storage; Redis handles cache, OTP and puzzle nonces.
>
> The entire stack is **GPU-less by design**: a boot sentinel called `ALLOW_HEAVY_ML=false` refuses to start if you configure a GPU-requiring model. This decision keeps the system self-hostable on commodity hardware — your CSE4298 capstone runs on the same architecture as a banking deployment would."

---

## 5 · Face Pipeline (60 sec)

Point to the **four-stage strip**: Detect+Quality → Landmark+Align → Embed+Encrypt → Index+Match.

> "Server-authoritative, eight true stages folded into four cards. DeepFace 0.0.98 handles detection with configurable backends — OpenCV by default, anti-spoof at 0.5. Quality gating runs Laplacian blur ≥ 100, minimum 80-pixel face, occlusion via CIE-Lab Delta-E. Landmarking is MediaPipe's modern Tasks API with the 468-point face mesh plus 10 iris points. Alignment is DeepFace's eye-line affine warp.
>
> The embedding is **Facenet-512** — 512-D L2-normalized vectors. At rest, every embedding is wrapped in Fernet — AES-128-CBC plus HMAC-SHA256. The encrypted ciphertext lives in PostgreSQL with a parallel plaintext vector column for ANN search using HNSW indexing — m equal to 16, ef_construction 64.
>
> Matching uses cosine distance at theta 0.45; aged embeddings older than two years get a more permissive 0.38."

Anticipated question: *"What is your EER on Marmara students?"*

> "**Honest answer: we have not yet measured an in-house EER curve.** Published Facenet-512 rates apply. Our load-test targets — login P95 under 300 ms, verification P95 under 500 ms — are targets, not measurements. Future work: an in-house Marmara cohort EER curve."

---

## 6 · The 23 Biometric Puzzle Challenges (45 sec)

Point to the **single-line puzzle summary** + the active liveness reference.

> "Active liveness is implemented as a randomly sequenced challenge response. **Twenty-three canonical micro-challenges**, all server-issued: fourteen face actions and nine hand gestures. The face set covers blink, smile, open mouth, head turns, look up and down, eyebrow raises, nod, and head shake. The hand set covers finger count, wave, flip, finger tap, pinch, peek-a-boo, math (count fingers to k), shape trace, and template trace.
>
> Per attempt the server picks 2 to 7 actions, signs them with a UUID v4 nonce, and writes them to Redis. The puzzle expires in five minutes. The client streams only landmark and metric vectors — the server classifies each step against EAR, MAR and yaw thresholds and signs the verdict. Pre-recorded video, AR-filter and deepfake all fail because the requested sequence is unpredictable and unmodifiable client-side."

---

## 7 · NFC Subsystem (45 sec)

Point to the **T.C. ID card visual** with the chip mark.

> "Two rails, one verifier.
>
> **Rail A is native mobile NFC.** Turkish T.C. ID cards, Turkish passports, and every ICAO 9303 document with a BAC chip read over Android `IsoDep` plus Bouncy Castle. The chip lives on the back of the T.C. card or in the passport cover. Same ICAO application identifier — `A0 00 00 02 47 10 01` — same SHA-1 BAC key derivation from the MRZ.
>
> **Rail B is Web NFC.** ISO/IEC 14443 Type-A and Type-B simple cards — store loyalty, transit, MIFARE Classic, NTAG2xx — read directly from Chrome on Android. No native NFC layer required.
>
> Both rails speak to the same Identity Core endpoint at `/api/v1/nfc/verify-mrz`. The DG2 face photo from the chip is decoded from JPEG2000, embedded via Facenet-512, and cross-matched against the live selfie via cosine — same threshold as the live pipeline."

---

## 8 · spoof-detector & paper (75 sec — this is the centerpiece)

Point to the **metric table** and the **amispoof.fivucsas.com URL**.

> "The hardest technical contribution of the project is the open-source **`spoof-detector` engine**. It is a separate MIT-licensed submodule at `github.com/Rollingcat-Software/spoof-detector`, with its own paper draft, its own browser bundle, and its own iBeta PAD Level 1 submission package on commit `cc73cf08`.
>
> **What it does:** combines a MiniFASNet ONNX discriminator with twelve auxiliary temporal and image analyzers under calibrated multi-class fusion, and produces a session-level peak-sensitive verdict — fifty-fifty blend of mean and worst-decile liveness — formally proven in section 4 of the paper to resist spoof-burst dilution.
>
> **What is measured:** on CASIA-FASD (N = 2 408) we report **AUC 0.945** with 95% confidence interval [0.937, 0.956]. On CelebA-Spoof (N = 2 611) we report AUC 0.782. The two intervals are strictly separated by more than four times their combined width, empirically establishing the cross-dataset taxonomy effect. Per-frame inference latency is **63 milliseconds on a CPU** — no GPU.
>
> **Where it runs:** the production deliverable is a TypeScript browser bundle — 123 kilobytes ESM, 34 kilobytes gzipped. Runs entirely on WebAssembly via `onnxruntime-web`, optional WebGPU. Live tester at `amispoof.fivucsas.com`. Twenty-five to thirty FPS on desktop Chrome.
>
> **Honest positioning:** zero-shot, no head-to-head with FaceTec, iProov, Onfido or Jumio. Intra-dataset state-of-the-art on CASIA-FASD reaches AUC over 0.99 *with retraining*. Our 0.945 is mid-tier zero-shot. Where we hold ground: session-level verdict, client-side browser deployment, the anti-correlated calibration signal finding, reproducible no-training calibration."

Anticipated question: *"Why no OULU-NPU and SiW numbers?"*

> "Honest answer: those benchmarks require institutional licensing we did not obtain within the capstone timeline. The benchmark harness is in place — `tests/benchmark/run.py --dataset oulu_npu` — and one-shot reproducible the moment access is granted. Section 9.4 of the paper documents this transparently."

---

## 9 · 10 Composable Authentication Factors (45 sec)

Point to the **ten-icon grid** (Know / Have / Are / Show categories).

> "Ten methods on one platform. The Identity Core stitches them into a single OIDC session. The mapping is NIST 800-63B's four-axis Know / Have / Are / Show framework:
>
> Know: **Password** with BCrypt-12.
>
> Have: **Email OTP**, **SMS OTP via Twilio**, **TOTP** with RFC 6238, **QR Code** for cross-device, and **Hardware Key** with FIDO2 / WebAuthn.
>
> Are: **Face** with Facenet-512 plus the Puzzle, **Voice** with Resemblyzer, and **Fingerprint** via WebAuthn platform authenticator.
>
> Show: **NFC Document** with ICAO 9303.
>
> Each tenant composes its own MFA flow from this set — configuration is JSON, not Java code."

---

## 10 · QR + Hub (15 sec — closer)

Point to the **QR code** and `links.fivucsas.com`.

> "Every link from this poster — landing, hosted login, admin console, Marmara BYS demo, amispoof live tester, API, documentation, status, the team's contacts, and every poster artefact in five formats — is one scan away at `links.fivucsas.com`. Thank you."

---

## 11 · Likely jury questions (anticipated)

| Question | Short answer |
|---|---|
| "Did you write the spoof-detector yourselves?" | Architecture and session engine: yes (Ahmet). Algorithms ported into the production pipeline: yes (Ayşenur's `working_spoof_detection` branch, fully credited in `AUTHORS.md`). The MiniFASNet backbone is a frozen public UniFace ONNX — we did not retrain it. |
| "Why is the paper not yet submitted?" | The paper is a CSE4298 capstone artefact (Mustafa Hocam is a co-author). §7 and §8 await OULU-NPU / SiW dataset access — `tests/benchmark/run.py` will reproduce the missing rows the moment access is granted. Target venue: BIOSIG 2026 (Darmstadt). |
| "How does this compare to Auth0 / Okta?" | See §3 above — three differences: server-side biometric decision, native government NFC, single-VM self-host. |
| "How is KVKK / GDPR compliance achieved?" | Embeddings are Fernet AES-128 encrypted at rest. Tenant data is isolated at the application layer by Hibernate `@Filter` on the tenant-scoped tables (a Postgres RLS schema exists from V25, but enforcement is at the application layer). Audit logs are partitioned by `tenant_id` via pg_partman (V40 + V57). All data lives on EU / TR-accessible Hetzner. Soft-delete via `deleted_at` + Hibernate `@SQLRestriction`. |
| "How many lines of code? How many tests?" | About 691 000 lines across 12 submodules; about 2 768 automated tests (Spring 944, Pytest 265, Vitest/Jest 1 559). 79 Flyway migrations. About 1 847 commits in the last six months. |
| "Why GPU-less?" | An architectural choice that keeps the system self-hostable on commodity hardware. `ALLOW_HEAVY_ML=false` boot-time sentinel refuses GPU-only models. The spoof-detector browser port runs CPU-only via WebAssembly with optional WebGPU. |
| "Is it really production-deployed?" | Yes — Marmara is the live anchor tenant at `demo.fivucsas.com`. Hosted login at `verify.fivucsas.com`. Admin console at `app.fivucsas.com`. Spoof-detector browser tester at `amispoof.fivucsas.com`. All HTTP 200, all on Hetzner CX43. |
| "How can a developer integrate this?" | Roughly fifteen lines of code: SDK init, `loginRedirect()`, token exchange. OIDC discovery and JWKS are automatic. Or one HTML anchor tag pointing at `verify.fivucsas.com/oauth2/authorize` with PKCE S256. |
| "What about iOS NFC?" | Roadmap. Currently Rail A (T.C. ID + passports) is Android-only because Apple's CoreNFC has different APIs. Web NFC (Rail B) is also Android-only — Safari does not implement the Web NFC standard. iOS path is via Kotlin Multiplatform `expect / actual`. |
| "Why open-source?" | The `spoof-detector` submodule is already MIT public. The main FIVUCSAS monorepo opens in Q4 2026, alongside paper publication. Same operating model as PostgreSQL, OpenWebUI, Keycloak, Authentik or Supabase: developers can self-host; SaaS is for those who would rather we operate it. |

---

## 12 · One-sentence closes

If the jury asks for a single-sentence summary:

> "FIVUCSAS is **the e-Devlet button for the private sector** — one OAuth 2.0 redirect, ten composable authentication factors, twenty-three active liveness micro-challenges, two NFC rails, and a session-level passive PAD engine, all running on one GPU-less Hetzner box."

If the jury asks "what was the hardest part?":

> "Building a multi-tenant biometric SaaS that runs **without a GPU** while still resisting screen-replay and deepfake injection at session level. The session-level peak-sensitive verdict and the anti-correlated calibration finding were the two specific technical contributions."

---

*End of script.*
