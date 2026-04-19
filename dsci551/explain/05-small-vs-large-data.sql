-- =============================================================
-- DSCI 551 Demo — Query Plan Evidence #5
-- Small dataset vs Large dataset — planner cost estimation
-- =============================================================
-- Goal (from TA feedback):
--   "Discuss how the query planner makes decisions
--    (cost estimation, selectivity)."
--
-- This script creates a 100-row temp copy of Ingredient and shows
-- that on small data, the planner prefers Seq Scan even though the
-- same B-tree index exists — because scanning 100 rows is cheaper
-- than the overhead of an index lookup.
--
-- SAFETY: Uses a TEMP table — nothing persists after the session.
-- =============================================================

-- Build a 100-row temp table with the same shape + index
CREATE TEMP TABLE ingredient_small AS
SELECT * FROM "Ingredient" LIMIT 100;

CREATE INDEX ingredient_small_nameEn_idx ON ingredient_small ("nameEn");
ANALYZE ingredient_small;

\echo '>>> SMALL TABLE (100 rows) — planner choice:'
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM ingredient_small WHERE "nameEn" = 'Chicken';

\echo ''
\echo '>>> LARGE TABLE (10,000 rows) — planner choice:'
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM "Ingredient" WHERE "nameEn" = 'Chicken';

-- Expected observation:
--   SMALL (100 rows):   Seq Scan — cheaper than 1 index lookup
--                       because the whole table fits in a single page.
--   LARGE (10k rows):   Index Scan — index lookup pays off once
--                       there are enough rows to make scanning
--                       the whole heap expensive.
--
-- Demo narration:
--   "The planner is cost-based. Having an index does not mean it will
--    always be used. PostgreSQL estimates cost from:
--      1. Table statistics (pg_stats: n_distinct, most_common_vals)
--      2. Selectivity of the WHERE clause (how many rows match)
--      3. Fixed startup cost of each access method
--    For a 100-row table, the overhead of walking the B-tree exceeds
--    the cost of scanning one heap page. For 10,000 rows, the heap
--    spans many pages, and the index pays for itself."
