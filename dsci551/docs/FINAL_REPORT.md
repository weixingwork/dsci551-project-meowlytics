# DSCI 551 Final Report

## Meowlytics: PostgreSQL B-tree Indexing, Query Planning, and MVCC for an AI-Powered Cat Food Ingredient Analyzer

**Student:** Wei Xing
**Course:** DSCI 551 — Database Internals + Application Design (Spring 2026)
**Database System:** PostgreSQL 15
**Project Repository:** [https://github.com/<your-handle>/dsci551-project-meowlytics](https://github.com/)
**Google Drive (code + docs):** _[INSERT GOOGLE DRIVE LINK HERE]_

---

## 1. Introduction & Motivation

Cat owners frequently struggle to interpret the long, technical ingredient lists printed on commercial cat-food packaging. Many ingredients are unfamiliar (e.g., *Taurine*, *Mixed Tocopherols*, *Animal By-Product Meal*), and the same component is often labeled inconsistently across brands. Manually researching each ingredient is slow and unreliable.

**Meowlytics** is a web application that solves this problem by combining computer vision, large-language-model reasoning, and a structured PostgreSQL-backed ingredient knowledge base. A user uploads a photo of a cat-food label, the system extracts the ingredient list with a multimodal AI model (Gemini 2.5 Flash), and each ingredient is then enriched with a structured analysis pulled from PostgreSQL. Users can also save the analyses they find useful into a personal *Favorites* collection.

For DSCI 551, the database is not a peripheral storage layer — it is the central object of study. This report focuses on three PostgreSQL internals and their direct mapping to application operations:

1. **B-tree indexing** — for ingredient exact lookup and composite filter+sort retrieval.
2. **Cost-based query planning** — for understanding when an index is used vs. when a sequential scan wins.
3. **Multi-Version Concurrency Control (MVCC)** — for handling concurrent reads and writes during AI-driven ingredient inserts.

All claims in this report are backed by reproducible `EXPLAIN ANALYZE` evidence in `dsci551/explain/` and a deterministic seed dataset of 10,000 ingredients, 51 users, and 5,000 favorites.

> **SCREENSHOT 1 — Application UI overview**
> Source: a running browser at `http://localhost:3000` after `npm run dev` and login as `demo@551.edu / demo551`. Capture the Favorites page (or analysis result page) so the report shows what the user sees. Crop to the main content area. Suggested figure caption: *"Meowlytics analysis result, showing ingredient cards backed by PostgreSQL knowledge lookups."*

---

## 2. Database System Overview

PostgreSQL is a mature, open-source object-relational database that has been actively developed since 1986. It is the database of choice for many production workloads because it combines strict ACID guarantees with sophisticated query planning, rich indexing options (B-tree, Hash, GiST, GIN, BRIN), and a transparent execution model exposed through `EXPLAIN ANALYZE`.

For Meowlytics, PostgreSQL was chosen for four reasons:

* **Transparent internals.** Every plan decision can be inspected with `EXPLAIN (ANALYZE, BUFFERS, VERBOSE)`. This makes PostgreSQL ideal for a course project that must connect application behavior to database internals.
* **B-tree match for the workload.** The application performs frequent exact-match ingredient lookups (`WHERE nameEn = 'Chicken'`) and user-scoped time-ordered retrieval (`WHERE userId = ? ORDER BY createdAt DESC`). Both map cleanly onto B-tree access paths.
* **MVCC for non-blocking reads.** The application interleaves read-heavy traffic (favorites pages) with bursty AI-driven writes (new ingredient insertions). PostgreSQL's MVCC lets readers see a consistent snapshot without being blocked by concurrent writers.
* **Heap + secondary index storage** matches the transactional access pattern. Unlike clustered storage (MySQL InnoDB) or document storage (MongoDB), heap + B-tree gives stable performance for our mixed read/write workload without pre-committing to a single physical sort order.

The application uses **Prisma 7** as the type-safe ORM and the official `pg` driver via the `@prisma/adapter-pg` adapter. Connection pooling is handled by `pg.Pool`, with a single pool reused across hot-reloads in development (see [`lib/db.ts`](../../lib/db.ts)).

---

## 3. Internal Architecture

### 3.1 Heap Storage

PostgreSQL stores every table as a sequence of fixed-size **8 KB heap pages**. Within a page, rows are stored as **tuples** with no inherent sort order — the physical position of a row reflects only its insertion order (and any later UPDATE relocations under MVCC). Each tuple is uniquely addressable by a `(page_number, offset)` pair called a **`ctid`**, which is a system column on every table.

In Meowlytics, the four tables (`Ingredient`, `User`, `Favorite`, `Folder`) all live in heap storage. The `Ingredient` table, for example, occupies roughly 1,167 pages for 10,000 rows, as confirmed by the `Buffers: shared hit` count from the sequential-scan plan in script 03.

### 3.2 B-tree Indexing

PostgreSQL implements indexes as **secondary structures**: an index file is physically separate from the heap, and an index entry is a `(key, ctid)` pair. The default index type — and the only one used in this project — is the **B-tree**, a balanced multi-way tree of root, internal, and leaf pages where leaf pages store keys in sorted order.

Lookup by an indexed key is `O(log n)`: traverse from root to leaf, then follow the `ctid` to fetch the heap tuple. The entire `Ingredient_nameEn_idx` lookup for `'Chicken'` touches only **5 buffer pages** (3 index + 2 heap), versus 1,167 buffer pages for the equivalent sequential scan.

The Meowlytics schema declares four B-tree indexes (excluding implicit primary-key indexes), each motivated by an actual application query pattern:

| Index | Table | Purpose |
|---|---|---|
| `Ingredient_name_idx` | `Ingredient` | Chinese-name lookup |
| `Ingredient_nameEn_idx` | `Ingredient` | English-name lookup (hot path) |
| `Ingredient_source_idx` | `Ingredient` | Filter by `knowledge_base` vs `ai_generated` |
| `Favorite_userId_createdAt_idx` | `Favorite` | Composite: filter by user + sort by time |

> **SCREENSHOT 2 — Prisma schema with indexes**
> Source: [`prisma/schema.prisma`](../../prisma/schema.prisma), lines 9–73. Capture the entire `Ingredient`, `User`, `Favorite`, and `Folder` model definitions, with the `@@index` lines clearly visible. Use a code-style screenshot (dark theme is fine). Caption: *"PostgreSQL schema declared in Prisma. Each `@@index` becomes a B-tree index after `prisma db push`."*

### 3.3 Query Execution and the Cost-Based Planner

When a query arrives, PostgreSQL goes through **parse → rewrite → plan → execute**. The planner enumerates candidate plans (sequential scan, index scan, index-only scan, bitmap heap scan, …) and assigns each a cost estimate based on table statistics maintained in `pg_statistic` and refreshed by `ANALYZE`. The cheapest plan wins.

The cost model is calibrated against two cost units: `seq_page_cost = 1.0` and `random_page_cost = 4.0` (default). This means a sequential read of one page is the cheap baseline, and a random index lookup costs roughly four times as much per page. Whether an index "wins" therefore depends not only on its existence but on the **selectivity** of the predicate and the **size** of the table — a fact this report demonstrates empirically in §5.

### 3.4 MVCC and Tuple Versioning

PostgreSQL never updates a row in place. Every tuple carries two hidden system columns:

* **`xmin`** — the transaction id (`xid`) that *inserted* this tuple version.
* **`xmax`** — the transaction id that *deleted or updated* it (0 if still live).

An `UPDATE` writes a *new* tuple version with a new `xmin` and a new `ctid`, then sets `xmax` on the old version. Both versions coexist on the heap until **VACUUM** (or autovacuum) reclaims the dead one. A reader's snapshot is defined by the set of `xid`s it considers visible, so two transactions can read and write the same logical row simultaneously without taking explicit read locks.

This design has three direct consequences for application behavior, all of which appear later in the mapping section:

1. Reads are non-blocking with respect to writes.
2. Long-running transactions accumulate dead tuples ("bloat") if not vacuumed.
3. Indexes must also be maintained on every UPDATE, because a new tuple version has a new `ctid` and therefore needs a new index entry.

### 3.5 Distribution

Distribution is **out of scope** for this single-person project, as permitted by the guideline ("if applicable"). Meowlytics runs against a single PostgreSQL node. PostgreSQL does support distribution through logical replication and extensions such as Citus, but exploring these would substantially exceed a one-person scope.

---

## 4. Application Design

### 4.1 Architecture

Meowlytics is a full-stack TypeScript application built on **Next.js 16** (App Router). The same Node.js process serves both the React frontend (Server + Client Components) and the JSON API routes under `app/api/`. PostgreSQL is reached through Prisma 7, configured against the local PostgreSQL instance via the URL in `.env`.

The major layers, top-to-bottom:

* **UI layer** (`app/(main)/`): pages for analysis, favorites, compare, and account, built as React Server Components with Zustand for client-side favorites state.
* **API layer** (`app/api/`): JSON endpoints for auth, knowledge lookup, favorites CRUD, and AI analysis.
* **Domain library** (`lib/`): authentication, session management, knowledge search, and validation helpers.
* **Database layer**: Prisma client + raw SQL where needed (e.g., the seed script's `ANALYZE` calls).

### 4.2 Data Model

The schema has four tables (see §3.2 for the index list):

* **`Ingredient`** — 10,000 rows in the demo dataset. Stores the Chinese name, English name, aliases, category, health impact, description, and metadata. The `source` column distinguishes curated entries (`knowledge_base`) from AI-generated ones (`ai_generated`).
* **`User`** — 51 rows (1 demo + 50 synthetic). Email is unique; passwords are stored as scrypt salt+hash.
* **`Favorite`** — 5,000 rows (2,000 owned by the demo user). The `analysis` column is a `Json` blob holding the structured AI output. Foreign keys to `User` and (optional) `Folder`.
* **`Folder`** — empty in the demo dataset. Used by the UI for grouping favorites.

> **SCREENSHOT 3 — Live application: Favorites page**
> Source: `http://localhost:3000/favorites` after logging in as `demo@551.edu / demo551`. Capture the page so it shows multiple favorite cards (the demo user has 2,000), and the URL bar so the grader sees this is the live app. Caption: *"The Favorites page issues `SELECT * FROM Favorite WHERE userId = ? ORDER BY createdAt DESC` — the workload that motivates the composite B-tree index."*

### 4.3 Application Workflow

1. **Image upload** — user uploads a label photo via the analysis page.
2. **AI extraction** — Gemini 2.5 Flash parses the image and returns a structured ingredient list.
3. **Knowledge enrichment** — for each extracted ingredient, the frontend calls `POST /api/knowledge`, which performs a PostgreSQL lookup chain (exact name → English name → alias → fuzzy fallback).
4. **AI fallback insert** — if the ingredient is unknown, the API generates a new structured record with Gemini and inserts it into PostgreSQL with `source = 'ai_generated'` so subsequent users get a database hit instead of paying for AI again.
5. **Save to favorites** — logged-in users can persist an analysis as a `Favorite` row.
6. **Retrieve favorites** — the favorites page issues a single indexed query.

### 4.4 Reproducibility Setup

The repository includes a one-command reproducer at [`dsci551/setup.sh`](../setup.sh) that creates the database, prepares `.env` for the grader's local PostgreSQL role, runs `prisma db push`, executes the deterministic seed (`dsci551/seed/seed.ts`), and runs a smoke `EXPLAIN ANALYZE`. The seed uses a fixed-seed Mulberry32 PRNG so every run produces identical data, which means the planner statistics — and therefore every `EXPLAIN ANALYZE` plan in this report — are reproducible on the grader's machine. End-to-end verification has been performed from a clean database state and all six evidence scripts produce the expected plans.

---

## 5. Mapping Internals to Application Behavior

This section is the heart of the report. For each major application operation, I present (a) the application behavior, (b) the SQL the application issues, (c) the PostgreSQL internal behavior, and (d) the `EXPLAIN ANALYZE` evidence captured against the seeded dataset. All evidence files live in `dsci551/explain/`.

### 5.1 Mapping 1 — Exact Ingredient Lookup → B-tree Index Scan

**Application behavior.** When a user clicks an ingredient (e.g. "Chicken") in an analysis result, the frontend calls `POST /api/knowledge` with `ingredientName: "Chicken"`. The handler in [`lib/knowledge/db-search.ts`](../../lib/knowledge/db-search.ts) executes the equivalent of:

```sql
SELECT * FROM "Ingredient" WHERE "nameEn" = 'Chicken' LIMIT 1;
```

**Internal mechanism.** The planner sees the equality predicate on `nameEn`, looks up the available indexes, and chooses `Ingredient_nameEn_idx`. Execution traverses root → internal → leaf of the B-tree, finds the matching `(key, ctid)` entry, and follows the `ctid` to fetch the heap tuple.

**Evidence.** Script [`01-ingredient-exact-lookup.sql`](../explain/01-ingredient-exact-lookup.sql) produces:

```
Index Scan using "Ingredient_nameEn_idx" on "Ingredient"
  (cost=0.29..8.30 rows=1 width=428)
  (actual time=0.030..0.033 rows=1 loops=1)
  Index Cond: ("nameEn" = 'Chicken'::text)
  Buffers: shared hit=5
Execution Time: 0.069 ms
```

**Why it matters.** The `Buffers: shared hit=5` line is direct evidence that PostgreSQL touched only 5 of the table's 1,167 pages (3 index + 2 heap). At 0.069 ms, this lookup is interactive-fast and will scale logarithmically as the ingredient table grows.

> **SCREENSHOT 4 — EXPLAIN output for script 01**
> Source: terminal output of `psql -P pager=off meowlytics_551 -f dsci551/explain/01-ingredient-exact-lookup.sql`. Capture from the `QUERY PLAN` header through the `Execution Time` line so the planner cost, buffer hits, and timing are all visible. Caption: *"`EXPLAIN ANALYZE` confirms an Index Scan with 5 buffer hits and 0.069 ms execution."*

### 5.2 Mapping 2 — Favorites Page → Composite Index, Backward Scan

**Application behavior.** When a logged-in user opens `/favorites`, the API at [`app/api/favorites/route.ts`](../../app/api/favorites/route.ts) issues:

```sql
SELECT * FROM "Favorite" WHERE "userId" = $1 ORDER BY "createdAt" DESC;
```

**Internal mechanism.** This query has two requirements: filter by `userId`, then sort by `createdAt` descending. The composite B-tree index `Favorite_userId_createdAt_idx` was declared specifically for this workload. Because the index is *physically* sorted by `(userId, createdAt)`, PostgreSQL can:

1. Descend the B-tree to the first leaf entry for the target `userId`.
2. Read leaf entries **backward** to produce rows in `createdAt DESC` order.

The plan therefore contains an `Index Scan Backward` node and **no separate `Sort` node** — the ordering is provided "for free" by the index structure.

**Evidence.** Script [`02-favorites-composite-index.sql`](../explain/02-favorites-composite-index.sql) produces:

```
Limit  (cost=6.92..63.30 rows=20 width=1650) (actual time=0.067..0.145 rows=20 loops=1)
  Buffers: shared hit=28
  ->  Index Scan Backward using "Favorite_userId_createdAt_idx" on "Favorite"
        (cost=0.28..276.53 rows=98 width=1650)
        (actual time=0.066..0.142 rows=20 loops=1)
        Index Cond: ("userId" = $0)
Execution Time: 0.192 ms
```

**Why it matters.** This is the strongest argument in the project for letting the workload drive the index design. A single-column index on `userId` would still need a sort step; a single-column index on `createdAt` would force a full filter pass. The composite index serves both the filter *and* the sort in one pass.

> **SCREENSHOT 5 — EXPLAIN output for script 02**
> Source: terminal output of `psql -P pager=off meowlytics_551 -f dsci551/explain/02-favorites-composite-index.sql`. Capture the full plan tree including the `Index Scan Backward` node. Caption: *"Composite index serves both filter and ORDER BY — note the `Index Scan Backward` and the absence of a Sort node."*

### 5.3 Mapping 3 — Cost-Based Planner: Same Query, With vs Without Index

**Application behavior.** In production, an admin might consider dropping the `nameEn` index to save write overhead. Script [`04-with-vs-without-index.sql`](../explain/04-with-vs-without-index.sql) measures the consequence directly: it runs the exact-lookup query, drops the index, runs the same query, then recreates the index and runs it again.

**Internal mechanism.** PostgreSQL is a **cost-based** planner. Without the index, the only available plan is a sequential scan of all 10,000 heap rows. With the index, the planner compares the estimated index-scan cost (8.30) against the seq-scan cost (1292.00) and chooses the cheaper one.

**Evidence.**

| Plan | Cost | Execution Time | Buffers |
|---|---|---|---|
| With index | 0.29..8.30 | 0.105 ms | 5 |
| Without index | 0.00..1292.00 | 4.149 ms | 1167 |

**Why it matters.** The 40× execution-time gap and 233× buffer-fetch gap is the empirical justification for the `nameEn` index. It also illustrates that "having an index" is not magic — the planner must *also* judge it cheaper than the alternatives.

> **SCREENSHOT 6 — Plan flip: Index Scan → Seq Scan → Index Scan**
> Source: terminal output of `psql -P pager=off meowlytics_551 -f dsci551/explain/04-with-vs-without-index.sql`. Capture all three EXPLAIN outputs (BEFORE, AFTER drop, CONFIRM after recreate) in one screenshot if possible. Caption: *"Dropping the B-tree index forces a Seq Scan with 233× more buffer fetches; recreating it restores the indexed plan."*

### 5.4 Mapping 4 — Cost-Based Planner: Small Table vs Large Table

**Application behavior.** During development, the ingredient table starts small. Will the planner still use the index? Script [`05-small-vs-large-data.sql`](../explain/05-small-vs-large-data.sql) creates a 100-row temporary copy of `Ingredient` (with the same B-tree index) and runs the same exact-lookup query against both the 100-row and 10,000-row tables.

**Internal mechanism.** For a 100-row table, the entire heap fits in a handful of pages, so a sequential scan costs ~7.25. The B-tree lookup, by contrast, has a fixed startup cost of ~0.29 plus per-page random access — for tiny tables the index loses. The planner correctly picks `Seq Scan` on 100 rows and `Index Scan` on 10,000.

**Evidence.**

| Table size | Chosen plan | Cost | Why |
|---|---|---|---|
| 100 rows | Seq Scan | 7.25 | Index startup overhead not worth it |
| 10,000 rows | Index Scan | 8.30 | Index path much cheaper than 1292 |

**Why it matters.** This is the answer to the common student question, *"Why isn't my index being used?"* — the answer is "because the planner correctly judged it cheaper to scan." It also demonstrates that the planner's behavior is statistic-driven; running `ANALYZE` after data changes is essential for correct decisions.

> **SCREENSHOT 7 — Plan choice changes with data size**
> Source: terminal output of `psql -P pager=off meowlytics_551 -f dsci551/explain/05-small-vs-large-data.sql`. Capture both EXPLAIN outputs side-by-side or stacked. Caption: *"The cost-based planner chooses Seq Scan for 100 rows and Index Scan for 10,000 — the same query, opposite plans."*

### 5.5 Mapping 5 — B-tree Limitation: Leading-Wildcard Fuzzy Search

**Application behavior.** The user-facing fuzzy search supports `ILIKE '%chick%'` — find any ingredient whose English name contains the substring `chick`.

**Internal mechanism.** A B-tree is sorted lexicographically by **prefix**, so it can answer queries with a *fixed prefix* (`nameEn LIKE 'chick%'`) by jumping to a contiguous range of leaf pages. With a **leading wildcard** (`'%chick%'`) the matching strings can appear anywhere in the index's sort order, so no contiguous range exists, and the B-tree provides no benefit. The planner falls back to a sequential scan plus a filter.

**Evidence.** Script [`03-fuzzy-ilike-seq-scan.sql`](../explain/03-fuzzy-ilike-seq-scan.sql) produces:

```
Seq Scan on "Ingredient"  (cost=0.00..1292.00 rows=606)
  (actual time=0.138..11.892 rows=600 loops=1)
  Filter: ("nameEn" ~~* '%chick%'::text)
  Rows Removed by Filter: 9400
  Buffers: shared hit=1167
Execution Time: 11.970 ms
```

**Why it matters.** This is an honest limitation of the chosen index design. A production fix would use the `pg_trgm` extension to build a **GIN index** on trigrams of `nameEn`, which would make `ILIKE '%chick%'` indexable. I deliberately scoped this project to B-tree behavior, but the limitation is real and documented in §7.

> **SCREENSHOT 8 — Seq Scan for fuzzy search**
> Source: terminal output of `psql -P pager=off meowlytics_551 -f dsci551/explain/03-fuzzy-ilike-seq-scan.sql`. Capture the full plan including `Rows Removed by Filter: 9400`. Caption: *"`ILIKE '%chick%'` cannot use a B-tree because of the leading wildcard — the planner is forced into a Seq Scan with 1,167 buffer hits."*

### 5.6 Mapping 6 — AI Insert: Heap Insert + Index Maintenance

**Application behavior.** When the user enriches a new ingredient that is not yet in the database, [`saveAIGeneratedIngredient`](../../lib/knowledge/db-search.ts) issues:

```sql
INSERT INTO "Ingredient" (...) VALUES (...);
```

**Internal mechanism.** A row insert involves:

1. Append the new tuple to a heap page (allocate a new page if necessary).
2. Insert one `(key, ctid)` entry into **each** of the three B-tree indexes (`name`, `nameEn`, `source`).
3. If a leaf page is full, split it and propagate the split up the tree.

The new tuple's `xmin` is set to the inserting transaction's `xid`, so the row is invisible to any in-flight transaction whose snapshot was taken before commit.

**Why it matters.** This is the **read-vs-write tradeoff** of indexing. Three indexes mean three additional B-tree maintenance operations per insert. The seed script provides empirical context: inserting 10,000 ingredients with three indexes completes in roughly 1.5 seconds — fast enough that the cost is invisible at the application level, but a useful reminder that indexes are not free.

### 5.7 Mapping 7 — MVCC: Concurrent Read While Writer Commits

**Application behavior.** A user is browsing their favorites page (a long-running `SELECT`) while another request is inserting a new favorite or refreshing an AI-generated ingredient. The reader must not block the writer, and the reader must continue to see a consistent snapshot of the data.

**Internal mechanism.** PostgreSQL implements MVCC through `xmin`/`xmax` tuple visibility. An `UPDATE`:

1. Writes a *new* tuple version with a new `xmin` and a new `ctid`.
2. Sets `xmax` on the old tuple version, marking it as superseded by `xmin = <new>`.

A reader's snapshot is fixed at the start of its transaction; it sees the old tuple version until it commits its own transaction, at which point it can observe the new committed value.

**Evidence.** Script [`06-mvcc-snapshot-isolation.sql`](../explain/06-mvcc-snapshot-isolation.sql) demonstrates tuple versioning in a single session:

| Stage | `xmin` | `xmax` | `ctid` |
|---|---|---|---|
| Before UPDATE | 1249 | 0 | (100,18) |
| After UPDATE (in txn) | 1277 | 0 | (100,19) |
| After ROLLBACK | 1249 | 1277 | (100,18) |

The `n_dead_tup` for `"Ingredient"` increases by 1 after the rollback, confirming that the new tuple version was physically written and only logically discarded — it remains on disk until VACUUM.

The script also documents a two-session snapshot isolation experiment that proves a `BEGIN ISOLATION LEVEL REPEATABLE READ` reader observes the *old* value even after a concurrent writer commits.

**Why it matters.** This is what makes Meowlytics' read traffic resilient to write bursts. Without MVCC, a long-running favorites query could be blocked by an AI-driven insert; with MVCC, the reader continues to see its snapshot and the writer commits independently. The cost is **bloat** — dead tuples accumulating until autovacuum runs.

> **SCREENSHOT 9 — MVCC tuple versions before/after UPDATE**
> Source: terminal output of `psql -P pager=off meowlytics_551 -f dsci551/explain/06-mvcc-snapshot-isolation.sql`. Capture the three result tables (steps 1, 4, and 5) so the `xmin`/`xmax`/`ctid` transitions are visible. Caption: *"PostgreSQL writes a new tuple version (xmin 1249 → 1277, ctid (100,18) → (100,19)) instead of overwriting in place; ROLLBACK restores the original."*

---

## 6. Comparison with MySQL and MongoDB

| Feature | PostgreSQL (this project) | MySQL (InnoDB) | MongoDB |
|---|---|---|---|
| **Primary storage layout** | Heap pages + secondary B-tree indexes. Rows are not physically ordered by any column. | **Clustered** B-tree on the primary key — rows are physically sorted by PK; secondary indexes store the PK, not a row pointer. | BSON documents stored in collections, each document self-contained. |
| **Index data structure** | B-tree (default), Hash, GiST, GIN, BRIN | B-tree, Hash, FULLTEXT (full-text), R-tree (spatial) | B-tree, hashed, text, geospatial |
| **Concurrency model** | MVCC with snapshot isolation; new tuple versions live in the heap until VACUUM. | MVCC, but old versions are kept in a separate **undo log** rather than in the data pages. | MVCC since WiredTiger; document-level locking. |
| **Query planner** | Cost-based, transparent via `EXPLAIN ANALYZE` (BUFFERS, VERBOSE). | Cost-based; `EXPLAIN` exists but historically less detailed than PostgreSQL. | Rule + cost hybrid; `explain()` returns winning + rejected plans. |
| **Fuzzy search** | Requires `pg_trgm` + GIN to index leading-wildcard `ILIKE`. | Native `FULLTEXT` indexes for word-level search. | Native text indexes with stemming and language analyzers. |
| **Distribution** | Single-node by default; logical replication and Citus extension for sharding. | Native replication, group replication, MySQL Cluster (NDB). | First-class horizontal sharding by shard key. |
| **Best fit for this app** | Transparent planner, mixed read/write, relational join model, snapshot isolation. | Reasonable fit but clustered storage would force a single PK ordering. | Schema flexibility appealing for AI-generated records, but loses transactional joins (User ↔ Favorite). |

**Why PostgreSQL specifically.** The deciding factor for Meowlytics is not raw performance — at this data scale, all three would be fast enough. It is **transparency and fit-for-purpose**:

* The course requires me to explain *what the database does internally* and *why it matters*. PostgreSQL's `EXPLAIN ANALYZE` makes every claim in §5 directly verifiable.
* MySQL's clustered storage would change the storage discussion (§3.1) significantly, and InnoDB's undo-log MVCC is harder to demonstrate live than tuple-version MVCC.
* MongoDB is a strong choice for the AI-generated half of the workload (flexible schemas), but the relational `User → Favorite` link and the ordered-retrieval requirement push the design toward SQL.

---

## 7. Limitations & Lessons Learned

### 7.1 Limitations

1. **Fuzzy search is not indexed.** As shown in §5.5, leading-wildcard `ILIKE` forces a sequential scan. A production deployment should add `CREATE EXTENSION pg_trgm` and a GIN index on `gin_trgm_ops(nameEn)`. I deliberately scoped this project to B-tree behavior so the index discussion stays focused.
2. **Live AI analysis requires an API key.** The image-upload + AI-extraction path needs a `GOOGLE_API_KEY` for Gemini. To keep the project reproducible by the TA without provisioning a key, the seed script pre-populates 10,000 ingredients and the database-backed mapping evidence in §5 runs entirely without AI calls.
3. **MVCC write overhead.** Every `UPDATE` writes a new tuple version, and each indexed column requires a new index entry. In a high-write workload this leads to bloat and elevated VACUUM cost. The project's read-heavy workload masks this, but it is a real production consideration.
4. **Single-node only.** Distribution is not demonstrated. PostgreSQL supports it (logical replication, Citus) but exploring sharding would have exceeded the scope of a one-person project, as the guideline allows.
5. **In-memory fuzzy fallback.** The fallback similarity matcher in [`lib/knowledge/db-search.ts:130`](../../lib/knowledge/db-search.ts) loads the entire ingredient table into application memory if the indexed lookups all miss. This works at 10k rows but would not scale; replacing it with a `pg_trgm` GIN index would solve both this and Limitation 1.

### 7.2 Lessons Learned

1. **Index design follows query patterns, not columns.** The composite `(userId, createdAt)` index is the clearest example: it serves filter *and* sort in one pass. Designing an index per column would have missed this.
2. **Cost models, not rules.** PostgreSQL's choice of `Seq Scan` on a 100-row table even when an index exists (§5.4) is a feature, not a bug. The planner is right; the rule "use the index if it exists" is wrong.
3. **`EXPLAIN ANALYZE` is the ground truth.** Buffer hits and actual timing tell you what the planner *did*, not what it *might have done*. Every claim in this report was verified this way.
4. **Reproducibility is engineering work.** A deterministic seed (Mulberry32 + fixed seed), a one-command setup script, a smoke test, and a README with troubleshooting are not optional — they are what make the project gradeable.
5. **MVCC explains a surprising amount of behavior.** Once you internalize that an `UPDATE` is "insert + tombstone," vacuum costs, index bloat, and snapshot isolation all stop being magic.

---

## 8. Conclusion

Meowlytics demonstrates a tight, evidence-based mapping between PostgreSQL internals and the application operations that drive them:

* **Exact ingredient lookup → B-tree Index Scan** (§5.1)
* **Favorites retrieval → Composite B-tree, Index Scan Backward** (§5.2)
* **Index value → Cost model with vs without index** (§5.3)
* **Planner intelligence → Plan choice flips with data size** (§5.4)
* **Index limitation → Leading-wildcard ILIKE forces Seq Scan** (§5.5)
* **Insert path → Heap insert + index maintenance on 3 B-trees** (§5.6)
* **Concurrency → MVCC tuple versioning enables non-blocking reads** (§5.7)

Every mapping is backed by a reproducible `EXPLAIN ANALYZE` script in `dsci551/explain/`, a deterministic seed dataset of 10,000 ingredients, and a one-command setup script verified end-to-end on a clean database. The application code, schema, seed, evidence scripts, slides, and this report are all available at the Google Drive link at the top of this report.

---

## Appendix A: How to Reproduce

From a clean clone of the repository:

```bash
bash dsci551/setup.sh
```

This creates the `meowlytics_551` database, adapts `.env` to the grader's local PostgreSQL role, runs `prisma db push`, executes the deterministic seed, and runs a smoke `EXPLAIN ANALYZE`.

To run all seven evidence scripts:

```bash
for f in dsci551/explain/*.sql; do
  psql -P pager=off meowlytics_551 -f "$f"
done
```

To launch the web app:

```bash
npm run dev
# open http://localhost:3000
# log in with demo@551.edu / demo551
```

Full setup, troubleshooting, and EXPLAIN-evidence documentation live in [`dsci551/README.md`](../README.md).

## Appendix B: Repository Layout

```
dsci551-project-meowlytics/
├── app/                  Next.js application (UI + API routes)
├── lib/                  Domain logic (auth, knowledge search, validation)
├── prisma/schema.prisma  Database schema and indexes
├── dsci551/
│   ├── README.md         Setup, troubleshooting, mapping table
│   ├── setup.sh          One-command reproducer
│   ├── seed/seed.ts      Deterministic seed (10k + 51 + 5k rows)
│   ├── explain/          Six EXPLAIN ANALYZE evidence scripts
│   ├── slides/           Demo slide deck (PDF + PPTX)
│   ├── demo-script.md    Live demo runbook
│   └── docs/
│       └── FINAL_REPORT.md   ← this file
└── .env                  Demo-safe local configuration
```
