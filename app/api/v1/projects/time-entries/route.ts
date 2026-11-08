/**
 * AgencyOS Projects API - Time Entries
 *
 * GET    /api/v1/projects/time-entries?taskId=&projectId= - List time entries
 * POST   /api/v1/projects/time-entries - Create a time entry
 */

import { NextResponse } from 'next/server';

import { listTimeEntries, createTimeEntry } from '@/lib/services/projects/time-entry-service';

function errorResponse(message: string, status: number, issues?: unknown[]) {
  const body: Record<string, unknown> = { error: message };
  if (issues) body.issues = issues;
  return NextResponse.json(body, { status });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId') || undefined;
    const projectId = searchParams.get('projectId') || undefined;

    const data = await listTimeEntries(taskId, projectId);
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
    const timeEntry = await createTimeEntry(body);
    return NextResponse.json(timeEntry, { status: 201 });
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}
