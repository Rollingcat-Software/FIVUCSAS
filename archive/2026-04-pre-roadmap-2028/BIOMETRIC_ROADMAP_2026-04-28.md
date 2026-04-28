# Biometric Pipeline Roadmap — 2026-04-28

**Hedef:** GPU olmadan maksimum doğruluk ve güvenlik  
**Kısıt:** Hetzner CX43 CPU-only, mevcut kod altyapısı korunur  
**Kaynak:** BIOMETRIC_PIPELINE_AUDIT_2026-04-28.md

Her fazın sonunda sistem öncekinden ölçülebilir şekilde daha iyi olacak.  
Faz 1 ve 2 birbirinden bağımsız uygulanabilir.

---

## Faz 1 — Config Düzeltmeleri (1-2 gün, sıfır kod)

Bunlar tek satır değişiklikler. Hiçbiri GPU gerektirmez. Hepsi sıfır yeni kod.

### F1-1: Embedding modeli yükselt
**Dosya:** `biometric-processor/.env.prod`  
**Değişiklik:**
```diff
- FACE_RECOGNITION_MODEL=Facenet
+ FACE_RECOGNITION_MODEL=Facenet512
+ EMBEDDING_DIMENSION=512
```
**Etki:** 128-dim → 512-dim. LFW AUC ~0.992 → ~0.996. AgeDB-30 FRR ~65% → ~45%.  
**Latency:** ~80ms → ~200-400ms/inference on CX43 — enrollment/verification için kabul edilebilir.  
**Dikkat:** Mevcut 128-D embeddingler geçersiz olacak. Tüm kullanıcılar **yeniden kayıt** yaptırmalı. Bunu production'a almadan önce tüm biyometrik verileri sil veya migration planla.

### F1-2: Yüz dedektörü yükselt
**Dosya:** `biometric-processor/.env.prod`  
**Değişiklik:**
```diff
- FACE_DETECTION_BACKEND=opencv
+ FACE_DETECTION_BACKEND=centerface
```
**Etki:** CFP-FP red oranı %80.3 → beklenen %30-40 civarı. Profil toleransı artar.  
**Latency:** ~15ms → ~80ms on CX43 — kabul edilebilir.  
**GPU:** Gerekmez (centerface ONNX tabanlı, CPU-fast).

### F1-3: Anti-spoofing'i aç
**Dosya:** `biometric-processor/.env.prod`  
**Değişiklik:**
```diff
+ ANTI_SPOOFING_ENABLED=true
+ ANTI_SPOOFING_THRESHOLD=0.5
```
**Etki:** DeepFace built-in anti-spoofing aktif olur. Basit fotoğraf saldırılarını engeller.  
**Latency:** +50-100ms/detection — kabul edilebilir.  
**Not:** Bu, dedektörün anti-spoofing'i. UniFace liveness ayrı (Faz 2'de entegre edilecek).

### F1-4: UniFace varsayılan liveness yap
**Dosya:** `biometric-processor/.env.prod`  
**Değişiklik:**
```diff
+ LIVENESS_UNIFACE_DEFAULT_ENABLED=True
+ LIVENESS_BACKEND=hybrid
```
**Etki:** Enhanced texture + MiniFASNet ONNX hybrid → derin öğrenme tabanlı anti-spoofing aktif.  
**Latency:** +10-50ms — MiniFASNet ONNX CPU'da hızlı.

---

## Faz 2 — Entegrasyon Düzeltmeleri (3-5 gün, orta kod)

Bunlar mevcut kodun doğru yerlere bağlanması. Yeni ML modeli veya GPU gerektirmez.

### F2-1: Liveness'ı enrollment pipeline'ına entegre et
**Dosya:** `biometric-processor/app/api/routes/enrollment.py`  
**Sorun:** `liveness_score=1.0  # Placeholder` satırı var.  
**Çözüm:** `CheckLivenessUseCase`'i `EnrollFaceUseCase` ile aynı request'te çağır. Liveness skoru minimum eşiğin altındaysa 400 döndür.
```python
# enrollment.py içinde
liveness_use_case: CheckLivenessUseCase = Depends(get_check_liveness_use_case)
# ... image kaydedildikten sonra:
liveness_result = await liveness_use_case.execute(image_path)
if not liveness_result.is_live:
    raise HTTPException(400, detail={"error_code": "LIVENESS_FAILED", ...})
```
**Etki:** Fotoğraf veya ekran replay ile kayıt engellenir.

