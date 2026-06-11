# Adversarial Accuracy / Anti-Fabrication Audit — FIVUCSAS Thesis

**Auditor pass date:** 2026-06-05
**Scope:** all `build/facts/*.md` + all `build/chapters/*.md`, spot-checked against the live repo
(`identity-core-api`, `biometric-processor`, `client-apps`, `web-app`) at HEAD on `master`.
**Method:** every quantitative / delivery / version claim cross-read against the fact packs and,
where load-bearing, re-verified by `grep`/`Read` on production config and source.

## Verdict

**The thesis is, overall, exceptionally honest and well-grounded.** The single most dangerous
trap — the unverified "100% accuracy / ACER 0.00% / learned-fuser" poster claim — is handled
**correctly**: it is explicitly refused in ch5 §5.8.3 and ch7 §7.2.2, named as unverified, and
NOT cited as a result. FAR/FRR/APCER/BPCER are consistently labeled as *targets* or
*controlled-test*, never as measured production benchmarks. Platform delivery (Android delivered,
desktop delivered-but-narrower, iOS NOT delivered, macOS out of scope) is stated accurately and
matches the repo (no `iosApp` module; `HmacPlatform.ios.kt` is `TODO`). Versions (Spring Boot
3.4.7 / Java 21, Python 3.12, PostgreSQL 17 + pgvector, Redis 7.4, Traefik v3.6.12, Flyway V0–V83,
Facenet512/512-dim, MTCNN, UniFace MiniFASNet) all verified correct in production config. Test
counts (1,569 Java, 1,025 Vitest, 336/28 Playwright, 568 Kotlin, 888 pytest ≈ 4,386) match the
fact packs and grep within rounding. BCrypt(12), HTTP 423 lockout-after-5, JWT 15-min/24-h,
26 route modules / 69 endpoints, IVFFlat `lists=100`, EAR veto 0.18, texture weights
0.35/0.25/0.25/0.15, anti-spoof prod-enabled — all confirmed against source.

The issues below are minor: one is a genuine factual error + internal contradiction (the
verification threshold in one cell of ch2), the rest are small consistency / framing imprecisions.
None is a fabricated metric or an overclaim of delivery.

---

## Issues found

### Issue 1 — WRONG verification threshold + internal contradiction (MEDIUM; the only real error)
- **File / section:** `chapters/ch2.md`, §2.2 Success Factors, table row **O3 — High-accuracy face recognition** (line 80).
- **Exact wrong claim:** "Facenet512 + cosine similarity **at a 0.6 threshold** is the production decision rule".
- **Why it is wrong (verified):**
  - Production `docker-compose.prod.yml` sets `VERIFICATION_THRESHOLD: 0.4` (code default 0.45). The 1:1 decision rule is `cosine **distance** < 0.4` (with an aged-embedding relaxation to 0.55), **not** "cosine **similarity** at 0.6".
  - The "0.6" value is the *1:N search distance ceiling* (`config.py` comments reference ~0.6 as "the model's known operating point for cosine distance" / FAR-control ceiling) — a different surface from the 1:1 verify decision.
  - This **contradicts ch3 §FR-3** ("production `VERIFICATION_THRESHOLD = 0.4`"), **ch4 §4.3.3** ("Production uses `VERIFICATION_THRESHOLD = 0.4`"), and **ch5 §5.8.3** ("production `VERIFICATION_THRESHOLD = 0.4`"), all of which are correct. It also mislabels distance as similarity.
- **Corrected / safer wording:** "Facenet512 with a cosine-**distance** decision rule (production `VERIFICATION_THRESHOLD = 0.4`, relaxed to 0.55 for embeddings older than two years) is the production verifier; FAR/FRR instrumentation exists, but the FAR<1% / FRR<5% figures remain controlled-environment **targets**, not audited production results."

### Issue 2 — "ten authentication methods" vs "twelve" inconsistency (LOW)
- **File / section:** `chapters/ch6.md`, §6.3 Economic/Commercial/Social Impact (line ~135).
- **Exact wrong claim:** "…document and chip reading, **ten** authentication methods, and a hosted OIDC integration…".
- **Why it is inconsistent:** The abstract ("**twelve** configurable login factors") and ch7 ("**twelve** authentication methods") and ch3 ("**ten** canonical … plus two cross-device additions") all settle on **12** selectable login methods (the documented 10 + `PASSKEY` + `APPROVE_LOGIN`), which matches the fact pack (clients.md §4: "12 total"; identity_core.md §5). ch6's bare "ten" undercounts and reads inconsistently against the rest of the thesis.
- **Corrected / safer wording:** "…document and chip reading, **a dozen (twelve)** selectable authentication methods, and a hosted OIDC integration…" — or reuse the ch3 framing ("ten canonical factors plus two cross-device additions").

