# OPERATOR ACTIONS — 2026-05-12

Items surfaced by the 2026-05-12 senior reviews (backend, DB, infra, security)
that agents should not autonomously execute. Each is a checklist with explicit
commands, a maintenance-window estimate, and explicit dependencies. Severity
labels:

- **CRITICAL** — exposes a live, exploitable security or correctness gap.
- **HIGH** — drift between deployed config and committed config; reviewers
  cannot reason about prod from code.
- **MEDIUM** — hygiene + cosmetic; safe to defer but easy to land.

---

## 1. audit_logs partitioning — V57 silent no-op (HIGH)

**Background.**
The Flyway migration `V57__audit_logs_pg_partman.sql` is the one that hands
`public.audit_logs` to the `pg_partman` extension so partitions roll over
monthly with a 24-month retention. V57 runs to `success=t` in
`flyway_schema_history`, but the live postgres image
`pgvector/pgvector:pg17` does not bundle `pg_partman`. The first guard at the
top of V57 detects the missing extension, emits `RAISE WARNING`, and `RETURN`s
before the V40-fallback conversion runs.

Symptom on prod today (2026-05-12):
- `pg_class.relkind` for `audit_logs` is `'r'` (regular table), not `'p'`
  (partitioned).
- 1168 rows in a single heap, no inheritance children.
- `partman.part_config` row for `public.audit_logs` does not exist.

