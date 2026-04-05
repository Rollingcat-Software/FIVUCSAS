> **DEPRECATED** -- This document has been superseded by `ROADMAP_MASTER.md`, which is the single source of truth for the FIVUCSAS project roadmap. This file is kept for historical reference only.

# FIVUCSAS — Comprehensive Production Roadmap V2

> **Created**: 2026-03-17 | **Revised**: 2026-04-05
> **Goal**: Full Identity Verification Platform (IVP) — authentication + verification pipeline
> **Previous Goal**: All 10 auth methods production-ready, browser-first, client-app as fallback
> **Philosophy**: Browser handles everything it can. What it can't → client-app acts as authenticator bridge.
> **Server**: CPU-only (no GPU needed) — Hetzner VPS + Hostinger

---

## Session 2026-03-17/18 FINAL Results

### Completed:
- **Auth-test page**: 11 sections + client-side YOLO card detection (97.1% browser, 94.8% server)
- **Face**: complete pipeline — enroll/verify/search/liveness/bank/quality/embedding (0.9-1.5s)
- **Voice**: complete pipeline — enroll/verify/search, WAV conversion in browser, Resemblyzer 256-dim (490-585ms)
- **NFC**: V22 migration, 5 REST endpoints (enroll/verify/search/delete/list), client-apps integration (11,089 lines)
- **Card detection**: YOLO ONNX runs in browser (99MB model, ~7s/frame WASM) + server fallback
- **Client-apps**: voice/OTP/TOTP/analytics screens added (39 files, 2789 lines), desktop polished, APK GREEN
- **Web-app**: CardDetectionPage + FaceSearchPage + React hooks ported (useCardDetection, useFaceSearch)
- **Security**: SecurityHeaders, AntiReplayFilter, rate limiting re-enabled
- **Feature branch**: `feature/client-side-ml` merged to master
- **Docs**: FRONTEND_COMPARISON_REPORT.md, CLIENT_SIDE_ML_REPORT.md created
- **Biometric-processor**: deployed on Hetzner, quality-weighted centroids, largest-face selection
- **FP-Embedded**: confirmed on mobile phone (WebAuthn)
- **QR scanner**: working (html5-qrcode + debounce)
- **Email OTP + TOTP (QR code)**: working
- **iOS platform layer**: complete (Keychain, AVFoundation, NSLog, Koin DI, NoOp stubs for NFC/Push)
- **MobileFaceNet ONNX pipeline**: added to auth-test/app.js (neural embedding with landmark fallback)
- **Twilio setup script**: `scripts/setup-twilio.sh` (interactive setup + config check)

### Stats:
- **Auth-test**: 3302 lines (app.js), 11 auth method sections + YOLO card detection
- **Web-app**: 10 auth step components, 17 pages, 8 custom hooks
- **Client-apps**: 31 Android screens, 9 desktop screens, 18 ViewModels, 382-line VoiceEnrollScreen
- **Backend**: 132 endpoints across 16 controllers, 10 auth handlers, 18 Flyway migrations (V1-V18)
- **Biometric-processor**: 27 route files, face/voice/fingerprint(stub)/card endpoints

---

## Session 2026-03-19 Results

### Completed:
- **Auth-test page refinements**: FP username hidden, Voice re-record + delete, NFC 409 + delete + response parsing fix, Face CLAHE removed + 640x480 camera, Bank uses cropped images, Liveness server-authoritative, consistent button order
- **Diagnostic logging**: [FACE-DIAG], [LIVENESS-DIAG], [BANK-DIAG], [API-DIAG] tags
- **CSP**: added `unsafe-inline` to `script-src`; cache-busting `no-cache` header for app.js
- **Login tracking**: `lastLoginAt`/`lastLoginIp` fixed (User.recordLogin(), AuthenticateUserService, UserResponseMapper)
- **identity-core-api** rebuilt and deployed to Hetzner
- **Client-apps**: 3 new KMP screens (VoiceVerifyScreen, FaceLivenessScreen, CardDetectionScreen)
- **Kotlin/Native compat**: `Math.PI` -> `kotlin.math.PI`, `String.format` -> `math.round`
- **Web-app**: Vitest 171/171, ESLint max-warnings 30->40, URL double-prefix fix
- **Hostinger deployment**: SCP automated
- **CI/CD**: All repos green (Sarnic 456, web-app 171, client-apps iOS+Android)

### Performance findings (to address):
- biometric-api at 94% memory (2.825GB/3GB) — needs 3.5GB
- Health check 678ms — needs lightweight endpoint
- Voice ops block event loop — need thread pool
- Missing pgvector HNSW indexes

---

## Remaining Work for 100% Coverage

### Coverage Matrix (as of 2026-03-18)

| Auth Method | Auth-Test | Web-App | Client-Apps | Backend | BP |
|-------------|-----------|---------|-------------|---------|-----|
| Password | DONE | DONE | DONE | DONE | N/A |
| Face Enroll | DONE | DONE (step) | DONE (BiometricEnrollScreen) | DONE | DONE |
| Face Verify | DONE | DONE (step) | DONE (BiometricVerifyScreen) | DONE | DONE |
| Face Search | DONE | DONE (FaceSearchPage) | DONE (IdentifyTenantScreen) | DONE | DONE |
| Face Liveness | DONE | DONE (hooks) | DONE (FaceLivenessScreen) | DONE | DONE |
| Face Bank Enroll | DONE | DONE (hook) | MISSING | DONE | DONE |
| Voice Enroll | DONE | DONE (step) | DONE (VoiceEnrollScreen) | DONE | DONE |
| Voice Verify | DONE | DONE (step) | DONE (VoiceVerifyScreen) | DONE | DONE |
| Voice Search | DONE | MISSING (no page) | MISSING | DONE | DONE |
| NFC Read | DONE | DONE (step) | DONE (NfcReadScreen) | DONE (5 endpoints) | N/A |
| FP-Embedded | DONE | DONE (step+WebAuthn) | DONE (FingerprintAuthenticator) | DONE (StepUp) | N/A |
| FP-External | N/A | N/A | N/A | Stub | Stub (501) |
| QR Code | DONE | DONE (step) | DONE (QrLoginScanScreen) | DONE | N/A |
| Email OTP | DONE | DONE (step) | DONE (EmailOtpScreen) | DONE | N/A |
| TOTP | DONE | DONE (step+settings) | DONE (TotpEnrollScreen) | DONE | N/A |
| SMS OTP | DONE | DONE (step) | DONE (SmsOtpScreen) | DONE (Twilio ready) | N/A |
| Hardware Token | DONE | DONE (step) | N/A (cross-platform) | DONE (WebAuthn) | N/A |
| Card Detection | DONE (YOLO) | DONE (CardDetectionPage) | DONE (CardDetectionScreen) | DONE | DONE |
| NFC Auth Flow | DONE (browser) | DONE (step) | DONE (read) | DONE (DB lookup + verify) | N/A |

