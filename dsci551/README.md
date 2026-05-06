# DSCI 551 Demo Kit — Meowlytics

**Student:** Wei Xing
**Database system:** PostgreSQL 15 (local installation)
**Focus areas:** B-tree indexing · Cost-based query planner · MVCC

This directory contains everything an instructor or TA needs to reproduce
the Meowlytics database demonstration end to end: a deterministic seed
script, six numbered `EXPLAIN ANALYZE` evidence scripts, the final demo
slide deck, and the final written report.

---

## Table of contents

1. [Prerequisites](#1-prerequisites)
2. [One-command setup](#2-one-command-setup)
3. [Manual setup (step by step)](#3-manual-setup-step-by-step)
4. [The six evidence scripts](#4-the-six-evidence-scripts)
   1. [Script 01 — Ingredient exact lookup](#41-script-01--ingredient-exact-lookup)
   2. [Script 02 — Favorites composite index](#42-script-02--favorites-composite-index)
   3. [Script 03 — Fuzzy ILIKE forces Seq Scan](#43-script-03--fuzzy-ilike-forces-seq-scan)
   4. [Script 04 — With vs without index](#44-script-04--with-vs-without-index)
   5. [Script 05 — Small data vs large data](#45-script-05--small-data-vs-large-data)
   6. [Script 06 — MVCC tuple versioning and snapshot isolation](#46-script-06--mvcc-tuple-versioning-and-snapshot-isolation)
5. [Application operations to PostgreSQL internals — mapping table](#5-application-operations-to-postgresql-internals--mapping-table)
6. [Directory layout](#6-directory-layout)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Prerequisites

| Tool | Required version | Notes |
|---|---|---|
| Node.js | 20 or newer | Tested with Node 25 |
| PostgreSQL | 14 or newer | Tested with PostgreSQL 15.15 (Homebrew) |
| npm | bundled with Node | |

### macOS (Homebrew)

```bash
brew install node postgresql@15
brew services start postgresql@15
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
```

### Ubuntu / Debian

```bash
sudo apt update
sudo apt install -y nodejs npm postgresql
sudo service postgresql start
```

---

## 2. One-command setup

From the **repository root** (not from inside this `dsci551/` directory):

```bash
bash dsci551/setup.sh
```

The script performs the following steps in order, and each step is
idempotent:

1. **Sanity check** — verifies that `psql` and `node` are on `PATH`.
2. **Database creation** — creates `meowlytics_551` if it does not exist.
3. **Environment** — copies `dsci551/.env.example` to `.env` if missing,
   then rewrites the committed demo `DATABASE_URL` to your local
   PostgreSQL role (your shell username on Homebrew installs). If you
   have already customized `DATABASE_URL`, the script preserves it.
4. **Dependencies** — runs `npm install` if `node_modules` is missing.
5. **Schema push** — runs `npx prisma db push --accept-data-loss` to
   create all four tables and B-tree indexes from `prisma/schema.prisma`.
6. **Seed** — runs `npx tsx dsci551/seed/seed.ts` with a fixed-seed
   Mulberry32 PRNG. Always produces the same 10,000 ingredients,
   51 users, and 5,000 favorites across machines.
7. **Smoke test** — runs `EXPLAIN ANALYZE` on the exact-lookup query
   and prints the plan to confirm the index is in use.

Expected total runtime on a laptop: under 30 seconds.

---

## 3. Manual setup (step by step)

If you prefer to run each step yourself, the following commands match
what `setup.sh` does internally.

### 3.1 Create the database

```bash
createdb meowlytics_551
```

### 3.2 Configure environment

```bash
cp dsci551/.env.example .env
```

Edit `.env` and change the username portion of `DATABASE_URL` to match
your local PostgreSQL role (typically `whoami` on Homebrew installs).

### 3.3 Install dependencies

```bash
npm install
```

### 3.4 Create the schema

```bash
npx prisma db push --accept-data-loss
```

This creates four tables and all B-tree indexes declared in
[`prisma/schema.prisma`](../prisma/schema.prisma):

```
Ingredient (10,000 rows)
  - Ingredient_pkey                 implicit B-tree on PK (cuid)
  - Ingredient_name_idx             B-tree on name      (Chinese name)
  - Ingredient_nameEn_idx           B-tree on nameEn    (English name)
  - Ingredient_source_idx           B-tree on source    (knowledge_base | ai_generated)

User (51 rows)
  - User_pkey                       implicit B-tree on PK
  - User_email_key                  unique B-tree on email

Favorite (5,000 rows)
  - Favorite_pkey                   implicit B-tree on PK
  - Favorite_userId_createdAt_idx   composite B-tree on (userId, createdAt)

Folder (0 rows in seed)
  - Folder_pkey                     implicit B-tree on PK
  - Folder_userId_createdAt_idx     composite B-tree on (userId, createdAt)
```

### 3.5 Seed synthetic data

```bash
npx tsx dsci551/seed/seed.ts
```

Expected output on success:

```
Seed complete in ~2s

Summary:
  Ingredients: 10000
  Users:       51
  Favorites:   5000

Demo credentials:
  email:    demo@551.edu
  password: demo551
  user id:  <a freshly generated cuid>
```

The seed uses a fixed-seed Mulberry32 PRNG, so the data is identical
across runs on any machine. The only value that changes between runs
is the demo user's `cuid` (used as a primary key); the demo email and
password are stable, so all evidence scripts remain reproducible.

### 3.6 Run the web app (optional, for the UI demo)

```bash
npm run dev
# open http://localhost:3000
# log in with demo@551.edu / demo551
```

The AI image-analysis feature requires `GOOGLE_API_KEY`, but it is
**not** needed for any of the database / `EXPLAIN ANALYZE`
demonstrations below. Ingredient lookup and favorites retrieval use
only the seeded data.

---

## 4. The six evidence scripts

All six scripts live in [`explain/`](explain/) and are self-contained
`psql` files. Run any individual one with:

```bash
psql -P pager=off meowlytics_551 -f dsci551/explain/<filename>.sql
```

Or run all of them sequentially:

```bash
for f in dsci551/explain/*.sql; do
  psql -P pager=off meowlytics_551 -f "$f"
done
```

The `-P pager=off` flag prevents long `EXPLAIN` output from opening the
`(END)` pager screen during a live demo.

The scripts are numbered in the recommended viewing order, which mirrors
the structure of the final report and the demo deck.

---

### 4.1 Script 01 — Ingredient exact lookup

**File:** [`explain/01-ingredient-exact-lookup.sql`](explain/01-ingredient-exact-lookup.sql)

**What it tests.** The most common application operation: a user clicks
an ingredient name (e.g. `Chicken`) and the API issues an exact-match
query against `Ingredient.nameEn`.

**The query.**

```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM "Ingredient" WHERE "nameEn" = 'Chicken';
```

**Expected plan.**

```
Index Scan using "Ingredient_nameEn_idx" on "Ingredient"
  (cost=0.29..8.30 rows=1 width=428)
  (actual time=0.030..0.033 rows=1 loops=1)
  Index Cond: ("nameEn" = 'Chicken'::text)
  Buffers: shared hit=5
Execution Time: ~0.07 ms
```

**What this proves.**

- PostgreSQL chose `Ingredient_nameEn_idx` (a B-tree) over a sequential
  scan because the planner estimated the index path as cheaper.
- The query touched only **5 buffer pages** (about 3 index + 2 heap),
  versus the 1,167 pages a sequential scan would have read.
- An exact-match equality predicate on an indexed column maps directly
  to a single root-to-leaf B-tree traversal followed by one heap fetch
  via the `ctid` stored in the index entry.

**Why it matters.** This is the canonical mapping between an
application operation (single-row lookup by a known name) and a
database internal (B-tree traversal). The 200x reduction in buffer
hits is the empirical justification for adding the `nameEn` index.

---

### 4.2 Script 02 — Favorites composite index

**File:** [`explain/02-favorites-composite-index.sql`](explain/02-favorites-composite-index.sql)

**What it tests.** Loading the Favorites page for a logged-in user.
The application query filters by `userId` and orders all of that user's
favorites by `createdAt` descending. The evidence script adds
`LIMIT 20` only to keep the demo output compact and to show that the
executor can stop early when a page-sized result is requested.

**The query.**

```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT *
FROM "Favorite"
WHERE "userId" = (SELECT id FROM "User" WHERE email = 'demo@551.edu')
ORDER BY "createdAt" DESC
LIMIT 20;
```

**Expected plan.**

```
Limit
  ->  Index Scan Backward using "Favorite_userId_createdAt_idx" on "Favorite"
        Index Cond: ("userId" = $0)
        Buffers: shared hit=28
Execution Time: ~0.19 ms
```

**What this proves.**

- The composite index `(userId, createdAt)` serves both the `WHERE`
  filter and the `ORDER BY` requirement in a single pass.
- PostgreSQL produces an **`Index Scan Backward`** node because the
  index is physically sorted ascending; reading leaf entries backward
  produces rows in `createdAt DESC` order.
- The plan contains **no separate `Sort` node**: the ordering is "free"
  from the index structure.
- In the evidence query, `Limit 20` causes the executor to stop after
  20 leaf entries rather than read all 2,000 favorites belonging to the
  demo user. The current application route does not apply this limit;
  it retrieves all matching favorites in index order.

**Why it matters.** This is the textbook example of why composite
index column order must reflect the query's combined filter and sort
pattern. A single-column index on either `userId` or `createdAt` would
have forced a separate sort step.

---

### 4.3 Script 03 — Fuzzy ILIKE forces Seq Scan

**File:** [`explain/03-fuzzy-ilike-seq-scan.sql`](explain/03-fuzzy-ilike-seq-scan.sql)

**What it tests.** A leading-wildcard pattern match — the kind of
"contains substring" search a user might want when they cannot recall
the exact ingredient name.

**The query.**

```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM "Ingredient" WHERE "nameEn" ILIKE '%chick%';
```

**Expected plan.**

```
Seq Scan on "Ingredient"
  Filter: ("nameEn" ~~* '%chick%'::text)
  Rows Removed by Filter: ~9400
  Buffers: shared hit=1167
Execution Time: ~12 ms
```

**What this proves.**

- A B-tree index is sorted lexicographically by **prefix**. A
  `LIKE 'chick%'` (no leading wildcard) can be served from the index
  by jumping to a contiguous range of leaf pages.
- A **leading wildcard** removes any usable prefix, so no contiguous
  range can satisfy the predicate. The planner falls back to scanning
  every heap page.
- The `Rows Removed by Filter: 9400` line confirms that PostgreSQL
  examined every row in the table.

**Why it matters.** This is an honest reverse example. The B-tree
index is not a universal solution — its ordering only helps queries
whose access pattern aligns with that ordering. A production fix would
be to add the `pg_trgm` extension and a **GIN index** on trigrams of
`nameEn`, which would make leading-wildcard `ILIKE` indexable. This
project deliberately scopes the analysis to B-tree behavior.

---

### 4.4 Script 04 — With vs without index

**File:** [`explain/04-with-vs-without-index.sql`](explain/04-with-vs-without-index.sql)

**What it tests.** The same exact-lookup query, run three times: with
the `nameEn` index in place, with the index dropped, and after
recreating the index. This isolates the index's contribution from
every other variable.

**The script does:**

1. `EXPLAIN ANALYZE` the exact-lookup query (index present).
2. `DROP INDEX "Ingredient_nameEn_idx"`.
3. `EXPLAIN ANALYZE` the same query (no index).
4. `CREATE INDEX` the same index.
5. `ANALYZE "Ingredient"`.
6. `EXPLAIN ANALYZE` once more to confirm the plan is restored.

**Expected observation.**

| Phase | Plan | Cost | Execution time |
|---|---|---|---|
| With index | Index Scan | ~0.29 .. 8.30 | ~0.10 ms |
| Without index | Seq Scan | ~0.00 .. 1292 | ~4-8 ms |
| With index (restored) | Index Scan | ~0.29 .. 8.30 | ~0.02 ms |

**What this proves.**

- The same physical query has dramatically different plans and runtimes
  depending on whether the index exists. This is a clean A/B
  experiment with everything else held constant.
- The estimated cost in the planner header (`cost=0.29..8.30` versus
  `cost=0.00..1292`) is the actual decision input. The planner picks
  the cheapest available plan.
- The buffer-hit count drops from ~1,167 (full heap scan) to ~5
  (index pages + the matching heap page).

**Why it matters.** This script is the strongest evidence that
PostgreSQL is a **cost-based** planner. Once the cheaper option is
removed, the planner correctly switches to the only remaining plan;
once the cheaper option returns, the planner switches back. There is
no rule that says "always use an index" — the index is used only when
the cost model favors it.

**Safety note.** The script only operates on the demo database
`meowlytics_551`. It is safe to rerun.

---

### 4.5 Script 05 — Small data vs large data

**File:** [`explain/05-small-vs-large-data.sql`](explain/05-small-vs-large-data.sql)

**What it tests.** Whether the planner's choice of plan changes purely
because of dataset size, holding the schema, the query, and the index
definitions constant.

**The script does:**

1. Creates a `TEMP TABLE ingredient_small` containing the first 100
   rows of `Ingredient`.
2. Creates the same `nameEn` B-tree index on the temp table.
3. Runs `ANALYZE` on the temp table so the planner has fresh stats.
4. `EXPLAIN ANALYZE` the same exact-lookup query against
   the 100-row table and against the 10,000-row table.

**Expected observation.**

| Dataset | Plan chosen | Estimated cost | Why |
|---|---|---|---|
| 100 rows | Seq Scan | ~7.25 | Whole table fits in a few pages; index startup overhead is not worth it |
| 10,000 rows | Index Scan | ~8.30 | Heap scan would cost ~1,292 |

**What this proves.**

- The planner's choice depends on **selectivity** and **table size**,
  not on the existence of the index alone.
- The startup cost of an index path (`cost=0.29..`) plus the random
  I/O cost of fetching matching heap tuples can exceed the cost of
  reading a tiny heap end-to-end.
- This is the answer to the common student question: "Why is my
  index not being used?" — usually because the table is small and the
  planner correctly judged the index path more expensive.

**Why it matters.** This script demonstrates that index decisions are
**statistic-driven**. The seed script runs `ANALYZE` after inserting
data so the demo database always has accurate `pg_statistic` rows;
this is also why a stale `ANALYZE` is a common cause of bad plans in
production.

**Safety note.** The temp table is automatically discarded when the
psql session ends, so the script makes no persistent change to the
database.

---

### 4.6 Script 06 — MVCC tuple versioning and snapshot isolation

**File:** [`explain/06-mvcc-snapshot-isolation.sql`](explain/06-mvcc-snapshot-isolation.sql)

**What it tests.** PostgreSQL's Multi-Version Concurrency Control —
the mechanism that lets a long-running reader continue to see a
consistent snapshot of the database while a concurrent writer is
modifying the same rows.

**The script has two parts.**

**Part A — single session, runs automatically.** Inspects the hidden
`xmin`, `xmax`, and `ctid` system columns on the `Chicken` row, then
performs an `UPDATE` inside `BEGIN ... ROLLBACK` to demonstrate that
PostgreSQL writes a *new* tuple version rather than overwriting in
place.

**Part B — two sessions, instructions only.** Documents how to open
two `psql` terminals and prove that a `BEGIN ISOLATION LEVEL
REPEATABLE READ` reader observes the *old* row value even after a
concurrent writer has committed a new value.

**Expected observation (Part A).**

| Stage | `xmin` | `xmax` | `ctid` | Notes |
|---|---|---|---|---|
| Before UPDATE | 1249 | 0 | (100,18) | Live tuple, no superseding txn |
| Inside transaction, after UPDATE | 1277 | 0 | (100,19) | Brand-new tuple version at a new heap slot |
| After ROLLBACK | 1249 | 1277 | (100,18) | Old tuple is visible again; new one is dead |

The exact `xid` numbers vary per machine and per run; what matters is
the pattern: every UPDATE produces a new `xmin` and a new `ctid`.

The script also queries `pg_stat_user_tables` to show that
`n_dead_tup` increases by one after the rollback, confirming the
new tuple version was physically written and only logically discarded.

**What this proves.**

- An UPDATE in PostgreSQL is **insert + tombstone**, not in-place
  modification.
- Old tuple versions remain on the heap until VACUUM (or autovacuum)
  reclaims them. This is the source of "table bloat" under heavy
  update workloads.
- A reader's snapshot is defined by the `xid`s it considers visible,
  so two transactions can read and write the same logical row
  simultaneously without explicit read locks.
- Index entries also need to be updated for indexed columns because
  the new tuple version has a new `ctid`.

**Why it matters.** Meowlytics has a mixed read/write workload: users
browse favorites (long-running reads) while AI fallback inserts new
ingredients (writes). MVCC is what makes those reads non-blocking and
what guarantees a consistent view of the data within each transaction.

---

## 5. Application operations to PostgreSQL internals — mapping table

| # | Application operation | SQL the application issues | PostgreSQL internal mechanism | Evidence |
|---|---|---|---|---|
| 1 | Click an ingredient | `WHERE nameEn = 'Chicken'` | B-tree Index Scan via `Ingredient_nameEn_idx` | [01](explain/01-ingredient-exact-lookup.sql) |
| 2 | Open Favorites page | `WHERE userId = ? ORDER BY createdAt DESC` | Composite B-tree Index Scan Backward; no separate Sort node | [02](explain/02-favorites-composite-index.sql) |
| 3 | Substring search fallback | `WHERE nameEn ILIKE '%chick%'` | Sequential Scan; B-tree cannot serve leading-wildcard patterns | [03](explain/03-fuzzy-ilike-seq-scan.sql) |
| 4 | Validate index value | Drop and recreate `Ingredient_nameEn_idx` | Plan flips Seq Scan to Index Scan and back; pure cost-based decision | [04](explain/04-with-vs-without-index.sql) |
| 5 | Selectivity sensitivity | Same exact lookup on 100-row vs 10,000-row table | Planner chooses Seq Scan for 100 rows; Index Scan for 10,000 | [05](explain/05-small-vs-large-data.sql) |
| 6 | AI ingredient insert | `INSERT INTO "Ingredient"` (in seed script and AI fallback) | Heap insert plus B-tree maintenance on three indexes | (seed script and final report) |
| 7 | Concurrent reader plus writer | Long `SELECT` interleaved with `UPDATE` | MVCC tuple versioning (`xmin` / `xmax` / `ctid`); snapshot isolation | [06](explain/06-mvcc-snapshot-isolation.sql) |

The full discussion of why each mapping matters, and the corresponding
captured outputs, are in
[`docs/FINAL_REPORT.md §5`](docs/FINAL_REPORT.md).

---

## 6. Directory layout

```
dsci551/
|-- README.md                              this file
|-- setup.sh                               one-command reproducer
|-- .env.example                           local DB URL template
|-- seed/
|   `-- seed.ts                            deterministic data generator
|-- explain/
|   |-- 01-ingredient-exact-lookup.sql
|   |-- 02-favorites-composite-index.sql
|   |-- 03-fuzzy-ilike-seq-scan.sql
|   |-- 04-with-vs-without-index.sql
|   |-- 05-small-vs-large-data.sql
|   `-- 06-mvcc-snapshot-isolation.sql
|-- slides/
|   |-- Meowlytics-DSCI551-Final.pdf      final demo deck (PDF)
|   `-- Meowlytics-DSCI551-Final.pptx     editable source
`-- docs/
    `-- FINAL_REPORT.md                   final written report
```

---

## 7. Troubleshooting

**`psql: command not found`**
The PostgreSQL client is installed but not on `PATH`. On Homebrew:

```bash
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
```

**`FATAL: role "xingwei" does not exist`**
The committed `.env` defaults to the author's role name. Run
`bash dsci551/setup.sh`; it rewrites the demo default to your local
PostgreSQL role. For manual setup, edit `.env` and replace `xingwei`
with the output of `whoami`.

**`FATAL: role "<your-username>" does not exist`**
Your local PostgreSQL has no role for your shell user. Create one:

```bash
createuser -s "$(whoami)"          # macOS / Homebrew
sudo -u postgres createuser --superuser "$USER"   # Ubuntu / Debian
```

**`createdb: error: connection to server ... failed`**
PostgreSQL is not running. Start it:

```bash
brew services start postgresql@15   # macOS
sudo service postgresql start       # Linux
```

**`Can't reach database server` from the seed script**
Confirm `DATABASE_URL` in `.env` matches your local setup, and test
the connection directly:

```bash
psql "$(grep DATABASE_URL .env | cut -d= -f2- | tr -d '"')" -c '\conninfo'
```

**`prisma db push` warns about data loss**
The setup script already passes `--accept-data-loss`. If you are
running `prisma db push` manually against a database that has older
tables from earlier development (`AnalyzeQuota`, `RateLimitConfig`),
add the same flag.
