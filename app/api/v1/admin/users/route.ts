/**
 * AgencyOS Admin User API
 *
 * GET    /api/v1/admin/users - List users
 * PUT    /api/v1/admin/users/[id] - Update user
 */

import { NextResponse } from 'next/server';

import { listUsers, updateUser } from '@/lib/services/admin/user-service';

function errorResponse(message: string, status: number, issues?: unknown[]) {
  const body: Record<string, unknown> = { error: message };
  if (issues) body.issues = issues;
  return NextResponse.json(body, { status });
}

export async function GET() {
  try {
    const data = await listUsers();
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
      return errorResponse('user id is required', 400);
    }
    const user = await updateUser(id, updateData);
    return NextResponse.json(user);
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}