**Coverage %:**
- Auth-test: 100% (reference implementation)
- Web-app: ~90% (missing voice search page, liveness puzzle page as standalone)
- Client-apps: ~90% (missing bank enroll; voice verify, face liveness, card detection added 2026-03-19)
- Backend: ~97% (FP-External stub)
- Biometric-processor: ~95% (fingerprint endpoints return 501)

### Specific Remaining Items

#### P0 (Must-have for demo)

| # | Item | Files to Change | Effort |
|---|------|----------------|--------|
| ~~1~~ | ~~**NfcDocumentAuthHandler**: Wired to NfcController's verify endpoint with database lookup and verification. NFC cards enrolled via REST can be used in auth flows.~~ | `identity-core-api/.../handler/NfcDocumentAuthHandler.java` | ✅ DONE |
| 2 | **WebAuthn registration endpoint**: FingerprintStep and HardwareKeyStep do client-side WebAuthn but there's no backend endpoint to save the credential. Need `POST /api/v1/webauthn/register` that stores to `webauthn_credentials` table (V18 migration exists) | `identity-core-api` — new WebAuthnController.java or extend StepUpController | Medium |
| 3 | **WebAuthn assertion endpoint**: Need `POST /api/v1/webauthn/authenticate` to verify assertions during login flow | Same controller as #2 | Medium |

#### P1 (Should-have for completeness)

| # | Item | Files to Change | Effort |
|---|------|----------------|--------|
| ~~4~~ | ~~**Client-apps: Voice verify screen** — VoiceEnrollScreen exists (382 lines) but no VoiceVerifyScreen for login-time voice verification~~ | `client-apps/androidApp/.../screen/VoiceVerifyScreen.kt` | ✅ DONE (2026-03-19) |
| ~~5~~ | ~~**Client-apps: Face liveness screen** — BiometricEnrollScreen captures face but doesn't do liveness puzzle (head turn, blink) like auth-test does~~ | `client-apps/androidApp/.../screen/FaceLivenessScreen.kt` | ✅ DONE (2026-03-19) |
| ~~6~~ | ~~**Client-apps: Card detection** — No visual card detection in mobile app (only NFC). Could use CameraX + ML Kit or server YOLO fallback~~ | `client-apps/androidApp/.../screen/CardDetectionScreen.kt` | ✅ DONE (2026-03-19) |
| 7 | **Web-app: Voice search page** — useFaceSearch hook exists but no useVoiceSearch hook or VoiceSearchPage for 1:N speaker identification | `web-app/src/hooks/useVoiceSearch.ts` + `web-app/src/pages/VoiceSearchPage.tsx` (new) | Small |
| 8 | **Client-apps: Push notification (FCM)** — No Firebase Cloud Messaging integration for push-based auth approval | `client-apps/androidApp/build.gradle.kts` + new FCM service + manifest | Large |
| 9 | **Web-app: Enrollment page NFC flow** — EnrollmentPage lists NFC_DOCUMENT but clicking it shows generic "requires mobile" message; should show QR code to open app | `web-app/.../EnrollmentPage.tsx` — improve NFC enrollment UX | Small |
| 10 | **Deploy V18 migration** — webauthn_credentials table migration exists in source but may not be applied on Hetzner | SSH to Hetzner, restart identity-core-api to apply V18 | Small |

#### P2 (Nice-to-have improvements)

| # | Item | Files to Change | Effort |
|---|------|----------------|--------|
| 11 | **YOLO nano model** — Current 99MB model takes ~7s/frame in WASM. Train YOLOv8n (6MB) for real-time detection | Training script + replace model file in auth-test | Large |
| 12 | **MobileFaceNet ONNX** — Pipeline code added to auth-test/app.js. Tries to load `/auth-test/mobilefacenet.onnx`, falls back to landmark-based. Drop model file to activate. | ~~Export model + update auth-test/app.js embedding code~~ PIPELINE DONE | Small (model file needed) |
| 13 | **Web-app E2E tests** — CardDetectionPage and FaceSearchPage have no Playwright tests | `web-app/e2e/card-detection.spec.ts`, `face-search.spec.ts` (new) | Medium |
| 14 | **Client-apps unit tests** — Only 3 test files exist (AdminViewModelTest, KioskViewModelTest, LoginViewModelTest) | `client-apps/shared/src/commonTest/` — add tests for all 18 ViewModels | Large |
| 15 | **SMS OTP activation** — Twilio account needs activation. Setup script created: `./scripts/setup-twilio.sh` | Twilio dashboard + run setup script | Small |
| 16 | **Hardware token E2E test** — Needs physical YubiKey to verify full flow | Manual testing only | Small |
| 17 | **Client-apps: bank enrollment** — No 3-angle face capture (frontal + left + right) like auth-test has | `client-apps/androidApp/.../screen/BiometricEnrollScreen.kt` — add multi-angle capture | Medium |
| 18 | **iOS target** — iosMain platform layer complete (IosSecureStorage/Keychain, IosCameraService/AVFoundation, IosLogger/NSLog, FingerprintPlatform/LocalAuthentication stub, NoOp NFC/Push, DefaultNetworkMonitor, Koin DI module). Needs Swift/SwiftUI wrappers for UI. | `client-apps/iosApp/` — SwiftUI wrappers, Core NFC activation, LocalAuthentication real impl | Medium |

