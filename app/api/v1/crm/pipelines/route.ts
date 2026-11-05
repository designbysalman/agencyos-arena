/**
 * AgencyOS CRM Pipelines API - List and Create
 *
 * GET    /api/v1/crm/pipelines - List pipelines (paginated, org-scoped)
 * POST   /api/v1/crm/pipelines - Create pipeline
 *
 * Organization ID is resolved from the authenticated user's session,
 * never accepted from the client.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { listPipelines, createPipeline } from '@/lib/services/crm/pipeline-service';
import {
  pipelineCreateSchema,
  pipelineQuerySchema,
  type PipelineQueryInput,
  type PipelineCreateInput,
} from '@/lib/schemas/crm/pipeline.schema';

type ParseSuccess<T> = { success: true; data: T };
type ParseFailure = { success: false; error: { issues: z.ZodIssue[] } };
type ParseResult<T> = ParseSuccess<T> | ParseFailure;

/** Parse query string with Zod, return 400 on failure */
function parseQuery(searchParams: URLSearchParams): ParseResult<PipelineQueryInput> {
  try {
    return {
      success: true,
      data: pipelineQuerySchema.parse(Object.fromEntries(searchParams)),
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

/** GET /api/v1/crm/pipelines - List pipelines */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = parseQuery(searchParams);

    if (!parsed.success) {
      return errorResponse('Invalid query parameters', 400, parsed.error.issues);
    }

    const result = await listPipelines(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}

/** POST /api/v1/crm/pipelines - Create pipeline */
export async function POST(request: Request) {
  try {
    const parsed = await parseBody<PipelineCreateInput>(request, pipelineCreateSchema);

    if (!parsed.success) {
      return errorResponse('Invalid request body', 400, parsed.error.issues);
    }

    const pipeline = await createPipeline(parsed.data);
    return NextResponse.json(pipeline, { status: 201 });
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}
