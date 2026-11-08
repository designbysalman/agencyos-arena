/**
 * AgencyOS Settings API - User Profile
 *
 * GET    /api/v1/settings/user - Get current user profile
 * PUT    /api/v1/settings/user - Update current user profile
 *
 * Organization ID is resolved from the authenticated user's session,
 * never accepted from the client. Users can only update their own profile.
 */

import { NextResponse } from 'next/server';

import { getUserProfile, updateUserProfile } from '@/lib/services/settings/user-service';

function errorResponse(message: string, status: number, issues?: unknown[]) {
  const body: Record<string, unknown> = { error: message };
  if (issues) body.issues = issues;
  return NextResponse.json(body, { status });
}

/** GET /api/v1/settings/user - Get current user profile */
export async function GET() {
  try {
    const data = await getUserProfile();
    return NextResponse.json(data);
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}

/** PUT /api/v1/settings/user - Update current user profile */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { displayName, avatarUrl } = body;

    if (displayName !== undefined && typeof displayName !== 'string') {
      return errorResponse('Invalid display name', 400);
    }
    if (avatarUrl !== undefined && typeof avatarUrl !== 'string') {
      return errorResponse('Invalid avatar URL', 400);
    }

    const data = await updateUserProfile({ displayName, avatarUrl });
    return NextResponse.json(data);
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}
