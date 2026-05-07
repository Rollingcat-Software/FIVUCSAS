# FIVUCSAS Session Status — 2026-05-01

**Snapshot taken at:** 2026-05-01 ~12:00 UTC, mid-session (4 senior reviewers in flight, 1 Copilot round-8 cleanup in flight).

This is the canonical session-state doc. Supersedes ad-hoc TODO entries in CLAUDE.md until the next dated SESSION_STATUS.

---

## Code state

**39 PRs merged this session** (across 4 repos):

- `Rollingcat-Software/identity-core-api`: 11 PRs (#37–#53). Phase 1 hotfix complete; Phase 2 sweep complete; P2.9 ShedLock + AuthController.verifyMfaStep extraction (1526L→1162L, 1050→1053 tests); JVM heap fix; V51–V54 migrations; SUPER_ADMIN cross-tenant fix; SMS OTP Twilio Verify branch; wrong-password message routing; E.164 server validation.
- `Rollingcat-Software/biometric-processor`: 8 PRs (#57–#64). YOLO defensive tighten; UniFace startup warmup; ThreadPoolExecutorPort injection; fingerprint placeholder removal; asyncio.to_thread; per-stage timing logs.
- `Rollingcat-Software/web-app`: 13 PRs (#49–#61). USER-BUG-1/3/5/6/7/8/9/10 fixes; date locale helper; phone E.164 auto-prefix; CardDetector labels.json; MediaPipe preconnect+prefetch+idle-time engine warmup.
- `Rollingcat-Software/FIVUCSAS` (root/landing): 1 PR (#37). Strip Marmara branding from buyer-facing copy.

Total Copilot post-merge cleanup rounds: **7** (round 8 in flight).

## User-reported bugs — ALL CLOSED

| # | Phrase | Closure PR(s) |
|---|---|---|
| 1 | "Tavanı göstersem bile devam ediyor yüz görmeden" | web #50 |
| 2 | "Yanlış buluyor" (YOLO card-type) | bio #60 + web #52 |
| 3 | "Matematik ve şekil çizme çalışmıyor" | web #51 |
| 4 | "SMS OTP enrollment fails with correct code" | api #42 + #48 + web #61 |
| 5 | auth-methods-testing always returns success | web #53 + #54 |
| 6 | "Beklenmeyen bir hata oluştu" on wrong password | web #57 |
| 7 | Face login slow cold-start + post-capture | web #58 + bio #63 |
| 8 | "Misafir daveti gönderilemedi" | api #49 + web #59 |
| 9 | Default-flow button missing | api #49 + web #59 |
| 10 | Empty admin pages (Sessions/Devices/Verification) | api #49 + web #59 |

## Senior reviewer roster — FULLY DEPLOYED

Five reviewers delivered docs on 2026-04-30: DevOps, DB, Performance, Architecture, Principal. Four reviewers in flight on 2026-05-01 under explicit user authorization: Test, Frontend (redrive after rate-limit), Quality, Security. All output paths are `/opt/projects/<LENS>_REVIEW_<date>.md`.

## Master roadmap status

- **Phase 1 hotfix:** 100% on main. Container rebuild needed for V53 trigger + embedding encryption.
- **Phase 2 sweep:** 100% on main. Container rebuild needed for validate-on-migrate, statement_timeout, MDC, ShedLock, async/Tx correctness.
- **P2.9 deferrals:** both halves shipped. ShedLock (PR #43) + AuthController.verifyMfaStep extraction (PR #50). Pure-refactor, no rebuild needed but covered by general rebuild.
- **Performance review #1 (JVM heap):** shipped (PR #40). Rebuild needed for 40-80ms p99 win on /auth/login.
- **DB review #1 (BEFORE-DELETE trigger):** shipped (PR #47, V53). Rebuild needed.
- **DB review #2 (RLS hardening):** Task #27, deferred to dedicated multi-day session.
- **Architecture review #1 (DTO triplication):** noted, deferred (large surface area).

## CI / runner state

- web main: green; auto-deployed to Hostinger.
- api main: gitleaks green; CI + Deploy to Hetzner queued for 8+ min on PR #53 merge.
- bio main: CI Pipeline + Deploy queued for 40+ min — likely self-hosted runner offline. Tracked as Task #55. Operator action: check Actions runner status.

## Operator-only residuals

**Task #25** is the highest-priority remaining action. Without rebuild, 39 server-side merges sit on `main` not running in prod:

```bash
cd /opt/projects/fivucsas/identity-core-api
docker compose -f docker-compose.prod.yml --env-file .env.prod build --no-cache identity-core-api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d identity-core-api

cd /opt/projects/fivucsas/biometric-processor
docker compose -f docker-compose.prod.yml --env-file .env.prod build --no-cache biometric-api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d biometric-api
```

Smoke tests after rebuild: see `USER_BUGS_2026-04-30.md` "Sequencing & follow-up" section.

## Architectural risks (deferred to next session)

1. **DTO triplication** — mobile / web / verify-app hand-roll the same auth DTOs. Architecture review #1. Largest scale-time risk; not user-visible.
2. **RLS theatre** — DB review #2. App connects as superuser; without `FORCE ROW LEVEL SECURITY` and a non-superuser app role every RLS policy is decorative. 3-5 day refactor.
3. **Audit-log partitioning** — V40/V41 baseline-skip left partition tree empty. 1082 rows fine now; bloat at scale. Migration to re-establish.
4. **Facenet512 cold-start** — bio per-call Facenet512.represent + mtcnn = 250-400 ms on CX43 CPU. ONNX export or model swap deferred.
