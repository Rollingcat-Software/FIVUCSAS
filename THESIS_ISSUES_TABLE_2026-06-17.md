# FIVUCSAS Tezi — Gerçek Sorunlar Tablosu (Punch-List)

**Tarih:** 17 Haziran 2026 (softcopy son günü) · **Kaynak:** `FIVUCSAS_Thesis.pdf` (135 s., güncel sürüm — Word `master`'da bayat) · **Sayfa no:** basılı sayfa numarası (PDF = basılı + 9)

> Tüm kod-bağımlı bulgular **güncel `origin/main`'e** (14 Haziran) karşı yeniden doğrulandı; bayat checkout'tan kaynaklı 4 yanlış bulgu geri çekildi (en altta). Detaylı gerekçeler: `THESIS_REVIEW_2026-06-17.md`.

**Özet (güncel Word'e göre):** 🔴 **2 açık must-fix** (MF-1, MF-2) · ✅ 2 zaten çözülmüş (MF-3, SF-10) · 🟡 11 should-fix (çoğu içerik/görüş) · 🟢 ~13 minor · ❌ 5 geri çekildi

> **Güç/kaynak etiketi:** "Kurala dayalı zorunlu" olanlar yalnızca MF-3 + SF-10 (Guide/şablon) ve MF-1 + SF-13 (objektif tutarsızlık). Diğerleri akademik norm veya görüş.
>
> ### 🟢 GÜNCEL WORD ile doğrulandı — `FIVUCSAS_Thesis (2).docx` (17 Haz, Ayşenur Arıcı; incelenen PDF'ten YENİ)
> Bu Word **incelediğim 16-Haz PDF'inden farklı** ve iki "zorunlu" format bulgumu **zaten çözmüş:**
> - **MF-3 (kapak Arial) → ÇÖZÜLMÜŞ:** güncel Word'de Arial yok, kapak baştan sona Times New Roman.
> - **SF-10 (x.y.z altı çizili) → ÇÖZÜLMÜŞ:** 2. düzey başlıklar Normal + altı çizili (U=True, outlineLvl=2).
> - **Margin → uyumlu:** 2.5 cm + **1.0 cm gutter (cilt payı) = efektif sol 3.5 cm**, diğerleri 2.5 cm — Guide'a tam uyum.
> - Bölüm/x.y başlık boyutları (14/12pt bold), outline-level (auto-TOC) → uyumlu.
>
> **Kalan gerçek iş = içerik:** MF-1 (AUC/EER) ve SF-13 (HNSW/IVFFlat) güncel Word'de **hâlâ mevcut** (0.9475/34%/IVFFlat metinde var). MF-2 doğrulanmalı. Format tarafı esasen temiz. **Final softcopy PDF'i bu Word'den export edin.**

---

## 🔴 MUST-FIX — teslimden önce

| ✔ | ID | Yer | Gerçek sorun | Düzeltme | Nasıl doğrulandı |
|---|---|---|---|---|---|
| ☐ | **MF-1** | §5.8.3, s.94 | EER %34/%27, AUC 0.9475/0.9845 ile **matematiksel imkânsız** (AUC tavanı 0.884/0.927). Harness EER'i eşik **1.0'da kırpıyor** → raporlanan değer gerçek eşit-hata noktası değil. Tez sadakatle aktarmış (uydurma yok). | İki EER ifadesini sil; **AUC + FRR@0.45** bırak (ikisi de gerçek harness değeri, tutarlı) | Gerçek harness çıktısı `practice-and-test/fivucsas-test/07_agedb30/summary.txt` + ROC matematiği |
| ✅ | ~~**MF-3**~~ | Kapak, s.i–ii | *(16-Haz PDF'te Arial vardı)* | **GÜNCEL WORD'DE ÇÖZÜLMÜŞ** — kapak baştan sona Times, Arial yok | Güncel Word `(2).docx` font taraması |
| ☐ | **MF-2** ⚠️ | Tablo 2.2, s.21 | LFW doğrulukları başlıkta "**DeepFace framework benchmark [12,13]**" diye kaynaklandırılmış, ama değerler **orijinal-makale değerleri** gibi (ArcFace 99.82 vs DeepFace'in ~99.40'ı; OpenFace 92.92 vs 93.80) | Sayıları DeepFace'in tablosuna hizala **veya** "orijinal makaleler" diye yeniden kaynaklandır + satır-bazlı atıf | Ajan DeepFace deposu kontrolü — **kendiniz kaynağa karşı teyit edin** |

---

## 🟡 SHOULD-FIX

| ✔ | ID | Yer | Gerçek sorun | Düzeltme | Doğrulama |
|---|---|---|---|---|---|
| ☐ | **SF-13** | Böl 3/4 ↔ §5.4/§5.8.3/§7.1 | **Tez kendi içinde çelişiyor:** Böl 3/4 "HNSW migration baseline", §5/§7 "IVFFlat baseline → HNSW operasyonel" der | §5/§7'yi Böl 3/4 ile hizala (kod: migration 0001=HNSW, 0003=IVFFlat) | **Güncel** migration kodu (origin/main) |
| ☐ | **SF-2** | Tablo 3.2 / §5, s.30 & 80 | Auth latency hedefi ADD'deki **p95<200ms → 300ms** gevşetilmiş, not yok | 200'e döndür veya "ADD hedefi 300ms login / 200ms refresh olarak revize edildi" notu ekle | ADD vs tez |
| ☐ | **SF-3** | §2.4.5, s.23 / Tablo 2.3 | **FaceTec & iProov eksik** — aktif+pasif PAD/liveness pazar liderleri; Tablo 2.3'teki "Partial" değerlendirmesi strawman riski | FaceTec & iProov ekle veya hariç tutma gerekçesi (kapalı/proprietary) | Adversaryal okuma |
| ☐ | **SF-4** | §2.4.1, s.20 | **Keycloak eksik** — açık kaynak, self-hostable, OAuth2/OIDC/PKCE'li IAM; tezin "self-hostable" gap iddiasını zayıflatıyor | Keycloak ekle; gap'i "üzerine biyometri-öncelikli hibrit liveness" diye yeniden çerçevele | Adversaryal okuma |
| ☐ | **SF-5** | s.3, 5, 9 | Aşırı iddia: "**production reference architecture**", "**first/novel**", "**complete platform publicly released (MIT)**" — ama identity-core-api **private** repo | "deployed reference implementation"e yumuşat; MIT iddiasını public bileşenlerle sınırla | Adversaryal + repo durumu |
| ☐ | **SF-6** | §2.4.4 s.22; §2.4.1 s.20; Tablo 2.1 s.13 | **Atıfsız iddialar:** document-to-selfie üstünlüğü; "literatürde tekrar eden tema"; ISO/IEC 30107-3 **[35]** ilk kullanımda atıfsız | Atıf ekle veya sil; [35]'i ilk kullanıma taşı | Adversaryal |
| ☐ | **SF-7** | §2.1.2, s.9–11 | **NGINX→Traefik** ikamesi §2.1'de geçiyor ama out-of-scope ikame listesinde yok | Listeye ekle (Flutter→KMP, FAISS→pgvector ile birlikte) | İçerik denetimi |
| ☐ | **SF-8** | Onay sayfası, s.ii | **"Sign"** başıboş kelime — imza satırı/etiketi/tarihi olmayan boş şablon placeholder'ı | Düzgün imza satırı + "İmza / Tarih" ekle veya kaldır | Görsel inceleme |
| ☐ | **SF-9** | Şekil 3.8–3.9, s.44 (3.6–3.7, s.43) | İki sequence-diyagram parçası **tek sayfada sıkışık** → tezdeki en küçük yazı | Her parçaya yarım sayfa ver (sayfa sonunu yeniden akıt) | Görsel inceleme |
| ✅ | ~~**SF-10**~~ | 2.x.x başlıklar | *(16-Haz PDF'te altı çizili değildi)* | **GÜNCEL WORD'DE ÇÖZÜLMÜŞ** — x.y.z başlıklar Normal + altı çizili (outlineLvl=2, U=True) | Güncel Word `(2).docx` stil incelemesi |
| ☐ | **SF-11** | §4.3.3 / §2.1.1, s.63 | PSD/ADD varsayılanı **VGG-Face / 9-model menüsü → Facenet512** geçişi notsuz | "CPU-only dağıtım için VGG-Face/2622-dim yerine Facenet512/512-dim seçildi" cümlesi ekle | PSD/ADD karşılaştırma |
| ☐ | **SF-12** | abstract / Böl 7 | "**~4.863 test**" (güncel koda göre doğru) eski "~1.800+" rakamıyla uzlaştırılmamış | Kırılım + "eski rakam test artışından önce" notu ekle | — |

---

## 🟢 NICE-TO-HAVE (minor)

| ✔ | Yer | Sorun | Doğrulama |
|---|---|---|---|
| ☐ | Appendix A, s.119 | V12→V14, **V13 boşluğu açıklamasız** (86 sayısı yine doğru) | Görsel + kod (V13 gerçekten yok) |
| ☐ | Compose vs tez | **PostgreSQL: commit'li compose `pgvector:pg16`, tez prod=17** der → prod'u doğrula veya 16'ya çevir | **Güncel kod** (tek gerçek config çelişkisi) |
| ☐ | Kaynak [46] | "Preprints, 2024" — DOI/URL'siz tek zayıf giriş | Görsel |
| ☐ | Kaynakça stili | IEEE kullanılmış; Guide farklı stil (Surname+initials, italik venue) tarif ediyor → denetçi IEEE kabul ediyor mu | Guide |
| ☐ | Tablo 3.2 başlığı | "Nonfunctional" vs TOC/başlıktaki "Non-Functional" | Yapı denetimi |
| ☐ | s.56 vs s.110 | Endpoint "~80" vs "~84" — tek rakama sabitle | İçerik |
| ☐ | Sağ kenar | Medyan 2.43cm (Guide 2.5) + geniş tablo/kod 1.90cm'e taşıyor | Programatik ölçüm |
| ☐ | Şekil/Tablo listeleri | Satır kaydırmada dot-leader+sayfa no alt satıra düşüyor (asılı girinti) | Görsel |
| ☐ | Şekil 4.5, s.76 | İç composite alt-durum etiketleri en küçük yazı → ~1pt büyüt | Görsel |
| ☐ | Şekil 3.3/3.11/3.12/3.13/4.2 | Landscape (90° döndürülmüş) — bölüm yasaklıyorsa düzelt | Görsel |
| ☐ | Akronimler | MFA (s.3 ilk kullanım), CRUD (Tablo 2.1) açılmamış; PAD'ı Tablo 2.3 öncesi aç | Adversaryal |
| ☐ | Enrollment quality floor "40" (s.63) | Güncel kodda doğrula (verification 50 gerçek; enrollment 40 teyit edilmeli) | Güncel kodda spot-check gerek |
| ☐ | PDF navigasyon | Yer imi (bookmark) yok; gövde-içi "Figure/Table/Section X" ve "[n]" tıklanamaz | Programatik link analizi (149 TOC linki sağlam) |

---

## ❌ GERİ ÇEKİLEN — yanlış bulgular

| ID | Yanlış iddiaydı | Gerçek (doğrulanmış kaynak) |
|---|---|---|
| ~~**MF-4**~~ | "Kapakta öğrenci numaraları eksik, gerekli" | **Resmî şablonda öğrenci-no alanı YOK** (sadece 3× isim); profesör e-postasında da yok → gereksiz. Ben ADD'ye dayanarak varsaymıştım |
| ~~MF-6~~ | "Server `ChallengeType` 7 yüz; HandLandmarker simüle" | **14 yüz + 9 el = 23**; HandLandmarker wired (`useHandLandmarker.ts`) ✓ tez doğru |
| ~~MF-7~~ | "Benchmark harness `fivucsas-test` repoda yok" | `practice-and-test/fivucsas-test/` = **122 dosya** (LFW/AgeDB/CFP) ✓ tez doğru |
| ~~MF-8~~ | "Test sayıları %11-15 abartılı" | pytest **985** / Vitest **1.225** / Playwright **336** / Kotlin **573** / JUnit **1.761** — hepsi tezdeki ≥ ✓ |
| ~~m3~~ | "Android 5.3.0, tez 5.3.2 diyor" | versionName = **5.3.2** ✓ tez doğru |

> MF-6/7/8/m3: bayat yerel checkout'tan (2–4 Haziran branch'leri, web-app 25 commit geride) — güncel `origin/main`'e karşı doğrulandı. MF-4: resmî şablona karşı doğrulandı.

---

## ✅ DEĞİŞTİRME — doğrulandı, hata değil

| Konu | Neden dokunma |
|---|---|
| Hetzner **CX43 / 8 vCPU / 16 GB** | Projenin kendi infra dokümanı doğruluyor (CX33/8GB başka bir kutu) |
| **Satır aralığı** (~20.8pt) | Word'ün "1.5 satır"ı — Guide uyumlu |
| **Abstract Keywords yok** | Guide zorunlu kılmıyor |
| **Challenge/harness/test sayıları, eşikler, sürümler** | Güncel `origin/main`'e karşı doğru |
| **LFW AUC 0.9943 / EER 1.93%** | İçsel tutarlı; AUC/EER sorunu sadece AgeDB-30 + CFP-FP'de |
| **Canlı URL'ler** | 7/7 ayakta, gerçek içerik, api `{"status":"UP"}` |

---

## ✔ Bugün için önerilen sıra (son tarih bu gece 22:00)

**Format kontrolü (Kübra Uludağ) için gerçekten gerekli — Guide/şablon dayanaklı:**
1. **MF-3** (kapağı tamamen Times'a çevir) — 3 dk, denetçinin ilk gördüğü, kesin kural.
2. **SF-10** (x.y.z başlıklara alt çizgi — Guide metni; şablon sessiz, güvende olmak için yap) — 5 dk.

**Danışman/jüri için (doğruluk, format değil):**
3. **MF-1** (tutarsız iki EER'i sil, AUC+FRR@0.45 bırak) — 5 dk, en yüksek jüri riski.
4. **SF-13** (HNSW/IVFFlat iç çelişkisini gider) + **MF-2** (Tablo 2.2 kaynağını *kendiniz* doğrulayın) — 10 dk.

**İsteğe bağlı (norm/görüş — vakit kalırsa):** SF-2/3/4/5/6/8/9/11/12 ve minorlar.
Sonra: **yazım denetimi** → **yer imleriyle yeniden export**.

*Not: ciltli hardcopy + final PDF son tarihi 23 Haziran Salı 17:00 (e-postayla güncellendi); bu gece sadece softcopy.*

---
*Tüm bulgular kanıt-destekli. Kod iddiaları güncel `origin/main`'e karşı doğrulandı; biçim Guide'ı (CSE4198 Thesis Guide v2023) ile ölçüldü; canlı URL'ler bağımsız test edildi. Detaylı gerekçeler: `THESIS_REVIEW_2026-06-17.md`.*