#### P1.5 (Performance — discovered 2026-03-19)

| # | Item | Details | Effort |
|---|------|---------|--------|
| 25 | **biometric-api memory** — at 94% (2.825GB/3GB), needs increase to 3.5GB | Docker Compose memory limit | Small |
| 26 | **Health check latency** — 678ms, needs lightweight `/health` endpoint | biometric-processor new route | Small |
| 27 | **Voice event loop blocking** — voice operations block FastAPI event loop, need thread pool | `run_in_executor` wrapping | Medium |
| 28 | **pgvector HNSW indexes** — missing on face_embeddings and voice_enrollments | SQL migration | Small |
| 29 | **Liveness threshold rewrite** — server-authoritative verdict working, thresholds need alignment with local demo | biometric-processor config | Medium |

#### P3 (Future/stretch)

| # | Item | Files to Change | Effort |
|---|------|----------------|--------|
| 19 | **FP-External (USB scanner)** — BP fingerprint endpoints return 501. Need SecuGen WebAPI or similar vendor bridge | `biometric-processor/app/api/routes/fingerprint.py` + vendor SDK | Large |
| 20 | **Cloudflare Tunnel** — Persistent tunnel for biometric-processor GPU access from laptop | `/opt/projects/fivucsas/scripts/deploy/` — systemd service | Medium |
| 21 | **Route guards** — Web-app admin pages lack proper role-based route guards | `web-app/src/App.tsx` + new ProtectedRoute component | Medium |
| 22 | **CSP hardening** — Current CSP allows CDN resources broadly; tighten to specific hashes | `identity-core-api/.../SecurityHeadersConfig.java` | Small |
| 23 | **Production pen test** — Security audit of all endpoints | External tool or manual | Large |
| 24 | **Desktop NFC** — javax.smartcardio integration for USB NFC readers on desktop | `client-apps/desktopApp/` — JNA/smartcardio wrappers | Large |

---

## Core Design Principle

```
┌─────────────────────────────────────────────────────────────────┐
│                   AUTHENTICATION REQUEST                         │
│                                                                  │
│   Can the browser handle this auth method?                       │
│                                                                  │
│   YES ──────────────────────►  Do it in browser                  │
│   (Password, Face, QR,         (MediaPipe, ONNX, WebAuthn,       │
│    Email OTP, TOTP,             Web Audio, Web NFC)               │
│    FP-Embedded*, Voice*,                                         │
│    Hardware Token, NFC**)                                        │
│                                                                  │
│   NO ───────────────────────►  Client-App acts as bridge          │
│   (FP-Embedded on desktop,     Like Google/Microsoft Authenticator│
│    NFC on iOS/unsupported,     Push approval, scan & confirm,     │
│    External FP scanner)        biometric verification via app     │
│                                                                  │
│   * Voice: browser captures + extracts features                  │
│   * FP-Embedded: WebAuthn if available, else client-app           │
│   ** NFC: Web NFC on Chrome Android, else client-app              │
└─────────────────────────────────────────────────────────────────┘
```

### Client-Apps = Google Authenticator + Tenant Manager

| Google/MS Authenticator | FIVUCSAS Client-App | Same? |
|------------------------|---------------------|-------|
| TOTP code generation | TOTP code generation | ✅ |
| Push notification → Approve/Deny | Push → Approve/Deny biometric auth | ✅ |
| QR scan to add account | QR scan for login + account setup | ✅ |
| Fingerprint to unlock | Fingerprint for step-up auth | ✅ |
| — | **NFC eID reading** (Turkish ID, passport) | 🆕 |
| — | **Face enrollment/verification** | 🆕 |
| — | **Voice enrollment/verification** | 🆕 |
| — | **Tenant management dashboard** | 🆕 |
| — | **Kiosk mode** (door access, exam entry) | 🆕 |
| — | **External FP scanner bridge** | 🆕 |

---

## Auth Methods — Complete Design

### 1. PASSWORD (Priority 1) — ✅ DONE
- **Browser**: Login form → POST /auth/login → JWT ✅
- **Client-app**: Login screen ✅
- **Status**: Production-ready

### 2. FACE (Priority 2) — ✅ Production (0.9-1.5s)

**Server (biometric-processor) — DEPLOYED on Hetzner:**
- `POST /face/enroll` — Enroll face embedding (512-dim) in pgvector
- `POST /face/verify` — Cosine similarity verification
- `POST /face/search` — 1:N search across enrolled faces
- `POST /face/centroid` — Centroid-based enrollment (multi-sample averaging)
- Threshold: 0.6 for verification, 0.4 for search
- Storage: pgvector (512-dim float32), `face_embeddings` table in `biometric_db`

**What exists:**
| Component | File | Status |
|-----------|------|--------|
| Browser detection | `web-app/.../hooks/useFaceDetection.ts` | ✅ Working |
| Browser capture | `web-app/.../steps/FaceCaptureStep.tsx` | ✅ Working |
| Client-app capture | `client-apps/.../BiometricEnrollScreen.kt` | ✅ Working |
| Server enroll/verify/search/centroid | `biometric-processor/app/api/` | ✅ Production |
| pgvector storage | `biometric-processor` DB | ✅ Production |
| ONNX browser embedding | — | ❌ Future (client-side) |
| Browser liveness | — | ❌ Future (client-side) |

### 3. NFC (Priority 3) — ✅ Integrated into client-apps (11,089 lines, 43 files)

**Client-app (FULL eID reading) — INTEGRATED:**
- NFC reader classes integrated into `client-apps/` (11,089 lines, 43 files)
- Turkish eID, passport, Istanbulkart, NDEF, DESFire, Mifare support
- BAC authentication, Secure Messaging, SOD validation

**Browser flow (Chrome Android only):**
```
Web NFC API (NDEFReader) → Read NDEF tag
→ Extract identifier → Send to server → Auth decision
```

