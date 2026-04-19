-- =============================================================
-- DSCI 551 Demo — Query Plan Evidence #3
-- Fuzzy ILIKE with leading wildcard → Sequential Scan
-- (B-tree index limitation — reverse example)
-- =============================================================
-- Application behavior:
--   When exact ingredient lookup fails, the app falls back to
--   fuzzy matching — essentially an ILIKE with wildcards.
--
-- Expected internal behavior:
--   PostgreSQL CANNOT use "Ingredient_nameEn_idx" for
--   `ILIKE '%chick%'` because:
--     1. B-tree is ordered by full-string prefix comparison.
--     2. A leading wildcard makes the prefix unknown, so no
--        contiguous leaf-page range can satisfy the predicate.
--   → Planner falls back to Seq Scan across all 10,000 rows.
--
-- Why it matters (TA feedback):
--   "Briefly address why certain queries (e.g., fuzzy matching)
--    do not benefit from B-tree indexes."
--   This is that evidence. The proper tools for this workload are:
--     • pg_trgm GIN / GiST index (trigram similarity)
--     • Full-text search (tsvector + tsquery)
--     • citext for case-insensitive equality only
-- =============================================================

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT *
FROM "Ingredient"
WHERE "nameEn" ILIKE '%chick%';

-- Look for:
--   • "Seq Scan on Ingredient"
--   • "Filter: (nameEn ~~* '%chick%')"
--   • "Rows Removed by Filter: ~9400"
--   • Execution Time ~100x slower than exact lookup
--   • NO mention of "Index Scan"
