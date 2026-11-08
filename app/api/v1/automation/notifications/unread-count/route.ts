/**
 * AgencyOS Automation Unread Count API
 *
 * GET /api/v1/automation/notifications/unread-count?userId= - Get unread count
 */

import { NextResponse } from 'next/server';

import { getUnreadCount } from '@/lib/services/automation/notification-service';

function errorResponse(message: string, status: number, issues?: unknown[]) {
  const body: Record<string, unknown> = { error: message };
  if (issues) body.issues = issues;
  return NextResponse.json(body, { status });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return errorResponse('userId is required', 400);
    }

    const result = await getUnreadCount(userId);
    return NextResponse.json(result);
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}
