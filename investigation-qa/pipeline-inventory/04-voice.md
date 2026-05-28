# Voice biometrics — Pipeline Inventory (2026-05-28)
Status legend: ✅ full | 🟡 partial | ❌ missing | 🐞 broken | ❔ unverified

---

## 1. Audio Capture / Pre-processing

| Operation/Stage | DB | Backend (file:func → endpoint) | Processor (file:func) | Web | Mobile | Desktop | SDK | Status | Notes/gaps |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Mic capture (WebM/Opus via MediaRecorder) | N/A | N/A | N/A | `useVoiceRecorder.ts:start` (hook), `VoiceEnrollmentFlow.tsx:startRecording`, `VoiceSearchPage.tsx:startRecording` | `VoiceEnrollScreen.kt:startRecording` (MediaRecorder AAC/MPEG_4 @16kHz mono), `AndroidVoiceSearchScreen.kt:startRecording` | ❌ absent | N/A | 🟡 partial | Desktop has no voice capture; web has 3 separate MediaRecorder implementations (partial deduplication). |
| WAV 16kHz mono conversion (WebM → WAV) | N/A | N/A | `speaker_embedder.py:_decode_to_wav_samples` (server-side pydub+ffmpeg fallback; also `_load_wav_direct` for native WAV) | `audioToWav16k.ts:encodeToWav16kMono` (shared utility), `VoiceEnrollmentFlow.tsx` imports it; `VoiceSearchPage.tsx:convertToWav16k` (inline duplicate, lines 55–73) | Android records at 16kHz mono AAC natively; base64-encodes raw M4A without WAV conversion | ❌ absent | N/A | 🐞 partial | **BUG (duplication/divergence):** `VoiceSearchPage.tsx` contains an inline `convertToWav16k` / `createWavBuffer` (lines 26–73) that duplicates `audioToWav16k.ts`. It also creates `AudioContext({sampleRate:16000})` but does NOT apply the shared `resampleLinear` fallback path. The shared utility `encodeToWav16kMono` is imported by `VoiceEnrollmentFlow.tsx` (line 27) and `useVoiceRecorder.ts` (line 16) but NOT by `VoiceSearchPage.tsx`. Risk: divergent resampling on old Safari. |
| Client-side VAD gating (Silero ONNX) | N/A | N/A | N/A | `VoiceVAD.ts` (Silero VAD v1 ONNX, 512-sample frames, 16kHz, SPEECH_RATIO_THRESHOLD=0.2); consumed by `useVoiceRecorder.ts` via `wav16k` blob; `VoiceStep.tsx` falls back to raw WebM if wav16k unavailable | ❌ not implemented (Android sends raw M4A, no VAD) | ❌ absent | N/A | 🟡 partial | VAD is web-only. **GAP:** Mobile client sends raw M4A (AAC/MPEG_4) without any speech activity check; silent recordings reach the server. **ALSO:** `VoiceVAD.ts:classify` returns neutral `{isSpeech:false}` when ONNX model unavailable (graceful bypass), so VAD gate can be silently skipped. |
| Max clip duration cap | N/A | N/A | N/A | `useVoiceRecorder.ts:MAX_VOICE_CLIP_SECONDS=30` (hook-level preflight cap), `VoiceStep.tsx:MAX_RECORDING_SECONDS=10` (auto-stop UI), `VoiceEnrollmentFlow.tsx:MAX_RECORDING_SECONDS=10`, `VoiceSearchPage.tsx:MAX_RECORDING_SECONDS=10` | `VoiceEnrollScreen.kt`: no hard cap (user taps stop; no auto-stop timer) | ❌ no cap | N/A | 🟡 partial | **GAP:** Android has no auto-stop timer on VoiceEnrollScreen; user may submit arbitrarily long recordings. |
| Amplitude gate (silence reject) | N/A | N/A | N/A | `VoiceEnrollmentFlow.tsx:mediaRecorder.onstop` — rejects if `maxAmplitudeRef.current < 0.05` (line 186); `VoiceSearchPage.tsx:onstop` — same threshold (line 201). NOT in `VoiceStep.tsx` (delegates to VAD only) | ❌ not implemented | ❌ absent | N/A | 🟡 partial | **GAP:** `VoiceStep.tsx` (MFA auth path) has no amplitude gate; relies solely on Silero VAD. Mobile has no gate at all. |

