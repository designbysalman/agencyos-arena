/**
 * AgencyOS Admin Feature Flags API
 *
 * GET    /api/v1/admin/feature-flags - List feature flags
 * PUT    /api/v1/admin/feature-flags/[id] - Update feature flag
 */

import { NextResponse } from 'next/server';

import { listFeatureFlags, updateFeatureFlag } from '@/lib/services/admin/feature-flag-service';

function errorResponse(message: string, status: number, issues?: unknown[]) {
  const body: Record<string, unknown> = { error: message };
  if (issues) body.issues = issues;
  return NextResponse.json(body, { status });
}

export async function GET() {
  try {
    const data = await listFeatureFlags();
    return NextResponse.json(data);
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    if (!id || typeof id !== 'string') {
      return errorResponse('feature flag id is required', 400);
    }
    const flag = await updateFeatureFlag(id, updateData);
    return NextResponse.json(flag);
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}
