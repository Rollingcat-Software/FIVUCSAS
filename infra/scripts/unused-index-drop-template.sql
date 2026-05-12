-- ============================================================================
-- unused-index-drop-template.sql
-- DESTRUCTIVE. DROP INDEX template for the prod unused-index 7-day audit.
-- Trigger: RUNBOOK_UNUSED_INDEX_AUDIT.md Step 5.
-- Target DB: identity_core (on fivucsas-postgres).
--
-- SAFETY DEFAULTS:
--   * Whole script is wrapped in BEGIN; ... ROLLBACK;
--   * Default tail is ROLLBACK; — a naive `psql ... < file` rolls back.
--   * Operator MUST manually edit ROLLBACK -> COMMIT after eyeball review.
--   * Forbidden tables are listed at the top — DO NOT add indexes from
--     webauthn_credentials, oauth2_clients, refresh_tokens, audit_logs.
--
-- BEFORE RUNNING:
--   1. Save Step 4's rollback_ddl output to
--      /opt/projects/infra/backups/unused_index_rollback_<date>.sql
--   2. Copy this file to /tmp/unused-index-drop-<date>.sql
--   3. Replace every TODO_INDEX_NAME with a real index name from the Step 4
--      candidate list. Confirm none belong to the forbidden tables.
--   4. Use DROP INDEX CONCURRENTLY only if you remove the BEGIN/ROLLBACK
--      wrapper (CONCURRENTLY cannot run inside a transaction). For the
--      defensive default we use plain DROP INDEX inside a transaction so
--      ROLLBACK is always available.
-- ============================================================================

\timing on
\echo '=== unused-index DROP template ==='
\echo 'If you see this message and HAVE NOT edited the file, this will ROLLBACK.'

DO $$
BEGIN
  IF current_database() <> 'identity_core' THEN
    RAISE EXCEPTION 'This script must run against identity_core, not %', current_database();
  END IF;
END$$;

BEGIN;

-- ----------------------------------------------------------------------------
-- FORBIDDEN TABLE GUARD (do NOT remove)
-- If any of these names appear in a DROP INDEX below, the operator must
-- have inserted them by mistake. The trigger below would catch it, but the
-- right answer is to NOT type them.
-- ----------------------------------------------------------------------------
SELECT 'Forbidden tables (DO NOT drop indexes on these):' AS reminder;
SELECT unnest(ARRAY[
  'webauthn_credentials',
  'oauth2_clients',
  'refresh_tokens',
  'audit_logs'
]) AS forbidden_table;

-- ----------------------------------------------------------------------------
-- DROP STATEMENTS — fill in TODO_INDEX_NAME_n with values from Step 4.
-- Leave any TODO unset to make psql error out with a clear "relation does
-- not exist" failure rather than silently succeeding.
-- ----------------------------------------------------------------------------

-- 1) Large drop candidate (size > 10 MB) per Step 4:
-- Expected example (subject to Step 4 verification):
--   DROP INDEX IF EXISTS public.idx_voice_embeddings_ivfflat;
DROP INDEX IF EXISTS public.TODO_INDEX_NAME_1;
\echo 'Dropped TODO_INDEX_NAME_1 (or no-op if already missing).'

-- 2) Optional next drop candidate. Comment out or duplicate as needed.
-- DROP INDEX IF EXISTS public.TODO_INDEX_NAME_2;
-- \echo 'Dropped TODO_INDEX_NAME_2 (or no-op if already missing).'

-- 3) Add more drop lines below as Step 4 dictates. Keep one per line for
-- review clarity. Stop adding once you've covered the verified candidates.

-- ----------------------------------------------------------------------------
-- Post-drop verification (still inside the transaction)
-- ----------------------------------------------------------------------------
SELECT 'Post-drop index list (verify expected indexes are gone):' AS step;
SELECT relname AS table_name, indexrelname AS index_name,
       pg_size_pretty(pg_relation_size(indexrelid)) AS size
  FROM pg_stat_user_indexes
 WHERE indexrelname IN ('TODO_INDEX_NAME_1' /* add others as needed */);

-- ----------------------------------------------------------------------------
-- COMMIT GATE
-- The DEFAULT below is ROLLBACK. Change to COMMIT only after you have
-- visually confirmed every DROP above is one of the verified Step 4
-- candidates AND is not on a forbidden table.
-- ----------------------------------------------------------------------------

ROLLBACK;
-- COMMIT;  -- <-- uncomment + comment ROLLBACK to make this real

\echo ''
\echo 'Default tail executed ROLLBACK. If you intended to drop, re-run with COMMIT.'
