# FIVUCSAS — Poster Content Brief

> Evidence-based extraction from the FIVUCSAS repository + submodules, dated 2026-05-19.
> Every concrete claim is pinned to `path/to/file:line`. Items not present in the repo are marked `[NOT FOUND IN REPO]`. The downstream poster session must NOT invent numbers — `[NOT FOUND IN REPO]` is a valid value.
>
> Repo root: `/opt/projects/fivucsas/` · Submodules: `biometric-processor`, `client-apps`, `docs`, `identity-core-api`, `practice-and-test`, `spoof-detector`, `web-app`.

---

## 1. Elevator Pitch & Problem Framing

### Short
**FIVUCSAS** — *Face & Identity Verification using Cloud-based SaaS Models* — özel sektörün e-Devlet'idir: her uygulamaya ayrı kayıt olmak yok. FIVUCSAS destekli her site/uygulamaya tek butonla, 10 farklı doğrulama yöntemiyle giriş. Uygulama sahibiysen login & register sayfaları yazmadan, OAuth2/OIDC + PKCE üzerinden tek hosted-login butonu ile kullanıcılarını doğrularsın.

### Long
**End-user pitch:** Aktif (Biometric Puzzle) + pasif (UniFace MiniFASNet, 19 analyzer) hibrit canlılık + Facenet-512 yüz eşleme + ICAO 9303 NFC kimlik okuma + 10 birleştirilebilir MFA faktörü, tek bir hosted-login akışında. KVKK/GDPR uyumlu, embedding'ler Fernet AES-128 ile şifreli (`biometric-processor/app/infrastructure/security/embedding_cipher.py:39`).

**Integrator pitch:** Müşteri uygulamaları sadece OIDC discovery (`/.well-known/openid-configuration` — `identity-core-api/.../OpenIDConfigController.java:44-80`) + authorization endpoint (`/api/v1/oauth2/authorize` — `identity-core-api/.../OAuth2Controller.java:77-182`) + JWKS (`/.well-known/jwks.json` — `OpenIDConfigController.java:91-100`) konfigüre eder. PKCE S256 zorunlu (`OAuth2Controller.java:328-341`), RS256 JWT default 2026-04-20'den beri (`identity-core-api/.../security/JwtService.java:27-30, 56-68`). SDK snippet'i: `web-app/src/verify-app/sdk/FivucsasAuth.ts`.

**Multi-tenant kontrat:** Tenant entity `identity-core-api/.../entity/Tenant.java:35-100` (id/slug/status/max_users/biometric_enabled). RLS (Row-Level Security) 9 tabloda V25 ile aktif (`identity-core-api/src/main/resources/db/migration/V25__add_row_level_security.sql`). Canlı tenant: **Marmara Üniversitesi** (`V15__seed_realistic_sample_data.sql`, id `11111111-1111-1111-1111-111111111111`, demo `https://demo.fivucsas.com`).

---

## 2. E-Devlet Comparison

### Short
e-Devlet kamu hizmetlerinin ortak giriş kapısıdır; FIVUCSAS özel sektörün karşılığıdır. Tek bir `<FIVUCSAS ile Giriş Yap>` butonu, OAuth2/OIDC + PKCE üzerinden, KVKK + GDPR + ISO/IEC 30107-3 Level 1 hazırlığı ile, biyometrik (yüz + ses + parmak izi/WebAuthn) ve dokümanlı (NFC ICAO 9303) doğrulamayı çağrı başına saniye altında getirir.

### Long
| Aspect | e-Devlet | FIVUCSAS |
|---|---|---|
| Kapsam | Kamu sektörü | Her web/mobil uygulama |
| Auth modeli | Devlet SSO | OAuth2 + OIDC + PKCE (RFC 7636) Identity Provider |
| Erişim | Devlet onayı | Açık OIDC discovery + drop-in buton |
| Biyometrik | — (şifre + SMS) | Active Puzzle (7 yüz + 9 jest aksiyonu) + Passive PAD (19 analyzer) + Facenet-512 |
| NFC doküman | — | T.C. kimlik + pasaport (ICAO 9303, BAC implementlü) |
| MFA faktörleri | 2 (şifre + SMS) | 10 birleştirilebilir faktör |
| Proctoring | — | Sürekli (WebSocket, 15.9 fps Python ref, 25-30 fps tarayıcı) |
| Multi-tenant | — | Postgres RLS, V25, 9 tabloda |
| Yasal | KVKK | KVKK + GDPR + ISO/IEC 30107-3 Level 1 (iBeta submission package v0.2.1) |
| Açık kaynak | — | MIT (spoof-detector) |
| Kaynak | gov | `identity-core-api`, `biometric-processor`, `spoof-detector` (submodule) |