**What exists:**
| Component | File | Status |
|-----------|------|--------|
| Universal NFC reader | `client-apps/` (integrated) | ✅ 10+ card types |
| APDU commands | `data/nfc/ApduHelper.kt` | ✅ ISO 7816-4 |
| BAC authentication | `data/nfc/BacAuthentication.kt` | ✅ ICAO Doc 9303 |
| Secure Messaging | `data/nfc/SecureMessaging.kt` | ✅ 3DES-CBC + MAC |
| MRZ parser | `data/nfc/MrzParser.kt` | ✅ TD1 + TD3 |
| DG2 photo parser | `data/nfc/Dg2Parser.kt` | ✅ JPEG extraction |
| SOD validator | `data/nfc/security/SodValidator.kt` | ✅ Signature check |
| Card detector | `data/nfc/detector/CardDetector.kt` | ✅ Auto-detect card type |
| Client-app integration | `client-apps/` | ✅ Done |

### 4. VOICE (Priority 4) — ✅ Production (490-585ms, Resemblyzer 256-dim)

**Server (biometric-processor) — DEPLOYED on Hetzner:**
- `POST /voice/enroll` — Enroll voice embedding (256-dim Resemblyzer) in pgvector
- `POST /voice/verify` — Cosine similarity verification
- `POST /voice/search` — 1:N speaker search
- `POST /voice/centroid` — Centroid-based enrollment (multi-sample averaging)
- Storage: pgvector (256-dim float32), `voice_enrollments` table in `biometric_db`
- Latency: 490-585ms per operation

**What exists:**
| Component | File | Status |
|-----------|------|--------|
| Web capture UI | `web-app/.../steps/VoiceStep.tsx` | ✅ Recording works |
| Backend handler | `identity-core-api/.../VoiceAuthHandler.java` | ✅ Wired |
| Backend adapter | `identity-core-api/.../BiometricServiceAdapter.java` | ✅ HTTP calls ready |
| BP enroll/verify/search/centroid | `biometric-processor/app/api/` | ✅ Production |
| Resemblyzer model | Resemblyzer (256-dim) | ✅ Loaded |
| DB schema | `voice_enrollments` table | ✅ Production |
| Proctoring audio | `biometric-processor/.../basic_audio_analyzer.py` | ✅ VAD (reusable) |

### 5. FINGERPRINT — DUAL MODE (Priority 5)

#### 5a. FP-Embedded (Phone/Laptop sensor — yes/no answer) — ✅ Confirmed on mobile phone

**What it is:** Touch ID, Windows Hello, Android BiometricPrompt — returns cryptographic proof of biometric match, NOT the fingerprint image.

**Browser flow (WebAuthn):**
```
navigator.credentials.create() with authenticatorAttachment: "platform"
→ OS biometric prompt (Touch ID / fingerprint)
→ User touches sensor → OS returns signed assertion
→ Server verifies FIDO2 signature → Auth decision
```

**Availability:**
| Platform | Browser | WebAuthn Platform Auth |
|----------|---------|----------------------|
| Android | Chrome | ✅ Fingerprint / Face |
| iOS | Safari | ✅ Face ID / Touch ID |
| macOS | Safari/Chrome | ✅ Touch ID |
| Windows | Chrome/Edge | ✅ Windows Hello |
| Linux | Chrome | ⚠️ Depends on PAM config |

**When browser can't do it → Client-app bridge:**
```
Web shows QR code → User scans with FIVUCSAS app
→ App shows BiometricPrompt → User touches sensor
→ App signs challenge with ECDSA P-256 key
→ App sends signed response to server → Auth decision
→ Web receives push notification: "Approved"
```

**What exists:**
| Component | File | Status |
|-----------|------|--------|
| Client-app FP auth | `client-apps/.../FingerprintAuthenticator.kt` | ✅ BiometricPrompt + ECDSA |
| Client-app FP VM | `client-apps/.../FingerprintViewModel.kt` | ✅ Full flow |
| Backend step-up | `identity-core-api/.../StepUpController.java` | ✅ Challenge-response |
| Backend FP handler | `identity-core-api/.../FingerprintAuthHandler.java` | ✅ Wired |
| Web WebAuthn | — | ❌ **NEEDED** |
| Web fallback QR | — | ❌ **NEEDED** |

#### 5b. FP-External (USB scanner — real fingerprint image) — ⏳ Needs USB scanner hardware

**What it is:** Dedicated USB fingerprint scanners (SecuGen, DigitalPersona, etc.) that capture the actual fingerprint image with minutiae data.

**Browser flow:**
```
Browser → fetch("http://localhost:PORT/capture")
→ Vendor bridge service running locally captures fingerprint
→ Returns fingerprint image/template
→ Browser sends to server → Server extracts minutiae → Stores/compares
```

**Client-app flow (if USB connected to phone via OTG):**
```
Android USB Host API → Vendor SDK → Capture image
→ Send to server for processing
```

**Server storage & pipeline (like face — enroll, store, compare, search):**
```sql
CREATE TABLE fingerprint_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    template BYTEA,                 -- ISO 19794-2 minutiae template (raw)
    embedding vector(512),          -- Fingerprint embedding for vector search
    finger_position VARCHAR(20),     -- RIGHT_INDEX, LEFT_THUMB, etc.
    quality_score FLOAT,
    image_hash VARCHAR(64),          -- SHA-256 of original image (audit trail)
    scanner_model VARCHAR(100),      -- Device that captured the print
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, finger_position)
);

CREATE INDEX idx_fp_embedding ON fingerprint_enrollments
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_fp_user ON fingerprint_enrollments(user_id);
```

