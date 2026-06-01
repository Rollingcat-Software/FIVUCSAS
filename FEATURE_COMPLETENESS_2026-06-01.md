# FIVUCSAS — Feature Completeness Truth-Table

**Date:** 2026-06-01
**Audience:** Operator preparing the university demo (Thu/Fri)
**Scope:** 144 claimed features across 13 groups (G1–G13), verified against current HEAD + prod runtime config + live HTTP/container probes.

This is the **feature truth-table**. Its purpose is a zero-accident demo: show only what genuinely works, live-test the uncertain set with a real account beforehand, and never state a claim the code cannot back. Each feature carries one verdict.

### Verdict legend

| Verdict | Meaning |
|---|---|
| `works` | Built, wired, deployed, evidence-backed. Demoable (some need a live account — see `needsLiveTest`). |
| `likely-works` | Code path real + wired, not byte-confirmed end-to-end in this audit. |
| `partial` | Real feature with a material claim-vs-reality gap (count wrong, layer missing, advisory-only, etc.). |
| `dormant-flag-off` | Code complete but intentionally OFF in prod via env flag. |
| `not-built` | No implementation — design doc or stub only. |
| `unverifiable` | Claim traces to a committed artifact but was not independently re-derived. |
| `demo-only-by-design` | A self-authored package/commitment, NOT an external result/certification. |

`demoSafe` = may be shown on stage (`yes` / `caveat` / `no`). `needsLiveTest` = a separate track must exercise it with a test account before it is assumed working.

---

## 1. Executive scoreboard

| Verdict | Count |
|---|---|
| works | 96 |
| partial | 21 |
| likely-works | 7 |
| dormant-flag-off | 3 |
| not-built | 4 |
| unverifiable | 1 |
| demo-only-by-design | 1 |
| **Total** | **133 line-items / 144 claimed features** |

> Note: G6 collapses ~20 amispoof analyzers into shared rows, so the line-item count (133) is below the 144 headline; the verdict tally above counts every rendered line-item.