**e-Devlet button referansı:** `turkiye.gov.tr/edevlet-ile-giris` lockup'ı — kırmızı arka plan, beyaz "T.C." amblem + "e-Devlet ile Giriş Yap" lockup'ı. FIVUCSAS karşılığı için poster üzerinde önerilen mockup: navy arka plan (#0B2545), camgöbeği (#2BA8B3) lockup, monospace `<FIVUCSAS />` markası — örnek HTML:
```html
<a class="fivucsas-btn" href="https://verify.fivucsas.com/oauth2/authorize?
   client_id=YOUR_CLIENT_ID&response_type=code&scope=openid+profile+email
   &redirect_uri=https://yourapp.com/cb&code_challenge=...&code_challenge_method=S256">
  <FIVUCSAS/> ile Giriş Yap
</a>
```

**Üç use-case:**
1. **Banka-grade KYC** (fintech mobil): yüz + NFC kimlik + canlılık → tek session
2. **Sınav proctoring** (online üniversite): demo.fivucsas.com canlı (Marmara BYS)
3. **KVKK onboarding** (yerel SaaS): tüm embedding'ler Türkiye'de barındırılan Hetzner CX43'te, Fernet AES-128 şifreli

---

## 3. Face Pipeline — Full Technical Walk

### Short
9 aşamalı pipeline: YOLO kart tespiti → DeepFace yüz detect (opencv backend, anti-spoof 0.5) → kalite (Laplacian blur ≥ 100, min yüz 80px, occlusion CIE-Lab ΔE) → MediaPipe FaceLandmarker 468 nokta (Tasks API) → DeepFace align → **Facenet-512** embedding → Fernet AES-128 + HMAC-SHA256 şifreleme → pgvector index (biometric-processor HNSW m=16/ef=64, identity-core IVFFlat lists=100) → cosine match (θ=0.45 default, 0.38 aged >2yr).

### Long

**01. Detection.** DeepFace 0.0.98, detector_backend konfigüre edilebilir (default `opencv`, alternatifler: ssd, mtcnn, retinaface, mediapipe, yolov8, yolov11n/s, yolov12n, centerface) — `biometric-processor/app/core/config.py:91-94`. Anti-spoofing DeepFace içi etkin, threshold 0.5 — `config.py:126-136`. Loader: `biometric-processor/app/infrastructure/ml/detectors/deepface_detector.py:1-50`. **Card detection (web tarafı, doküman çekiminde):** YOLO model, confidence floor 0.35, UI gate 0.7 — `web-app/src/lib/biometric-engine/core/constants.ts:206, 220`.

**02. Quality gating.** Laplacian variance ≥ **100.0** (`config.py:292`), min yüz 80 px (`config.py:291`), quality skoru ≥ **70.0** (`config.py:158`), brightness normalize 30-90 (`analyze_quality.py:33-34`). Occlusion detektör (270 LOC, eye=0.6/mouth=0.4 ağırlık, CIE-Lab ΔE) — `biometric-processor/app/application/services/occlusion_detector.py`.

**03. Landmarking.** MediaPipe **FaceLandmarker (Tasks API)** — 468-nokta canonical topology + 478 ile iris (eye/mouth/nose/eyebrow/face_oval region tanımları). `biometric-processor/app/infrastructure/ml/landmarks/mediapipe_landmarks.py:26-45`. Legacy `face_mesh` API kullanılmıyor.

**04. Alignment.** DeepFace `align=True` flag'i — `deepface_detector.py:28, 43`. Çıktı kırpma DeepFace iç boyutlandırması.

**05. Embedding.** **Facenet-512**, default production model (`CLAUDE.md` "Facenet512 server-authoritative"). 512-D L2-normalize embedding — `biometric-processor/app/infrastructure/ml/extractors/deepface_extractor.py:72-75, 132`. **Encryption at rest:** Fernet (AES-128-CBC + HMAC-SHA256), Alembic 20260502_0005 — `biometric-processor/app/infrastructure/security/embedding_cipher.py:39` + `alembic/versions/20260502_0005_embedding_ciphertext.py:1-15`.

**06. Storage / Indexing.** **biometric-processor** (Python servis): HNSW (`m=16`, `ef_construction=64`) — `biometric-processor/scripts/add_hnsw_indexes.sql:19-22` + `alembic/versions/20251212_0001_initial_schema.py:115-120`. **identity-core-api** (Spring servis): IVFFlat (`lists=100`) — `identity-core-api/.../db/migration/V4__create_biometric_tables.sql:8` + V33. Tenant izolasyonu: `tenant_id` kolonu + unique (user_id, tenant_id, biometric_type) WHERE deleted_at IS NULL — Alembic 20251212_0001:96-100. RLS 9 tabloda V25 ile etkin.

**07. Matching.** Cosine distance (1 − cosine similarity) — `biometric-processor/app/infrastructure/ml/similarity/cosine_similarity.py`. **1:1 verification threshold:** 0.45 default (`config.py:156`), aged-embedding (>2yr) için 0.38 (`config.py:171-180`). 1:N top-k pgvector ANN üzerinden.

**08. Operating point.** EER / FAR / FRR — `[NOT FOUND IN REPO]`. Hiçbir test fixture veya benchmark dosyasında ölçülmemiş. **Load-test hedefleri (gerçek ölçüm değil):** Login p95 < 300ms, Verification p95 < 500ms — `load-tests/README.md:137-180`.

---

## 4. NFC Subsystem

### Short
TurkishEidNfcReader (Android native, IsoDep + Bouncy Castle) T.C. kimlik + pasaport için ICAO 9303 spec'te. **BAC** uygulandı (PACE/AA/CA HENÜZ DEĞİL). DG1 (MRZ) + DG2 (yüz JPEG2000) parser var, EF.COM + EF.SOD %60 doğrulanmış. MRZ OCR fallback: Google ML Kit + CameraX. DG2 fotoğrafı → Facenet-512 → cosine vs canlı selfie.

### Long
- **Chip location:** T.C. kimlik arka yüzdedir; pasaportlarda kapakta. ICAO ortak AID `A0 00 00 02 47 10 01` — `practice-and-test/PASSPORT_NFC_ROADMAP.md:147`.
- **ICAO 9303 spec atıfları:** `PASSPORT_NFC_ROADMAP.md:8`, `biometric-processor/app/domain/services/mrz_parser.py:8`, `identity-core-api/.../controller/NfcController.java:237-238`.
- **Protocols:** BAC implementlü (SHA-1 anahtar türetme MRZ'den, TD3 pasaport için aynı) — `PASSPORT_NFC_ROADMAP.md:670-690`. **PACE** opsiyonel, yeni pasaportlar için (`PASSPORT_NFC_ROADMAP.md:164-170`). **Active Authentication / Chip Authentication:** `[NOT FOUND IN REPO]`.
- **Data Groups:** DG1 — `practice-and-test/TurkishEidNfcReader/app/.../util/Dg1Parser.kt:1-9`; DG2 — `Dg2Parser.kt:1-50` (JPEG2000/JP2). EF.COM, EF.SOD — `PASSPORT_NFC_ROADMAP.md:158-161, 383-395` (SOD %60 tamam, CSCA tam zincir eksik). DG3/4/11/14/15 — implement edilmedi (roadmap §5.1).
- **Plugin:** Android native NFC (android.nfc), IsoDep — `practice-and-test/TurkishEidNfcReader/app/build.gradle:91-92`. Bouncy Castle (crypto) — `build.gradle:94-96`. **iOS CoreNFC:** `[NOT FOUND IN REPO]` (client-apps KMP'de expect/actual mümkün, kanıt yok).
- **MRZ OCR fallback:** Google ML Kit Text Recognition 16.0.0 + CameraX 1.3.4 — `build.gradle:78, 70-75`. ICAO check digit validation: `biometric-processor/tests/unit/test_nfc_mrz_route.py:47-88`.
- **Cross-check pipeline:** DG2 yüz JPEG2000 → Facenet-512 → cosine — `biometric-processor/app/api/routes/verification_pipeline.py`. Threshold yapılandırılabilir (`config.py:156`, default 0.45, aged 0.38).
- **Performance:** Chip okuma süresi `[NOT FOUND IN REPO]`. Timeout 30s — `PASSPORT_NFC_ROADMAP.md:31`. Failure modes (timeout, corrupted, invalid checksum, SOD fail) test edilmiş — `test_nfc_mrz_route.py:95-100`.

---

## 5. Spoof Detector — Deep Dive

### Short
**spoof-detector** submodule (MIT, github.com/Rollingcat-Software/spoof-detector, v0.2.1, ~50+ commits). **19 analyzer**, **15-axis liveness prover**, **session-level peak-sensitive verdict** (α=0.5). Backbone: MiniFASNet ONNX (UniFace, 80×80, 1.7 MB, frozen weights, weight 5.0×). **Paper draft** (BIOSIG 2026 / IJCB 2026 / IEEE FG 2027 hedef): "Beyond Single Frames: Session-Based Hybrid Image-and-Video Face Anti-Spoofing with Calibrated Multi-Class Fusion". **Browser port** canlı: `https://amispoof.fivucsas.com/` (123 kB ESM + 34 kB gzip, ONNX-Web + MediaPipe Tasks Vision, WebGPU/WASM). **iBeta PAD Level 1 submission package** commit `cc73cf08`.

### Long

**Identity.**
- Remote: `git@github.com:Rollingcat-Software/spoof-detector.git` — `spoof-detector/README.md:10`.
- License: MIT — `LICENSE:1`.
- Origin: FIVUCSAS biometric-processor R&D'den standalone extract — `README.md:10`.
- Authors: Ahmet Abdullah Gültekin (lead, mimari, kalibrasyon, session engine), Ayşe Gülsüm Eren (gesture/liveness araştırması), Ayşenur Arıcı (anti-spoof pipeline, gates, fusion, device-spoof) — `AUTHORS.md:14-16, 21`, `README.md:44, 252`.
- Affiliation: Marmara Üniversitesi, Bilgisayar Mühendisliği — `README.md:253`.
- npm: `@rollingcat/spoof-detector v0.2.1` — `pyproject.toml:6`, `ROADMAP.md:12`.
- Public demo: **https://amispoof.fivucsas.com/** — `SPOOF_DETECTOR_BROWSER_READINESS.md:3`.

**Paper status.** Manuscript skeleton tamam, benchmark sonuçları doldu. 10 bölüm: abstract/intro/related-work/taxonomy/method/calibration/experimental-setup/results/ablations/discussion/conclusion — `paper/sections/*.md`, `paper/README.md:8-23, 34-57`.

**Architecture.**
- **Backbone:** MiniFASNet ONNX (UniFace v2), frozen weights, 1.7 MB, +94.7 discrimination gap, weight **5.0×** — `README.md:94`, `paper/ARCHITECTURE.md:75-76`, `config.yaml:23-24`.
- **Input:** 80×80 padded face crop — `paper/sections/04_method.md:11`.
- **Output:** Per-frame P(REAL) ∈ [0, 100] → 7-category fuser → session-level P(REAL) via peak-sensitive aggregator.
- **Loss:** Yok (eğitim yok, sadece kalibrasyon). 13 lineer katsayı `MultiClassFuser`'da kalibre ediliyor — `paper/sections/05_calibration.md:66`, `config.yaml:54-76`.
- **Analyzer stack (19 total, 12 Python + 12 TS shared):**

| Layer | Analyzers | Weight |
|---|---|---|
| Image-level | MiniFASNet, Device Boundary, AR-Filter, Texture, Moire | 5.0 + 2.5 + 0.3 + 0.1 + 0.1 |
| Temporal (FFT) | Blink/EAR, rPPG, Screen-Replay, Micro-Tremor, Landmark Variance, Temporal, Background Grid, Screen Flicker | 0.5 + 0.0 + 0.5 + 2.5 + 2.0 + 0.3 + 1.5 + 3.0 |
| MediaPipe blendshapes (browser) | Eyebrow motion, Blink symmetry, Gaze, Expression dynamics, 3D Pose, Behavioural | — |
| Optional (browser) | Hand tracking, Voice-activity, Audio-mouth sync | — |

(`README.md:137-160`, `paper/ARCHITECTURE.md:85-98`, `ROADMAP.md:20-26`)

- **Session engine:** "Guilty until proven innocent" LivenessProver (185-puan tavan, 15 axis) + peak-sensitive session verdict — `P_session(REAL) = α · mean(p_t) + (1−α) · mean(p_t | t ∈ worst-decile), α = 0.5` — `paper/sections/04_method.md:91`. Spoof-burst dilution'a karşı dayanıklı; formel kanıt §4'te (`paper/sections/04_method.md:62-114`).
- **Browser deployment:** TypeScript port (`web/`), npm `@rollingcat/spoof-detector`, `onnxruntime-web` (WASM + WebGPU fallback), `@mediapipe/tasks-vision` — `SPOOF_DETECTOR_BROWSER_READINESS.md:3-17`.

**Training data.**
- **Calibration set (gerçek):** 43 KVKK onaylı Marmara 2026-04 capture (27 bona-fide / 16 attack) — `paper/sections/05_calibration.md:5-9`.
- **Validation set:** 325 sample (25 bona-fide × 300 synthetic attack, 4 sınıf × 3 varyant) — `paper/sections/07_results.md:73-82`.
- **Zero-shot public:** CASIA-FASD (HF akahana, 2,408 sample), CelebA-Spoof (HF nguyenghoa shard 0, 2,611 sample), in-house replay (100 sample) — `paper/sections/07_results.md:8-71`.
- MiniFASNet pre-training: UniFace corpus, external ONNX weights (kendi eğitim verisi yok).
- In-house labels: `spoof-detector/data/in_house/labels.csv` (43 satır).

**Metrics (paperdan).**

| Metric | Dataset | Pipeline | Value | 95% CI | Source |
|---|---|---|---|---|---|
| AUC | CASIA-FASD (N=2408) | minifasnet_only | **0.9452** | [0.9366, 0.9560] | `paper/sections/07_results.md:15` |
| ACER | CASIA-FASD | minifasnet_only | **12.67%** | [11.07, 13.92] | `07_results.md:15` |
| AUC | CelebA-Spoof (N=2611) | minifasnet_only | **0.7818** | [0.7663, 0.7993] | `07_results.md:36` |
| ACER | CelebA-Spoof | minifasnet_only | **28.67%** | [27.36, 30.23] | `07_results.md:36` |
| AUC | In-house replay (N=100) | image_only | **0.9264** | [0.8685, 0.9744] | `07_results.md:68` |
| Per-frame latency (CPU, CX43) | hybrid | — | **63.0 ms** mean (p99 117.8 ms) | — | `07_results.md:110` |
| Sustained FPS | hybrid | — | **15.9 fps** | — | `07_results.md:110-112` |
| MiniFASNet discrimination gap | in-house | minifasnet | **+94.7** | — | `05_calibration.md:25` |
| ISO 30107-3 Grade | in-house scripted | session | **Grade C** (BPCER 0%, APCER 30%, ACER 15%) | — | `README.md:74-84` |

Bootstrap CI'lar 100 stratified resample üzerinden hesaplandı — `07_results.md:11, 32`.

**Honest competitive positioning.**
- Paper akademik literatür ile pozisyonlanıyor (commercial PAD competitor head-to-head **YOK**). Modern intra-dataset SOTA (CDCN, FAS-SGTD) AUC >0.99 with **retraining**; FIVUCSAS 0.9452 **zero-shot** — "competitive with mid-tier published methods" (`07_results.md:24`).
- Strengths: **session-level verdict** (proctoring native, spoof-burst dilution'a dayanıklı), **client-side browser deployment** (KVKK/GDPR locality, frame upload yok), **anti-correlated signal discovery** (texture/moire — paper §5), **reproducible no-training calibration** (sadece 13 float), **MIT open-source + iBeta PAD-1 submission package**.
- Cost / multi-tenant / on-prem / KVKK-locality ekseninde FaceTec ZoOm, iProov GPA, Onfido Atlas, Jumio, AWS Rekognition Liveness, MS Face API'ye karşı **plausible**. Model maturity / dataset scale ekseninde **geride** (frozen 3rd-party backbone, 43-örnek kalibrasyon seti).

**Proctoring contribution.**
- Per-frame detection fail eder: attacker 30s spoof tutar, 1 frame gerçek yüz, devam. Gap 1 paperin temel motivasyonu (`paper/sections/01_introduction.md:7`).
- **Peak-sensitive aggregator** — formel kanıt: 60-frame session, 54 spoof @ 0.20 + 6 real @ 0.95 → verdict SPOOF; all-live + 1 dip → verdict LIVE (`04_method.md:62-114`).
- LivenessProver 15-axis (blink, motion, rotation, expression, temporal, gaze, pose consistency, behaviour, optional hand, optional audio), 185-puan tavan, doğal decay (`README.md:159`).
- Incident detection: P(REAL) < 0.4 for ≥3s, no blink ≥15s, face missing ≥5s, identity-change suspicion (MiniFASNet swing ≥0.35 in 1s) — `paper/ARCHITECTURE.md:134`.
- Background-grid analyzer: 8×6 cell motion variance, proctoring-specific (`config.yaml:39`, `04_method.md:31`).

**iBeta PAD Level 1.** Submission package commit `cc73cf08e0df1f811c08cc92549fae48d6c4a05a`, 2026-05-11, scope ISO/IEC 30107-3 PAD Level 1 (`iBeta_PAD_Level1_Submission_Package.md:7-11, 9`). PAI coverage: bona-fide ✓, print ✓, replay kısmi (open challenge), 3D mask routed-not-validated, morphing out-of-scope.

**Browser readiness.** Live `https://amispoof.fivucsas.com/`, 19 analyzer + 3 gates (Aysenur'un — FaceUsability/Illumination/CriticalRegionVisibility), Fusion (MultiClassFuser + HybridFusionEvaluator), Session engine + LivenessProver, Web Worker offload (4 heavy analyzer), WebGPU + WASM fallback, lazy chunks (Texture 7.9 kB / Moire 10.5 kB / ScreenReplay 18.2 kB), 217 vitest yeşil. Desktop Chrome 25-30 fps (WebGPU), Pixel-class Android Brave 6.7-9.5 fps. MiniFASNet ONNX 1.7 MB + FaceLandmarker task 3.7 MB CDN-cached `Cache-Control: max-age=31536000, immutable` (`SPOOF_DETECTOR_BROWSER_READINESS.md:3-17, 214-218, 290-291`, `ROADMAP.md:134-141`).

---

## 6. Biometric Puzzle (Active Liveness)

### Short
Server-issued nonced challenge (puzzle UUID, 5dk TTL). **7 yüz** aksiyon (blink/smile/turn_left/turn_right/open_mouth/raise_eyebrows/light) + **9 jest** aksiyon (finger_count/wave/hand_flip/finger_tap/pinch/peek_a_boo/math/shape_trace/hold_position). Difficulty: easy (2-3, 7s/step) / standard (3-4, 5s/step) / hard (4-5, 4s/step). Per-step max 3 retry, session timeout 120s. Replay-proof.

### Long
- **Action vocabulary:**
  - **Face (7):** blink, smile, turn_left, turn_right, open_mouth, raise_eyebrows, light — `biometric-processor/app/api/schemas/active_liveness.py:9-37`
  - **Gesture (9, server-side landmarks-only):** finger_count (wrist-PIP/TIP ratio), wave (zero-crossing on wrist-x), hand_flip (palm-normal proxy sign change), finger_tap (index↔middle proximity), pinch (thumb↔index distance), peek_a_boo (monotonic hand-covers-face), math (random open-finger count), shape_trace (DTW vs template), hold_position (wrist std-dev) — `app/application/services/active_gesture_liveness_manager.py:16-24`
- **Sequence:** difficulty enum `easy|standard|hard`, step count random 2-7, per-step timeout 2-30s — `app/domain/entities/puzzle.py:14-19, 24, 37-38`, `app/api/schemas/puzzle.py:11-16`.
- **TTL:** 5 minutes total — `puzzle.py:87-89`.
- **Per-action thresholds:**
  - Server-side EAR baseline 0.21, REOPEN 0.23 (spoof-detector #10 recalibration) — `biometric-processor/.../puzzle.py:52-58`
  - Client-side EAR open 0.22, closed 0.17 — `web-app/src/lib/biometric-engine/core/constants.ts:16, 19`
  - Smile corner-raise 0.05, mouth-width 0.60 — `constants.ts:22, 25`
  - Head yaw ±20°, pitch ±12° — `constants.ts:31, 34`
  - Continuous hold 0.6s — `constants.ts:49`
  - Liveness score gate 50.0 (0-100) — `constants.ts:83`
- **Per-action retry:** Max 3 — `active_liveness.py:59`. Default per-step 5s — `puzzle.py:25, active_liveness.py:57`. Session timeout 120s — `active_liveness.py:69`.
- **Anti-replay:** Server-issued puzzle UUID v4 (Redis), expires `created_at + 5min`, verification expired ise reject — `puzzle.py:73, 87-89, 91-97`. Client sequence değiştiremez. Optional spot-check base64 frames (`puzzle.py:100-101`) server-side re-validation için.
- **LIVENESS_MODE flag:** `passive | active | combined`, default `combined` — `app/core/config.py:249-257, 219-224`. ChallengeType enum eşleştirmesi: `web-app/.../puzzleServerAction.ts`.
- **Endpoints:** `/api/v1/liveness`, `/api/v1/liveness/verify-challenge` — `app/api/routes/liveness.py`, `app/api/routes/puzzle.py`. Identity-core'dan X-API-Key ile çağrılır (internal Docker network only).

---

## 7. Differentiators & Engineering Achievements

- **Production-deployed multi-tenant SaaS** — Marmara Üniversitesi canlı tenant, `demo.fivucsas.com` (Hetzner CX43, 8 vCPU / 16 GB / 150 GB) — `CLAUDE.md:44-49`, V15 seed.
- **Hexagonal / DDD layout** — ports/adapters: identity-core'da `application/port/input/`, `application/port/output/`, `infrastructure/adapter/` (UserRepository, AuthFlowRepository, NfcCardRepository, BiometricProcessorClient, EmailServiceAdapter, SmsOtpAuthHandler) — `identity-core-api/src/main/java/com/fivucsas/identity/`. Biometric-processor'da `api/routes/ → application/use_cases/ → infrastructure/ml/` — `biometric-processor/app/main.py:1`.
- **OAuth2/OIDC + PKCE (RFC 7636)** — `/api/v1/oauth2/authorize`, `/.../token`, `/.../userinfo`, `/.well-known/openid-configuration`, `/.well-known/jwks.json` — `OAuth2Controller.java`, `OpenIDConfigController.java:44-100`. PKCE S256 mandatory `OAuth2Controller.java:328-341`.
- **JWT RS256 default** (2026-04-20 flip), HS512 legacy disabled — `JwtService.java:27-30, 56-68`, `application.yml:43`.
- **ISO/IEC 30107-3 alignment** — Level 1 submission package commit `cc73cf08`, Grade C in-house — `spoof-detector/iBeta_PAD_Level1_Submission_Package.md:7-11`.
- **KVKK / GDPR posture** — Fernet AES-128 embedding encryption at rest (`embedding_cipher.py:39`), soft-delete `deleted_at` (`Tenant.java:41-42`, `@SQLRestriction("deleted_at IS NULL")`), tenant RLS 9 tabloda (V25), audit_logs partition by tenant_id (V40, pg_partman V57).
- **10 Composable Auth Factors:**
  1. PASSWORD (BCrypt-12) — `SecurityConfig.java:239-240`, `PasswordAuthHandler.java`
  2. EMAIL_OTP (6-digit, Redis, 5min TTL) — `EmailOtpAuthHandler.java`, `OtpService.java:16`
  3. SMS_OTP (Twilio) — `SmsOtpAuthHandler.java`, `SMS_ACTIVATION_PLAN.md`
  4. TOTP (RFC 6238, 30s step, 32-byte secret AES-128) — `TotpAuthHandler.java`, `TotpService.java:15, 32`, V31
  5. FACE (Facenet-512) — `FaceAuthHandler.java`
  6. VOICE (Resemblyzer 256-D, pgvector HNSW) — `VoiceAuthHandler.java`, V33
  7. FINGERPRINT (WebAuthn platform authenticator) — `FingerprintAuthHandler.java`
  8. HARDWARE_KEY (FIDO2/WebAuthn) — `HardwareKeyAuthHandler.java`
  9. QR_CODE — `QrCodeAuthHandler.java`
  10. NFC_DOCUMENT (ICAO 9303, ISO 18013-5) — `NfcDocumentAuthHandler.java`
- **B2B drop-in identity button** — SDK `@fivucsas/auth-js`, `web-app/src/verify-app/sdk/FivucsasAuth.ts`, hosted-first redirective + iframe step-up MFA fallback, nonce + state, redirect-URI allowlist (HTTPS + loopback RFC 8252).
- **Real-time proctoring** — WebSocket `/api/v1/proctor/ws?session_id=...&user_id=...&tenant_id=...`, ConnectionManager singleton, frame handler, ProctorMetrics — `biometric-processor/app/api/routes/proctor_ws.py:1-47`, `app/core/metrics/proctoring.py`.
- **Hybrid liveness** — active Puzzle + passive UniFace MiniFASNet, fusion rule `accept iff min(P_A, P_B) ≥ θ`.
- **pgvector indexing** — biometric-processor HNSW (m=16, ef_construction=64), identity-core IVFFlat (lists=100).
- **Self-host stack on Hetzner CX43** — 8 vCPU / 16 GB / 150 GB, ~7 production services in docker-compose.prod.yml (postgres pgvector/pg16, redis 7.4, identity-core-api 2 replicas, biometric-processor 2 replicas, api-gateway Nginx, prometheus, grafana). 60 Flyway migrations (V1-V60).
- **Spoof-detector browser port** — 19 analyzer + 3 gates + LivenessProver + Web Worker + WebGPU + lazy chunks, 217 vitest yeşil, canlı `amispoof.fivucsas.com`.

---

## 8. Challenges & Effort-Intensive Work

- **Cross-modal synchronization (Puzzle ↔ PAD)** — LIVENESS_MODE `combined` default, fusion rule. Yanlış kalibre edilen hybrid /verify endpoint'inde stil frame → False yerlik dönerdi; PR #83 sonrası FaceVerifyMfaStepHandler cosine fail-open kapatıldı (Session 2026-05-07).
- **MediaPipe Tasks API porto** — legacy `face_mesh` API'den Tasks API'ye geçiş (468-nokta canonical), branch `fix/2026-05-12-mediapipe-tasks-api-port` (biometric-processor active head).
- **pgvector index tuning** — IVFFlat vs HNSW seçimi (<1M satır ölçeğinde IVFFlat lists=100; HNSW (m=16, ef=64) biometric-processor için). Hala recall/latency calibration bekliyor.
- **Multi-tenant Row-Level Security** — V25 9 tablo, V40 audit_logs partition, V57 pg_partman tenant_id backfill. 140 → 0 NULL backfill 2026-05-11.
- **NFC chip-read reliability** — Android OEM/versiyon farkı. iOS CoreNFC `[NOT FOUND IN REPO]`, KMP expect/actual gerekiyor.
- **BAC/PACE crypto correctness** — SHA-1 anahtar türetme, MRZ check-digit doğrulama. PACE/AA/CA henüz implement edilmedi (`PASSPORT_NFC_ROADMAP.md:164-170`).
- **ICAO 9303 spec interpretation** — Türkiye TD3 pasaport eşdeğeri, EF.SOD CSCA tam zinciri eksik (%60 doğrulanmış).
- **Flutter iOS NFC platform limits** — `[NOT FOUND IN REPO]`, Android-only canlı.
- **KVKK irreversibility** — Fernet AES-128 (yine de Fernet anahtarına erişen plaintext'i geri alır; "irreversibility" iddiası matematiksel değil operasyonel; bu poster üzerinde dürüst ifade gerekli). Embedding plaintext column hala duruyor (ANN search için), encryption dual-column.
- **Anti-spoof training-data scarcity (Türk demografi)** — paper 43-örnek in-house Marmara; CelebA-Spoof zero-shot AUC 0.7818, intra-dataset SOTA AUC >0.99. Bu poster üzerinde dürüst ifade gerekli.
- **Cold-start tenant onboarding flow** — `[NOT FOUND IN REPO — refer to web-app/docs/plans/]` (CLAUDE.md 2026-05-12 carry-forward).
- **Audit logs partitioning** — V57 silent no-op olarak teşhis edildi (Session 2026-05-12); V59/V60 ile düzeltildi.
- **JWT RS256 default** — 2026-04-20 flip, ama "JWT aud unshipped" 3 oturum üst üste yanlış işaretlendi memory'de (lesson: grep current HEAD before trusting completion labels).
- **FK-cascade no-hard-delete** — `users` 13 tabloya cascade siliyor (Session 2026-04-28 incident: ahabgu'nun TOTP/WebAuthn/NFC silindi). Patch: `findByEmail(... AND deletedAt IS NULL)`.
- **anti-correlated signal discovery** (texture/moire) — paper §5 ana finding'i; 1.0'dan 0.1'e re-weighting 0.017 AUC recovers.
- **Browser readiness 4 faz** — Phases A-D 2026-05-15/16, 5-agent paralel salvage 2026-04-25 (4 PRs from worktrees with complete drafts).

---

## 9. Short Q&A (Turkish, ≥ 12 pairs)

1. **FIVUCSAS hangi sorunları çözüyor?**
   Her uygulama için ayrı kayıt yok. FIVUCSAS destekli her site/uygulamaya tek butonla, 10 farklı yöntemle giriş. Uygulama sahibiysen login/register sayfaları yazmadan, OIDC + PKCE üzerinden tek hosted-login butonu ile kullanıcıları auth edersin.

2. **e-Devlet'ten farkı nedir?**
   e-Devlet kamu sektörü SSO'su; FIVUCSAS özel sektörün karşılığı. Açık OIDC discovery, drop-in `<FIVUCSAS />` butonu, NFC ICAO 9303 + Active Puzzle + Passive PAD + multi-tenant RLS, KVKK + GDPR + ISO/IEC 30107-3 Level 1 hazırlığı.

3. **Neden 10 farklı auth factor?**
   NIST 800-63B'ye uygun "Know-Have-Are-Show" eksenlerinde her tenant kendi MFA akışını kompoze eder — Java kod yazmadan, sadece JSON tenant config'i ile.

4. **Liveness Puzzle spoof'u nasıl yakalar?**
   Server her denemede rastgele 3-5 aksiyon dizisi üretir (UUID nonce, 5dk TTL). Pre-recorded video, deepfake injection, screen-replay başarısız olur — istenen aksiyon set unpredictable + timestamped + sunucu üretimli.

5. **Bir geliştirici FIVUCSAS'ı kaç satır kodla entegre eder?**
   ~15 satır: SDK init + `loginRedirect()` + token exchange. OIDC discovery + JWKS otomatik.

6. **KVKK uyumu nasıl sağlanıyor?**
   Embedding'ler Fernet AES-128 + HMAC-SHA256 şifreli at-rest, soft-delete `deleted_at` + `@SQLRestriction`, Postgres RLS 9 tabloda (V25), audit_logs tenant_id partition (V40 + pg_partman V57), Hetzner Almanya/Türkiye-erişimli barındırma.

7. **Proctoring'e ne katıyor?**
   Session-level peak-sensitive verdict (α=0.5, mean + worst-decile) — spoof-burst dilution'a dayanıklı. 15-axis LivenessProver, 63 ms / frame CPU (Python), 25-30 fps tarayıcı (WebGPU). Background-grid analyzer proctoring-specific.

8. **Veri silme talebi geldiğinde ne oluyor?**
   `deleted_at` damga, RLS tüm sorgularda soft-delete satırı filtreler. Hard-delete YASAK (FK-cascade 13 tabloya). GDPR/KVKK purge job ile periyodik fiziksel silme.

9. **Neden multi-tenant mimari?**
   Tek deploy ile N tenant. RLS Postgres-native, audit isolation pg_partman ile. Marmara Üniversitesi canlı tenant, demo.fivucsas.com aktif.

10. **NFC olmasa olmaz mı?**
    Hayır — opsiyonel faktör. Ama "banka-grade KYC" use-case'inde DG2 yüz JPEG2000 ↔ canlı selfie cosine eşleştirmesi ile fiziksel doküman doğrulaması ekler. T.C. kimlik + ICAO 9303 pasaport.

11. **Pasif PAD ile aktif Puzzle'ın farkı?**
    Pasif (UniFace MiniFASNet, 19 analyzer): kullanıcı işbirliği yok, sessiz. Aktif (Puzzle): server'ın istediği aksiyonu kullanıcı yapar — replay-proof. Hibrit: `accept iff min(P_A, P_B) ≥ θ`.

12. **Küçük bir uygulama bu sistemi karşılayabilir mi (maliyet)?**
    Evet — Hetzner CX43 (8 vCPU / 16 GB) tek sunucuda 7 servis. GPU yok. Spoof-detector tarayıcıda çalışır (123 kB ESM), frame sunucuya yüklenmez. MIT lisanslı submodule.

13. **Spoof-detector araştırması nerede?**
    `spoof-detector` submodule (MIT), `paper/sections/*.md` (10 bölüm, BIOSIG 2026 hedefi), public demo `https://amispoof.fivucsas.com/`, npm `@rollingcat/spoof-detector v0.2.1`, iBeta PAD Level 1 submission commit `cc73cf08`.

14. **Hangi açılardan açık kaynak literatürün önünde?**
    (a) Session-level peak-sensitive verdict, formel kanıtla spoof-burst dilution direnci. (b) Client-side browser deployment (WebGPU + WASM). (c) Anti-correlated signal discovery (texture/moire), per-operator recalibration recipe. (d) Reproducible no-training kalibrasyon (13 float).

15. **Subdomain'ler ne için?**
    `fivucsas.com` (landing), `verify.fivucsas.com` (hosted-login), `api.fivucsas.com` (OAuth2/OIDC), `app.fivucsas.com` (admin panel), `demo.fivucsas.com` (Marmara BYS), `docs.fivucsas.com` (entegrasyon dökümanı), `amispoof.fivucsas.com` (spoof-detector tarayıcı demosu), `status.fivucsas.com` (uptime), `links.fivucsas.com` (link hub). Grafana container internal-only — DNS yok. Posterde tek QR tüm linkleri taşır.

---

## 10. Numbers Inventory (Appendix)

### Lines of Code (measured 2026-05-19)
| Submodule | Lines |
|---|---|
| spoof-detector | 217,178 |
| practice-and-test | 222,825 |
| client-apps | 89,593 |
| biometric-processor | 77,782 |
| landing-website | 26,725 |
| identity-core-api | 28,708 |
| web-app | 15,141 |
| verify-widget | 7,800 |
| bys-demo | 2,288 |
| docs | 1,007 |
| docs-site | 1,646 |
| infra | 553 |
| **TOTAL** | **~691,446** |

### Tests
| Suite | Count |
|---|---|
| Spring (Java) | 944 |
| Pytest | 265 |
| Vitest/Jest | 1,559 |
| **TOTAL** | **~2,768** |

### Concrete Configuration Values
| Param | Value | Source |
|---|---|---|
| Embedding dim (Facenet-512) | 512 | `biometric-processor/.../deepface_extractor.py:72-75` |
| Embedding encryption | Fernet AES-128-CBC + HMAC-SHA256 | `embedding_cipher.py:39` |
| Cosine threshold (default) | 0.45 | `biometric-processor/app/core/config.py:156` |
| Cosine threshold (aged >2y) | 0.38 | `config.py:171-180` |
| Cosine threshold (similarity module default) | 0.6 | `infrastructure/ml/similarity/cosine_similarity.py:17` |
| Face detect confidence | 0.5 | `web-app/.../constants.ts:129` |
| Card detect confidence | 0.35 (gate 0.7) | `constants.ts:206, 220` |
| EAR open / closed (client) | 0.22 / 0.17 | `constants.ts:16, 19` |
| EAR baseline / REOPEN (server) | 0.21 / 0.23 | `biometric-processor/.../puzzle.py:52-58` |
| Smile corner / width | 0.05 / 0.60 | `constants.ts:22, 25` |
| Head yaw / pitch | ±20° / ±12° | `constants.ts:31, 34` |
| Continuous hold | 0.6s | `constants.ts:49` |
| Liveness score gate | 50.0 | `constants.ts:83` |
| Quality min | 65 (UI) / 70 (server) | `constants.ts:75`, `config.py:158` |
| Blur (Laplacian variance) | ≥ 100.0 | `config.py:292` |
| Min face size | 80 px | `config.py:291` |
| pgvector (biometric-processor) | HNSW m=16, ef_construction=64 | `scripts/add_hnsw_indexes.sql:19-22` |
| pgvector (identity-core) | IVFFlat lists=100 | `db/migration/V4__create_biometric_tables.sql:8` |
| Puzzle TTL | 5 minutes | `puzzle.py:87-89` |
| Puzzle step timeout default | 5s (range 2-30s) | `puzzle.py:24-25` |
| Puzzle session timeout | 120s | `active_liveness.py:69` |
| Puzzle max retry | 3 | `active_liveness.py:59` |
| Access token TTL | 86,400,000 ms (24h) | `application.yml:88` |
| Refresh token TTL | 604,800,000 ms (7d) | `application.yml:89` |
| OTP TTL | 5 min | `OtpService.java:16` |
| TOTP step | 30s | `TotpService.java:32` |
| TOTP secret length | 32 bytes | `TotpService.java:15` |
| JWT signing default | RS256 (2026-04-20 flip) | `JwtService.java:27-30` |
| Max devices/user | 10 | `application.yml:51` |
| Migrations (Flyway) | 60 (V1-V60) | `db/migration/` |

### Spoof-detector measured metrics (paper)
| Metric | Value | Source |
|---|---|---|
| CASIA-FASD AUC (minifasnet_only) | 0.9452 [0.9366, 0.9560] | `paper/sections/07_results.md:15` |
| CASIA-FASD ACER | 12.67% | `07_results.md:15` |
| CelebA-Spoof AUC | 0.7818 [0.7663, 0.7993] | `07_results.md:36` |
| CelebA-Spoof ACER | 28.67% | `07_results.md:36` |
| In-house replay AUC (image_only) | 0.9264 | `07_results.md:68` |
| MiniFASNet discrimination gap | +94.7 (μ_real 99.9, μ_spoof 5.1) | `05_calibration.md:25` |
| Per-frame latency (CX43 hybrid) | 63.0 ms mean, p99 117.8 ms | `07_results.md:110` |
| Sustained FPS (Python ref) | 15.9 fps | `07_results.md:110-112` |
| Desktop Chrome (WebGPU) | 25-30 fps | `SPOOF_DETECTOR_BROWSER_READINESS.md:4` |
| Pixel-class Android Brave | 6.7-9.5 fps | `ROADMAP.md:139-141` |
| Browser tests (vitest) | 217 green | `paper/sections/01_introduction.md:25` |
| Browser bundle | 123 kB ESM / 34 kB gzip | `ROADMAP.md:134-137` |
| MiniFASNet ONNX size | 1.7 MB | `paper/ARCHITECTURE.md:75-76` |
| FaceLandmarker task | 3.7 MB | `web/amispoof/README.md:48-50` |

### Infrastructure
| Param | Value | Source |
|---|---|---|
| Host | Hetzner CX43, 8 vCPU / 16 GB / 150 GB | `CLAUDE.md:44-49` |
| Production services | 7 (postgres, redis, identity-core x2, biometric x2, gateway, prometheus, grafana) | `docker-compose.prod.yml` |
| Commits last 6 months (all repos) | ~1,847 | `git log --since='2025-12-01'` |
| Live tenant | Marmara Üniversitesi (id `11111111-1111-1111-1111-111111111111`) | `V15__seed_realistic_sample_data.sql` |
| Auth methods | 10/10 | `AuthMethodType.java:1-25` |

### Load test targets (NOT measured, see `[NOT FOUND IN REPO]`)
| Operation | Target p95 | Target p99 | Source |
|---|---|---|---|
| Login | <300ms | <500ms | `load-tests/README.md:137-139` |
| Token Refresh | <200ms | <400ms | `load-tests/README.md:137-139` |
| Enrollment | <2000ms | <3000ms | `load-tests/README.md:158-159` |
| Verification | <500ms | <1000ms | `load-tests/README.md:179-180` |

### Gaps (cannot be put on the poster)
- Face pipeline EER / FAR / FRR — `[NOT FOUND IN REPO]`
- NFC chip-read latency (real measurement) — `[NOT FOUND IN REPO]`
- iOS CoreNFC implementation — `[NOT FOUND IN REPO]`
- DG3 / DG4 / DG11 / DG14 / DG15 NFC parsers — not implemented
- PACE / Active Authentication / Chip Authentication — not implemented
- Production proctoring SLA / incident-rate telemetry — `[NOT FOUND IN REPO]`
- Voice anti-spoof (ECAPA-TDNN with replay-detection cosine guard) — listed as Future Work in WA0006 conclusion
- iBeta PAD Level 1 official verdict — submission package only, not awarded yet

---

**End of brief.** Poster design session: pull from this file; mark `[NOT FOUND IN REPO]` items as "Future Work" or omit. Never invent missing numbers.
