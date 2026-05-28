# NFC + Document — Pipeline Inventory (2026-05-28)

Status legend: ✅ full | 🟡 partial | ❌ missing | 🐞 broken | ❔ unverified

---

## 1. NFC Card (Simple/Opaque) — Enroll / Verify / Delete

Serial-number-based NFC auth. No chip data groups, no BAC, no MRZ. Backend treats the NDEF serial as an opaque identifier.

| Operation/Stage | DB | Backend (file:func → endpoint) | Processor (file:func) | Web | Mobile | Desktop | practice-and-test reader | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|---|
| Enroll card | `nfc_cards` table (V22__nfc_card_enrollment.sql:4-23); `user_enrollments` auto-created by `ManageEnrollmentService` | `NfcController.java:46→POST /api/v1/nfc/enroll`; business logic `ManageNfcCardService.java:56-107` | N/A | `NfcEnrollmentPage.tsx:85-113` → `POST /nfc/enroll` with `cardSerial` | Android: `NfcStepScreen.kt` drives VM → sends `nfcData=uid` to `/auth/mfa/step` (auth flow path, not enroll path); no dedicated mobile enroll screen | `NoOpNfcService` (desktop, shared/src/commonMain/kotlin/com/fivucsas/shared/platform/NoOpNfcService.kt) | N/A — chip access requires device hardware | ✅ | Reactivates existing inactive card on re-enroll (ManageNfcCardService.java:74-82). |
| Read/list cards | `nfc_cards` indexed (V22:20-22) | `NfcController.java:170→GET /api/v1/nfc/user/{userId}`; `ManageNfcCardService.java:141` | N/A | Not surfaced in `NfcEnrollmentPage.tsx`; `NfcCardsList.tsx` renders list if API provides it | Not implemented in any mobile screen | N/A | N/A | 🟡 | `NfcEnrollmentPage.tsx` does not show the user's enrolled card list. |
| Verify (serial lookup) | `nfc_cards` (`findByCardSerialAndIsActiveTrue`) | `NfcController.java:81→POST /api/v1/nfc/verify` | N/A | `NfcEnrollmentPage.tsx:85-113`; auto-verify on scan | N/A | N/A | N/A | ✅ | Returns userId, cardType, enrolledAt. |
| Search by serial | `nfc_cards.findByCardSerial` | `NfcController.java:118→GET /api/v1/nfc/search/{serial}` | N/A | `NfcEnrollmentPage.tsx:107-112` (admin-only button) | N/A | N/A | N/A | ✅ | Admin-only in UI; `@PreAuthorize("isAuthenticated()")` only on backend — no admin RBAC check server-side. |
| Deactivate card by ID | `nfc_cards.isActive=false` | `NfcController.java:197→DELETE /api/v1/nfc/cards/{cardId}`; scoped to currentUser | N/A | Not wired | N/A | N/A | N/A | 🟡 | Backend endpoint exists; web-app has no "delete specific card" UI. |
| Remove all user enrollments | `nfc_cards` all deactivated | `NfcController.java:152→DELETE /api/v1/nfc/{userId}`; `ManageNfcCardService.java:124` | N/A | Not wired | N/A | N/A | N/A | 🟡 | Soft-delete (deactivate); no hard delete path. |
| NFC as MFA step | `mfa_sessions` + `user_enrollments` | `NfcDocumentAuthHandler.java:29→POST /auth/mfa/step` (via `VerifyMfaStepService`) — validates `nfcData` serial against enrolled card | N/A | `NfcStep.tsx:65-121` reads NDEF serial → `onSubmit(serialNumber)` | `NfcStepScreen.kt:54-123`; `NfcStepViewModel.kt:213-230` builds payload with `nfcData=uid` | N/A | N/A | ✅ | `NfcDocumentAuthHandler` checks `nfcData` only (serial, not chip content). Backend comment at `NfcStepViewModel.kt:201` admits the handler currently ignores full BAC evidence. |

---

## 2. BAC (Basic Access Control) — TCK / Passport Chip Read

ICAO 9303-compliant chip reading using 3DES session keys derived from MRZ.

