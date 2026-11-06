/** AgencyOS — Health check endpoint.
 *
 * GET /api/health
 *
 * Returns the health status of the application and its dependencies,
 * primarily PostgreSQL. Used by the Codespaces startup script and
 * monitoring to verify the database is ready before serving traffic.
 *
 * Never exposes connection strings, credentials, or internal hostnames.
 */

import { NextResponse } from 'next/server';

import { checkDbHealth } from '@/lib/db-health';

/** GET /api/health - Health check */
export async function GET() {
  const db = await checkDbHealth();

  const status = db.healthy ? 'ok' : 'degraded';
  const httpStatus = db.healthy ? 200 : 503;

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          healthy: db.healthy,
          ...(db.latencyMs !== undefined ? { latencyMs: db.latencyMs } : {}),
          ...(db.error ? { error: db.error } : {}),
        },
      },
    },
    { status: httpStatus }
  );
}
