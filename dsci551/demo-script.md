# Meowlytics DSCI 551 Final Demo Script

This document is a speaker script and live-demo runbook for the DSCI 551 final demo.

Recommended total time: 8 minutes.

## Demo Flow

```text
0:00-0:40  Slide 1-2: project goal and application motivation
0:40-1:30  Live app: sign in with the demo account and open Favorites
1:30-2:20  Slide 3-4: PostgreSQL internals and schema/index design
2:20-4:20  psql live demo: run EXPLAIN scripts 01, 02, 03
4:20-5:40  Slide 7-8: planner cost estimation and B-tree limitation
5:40-6:40  psql live demo: run script 04 or 05
6:40-7:30  Slide 9-10: MVCC and index maintenance
7:30-8:00  Slide 11-13: comparison, limitations, conclusion
```

Focus slides:

- Slide 5: exact ingredient lookup
- Slide 6: favorites retrieval with composite index
- Slide 7: query planner cost estimation
- Slide 8: fuzzy search limitation

Fast slides:

- Slide 3: architecture overview
- Slide 9: MVCC
- Slide 10: index maintenance
- Slide 11: PostgreSQL vs MySQL vs MongoDB
- Slide 12: limitations and lessons

## Pre-Demo Setup

Open Terminal A:

```bash
npm run dev
```

Open the application:

```text
http://localhost:3000
```

Demo credentials:

```text
email: demo@551.edu
password: demo551
```

Open Terminal B for EXPLAIN scripts:

```bash
psql -P pager=off meowlytics_551
```

Or run the evidence scripts directly:

`-P pager=off` prevents long EXPLAIN output from opening the `(END)`
pager screen during the live demo.

```bash
psql -P pager=off meowlytics_551 -f dsci551/explain/01-ingredient-exact-lookup.sql
psql -P pager=off meowlytics_551 -f dsci551/explain/02-favorites-composite-index.sql
psql -P pager=off meowlytics_551 -f dsci551/explain/03-fuzzy-ilike-seq-scan.sql
psql -P pager=off meowlytics_551 -f dsci551/explain/04-with-vs-without-index.sql
psql -P pager=off meowlytics_551 -f dsci551/explain/05-small-vs-large-data.sql
psql -P pager=off meowlytics_551 -f dsci551/explain/06-mvcc-snapshot-isolation.sql
```

## Slide 1: Title

Target time: 10-15 seconds.

Speaker script:

> Hi, I am Wei Xing. My project is Meowlytics, a cat food ingredient analysis application built on PostgreSQL.
>
> For this DSCI 551 final demo, I focus on three PostgreSQL internal mechanisms: B-tree indexing, cost-based query planning, and MVCC.
>
> The main goal is to connect real application operations to concrete database behavior, using EXPLAIN ANALYZE evidence.

## Slide 2: Introduction & Motivation

Target time: 30-40 seconds.

Speaker script:

> The application problem is that cat food ingredient labels are hard for users to interpret.
>
> Meowlytics lets a user upload a label image, generates a structured ingredient analysis, and saves useful results as favorites.
>
> PostgreSQL is a good fit because this workload has frequent exact lookups, user-specific ordered retrieval, and concurrent reads and writes.
>
> For the demo, I use a deterministic synthetic dataset: 10,000 ingredients, 51 users, and 5,000 favorites, including 2,000 favorites for the demo user.

Live app action:

1. Open `http://localhost:3000`.
2. Click `Sign in`.
3. Log in with `demo@551.edu / demo551`.
4. Open the Favorites page.

Live narration:

> This is the demo account. It has 2,000 saved favorites, so the favorites page gives us a realistic user-specific retrieval workload.
>
> The UI is not the grading focus, but it shows the application operations that drive the database queries.

## Slide 3: PostgreSQL Architecture Overview

Target time: 30 seconds.

Speaker script:

> Internally, PostgreSQL stores table rows in heap pages. Indexes are secondary structures, separate from the heap.
>
> A B-tree index stores sorted key-to-ctid entries, where the ctid points back to the heap tuple.
>
> PostgreSQL also uses MVCC, so each row version has transaction metadata such as xmin and xmax.
>
> The query planner decides whether to use an index scan or a sequential scan based on estimated cost and selectivity.

## Slide 4: Schema & Index Design

Target time: 40 seconds.

Speaker script:

> The schema has three main tables for the demo: Ingredient, User, and Favorite.
>
> The Ingredient table has 10,000 rows and B-tree indexes on name, nameEn, and source. The most important one is nameEn, because ingredient lookup often uses exact English names like Chicken or Salmon.
>
> The Favorite table has 5,000 rows and a composite B-tree index on userId and createdAt. This index is designed for the favorites page, where the app filters by user and orders by creation time.
>
> The important point is that the indexes are not random. They are chosen from actual application query patterns.

## Slide 5: Mapping 1 - Exact Ingredient Lookup

Target time: 60 seconds.

Speaker script:

> The first mapping is exact ingredient lookup.
>
> In the application, when a user clicks an ingredient like Chicken, the backend looks up the ingredient knowledge record by nameEn.
>
> This maps directly to a B-tree index scan. PostgreSQL traverses the B-tree from the root to the leaf page, finds the matching key, and then fetches the heap tuple.
>
> Instead of scanning all 10,000 ingredient rows, it only touches a very small number of buffers.

Live command:

```bash
psql -P pager=off meowlytics_551 -f dsci551/explain/01-ingredient-exact-lookup.sql
```

After the output appears:

> Here the plan is Index Scan using Ingredient_nameEn_idx.
>
> The index condition is nameEn = 'Chicken', and the buffer count is very small.
>
> This is direct evidence that the application's exact lookup operation benefits from B-tree traversal.

## Slide 6: Mapping 2 - Favorites Retrieval

Target time: 60 seconds.

Speaker script:

> The second mapping is favorites retrieval.
>
> When a logged-in user opens the favorites page, the query filters by userId and orders by createdAt descending.
>
> This is why the index is composite: userId and createdAt.
>
> PostgreSQL can use the first column to find only this user's favorites, then scan the second column in backward order to produce the newest records first.
>
> The key evidence is that the plan has an Index Scan Backward and no separate Sort node.

Live command:

```bash
psql -P pager=off meowlytics_551 -f dsci551/explain/02-favorites-composite-index.sql
```

After the output appears:

> The plan shows Index Scan Backward using Favorite_userId_createdAt_idx.
>
> There is no Sort node, because the B-tree order already matches the ORDER BY createdAt DESC requirement.
>
> This demonstrates why index column order matters: the same index supports both filtering and ordering.

If the API still loads all 2,000 favorites:

> In the evidence query I use LIMIT 20 to show the top-N retrieval pattern. The same composite index is also used when retrieving the full favorites list; the difference is that without a limit PostgreSQL cannot stop early.

## Slide 7: Query Planner - Cost Estimation & Selectivity

Target time: 60 seconds.

Speaker script:

> The next point is that PostgreSQL is cost-based.
>
> Having an index does not mean the index is always used. The planner estimates the cost of each possible plan using table statistics, selectivity, and access method overhead.
>
> In the first experiment, I compare the same exact lookup with and without the index. With the index, the estimated cost is around 8. Without the index, the sequential scan cost is around 710.
>
> In the second experiment, I compare a 100-row table and a 10,000-row table. On the small table, the planner chooses a sequential scan because scanning 100 rows is cheaper than walking the index. On the larger table, it switches to an index scan.

Recommended live command:

```bash
psql -P pager=off meowlytics_551 -f dsci551/explain/05-small-vs-large-data.sql
```

After the output appears:

> This is the planner behavior suggested in the feedback: small data versus larger data, and cost estimation rather than a fixed rule.

Optional command if time allows:

```bash
psql -P pager=off meowlytics_551 -f dsci551/explain/04-with-vs-without-index.sql
```

Optional narration:

> This script drops and recreates the index only in the demo database, so it directly shows the plan flipping from Index Scan to Seq Scan and then back.

## Slide 8: B-tree Limitation - Fuzzy Search

Target time: 50 seconds.

Speaker script:

> B-tree indexes are very good for exact lookup and prefix or range-style access, but they do not solve every search problem.
>
> For fuzzy matching like ILIKE '%chick%', the leading wildcard means the matching text can appear anywhere inside the string.
>
> A B-tree is sorted lexicographically from the beginning of the key, so PostgreSQL cannot jump to one contiguous range of leaf pages.
>
> Therefore the planner chooses a sequential scan.

Live command:

```bash
psql -P pager=off meowlytics_551 -f dsci551/explain/03-fuzzy-ilike-seq-scan.sql
```

After the output appears:

> The plan confirms this: Seq Scan on Ingredient, with about 9,400 rows removed by the filter.
>
> This is a limitation of the chosen B-tree design. A better design for this workload would be a trigram GIN index using pg_trgm, but I intentionally keep the project focused on B-tree behavior.

## Slide 9: MVCC

Target time: 50 seconds.

Speaker script:

> PostgreSQL also uses MVCC, or Multi-Version Concurrency Control.
>
> An update does not overwrite a row in place. Instead, PostgreSQL creates a new tuple version with a new xmin and a new ctid, while the old tuple remains until vacuum can clean it up.
>
> This matters for Meowlytics because one request may read ingredient or favorite data while another request inserts a new favorite or refreshes an AI-generated ingredient.
>
> MVCC lets readers continue using a consistent snapshot instead of being blocked by writers.

Optional live command:

```bash
psql -P pager=off meowlytics_551 -f dsci551/explain/06-mvcc-snapshot-isolation.sql
```

If time is short:

> I include a script that shows the hidden xmin, xmax, and ctid columns before and after an update. The exact transaction IDs change each run, but the pattern is consistent: update creates a new tuple version.

## Slide 10: Index Maintenance

Target time: 35 seconds.

Speaker script:

> Indexes improve read performance, but they are not free.
>
> When Meowlytics inserts a new ingredient, PostgreSQL writes the row to the heap and also inserts entries into the B-tree indexes on name, nameEn, and source.
>
> When a row is updated, PostgreSQL creates a new heap version and may add new index entries. Old tuples and old index entries remain until vacuum cleanup.
>
> This is the index maintenance tradeoff: faster reads, but extra write work and potential bloat.

## Slide 11: Comparison - PostgreSQL vs MySQL vs MongoDB

Target time: 35 seconds.

Speaker script:

> Compared with MySQL InnoDB, PostgreSQL uses heap storage plus secondary indexes, while InnoDB clusters data around the primary key.
>
> Compared with MongoDB, PostgreSQL uses relational tables and SQL query planning, while MongoDB stores BSON documents and is more flexible for schema changes.
>
> For this project, PostgreSQL is a good match because the workload is relational, query-plan behavior is transparent through EXPLAIN ANALYZE, and MVCC is easy to demonstrate with tuple metadata.

## Slide 12: Limitations & Lessons Learned

Target time: 40 seconds.

Speaker script:

> The first limitation is fuzzy search. A normal B-tree does not help with leading-wildcard ILIKE, so a production version should use pg_trgm with a GIN index.
>
> The second limitation is that live AI analysis requires a Google API key, so the reproducible grading path uses pre-seeded data.
>
> The third limitation is MVCC overhead: updates create dead tuples, so vacuum and index maintenance matter.
>
> The main lesson is that database design should follow application access patterns. The composite favorites index is useful because it matches both the filter and the ordering pattern.

## Slide 13: Conclusion

Target time: 30 seconds.

Speaker script:

> To conclude, Meowlytics connects real application operations to PostgreSQL internals.
>
> Exact ingredient lookup maps to B-tree index traversal. Favorites retrieval maps to a composite index and backward index scan. Planner experiments show cost-based decisions with and without indexes, and on small versus larger data.
>
> Fuzzy search shows a limitation of B-tree indexes, and MVCC shows how PostgreSQL supports concurrent reads and writes using tuple versions.
>
> The project is fully reproducible through the setup script, deterministic seed data, and the EXPLAIN evidence files.

Final line:

> Thank you. I am happy to answer questions or rerun any of the EXPLAIN scripts.

## Recommended Live Commands

Most stable order:

```bash
psql -P pager=off meowlytics_551 -f dsci551/explain/01-ingredient-exact-lookup.sql
psql -P pager=off meowlytics_551 -f dsci551/explain/02-favorites-composite-index.sql
psql -P pager=off meowlytics_551 -f dsci551/explain/03-fuzzy-ilike-seq-scan.sql
psql -P pager=off meowlytics_551 -f dsci551/explain/05-small-vs-large-data.sql
```

If there is enough time:

```bash
psql -P pager=off meowlytics_551 -f dsci551/explain/04-with-vs-without-index.sql
psql -P pager=off meowlytics_551 -f dsci551/explain/06-mvcc-snapshot-isolation.sql
```

## Five-Minute Version

If the demo time is tight, use this shorter route:

```text
Slide 1: 10 seconds
Slide 2 + live app: 50 seconds
Slide 4: 30 seconds
Slide 5 + script 01: 60 seconds
Slide 6 + script 02: 60 seconds
Slide 7 or 8 + script 05 or 03: 60 seconds
Slide 13: 20 seconds
```

Skip or briefly mention:

```text
Slide 3, 9, 10, 11, 12
```

Useful transition:

> I include additional evidence for MVCC, index maintenance, and comparison in the slides and report, but for the live demo I will focus on the core query-plan evidence.

## Likely Questions and Answers

### Why not MongoDB?

> MongoDB is flexible for document data, but this project needs transparent query planning, SQL-level EXPLAIN ANALYZE, relational user/favorite relationships, and PostgreSQL MVCC tuple visibility. PostgreSQL makes the internal mapping easier to demonstrate.

### Why does fuzzy search not use the B-tree index?

> Because ILIKE '%chick%' has a leading wildcard. The B-tree is ordered from the start of the string, so PostgreSQL cannot identify a contiguous leaf-page range. It must scan and filter rows. A trigram GIN index would be the better production solution.

### Why does the small table use Seq Scan even though an index exists?

> Because PostgreSQL is cost-based. For 100 rows, scanning the whole table is cheaper than paying the startup cost of walking the B-tree and fetching heap tuples. At 10,000 rows, the index becomes cheaper.

### What is the tradeoff of adding indexes?

> Reads become faster, but writes become more expensive because PostgreSQL must maintain both heap tuples and index entries. Updates also create dead tuples under MVCC, so vacuum matters.

### Can the TA reproduce this?

> Yes. The repository includes dsci551/setup.sh, deterministic seed data, Prisma schema, and six EXPLAIN scripts. The setup script creates the local database, adapts the local PostgreSQL username, pushes the schema, seeds data, and runs a smoke test.
