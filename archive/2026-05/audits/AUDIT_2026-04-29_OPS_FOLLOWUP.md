# FIVUCSAS Ops/Infra Follow-up — 2026-04-29

References:
- `AUDIT_2026-04-28_OPS.md` (yesterday's full audit)
- `/opt/projects/infra/RUNBOOK_DR.md` (NEW today)
- `/opt/projects/infra/observability/RUNBOOK_OBSERVABILITY.md` (NEW today)

---

## Status of yesterday's findings

### P0 — closed yesterday

| # | Finding | Status |
|---|---|---|
| 1 | bio.fivucsas.com publicly routed without middlewares | ✅ Closed — public Traefik router stripped entirely (commit `9d4481f`); identity-core-api reaches biometric-api via internal docker network. |
| 2 | Disk 91% full | ✅ Reduced to 86% via `docker builder prune -af` (-23.46 GB). Run again whenever build cache rebuilds. Image prune (~19 GB more) optional. |

### P1 — addressed today (documentation)

| # | Finding | Status |
|---|---|---|
| 3 | No observability stack running | 📄 Runbook written. Decision = GO after disk prune + Grafana password. See `/opt/projects/infra/observability/RUNBOOK_OBSERVABILITY.md`. |
| 4 | No DR runbook; restore drill never executed | 📄 Runbook written. First drill instructions included. See `/opt/projects/infra/RUNBOOK_DR.md`. |
| 5 | No PITR / WAL archiving — RPO 24 h | 🟡 Open. Documented as accepted-risk in DR runbook. Mitigation requires WAL archiving + offsite ship. |

### P2 — still open

| # | Finding | Status |
|---|---|---|
| 6 | Postgres password hardcoded in `backup.sh` (world-readable) | 🟡 Open. Move to `/opt/projects/infra/.env` (chmod 600). |
| 7 | All built images use `:latest` (rebuild drift) | 🟡 Open. Tag with build SHA at deploy time. |
| 8 | Postgres `shared_buffers=384MB` undersized | 🟡 Open. Bump to 4 GB on 16 GB host (requires DB restart). |
| 9 | No PgBouncer | 🟡 Open. Defer — fine for current load. |
| 10 | Offsite mirror has only 3-day retention | 🟡 Open. Add weekly snapshot stream. |

---

## Actionable next 3

1. **Run the first DR drill** — 30 min using `RUNBOOK_DR.md`
   procedure on `identity_core` into `identity_core_restore_drill`.
   Validates the GPG key, the backup integrity, and the documented
   RTO. Updates the runbook's "Last drill executed" line.

2. **Bring up observability** — 5 min once Grafana password is
   chosen. Reduces operational blindness on backup failures and 5xx
   spikes.

3. **Move postgres password out of `backup.sh`** — 10 min. World-
   readable secret that ranks high for ease-of-fix vs risk.

---

## Disk reality check

```
Filesystem      Size  Used Avail Use%
/dev/sda1       150G  123G   21G  86%
```

After 2026-04-28's `docker builder prune` we ended at 85%. Has
drifted to 86% as new build cache accumulated overnight (a result
of today's API rebuilds — V42 + lastLoginAt fix + tenant lock + MFA
race + cross-tenant fix). Routine prune will keep it stable.

Observability stack monthly footprint ~2 GB → safe at current
free-space.

---

## Reference

This file replaces the AUDIT_2026-04-28_OPS recommended-next-steps
section. Yesterday's audit is preserved at root.
