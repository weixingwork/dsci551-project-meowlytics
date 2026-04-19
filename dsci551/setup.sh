#!/usr/bin/env bash
# =============================================================
# DSCI 551 Demo — One-Command Reproducer
# =============================================================
# Run from the repository root:
#     bash dsci551/setup.sh
# =============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

echo "📂 Repo root: $REPO_ROOT"
echo

# -------------------------------------------------------------
# 1. Sanity checks
# -------------------------------------------------------------
command -v psql >/dev/null || {
  echo "❌ psql not found. Install PostgreSQL or add it to PATH."
  echo "   macOS: brew install postgresql@15 && export PATH=\"/opt/homebrew/opt/postgresql@15/bin:\$PATH\""
  exit 1
}
command -v npm >/dev/null || { echo "❌ npm not found. Install Node.js 20+."; exit 1; }

echo "✅ psql: $(psql --version)"
echo "✅ node: $(node --version)"
echo

LOCAL_PG_USER="${PGUSER:-$(whoami)}"
DB_NAME="meowlytics_551"
DEFAULT_DEMO_URL="postgresql://xingwei@localhost:5432/${DB_NAME}"
LOCAL_DEMO_URL="postgresql://${LOCAL_PG_USER}@localhost:5432/${DB_NAME}"

# -------------------------------------------------------------
# 2. Create database (idempotent)
# -------------------------------------------------------------
if psql -l 2>/dev/null | grep -q "$DB_NAME"; then
  echo "ℹ️  Database $DB_NAME already exists — skipping createdb"
else
  echo "🛠  Creating database $DB_NAME..."
  createdb "$DB_NAME"
fi
echo

# -------------------------------------------------------------
# 3. Prepare .env for the local PostgreSQL role
# -------------------------------------------------------------
if [[ ! -f .env ]]; then
  echo "📝 Copying dsci551/.env.example → .env"
  cp dsci551/.env.example .env
else
  echo "ℹ️  .env already exists"
fi

# The public repo intentionally commits a demo-safe .env. On another
# machine, that file may still contain Wei's local role. Replace only
# the known demo default; preserve any custom DATABASE_URL the grader
# has already configured.
if grep -q "DATABASE_URL=\"${DEFAULT_DEMO_URL}\"" .env; then
  sed -i.bak "s|DATABASE_URL=\"${DEFAULT_DEMO_URL}\"|DATABASE_URL=\"${LOCAL_DEMO_URL}\"|" .env
  rm -f .env.bak
  echo "🔧 Adjusted DATABASE_URL for local postgres role '${LOCAL_PG_USER}'"
else
  echo "ℹ️  Keeping existing DATABASE_URL in .env"
fi
echo

# -------------------------------------------------------------
# 4. Install dependencies
# -------------------------------------------------------------
if [[ ! -d node_modules ]]; then
  echo "📦 Installing npm dependencies..."
  npm install
else
  echo "ℹ️  node_modules already present — skipping npm install"
fi
echo

# -------------------------------------------------------------
# 5. Create schema
# -------------------------------------------------------------
echo "🏗  Running prisma db push..."
npx prisma db push
echo

# -------------------------------------------------------------
# 6. Seed synthetic data
# -------------------------------------------------------------
echo "🌱 Seeding synthetic data (deterministic)..."
npx tsx dsci551/seed/seed.ts
echo

# -------------------------------------------------------------
# 7. Smoke test — run one EXPLAIN to confirm
# -------------------------------------------------------------
echo "🔬 Smoke test — running exact-lookup EXPLAIN ANALYZE..."
psql "$DB_NAME" -c "EXPLAIN ANALYZE SELECT * FROM \"Ingredient\" WHERE \"nameEn\" = 'Chicken';"
echo

echo "✅ Setup complete."
echo
echo "Next steps:"
echo "  • Run the web app:       npm run dev"
echo "  • Log in at:             http://localhost:3000"
echo "  • Credentials:           demo@551.edu / demo551"
echo "  • Run all EXPLAIN demos: for f in dsci551/explain/*.sql; do psql meowlytics_551 -f \"\$f\"; done"
