# FIVUCSAS — Product Roadmap

> Last updated: 2026-05-11 — supersedes the 2026-04-20 phase-A/B-centric roadmap. Phase A (lint), Phase B (Dependabot security), Phase C wave-0 ops hardening, Phase I Android 13/13, and the 2026-04-30 senior-review remediation are all closed. Active wave is the post-2026-05-07 6-lens investigation residue + spoof-detector paper push. See `INVESTIGATION_MASTER_2026-05-07.md` and `archive/2026-05/roadmaps/ROADMAP_OPTIMIZED_2026-05-04.md` (on `main`) for the verbose tier breakdown.

## Project status summary

- **Overall completion**: production-running, in maintenance + hardening + research-paper phase.
- **Production services** (Hetzner CX43): Identity Core API (`api.fivucsas.com`), Biometric Processor (Docker-internal, API-key-gated), Web Dashboard (`app.fivucsas.com` → Hostinger), Landing (`fivucsas.com` → Hostinger), Verify Widget / Hosted Login (`verify.fivucsas.com`), BYS demo (`demo.fivucsas.com` → Hostinger), Uptime monitor (`status.fivucsas.com`), Docs (`docs.fivucsas.com`), Grafana + Loki + Promtail observability sidecar.
- **Tests**: 633 api, ~640 web-app, 425 client-apps, 27 Playwright specs, 114 spoof-detector, plus bio integration tests. ~1,900+ total.
- **Last prod rebuild**: api image `b670f218` (2026-05-07 07:20 UTC, plus follow-ups through 2026-05-09) + bio image `a0a763b5` (2026-05-07 07:28 UTC, plus spoof-detector v0.2.1 integration 2026-05-08…09). Both healthy.

## Branch state (2026-05-11)

- `master` and `main` have **drifted apart**: master is ahead by 11 SEO/landing/bys-demo commits not in main; main is ahead by 15 spoof-detector restructure + bio/api submodule bump commits not in master. Common ancestor `5a2c758`. Reconciliation pending (tracked below).
- Submodule HEADs (per `git submodule status` 2026-05-11):
  - `identity-core-api` → `6b17e0e` (post-`5add915` P1 batch + V29 Testcontainers FK fix + `APP_PURGE_SOFT_DELETE_ENABLED` wired + traefik noindex labels)
  - `biometric-processor` → `6f69a7d` (spoof-detector v0.2.1 integrated + Dependabot patches)
  - `web-app` → `096ed05` (post-`334a1e1` P1 batch + sitemap refresh + Dependabot patches)
  - `client-apps` → `5ab3abb` (post v5.2.0)
  - `docs` → `ed4dd25`
  - `spoof-detector` → `01c40d6` (paper §7 + §8 finalised with bootstrap CIs)

## Active wave — INVESTIGATION 2026-05-07 P1/P2 residue + paper push

