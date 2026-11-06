/** Focused tests for .devcontainer/setup-docker-socket.sh.
 *
 * Verifies that the Docker socket access setup script:
 *   - Handles a missing socket gracefully
 *   - Detects the socket's actual GID
 *   - Is idempotent (safe to re-run)
 *   - Does not start a Docker daemon
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

  it('detects the socket GID using stat', () => {
    expect(scriptContent).toContain("stat -c '%g'");
  });

  it('creates a group matching the socket GID', () => {
    expect(scriptContent).toContain('groupadd -g');
  });

  it('adds the current user to the socket group', () => {
    expect(scriptContent).toContain('usermod -aG');
  });

  it('is idempotent (safe to re-run)', () => {
    expect(scriptContent).toContain('already accessible');
    expect(scriptContent).toContain('maps to existing group');
    expect(scriptContent).toContain('No changes needed');
  });

  it('handles missing socket gracefully', () => {
    expect(scriptContent).toContain('Skipping socket group setup');
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

  it('exits cleanly when the socket does not exist', () => {
    const result = execSync(`DOCKER_SOCKET="${socketPath}" bash "${SCRIPT_PATH}"`, {
      encoding: 'utf-8',
      timeout: 10000,
    });
    expect(result).toContain('Skipping socket group setup');
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
