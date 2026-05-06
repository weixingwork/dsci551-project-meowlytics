# Meowlytics — DSCI 551 Final Project

**Course:** DSCI 551 — Foundations of Data Management, Spring 2026
**Student:** Wei Xing
**Database system under study:** PostgreSQL 15
**Focus areas:** B-tree indexing · Cost-based query planning · MVCC

---

## 1. What this repository contains

This repository is the final-project submission for DSCI 551. It bundles two
things:

1. **A working web application — Meowlytics.** A Next.js 16 application that
   lets cat owners upload a cat-food label, extracts ingredients with a
   multimodal AI model (Gemini), and enriches each ingredient with a
   structured analysis backed by a PostgreSQL knowledge base. Users can save
   analyses to a personal Favorites collection. The realistic mix of
   exact-match lookups, user-scoped ordered retrieval, and bursty AI-driven
   inserts is what motivates the database analysis.

2. **A self-contained DSCI 551 demo kit at [`dsci551/`](dsci551/).** Includes
   a deterministic seed script, six `EXPLAIN ANALYZE` evidence scripts, a
   one-command setup, the demo slide deck, and the final report. Every claim
   about PostgreSQL internals in the report is reproducible from this
   directory.

All grading-relevant material lives in [`dsci551/`](dsci551/). The detailed
reproducer with the exact `EXPLAIN ANALYZE` results lives in
[`dsci551/README.md`](dsci551/README.md).

---

## 2. Quick start (for graders)

### 2.1 Prerequisites

| Tool | Version |
|---|---|
| Node.js | 20 or newer |
| PostgreSQL | 14 or newer (local installation) |
| npm | bundled with Node |

### 2.2 One-command reproduction

From the repository root:

```bash
bash dsci551/setup.sh
```

The script is idempotent and performs six steps:

1. Verifies that `psql` and `node` are on `PATH`.
2. Creates the local database `meowlytics_551` if it does not yet exist.
3. Copies `dsci551/.env.example` to `.env` if needed, and rewrites only the
   committed demo `DATABASE_URL` so it matches your local PostgreSQL role
   (your shell username on most Homebrew installs). A custom `DATABASE_URL`
   you have already set is preserved.
4. Runs `npm install` if `node_modules` is missing.
5. Runs `npx prisma db push --accept-data-loss` to create all four tables
   and their B-tree indexes.
6. Runs `npx tsx dsci551/seed/seed.ts` to populate 10,000 ingredients,
   51 users, and 5,000 favorites with a fixed-seed PRNG.
7. Runs a smoke `EXPLAIN ANALYZE` to confirm the indexed lookup is being
   used.

### 2.3 Run the application

```bash
npm run dev
# open http://localhost:3000
# log in with demo@551.edu / demo551
```

The demo user owns 2,000 favorites, so the Favorites page exercises the
composite-index retrieval path.

### 2.4 Run the query-plan evidence

```bash
for f in dsci551/explain/*.sql; do
  psql -P pager=off meowlytics_551 -f "$f"
done
```

Each script is documented in detail in
[`dsci551/README.md §4`](dsci551/README.md). A summary of what each one
proves appears in the next section of this README.

---

## 3. Application operations mapped to PostgreSQL internals

Each row below corresponds to one evidence script in `dsci551/explain/`.
The full discussion lives in
[`dsci551/docs/FINAL_REPORT.md §5`](dsci551/docs/FINAL_REPORT.md).

