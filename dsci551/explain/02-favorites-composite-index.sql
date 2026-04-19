-- =============================================================
-- DSCI 551 Demo — Query Plan Evidence #2
-- Favorites retrieval → Composite B-tree Index Scan Backward
-- =============================================================
-- Application behavior:
--   On the favorites page, the app loads a user's favorites
--   filtered by userId and ordered by createdAt DESC.
--
-- Expected internal behavior:
--   PostgreSQL uses the composite index "Favorite_userId_createdAt_idx".
--   Because createdAt is the *second* column of the index, an
--   "Index Scan Backward" produces rows already in DESC order —
--   no separate Sort step is needed.
--
-- Why it matters:
--   This is the textbook example of why composite index column
--   order must match the query's WHERE + ORDER BY pattern.
--   The Limit 20 also lets PostgreSQL stop after reading 20 leaf
--   entries instead of all 2000 matching rows.
--
-- NOTE: Replace the userId below with your seeded demo user id.
--   The seed script prints it on completion. You can also query:
--     SELECT id FROM "User" WHERE email = 'demo@551.edu';
-- =============================================================

-- Fetch demo user id dynamically so this script is portable across reseeds.
\set demo_user_id `psql meowlytics_551 -tAc "SELECT id FROM \"User\" WHERE email = 'demo@551.edu'"`

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT *
FROM "Favorite"
WHERE "userId" = (SELECT id FROM "User" WHERE email = 'demo@551.edu')
ORDER BY "createdAt" DESC
LIMIT 20;

-- Look for:
--   • "Index Scan Backward using Favorite_userId_createdAt_idx"
--   • "Index Cond: (userId = ...)"
--   • NO separate "Sort" node (the index already gives sorted order)
--   • "Limit" node on top — stops after 20 rows
--   • Execution Time under 1 ms