| Operation/Stage | DB | Backend (file:func → endpoint) | Processor (file:func) | Web | Mobile | Desktop | practice-and-test reader | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|---|
| MRZ key derivation (BAC Kenc/Kmac) | N/A | N/A | N/A | N/A | `BacAuthentication.kt` (client-apps/androidApp:1-108) — SHA-1 + 3DES; `TurkishEidNfcReader/BacAuthentication.kt` (practice-and-test) identical algo | N/A | `TurkishEidNfcReader/BacAuthentication.kt`; `UniversalNfcReader/eid/BacAuthentication.kt` — full implementation | ✅ | ICAO Doc 9303 Part 11. Both practice-and-test apps have complete, standalone implementations. |
| Mutual authentication (GET CHALLENGE → EXTERNAL AUTHENTICATE) | N/A | N/A | N/A | N/A | `NfcCardReader.kt:215-268` (TurkishEidReader); `PassportNfcReader.kt:373-428` (UniversalNfcReader) | N/A | `BacAuthentication.kt:169-272` (full 3DES + MAC) | ✅ | ISO 9797-1 MAC Algorithm 3 implemented correctly. Base key zeroed after session derivation in UniversalNfcReader (PassportNfcReader.kt:409-410) but NOT in TurkishEidNfcReader/NfcCardReader.kt — key clearing omitted there (BacAuthentication gap). |
| Secure messaging (READ BINARY wrapped) | N/A | N/A | N/A | N/A | `SecureMessaging.kt` (client-apps); session key `clear()` called in `TurkishEidReader.kt:159-160` finally block | N/A | `SecureMessaging.kt` in both readers | ✅ | |
| DG1 read + parse (MRZ data) | N/A | N/A | N/A | N/A | `Dg1Parser.kt` (client-apps + UniversalNfcReader) | N/A | `Dg1Parser.kt` (TurkishEidNfcReader: parses TD1 MRZ 3×30 chars including TCKN, name, DOB, expiry, gender, nationality, doc number) | ✅ | |
| DG2 read + parse (chip photo, JPEG2000) | N/A | N/A | N/A | N/A | `Dg2Parser.kt` (client-apps + UniversalNfcReader) | N/A | `Dg2Parser.kt` (both readers) | ✅ | Returns Android Bitmap. |
| EF.SOD read | N/A | N/A | N/A | N/A | `NfcCardReader.kt:141` (TurkishEidReader practice-and-test) | N/A | `NfcCardReader.kt`, `SodValidator.kt` | ✅ | |
| SOD signature validation | N/A | N/A | N/A | N/A | `SodValidator.kt` (client-apps/androidApp); `SodValidator.kt` (UniversalNfcReader) | N/A | `TurkishEidNfcReader/SodValidator.kt`; `UniversalNfcReader/sod/SodValidator.kt` | 🟡 | TurkishEidNfcReader `SodValidator.validate()` result logged but NOT surfaced back to the caller — `NfcCardReader.kt:403-426` calls `validateSod()` but result is silently discarded (no fail path). UniversalNfcReader uses `HashVerifier` for per-DG hash checks. |
| DG hash verification (DG1, DG2 against SOD) | N/A | N/A | N/A | N/A | `HashVerifier.kt` (UniversalNfcReader + client-apps) | N/A | `HashVerifier.kt` (UniversalNfcReader only) | 🟡 | `TurkishEidNfcReader` does NOT verify DG hashes against SOD — `NfcCardReader.kt` reads SOD but no `HashVerifier` class exists there. |
| EF.COM read (available DG list) | N/A | N/A | N/A | N/A | `PassportNfcReader.kt:179-181` (client-apps/UniversalNfcReader) | N/A | `PassportNfcReader.kt:521-579` | ✅ | TurkishEidReader does NOT parse EF.COM. |
| DG11 read (Additional Personal Data) | N/A | N/A | N/A | N/A | `PassportNfcReader.kt:241-248` — conditional on EF.COM presence | N/A | `PassportNfcReader.kt:618-690` | 🟡 | Passport only. TurkishEidReader: not read. DG11 personal_number (TC number) masked in logs (`SecureLogger.maskDocumentNumber`). |
| DG12 read (Document Details) | N/A | N/A | N/A | N/A | `PassportNfcReader.kt:250-257` — conditional | N/A | `PassportNfcReader.kt:702-770` | 🟡 | Passport only. Not read for Turkish eID. |
| PACE support | N/A | N/A | N/A | N/A | Not implemented — `PassportData.paceSuccessful` hardcoded `false` (`PassportNfcReader.kt:273`) | N/A | Not implemented | ❌ | `UniversalCardDetector.kt:150,178` mentions PACE-GM in comments but no PACE handshake code exists. |
| Active Authentication (DG15) | N/A | N/A | N/A | N/A | Detected via EF.COM (`PassportNfcReader.kt:277`) but not executed | N/A | Detected, not executed | ❌ | Flag `activeAuthenticationSupported` is surfaced to UI but the AA protocol is not implemented. |
| Chip Authentication (DG14) | N/A | N/A | N/A | N/A | Detected via EF.COM but not executed | N/A | Detected, not executed | ❌ | Same as AA. |
| CSCA certificate validation | N/A | N/A | N/A | N/A | `CscaCertificateStore.kt` (client-apps/androidApp) | N/A | `CscaCertificateStore.kt` (UniversalNfcReader) — stub, no actual CSCA bundle bundled | ❔ | Both repos have the `CscaCertificateStore` class; need to verify if actual CSCA cert bundle is included in APK assets. |

