# FACT PACK — Biometric Processor (FastAPI) + spoof-detector

> Ground-truth extracted from `/opt/projects/fivucsas/biometric-processor`,
> `/opt/projects/fivucsas/spoof-detector`, and `/opt/projects/fivucsas/practice-and-test`
> at HEAD (2026-06-05). Every number below was read from code / config / migrations.
> **Report only what is here; do not fabricate metrics.** Where a value is a *default*
> vs the *production* `.env.prod`/compose override, both are given.

---

## 1. Versions / Stack (biometric-processor)

The biometric-processor is a **Python 3.12 / FastAPI** microservice (Clean
Architecture / hexagonal: `domain` → `application` → `infrastructure`, with DI in
`app/core/container.py`). Runs on **port 8001** under **Uvicorn/Gunicorn**.

- **Runtime Python:** 3.12.10 (`runtime.txt`). (`pyproject.toml` aspirationally says
  3.13, but the prod Docker base is pinned `python:3.12-slim` by digest.)
- **FastAPI** 0.136.1 ; **Uvicorn** 0.46.0 ; **Pydantic** 2.13.4 / pydantic-settings 2.14.1
  (lock `requirements-known-good-2026-05-29.lock`; `requirements.txt` floor `fastapi>=0.115.12,<1.0.0`).
- **DeepFace** 0.0.98 (installed `--no-deps`); **TensorFlow-CPU** 2.21.0 + `tf-keras` (Keras-2 compat, `TF_USE_LEGACY_KERAS=1`).
- **MediaPipe** 0.10.35 (face landmarker via `mp.tasks.vision.FaceLandmarker`, bakes `models/face_landmarker.task`).
- **OpenCV** = `opencv-python-headless` 4.13.0.92.
- **onnxruntime** 1.26.0 (CPU-only; powers UniFace MiniFASNet ONNX + ONNX parity checks).
- **uniface** 3.6.0 — PINNED; 3.7.0+ segfaults MiniFASNet ONNX preload under `read_only`+`cap_drop` runtime.
- **numpy** 2.4.4 (PINNED for native-ABI stability) ; scikit-image 0.26.0 ; scipy.
- **mtcnn** 1.0.0 (server face detection) ; **ultralytics** 8.4.48 (YOLOv8, document/card detection) ; **pytesseract** 0.3.13 (OCR).
- **Resemblyzer** 0.1.4 + **librosa** 0.9.2 (voice speaker embeddings, 256-dim).
- DB: **asyncpg** 0.31.0, **pgvector** (python) 0.4.2, psycopg2-binary, SQLAlchemy 2.0 + Alembic. **redis** (python) 7.4.0.
- Crypto: **cryptography** (Fernet for embedding cipher), **asn1crypto** (eMRTD ASN.1 / CMS), PyJWT.
- **spoof-detector** library pulled as `spoof-detector @ git+…@v0.2.1` (algorithms live there; bio-processor only imports + wires — per the "spoof-detector architecture" decision).

**Prod deploy posture:** internal-only (no public Traefik route); `SimpleAPIKeyMiddleware`
requires `X-API-Key` on `/api/*`; only identity-core-api (Java) calls it via
`BiometricProcessorClient`. Demo UI disabled (`DEMO_UI_ENABLED=false`). Hardened runtime:
`read_only` rootfs + tmpfs + `cap_drop:ALL` (+ CHOWN/SETUID/SETGID), `no-new-privileges`,
digest-pinned base image and a known-good constraints lock (P0-2b, 2026-05-30).

---

## 2. REAL API routes (grep of `@router.*` in `app/api/routes/`)

**26 route modules** (`app/api/routes/`), **69 HTTP/WebSocket endpoints** total
(`grep -c @router.(get|post|put|delete|patch)` = 69; plus 1 `@router.websocket`).
Router prefixes/paths as declared in code:

