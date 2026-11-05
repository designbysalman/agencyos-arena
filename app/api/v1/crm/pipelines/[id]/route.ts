/**
 * AgencyOS CRM Pipeline API - Single Pipeline
 *
 * GET    /api/v1/crm/pipelines/[id] - Get pipeline by ID
 * PUT    /api/v1/crm/pipelines/[id] - Update pipeline
 * DELETE /api/v1/crm/pipelines/[id] - Soft delete pipeline
 *
 * Organization ID is resolved from the authenticated user's session,
 * never accepted from the client. Cross-org lookups return non-disclosing 404.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getPipeline, updatePipeline, deletePipeline } from '@/lib/services/crm/pipeline-service';
import { pipelineUpdateSchema, type PipelineUpdateInput } from '@/lib/schemas/crm/pipeline.schema';

type ParseSuccess<T> = { success: true; data: T };
type ParseFailure = { success: false; error: { issues: z.ZodIssue[] } };
type ParseResult<T> = ParseSuccess<T> | ParseFailure;

/** Parse JSON body with Zod, return 400 on failure */
async function parseBody<T>(request: Request, schema: z.ZodSchema<T>): Promise<ParseResult<T>> {
  try {
    const body = await request.json();
    return { success: true, data: schema.parse(body) };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: { issues: err.issues } };
    }
    return { success: false, error: { issues: [] } };
  }
}

/** Error response helper */
function errorResponse(message: string, status: number, issues?: unknown[]) {
  const body: Record<string, unknown> = { error: message };
  if (issues) body.issues = issues;
  return NextResponse.json(body, { status });
}

/** GET /api/v1/crm/pipelines/[id] - Get pipeline by ID */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const pipeline = await getPipeline(id);
    return NextResponse.json(pipeline);
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}

/** PUT /api/v1/crm/pipelines/[id] - Update pipeline */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const parsed = await parseBody<PipelineUpdateInput>(request, pipelineUpdateSchema);

    if (!parsed.success) {
      return errorResponse('Invalid request body', 400, parsed.error.issues);
    }

    const pipeline = await updatePipeline(id, parsed.data);
    return NextResponse.json(pipeline);
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}

/** DELETE /api/v1/crm/pipelines/[id] - Soft delete pipeline */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await deletePipeline(id);
    return NextResponse.json(result);
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}