### F2-2: Liveness'ı verification pipeline'ına entegre et
**Dosya:** `biometric-processor/app/api/routes/verification.py`  
**Sorun:** `/verify` endpoint'i liveness kontrolü yapmıyor.  
**Çözüm:** F2-1 ile aynı pattern. Verification sırasında da canlılık doğrula.  
**Dikkat:** Threshold verification için biraz daha gevşek tutulabilir (enrollment'ta yüksek, verification'da orta) — aynı kullanıcı çeşitli koşullarda verify edebilmeli.

### F2-3: Server kalite değerlendirmesine poz kontrolü ekle
**Dosya:** `biometric-processor/app/infrastructure/ml/quality/quality_assessor.py`  
`biometric-processor/app/domain/entities/quality_assessment.py`  

**Sorun:** `QualityAssessment` entity'sinde yaw/pitch yok; sadece blur/lighting/size kontrol ediliyor.  
**Çözüm:**
1. `quality_assessment.py` entity'sine `yaw: Optional[float] = None` ve `pitch: Optional[float] = None` ekle
2. `quality_assessor.py`'de landmark varsa MediaPipe'tan poz hesapla
3. `|yaw| > 30°` veya `|pitch| > 25°` ise kalite skorunu düşür veya hard-reject et

### F2-4: Client auth akışına passive liveness ekle
**Dosya:** `web-app/src/features/auth/hooks/useFaceChallenge.ts`  
**Sorun:** `useFaceChallenge` behavioral challenge yapıyor ama `PassiveLivenessDetector`'ı çağırmıyor.  
**Çözüm:** Her capture sırasında `BiometricEngine.livenessDetector.check(faceROI)` çağır. Skor düşükse kullanıcıyı uyar.  
**Not:** Bu sunucu kararını değiştirmez (D2), sadece kötü kaliteli capture'ları önceden elemiş olur.

### F2-5: Client detection döngüsünü yükselt (en önemli entegrasyon)
**Dosya:** `web-app/src/features/auth/hooks/useFaceDetection.ts`  
**Sorun:** Auth akışı BlazeFace (6 keypoint) kullanıyor; MediaPipe FaceLandmarker (478 nokta) BiometricEngine'de var ama bu hook'ta kullanılmıyor.  
**Çözüm:** `useFaceDetection` hook'unda BlazeFace yerine `BiometricEngine.faceDetector` (FaceLandmarker) kullan. Bu değişiklik şunları mümkün kılar:
- HeadPoseEstimator → poz geri bildirimi ("Kameraya düz bakın")
- PassiveLivenessDetector → anlık canlılık skoru
- Tam kalite değerlendirmesi (478 nokta ile)

**Latency kaygısı:** FaceLandmarker WebGL GPU delegate ile <30ms. WASM fallback ~80ms — hâlâ kabul edilebilir.

---

## Faz 3 — Adaptive Threshold ve Enrollment Politikası (2-3 gün)

Hiçbiri GPU gerektirmez. Bu değişiklikler AgeDB-30 sorununu (yaş farkı) büyük ölçüde çözer.

### F3-1: Enrollment tarihine göre adaptive threshold
**Dosya:** `biometric-processor/app/application/use_cases/verify_face.py`  
`biometric-processor/app/core/config.py`

**Sorun:** Sabit 0.45 threshold; 3+ yıl önce kayıt olan kullanıcı yüzü değişince reddediliyor.  
**Çözüm:**
```python
# config.py'ye ekle
VERIFICATION_THRESHOLD_AGED_YEARS: float = 2.0  # Bu süre sonrası threshold değişir
VERIFICATION_THRESHOLD_AGED: float = 0.38       # Daha gevşek threshold (0.45 → 0.38)
# verify_face.py'de
days = (datetime.now() - enrollment.created_at).days
threshold = settings.VERIFICATION_THRESHOLD_AGED if days > (settings.VERIFICATION_THRESHOLD_AGED_YEARS * 365) else settings.VERIFICATION_THRESHOLD
```
**Etki:** 2+ yıl önce kayıt olan kullanıcılarda FRR %65.8 → beklenen %30-40 civarı.  
**Güvenlik notu:** Eşiği çok düşürmek FAR'ı artırır; 0.38 değeri dengeyi korur.

