-- ============================================================================
-- unused-index-verify.sql
-- Day-7 verification: stricter cut returning only indexes that are eligible
-- to drop (delta == 0 AND size > 10 MB AND table NOT in forbidden list).
-- Trigger: RUNBOOK_UNUSED_INDEX_AUDIT.md Step 4.
-- Target DB: identity_core (on fivucsas-postgres).
-- Effect: read-only. Two result sets:
--   1) Size-bucket summary
--   2) Drop-candidate rows including pg_get_indexdef() rollback DDL
-- ============================================================================

\timing on
\echo 'Day-7 verification — strict drop-candidate list'

DO $$
BEGIN
  IF current_database() <> 'identity_core' THEN
    RAISE EXCEPTION 'This script must run against identity_core, not %', current_database();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ops_unused_index_baseline') THEN
    RAISE EXCEPTION 'Baseline table missing. Run unused-index-baseline.sql first.';
  END IF;
END$$;

-- Confirm the baseline is at least 7 days old
SELECT
  min(captured_at)                              AS baseline_at,
  now() - min(captured_at)                      AS soak_window,
  CASE
    WHEN now() - min(captured_at) < interval '7 days'
      THEN 'WARNING: soak window < 7 days. Strict policy says wait.'
    ELSE 'OK: soak window >= 7 days'
  END                                           AS soak_window_status
FROM public.ops_unused_index_baseline;

-- (1) Size-bucket summary
\echo ''
\echo '=== Drop-candidate size buckets ==='
SELECT
  CASE
    WHEN pg_relation_size(l.indexrelid) > 100*1024*1024 THEN '> 100 MB'
    WHEN pg_relation_size(l.indexrelid) >  50*1024*1024 THEN '50-100 MB'
    WHEN pg_relation_size(l.indexrelid) >  10*1024*1024 THEN '10-50 MB'
    ELSE '< 10 MB (excluded from drop list)'
  END AS size_bucket,
  count(*) AS index_count,
  pg_size_pretty(sum(pg_relation_size(l.indexrelid))) AS total_size_in_bucket
FROM pg_stat_user_indexes l
JOIN public.ops_unused_index_baseline b USING (indexrelid)
WHERE (l.idx_scan - b.idx_scan) = 0
  AND l.relname NOT IN ('webauthn_credentials','oauth2_clients','refresh_tokens','audit_logs')
GROUP BY 1
ORDER BY 1;

-- (2) The actual drop candidate list with rollback DDL
\echo ''
\echo '=== Drop candidates (size > 10 MB) ==='
SELECT
  l.relname        AS table_name,
  l.indexrelname   AS index_name,
  pg_size_pretty(pg_relation_size(l.indexrelid)) AS index_size,
  (l.idx_scan - b.idx_scan) AS delta,
  pg_get_indexdef(l.indexrelid) AS rollback_ddl
FROM pg_stat_user_indexes l
JOIN public.ops_unused_index_baseline b USING (indexrelid)
WHERE (l.idx_scan - b.idx_scan) = 0
  AND pg_relation_size(l.indexrelid) > 10*1024*1024
  AND l.relname NOT IN ('webauthn_credentials','oauth2_clients','refresh_tokens','audit_logs')
ORDER BY pg_relation_size(l.indexrelid) DESC;

-- (3) Also surface the small-but-clearly-redundant ones so the operator
--     can decide whether to include them out-of-band. These are NOT
--     auto-dropped by the template — manual decision only.
\echo ''
\echo '=== Small-but-redundant indexes (manual review, not auto-included) ==='
SELECT
  l.relname        AS table_name,
  l.indexrelname   AS index_name,
  pg_size_pretty(pg_relation_size(l.indexrelid)) AS index_size,
  (l.idx_scan - b.idx_scan) AS delta,
  'small — operator-decision; not in auto-drop template' AS note
FROM pg_stat_user_indexes l
JOIN public.ops_unused_index_baseline b USING (indexrelid)
WHERE (l.idx_scan - b.idx_scan) = 0
  AND pg_relation_size(l.indexrelid) BETWEEN 1 AND 10*1024*1024
  AND l.relname NOT IN ('webauthn_credentials','oauth2_clients','refresh_tokens','audit_logs')
ORDER BY pg_relation_size(l.indexrelid) DESC;

\echo ''
\echo 'CAPTURE the rollback_ddl column to a file BEFORE running the drop template.'
\echo 'See RUNBOOK_UNUSED_INDEX_AUDIT.md Step 4 for the \copy variant.'
