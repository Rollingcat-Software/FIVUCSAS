# FIVUCSAS — Comprehensive Production Roadmap V2

> **Created**: 2026-03-17 | **Revised**: 2026-03-17
> **Goal**: All 10 auth methods production-ready, browser-first, client-app as fallback
> **Philosophy**: Browser handles everything it can. What it can't → client-app acts as authenticator bridge.
> **Server**: CPU-only (no GPU needed) — Hetzner VPS + Hostinger

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

### 2. FACE (Priority 2) — ⚠️ Detection only, embedding needed

**Browser flow (target):**
```
Camera → MediaPipe detection → ONNX MobileFaceNet embedding (4MB)
→ Liveness check (anti-spoofing ONNX, 800KB)
→ Encrypt embedding (Web Crypto AES-256-GCM)
→ Send to server → Server compares → Auth decision
```

**Client-app flow:**
```
CameraX/AVFoundation → ML Kit face detection
→ TFLite MobileFaceNet embedding
→ Send to server → Auth decision
```

**Server (biometric-processor):**
- `POST /enrollment/enroll_embedding` — Store 512-dim vector in pgvector
- `POST /enrollment/verify_embedding` — Cosine similarity match
- Threshold: 0.6 for verification, 0.4 for search

**Storage:** pgvector (512-dim float32 vectors), same as current face approach

**What exists:**
| Component | File | Status |
|-----------|------|--------|
| Browser detection | `web-app/.../hooks/useFaceDetection.ts` | ✅ Working |
| Browser capture | `web-app/.../steps/FaceCaptureStep.tsx` | ✅ Working |
| Client-app capture | `client-apps/.../BiometricEnrollScreen.kt` | ✅ Working |
| Server enrollment | `biometric-processor/app/api/v1/enrollment/` | ✅ Working |
| Server verification | `biometric-processor/app/api/v1/enrollment/` | ✅ Working |
| pgvector storage | `biometric-processor` DB | ✅ Working |
| ONNX browser embedding | — | ❌ **NEEDED** |
| Browser liveness | — | ❌ **NEEDED** |

### 3. NFC (Priority 3) — Existing code needs integration

**Browser flow (Chrome Android only):**
```
Web NFC API (NDEFReader) → Read NDEF tag
→ Extract identifier → Send to server → Auth decision
```
**Limitation**: Web NFC can only read NDEF tags. It CANNOT do APDU/BAC for eID reading.

**Client-app flow (FULL eID reading):**
```
Android NFC (IsoDep) → Select MRTD app (APDU)
→ BAC authentication (MRZ → Kseed → 3DES keys)
→ Secure Messaging → Read DG1 (personal data) + DG2 (photo)
→ SOD validation → Send verified identity to server
```

**What exists (COMPREHENSIVE!):**
| Component | File | Status |
|-----------|------|--------|
| Universal NFC reader | `practice-and-test/UniversalNfcReader/` | ✅ 10+ card types (Turkish eID, passport, Istanbulkart, NDEF, DESFire, Mifare) |
| APDU commands | `data/nfc/ApduHelper.kt` | ✅ ISO 7816-4 |
| BAC authentication | `data/nfc/BacAuthentication.kt` | ✅ ICAO Doc 9303 |
| Secure Messaging | `data/nfc/SecureMessaging.kt` | ✅ 3DES-CBC + MAC |
| MRZ parser | `data/nfc/MrzParser.kt` | ✅ TD1 + TD3 |
| DG2 photo parser | `data/nfc/Dg2Parser.kt` | ✅ JPEG extraction |
| SOD validator | `data/nfc/security/SodValidator.kt` | ✅ Signature check |
| Card detector | `data/nfc/detector/CardDetector.kt` | ✅ Auto-detect card type |
| Passport reader | `UniversalNfcReader/.../PassportNfcReader.kt` | ✅ |
| NDEF reader | `UniversalNfcReader/.../NdefReader.kt` | ✅ |
| DESFire/Istanbulkart | `UniversalNfcReader/.../MifareDesfireReader.kt` | ✅ |
| Client-app integration | — | ❌ **NEEDED** |

