/**
 * AgencyOS Projects API - Templates
 *
 * GET    /api/v1/projects/templates - List project templates
 * POST   /api/v1/projects/templates - Create a project template
 */

import { NextResponse } from 'next/server';

import {
  listProjectTemplates,
  createProjectTemplate,
} from '@/lib/services/projects/project-template-service';

function errorResponse(message: string, status: number, issues?: unknown[]) {
  const body: Record<string, unknown> = { error: message };
  if (issues) body.issues = issues;
  return NextResponse.json(body, { status });
}

export async function GET() {
  try {
    const data = await listProjectTemplates();
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
    const template = await createProjectTemplate(body);
    return NextResponse.json(template, { status: 201 });
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}
