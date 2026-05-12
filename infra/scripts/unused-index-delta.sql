-- ============================================================================
-- unused-index-delta.sql
-- Daily monitoring SQL for the prod unused-index 7-day audit.
-- Trigger: RUNBOOK_UNUSED_INDEX_AUDIT.md Step 3.
-- Target DB: identity_core (on fivucsas-postgres).
-- Effect: read-only. Joins current pg_stat_user_indexes against the Day-0
-- baseline and emits a one-row-per-index summary with delta + size +
-- recommended_action.
--
-- Usage:
--   docker exec -i fivucsas-postgres psql -U postgres -d identity_core \
--     < unused-index-delta.sql
--
-- For CSV output (operator records each day's run):
--   See the \copy variant in RUNBOOK_UNUSED_INDEX_AUDIT.md Step 3.
-- ============================================================================

\timing on
\echo 'Day-N delta vs baseline for unused-index audit'

DO $$
BEGIN
  IF current_database() <> 'identity_core' THEN
    RAISE EXCEPTION 'This script must run against identity_core, not %', current_database();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ops_unused_index_baseline') THEN
    RAISE EXCEPTION 'Baseline table missing. Run unused-index-baseline.sql first.';
  END IF;
END$$;

-- Day-N delta report
SELECT
  l.relname        AS table_name,
  l.indexrelname   AS index_name,
  b.captured_at    AS baseline_at,
  b.idx_scan       AS baseline_scans,
  l.idx_scan       AS current_scans,
  (l.idx_scan - b.idx_scan) AS delta,
  pg_size_pretty(pg_relation_size(l.indexrelid)) AS index_size,
  CASE
    WHEN l.relname IN ('webauthn_credentials','oauth2_clients','refresh_tokens','audit_logs')
      THEN 'SKIP (forbidden table)'
    WHEN (l.idx_scan - b.idx_scan) = 0
         AND pg_relation_size(l.indexrelid) > 10*1024*1024
      THEN 'CANDIDATE FOR DROP'
    WHEN (l.idx_scan - b.idx_scan) = 0
      THEN 'unused but small (<10MB) — keep'
    ELSE 'used during soak — keep'
  END AS recommended_action
FROM pg_stat_user_indexes l
JOIN public.ops_unused_index_baseline b USING (indexrelid)
ORDER BY
  (l.idx_scan - b.idx_scan) ASC,
  pg_relation_size(l.indexrelid) DESC;

-- Headline counts
\echo ''
\echo '=== Summary ==='
SELECT
  count(*) FILTER (WHERE (l.idx_scan - b.idx_scan) = 0)                       AS still_zero_delta,
  count(*) FILTER (WHERE (l.idx_scan - b.idx_scan) > 0)                       AS had_some_traffic,
  count(*) FILTER (WHERE (l.idx_scan - b.idx_scan) = 0
                     AND pg_relation_size(l.indexrelid) > 10*1024*1024
                     AND l.relname NOT IN
                       ('webauthn_credentials','oauth2_clients','refresh_tokens','audit_logs'))
                                                                              AS drop_candidates
FROM pg_stat_user_indexes l
JOIN public.ops_unused_index_baseline b USING (indexrelid);
