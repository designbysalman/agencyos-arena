/**
 * AgencyOS Admin Feature Flag API - Single Flag
 *
 * PUT /api/v1/admin/feature-flags/[id] - Update feature flag
 */

import { NextResponse } from 'next/server';

import { updateFeatureFlag } from '@/lib/services/admin/feature-flag-service';

function errorResponse(message: string, status: number, issues?: unknown[]) {
  const body: Record<string, unknown> = { error: message };
  if (issues) body.issues = issues;
  return NextResponse.json(body, { status });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const flag = await updateFeatureFlag(id, body);
    return NextResponse.json(flag);
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}
