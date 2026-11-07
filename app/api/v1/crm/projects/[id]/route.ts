/**
 * AgencyOS CRM Projects API - Single Project
 *
 * GET    /api/v1/crm/projects/[id] - Get project by ID
 * PUT    /api/v1/crm/projects/[id] - Update project
 * DELETE /api/v1/crm/projects/[id] - Soft delete project
 * POST   /api/v1/crm/projects/[id]/tasks - Add task to project
 *
 * Organization ID is resolved from the authenticated user's session,
 * never accepted from the client. Cross-org lookups return non-disclosing 404.
 */

import { NextResponse } from 'next/server';

import {
  getProject,
  updateProject,
  deleteProject,
  addProjectTask,
} from '@/lib/services/crm/project-service';
import { projectUpdateSchema, projectTaskSchema } from '@/lib/schemas/crm/project.schema';

function errorResponse(message: string, status: number, issues?: unknown[]) {
  const body: Record<string, unknown> = { error: message };
  if (issues) body.issues = issues;
  return NextResponse.json(body, { status });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const project = await getProject(id);
    return NextResponse.json(project);
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = projectUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Invalid request body', 400, parsed.error.issues);
    }

    const project = await updateProject(id, parsed.data);
    return NextResponse.json(project);
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await deleteProject(id);
    return NextResponse.json(result);
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
    const parsed = projectTaskSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Invalid request body', 400, parsed.error.issues);
    }

    const task = await addProjectTask(id, parsed.data);
    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}
