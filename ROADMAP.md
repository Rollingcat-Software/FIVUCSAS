# FIVUCSAS — Product Roadmap

> Last updated: 2026-05-12 — 11 PRs from the 2026-05-11 session shipped + verified live (see "Closed 2026-05-11 / 2026-05-12" section near the bottom). Supersedes the 2026-04-20 phase-A/B-centric roadmap. Phase A (lint), Phase B (Dependabot security), Phase C wave-0 ops hardening, Phase I Android 13/13, and the 2026-04-30 senior-review remediation are all closed. Active wave is now narrowed to the spoof-detector paper push + a handful of operator-gated items. See `archive/2026-05/reviews/INVESTIGATION_MASTER_2026-05-07.md` and `archive/2026-05/roadmaps/ROADMAP_OPTIMIZED_2026-05-04.md` for the verbose tier breakdown.

## Project status summary

- **Overall completion**: production-running, in maintenance + hardening + research-paper phase.
- **Production services** (Hetzner CX43): Identity Core API (`api.fivucsas.com`), Biometric Processor (Docker-internal, API-key-gated), Web Dashboard (`app.fivucsas.com` → Hostinger), Landing (`fivucsas.com` → Hostinger), Verify Widget / Hosted Login (`verify.fivucsas.com`), BYS demo (`demo.fivucsas.com` → Hostinger), Uptime monitor (`status.fivucsas.com`), Docs (`docs.fivucsas.com`), Grafana + Loki + Promtail observability sidecar.
- **Tests**: 633 api, ~640 web-app, 425 client-apps, 27 Playwright specs, 114 spoof-detector, plus bio integration tests. ~1,900+ total.
- **Last prod rebuild**: api image `b670f218` (2026-05-07 07:20 UTC, plus follow-ups through 2026-05-09) + bio image `a0a763b5` (2026-05-07 07:28 UTC, plus spoof-detector v0.2.1 integration 2026-05-08…09). Both healthy.

## Branch state (2026-05-12)

- `master` and `main` **reconciled** on 2026-05-11 via PR #51 (master→main) + PR #52 (main→master post-reconciliation). Subsequent PRs (#53, #54, #55, #56) keep both branches paired. Treat both as live; PRs continue to target `master` per parent-repo convention.
- Submodule HEADs (per `git submodule status` 2026-05-11):
  - `identity-core-api` → `6b17e0e` (post-`5add915` P1 batch + V29 Testcontainers FK fix + `APP_PURGE_SOFT_DELETE_ENABLED` wired + traefik noindex labels)
  - `biometric-processor` → `6f69a7d` (spoof-detector v0.2.1 integrated + Dependabot patches)
  - `web-app` → `096ed05` (post-`334a1e1` P1 batch + sitemap refresh + Dependabot patches)
  - `client-apps` → `5ab3abb` (post v5.2.0)
  - `docs` → `ed4dd25`
  - `spoof-detector` → `01c40d6` (paper §7 + §8 finalised with bootstrap CIs)

## Active wave — INVESTIGATION 2026-05-07 P1/P2 residue + paper push

The 2026-05-07 six-lens audit (`archive/2026-05/reviews/INVESTIGATION_MASTER_2026-05-07.md`) surfaced 10 P0 + ~25 P1 + ~50 P2/P3. All 10 P0 closed same-day. The 2026-05-08 batch (`7ee52de`) closed ~12 P1 items. The 2026-05-11 session closed the next 5 P1 items (NFC MRZ wiring, real occlusion detector, anti-spoof verdict policy, dev-gate handlers, soft-delete purge default-on) — see "Closed 2026-05-11 / 2026-05-12" below. **Remaining open from that audit:**

- ~14 pre-existing bio unit-test failures (baseline rot, handed off to a parallel agent on 2026-05-12; PR forthcoming).
- Long-tail P2/P3 items deferred per backlog tiering — see `archive/2026-05/reviews/INVESTIGATION_MASTER_2026-05-07.md` for the full list.

## Active wave — Ops + DB hygiene

- **Unused-index 7-day audit** — runbook ready at `infra/RUNBOOK_UNUSED_INDEX_AUDIT.md` (2026-05-12). Uses a sidecar `public.ops_unused_index_baseline` snapshot (NOT `pg_stat_reset`), monitors deltas over 7 days, then `DROP INDEX` confirmed-zero-scan candidates > 10 MB only. Forbidden tables hard-coded in every script: `webauthn_credentials`, `oauth2_clients`, `refresh_tokens`, `audit_logs`. Day-0 / Day-7 / Drop template SQL in `infra/scripts/unused-index-{baseline,delta,verify,drop-template}.sql`. Operator runs Day-0 from runbook Step 2; agent does not touch prod. Candidate list (~25 per `archive/2026-05/reviews/SENIOR_DB_REVIEW_2026-05-04.md` Appendix C); net expected drops post-soak: `idx_api_keys_key_hash` (clean duplicate-of-UNIQUE) + `idx_voice_embeddings_ivfflat` (928 kB, largest waste), plus whatever Day-7 verification surfaces.

## Active wave — spoof-detector paper push (this session's Track 5)

Source: `spoof-detector/ROADMAP.md`. Target BIOSIG 2026 / IJCB 2026 submission.

- **P1** AR-filter MobileNetV3-Small classifier — harness ready; sample collection (500+ × 5 filter types) is operator-blocked.
- **P1** OULU-NPU benchmark + ROC + ablation tables (multi-day).
- **P1** Paper writing: abstract → introduction → method → experiments → results.

## Operator-only queue (cannot start from agent session)

