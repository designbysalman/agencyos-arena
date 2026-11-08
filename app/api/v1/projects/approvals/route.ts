/**
 * AgencyOS Projects API - Project Approvals
 *
 * GET    /api/v1/projects/approvals?projectId= - List approvals for a project
 * POST   /api/v1/projects/approvals - Create a project approval
 */

import { NextResponse } from 'next/server';

import {
  listProjectApprovals,
  createProjectApproval,
} from '@/lib/services/projects/project-approval-service';

function errorResponse(message: string, status: number, issues?: unknown[]) {
  const body: Record<string, unknown> = { error: message };
  if (issues) body.issues = issues;
  return NextResponse.json(body, { status });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return errorResponse('projectId is required', 400);
    }

    const data = await listProjectApprovals(projectId);
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
    const approval = await createProjectApproval(body);
    return NextResponse.json(approval, { status: 201 });
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}
