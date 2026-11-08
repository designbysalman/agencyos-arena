/**
 * AgencyOS Projects API - Single Project Approval
 *
 * PUT    /api/v1/projects/approvals/[id] - Update approval
 */

import { NextResponse } from 'next/server';

import { updateProjectApproval } from '@/lib/services/projects/project-approval-service';

function errorResponse(message: string, status: number, issues?: unknown[]) {
  const body: Record<string, unknown> = { error: message };
  if (issues) body.issues = issues;
  return NextResponse.json(body, { status });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const approval = await updateProjectApproval(id, body);
    return NextResponse.json(approval);
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}
