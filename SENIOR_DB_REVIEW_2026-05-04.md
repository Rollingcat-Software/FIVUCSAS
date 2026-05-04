# Senior Database Engineer — Deep Review

**Date:** 2026-05-04
**Reviewer:** Senior Database Engineer (independent)
**Scope:** identity-core-api (PostgreSQL + Flyway V0–V57) and biometric-processor (PostgreSQL + pgvector + Alembic 0001–0005). Storage tier only — no application code changes proposed.
**Repos / SHAs read at HEAD:**
- parent fivucsas: `e0e87b5` (2026-05-04)
- identity-core-api submodule: `2d958c5` (2026-05-04)
- biometric-processor submodule: `22bd33c` (2026-05-04)

**Prior reviews consulted, not summarised:**
- `/opt/projects/DB_REVIEW_2026-04-30.md` (the predecessor of this document)
- `/opt/projects/ARCHITECTURE_REVIEW_2026-04-30.md` (audit-log partitioning + multi-DB cohabitation context)
- `/opt/projects/PERF_REVIEW_2026-04-30.md` (DTO triplication + Hikari pool sizing)

**Read-only constraint:** SSH from this sandbox to the Hetzner VPS is not available (`/home/deploy/.ssh/id_ed25519` is not authorised for `root@116.203.222.213`). Live state claims that depend on prod were therefore re-verified from `flyway_schema_history` evidence in `/opt/projects/DB_REVIEW_2026-04-30.md` plus the current submodule HEAD diff. Where the predecessor's claim was already stale, I flag it explicitly. Items requiring a fresh `psql` snapshot (table sizes, `pg_stat_user_indexes.idx_scan`, vacuum bloat ratios, `pg_stat_archiver`) are marked **[NEEDS PROD VERIFY]**.

---

## Executive summary

1. **`User` entity STILL has no `@SQLDelete`.** `ManageUserService.java:288` still issues `userRepository.delete(user)`. V53 added a DB-level `BEFORE DELETE` trigger which closes the worst case (raw `psql` typo, a runaway migration), but the application code path now produces a *5xx error to the admin user* rather than a soft-delete — the trigger raises `restrict_violation`. The contract is **half-implemented**. This is the same finding as 2026-04-30 §1; the trigger landed but the entity-level fix did not.
2. **RLS is still theatre on prod.** `application-prod.yml:18` still resolves `${DATABASE_USERNAME}` from the env (the `.env.prod` value is `postgres` per the predecessor review). Postgres exempts owners + superusers unless `ALTER TABLE … FORCE ROW LEVEL SECURITY`. V25 left `FORCE` commented out (lines 147–149) and no later migration enables it. `current_tenant_id() IS NULL` policies still **fail-open** on every async / scheduled / unguarded path. Multi-tenant isolation in production today rests entirely on the Hibernate `@Filter("tenantFilter")` + `TenantHibernateAspect`. Any raw native query, `@Async` task, or `SoftDeletePurgeJob` runs **with no tenant fence at all**.
3. **Embedding encryption shipped as code (Fernet), but the alembic 0005 schema must be applied operator-side before the next bio container boot.** `20260502_0005_embedding_ciphertext.py` adds `embedding_ciphertext BYTEA` + `key_version SMALLINT NOT NULL DEFAULT 1` to `face_embeddings` and `voice_enrollments`. PR #65 (`611a3cc`) wires the writer; PR #68 (`22bd33c`) adds `alembic upgrade head` to the runtime image. The combination only protects new enrollments — **existing rows must be backfilled manually** via `app.infrastructure.persistence.scripts.backfill_embedding_ciphertext` after operator sets `FIVUCSAS_EMBEDDING_KEY`. Without that backfill, the column lights up green but historical templates remain plaintext-resident in pgvector. Memory note `feedback_audit_delta_before_rebuild` applies — diff <deployed-sha>..HEAD before rebuilding the bio container.
4. **The audit-log partition story is now a three-way drift between disk, history, and the V57 in-flight migration.** V40/V41 are recorded in `flyway_schema_history` with NULL checksum (BASELINE SKIP markers) — meaning no SQL ever ran. V53 (forbid hard delete) was renumbered around V51/V52 (ShedLock) and is consistent. V57 (`audit_logs_pg_partman.sql`) is on disk but still gated by `app.skip_partman_v57` and requires `pg_partman` to be installed at the OS level — neither has been done on prod. The deployed `audit_logs` is therefore still a plain heap; volume is small (~1k rows in the 04-30 snapshot) so the gap remains advisory.
5. **Schema drift between the two databases is widening, not narrowing.** `users.id UUID` ↔ `face_embeddings.user_id VARCHAR(255)` was already noted in 2026-04-30 §16. Alembic 0005 added `key_version SMALLINT` consistently in both biometric tables but did **not** enforce a CHECK that ciphertext is non-null when the row is canonical, which means a half-encrypted row is indistinguishable from a half-failed migration. Forward-looking: the moment we let any cross-DB FDW or analytical join touch the boundary, the type mismatch will force string casts everywhere.

---

## 1. Schema design

### 1.1 Multi-tenancy model

`identity_core` is a **column-discriminated multi-tenant** schema; every operational table carries a `tenant_id UUID REFERENCES tenants(id)`. The current attack surface for tenant bleed-through has three layers, and only the application layer is functional today:

