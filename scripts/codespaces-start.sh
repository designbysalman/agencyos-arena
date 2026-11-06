#!/usr/bin/env bash
#
# AgencyOS A Agent — Codespaces postStartCommand / dev startup script
#
# Idempotent: safe to run multiple times.
#
# Requirements preserved:
#   * Starts ONLY the agencyos-a PostgreSQL service (not the app container)
#   * Waits for PostgreSQL readiness before allowing app startup
#   * Preserves existing Docker volumes, migrations, users and data
#   * NEVER runs docker compose down -v or any destructive reset
#   * Does NOT automatically apply Prisma migrations (explicit and controlled)
#   * Does NOT kill arbitrary port-3001 processes
#   * Fails clearly when Docker is unavailable
#   * Starts Next.js preview on port 3001
#
# Usage:
#   ./scripts/codespaces-start.sh        # start PostgreSQL + Prisma generate + Next.js
#   ./scripts/codespaces-start.sh --db-only   # start PostgreSQL + Prisma generate only
#   ./scripts/codespaces-start.sh --app-only  # start Next.js only (assumes DB is up)

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
COMPOSE_PROJECT="${COMPOSE_PROJECT:-agencyos-a}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
APP_PORT="${APP_PORT:-3001}"
POSTGRES_HOST_PORT="${POSTGRES_HOST_PORT:-5433}"
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

postgres_container_running() {
  docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" \
    ps --services --filter "status=running" postgres 2>/dev/null | grep -q "^postgres$"
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
    error "Docker is not available in this environment. Cannot start PostgreSQL."
  fi

  if postgres_container_running; then
    log "PostgreSQL container is already running. Verifying readiness..."
    wait_for_postgres
    return 0
  fi

  log "Starting PostgreSQL container (docker compose -p $COMPOSE_PROJECT up -d postgres)..."
  # `up -d` creates the container if missing, starts it, and preserves volumes.
  # It never touches existing data or runs `down -v`.
  docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" up -d postgres
  wait_for_postgres
}

run_prisma_generate() {
  log "Running prisma generate..."
  npx prisma generate
  log "Prisma client generated."
}

start_nextjs() {
  log "Starting Next.js dev server on port ${APP_PORT}..."
  export PORT="$APP_PORT"
  export NODE_ENV="${NODE_ENV:-development}"

  # Start Next.js in the background so the postStartCommand can return.
  # Logs go to a file for debugging; the dev server is accessible via
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
    ;;
  --app-only|app-only)
    log "Mode: app only (assuming database is already running)"
    start_nextjs
    ;;
  --help|-h)
    echo "Usage: $0 [--db-only|--app-only|--help]"
    echo "  --db-only   Start PostgreSQL, generate Prisma client"
    echo "  --app-only  Start Next.js dev server (assumes DB is already up)"
    echo "  (default)   Start PostgreSQL, generate Prisma client, then Next.js"
    exit 0
    ;;
  full|"")
    log "Mode: full startup"
    start_postgres
    run_prisma_generate
    start_nextjs
    ;;
  *)
    error "Unknown mode: $MODE. Use --db-only, --app-only, or no argument for full startup."
    ;;
esac

log "Startup complete."