The 2026-05-07 six-lens audit (`INVESTIGATION_MASTER_2026-05-07.md`) surfaced 10 P0 + ~25 P1 + ~50 P2/P3. All 10 P0 closed same-day. The 2026-05-08 batch (`7ee52de`) closed ~12 P1 items. **Remaining open from that audit (this session's Track 2):**

- NFC MRZ wiring — `bio/mrz_parser.py` exists but isn't called by the NFC auth method; currently serial-only stub
- Occlusion implementation — `bio/analyze_quality.py` hardcodes `occlusion=0.0`
- `AddressProofHandler` and `WatchlistCheckHandler` — both currently `@Profile("dev")` stubs (real KYC providers deferred to Phase 4 as a commercial decision)
- Anti-spoof contradiction policy spot-check — DeepFace `spoof` label vs UniFace high-confidence-live (partially addressed by 2026-05-08 verdict policy; needs verification)
- `SoftDeletePurgeJob` default-on prod flip (`APP_PURGE_SOFT_DELETE_ENABLED=true`) — env-var wired since `c0614c6`, default still off, GDPR Art. 17 fulfillment

## Active wave — Ops + DB hygiene (this session's Track 4)

- **Branch protection** on `main` for FIVUCSAS / api / bio / web / client-apps — 1 review required, admin bypass allowed, PR-from-fork blocked.
- **Flyway repair** for V40/V41/V42/V43/V49/V50 NULL-checksum rows on prod, then re-enable `SPRING_FLYWAY_VALIDATE_ON_MIGRATE=true` (removes the emergency override from Task #80).
- **`audit_logs.tenant_id` backfill** — 12.6% of rows still NULL and drifting up; ship V59 backfilling from `users.tenant_id` JOIN, then patch anonymous emitters (login pre-auth, `/oauth2/token`) to write a sentinel system-tenant UUID.
- **Drop `refresh_tokens.token` plaintext column** — V60. PR #71 (Persistable<UUID> fix) shipped 2026-05-04; T+7d soak elapsed 2026-05-11.
- **Unused-index 7-day audit** — reset `pg_stat_user_indexes`, monitor for 7 days, then `DROP INDEX` confirmed-zero-scan ones (25+ candidates per Senior DB Appendix C). Caution: do not drop on `webauthn_credentials`, `oauth2_clients`, `refresh_tokens`, `audit_logs` until traffic patterns settle.

## Active wave — Documentation / DX (this session's Track 3)

Per `DOC_AUDIT_2026-05-04.md` T4.12:
- **Tenant onboarding playbook** (`docs/01-getting-started/tenant-onboarding.md`) — DX-first; lead with `loginRedirect({clientId, redirectUri})` integrator snippet, then OIDC client provisioning UI, then MFA flow customisation.
- **ADR directory** (`docs/adr/`) — backfill 8 architectural decisions currently buried in CHANGELOG narrative (hosted-first OIDC, pgvector, MobileFaceNet removal, Facenet512 server authoritative, RFC 6749 §10.4 family-revoke V50, V53 BEFORE-DELETE trigger, `Persistable<UUID>` wire format PR #71, spoof-detector standalone repo).
- **`docs/` submodule duplicate hierarchy consolidation** — merge `02-architecture/`+`architecture/`, `05-testing/`+`testing/`, `01-getting-started/`+`guides/`; fix broken links; cross-link `/opt/projects/infra/` runbooks.

## Active wave — spoof-detector paper push (this session's Track 5)

Source: `spoof-detector/ROADMAP.md`. Target BIOSIG 2026 / IJCB 2026 submission.

- **P0** Blink-analyzer caching — cache FaceLandmarker per frame instead of per face.
- **P0** EAR threshold recalibration — 38 blinks/min false rate down to realistic ~15–20.
- **P1** AR-filter MobileNetV3-Small classifier — harness ready; sample collection (500+ × 5 filter types) is operator-blocked.
- **P1** OULU-NPU benchmark + ROC + ablation tables.
- **P1** Paper writing: abstract → introduction → method → experiments → results.

## Operator-only queue (cannot start from agent session)

- DNS A record for `grafana.fivucsas.com` (TurkTicaret registrar console) — cosmetic; Grafana works on direct IP.
- Twilio + Hostinger SMTP credential rotation — routine hygiene, not part of any leak.
- APK signing keystore generation + 4 GitHub secrets — blocks **GitGuardian #29836028** resolution and Phase 5 release artefacts.
- Stripe / payment-gateway provisioning — blocks Phase 4 self-serve productisation.
- iBeta PAD-Level-1 certification submission — Phase 5 trigger.
- Hetzner self-hosted GitHub Actions runner re-pairing — currently shows online but doesn't pull jobs; ubuntu-latest fallbacks live so not blocking.
- Custom postgres image with `postgresql-16-partman` + `postgresql-16-cron` (V57 Option A) — V57 is fail-soft live so not blocking; only needed for Option-A monthly-partition automation.
- `amispoof.com` domain purchase (`RESEARCH_PROCTORING_AMISPOOF_2026-05-02.md` Option B defers this).

## Long-running scheduled

| Phase | Trigger | Status |
|---|---|---|
| Phase 4 productisation (self-serve signup, Stripe, tenant-branded hosted login, status page) | Stripe provisioning ready | Pending operator |
| Phase 5 mobile parity (KMP Compose UI) + iBeta Level-1 | APK keystore + iBeta submission | Pending operator |
| Aysenur rPPG integration into spoof-detector submodule | Post-rebase | Phase 4+ |
| JWT soak end (Task #82) — flip `ALLOW_HS512=false`, set issuer/audience env | ~2026-06-01 | Scheduled (env-only restart) |
| RLS hardening (Task #27) — application DB role + `FORCE ROW LEVEL SECURITY` | Multi-day dedicated session | Backlog |
| BYOD architecture — tenants use own DB for biometric data | 8-week lift, book after current waves green | Phase 4+ |

## Known open incidents

- **GitGuardian #29836028** — Android keystore password `fivucsas2026` leaked in public git history of `Rollingcat-Software/client-apps` (commit `db18fa7`, tag `v3.0.0`). Scaffolding that reads creds from env / Gradle properties shipped `cb6eab9` 2026-04-18. Rotation is operator-gated. Full playbook: `docs/SECURITY_INCIDENTS.md`.

## Authoritative source-of-truth docs

| Doc | Scope | Location |
|---|---|---|
| `INVESTIGATION_MASTER_2026-05-07.md` | 6-lens audit + P0/P1/P2 backlog | fivucsas root (on `main`) |
| `ROADMAP_OPTIMIZED_2026-05-04.md` | Tier-by-tier backlog (T0…T7) | fivucsas root (on `main`) |
| `CICD_AUDIT_2026-05-04.md` | CI/CD pipeline audit + branch protection plan | fivucsas root (on `main`) |
| `SENIOR_DB_REVIEW_2026-05-04.md` Appendix C | Prod-query findings (Flyway NULL checksums, audit_logs NULL tenant_id, unused indexes, dead-tuple ratio) | fivucsas root (on `main`) |
| `/opt/projects/SECURITY_REVIEW_2026-05-01.md` + `TEST_REVIEW_2026-05-01.md` + `QUALITY_REVIEW_2026-05-01.md` + `FRONTEND_REVIEW_2026-05-01.md` | Senior-reviewer deferred items | `/opt/projects/` root |
| `spoof-detector/ROADMAP.md` | Anti-spoof research + paper roadmap | spoof-detector submodule |
| `client-apps/docs/plans/CLIENT_APPS_PARITY.md` | Android/Desktop hosted-first parity matrix | client-apps submodule |

## Legacy archive

For historical Phase 1–7 content (auth method completion, Playwright AI testing, deployment, mobile, polish, embeddable widget, etc.), see `archive/2026-05/roadmaps/`. The closing state of each:

- Phases 1–7: closed by 2026-04-20. All 10 auth methods in production.
- Phase A (lint green): closed 2026-04-18.
- Phase B (Dependabot security patches): closed 2026-04-18.
- Phase C (Wave 0 ops hardening — secrets rotation + history purge + Traefik tightening + GitGuardian #29836028 scaffolding): closed 2026-04-30 except APK keystore rotation (operator-gated).
- Phase D (security depth): D4 OIDC conformance + D5 PKCE audit shipped 2026-04-20; D1 DNN liveness shipped via spoof-detector 2026-05-08; D2 voice replay shipped via UniFace + spoof-detector; D3 voice STT deferred.
- Phase E (performance): bundle work + CI parallelisation shipped piecemeal; size-limit gate (E5) still open.
- Phase F (compliance + observability): F2 weekly backup restore + F3 Loki/Grafana sidecar shipped 2026-04-30; F1 DKIM operator-gated; F4 SLA + F5 incident runbooks rolling.
- Phase G (feature completions): G7 Web Components shipped; G1 YubiKey awaiting hardware purchase; G2 mobile QR scanner shipped via APK v5.2.0-rc1; G3 NFC document active this session.
- Phase H (code-quality waves 2/3/4): rolling.
- Phase I (Android hosted-first): closed at 13/13 via 2026-04-20 NFC + OAuth wiring; tag v5.2.0-rc1.
- Phase J (Desktop hosted-first): scaffolding shipped 2026-04-18; Phase 2 exit (unsigned `.msi` + `.deb` on download-beta) targeted 2026-06-27.