Memory entry `project_session_20260511` records this: commit `b32ca03`
("infra(scripts+v57): rotation scripts + V57 Option A pg_partman image
preparation") and the untracked file `/opt/projects/infra/RUNBOOK_AUDIT_LOG_PARTMAN.md`
already prep the fix path. The runbook is the authoritative recipe; this
section is the executive summary.

**Blast radius.**
audit_logs growth becomes painful around 10-20M rows (current is 1168).
There is operational headroom of months at current write rate. Failure mode
when finally addressed = vacuum/index-scan slowdowns + the GDPR/KVKK
24-month purge has to be implemented manually as a `DELETE` instead of
`DROP PARTITION`. No data loss; just latency drift.

**Maintenance window.** 15-30 minutes; postgres restart required for
`shared_preload_libraries = 'pg_partman_bgw,pg_cron'`.

**Dependencies.** None on FIVUCSAS code. Operator owns the custom postgres
image build.

**Suggested execution path (Option A from the runbook).**

1. Create `/opt/projects/fivucsas/infra/postgres/Dockerfile` per the runbook
   (`pgvector/pgvector:pg17` base + `postgresql-17-partman` +
   `postgresql-17-cron`).
2. Swap the `image:` in `/opt/projects/fivucsas/docker-compose.prod.yml`
   `postgres:` service for a `build:` block pointing at the new Dockerfile.
3. Rebuild:
   ```bash
   cd /opt/projects/fivucsas
   docker compose -f docker-compose.prod.yml --env-file .env.prod build postgres
   docker compose -f docker-compose.prod.yml --env-file .env.prod up -d postgres
   ```
4. After postgres is healthy, run the partman bootstrap on the existing
   non-partitioned table:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_partman;
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   SELECT partman.create_parent(
     p_parent_table  := 'public.audit_logs',
     p_control       := 'created_at',
     p_type          := 'range',
     p_interval      := '1 month',
     p_premake       := 12,
     p_start_partition := '2026-01-01'
   );
   UPDATE partman.part_config
      SET retention            = '24 months',
          retention_keep_table = false,
          retention_keep_index = false
    WHERE parent_table = 'public.audit_logs';
   ```
5. **Alternative** — if you would rather not bootstrap a live table, mark
   V57 as failed in `flyway_schema_history` and re-apply once the new
   image is in place (Flyway will see the migration as new and run it
   end-to-end with partman available).

**Acceptance check.**
```sql
SELECT parent_table, partition_interval, premake, retention
  FROM partman.part_config
 WHERE parent_table = 'public.audit_logs';
-- expect 1 row, interval='1 mon', premake=12, retention='24 months'
```

---

## 2. RLS theatre — every policy fail-open + app role is superuser (CRITICAL)

**Background.**
The Flyway migration `V25__row_level_security.sql` enabled Row-Level
Security on 9 tables but left the `FORCE ROW LEVEL SECURITY` line commented
out. Every policy includes a `current_tenant_id() IS NULL` disjunct, which
returns true any time the session has not run `SET app.current_tenant_id`.
The application's JDBC URL connects as the `postgres` superuser, and
superusers bypass RLS unconditionally. Net effect: RLS is ENABLED in
`pg_class.relrowsecurity` but is functionally OFF.

Verified today:
```sql
SELECT relname, relrowsecurity, relforcerowsecurity
  FROM pg_class
 WHERE relname IN ('users','tenants','audit_logs','biometric_enrollments',
                   'auth_flows','auth_flow_steps','user_enrollments',
                   'oauth2_clients','refresh_tokens');
-- all 9 rows: relrowsecurity=t, relforcerowsecurity=f
```

**Blast radius.**
A SQL-injection (or a deliberately misuse of `JdbcTemplate.queryForList`)
that omits a `tenant_id =` predicate returns rows from every tenant. The
admin-IP whitelist on `/swagger-ui` and `/actuator` does not help here —
the entry point is the application code itself.

**Maintenance window.** 30-60 minutes; requires postgres role creation,
GRANT statements, and a JDBC URL flip. Smoke-test downtime ~2 minutes
when the api container restarts.

**Dependencies.**
- New non-superuser role (call it `fivucsas_app`) created and granted only
  what is needed.
- `.env.prod` `SPRING_DATASOURCE_USERNAME` flipped from `postgres` to
  `fivucsas_app`.
- After the role swap, `FORCE ROW LEVEL SECURITY` flipped on every
  RLS-enabled table.
- Smoke-test all 10 auth methods + tenant admin endpoints in maintenance
  window.

**Suggested execution path.**

1. Inside the maintenance window:
   ```sql
   CREATE ROLE fivucsas_app LOGIN PASSWORD '<rotate-into-env>';
   GRANT CONNECT ON DATABASE identity_core TO fivucsas_app;
   GRANT USAGE  ON SCHEMA   public          TO fivucsas_app;
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO fivucsas_app;
   GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO fivucsas_app;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public
     GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO fivucsas_app;
   ```
2. Flip FORCE on the 9 RLS tables in a single transaction (Flyway
   migration `V62__rls_force.sql` recommended so the change is tracked):
   ```sql
   ALTER TABLE users                  FORCE ROW LEVEL SECURITY;
   ALTER TABLE tenants                FORCE ROW LEVEL SECURITY;
   ALTER TABLE audit_logs             FORCE ROW LEVEL SECURITY;
   ALTER TABLE biometric_enrollments  FORCE ROW LEVEL SECURITY;
   ALTER TABLE auth_flows             FORCE ROW LEVEL SECURITY;
   ALTER TABLE auth_flow_steps        FORCE ROW LEVEL SECURITY;
   ALTER TABLE user_enrollments       FORCE ROW LEVEL SECURITY;
   ALTER TABLE oauth2_clients         FORCE ROW LEVEL SECURITY;
   ALTER TABLE refresh_tokens         FORCE ROW LEVEL SECURITY;
   ```
3. Drop the `OR current_tenant_id() IS NULL` disjunct from each policy
   in the same migration. The application sets `app.current_tenant_id`
   via a JDBC interceptor on every transaction; absence means a code
   path is wrong and should fail visibly, not return all tenants.
4. Edit `.env.prod`:
   ```
   SPRING_DATASOURCE_USERNAME=fivucsas_app
   SPRING_DATASOURCE_PASSWORD=<the-rotated-secret>
   ```
5. Rebuild + restart:
   ```bash
   cd /opt/projects/fivucsas/identity-core-api
   docker compose -f docker-compose.prod.yml --env-file .env.prod up -d identity-core-api
   ```
6. Smoke-test: log in as a tenant admin from tenant A, hit
   `/api/v1/audit-logs`, confirm zero tenant-B rows; same for
   `/api/v1/users`.

**Acceptance check.**
```sql
SELECT relname, relforcerowsecurity FROM pg_class
 WHERE relname IN ('users','audit_logs','biometric_enrollments',
                   'tenants','auth_flows','auth_flow_steps',
                   'user_enrollments','oauth2_clients','refresh_tokens');
-- all 9 rows: relforcerowsecurity=t
```

---

## 3. web-app/.env.production still byte-identical to leaked literal (HIGH)

**Background.**
Commit `6bdedd2` (2026-04-30 morning, since-rotated) committed the
biometric API key plaintext into `web-app/.env.production`. The bio-side
key was rotated 2026-04-30 05:05 UTC and confirmed dead — the live value
is now `API_KEY_SECRET=fcb06b7…` (verified by the 2026-05-12 security
review). However the on-disk template at
`/opt/projects/fivucsas/web-app/.env.production` still contains the
leaked literal in `VITE_BIOMETRIC_API_KEY=…` form (2 occurrences,
verified today by `grep -c`).

Because the variable has the `VITE_*` prefix, any subsequent
`npm run build` from this working tree would inline the dead key into
the bundle. The current production bundle does NOT reference the variable
(audited by the security reviewer) so there is no live exposure today,
but rebuilding-from-this-directory would regress that.

**Blast radius.**
- Currently zero — the live key has been rotated and the live bundle does
  not include the leaked literal.
- If someone rebuilds web-app without replacing the value first, the dead
  literal lands back in `dist/` and gets deployed to Hostinger.

**Maintenance window.** 5 minutes for the file edit. The git-history
rewrite (if pursued) is a coordination cost across collaborators with
local clones, not a maintenance window per se.

**Dependencies.**
Team Web-Hygiene (separate parallel agent) is editing
`web-app/.env.production` to either a placeholder or the rotated value.
The git-history rewrite decision stays with the operator.

**Operator decisions required.**

1. **(a) On-disk value.** Confirm Team Web-Hygiene replaced the literal
   with either `VITE_BIOMETRIC_API_KEY=__SET_AT_DEPLOY_TIME__` (placeholder)
   or the rotated live value. Recommended: placeholder, so the rotated
   key never sits in any tree that ships to GitHub or to a CI cache.
   ```bash
   grep -n "VITE_BIOMETRIC_API_KEY" /opt/projects/fivucsas/web-app/.env.production
   # expect either placeholder or no leaked literal
   ```
2. **(b) Git history rewrite.** Decide whether to expunge `6bdedd2` from
   history. This is destructive:
   - Forces every collaborator to re-clone or run
     `git filter-repo`-equivalent locally.
   - Invalidates any commit-pinned references in CHANGELOG, PR
     descriptions, and external docs.
   - Recommended approach if you do pursue it:
     ```bash
     # WARNING: coordinate with all collaborators first.
     cd /opt/projects/fivucsas/web-app
     git filter-repo --invert-paths --path .env.production
     # then force-push and notify the team.
     ```
   - Recommendation: skip the rewrite. The key is dead, the bundle is
     clean, and the cost of a force-push to a public repo with five
     collaborators outweighs the marginal forensic benefit.

---

## 4. Branch reconciliation: parent main is behind master (HIGH)

**Background.**
The parent FIVUCSAS monorepo has two branches that should track each
other:

- `master` — integration branch where PRs land. Today it is 220 commits
  ahead of `main`.
- `main` — the GitHub default branch and the marketing target. It is
  134 commits ahead of master in raw `git log` terms, but every one of
  those 134 commits was already merged into master via parent PR #51
  (the 2026-05-11 reconciliation PR).

The 220-commit lead of master is the genuine integration drift; the
134-commit "lead" of main is illusory because they're the same commits
from a different merge angle.

Verified today:
```bash
cd /opt/projects/fivucsas
git log --oneline main..master | wc -l   # 220
git log --oneline master..main | wc -l   # 134
```

Memory entry `project_session_20260511` notes that PR #51 was the
2026-05-11 reconciliation — its 134 commits were brought into master
but the operator deferred the reverse direction.

**Blast radius.**
- GitHub PR UI defaults base-branch to `main`, so first-time contributors
  may target main and have their PR confusingly rebased onto master
  later.
- CI workflows that filter on `main` (only) are running against a stale
  tree.
- Reviewers looking at https://github.com/Rollingcat-Software/FIVUCSAS see
  a stale README/CLAUDE.md/ROADMAP.

**Maintenance window.** 1 minute. Fast-forward push, no PR required.

**Dependencies.** None on submodules — memory entry
`project_session_20260511` confirms submodule HEADs are already aligned.

**Suggested execution path.**
```bash
cd /opt/projects/fivucsas
git fetch origin
# Sanity: confirm master is strictly ahead of main (every main commit is
# already on master, so this is a fast-forward).
git merge-base --is-ancestor origin/main origin/master \
  && echo "OK: main is an ancestor of master, fast-forward safe."
# Apply:
git push origin master:main --force-with-lease
```

**Acceptance check.**
```bash
git log --oneline master..origin/main | wc -l   # expect 0
git log --oneline origin/main..master | wc -l   # expect 0
```

---

## 5. HS512 secret revocation — pending Team Auth-Java PR (MEDIUM)

**Background.**
A historical HS512 JWT signing key (kid `hs-2026-04`) was rotated out of
service. Verification still accepts that kid because `HsKeyRegistry`
retains it for the no-logout rotation pattern (PR #64, 2026-05-04).
Team Auth-Java is shipping an explicit `revoked-kids` list in
`application-prod.yml` so verification refuses `hs-2026-04` outright.
Until that PR merges and the api container is rebuilt, tokens minted
with the leaked secret remain accepted.

**Blast radius.**
Anyone who held a copy of the leaked HS512 secret can forge a JWT until
the revocation flips. The secret rotation date is the latest known
exposure boundary; effective compromise window persists until rebuild.

**Maintenance window.** Zero-downtime; api container rolling restart
~30 seconds.

**Dependencies.** Team Auth-Java PR must merge first. After merge:

```bash
cd /opt/projects/fivucsas/identity-core-api
git pull
docker compose -f docker-compose.prod.yml --env-file .env.prod build --no-cache identity-core-api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d identity-core-api
```

**Acceptance check.**
After rebuild, attempt verification with a token signed by the revoked
kid (use a stored prod-audit-log JWT from before the rotation if
available):
```bash
curl -sS -H "Authorization: Bearer <revoked-kid-token>" \
  https://api.fivucsas.com/api/v1/users/me
# expect 401 with body referencing "kid revoked" or generic invalid
```

---

## Quick reference: per-item severity + dependency matrix

| # | Item                          | Severity | Mtn window  | Blocked on             |
|---|-------------------------------|----------|-------------|------------------------|
| 1 | audit_logs partman bootstrap  | HIGH     | 15-30 min   | custom postgres image  |
| 2 | RLS theatre                   | CRITICAL | 30-60 min   | new postgres role + V62 migration |
| 3 | web-app .env.production leak  | HIGH     | 5 min       | Team Web-Hygiene PR    |
| 4 | parent main fast-forward      | HIGH     | 1 min       | nothing                |
| 5 | HS512 kid revocation          | MEDIUM   | rolling     | Team Auth-Java PR      |

Recommended order if attacking all five in one session:
4 (instant, unblocks reviewers) → 3 (post-merge verify) → 5 (post-PR
rebuild) → 1 (maintenance window slot) → 2 (longer maintenance window,
covers RLS smoke-test).
