# Biometric Pipeline Audit — 2026-04-28

**Kapsam:** biometric-processor (Python/FastAPI) + web-app biometric engine (TypeScript/React)  
**Kısıt:** Sunucu GPU'suz (Hetzner CX43, 4 vCPU, 16GB RAM, CPU-only)  
**Durum:** Kod altyapısı büyük ölçüde mevcut; üretimde çalışan subset çok daha küçük

---

## 1. Yüz Algılama (Face Detection)

### Client — Auth Akışı (FaceEnrollmentFlow, FaceVerificationFlow, EnrollmentPage)
| Özellik | Durum |
|---|---|
| Model | BlazeFace TF.js (birincil) + MediaPipe BlazeFace short-range (fallback) |
| Çıktı | Bounding box + 6 keypoint |
| Profil direnci | Zayıf — her ikisi de frontal ağırlıklı veriyle eğitilmiş |
| Poz (yaw/pitch) | Yok — 6 keypoint'ten çıkarılamaz |
| Durum | Çalışıyor ama alt-optimal |

### Client — BiometricEngine (BiometricToolsPage, puzzle sayfaları)
| Özellik | Durum |
|---|---|
| Model | MediaPipe FaceLandmarker (478 nokta, GPU delegate → WASM fallback) |
| Çıktı | 478 landmark, bounding box, 3D koordinatlar |
| Poz (yaw/pitch) | HeadPoseEstimator mevcut ve çalışıyor |
| Kalite | Endüstri standardı |
| Durum | ⚠️ Auth akışı detection döngüsünde kullanılmıyor |

