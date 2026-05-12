# Runbook — Prod Postgres Unused-Index 7-Day Audit

> Created 2026-05-12. Owner: operator. Scope: identity-core-api prod (Hetzner CX43).
> Trigger: ROADMAP.md "Ops + DB hygiene — Unused-index 7-day audit"; authoritative
> candidate list in `SENIOR_DB_REVIEW_2026-05-04.md` Appendix C, which cross-references
> `/opt/projects/DB_REVIEW_2026-04-30.md` §11 (the underlying `idx_scan = 0` queries).
> Database: `identity_core` (NOT `identity_core_db`) on the `fivucsas-postgres` container.
> Reachability: operator runs `psql` directly from the Hetzner host.

## Why this matters

`pg_stat_user_indexes.idx_scan = 0` after 58+ days of live traffic is a strong
signal that an index is paying maintenance cost on every INSERT / UPDATE without
ever serving a SELECT. Predecessor audits (2026-04-30 §11) named 25+ such
candidates. We do **not** drop them blind: a 7-day soak window lets us prove
the indexes are still unused under a recent traffic snapshot before destructive
DDL touches prod.

## Constraints (non-negotiable)

Per ROADMAP and SENIOR_DB_REVIEW_2026-05-04 §2.4:

- **Do NOT drop indexes on these 4 tables** — traffic patterns still settling:
  - `webauthn_credentials`
  - `oauth2_clients`
  - `refresh_tokens`
  - `audit_logs`
- **Do NOT use `pg_stat_reset()`** — that nukes every per-table counter in the
  DB. Use a baseline-snapshot sidecar table instead (Step 2). If a targeted
  reset is required, prefer `pg_stat_reset_single_table_counters(oid)` against
  the parent table whose indexes we care about — but the snapshot approach is
  safer because it preserves all other observability data.
- **Treat every `DROP INDEX` as destructive.** Operator must individually
  confirm each drop. Capture `pg_get_indexdef()` BEFORE the drop so rollback
  is a single paste-back.
- **Skip indexes < 10 MB** in the Day-7 candidate list — the disk savings
  aren't worth the rollback risk. Smaller indexes can be left for a future
  cycle.

## Pre-flight checklist (Day 0)

- [ ] api container is healthy: `docker ps --filter "name=identity-core-api" --format "{{.Status}}"`.
- [ ] postgres container is healthy: `docker ps --filter "name=fivucsas-postgres" --format "{{.Status}}"`.
- [ ] Recent backup exists and is verifiable: `ls -lh /opt/projects/infra/backups/identity_core_*.dump.gz` + `pg_restore --list` smoke test on the latest.
- [ ] No active long-running transactions: `SELECT pid, state, query_start, query FROM pg_stat_activity WHERE state IN ('active','idle in transaction') AND query_start < now() - interval '5 minutes';` should return zero rows (one bg worker is fine).
- [ ] You can reach the DB: `docker exec fivucsas-postgres psql -U postgres -d identity_core -c "SELECT now();"`.
- [ ] Autovacuum is on (sanity check): `docker exec fivucsas-postgres psql -U postgres -c "SHOW autovacuum;"` returns `on`.
- [ ] Operator has 7 calendar days to monitor. If a freeze / release is planned in that window, defer the soak.

## Step 1 — Capture current state

```bash
docker exec fivucsas-postgres psql -U postgres -d identity_core -c "
  SELECT pg_size_pretty(pg_database_size('identity_core')) AS db_size;
"
```

Pull the current `pg_stat_user_indexes` snapshot to disk for human review
before we even start the audit:

```bash
docker exec fivucsas-postgres psql -U postgres -d identity_core \
  -c "\\copy (SELECT schemaname, relname, indexrelname, idx_scan, idx_tup_read, idx_tup_fetch, pg_size_pretty(pg_relation_size(indexrelid)) AS index_size FROM pg_stat_user_indexes ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC) TO STDOUT WITH CSV HEADER" \
  > /opt/projects/infra/backups/unused_index_preflight_$(date +%Y%m%d_%H%M%S).csv
```