---

## 3. MRZ Parsing (TD1 / TD3)

| Operation/Stage | DB | Backend (file:func → endpoint) | Processor (file:func) | Web | Mobile | Desktop | practice-and-test reader | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|---|
| MRZ parse via biometric-processor | `verification_documents.mrz_data` (V26__verification_pipeline.sql:103) | `NfcController.java:234→POST /api/v1/nfc/verify-mrz`; calls `BiometricProcessorClient.verifyMrz()` | `nfc.py:212→POST /nfc/mrz` — `detect_and_parse_mrz()` with ICAO 9303 check digits | N/A (no web UI for this endpoint) | N/A | N/A | `MrzParser.kt` (UniversalNfcReader — client-side, TD1+TD3) | ✅ | Supports both `mrz_text` and `dg1_bytes_b64` (TLV strip). Check-digit validation returns `checksum_failures` list. Full document_number masked in response (NfcController.java:367). |
| TD3 parse (2×44 chars, passport) | N/A | via above | `mrz_parser.py:108-192` (parse_td3) | N/A | `MrzParser.kt` (client-apps + UniversalNfcReader) | N/A | `MrzParser.kt` | ✅ | ICAO 9303 Part 4. |
| TD1 parse (3×30 chars, ID card) | N/A | via above | `mrz_parser.py:195-276` (parse_td1) | N/A | `MrzParser.kt` | N/A | `MrzScanner.kt` (ML Kit camera flow) | ✅ | TD1 composite checksum covers `line1[5:30]+line2[0:7]+line2[8:15]+line2[18:29]` (mrz_parser.py:262). |
| MRZ scan via camera (ML Kit) | N/A | N/A | N/A | N/A | `MrzScanner.kt` + `MrzScannerScreen.kt` (client-apps); primary MRZ capture path for BAC key material | N/A | `MrzScanner.kt` (TurkishEidNfcReader); `MrzScanner.kt` (UniversalNfcReader) | ✅ | Uses Google ML Kit Text Recognition. Camera path is the primary UX; manual dialog is fallback. |
| Manual MRZ entry dialog | N/A | N/A | N/A | N/A | `MrzInputDialog.kt` (client-apps) | N/A | N/A | ✅ | |
| Audit log for MRZ verify | `audit_logs` | `NfcController.java:296-313` → `AuditLogPort.logNfcDocumentVerified(...)` | N/A | N/A | N/A | N/A | N/A | ✅ | Logs maskedDocNumber, issuingCountry, mrzFormat, checksumValid. Never blocks auth path. |

---

## 4. TCK (Turkish eID / TC Kimlik Kartı) — Full NFC Chip Read

