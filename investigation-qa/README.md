# FIVUCSAS — Investigation & Quality Assurance

Home for the platform-wide pipeline/capability investigation and the QA work that follows. Lives in the parent FIVUCSAS repo on branch `qa/pipeline-investigation-2026-05-28` (git-tracked for archival).

**Goal:** a complete, evidence-based map of EVERY pipeline / feature / functionality across the whole platform, on every layer and client → then find missing functionality, fix issues, and QA so every pipeline is verified working.

## Cardinal rule
**Code is the only source of truth. Docs may lie — they are ignored.** Every status cell MUST cite `file:line` CODE evidence. A claim with no code citation does not count.

Status legend: ✅ full · 🟡 partial · ❌ missing · 🐞 broken/buggy · ❔ unverified

## Layout
```
investigation-qa/
  README.md                     # this index + status tracker
  pipeline-inventory/           # capability matrices, one file per domain
    01-auth-session.md
    02-knowledge-otp.md
    03-face.md
    04-voice.md
    05-nfc-document.md
    06-tenant-admin-orchestration.md
  backlog/
    gaps.md                     # consolidated MISSING functionality
    issues.md                   # consolidated BROKEN/buggy pipelines
    remediation-plan.md         # scoped fix list (re-triaged against the client support matrix)
  design/
    client-support-matrix.md    # web=full / mobile=native-essential / desktop=thin (decided 2026-05-28)
  quality-assurance/            # QA test plans + results (phase 3)
```

## Layers & clients
- **DB:** identity-core-api Flyway (`src/main/resources/db/migration`, V1–V60); biometric-processor migrations; infra partman/audit.
- **Backend:** identity-core-api (Java 21/Spring), biometric-processor (Python/FastAPI), spoof-detector (PAD algorithms).
- **Clients:** web-app (React/Vite + `src/verify-app/sdk`); client-apps (KMP: androidApp=mobile, desktop/jvm=desktop); hosted SDK at `verify.fivucsas.com/sdk/`; standalone NFC apps in practice-and-test.

## Operations taxonomy (per pipeline)
create/register/enroll · read/list/get · update/info-edit · **verify/authenticate** · delete/remove/revoke · search

## Status tracker
| # | Domain | File | Status |
| --- | --- | --- | --- |
| 1 | Auth / Session / OAuth2 / WebAuthn / MFA | `pipeline-inventory/01-auth-session.md` | ✅ drafted |
| 2 | Password / OTP / TOTP / recovery | `pipeline-inventory/02-knowledge-otp.md` | ✅ drafted |
| 3 | Face biometrics + anti-spoof | `pipeline-inventory/03-face.md` | ✅ drafted |
| 4 | Voice biometrics | `pipeline-inventory/04-voice.md` | ✅ drafted |
| 5 | NFC + Document | `pipeline-inventory/05-nfc-document.md` | ✅ drafted |
| 6 | Tenant / Admin / RBAC / Orchestration | `pipeline-inventory/06-tenant-admin-orchestration.md` | ✅ drafted |

## Phases
1. **Inventory** (this folder, `pipeline-inventory/`) — what exists, per layer/client, with status.
2. **Backlog** (`backlog/`) — consolidate gaps (missing) + issues (broken) into a prioritized fix list.
3. **Remediation** — add missing functionality, fix issues.
4. **Quality assurance** (`quality-assurance/`) — test plans + execution; ensure every pipeline works.
