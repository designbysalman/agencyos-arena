/**
 * AgencyOS Admin Role API
 *
 * GET    /api/v1/admin/roles - List roles
 * PUT    /api/v1/admin/roles/[id] - Update role
 * GET    /api/v1/admin/permissions - List permissions
 */

import { NextResponse } from 'next/server';

import { listRoles, listPermissions, updateRole } from '@/lib/services/admin/role-service';

function errorResponse(message: string, status: number, issues?: unknown[]) {
  const body: Record<string, unknown> = { error: message };
  if (issues) body.issues = issues;
  return NextResponse.json(body, { status });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'permissions') {
      const data = await listPermissions();
      return NextResponse.json(data);
    }

    const data = await listRoles();
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
      return errorResponse('role id is required', 400);
    }
    const role = await updateRole(id, updateData);
    return NextResponse.json(role);
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}
