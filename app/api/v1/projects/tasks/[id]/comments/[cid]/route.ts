/**
 * AgencyOS Projects API - Single Task Comment
 *
 * PUT    /api/v1/projects/tasks/[id]/comments/[cid] - Update comment
 * DELETE /api/v1/projects/tasks/[id]/comments/[cid] - Delete comment
 */

import { NextResponse } from 'next/server';

import { updateTaskComment, deleteTaskComment } from '@/lib/services/projects/task-comment-service';

function errorResponse(message: string, status: number, issues?: unknown[]) {
  const body: Record<string, unknown> = { error: message };
  if (issues) body.issues = issues;
  return NextResponse.json(body, { status });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; cid: string }> }
) {
  try {
    const { cid } = await params;
    const body = await request.json();
    const comment = await updateTaskComment(cid, body);
    return NextResponse.json(comment);
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; cid: string }> }
) {
  try {
    const { cid } = await params;
    const result = await deleteTaskComment(cid);
    return NextResponse.json(result);
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}
