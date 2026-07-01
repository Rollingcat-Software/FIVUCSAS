# Spoof Detector — Deep-Dive Analysis + Client-Compute Research (2026-06-02)

Two-part deliverable requested by the user:
1. Deep dive into the spoof detector — analyze the new reports + all reports together.
2. Research how to **maximize the client PC's compute from the browser** (ONNX / WASM /
   WebGPU / WebNN / a downloadable background program) and how to improve the detector.

Sources read: `docs/SESSION_2026-06-01.md`, `docs/SESSION_2026-05-31.md`,
`docs/SPOOF_DETECTOR_BROWSER_READINESS.md`, `ROADMAP.md`, `README.md`,
`notebooks/CAPTURE_PROTOCOL.md`, the paper sections (`paper/sections/*`), the research
tree (`research/`, `from_biometric_processor/`), `MOBILE_AUTH_DIAGNOSIS_2026-05-30.md`,
the live `notebooks/quick_compare.py --current` output (37 sessions / 21 327 frames),
today's new capture (`amispoof-session-live-1780383974030.json`), and the browser code
(`web/src/`, `web/amispoof/`). Web research on the compute side is cited at the bottom.

---

## Update — shipped 2026-06-02 (branch `claude/client-compute-tiers`)

Acting on this analysis ("go recommended and professional"):

- **Tier-0 compute win (done):** `web/amispoof/app.js` now scales ORT WASM threads to
  the machine (`crossOriginIsolated ? min(hardwareConcurrency, 8) : 1`) instead of a
  hardcoded `2` — **2→8 threads** on the 8-core dev box; logged. Verified across all
  isolation/core cases.
- **Foundation-model FAS head — the accuracy lever (spine built + verified):**
  - `tools/train_fas_adapter.py` — frozen DINOv2/CLIP backbone + trainable head →
    fp16 ONNX. GTX-1650-friendly. `--smoke` proved train→export→ORT-load end-to-end
    (head learned synthetic signal acc→1.0; ORT confirmed `pixel_values[1,3,224,224]`
    → `logits[1,2]`, index 0=spoof/1=real).
  - `web/src/infrastructure/analyzers/FoundationModelAnalyzer.ts` — runs that ONNX on
    the **WebGPU-first** EP (the model class where WebGPU finally pays off, unlike the
    tiny MiniFASNet). Default OFF, **not wired into the fuser** → zero risk to the
    deployed detector until multi-subject validation exists.
  - `web/__tests__/FoundationModelAnalyzer.test.ts` + `imageOps` normalization helper.
    **267/267 web tests green, typecheck clean.**
  - Runbook: `tools/FAS_ADAPTER_README.md`.
- **Face-crop dataset capture (2nd commit) — the multi-subject IMAGE-data path:**
  amispoof gained a DEV-ONLY "📸 Save crops" toggle (localhost-only, default OFF)
  → `server.mjs POST /__save-crop` → gitignored `notebooks/crops/<real|spoof>/
  <subject>/`; `train_fas_adapter.py --dataset folder:` consumes it directly
  (torchvision dropped — PIL+numpy only). Crop geometry matches the analyzer, so
  train ≈ inference. Verified E2E. This is how you get the 3-5 distinct faces the
  86 score-telemetry captures can't provide.
- **Fuser weights were inverted — confidence unreliable (3rd commit):** confidence
  is the weight-normalized MEAN of analyzer top-line scores, and the weights were
  backwards vs measured reliability. Per-frame top-line d' (41 sessions,
  `notebooks/reweight_sim.py`): the 4 most reliable (gaze 1.01, blink_symmetry 0.93,
  blink 0.92, behavioral 0.91) were weighted 0.5 (3 via the silent `?? 0.5`
  fallback); the 4 heaviest (minifasnet/planarity/texture/landmark_var) are noise
  (d' < 0.28); 4 anti-correlated (background_motion −0.59, screen_replay −0.36,
  pose_3d −0.32, moire −0.25) were silently 0.5, pushing confidence the wrong way.
  Shipped a COMPLETE, d'-graded `analyzerWeights` dict (amispoof-scoped, PROVISIONAL):
  separation AUC 0.71→0.81, gap 0.06→0.16.
