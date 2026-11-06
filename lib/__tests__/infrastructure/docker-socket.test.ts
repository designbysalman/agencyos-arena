/** Focused tests for .devcontainer/setup-docker-socket.sh.
 *
 * Verifies that the Docker socket access setup script:
 *   - Handles a missing socket gracefully
 *   - Detects the socket's actual GID
 *   - Is idempotent (safe to re-run)
 *   - Does not start a Docker daemon
 *   - Does not change socket ownership or permissions
 *
 * These tests run without Docker and mock the socket file.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'child_process';
import net from 'node:net';

const SCRIPT_PATH = path.resolve(process.cwd(), '.devcontainer/setup-docker-socket.sh');

const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf-8');

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
    let error: Error | null = null;
    try {
      execSync(`DOCKER_SOCKET="${socketPath}" bash "${SCRIPT_PATH}"`, {
        encoding: 'utf-8',
        timeout: 10000,
      });
    } catch (err) {
      error = err as Error;
    }
    expect(error).not.toBeNull();
    expect((error as Error).message).toContain('Docker socket not found');
  });

  it('detects the socket GID when a socket file exists', () => {
    return new Promise<void>((resolve, reject) => {
      const server = net.createServer();
      server.listen(socketPath, () => {
        try {
          const result = execSync(`DOCKER_SOCKET="${socketPath}" bash "${SCRIPT_PATH}"`, {
            encoding: 'utf-8',
            timeout: 10000,
          });
          // Should find the socket and report its GID
          expect(result).toContain('Found Docker socket at');
          expect(result).toContain('Docker socket GID:');
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
          const first = execSync(`DOCKER_SOCKET="${socketPath}" bash "${SCRIPT_PATH}"`, {
            encoding: 'utf-8',
            timeout: 10000,
          });
          const second = execSync(`DOCKER_SOCKET="${socketPath}" bash "${SCRIPT_PATH}"`, {
            encoding: 'utf-8',
            timeout: 10000,
          });
          // Both runs should succeed without error
          expect(first).toContain('Found Docker socket at');
          expect(second).toContain('Found Docker socket at');
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
