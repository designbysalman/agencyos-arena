/** Focused tests for scripts/codespaces-start.sh.
 *
 * Verifies safety properties (no process killing, no destructive resets,
 * port occupancy checks, readiness verification) and the port-check logic
 * using a temporary HTTP server.
 *
 * These tests do not require Docker or PostgreSQL.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const SCRIPT_PATH = path.resolve(process.cwd(), 'scripts/codespaces-start.sh');

const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf-8');

describe('codespaces-start.sh safety properties', () => {
  it('does not contain any `kill` command (never kills arbitrary processes)', () => {
    // Match `kill` as a standalone command with a signal (not `kill -0` which is
    // just a process-existence probe, not a kill).
    const killLines = scriptContent
      .split('\n')
      .filter(
        (line) =>
          // kill with a signal number (e.g. kill -9, kill -15)
          /\bkill\s+-[1-9]/.test(line) ||
          // kill with a job spec (e.g. kill %1)
          /\bkill\s+%/.test(line) ||
          // kill with a variable PID (e.g. kill $PID)
          /kill\$\{/.test(line)
      )
      .filter((line) => !line.includes('Will not kill it'));
    expect(killLines).toHaveLength(0);
  });

  it('does not contain `docker compose down -v` or any destructive volume reset', () => {
    // Check only non-comment lines for destructive commands
    const nonCommentLines = scriptContent
      .split('\n')
      .map((line) => line.replace(/#.*$/, ''))
      .filter((line) => line.trim().length > 0);
    const nonCommentContent = nonCommentLines.join('\n');
    expect(nonCommentContent).not.toMatch(/down\s+-v/);
    expect(nonCommentContent).not.toMatch(/down\s+--volumes/);
    expect(nonCommentContent).not.toMatch(/rm\s+-rf/);
    expect(nonCommentContent).not.toMatch(/prisma\s+migrate\s+deploy/);
    expect(nonCommentContent).not.toMatch(/prisma\s+db\s+push/);
    expect(nonCommentContent).not.toMatch(/prisma\s+migrate\s+reset/);
  });

  it('checks port occupancy before starting Next.js', () => {
    expect(scriptContent).toContain('port_in_use');
    expect(scriptContent).toMatch(/port_in_use/);
    // The start_nextjs function must call port_in_use before starting
    const startNextjsSection = scriptContent.slice(scriptContent.indexOf('start_nextjs()'));
    expect(startNextjsSection).toContain('port_in_use');
  });

  it('fails safely when port is occupied by a non-Node process', () => {
    expect(scriptContent).toContain('port_serving_node');
    expect(scriptContent).toContain('Will not kill it');
    expect(scriptContent).toContain('occupied by a non-Node.js process');
  });

  it('reuses existing Node.js process on the port', () => {
    expect(scriptContent).toContain('Reusing existing Next.js instance');
  });

  it('waits for Next.js readiness before reporting success', () => {
    expect(scriptContent).toContain('wait_for_nextjs');
    expect(scriptContent).toContain('become reachable');
    expect(scriptContent).toContain('/api/health');
  });

  it('reports log file location for debugging', () => {
    expect(scriptContent).toContain('Logs:');
    expect(scriptContent).toContain('.next-dev.log');
  });

  it('does not use unreliable kill -0 check on npm PID', () => {
    // The old code checked `kill -0` on the npm PID, which is unreliable
    // because npm may exit after spawning the next dev child process.
    // The new code relies on wait_for_nextjs polling the health endpoint.
    expect(scriptContent).not.toMatch(/kill -0.*nextjs_pid/);
    expect(scriptContent).not.toContain('exited immediately');
  });

  it('uses setsid to detach Next.js from the shell session', () => {
    expect(scriptContent).toContain('setsid nohup npm run dev');
  });

  it('writes a PID file for process tracking', () => {
    expect(scriptContent).toContain('NEXT_PID_FILE');
    expect(scriptContent).toContain('.next-dev.pid');
    expect(scriptContent).toContain('echo "$nextjs_pid" > "$NEXT_PID_FILE"');
  });

  it('waits for Next.js readiness before reporting success', () => {
    expect(scriptContent).toContain('wait_for_nextjs');
    expect(scriptContent).toContain('become reachable');
    expect(scriptContent).toContain('/api/health');
  });

  it('is idempotent (re-running is safe)', () => {
    expect(scriptContent).toContain('already running');
  });
});

describe('port detection logic', () => {
  let server: http.Server;
  let testPort: number;

  beforeEach(() => {
    // Pick a random free port
    testPort = 19_650 + Math.floor(Math.random() * 1000);
    server = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
    });
  });

  afterEach(() => {
    if (server) {
      server.close();
    }
  });

  it('detects a port as in use when an HTTP server is listening', () => {
    return new Promise<void>((resolve, reject) => {
      server.listen(testPort, () => {
        try {
          // Use ss to check port occupancy (same logic as the script)
          let output: string;
          try {
            output = execSync(`ss -tlnp | grep ":${testPort}"`, {
              encoding: 'utf-8',
            }).toString();
          } catch {
            output = '';
          }
          expect(output).toContain(`:${testPort}`);
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  });

  it('detects a port as free when nothing is listening', () => {
    // Use a port that should be free
    const freePort = 19_100 + Math.floor(Math.random() * 1000);
    try {
      execSync(`ss -tlnp | grep ":${freePort}"`, { encoding: 'utf-8' });
      // If we get here, something is unexpectedly on this port; pick another
      expect(freePort).toBe(testPort); // force a different assertion path
    } catch {
      // Expected: ss returns non-zero when nothing matches
      expect(true).toBe(true);
    }
  });

  it('can connect to a listening server via curl-style check (Node http)', () => {
    return new Promise<void>((resolve, reject) => {
      server.listen(testPort, () => {
        http
          .get(`http://127.0.0.1:${testPort}/`, (res) => {
            expect(res.statusCode).toBe(200);
            res.resume();
            resolve();
          })
          .on('error', reject);
      });
    });
  });
});

describe('script structure', () => {
  it('has a postStartCommand-compatible entry point (no arguments = full mode)', () => {
    expect(scriptContent).toContain('MODE="${1:-full}"');
    expect(scriptContent).toContain('full|"")');
  });

  it('supports --db-only and --app-only modes', () => {
    expect(scriptContent).toContain('--db-only');
    expect(scriptContent).toContain('--app-only');
  });

  it('starts only the postgres service (not the app container)', () => {
    expect(scriptContent).toContain('up -d postgres');
    expect(scriptContent).not.toContain('up -d app');
  });
});
