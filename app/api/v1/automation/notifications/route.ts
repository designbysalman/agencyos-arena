/**
 * AgencyOS Automation Notifications API
 *
 * GET    /api/v1/automation/notifications?userId= - List notifications
 * POST   /api/v1/automation/notifications - Create a notification
 */

import { NextResponse } from 'next/server';

import {
  listNotifications,
  createNotification,
} from '@/lib/services/automation/notification-service';

function errorResponse(message: string, status: number, issues?: unknown[]) {
  const body: Record<string, unknown> = { error: message };
  if (issues) body.issues = issues;
  return NextResponse.json(body, { status });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || undefined;
    const data = await listNotifications(userId);
    return NextResponse.json(data);
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const notification = await createNotification(body);
    return NextResponse.json(notification, { status: 201 });
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}
