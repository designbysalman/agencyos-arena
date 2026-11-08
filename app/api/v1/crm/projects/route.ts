/**
 * AgencyOS CRM Projects API
 *
 * GET    /api/v1/crm/projects          - List projects (org-scoped, paginated)
 * POST   /api/v1/crm/projects          - Create a project
 * POST   /api/v1/crm/projects/[id]/tasks - Add a task to a project
 *
 * Organization ID is resolved from the authenticated user's session,
 * never accepted from the client. Cross-org lookups return non-disclosing 404.
 */

import { NextResponse } from 'next/server';

import { listProjects, createProject } from '@/lib/services/crm/project-service';
import { projectCreateSchema, projectQuerySchema } from '@/lib/schemas/crm/project.schema';

const ALLOWED_SORT_FIELDS = ['name', 'status', 'budget', 'createdAt', 'updatedAt', 'endDate'];

function errorResponse(message: string, status: number, issues?: unknown[]) {
  const body: Record<string, unknown> = { error: message };
  if (issues) body.issues = issues;
  return NextResponse.json(body, { status });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());

    const parsed = projectQuerySchema.safeParse(query);
    if (!parsed.success) {
      return errorResponse('Invalid query parameters', 400, parsed.error.issues);
    }

    if (parsed.data.sortBy && !ALLOWED_SORT_FIELDS.includes(parsed.data.sortBy)) {
      return errorResponse('Invalid sort field', 400);
    }

    const data = await listProjects(parsed.data);
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
    const parsed = projectCreateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Invalid request body', 400, parsed.error.issues);
    }

    const project = await createProject(parsed.data);
    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}