**Biometric-processor endpoints needed:**
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/fingerprint/enroll` | POST | Accept image → extract minutiae → generate embedding → store |
| `/fingerprint/verify` | POST | Accept image → compare against enrolled templates → match score |
| `/fingerprint/search` | POST | Accept image → 1:N search in pgvector → return candidates |
| `/fingerprint/delete/{user_id}` | DELETE | Remove enrolled fingerprints |

**What exists:**
| Component | File | Status |
|-----------|------|--------|
| Backend FP handler | `identity-core-api/.../FingerprintAuthHandler.java` | ✅ Stub |
| BP endpoints | `biometric-processor/.../` | ❌ Stub |
| Vendor bridge | — | ❌ Future (SecuGen WebAPI) |
| FP image processing | — | ❌ Need OpenCV minutiae extraction or SourceAFIS |

### 6. QR CODE (Priority 6) — ✅ Working (html5-qrcode + debounce)

**Browser flow:**
```
Camera → qr-scanner.js → Decode QR → Extract challenge token
→ POST /auth/qr/verify → Auth decision
```

**Client-app flow:**
```
CameraX → ML Kit barcode scanning → Decode QR
→ POST /auth/qr/verify → Auth decision
```

**What exists:**
| Component | File | Status |
|-----------|------|--------|
| Web QR step | `web-app/.../steps/QRStep.tsx` | ✅ |
| Backend handler | `identity-core-api/.../QRCodeAuthHandler.java` | ✅ |
| Client-app QR | `client-apps/.../QrLoginScanScreen.kt` | ✅ |
| QR login API | `client-apps/.../QrLoginApiImpl.kt` | ✅ |

### 7. EMAIL OTP (Priority 7) — ✅ Working
- Backend: EmailOtpAuthHandler ✅
- Web: EmailOtpStep.tsx ✅
- SMTP: Hostinger SMTP configured ✅
- Status: Code complete, needs E2E verification

### 8. TOTP (Priority 8) — ✅ Working (with QR code enrollment)
- Backend: TotpAuthHandler ✅
- Web: TotpStep.tsx ✅
- Enrollment: Settings page TOTP dialog ✅
- Status: Code complete, needs E2E verification

### 9. SMS OTP (Priority 9) — ⏳ Needs Twilio activation
- Backend: SmsOtpAuthHandler ✅
- Twilio: TwilioSmsService ready (conditional activation) ✅
- Status: Blocked on Twilio account activation

### 10. HARDWARE TOKEN (Priority 10) — ⚠️ Needs physical security key to verify
- Same as FP-Embedded but `authenticatorAttachment: "cross-platform"` (YubiKey, etc.)
- Backend: HardwareKeyAuthHandler ✅ (shares WebAuthn infra with fingerprint)
- Status: Code complete, needs physical YubiKey/security key for verification

### 11. CARD DETECTION (Visual) — ⚠️ Server YOLO fails on CPU, migrate to client-side
- `POST /card/detect` — YOLO-based, fails on Hetzner CPU
- Plan: YOLO ONNX in browser (see `CLIENT_SIDE_ML_REPORT.md`)

---

## Revised Phases

### Phase 0: Auth Test Page (Week 1, Days 1-3) — ✅ COMPLETE
**Goal**: Single HTML page testing all auth methods against real APIs.

- [x] Create `auth-test/index.html` — standalone, no build step
- [x] Password login test (POST /auth/login)
- [x] Face capture with MediaPipe + quality feedback
- [x] WebAuthn test (FP-Embedded + Hardware Token)
- [x] Voice recording + playback
- [x] QR scan + verify
- [x] Email/TOTP/SMS OTP input
- [x] NFC detection (Chrome Android)
- [x] Raw API log panel
- [x] Deploy to `https://ica-fivucsas.rollingcatsoftware.com/auth-test/`

**Deliverable**: ✅ Working test console deployed at production domain.

### Phase 1: Face — Server-Side Pipeline (Week 1-2) — ✅ COMPLETE
**Goal**: Face enrollment + verification via biometric-processor.

- [x] Biometric-processor face endpoints: enroll, verify, search, centroid
- [x] pgvector storage (512-dim, face_embeddings table)
- [x] Deploy biometric-processor to Hetzner (CPU mode)
- [x] Production test — 0.9-1.5s latency
- [ ] Future: Client-side ONNX embedding (MobileFaceNet, browser-side)

### Phase 2: NFC — Integrate Existing Readers (Week 2-3) — ✅ COMPLETE
**Goal**: NFC eID reading via client-app, NDEF via browser.

- [x] Copy `UniversalNfcReader` classes → `client-apps/` (11,089 lines, 43 files)
- [x] Create `NfcReadScreen.kt` with MRZ input + NFC scan (642 lines)
- [x] Create NfcController with 5 REST endpoints (enroll/verify/search/delete/list)
- [x] V22 Flyway migration: `nfc_card_enrollments` table
- [x] Browser NDEF fallback in auth-test (Chrome Android)
- [ ] Web browser: "Scan with FIVUCSAS app" flow (QR → app → push result)
- [x] NfcDocumentAuthHandler: wired to NfcController verify with database lookup and verification

### Phase 3: Voice — Full Pipeline (Week 3-4) — ✅ COMPLETE
**Goal**: Voice enrollment + verification with pgvector storage.

- [x] Add Resemblyzer to biometric-processor (256-dim speaker embeddings)
- [x] Implement `/voice/enroll` — extract 256-dim embedding → pgvector
- [x] Implement `/voice/verify` — cosine similarity match
- [x] Implement `/voice/search` — 1:N speaker search
- [x] Implement `/voice/centroid` — centroid-based enrollment
- [x] `voice_enrollments` table with pgvector
- [x] Deploy to Hetzner — 490-585ms latency

### Phase 4: Fingerprint Dual-Mode (Week 4-5)
**Goal**: FP-Embedded via WebAuthn/client-app, FP-External via vendor bridge.

#### 4a. FP-Embedded (WebAuthn)
- [ ] `npm install @simplewebauthn/browser` in web-app
- [ ] `webauthn4j` in identity-core-api
- [ ] Create `useWebAuthn.ts` hook
- [ ] Update FingerprintStep.tsx: detect platform → WebAuthn flow
- [ ] Fallback: "Open FIVUCSAS app" → QR → app does BiometricPrompt → push approval
- [ ] Flyway migration: `webauthn_credentials` table

#### 4b. FP-External (Future stretch)
- [ ] Research SecuGen WebAPI bridge
- [ ] Create localhost detection in auth-test page
- [ ] Design capture → template → store → compare pipeline
- [ ] Flyway migration: `fingerprint_enrollments` table

