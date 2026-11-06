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
#   * Starts Next.js preview on port 3001 only when the port is free
#   * Verifies Next.js becomes reachable before reporting success
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

NEXT_DEV_LOG="${NEXT_DEV_LOG:-$WORKSPACE_DIR/.next-dev.log}"
NEXT_PID_FILE="${NEXT_PID_FILE:-$WORKSPACE_DIR/.next-dev.pid}"
DOCKER_SOCKET_SETUP_SCRIPT="${WORKSPACE_DIR}/.devcontainer/setup-docker-socket.sh"

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

# Check whether anything is already listening on the app port.
# Returns 0 if the port is in use, 1 if it is free.
port_in_use() {
  if command -v ss >/dev/null 2>&1; then
    ss -tlnp 2>/dev/null | grep -q ":${APP_PORT}\\b"
  elif command -v lsof >/dev/null 2>&1; then
    lsof -ti :"$APP_PORT" >/dev/null 2>&1
  elif command -v curl >/dev/null 2>&1; then
    curl -s -o /dev/null --connect-timeout 2 "http://127.0.0.1:${APP_PORT}/" >/dev/null 2>&1
  else
    # No tool available to check; assume free and let the startup attempt surface errors.
    return 1
  fi
}

# Check whether the process listening on the app port is a Node.js process.
# Returns 0 if a Node process is listening, 1 otherwise.
port_serving_node() {
  local pids=""
  if command -v ss >/dev/null 2>&1; then
    pids=$(ss -tlnp 2>/dev/null | grep ":${APP_PORT}\\b" | grep -oP 'pid=\K[0-9]+' || true)
  elif command -v lsof >/dev/null 2>&1; then
    pids=$(lsof -ti :"$APP_PORT" 2>/dev/null || true)
  fi

  if [[ -z "$pids" ]]; then
    return 1
  fi

  for pid in $pids; do
    local comm
    comm=$(ps -p "$pid" -o comm= 2>/dev/null || true)
    if [[ "$comm" == "node" || "$comm" == "npm" || "$comm" == "next" ]]; then
      return 0
    fi
  done
  return 1
}

# Wait for the Next.js dev server to become reachable on the app port.
# Polls /api/health (or the root path as a fallback) until the server responds.
wait_for_nextjs() {
  log "Waiting for Next.js to become reachable on port ${APP_PORT} (timeout: ${READINESS_TIMEOUT}s)..."
  local elapsed=0
  local url="http://127.0.0.1:${APP_PORT}/api/health"

  while [[ $elapsed -lt $READINESS_TIMEOUT ]]; do
    if command -v curl >/dev/null 2>&1; then
      if curl -s -o /dev/null --connect-timeout 2 "$url" >/dev/null 2>&1; then
        log "Next.js is reachable on port ${APP_PORT}."
        return 0
      fi
      # Fallback: try the root path if /api/health is not yet registered
      if curl -s -o /dev/null --connect-timeout 2 "http://127.0.0.1:${APP_PORT}/" >/dev/null 2>&1; then
        log "Next.js is reachable on port ${APP_PORT}."
        return 0
      fi
    elif command -v node >/dev/null 2>&1; then
      # Minimal TCP connect check using Node.js when curl is unavailable
      if node -e "
        const net = require('net');
        const s = new net.Socket();
        s.setTimeout(2000);
        s.on('connect', () => { s.destroy(); process.exit(0); });
        s.on('error', () => { s.destroy(); process.exit(1); });
        s.connect(${APP_PORT}, '127.0.0.1');
      " 2>/dev/null; then
        log "Next.js is reachable on port ${APP_PORT}."
        return 0
      fi
    fi
    sleep "$READINESS_INTERVAL"
    elapsed=$((elapsed + READINESS_INTERVAL))
  done
  error "Next.js did not become reachable on port ${APP_PORT} within ${READINESS_TIMEOUT}s. Check logs: ${NEXT_DEV_LOG}"
}

start_nextjs() {
  log "Checking port ${APP_PORT} occupancy..."

  if port_in_use; then
    if port_serving_node; then
      log "Port ${APP_PORT} is already serving a Node.js process. Reusing existing Next.js instance."
      log "Preview available at: http://localhost:${APP_PORT}"
      return 0
    else
      error "Port ${APP_PORT} is occupied by a non-Node.js process. Will not kill it. Free the port manually and re-run."
    fi
  fi

  log "Starting Next.js dev server on port ${APP_PORT}..."
  export PORT="$APP_PORT"
  export NODE_ENV="${NODE_ENV:-development}"

  # Start Next.js in a detached session so it survives the postStartCommand
  # shell exiting. `setsid` creates a new session; `nohup` ignores SIGHUP.
  # Output goes to a log file for debugging.
  setsid nohup npm run dev > "$NEXT_DEV_LOG" 2>&1 &
  local nextjs_pid=$!
  echo "$nextjs_pid" > "$NEXT_PID_FILE"
  log "Next.js dev server launched (pid $nextjs_pid). Logs: ${NEXT_DEV_LOG}"

  # Wait for Next.js to become reachable. This polls the health endpoint
  # for up to READINESS_TIMEOUT seconds, so we don't need a fixed sleep
  # or a fragile PID check on the npm wrapper process.
  wait_for_nextjs
  log "Next.js dev server is running (pid $nextjs_pid)."
  log "Preview available at: http://localhost:${APP_PORT}"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
# Ensure Docker socket access before any Docker commands.
if [[ -f "$DOCKER_SOCKET_SETUP_SCRIPT" ]]; then
  bash "$DOCKER_SOCKET_SETUP_SCRIPT"
else
  warn "Docker socket setup script not found at $DOCKER_SOCKET_SETUP_SCRIPT."
fi

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