| Category | Module(s) | Endpoints (verb + path) |
|---|---|---|
| **Face enroll** | `enrollment.py` | `POST /enroll`, `POST /enroll/multi`, `DELETE /enroll/{user_id}` |
| **Face verify (1:1)** | `verification.py` | `POST /verify` |
| **Face search (1:N)** | `search.py` | `POST /search` |
| **Quality** | `quality.py` (`/quality`) | `POST /quality/...` |
| **Comparison** | `comparison.py` (`/compare`) | `POST /compare/...` |
| **Landmarks** | `landmarks.py` (`/landmarks`) | `POST /landmarks/...` |
| **Demographics** | `demographics.py` (`/demographics`) | `POST /demographics/...` |
| **Multi-face** | `multi_face.py` (`/faces`) | `POST /faces/...` |
| **Similarity matrix** | `similarity_matrix.py` (`/similarity`) | `POST /similarity/...` |
| **Embeddings I/O** | `embeddings_io.py` (`/embeddings`) | `GET`, `POST` |
| **Passive liveness** | `liveness.py` | `POST /liveness`, `POST /liveness/active/start`, `POST /liveness/active/frame` |
| **Active liveness — Biometric Puzzle** | `puzzle.py` (`/liveness`) | `POST /liveness/generate-puzzle`, `POST /liveness/verify`, `POST /liveness/verify-challenge` |
| **Flash challenge** | `flash_challenge.py` (`/liveness`) | `POST /liveness/flash-challenge/start`, `/respond` |
| **Verification pipeline (KYC)** | `verification_pipeline.py` (`/verification`) | `POST /verification/document-scan`, `/data-extract`, `/face-match`, `/liveness-check`, `/pipeline/test`, `/video-interview` |
| **NFC / eMRTD** | `nfc.py` (`/nfc`) | `POST /nfc/mrz`, `POST /nfc/verify-authenticity` |
| **Card type** | `card_type_router.py` (`/card-type`) | `POST /card-type/...` |
| **Voice** | `voice.py` | `POST /voice/enroll`, `POST /voice/verify`, `POST /voice/search`, `DELETE /voice/{user_id}` |
| **Batch** | `batch.py` (`/batch`) | `POST /batch/enroll`, `POST /batch/verify` |
| **Proctoring (REST)** | `proctor.py` (`/proctoring`) | 14 endpoints (sessions CRUD, frames, incidents, report, rate-limit) |
| **Proctoring (WebSocket)** | `proctor_ws.py`, `live_analysis.py` | `GET /proctoring/ws/stats`, `WS /ws/live-analysis` |
| **Admin** | `admin.py` (`/admin`) | `GET /admin/stats`, `GET /admin/activity` |
| **Webhooks** | `webhooks.py` (`/webhooks`) | register/list/delete/test |
| **Health/metrics** | `health.py`, `health_probes.py`, `metrics.py` | `/health`, `/health/detailed`, `/health/live`, `/health/ready`, `/metrics`, `/metrics/cache` |

*(All routes are mounted under the app's `/api/v1` prefix in `app/main.py`; the table
shows the router-local paths.)* Iris: **no endpoints** (not implemented).
Fingerprint: **removed** (P1.4 — was a SHA-256 placeholder; platform fingerprint =
WebAuthn/FIDO2 in identity-core-api, not here).

---

## 3. ML stack actually used in PRODUCTION

`.env.prod` + `docker-compose.prod.yml` set the live values (overriding code defaults
in `app/core/config.py`):