**Integration plan:**
1. Copy NFC reader classes from `practice-and-test/UniversalNfcReader/data/nfc/` → `client-apps/shared/` (androidMain)
2. Create `NfcAuthScreen.kt` in client-app with MRZ input + NFC scan flow
3. On successful read: extract DG1 data + DG2 photo → send to identity-core-api
4. Server matches identity from eID against enrolled user → Auth decision
5. Web browser: show "Scan with FIVUCSAS app" QR code → client-app does NFC → pushes result back

### 4. VOICE (Priority 4) — Stub, needs full implementation

**Browser flow:**
```
Web Audio API → Record 3-5 seconds
→ Extract MFCC/mel-spectrogram features (meyda.js, ~50KB)
→ OR: ONNX ECAPA-TDNN speaker embedding (~20-30MB)
→ Encrypt → Send to server → Server compares → Auth decision
```

**Client-app flow:**
```
Android MediaRecorder / iOS AVAudioRecorder
→ Same embedding pipeline → Send to server
```

**Storage design (like face, pgvector):**
```sql
-- New table for voice embeddings
CREATE TABLE voice_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    embedding vector(192),          -- ECAPA-TDNN: 192-dim
    sample_count INTEGER DEFAULT 0,  -- Number of enrollment samples averaged
    quality_score FLOAT,             -- SNR / confidence
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_voice_embedding ON voice_enrollments
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

**Pipeline (biometric-processor):**
| Step | Operation | Where | Tech |
|------|-----------|-------|------|
| 1 | Audio capture | Client | Web Audio API / MediaRecorder |
| 2 | Preprocessing | Client or Server | Noise removal, VAD, silence trim |
| 3 | Feature extraction | Server (MVP) / Client (future) | ECAPA-TDNN via SpeechBrain |
| 4 | Embedding (192-dim) | Server | SpeechBrain `spkrec-ecapa-voxceleb` |
| 5 | Storage | Server | pgvector |
| 6 | Comparison | Server | Cosine similarity, threshold 0.7 |

**What exists:**
| Component | File | Status |
|-----------|------|--------|
| Web capture UI | `web-app/.../steps/VoiceStep.tsx` | ✅ Recording works |
| Backend handler | `identity-core-api/.../VoiceAuthHandler.java` | ✅ Wired (calls stub) |
| Backend adapter | `identity-core-api/.../BiometricServiceAdapter.java` | ✅ HTTP calls ready |
| BP endpoints | `biometric-processor/.../voice.py` | ❌ Stub (501) |
| ML model | — | ❌ Need SpeechBrain/ECAPA-TDNN |
| DB schema | — | ❌ Need voice_enrollments table |
| Proctoring audio | `biometric-processor/.../basic_audio_analyzer.py` | ✅ VAD exists (reusable) |

### 5. FINGERPRINT — DUAL MODE (Priority 5)

#### 5a. FP-Embedded (Phone/Laptop sensor — yes/no answer)

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

#### 5b. FP-External (USB scanner — real fingerprint image)

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

### 6. QR CODE (Priority 6) — Mostly done

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

### 7. EMAIL OTP (Priority 7) — ✅ DONE
- Backend: EmailOtpAuthHandler ✅
- Web: EmailOtpStep.tsx ✅
- SMTP: Hostinger SMTP configured ✅

### 8. TOTP (Priority 8) — ✅ DONE
- Backend: TotpAuthHandler ✅
- Web: TotpStep.tsx ✅
- Enrollment: Settings page TOTP dialog ✅

### 9. SMS OTP (Priority 9) — ✅ DONE
- Backend: SmsOtpAuthHandler ✅
- Twilio: TwilioSmsService ready (conditional activation) ✅

### 10. HARDWARE TOKEN (Priority 10) — WebAuthn cross-platform
- Same as FP-Embedded but `authenticatorAttachment: "cross-platform"` (YubiKey, etc.)
- Backend: HardwareKeyAuthHandler ✅ (shares WebAuthn infra with fingerprint)

---

## Revised Phases

### Phase 0: Auth Test Page (Week 1, Days 1-3)
**Goal**: Single HTML page testing all auth methods against real APIs.

- [ ] Create `auth-test/index.html` — standalone, no build step
- [ ] Password login test ✅ (POST /auth/login)
- [ ] Face capture with MediaPipe + quality feedback
- [ ] WebAuthn test (FP-Embedded + Hardware Token)
- [ ] Voice recording + playback
- [ ] QR scan + verify
- [ ] Email/TOTP/SMS OTP input
- [ ] NFC detection (Chrome Android)
- [ ] Raw API log panel
- [ ] Deploy to `https://ica-fivucsas.rollingcatsoftware.com/auth-test/`

