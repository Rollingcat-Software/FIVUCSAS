# FIVUCSAS — Gaps Backlog (missing functionality / surfaces)

Consolidated from `pipeline-inventory/*.md` (2026-05-28). "Missing" = the operation/surface does not exist in code (re-verify on current HEAD before building).

## Backend / API — missing
| Domain | Evidence | Missing |
| --- | --- | --- |
| tenant | `api_keys` V19, `ApiKey.java`, `ApiKeyResponse.java` (orphaned — no controller/service/UI) | **API Keys: entire create/list/revoke pipeline** |
| tenant | `OAuth2ClientController` | OAuth2 client **update (PUT)** — currently delete+recreate only (breaks live integrations) |
| tenant | `PurgeAdminController` | GDPR **purge execute** endpoint (only `/admin/purge/dry-run` exists; relies on cron) |
| otp | `TwoFactorSetupResponse.backupCodes` exists; no endpoints | Backup codes **generate / verify / regenerate / count** |
| nfc | `UniversalCardDetector.kt:150` | **PACE** handshake (modern passports requiring PACE fail; only BAC implemented) |
| nfc | YOLO doc classifier | Field extraction for 3 of 5 doc types (ehliyet, ogrenci_karti, akademisyen_karti get type-only) |
| nfc | verification pipeline | Video-interview **AI analysis** (currently store-only, manual review) |

## Web UI — missing (backend exists)
| Domain | Missing |
| --- | --- |
| tenant | RBAC assignment UI (role↔permission, user↔role assign/revoke, user-role listing) |
| tenant | Tenant suspend/activate UI (`TenantsListPage.tsx` / `TenantFormPage.tsx`) |

## Mobile / Desktop client — missing
| Domain | Evidence | Missing |
| --- | --- | --- |
| voice | client-apps | **Desktop: zero voice capability** (no screens/capture/API) |
| voice | `VoiceApi.kt` | Mobile **voice delete** |
| auth | no counterpart to `DELETE /api/v1/auth/sessions/my/all` | **Revoke-all-sessions** on mobile/desktop |
| auth | `DeviceRepository.kt` | WebAuthn **credential delete** (all clients); list path wrong on mobile |
| otp | `TotpApi.kt` (only setup/verifySetup/getStatus) | Mobile **TOTP disable** (backend `DELETE /api/v1/totp/{userId}` exists) |

## Integration / wiring — missing
| Domain | Evidence | Gap |
| --- | --- | --- |
| face | `src/infrastructure/analyzers/` | **6 analyzers unwired** (ar_filter, background_grid, landmark_variance, micro_tremor, rppg, temporal) — exist with no call path into any route |
| face | `web-app/package.json` (no spoof-detector dep) | **amispoof not integrated** into web-app enroll/verify; web-app uses its own independent `PassiveLivenessDetector.ts`; standalone demo at fivucsas.com/amispoof/ is disconnected |