| Stage | Production value | Notes |
|---|---|---|
| **Server face detection** | **MTCNN** (`FACE_DETECTION_BACKEND=mtcnn`) | bundled weights; deviation from CenterFace roadmap due to a DeepFace bug |
| **Server face recognition / embedding** | **Facenet512** (`FACE_RECOGNITION_MODEL=Facenet512`), **512-dim** (`EMBEDDING_DIMENSION=512`) | code default is `Facenet`/128; prod overrides to 512. Model↔dim must always match. |
| **Server passive liveness** | **UniFace MiniFASNet** ONNX (`LIVENESS_MODE=passive`, `LIVENESS_BACKEND=uniface`) | process-wide shared ONNX session (`_get_shared_minifasnet()` in `uniface_liveness_detector.py`) |
| **Server anti-spoofing** | **enabled** (`ANTI_SPOOFING_ENABLED=true`, `ANTI_SPOOFING_THRESHOLD=0.5`) | DeepFace built-in anti-spoof + spoof-detector pipeline (see §6) |
| **Client face detection (web-app)** | **MediaPipe FaceLandmarker, 478-point** (PRIMARY) → **BlazeFace** TF.js ~1.2 MB (SECONDARY, while engine loads) → MediaPipe FaceDetector `blaze_face_short_range` (FALLBACK) | `web-app/src/features/auth/hooks/useFaceDetection.ts` |
| **Voice** | Resemblyzer 256-dim speaker embeddings, centroid-based | `speaker_embedder.py`; L2-normalized cosine at verify |
| **Document/card detection** | YOLOv8 (ultralytics); MRZ TD1/TD3 parser; Tesseract OCR for TC Kimlik fields | `verification_pipeline.py`, `mrz_parser.py` |

**CPU-only safety gate:** `ALLOW_HEAVY_ML=false` (default) refuses GPU-needing backends
(retinaface, yolov8/11/12, ArcFace, VGG-Face, GhostFaceNet) at startup. Hetzner CX43 is CPU-only.

**Embedding dimension rule** (from CLAUDE.md + `config.py`): `Facenet`→128, `Facenet512`→512,
VGG-Face→2622. Changing the model invalidates all stored embeddings (re-enrollment required).

---

## 4. Biometric Puzzle — ACTIVE liveness algorithm (the project's signature challenge-response)

**Server code:** `app/application/use_cases/generate_puzzle.py`,
`app/application/services/active_liveness_manager.py`,
`app/application/use_cases/verify_puzzle.py`; routes in `app/api/routes/puzzle.py`
(`/liveness/generate-puzzle`, `/liveness/verify`, `/liveness/verify-challenge`).
Client face geometry scored against **MediaPipe FaceLandmarker** landmarks (+ optional blendshapes).

### Challenge types (`ChallengeType`, `app/api/schemas/active_liveness.py`)
Face-modality (scored by `ActiveLivenessManager`):
`BLINK ("blink")`, `SMILE ("smile")`, `LIGHT ("light")`, `TURN_LEFT`, `TURN_RIGHT`,
`OPEN_MOUTH`, `RAISE_EYEBROWS`.
Gesture-modality (scored by `ActiveGestureLivenessManager`, hand-landmarks only, no ML
inference): `FINGER_COUNT`, `SHAPE_TRACE`, `WAVE`, `HAND_FLIP`, `FINGER_TAP`, `PINCH`,
`PEEK_A_BOO`, `MATH`, `HOLD_POSITION`.

### Randomization (`GeneratePuzzleUseCase`)
- Random step count + random action per step (`random.randint`, `random.choice`).
- **Difficulty config** (`DIFFICULTY_CONFIG`): EASY = 2–3 steps @ 7.0 s/step;
  STANDARD = 3–4 steps @ 5.0 s/step; HARD = 4–5 steps @ 4.0 s/step.
- **Incompatible sequences** blocked: `(TURN_LEFT, TURN_RIGHT)` and `(TURN_RIGHT, TURN_LEFT)`
  can't immediately follow each other; the same action is not repeated twice in a row.
- Puzzle persisted with TTL = `timeout_seconds + 60` s (default 60+60).

### Detection thresholds shipped to the client (`DEFAULT_THRESHOLDS`)
- `ear_threshold = 0.21` (blink) — also `ActiveLivenessManager._blink_threshold = 0.21`
- `mar_threshold = 0.4` (smile) — `_smile_threshold = 0.4`
- `head_turn_threshold = 0.15` — `_head_turn_threshold = 0.15`
- `mouth_open_threshold = 0.5` — `_mouth_open_threshold = 0.5`
- `eyebrow_threshold = 0.08` — `_eyebrow_threshold = 0.08`