| Operation/Stage | DB | Backend (file:func → endpoint) | Processor (file:func) | Web | Mobile | Desktop | practice-and-test reader | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|---|
| Card type detection (MRTD AID) | N/A | N/A | N/A | N/A | `UniversalCardDetector.kt:34-92` (client-apps) — MRTD AID selection + historical-byte heuristic | N/A | `UniversalCardDetector.kt` (UniversalNfcReader) | 🟡 | Turkish eID vs passport is detected via historical bytes (TCKK/TUR/TC string check) or EF.CardAccess PACE OID heuristic — fragile; can misclassify card as passport if history bytes don't match. |
| BAC read (DG1+DG2) | N/A | N/A | N/A | N/A | `TurkishEidReader.kt:170-175` (client-apps) — reads DG1+DG2 | N/A | `TurkishEidNfcReader/NfcCardReader.kt` (standalone) | ✅ | |
| TCKN (TC national ID) extraction | N/A | N/A | N/A | N/A | `Dg1Parser.kt` — `tckn` field (client-apps) | N/A | `TurkishEidNfcReader/Dg1Parser.kt` | ✅ | |
| Upload chip photo for face match | N/A | ❌ No endpoint to accept DG2 photo from mobile chip read | N/A | N/A | `NfcStepViewModel.kt:226-228` — `dg2_photo_b64` added to payload but `NfcDocumentAuthHandler.java` ignores it | N/A | N/A | 🐞 | **Bug**: ViewModel attaches `dg2_photo_b64` at NfcStepViewModel.kt:226-228; handler only checks `nfcData` (serial); chip photo is silently dropped. No server-side face-vs-chip comparison path exists. |
| Store TCK enrollment | `nfc_cards.card_serial` stores UID | `ManageNfcCardService.java:56` | N/A | `NfcEnrollmentPage.tsx` | `NfcStepScreen.kt` submits UID as `nfcData` | N/A | N/A | 🟡 | Card stored by serial/UID only — no chip-level identity data (TCKN, name, photo) is persisted to `verification_documents`. |

---

## 5. Passport (ICAO 9303 / eMRTD) — Full NFC Chip Read

| Operation/Stage | DB | Backend (file:func → endpoint) | Processor (file:func) | Web | Mobile | Desktop | practice-and-test reader | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|---|
| AID selection | N/A | N/A | N/A | N/A | `PassportNfcReader.kt:337-367` (client-apps) | N/A | `PassportNfcReader.kt:337-367` (UniversalNfcReader) | ✅ | Uses standard ICAO MRTD AID `A0000002471001`. |
| BAC authentication | N/A | N/A | N/A | N/A | `PassportNfcReader.kt:167` | N/A | `PassportNfcReader.kt:167` | ✅ | |
| DG1 (MRZ), DG2 (photo), SOD, DG11, DG12 | N/A | N/A | N/A | N/A | `PassportNfcReader.kt:185-257` | N/A | `PassportNfcReader.kt` | ✅ | DG11/DG12 conditional on EF.COM. |
| MrzParser (TD3) fallback to Dg1Parser (TD1) | N/A | N/A | N/A | N/A | `PassportNfcReader.kt:196-213` | N/A | `PassportNfcReader.kt:196-213` | ✅ | |
| DG1/DG2 hash verification vs SOD | N/A | N/A | N/A | N/A | `PassportNfcReader.kt:216-237` via `HashVerifier.kt` | N/A | `PassportNfcReader.kt:216-237` | ✅ | In UniversalNfcReader + client-apps. TurkishEidNfcReader does NOT do this. |
| Enroll passport as NFC auth factor | `nfc_cards.card_serial` | `NfcController.java:46` | N/A | `NfcEnrollmentPage.tsx` | `NfcStepViewModel.kt:215` | N/A | N/A | 🟡 | Enroll stores UID only; chip-level passport identity (surname, given names, nationality, DOB) not persisted anywhere. |
| Submit passport as MFA step | N/A | `NfcDocumentAuthHandler.java:29` | N/A | `NfcStep.tsx:85-95` | `NfcStepViewModel.kt:213` | N/A | N/A | 🟡 | Handler only checks `nfcData` (UID) against `nfc_cards`. Full BAC evidence (doc_number, dob, expiry, sod_valid, dg1/dg2 hashes) sent by mobile VM but **silently ignored** by handler. |

---

## 6. Document Scan Pipeline (biometric-processor)

