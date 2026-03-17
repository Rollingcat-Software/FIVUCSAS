# FIVUCSAS — Comprehensive Production Roadmap V2

> **Created**: 2026-03-17 | **Revised**: 2026-03-17
> **Goal**: All 10 auth methods production-ready, browser-first, client-app as fallback
> **Philosophy**: Browser handles everything it can. What it can't → client-app acts as authenticator bridge.
> **Server**: CPU-only (no GPU needed) — Hetzner VPS + Hostinger

---

## Current Session Results (2026-03-17)

### What was accomplished:
- **Auth-test page**: 11 sections deployed at `/auth-test/` (Password, Face, Voice, FP-Embedded, FP-External, QR, Email OTP, TOTP, SMS OTP, Hardware Token, NFC)
- **Face**: enroll/verify/search + liveness puzzle + 3-angle bank enrollment flow
- **Voice**: enroll/verify/search with Resemblyzer 256-dim + centroid averaging
- **Card detection**: YOLO-based endpoint live on biometric-processor
- **FP-Embedded**: WebAuthn confirmed working on mobile phone
- **NFC**: Fully integrated into client-apps (11,089 lines, 43 files)
- **Web-app**: Enrollment page + secondary auth + 22 UI/UX fixes on login/register
- **Client-apps**: P0 blockers fixed, all mocks removed, i18n added (TR/EN), 6 new screens
- **Biometric-processor**: Deployed on Hetzner in CPU mode (biometric-api container, port 8001)

### Known Issues (to fix next session):
- Web-app CSP blocks MediaPipe WASM (needs `connect-src` + `unsafe-eval` in CSP headers)
- Enrollment endpoints return 403 for USER role (need permission adjustment)
- Audit log polling returns 403 for non-admin users
- WebAuthn RP ID mismatch on web-app (domain config issue)
- TOTP enrollment works, but other enrollment methods need permission fixes on backend

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

### 6. QR CODE (Priority 6) — ⚠️ Scanner lib ESM issue

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

### 7. EMAIL OTP (Priority 7) — ⚠️ Needs testing
- Backend: EmailOtpAuthHandler ✅
- Web: EmailOtpStep.tsx ✅
- SMTP: Hostinger SMTP configured ✅
- Status: Code complete, needs E2E verification

### 8. TOTP (Priority 8) — ⚠️ Needs testing
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

### 11. CARD DETECTION (Visual) — ✅ Production (YOLO-based)
- `POST /card/detect` — YOLO-based visual card detection
- Deployed on biometric-processor (Hetzner)

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

### Phase 2: NFC — Integrate Existing Readers (Week 2-3)
**Goal**: NFC eID reading via client-app, NDEF via browser.

- [ ] Copy `UniversalNfcReader` classes → `client-apps/shared/` (platform: androidMain)
- [ ] Create `NfcReadScreen.kt` with MRZ input + NFC scan
- [ ] Create `NfcAuthHandler` result → identity-core-api verification
- [ ] Add identity-core-api endpoint: `POST /auth/nfc/verify-eid`
- [ ] Web browser: "Scan with FIVUCSAS app" flow (QR → app → push result)
- [ ] Browser NDEF fallback for simple NFC tags (Chrome Android)

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

### Phase 7: iOS + Desktop (Week 7-9)
- [ ] iOS NFC reader (Core NFC framework)
- [ ] iOS biometric (LocalAuthentication)
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

| Phase | Scope | Duration | Deliverable |
|-------|-------|----------|-------------|
| **0** | Auth test HTML page | 3 days | Production test console |
| **1** | Face full pipeline | 2 weeks | Browser face auth working |
| **2** | NFC integration | 1.5 weeks | eID reading via app |
| **3** | Voice full pipeline | 1.5 weeks | Voice enroll + verify |
| **4** | Fingerprint dual-mode | 1.5 weeks | WebAuthn + app bridge |
| **5** | Client-app as authenticator | 1.5 weeks | Push approval, TOTP, NFC |
| **6** | Security & polish | 1 week | Hardened, tested |
| **7** | iOS + Desktop | 2 weeks | Cross-platform |
| **Total** | | **~11 weeks** | Full biometric platform |

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