- DNS A record for `grafana.fivucsas.com` (TurkTicaret registrar console) — cosmetic; Grafana works on direct IP.
- Twilio + Hostinger SMTP credential rotation — routine hygiene, not part of any leak.
- APK signing keystore generation + 4 GitHub secrets — blocks **GitGuardian #29836028** resolution and Phase 5 release artefacts.
- Stripe / payment-gateway provisioning — blocks Phase 4 self-serve productisation.
- iBeta PAD-Level-1 certification submission — Phase 5 trigger.
- Hetzner self-hosted GitHub Actions runner re-pairing — currently shows online but doesn't pull jobs; ubuntu-latest fallbacks live so not blocking.
- Custom postgres image with `postgresql-16-partman` + `postgresql-16-cron` (V57 Option A) — V57 is fail-soft live so not blocking; only needed for Option-A monthly-partition automation.
- `amispoof.com` domain purchase (`archive/2026-05/plans/RESEARCH_PROCTORING_AMISPOOF_2026-05-02.md` Option B defers this).

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
| `INVESTIGATION_MASTER_2026-05-07.md` | 6-lens audit + P0/P1/P2 backlog | `archive/2026-05/reviews/` |
| `ROADMAP_OPTIMIZED_2026-05-04.md` | Tier-by-tier backlog (T0…T7) | `archive/2026-05/roadmaps/` |
| `CICD_AUDIT_2026-05-04.md` | CI/CD pipeline audit + branch protection plan | `archive/2026-05/audits/` |
| `SENIOR_DB_REVIEW_2026-05-04.md` Appendix C | Prod-query findings (Flyway NULL checksums, audit_logs NULL tenant_id, unused indexes, dead-tuple ratio) | `archive/2026-05/reviews/` |
| `/opt/projects/SECURITY_REVIEW_2026-05-01.md` + `TEST_REVIEW_2026-05-01.md` + `QUALITY_REVIEW_2026-05-01.md` + `FRONTEND_REVIEW_2026-05-01.md` | Senior-reviewer deferred items | `/opt/projects/` root |
| `spoof-detector/ROADMAP.md` | Anti-spoof research + paper roadmap | spoof-detector submodule |
| `client-apps/docs/plans/CLIENT_APPS_PARITY.md` | Android/Desktop hosted-first parity matrix | client-apps submodule |

## Closed 2026-05-11 / 2026-05-12

The 2026-05-11 session shipped 11 PRs across 5 repos + Flyway repair on prod. Prod containers rebuilt: api image `179d34a5`, bio `75347c98`, both healthy. The following items moved from "Active wave" to closed; each has been grep-verified on 2026-05-12.

**INVESTIGATION 2026-05-07 P1 residue:**
- **NFC MRZ wiring** — `detect_and_parse_mrz` imported at `verification_pipeline.py:37` and called at lines 321 + 672; `/nfc/mrz` endpoint wired in `app/main.py:319`. Bio NFC auth method no longer a serial-only stub.
- **Real occlusion detector** — `app/application/services/occlusion_detector.py` (293 LOC, May 11) replaces the hardcoded `occlusion=0.0`.
- **`AddressProofHandler` + `WatchlistCheckHandler` dev-gate** — both carry `@Profile("dev")` (AddressProofHandler.java:46, WatchlistCheckHandler.java:43) so the prod-loading bug is structurally impossible. Real KYC providers still deferred to Phase 4.
- **Anti-spoof verdict policy** — `LIVENESS_VERDICT_POLICY=conservative` default; `tests/unit/application/use_cases/test_check_liveness_verdict_policy.py` pins the contract with 4 tests (1 sync default-check + 3 async behaviour tests).
- **`SoftDeletePurgeJob` default-on prod** — `application-prod.yml:77` sets `purge.softDelete.enabled: ${APP_PURGE_SOFT_DELETE_ENABLED:true}`. GDPR Art. 17 / KVKK right-to-erasure now self-driving.

**Ops + DB hygiene:**
- **V59 + V60 applied on prod** — V59 backfilled `audit_logs.tenant_id` (NULL count 140 → 0 via users-JOIN + sentinel UUID for anonymous emitters). V60 dropped `refresh_tokens.token` plaintext column; only `token_secret_hash` remains. (DB not directly queryable from this agent shell; trusting CLAUDE.md "Last verified 2026-05-11" claim.)
- **Flyway repair on prod** — V24 + V40–V43 + V49 + V50 NULL-checksum rows fixed; `SPRING_FLYWAY_VALIDATE_ON_MIGRATE=${SPRING_FLYWAY_VALIDATE_ON_MIGRATE:true}` enforced at `application-prod.yml:41`. Task #80 emergency override retired.
- **Branch protection live** on 6 branches — FIVUCSAS main+master, identity-core-api/main, biometric-processor/main, web-app/main, client-apps/main. All return 200 OK from `gh api .../branches/X/protection` with `required_approving_review_count: 1`, `allow_force_pushes: false`, `allow_deletions: false`, `required_conversation_resolution: true`. Admin bypass intentionally allowed.
- **master + main parent branches reconciled** — PR #51 (master→main) + PR #52 (main→master post-reconciliation). Subsequent PRs (#53–#56) keep them paired.

**Docs / DX:**
- **Tenant onboarding playbook** — `docs/01-getting-started/tenant-onboarding.md` shipped.
- **8 ADRs** — `docs/adr/0001-hosted-first-oidc.md` through `0008-spoof-detector-standalone.md` + README.md present.
- **`docs/` hierarchy consolidation** — duplicate `architecture/`, `testing/`, `guides/` directories removed; only the numbered `01-…` / `02-…` / `05-…` siblings remain.

**spoof-detector (paper P0):**
- **Blink-analyzer per-frame caching + EAR threshold recalibration** — commit `cc73cf0` ("perf(blink): per-frame FaceLandmarker cache + EAR threshold recalibration to 15-20bpm (paper-prep P0) (#10)").

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