| Operation/Stage | DB | Backend (file:func → endpoint) | Processor (file:func) | Web | Mobile | Desktop | practice-and-test reader | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|---|
| Card type detection (YOLO) | `verification_step_results` (V26:68) | `ManageVerificationService.java` routes `DOCUMENT_SCAN` step | `verification_pipeline.py:232→POST /verification/document-scan`; `card_type_router.py:19→POST /card-type/detect-live` | `CardDetectionPage.tsx` + `useCardDetection.ts` (client-side `CardDetector.ts` ONNX) | N/A | N/A | N/A | ✅ | YOLO model. 5 classes: `tc_kimlik, ehliyet, pasaport, ogrenci_karti, akademisyen_karti`. |
| Data extraction — MRZ (OCR/parse) | `verification_documents` | `ManageVerificationService.java` routes `DATA_EXTRACT` step | `verification_pipeline.py:291→POST /verification/data-extract`; supports `mrz_text` (direct), image upload, or base64 | Not wired in web-app dashboard | N/A | N/A | N/A | 🟡 | Data-extract calls `detect_and_parse_mrz` for MRZ docs; Tesseract OCR for TC Kimlik. Backend wired but no web-app page consumes it directly. |
| Data extraction — TC Kimlik (Tesseract OCR) | `verification_documents` | as above | `document_ocr.py:111→extract_tc_kimlik()`; regex patterns for SOYADI, ADI, TC number, DOB, expiry, gender, nationality | N/A | N/A | N/A | N/A | 🟡 | Tesseract `tur+eng`. Confidence scored by fields found / 7. `ehliyet`, `pasaport`, `ogrenci_karti`, `akademisyen_karti` fall back to `card_type_only` (no OCR, no MRZ). |
| Face match (doc photo vs selfie) | `verification_step_results` | `ManageVerificationService.java` routes `FACE_MATCH` step | `verification_pipeline.py:457→POST /verification/face-match`; DeepFace embeddings + cosine | Not wired in web-app | N/A | N/A | N/A | 🟡 | Backend fully implemented. No web-app page calls this standalone endpoint. `/pipeline/test` exercises it in chain. |
| Liveness check (pipeline step) | `verification_step_results` | `ManageVerificationService.java` routes `LIVENESS_CHECK` step | `verification_pipeline.py:525→POST /verification/liveness-check`; EnhancedLivenessDetector + DeepFace anti-spoof | Not wired in web-app separately | N/A | N/A | N/A | 🟡 | Same note as face-match. |
| Full pipeline test | N/A | Not a production step handler | `verification_pipeline.py:576→POST /verification/pipeline/test`; runs doc-scan→data-extract→face-match→liveness-check in series | Not wired | N/A | N/A | N/A | ✅ | Integration test endpoint only. Temp file cleanup in try/finally (ML-M3 fix, pipeline.py:780-801). |
| Video interview upload | `verification_step_results` | `ManageVerificationService.java` routes `VIDEO_INTERVIEW` step | `verification_pipeline.py:833→POST /verification/video-interview`; stores webm/mp4 ≤50MB; no AI analysis | Not wired | N/A | N/A | N/A | 🟡 | Manual admin review only. Duration estimated from file size (rough heuristic, line:887). |
| NFC_CHIP_READ verification step | `verification_step_results` | `NfcChipReadHandler.java:26→` dispatched by `ManageVerificationService` | N/A | N/A | N/A | N/A | N/A | 🟡 | Handler accepts `mrz_data`, `document_number`, `holder_name`, `date_of_birth` from client. Basic MRZ format check only (length ≥30 + contains `<`). **No actual chip-level crypto validation** — trusts client-supplied values. |
| Watchlist check | Not implemented | `WatchlistCheckHandler.java` — profile-gated `@Profile("!dev")` | N/A | N/A | N/A | N/A | N/A | ❌ | No sanctions/PEP list integration. Handler stubs only. |
| Address proof | `@Profile("dev")` only | `AddressProofHandler.java` dev-only | N/A | N/A | N/A | N/A | N/A | ❌ | Production profile not wired. |

---

## 7. NFC Push Approval Protocol

| Operation/Stage | DB | Backend (file:func → endpoint) | Processor (file:func) | Web | Mobile | Desktop | practice-and-test reader | Status | Notes/gaps |
|---|---|---|---|---|---|---|---|---|---|
| Submit allow/deny decision | Not found in identity-core-api | **`POST /api/v1/auth/approval/{sessionId}/decide`** — interface in `NfcApprovalApi.kt` (client-apps shared), **NO matching controller found in identity-core-api** | N/A | N/A | `NfcApprovalViewModel.kt:30-90`; `NfcApprovalRepositoryImpl.kt:19` | N/A | N/A | 🐞 | **Gap**: client-apps KMP has full `NfcApprovalViewModel` + API contract wired to `POST /api/v1/auth/approval/{sessionId}/decide` but identity-core-api has no matching controller endpoint. The `decide` API call will 404 at runtime. |

---

## Cross-cutting findings

### Gaps / Issues / Inconsistencies