---

## 2. Enroll

| Operation/Stage | DB | Backend (file:func → endpoint) | Processor (file:func) | Web | Mobile | Desktop | SDK | Status | Notes/gaps |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Enroll voice embedding | `voice_enrollments` table (V33 migration: `id uuid PK`, `user_id`, `tenant_id`, `embedding vector(256)`, `quality_score`, `enrollment_type INDIVIDUAL/CENTROID`, `created_at`, `updated_at`, `deleted_at`). Unique constraint: one CENTROID per (user_id, COALESCE(tenant_id,'')) where deleted_at IS NULL. IVFFlat cosine index (lists=100). | `BiometricController.java:enrollVoice` → `POST /api/v1/biometric/voice/enroll/{userId}` (line 151); `BiometricServicePort.java:enrollVoice` (line 93); `BiometricServiceAdapter.java:enrollVoice` (line 158) → calls biometric-processor `POST /voice/enroll` with `{user_id, voice_data}` | `voice.py:enroll_voice` → `POST /voice/enroll`; `speaker_embedder.py:extract_embedding_from_base64` (Resemblyzer GE2E 256-dim); `pgvector_voice_repository.py:save` — inserts INDIVIDUAL row + creates/updates CENTROID (running average). Fernet encryption in `embedding_ciphertext` col. quality_score=1.0 hardcoded (line 84) | `VoiceEnrollmentFlow.tsx:doVoiceAction('enroll')` → `POST {apiBaseUrl}/biometric/voice/enroll/{userId}` with `{voiceData: base64}` (raw base64, no data URI prefix); `VoiceEnrollmentDialog.tsx:onSuccess('enroll')` → calls `createEnrollment` + `PUT /users/{userId}/enrollments/VOICE/complete` | `VoiceEnrollScreen.kt:stopRecordingAndProcess` → `VoiceMode.ENROLL` → `VoiceViewModel.enroll` → `VoiceRepositoryImpl.enroll` → `VoiceApiImpl:enroll` → `POST biometric/voice/enroll/{userId}` with `{voiceData: base64}` (raw M4A base64, **no WAV conversion**) | ❌ absent | N/A | 🟡 partial | **GAP (quality score):** `quality_score=1.0` is hardcoded at `voice.py:84` — no real quality metric. **GAP (mobile format):** Android sends M4A (AAC), which works via pydub/ffmpeg server-side, but bypasses client VAD. **GAP (desktop):** no voice capability at all. |
| Centroid update (accumulation) | `voice_enrollments` (CENTROID row updated in-SQL via `AVG(embedding)` on INDIVIDUAL rows, then re-encrypted) | N/A (handled inside biometric-processor) | `pgvector_voice_repository.py:save` lines 125–186 — atomic: insert individual → recompute centroid avg in SQL → upsert centroid with ciphertext in lockstep | N/A | N/A | N/A | N/A | ✅ full | Multi-sample accumulation works. No transaction wrapper (two sequential await conn.execute calls inside same pool.acquire block — async-safe but not a single DB transaction). |
| Embedding encryption at rest | `embedding_ciphertext` (Fernet, col added alongside plaintext pgvector `embedding` col for ANN queries) | N/A | `pgvector_voice_repository.py:save` (line 110) — `EmbeddingCipher.encrypt_vector`; `find_by_user_id` prefers ciphertext via `_decode_row_embedding` (line 259) | N/A | N/A | N/A | N/A | ✅ full | Dual-column pattern (plaintext for ANN, ciphertext as canonical store). Legacy rows without ciphertext log WARNING and fall back to plaintext (GDPR P1.3). |
| user_enrollments record | `user_enrollments` (Java side) | `ManageEnrollmentService.java:35` — VOICE is listed as a biometric method; enrollment record creation via `createEnrollment` | N/A | `VoiceEnrollmentDialog.tsx:53` — `createEnrollment({tenantId, methodType: AuthMethodType.VOICE})` then PUT complete | Triggered via VoiceViewModel → VoiceRepositoryImpl path, but NO explicit enrollment record creation on mobile (relies on server BiometricController side-effect?) | N/A | N/A | 🟡 partial | **GAP:** `VoiceEnrollmentDialog` explicitly calls `PUT /users/{userId}/enrollments/VOICE/complete` (line 57), but the mobile `VoiceRepositoryImpl` does not. Mobile enrollment may not update `user_enrollments` status. |