| Layer | Mechanism | Status |
|------|-----------|--------|
| Application — Hibernate filter | `User.java:40-41` `@FilterDef tenantFilter` + `TenantHibernateAspect.enableFilter(tenantId)` | Working, but only on JPA reads; native queries + `@Async` paths bypass it |
| Application — `TenantContext` thread-local | `TenantContext.setCurrentTenant()` stamps `app.current_tenant_id` GUC in `TenantHibernateAspect.java:34-58` | Plain `ThreadLocal` — does not propagate to `@Async` / `@Scheduled` (see `AuditLoggingAspect` Copilot finding on PR #38, still unfixed) |
| Database — RLS policies (V25) | `users_tenant_isolation USING (tenant_id = current_tenant_id() OR current_tenant_id() IS NULL)` | Theatre; app connects as table owner so RLS is bypassed even when policies fire |

**`tenant_id` column coverage** (Flyway V1–V55, my read):

| Has `tenant_id` | Lacks `tenant_id` (intentional) | **Lacks `tenant_id` (bug)** |
|---|---|---|
| `users` (V2:14), `roles` (V3), `auth_flows` (V16:43), `auth_flow_steps`, `auth_sessions` (V16:60), `user_devices` (V17), `user_enrollments` (V16:189), `audit_logs` (V5:15), `refresh_tokens` (V5:92), `active_sessions` (V5:160), `security_events` (V5:240), `nfc_cards` (V22:7), `oauth2_clients` (V24), `tenant_email_domains` (V44, PK is `(tenant_id, email_domain)`), `mfa_sessions` (V16/V36), `tenant_auth_methods` | `permissions` (V3, global), `auth_methods` (V16, global registry), `shedlock` (V51, distributed lock), `flyway_schema_history` (Flyway internal), `rate_limit_buckets` (V9, may be tenant-keyed by `bucket_key` string) | **`webauthn_credentials` (V18)** — derives tenant via `users` join; should have its own `tenant_id` for RLS / partition pruning. **`password_history`** — same. **`api_keys` (V19)** — has `tenant_id` per V2's earlier review §2 but I could not re-verify in V19 file (file not opened). **`user_settings` (V11/V14)** — derives via user, no own column. |

**Missing `tenant_id` on RLS-sensitive tables** is a long-standing finding from `DB_REVIEW_2026-04-30.md §2` and is unchanged. Specifically `webauthn_credentials`, `password_history`, `mfa_sessions` (have it via V36), `nfc_cards` (has it via V22:7) — the worry is the *un-FORCEd* RLS on the ones that have the column, plus the *missing column* on the ones that don't.

`biometric_db` is **also column-discriminated** but with `tenant_id VARCHAR(255)` rather than `UUID` (Alembic 0001 lines 65 + initial CREATE TABLE in `pgvector_voice_repository.py`). There is no FK to `identity_core.tenants(id)` — this is a hard PostgreSQL constraint (cross-database FK is unsupported), so the only enforcement is application-side. The bio service does not run any RLS at all. This is acceptable given the X-API-Key gate, but means a compromised biometric API key = unrestricted cross-tenant template read.

### 1.2 Constraint hygiene

Spot-checks against the migrations and entities:

- **PK / NOT NULL** — sound on every operational table. `users.email` UNIQUE NOT NULL; `users.password_hash` NOT NULL; `audit_logs.action / resource_type / success` NOT NULL.
- **CHECK constraints** — present where it counts. `users_phone_e164` (V54), `chk_two_factor_secret_encrypted` (V42, `LIKE 'enc:v1:%'`), `valid_email` (V2:113), `chk_tenant_email_domains_lowercase` (V44:34), `enrollment_scores ∈ [0,1]` (V47:11). Notable absences: no CHECK on `face_embeddings.embedding_ciphertext IS NOT NULL` post-backfill (Alembic 0005 left both columns nullable — see §3.3); no CHECK that `enc_version SMALLINT NOT NULL DEFAULT 1` is ≥ 1; no CHECK that `users.user_type` and `users.expires_at` are consistent (a `GUEST` should always have `expires_at`).
- **UNIQUE indexes** — `unique_tenant_email UNIQUE(tenant_id, email)` on V2:108 protects multi-tenant email collision. `ux_tenant_email_domains_one_primary ON tenant_email_domains (tenant_id) WHERE is_primary = true` (V44:51) elegantly enforces "one primary domain per tenant" via a partial unique index — this is the right pattern, copy-worthy elsewhere.
- **FK ON DELETE behaviours** — heavily inconsistent. `webauthn_credentials.user_id ON DELETE CASCADE` (V18:4); `nfc_cards.user_id ON DELETE CASCADE` AND `nfc_cards.tenant_id ON DELETE CASCADE` (V22:6-7); `auth_sessions.tenant_id` has **no** ON DELETE clause (defaults to NO ACTION) per `DB_REVIEW_2026-04-30.md §10`. The 2026-04-28 ahabgu cascade incident lives on as a documented memory rule (`feedback_no_hard_delete_users.md`) — V53's BEFORE DELETE trigger is the partial mitigation; entity-level `@SQLDelete` is the missing other half.

### 1.3 Soft-delete consistency

`Tenant` is the gold standard: V49 column comment + `@SQLDelete` + `@SQLRestriction("deleted_at IS NULL")` on `Tenant.java:41-42`. Find queries skip tombstoned rows by default; the partial index `idx_tenants_deleted_at WHERE deleted_at IS NOT NULL` (V49:27) covers admin-restore lookups.

`User` is the **broken case**:

- Column exists since V2:105.
- `User.softDelete()` exists on `User.java:517-521`.
- **Entity has neither `@SQLDelete` nor `@SQLRestriction`.**
- `UserRepository.findByEmail` (line 30) DOES filter `deletedAt IS NULL` — good.
- `findByPasswordResetToken` (line 95), `findByEmailVerificationToken` (line 98) DO filter — good.
- **`findByStatus` (line 49), `findExpiredGuests` (line 70), `findByTenantIdAndUserType` (line 77), `countByTenantIdAndUserType` (line 85), `countByTenantId` (line 92), `searchUsers` (line 62), `searchUsersByTenant` (line 116), `findAllWithRoles` (line 106), `findAllByTenantIdWithRoles` (line 110)** all **lack the `deleted_at IS NULL` predicate**. A soft-deleted user is therefore visible in the admin user list, in tenant counts, in search results, and in `findExpiredGuests` cron output. This is a **data-leakage bug** for any GDPR hard-delete window (the user appears "alive" in admin views during the 30-day grace period).
- `findPurgeCandidates` (line 126) deliberately filters `deletedAt IS NOT NULL` — that one is correct.

**Other tables with `deleted_at`:** `users.deleted_at`, `tenants.deleted_at`, `face_embeddings.deleted_at` (Alembic 0001:71 — this is on the dropped `biometric_data`, the surviving `face_embeddings` does NOT have it).

`refresh_tokens.is_revoked + revokedAt` (V50, RefreshToken.java:88-93) is a **functional soft-delete in disguise**. The repository hot path `WHERE is_revoked = false` is partially indexed (`idx_refresh_tokens_user_expiry` per 2026-04-30 §11). This is fine.

### 1.4 Naming consistency

Column naming is overwhelmingly snake_case at the DB layer (`tenant_id`, `created_at`, `last_login_at`). Java entities use camelCase (`tenantId`, `createdAt`) and rely on Hibernate's default naming strategy. Two outliers worth calling out:

- `audit_logs.user_agent_v2` (V8:14) — a versioned column name suggesting a one-off "redo" of `user_agent` that never cleaned up. `AuditLog.java:99-100` exposes both, and `getEffectiveUserAgent()` (line 173) returns whichever is non-null. Tech debt: at zero rows-using-only-v1 we should pick one and `ALTER TABLE … DROP COLUMN`.
- `idNumber` (Java) → `id_number` (DB) — fine, but the column is loaded on a 11-character VARCHAR with `UNIQUE` semantics implied by the value object yet I see no UNIQUE index defined on it. **[NEEDS PROD VERIFY]**: `\d users` will tell us.

Table names are plural everywhere (`users`, `tenants`, `audit_logs`) — consistent.

### 1.5 Encrypted-at-rest columns

| Column | Encryption | Where |
|---|---|---|
| `users.two_factor_secret` | AES-GCM-256 via `TotpSecretAttributeConverter`; envelope `enc:v1:<base64>`; CHECK constraint enforces format (V42) | identity_core |
| `refresh_tokens.token_secret_hash` | SHA-256 of secret-half of `<id>.<secret>` token (V55) | identity_core; **NB: plaintext `token` column still kept for backwards-compat dual-read — must be dropped in V56+ once soak is complete** |
| `face_embeddings.embedding_ciphertext` | Fernet (AES-128-CBC + HMAC-SHA-256) via `FIVUCSAS_EMBEDDING_KEY` (Alembic 0005 + PR #65) | biometric_db; **NB: nullable; plaintext `embedding vector(512)` is the index surface and stays** |
| `voice_enrollments.embedding_ciphertext` | Same | biometric_db; same caveat |

**PII columns that should arguably be encrypted but aren't:**

- `users.id_number` (Turkish TC Kimlik / national ID — KVKK Art 6 special category data when carried as a public-key personal identifier) — stored plaintext. Strong candidate for AttributeConverter encryption similar to `TotpSecretAttributeConverter`.
- `users.phone_number` (E.164, V54) — generally not classified as sensitive but the combination with `id_number` is.
- `users.address` (`Address.java` value object) — same combinatorial concern.
- `verification_documents.*` (V26 verification pipeline) — MRZ fields, document images. **[NEEDS PROD VERIFY]** but I would expect bytea blobs here.
- `nfc_cards.card_serial` (V22) — quasi-PII; UNIQUE per tenant.

These four are not on fire — they are KVKK-relevant but not directly biometric — but the embedding-encryption work establishes the pattern and the next step is to extend it to TC Kimlik.

---

## 2. Indexes

### 2.1 Foreign-key indexes

PostgreSQL does not auto-index FKs. Missing FK indexes block efficient cascade deletes and can cause sequential scans on parent-side updates. Inventory of FK columns vs index coverage (from migration files; **prod `\d <table>` confirmation needed**):

| FK column | Has index? | Source |
|---|---|---|
| `users.tenant_id` | yes | V2:118 (`WHERE deleted_at IS NULL` partial) |
| `users.invited_by` | **no** | V10 added the column; no index |
| `audit_logs.user_id` | yes | V5 path; `idx_audit_user` |
| `audit_logs.tenant_id` | yes | V5:290 |
| `refresh_tokens.user_id` | yes | V5 + V50:37 indexes `family_id` separately |
| `refresh_tokens.tenant_id` | yes | V5:299 |
| `webauthn_credentials.user_id` | yes via dup index from 2026-04-30 §11 (drop one) | V18 |
| `nfc_cards.user_id` | yes | V22:22 |
| `nfc_cards.tenant_id` | yes | V22:22 |
| `mfa_sessions.user_id` | yes | V16 |
| `password_history.user_id` | likely yes | not re-verified |
| `auth_sessions.user_id` | yes | V16 |
| `auth_sessions.tenant_id` | yes | V16 |
| `auth_flow_steps.auth_flow_id` | likely yes | not re-verified |
| `oauth2_clients.tenant_id` | yes (V37 added explicit safety-net) | V24 + V37 |
| `user_enrollments.tenant_id` | yes | V25 RLS pre-req |
| `user_enrollments.user_id` | yes | V16:189 path |
| `user_devices.user_id` | yes | V17 path |
| `user_devices.tenant_id` | yes | V17 path |
| `audit_logs.resource_id` | **no covering index** | only `idx_audit_resource (resource_type, resource_id)` (V5) |

**Net:** the gap at `users.invited_by` matters when a tenant admin is deleted and Postgres has to scan `users` to enforce FK referential integrity. At 27 rows it's invisible; at 100k rows it's a 200ms unindexed scan in the soft-delete cron. Add one-line partial: `CREATE INDEX idx_users_invited_by ON users(invited_by) WHERE invited_by IS NOT NULL;`

### 2.2 pgvector indexes on `face_embeddings`, `voice_enrollments`

`face_embeddings.embedding vector(512)` carries TWO indexes per the predecessor review:
- `idx_embeddings_vector_ivfflat USING ivfflat (lists=100)` (Alembic 0003:57)
- `idx_face_embeddings_embedding_hnsw` (created later by raw `CREATE TABLE` from `postgres_embedding_repository.py:27-37`; not in any alembic migration — schema drift)

Two index strategies on the same column waste write bandwidth on every insert. At ~19 rows in prod neither is doing useful work; the planner does brute-force scan. **Decision required:** pick one. Industry guidance: HNSW for `<10M`, IVFFlat for `>10M` with low recall tolerance. With the projected 50k–500k enrolment ceiling for FIVUCSAS, **HNSW with `m=16, ef_construction=64` is the right choice** — drop the IVFFlat in a follow-up Alembic revision once the read path uses HNSW.

`voice_enrollments` has the matching mismatch — `idx_voice_enrollments_embedding_hnsw` (raw CREATE TABLE) vs `idx_voice_embeddings_ivfflat` on the orphan `identity_core.voice_enrollments` table from V33 (DB_REVIEW_2026-04-30 §7 — orphan table is dead and should be dropped).

### 2.3 Partial indexes

The schema makes **good use** of partial indexes:
- `idx_users_tenant_id ON users(tenant_id) WHERE deleted_at IS NULL` (V2:118) — soft-delete-aware
- `idx_users_email_verification_token … WHERE email_verification_token IS NOT NULL` (V2:122) — sparse
- `idx_audit_request_id … WHERE request_id IS NOT NULL` (V8:43) — sparse
- `idx_audit_duration_slow … WHERE duration_ms > 1000` (V8:52) — heat-only
- `idx_audit_enhanced_metadata_gin … WHERE enhanced_metadata IS NOT NULL AND enhanced_metadata != '{}'::jsonb` (V8:69) — sparse GIN
- `idx_tenants_deleted_at … WHERE deleted_at IS NOT NULL` (V49:27) — restore lookups
- `ux_tenant_email_domains_one_primary … WHERE is_primary = true` (V44:51) — one-of constraint
- `idx_mfa_session_expiry … WHERE completed_at IS NULL` (V16) — pending sessions only
- Alembic 0003: `idx_embeddings_tenant_user … WHERE is_active = true` (line 71); `idx_embeddings_tenant_active`, `idx_embeddings_quality`, `idx_embeddings_created_at` (lines 83/95/107) all on `WHERE is_active = true`.

**Missing partial-index opportunities** (would shrink the index by 50–80%):
- `idx_users_phone_number(phone_number) WHERE phone_number IS NOT NULL AND deleted_at IS NULL` — already exists (V2:124).
- `idx_refresh_tokens_user_id WHERE is_revoked = false` — partial would beat the full per-FK index. **[NEEDS PROD VERIFY]**.
- `idx_webauthn_credentials_user_id WHERE revoked_at IS NULL` — assumes the table has revocation column.

### 2.4 Unused indexes

`pg_stat_user_indexes.idx_scan = 0` audit per 2026-04-30 §11 is the canonical baseline. Headline drops still recommended:
- `idx_api_keys_key_hash` — exact duplicate of the UNIQUE constraint
- `idx_webauthn_credentials_credential_id` — exact duplicate of the UNIQUE constraint
- `idx_audit_resource`, `idx_audit_failed_operations`, `idx_audit_request_timing` — 0 scans after 58+ days

These survive into 2026-05-04 because no V53–V55 touched them. Bundle into a single V56 cleanup migration alongside the missing-index adds in §2.1.

### 2.5 Audit-log index strategy

The audit-log workload divides into three query shapes:
1. Admin tenant view: `WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 50`
2. User audit timeline: `WHERE user_id = ? ORDER BY created_at DESC`
3. Distributed-trace dive: `WHERE request_id = ?`

The **right** indexes for these are `idx_audit_tenant_created (tenant_id, created_at DESC)`, `idx_audit_user_action_created (user_id, action, created_at DESC)`, and `idx_audit_request_id`. The migration history confirms 1+3 land in V5/V8 and the user variant exists. The (`?action_filter=NONE`) common admin variant is also covered.

What is **not** covered: a `WHERE success = false AND created_at > NOW() - 1d` index for security-event detection. The current `idx_audit_action(action)` does **not** include `success` so failed-login spike detection issues a heap re-check. Add `CREATE INDEX idx_audit_failed_recent ON audit_logs(created_at DESC) WHERE success = false`.

---

## 3. Relations / referential integrity

### 3.1 ER diagram (text)

```mermaid
erDiagram
    tenants ||--o{ users : "tenant_id"
    tenants ||--o{ tenant_email_domains : "tenant_id"
    tenants ||--o{ auth_flows : "tenant_id"
    tenants ||--o{ auth_sessions : "tenant_id"
    tenants ||--o{ user_devices : "tenant_id"
    tenants ||--o{ user_enrollments : "tenant_id"
    tenants ||--o{ oauth2_clients : "tenant_id"
    tenants ||--o{ api_keys : "tenant_id"
    tenants ||--o{ nfc_cards : "tenant_id"
    tenants ||--o{ refresh_tokens : "tenant_id"
    tenants ||--o{ active_sessions : "tenant_id"
    tenants ||--o{ security_events : "tenant_id"
    tenants ||--o{ audit_logs : "tenant_id (NULLABLE — sentinel)"
    tenants ||--o{ tenant_auth_methods : "tenant_id"
    tenants ||--o{ mfa_sessions : "tenant_id"
    users ||--o{ user_roles : "user_id"
    users ||--o{ refresh_tokens : "user_id"
    users ||--o{ webauthn_credentials : "user_id"
    users ||--o{ nfc_cards : "user_id"
    users ||--o{ user_devices : "user_id"
    users ||--o{ user_enrollments : "user_id"
    users ||--o{ user_settings : "user_id"
    users ||--o{ password_history : "user_id"
    users ||--o{ mfa_sessions : "user_id"
    users ||--o{ active_sessions : "user_id"
    users ||--o{ audit_logs : "user_id (NULLABLE)"
    users ||--o{ guest_invitations : "invited_by"
    users }o--|| users : "invited_by (self-FK)"
    roles ||--o{ user_roles : "role_id"
    roles ||--o{ role_permissions : "role_id"
    permissions ||--o{ role_permissions : "permission_id"
    auth_methods ||--o{ tenant_auth_methods : "auth_method_id"
    auth_methods ||--o{ auth_flow_steps : "auth_method_id"
    auth_flows ||--o{ auth_flow_steps : "auth_flow_id"
    auth_sessions ||--o{ auth_session_steps : "session_id"
    %% Cross-DB boundary (no FK, only application contract):
    users ..o{ face_embeddings : "user_id (VARCHAR cast)"
    users ..o{ voice_enrollments : "user_id (VARCHAR cast)"
    tenants ..o{ face_embeddings : "tenant_id (VARCHAR cast)"
```

### 3.2 ON DELETE behaviour audit

Inventory based on migration grep. Behaviours are **CASCADE** (denoted ↘) or **NO ACTION** (default, denoted ⊥). I do not see any `SET NULL` in the migrations grep output but `DB_REVIEW_2026-04-30.md §10` lists 5 NO-ACTION FKs against `tenants`. Verified subset:

| Child table | FK column | Target | Behaviour |
|---|---|---|---|
| `users` | `tenant_id` | `tenants(id)` | ↘ CASCADE |
| `users` | `invited_by` | `users(id)` | ⊥ NO ACTION |
| `webauthn_credentials` | `user_id` | `users(id)` | ↘ CASCADE |
| `nfc_cards` | `user_id` | `users(id)` | ↘ CASCADE |
| `nfc_cards` | `tenant_id` | `tenants(id)` | ↘ CASCADE |
| `auth_methods` | (no tenant FK; global) | — | — |
| `tenant_auth_methods` | `tenant_id` | `tenants(id)` | ↘ CASCADE |
| `tenant_auth_methods` | `auth_method_id` | `auth_methods(id)` | ↘ CASCADE |
| `auth_flows` | `tenant_id` | `tenants(id)` | ↘ CASCADE |
| `auth_flow_steps` | `auth_flow_id` | `auth_flows(id)` | ↘ CASCADE |
| `auth_sessions` | `session_id` (in steps table) | `auth_sessions(id)` | ↘ CASCADE |
| `auth_sessions` | `tenant_id` | `tenants(id)` | **⊥ NO ACTION** per predecessor review |
| `user_devices` | `tenant_id` | `tenants(id)` | **⊥ NO ACTION** per predecessor review |
| `user_enrollments` | `user_id` | `users(id)` | ↘ CASCADE |
| `user_enrollments` | `tenant_id` | `tenants(id)` | **⊥ NO ACTION** per predecessor review |

The dual-CASCADE on `nfc_cards` (both user and tenant) means soft-deleting a tenant via `Tenant.softDelete()` is safe (no row removed → no cascade). But hard-deleting a tenant — even via the legitimate purge job that issues `SET LOCAL app.allow_hard_delete='on'` — would FAIL on the `auth_sessions.tenant_id NO ACTION` FK before any other table can react. The purge job hasn't tried this on prod yet, so the failure is latent.

**Recommendation:** the purge migration plan — the missing V56-or-later — should include explicit `ALTER TABLE … ALTER CONSTRAINT … ON DELETE CASCADE` for the five NO-ACTION tenant FKs (matching the pattern `users.tenant_id ON DELETE CASCADE`).

### 3.3 Orphan-row risk

- `audit_logs.user_id` is FK with **ON DELETE SET NULL** per V5 (`tenant_id UUID REFERENCES tenants` with no `ON DELETE` ≠ SET NULL but the predecessor's analysis of audit_logs cited SET NULL). The result: orphan audit rows after a hard-purge survive but with NULL user_id. Combined with the V46 backfill, orphan rows are also at risk of NULL tenant_id (12.4% of audit rows per `DB_REVIEW_2026-04-30.md §6`), making them invisible to *both* user-scoped and tenant-scoped admin queries. Users without a `tenant_id` cannot be attributed to a customer in a KVKK audit response.
- Cross-DB orphans: `face_embeddings.user_id VARCHAR(255)` has no FK at all (Postgres can't FK across DBs). When a user is hard-purged from `identity_core`, their embeddings in `biometric_db` linger forever unless the application emits an explicit `DELETE`. **[NEEDS APPLICATION-SIDE VERIFY]:** does `SoftDeletePurgeJob.purgeBatch` call into `BiometricProcessorClient.deleteEnrollment(userId)` before issuing the SQL DELETE? If not, every hard-purge leaks 1+ biometric template per user. This is a **silent KVKK Art. 17 violation** if true.

### 3.4 Cyclic dependencies

`User → User (invited_by)` is a self-loop, fine.
`User → Tenant → AuthFlow → AuthFlowStep → AuthMethod` is a chain.
No cycles among the surviving entities post-V48 (`biometric_data` drop).

---

## 4. Views

### 4.1 Existing views

- `v_recent_audit_logs` — created in V8:143, recreated in V40:227, in V57:215 (depending on path taken). Joins `audit_logs` to `users` for the `user_email` denormalisation. Non-materialised. Safe to keep — it's a presentation-layer convenience.
- `v_slow_operations` — V8:171, V40:239, V57:225 — `WHERE duration_ms > 1000` aggregation. Useful for ops dashboards.
- `mv_audit_statistics` — **MATERIALIZED** view. V8:190, recreated V40:249, V57:233. No automatic refresh strategy in any migration; it must be `REFRESH MATERIALIZED VIEW mv_audit_statistics;` invoked from cron / `@Scheduled`. **[NEEDS PROD VERIFY]:** is there a cron invocation? If not, the view is stale since 2026-04-19 (when V40/41 were first stamped, even as BASELINE SKIP).
- `v_rate_limit_monitoring` — V9:313. Simple aggregation.

### 4.2 Recommended new views

A handful of admin queries currently DTO-triplicate (per `PERF_REVIEW_2026-04-30.md`) and could be views:

- `v_user_signin_stats` — denormalised join of `users + audit_logs(action='USER_LOGIN', success=true)` aggregating count + last login per user. Replaces N+1 in `enrichWithLoginInfo` (`ManageUserService.java:296`).
- `v_tenant_health` — single row per tenant with `users_count`, `active_users_24h`, `mfa_enrolled_pct`, `webauthn_credentials_count`, `failed_logins_24h`. Today these are five separate queries from the dashboard.
- `v_enrollment_summary` — joins `user_enrollments + face_embeddings + voice_enrollments` (cross-DB) — feasible only via FDW or by surfacing biometric-side counts through the API. Probably not worth the FDW cost.

Refresh-materialised candidates (heavy queries running ≥1/min):
- None at current load (1k audit_logs in 2 months). Premature.

---

## 5. Stored procedures / functions / triggers

### 5.1 Existing functions / triggers (from migration files)

| Object | Source | Purpose |
|---|---|---|
| `update_updated_at_column()` (function) + `update_<table>_updated_at` (trigger) | V1, V2, V3, V4, V8, V9, V10 | Auto-`updated_at` on UPDATE; pattern repeated per table |
| `current_tenant_id() RETURNS UUID STABLE` | V25:23 | Reads `app.current_tenant_id` GUC for RLS; fail-safe returns NULL |
| `populate_audit_request_id() / trg_populate_audit_request_id` | V8:77 | Pulls `request_id` from JSON `metadata` if not set explicitly |
| `forbid_hard_delete()` (function) + `tg_users_forbid_hard_delete`, `tg_tenants_forbid_hard_delete` (triggers) | V53:36-64 | BEFORE DELETE guard; raises `restrict_violation` unless `app.allow_hard_delete='on'` |
| `ensure_audit_logs_partition(target_month date) RETURNS boolean` | V41:18 | Idempotent monthly-partition creator; would be invoked from cron if V40/V41 were live |
| `partman.create_parent / partman.run_maintenance_proc` | V57 (in flight) | Replaces V41 once `pg_partman` is installed |
| `mv_audit_statistics` REFRESH | (none) | No scheduled refresh exists |

### 5.2 Audit logic — DB vs application

Audit logs are written from application code, not DB triggers. `AuditLogAdapter.saveAuditLog` is the single writer. Trade-off:

- **Pro app-side:** richer context (request ID, user agent, JWT claims) is available pre-commit; can be batched.
- **Con app-side:** if the app forgets to call it (the historical bug fixed by V46) data is lost forever; `@Async` thread-local leak (12.4% NULL `tenant_id`).
- **Pro DB-side trigger:** every write is captured atomically; no application-bug bypass.
- **Con DB-side:** can't see HTTP-layer context.

A **hybrid** is the right move: keep the application-side AuditLogPort for richness, AND add lightweight `AFTER INSERT/UPDATE/DELETE` triggers on `users`, `tenants`, `roles`, `webauthn_credentials`, `nfc_cards`, `oauth2_clients`, `api_keys` writing a row to `audit_logs` with `action = 'DB_TRIGGER_*'`. The trigger row is the safety-net; the application row is the canonical one. Reconciliation later via the `request_id` field.

### 5.3 Tenant context in functions / triggers

`current_tenant_id()` (V25:23) is the only consumer of `app.current_tenant_id` GUC. The GUC is set by:
- `TenantHibernateAspect.java:34-58` — only on application threads with a non-null `TenantContext`
- Flyway / migration runs — superuser, GUC unset → NULL → `OR current_tenant_id() IS NULL` clause makes RLS fail-open

The `forbid_hard_delete` trigger (V53) uses a **different** GUC `app.allow_hard_delete` and `current_setting(name, missing_ok := true)` — correct pattern. Recommend rewriting `current_tenant_id()` similarly:

```sql
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
DECLARE v TEXT;
BEGIN
    v := current_setting('app.current_tenant_id', true);  -- missing_ok
    RETURN NULLIF(v, '')::UUID;
EXCEPTION WHEN others THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;
```

…and tighten the policy (see §8.1).

---

## 6. Performance / sizing

### 6.1 Table bloat / hot tables [NEEDS PROD VERIFY]

Per `DB_REVIEW_2026-04-30.md §13`:
- `webauthn_credentials` has `n_dead_tup / n_live_tup = 8.66` (26 dead vs 3 live). Autovacuum has never run because absolute thresholds (`autovacuum_vacuum_threshold = 50`) win out over scale_factor at <100 rows.
- `user_roles` 2.33; `users` 1.55; `user_enrollments` 1.34.
- These are **micro-bloat issues** that would self-resolve at scale, but matter operationally because the FK-cascade incident on 2026-04-28 left dead tuples that are never reclaimed.

Per-table autovacuum tuning was recommended in 2026-04-30 §13 and has not been applied. Re-recommended verbatim.

### 6.2 Audit-log growth rate

Predecessor measured 1082 rows in 58 days = **~17 rows/day**. Combined with the AuditLoggingAspect fix (now writing tenant_id), every authenticated request writes 1–3 rows. At a modest 10 RPS sustained, that's 864 k rows/day → **~ 26 M rows/month** at full load. The current heap-table model breaks down around 50–100 M rows. Partitioning is not advisory at projected scale — it's mandatory on a 12-month horizon.

V57 (`audit_logs_pg_partman.sql`) handles this correctly **once pg_partman is installed at the OS level on the shared-postgres container**. Since the current image is `pgvector/pgvector:pg17`, `pg_partman` is NOT bundled — V57 has the operator-bypass `app.skip_partman_v57=on` for this exact reason. **Operator action item:** swap to a custom image bundling `postgresql-17-partman` (`apt install postgresql-17-partman` on the Debian base) before V57 can run.

### 6.3 Hikari pool config

Per `application-prod.yml:20-29`:
```yaml
hikari:
  maximum-pool-size: 20
  minimum-idle: 5
  connection-timeout: 30000
  idle-timeout: 600000
  max-lifetime: 1800000
  connection-init-sql: ${DB_CONNECTION_INIT_SQL:SET statement_timeout = 30000}
```

`connection-init-sql` was added since the predecessor review — good. But:
- `leak-detection-threshold` **still missing**. A handler bug holding a connection >60s should produce a stacktrace warning. Add `leak-detection-threshold: 60000`.
- `idle_in_transaction_session_timeout` is NOT set in init-sql. A `BEGIN;` without `COMMIT;` (rare but seen during the FK-cascade post-mortem) blocks autovacuum. Either chain into init-sql (`SET statement_timeout = 30000; SET idle_in_transaction_session_timeout = 600000`) or set at PG level via the compose `command:`.

PostgreSQL `max_connections=100` (from `infra/shared-db/docker-compose.yml` per predecessor §18) divided across 5 apps × 20 Hikari connections each = ceiling at app #5. Either raise PG to `200` (CX43 has the RAM) or introduce **pgbouncer** in transaction mode before app #6 lands. Architecturally, pgbouncer is the better answer because it also cushions Spring Boot warm-up burst (initial 20 connections per app × 5 apps = 100 simultaneously requested at Hetzner reboot).

---

## 7. Backup / recovery

### 7.1 PITR / WAL archiving status

Predecessor §9 found `archive_mode = off` live despite compose claiming `-c archive_mode=on`. The recent parent commit `1ab95e9 infra(shared-db): land pgBackRest WAL archiving + PITR (P6.8) — deploy DEFERRED` confirms PR-style work has been done at `infra/shared-db/` to wire pgBackRest, but **deploy is explicitly deferred**. Re-verify:

```
[NEEDS PROD VERIFY]
SHOW archive_mode;
SHOW archive_command;
SELECT * FROM pg_stat_archiver;
```

Until `archived_count > 0`, **PITR is not actually working** and the "RUNBOOK_PITR.md" claim is aspirational. The 2026-04-30 DR drill was a `pg_dump` round-trip, not a WAL-replay restore — the latter has never been tested.

### 7.2 Backup cadence

`/opt/projects/backups/` shows daily dumps (per parent `git status` showing many backups deleted from 2026-03-21..2026-03-29 — these would be GPG-encrypted snapshots). The cadence works for RPO ~24h. PITR closes that to ~5 min if and only if archiving is actually on.

Off-site: `mirror.log` and `offsite.log` exist in `/opt/projects/backups/` — assume hetzner storage box mirroring is wired. **[NEEDS LOG VERIFY]** the most recent successful run.

### 7.3 DR drill cadence

Last drill: 2026-04-30 04:54 UTC — 25 users / 19 tenants / 279 refresh_tokens restored OK. Quarterly cadence is industry-acceptable for a small-team SaaS, but for a regulated KVKK service the recommended cadence is **monthly with rotating scenarios** (full restore, point-in-time to T-1h, single-table restore). The runbook is in `/opt/projects/infra/RUNBOOK_DR.md`.

---

## 8. Security

### 8.1 Row-level security

Status (verified from migrations + predecessor review; not re-verified live):

- 9 tables have `ALTER TABLE … ENABLE ROW LEVEL SECURITY` (V25:9-17): `users, roles, user_roles, auth_flows, auth_flow_steps, auth_sessions, user_devices, user_enrollments, audit_logs`.
- **0 tables have `FORCE ROW LEVEL SECURITY`** (V25:147-149 commented out, no later migration enables it).
- 13+ tenant-keyed tables have **no RLS at all**: `mfa_sessions, nfc_cards, webauthn_credentials, refresh_tokens, security_events, tenant_auth_methods, tenant_email_domains, oauth2_clients, api_keys, active_sessions, password_history, voice_enrollments` (orphan), `liveness_attempts` (in biometric_db).

The application connects as a Postgres role that owns the tables (`postgres` per predecessor + `application-prod.yml:18` env-variable indirection). Owners bypass RLS unless `FORCE` is set. **The RLS protection surface today is zero.**

The fix is a four-step migration, in this order:
1. Create `app_identity` non-superuser role with table-level SELECT/INSERT/UPDATE/DELETE grants.
2. Switch `DATABASE_USERNAME` env to `app_identity`. Migrations continue to run as `postgres` on container startup.
3. `ALTER TABLE … FORCE ROW LEVEL SECURITY` on every RLS table.
4. Tighten the `current_tenant_id() IS NULL` fail-open clause to a deny clause + add a separate `… TO postgres USING (true)` admin-bypass policy.

Step 1+2+3 is the same recommendation as 2026-04-30 §2 and is the **single highest-leverage change in the whole storage layer**. This is the canonical "why we passed compliance audit" story.

### 8.2 Database role separation

Today: one role (`postgres`, superuser) is used by:
- Flyway migrations (correct — needs DDL)
- Application runtime (incorrect — should be a non-superuser app role)
- pgBackRest / backup user (correct — needs `pg_read_all_settings` + `pg_read_all_data`)
- DBA shell access (`docker exec … psql -U postgres …`) — fine

The recommended split: 5 roles (`postgres` for ops, `flyway_migrate`, `app_identity`, `app_biometric`, `backup_reader`). At current scale this is over-engineering; the minimum-viable split is `postgres` (DBA + Flyway) + `app_identity` (runtime).

### 8.3 Connection encryption

[NEEDS PROD VERIFY] `SHOW ssl;` — predecessor review didn't capture this. Within the Docker network the connection is plaintext to `shared-postgres:5432`. That is acceptable on Hetzner because the bridge network is unreachable from outside. Public SSL is unnecessary as long as the port is never exposed (verified: `infra/shared-db/docker-compose.yml` should bind only the internal network; no `5432:5432` mapping in production compose).

### 8.4 pgcrypto / pgsodium

V0 enables `uuid-ossp`, `pgcrypto`, `pg_trgm`, `vector`. `pgsodium` is NOT installed. Application-side AES-GCM via `TotpSecretCipher` is the right primitive for transparent column encryption — no need for pgsodium until / unless we move to row-level encryption with key separation per tenant. The Fernet primitive used in biometric-processor (`cryptography` Python package) is functionally equivalent.

---

## 9. Migration history hygiene

### 9.1 V1 → V55 audit

Pacing is healthy: V1–V15 in 3 weeks (Dec 2025), V16–V32 over 3 months (Jan–Feb 2026), V33–V55 over 6 weeks (Mar–May 2026). No mega-migrations. A few smell points:

- **V15 seed data** — `seed_realistic_sample_data.sql` mixes DDL (none) with INSERTs that reference test users by hard-coded UUIDs (`11111111-1111-1111-1111-111111111111` etc). This is fine for dev but writes prod artefacts on first deploy. Recommendation: gate behind `pg_environment` (`SELECT current_database()` checks) or move to a separate `seed-dev/` folder consumed only by docker-compose dev profile.
- **V29 + V32 + V35 + V36** — incremental column additions to `mfa_sessions`. Healthy.
- **V40 / V41 / V42 / V43** — partition + maintenance + check + no-op. The NULL-checksum BASELINE SKIP markers from `DB_REVIEW_2026-04-30.md §5` are recorded but the SQL never ran. Need cleanup.
- **V43** is annotated `noop_reserved_v43_ships_as_V48` — **do not** keep no-op slot migrations in the chain. Either remove the file (after `flyway repair`) or replace with the actual migration that owns the slot.
- **V44 + V45 + V46** — multi-domain tenants + admin permissions baseline + audit-tenant backfill. Three small migrations, each idempotent.
- **V51 / V52 / V53 numbering collision** — V51 is ShedLock per the file content at `V51__shedlock.sql:13-17`, which explicitly states *"Numbering note: this is V51 (renumbered from V53). The feat/v51-forbid-hard-delete-p1-7 branch carries a separate 'V51 BEFORE DELETE trigger' migration that never reached main; when that branch merges it must renumber to V52 or later"*. The forbid-hard-delete migration ultimately landed as V53. **Current state is consistent**, but this kind of rename creates a forensic risk (a V51 PR landing today would silently overwrite ShedLock if Flyway weren't strict about checksums).
- **V55 plaintext-token retention** — `V55__refresh_token_hash.sql:6-7` keeps the plaintext `token` column for backwards-compat. Schedule the **V56 drop column** for 30 days post-soak.
- **No V56 yet on disk**, but **V57 IS on disk**. Flyway will REFUSE to start with `out-of-order=false` (default in `application-prod.yml:36-41` does NOT set `out-of-order: true`) once V57 is installed but V56 is still missing. **This will brick prod on next deploy.** Either:
  - (a) set `spring.flyway.out-of-order=true` (acceptable trade-off if all migrations are idempotent), OR
  - (b) rename V57 → V56 before merging the partman branch, OR
  - (c) introduce an empty `V56__placeholder.sql` (smelly but Flyway-safe).

### 9.2 `validate-on-migrate=true`

`application-prod.yml:41` reads `validate-on-migrate: ${SPRING_FLYWAY_VALIDATE_ON_MIGRATE:true}` — flipped to **true** by default since the predecessor review. Good. **But** the BASELINE SKIP rows for V40/V41/V42/V43 still have `checksum IS NULL`, and `validate-on-migrate=true` will refuse to start as soon as Flyway re-encounters them. **[NEEDS PROD VERIFY]** that the env var was overridden to `false` in `.env.prod` to keep prod alive — if so, the toggle is paper-only.

The fix is `flyway repair` to recompute checksums for V40–V43 + delete the V40/V41 rows entirely (since the SQL never ran), then re-apply via V57 path. This is operator-only and 30 minutes of work.

### 9.3 Alembic 0001 → 0005

5 revisions, monotone numbering, no rename collisions. **But** per predecessor §3 the live `biometric_db` had **no `alembic_version` table at all** as of 2026-04-30 — Alembic had never run against prod, schema came from raw `CREATE TABLE` statements in the repository code. PR #68 (`22bd33c chore(bio): add alembic to runtime image`) closes this by adding `alembic upgrade head` to the entrypoint. Operator must:

1. **Stop** the bio container.
2. Manually create the `alembic_version` table with version `0001_initial` (since the schema matches that point).
3. Run `alembic upgrade head` *inside* the container — should advance through 0002 → 0005 cleanly.
4. Validate `alembic_version.version_num = '0005_embedding_ciphertext'`.
5. **Set `FIVUCSAS_EMBEDDING_KEY` env** before restart, otherwise PR #65 fails fast on boot (intentional).
6. Run `app.infrastructure.persistence.scripts.backfill_embedding_ciphertext` to populate `embedding_ciphertext` for existing rows.
7. Confirm `key_version=1` everywhere; absence of any plaintext-only rows.

**This is operator-only because automation can't infer the right Alembic stamp without prod-state read access.**

---

## 10. Findings + prioritised recommendations

### P0 — urgent, security or correctness

| # | Finding | Action | Effort | Type |
|---|---|---|---|---|
| P0-1 | RLS still bypassed (app connects as table owner; no FORCE; fail-open policies). 13 tenant-keyed tables have no RLS at all. | Create `app_identity` non-superuser role; switch `DATABASE_USERNAME`; `ALTER TABLE … FORCE ROW LEVEL SECURITY` on the 9 RLS tables; extend RLS to the 13 missing tables; tighten policy from "fail-open on NULL GUC" to deny + admin-bypass policy. Migration V58 (after V56/V57 land). | 12–16 h | operator + agent |
| P0-2 | `User` entity has no `@SQLDelete` / `@SQLRestriction`; `ManageUserService.deleteUser` calls `userRepository.delete(user)` (line 288), which V53 trigger now blocks with `restrict_violation`. End user gets 5xx. The hard-delete trigger is the *backup*, not the contract. | Add `@SQLDelete(sql="UPDATE users SET deleted_at=NOW(), status='INACTIVE', is_active=false WHERE id=?")` + `@SQLRestriction("deleted_at IS NULL")` on `User.java`. Replace line 288 with `user.softDelete(); userRepository.save(user);`. Add V58 column comment matching V49. | 2 h | agent |
| P0-3 | 9 `UserRepository` `findBy*` methods do NOT filter `deletedAt IS NULL` — soft-deleted users leak into admin lists, search, counts, expired-guest cron. | Add `AND u.deletedAt IS NULL` to lines 49, 62, 70, 75, 83, 92, 105, 109, 116. Or land #P0-2's `@SQLRestriction` and they get filtered for free. (Prefer the latter — single annotation fixes all.) | 1 h | agent |
| P0-4 | Embedding-encryption is half-deployed: PR #65 writes ciphertext for new rows; existing rows remain plaintext-only until operator runs `backfill_embedding_ciphertext` script. KVKK Decision 2018/10 is currently violated for any pre-2026-05-04 enrolment. | Operator: `FIVUCSAS_EMBEDDING_KEY` set + `alembic upgrade head` + run backfill script + verify zero plaintext-only rows. Then write 0006 promoting `embedding_ciphertext NOT NULL` + dropping plaintext `embedding` once read paths confirm migration. | 4 h ops + 6 h dev | operator + agent |
| P0-5 | V57 on disk without V56; Flyway with `out-of-order=false` will REFUSE to start. Production deploy bricks on next rebuild. | Either renumber V57 → V56 before merge, OR add `V56__noop.sql`, OR set `spring.flyway.out-of-order=true`. Recommend (a) renumber. | 30 min | agent |

### P1 — perf or major hygiene

| # | Finding | Action | Effort | Type |
|---|---|---|---|---|
| P1-1 | `audit_logs` is a plain heap with the V40/V41 BASELINE SKIP shadow markers. V57 (pg_partman) is on disk but `pg_partman` is not installed at the OS level on `shared-postgres`. | Build a custom postgres-17 image bundling `postgresql-17-partman` + push to registry; rebuild shared-postgres with the new image; run `flyway repair` to scrub V40/V41 NULL checksums; apply V57 via partman path. Set `spring.flyway.out-of-order=true` for the rollout. | 6 h | operator |
| P1-2 | Cross-DB orphan biometrics on user hard-purge: `SoftDeletePurgeJob.purgeBatch` issues SQL DELETE but [NEEDS APP VERIFY] does not call `BiometricProcessorClient.deleteEnrollment(userId)` first. KVKK Art. 17 violation. | Add `biometricProcessorClient.deleteAllEnrollments(userId)` to `SoftDeletePurgeJob.purgeBatch` BEFORE the SQL DELETE. Idempotent (404 OK). | 2 h | agent |
| P1-3 | `audit_logs.tenant_id IS NULL` for ~12% of rows (`@Async` thread-local leak). V46 backfilled history; new rows still drift. | Wrap the `@Async` `TaskExecutor` in `DelegatingSecurityContextExecutor` + a custom `DelegatingTenantContextExecutor`. Add an integration test that asserts an async-emitted audit row carries the original thread's tenant_id. | 4 h | agent |
| P1-4 | `face_embeddings` carries TWO vector indexes (ivfflat from Alembic 0003, hnsw from raw repository CREATE TABLE). Write amplification on every enrolment. | Drop `idx_embeddings_vector_ivfflat` in Alembic 0006. Keep HNSW. Confirm via `\di face_embeddings` post-apply. | 1 h | agent |
| P1-5 | `voice_enrollments` orphan in `identity_core` (V33-created, 0 rows) confuses future migrations. | Write V58 `DROP TABLE voice_enrollments;` in `identity_core`. The biometric data lives in `biometric_db`. | 30 min | agent |
| P1-6 | Five tenant FKs are NO ACTION (predecessor §10): `auth_sessions, oauth2_clients, user_devices, user_enrollments, verification_sessions`. Hard-purge job (legitimately bypassing V53 trigger) will fail on these constraints. | V58 `ALTER TABLE … ALTER CONSTRAINT … ON DELETE CASCADE` for each, mirroring `users.tenant_id ON DELETE CASCADE`. | 3 h | agent |
| P1-7 | Hikari `leak-detection-threshold` missing. A handler bug holding a connection >60s exhausts the pool silently. | Add `leak-detection-threshold: 60000` to `application-prod.yml:20-29`. | 30 min | agent |
| P1-8 | `pg_stat_statements` not loaded; no slow-query telemetry. | Add `-c shared_preload_libraries=pg_stat_statements -c pg_stat_statements.track=all -c log_min_duration_statement=1000 -c log_lock_waits=on -c idle_in_transaction_session_timeout=600000` to compose. Rolling restart needed. `CREATE EXTENSION pg_stat_statements;` per DB. | 2 h | operator |
| P1-9 | pgBackRest `archive_mode` not actually on per predecessor §9. PITR is paper-only. | Recreate shared-postgres so compose flags take effect; verify `pg_stat_archiver.archived_count > 0`. Then run a sandbox WAL-replay restore drill. | 1 h | operator |
| P1-10 | TC Kimlik (`users.id_number`) stored plaintext. KVKK Art 6 special category. | Add `IdNumberAttributeConverter` mirroring `TotpSecretAttributeConverter`. AES-GCM via existing key. Add CHECK constraint `id_number IS NULL OR id_number LIKE 'enc:v1:%'` after backfill. | 6 h | agent |

### P2 — polish

| # | Finding | Action | Effort | Type |
|---|---|---|---|---|
| P2-1 | Unused indexes per predecessor §11 (`idx_audit_resource`, `idx_audit_failed_operations`, `idx_audit_request_timing`, dup `idx_api_keys_key_hash`, dup `idx_webauthn_credentials_credential_id`). | Single migration V58a dropping them. | 1 h | agent |
| P2-2 | Missing FK index `idx_users_invited_by`. | One-line partial index. | 15 min | agent |
| P2-3 | Missing failed-event index for security alerting. | `CREATE INDEX idx_audit_failed_recent ON audit_logs(created_at DESC) WHERE success = false;` | 15 min | agent |
| P2-4 | `audit_logs.user_agent_v2` shadow column; `getEffectiveUserAgent()` proves the tech debt. | After verifying zero rows have only `user_agent` set, drop `user_agent` and rename `user_agent_v2 → user_agent`. | 1 h | agent |
| P2-5 | `mv_audit_statistics` has no scheduled REFRESH. View is stale. | Add `@Scheduled(fixedDelay=1h)` or pgcron job. | 30 min | agent |
| P2-6 | Per-table autovacuum tuning for `webauthn_credentials, user_roles, user_enrollments, mfa_sessions` (predecessor §13). | One V58 `ALTER TABLE SET (autovacuum_vacuum_scale_factor=0.05, autovacuum_vacuum_threshold=10);` block. | 30 min | agent |
| P2-7 | `mfa_sessions` cleanup not scheduled (predecessor §14). | `@Scheduled(fixedDelay=1h) MfaSessionRepository.deleteExpiredAndIncomplete(now())`. | 30 min | agent |
| P2-8 | Type mismatch `users.id UUID` ↔ `face_embeddings.user_id VARCHAR(255)` (predecessor §16). | Alembic 0007: `ALTER TABLE face_embeddings ALTER COLUMN user_id TYPE UUID USING user_id::UUID;` + add CHECK constraint pre-cutover. | 2 h | agent |
| P2-9 | `flyway_schema_history` retains BASELINE SKIP rows for V40/V41/V42/V43 (NULL checksums). | `flyway repair` + delete V40/V41 rows after V57 migration owns partitioning. | 1 h | operator |
| P2-10 | `current_tenant_id()` function uses EXCEPTION-driven NULL fallback. | Rewrite to use `current_setting(name, true)` pattern (already used by V53 forbid_hard_delete). | 15 min | agent |
| P2-11 | `users.user_type` + `users.expires_at` consistency CHECK missing (`GUEST` should always have `expires_at`). | `ADD CONSTRAINT chk_user_guest_expiry CHECK (user_type <> 'GUEST' OR expires_at IS NOT NULL)`. | 30 min | agent |
| P2-12 | V15 seed migration writes prod data. | Move out of Flyway into a dev-profile-only seeder, OR gate with `WHERE NOT EXISTS (... fivucsas.local)`. | 1 h | agent |

### P3 — defer

- **HNSW is over-indexing at <50 rows.** Lower `m` from 16 to 8 once we know the real enrolment ceiling.
- **Single-container 5-DB layout** is fine until ~30 RPS sustained or a 6th app. Re-evaluate Q3 2026.
- **Audit-log volume** is low enough today that the partition story is forward-looking only — but with V57 in flight, finish it now rather than keep the option open.

---

## What's working well (top 5)

1. **`Tenant` soft-delete contract** is fully wired (V49 + `@SQLDelete + @SQLRestriction`). The pattern is the canonical answer for `User`. Copy verbatim.
2. **TOTP at-rest encryption** (V39 + V42 + `TotpSecretAttributeConverter` + DB CHECK constraint) is the textbook example of defence-in-depth: code can't bypass DB constraint, DB can't accept un-encrypted, V42 enforces it.
3. **Refresh-token rotation family + secret hashing** (V50 + V55 + RFC 6749 §10.4 reuse-detection) is industry-best-practice and was shipped quickly post-Sec-P2 #6.
4. **Idempotent migration discipline** — V44, V46, V49, V53, V54 all use `IF NOT EXISTS / DO $$ … END $$ / ON CONFLICT DO NOTHING` defensively. Re-runs are harmless. This is rare in commercial Java codebases.
5. **Partial-index hygiene** — `WHERE deleted_at IS NULL`, `WHERE is_revoked = false`, `WHERE is_primary = true`, `WHERE completed_at IS NULL` patterns are used throughout V2/V8/V44/V49. Index size today is 30–40% smaller than it would be with full indexes.

---

## Action plan ordering

### Day 0 (today, agent)
1. **P0-5**: rename V57 → V56 OR add `V56__noop.sql`. *Without this, any deploy after V57 lands bricks prod.*
2. **P0-2**: add `@SQLDelete + @SQLRestriction` to `User.java`; replace line 288 of `ManageUserService` with `user.softDelete(); userRepository.save(user);`.
3. **P0-3**: subsumed by P0-2 — `@SQLRestriction` filters all 9 leaky finders for free.
4. **P0-4 part 1 (agent prep)**: write the operator runbook for the embedding-encryption operator step (alembic stamp + backfill + key set + verify).

### Day 1 (operator)
5. **P0-4 part 2 (operator)**: stamp alembic to 0001_initial, run `alembic upgrade head`, set `FIVUCSAS_EMBEDDING_KEY`, run backfill script, verify zero plaintext-only rows.
6. **P1-9**: recreate shared-postgres so pgBackRest archive_mode flags take effect; verify `pg_stat_archiver`.
7. **P2-9**: `flyway repair` to scrub the BASELINE SKIP rows.

### Week 1 (agent + operator)
8. **P0-1**: create `app_identity` role + switch DATABASE_USERNAME + FORCE RLS migration. *Single highest-leverage change.* Stage on dev first.
9. **P1-1**: build custom postgres-17 image bundling pg_partman + recreate shared-postgres + apply V57.
10. **P1-2**: wire bio-side delete into `SoftDeletePurgeJob.purgeBatch`.
11. **P1-3**: tenant-aware `@Async` executor.
12. **P1-7**: Hikari leak-detection-threshold.
13. **P1-8**: pg_stat_statements + slow-query logging.

### Week 2 (agent)
14. **P1-4 / P1-5 / P1-6 / P1-10**: V58 migration covering vector-index dedup, orphan-table drop, tenant FK CASCADE fixes, TC Kimlik encryption.
15. **P2 batch (P2-1 through P2-12)**: bundled into V58a/V58b/V58c.

---

## Appendix A — severity tally

| Severity | Count |
|----------|-------|
| P0       | 5     |
| P1       | 10    |
| P2       | 12    |
| P3       | 3     |
| **Total**| **30**|

## Appendix B — facts captured at HEAD (without prod psql)

| Repo | HEAD | Last migration on disk | Last entity touched |
|---|---|---|---|
| identity-core-api | `2d958c5` | V57 (pg_partman, in-flight, gated) | `User.java` (P2.10 equality fix, no `@SQLDelete`) |
| biometric-processor | `22bd33c` | Alembic 0005 (`embedding_ciphertext`) | repository_factory.py (Fernet writer wired) |
| parent fivucsas | `e0e87b5` | n/a | N/A |

## Appendix C — items that need a fresh `psql` snapshot

These claims were carried forward from `DB_REVIEW_2026-04-30.md`. Re-confirm after operator runs the day-0/1 actions:

1. `flyway_schema_history` rows for V40/V41/V42/V43 still NULL-checksum
2. `archive_mode = off` despite compose flags
3. `audit_logs.tenant_id IS NULL` count (was 134 / 1082 = 12.4%)
4. `pg_stat_user_indexes.idx_scan = 0` for the listed unused indexes
5. `webauthn_credentials.n_dead_tup / n_live_tup = 8.66` ratio
6. `alembic_version` table existence in `biometric_db` (was missing entirely)
7. 19 face / 35 voice / 2 fingerprint embedding row counts

End of review.