### Issue 3 — Abstract conflates the ~4,400 test-case *count* with load/security *levels* (LOW)
- **File / section:** `frontmatter` Abstract (line 3).
- **Exact wording:** "…validated it with roughly 4,400 automated tests spanning unit, integration, end-to-end, **load, and security levels**."
- **Why it is imprecise:** The grep-verified ≈4,386 figure is the count across the **five test technologies** (JUnit 5, Vitest, Playwright, Kotlin/JUnit, pytest) — i.e. unit + integration + E2E. **Load (k6) and security (Bandit/pip-audit/gitleaks/Dependabot)** are *separate harnesses/tools that are not part of that count*; ch5 §5.3/§5.6/§5.7 is meticulous about this distinction, but the abstract folds load+security into the "4,400 … spanning" clause, implying the count includes them.
- **Corrected / safer wording:** "…validated it with roughly 4,400 authored automated tests across five test technologies (unit, integration, and end-to-end), complemented by k6 load scenarios and a Bandit/pip-audit/gitleaks/Dependabot security battery." (Keeps the level list but stops the count from appearing to include load/security.)

### Issue 4 — Internal fact-pack discrepancy in the Java test count (LOW; informational, chapters chose correctly)
- **File / section:** `facts/identity_core.md` §12 says "**1586** `@Test`-annotated methods … 177 test source files"; `facts/infra_tests.md` §5.1 says "**1,569** `@Test` methods across 176 test files".
- **Why noted:** Direct grep on HEAD returns 1,564–1,586 depending on whether substring hits (`@TestConfiguration`, comment lines) are filtered — i.e. **~1,569 is a defensible canonical figure** and the live count is within tolerance. All chapters (ch3/ch5/ch7) use **1,569 / 176**, which matches infra_tests.md. **No chapter change required**; flagging only so the two fact packs are reconciled to one number if regenerated. Safer framing already used in chapters: "**~1,569** `@Test` methods (+22 parameterized)".

---

## Things explicitly checked and found CORRECT (no action)

- **Forbidden learned-fuser / "100% accuracy / ACER 0.00%" claim:** correctly REFUSED in ch5 §5.8.3 and ch7 §7.2.2; described as unverified poster material, not cited. ✔
- **All FAR/FRR/APCER/BPCER/ACER/EER references** are labeled *target* / *controlled-test* / *implemented harness, evaluation ongoing*; never presented as measured production results (ch2 O2/O3, ch5 §5.8, ch7). ✔
- **Performance numbers** (login p95 <300 ms, verify p95 <500 ms, enrollment <2000 ms, "1000+ users / ~120 enroll/s") consistently labeled as **k6 targets / compose-header design estimates**, not measurements (ch2, ch3, ch5 §5.6). ✔
- **Platform delivery:** Android = delivered full native (v5.3.0, PACE/EF.CardAccess code present in `androidApp`); desktop = delivered, narrower (.deb/.msi, DPAPI/libsecret); **iOS = NOT delivered** (no `iosApp`, `HmacPlatform.ios.kt` TODO verified); macOS out of scope. All stated honestly (ch2 §2.1.2 + O4, ch3, ch7). ✔
- **Edge = Traefik v3.6.12 not NGINX; pgvector index = IVFFlat (not HNSW) lists=100; RLS inert → @Filter operative; FINGERPRINT via WebAuthn (server-side placeholder removed); iris not implemented; pairwise-sub dormant; card model is oversized YOLOv8m not nano; ZAP/Snyk/Trivy = documented-intent not CI-wired; Prometheus/Alertmanager configured-not-deployed.** All honesty flags from the fact packs are carried into the chapters accurately. ✔
- **Versions / counts:** Spring Boot 3.4.7, Java 21, Python 3.12, PostgreSQL 17, Redis 7.4, Traefik v3.6.12, Flyway V0–V83 (84 files, max V83), Facenet512/512-dim, BCrypt(12), JWT 900000/86400000 ms, 26 route modules / 69 endpoints, 32 JPA entities, IVFFlat lists=100, EAR veto 0.18, texture weights 0.35/0.25/0.25/0.15, voice ≥0.65 similarity. All grep-verified. ✔
- **LFW accuracy comparison table (ch2):** values are the published DeepFace-documented figures, captioned "Reported accuracies are the figures published by the respective authors/benchmarks, not measured in this project." Correct attribution; not a project measurement. ✔
