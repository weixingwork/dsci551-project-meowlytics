-- =============================================================
-- DSCI 551 Demo — Evidence #6
-- PostgreSQL MVCC (Multi-Version Concurrency Control)
-- =============================================================
-- Guideline Example 2 (PostgreSQL — Content Management App)
-- explicitly asks to:
--   "show & explain how MVCC is used to handle concurrent read & write"
--
-- TA feedback also suggested:
--   "optionally touching on MVCC in the context of concurrent reads/writes"
--
-- Application context in Meowlytics:
--   A user is reading their favorites page (long-running SELECT) while
--   another request is inserting a new favorite or an AI-generated
--   ingredient. With MVCC, the reader's query is NOT blocked by the
--   writer and continues to see a consistent snapshot.
--
-- This file has TWO parts:
--   PART A — Single session: inspect xmin / xmax tuple-version columns
--   PART B — Two sessions:   demonstrate snapshot isolation live
-- =============================================================


-- =============================================================
-- PART A — Tuple versioning (single session, runs in one go)
-- =============================================================
-- Every row in PostgreSQL carries two hidden system columns:
--   xmin  = id of the transaction that INSERTED this tuple version
--   xmax  = id of the transaction that DELETED or UPDATED it
--           (0 if still live)
--
-- An UPDATE does NOT overwrite a row in place. Instead it:
--   1. Sets xmax on the old tuple version
--   2. Writes a new tuple version with a new xmin
-- Both versions coexist on the heap until VACUUM reclaims the dead one.
-- This is what makes readers non-blocking.

\echo '>>> 1. Pick one ingredient row and show its tuple-version metadata'
SELECT xmin, xmax, ctid, id, "nameEn"
FROM "Ingredient"
WHERE "nameEn" = 'Chicken';

\echo ''
\echo '>>> 2. Current transaction id (xmin of any new row will match this)'
SELECT txid_current();

\echo ''
\echo '>>> 3. Perform an UPDATE inside a transaction'
BEGIN;
UPDATE "Ingredient"
SET description = 'Updated at ' || now()::text
WHERE "nameEn" = 'Chicken';

\echo '>>> 4. The SAME logical row now has a NEW xmin and a NEW ctid'
\echo '       (the old tuple version still exists on disk until VACUUM)'
SELECT xmin, xmax, ctid, id, "nameEn"
FROM "Ingredient"
WHERE "nameEn" = 'Chicken';

ROLLBACK;

\echo ''
\echo '>>> 5. After ROLLBACK, the original tuple is visible again —'
\echo '       proof that the update produced a NEW version rather than'
\echo '       overwriting the existing one.'
SELECT xmin, xmax, ctid, id, "nameEn"
FROM "Ingredient"
WHERE "nameEn" = 'Chicken';

\echo ''
\echo '>>> 6. Heap bloat — how many dead tuples does the table carry?'
\echo '       (n_dead_tup grows with every UPDATE/DELETE until VACUUM)'
SELECT
  relname,
  n_live_tup,
  n_dead_tup,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
WHERE relname = 'Ingredient';


-- =============================================================
-- PART B — Snapshot isolation (requires TWO psql sessions)
-- =============================================================
-- Run the following in two separate terminals. Session 1 starts
-- a transaction and takes a snapshot; Session 2 commits an update
-- that Session 1 cannot see until it commits its own transaction.
--
-- ┌──────────────── Session 1 (reader) ─────────────────┐
-- │  psql meowlytics_551                                │
-- │                                                     │
-- │  BEGIN ISOLATION LEVEL REPEATABLE READ;             │
-- │  SELECT description FROM "Ingredient"               │
-- │    WHERE "nameEn" = 'Chicken';                      │
-- │  -- Note the value. Keep this transaction open.     │
-- └─────────────────────────────────────────────────────┘
--
-- ┌──────────────── Session 2 (writer) ─────────────────┐
-- │  psql meowlytics_551                                │
-- │                                                     │
-- │  UPDATE "Ingredient"                                │
-- │    SET description = 'MVCC demo — modified'         │
-- │    WHERE "nameEn" = 'Chicken';                      │
-- │  -- Returns immediately (no blocking).              │
-- │  -- Commit is implicit (autocommit).                │
-- └─────────────────────────────────────────────────────┘
--
-- ┌──────────────── Session 1 (reader, again) ──────────┐
-- │  SELECT description FROM "Ingredient"               │
-- │    WHERE "nameEn" = 'Chicken';                      │
-- │  -- STILL shows the OLD description — Session 1 is  │
-- │     locked to the snapshot it took at BEGIN.        │
-- │                                                     │
-- │  COMMIT;                                            │
-- │                                                     │
-- │  SELECT description FROM "Ingredient"               │
-- │    WHERE "nameEn" = 'Chicken';                      │
-- │  -- NOW sees the new description committed          │
-- │     by Session 2.                                   │
-- └─────────────────────────────────────────────────────┘
--
-- What this proves:
--   1. The reader (Session 1) was NEVER blocked by the writer.
--   2. The reader saw a consistent snapshot throughout its
--      transaction, even though another transaction committed
--      a new tuple version during that window.
--   3. Snapshot isolation is implemented through the same
--      xmin / xmax visibility rules demonstrated in PART A.
-- =============================================================