1. **`NfcController.java:118` — no admin RBAC on `/nfc/search/{serial}`**: `@PreAuthorize("isAuthenticated()")` allows any authenticated user to search NFC ownership by serial. Web-app restricts to admin in UI but server-side check is absent.

2. **`NfcDocumentAuthHandler.java:29` + `NfcStepViewModel.kt:201,213-230` — BAC evidence silently dropped**: Mobile sends `doc_number`, `dob`, `expiry`, `bac_successful`, `sod_valid`, `dg1_hash_valid`, `dg2_hash_valid`, `dg2_photo_b64` in the MFA payload but the handler only reads `nfcData` (UID). The chip cryptographic evidence is never validated server-side — the step reduces to an enrolled-serial lookup identical to a bare NFC tag.

3. **`NfcChipReadHandler.java:39-40` — trivial MRZ format validation only**: The `NFC_CHIP_READ` verification step checks `mrzData.length() < 30 || !mrzData.contains("<")` — a basic sanity check, not a real checksum or chip-session validation. Client-supplied values trusted unconditionally.

4. **NFC Push Approval — 404 at runtime** (see table 7): `NfcApprovalApi.kt` in client-apps calls `POST /api/v1/auth/approval/{sessionId}/decide`; no such endpoint in `identity-core-api`. Server-side controller must be created.

5. **`TurkishEidNfcReader/NfcCardReader.kt:403-426` — SOD signature discarded**: `validateSod()` runs but its result is not propagated back to `NfcResult`; `CardData.isAuthenticated` is unconditionally `true` (line 157) regardless of SOD outcome.

6. **`TurkishEidNfcReader` missing DG hash verification**: No `HashVerifier` class. SOD is read but per-DG integrity check skipped. `UniversalNfcReader` has `HashVerifier` + full chain.

7. **PACE not implemented**: Both readers detect PACE-capable cards (DG14/15 in EF.COM, PACE-GM in EF.CardAccess comment `UniversalCardDetector.kt:150`) but no PACE handshake exists. Modern passports may mandate PACE over BAC.

8. **Active Authentication / Chip Authentication — detected only**: `activeAuthenticationSupported`/`chipAuthenticationSupported` flags surface to UI but the cryptographic protocols are not executed.

9. **Chip photo (DG2) never stored or compared server-side**: `NfcStepViewModel.kt:226-228` attaches `dg2_photo_b64`; `NfcDocumentAuthHandler.java` and `ManageNfcCardService.java` both ignore it. Chip photo vs live face match requires a new endpoint.

10. **Driver's license (`ehliyet`), student card (`ogrenci_karti`), academic card (`akademisyen_karti`) — card-type-only**: YOLO classifies these but data extraction falls through to `card_type_only` with no OCR or MRZ path (`verification_pipeline.py:392-398`). Only `tc_kimlik` gets Tesseract OCR and only `pasaport` gets MRZ parsing.

11. **`NfcEnrollmentPage.tsx` — no enrolled card list**: `NfcCardsList.tsx` component exists but is not rendered on the enrollment page; GET `/nfc/user/{userId}` is never called from the web-app.

12. **practice-and-test vs client-apps code relationship**: The NFC reading stack in `client-apps/androidApp/` (readers, EID helpers, SOD validators, BacAuthentication) is a **direct copy** of `practice-and-test/UniversalNfcReader/` — same package structure, same class names, same logic, different package prefix (`com.fivucsas.mobile.android` vs `com.rollingcatsoftware.universalnfcreader`). **They are NOT linked by dependency** — it is copy-paste code. `TurkishEidNfcReader` is an older, standalone proof-of-concept used only as a test/research app; it is not integrated into client-apps.

13. **Desktop NFC**: `NoOpNfcService` (shared/src/commonMain/kotlin/com/fivucsas/shared/platform/NoOpNfcService.kt) — all methods return "NFC not available". Desktop has zero NFC capability by design.

14. **Web NFC (NDEFReader)**: Chrome on Android only (top-level context). iframe-framed widget explicitly opens hosted-login in new tab (`NfcStep.tsx:123-171`). `NfcEnrollmentPage.tsx` shows QR code fallback for non-Chrome or desktop.

15. **Video interview duration estimate** (`verification_pipeline.py:887`): Uses raw file-size / bytes-per-second ratio (100–150 KB/s). This is inaccurate for variable-bitrate recordings and could be off by 10x.