### EAR (Eye Aspect Ratio) — `_calculate_ear`, MediaPipe 6-point eyes
- `LEFT_EYE_INDICES = [362,385,387,263,373,380]`, `RIGHT_EYE_INDICES = [33,160,158,133,153,144]`
- **Formula:** `EAR = (‖p2−p6‖ + ‖p3−p5‖) / (2·‖p1−p4‖)` (Soukupová & Čech 2016 form).
- Blink fires when `avg_ear < 0.21` (eyes-closed latch) then re-opens (transition detection);
  baseline EAR captured when `avg_ear > 0.2`. (The separate single-frame `_compute_ear`
  in `face_signal_metrics.py` averages left/right region EAR for verification signals.)

### MAR (Mouth Aspect Ratio) — `_calculate_mar`
- `MOUTH_CORNER_LEFT=61`, `MOUTH_CORNER_RIGHT=291`, `UPPER_LIP_CENTER=13`, `LOWER_LIP_CENTER=14`
- **Formula:** `MAR = ‖lower_lip − upper_lip‖ / ‖right_corner − left_corner‖`
- Smile detected when `mar > 0.4` AND `smile_ratio (= mar / baseline_mar) > 1.3`.
- Open-mouth detected when `mar > 0.5`.

### Head pose (yaw via landmark geometry) — `_detect_head_turn`
- Uses `NOSE_TIP=1`, `LEFT_EAR=234`, `RIGHT_EAR=454`. `center_x = (left_ear.x + right_ear.x)/2`;
  `deviation = nose.x − center_x`. TURN_LEFT when `deviation > 0.15`, TURN_RIGHT when
  `deviation < −0.15`. (Yaw approximated by nose-vs-ear-midpoint horizontal offset;
  full yaw/pitch/roll head-pose lives in the spoof-detector `Pose3DConsistencyAnalyzer`
  and `HeadPose` in `src/gates/landmarks.py`.)
- Eyebrow raise: brow-to-eye vertical distance `> 0.08` (or blendshape `browInnerUp/OuterUp` avg `> 0.3`).
- When MediaPipe **blendshapes** are present, detection uses them directly:
  `eyeBlink* > 0.5`, `mouthSmile* > 0.4`, `jawOpen > 0.4`, brow blendshapes `> 0.3`.

### Verify-puzzle scoring (`VerifyPuzzleUseCase`)
- `MIN_STEP_CONFIDENCE = 0.6`, `MIN_STEP_DURATION_SECONDS = 0.5`, **`PASS_THRESHOLD = 0.6`** (60% overall).
- **Anti-replay:** timestamp monotonicity check (100 ms tolerance), puzzle existence/expiry,
  already-completed guard; optional spot-check frames re-run passive liveness (capped
  `MAX_FAILED_SPOT_CHECK_FRAMES`).
- Lightweight `/verify-challenge` (web training surface, single challenge, structural only):
  `_MIN_CHALLENGE_DURATION_S = 0.12`, `_MAX_CHALLENGE_DURATION_S = 60.0`,
  `_MIN_CHALLENGE_CONFIDENCE = 0.5` — added so the React puzzle can't "pass" client-side only.

---

## 5. Passive anti-spoofing in biometric-processor (texture / moiré / frequency / colour)

`app/infrastructure/ml/liveness/` holds multiple detectors selected by `LivenessDetectorFactory`
(`liveness_factory.py`). Effective backends: `enhanced`, `texture`, `uniface` (+ `optimized`,
`hybrid`). Prod uses **uniface** (MiniFASNet ONNX).

**TextureLivenessDetector** (`texture_liveness_detector.py`) — classical CV, no NN:
- **Texture** = Laplacian variance (default `texture_threshold=100.0`)
- **Colour** distribution naturalness (`color_threshold=0.3`)
- **Frequency**-domain analysis (`frequency_threshold=0.5`)
- **Moiré** pattern score (`moire_pattern_analysis.py`)
- Combined score = `texture·0.35 + color·0.25 + frequency·0.25 + moire·0.15`; `is_live` when
  combined `≥ liveness_threshold` (default 60.0).
Other detectors present: `enhanced_liveness_detector`, `hybrid_liveness_detector`,
`optimized_texture_liveness`, `screen_replay_anti_spoof`, `rppg_analyzer`,
`temporal_consistency_analyzer`, `threshold_calibrator`.

