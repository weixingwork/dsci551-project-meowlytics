# Meowlytics — DSCI 551 Final Project

> **DSCI 551 — Foundations of Data Management, Spring 2026**
> **Student:** Wei Xing
> **Database system under study:** PostgreSQL 15
> **Focus areas:** B-tree indexing · Query planner cost estimation · MVCC

This repository is the final project submission for DSCI 551. It contains:

- A **working Next.js web application** (Meowlytics — an AI-assisted cat-food
  ingredient analyzer) whose realistic workload drives the database analysis.
- A **self-contained DSCI 551 demo kit** under [`dsci551/`](dsci551/) with a
  deterministic seed script, six query-plan evidence files, and reproducible
  setup instructions.

---

## 📖 For graders — start here

**All grading-relevant material lives in [`dsci551/`](dsci551/).**
The detailed setup, mapping tables, and expected `EXPLAIN ANALYZE`
results are in **[`dsci551/README.md`](dsci551/README.md)**.

### One-command reproduction

```bash
# Prerequisites: Node.js 20+, PostgreSQL 14+, npm
bash dsci551/setup.sh
```

This script will:

1. Create a local database `meowlytics_551`
2. Auto-adjust the committed demo `DATABASE_URL` in `.env` to your local postgres username
3. Install npm dependencies
4. Push the Prisma schema (creates all tables + B-tree indexes)
5. Seed deterministic synthetic data (10k ingredients · 51 users · 5k favorites)
6. Run a smoke-test `EXPLAIN ANALYZE` to confirm the index is being used

If you have already customized `DATABASE_URL`, the setup script preserves
your value.

Then:

```bash
npm run dev                   # open http://localhost:3000
# Log in with  demo@551.edu  /  demo551
```

### Running the query-plan evidence

```bash
for f in dsci551/explain/*.sql; do psql -P pager=off meowlytics_551 -f "$f"; done
```

The `-P pager=off` option keeps the output in the terminal instead of
opening the `(END)` pager screen.

Expected plans and execution times are documented in
[`dsci551/README.md §5`](dsci551/README.md).

---

## 🗂 Repository layout

```
dsci551-project-meowlytics/
├── README.md                    ← this file — high-level orientation
├── .env                         ← committed demo-safe local config
├── dsci551/                     ← ⭐ grading-relevant material
│   ├── README.md                ← detailed reproducer + mapping table
│   ├── setup.sh                 ← one-command reproducer
│   ├── .env.example             ← template mirror of committed .env
│   ├── seed/seed.ts             ← deterministic data generator
│   └── explain/                 ← 6 psql scripts (evidence files)
│       ├── 01-ingredient-exact-lookup.sql
│       ├── 02-favorites-composite-index.sql
│       ├── 03-fuzzy-ilike-seq-scan.sql
│       ├── 04-with-vs-without-index.sql
│       ├── 05-small-vs-large-data.sql
│       └── 06-mvcc-snapshot-isolation.sql
├── app/                         ← Next.js 16 application (UI, API routes)
├── lib/                         ← auth, db, knowledge search
├── prisma/schema.prisma         ← data model + index declarations
└── package.json
```

---

## 🔑 Demo credentials

| Field | Value |
|---|---|
| Email | `demo@551.edu` |
| Password | `demo551` |
| Preloaded favorites | 2,000 (for composite-index demos) |

---

## 🎯 Application operations → PostgreSQL internals

| Application operation | Internal mechanism | Evidence |
|---|---|---|
| Ingredient exact lookup (`nameEn = 'Chicken'`) | B-tree **Index Scan** | [01](dsci551/explain/01-ingredient-exact-lookup.sql) |
| Favorites page (`WHERE userId = ? ORDER BY createdAt DESC`) | Composite B-tree **Index Scan Backward** — no Sort step | [02](dsci551/explain/02-favorites-composite-index.sql) |
| Fuzzy ingredient fallback (`ILIKE '%chick%'`) | **Seq Scan** — leading wildcard defeats B-tree | [03](dsci551/explain/03-fuzzy-ilike-seq-scan.sql) |
| Planner cost sensitivity | Drop/recreate index — plan flips Seq↔Index | [04](dsci551/explain/04-with-vs-without-index.sql) |
| Selectivity on small vs large data | Planner prefers Seq on tiny tables | [05](dsci551/explain/05-small-vs-large-data.sql) |
| Concurrent reader + writer | MVCC tuple versioning + snapshot isolation | [06](dsci551/explain/06-mvcc-snapshot-isolation.sql) |

---

## 📝 About the application (context)

Meowlytics helps cat owners analyze cat-food ingredient labels using an AI
model that extracts ingredients and generates structured assessments. Stored
knowledge (Ingredients, Users, Favorites, Folders) lives in PostgreSQL so
that repeated lookups can be served from the database instead of
regenerating. This realistic read-heavy workload with user-specific
retrieval is what motivates the indexing and MVCC analysis in this project.

**Note:** live AI analysis requires a `GOOGLE_API_KEY` which is not included
in the public repo. All database-focused grading material works without it —
the seed script pre-populates enough realistic data to demonstrate every
internal mechanism.

---

## 📄 License

Course project, not intended for production use.
