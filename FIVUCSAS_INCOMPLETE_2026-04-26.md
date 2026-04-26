# FIVUCSAS — Open Scope Snapshot (2026-04-26)

> Single-page summary of what's incomplete after today's continuation pass. Supersedes the per-repo TODO.md "Phase A" sections that were closed. Open items only.

## Tier 0 — Operator-action waits (no engineering work)
- **DMARC graduation** — flip `_dmarc.fivucsas.com` from `p=quarantine` → `p=reject` after 2-4 wks of clean reports at `dmarc@fivucsas.com`.
- **Marmara user smoke-test** — login `*@marun.edu.tr` → confirm tenant `1111…` resolution post V44 wire-up.
- **Phase C maintenance window** — 2-hour scheduled outage to rotate Postgres + Redis + JWT + Twilio + biometric `X-API-Key` + Hostinger SMTP secrets, then `git filter-repo --path .env.prod`. JWT rotation signs everyone out.
- **YubiKey purchase** (~2,200 TRY) — unblocks G1 hardware testing.

## Tier 1 — Shipped 2026-04-26 (8 PRs from 8 agents)
| PR | Repo | Description |
|---|---|---|
| client-apps #35 | client-apps | TR review (HW_TOKEN_*, MRZ_BACK_OF_ID_OVERLAY) + 22 new i18n keys + TOTP auto-submit on 6 digits + Email/SMS OTP 30s countdown + a11y contentDescription |
| web-app #47 | web-app | Lint 17→**0** warnings (Context-split refactors across 59 files) + i18n sweep (10 new keys × en/tr) — 678/678 tests still green |
| api #33 | identity-core-api | Admin `@PreAuthorize` sweep — closed 1 real gap on AuthFlowController POST/PUT/DELETE, +4 reflective regression tests, 925→929 passing — DEPLOYED to Hetzner |
| FIVUCSAS #36 | parent | Strip iOS/macOS scope from forward roadmap |
| docs #11 | docs (separate repo) | Strip iOS/macOS from PATH_TO_20_20 + CLIENT_APPS_PARITY |
| web-app #46 | web-app | Strip iOS/macOS from TODO + CHANGELOG |
| api #34 | identity-core-api | Strip iOS/macOS from README + CHANGELOG |
| bp #56 | biometric-processor | CHANGELOG note (no forward iOS scope existed) |

## Tier 1B — Audit DRAFT PRs (left for user review, not merged)
- **web-app #45** — `audit: 2026-04-26 production verification` — A1-A7 + recent PRs verified working in prod (no P0)
- **api #32** — `audit: 2026-04-26 production security verification` — V44-V47 verified, **V42/V43 found missing**, JWT RS256 verified, 127 `@PreAuthorize` count
- `biometric-processor/AUDIT_2026-04-26.md` (committed locally, no PR) — All claims verified, CPU-only confirmed
- `/opt/projects/INFRA_AUDIT_2026-04-26.md` — Hetzner infra A- grade, 5 findings (1 historical P0 already remediated, 4 P1)

## Tier 1C — Critical gaps surfaced by verification
- **V42 "TOTP strict" was a memory error** — TOTP secret stored in `users.two_factor_secret`; no per-user algorithm/digits/period columns exist or are needed. RFC 6238 defaults hardcoded in `TotpService.java`. **Drop from gap list.**
- **V43 (drop biometric_data)** — Real but substantial. Table is empty (0 rows in prod) but referenced by 9 Java files: `BiometricData` entity + 2 repository interfaces + `BiometricService` + 4 application services (EnrollmentQueryService, UserDataExportService, EnrollmentHealthService, ManageEnrollmentService) + EnrollmentController. Refactor needed before drop migration. **Queued for next session.**
- **Audit logs: 104 historical NULL `tenant_id` rows** (all 2026-03-15 → 2026-04-24, pre-writer-fix). May be intentional — system-level events without tenant context (failed-anon-login, SUPER_ADMIN platform-ops). V46 backfill caught what it could.

## Tier 2 — Engineering scope (queued, no blockers)
> iOS / macOS items DROPPED 2026-04-26 (no Apple hardware available). KMP `iosMain` modules retained for compile structure only.