**Liveness verdict policy** (`LIVENESS_VERDICT_POLICY`, default **conservative** = secure):
either backend voting "spoof" wins. (`optimistic` = primary backend wins on high confidence.)

---

## 6. amispoof analyzers + gates (spoof-detector — standalone Python lib + TypeScript browser port)

`spoof-detector` repo = the **algorithm home** (v0.2.1 Python pip pkg; web port
`@rollingcat/spoof-detector` v0.3.0). The browser build is deployed at
**amispoof.fivucsas.com** (in-browser anti-spoof tester; onnxruntime-web + WebGPU + Web Worker pool).

### Python library (`spoof-detector/src/`, v0.2.1, requires-python ≥3.10)
- **13 analyzers** (`src/infrastructure/analyzers/`): `MiniFASNetAnalyzer`, `TextureAnalyzer`,
  `MoireAnalyzer`, `ScreenReplayAnalyzer`, `ScreenFlickerAnalyzer`, `TemporalAnalyzer`,
  `RPPGAnalyzer`, `BlinkAnalyzer`, `MicroTremorAnalyzer`, `LandmarkVarianceAnalyzer`,
  `DeviceBoundaryAnalyzer`, `BackgroundGridAnalyzer`, `ARFilterAnalyzer`.
- **Gates** (`src/gates/`): `FaceUsabilityGate`, `FaceQualityIlluminationGate`,
  `CriticalRegionVisibilityGate` (+ tracker/state), plus `HeadPose`/`Landmark` primitives.
- **Fusion** (`src/fusion/hybrid_evaluator.py`): `HybridFusionEvaluator` — weighted
  `pretrained_model·MiniFASNet + flash_response + moire_pattern + device_replay`; **decision
  `threshold = 0.45`**, `is_spoof = final_spoof_score > 0.45`.
- **Multi-class fuser** (`src/infrastructure/fusion/multi_class_fuser.py`) → `SpoofCategory`
  taxonomy: `REAL, STATIC_IMAGE, VIDEO_REPLAY, MASK_3D, HEAVY_MAKEUP, AR_FILTER,
  DEEPFAKE_INJECT` (`src/domain/models.py`), via the `SPOOF_SIGNAL_MAP` weight matrix in
  `src/domain/taxonomy.py`.
- **Pipeline assembler** (`src/pipeline/assembler.py`, `AntispoofPipelineAssembler`): runs
  3 layers — (1) FaceUsabilityGate, (2) DeviceSpoofRiskEvaluator, (3) HybridFusionEvaluator —
  emits an advisory `recommended_action ∈ {allow, review, block}`. **Fail-soft** (every layer
  try/caught) — an anti-spoof bug can never hard-block by raising.
- **`LivenessProver`** ("guilty until proven innocent"): session starts as SPOOF; subject must
  accumulate passive + optional active-challenge evidence; `score ≥ 60 ⇒ proven live`;
  active challenges max 40 points.