- **Motion-blur false-reject fixed (commit 4)** — a real face moving at 50 cm was
  verdicted SPOOF; texture collapses from motion blur, not a photo. Two replay-
  validated veto gates (still-frame suppressor + photo-path stillness gate): the
  reported session 2 texture incidents → 0 → LIVE; SPOOF catches unchanged 14/20.
- **Honest confidence + end-to-end harness (commit 5)** — `notebooks/verdict_sim.py`
  replays the 41 sessions through the fuser/veto (recorded `proof_total` for the
  prover). Confirmed the 4 fixes net-improve verdict accuracy **78%→83%** (no
  regression). Replaced the confidence formula (constant +0.3 floor + activity
  term, correct-vs-wrong separation only +0.04) with a boundary-margin CERTAINTY
  (separation **+0.22**) so a wrong verdict now reads low-confidence. PR #96 = 5
  commits. All PROVISIONAL (single-subject) — the foundation head is the real fix.
- **Data finding (verified):** the 86 captures are analyzer-score *telemetry, no pixels*
  → cannot fine-tune a vision model. Training needs public datasets (CASIA-FASD/
  CelebA-Spoof) or face crops captured locally going forward.
- **WebGPU/WebNN EPs are ready but correctly idle** until a heavier model lands (proven
  regression on the 1.7 MB MiniFASNet). The foundation head IS the payload.