### Server (biometric-processor)
| Özellik | Durum |
|---|---|
| Üretim config | `FACE_DETECTION_BACKEND=opencv` (.env.prod onaylı) |
| Backend | OpenCV Haar cascade — frontal-only (2012 teknolojisi) |
| Mevcut CPU-uyumlu alternatifler | `centerface`, `mtcnn`, `ssd` (kod var, config'de izinli) |
| GPU gerektiren | `retinaface`, `yolov8`, `yolov11*`, `yolov12*` — HARD blocked |
| Profil direnci | %80.3 red (CFP-FP benchmark) |

**Kök sorun:** Factory'nin `get_recommended_detector()` "retinaface" döndürüyor ama production `opencv` kullanıyor — belgelenmiş çelişki.

---

## 2. Yüz Kırpma (Face Crop)

### Client
- `cropFaceToDataURL()` → BlazeFace bbox'tan canvas crop, JPEG 0.85 kalite
- 224×224 veya orijinal boyut

### Server
- DeepFace `extract_faces()` + `align=True` → geometrik alignment uyguluyor
- OpenCV detect fail ederse crop da yapılamıyor

---

## 3. Landmark Tespiti

| Katman | Durum |
|---|---|
| Client (BiometricEngine) | MediaPipe 478 nokta, 3D, GPU/WASM — üst düzey |
| Client (auth akışı) | 6 keypoint (BlazeFace) — yetersiz |
| Server | `LANDMARK_MODEL=mediapipe_468` config'de, `/landmarks` endpoint'i var — ama enroll/verify pipeline'ına bağlı değil |

---

## 4. Yüz Kalitesi (Quality Assessment)

| Metrik | Client | Server |
|---|---|---|
| Bulanıklık (Laplacian) | ✅ | ✅ |
| Aydınlatma (brightness) | ✅ | ✅ |
| Yüz boyutu | ✅ | ✅ |
| Poz açısı (yaw/pitch) | ❌ | ❌ |
| Göz açıklığı | ❌ | ❌ |
| Simetri kontrolü | ❌ | ❌ |

`QualityAssessment` entity'sinde (`domain/entities/quality_assessment.py`) poz alanı yok.

---

## 5. Canlılık Tespiti (Liveness Detection)

### Client
| Bileşen | Durum |
|---|---|
| `PassiveLivenessDetector` | ✅ Mevcut ve çalışıyor — texture, color, skin tone, moire, local variance |
| `useFaceChallenge` behavioral | ✅ Çalışıyor — position, frontal, turn_left, turn_right, blink |
| `PassiveLivenessDetector` auth akışında | ❌ `useFaceChallenge` onu çağırmıyor |
| rPPG (nabız) | ✅ Kod mevcut, BiometricEngine'de — proctoring için |

### Server
| Backend | Durum |
|---|---|
| `OptimizedTextureLivenessDetector` | ✅ Üretimde (enhanced mode ile) |
| `UniFaceLivenessDetector` (MiniFASNet ONNX) | ✅ Kod mevcut, CPU-feasible, ~10-50ms — **ama varsayılan değil** |
| `HybridLivenessDetector` | ✅ Kod mevcut (enhanced + UniFace) |
| `ScreenReplayAntiSpoof` | ✅ Kod mevcut (FFT, specular, CrCb scatter) |
| `/enroll` endpoint'inde liveness | ❌ `liveness_score=1.0  # Placeholder` |
| `/verify` endpoint'inde liveness | ❌ Hiç çağrılmıyor |
| Liveness çalıştığı yer | Sadece `/liveness` endpoint'i doğrudan çağrıldığında |

**Kritik boşluk:** Enrollment ve verification pipeline'ı liveness check yapmıyor. Birisi doğrudan `/enroll` veya `/verify`'a istek gönderirse liveness tamamen atlanır.

---

## 6. Spoofing Koruması (Anti-Spoofing)

| Özellik | Durum |
|---|---|
| DeepFace built-in anti-spoofing | `anti_spoofing: bool = False` (detector default) |
| Üretim config | `ANTI_SPOOFING_ENABLED` `.env.prod`'da yok → disabled |
| UniFace MiniFASNet | ✅ Kod var, CPU-safe, ONNX — bağlı değil |
| Screen replay dedektörü | ✅ Kod var — bağlı değil |

**Fiili durum:** Üretimde hiçbir anti-spoofing çalışmıyor.

---

## 7. Yüz Temsili — Embedding

### Client
- `EmbeddingComputer.geometryEmbedding()` — 32 landmark arası pairwise mesafe, 512-dim
- **LOG-ONLY** — auth kararında kullanılmıyor (D2 kararı, mimari olarak doğru)
- Tarayıcı güvenilmez ortam; auth kararı sunucuda olmalı

### Server
| Özellik | Durum |
|---|---|
| Üretim model | `FACE_RECOGNITION_MODEL=Facenet` → **128-dim** (.env.prod onaylı) |
| Boyut | 128-dim — düşük; daha fazla boyut = daha iyi ayırt etme kapasitesi |
| LFW AUC | ~0.992 (Facenet 128-D) |
| AgeDB-30 AUC | ~0.9475 — yaş farklılığına zayıf |
| CPU alternatif | `Facenet512` (512-dim, ~0.996 LFW, ~0.965 AgeDB-30) — CX43'te ~200-400ms |
| GPU gerektiren | `ArcFace` (~0.998 LFW) — CX43'te >2s/inference, kabul edilemez |

**Embed boyutu neden önemli:** 128-D, farklı ışık/yaş/ifade koşulları altında ayrışması gereken yüzlerde yanlış yakınsamaya daha yatkın.

---

## 8. Karşılaştırma ve Arama

| Özellik | Durum |
|---|---|
| 1:1 Verify | Cosine distance, sabit threshold 0.45 — çalışıyor |
| 1:N Search | pgvector `<=>` (cosine), HNSW/IVFFlat index — **iyi, ölçeklenebilir** |
| Adaptive threshold | ❌ Yok — enrollment yaşına göre threshold ayarlanmıyor |
| Enrollment tarihi DB'de | ✅ `created_at` mevcut, kullanılmıyor |

---

## 9. "Entegrasyon Yeter mi?" Sorusunun Cevabı

Hayır, tek başına yetmez. İki ayrı sorun katmanı var:

**Katman 1 — Entegrasyon eksikleri** (kod var, bağlanmamış):
- Liveness `/enroll` ve `/verify`'a enjekte edilmeli
- Anti-spoofing açılmalı
- Passive liveness client auth akışına bağlanmalı
- Pose check kalite değerlendiricisine eklenmeli

Bu düzeltmeler sistemi "çalışır" durumdan "doğru çalışır" duruma getirir.

**Katman 2 — Model kalitesi** (kod değişikliği gerekir):
- Facenet 128-D → Facenet512 512-D: tek satır env değişikliği, ~5-8% doğruluk artışı, GPU gerektirmez
- AgeDB-30 sorunu Facenet512 ile azalır ama tamamen çözülmez
- AgeDB-30 için gerçek çözüm: adaptive threshold (enrollment yaşına göre eşik düşür) — kod gerektiriyor

**Katman 3 — Client detection yükseltmesi** (orta çaba):
- Auth akışının detection döngüsü BlazeFace kullanıyor (6 keypoint)
- MediaPipe FaceLandmarker (478 nokta) zaten BiometricEngine'de var
- `useFaceDetection` hook'u MediaPipe FaceLandmarker'a taşınmalı
- Bu değişiklik: poz kontrolü, gelişmiş kalite değerlendirmesi, passive liveness'ı auth akışına açar

---

## 10. GPU Gereksinimi Analizi

| İşlem | CPU (CX43) | GPU | Karar |
|---|---|---|---|
| OpenCV detect | ~15ms | ~5ms | CPU yeterli |
| centerface detect | ~80ms | ~20ms | CPU yeterli |
| mtcnn detect | ~120ms | ~30ms | CPU kabul edilebilir |
| Facenet 128-D embed | ~80ms | ~10ms | CPU iyi |
| Facenet512 512-D embed | ~200-400ms | ~20ms | CPU kabul edilebilir |
| ArcFace 512-D embed | ~1500-2000ms | ~20ms | **CPU kabul edilemez** |
| MiniFASNet liveness | ~10-50ms | ~5ms | CPU mükemmel |
| retinaface detect | ~800ms | ~30ms | **CPU kabul edilemez** |
| YOLOv8 detect | ~600ms+ | ~20ms | **CPU kabul edilemez** |
| Proctoring (video, 5fps) | Yeterli değil | Gerekli | GPU önerilebilir |

**Sonuç:** Facenet512 + centerface + MiniFASNet kombinasyonu GPU olmadan makul latency ile çalışabilir. Gerçek zamanlı video proctoring ölçekte GPU gerektirecektir, tek-frame enrollment/verification için GPU şart değil.

---

## Bileşen Özet Tablosu

| Bileşen | Kod Kalitesi | Prod'da Aktif | Sorun |
|---|---|---|---|
| MediaPipe 478pt (client) | ⭐⭐⭐⭐⭐ | Kısmi | Auth detection loop'ta değil |
| BlazeFace (client, auth) | ⭐⭐⭐ | ✅ | 6 keypoint, poz yok |
| OpenCV detect (server) | ⭐⭐ | ✅ | Frontal-only, eski |
| centerface detect (server) | ⭐⭐⭐⭐ | ❌ | Config değişikliğiyle aktif edilebilir |
| Quality check | ⭐⭐⭐ | ✅ | Poz kontrolü yok |
| Behavioral liveness (blink/turn) | ⭐⭐⭐⭐ | ✅ | İyi |
| PassiveLivenessDetector (client) | ⭐⭐⭐⭐ | ❌ | Auth akışına bağlı değil |
| UniFace MiniFASNet (server) | ⭐⭐⭐⭐⭐ | ❌ | Enroll/verify'a bağlı değil |
| Anti-spoofing (server) | ⭐⭐⭐⭐ | ❌ | Config'de kapalı |
| Facenet 128-D embed (server) | ⭐⭐⭐ | ✅ | Düşük boyut, yaşa zayıf |
| Facenet512 512-D embed (server) | ⭐⭐⭐⭐ | ❌ | Tek env satırı |
| pgvector ANN search | ⭐⭐⭐⭐⭐ | ✅ | Üst düzey |
| Adaptive threshold | ❌ | ❌ | Kod gerekiyor |
| Liveness → enroll/verify | ❌ | ❌ | Entegrasyon gerekiyor |
