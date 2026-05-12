-- ============================================================================
-- unused-index-baseline.sql
-- Day-0 baseline snapshot for the prod unused-index 7-day audit.
-- Trigger: RUNBOOK_UNUSED_INDEX_AUDIT.md Step 2.
-- Target DB: identity_core (on fivucsas-postgres).
-- Effect: creates public.ops_unused_index_baseline and inserts a single
-- snapshot of pg_stat_user_indexes tagged with now().
-- Idempotency: re-running clears the prior baseline. If you need to keep
-- multiple snapshots, comment out the TRUNCATE on line 28.
-- ============================================================================

\timing on
\echo 'Day-0 baseline snapshot for unused-index audit'
\echo 'Database:'
SELECT current_database() AS db, now() AS snapshot_taken_at;

-- Defensive: refuse to run against the wrong DB
DO $$
BEGIN
  IF current_database() <> 'identity_core' THEN
    RAISE EXCEPTION 'This script must run against identity_core, not %', current_database();
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.ops_unused_index_baseline (
  captured_at      timestamptz NOT NULL DEFAULT now(),
  schemaname       text,
  relname          text,
  indexrelname     text,
  indexrelid       oid PRIMARY KEY,
  idx_scan         bigint,
  idx_tup_read     bigint,
  idx_tup_fetch    bigint,
  index_size_bytes bigint
);

-- We want ONE clean baseline. Clear any prior partial run.
TRUNCATE public.ops_unused_index_baseline;

INSERT INTO public.ops_unused_index_baseline (
  schemaname, relname, indexrelname, indexrelid,
  idx_scan, idx_tup_read, idx_tup_fetch, index_size_bytes
)
SELECT
  schemaname,
  relname,
  indexrelname,
  indexrelid,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  pg_relation_size(indexrelid)
FROM pg_stat_user_indexes;

-- Sanity-check the snapshot
SELECT
  count(*)                                  AS indexes_captured,
  count(*) FILTER (WHERE idx_scan = 0)      AS zero_scan_indexes,
  pg_size_pretty(sum(index_size_bytes))     AS total_index_size,
  pg_size_pretty(sum(index_size_bytes) FILTER (WHERE idx_scan = 0)) AS zero_scan_size
FROM public.ops_unused_index_baseline;

\echo 'Baseline captured. Re-run Day 1 through Day 7 with unused-index-delta.sql.'