**Honest assessment.** The platform is genuinely demo-ready, and substantially more real than typical student work: 96 features are fully built, wired, deployed, and probe-confirmed in production today (api + bio containers healthy, rebuilt within the hour, OIDC discovery/JWKS public-200, all 12 auth methods live in Marmara's config, SMTP + Twilio Verify fully configured). The honest risk is **not** that things are broken — it is **overclaiming**: a handful of headline numbers are wrong (verification "9 steps / 7 templates" is really ~10 handlers / 5 templates; poster CASIA/iBeta/ACER figures are self-computed or aspirational, not certified), several advanced layers are dormant by flag (pairwise sub, the multi-layer spoof fusion pipeline, demographics), a few claimed surfaces don't exist (iOS app, npm packages, mobile hand-tracking/puzzles, BYOD), and "RLS isolation" is actually app-layer Hibernate `@Filter` (Postgres RLS is inert in prod). If the operator demos the 96 `works` features and speaks precisely about the gaps, the demo is safe and impressive. The danger is a confident sentence the code can't back.

---

## 2. DEMO-SAFE list (works / likely-works AND demoSafe = yes)

These can be shown on stage. Items marked † still benefit from a pre-demo live test (see Section 4).

**Auth methods (G1):** PASSWORD `#1`, EMAIL_OTP `#2`†, TOTP `#4`†, QR_CODE `#5`†, FINGERPRINT/WebAuthn `#8`†, PASSKEY `#11`†, APPROVE_LOGIN `#12`†.

**MFA / flows (G2):** N-step dispatcher `#13`†, amr claims `#14`†, per-tenant flows `#15`†, CHOICE steps `#16`, auth-flow builder UI `#17`†, identifier-first preflight `#18`, config-driven engine `#19`, **arbitrary first-factor `#20`**†.

**OAuth/OIDC (G3):** hosted login page `#22`†, /authorize `#23`, /token `#24`†, /userinfo `#25`†, PKCE `#26`, JWKS `#27`, discovery `#28`, refresh rotation+reuse-detect `#29`†, client mgmt + secret rotation `#31`†, pairwise-sub dormant-by-design `#30`.

**Verification pipeline (G4):** YOLO doc detection `#34`†, client-side card-type onnx `#35`, MRZ TD1/TD3 parser `#36`.

**Biometric (G5):** face enroll `#39`†, verify 1:1 `#40`†, search 1:N pgvector `#41`†, 8-stage pipeline `#42`, quality scoring `#43`, aged threshold `#44`, 468-pt landmarks `#45`, Facenet-512 `#46`, voice verify 256-D `#48`†, client passive-liveness `#51`†, pgvector prod `#52`.

**amispoof (G6):** in-browser tester `#56`†, session verdict `#57`, LivenessProver `#58`, ~16 core analyzers `#59-74`†, Pose3D `#59-74`†, FaceUsabilityGate `#75`, IlluminationGate `#76`, CriticalRegionVisibilityGate `#77`, ReadinessGate `#78`†.

**Multi-tenancy (G7):** per-tenant auth flows `#84`, tenant mgmt `#85`, **tenant switcher (ROOT) `#86`**†, email-domain enforce `#87`†, self-onboarding `#89`†.

**Identity/linking (G8):** person/identity layer `#90`, /identity/me `#92`†, ROOT unification `#95`. (membership switch `#94` and link/unlink `#91`/consent `#93` are demoSafe=caveat — see G8 table.)

**Dashboard/admin (G9):** user CRUD `#96`†, My Profile `#97`†, enrollments `#98`†, sessions `#99`†, audit logs `#100`†, roles/RBAC `#101`†, auth-flow builder `#102`†, self-service onboarding `#103`†, **guest invite + accept-invite page `#105`**†, biometric surfaces `#106`, stats `#107`†.

**SDK (G10):** CDN SDK `#108`, loginRedirect `#110`†, handleRedirectCallback `#111`†, destroy `#112`, web component `#113`†, CustomEvents `#114`, constructor options `#115`, demo-origin iframe `#118`. (verify() `#109` is caveat.)

**Mobile (G11):** Android app + all 10 methods `#120`†, on-device capture `#122`†, standalone TOTP `#123`, sessions+GDPR export `#124`†, QR display+scanner `#126`†, **signed release APK `#130`**.

**Compliance (G12):** GDPR/KVKK export `#131`†, right-to-erasure purge `#132`, no-hard-delete trigger `#133`, encryption-at-rest `#134` (caveat).

**Ops (G13):** status page `#136`, Swagger admin-gate `#137`, i18n EN/TR `#140`†, self-host compose `#142`†, 9-subdomain ecosystem `#143`, BYS demo `#144`†.

---

## 3. NEEDS LIVE TEST before demo (`needsLiveTest = true`)

A separate track must exercise each of these with a real test account / device before they are assumed working. Do **not** treat them as proven by code alone.

`#2` EMAIL_OTP (real inbox delivery), `#3` SMS_OTP (real Twilio number), `#4` TOTP (enrolled authenticator), `#5` QR_CODE (mobile scan round-trip), `#6` FACE (live capture passes liveness), `#7` VOICE (live sample), `#8` FINGERPRINT (platform authenticator), `#9` HARDWARE_KEY (needs physical key — see gaps), `#10` NFC_DOCUMENT (enrolled card tap), `#11` PASSKEY (discoverable get()), `#12` APPROVE_LOGIN (approver device loop), `#13` N-step token mint, `#14` amr (decode minted token), `#17` builder CRUD round-trip, `#20` non-password first factor, `#22` hosted login MFA-to-code, `#24` real code→token, `#25` userinfo claims, `#29` family-revoke multi-refresh, `#31` rotate-secret w/ admin token, `#34` YOLO live frame, `#37` TC Kimlik OCR field capture, `#38` selfie↔doc cosine happy-path, `#39`/`#40`/`#41` face enroll/verify/search live, `#48` voice end-to-end, `#49` live face >0.4 floor, `#50` spoof block, `#51` client gate refuses non-live, `#56` webcam→verdict, `#59-74` core analyzers fusion, `#59-74` Flash probe, `#59-74` Pose3D, `#78` ReadinessGate blocking UX, `#79`–`#81` poster metrics on demo machine, `#83` cross-tenant isolation, `#86` switcher no-leak, `#87` off-domain reject, `#89` register→verify-email loop, `#91` link/unlink OTP, `#92` /identity/me body, `#93` cross-tenant consented verify, `#94` switch-membership token exchange, `#96`–`#107` (most authed dashboard pages), `#104` DNS-TXT owned domain, `#109` iframe MFA, `#110`/`#111` token round trip, `#113` web-component verify, `#119` multi-platform reach, `#120`/`#121`/`#122`/`#124`/`#126` mobile flows, `#125` approve-login polling, `#127` desktop run, `#129` mobile liveness, `#131` export download, `#140` i18n click-through, `#142` clean-room compose up, `#144` BYS OIDC round-trip.

---

## 4. GAPS / DO-NOT-DEMO — the tomorrow fix-list

Every `partial` / `not-built` / `dormant-flag-off` / `unverifiable` / `demo-only-by-design` feature. **Sorted by fixEffort, then by severity of the claim-gap.** `demoSafe=no` rows must not be shown at all.

### fixEffort = small

| id | feature | verdict | demoSafe | claim → reality (the gap) |
|---|---|---|---|---|
| `#9` | HARDWARE_KEY (FIDO2) | partial | **no** | Code complete + reachable, but **no physical YubiKey purchased** (ROADMAP G1 "awaiting hardware"). Cannot demo end-to-end. |
| `#20` | arbitrary first-factor | works | yes | Feature **works** (live `/auth/login/begin`→200). But `identity-core-api/CLAUDE.md` + `web-app/CLAUDE.md` still say it's "DEAD/future" — correct the stale doc so the operator isn't confused mid-demo. |
| `#50` | anti-spoofing enabled | partial | caveat | DeepFace + UniFace passive **do** block spoofs on `/verify`. But the **advanced fusion pipeline is dormant** (`ANTISPOOF_USABILITY_GATE/FUSION/CUTOUT/DEVICE_RISK=false`, EAR-veto off) so the advertised `ANTISPOOF_BLOCK_ENFORCE` 403 path **never fires**. Don't claim the full multi-layer pipeline is live. |
| `#19` | config-driven engine | works | yes | Cosmetic: `.env.prod` comment says "CANARY: Marmara only" but the flag is **GLOBAL-ON** for all tenants. Misleading comment, not a bug. |
| `#30` | pairwise sub | dormant-flag-off | yes | Intentionally OFF (`subject_types=[public]`). If asked to demo pairwise, requires flipping the flag + setting `pairwise-salt` (not done). |
| `#59-74` | HandTracking / Audio / BackgroundMotion | dormant-flag-off | caveat | **Opt-in, OFF by default.** Not part of the default verdict. README's "23 analyzers" count includes these. Honest answer if asked: "off by default." |
| `#59-74` | Flash (Reflection/Temporal) | partial | caveat | Active opt-in challenge in the demo driver only, **not** passive fusion. Only quantified accuracy is AUC **0.5685 (≈random)**. Click it, but do **not** call it a measured detector. |
| `#79` | poster CASIA AUC 0.945 | unverifiable | caveat | Traces to a committed JSON but **not re-derived**; fuser weights are heuristic, not a swept sweep. Present as "our measured zero-shot AUC on a public mirror," never as benchmarked SOTA. |
| `#80` | poster latency / bundle | likely-works | caveat | ~173kB plausible; per-analyzer "sub-2ms" is a code comment, not measured. Quote latency only after a live run on the demo machine. |
| `#81` | poster ISO 30107-3 ACER | partial | caveat | Metric machinery real + tested, but this is **self-computed**, not iBeta/ISO-certified. CelebA ACER 28.67% is weak; in-house values "biased low, indicative only." |
| `#21` | set-default lockout guardrail | partial | caveat | Advisory **warning only** — server does **not block** a lockout-inducing default. Safe to SHOW the warning dialog; do **not** commit a risky default mid-demo. |
| `#115` | SDK constructor theming | works | yes | Only `theme.mode` + `locale` forwarded to the iframe; `primaryColor/borderRadius/fontFamily` declared but not plumbed. Mode+locale work. |
| `#116` | SDK error codes | partial | yes | No documented error-code taxonomy — only 3 explicit codes + `UNKNOWN` fallback + OAuth passthrough. Don't claim a rich error catalog. |
| `#118` | inline iframe gating | works | yes | Works; minor: nginx sets both permissive `frame-ancestors` and `X-Frame-Options: DENY` (modern browsers prefer CSP — demo works; legacy browsers would block). |
| `#120` | Android all-10 | works | yes | Built APK is **1 commit behind** the stale-connection MFA-retry fix; flaky stage network could abort a request. |
| `#127` | Desktop app | partial | caveat | Real client, but the built jar is **thin (no Compose classes)** — not double-clickable, no signed `.deb/.msi`. Run via `gradlew :desktopApp:run` from the dev machine; can't hand a professor an installer. |
| `#134` | encryption-at-rest | works | caveat | New writes always encrypted. **Legacy pre-V39 rows** are dual-read-tolerated as plaintext (`migrate-on-boot=false`); embedding-backfill run-status unverifiable. Not demo-visible. |
| `#138` | OpenAPI public JSON | partial | caveat | Claimed `/identity/openapi.json` **401s (doesn't exist)**. The real public spec is **`/api-docs` (200)**. Correct the link/docs or add a Traefik alias. |
| `#139` | observability | partial | caveat | **No Prometheus** (Loki logs only). Grafana has **no public DNS** (NXDOMAIN) — VPN-only. Drop "Prometheus" wording or add a metrics scrape. |
| `#140` | i18n EN/TR | works | yes | Toggle no-ops only on surfaces that intentionally omit the launcher (verify/amispoof/links). Core surfaces toggle correctly. |
| `#141` | unified launcher | partial | yes | On 4 main surfaces; amispoof/verify/links omit by design. "Rolled out everywhere" is overstated, but no bug. |
| `#142` | self-host compose | works | yes | Prod proves the compose works; a clean-room `docker compose up` from empty checkout not exercised (needs `.env` scaffolding e.g. non-blank JWT audience). |
| `#77` | CriticalRegionVisibilityGate | works | yes | Known false-occlusion tendency on browser landmarks at distance (mitigated, proof-trumps-quality override). Can flag UNCERTAIN on a lit face — re-capture prompt, not a hard fail. |

### fixEffort = medium

| id | feature | verdict | demoSafe | claim → reality (the gap) |
|---|---|---|---|---|
| `#117` | npm packages `@fivucsas/*` | **not-built** | **no** | **All three 404 on npm — NOT published.** README says `npm install @fivucsas/auth-js`; a professor running it gets E404. `@fivucsas/auth-react` doesn't exist at all. Use CDN only. |
| `#53` | demographics | dormant-flag-off | **no** | Router **not mounted in prod** (would 404) AND no api proxy. Doubly unreachable. Do not demo as a live endpoint. |
| `#54` | sprint-4 (multi-face/sim-matrix/webhooks) | partial | **no** | Run inside bio but **no identity-core-api proxy** → unreachable externally. Claiming them as user-facing prod features is false. |
| `#10` | NFC chip passive-auth | partial | caveat | **CSCA trust store is empty** (README only) → SOD verify returns NO_TRUST_STORE→reject. Serial/UID matching (campus card) works; ICAO chip-genuineness does **not**. |
| `#83` | RLS isolation | partial | caveat | "RLS-enforced isolation" is **effectively false** — app connects as table-owner `postgres`, `FORCE ROW LEVEL SECURITY` commented out, policies self-bypass on NULL. Isolation is real via Hibernate `@Filter` (app-layer), not DB-layer. Reword the claim or apply FORCE + non-owner role. |
| `#55` | biometric puzzle (23) | partial | caveat | Server validation is **structural only** (no CV re-run) and the web hook **fail-OPENs on 404**; several variants skip server validation. Demo as a training surface, not a hardened anti-spoof gate. |
| `#125` | mobile approve-login | partial | caveat | **No WebSocket; FCM is a CI dummy** → real push won't deliver. Actual mechanism is **interval polling** (approver screen must stay foreground). Don't call it "push." |
| `#135` | biometric consent KVKK | partial | caveat | This is **cross-tenant routing consent (Model A)**, NOT a KVKK "I consent to enroll" capture at first enrollment. A fresh single-tenant user enrolls a face with no explicit consent artifact. Incomplete for a KVKK Art-6 claim. |
| `#59-74` | ARFilter | **not-built** | caveat | A taxonomy/fusion bucket, **not a working analyzer**. Must not be presented as a dedicated detector. |

### fixEffort = large

| id | feature | verdict | demoSafe | claim → reality (the gap) |
|---|---|---|---|---|
| `#128` | iOS app | **not-built** | **no** | Shared KMP lib compiles for iOS but **there is no iOS host app / no `.xcodeproj`**. Not demoable on any iPhone. |
| `#88` | BYOD | **not-built** | **no** | **Zero implementation** — design doc only. Roadmap/future item only. |
| `#129` | mobile puzzles + hand-tracking | partial | caveat | **No hand-tracking at all; no jigsaw puzzles.** Mobile has only a face-liveness action sequence. Claim is false as stated. |
| `#119` | multi-platform SDK reach | partial | caveat | Only **Web (JS) + Android (Custom Tab)** implemented. iOS/Electron/CLI have no distributable SDK artifact. |
| `#32` | multi-platform redirect | partial | caveat | Web SDK + Desktop/CLI loopback are genuine hosted-OAuth; **iOS not built**, **Android native login uses direct API (not hosted OAuth)**. Demo web + desktop only. |
| `#47` | embedding encryption-at-rest | partial | yes | The **searchable pgvector `embedding` column is plaintext** (pgvector has no ciphertext operator); only `embedding_ciphertext` is Fernet-encrypted. A usable copy of every face vector sits unencrypted. Be precise if probed. |
| `#82` | poster iBeta | demo-only-by-design | caveat | **No iBeta certification or pass** — only a self-authored submission-package doc. Must **never** be presented or implied as "iBeta certified/tested." |

### fixEffort = none (residual caveats only — these still WORK)

These verdicts are `works`/`likely-works` with a non-functional note; listed for completeness, not as fixes: `#3` SMS (needs real number), `#6`/`#7`/`#49` liveness rejects still photos by design, `#33` count discrepancy (see below — note: `#33` is `small`), `#37` OCR fragile to image quality, `#38` doc-face detection can fail on low-res IDs, `#44` aged threshold never triggers on fresh corpus, `#101` "48 perms" count is a DB fact, `#104` needs an owned domain, `#121` needs a physical chip, `#130` self-signed (operator holds keystore password).

---

## 5. Resolved discrepancies — the truth found in code

| Topic | Claim / doc said | **TRUTH in code (HEAD + prod)** |
|---|---|---|
| **Arbitrary first-factor `#20`** | `CLAUDE.md`: "login/begin is DEAD (401), NOT implemented, future." | **STALE/FALSE.** Memory is correct. Live `POST /auth/login/begin` → **200** with MFA-pending session; `SecurityConfig:79` permitAll; web wired (`LoginMfaFlow.tsx:294`, `LoginPage.tsx:717`) + deployed in both bundles. **It works.** Lone-PASSWORD tenants correctly fall through to the password screen. |
| **Verification "9 steps / 7 templates" `#33`** | Marketing headline. | **WRONG COUNT.** Reality = **~10 step-type handlers** (DOCUMENT_SCAN, DATA_EXTRACT, FACE_MATCH, LIVENESS_CHECK, NFC_CHIP_READ, ADDRESS_PROOF, WATCHLIST_CHECK, AGE_VERIFICATION, PHONE_VERIFICATION, VIDEO_INTERVIEW) and **exactly 5 templates** (FINTECH_KYC, HEALTHCARE_BASIC, EDUCATION_AGE, TELECOM_ONBOARDING, SIMPLE_DOCUMENT; only 3 DB-seeded flows). Pipeline **works**; the count is inaccurate. |
| **Tenant switcher `#86`** | `CLAUDE.md`: "PR open / temporarily hidden"; memory: "shipped hidden." | **Both STALE.** On current main `TopBar.tsx:38 TENANT_SWITCHER_ENABLED=true` (committed, not a working-tree edit); renders for ROOT; `X-Tenant-ID` header bridge live; deployed bundle contains the i18n key. **Visible + wired + deployed.** |
| **Membership switch `#94`** | `CLAUDE.md` 2026-05-29: "PR OPEN, not merged." | **SUPERSEDED.** Merged on main + in today's deployed jar; `POST /auth/switch-membership` → live **401** (exists). Same-identity hard gate enforced (`SwitchMembershipService:107-119`, 403 before 409). UI wired (`AccountSwitcher`, TopBar:168). **Works.** |
| **RLS vs `@Filter` `#83`** | Poster: "RLS-enforced isolation." | **RLS is INERT in prod.** App connects as owner `postgres`; `FORCE ROW LEVEL SECURITY` commented out (V25:148-149); policies self-bypass on `current_tenant_id() IS NULL`. Real isolation = **Hibernate `@Filter`** (app-layer, defense-in-depth, on 10 entities). Reword the claim to "filter-based isolation." |
| **GDPR purge `#132`** | Memory PROJECT_STATUS: "export + purge GAP." | **STALE/FALSE.** `APP_PURGE_SOFT_DELETE_ENABLED=true` in `.env.prod:56` AND yaml default flipped to `true`. `SoftDeletePurgeJob` runs @03:30, 30-day retention, native hard-delete bypassing V53 via `SET LOCAL app.allow_hard_delete`. Admin dry-run live (401). **Enabled and working.** |
| **npm published? `#117`** | README: `npm install @fivucsas/auth-js`. | **NOT PUBLISHED.** `@fivucsas/auth-js`, `auth-elements`, `auth-react` all **404** on registry.npmjs.org. `auth-react` doesn't exist locally either. CDN works; npm does not. |
| **Accept-invite page `#105`** | Earlier flag: "page missing." | **RESOLVED — it exists.** `App.tsx:225` route + `AcceptInvitePage.tsx` (519 LOC, full form). Live `app.fivucsas.com/accept-invite?token=test` → **200**. Backend `/guests/accept` permitAll, email link wired. **Loop closed.** |

---

## 6. Per-group detail tables

### G1 — Authentication methods (10 + PASSKEY + APPROVE_LOGIN)

| id | verdict | demoSafe | evidence (short) | gap | fixEffort |
|---|---|---|---|---|---|
| 1 PASSWORD (BCrypt) | works | yes | Both handlers registered; `checkPassword` via Spring BCrypt; is_active=true; Layer-1 in config | — | none |
| 2 EMAIL_OTP | works | yes | SMTP **live** (`MAIL_ENABLED=true`, host/user/pass set); both handlers registered | real inbox delivery not code-provable | none |
| 3 SMS_OTP (Twilio) | works | caveat | Twilio Verify **live** (SID/token/service set); real SDK calls | needs user w/ phone + live delivery | none |
| 4 TOTP | works | yes | Single-use anti-replay (S13); AES-decrypted secret; is_active=true | needs enrolled authenticator | none |
| 5 QR_CODE | works | yes | `otpService.validate('2fa-qr:'+userId)`; usernameless=true live | needs mobile scan round-trip | none |
| 6 FACE | works | caveat | **Fail-closed** (PR#83): SPOOF→fail, missing `verified`→reject; routes to bio | strict liveness rejects dataset photos | none |
| 7 VOICE | works | caveat | V75 flipped is_active TRUE — **confirmed live**; fail-closed; bio voice.py | needs live voice sample | none |
| 8 FINGERPRINT/WebAuthn | works | caveat | WebAuthn platform authenticator, real signature + sign-count guard | legacy server-side fingerprint removed by design | none |
| 9 HARDWARE_KEY (FIDO2) | partial | **no** | Code complete + reachable; WebAuthn roaming authenticator | **no physical key purchased** | small |
| 10 NFC_DOCUMENT | partial | caveat | Serial-only path **enabled** in prod; canonicalized lookup | **CSCA trust store empty** → chip passive-auth dead; serial/UID only | medium |
| 11 PASSKEY (discoverable) | works | caveat | V73 seeded; anon `/webauthn/passkey/authenticate-options`→200; RK+UV required | needs registered passkey + get() | none |
| 12 APPROVE_LOGIN (number-match) | works | yes | Live `/auth/approve-login/session`→200 `{matchNumber:'39'}`; Redis; decoy for unknown | needs approver device loop | none |

### G2 — MFA / multi-step / adaptive

| id | verdict | demoSafe | evidence | gap | fixEffort |
|---|---|---|---|---|---|
| 13 N-step dispatcher | works | yes | 10-handler map + duplicate guard; pessimistic-lock session; JWT only after all steps; deployed 17:15 | live token mint needs account | none |
| 14 RFC8176 amr | works | yes | `completeMfa` accumulates amr → `JwtService:245` `claims.put("amr",...)` | decode a minted token | none |
| 15 per-tenant flows | works | yes | `AuthFlowController` CRUD, rbac-gated; live login-config returns Marmara's 2-step flow | — | none |
| 16 CHOICE steps (V30) | works | yes | V30 step_type CHECK + join table; live laterSteps = 12-method CHOICE | — | none |
| 17 builder UI | works | yes | `AuthFlowBuilder.tsx` layer model; deployed dashboard chunk | CRUD round-trip live | none |
| 18 identifier-first preflight | works | yes | Live `/auth/login/preflight`→200 returns resolved login-config; enumeration-safe | — | none |
| 19 config-driven engine | works | yes | `APP_AUTH_CONFIG_DRIVEN_LOGIN=true` **global-on**; both configs `engineActive:true` | misleading "canary" comment | small |
| 20 **arbitrary first-factor** | works | yes | Live `/auth/login/begin`→200; web wired + deployed | stale "dead/future" doc | small |
| 21 set-default lockout guardrail | partial | caveat | `/default-impact` computes real usersAtRisk + WARNING dialog | **advisory, not enforced** — admin can still set lockout default | medium |

### G3 — OAuth 2.0 / OIDC

| id | verdict | demoSafe | evidence | gap | fixEffort |
|---|---|---|---|---|---|
| 22 hosted login page | works | yes | `verify.fivucsas.com/login`→200; authorize redirects on display=page; public branding 200 | full MFA-to-code live | none |
| 23 /oauth2/authorize | works | yes | permitAll; live: unknown client→400, bad redirect_uri→400 (allowlist) | — | none |
| 24 /oauth2/token | works | yes | Live bogus code→400 invalid_grant; no-store; PKCE+secret enforced; rate-limited | real exchange live | none |
| 25 /oauth2/userinfo | works | yes | Bearer-validated in-controller; no bearer→401+WWW-Auth; scope-filtered claims | claim values live | none |
| 26 PKCE | works | yes | S256 verify, public clients require S256, plain rejected; SDK+desktop send S256 | — | none |
| 27 jwks.json | works | yes | Live 200, RSA RS256 kid rs-2026-04; tokens RS256-signed | — | none |
| 28 openid-configuration | works | yes | Live 200, all required fields; token+userinfo advertised | — | none |
| 29 refresh rotation+reuse-detect | works | yes | Wired into live `/refresh`; reuse→revokeFamily+audit+throw; sha256-stored | family-revoke multi-refresh live | none |
| 30 pairwise sub | dormant-flag-off | yes | Correctly OFF; `subject_types=[public]`; full impl unreachable | needs flag + salt to demo | small |
| 31 client mgmt + secret rotation | works | yes | CRUD + rotate-secret, admin-gated; 24h grace (V58) | needs admin token live | none |
| 32 multi-platform redirect | partial | caveat | Web SDK + Desktop/CLI loopback real+deployed | **iOS not built; Android uses direct API** not hosted OAuth | large |

### G4 — Identity verification pipeline

| id | verdict | demoSafe | evidence | gap | fixEffort |
|---|---|---|---|---|---|
| 33 pipeline "9-steps/7-templates" | partial | caveat | Real wired orchestrator; 10 handlers dispatch; api rebuilt 24m ago healthy | **count wrong: ~10 handlers, 5 templates, 3 seeded flows** | small |
| 34 YOLO doc detection | likely-works | yes | `best.onnx` (12.2MB) + OCR cross-validation; bio healthy | live frame | none |
| 35 card-type client onnxruntime-web | works | yes | In-browser YOLOv8; model ships, sha256 match, live 200, valid ONNX header | — | none |
| 36 MRZ TD1/TD3 | works | yes | Complete ICAO-9303 pure-Python parser, check digits; deterministic | — | none |
| 37 TC Kimlik Tesseract OCR | likely-works | caveat | pytesseract genuinely invoked (`tur+eng`); binary installed in image | regex-on-noisy-OCR fragile | none |
| 38 selfie↔doc cosine | likely-works | caveat | `FaceMatchHandler`→bio face-match; DeepFace cosine; Facenet512 | never exercised E2E; doc-face detect can fail on low-res | none |

### G5 — Biometric (face/voice/liveness/anti-spoof)

| id | verdict | demoSafe | evidence | gap | fixEffort |
|---|---|---|---|---|---|
| 39 face enroll | works | yes | `/enroll` registered+proxied; bio healthy model=Facenet512; enroll-liveness on | still photos rejected by liveness gate | none |
| 40 face verify 1:1 | works | yes | `/verify` 8-step flow; Facenet512+mtcnn; threshold 0.4 | live face needed | none |
| 41 face search 1:N | works | yes | pgvector `<=>` cosine, threshold 0.6, HNSW | live match ranking | none |
| 42 8-stage pipeline | works | yes | Explicit Steps 1-8 w/ timing | — | none |
| 43 quality scoring | works | yes | quality gate; thresholds 40/15 | — | none |
| 44 adaptive aged threshold | works | yes | Inversion-guarded; defaults AGED=0.55/2yr | never triggers on fresh corpus | none |
| 45 468-pt landmarks | works | yes | MediaPipe FaceLandmarker; model baked | no external proxy (internal only) | none |
| 46 Facenet-512 | works | yes | Live health `{"model":"Facenet512"}`; sha256-pinned fail-closed | — | none |
| 47 embedding encryption-at-rest | partial | yes | Fernet on `embedding_ciphertext` | **searchable vector column is plaintext** | large |
| 48 voice verify 256-D | works | yes | Resemblyzer GE2E; cosine ≥0.65; proxied | live sample E2E | none |
| 49 server liveness /verify (UniFace) | works | caveat | Hard reject on is_live false or <0.4; passive+uniface in prod | still photos rejected by design | none |
| 50 anti-spoofing enabled | partial | caveat | DeepFace+UniFace block spoofs | **fusion/EAR/device-risk dormant; 403 enforce never fires** | small |
| 51 client passive-liveness | likely-works | yes | 0.45 gate in useFaceChallenge (per CLAUDE.md) | not byte-confirmed; server gate is authoritative | none |
| 52 pgvector search prod | works | yes | Live cosine query; bio healthy; 512-dim | — | none |
| 53 demographics | dormant-flag-off | **no** | Router gated off + no proxy → 404 | needs flag + proxy + RAM | medium |
| 54 sprint-4 (multi-face/sim/webhooks) | partial | **no** | Routes run in bio | **no api proxy → unreachable externally** | medium |
| 55 biometric puzzle (23) | partial | caveat | 23 challenges; server validator + proxy deployed | **structural-only validation; web fail-OPENs on 404; some variants skip server** | medium |

### G6 — amispoof analyzers + gates

| id | verdict | demoSafe | evidence | gap | fixEffort |
|---|---|---|---|---|---|
| 56 in-browser tester | works | yes | Live 200, lib/app.js served; client-side only | webcam→verdict live | none |
| 57 session verdict (peak-sensitive) | works | yes | blended 0.5·avg+0.5·worst + 3-incident override; 13/13 tests | — | none |
| 58 LivenessProver | works | yes | Wired into ingest; 32/32 tests; advisory in amispoof | — | none |
| 59-74 ~16 core analyzers | works | yes | All default-ON; per-analyzer suites green | doc weight drift (5.0/0.0 README vs 3.0/1.5 code) | none |
| 59-74 HandTracking/Audio/BgMotion | dormant-flag-off | caveat | Default OFF; tests pass | not in default verdict; inflates "23" | small |
| 59-74 ARFilter | not-built | caveat | Taxonomy + fuser weight only | **no analyzer exists** | medium |
| 59-74 Flash (Reflection/Temporal) | partial | caveat | Used only in demo driver, not core fusion; 14 tests | AUC 0.5685 (~random); not a measured detector | small |
| 59-74 Pose3DConsistency | works | yes | Registered + default-ON; 7/7 tests | — | none |
| 75 FaceUsabilityGate | works | yes | Composes Illumination+Visibility; 6/6 | — | none |
| 76 IlluminationGate | works | yes | 5/5; feeds quality floor | — | none |
| 77 CriticalRegionVisibilityGate | works | yes | 6/6; thresholds relaxed | false-occlusion tendency at distance | small |
| 78 ReadinessGate | works | yes | Pre-flight checks; used in app.js; 9/9 | blocking UX live | none |
| 79 poster CASIA AUC | unverifiable | caveat | Traces to committed JSON | **not re-derived; heuristic weights** | medium |
| 80 poster latency/bundle | likely-works | caveat | 208845B raw plausible | device-dependent, not measured | small |
| 81 poster ISO 30107-3 | partial | caveat | Real tested metric machinery | **self-computed, not certified; CelebA 28.67%** | small |
| 82 poster iBeta | demo-only-by-design | caveat | Submission-package doc only | **no certification/pass** | large |

### G7 — Multi-tenancy

| id | verdict | demoSafe | evidence | gap | fixEffort |
|---|---|---|---|---|---|
| 83 per-tenant isolation | partial | caveat | `@Filter` on 10 entities, aspect-applied | **Postgres RLS inert (owner+commented FORCE+NULL-bypass)**; ITs not proven green | medium |
| 84 per-tenant auth flows | works | yes | Tenant-scoped CRUD; live config returns Marmara's set; enforce default-on | — | none |
| 85 tenant admin/mgmt | works | yes | Full CRUD, all rbac-gated; audit-attributed | — | none |
| 86 **tenant switcher (ROOT)** | works | yes | `TENANT_SWITCHER_ENABLED=true` committed; X-Tenant-ID bridge; deployed | no-leak scoping live (ITs not green) | none |
| 87 email-domain enforce (V62/63) | works | yes | enforce gate in RegisterUserService; CRUD admin-gated; V64 DNS-TXT | flip-toggle reject live | none |
| 88 BYOD | not-built | **no** | **Zero impl** — design doc only | entire feature unbuilt | large |
| 89 self-onboarding | works | yes | Public `/onboarding/register`→400 (validating); atomic provision | register→email→activate loop live | none |

### G8 — Identity / account-linking

| id | verdict | demoSafe | evidence | gap | fixEffort |
|---|---|---|---|---|---|
| 90 person/identity layer (V65-67/V70) | works | yes | Migrations well-formed; prod validate-on-migrate=true confirms applied | — | none |
| 91 account link/unlink | likely-works | caveat | `IdentityLinkController` link/confirm/unlink; live 401; web mounted | OTP-email + repoint needs multi-membership account | none |
| 92 /identity/me | works | yes | Live 401; deployed bundle contains 'identity/me'; AccountSwitcher calls it | authed body shape live | none |
| 93 biometric consent Model A (V68) | works | caveat | Resolver wired into verify path; default-DENY | cross-tenant consented-verify E2E live | none |
| 94 **membership switch** | works | caveat | Merged + in today's jar; live 401; same-identity hard gate + tests | token-exchange happy-path live | none |
| 95 ROOT unification (V69/71) | works | yes | SUPER_ADMIN→ROOT; user_type sole tier authority; web unified | — | none |

### G9 — Dashboard / admin

| id | verdict | demoSafe | evidence | gap | fixEffort |
|---|---|---|---|---|---|
| 96 user CRUD | works | yes | Routes + rbac-gated controller; live 401 | — | none |
| 97 My Profile (+export+linked) | works | yes | export/linked/consent/activity all real endpoints | — | none |
| 98 enrollments mgmt | works | yes | List+detail; quality/liveness render; soft-delete hardened | — | none |
| 99 session mgmt | works | yes | List/revoke/my; foreign-tenant 404 fixed | — | none |
| 100 audit logs | works | yes | rbac-gated; live 401 | — | none |
| 101 roles/RBAC (48 perms) | works | yes | Full CRUD + assign/revoke; ROOT bypass | exact "48" is a DB fact (~33 in migrations) | none |
| 102 auth-flow builder | works | yes | 647-LOC builder + impact dialog; 23505 fix | — | none |
| 103 self-service onboarding | works | yes | Public route 200; real provisioner; live 400 | — | none |
| 104 DNS-TXT domain verify | works | caveat | Real JNDI DNS adapter; V64 columns | needs owned domain + resolvable TXT | none |
| 105 **guest invitations (+accept-invite)** | works | yes | `/accept-invite`→200; 519-LOC page; backend permitAll; email wired | — | none |
| 106 biometric surfaces | works | yes | Real tabbed pages, not stubs | — | none |
| 107 stats/overview | works | yes | 1019-LOC dashboard; `/statistics` analytics-gated; live 401 | — | none |

### G10 — SDK / integration

| id | verdict | demoSafe | evidence | gap | fixEffort |
|---|---|---|---|---|---|
| 108 CDN SDK | works | yes | Live 200 16464B; ESM 200; sha256 byte-identical to source; UMD export | — | none |
| 109 verify()→AuthResult | likely-works | caveat | Sandboxed iframe + postMessage resolve; backend gated | needs live iframe MFA | none |
| 110 loginRedirect() | works | yes | PKCE S256 + state/nonce; scheme-guard; authorize live 400 | — | none |
| 111 handleRedirectCallback() | works | yes | State/nonce validation; POST token; single-use clear | code round-trip live | none |
| 112 destroy() | works | yes | Rejects promise + cleanup; web-component disconnect | — | none |
| 113 `<fivucsas-verify>` web component | works | yes | `customElements.define` in served bundle | click→verify live | none |
| 114 CustomEvents | works | yes | 4 bubbles+composed events in bundle | — | none |
| 115 constructor options | works | yes | clientId required; mode+locale forwarded | granular theming not plumbed | small |
| 116 error codes | partial | yes | 3 codes + UNKNOWN + OAuth passthrough | **no documented taxonomy** | small |
| 117 npm packages | **not-built** | **no** | **All three 404; auth-react absent** | publish or change docs to CDN-only | medium |
| 118 inline iframe (demo-origin) | works | yes | CSP frame-ancestors live; JS origin-check | contradictory XFO:DENY (modern browsers OK) | small |
| 119 multi-platform SDK reach | partial | caveat | Web + Android only implemented | iOS/Electron/CLI no artifact | large |

### G11 — Mobile (KMP)

| id | verdict | demoSafe | evidence | gap | fixEffort |
|---|---|---|---|---|---|
| 120 Android app (all 10) | works | yes | Dispatches all 10 to live prod API; APK built 2026-05-30 | 1 commit behind retry fix | small |
| 121 NFC read+enroll (ICAO BAC) | works | caveat | Hand-rolled BAC/PACE, vector-tested | needs physical chip + MRZ | none |
| 122 on-device capture | works | yes | CameraX JPEG + 16kHz AAC; ML Kit | accept needs live account | none |
| 123 standalone TOTP | works | yes | RFC6238 offline authenticator; encrypted vault | — | none |
| 124 sessions+GDPR export | works | yes | Sessions + export endpoints; live 401 | needs authed session | none |
| 125 push/WebSocket approve-login | partial | caveat | **No WS; FCM dummy config** → polling only | real push needs Firebase project | medium |
| 126 QR display+scanner | works | yes | ML Kit scan + qrose generate, both directions | needs verify-side token mint | none |
| 127 Desktop (Win/Linux) | partial | caveat | Real Compose client + loopback PKCE | **thin jar, no native installer, unsigned** | small |
| 128 iOS app | **not-built** | **no** | Shared lib only; **no host app/xcodeproj** | entire host app missing | large |
| 129 mobile puzzles+hand-tracking | partial | caveat | Only face-liveness sequence | **no hand-tracking, no jigsaw puzzles** | large |
| 130 **signed release APK** | works | yes | Real release-signed APK (CN=FIVUCSAS/Marmara), sideloadable today | self-signed; operator holds keystore pw | none |

### G12 — Compliance / data (GDPR/KVKK)

| id | verdict | demoSafe | evidence | gap | fixEffort |
|---|---|---|---|---|---|
| 131 GDPR/KVKK export | works | yes | Real bundle (PII+enrollments+flows+audit); live 401; web wired; api rebuilt 3m | embedding vectors out of scope (defensible) | none |
| 132 right-to-erasure purge | works | yes | **Enabled** (`APP_PURGE...=true`); @03:30, 30-day, native hard-delete; dry-run 401 | row-purge unprovable read-only | none |
| 133 no hard-delete (V53) | works | yes | BEFORE-DELETE trigger on users+tenants; @SQLDelete reinforcement | — | none |
| 134 encryption-at-rest | works | caveat | TOTP AES-GCM + embedding Fernet + refresh sha256; keys set | **legacy rows may be plaintext** (migrate-on-boot=false) | small |
| 135 biometric consent KVKK | partial | caveat | Cross-tenant consent wired into verify; default-DENY | **no enroll-time consent capture** (incomplete for KVKK Art-6) | medium |

### G13 — Ops / platform

| id | verdict | demoSafe | evidence | gap | fixEffort |
|---|---|---|---|---|---|
| 136 status page | works | yes | uptime-kuma live; published; monitors status=1 ping 33-41ms | — | none |
| 137 Swagger (admin-IP-gated) | works | yes | Traefik admin-whitelist; non-admin IP→403 confirmed | — | none |
| 138 OpenAPI public JSON | partial | caveat | **`/identity/openapi.json`→401; real spec at `/api-docs`→200** | correct the link or add alias | small |
| 139 observability | partial | caveat | Grafana/Loki/promtail up | **no Prometheus; Grafana NXDOMAIN (VPN-only)** | small |
| 140 i18n EN/TR | works | yes | en/tr 2462-line parity; languagechange wired; data-lang CSS | no-ops on launcher-less surfaces | small |
| 141 unified launcher | partial | yes | Live 200; on 4 main surfaces | amispoof/verify/links omit by design | none |
| 142 self-host compose | works | yes | Full stack compose; prod runs from it | clean-room up not exercised | small |
| 143 9-subdomain ecosystem | works | yes | All public subdomains 200/302; api 401 by design | — | none |
| 144 BYS demo | works | yes | demo.fivucsas.com 200; OIDC client (callback/dashboard) | OIDC round-trip live | none |

---

## 7. Claims we must NOT make to professors

These are the verbal-overclaim landmines. Do not say, imply, or let a slide assert any of the following:

1. **"iBeta certified / iBeta tested"** — There is NO certification or lab pass (`#82`). Only a self-authored submission-package doc. Say "we prepared an iBeta PAD Level-1 submission package."
2. **"Install it from npm"** — `@fivucsas/auth-js`, `auth-elements`, `auth-react` are **404 / not published** (`#117`). Demo the CDN SDK only; `npm install` will E404 in front of the room.
3. **"There's an iOS app"** — No iOS host app exists (`#128`); shared KMP lib only. Don't open or promise an iPhone build.
4. **"State-of-the-art / benchmarked AUC"** for the poster — CASIA 0.945 is **self-computed, zero-shot, heuristic-weighted, not re-derived** (`#79`); CelebA ACER 28.67% is weak (`#81`); the Flash probe is **AUC ≈0.57 (random)** (`#80`/`#59-74`). Say "our measured zero-shot metrics on public mirrors."
5. **"Multi-layer anti-spoof fusion / device-risk / EAR veto is live"** — Those layers are **dormant** in prod (`#50`). What's live is DeepFace + UniFace passive (which is solid). Don't claim the full pipeline.
6. **"PostgreSQL row-level-security enforces tenant isolation"** — RLS is **inert** (`#83`). Say "Hibernate filter-based isolation at the application layer."
7. **"OIDC pairwise/sectorized subjects"** — Dormant flag (`#30`); prod advertises `public`. Don't claim privacy-pairwise unless you flip the flag first.
8. **"BYOD — tenants bring their own database"** — **Not built** (`#88`); design doc only. Roadmap item only.
9. **"Mobile has hand-tracking and biometric puzzles"** — **False** (`#129`). Mobile has a face-liveness action sequence only.
10. **"Every face embedding is encrypted at rest"** — The **searchable vector is plaintext** (`#47`); only the canonical ciphertext column is encrypted. Be precise.
11. **"Hosted-OAuth works on all 5 platforms"** — Only **web + desktop/CLI loopback** are genuine hosted-OAuth (`#32`/`#119`); Android native uses direct API, iOS/Electron have no artifact.
12. **"Mobile uses push notifications for approve-login"** — It's **interval polling**; FCM config is a CI dummy (`#125`).
13. **"9 verification steps, 7 templates"** — Reality is **~10 handlers, 5 templates, 3 seeded flows** (`#33`). State the real numbers.
14. **"Grafana + Prometheus metrics dashboard"** — **No Prometheus** (logs only) and Grafana has **no public DNS** (`#139`).

Everything in the DEMO-SAFE list (Section 2) is fair game. Speak precisely about the rest.
