-- =============================================================
-- DSCI 551 Demo — Query Plan Evidence #1
-- Ingredient exact lookup → B-tree Index Scan
-- =============================================================
-- Application behavior:
--   When a user searches for an ingredient by its English name,
--   the app runs an exact-match query on Ingredient.nameEn.
--
-- Expected internal behavior:
--   PostgreSQL traverses the B-tree index "Ingredient_nameEn_idx"
--   from root → internal → leaf, then fetches the heap tuple.
--
-- Why it matters:
--   Ingredient lookup is an interactive operation on the hot path.
--   An indexed lookup is ~100x faster than a sequential scan on a
--   10k-row table, and the gap widens as data grows.
-- =============================================================

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT *
FROM "Ingredient"
WHERE "nameEn" = 'Chicken';

-- Look for:
--   • "Index Scan using Ingredient_nameEn_idx"
--   • "Index Cond: (nameEn = 'Chicken')"
--   • Execution Time under 1 ms
--   • Very low "Buffers: shared hit" count (just the index + heap pages)
