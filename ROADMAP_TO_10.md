# FIVUCSAS: Roadmap to 10/10

Date: 2026-11-02. Status: working plan, owned by the project owner. Location note: `docs/` in this
repo is a git submodule, so this file lives at the repo root.

## Yönetici özeti (TR)

- Dört puan: (a) bitirme projesi 9/10, (b) mühendislik/ürün olgunluğu 5/10, (c) bugünkü ticari hazırlık 2/10, (d) odaklanınca ticari potansiyel 5/10. Bu belge her eksik puanın nedenini kanıtıyla (dosya:satır veya kaynak) ve kapatma yolunu listeler.
- (a) ve (b) büyük ölçüde kodla ve operasyonla 10'a çıkar. (c) ve (d) kodla çıkmaz: şirket, sözleşme, KVKK paketi, Türkiye'de barındırma, sızma testi, sertifika ve ödeme yapan müşteri gerekir.
- En acil güvenlik açıkları: (1) üretimde yüz faktörü istemci embedding'i ile çalışıyor ve sunucu bunu bir liveness katmanıyla eşlemeyi zorunlu tutmuyor; (2) eski anonim `/auth/sessions` motoru token üretiyor (PR #276 ile düzeltiliyor); (3) kullanıcı silinince biyometrik şablonlar bio veritabanında kalıyor (KVKK md. 7 / GDPR md. 17).
- Faz 0 (bu hafta, yalnızca kod, Claude yapabilir): liveness eşleme kuralı, puzzle bayraklarının compose'a bağlanması, silme zincirinin bio'ya uzatılması, eski NFC işleyicisine kill-switch, devre kesici, CI başarısına bağlı deploy, sözleşme testleri, belge/kod uyumsuzluklarının düzeltilmesi.
- Faz 1 (1-3 ay): staging + şehir dışı şifreli yedek + geri yükleme tatbikatı, puzzle v2'nin staging'de doğrulanıp açılması, tarayıcı embedding doğruluğunun standart protokolle ölçülmesi, şirket kuruluşu ve BİGG başvurusu, KVKK belgeleri.
- Faz 2 (3-12 ay): Türkiye'de iki düğümlü HA barındırma, bağımsız sızma testi, ISO 27001 hazırlığı, Marmara pilotunun ücretli sözleşmeye dönmesi, 3-5 üniversite.
- Dürüst sınır: "üniversite pilotu için 10/10" 12 ayda ulaşılabilir. "Banka için 10/10" (BDDK uzaktan kimlik tespiti, ISO 27001 sertifikası, iBeta PAD mektubu, 1e-7 FAR kanıtı) bu ekip ve bütçeyle 2-3 yıl içinde gerçekçi değildir.
- (d) için 10/10 bir piyasa yargısıdır: Türk e-KYC pazarı yaklaşık 7M USD (IMARC 2024). 10/10 ancak ödeme yapan müşteri kanıtı ve pazarın yükseköğretim dışına veya yurtdışına genişlemesiyle savunulabilir.
- Bölüm 5'teki tablo her açığı dosyalanabilir bir GitHub issue başlığına eşler; "Claude başlayabilir" sütunu hemen başlanabilecek kod işlerini işaretler.

---

## 0. Inputs, method, and what is already in flight

Inputs: `fivucsas-papers/review/2026-11-fivucsas/ARCH_REVIEW.md` (ARCH), `.../PRODUCT_REVIEW.md`
(PROD), `fivucsas-papers/plan/ACIK_ISLER.md` (ACIK), `paper-B-puzzle-pad/review/server_verification_v2.md`
(PV2), `paper-B-puzzle-pad/bench/calibration-2026-11-01/` (CAL), and the five CLAUDE.md files
(treated as claims, not truth).

Spot-checked against code on 2026-11-02 (all confirmed unless noted):