- **Native helper / "silent background install":** not possible — browsers forbid silent
  native install by design (the sandbox's whole purpose). Realistic version is a
  one-time *signed* install, invisible thereafter; enterprise/proctoring opt-in only.

---

# PART 1 — State of the spoof detector

## 1.1 One-paragraph status

The detector is a **mature engineering artifact stuck against a data wall.** The browser
port (amispoof.fivucsas.com) is real and impressive: 23 analyzers + 3 gates + an 18-axis
passive liveness-proof scorer, ~173 kB WASM bundle, multi-threaded ORT, deployed,
260 web tests green. The session engine ("guilty until proven innocent", peak-sensitive
verdict, texture-collapse veto with motion-gated subtype typing) is sound. **But every
quantitative claim still rests on essentially one face, one camera, one room.** The newest
work (2026-06-01) is a *correctness* fix to spoof sub-typing, not an accuracy gain — and it
re-confirmed that the headline separability numbers were partly artifacts of mixed-build
data. The honest reading: the project's bottleneck is **generalization + labelled
multi-subject data + a calibration that transfers**, not compute and not more analyzers.

## 1.2 The new reports (2026-06-01 → today)

**`docs/SESSION_2026-06-01.md` — motion-gated VIDEO-vs-STATIC typing.** The user reported a
still photo *on a phone screen* being labelled `SPOOF (video_replay)`. Verdict correct,
subtype wrong. Root cause: subtype was decided by `screen_replay.skin_score`, which only
senses "is this a glowing screen?" (skin ≈ 70 for both a video and a photo on the same
screen). The fix types the confirmed spoof by **non-rigid eyelid-blendshape variance,
measured only on rigid-still frames** (`landmark_var < 30`): median ≥ 0.2 over ≥ 5 still
frames → VIDEO_REPLAY, else STATIC_IMAGE
(`web/src/application/SessionEngine.ts` `checkTextureCollapseReplay`).

The adversarial validation is the valuable part and worth preserving:

| signal | still photo | moved photo | still video | HARD-waved photo |
|---|---|---|---|---|
| blinks | 0 | 1 | 9 | **9 (false)** |
| eye-blendshape var (all frames) | 0.04 | 0.16 | 0.43 | **0.30** |
| gaze.std_x | 0.03 | **0.21** | 0.07 | 0.19 |
| eyeMotion on **rigid-still** frames | 0.026 | 0.058 | **0.405** | — (1 % usable) |

Two correct conclusions came out of this: (a) **`gaze.std_x` is a rigid-motion artifact**
(a waved photo beats a still video), which (b) killed the liveness-corroboration gate that
trusted `gaze.std_x ≥ 0.15` — it had turned a caught replay into a false-accept, so it was
reverted. The "measure non-rigid deformation only on rigid-still frames, and let violent
waving self-defeat by starving the still-frame pool" idea is genuinely good and generalizes
(see §1.5 / Part 3).

**Today's new capture** (`...live-1780383974030.json`, Jun 2 10:06): a LIVE session,
verdict `is_live=true`, confidence 0.713, `real` 0.727 — i.e. a correct true-accept on the
current build. Single session; doesn't move the statistics.

## 1.3 Live data analysis — current build (the number that matters)

`python notebooks/quick_compare.py notebooks/data --current` → 37 sessions kept,
**49 excluded as stale builds**, 21 327 frames. Critically, of the 37 "current" sessions
only **1 is actually on the latest `2026-06-01-motion-typing` build**; 34 are on
`threat-coop`, 3 on `prod-cdn-restore`. So even the "current" set is one build behind.

Subject distribution: `(unlabelled) 32, ahmet 2, chrome-pc 1, photo 2` → **effectively
single-subject. GroupKFold is impossible. Typing thresholds are n=1/class** (the session
doc says so explicitly).

Top features by frame-level AUC (99 features):

| feature | AUC | d′ | note |
|---|---|---|---|
| **gaze.std_x** | 0.796 | 1.10 | TOP — but a **rigid-motion artifact** (§1.2). Unsafe to trust. |
| texture.frequency_score | 0.783 | 1.14 | |
| moire.std_mean | 0.769 | 0.55 | |
| pose_3d_consistency.tz | 0.748 | 0.38 | distance-confounded (replays were held closer) |
| **minifasnet.p_spoof** | 0.743 | 0.38 | the "proven" discriminator is now **mid-pack** |
| texture.color_drift_samples | 0.702 | 0.77 | |
| **texture.texture_score** | **0.625** | **0.235** | **collapsed** — was AUC 0.92 on mixed builds |

Session-level verdict accuracy (from the session doc): **33/39 = 85 %**, with **4
false-accepts** (phone replay → LIVE) and **2 false-rejects** (real face → SPOOF via the
texture veto). The 4 false-accepts all have `gaze.std_x ≤ 0.066` vs lowest LIVE 0.121.

**What this proves:** the once-headline `texture.texture_score` AUC 0.92 was an artifact of
mixing builds and lighting; under honest build-filtering it falls to 0.625 / d′ 0.235. The
current top feature (`gaze.std_x`) is a movement confound, not a liveness signal. The
supposed anchor (MiniFASNet) only reaches 0.743 here. This is consistent with the paper's
own most important admission (§1.4).

## 1.4 The paper's own honest verdict (corroborates the data)

From `paper/sections/*` (read in full):

- **The 13 fuser weights are hand-set heuristics from N=43**, not a swept calibration
  (§5.4). The authors *withdrew* the "optimised/swept" claim; the backing sweep CSV is
  unrecoverable.
- **Two actively-weighted analyzers HARM zero-shot accuracy**: removing `device_boundary`
  improves CASIA-FASD AUC by +0.027, removing `micro_tremor` by +0.021 (§8.2) — they were
  calibrated to 2026 phone bezels and 8–12 Hz tripod tremor absent from 2012-era CASIA.
- **MiniFASNet alone beats the calibrated hybrid zero-shot** on CASIA-FASD
  (0.9454 vs 0.9140, §8.1/§8.2). The hybrid's value is *not* out-of-distribution accuracy.
- **"Deployment without per-operator recalibration is structurally unsafe"** (§9.3).
- The full in-house transparency block (N=325, with print/AR/digital-photo) scores AUC
  **0.47 / 0.40 — below chance** — because the synthesizer doesn't model inkjet halftone,
  AR-boundary discontinuity, or rephotography (§7.3). Only replay is "paper-grade."
- Withdrawn figures (`table1_headline`, in-house synthetic "0.00 % ACER") were pulled in a
  2026-05-29 integrity review for test-set-leakage.

The paper is admirably honest. The point for *us*: the headline 0.945 / 0.782 are the
**zero-shot robustness of MiniFASNet**, which happens to ship with auxiliaries that hurt it
out of distribution. Adding more hand-tuned analyzers has negative expected value until the
calibration transfers.

## 1.5 Cross-cutting issues found

1. **Data wall (P0 for the paper).** Single subject, one camera, one room; n=1/class
   typing thresholds; "current" dataset one build stale. `notebooks/CAPTURE_PROTOCOL.md`
   already specifies the fix (5 subjects × 8 cells = 40 clean current-build sessions with
   subject initials for GroupKFold). **Nothing else in this list matters as much.**
2. **3 LivenessProof axes are permanently 0** (Mouth-motion, Face-motion,
   Expression-dynamics) because their feeding analyzers are disabled
   (`enableTemporal:false`, `enableExpressionDynamics:false`). The UI shows 0, which reads
   as a *detection failure* but is a config decision. Gray them out or re-source them.
3. **`gaze.std_x` is still listed as the #1 discriminator by the tooling** even though the
   session work proved it's a motion artifact. The analysis tooling should flag
   motion-confounded features, or they'll mislead the next calibration.
4. **The texture veto causes the only false-rejects** (real distant faces). The reverted
   corroboration gate was the wrong fix; the right one is a pose-normalized deformation
   signal or a trained fuser (both need the multi-subject data).
5. **Research assets not yet in the browser port** (from the `research/` + `from_biometric_processor/`
   sweep) that are candidate upgrades: the **active light-challenge + flash-spoof analyzer**
   (prod-deployed in `biometric-processor`, +30–50 pp on screen replay), the
   **cutout-anomaly detector**, the hijab-aware **CriticalRegionVisibilityGate v2**, and the
   composite **EnhancedLivenessDetector**. Note amispoof already has a `FlashTemporalAnalyzer`
   (PR pending) that overlaps the light-challenge idea.
6. **`MOBILE_AUTH_DIAGNOSIS_2026-05-30.md` is unrelated to the detector** — it's MFA upload
   plumbing (FACE image too large for a 1 Mbps uplink → truncated body). It only touches the
   spoof detector tangentially: if the FACE upload were fixed, the server-side liveness check
   becomes the next gate. Not a spoof-detector task.

---

# PART 2 — Maximizing the client PC's compute from the browser

## 2.0 Reframe first (important)

The premise from `SESSION_2026-06-01.md §6` — *"CUDA (GTX 1650) is unreachable from the
browser; FPS ~10 is browser-bound"* — is **true**, and there are real wins below. But be
clear about what compute buys:

- More FPS → better temporal sampling (blink physics ~100 ms is under-sampled at 10 fps) →
  modestly better behavioural signals. Real but secondary.
- More compute headroom → you can run a **bigger, better-generalizing model** (the actual
  accuracy lever). **This is where compute and detection-quality converge.**
- Compute does **not** fix false-accepts, calibration transfer, or the single-subject
  problem. Do not expect a GPU to raise the 85 % verdict accuracy by itself.

So: pursue compute to *unlock a better model and smoother temporal signals*, while
understanding the headline accuracy fix is data + a generalizing head (§2.5).

## 2.1 Current compute configuration (measured from the code)

| Layer | Current setting | File |
|---|---|---|
| ORT WASM threads | **`numThreads = 2`** (hardcoded; no `hardwareConcurrency`, no `crossOriginIsolated` check) | `web/amispoof/app.js:235` |
| ORT EP | `["wasm"]` (WebGPU was tried in PR #80 and **dropped** — slower for the 1.7 MB model) | `web/src/index.ts:160` |
| ORT WASM binaries | jsdelivr CDN `onnxruntime-web@1.18.0/dist/` | `app.js:233` |
| MediaPipe delegate | **GPU** (WebGL) by default (`useGpu !== false`) | `MediaPipeFaceDetector.ts`, `index.ts:374` |
| Worker offload | **only 4 heavy analyzers** (texture/moire/screen_replay/device_boundary), 1 worker, `heavyAnalyzerFrameSkip = 3`, `gateFrameSkip = 5` | `HeavyAnalyzerPool.ts`, `index.ts:425-431` |
| Other ~16 analyzers | **run on the main thread every frame** | `web/src/index.ts` |
| Capture | `getUserMedia` ideal **1920×1080** | `app.js:1046` |
| Frame access | Canvas2D `getImageData` (CPU readback per frame) | pipeline |
| Cross-origin isolation | **prod `.htaccess` DOES set COOP/COEP** (lines 25-26) → SharedArrayBuffer is live | `web/amispoof/.htaccess` |

Two things jump out: (a) on an 8-core PC, ORT uses only **2** of 8 cores, blindly; and
(b) the true per-frame cost is probably the **~16 fast analyzers on the main thread**, not
MiniFASNet (5–15 ms) or MediaPipe-on-GPU (3–8 ms). The worker pool only offloads 4.

## 2.2 Tier 0 — free wins inside the current WASM stack (hours, no new deps)

1. **Scale ORT threads to the machine.** Replace the hardcoded `numThreads = 2` with
   ```js
   ort.env.wasm.numThreads = self.crossOriginIsolated
     ? Math.min(navigator.hardwareConcurrency || 4, 8) : 1;
   ```
   On the user's 8-core PC this is 2→8 threads for the WASM EP. Gate on `crossOriginIsolated`
   so it degrades cleanly where COOP/COEP is absent (and log when it falls back, so we stop
   guessing why prod is slow). *Note: more threads helps desktop, can hurt thermally-throttled
   mobile — clamp and possibly cap at `min(4, …)` on coarse mobile UA.*
2. **Process analyzers on the face crop, not the full 1080p frame.** Most per-pixel analyzers
   only need the ~150×150 face ROI. `getImageData` on 1080p is the readback tax flagged in the
   readiness audit (§4.3). Crop once, share the crop.
3. **Move the fast per-pixel analyzers into the worker pool too.** Only 4 of ~20 are
   offloaded. The main-thread analyzer loop is the likely fps ceiling; a second worker for the
   blendshape/landmark math would unblock the render thread.
4. **Drop capture to 1280×720 for analysis** (keep 1080p only if a specific analyzer needs
   it). Half the pixels through every CPU op. The readiness doc already recommends this.
5. **Re-confirm `crossOriginIsolated` at runtime and surface it.** If any subresource ever
   stops sending CORP, COEP silently disables SharedArrayBuffer and threads collapse to 1 with
   no error. Add a one-line telemetry/console assert.

Expected: these alone should move desktop from ~10 fps toward the 25–30 fps the ROADMAP
already cites for the WebGPU-capable path — with **no model change**.

## 2.3 Tier 1 — WebGPU (now universal; the main GPU lever)

State of the world (late 2025 → 2026): **WebGPU ships by default in Chrome, Edge, Firefox
(141 Win / 145 mac) and Safari (macOS Tahoe 26 / iOS 26)** — i.e. all major browsers, ~70 %+
of users. It gives 15–30× on compute workloads and ~80 % of native; it is ORT-Web's *default
GPU EP* now. ([web.dev], [videocardz], [byteiota])

Why it was "dropped" before and why that was correct *then*: MiniFASNet is **1.7 MB / ~1.8 M
params, 80×80 input** ([HF/garciafido], [facenox]). For a model that small, the
CPU→GPU dispatch overhead exceeds the compute — WASM wins. The right rule (from ORT's own
guidance, [onnxruntime/ep-webgpu]) is *WASM for tiny models, WebGPU for compute-intensive
ones.* So WebGPU is not the fix for MiniFASNet — **it's the enabler for the bigger model in
§2.5 and for MediaPipe.**

Concrete WebGPU levers when a heavier model lands:
- Import the WebGPU build: `import * as ort from 'onnxruntime-web/webgpu'`, then
  `executionProviders: ['webgpu']`.
- **Keep tensors on the GPU across frames** with `preferredOutputLocation: 'gpu-buffer'`
  and `ort.Tensor.fromGpuBuffer(...)` — this avoids the per-frame GPU↔CPU copy that dominates
  a naive video pipeline. ([onnxruntime/ep-webgpu])
- Use **graph capture** for static input shapes (single 1×3×H×W face crop qualifies).
- **Zero-copy frame ingest**: `getUserMedia` → `MediaStreamTrackProcessor` → WebCodecs
  `VideoFrame` → `device.importExternalTexture(videoFrame)` feeds the GPU model directly,
  bypassing `getImageData` entirely. WebCodecs↔WebGPU integration shipped in Chromium.
  ([webrtchacks], [mdn/copyExternalImageToTexture])
- f16 quantization (`dtype:'fp16'`) for ~2× and less bandwidth where ops are covered.

ViT-class reality check ([sitepoint], [transformers.js v3]): on an RTX 3060, ViT-base (86 M)
runs **18–22 ms WebGPU vs 35–45 ms WASM** single-image; batched, WebGPU does 16 images in the
time WASM does 2–3. So a 20–90 M-param FAS head is a ~20–40 ms/frame proposition on a
discrete GPU like the user's — comfortably real-time alongside MediaPipe.

## 2.4 Tier 2 — WebNN (NPU access; promising but not yet)

WebNN is the W3C API that reaches the **NPU** (and GPU) and is exposed in ORT-Web as the
`webnn` EP. As of early-to-mid 2026 it is **preview / experimental**: CPU backend is the only
stable path, GPU/NPU are behind flags and need Windows 11 24H2+, and the spec itself warns it
"should not be used in production" yet. Chrome/Edge lead; Firefox/Safari are behind.
([webnn.io], [MS Learn/webnn-overview], [w3.org/webnn])

**Recommendation:** feature-detect `navigator.ml` and add `webnn` to the EP fallback list
*below* webgpu, so capable machines opportunistically use the NPU, but **do not depend on it**
for ~12 months. It's the right long-term home for an always-on liveness model (NPUs are
power-efficient), just not load-bearing today.

## 2.5 The model upgrade that actually moves accuracy (compute ↔ quality convergence)

The 2025–2026 FAS literature has moved decisively to **domain-generalization via vision
foundation models**: DINOv2 (esp. *with Registers*) and CLIP-ViT backbones with small
trainable **adapters** (C-Adapter, S-Adapter), DiVT, and multimodal MMDG++ — these are the
methods that survive *unseen* cameras/subjects/attacks, which is exactly the spoof-detector's
wall. ([arxiv/2604.19196 benchmarking foundation models], [arxiv/2504.04470], [S-Adapter]).

Crucially, these are now **browser-deployable**: DINOv2 and ViT are supported in
transformers.js v3 on WebGPU, quantized (q8/q4/fp16), at the latencies in §2.3. So the path
is coherent:

> Train (or fine-tune via adapter) a DINOv2-small / CLIP-ViT FAS head on the multi-subject
> dataset from `CAPTURE_PROTOCOL.md` → export ONNX (fp16/int8) → run it in-browser on the
> **WebGPU** EP with GPU-resident tensors. This replaces the brittle hand-tuned analyzer bank
> as the primary discriminator and is what the client's GPU is *for*.

This is the single technical thread that ties the user's two questions together: **maximizing
client compute (WebGPU) is the enabler for the generalizing model that fixes the accuracy
problem.** MiniFASNet stays as the cheap WASM fast-path; the heavy head runs on GPU every Nth
frame.

## 2.6 Tier 3 — the downloadable native helper (full CUDA; opt-in power mode)

The user's "download and run a program in the background" idea is viable and has precedent,
but it is a **different product** from amispoof and conflicts with its headline ethos
("no install, no upload, no GPU" — paper §10). Treat it as an **enterprise/proctoring opt-in**,
not the default web experience.

**Architecture options (browser → native):**
- **Localhost WebSocket/HTTPS bridge** *(recommended)*: a small signed helper (Tauri ~10 MB,
  or PyInstaller-bundled) runs the **existing Python engine with `onnxruntime-gpu` (CUDA on
  the GTX 1650)** and exposes `wss://127.0.0.1:<port>`. The amispoof page feature-detects the
  helper (try-connect with timeout), and if present streams frames (WebCodecs-encoded) to it
  and renders the verdicts; if absent, falls back to the all-WASM path. Precedent: NVIDIA
  CloudXR.js streams GPU content to the browser over localhost WebSocket; hardware-key and
  banking middleware use the same pattern. ([nvidia/cloudxr-js], [nvidia-riva/websocket-bridge])
- **Native Messaging host** (browser-extension ↔ native app over stdio JSON): the
  "officially blessed" path, but requires installing an extension *and* a host, and is getting
  more fragile across browsers. Heavier UX. ([MDN/native-messaging], [textslashplain])

**The honest trade-offs (state these to the user):**
- *Pro:* unlocks the full discrete GPU/CPU — you can run a large ensemble (DINOv2-large +
  the full Python analyzer bank + the `l_version_1_300.pt` Silent-FAS model they already
  have) at 30+ fps, and run *active* probes (the flash/light-challenge) with proper timing.
- *Con:* destroys the zero-install/zero-upload value prop; localhost TLS for `wss://` is a
  real headache (self-signed cert trust, or a `*.localhost` ACME scheme); antivirus/SmartScreen
  flags unsigned helpers; it's now an installed binary you must sign, update, and security-audit;
  and frames *do* leave the page (to localhost, but still a bigger attack surface).
- *Verdict:* worth a **spike** for the proctoring/KYC enterprise tier (where an install is
  acceptable and a GPU server is the alternative they're trying to avoid). **Not** worth
  shipping as the amispoof default. If pursued, Tauri + localhost `wss` + the existing Python
  engine is the lowest-effort route because the Python detector already exists and already
  supports `onnxruntime-gpu`.

---

# PART 3 — Prioritized recommendations

Ranked by (impact on the real problem) ÷ (effort):

| # | Action | Type | Effort | Why |
|---|---|---|---|---|
| **1** | **Execute `CAPTURE_PROTOCOL.md`**: 5 subjects × 8 cells, current build, subject initials, GroupKFold. | Data | days (people) | The only thing that makes *any* number defensible. Everything else is premature without it. |
| **2** | **Tier-0 compute wins**: `numThreads→hardwareConcurrency` gated on `crossOriginIsolated`; analyze on face crop; 720p analysis; second worker for fast analyzers. | Compute | ~1 day | Free 2–3× fps on desktop, no model/accuracy risk. `app.js:235` is a one-liner. |
| **3** | **Fix the LivenessProof-axis-0 UX** + flag motion-confounded features (`gaze.std_x`) in the tooling. | Correctness | hours | Stops the UI/tooling from lying; cheap credibility. |
| **4** | **Prototype a DINOv2-small / CLIP-ViT FAS adapter** on the new dataset; export fp16 ONNX; run on the **WebGPU** EP with GPU-resident tensors, MiniFASNet kept as WASM fast-path. | Model + compute | weeks | The actual accuracy/generalization lever; this is what the client GPU is for. |
| **5** | Add `webgpu` (then `webnn`) to the ORT EP fallback list, feature-detected, **only** activated once model #4 exists (WebGPU stays off for tiny MiniFASNet). | Compute | ~1 day | Future-proofs; opportunistic NPU later. |
| **6** | Port the **active light/flash challenge** from `from_biometric_processor` to amispoof (overlaps the pending `FlashTemporalAnalyzer`). | Detection | days | +30–50 pp on screen replay per prod experience; catches the 4 false-accepts passive signals miss. |
| **7** | **Spike** the Tauri + localhost-`wss` native helper running the Python+CUDA engine, **as an enterprise opt-in only.** | Compute | 1–2 wk spike | Answers "use the full PC"; keep it off the default path to protect the no-install ethos. |

**The headline for the user:** the spoof detector's problem is a **data + generalization
wall, not a compute wall.** Maximizing client compute is worth doing — and the cleanest way to
*use* that compute is to put a **WebGPU-served foundation-model FAS head** (DINOv2/CLIP-adapter)
in front of the hand-tuned analyzers. The downloadable-helper/CUDA route works and has
precedent, but it trades away amispoof's entire "no install, no upload, no GPU" identity, so it
belongs only in an enterprise proctoring tier — not the public demo.

---

## Sources (compute research)

- ORT Web WebGPU EP: https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html
- ORT Web WebNN EP: https://onnxruntime.ai/docs/tutorials/web/ep-webnn.html
- WebGPU ships in all major browsers: https://web.dev/blog/webgpu-supported-major-browsers · https://videocardz.com/newz/webgpu-is-now-supported-by-all-major-browsers
- WebGPU 2026 perf: https://byteiota.com/webgpu-2026-70-browser-support-15x-performance-gains/
- WebNN status/compat: https://webnn.io/en/api-reference/browser-compatibility/api · https://learn.microsoft.com/en-us/windows/ai/directml/webnn-overview · https://www.w3.org/TR/webnn/
- transformers.js v3 WebGPU: https://huggingface.co/blog/transformersjs-v3
- WebGPU vs WASM ViT benchmarks: https://www.sitepoint.com/webgpu-vs-webasm-transformers-js/
- MiniFASNet ONNX (size/arch): https://huggingface.co/garciafido/minifasnet-v2-anti-spoofing-onnx · https://github.com/facenox/face-antispoof-onnx
- FAS domain generalization (foundation models / DINOv2 / CLIP adapters): https://arxiv.org/html/2604.19196 · https://arxiv.org/html/2504.04470v1 · https://arxiv.org/pdf/2309.04038
- Video pipeline / zero-copy: https://webrtchacks.com/video-frame-processing-on-the-web-webassembly-webgpu-webgl-webcodecs-webnn-and-webtransport/ · https://developer.mozilla.org/en-US/docs/Web/API/GPUQueue/copyExternalImageToTexture
- Native helper precedent: https://developer.nvidia.com/blog/build-and-stream-browser-based-xr-experiences-with-nvidia-cloudxr-js/ · https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_messaging