| # | Application operation | SQL pattern | Internal mechanism observed | Evidence |
|---|---|---|---|---|
| 1 | Click an ingredient to see its analysis | `WHERE nameEn = 'Chicken'` | B-tree **Index Scan** via `Ingredient_nameEn_idx` | [`01`](dsci551/explain/01-ingredient-exact-lookup.sql) |
| 2 | Open the Favorites page | `WHERE userId = ? ORDER BY createdAt DESC` | Composite B-tree, **Index Scan Backward**, no separate Sort node | [`02`](dsci551/explain/02-favorites-composite-index.sql) |
| 3 | Substring search fallback | `WHERE nameEn ILIKE '%chick%'` | **Sequential Scan** — leading wildcard defeats the B-tree | [`03`](dsci551/explain/03-fuzzy-ilike-seq-scan.sql) |
| 4 | Demonstrate planner cost sensitivity | Drop the index, repeat the query | Plan flips from Index Scan to Seq Scan and back | [`04`](dsci551/explain/04-with-vs-without-index.sql) |
| 5 | Same query on small vs large data | 100-row vs 10,000-row table | Planner chooses Seq Scan for tiny tables even when the index exists | [`05`](dsci551/explain/05-small-vs-large-data.sql) |
| 6 | Concurrent reader while a writer commits | `UPDATE ... ROLLBACK` and snapshot test | MVCC tuple versioning: `xmin` / `xmax` / `ctid` change instead of in-place update | [`06`](dsci551/explain/06-mvcc-snapshot-isolation.sql) |

---

## 4. Repository layout

```
dsci551-project-meowlytics/
|-- README.md                 high-level orientation (this file)
|-- .env                      committed demo-safe local configuration
|-- package.json              Node dependencies and scripts
|-- prisma/
|   `-- schema.prisma         data model and B-tree index declarations
|-- app/                      Next.js 16 application (UI pages + API routes)
|   |-- (main)/               UI: analysis page, favorites, account
|   `-- api/                  JSON API: auth, knowledge, favorites, folders
|-- lib/                      domain library (db, auth, knowledge search)
|-- public/                   static assets
`-- dsci551/                  DSCI 551 deliverables
    |-- README.md             detailed reproducer + per-script analysis
    |-- setup.sh              one-command reproducer
    |-- .env.example          local-config template
    |-- seed/seed.ts          deterministic synthetic-data generator
    |-- explain/              six EXPLAIN ANALYZE scripts (numbered 01..06)
    |-- slides/               final demo deck (PDF + PPTX)
    `-- docs/
        `-- FINAL_REPORT.md   final written report
```

---

## 5. Demo credentials

| Field | Value |
|---|---|
| Email | `demo@551.edu` |
| Password | `demo551` |
| Preloaded favorites for this user | 2,000 |
| Total ingredients in the database | 10,000 |
| Total users (1 demo + 50 synthetic) | 51 |
| Total favorites across all users | 5,000 |

---

## 6. About the application (context)

Meowlytics solves a real problem: cat-food ingredient labels are hard for
non-experts to interpret. The app accepts a label photograph, runs a
multimodal AI extraction, and enriches each ingredient with a structured
analysis (category, health impact, benefits, concerns) drawn from a
PostgreSQL-backed knowledge base. Logged-in users can save analyses they
care about into a personal Favorites collection, optionally grouped into
Folders.

The workload is deliberately mixed:

- **Read-heavy on the hot path** — every ingredient click is an exact-match
  lookup; every favorites page is a user-scoped ordered scan.
- **Bursty writes** — when an ingredient is missing from the knowledge base,
  the AI generates a new structured record and inserts it for future reuse.
- **Concurrent** — long-running read queries (favorites browsing) are
  interleaved with these AI-driven inserts.

This mix is what makes B-tree indexing, cost-based planning, and MVCC the
right internals to study, and it is what the seed dataset reproduces at a
realistic scale.

---

## 7. Notes on configuration

- The repository **intentionally commits a `.env` file** containing only
  demo-safe local defaults (database URL, an ad-hoc auth secret, a marker
  admin email). It contains no real secrets. This is documented inside the
  file itself.
- Live AI ingredient analysis (the `POST /api/analyze` and AI-fallback
  branch of `POST /api/knowledge`) requires a `GOOGLE_API_KEY`. The
  database-focused grading material does **not** require it; the seed script
  pre-populates enough realistic data to demonstrate every internal
  mechanism without any AI calls.
- `.env.local`, `.env.production`, and other `.env*` variants are
  gitignored — only the demo-safe `.env` is committed.

---

## 8. License

DSCI 551 course project. Not intended for production use.