Review the file. Expected: 25+ rows with `idx_scan=0` matching the
DB_REVIEW_2026-04-30 §11 candidate set (`idx_api_keys_key_hash`,
`idx_audit_resource`, `idx_audit_failed_operations`, `idx_audit_request_timing`,
`idx_audit_duration_slow`, `idx_audit_enhanced_metadata_gin`,
`idx_audit_created_at` non-DESC, `idx_webauthn_credentials_credential_id`,
`idx_refresh_tokens_lookup`, `idx_refresh_tokens_family_id`, all 13 unused
`users` table indexes, all 3 HNSW indexes on biometric_db, `idx_voice_embeddings_ivfflat`,
and the still-unused subset on `oauth2_clients` / `auth_sessions` etc.).

## Step 2 — Day-0 baseline snapshot

Run `infra/scripts/unused-index-baseline.sql`. It creates a sidecar table
`ops_unused_index_baseline` in the `public` schema and copies the current
`pg_stat_user_indexes` view into it, tagged with a baseline timestamp.

```bash
docker exec -i fivucsas-postgres psql -U postgres -d identity_core \
  < /opt/projects/fivucsas/infra/scripts/unused-index-baseline.sql
```

Verify the snapshot landed:

```bash
docker exec fivucsas-postgres psql -U postgres -d identity_core -c "
  SELECT count(*), min(captured_at), max(captured_at) FROM public.ops_unused_index_baseline;
"
```

You should see ~80–120 rows (the count of all user indexes), one `captured_at`
value, and it should be within 1 minute of `now()`.

**Trade-off notes:**
- Sidecar-snapshot approach (chosen): preserves every other stat counter,
  works against a read replica if one existed, deltas are exact, no risk
  of side-effects on monitoring. Cost: ~50 kB of extra space.
- `pg_stat_reset()` (rejected): nukes every per-DB counter including ones
  driving alerts.
- `pg_stat_reset_single_table_counters(oid)` (rejected for this pass): per-table
  scope is right, but we want to compare against pre-reset traffic too,
  which the snapshot lets us do.

## Step 3 — Day 1 through Day 7: daily delta check

Each morning during the soak, run `infra/scripts/unused-index-delta.sql`.
It joins the live `pg_stat_user_indexes` against the baseline and emits a
CSV-friendly result.

```bash
docker exec fivucsas-postgres psql -U postgres -d identity_core \
  -c "\\copy (
    SELECT
      l.relname AS table_name,
      l.indexrelname AS index_name,
      b.idx_scan AS baseline_scans,
      l.idx_scan AS current_scans,
      (l.idx_scan - b.idx_scan) AS delta,
      pg_size_pretty(pg_relation_size(l.indexrelid)) AS index_size,
      CASE
        WHEN l.relname IN ('webauthn_credentials','oauth2_clients','refresh_tokens','audit_logs')
          THEN 'SKIP (forbidden table)'
        WHEN (l.idx_scan - b.idx_scan) = 0 AND pg_relation_size(l.indexrelid) > 10*1024*1024
          THEN 'CANDIDATE FOR DROP'
        WHEN (l.idx_scan - b.idx_scan) = 0
          THEN 'unused but small (<10MB)'
        ELSE 'used (skip)'
      END AS recommended_action
    FROM pg_stat_user_indexes l
    JOIN public.ops_unused_index_baseline b USING (indexrelid)
    ORDER BY delta ASC, pg_relation_size(l.indexrelid) DESC
  ) TO STDOUT WITH CSV HEADER" \
  > /opt/projects/infra/backups/unused_index_delta_day$(date +%Y%m%d).csv
```

Log each day's CSV to `/opt/projects/infra/backups/`. Operator scans the CSV
for any index whose `delta > 0` but was on the candidate list — that means
the planner DID end up using it during the soak and it must be kept.

## Step 4 — Day 7 verification

Run `infra/scripts/unused-index-verify.sql`. This is a stricter cut: only
indexes where `delta == 0` AND `pg_relation_size > 10 MB` AND the table is
NOT in the forbidden list survive into the drop candidate set.

```bash
docker exec -i fivucsas-postgres psql -U postgres -d identity_core \
  < /opt/projects/fivucsas/infra/scripts/unused-index-verify.sql
```