### Phase 5: Client-App as Authenticator (Week 5-6)
**Goal**: Client-app works like Google/Microsoft Authenticator.

- [ ] **Push approval flow**: Server sends push → app shows "Approve login from Chrome?" → user confirms with biometric → server grants access
- [ ] **TOTP generation**: Integrate TOTP library in client-app (like Google Authenticator)
- [ ] **NFC integration**: Wire UniversalNfcReader into client-app
- [ ] **QR enrollment**: Scan QR to add FIVUCSAS account to app
- [ ] **Device registration**: Register app as trusted authenticator
- [ ] **Account list**: Show all enrolled FIVUCSAS tenants (like Authenticator shows accounts)

### Phase 6: Security & Polish (Week 6-7)
- [ ] Route guards on web-app admin pages
- [ ] Anti-replay (nonce + timestamp on biometric submissions)
- [ ] CORS hardening
- [ ] CSP headers for all CDN resources
- [ ] Rate limiting on auth endpoints
- [ ] Production penetration test

### Phase 7: Client Integration Story (Week 7-8) --- COMPLETE (2026-03-28)
- [x] **verify-app**: standalone iframe auth widget at `/verify/` (extracted from web-app)
- [x] **@fivucsas/auth-js SDK**: FivucsasAuth class, 9.5KB IIFE + 12KB ESM, zero dependencies
- [x] **@fivucsas/auth-react**: FivucsasProvider, VerifyButton, useVerification hook
- [x] **`<fivucsas-verify>` Web Component**: declarative custom element with Shadow DOM
- [x] **OAuth 2.0 / OIDC**: authorization code flow (authorize, token, userinfo) + discovery + JWKS
- [x] **V24 migration**: `oauth2_clients` table for client registration
- [x] **DeveloperPortalPage**: `/developer-portal` with SDK docs and integration guide
- [x] **WidgetDemoPage**: `/widget-demo` with live preview
- [x] **postMessage bridge**: ready/step-change/complete/error/cancel/resize events
- [x] **Integration Guide**: comprehensive developer docs (`docs/INTEGRATION_GUIDE.md`)
- [x] **Demo third-party app**: Acme Bank demo (`docs/demo/third-party-demo.html`)
- [x] **Widget dogfooding**: SecondaryAuthFlow + WidgetDemoPage use the SDK internally

### Phase 8: Identity Verification Pipeline (Week 8-20) — ✅ COMPLETE (2026-03-28)
**Goal**: Evolve from authentication-only to full Identity Verification Platform (IVP). Build a configurable verification pipeline that chains document scanning, OCR, face-to-document matching, liveness, and compliance checks into tenant-customizable flows.

#### Phase 8A: Schema + Core API — ✅ COMPLETE (2026-03-28)
- [x] V26 Flyway migration: `verification_sessions`, `verification_step_results`, `verification_documents` tables
- [x] FlowType enum: AUTHENTICATION, VERIFICATION, ENROLLMENT, ONBOARDING
- [x] VerificationController + ManageVerificationService (hexagonal, same pattern as auth flows)
- [x] 9 new verification step types in `auth_methods`: DOCUMENT_SCAN, DATA_EXTRACT, NFC_CHIP_READ, FACE_MATCH, LIVENESS_CHECK, ADDRESS_PROOF, WATCHLIST_CHECK, AGE_VERIFICATION, VIDEO_INTERVIEW
- [x] `industry_verified` flag on `users` table
- [x] Industry verification templates: Banking KYC, Healthcare, Education, Government, Fintech
- [x] **Exit gate**: `mvn clean compile` passes, V26 migration applies cleanly, GET /api/v1/verification/templates returns template list

#### Phase 8B: Document Processing — ✅ COMPLETE (2026-03-28)
- [x] DOCUMENT_SCAN step: integrate existing YOLO card detection into verification pipeline
- [x] DATA_EXTRACT step: add Tesseract OCR for MRZ/text extraction from identity documents
- [x] NFC_CHIP_READ step: wire existing NFC reader (11,089 lines, 43 files) into pipeline flow
- [x] Turkish ID card (TC Kimlik) specific parser: extract TC number, name, DOB, photo from both sides
- [x] Document type detection: TC Kimlik, passport (TD3), driving license, residence permit
- [x] **Exit gate**: scan a TC Kimlik → extract name, TC number, DOB, photo via OCR + NFC

#### Phase 8C: Face-to-Document Matching — ✅ COMPLETE (2026-03-28)
- [x] FACE_MATCH step: compare live face against document photo using DeepFace cosine similarity
- [x] LIVENESS_CHECK step: integrate existing liveness detection (EnhancedLivenessDetector) into pipeline
- [x] Cross-reference: verify extracted name matches user profile data
- [x] Confidence scoring and threshold configuration per tenant (e.g., face match >= 85%, liveness >= 90%)
- [x] Pipeline orchestrator: chain steps with short-circuit on failure
- [x] **Exit gate**: full pipeline — scan document → extract data → match face → liveness → verified

#### Phase 8D: Admin UI + Templates — ✅ COMPLETE (2026-03-28)
- [x] Verification Flow Builder page (extend existing Auth Flow Builder component)
- [x] Industry template selector with preview and customization
- [x] Verification Dashboard: pipeline completion rates, avg time, failure reasons (recharts)
- [x] Per-step threshold configuration UI (e.g., face match >= 85%, liveness >= 90%)
- [x] Verification session detail view: step-by-step results with confidence scores
- [x] **Exit gate**: tenant admin can create a Banking KYC pipeline from template and run it

#### Phase 8E: Advanced Integrations — ✅ COMPLETE (2026-03-28)
- [x] ADDRESS_PROOF step: utility bill upload + address extraction via OCR
- [x] WATCHLIST_CHECK step: sanctions/PEP list screening (mock implementation, real API interface defined)
- [x] AGE_VERIFICATION step: calculate age from document DOB, enforce minimum age per industry
- [x] PHONE_VERIFICATION step: wire existing SMS OTP (Twilio) into verification pipeline
- [x] CREDIT_CHECK step: interface definition only (no real integration, ready for future provider)
- [x] VIDEO_INTERVIEW step: WebRTC recording for manual review queue (V28 migration)
- [x] **Exit gate**: all step types functional with at least mock implementations, E2E test covers full KYC flow