| Claim | Evidence (verified) |
|---|---|
| Legacy session engine is anonymous | `identity-core-api/.../config/SecurityConfig.java:138-140` (`permitAll` on POST/GET `/api/v1/auth/sessions`, POST `.../steps/*`) |
| Embedding FACE is not paired with liveness | `identity-core-api/.../mfa/handler/FaceVerifyMfaStepHandler.java:43-60` routes any embedding to bio `/verify-embedding`; the comment says pairing is "enforced by sub-projects B/C"; no flow validator references PUZZLE (grep: no `*Flow*` service mentions it) |
| Puzzle layer cannot be enabled in prod | `APP_AUTH_PUZZLE_LAYER` is read in `application-prod.yml:133-134` but is absent from `identity-core-api/docker-compose.prod.yml` (`environment:` block, the repo's own rule: vars not in that block are dropped) |
| Both services connect as superuser; RLS not forced | `identity-core-api/docker-compose.prod.yml:27` `DATABASE_USERNAME: postgres`; `V25__add_row_level_security.sql:148-149` FORCE commented out |
| User delete does not reach bio | `ManageUserService.java:372-394` calls `userRepository.delete(user)` and audits; no `BiometricServicePort` call. Bio already has `DELETE /enroll/{user_id}` (`enrollment.py:559`) and `DELETE /voice/{user_id}` (`voice.py:601`) |
| Purge job off by compose default | `identity-core-api/docker-compose.prod.yml:67` `${APP_PURGE_SOFT_DELETE_ENABLED:-false}` |
| Plaintext embedding next to ciphertext | `biometric-processor/app/infrastructure/persistence/repositories/pgvector_embedding_repository.py:30-36` |
| api→bio blocking, 30 s, no breaker | `BiometricServiceAdapter.java:57-64`; no `resilience4j` in `pom.xml` |
| Bio single process, in-memory puzzle sessions | `biometric-processor/Dockerfile:230` (no `--workers`); `puzzle_session_manager.py:197` (`self._sessions: Dict`) |
| No CSCA roots | `biometric-processor/app/core/csca_trust_store/` contains only `README.md` |
| Legacy NFC handler ignores serial-only kill-switch | `application/service/handler/NfcDocumentAuthHandler.java:40-80` (no `serial-only-auth-enabled` read) |
| Deploy not gated on CI | `identity-core-api/.github/workflows/deploy-hetzner.yml:3-15` (`on: push`, `cancel-in-progress: true`) |
| Web e2e never on PRs | `web-app/.github/workflows/e2e.yml:10-17` (schedule + dispatch only, against PROD) |
| ArchUnit baseline is 640, not 0 | `identity-core-api/archunit_store/08c0f28b-...` = 640 lines; CLAUDE.md says "0 grandfathered" |
| AuthController size | 1,569 lines today (ARCH said 1,511) |
| Privacy text overclaims | `web-app/src/i18n/locales/tr.json:1318` and `:1336` ("AES-256"; Fernet is AES-128-CBC + HMAC-SHA256), `:1322` ("VERBİS kaydı tutulmakta"), `:1336` (RLS "derinlemesine savunma") |
| No off-site backup tooling in repo | `scripts/` and `infra/` contain no rclone/restic/borg/S3 tooling |

In flight (do not re-plan; track to merge/deploy):

| Ref | Scope | State |
|---|---|---|
| identity-core-api PR #276 (`hotfix/legacy-auth-session`) | Legacy `/auth/sessions`: enforce step order and password identity (ACIK Ü7) | Open |
| Branch `ccr-451c1d59-1x5ju1` in bio (`2cdba18`, `c804a5a`, `e6c6451`), web (`ea5fee8`, `53ddd7f`), api (`13411fb`, `149a158`) | Puzzle contract v2: server trace re-scoring, security-review fixes S1-S7, real-face calibration (CAL: 116/118 whole-clip accepts, 0 photo passes), cross-repo contract test. Flag `PUZZLE_TRACE_V2_ENABLED` default OFF | Not merged, not deployed |
| identity-core-api `6d2fc47` (same branch) | CI meta-gate: counts tests minus skipped in the IT-executed gate, plus fault-injection self-test | Not merged |
| client-apps (in progress) | Android hardware key attestation so the puzzle capture and the embedding are bound by an attested device key (closes PV2 §3.2 for Android only) | Being implemented |
| web-app `fix/privacy-policy-accuracy` | Privacy policy accuracy (ACIK Ü3) | Branch exists |

Legend. Type: [CODE] [OPS] [HUMAN-DECISION] [MONEY] [LEGAL] [CERTIFICATION]. Owner: **CC** = Claude
in a cloud session (code + PR, no prod access), **SC** = server Claude (Hetzner `deploy` user),
**AU** = authors, **AD** = advisor, **CO** = company (the legal entity once it exists; the owner
until then). Effort: S (< 1 day), M (1-5 days), L (1-4 weeks), XL (> 1 month or external lead
time). Severity: Critical / High / Medium / Low. "Pts" = score points recovered on that dimension.

---

## 1. Scoring rubric: what 10/10 means

Each criterion is observable. A dimension is 10/10 only when all of its criteria hold.

### (a) Graduation project (now 9/10)

| # | Acceptance criterion |
|---|---|
| a1 | Every quantitative or security claim in the thesis and both papers maps to a file:line or a committed benchmark output; an errata list covers any claim the code contradicts (encryption at rest, liveness on the default path, NFC chip trust, KYC step reality). |
| a2 | No feature is presented as working that is a prototype: KYC steps and the NFC "ID card" are either finished or explicitly labelled prototype/possession-factor in thesis, UI and docs. |
| a3 | The two Critical security findings known at defence time (Ü7 legacy engine, Ü2 liveness pairing) are fixed and merged. |
| a4 | Paper A and Paper B submitted to a named venue, with a public reproducibility package (scripts, fixtures, commit hashes). |

### (b) Engineering / product maturity (now 5/10)

| # | Acceptance criterion |
|---|---|
| b1 | Zero open Critical/High findings from an internal review and from one external penetration test; liveness pairing enforced server-side at flow-save time and at verify time. |
| b2 | One authentication engine. The legacy `/auth/sessions` engine is deleted or proxies into `VerifyMfaStepService`. |
| b3 | Tenant isolation has a DB backstop: a non-owner, non-superuser app role per database, FORCE RLS on tenant tables, an IT that proves a missing tenant context returns zero rows, and an ArchUnit rule confining `TenantFilterBypass`. |
| b4 | Erasure is end to end: user delete and purge remove face and voice templates in bio, proven by an IT; a nightly orphan reconciliation reports 0 orphans. |
| b5 | Availability: at least two application nodes on separate hosts, replicated Postgres with automated failover, failover tested monthly (logged); SLO 99.9% measured over 90 days on an external probe. |
| b6 | Backups: daily encrypted off-site backups, quarterly restore drill with measured RPO <= 15 min and RTO <= 1 h, results committed. |
| b7 | Delivery: deploys only CI-green, digest-pinned images from a registry; build never on the prod host; one-command rollback tested; a staging environment where PR e2e runs. |
| b8 | Tests: api↔bio contract tests; the bio ML auth path runs in CI on the pinned image; no Critical path is covered only by env-gated tests. |
| b9 | Observability: alerts reach a real receiver; distributed tracing across api↔bio; a published capacity number (k6 p95 at a stated concurrency) per release. |
| b10 | Biometric evidence: browser-pipeline face accuracy measured on a standard protocol (LFW View 2, 6,000 pairs, 10-fold) plus one benchmark with >= 1,000 identities, with CIs, at the production threshold; puzzle thresholds calibrated on recorded webcam traces including hands. |
| b11 | Architecture debt bounded: ArchUnit frozen violations <= 100 and falling each release, a "domain must not depend on JPA/Spring" rule with 0 violations in `domain/`, no controller > 600 lines. |
| b12 | Flag hygiene: a machine-readable flag registry (owner, default, prod value, expiry); CI fails on an expired flag; <= 15 live flags across services. |
| b13 | Docs match code: a CI doc-claim lint guards key invariants; no known CLAUDE.md/UI claim contradicted by code. |
| b14 | Mobile: no open "server success, app failure" bug; the leaked keystore password rotated (or the signing key replaced and users migrated). |

### (c) Commercial readiness today (now 2/10)

Two scales, because the bar is different.

**10/10 for a university pilot (target, 12 months):**

| # | Acceptance criterion |
|---|---|
| c1 | Legal entity (technopark company), bank account, invoicing. |
| c2 | Contract set: MSA, DPA (processor terms), SLA with credits, acceptable use, a signed pilot agreement. |
| c3 | KVKK pack: VERBİS registration (if the entity is in scope), DPIA for biometrics, explicit-consent records, retention and destruction policy, breach-notification runbook (72 h to the Board), aydınlatma metni matching the code. |
| c4 | Data locality: production for Turkish tenants hosted in Turkey, or a notified standard contract for the Hetzner transfer (KVKK Art. 9 as amended 2024). |
| c5 | b5 + b6 delivered on that hosting; SLA backed by an external status page. |
| c6 | One external penetration test report with all High findings closed; ISO 27001 gap assessment done (certificate not required for this scale). |
| c7 | Professional liability / cyber insurance policy in force. |
| c8 | Integrator readiness: versioned API with deprecation policy, sandbox tenant, LDAP/AD and OBS (SIS) connectors, Turkish support channel with response times. |
| c9 | At least one paying institution (pilot converted to a paid contract). |

**10/10 for banks (not a 12-month target):** all of the above plus ISO/IEC 27001 certificate
(BDDK remote-identification regulation requires it from outsourced providers, PROD §2), an
ISO/IEC 30107-3 PAD Level 1 and Level 2 confirmation letter from an accredited lab, demonstrated
FAR consistent with the reported sub-1e-7 requirement (verify against the official Resmî Gazete
32276 text and the 2026 TCMB rules, PROD §2), document-validity checks with a real data source,
bank-grade procurement (security questionnaires, audits, escrow), and Turkish primary and
secondary data centres. Statistical note: showing FAR <= 1e-7 with zero observed false accepts at
95% confidence needs about 3 x 10^7 independent impostor comparisons (rule of three); the current
server LFW evaluation has 4,828 impostor pairs (FOUNDATION).

### (d) Commercial potential with focus (now 5/10)

This is a market judgement, not an engineering output. 10/10 would need:

| # | Acceptance criterion |
|---|---|
| d1 | A single focused offer ("KVKK-native campus identity") with non-core surfaces retired (PROD §6). |
| d2 | Demand evidence: >= 3 paying institutions, >= 10 qualified pipeline institutions, renewal of the first contract. |
| d3 | A defensible differentiator that is measured and, where needed, certified: browser-embedding accuracy published; puzzle + attestation binding published (Paper B); PAD lab letter if an SDK customer co-funds it. |
| d4 | Non-dilutive runway (TÜBİTAK 1512 BİGG or equivalent) and a team time commitment. |
| d5 | An addressable market large enough for 10/10: Turkish e-KYC is about USD 7M (IMARC 2024, PROD §2); a 10 requires a credible expansion path (more education segments, regional markets) backed by at least one non-Marmara customer. |

---

## 2. Gaps per dimension

Columns: ID, gap, evidence, severity, fix, type, owner, effort, depends on, pts.

### 2.1 (a) Graduation project: 9 → 10 (1.0 pt)

| ID | Gap | Evidence | Sev | Fix | Type | Owner | Eff | Dep | Pts |
|---|---|---|---|---|---|---|---|---|---|
| A1 | Thesis and docs overclaim: "embeddings stored encrypted", "liveness enforced", "NFC chip trust", "0 grandfathered" | §0 table; ARCH §5, §9.9; PROD §1 | High | Claim audit of `Thesis/FIVUCSAS_Thesis.md` against FOUNDATION + this file; publish an errata section (thesis is final as of `b8d8f58`, so errata, not rewrite) | [CODE] doc | CC drafts, AU approve | M | none | 0.3 |
| A2 | KYC steps and NFC are half-real but listed as features | PROD §1 (doc-detection judged non-functional; watchlist/address-proof have no provider; NFC prod = MIFARE UID); `csca_trust_store/` empty | Medium | Label them prototype in thesis errata, README, landing; relabel NFC as "campus card (possession)" (ACIK Ü5) | [CODE] + [HUMAN-DECISION] | CC, owner decides | S | Ü5 decision | 0.3 |
| A3 | Critical security findings open at defence | Ü7, Ü2 (§0) | Critical | Merge PR #276 (in progress); implement B1 below | [CODE] | CC, SC deploy | M | none | 0.2 |
| A4 | Papers not yet submitted | `fivucsas-papers/ROADMAP.md`, ACIK K1-K5, İ1-İ3 | Medium | Finish G1/G2 gates, venue choice (K3), dataset licences (İ1), ethics (İ2) | [HUMAN-DECISION] | AU, AD | XL | İ1, İ2, K3 | 0.2 |

### 2.2 (b) Engineering / product maturity: 5 → 10 (5.0 pts)

**Security assurance (2.0 pts)**

| ID | Gap | Evidence | Sev | Fix | Type | Owner | Eff | Dep | Pts |
|---|---|---|---|---|---|---|---|---|---|
| B1 | Embedding FACE factor accepted without any liveness factor; captured vector replayable indefinitely | `FaceVerifyMfaStepHandler.java:43-60`; bio `verification.py:605` log claims "liveness enforced upstream"; ACIK Ü2/Ü4 | Critical | (1) Flow-save validator: reject a flow where FACE is reachable via the embedding path and no PUZZLE (or image-liveness) layer precedes it in the same flow; (2) verify-time rule: FACE-embedding step fails unless the same MFA session has a verified PUZZLE step within N minutes; (3) bind the embedding to the puzzle session (`puzzle_session_id` required on `/verify-embedding` when the policy is on). Interim (human decision): set `APP_AUTH_CLIENT_SIDE_EMBEDDING=false` so FACE uses the image path with server liveness until (1)-(3) ship | [CODE] + [HUMAN-DECISION] | CC code; owner decides interim flip; SC deploys | M | none | 0.5 |
| B2 | Puzzle layer not plumbable in prod | `application-prod.yml:133-134` vs compose `environment:` lacks `APP_AUTH_PUZZLE_LAYER(_TENANTS)`; bio compose lacks `PUZZLE_TRACE_V2_ENABLED` | High | Add the vars to both compose `environment:` blocks with safe defaults (OFF) | [CODE] | CC, SC deploy | S | none | 0.1 |
| B3 | Puzzle v1 trusts client scalars; v2 not live; traces still client data | PV2 §1, §3; ACIK Ü1, Ü6 | High | v2 code done (in flight). Remaining: merge, staging validation (S4), flip (K6); record webcam traces (not stock video) and hand video for calibration; Android attestation (in flight); web attestation is not available, so document web as "raises the bar", not "bound" | [CODE] + [OPS] + [HUMAN-DECISION] | CC, SC, owner | L | in-flight branch | 0.3 |
| B4 | Legacy anonymous token-minting engine | `SecurityConfig.java:138-140`; `ExecuteAuthSessionService.java:166-188`; tokens without `amr`, refresh not client-bound (ARCH §3) | Critical | PR #276 (in progress) fixes order/identity. Then: inventory callers (SC: access logs for `/api/v1/auth/sessions`), add kill-switch `app.auth.legacy-sessions.enabled` default false, then delete the 11 legacy handlers | [CODE] + [OPS] | CC, SC | M | #276 | 0.3 |
| B5 | Legacy NFC handler ignores `serial-only-auth-enabled` | `NfcDocumentAuthHandler.java:40-80` | High | Honour the same property as `NfcDocumentVerifyMfaStepHandler`; becomes moot after B4 deletion | [CODE] | CC | S | none | 0.05 |
| B6 | No DB backstop for tenant isolation | compose `:27` superuser; V25 `:148-149`; opt-in filter `TenantFilterAspect.java:31-33`; issue #231 | High | Flyway: create `app_rw` (no superuser, not table owner) and grant DML; FORCE RLS on tenant tables; switch both services' credentials (SC); IT with missing context returns 0 rows; ArchUnit rule confining `TenantFilterBypass` to an allow-list; merge the two aspects into one | [CODE] + [OPS] | CC migration/tests; SC credential switch | L | staging (B13) | 0.3 |
| B7 | Erasure gap for Art. 9 templates; purge default shadowed | `ManageUserService.java:372-394`; compose `:67`; `SoftDeletePurgeJob` has no bio call | Critical (legal) | On delete and on purge call bio `DELETE /enroll/{user}` and `DELETE /voice/{user}` via `BiometricServicePort` (outbox row so a bio outage retries); nightly orphan reconciliation job comparing bio user ids to api users; compose default `:-true` or remove the override; IT | [CODE] | CC, SC deploy | M | none | 0.3 |
| B8 | Plaintext pgvector column beside Fernet ciphertext; one env key | `pgvector_embedding_repository.py:30-36`; `embedding_cipher.py:14` | High | Short term: honest wording everywhere (privacy text in flight, thesis errata A1), encrypt backups (B11), restrict DB access (B6). Long term: per-tenant DEKs with a KMS (or Vault transit), key rotation tool using `key_version`; evaluate dropping the ANN column for 1:1 verify (verify only needs the user's own template, decrypt-then-compare) and keep ANN only for 1:N search tenants | [CODE] + [OPS] | CC, SC | L | B6 | 0.15 |

**Availability and delivery (1.75 pts)**

| ID | Gap | Evidence | Sev | Fix | Type | Owner | Eff | Dep | Pts |
|---|---|---|---|---|---|---|---|---|---|
| B9 | Single Hetzner CX43 hosts everything | ARCH §6; PROD §4 | High | Two app nodes + managed or streaming-replicated Postgres with automated failover (Patroni or provider-managed), Redis replica; monthly failover test logged. Target hosting = Turkey (see C4), so do this once, on the target provider | [OPS] + [MONEY] | SC, CO | XL | C4 decision | 0.5 |
| B10 | Deploy not gated on CI; builds on prod host; manual rollback | `deploy-hetzner.yml:3-15`; ARCH §6 | High | `workflow_run` on CI success; build images in CI, push to GHCR by digest; deploy = pull + up; scripted rollback to previous digest; remove `cancel-in-progress` on deploy | [CODE] + [OPS] | CC workflows, SC host side | M | none | 0.3 |
| B11 | No evidenced off-site backup or restore drill | no tooling in `scripts/`, `infra/`; ARCH §6 | High | Nightly encrypted `pg_dump` (both DBs) + Redis RDB to off-site object storage (restic/age), retention 30 d; quarterly restore drill into staging with measured RPO/RTO committed | [OPS] + [MONEY] (storage, small) | SC | M | none | 0.4 |
| B12 | Unprotected sync api→bio coupling; single uvicorn worker; in-process puzzle sessions | `BiometricServiceAdapter.java:57-64`; `Dockerfile:230`; `puzzle_session_manager.py:197` | High | resilience4j circuit breaker + bulkhead around `BiometricServicePort`, verify read timeout 5-8 s; move puzzle sessions to Redis with a per-session lock (PV2 S3 caveat), then run N workers | [CODE] | CC | M | none | 0.3 |
| B13 | No staging environment; e2e only nightly against PROD | `web-app/.github/workflows/e2e.yml:10-17` | High | Ephemeral compose stack in CI (api + bio-lite + web + Postgres + Redis) for PR smoke e2e; persistent staging on the second host for release candidates | [CODE] + [OPS] | CC, SC | L | B10 | 0.25 |

**Quality and observability (0.75 pt)**

| ID | Gap | Evidence | Sev | Fix | Type | Owner | Eff | Dep | Pts |
|---|---|---|---|---|---|---|---|---|---|
| B14 | No api↔bio contract tests | ARCH §8 | Medium | Export bio OpenAPI; api test asserts every `BiometricServicePort` call path + payload schema against the committed spec; CI fails on drift (pattern exists: puzzle cross-repo contract test) | [CODE] | CC | M | none | 0.2 |
| B15 | Bio ML auth path has no CI coverage | bio CLAUDE.md P2-2 (111/161 integration tests skip) | Medium | CI job that runs the env-gated suites inside the digest-pinned prod image (`RUN_FULL_STACK_INTEGRATION=true`) with service containers | [CODE] | CC | M | none | 0.2 |
| B16 | Alerts/receivers unverified; no tracing; no capacity number | ARCH §6; `load-tests/results/` templates only | Medium | Verify Alertmanager receivers (SC); OpenTelemetry traces api→bio; k6 run on staging (ACIK S2) with p50/p95/p99 committed per release | [CODE] + [OPS] | CC, SC | M | B13 | 0.35 |

**Architecture, scope, docs, mobile, evidence (1.5 pts)**

| ID | Gap | Evidence | Sev | Fix | Type | Owner | Eff | Dep | Pts |
|---|---|---|---|---|---|---|---|---|---|
| B17 | Hexagonal debt: 640 frozen violations; 1,569-line AuthController; domain imports JPA | `archunit_store/08c0f28b-...` (640); ARCH §3 | Medium | Add "domain must not depend on JPA/Spring" rule (freeze current), split AuthController by concern, ratchet the store down each release; target <= 100 | [CODE] | CC | L | B4 (deleting legacy engine removes many) | 0.3 |
| B18 | Flag sprawl (~45 flags), dead code (`SimpleAPIKeyMiddleware`, two tenant aspects, `voice_enrollments` in identity_core, unconsumed bio routes) | ARCH §7 | Medium | Flag registry (`flags.yaml` per repo: owner, default, prod value, expiry) + CI check; delete dead middleware; drop unused `voice_enrollments` table in api via Flyway; move bio `voice_enrollments` creation into Alembic; prune unconsumed bio route groups behind a deprecation window | [CODE] + [HUMAN-DECISION] (which routes to drop) | CC, owner | L | B4 | 0.3 |
| B19 | Doc/code drift is systemic | §0 table (Hostinger vs Hetzner, 0 vs 640, API-key middleware, encryption) | Medium | Fix CLAUDE.md files now; CI doc-claim lint (grep-based assertions: no "AES-256" in privacy text, middleware registered if documented, archunit count matches doc) | [CODE] | CC | S | none | 0.2 |
| B20 | Browser embedding (prod default) accuracy unmeasured; server numbers non-standard (64-identity enroll/probe, threshold 0.45 vs prod 0.40); weak pose/age robustness (CFP-FP EER ~27%, AgeDB ~34%) | FOUNDATION:43-46, :105-123; PROD §4 | High | Headless harness that runs the real web aligner + Facenet512 ONNX on LFW View 2 (6,000 pairs, 10-fold) and one >= 1,000-identity set (e.g. CFP-FP full, or a licensed IJB-C), report EER, TAR@FAR 1e-3/1e-4, CIs, at threshold 0.40; compare to server pipeline | [CODE] + [HUMAN-DECISION] (dataset licences) | CC harness; AU run/licence | L | İ1 for licensed sets | 0.3 |
| B21 | Mobile: open "server 200, app shows failed"; refresh never retries the 401'd request; QR approve swallows non-2xx; no `UserDevice` row; keystore password leaked | client-apps CLAUDE.md "OPEN (Phase 0)"; FIVUCSAS CLAUDE.md post-demo backlog #1/#2/#15; GitGuardian #29836028 | High | Code fixes for refresh-retry, `isSuccess()` guard, device row; adb logcat capture by a developer for the 200→failed bug; rotate keystore (new upload key via Play App Signing if applicable) | [CODE] + [OPS] + [HUMAN-DECISION] | CC code; AU device logs; owner rotation | M | device access | 0.2 |
| B22 | Second mobile login model (native `/auth/mfa/step` vs AppAuth hosted) | ARCH §2 (`AuthApi.kt:27`, `HostedAuthManager.kt`) | Low | Decide one model; if hosted-first, retire native MFA after parity | [HUMAN-DECISION] + [CODE] | owner, CC | L | B21 | 0.2 |

Sum (b): 2.0 + 1.75 + 0.75 + 1.5 = 6.0 listed, capped at 5.0 recovered (some overlap is
intentional: B9 and C4 are one migration).

### 2.3 (c) Commercial readiness: 2 → 10 (8.0 pts, university-pilot scale)

Code alone cannot pass this dimension. Items without a source for cost are marked "quote needed";
no figure has been invented.

| ID | Gap | Evidence | Sev | Fix | Type | Owner | Eff | Dep | Pts |
|---|---|---|---|---|---|---|---|---|---|
| C1 | No legal entity, bank account, invoicing | PROD §4 | Blocker | Incorporate inside a technopark (Marmara or İTÜ ARI) for tax exemption; cost: formation fees + accountant, quote needed | [LEGAL] + [MONEY] + [HUMAN-DECISION] | owner, AU | L | team commitment | 1.0 |
| C2 | No MSA, DPA, SLA, pilot agreement | PROD §4 | Blocker | Lawyer-drafted Turkish contract set; SLA tied to b5 metrics | [LEGAL] + [MONEY] | CO | L | C1 | 0.75 |
| C3 | KVKK: no VERBİS, DPIA, retention policy, breach runbook; UI claims VERBİS | `tr.json:1322`; PROD §2, §4 | Blocker | Ship privacy text fix (in flight, `fix/privacy-policy-accuracy`); draft DPIA, retention/destruction policy (B7 makes it true technically), breach runbook; VERBİS registration once the entity exists | [LEGAL] + [CODE] (text) | CC drafts; CO/lawyer sign | M | C1 | 1.0 |
| C4 | Hetzner (Germany) hosting = cross-border transfer of special-category data | PROD §2 (KVKK Art. 9 as amended 2024, 5-business-day notification for standard contracts) | Blocker | Decision: (a) move Turkish tenants to a Turkish provider (PROD §6 suggests Turkcell/TT data centres; pricing quote needed), or (b) interim notified standard contract with Hetzner. Do B9 HA on the chosen provider | [HUMAN-DECISION] + [LEGAL] + [MONEY] + [OPS] | owner, SC | XL | C1 | 1.0 |
| C5 | No HA, no off-site backup, no SLA-backing status | B9, B11 | High | Deliver B9, B11; public status page tied to SLA | [OPS] + [MONEY] | SC | XL | C4 | 0.75 |
| C6 | No external penetration test; no ISO 27001 work | PROD §4; thesis mentions pentest, no report | High | Third-party pentest, about ₺150-300k (PROD §6), after Phase 0 Critical fixes land; ISO 27001 gap assessment (cost: quote needed); certificate deferred to Phase 2+ | [CERTIFICATION] + [MONEY] | CO | L | B1, B4, B7 | 0.75 |
| C7 | No liability / cyber insurance | PROD §4 | High | Professional liability + cyber policy (quote needed) | [MONEY] + [LEGAL] | CO | M | C1 | 0.5 |
| C8 | Integrator gaps: no API versioning/deprecation policy, sandbox tenant, server SDKs, LDAP/AD, OBS connector, support channel | PROD §4, §3 niche A | Medium | `/api/v1` stability policy + changelog; sandbox tenant automation; LDAP/AD federation (Keycloak-style user federation) and OBS export/import connector; Turkish support mailbox with response targets | [CODE] + [OPS] | CC code; CO support | L | none | 0.75 |
| C9 | Accuracy evidence too thin to sell | B20 | High | B20 results published in a one-page Turkish datasheet with honest limits | [CODE] + [HUMAN-DECISION] | CC, AU | L | B20 | 0.25 |
| C10 | No paying customer | PROD §3, §6 | Blocker | Free Marmara pilot (one faculty: SSO + exam/attendance) → paid contract by month 9 | [HUMAN-DECISION] + [LEGAL] | owner, AD (intro), CO | XL | C1-C5 | 1.25 |

Sequence (c): C1 → C3 (text now, registration after C1) → C4 decision → C2 → C5 on chosen hosting
→ C6 pentest → C7 → C10 conversion. C8, C9 run in parallel from Phase 1.

**Bank grade (out of 12-month scope, listed so nobody plans it implicitly):**

| Requirement | Cost / source | Comment |
|---|---|---|
| ISO/IEC 27001 certificate | quote needed (not sourced in PROD) | Required of outsourced providers by the BDDK remote-ID regulation (PROD §2, Lexpera) |
| ISO/IEC 30107-3 PAD Level 1 and 2 letter (iBeta or another accredited lab) | reportedly USD 20-60k (PROD §3, nivratti playbook, unverified) | Needs a fused server-side PAD on the image path; the embedding path has no image, so PAD testing applies only to an image-based mode |
| FAR consistent with sub-1e-7 face-comparison requirement | statistical cost: ~3 x 10^7 impostor comparisons (rule of three) | Verify the requirement in Resmî Gazete 32276 and 2026 TCMB rules (PROD §2) |
| Document validity (MRZ + chip PA with CSCA roots, NVİ/KPS query) | CSCA roots: operator action; KPS access: regulated | CSCA store empty today |
| Turkish primary + secondary data centres, bank procurement, audits | quote needed | Relationship-driven market with incumbents (Techsign, Paramtech idnext, PROD §2) |

### 2.4 (d) Commercial potential: 5 → 10 (5.0 pts)

| ID | Gap | Evidence | Sev | Fix | Type | Owner | Eff | Dep | Pts |
|---|---|---|---|---|---|---|---|---|---|
| D1 | No focus: IAM + biometrics + KYC + SDK + fintech messaging | ARCH §1; PROD §6 | High | Commit to "KVKK-native campus identity"; retire KYC/fintech messaging from landing and docs; freeze non-core surfaces | [HUMAN-DECISION] + [CODE] (site copy) | owner, CC | S | none | 0.75 |
| D2 | No runway | PROD §3 niche D | High | TÜBİTAK 1512 BİGG (historically ~₺200k grant, current amounts unverified, PROD §3) + technopark exemption; 1501/1507 later | [MONEY] + [LEGAL] | AU, AD | L | C1 | 1.0 |
| D3 | No demand evidence | PROD §6 | Blocker | Marmara pilot (C10); faculty-network intros to 3-5 universities and vocational schools; ULAKBİM events; LOIs | [HUMAN-DECISION] | owner, AD | XL | C10 | 1.5 |
| D4 | Differentiator not measured/certified | PROD §1 (browser accuracy unmeasured; randomised challenge-response already productised) | Medium | B20 published; Paper B with attestation-based binding (Android, in flight); PAD letter only if an SDK customer co-funds | [CODE] + [CERTIFICATION] | AU, CC | L | B3, B20 | 1.0 |
| D5 | Small addressable market | IMARC ~USD 7M Turkish e-KYC 2024 (PROD §2) | Structural | After 3 paid institutions, test one adjacent segment (vocational schools, private K-12, municipalities via open-core niche B) or one regional market; without this, the honest ceiling for (d) is about 7-8/10 | [HUMAN-DECISION] | owner | XL | D3 | 0.75 |

---

## 3. What code cannot fix (honest boundary)

- (a) reaches 10 with code + papers + errata; the human gates are dataset licences (İ1), ethics
  approval (İ2) and venue choice (K3).
- (b) reaches about 8 with code alone (B1-B8, B10, B12-B21). The last 2 points need hosting money
  and an operator (B9, B11, staging) and an external pentest (C6, shared with (c)).
- (c) cannot pass 3-4 with code. Every Blocker in 2.3 is legal, financial or commercial. For a
  university pilot the minimum spend is: company formation, lawyer for the contract set and KVKK
  pack, Turkish hosting for two nodes + managed Postgres + off-site storage, one pentest
  (₺150-300k, PROD §6), insurance. All but the pentest need quotes; obtain three each.
- (d) is capped by market size (D5) and by demand that only selling can prove. No engineering
  output moves it past about 6 on its own.

---

## 4. Sequenced plan

### Phase 0: this week, code only, Claude in cloud sessions (PRs; SC deploys)

| # | Task | Gap | Repo |
|---|---|---|---|
| P0-1 | Liveness pairing: flow-save validator + verify-time rule + `puzzle_session_id` binding on `/verify-embedding` (behind a policy flag that is ON whenever client embedding is ON) | B1 | identity-core-api, biometric-processor |
| P0-2 | Plumb `APP_AUTH_PUZZLE_LAYER`, `APP_AUTH_PUZZLE_LAYER_TENANTS` (api) and `PUZZLE_TRACE_V2_ENABLED` (bio) into compose `environment:` blocks, defaults OFF | B2 | identity-core-api, biometric-processor |
| P0-3 | Legacy engine kill-switch `app.auth.legacy-sessions.enabled` (default false, after SC confirms no callers) on top of PR #276; legacy NFC handler honours serial-only switch | B4, B5 | identity-core-api |
| P0-4 | Erasure chain: delete + purge call bio template deletion via outbox; orphan reconciliation job; fix compose purge default; IT | B7 | identity-core-api |
| P0-5 | Circuit breaker + bulkhead + 8 s verify timeout around `BiometricServicePort` | B12 (part) | identity-core-api |
| P0-6 | Deploy gated on CI success (`workflow_run`), CI builds and pushes images to GHCR by digest; deploy script pulls by digest | B10 (code part) | identity-core-api, biometric-processor, web-app |
| P0-7 | api↔bio contract test (bio OpenAPI snapshot + api schema assertions) | B14 | identity-core-api, biometric-processor |
| P0-8 | ArchUnit: confine `TenantFilterBypass`; add "domain must not depend on JPA" (frozen); merge duplicate tenant aspects | B6 (code part), B17 | identity-core-api |
| P0-9 | Remove dead `SimpleAPIKeyMiddleware`; flag registry file + CI expiry check | B18 | biometric-processor, identity-core-api, web-app |
| P0-10 | Fix CLAUDE.md drift + doc-claim lint in CI | B19 | all |
| P0-11 | Mobile: refresh retry of the 401'd request, `isSuccess()` guard on QR approve, create `UserDevice` row on login | B21 (code part) | client-apps |
| P0-12 | Thesis errata draft + NFC relabel copy (EN/TR i18n) | A1, A2 | FIVUCSAS, web-app |
| P0-13 | Browser-embedding LFW View 2 harness (headless, real web aligner + ONNX) | B20 | web-app (or fivucsas-papers bench) |

Exit criteria Phase 0: PR #276 merged; P0-1..P0-4 merged with tests green; the in-flight puzzle v2
branch, CI meta-gate (`6d2fc47`) and privacy-policy branch merged; SC has run ACIK S5 (prod flag
values confirmed) and logged whether `/api/v1/auth/sessions` had real callers; owner decided the
interim client-embedding flip (B1).

### Phase 1: 1-3 months

- Ops (SC): off-site encrypted backups + first restore drill (B11); persistent staging on a second
  host (B13); registry-based deploys live (B10); Alertmanager receivers verified; k6 capacity run
  (B16, ACIK S2); FORCE RLS + `app_rw` credential switch on staging then prod (B6).
- Puzzle: v2 on staging (ACIK S4), webcam and hand recordings for calibration (B3), flip in prod
  after K6; Android attestation merged.
- Evidence: browser accuracy numbers on LFW View 2 + one >= 1,000-identity set (B20); Turkish
  datasheet (C9).
- Code: Redis puzzle sessions + gunicorn workers (B12); ML-path CI (B15); delete legacy engine
  (B4); start AuthController split (B17).
- Business/legal: incorporate (C1); BİGG application (D2); privacy text, DPIA, retention policy,
  breach runbook drafted (C3); hosting decision for Turkish tenants (C4); Marmara pilot scope
  letter (C10).
- Papers: K1-K5 decided, İ1/İ2 filed, G1 gate passed (A4).

Exit criteria Phase 1: restore drill RPO/RTO measured and committed; staging runs PR e2e; puzzle
v2 ON in prod or a documented reason it is not; browser accuracy published; company exists; BİGG
submitted; hosting decision signed; (b) re-scored at >= 8.

### Phase 2: 3-12 months

- Hosting: two-node HA + replicated Postgres in Turkey, monthly failover tests, 90-day SLO
  measurement (B9, C4, C5).
- Security: external pentest, High findings closed (C6); per-tenant DEKs + KMS, decide on ANN
  column for 1:1 verify (B8); ISO 27001 gap assessment.
- Contracts: MSA/DPA/SLA signed with Marmara (C2); VERBİS registration (C3); insurance (C7).
- Product: LDAP/AD + OBS connectors, sandbox tenant, API deprecation policy (C8); mobile login
  model unified (B22); architecture ratchet <= 100 (B17); flags <= 15 (B18).
- Commercial: pilot converted to paid by month 9 (C10); 3-5 more institutions pitched, >= 2 more
  paying by month 12 (D3); adjacent segment test after the third customer (D5).
- Papers submitted (A4).

Exit criteria Phase 2: (a) 10, (b) 10 per rubric, (c) 10 on the university-pilot scale (one or
more paying institutions, signed contract set, Turkish HA hosting, pentest clean), (d) re-scored
on evidence (expected 7-8 without D5 expansion).

---

## 5. Gap → GitHub issue map

"Claude can start" = a cloud-session Claude can open a PR today without prod access, money or a
human decision.

| Gap | Issue title | Repo | Type | Claude can start |
|---|---|---|---|---|
| B1 | Enforce liveness pairing for client-embedding FACE (flow validator + verify-time rule + puzzle-session binding) | identity-core-api | CODE | Yes |
| B1 | Require `puzzle_session_id` on `/verify-embedding` when pairing policy is on | biometric-processor | CODE | Yes |
| B1 | Decide interim: turn `APP_AUTH_CLIENT_SIDE_EMBEDDING` off until pairing ships | FIVUCSAS | HUMAN-DECISION | No |
| B2 | Plumb `APP_AUTH_PUZZLE_LAYER(_TENANTS)` into prod compose | identity-core-api | CODE | Yes |
| B2 | Plumb `PUZZLE_TRACE_V2_ENABLED` into prod compose | biometric-processor | CODE | Yes |
| B3 | Record webcam + hand traces and recalibrate puzzle v2 thresholds | biometric-processor | CODE/HUMAN | No (needs recordings) |
| B3 | Stage, validate and flip puzzle contract v2 | biometric-processor | OPS | No (SC) |
| B4 | Kill-switch then delete legacy `/auth/sessions` engine (follow-up to #276) | identity-core-api | CODE | Yes |
| B4 | Audit prod access logs for `/api/v1/auth/sessions` callers and abuse | identity-core-api | OPS | No (SC) |
| B5 | Legacy NFC handler must honour `serial-only-auth-enabled` | identity-core-api | CODE | Yes |
| B6 | Non-superuser `app_rw` role + FORCE RLS + missing-context IT (supersedes #231 scope) | identity-core-api | CODE | Yes (migration/tests) |
| B6 | ArchUnit: confine `TenantFilterBypass`; merge duplicate tenant aspects | identity-core-api | CODE | Yes |
| B6 | Switch both services to least-privilege DB roles | FIVUCSAS (infra) | OPS | No (SC) |
| B7 | Propagate user delete/purge to bio template deletion (outbox) + orphan reconciliation | identity-core-api | CODE | Yes |
| B7 | Fix compose default shadowing `APP_PURGE_SOFT_DELETE_ENABLED` | identity-core-api | CODE | Yes |
| B8 | Per-tenant DEKs, KMS, key rotation tool; evaluate dropping plaintext ANN column for 1:1 verify | biometric-processor | CODE/OPS | Yes (design + code) |
| B9 | Two-node HA with replicated Postgres and monthly failover test | FIVUCSAS (infra) | OPS/MONEY | No |
| B10 | Gate deploys on CI success; build and push images to GHCR by digest | identity-core-api | CODE | Yes |
| B10 | Same for bio | biometric-processor | CODE | Yes |
| B10 | Same for web | web-app | CODE | Yes |
| B11 | Nightly encrypted off-site backups + quarterly restore drill | FIVUCSAS (infra) | OPS | No (script: Yes; run: SC) |
| B12 | resilience4j circuit breaker + bulkhead + shorter timeouts for `BiometricServicePort` | identity-core-api | CODE | Yes |
| B12 | Move puzzle sessions to Redis with per-session lock; run multiple workers | biometric-processor | CODE | Yes |
| B13 | Ephemeral compose stack for PR e2e smoke | web-app | CODE | Yes |
| B13 | Persistent staging environment | FIVUCSAS (infra) | OPS | No |
| B14 | api↔bio contract tests from bio OpenAPI snapshot | identity-core-api | CODE | Yes |
| B15 | Run env-gated ML integration suites in CI on the pinned image | biometric-processor | CODE | Yes |
| B16 | OpenTelemetry tracing api→bio | identity-core-api | CODE | Yes |
| B16 | Verify alert receivers; publish k6 capacity per release | FIVUCSAS (monitoring) | OPS | No |
| B17 | Add domain-must-not-depend-on-JPA ArchUnit rule; split AuthController; ratchet store <= 100 | identity-core-api | CODE | Yes |
| B18 | Flag registry with owner/expiry + CI check | identity-core-api | CODE | Yes |
| B18 | Flag registry + delete dead `SimpleAPIKeyMiddleware` + Alembic owns `voice_enrollments` | biometric-processor | CODE | Yes |
| B18 | Drop unused `voice_enrollments` in identity_core (Flyway) | identity-core-api | CODE | Yes |
| B18 | Decide which unconsumed bio route groups to retire | biometric-processor | HUMAN-DECISION | No |
| B19 | Fix CLAUDE.md drift + doc-claim lint | FIVUCSAS | CODE | Yes |
| B20 | Browser-embedding accuracy harness on LFW View 2 + >= 1,000-identity set | web-app | CODE | Yes (harness) |
| B21 | Retry the 401'd request after refresh; `isSuccess()` guard on QR approve; create `UserDevice` row | client-apps | CODE | Yes |
| B21 | Capture adb logcat for "server 200, app shows failed" | client-apps | HUMAN | No |
| B21 | Rotate leaked Android keystore password (GitGuardian #29836028) | client-apps | OPS/HUMAN | No |
| B22 | Choose one mobile login model (hosted AppAuth vs native MFA) | client-apps | HUMAN-DECISION | No |
| A1 | Thesis errata: encryption, liveness default path, NFC trust, ArchUnit baseline | FIVUCSAS | CODE (doc) | Yes (draft) |
| A2 | Relabel NFC as campus-card possession factor; mark KYC steps prototype | web-app | CODE | Yes (after Ü5 decision) |
| A4 | Submit Paper A and Paper B with reproducibility package | fivucsas-papers (local) | HUMAN | No |
| C1 | Incorporate in a technopark | FIVUCSAS | LEGAL/MONEY | No |
| C2 | Contract set: MSA, DPA, SLA, pilot agreement | FIVUCSAS | LEGAL | No |
| C3 | KVKK pack: DPIA, retention/destruction policy, breach runbook, VERBİS | FIVUCSAS | LEGAL | Partial (drafts: Yes) |
| C4 | Decide Turkish hosting vs notified standard contract for Hetzner | FIVUCSAS | HUMAN-DECISION/LEGAL | No |
| C6 | Commission external penetration test after Phase 0 fixes | FIVUCSAS | CERTIFICATION/MONEY | No |
| C7 | Liability + cyber insurance | FIVUCSAS | MONEY/LEGAL | No |
| C8 | API stability/deprecation policy + sandbox tenant | identity-core-api | CODE | Yes |
| C8 | LDAP/AD federation + OBS connector | identity-core-api | CODE | Yes (after scoping with Marmara IT) |
| C9 | Turkish accuracy and security datasheet | FIVUCSAS | CODE (doc) | After B20 |
| C10 | Marmara pilot agreement and conversion plan | FIVUCSAS | HUMAN/LEGAL | No |
| D1 | Retire KYC/fintech messaging from landing and docs | landing-website / docs-site | CODE | Yes (after decision) |
| D2 | TÜBİTAK 1512 BİGG application | FIVUCSAS | MONEY/LEGAL | No |

Phase 0 code tasks Claude can start immediately: P0-1 through P0-13 in §4 (issue rows above marked
"Yes" whose gap is B1, B2, B4, B5, B6 code part, B7, B10, B12 breaker, B14, B17 rule, B18, B19,
B20 harness, B21 code part, A1 draft).