### F3-2: Embedding yenileme uyarısı (UX)
**Dosya:** `web-app/src/pages/MyProfilePage.tsx` veya ilgili profil sayfası  
**Çözüm:** Kullanıcının enrollment tarihi >2 yıl ise "Biyometrik veriniz güncelleme gerektirebilir" uyarısı göster.  
**Etki:** Kullanıcılar proaktif olarak yeniden kayıt yaparak sistemi güncel tutar.

### F3-3: Enrollment tarihi API'den dön
**Dosya:** `biometric-processor/app/infrastructure/persistence/repositories/postgres_embedding_repository.py`  
**Sorun:** `get_embedding_by_user_id` sorgusu `created_at` döndürmüyor.  
**Çözüm:** SELECT'e `created_at` ekle, `FaceEmbedding` entity'sine alan ekle.

---

## Faz 4 — Gelecek İyileştirmeler (Opsiyonel, GPU Gerektirmez)

Bunlar "iyi sahip olmak" kategorisinde; sistem Faz 1-3 sonrasında zaten üretim kalitesinde olacak.

### F4-1: Multi-frame enrollment kalite ağırlıklandırması
Mevcut `EnrollMultiImageUseCase` birden fazla görüntüyü işleyebiliyor. Enrollment sırasında 5 farklı açıdan alınan kareler kalite-ağırlıklı ortalama embedding oluşturabilir. Bu özellikle 2+ yıllık embedding sorununu azaltır.

### F4-2: Enrollment'ta poz çeşitliliği kontrolü
5'li enrollment'ta sunucunun poz dağılımını doğrulayabilmesi: "frontal, hafif sol, hafif sağ, yukarı, aşağı" kombinasyonunu zorunlu kıl. Bu embedding kalitesini artırır.

### F4-3: SFace ONNX entegrasyonu (Facenet512 alternatifi)
SFace (ArcFace-distilled, 128-dim): CPU'da ~50ms, LFW ~0.9940. Facenet512'ye yakın performans, 4× daha hızlı. Yeterli veri olduğunda geçiş değerlendirilebilir.

### F4-4: Proctoring için rPPG entegrasyonu
`RPPGAnalyzer` kodu mevcut ve çalışıyor. Uzaktan nabız tespiti aktif liveness kanıtı olarak kullanılabilir. Ancak 5+ saniyelik video stream gerekiyor — tek-frame enrollment için uygun değil, proctoring için anlamlı.

---

## Uygulama Sırası Önerisi

```
Faz 1 (F1-1 hariç) → deploy → test
  ↓
F1-1 (Facenet512) → tüm embeddinglerde migration → deploy
  ↓
Faz 2 (F2-1, F2-2, F2-3) → deploy → test
  ↓
Faz 2 (F2-4, F2-5) → deploy
  ↓
Faz 3 → deploy
```

**F1-1 ayrı tutulmasının sebebi:** 128-D → 512-D geçişi mevcut embeddingleri geçersiz kılar. Bu breaking change; migration planı olmadan prod'a alınamaz.

---

## Beklenen Son Durum (Faz 1-3 Sonrası)

| Metrik | Şimdi | Faz 1-3 Sonrası |
|---|---|---|
| LFW AUC | ~0.992 (128-D) | ~0.996 (512-D) |
| AgeDB-30 FRR @0.45 | ~65.8% | ~30-40% (threshold + model) |
| CFP-FP rejection | ~80% | ~30-40% (centerface) |
| Liveness bypass | Mümkün | Engellenmiş |
| Anti-spoofing | Kapalı | Açık |
| Poz geri bildirimi | Yok | Var |
| Enrollment kalite garantisi | Zayıf | Güçlü |
| GPU ihtiyacı | Yok | **Yok** |