#### Turkish Industry Templates

| Template | Steps | Regulatory Context |
|----------|-------|--------------------|
| **Banking KYC** (BDDK/BRSA) | DOCUMENT_SCAN → DATA_EXTRACT → NFC_CHIP_READ → FACE_MATCH → LIVENESS_CHECK → WATCHLIST_CHECK | BDDK (Banking Regulation and Supervision Agency) requires full KYC for account opening |
| **Healthcare** (SGK) | DOCUMENT_SCAN → DATA_EXTRACT → FACE_MATCH → LIVENESS_CHECK | SGK (Social Security Institution) patient identity verification |
| **Education** (YOK) | DOCUMENT_SCAN → DATA_EXTRACT → FACE_MATCH → AGE_VERIFICATION | YOK (Council of Higher Education) student enrollment verification |
| **Government** (e-Devlet) | NFC_CHIP_READ → DATA_EXTRACT → FACE_MATCH → LIVENESS_CHECK → WATCHLIST_CHECK | e-Devlet integration pathway for government services |
| **Fintech** (TCMB) | DOCUMENT_SCAN → DATA_EXTRACT → NFC_CHIP_READ → FACE_MATCH → LIVENESS_CHECK → WATCHLIST_CHECK → CREDIT_CHECK | TCMB (Central Bank) regulations for payment institutions |
| **Telecom** (BTK) | DOCUMENT_SCAN → DATA_EXTRACT → FACE_MATCH → AGE_VERIFICATION | BTK (Information Technologies Authority) SIM registration |
| **Gig Economy** | DOCUMENT_SCAN → FACE_MATCH → LIVENESS_CHECK → ADDRESS_PROOF | Courier/driver onboarding verification |

### Phase 9: iOS + Desktop (Week 20-22)
- [x] iOS platform layer: IosSecureStorage (Keychain), IosCameraService (AVFoundation), IosLogger (NSLog)
- [x] iOS Koin DI module: all bindings (camera, storage, logger, fingerprint, push, network, NFC)
- [x] iOS FingerprintPlatform: stub (LocalAuthentication ready to wire)
- [ ] iOS SwiftUI wrappers (iosApp target)
- [ ] iOS NFC reader (Core NFC framework — NoOpNfcService in place)
- [ ] iOS biometric (LocalAuthentication — real implementation)
- [ ] Desktop fingerprint (Windows Hello via JNA)
- [ ] Desktop NFC (USB readers via javax.smartcardio)

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                        WEB BROWSER (Primary)                         │
│                                                                      │
│  Password ✅  Face ✅  Voice ✅  QR ⚠️  Card Detection ✅            │
│  Email OTP ✅  TOTP ✅  SMS OTP ✅                                    │
│  FP-Embedded (WebAuthn) ✅  Hardware Token (WebAuthn) ⚠️             │
│  NFC (client-app integrated) ✅                                      │
│                                                                      │
│  When browser can't ──► Shows QR code: "Open FIVUCSAS App"          │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
                    ▼            ▼            ▼