The script emits two outputs:
1. A summary count of drop candidates by size bucket.
2. The exact `pg_get_indexdef()` CREATE INDEX statement for every candidate —
   capture this to `/opt/projects/infra/backups/unused_index_rollback_$(date +%Y%m%d).sql`
   BEFORE proceeding to Step 5. This is your rollback artifact.

```bash
docker exec fivucsas-postgres psql -U postgres -d identity_core \
  -c "\\copy (
    SELECT pg_get_indexdef(l.indexrelid) || ';' AS rollback_ddl
    FROM pg_stat_user_indexes l
    JOIN public.ops_unused_index_baseline b USING (indexrelid)
    WHERE (l.idx_scan - b.idx_scan) = 0
      AND pg_relation_size(l.indexrelid) > 10*1024*1024
      AND l.relname NOT IN ('webauthn_credentials','oauth2_clients','refresh_tokens','audit_logs')
  ) TO STDOUT" \
  > /opt/projects/infra/backups/unused_index_rollback_$(date +%Y%m%d).sql
```

## Step 5 — Day 7+: gated DROP INDEX (DESTRUCTIVE)

**STOP. Confirmation gate.**

- [ ] Has the rollback artifact from Step 4 been saved to `/opt/projects/infra/backups/`?
- [ ] Has the operator manually reviewed the CSV from the last 3 days and confirmed each drop candidate had `delta = 0` every day (not just on Day 7)?
- [ ] Is the index on a forbidden-list table? If yes — STOP and remove it.
- [ ] Is a fresh prod backup available (`/opt/projects/infra/backups/identity_core_*.dump.gz`)?
- [ ] Are you inside an explicit maintenance window or off-peak hour?

If ALL of the above is yes, copy `infra/scripts/unused-index-drop-template.sql`
to a session-specific file (e.g. `unused-index-drop-2026-05-19.sql`), fill in
the `TODO` markers with the index names from Step 4, and execute under a
transaction with manual review:

```bash
# Step 5a — load the templated script and re-read it before running:
cp /opt/projects/fivucsas/infra/scripts/unused-index-drop-template.sql \
   /tmp/unused-index-drop-$(date +%Y%m%d).sql
$EDITOR /tmp/unused-index-drop-$(date +%Y%m%d).sql

# Step 5b — execute. Note: default tail is ROLLBACK; flip to COMMIT only when
# you have visually inspected the DROP statements.
docker exec -i fivucsas-postgres psql -U postgres -d identity_core \
  < /tmp/unused-index-drop-$(date +%Y%m%d).sql
```

The template wraps every drop in `BEGIN; ... ROLLBACK;` by default. A naive
`psql ... < file` will roll the whole thing back. The operator MUST manually
edit the final `ROLLBACK;` to `COMMIT;` after eyeball-confirming each drop.

After each drop, re-verify the table's index list:

```bash
docker exec fivucsas-postgres psql -U postgres -d identity_core -c "
  \\d+ <table_name>
"
```

## Step 6 — Post-drop monitoring (T+24h, T+7d)

Watch the api logs for any query-plan regression:

```bash
docker logs --since 24h fivucsas-identity-core-api 2>&1 | grep -iE "slow|timeout|sequential" | head -20
```

Also monitor `pg_stat_statements` for any newly-slow query whose plan might
have flipped to a seq-scan now that an index is gone:

```bash
docker exec fivucsas-postgres psql -U postgres -d identity_core -c "
  SELECT query, calls, mean_exec_time, total_exec_time
    FROM pg_stat_statements
   WHERE mean_exec_time > 100
   ORDER BY total_exec_time DESC
   LIMIT 20;
"
```

If any query regresses, use the rollback artifact from Step 4 to recreate the
specific index:

```bash
# Find the CREATE INDEX line for the affected index in the rollback file
grep -i '<index_name>' /opt/projects/infra/backups/unused_index_rollback_*.sql

# Replay it (single statement — copy/paste into psql):
docker exec -it fivucsas-postgres psql -U postgres -d identity_core
identity_core=# <paste the CREATE INDEX line>
```

## Step 7 — Cleanup

After T+7d post-drop with no regressions, drop the sidecar table:

```bash
docker exec fivucsas-postgres psql -U postgres -d identity_core -c "
  DROP TABLE IF EXISTS public.ops_unused_index_baseline;
"
```

Archive the CSV deltas and rollback DDL under
`/opt/projects/infra/backups/audits/unused-index-2026-05/`. Update ROADMAP.md
to mark this audit closed.

## Rollback

Three layers, in order of severity:

1. **No DDL ran yet** (script tail was ROLLBACK): nothing to do.
2. **DDL committed, query slowdown detected**: re-create the specific index
   from `unused_index_rollback_<date>.sql` (Step 6).
3. **Catastrophic — multiple indexes dropped, prod degraded**: restore from
   the latest `identity_core_*.dump.gz` backup per `RUNBOOK_DR.md`.

Layers 1+2 are by far the expected path. Layer 3 has never been needed for
an index-drop and is documented for completeness.

## Appendix — Reference list of candidate indexes

From `DB_REVIEW_2026-04-30.md` §11 + `SENIOR_DB_REVIEW_2026-05-04.md` §2.4
(pre-soak — actual drop list is determined by Step 4 output, not this list):

| Table | Index | Size (est) | Forbidden? | Initial recommendation |
|---|---|---|---|---|
| `api_keys` | `idx_api_keys_key_hash` | small | no | Drop (duplicate of UNIQUE) |
| `audit_logs` | `idx_audit_resource` | 40 kB | **YES — skip** | Defer |
| `audit_logs` | `idx_audit_failed_operations` | 40 kB | **YES — skip** | Defer |
| `audit_logs` | `idx_audit_request_timing` | 8 kB | **YES — skip** | Defer |
| `audit_logs` | `idx_audit_duration_slow` | small | **YES — skip** | Defer |
| `audit_logs` | `idx_audit_enhanced_metadata_gin` | varies | **YES — skip** | Defer (GIN; reserve for Loki) |
| `audit_logs` | `idx_audit_created_at` (non-DESC) | small | **YES — skip** | Defer |
| `webauthn_credentials` | `idx_webauthn_credentials_credential_id` | small | **YES — skip** | Defer (duplicate of UNIQUE) |
| `refresh_tokens` | `idx_refresh_tokens_lookup` | small | **YES — skip** | Defer |
| `refresh_tokens` | `idx_refresh_tokens_family_id` | small | **YES — skip** | Defer (V50 brand-new) |
| `users` | 13 unused indexes (per DB_REVIEW §11) | small each | no | KEEP (table will grow past 2k rows) |
| `voice_enrollments` | `idx_voice_embeddings_ivfflat` (biometric_db) | 928 kB | no | Drop after soak — largest single waste |
| `face_embeddings` | `idx_face_embeddings_embedding_hnsw` | varies | no | KEEP — HNSW pays off > 10k rows (P3 keep-forever per §17) |
| `voice_enrollments` | `idx_voice_enrollments_embedding_hnsw` | varies | no | KEEP — same reason |
| `fingerprint_enrollments` | `idx_fingerprint_enrollments_embedding_hnsw` | varies | no | KEEP — same reason |
| `oauth2_clients` | (any unused) | varies | **YES — skip** | Defer |

**Net immediate candidates (subject to Step 4 verification):**
- `idx_api_keys_key_hash` (small but a clean duplicate-of-UNIQUE win)
- `idx_voice_embeddings_ivfflat` (928 kB — the largest single waste in `identity_core`)

Plus whatever Step 4 returns from the `users`-family if any of those flip
above the 10 MB threshold by Day 7 (unlikely at current row counts).

## Cross-references

- `/opt/projects/DB_REVIEW_2026-04-30.md` §11 — predecessor audit, source of the candidate list.
- `SENIOR_DB_REVIEW_2026-05-04.md` Appendix C — re-affirms idx_scan=0 audit needs a fresh psql snapshot.
- `ROADMAP.md` — "Ops + DB hygiene" track this runbook closes.
- `infra/RUNBOOK_FLYWAY_REPAIR.md` — sibling runbook style guide.
- `infra/RUNBOOK_DR.md` — disaster recovery if rollback layer 3 is invoked.
