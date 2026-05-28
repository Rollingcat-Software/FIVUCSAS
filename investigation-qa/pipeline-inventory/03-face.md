# Face biometrics + anti-spoof — Pipeline Inventory (2026-05-28)
Status legend: ✅ full | 🟡 partial | ❌ missing | 🐞 broken | ❔ unverified

---

## Internal Pipeline Stages

| Operation/Stage | DB | Backend (file:func → endpoint) | Processor/Algo (file:func) | Web | Mobile | Desktop | SDK/amispoof | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|---|
| **Detect** | N/A | `app/api/routes/enrollment.py:enroll_face` calls `check_liveness.execute()` → `detector.detect()` | `app/infrastructure/ml/detectors/deepface_detector.py:DeepFaceDetector.detect` (default); `mediapipe_face_detector.py` alt; factory: `app/infrastructure/ml/factories/detector_factory.py` | `src/lib/biometric-engine/core/FaceDetector.ts` (BlazeFace + MediaPipe FaceLandmarker); `useFaceDetection` hook | `shared/.../data/remote/api/BiometricApiImpl.kt` — image sent to server, no client-side detect | `desktopApp/.../GuestFaceCheckScreen.kt:DesktopCameraService` captures frame, same server path | `spoof-detector/web/src/infrastructure/detection/MediaPipeFaceDetector.ts` (amispoof: MediaPipe) | ✅ | DeepFace `ANTI_SPOOFING_ENABLED` default=False (config.py:127); server-side detect used for all auth flows |
| **Crop/Align** | N/A | `app/application/use_cases/enroll_face.py:execute` — `detection.get_face_region(image)` (line ~60); same in verify_face.py | `app/domain/entities/face_detection.py:FaceDetection.get_face_region` | `src/lib/biometric-engine/core/QualityAssessor.ts:extractFaceROI` | Server-side only | Server-side only | `spoof-detector/web/src/index.ts:toFaceCropOrNull` | ✅ | Bug USER-BUG-4 (fixed 2026-05-04): search was passing full frame; now uses face crop |
| **Quality scoring / usability gate** | `user_enrollments.quality_score` (V47); `face_embeddings` has `quality_score` col | `app/application/use_cases/enroll_face.py:execute` (step 3/4: quality_assessor.assess); `verify_face.py:execute` (quality gate threshold=50); `app/api/routes/quality.py` standalone endpoint | `app/infrastructure/ml/quality/quality_assessor.py:QualityAssessor.assess` | `src/lib/biometric-engine/core/QualityAssessor.ts` (5-component: blur, size, lighting, centering, angle) | N/A (server delegates) | N/A | `spoof-detector/web/src/gates/FaceUsabilityGate.ts` (amispoof advisory only) | ✅ | Enrollment threshold=70 (config.py:165); verify threshold=50 (verify_face.py:VerifyFaceUseCase.VERIFICATION_QUALITY_THRESHOLD); |
| **Liveness — passive (uniface/texture)** | `face_embeddings.liveness_score`; `liveness_attempts` table (identity-core-api V4); `user_enrollments.liveness_score` (V47) | `app/api/routes/enrollment.py:enroll_face` (lines ~136-149: liveness_use_case.execute → reject if not live); `app/api/routes/verification.py:verify_face` (lines ~310-330); use case: `app/application/use_cases/check_liveness.py:CheckLivenessUseCase.execute` | `app/infrastructure/ml/liveness/uniface_liveness_detector.py:UniFaceLivenessDetector` (MiniFASNet ONNX); `app/infrastructure/ml/liveness/texture_liveness_detector.py`; factory: `app/infrastructure/ml/factories/liveness_factory.py:LivenessDetectorFactory.create`; default env: `LIVENESS_MODE=combined` → resolves to `hybrid` backend (`config.py:256-261`) | `src/lib/biometric-engine/core/PassiveLivenessDetector.ts` (5-component texture/color/skin/moire/variance; client-side pre-filter, not auth-gating) | N/A — no client-side liveness in mobile | N/A | `spoof-detector/web/src/application/LivenessProver.ts` (amispoof's LivenessProver, standalone) | ✅ | LIVENESS_UNIFACE_DEFAULT_ENABLED=False in .env.example (overridden at runtime by LIVENESS_BACKEND); conservative verdict policy is default (config.py:146); liveness IS called from both /enroll and /verify (prior gap now resolved) |
| **Liveness — hybrid (blink/smile/active)** | Same as above | `app/application/use_cases/check_liveness.py`: details include blink_evidence, smile_evidence, mar_rise, ear_drop; `app/infrastructure/ml/liveness/hybrid_liveness_detector.py` wraps enhanced (blink, smile) + uniface; `app/infrastructure/ml/liveness/enhanced_liveness_detector.py` | `app/infrastructure/ml/liveness/hybrid_liveness_detector.py:HybridLivenessDetector` (blink_frames_required=2); `app/infrastructure/ml/liveness/enhanced_liveness_detector.py` (blink+smile via MediaPipe) | `src/lib/biometric-engine/hooks/useFaceChallenge.ts` (challenge stages: position, frontal, turn_left, turn_right, blink, capture); `src/features/auth/components/FaceEnrollmentFlow.tsx` | `androidApp/.../BiometricEnrollScreen.kt` (captures image, no client challenge in mobile) | Same as mobile | `spoof-detector/web/src/infrastructure/analyzers/BlinkAnalyzer.ts`; `BlinkSymmetryAnalyzer.ts` | 🟡 | Hybrid (blink+smile) only reached when LIVENESS_MODE=combined (default env.example); single-still-frame /verify cannot accumulate blink evidence — blink only works in multi-frame /liveness/verify puzzle flow |
| **DeepFace built-in anti-spoof veto** | N/A | `app/application/use_cases/check_liveness.py:CheckLivenessUseCase.execute` (apply_veto logic ~line 160-200); `ANTI_SPOOFING_ENABLED=False` default | `app/infrastructure/ml/detectors/deepface_detector.py:DeepFaceDetector.detect` (anti_spoofing flag) | N/A | N/A | N/A | N/A | 🟡 | Off by default (config.py:127); when on: conservative policy (either DeepFace OR primary backend spoof = reject); veto path is fully implemented and tested |
| **Spoof-detector pipeline (spoof-detector lib)** | N/A | `app/api/routes/verification.py:verify_face` — `_evaluate_antispoof_pipeline_safe()`, `_evaluate_device_spoof_risk_safe()`, `_evaluate_ear_liveness_safe()`; `_merge_block_verdict()` → HTTP 403 if blocked | `spoof-detector/src/pipeline/assembler.py:AntispoofPipelineAssembler.evaluate` (3 layers: FaceUsabilityGate, DeviceSpoofRiskEvaluator, HybridFusionEvaluator); `app/application/services/device_spoof_risk_evaluator.py` | N/A (server-side only in /verify; amispoof is a separate client-side SDK) | N/A | N/A | `spoof-detector/web/src/pipeline/Assembler.ts` (amispoof client-side mirror) | 🟡 | All flags default OFF in prod: ANTISPOOF_DEVICE_RISK_ENABLED=False, ANTISPOOF_USABILITY_GATE_ENABLED=False, ANTISPOOF_FUSION_ENABLED=False (config.py:690-717); ANTISPOOF_BLOCK_ENFORCE=True so when a flag IS on, 403 is enforced; EAR_VETO also off by default; assembler's FaceUsabilityGate skipped when landmark_result=None (verification.py never passes landmarks) |
| **EAR (Eye Aspect Ratio) veto** | N/A | `app/api/routes/verification.py:_evaluate_ear_liveness_safe()` + `_merge_block_verdict()` | `spoof-detector/src/infrastructure/analyzers/blink_analyzer.py:compute_ear` (EAR_THRESHOLD=0.18) | N/A | N/A | N/A | N/A | 🟡 | ANTISPOOF_EAR_VETO_ENABLED=False default (config.py:739); requires face_landmarker.task asset to be deployed; _get_face_landmarker_for_ear() fails-soft to None if model absent |
| **Embedding extraction** | `face_embeddings` table (pgvector, 512-dim Facenet512); `embedding_ciphertext` bytea (Fernet AES-128) | `app/application/use_cases/enroll_face.py:execute` step 5; `verify_face.py:execute` step 5 | `app/infrastructure/ml/extractors/deepface_extractor.py:DeepFaceEmbeddingExtractor.extract` (Facenet512); `app/infrastructure/security/embedding_cipher.py:EmbeddingCipher.encrypt_vector`; factory: `app/infrastructure/ml/factories/extractor_factory.py` | `src/lib/biometric-engine/core/EmbeddingComputer.ts` (client-side 128-dim pre-filter; D1 log-only via client_embedding form field) | N/A | N/A | N/A | ✅ | Dual-column model: pgvector for ANN search, ciphertext for GDPR store-of-record (embedding_cipher.py); FIVUCSAS_EMBEDDING_KEY required at boot |
| **Compare/match (1:1)** | N/A | `app/application/use_cases/verify_face.py:execute` step 6 — similarity_calculator.calculate(new, stored); adaptive threshold for aged embeddings (bug fixed 2026-05-12: VERIFICATION_THRESHOLD_AGED_YEARS default=2.0, VERIFICATION_THRESHOLD_AGED=0.55 must be >= VERIFICATION_THRESHOLD=0.45) | `app/infrastructure/ml/similarity/cosine_similarity.py:CosineSimilarityCalculator` | N/A (result surfaced in VerificationResponse: verified, confidence, distance, threshold) | N/A | N/A | N/A | ✅ | Threshold default=0.45 (config.py:163); aged threshold default=0.55 >=0.45 (validator at config.py:202-212) |
| **Search / 1:N identification** | `face_embeddings` via `find_similar` (pgvector IVFFlat index, lists=100) | `app/api/routes/search.py:search_face → SearchFaceUseCase.execute`; identity-core-api `BiometricController.searchFace` (POST /api/v1/biometric/search) derives tenant_id from principal (USER-BUG-4 fix) | `app/application/use_cases/search_face.py:SearchFaceUseCase.execute`; `pgvector_embedding_repository.py:find_similar` | `src/pages/BiometricToolsPage.tsx` (FaceSearch tool); `src/pages/FaceSearchPage.tsx` (now redirect to BiometricToolsPage) | `shared/.../BiometricRepositoryImpl.kt:identifyFace` (base64 image to POST /search; NOTE: calls bio-processor directly, not identity-core-api) | `desktopApp/.../GuestFaceCheckScreen.kt` (uses BiometricViewModel → BiometricRepository) | N/A | 🟡 | No liveness check on /search route (search_face.py has no liveness call); no anti-spoof on /search; mobile calls bio-processor /search directly (bypasses identity-core-api auth layer — security gap) |

---

## CRUD / Enrollment Operations

| Operation/Stage | DB | Backend (file:func → endpoint) | Processor/Algo (file:func) | Web | Mobile | Desktop | SDK/amispoof | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|---|
| **Enroll face (single image)** | `face_embeddings` upsert; `user_enrollments` quality+liveness scores (V47) | `app/api/routes/enrollment.py:enroll_face → EnrollFaceUseCase.execute`; identity-core-api `BiometricController.enrollFace` (POST /api/v1/biometric/enroll/{userId}) | detect→quality→embed→save; liveness called first (enrollment.py:~136); idempotency via `IdempotencyStore` | `src/features/auth/components/FaceEnrollmentFlow.tsx` + `src/features/auth/components/EnrollmentPage.tsx`; hook: `src/lib/biometric-engine/hooks/useFaceEnrollment.ts` | `androidApp/.../BiometricEnrollScreen.kt` → `BiometricRepositoryImpl.enrollFace` → POST enroll (via bio-processor directly) | N/A (desktop does guest face check only) | N/A | ✅ | Liveness IS called before embedding save (enrollment.py:136-149); quality gate enforced (score >= 70 default); idempotency-key supported |
| **Enroll face (multi-image)** | Same as single; uses centroid fusion in pgvector_embedding_repository.py | `app/api/routes/enrollment.py:enroll_face_multi_image → EnrollMultiImageUseCase.execute`; identity-core-api `BiometricController.enrollFaceMulti` (POST /api/v1/biometric/enroll/multi/{userId}) | `app/application/use_cases/enroll_multi_image.py`; 2-5 images, quality-weighted centroid | `src/features/auth/components/FaceEnrollmentFlow.tsx` (multi-stage challenge captures multiple images); identity-core-api wired (BiometricController.enrollFaceMulti) | No multi-image support in mobile BiometricApi interface | N/A | N/A | 🟡 | No liveness check in enroll_multi_image.py (gap: only single /enroll calls liveness; multi-image uses EnrollMultiImageUseCase which does NOT call liveness_use_case); MULTI_IMAGE_ENROLLMENT_ENABLED default=True |
| **Verify face (1:1)** | `face_embeddings` read; `biometric_verification_logs` (legacy, from V4, not dropped) | `app/api/routes/verification.py:verify_face → VerifyFaceUseCase.execute`; identity-core-api `BiometricController.verifyFace` (POST /api/v1/biometric/verify/{userId}) | detect→quality(50)→embed→fetch→cosine→threshold; liveness called first (verification.py:~315); antispoof pipeline appended | `src/pages/FaceDemoPage.tsx` (demo); `src/verify-app/LoginMfaFlow.tsx` (MFA step) | `shared/.../BiometricRepositoryImpl.kt:verifyFace` → POST verify (bio-processor direct) | `desktopApp/.../GuestFaceCheckScreen.kt` via BiometricViewModel | N/A | ✅ | Full pipeline: liveness→quality→embed→match→antispoof-veto; anti-spoof flags all default OFF so veto layer dormant in prod |
| **Delete face enrollment** | `face_embeddings` DELETE by user_id | `app/api/routes/enrollment.py:delete_enrollment → DeleteEnrollmentUseCase.execute`; identity-core-api `BiometricController.deleteFace` (DELETE /api/v1/biometric/face/{userId}) | `app/application/use_cases/delete_enrollment.py` | N/A (admin UI; no web component found for face delete specifically) | `shared/.../BiometricRepositoryImpl.kt:deleteBiometricData` → DELETE enroll/{userId} (bio-processor direct) | N/A | N/A | 🟡 | No cascade to `biometric_verification_logs.biometric_data_id` (V48 dropped biometric_data; logs FK is ON DELETE SET NULL); web dashboard has EnrollmentsListPage but no face-specific delete button found |
| **List / read enrollments** | `user_enrollments` table (identity-core-api) | identity-core-api `EnrollmentController.java` (GET /api/v1/enrollments, /api/v1/enrollments/{id}, /api/v1/users/{userId}/enrollments, /api/v1/enrollment/status); NO list endpoint on bio-processor | N/A (enrollment metadata in identity-core-api; actual embedding list not exposed) | `src/pages/EnrollmentsListPage.tsx` | `shared/.../BiometricRepositoryImpl.kt` — no list method in BiometricRepository interface | N/A | N/A | 🟡 | Bio-processor has no GET /enroll list endpoint; listing is identity-core-api only; mobile BiometricRepository.kt has no list/get enrolled users method |

---

## Liveness Sub-Flows

| Operation/Stage | DB | Backend (file:func → endpoint) | Processor/Algo (file:func) | Web | Mobile | Desktop | SDK/amispoof | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|---|
| **Standalone liveness check** | N/A | `app/api/routes/liveness.py` (POST /liveness); `CheckLivenessUseCase.execute` | same as passive liveness above | `src/pages/FaceDemoPage.tsx` (server liveness section, calls /api/v1/biometric/verify as proxy) | `shared/.../BiometricApi.kt:checkLiveness` → POST /liveness (bio-processor direct) | N/A | N/A | 🟡 | mobile goes direct to bio-processor /liveness, not through identity-core-api; no equivalent in BiometricController.java |
| **Active liveness session (blink/token)** | `in_memory_active_liveness_session_repository.py` / Redis | `app/api/routes/liveness.py` (POST /liveness/start, /liveness/verify); `start_active_liveness.py`, `process_active_liveness_frame.py`; token service: `active_liveness_token_service.py` | `app/infrastructure/ml/liveness/enhanced_liveness_detector.py:EnhancedLivenessDetector` (blink_frames_required=2, smile) | N/A (web uses challenge flow via FaceEnrollmentFlow, not /liveness/start) | N/A | N/A | N/A | 🟡 | Not wired into identity-core-api BiometricController; only reachable from bio-processor directly |
| **Active gesture liveness** | Redis puzzle repo | `app/api/routes/liveness.py` (POST /liveness/gesture/start, /frame); `start_active_gesture_liveness.py` | `app/application/services/active_gesture_liveness_manager.py` | N/A | N/A | N/A | N/A | 🟡 | No identity-core-api wiring; also not consumed by web-app |
| **Live camera analysis (WebSocket)** | N/A | `app/api/routes/live_analysis.py`, `app/api/routes/proctor_ws.py`; `live_camera_analysis.py` use case | Multi-frame analysis loop | `src/pages/FaceDemoPage.tsx` (partial) | N/A | N/A | N/A | 🟡 | fail-closed per INVESTIGATION_FAILOPEN_2026-05-07 |
| **Puzzle liveness (biometric puzzle)** | `liveness_attempts` (identity-core-api V4); Redis puzzle repo | `app/api/routes/puzzle.py`; `generate_puzzle.py`, `verify_puzzle.py` | Puzzle generation + verification | `src/features/biometric-puzzles/puzzles/FacePuzzle.tsx` (468-pt mesh overlay); `src/features/auth-methods-testing/puzzles/FacePuzzle.tsx` | N/A | N/A | N/A | 🟡 | Puzzle results not persisted back to bio-processor; `liveness_attempts` table managed by identity-core-api separately; web puzzle uses BiometricEngine internally |

---

## Anti-Spoof Analyzers — Python spoof-detector (server-side)

| Analyzer | File | Called from | Status |
|---|---|---|---|
| Texture | `src/infrastructure/analyzers/texture_analyzer.py` | `DeviceSpoofRiskEvaluator` → `AntispoofPipelineAssembler` | 🟡 (dormant: ANTISPOOF_DEVICE_RISK_ENABLED=False) |
| Moire | `src/infrastructure/analyzers/moire_analyzer.py` | Same | 🟡 |
| Screen Replay | `src/infrastructure/analyzers/screen_replay_analyzer.py` | Same | 🟡 |
| Screen Flicker | `src/infrastructure/analyzers/screen_flicker_analyzer.py` | Same | 🟡 |
| Blink (EAR) | `src/infrastructure/analyzers/blink_analyzer.py` | `_evaluate_ear_liveness_safe()` in verification.py | 🟡 (ANTISPOOF_EAR_VETO_ENABLED=False; requires face_landmarker.task) |
| MiniFASNet | `src/infrastructure/analyzers/minifasnet_analyzer.py` | `HybridFusionEvaluator` (when ANTISPOOF_FUSION_ENABLED=True) | 🟡 (dormant) |
| AR Filter | `src/infrastructure/analyzers/ar_filter_analyzer.py` | Not wired into AntispoofPipelineAssembler | ❌ unwired |
| Background Grid | `src/infrastructure/analyzers/background_grid_analyzer.py` | Not wired | ❌ unwired |
| Device Boundary | `src/infrastructure/analyzers/device_boundary_analyzer.py` | `DeviceSpoofRiskEvaluator` | 🟡 (dormant) |
| Landmark Variance | `src/infrastructure/analyzers/landmark_variance_analyzer.py` | Not wired into assembler | ❌ unwired |
| Micro Tremor | `src/infrastructure/analyzers/micro_tremor_analyzer.py` | Not wired | ❌ unwired |
| rPPG | `src/infrastructure/analyzers/rppg_analyzer.py` | Not wired | ❌ unwired |
| Temporal | `src/infrastructure/analyzers/temporal_analyzer.py` | Not wired | ❌ unwired |

**Py gates (5):** `face_usability.py`, `illumination.py`, `landmarks.py`, `critical_region_visibility.py`, `__init__.py` — `FaceUsabilityGate` wired when `ANTISPOOF_USABILITY_GATE_ENABLED=True`; others partially used inside FaceUsabilityGate. `LandmarksGate` and `IlluminationGate` — not wired into assembler directly.

---

## Anti-Spoof Analyzers — TypeScript amispoof (spoof-detector/web/, browser port)

Deployed as standalone Vite build at `fivucsas.com/amispoof/` (confirmed by MEMORY). NOT integrated into web-app React SPA (no import in package.json or App.tsx).

| Analyzer count | TS analyzers (24) | TS gates (3) | Fusion | Session |
|---|---|---|---|---|
| Wired into SpoofDetector facade (index.ts) | BlinkAnalyzer, BlinkSymmetryAnalyzer, DeviceBoundaryAnalyzer, ExpressionDynamicsAnalyzer, EyebrowAnalyzer, GazeAnalyzer, HandTrackingAnalyzer, LandmarkVarianceAnalyzer, LandmarkPlanarityAnalyzer, MicroTremorAnalyzer, MiniFASNetAnalyzer, MoireAnalyzer, Pose3DConsistencyAnalyzer, RppgAnalyzer, ScreenFlickerAnalyzer, ScreenReplayAnalyzer, TemporalAnalyzer, TextureAnalyzer, BackgroundGridAnalyzer, BackgroundMotionAnalyzer, AudioMouthSyncAnalyzer, BehavioralPatternAnalyzer, VoiceActivityAnalyzer, FlashReflectionAnalyzer | FaceUsabilityGate, IlluminationGate, CriticalRegionVisibilityGate | MultiClassFuser + HybridEvaluator | SessionEngine + LivenessProver |

All 24 TS analyzers are present and wired in `spoof-detector/web/src/index.ts`; `HybridEvaluator` and `Assembler` ported but NOT exposed in the default SpoofDetector facade (index.ts comment: "NOT wired into this facade").

---

## DB Schema (face-relevant tables)

| Table | Location | Status | Notes |
|---|---|---|---|
| `biometric_data` | V4 created, V48 dropped | ❌ dropped | Replaced by bio-processor's own pgvector store |
| `face_embeddings` | biometric-processor Alembic (pgvector 512-dim Facenet512 + ciphertext bytea + key_version) | ✅ | dual-column: ANN + encrypted; HNSW commented out, uses IVFFlat (lists=100) |
| `client_embedding_observations` | biometric-processor Alembic 0004 (vector 128-dim, log-only) | ✅ log-only | fire-and-forget BackgroundTask; never used for auth |
| `liveness_attempts` | identity-core-api V4 | ✅ | puzzle-flow results; FK to users ON DELETE SET NULL |
| `biometric_verification_logs` | identity-core-api V4 | ✅ | FK biometric_data_id → ON DELETE SET NULL after V48 |
| `user_enrollments.quality_score / liveness_score` | identity-core-api V47 | ✅ | recorded by EnrollBiometricService.extractScore |

---

## Cross-cutting findings

### Critical gaps / bugs

- **`/enroll/multi` skips liveness** (`app/api/routes/enrollment.py:enroll_face_multi_image`): the single-image `/enroll` calls `liveness_use_case.execute()` at line ~136 and rejects if not live. The multi-image handler (`enroll_face_multi_image`) passes straight to `EnrollMultiImageUseCase.execute()` with no liveness check. An attacker can enroll a template of still photos by using the multi-image endpoint. File: `app/api/routes/enrollment.py:223-412`.

- **`/search` has no liveness or anti-spoof** (`app/api/routes/search.py:search_face`): the search route runs detect→embed→find_similar without any liveness gate. A printed photo can be used to query the 1:N database. File: `app/api/routes/search.py:22-120`.

- **Mobile and desktop call bio-processor directly, bypassing identity-core-api** (`shared/.../BiometricApiImpl.kt`): the Ktor client targets port 8001 directly (`url = "enroll"`, `url = "verify"`, etc., base URL from config). This means mobile enroll/verify/liveness bypass `BiometricController.java` auth checks (`@PreAuthorize`), tenant isolation, and audit logging. The identity-core-api route is the authoritative path with RBAC, but mobile never reaches it. File: `shared/src/commonMain/kotlin/com/fivucsas/shared/data/remote/api/BiometricApiImpl.kt`.

- **Assembler's `FaceUsabilityGate` layer is always skipped in `/verify`** (`app/api/routes/verification.py:_evaluate_antispoof_pipeline_safe`): `AntispoofPipelineAssembler.evaluate()` requires `landmark_result` for the gate (`pipeline/assembler.py:~130`), but the call in verification.py passes no landmark. Even if `ANTISPOOF_USABILITY_GATE_ENABLED=True`, the gate silently no-ops (`face_block=None`). File: `app/api/routes/verification.py` (no landmark passed to `assembler.evaluate()`).

- **All spoof-detector flags default OFF in prod**: `ANTISPOOF_DEVICE_RISK_ENABLED=False`, `ANTISPOOF_USABILITY_GATE_ENABLED=False`, `ANTISPOOF_FUSION_ENABLED=False`, `ANTISPOOF_EAR_VETO_ENABLED=False` (config.py:690-747). The entire Python spoof-detector integration is dormant unless an operator explicitly opts in. The only active path is `ANTI_SPOOFING_ENABLED=False` (DeepFace built-in, also off). In production the liveness check is the **only** anti-spoof layer.

- **4 Python analyzers unwired from assembler**: `ar_filter_analyzer.py`, `background_grid_analyzer.py`, `landmark_variance_analyzer.py`, `micro_tremor_analyzer.py`, `rppg_analyzer.py`, `temporal_analyzer.py` exist in `src/infrastructure/analyzers/` but are not instantiated or called by `DeviceSpoofRiskEvaluator` or the assembler. They have no code path into `/verify` or `/enroll`.

- **amispoof (spoof-detector/web/) not integrated into web-app**: `spoof-detector` is not a dependency in `web-app/package.json`. The TS amispoof SDK lives as a standalone Vite project deployed separately at `fivucsas.com/amispoof/`. The web-app's own face flows (enrollment, FaceDemoPage, puzzles) use the `biometric-engine` library (`src/lib/biometric-engine/`) which has its own independent `PassiveLivenessDetector`. There is no shared code between amispoof and the main web-app — any security signal from amispoof is not fed back to the enrollment or verification flows.

- **`VERIFICATION_THRESHOLD_AGED` inversion bug was fixed** (config.py:202-212): validator now enforces `VERIFICATION_THRESHOLD_AGED >= VERIFICATION_THRESHOLD`. Prior to 2026-05-12 the default was 0.38 < 0.45 which made aged embeddings **harder** to match (inverted logic). Default is now 0.55.

- **Embedding ciphertext key required at boot**: `EmbeddingCipher.from_env()` raises `RuntimeError` if `FIVUCSAS_EMBEDDING_KEY` is unset. This is intentional fail-fast behavior (embedding_cipher.py:~55), but ops must ensure the key is set before any rebuild.

### Counts

- **Pipeline stages traced**: 13 (detect, crop, quality, passive-liveness, hybrid-liveness, deepface-veto, spoof-detector-pipeline, EAR-veto, embed, compare, search, enroll, verify)
- **Python spoof-detector analyzers**: 14 files (13 active + minifasnet); 5 gates; 1 fusion module; 1 assembler
- **TS amispoof analyzers**: 24; 3 gates; MultiClassFuser + HybridEvaluator; SessionEngine + LivenessProver
- **Unwired Python analyzers (exist but no call path)**: 6 (ar_filter, background_grid, landmark_variance, micro_tremor, rppg, temporal)
- **Dormant anti-spoof flag layers**: 4 (device_risk, usability_gate, fusion, ear_veto — all default OFF)