**Deliverable**: Working test console on production domain.

### Phase 1: Face — Full Client-Side Pipeline (Week 1-2)
**Goal**: Face enrollment + verification with browser-side ONNX embedding.

- [ ] `npm install onnxruntime-web` in web-app
- [ ] Create `useFaceEmbedding.ts` (MobileFaceNet ONNX, 4MB, 512-dim)
- [ ] Create `useLivenessDetection.ts` (anti-spoofing ONNX, 800KB)
- [ ] Add biometric-processor endpoints: `enroll_embedding`, `verify_embedding`
- [ ] Wire into FaceCaptureStep: detect → crop → embed → encrypt → send
- [ ] CSP headers for ONNX WASM loading
- [ ] Production test on real domain

### Phase 2: NFC — Integrate Existing Readers (Week 2-3)
**Goal**: NFC eID reading via client-app, NDEF via browser.

- [ ] Copy `UniversalNfcReader` classes → `client-apps/shared/` (platform: androidMain)
- [ ] Create `NfcReadScreen.kt` with MRZ input + NFC scan
- [ ] Create `NfcAuthHandler` result → identity-core-api verification
- [ ] Add identity-core-api endpoint: `POST /auth/nfc/verify-eid`
- [ ] Web browser: "Scan with FIVUCSAS app" flow (QR → app → push result)
- [ ] Browser NDEF fallback for simple NFC tags (Chrome Android)

### Phase 3: Voice — Full Pipeline (Week 3-4)
**Goal**: Voice enrollment + verification with pgvector storage.

- [ ] Add SpeechBrain/ECAPA-TDNN to biometric-processor
- [ ] Implement `/voice/enroll` — extract 192-dim embedding → pgvector
- [ ] Implement `/voice/verify` — cosine similarity match
- [ ] Flyway migration: `voice_enrollments` table with pgvector
- [ ] Update VoiceStep.tsx: better recording UX, waveform, noise indicator
- [ ] Client-app VoiceEnrollScreen (Android MediaRecorder → send to server)
- [ ] Reuse proctoring VAD (`basic_audio_analyzer.py`) for voice activity detection

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
│  Password ✅  Face (ONNX) 🔨  Voice (WebAudio) 🔨  QR ✅            │
│  Email OTP ✅  TOTP ✅  SMS OTP ✅                                    │
│  FP-Embedded (WebAuthn) 🔨  Hardware Token (WebAuthn) 🔨             │
│  NFC (Web NFC, Chrome Android only) 🔨                               │
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

### Voice (Stub only)
| File | Path | What |
|------|------|------|
| VoiceStep | `web-app/.../steps/VoiceStep.tsx` | Web recording UI |
| VoiceAuthHandler | `identity-core-api/.../VoiceAuthHandler.java` | Backend handler |
| voice.py | `biometric-processor/app/api/routes/voice.py` | Stub (501) |
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
| Auth Test Page | https://ica-fivucsas.rollingcatsoftware.com/auth-test/ | 🔨 Phase 0 |
| Landing Page | https://fivucsas.rollingcatsoftware.com | ✅ Live |
| Biometric API | https://bpa-fivucsas.rollingcatsoftware.com | ⏳ Pending |

## Test Credentials

- **Admin**: `admin@fivucsas.local` / `Test@123` / tenant: `system`
