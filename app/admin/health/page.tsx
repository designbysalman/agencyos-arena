/**
 * AgencyOS Health Dashboard page.
 * Displays system health status for database, queue, and storage.
 */

import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

async function checkHealth() {
  const cookieStore = await cookies();
  const result = await auth.api.getSession({
    headers: { cookie: cookieStore.toString() },
  });

  if (!result?.session || !result.user) {
    redirect('/login');
  }

  const res = await fetch('/api/health', {
    headers: { cookie: cookieStore.toString() },
    cache: 'no-store',
  });

  if (!res.ok) {
    return { status: 'error', services: {} };
  }

  return res.json();
}

export default async function HealthPage() {
  const health = await checkHealth();

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">System Health</h1>
        <p className="text-sm text-muted-foreground">
          Monitor database, queue, and storage health.
        </p>
      </div>

      <div className="rounded-md border bg-background p-4">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              health.status === 'healthy'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {health.status === 'healthy' ? '● Healthy' : '● Unhealthy'}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border text-sm text-muted-foreground">
              <th className="pb-3 font-medium">Service</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium text-right">Response Time</th>
            </tr>
          </thead>
          <tbody>
            {(health.services as
              Record<string, { status: string; latency?: number }> | undefined) ? (
              Object.entries(
                health.services as Record<string, { status: string; latency?: number }>
              ).map(([name, info]) => (
                <tr key={name} className="border-b border-border hover:bg-muted/50">
                  <td className="py-4 font-medium">{name}</td>
                  <td className="py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium leading-none ${
                        info.status === 'healthy'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {info.status}
                    </span>
                  </td>
                  <td className="py-4 text-right text-sm text-muted-foreground">
                    {info.latency ? `${info.latency}ms` : '—'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="text-center py-8 text-muted-foreground">
                  No service health data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-md border bg-background p-4">
        <h3 className="text-sm font-semibold mb-2">About Health Monitoring</h3>
        <p className="text-sm text-muted-foreground">
          The health endpoint checks database connectivity, queue status, and storage availability.
          Use this dashboard to verify system components are operational.
        </p>
      </div>
    </div>
  );
}