- **ISO/IEC 30107-3 metrics** implemented (`src/metrics/iso30107.py`): `apcer`, `bpcer`,
  `acer = (APCER+BPCER)/2`, `eer`, `far_at_frr`, `frr_at_far` + bootstrap CIs. (Harness exists;
  the poster's "100% accuracy / ACER 0.00%" learned-fuser claim is **UNVERIFIED — do NOT cite**.)

### TypeScript browser port (`spoof-detector/web/src/`, v0.3.0)
- **25 analyzers** (`src/infrastructure/analyzers/*.ts`) — the 13 above plus browser-only ones:
  `AudioMouthSyncAnalyzer`, `BackgroundMotionAnalyzer`, `BehavioralPatternAnalyzer`,
  `BlinkSymmetryAnalyzer`, `ExpressionDynamicsAnalyzer`, `EyebrowAnalyzer`,
  `FlashReflectionAnalyzer`, `FlashTemporalAnalyzer`, `GazeAnalyzer`, `HandTrackingAnalyzer`,
  `LandmarkPlanarityAnalyzer`, `Pose3DConsistencyAnalyzer`, `VoiceActivityAnalyzer`.
- **3 quality gates** (`src/gates/`): `FaceUsabilityGate`, `IlluminationGate`,
  `CriticalRegionVisibilityGate`; plus a `ReadinessGate` (`src/application/ReadinessGate.ts`):
  camera-responsive + single-face + min face-area fraction `0.05` + lighting + occlusion
  (only blocks session start when occlusion `≥ 0.85` — confident-high; boolean else).
- MediaPipe detectors: FaceDetector, HandDetector, SelfieSegmenter. `MiniFASNetAnalyzer`
  runs the ONNX model in-browser.
- **256 vitest cases** across `web/__tests__/` (per-analyzer + Assembler + gates + a
  CASIA-FASD micro-bench harness `CasiaFasdMicroBench`).

### How spoof-detector is WIRED into biometric-processor `/verify` and `/enroll`
`verification.py` lazily builds `AntispoofPipelineAssembler` from `spoof_detector.*`
(`_get_antispoof_assembler()`), guarded by flags. On `/verify`:
1. **Passive liveness gate** (always): `CheckLivenessUseCase` (UniFace + DeepFace veto);
   reject if `not is_live` or `score < 0.4` (`VERIFY_MIN_LIVENESS_SCORE`) → HTTP 400 `LIVENESS_FAILED`.
2. **Anti-spoof pipeline** (`_evaluate_antispoof_pipeline_safe`) + **single-frame EAR veto**
   (`_evaluate_ear_liveness_safe`, EAR threshold 0.18 per the 2026-05-11 calibration —
   both-eyes-closed ⇒ photo signal), gated by `ANTISPOOF_*` flags.
3. **Block enforcement:** `_merge_block_verdict()` → if the assembler recommends `block` or
   EAR veto fires AND `ANTISPOOF_BLOCK_ENFORCE=true` (default), return **HTTP 403
   `ANTISPOOF_BLOCKED`**. If enforcement off, the veto is logged-only (observation mode).
- `ANTISPOOF_DEVICE_RISK_ENABLED` / `USABILITY_GATE_ENABLED` / `FUSION_ENABLED` / `CUTOUT_ENABLED`
  default **false** in compose (the full pipeline layers are opt-in); the passive-liveness gate
  and EAR veto are the always-on path.

On `/enroll` (and `/enroll/multi`): since 2026-05-29/30, enroll runs the **same**
server-authoritative passive liveness + anti-spoof + EAR veto **before persisting** the
embedding, gated by `ENROLL_LIVENESS_ENABLED` (default True). Multi-image enroll is
**fail-closed**: any non-live frame rejects the whole batch; only quality-class failures are
per-frame skippable (`_SKIPPABLE_FRAME_ERRORS`; min-quality-per-image default lowered 60→40).

---

## 7. Quality assessment metrics + thresholds

`app/infrastructure/ml/quality/quality_assessor.py`:
- **Blur** = Laplacian variance (`blur_threshold = 100.0`).
- **Lighting** = mean brightness.
- **Face size** score.
- **Overall** = `blur·0.4 + lighting·0.3 + face_size·0.3` (0–100); default `quality_threshold = 70.0`.
- **Head-pose penalty** (best-effort via MediaPipe FaceMesh): if `|yaw| > 30°` or `|pitch| > 25°`,
  overall score `× 0.7`.
- Hard reject when blur `< 5` (unusable) or face too small.
- **Prod override:** `QUALITY_THRESHOLD = 40.0` (compose). Verification uses an even more
  lenient floor (`VERIFICATION_QUALITY_THRESHOLD = 50.0` in `verify_face.py`).

---

## 8. pgvector index type + cosine similarity thresholds

### Index type — **IVFFlat** (NOT HNSW) is the active production index
- **identity-core-api Flyway** `V4__create_biometric_tables.sql`: `biometric_data.embedding
  vector(512)` (comment: "using Facenet512 dimension") with
  `CREATE INDEX idx_biometric_embedding_ivfflat … USING ivfflat (embedding vector_cosine_ops) WITH (lists=…)`.
  An HNSW variant is present **only as a commented-out alternative**.
- **identity-core-api** `V33__create_voice_enrollments_table.sql`: voice_enrollments
  `USING ivfflat (embedding vector_cosine_ops)`.
- **biometric-processor Alembic** `0003_add_performance_indexes`: `idx_embeddings_vector_ivfflat
  ON face_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`.
  *(The Alembic `0001_initial_schema` created an HNSW index on a `biometric_data` table, but
  the production face-embedding search surface is `face_embeddings` with the IVFFlat index;
  the parent CLAUDE.md's blanket "HNSW indexes" line is contradicted by the real migration
  SQL — **report IVFFlat, vector_cosine_ops, lists=100**.)*
- `client_embedding_observations.client_embedding vector(128)` has **no ANN index** (log-only
  analytical table, D2).

### Cosine similarity / distance (`app/infrastructure/ml/similarity/cosine_similarity.py`)
- Comparator semantics: **`verified = distance < threshold`** (cosine *distance* = `1 − cosine_similarity`,
  computed on L2-normalized embeddings via `np.dot`). HIGHER threshold = more lenient.
- **`VERIFICATION_THRESHOLD`**: code default **0.45**, **prod override 0.4** (compose).
- **Aged-embedding adaptive threshold:** if stored embedding older than
  `VERIFICATION_THRESHOLD_AGED_YEARS` (default 2.0 yr), use `VERIFICATION_THRESHOLD_AGED`
  (default **0.55**, must be ≥ the standard threshold — a config validator enforces this to
  catch the pre-2026-05-12 inversion bug).
- **1:N face search** (`/search`, pgvector `<=>` cosine-distance operator): caller-supplied
  distance threshold, server-capped (`FACE_SEARCH_MAX_DISTANCE`); cross-tenant search forbidden.
- **Voice:** verify accepts cosine **similarity ≥ 0.65** (probe + centroid both L2-normalized,
  P1-10 fix); `/voice/search` uses pgvector `<=>` cosine distance.

---

## 9. NFC / eMRTD eID reader

### Server-side passive authentication (biometric-processor) — `POST /nfc/verify-authenticity`
`app/domain/services/emrtd_passive_auth.py` (`EmrtdPassiveAuthService`) — **ICAO 9303 Part 11
passive authentication**, pure-Python crypto (`asn1crypto` + `cryptography`), **no GPU/ML**.
Fail-closed; accepts `{sod_b64, data_groups:{"<dg#>":b64}}` and verifies:
1. Each provided **Data Group hash** matches the value signed in EF.SOD's `LDSSecurityObject`.
2. The SOD **CMS SignedData** (RFC 5652) signature verifies under the embedded **Document
   Signer (DS)** certificate.
3. DS cert **chains to a trusted CSCA root** (operator trust store in `NFC_CSCA_TRUST_DIR`,
   default `app/core/csca_trust_store/`; empty store ⇒ `reason_code=NO_TRUST_STORE`).
4. (BIO-M2) DS **and** CSCA validity windows checked → `DS_CERT_EXPIRED` / `CSCA_CERT_EXPIRED`.
Returns `{is_authentic, reason, reason_code, ds_subject, ds_serial, csca_matched,
dg_hash_results, sod_hash_algorithm}`. Consumed by identity-core-api `NfcDocumentAuthHandler`.
- `POST /nfc/mrz` — pure MRZ parsing (`mrz_parser.py`): **TD3** (2×44, passports) and **TD1**
  (3×30, ID cards), DG1 TLV envelope or raw text; no OCR, no DB.

### Client-side chip reading (practice-and-test, Android Kotlin — R&D, not in the prod platform)
- **`TurkishEidNfcReader`** + **`UniversalNfcReader`**: read the contactless chip over Android NFC
  (`IsoDep`/raw APDU — `ApduHelper.kt`, `NfcCardReader.kt`), implement **BAC** (Basic Access
  Control, `BacAuthentication.kt`) + **SecureMessaging.kt**, parse DG1 (`Dg1Parser.kt`) and
  validate EF.SOD (`SodValidator.kt`). Crypto via **BouncyCastle** (`bcprov-jdk18on:1.77` +
  `bcpkix`) — a from-scratch eMRTD stack (not JMRTD). Roadmap in `PASSPORT_NFC_ROADMAP.md`.

---

## 10. Embedding storage + log-only client geometry embedding (D2)

- **Face embedding storage** (`pgvector_embedding_repository.py`, table `face_embeddings`):
  dual-column store — `embedding` (pgvector plaintext, the **ANN/IVFFlat search index**) +
  `embedding_ciphertext` (bytea, the canonical **store-of-record**, **Fernet** /
  AES-128-CBC+HMAC-SHA256 via `EmbeddingCipher`, `FIVUCSAS_EMBEDDING_KEY`, `key_version` column
  for rotation). UPSERT per `(user_id, tenant_id)`. Cross-tenant search forbidden.
- **Voice:** `voice_enrollments` — individual enrollments + a centroid (`AVG(embedding)::vector`,
  256-dim); incremental quality-weighted fusion in optimize mode.
- **D2 — client geometry embedding is LOG-ONLY (never used for auth):** the 128-dim client-side
  pre-filter embedding is recorded fire-and-forget via `BackgroundTasks` into
  `client_embedding_observations` (Alembic 0004, `vector(128)`, no ANN index) on both `/enroll`
  and `/verify`. Used for **offline divergence analysis only** (128-dim client model identity is
  opaque to the server vs Facenet512 server embedding). Architecture decision: "auth decision
  must be on the server; the browser is untrusted."

---

## 11. Standalone vs wired-into-/enroll-//verify (clarity table)

| Capability | Wired into `/enroll` + `/verify`? | Notes |
|---|---|---|
| MTCNN detect + Facenet512 embed + cosine match | **Yes** | core path |
| UniFace MiniFASNet passive liveness | **Yes** (both, since 2026-05-29) | reject `is_live=false` or score<0.4 |
| spoof-detector anti-spoof pipeline + EAR veto | **Yes**, gated by `ANTISPOOF_*` flags; block-enforce default on | fail-soft; full pipeline layers opt-in |
| Quality assessment | **Yes** | enroll thr 40, verify floor 50 |
| Biometric Puzzle (active liveness) | **Standalone** flow (`/liveness/*`) | challenge-response; consumed by web/clients, not auto-run inside `/verify` |
| Texture/moiré/frequency/colour `TextureLivenessDetector` | Selectable backend (prod uses uniface) | `enhanced`/`texture` available |
| Flash challenge, proctoring, KYC pipeline, demographics, multi-face, similarity matrix | **Standalone** endpoints | not part of 1:1 verify |
| Voice enroll/verify/search | Standalone (`/voice/*`) | 256-dim Resemblyzer |
| NFC `/nfc/verify-authenticity` (eMRTD passive auth) | Standalone; called by identity-core-api `NfcDocumentAuthHandler` | pure crypto |
| Client 128-dim geometry embedding (D2) | Recorded on both, **never decisive** | log-only |
| Iris | Not implemented | — |
| Server fingerprint | Removed (was SHA-256 placeholder) | WebAuthn instead |

---

## 12. Suggested citations for the thesis (keys already in bibliography.md)

`zhang2016-mtcnn`/`challapalli2024-mtcnn` (MTCNN), `schroff2015-facenet` (Facenet512),
`serengil2020-lightface`/`deepface-lib` (DeepFace), `mediapipe` (FaceLandmarker 478pt),
`bazarevsky2019-blazeface` (BlazeFace fallback), `minifasnet` (UniFace MiniFASNet),
`soukupova2016-ear` (EAR blink), `opencv` (Laplacian/texture), `pgvector` (IVFFlat ANN),
`faiss` (ANN context), `iso30107-3` (PAD metrics APCER/BPCER/ACER), `icao9303` (eMRTD passive auth),
`fastapi`, `postgresql`, `redis`, `bcrypt` (n/a here — embeddings use Fernet, cite `gdpr`/`kvkk6698`
for biometric-data protection).
