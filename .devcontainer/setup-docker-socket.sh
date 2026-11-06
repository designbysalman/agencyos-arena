#!/usr/bin/env bash
#
# AgencyOS A Agent — Docker socket access setup
#
# Idempotent: safe to run multiple times.
#
# The host Docker socket is mounted at container start time and is typically
# owned by root with a specific GID (e.g. 800 on GitHub Codespaces). This
# script ensures the current user can access that socket by:
#   1. Detecting the socket's actual GID
#   2. Creating a host-matching group with that GID if it doesn't exist
#   3. Adding the current user to that group
#
# It does NOT start a Docker daemon and does NOT use Docker-in-Docker.
# It only configures client-side access to the already-mounted socket.
#
# Requirements preserved:
#   * Never runs docker compose down -v or any destructive reset
#   * Never starts a Docker daemon inside the container
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

# If the socket doesn't exist yet, there's nothing to configure.
# Docker commands will fail later with a clear message if needed.
if [[ ! -S "$DOCKER_SOCKET" ]]; then
  log "Docker socket not found at $DOCKER_SOCKET. Skipping socket group setup."
  exit 0
fi

log "Found Docker socket at $DOCKER_SOCKET."

# Detect the socket's actual GID (e.g. 800 on GitHub Codespaces).
SOCKET_GID=$(stat -c '%g' "$DOCKER_SOCKET" 2>/dev/null || true)
if [[ -z "$SOCKET_GID" ]]; then
  error "Could not determine GID of $DOCKER_SOCKET."
fi

log "Docker socket GID: $SOCKET_GID."

# Get the current user and their primary group.
CURRENT_USER="${USER:-$(id -un 2>/dev/null || echo vscode)}"
CURRENT_UID=$(id -u "$CURRENT_USER" 2>/dev/null || true)

log "Current user: $CURRENT_USER (UID: $CURRENT_UID)."

# Check if the user can already access the socket.
if docker info >/dev/null 2>&1; then
  log "User $CURRENT_USER can already access the Docker socket. No changes needed."
  exit 0
fi

# Create a group matching the socket's GID if it doesn't already exist.
GROUP_NAME="dockersock_${SOCKET_GID}"
if getent group "$GROUP_NAME" >/dev/null 2>&1; then
  log "Group $GROUP_NAME (GID $SOCKET_GID) already exists."
elif command -v groupadd >/dev/null 2>&1; then
  log "Creating group $GROUP_NAME with GID $SOCKET_GID..."
  groupadd -g "$SOCKET_GID" "$GROUP_NAME"
else
  warn "groupadd not available. Cannot create group $GROUP_NAME."
fi

# Add the current user to the group if not already a member.
if id -nG "$CURRENT_USER" 2>/dev/null | tr ' ' '\n' | grep -qx "$GROUP_NAME"; then
  log "User $CURRENT_USER is already a member of $GROUP_NAME."
elif command -v usermod >/dev/null 2>&1; then
  log "Adding user $CURRENT_USER to group $GROUP_NAME..."
  usermod -aG "$GROUP_NAME" "$CURRENT_USER"
else
  warn "usermod not available. Cannot add user $CURRENT_USER to $GROUP_NAME."
fi

# Change the socket's group to match so the user can access it via group membership.
# The socket is owned by root:root or root:<some-gid>; we set the group to our
# created group so group members can connect.
SOCKET_GROUP=$(stat -c '%G' "$DOCKER_SOCKET" 2>/dev/null || true)
if [[ "$SOCKET_GROUP" != "$GROUP_NAME" ]]; then
  log "Setting socket group to $GROUP_NAME..."
  chgrp "$GROUP_NAME" "$DOCKER_SOCKET" 2>/dev/null || \
    warn "Could not change socket group (may need root). User may need to re-login."
fi

# Ensure group read/write on the socket.
chmod g+rw "$DOCKER_SOCKET" 2>/dev/null || \
  warn "Could not change socket permissions (may need root)."

log "Docker socket access configured for user $CURRENT_USER."
log "Note: Group membership changes require a new shell or container restart to take effect."
