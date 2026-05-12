# Research & Design — Proctoring submodule + amispoof.com demo

**Date:** 2026-05-02
**Author:** Claude (Opus 4.7) on behalf of Ahmet
**Status:** Design-stage; no code written. Awaiting user direction before any repo split or DNS purchase.

---

## 1. What the user is asking

Two related but separable questions:

1. **Repo strategy.** Should proctoring (test integrity, KYC video, fraud-monitoring, live-stream anti-spoof) live in its own repo/submodule, or stay folded into `biometric-processor`?
2. **Public demo + research surface.** Should we stand up a separate site — provisional name `amispoof.com` — that lets visitors record a short clip (or live-stream) and get back a probability breakdown:
    - % static image / printed photo
    - % pre-recorded video replay
    - % live-stream with sub-categorisation:
      - 3D realistic mask (silicone/latex)
      - Hard makeup / contouring
      - AR filter / live overlay app
      - Genuine live capture

The user wants this for two reasons: (a) **academic paper** material, (b) **product advancement** for FIVUCSAS as a whole.

---

## 2. What we already have in the codebase (verified 2026-05-02)

This is not greenfield. Verified via `git branch -a` + `git log` on `biometric-processor`:

- `feat/anti-spoof-pipeline` — moire pattern detection, device-spoof signature, reaction-based liveness, baseline pipeline, **flash-spoof analyzer**, cutout anomaly detection, strict-profile config, screen-replay veto. Multi-stage active+passive pipeline.
- `liveness_capture` / `liveness_capture2` — color-shaded-screen challenge, face-bbox refinements, liveness scoring, passive scoring improvements, enhanced-liveness as default baseline. Per memory: rPPG (remote photoplethysmography — pulse-from-skin-colour-changes) + screen-replay detection + MRZ already delivered.
- `test_proctoring_workflow.sh` at repo root — full proctoring session flow against `/api/v1` endpoints with real fixture images (which itself is a P0 GDPR violation per `TEST_REVIEW_2026-05-01.md` F1).

So the engineering work is partially done in feature branches that **never landed on `main`**. That is actually the central design pressure: we have ~1 person-month of proctoring-specific work sitting in branches because it doesn't fit the auth-flow product story.

That alone is the strongest argument that proctoring is a different product, not a feature.

---

## 3. Recommendation in two sentences

**Split proctoring into its own submodule (`fivucsas-proctoring` or `proctoring-engine`) and rebase the existing `feat/anti-spoof-pipeline` + `liveness_capture` branches into its `main`.** Stand up `amispoof.com` as a **hybrid client+server demo**, sharing the proctoring submodule's WASM/ONNX-exported detector for cheap classifications and calling the server only for the ambiguous cases — that gives a viable cost profile and protects the academic-paper data pipeline.

