# Meowlytics — DSCI 551 Course Project Demo

**Student:** Wei Xing
**Database system:** PostgreSQL 15 (local)
**Focus areas:** B-tree indexing, query planner cost estimation, MVCC (tuple versioning + snapshot isolation)

This directory contains everything needed to reproduce the DSCI 551
demonstration for the Meowlytics project: synthetic data, query-plan
evidence scripts, and setup instructions for the instructor / TA.

---

## 1. Prerequisites

- **Node.js** 20 or newer
- **PostgreSQL** 14 or newer (local installation)
- **npm**

### macOS install

```bash
brew install node postgresql@15
brew services start postgresql@15
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
```

### Ubuntu / Debian install

```bash
sudo apt update
sudo apt install -y nodejs npm postgresql
sudo service postgresql start
```

---

## 2. One-command setup

From the **repository root** (not this `dsci551/` directory):

```bash
bash dsci551/setup.sh
```

This will:

1. Create the local database `meowlytics_551`
2. Prepare `.env` for the local PostgreSQL role
3. Run `npx prisma db push` to create tables and indexes
4. Run the deterministic seed script (10,000 ingredients, 51 users, 5,000 favorites)
5. Print the demo user's id for use in EXPLAIN examples

The repository includes a demo-safe `.env`. If it still contains the
default URL `postgresql://xingwei@localhost:5432/meowlytics_551`,
`setup.sh` automatically rewrites only that value to your local
PostgreSQL role, normally your shell username from `whoami`. If you
already customized `DATABASE_URL`, the script leaves it unchanged.

If you prefer to run the steps manually, see **Section 3**.

---

## 3. Manual setup (step by step)

### 3.1 Create the database

```bash
createdb meowlytics_551
```

### 3.2 Configure environment

```bash
cp dsci551/.env.example .env
# Edit .env and change the username in DATABASE_URL to match
# your local postgres role. On macOS/Homebrew this is usually
# your shell username (e.g. 'xingwei').
# Or run `bash dsci551/setup.sh`; it automatically rewrites the
# committed demo default when needed.
```

### 3.3 Install dependencies

```bash
npm install
```

### 3.4 Create the schema

```bash
npx prisma db push
```

This creates four tables and all B-tree indexes declared in
`prisma/schema.prisma`:

```
Ingredient       10,000 rows
  ├── Ingredient_name_idx         (B-tree)
  ├── Ingredient_nameEn_idx       (B-tree)
  └── Ingredient_source_idx       (B-tree)

User                 51 rows
  └── User_email_key              (B-tree unique)

Favorite          5,000 rows
  └── Favorite_userId_createdAt_idx   (composite B-tree)

Folder                0 rows
  └── Folder_userId_createdAt_idx     (composite B-tree)
```

### 3.5 Seed synthetic data

```bash
npx tsx dsci551/seed/seed.ts
```

Output on success:

```
✅ Seed complete in ~2s

📋 Summary:
  Ingredients: 10000
  Users:       51
  Favorites:   5000

🔑 Demo credentials:
  email:    demo@551.edu
  password: demo551
  user id:  <copied cuid>
```

The seed uses a fixed-seed Mulberry32 PRNG, so the data is identical
across runs on any machine. This makes the `EXPLAIN ANALYZE` results
in **Section 5** reproducible.

### 3.6 Run the web app (optional — for UI demo)

```bash
npm run dev
# open http://localhost:3000
# log in with demo@551.edu / demo551
```

> **Note:** the AI-powered ingredient analysis feature requires a
> `GOOGLE_API_KEY`. It is **not** needed to reproduce any of the
> database / EXPLAIN demonstrations. The database-backed features
> (ingredient lookup, favorites retrieval) work without it.

---

## 4. Application operations → PostgreSQL internals mapping

| Application operation | SQL / Prisma behavior | PostgreSQL internal mechanism | Evidence file |
|---|---|---|---|
| Ingredient exact lookup | `WHERE nameEn = ?` | B-tree index traversal + heap tuple fetch | [01](explain/01-ingredient-exact-lookup.sql) |
| Favorites page | `WHERE userId = ? ORDER BY createdAt DESC LIMIT 20` | Composite B-tree, `Index Scan Backward`, no Sort step | [02](explain/02-favorites-composite-index.sql) |
| Fuzzy ingredient fallback | `ILIKE '%chick%'` | Sequential Scan — leading wildcard defeats B-tree | [03](explain/03-fuzzy-ilike-seq-scan.sql) |
| Index effect validation | same exact-lookup query | Drop / recreate index, observe plan flip | [04](explain/04-with-vs-without-index.sql) |
| Planner cost estimation | exact lookup on 100 vs 10k rows | Planner prefers Seq Scan on small tables even when index exists | [05](explain/05-small-vs-large-data.sql) |
| AI-generated ingredient insert | `INSERT INTO "Ingredient"` | Heap insert + B-tree index maintenance on 3 indexes | (seed script itself — discussed in report) |
| Concurrent read while writer commits | long-running `SELECT` during `UPDATE` | MVCC tuple versioning (`xmin`/`xmax`) + snapshot isolation | [06](explain/06-mvcc-snapshot-isolation.sql) |

