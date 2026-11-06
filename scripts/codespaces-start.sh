#!/usr/bin/env bash
#
# AgencyOS A Agent — Codespaces postStartCommand / dev startup script
#
# Idempotent: safe to run multiple times. Starting PostgreSQL when it is
# already running is a no-op; migrating an already-migrated database is a
# no-op; restarting the app replaces the previous dev process.
#
# Requirements preserved:
#   * Starts ONLY the agencyos-a PostgreSQL service (not the app container)
#   * Waits for PostgreSQL readiness before allowing app startup
#   * Preserves existing Docker volumes, migrations, users and data
#   * NEVER runs `docker compose down -v` or any destructive reset
#   * Starts Next.js preview on port 3001
#
# Usage:
#   ./scripts/codespaces-start.sh        # start everything
#   ./scripts/codespaces-start.sh --db-only   # start/postgres + migrate only
#   ./scripts/codespaces-start.sh --app-only  # start Next.js only (assumes DB up)

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
COMPOSE_PROJECT="${COMPOSE_PROJECT:-agencyos-a}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
APP_PORT="${APP_PORT:-3001}"
POSTGRES_HOST_PORT="${POSTGRES_HOST_PORT:-5433}"
POSTGRES_INTERNAL_PORT="${POSTGRES_INTERNAL_PORT:-5432}"
READINESS_TIMEOUT="${READINESS_TIMEOUT:-120}"
READINESS_INTERVAL="${READINESS_INTERVAL:-2}"

WORKSPACE_DIR="${WORKSPACE_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$WORKSPACE_DIR"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log() {
  printf '[codespaces-start] %s\n' "$*"
}

warn() {
  printf '[codespaces-start] WARNING: %s\n' "$*" >&2
}

error() {
  printf '[codespaces-start] ERROR: %s\n' "$*" >&2
  exit 1
}

is_docker_available() {
  command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1
}

is_compose_file_present() {
  [[ -f "$COMPOSE_FILE" ]]
}

postgres_container_running() {
  docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" \
    ps --services --filter "status=running" postgres 2>/dev/null | grep -q "^postgres$"
}

postgres_container_exists() {
  docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" \
    ps --services postgres 2>/dev/null | grep -q "^postgres$"
}

wait_for_postgres() {
  log "Waiting for PostgreSQL to become ready (timeout: ${READINESS_TIMEOUT}s)..."
  local elapsed=0
  while [[ $elapsed -lt $READINESS_TIMEOUT ]]; do
    # Try the Docker healthcheck first
    if docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" \
       ps postgres 2>/dev/null | grep -q "healthy"; then
      log "PostgreSQL is healthy."
      return 0
    fi
    # Fallback: try a direct TCP/pg_isready check against the host port
    if command -v pg_isready >/dev/null 2>&1; then
      if pg_isready -h "127.0.0.1" -p "$POSTGRES_HOST_PORT" -U agencyos -d agencyos >/dev/null 2>&1; then
        log "PostgreSQL is accepting connections."
        return 0
      fi
    fi
    sleep "$READINESS_INTERVAL"
    elapsed=$((elapsed + READINESS_INTERVAL))
  done
  error "PostgreSQL did not become ready within ${READINESS_TIMEOUT}s."
}

start_postgres() {
  if ! is_docker_available; then
    warn "Docker is not available in this environment. Skipping PostgreSQL startup."
    return 0
  fi

  if ! is_compose_file_present; then
    error "docker-compose.yml not found at $WORKSPACE_DIR/$COMPOSE_FILE"
  fi

  if postgres_container_running; then
    log "PostgreSQL container is already running. Skipping start."
    return 0
  fi

  if postgres_container_exists; then
    log "PostgreSQL container exists but is stopped. Starting it..."
    docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" start postgres
  else
    log "Starting PostgreSQL container (docker compose -p $COMPOSE_PROJECT up -d postgres)..."
    # `up -d` creates the container if missing, starts it, and preserves volumes.
    # It never touches existing data or runs `down -v`.
    docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" up -d postgres
  fi

  wait_for_postgres
}

run_prisma_generate() {
  log "Running prisma generate..."
  if command -v npx >/dev/null 2>&1; then
    npx prisma generate
  else
    npm exec -- prisma generate
  fi
  log "Prisma client generated."
}

run_prisma_migrate() {
  log "Checking for pending Prisma migrations..."
  # `migrate deploy` is idempotent: it only applies migrations that have not
  # been applied yet. It never resets or drops data.
  if command -v npx >/dev/null 2>&1; then
    npx prisma migrate deploy
  else
    npm exec -- prisma migrate deploy
  fi
  log "Prisma migrations are up to date."
}

start_nextjs() {
  log "Starting Next.js dev server on port ${APP_PORT}..."

  # Kill any existing Next.js dev process on this port so we can restart cleanly.
  # This is not destructive to the database or any volumes.
  if command -v lsof >/dev/null 2>&1; then
    local existing_pid
    existing_pid=$(lsof -ti :"$APP_PORT" 2>/dev/null || true)
    if [[ -n "$existing_pid" ]]; then
      log "Stopping existing Next.js process (pid $existing_pid) on port ${APP_PORT}..."
      kill "$existing_pid" 2>/dev/null || true
      sleep 2
    fi
  fi

  export PORT="$APP_PORT"
  export NODE_ENV="${NODE_ENV:-development}"

  # Start Next.js in the background so the postStartCommand can return.
  # Logs go to a file for debugging; the dev server is also accessible via
  # the forwarded port 3001.
  nohup npm run dev > "$WORKSPACE_DIR/.next-dev.log" 2>&1 &
  local nextjs_pid=$!
  log "Next.js dev server started (pid $nextjs_pid). Logs: $WORKSPACE_DIR/.next-dev.log"
  log "Preview available at: http://localhost:${APP_PORT}"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
MODE="${1:-full}"

case "$MODE" in
  --db-only|db-only)
    log "Mode: database only"
    start_postgres
    run_prisma_generate
    run_prisma_migrate
    ;;
  --app-only|app-only)
    log "Mode: app only (assuming database is already running)"
    start_nextjs
    ;;
  --help|-h)
    echo "Usage: $0 [--db-only|--app-only|--help]"
    echo "  --db-only   Start PostgreSQL, generate Prisma client, run migrations"
    echo "  --app-only  Start Next.js dev server (assumes DB is already up)"
    echo "  (default)   Start PostgreSQL, migrate, then Next.js"
    exit 0
    ;;
  full|"")
    log "Mode: full startup"
    start_postgres
    run_prisma_generate
    run_prisma_migrate
    start_nextjs
    ;;
  *)
    error "Unknown mode: $MODE. Use --db-only, --app-only, or no argument for full startup."
    ;;
esac

log "Startup complete."
