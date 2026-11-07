/**
 * AgencyOS Settings API - Organization
 *
 * GET    /api/v1/settings/organization - Get organization settings
 * PUT    /api/v1/settings/organization - Update organization settings (Admin only)
 *
 * Organization ID is resolved from the authenticated user's session,
 * never accepted from the client.
 */

import { NextResponse } from 'next/server';

import {
  getOrganizationSettings,
  updateOrganizationSettings,
} from '@/lib/services/settings/organization-service';

function errorResponse(message: string, status: number, issues?: unknown[]) {
  const body: Record<string, unknown> = { error: message };
  if (issues) body.issues = issues;
  return NextResponse.json(body, { status });
}

/** GET /api/v1/settings/organization - Get organization settings */
export async function GET() {
  try {
    const data = await getOrganizationSettings();
    return NextResponse.json(data);
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}

/** PUT /api/v1/settings/organization - Update organization settings */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { name, settings } = body;

    if (name !== undefined && typeof name !== 'string') {
      return errorResponse('Invalid name', 400);
    }
    if (settings !== undefined && typeof settings !== 'object') {
      return errorResponse('Invalid settings', 400);
    }

    const data = await updateOrganizationSettings({ name, settings });
    return NextResponse.json(data);
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}