---

## 5. Running the EXPLAIN ANALYZE evidence

All six scripts are self-contained `psql` files. From the repo root:

The commands use `-P pager=off` so the output prints directly in the
terminal instead of opening the `(END)` pager screen.

```bash
psql -P pager=off meowlytics_551 -f dsci551/explain/01-ingredient-exact-lookup.sql
psql -P pager=off meowlytics_551 -f dsci551/explain/02-favorites-composite-index.sql
psql -P pager=off meowlytics_551 -f dsci551/explain/03-fuzzy-ilike-seq-scan.sql
psql -P pager=off meowlytics_551 -f dsci551/explain/04-with-vs-without-index.sql
psql -P pager=off meowlytics_551 -f dsci551/explain/05-small-vs-large-data.sql
psql -P pager=off meowlytics_551 -f dsci551/explain/06-mvcc-snapshot-isolation.sql
```

Script 04 drops and recreates an index, so it is safe to rerun. Script
05 uses a `TEMP TABLE` that is automatically discarded at session end.
Script 06 wraps its UPDATE in `BEGIN ... ROLLBACK` so it makes no
persistent changes; the second (snapshot isolation) half requires two
terminals and contains step-by-step instructions inside the file.

### Expected results (from my run on 2026-04-15)

| # | Query | Plan | Execution Time |
|---|---|---|---|
| 1 | `WHERE nameEn = 'Chicken'` | Index Scan | **0.060 ms** |
| 2 | `WHERE userId = ? ORDER BY createdAt DESC LIMIT 20` | Index Scan Backward (no Sort) | **0.112 ms** |
| 3 | `WHERE nameEn ILIKE '%chick%'` | Seq Scan, 9400 rows filtered | **8.177 ms** |
| 4a | Same as #1 **with** index | Index Scan, cost 8.30 | **0.016 ms** |
| 4b | Same as #1 **without** index | Seq Scan, cost 711.00 | **5.203 ms** (325× slower) |
| 5 | Exact lookup on 100-row copy | Seq Scan (planner choice) | 0.033 ms |
| 6 | `UPDATE ... WHERE nameEn='Chicken'` inside a txn | `xmin` changes `1092→1121`, `ctid` moves `(0,1)→(585,5)` — UPDATE is insert + tombstone, not in-place | — |

---

## 6. Directory layout

```
dsci551/
├── README.md                              ← this file
├── setup.sh                               ← one-command reproducer
├── .env.example                           ← local DB URL template
├── seed/
│   └── seed.ts                            ← deterministic data generator
├── explain/
│   ├── 01-ingredient-exact-lookup.sql
│   ├── 02-favorites-composite-index.sql
│   ├── 03-fuzzy-ilike-seq-scan.sql
│   ├── 04-with-vs-without-index.sql
│   ├── 05-small-vs-large-data.sql
│   └── 06-mvcc-snapshot-isolation.sql
└── docs/
    └── (final report, slides, mapping table — added later)
```

---

## 7. Troubleshooting

**`psql: command not found`**
Postgres client is installed but not on your `PATH`. On Homebrew:

```bash
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
```

**`FATAL: role "xingwei" does not exist`**
Run `bash dsci551/setup.sh`; it rewrites the committed demo default to
your local PostgreSQL role. If you are doing manual setup, edit `.env`
and replace `xingwei` with your local postgres role (`whoami` on most
macOS/Homebrew installs).

**`FATAL: role "<your-username>" does not exist`**
Create a local PostgreSQL role for your shell user, then rerun setup:

```bash
createuser -s "$(whoami)"   # macOS/Homebrew, if your postgres install allows it
```

On Ubuntu/Debian, you may need:

```bash
sudo -u postgres createuser --superuser "$USER"
```

**`createdb: error: connection to server ... failed`**
PostgreSQL isn't running. Start it:

```bash
brew services start postgresql@15   # macOS
sudo service postgresql start       # Linux
```

**Seed script says `Can't reach database server`**
Double-check `DATABASE_URL` in `.env` matches your local setup.
You can test connectivity with:

```bash
psql "$(grep DATABASE_URL .env | cut -d= -f2- | tr -d '"')" -c '\conninfo'
```