| ID | Repo | Item | Estimate |
|---|---|---|---|
| ~~iOS-1~~ | ~~client-apps~~ | ~~Phase 2 — iOS TOTP HMAC actuals~~ | DROPPED |
| ~~iOS-2~~ | ~~client-apps~~ | ~~iOS Face/Voice/Fingerprint~~ | DROPPED |
| Desk-1 | client-apps | Windows installer code-signing (Sectigo OV ~$200) | 1 day infra + 2 days impl |
| Desk-2 | client-apps | `.msi` (WiX) + `.deb` (fpm) packaging | 2 days |
| V43-cleanup | identity-core-api | Drop `biometric_data` table — refactor 9 callers (entity, 2 repos, BiometricService, 4 application services, EnrollmentController), then create V48 migration | 1 day |
| C5-tenant | client-apps | SUPER_ADMIN tenant picker on KMP | 1-2 days |
| D1 | web-app | DNN liveness — DeepPixBiS / MiniFASNet / Silent-Face-v2 ONNX (<8 MB) | 1 wk |
| D2 | web-app | Voice replay spectral cosine pre-filter | 3 days |
| D3 | web-app | Voice STT — Whisper.cpp tiny.en WASM + server confirm | 2 wks |
| D4 | identity-core-api | OIDC conformance-suite run + fix deviations | 2-3 days |
| D5a/b | identity-core-api | PKCE failure audit logging + per-clientId rate-limit | 1 day |
| E1 | web-app | Recharts route-level `React.lazy()` (-795 KB critical path) | 0.5 day |
| E2 | web-app | MUI vendor chunk split (`mui-core` vs `mui-data`) | 0.5 day |
| E3 | identity-core-api | Maven `-T 2C` parallel CI | 0.5 day |
| F2 | both | Backup restore verification cron | 1 day |
| F3 | infra | Loki + Grafana log aggregation sidecar | 2-3 days |
| G2 | client-apps | Mobile QR scanner Phase 2.1 follow-up | 1 day |
| G4 | docs | Native-app SDK integration guides (4 docs) | 2 days |
| G7 | web-app | `<fivucsas-verify>` Web Component + CSS theming | 1 wk |
| H1-DTO | identity-core-api | 135 `Map.of()` → typed DTO migration (priority controllers) | 3-5 days |
| H1-ErrorDTO | identity-core-api | Unified `ErrorResponse` across OAuth + Auth | 1 day |
| H2-locking | identity-core-api | `@Version` optimistic locking on User/AuthFlow/Tenant | 0.5 day |
| H2-readonly | identity-core-api | `@Transactional(readOnly=true)` sweep on 50+ query services | 0.5 day |

## Tier 3 — Audited & verified done (no follow-up)
- **2026-04-26**: 16 PRs merged (8 morning + 8 afternoon agent waves) — full FIVUCSAS polish + audit cycle
- **2026-04-25**: 25+ PRs merged (audit + remediation wave); A1-A7 dashboard issues closed
- Aysenur's `liveness_capture` integrated via PR #51 (anti-spoof core, 9 net-new modules)
- Demographics router gated (B2 — ~400 MB CX43 memory savings)
- All CI on `ubuntu-latest` (0 self-hosted runners; root-caused + fixed)
- fahrieren V2 divergence resolved without force-push
- Marmara TENANT_ADMIN multi-domain (V44 + V45) live on Hetzner — `marun.edu.tr` + `marmara.edu.tr` resolve
- iOS/macOS scope formally DROPPED 2026-04-26 — docs across 5 repos updated

## Production health (2026-04-26 10:25 UTC)
- `api.fivucsas.com/actuator/health` — 200 UP (just rebuilt with PR #33 admin @PreAuthorize)
- `app.fivucsas.com` — 200 (latest bundle from PR #47 polish + PR #46 doc-strip)
- `fahrieren.com` — 200
- All 20 Docker containers UP / healthy
- AuthFlow controller correctly enforces `@rbac.isTenantAdmin()` (anonymous POST → 401)
