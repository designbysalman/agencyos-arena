/**
 * AgencyOS Automation Workflow Rules API
 *
 * GET    /api/v1/automation/workflows - List workflow rules
 * POST   /api/v1/automation/workflows - Create a workflow rule
 */

import { NextResponse } from 'next/server';

import { listWorkflowRules, createWorkflowRule } from '@/lib/services/automation/workflow-service';

function errorResponse(message: string, status: number, issues?: unknown[]) {
  const body: Record<string, unknown> = { error: message };
  if (issues) body.issues = issues;
  return NextResponse.json(body, { status });
}

export async function GET() {
  try {
    const data = await listWorkflowRules();
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
    const rule = await createWorkflowRule(body);
    return NextResponse.json(rule, { status: 201 });
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}
