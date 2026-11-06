#!/usr/bin/env bash
#
# AgencyOS A Agent — Docker socket access verification
#
# Idempotent: safe to run multiple times.
#
# The ghcr.io/devcontainers/features/docker-outside-of-docker:1 feature
# already handles:
#   * Installing the Docker CLI and Compose v2 plugin
#   * Configuring the container user's group membership for the mounted
#     host Docker socket (matches the socket's GID automatically)
#
# This script only verifies that Docker is accessible in the current
# session. It does NOT:
#   * Start a Docker daemon (no Docker-in-Docker)
#   * Change ownership or permissions of the host-mounted socket
#   * Create groups or modify users
#
# Requirements preserved:
#   * Never runs docker compose down -v or any destructive reset
#   * Never starts a Docker daemon inside the container
#   * Never changes socket ownership or permissions
#   * Idempotent: safe to run on every Codespaces resume

set -uo pipefail

DOCKER_SOCKET="${DOCKER_SOCKET:-/var/run/docker.sock}"

log() {
  printf '[setup-docker-socket] %s\n' "$*"
}

warn() {
  printf '[setup-docker-socket] WARNING: %s\n' "$*" >&2
}

error() {
  printf '[setup-docker-socket] ERROR: %s\n' "$*" >&2
  exit 1
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

# If Docker already works, nothing to do.
if docker info >/dev/null 2>&1; then
  log "Docker already accessible. No changes needed."
  exit 0
fi

# If the socket doesn't exist yet, there's nothing to configure.
if [[ ! -S "$DOCKER_SOCKET" ]]; then
  error "Docker socket not found at $DOCKER_SOCKET. The docker-outside-of-docker feature requires the host Docker socket to be mounted."
fi

log "Found Docker socket at $DOCKER_SOCKET."

# Detect the socket's actual GID (e.g. 800 on GitHub Codespaces).
SOCKET_GID=$(stat -c '%g' "$DOCKER_SOCKET" 2>/dev/null || true)
if [[ -z "$SOCKET_GID" ]]; then
  warn "Could not determine GID of $DOCKER_SOCKET."
else
  log "Docker socket GID: $SOCKET_GID."

  # Check if the GID already maps to an existing group.
  EXISTING_GROUP=$(getent group "$SOCKET_GID" 2>/dev/null | cut -d: -f1 || true)
  if [[ -n "$EXISTING_GROUP" ]]; then
    log "GID $SOCKET_GID maps to existing group: $EXISTING_GROUP"
  else
    warn "No existing group for GID $SOCKET_GID. The docker-outside-of-docker feature should have created a matching group."
  fi
fi

# Final verification: try docker info one more time.
if docker info >/dev/null 2>&1; then
  log "Docker is accessible."
else
  warn "Docker is not yet accessible. This may require a container restart or new shell for group membership changes to take effect."
  warn "Socket: $DOCKER_SOCKET (GID: ${SOCKET_GID:-unknown})"
  warn "Run: docker info"
fi

log "Docker socket access verification complete."
