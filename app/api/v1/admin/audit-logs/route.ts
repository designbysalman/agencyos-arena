/**
 * AgencyOS Admin Audit Log API
 *
 * GET /api/v1/admin/audit-logs - List audit logs (org-scoped)
 */

import { NextResponse } from 'next/server';

import { listAuditLogs } from '@/lib/services/admin/audit-log-service';

function errorResponse(message: string, status: number, issues?: unknown[]) {
  const body: Record<string, unknown> = { error: message };
  if (issues) body.issues = issues;
  return NextResponse.json(body, { status });
}

export async function GET() {
  try {
    const data = await listAuditLogs();
    return NextResponse.json(data);
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}
