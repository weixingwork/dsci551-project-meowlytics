-- =============================================================
-- DSCI 551 Demo — Query Plan Evidence #4
-- With Index vs Without Index — direct cost comparison
-- =============================================================
-- Goal (from TA feedback):
--   "Try to compare cases (with vs without index, small vs larger
--    data) to clearly demonstrate planner behaviour."
--
-- This script drops Ingredient_nameEn_idx, reruns the same query,
-- observes the Seq Scan, then rebuilds the index.
--
-- SAFETY: Only run against meowlytics_551 (the demo database).
--         Do NOT run against any production or shared database.
-- =============================================================

\echo '>>> BEFORE: query plan WITH B-tree index on nameEn'
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM "Ingredient" WHERE "nameEn" = 'Salmon';

\echo ''
\echo '>>> Dropping Ingredient_nameEn_idx...'
DROP INDEX IF EXISTS "Ingredient_nameEn_idx";

\echo ''
\echo '>>> AFTER: same query plan WITHOUT the index'
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM "Ingredient" WHERE "nameEn" = 'Salmon';

\echo ''
\echo '>>> Recreating the index...'
CREATE INDEX "Ingredient_nameEn_idx" ON "Ingredient" ("nameEn");
ANALYZE "Ingredient";

\echo ''
\echo '>>> CONFIRM: plan restored to Index Scan'
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM "Ingredient" WHERE "nameEn" = 'Salmon';

-- Expected observation:
--   BEFORE: Index Scan, cost ~8, Execution Time < 0.1 ms
--   AFTER:  Seq Scan,   cost ~711, Execution Time ~5-10 ms
--   Ratio:  ~50-100x slower without the index on 10k rows
--
-- Demo narration:
--   "Planner chose Index Scan because the estimated cost (8.30) is
--    far lower than a full Seq Scan over 10,000 heap pages (711.00).
--    Once the index is gone, Seq Scan is the only option — its cost
--    estimate doesn't change, but now it's also the cheapest option."
