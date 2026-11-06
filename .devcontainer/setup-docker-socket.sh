#!/usr/bin/env bash
#
# AgencyOS A Agent — Docker socket access setup
#
# Idempotent: safe to run multiple times.
#
# The host Docker socket is mounted at container start time and is typically
# owned by root with a specific GID (e.g. 800 on GitHub Codespaces). This
# script ensures the current user can access that socket without starting
# a Docker daemon or using Docker-in-Docker.
#
# It handles both root and non-root execution:
#   * Root: creates group, adds user, adjusts socket group/permissions
#   * Non-root: warns about limitations, tries sg for current session
#
# Requirements preserved:
#   * Never runs docker compose down -v or any destructive reset
#   * Never starts a Docker daemon inside the container
#   * Never changes socket ownership unless safe and necessary
#   * Idempotent: safe to run on every Codespaces resume

set -uo pipefail

DOCKER_SOCKET="${DOCKER_SOCKET:-/var/run/docker.sock}"

log() {
  printf '[setup-docker-socket] %s\n' "$*"
}

warn() {
  printf '[setup-docker-socket] WARNING: %s\n' "$*" >&2
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
  log "Docker socket not found at $DOCKER_SOCKET. Skipping socket group setup."
  exit 0
fi

log "Found Docker socket at $DOCKER_SOCKET."

# Detect the socket's actual GID (e.g. 800 on GitHub Codespaces).
SOCKET_GID=$(stat -c '%g' "$DOCKER_SOCKET" 2>/dev/null || true)
if [[ -z "$SOCKET_GID" ]]; then
  warn "Could not determine GID of $DOCKER_SOCKET."
  exit 0
fi

log "Docker socket GID: $SOCKET_GID."

# Check if the GID already maps to an existing group (e.g. 'docker' on Codespaces).
EXISTING_GROUP=$(getent group "$SOCKET_GID" 2>/dev/null | cut -d: -f1 || true)

if [[ -n "$EXISTING_GROUP" ]]; then
  TARGET_GROUP="$EXISTING_GROUP"
  log "GID $SOCKET_GID maps to existing group: $TARGET_GROUP"
else
  TARGET_GROUP="dockersock_${SOCKET_GID}"
  log "No existing group for GID $SOCKET_GID. Target group: $TARGET_GROUP"
fi

# Determine if we're running as root.
IS_ROOT=false
if [[ "$(id -u 2>/dev/null || true)" == "0" ]]; then
  IS_ROOT=true
fi

if [[ "$IS_ROOT" == "true" ]]; then
  # Create group only if no existing group maps to the socket GID.
  if [[ -z "$EXISTING_GROUP" ]]; then
    if command -v groupadd >/dev/null 2>&1; then
      log "Creating group $TARGET_GROUP with GID $SOCKET_GID..."
      groupadd -g "$SOCKET_GID" "$TARGET_GROUP" 2>/dev/null || \
        warn "groupadd failed. Group may already exist."
    else
      warn "groupadd not available. Cannot create group $TARGET_GROUP."
    fi
  fi

  # Add the current user to the target group.
  CURRENT_USER="${USER:-$(id -un 2>/dev/null || echo vscode)}"
  if command -v usermod >/dev/null 2>&1; then
    log "Adding user $CURRENT_USER to group $TARGET_GROUP..."
    usermod -aG "$TARGET_GROUP" "$CURRENT_USER" 2>/dev/null || \
      warn "usermod failed. User may already be a member."
  else
    warn "usermod not available. Cannot add user to group."
  fi

  # Try to set socket group to target group (only if different and safe).
  SOCKET_GROUP=$(stat -c '%G' "$DOCKER_SOCKET" 2>/dev/null || true)
  if [[ -n "$SOCKET_GROUP" && "$SOCKET_GROUP" != "$TARGET_GROUP" ]]; then
    log "Setting socket group to $TARGET_GROUP..."
    chgrp "$TARGET_GROUP" "$DOCKER_SOCKET" 2>/dev/null || \
      warn "Could not chgrp socket (may be read-only mount or needs root)."
  fi

  # Ensure group read/write on the socket (only if we own it or have permission).
  chmod g+rw "$DOCKER_SOCKET" 2>/dev/null || \
    warn "Could not chmod socket (may be read-only mount or needs root)."
else
  warn "Not running as root. Cannot create groups or modify users."
  warn "Docker access may require container restart or manual group setup."
fi

# Try to make Docker accessible in the current session using sg.
CURRENT_USER="${USER:-$(id -un 2>/dev/null || echo vscode)}"
if groups "$CURRENT_USER" 2>/dev/null | tr ' ' '\n' | grep -qx "$TARGET_GROUP"; then
  log "User $CURRENT_USER is a member of $TARGET_GROUP."
  if command -v sg >/dev/null 2>&1; then
    log "Testing Docker access via sg in current session..."
    if sg "$TARGET_GROUP" -c "docker info >/dev/null 2>&1" 2>/dev/null; then
      log "Docker is accessible via sg in the current session."
    else
      warn "Docker not yet accessible via sg. Group changes may need a new shell."
    fi
  else
    warn "sg not available. Group changes require a new shell to take effect."
  fi
else
  warn "User $CURRENT_USER is not yet a member of $TARGET_GROUP."
  warn "Group membership changes require a new shell or container restart."
fi

log "Docker socket access setup complete."