The main tradeoff: a third backend submodule increases ops surface (one more container, one more set of releases, one more CI matrix) at a moment where we have a known operator-stuck CI runner (Task #55) and an unrebuilt prod (Task #25). The split should land *after* those operator items resolve, not before.

---

## 4. Why proctoring is a separate product

It's tempting to keep one biometric backend. Walking through it carefully:

| Axis | FIVUCSAS auth | Proctoring |
|---|---|---|
| Caller | Tenant SDK / OAuth widget | LMS, exam platform, KYC flow, contact-centre app |
| Decision unit | Single transient verify (200–600 ms) | Long session (30 s – 4 h) |
| Data model | Per-user enrolment templates, 1:1 match | Per-session event log, behaviour timeline |
| Compliance posture | KVKK / GDPR Art. 9 (auth purpose) | KVKK / GDPR Art. 9 + Art. 22 (automated decisions about exam outcomes), often + ETSI TS 119 461 (KYC/video-ID) |
| Storage horizon | Embeddings (Fernet-encrypted as of PR #65) | Hours of raw video/audio in many jurisdictions; **bigger DPIA** |
| Failure cost | One bad login retry | Wrongly-flagged exam → academic appeal |
| SLA | p99 < 600 ms | Streaming p99 < 200 ms per frame, 99.9% session uptime |
| Test fixture | One enrolment, one verify | Long video corpus, adversarial sample bank, mask dataset |
| ML stack stability | Mature (FaceNet, MiniFASNet) | Active research (rPPG, mask, AR-filter detection) |

Different decision unit, different compliance, different SLA, different test data, different model release cadence. That's textbook separate-product. The fact that they share `face-detection` is not an architectural argument for monorepo — it's an argument for a **shared-detection library** (more on this below).

Counter-argument the user might raise: "But shared infra (Postgres, Traefik, observability, keys) is a hassle to duplicate." Reply: it isn't duplicated. The split is about source repo + container + release cycle. The proctoring container reuses the same `shared-postgres`, the same Traefik, the same Loki/Promtail/Grafana stack, the same `infra/` runbooks. We already do this for `biometric-processor` ↔ `identity-core-api`.

---

## 5. Repo / submodule layout proposal

```
FIVUCSAS/                                  # parent (this repo)
├── identity-core-api/                     # auth backend (existing)
├── biometric-processor/                   # face/voice auth ML (existing)
├── proctoring-engine/                     # NEW — extracted from feat/anti-spoof-pipeline
│   ├── app/
│   │   ├── api/routes/proctoring_session.py
│   │   ├── api/routes/spoof_classify.py        # serves amispoof.com
│   │   ├── ml/spoof/                            # moire, replay, mask, AR-filter
│   │   ├── ml/liveness/                         # rPPG, blink, reaction (from Aysenur)
│   │   └── persistence/
│   ├── docker/
│   ├── models/                              # Versioned ONNX/TFLite weights
│   └── alembic/
├── shared-detection/                      # NEW — pure-library, no service
│   ├── face_detect_wasm/                  # MediaPipe-WASM build, used by web-app, verify-app, amispoof.com
│   └── face_detect_python/                # cv2/MediaPipe Python wrappers, used by both backends
├── web-app/                               # admin / tenant dashboard
├── verify-app/                            # OAuth widget (already separate)
├── client-apps/                           # mobile (Kotlin Multiplatform)
├── landing-website/                       # FIVUCSAS pricing / hero
├── amispoof-website/                      # NEW — separate static + serverless functions
└── infra/
```

Three new submodules, one of which (`shared-detection`) is a library — that tames the duplication concern at the file level rather than the repo level.

`proctoring-engine` is the **only** new long-running container. It exposes a stable API with three families of endpoints:

- `/api/v1/proctoring/sessions/...` — long-running session lifecycle (LMS / KYC integrators).
- `/api/v1/spoof/classify` — single-shot multi-class spoof classification for `amispoof.com` and ad-hoc probes.
- `/api/v1/liveness/...` — re-export of the active+passive liveness work from `liveness_capture` for `biometric-processor` to call when it needs deep liveness (instead of duplicating rPPG inside biometric-processor).

That last bullet is critical: **after the split, `biometric-processor` calls `proctoring-engine` for deep liveness in the `verify` path**. This inverts the current direction (where liveness work was attempted inside biometric-processor and got partially blocked), and aligns with the existing memory note that "Liveness Priority 1: active-illumination challenge — defeats deepfake injection via virtual camera, 4–6 weeks" can be the proctoring team's first ship after the extraction.

---

## 6. amispoof.com — design

### 6.1 Product framing

amispoof.com is two things at once:

1. **Marketing surface.** "Are you spoofing yourself?" is a memorable hook. It generates social shares, which generate traffic, which generates trial signups for FIVUCSAS proper. It is far better at this than a feature page on the corporate site — single-purpose pages convert.
2. **Research data flywheel.** Every clip submitted, **with explicit informed consent and clear donation banner**, can become labeled training data. That is the closed-loop advantage open-source benchmarks don't have: visitors believe they're "real" and try to fool us; the fooling attempts are the most valuable adversarial samples.

A single page with one big record button and one big "What did we find?" reveal is the entire UX.

### 6.2 Architecture: hybrid, not pure-serverless

The user mentioned "serverless / client-side only." That's tempting (zero compute cost) but wrong for this problem. Three reasons:

- **rPPG needs ≥1.0–1.5 s of pulsation samples.** That's fine in-browser via MediaPipe Tasks, but the strongest signal needs FFT over 1–3 s of cheek-region pixel differences. Doable in WASM but at 30 fps it's tight.
- **MiniFASNet (anti-spoof) is ~70 MB ONNX.** First-load cost on a 4G mobile is ~7 s — visitors leave.
- **AR-filter classification is the differentiator.** It's the academic gap. Filter detectors are not yet small enough to ship to the browser; current SOTA models are 200+ MB.

So: **hybrid**.

```
Visitor browser
 ├── MediaPipe Tasks (face landmarker, ~6 MB) for capture + ROI
 ├── Tiny WASM "is-this-clearly-a-still-image" detector (~2 MB)  ← first-pass, cheap
 │     If confidence > 0.95: return verdict in browser, no upload, no PII transit.
 │     Else: submit clip (1–3 s, 480p, with EXPLICIT consent) →
 │
 └── proctoring-engine /api/v1/spoof/classify
      ├── moire / replay detector
      ├── rPPG analyzer
      ├── MiniFASNet 3D-mask
      ├── AR-filter detector (ours, novel)
      └── return {static: 0.02, replay: 0.31, live_genuine: 0.62, live_with_filter: 0.05, ...}
```

Server-side budget per ambiguous clip: ~120 ms inference on CX43 + ~80 ms IO. That's well within "feel snappy" on a single-page demo. Cost target: ≤ €0.001 per submission, budgetable up to ~50k visitors/month before we'd want to throttle.

### 6.3 Categories and what we can actually detect

The user listed three buckets. Sharpening them with what's literature-supported:

**Bucket 1 — Static image attack** (printed photo, screen still)
- Detectable by: complete absence of micro-motion, eye-blink absence, pixel-noise pattern matching screen/print, MediaPipe landmark stability over 0 motion
- Confidence after 1 s: > 95%
- Maturity: solved

**Bucket 2 — Pre-recorded video replay** (the most common attack)
- Detectable by: moire interference (camera shooting screen), reduced colour gamut, refresh-rate aliasing, no rPPG signal even though motion exists, screen-bezel artifacts in periphery
- Confidence after 2 s: > 85% (drops on high-end OLED replays)
- Maturity: well-studied; we have moire + screen-replay code on `feat/anti-spoof-pipeline`

**Bucket 3 — Live-stream attacks** (the hard category, biggest paper opportunity)

Sub-categories with decreasing detection confidence:

- **3D realistic mask (silicone/latex):** detectable via rPPG absence (no pulse beneath the mask) + thermal-edge cues if camera supports it (most don't) + landmark warping at expression changes. Confidence after 3 s: ~75%. Datasets: 3DMAD, HKBU-MARs.
- **Hard makeup / heavy contouring:** weakest detection signal — makeup generally preserves pulse and motion. Best signals are landmark-set drift relative to identity-baseline (assumes enrolled user) and unusual specularity. **Honest answer: we cannot detect strong contouring at single-encounter accuracy >60%.** This should be reported as low-confidence ("possible") rather than overclaimed.
- **Live AR filter / overlay app** (Snap, Instagram, FaceApp Live, custom OBS plugins): detectable via temporal coherence breaks at landmark borders, GPU-rendering signature artifacts, predictable filter-library fingerprints (specific points where Snap's filters all distort identically). Confidence after 2 s: ~70% with current research, **not benchmarked publicly** — this is the gap.
- **Deepfake live re-render** (state-of-the-art injection via virtual webcam — DeepFaceLive et al.): the hardest. Active-illumination challenge (random colour flash on screen) is the strongest defense — the deepfake pipeline can't react to a screen colour change in real-time. Confidence with active-illumination after 1 s: > 90%. This matches the existing `liveness_capture` "Color Shaded Screen" commit.

### 6.4 The academic paper angle

The publishable contribution is **not** "we built another anti-spoof system." It is one of:

1. **Labeled benchmark + detector for live AR-filter spoofing.** No major public dataset isolates this category. Current proctoring research lumps it into "video replay" or assumes it's out of scope. A 5–10k clip dataset (collected via amispoof.com with consent) plus a ResNet-class detector that outperforms generic anti-spoof on this category is a strong CVPR Workshop / IJCB / BIOSIG paper.
2. **Browser-deployable lightweight liveness.** Most published liveness models are 100+ MB. A WASM-deployable model achieving competitive AUC at <5 MB has genuine product impact and a clean ablation story.
3. **Active-illumination-as-a-service.** The existing `Color Shaded Screen` commit can be the seed of a paper that quantifies how much active illumination buys you against deepfake injection (the deepfake pipeline's reaction-time limit is concrete and measurable).

(1) is the highest-leverage of the three because it uses the data flywheel that amispoof.com creates.

### 6.5 Naming, domain, ethics

`amispoof.com` is fine but a bit uninviting (suggests the user is the spoof). Alternatives:

- `amispoof.com` (current pick, available — operator should verify)
- `arelive.app` — "are we live?" — friendlier; positions as positive ("verifying I'm real") rather than accusatory
- `notabot.live` — already taken, skip
- `realityattest.com` — sounds enterprise-y, less viral
- `ispoof.me` — short, viral; available (operator verifies)

The strongest ethics rule is **opt-in research donation**. Every submission is destroyed within 30 minutes unless the visitor explicitly clicks "Donate this clip to FIVUCSAS research" with a separate checkbox for "make it public for academic benchmarks." Keep the deletion job auditable. This is the difference between a paper that gets accepted and a paper that gets retracted.

The site must publish:
- A `security.txt` (RFC 9116) — already a Phase 4 plan item.
- A separate DPIA for amispoof.com (this is *not* the FIVUCSAS DPIA; the data subjects are not customers and the legal basis is consent, not contract).
- A clear "Data we keep / Data we throw away" page above the fold.

---

## 7. Build sequence (only if approved)

This sequence assumes the user says "yes do it." It is not the act of saying yes.

**Phase 0 — Prep (operator + 1 day me).** Resolve Task #25 (container rebuild) and Task #55 (CI runner stall) first. Don't add a third backend container while two are unrebuilt and one runner is stuck.

**Phase 1 — Library extraction (3 days me).** Create `shared-detection` submodule. Move common face-detection wrappers out of `biometric-processor` and `web-app`. Stays as a pure library — no service. Verify both existing services still build against the extracted lib. No behaviour change.

**Phase 2 — Proctoring extraction (5 days me).** Create `proctoring-engine` submodule. Rebase `feat/anti-spoof-pipeline` onto its new `main`. Lift the proctoring routes (`/api/v1/proctoring/sessions/...`) out of `biometric-processor` into `proctoring-engine`. Add docker-compose entry. Wire Traefik. Keep on internal-network only initially. Add Loki/Promtail labels. CI on the same self-hosted runner pool (one more reason to fix that stall first).

**Phase 3 — `amispoof.com` static site (2 days me).** A single Vite-built page in a new `amispoof-website` submodule. Pure static + a single serverless function (or just a `/spoof/classify` proxy via Traefik to `proctoring-engine`). Hostinger DNS, GitHub Actions deploy, same pattern as `landing-website`. Put up a "Coming soon — research preview" banner first; flip to live demo once Phase 4 lands.

**Phase 4 — Spoof-classify endpoint hardening (5 days me).** Lift the multi-class detector heads from `feat/anti-spoof-pipeline` into a single classification endpoint. Add explicit per-attack-type confidence outputs. Write the consent + ephemeral-storage logic. Deploy DPIA.

**Phase 5 — Active illumination + AR-filter detector (research, 4–6 weeks me).** This is the paper work. New model training. Dataset collection via amispoof.com (with consent). Ablation study. Submit to nearest deadline (BIOSIG / IJCB).

Total time-to-paper-draft assuming a reasonable cadence: ~3 months of solo time. Time-to-public-amispoof.com-demo: ~3 weeks.

---

## 8. Risks I want the user to be aware of

1. **Operator surface is already stretched** (CI runner stall, container rebuild gate, JWT_SECRET rotation, GDPR fixture removal). Adding a third backend before those land creates compounding ops debt. Phase 0 above is mandatory.
2. **Proctoring's strict GDPR Art. 22 posture.** Automated decisions about exam outcomes are special-category processing. We'll need a human-review fallback path baked into the proctoring API from day one. That's a constraint, not a blocker.
3. **AR-filter detection is research-stage.** We may publish a paper but find the model is not robust enough to ship in product. That's fine — the paper is value on its own. Don't tie product roadmap to the research outcome.
4. **amispoof.com data collection has a regulatory tail.** TR data-protection law (KVKK) requires explicit consent for biometric processing; visitors can withdraw consent and demand deletion. Build the deletion job before the form goes live, not after.
5. **Brand confusion.** `amispoof.com` sitting outside `fivucsas.com` should still link back to FIVUCSAS prominently in the footer. Don't accidentally build a brand silo that doesn't drive customer acquisition.

---

## 9. Decision the user needs to make

Three branches:

A) **"Do it now."** Enter Phase 0 → Phase 1 → … as above. Three new submodules over ~3 weeks; paper work begins ~Phase 5.

B) **"Do the extraction now, defer amispoof.com."** Phase 1 + 2 only. Proctoring becomes shippable as an enterprise-only feature (LMS / KYC integrators). Skip the public demo until enterprise pipeline validates the value. Lower risk, slower paper path.

C) **"Don't split — fold proctoring into biometric-processor permanently."** Cheapest option, but I'd argue against it for the reasons in §4. The branches sitting unmerged for months are the strongest evidence the current monorepo shape is fighting the work.

I'd choose **B** if forced to pick. It validates the architecture without taking on the consent + DPIA work for amispoof.com upfront. amispoof.com can come in Phase 4–5 once the engine is live and we have a few real LMS / KYC pilots informing what the demo should actually demonstrate. But A is also defensible if the user's primary motivation is the academic paper — the paper needs the data flywheel, and the data flywheel needs amispoof.com early.

C should be ruled out.

---

## 10. What I'm NOT doing without the user's go-ahead

- Splitting any repo.
- Buying any domain.
- Touching `feat/anti-spoof-pipeline` or `liveness_capture` branches.
- Writing code in this direction.
- Adding entries to `docker-compose.prod.yml` for a proctoring service.

This memo is research. The user picks A / B / C and tells me; then I plan the chosen path concretely.
