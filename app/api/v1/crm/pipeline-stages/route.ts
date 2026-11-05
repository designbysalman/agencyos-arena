/**
 * AgencyOS CRM Pipeline Stages API - List and Create
 *
 * GET    /api/v1/crm/pipeline-stages - List pipeline stages (paginated, org-scoped)
 * POST   /api/v1/crm/pipeline-stages - Create pipeline stage
 *
 * Organization ID is resolved from the authenticated user's session,
 * never accepted from the client. Pipeline ID is provided via query parameter.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { listPipelineStages, createPipelineStage } from '@/lib/services/crm/pipeline-stage-service';
import {
  pipelineStageCreateSchema,
  pipelineStageQuerySchema,
  type PipelineStageQueryInput,
  type PipelineStageCreateInput,
} from '@/lib/schemas/crm/pipeline-stage.schema';

type ParseSuccess<T> = { success: true; data: T };
type ParseFailure = { success: false; error: { issues: z.ZodIssue[] } };
type ParseResult<T> = ParseSuccess<T> | ParseFailure;

/** Parse query string with Zod, return 400 on failure */
function parseQuery(searchParams: URLSearchParams): ParseResult<PipelineStageQueryInput> {
  try {
    return {
      success: true,
      data: pipelineStageQuerySchema.parse(Object.fromEntries(searchParams)),
    };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: { issues: err.issues } };
    }
    return { success: false, error: { issues: [] } };
  }
}

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

/** GET /api/v1/crm/pipeline-stages - List pipeline stages */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pipelineId = searchParams.get('pipelineId');

    if (!pipelineId) {
      return errorResponse('Pipeline ID is required', 400);
    }

    const parsed = parseQuery(searchParams);

    if (!parsed.success) {
      return errorResponse('Invalid query parameters', 400, parsed.error.issues);
    }

    const result = await listPipelineStages(pipelineId, parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}

/** POST /api/v1/crm/pipeline-stages - Create pipeline stage */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pipelineId = searchParams.get('pipelineId');

    if (!pipelineId) {
      return errorResponse('Pipeline ID is required', 400);
    }

    const parsed = await parseBody<PipelineStageCreateInput>(request, pipelineStageCreateSchema);

    if (!parsed.success) {
      return errorResponse('Invalid request body', 400, parsed.error.issues);
    }

    const stage = await createPipelineStage(pipelineId, parsed.data);
    return NextResponse.json(stage, { status: 201 });
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}