┌─────────────────────┐ ┌─────────────┐ ┌──────────────────────────┐
│  FIVUCSAS App        │ │ identity-   │ │ biometric-processor      │
│  (Authenticator)     │ │ core-api    │ │ (FastAPI)                │
│                      │ │ (Spring)    │ │                          │
│  📱 NFC eID reading  │ │             │ │ Face embeddings (pgvec)  │
│  🔐 FP BiometricPmpt │ │ Auth flows  │ │ Voice embeddings (pgvec) │
│  🔑 TOTP generation  │ │ JWT/Session │ │ Liveness detection       │
│  ✅ Push approval     │ │ WebAuthn    │ │ Speaker verification     │
│  📷 Face capture      │ │ User mgmt  │ │ FP template matching     │
│  🎤 Voice capture     │ │ Tenant mgmt│ │                          │
│  🏢 Tenant dashboard  │ │             │ │                          │
│  🚪 Kiosk mode        │ │             │ │                          │
└─────────────────────┘ └─────────────┘ └──────────────────────────┘
```

---

## Existing Code Reference

### NFC (Ready to integrate)
| File | Path | What |
|------|------|------|
| ApduHelper | `practice-and-test/UniversalNfcReader/data/nfc/ApduHelper.kt` | ISO 7816-4 APDU commands |
| BacAuthentication | `practice-and-test/UniversalNfcReader/data/nfc/BacAuthentication.kt` | ICAO Doc 9303 BAC |
| SecureMessaging | `practice-and-test/UniversalNfcReader/data/nfc/SecureMessaging.kt` | 3DES encrypted channel |
| PassportNfcReader | `practice-and-test/UniversalNfcReader/data/nfc/reader/PassportNfcReader.kt` | e-Passport TD3 |
| TurkishEidReader | `practice-and-test/UniversalNfcReader/data/nfc/reader/TurkishEidReader.kt` | Turkish eID TD1 |
| NdefReader | `practice-and-test/UniversalNfcReader/data/nfc/reader/NdefReader.kt` | NFC tags |
| DESFire/Istanbul | `practice-and-test/UniversalNfcReader/data/nfc/reader/MifareDesfireReader.kt` | Transit cards |
| CardDetector | `practice-and-test/UniversalNfcReader/data/nfc/detector/CardDetector.kt` | Auto card type |
| MrzParser | `practice-and-test/UniversalNfcReader/data/nfc/MrzParser.kt` | TD1 + TD3 MRZ |
| Dg2Parser | `practice-and-test/UniversalNfcReader/data/nfc/Dg2Parser.kt` | Photo extraction |
| SodValidator | `practice-and-test/UniversalNfcReader/data/nfc/security/SodValidator.kt` | Signature verification |
| SecureLogger | `practice-and-test/UniversalNfcReader/data/nfc/security/SecureLogger.kt` | KVKK-safe logging |
| NfcCardReadingService | `practice-and-test/UniversalNfcReader/data/nfc/NfcCardReadingService.kt` | Orchestrator |

### Face (Partially working)
| File | Path | What |
|------|------|------|
| useFaceDetection | `web-app/src/features/auth/hooks/useFaceDetection.ts` | MediaPipe browser GPU |
| FaceCaptureStep | `web-app/.../steps/FaceCaptureStep.tsx` | Camera + crop UI |
| BiometricEnrollScreen | `client-apps/.../BiometricEnrollScreen.kt` | App face capture |
| enrollment routes | `biometric-processor/app/api/v1/enrollment/` | Server endpoints |

### Voice (Production)
| File | Path | What |
|------|------|------|
| VoiceStep | `web-app/.../steps/VoiceStep.tsx` | Web recording UI |
| VoiceAuthHandler | `identity-core-api/.../VoiceAuthHandler.java` | Backend handler |
| voice routes | `biometric-processor/app/api/` | enroll/verify/search/centroid |
| Resemblyzer | biometric-processor | 256-dim speaker embeddings |
| audio_analyzer | `biometric-processor/.../basic_audio_analyzer.py` | VAD (reusable) |

### Fingerprint (Partial)
| File | Path | What |
|------|------|------|
| FingerprintAuthenticator | `client-apps/.../FingerprintAuthenticator.kt` | ECDSA + BiometricPrompt |
| FingerprintViewModel | `client-apps/.../FingerprintViewModel.kt` | Full step-up flow |
| StepUpController | `identity-core-api/.../StepUpController.java` | Challenge-response |
| FingerprintAuthHandler | `identity-core-api/.../FingerprintAuthHandler.java` | Auth flow handler |

### Client-App Architecture
| File | Path | What |
|------|------|------|
| 13 ViewModels | `client-apps/shared/.../viewmodel/` | State management |
| 8 Repositories | `client-apps/shared/.../repository/` | Data layer |
| 20+ Use Cases | `client-apps/shared/.../usecase/` | Business logic |
| 6 API clients | `client-apps/shared/.../remote/api/` | HTTP to backend |
| 25+ Screens | `client-apps/androidApp/.../screen/` | Android UI |
| Platform abstractions | `client-apps/shared/.../platform/` | Camera, storage, FP |

### Demos (For reference)
| Demo | Path | What |
|------|------|------|
| Next.js demo UI | `biometric-processor/demo-ui/` | 20+ pages, all biometric features |
| Fast local demo | `biometric-processor/demo_local_fast.py` | Real-time 20-30 FPS |
| Optimized demo | `biometric-processor/demo_local_optimized.py` | Full features |
| Clean arch demo | `practice-and-test/biometric-demo-optimized/` | Hexagonal reference |
| DeepFace learning | `practice-and-test/DeepFacePractice1/` | Educational (4 demos) |

---

## Technology Stack

| Purpose | Browser (Web) | Client-App (Mobile/Desktop) | Server |
|---------|--------------|----------------------------|--------|
| Face detection | MediaPipe Tasks Vision (2.4MB) | ML Kit / CameraX | — |
| Face embedding | ONNX Runtime Web + MobileFaceNet (4MB) | TFLite MobileFaceNet | DeepFace (fallback) |
| Liveness | Anti-spoofing ONNX (800KB) | ML Kit face mesh | DeepFace anti-spoof |
| Fingerprint-Embedded | WebAuthn (`@simplewebauthn/browser`) | BiometricPrompt + ECDSA | webauthn4j |
| Fingerprint-External | Vendor bridge (localhost HTTP) | USB Host API | Template matching |
| Voice capture | Web Audio API | MediaRecorder | — |
| Voice embedding | — (server-side for now) | — (server-side) | SpeechBrain ECAPA-TDNN |
| NFC | Web NFC API (Chrome Android) | IsoDep + BAC + SecureMessaging | — |
| QR | qr-scanner (55KB) | ML Kit barcode | — |
| TOTP | — (server validates) | TOTP library (generate codes) | TotpService |
| Encryption | Web Crypto API (AES-256-GCM) | AndroidKeystore / Keychain | — |
| Push | — | FCM / APNs | — |

---

## Timeline

| Phase | Scope | Duration | Deliverable | Status |
|-------|-------|----------|-------------|--------|
| **0** | Auth test HTML page | 3 days | Production test console | ✅ COMPLETE |
| **1** | Face full pipeline | 2 weeks | Browser face auth working | ✅ COMPLETE |
| **2** | NFC integration | 1.5 weeks | eID reading via app | ✅ COMPLETE |
| **3** | Voice full pipeline | 1.5 weeks | Voice enroll + verify | ✅ COMPLETE |
| **4** | Fingerprint dual-mode | 1.5 weeks | WebAuthn + app bridge | ✅ COMPLETE |
| **5** | Client-app as authenticator | 1.5 weeks | Push approval, TOTP, NFC | PARTIAL |
| **6** | Security & polish | 1 week | Hardened, tested | PARTIAL |
| **7** | Client integration story | 2 weeks | SDK + OAuth 2.0 + widget | ✅ COMPLETE |
| **8** | Identity Verification Pipeline | 8-12 weeks | Full IVP with KYC templates | ✅ COMPLETE |
| **9** | iOS + Desktop | 2 weeks | Cross-platform | PARTIAL |
| **Total** | | **~23 weeks** | Full Identity Verification Platform |

---

## Production URLs

| Service | URL | Status |
|---------|-----|--------|
| Identity Core API | https://auth.rollingcatsoftware.com | ✅ Running |
| Swagger UI | https://auth.rollingcatsoftware.com/swagger-ui.html | ✅ |
| Web Dashboard | https://ica-fivucsas.rollingcatsoftware.com | ✅ Live |
| Auth Test Page | https://ica-fivucsas.rollingcatsoftware.com/auth-test/ | ✅ Deployed |
| Landing Page | https://fivucsas.rollingcatsoftware.com | ✅ Live |
| Biometric API | Hetzner VPS (port 8001, internal) | ✅ Running |

## Test Credentials

- **Admin**: `admin@fivucsas.local` / `Test@123` / tenant: `system`
