/**
 * AgencyOS Automation Workflow Executions API
 *
 * GET    /api/v1/automation/workflows/[id]/executions - List executions for a rule
 * POST   /api/v1/automation/workflows/[id]/executions - Create an execution record
 */

import { NextResponse } from 'next/server';

import {
  listWorkflowExecutions,
  createWorkflowExecution,
} from '@/lib/services/automation/workflow-service';

function errorResponse(message: string, status: number, issues?: unknown[]) {
  const body: Record<string, unknown> = { error: message };
  if (issues) body.issues = issues;
  return NextResponse.json(body, { status });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await listWorkflowExecutions(id);
    return NextResponse.json(data);
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const execution = await createWorkflowExecution({ ...body, ruleId: id });
    return NextResponse.json(execution, { status: 201 });
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}
