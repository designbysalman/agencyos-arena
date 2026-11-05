/**
 * AgencyOS CRM Opportunities API - List and Create
 *
 * GET    /api/v1/crm/opportunities - List opportunities (paginated, org-scoped)
 * POST   /api/v1/crm/opportunities - Create opportunity
 *
 * Organization ID is resolved from the authenticated user's session,
 * never accepted from the client.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { listOpportunities, createOpportunity } from '@/lib/services/crm/opportunity-service';
import {
  opportunityCreateSchema,
  opportunityQuerySchema,
  type OpportunityQueryInput,
  type OpportunityCreateInput,
} from '@/lib/schemas/crm/opportunity.schema';

type ParseSuccess<T> = { success: true; data: T };
type ParseFailure = { success: false; error: { issues: z.ZodIssue[] } };
type ParseResult<T> = ParseSuccess<T> | ParseFailure;

/** Parse query string with Zod, return 400 on failure */
function parseQuery(searchParams: URLSearchParams): ParseResult<OpportunityQueryInput> {
  try {
    return {
      success: true,
      data: opportunityQuerySchema.parse(Object.fromEntries(searchParams)),
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

/** GET /api/v1/crm/opportunities - List opportunities */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = parseQuery(searchParams);

    if (!parsed.success) {
      return errorResponse('Invalid query parameters', 400, parsed.error.issues);
    }

    const result = await listOpportunities(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}

/** POST /api/v1/crm/opportunities - Create opportunity */
export async function POST(request: Request) {
  try {
    const parsed = await parseBody<OpportunityCreateInput>(request, opportunityCreateSchema);

    if (!parsed.success) {
      return errorResponse('Invalid request body', 400, parsed.error.issues);
    }

    const opportunity = await createOpportunity(parsed.data);
    return NextResponse.json(opportunity, { status: 201 });
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}
