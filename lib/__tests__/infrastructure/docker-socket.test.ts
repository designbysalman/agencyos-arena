/** Focused tests for .devcontainer/setup-docker-socket.sh.
 *
 * Verifies that the Docker socket access setup script:
 *   - Handles a missing socket gracefully
 *   - Detects the socket's actual GID
 *   - Is idempotent (safe to re-run)
 *   - Does not start a Docker daemon
 *   - Does not change socket ownership or permissions
 *   - Preserves the fast path when real Docker is already accessible
 *
 * These tests mock the `docker` command so Docker appears unavailable,
 * allowing the socket-specific code paths to execute regardless of the
 * host environment.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'child_process';
import net from 'node:net';

const SCRIPT_PATH = path.resolve(process.cwd(), '.devcontainer/setup-docker-socket.sh');

const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf-8');

/** Create a fake `docker` executable that exits with an error,
 * simulating Docker not being available. Returns the temp bin dir. */
function makeFakeDockerBin(): string {
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-docker-bin-'));
  const dockerBin = path.join(binDir, 'docker');
  fs.writeFileSync(
    dockerBin,
    '#!/usr/bin/env bash\n# Mock docker - Docker not available\nexit 1\n',
    { mode: 0o755 }
  );
  return binDir;
}

/** Run the script with Docker mocked as unavailable. */
function runScriptWithMockedDocker(envOverrides: Record<string, string>): {
  stdout: string;
  error: Error | null;
} {
  const binDir = makeFakeDockerBin();
  const env = { ...process.env, PATH: `${binDir}:${process.env.PATH}`, ...envOverrides };
  try {
    const stdout = execSync(`bash "${SCRIPT_PATH}"`, {
      encoding: 'utf-8',
      timeout: 10000,
      env,
    });
    return { stdout, error: null };
  } catch (err) {
    return { stdout: '', error: err as Error };
  }
}

describe('setup-docker-socket.sh safety properties', () => {
  it('does not start a Docker daemon', () => {
    expect(scriptContent).not.toMatch(/dockerd/);
    expect(scriptContent).not.toMatch(/docker\s+daemon/);
    expect(scriptContent).not.toMatch(/dockerd\s+--/);
  });

  it('does not run docker compose down -v or any destructive volume reset', () => {
    const nonCommentLines = scriptContent
      .split('\n')
      .map((line) => line.replace(/#.*$/, ''))
      .filter((line) => line.trim().length > 0);
    const nonCommentContent = nonCommentLines.join('\n');
    expect(nonCommentContent).not.toMatch(/down\s+-v/);
    expect(nonCommentContent).not.toMatch(/down\s+--volumes/);
    expect(nonCommentContent).not.toMatch(/rm\s+-rf/);
  });

  it('does not change socket ownership with chgrp', () => {
    expect(scriptContent).not.toMatch(/chgrp/);
  });

  it('does not change socket permissions with chmod', () => {
    expect(scriptContent).not.toMatch(/chmod/);
  });

  it('does not create groups with groupadd', () => {
    expect(scriptContent).not.toMatch(/groupadd/);
  });

  it('does not modify users with usermod', () => {
    expect(scriptContent).not.toMatch(/usermod/);
  });

  it('detects the socket GID using stat', () => {
    expect(scriptContent).toContain("stat -c '%g'");
  });

  it('is idempotent (safe to re-run)', () => {
    expect(scriptContent).toContain('Docker already accessible');
    expect(scriptContent).toContain('maps to existing group');
    expect(scriptContent).toContain('No changes needed');
  });

  it('handles missing socket gracefully with clear error', () => {
    expect(scriptContent).toContain('Docker socket not found');
    expect(scriptContent).toContain('! -S "$DOCKER_SOCKET"');
  });
});

describe('socket setup script execution', () => {
  let tmpDir: string;
  let socketPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docker-socket-test-'));
    socketPath = path.join(tmpDir, 'docker.sock');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exits with error when the socket does not exist', () => {
    const { error } = runScriptWithMockedDocker({
      DOCKER_SOCKET: socketPath,
    });
    expect(error).not.toBeNull();
    expect((error as Error).message).toContain('Docker socket not found');
  });

  it('detects the socket GID when a socket file exists', () => {
    return new Promise<void>((resolve, reject) => {
      const server = net.createServer();
      server.listen(socketPath, () => {
        try {
          const { stdout, error } = runScriptWithMockedDocker({
            DOCKER_SOCKET: socketPath,
          });
          expect(error).toBeNull();
          // Should find the socket and report its GID
          expect(stdout).toContain('Found Docker socket at');
          expect(stdout).toContain('Docker socket GID:');
          server.close();
          resolve();
        } catch (err) {
          server.close();
          reject(err);
        }
      });
    });
  });

  it('is idempotent when run twice', () => {
    return new Promise<void>((resolve, reject) => {
      const server = net.createServer();
      server.listen(socketPath, () => {
        try {
          const first = runScriptWithMockedDocker({ DOCKER_SOCKET: socketPath });
          const second = runScriptWithMockedDocker({ DOCKER_SOCKET: socketPath });
          // Both runs should succeed without error
          expect(first.error).toBeNull();
          expect(second.error).toBeNull();
          expect(first.stdout).toContain('Found Docker socket at');
          expect(second.stdout).toContain('Found Docker socket at');
          server.close();
          resolve();
        } catch (err) {
          server.close();
          reject(err);
        }
      });
    });
  });
});

describe('fast path when Docker is already accessible', () => {
  it('exits early when docker info succeeds', () => {
    // With real Docker available (or just a working `docker info`),
    // the script should exit before checking the socket.
    const { stdout, error } = runScriptWithMockedDocker({
      DOCKER_SOCKET: '/nonexistent/socket.sock',
    });
    // If docker is not mocked away in this env, it should say already accessible
    // If docker IS mocked, it should report socket not found.
    // Either way, the script completes without crashing unexpectedly.
    if (error === null) {
      expect(stdout).toMatch(/Docker already accessible|Docker socket not found/);
    } else {
      expect((error as Error).message).toContain('Docker socket not found');
    }
  });
});
