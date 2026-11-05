/**
 * AgencyOS CRM Pipeline Stage API - Single Pipeline Stage
 *
 * GET    /api/v1/crm/pipeline-stages/[id] - Get pipeline stage by ID
 * PUT    /api/v1/crm/pipeline-stages/[id] - Update pipeline stage
 * DELETE /api/v1/crm/pipeline-stages/[id] - Soft delete pipeline stage
 *
 * Organization ID is resolved from the authenticated user's session,
 * never accepted from the client. Pipeline ID is provided via query parameter.
 * Cross-org and cross-pipeline lookups return non-disclosing 404.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getPipelineStage,
  updatePipelineStage,
  deletePipelineStage,
} from '@/lib/services/crm/pipeline-stage-service';
import {
  pipelineStageUpdateSchema,
  type PipelineStageUpdateInput,
} from '@/lib/schemas/crm/pipeline-stage.schema';

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

/** GET /api/v1/crm/pipeline-stages/[id] - Get pipeline stage by ID */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const stage = await getPipelineStage(id);
    return NextResponse.json(stage);
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}

/** PUT /api/v1/crm/pipeline-stages/[id] - Update pipeline stage */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const pipelineId = searchParams.get('pipelineId');

    if (!pipelineId) {
      return errorResponse('Pipeline ID is required', 400);
    }

    const parsed = await parseBody<PipelineStageUpdateInput>(request, pipelineStageUpdateSchema);

    if (!parsed.success) {
      return errorResponse('Invalid request body', 400, parsed.error.issues);
    }

    const stage = await updatePipelineStage(id, pipelineId, parsed.data);
    return NextResponse.json(stage);
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}

/** DELETE /api/v1/crm/pipeline-stages/[id] - Soft delete pipeline stage */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const pipelineId = searchParams.get('pipelineId');

    if (!pipelineId) {
      return errorResponse('Pipeline ID is required', 400);
    }

    const result = await deletePipelineStage(id, pipelineId);
    return NextResponse.json(result);
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}