---

## 3. Verify / Authenticate

| Operation/Stage | DB | Backend (file:func → endpoint) | Processor (file:func) | Web | Mobile | Desktop | SDK | Status | Notes/gaps |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1:1 voice verify (MFA step) | `voice_enrollments` (read CENTROID or fallback to latest INDIVIDUAL) | `BiometricController.java:verifyVoice` → `POST /api/v1/biometric/voice/verify/{userId}` (line 183); `VoiceAuthHandler.java:validate` (AuthMethodHandler, line 27); `VoiceVerifyMfaStepHandler.java:verify` (MfaStepHandler, line 26); `BiometricServiceAdapter.java:verifyVoice` (line 175) | `voice.py:verify_voice` → `POST /voice/verify`; cosine similarity vs centroid; VERIFY_THRESHOLD=0.65 (line 120); `pgvector_voice_repository.py:find_by_user_id` | `VoiceStep.tsx:handleSubmit` → calls parent `onSubmit(dataUrl)` with **full data URI** (e.g. `data:audio/wav;base64,...`) — Python handles the prefix at `speaker_embedder.py:124`; `VoicePuzzle.tsx` wraps VoiceStep for admin testing | `VoiceVerifyScreen.kt` (shared) / `VoiceEnrollScreen.kt` → `VoiceMode.VERIFY` → `VoiceViewModel.verify` → `POST biometric/voice/verify/{userId}` | ❌ absent | N/A | 🟡 partial | **Threshold note:** VERIFY_THRESHOLD=0.65 is hardcoded in `voice.py:120` — not configurable via settings. **Desktop:** absent. **GAP:** `VoiceVerifyMfaStepHandler.java:verify` does not check `result.get("success")` — only checks `result.get("verified")` (line 32). If biometric-processor returns `{"success":false, "verified":false}` due to a 500, the handler returns `MfaStepResult.fail()` which is correct but silently swallows the error with no log. |
| Cosine similarity computation | N/A | N/A | `voice.py:148` — `np.dot(probe_embedding, enrolled_embedding)` (both L2-normalized, so dot == cosine); clamped to [0,1] | N/A | N/A | N/A | N/A | ✅ full | Correct for L2-normalized Resemblyzer output. |
| No-enrollment case | `voice_enrollments` | Returns 200 with `{success:False, verified:False}` (not 404) | `voice.py:138–145` — returns `BiometricResponse(success=False, verified=False, ...)` when no enrollment found | `VoiceStep.tsx` shows error from `error` prop | N/A | N/A | N/A | 🟡 partial | Returns HTTP 200 with verified=false when no enrollment exists; callers must check `verified` field not HTTP status. |

---

## 4. Search (1:N Speaker Identification)

