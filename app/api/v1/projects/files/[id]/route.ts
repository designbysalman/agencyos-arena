/**
 * AgencyOS Projects API - Single Project File
 *
 * DELETE /api/v1/projects/files/[id] - Delete a project file record
 */

import { NextResponse } from 'next/server';

import { deleteProjectFile } from '@/lib/services/projects/project-file-service';

function errorResponse(message: string, status: number, issues?: unknown[]) {
  const body: Record<string, unknown> = { error: message };
  if (issues) body.issues = issues;
  return NextResponse.json(body, { status });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await deleteProjectFile(id);
    return NextResponse.json(result);
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}