| Operation/Stage | DB | Backend (file:func → endpoint) | Processor (file:func) | Web | Mobile | Desktop | SDK | Status | Notes/gaps |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1:N voice search | `voice_enrollments` (IVFFlat cosine ANN index; queries CENTROID rows only) | `BiometricController.java:searchVoice` → `POST /api/v1/biometric/voice/search` (line 286); `BiometricServiceAdapter.java:searchVoice` (line 301) | `voice.py:search_voice` → `POST /voice/search`; SEARCH_THRESHOLD=0.6 (line 191); `pgvector_voice_repository.py:find_similar` (line 304) with ML-M5 caps: max_threshold clamp + max_limit clamp | `useVoiceSearch.ts:searchVoice` → `POST /biometric/voice/search` with `{voiceData: base64}` (uses TokenService for auth); `VoiceSearchPage.tsx` UI; `VoiceEnrollmentFlow.tsx:doVoiceAction('search')` (inline fetch) | `VoiceSearchScreen.kt` (shared) / `AndroidVoiceSearchScreen.kt` → `VoiceViewModel.search` → `VoiceRepositoryImpl.search` → `VoiceApiImpl.search` → `POST biometric/voice/search` | ❌ absent | N/A | 🟡 partial | **BUG (similarity inversion):** `voice.py:search_voice` line 211: returns `{"user_id": m[0], "similarity": round(1.0 - m[1], 4)}` — converts pgvector cosine *distance* to similarity by subtracting from 1.0. Correct. BUT `find_similar` filters `embedding <=> $1::vector < $2` where threshold is 0.4 default (cosine distance), while the endpoint uses `SEARCH_THRESHOLD=0.6` (line 191) which is PASSED as `threshold=SEARCH_THRESHOLD` — **this means the distance threshold is 0.6, returning items with cosine distance < 0.6, i.e. cosine similarity > 0.4**. The naming is confusing (SEARCH_THRESHOLD sounds like similarity but it's used as distance). **GAP:** search result from biometric-processor returns `{matches: [{user_id, similarity}]}` but `VoiceSearchResponseDto.kt` (line 37) maps `found: Boolean = false` with no `matches` list populated from the matches array in `VoiceRepositoryImpl.search` lines 40–47 — it does map `matches`. OK. Desktop absent. |
| User detail enrichment in search | `users` table (identity-core-api) | N/A | N/A | `useVoiceSearch.ts:82–95` — for each match, fetches `GET /users/{userId}` to resolve name/email | ❌ not implemented (mobile shows userId only, no name/email enrichment) | N/A | N/A | 🟡 partial | Web enriches search results with user details (best-effort). Mobile does not. |
| Tenant-scoped search | `voice_enrollments.tenant_id` | `BiometricController.java:searchVoice` — does NOT pass tenant_id to biometric-processor (line 289–295: reads only voiceData from body) | `pgvector_voice_repository.py:find_similar` supports `tenant_id` param (line 334) but it's never passed from the route (voice.py:search_voice has no tenant_id field in VoiceSearchRequest) | N/A | N/A | N/A | N/A | ❌ missing | **GAP:** Search is always cross-tenant. `VoiceSearchRequest` has no `tenant_id` field. `find_similar` SQL clause for tenant filtering is dead code from the current call path. |

---

## 5. Delete / Revoke

| Operation/Stage | DB | Backend (file:func → endpoint) | Processor (file:func) | Web | Mobile | Desktop | SDK | Status | Notes/gaps |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Delete voice enrollment (soft delete) | `voice_enrollments` — `UPDATE ... SET deleted_at=CURRENT_TIMESTAMP WHERE user_id=$1 AND deleted_at IS NULL` | `BiometricController.java:deleteVoice` → `DELETE /api/v1/biometric/voice/{userId}` (line 232); `ManageEnrollmentService.java:252` — `biometricServicePort.deleteVoice(userId)` (called on enrollment revocation) | `voice.py:delete_voice` → `DELETE /voice/{user_id}`; `pgvector_voice_repository.py:delete_by_user_id` (soft delete, line 277) | ❌ no dedicated delete voice UI in web-app | ❌ no dedicated delete voice action in mobile (VoiceApi interface has no delete method) | ❌ absent | N/A | 🟡 partial | **GAP:** Neither the web-app nor the mobile client exposes a standalone "delete voice enrollment" UI action. Deletion is only triggered indirectly via the enrollment revocation flow in `ManageEnrollmentService`. `VoiceApi.kt` (line 16) has no `delete` method. VoiceRepositoryImpl has no delete. |
| Cascade delete on user delete | `voice_enrollments` — triggers soft delete via `ManageEnrollmentService` when enrollment is revoked | `ManageEnrollmentService.java:252` — handles VOICE case: calls `biometricServicePort.deleteVoice(userId)` | `pgvector_voice_repository.py:delete_by_user_id` | N/A | N/A | N/A | N/A | ✅ full | Enrollment-level revocation correctly cascades to biometric-processor deletion. |
| GDPR export — voice data | `voice_enrollments` (biometric_db) | `UserDataExportService.java:80–83` — `voiceEnrollments` is hardcoded to `List.of()` (empty, line 83) | N/A | N/A | N/A | N/A | N/A | ❌ missing | **GAP:** GDPR data export returns an empty list for `voiceEnrollments` (line 83). Voice embeddings in biometric_db are explicitly excluded as "out of scope" (line 34) but no cross-service export bridge exists. |

---

## 6. Voice Replay Detection (Anti-Spoofing)

| Operation/Stage | DB | Backend (file:func → endpoint) | Processor (file:func) | Web | Mobile | Desktop | SDK | Status | Notes/gaps |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Spectral fingerprint replay detection | Redis (LRU list per user: `voice:replay:{user_id}`) | N/A | `replay_detector.py:VoiceReplayDetector` — MFCC-style STFT fingerprint (128-dim), cosine similarity vs cached, `compute_spectral_fingerprint` (line 53) | N/A | N/A | N/A | N/A | ❌ missing (disabled) | **BUG/GAP:** `VoiceReplayDetector` is implemented and tested but is **NOT wired into the voice verify route**. `voice.py:verify_voice` does not call `VoiceReplayDetector`. Container (`container.py`) has no `get_voice_replay_detector()` factory. `VOICE_REPLAY_DETECTION_ENABLED` config exists (default False) but the detector is never instantiated on the hot path. Log-only mode — even if wired, it would not block requests. |
| Liveness/voice prompt (passphrase) | N/A | N/A | N/A | `VoiceEnrollmentFlow.tsx:44–51` — VOICE_PASSPHRASES list (6 English phrases, random per session); `VoiceStep.tsx:169` — `t('mfa.voice.samplePhrase')` (i18n key); `VoiceSearchPage.tsx` / shared `VoiceSearchScreen.kt` — passphrase prompts | `VoiceEnrollScreen.kt` — NO passphrase prompt displayed | N/A | N/A | 🟡 partial | **GAP:** Passphrase is display-only — no challenge-response binding. Same passphrase can be replayed with a recording. Android `VoiceEnrollScreen.kt` has no passphrase prompt. `VoiceEnrollmentFlow.tsx` passphrases are hardcoded English strings (not i18n). |

---

## 7. VAD (Server-side, via Resemblyzer preprocess_wav)

| Operation/Stage | DB | Backend (file:func → endpoint) | Processor (file:func) | Web | Mobile | Desktop | SDK | Status | Notes/gaps |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Server-side VAD (Resemblyzer built-in) | N/A | N/A | `speaker_embedder.py:extract_embedding` lines 97–103 — calls `resemblyzer.preprocess_wav` which includes WebRTC VAD internally; raises ValueError if `len(wav)==0` ("Audio contains no speech") | N/A | N/A | N/A | N/A | ✅ full | Resemblyzer's `preprocess_wav` runs its own VAD. If all frames are silence, returns empty array → ValueError → HTTP 400. |
| Minimum duration check | N/A | N/A | `speaker_embedder.py:MIN_AUDIO_DURATION_SECS=0.5` (line 30); checked at line 91 | N/A | N/A | N/A | N/A | ✅ full | Server enforces 0.5s minimum. |

---

## Cross-cutting findings

### Gaps

1. **Desktop client: zero voice capability.** `desktopApp/` has no voice screen, no `VoiceViewModel` wiring, no microphone access. All three voice operations (enroll/verify/search) are absent.

2. **Mobile client: no voice delete.** `VoiceApi.kt` (line 16) exposes only `enroll`, `verify`, `search`. No `delete` method exists. `VoiceRepositoryImpl.kt` similarly has no delete. Users cannot remove their voice enrollment from the mobile app.

3. **Mobile: no WAV conversion.** `VoiceEnrollScreen.kt:stopRecordingAndProcess` (line 142–154) reads raw M4A bytes and base64-encodes them. The server accepts this via pydub/ffmpeg fallback, but client-side Silero VAD is skipped entirely on mobile.

4. **Mobile: no auto-stop timer.** `VoiceEnrollScreen.kt` has no MAX_RECORDING_SECONDS enforcement; user must manually stop.

5. **Voice search is cross-tenant.** `VoiceSearchRequest` in `voice.py:184` has no `tenant_id` field. `BiometricController.searchVoice` (line 289) does not pass tenant_id to biometric-processor. 1:N search returns results across ALL tenants. The tenant-scoped code path in `pgvector_voice_repository.py:find_similar` (line 334) is dead from the current call chain.

6. **GDPR export empty for voice.** `UserDataExportService.java:83` always returns `List.of()` for `voiceEnrollments`. No cross-service export bridge to biometric_db.

7. **Replay detection not wired.** `VoiceReplayDetector` (`replay_detector.py`) is implemented and unit-tested but no factory function exists in `container.py` and it is never called from `voice.py:verify_voice`. Dead code.

8. **Quality score placeholder.** `voice.py:84` — `quality_score=1.0` hardcoded; no actual audio quality assessment.

### Bugs

9. **`VoiceSearchPage.tsx` duplicates WAV conversion (lines 26–73)** instead of importing `encodeToWav16kMono` from `audioToWav16k.ts`. The inline `createWavBuffer` does not apply the `resampleLinear` fallback, creating a divergent code path that could produce different WAV content on older Safari (`sampleRate` constructor option unsupported). File: `/web-app/src/pages/VoiceSearchPage.tsx:26–73`.

10. **SEARCH_THRESHOLD naming confusion.** `voice.py:191` defines `SEARCH_THRESHOLD = 0.6` and passes it directly to `repo.find_similar(probe_embedding, threshold=SEARCH_THRESHOLD)`. Inside `find_similar`, `threshold` is treated as a cosine **distance** cap (`embedding <=> $1 < threshold`). So similarity > 0.4 passes, not similarity > 0.6 as the name implies. File: `voice.py:204`, `pgvector_voice_repository.py:341`.

11. **`VoiceEnrollmentFlow.tsx` sends raw base64 (no data URI prefix); `VoiceStep.tsx` sends full data URI.** Both are handled by `speaker_embedder.py:108–129` (checks for `data:` prefix), so no runtime error, but the two enrollment surfaces are inconsistent. `VoiceEnrollmentFlow.tsx:212` strips the prefix; `VoiceStep.tsx:118` passes the full data URI via `blobToDataUrl`.

12. **`VoiceVerifyMfaStepHandler.java:32`** only checks `result.get("verified")` with no logging on failure path. A biometric-processor 500 would cause `biometricService.verifyVoice` to return an error-map (from `BiometricServiceAdapter.java:184`: `errorResponse("Voice verification service unavailable")`) where `verified` is absent → `MfaStepResult.fail()`. Silent failure, no structured audit event.

13. **`VoiceEnrollmentDialog.tsx:59`** — `createEnrollment` failure is silently swallowed (`catch { /* bio enrollment succeeded even if record creation fails */ }`). If `user_enrollments` record creation fails, the user has a biometric embedding but no enrollment record, causing `EnrollmentHealthService` checks to show voice as not enrolled.

14. **Mobile `VoiceEnrollScreen.kt`** displays no passphrase prompt to the user, while all web surfaces and the shared `VoiceSearchScreen.kt` do. Inconsistent anti-spoofing UX.

### Summary table by operation

| Operation | DB | API (identity-core) | Processor (bio) | Web | Android | Desktop |
| --- | --- | --- | --- | --- | --- | --- |
| Enroll | ✅ | ✅ | ✅ | ✅ | 🟡 (no WAD conv, no VAD) | ❌ |
| Verify (MFA) | ✅ | ✅ | ✅ | ✅ | 🟡 (no WAD conv, no VAD) | ❌ |
| Search (1:N) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Delete | ✅ (soft) | ✅ | ✅ | ❌ (no UI) | ❌ (no API method) | ❌ |
| GDPR Export | ❌ empty | ❌ stub | N/A | N/A | N/A | N/A |
| Replay detect | Redis | ❌ not wired | ❌ not wired | ❌ | ❌ | ❌ |
| VAD (server) | N/A | N/A | ✅ | N/A | N/A | N/A |
| VAD (client) | N/A | N/A | N/A | 🟡 (graceful bypass) | ❌ | ❌ |
