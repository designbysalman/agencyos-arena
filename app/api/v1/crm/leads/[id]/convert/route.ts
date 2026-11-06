/**
 * AgencyOS CRM Lead-to-Opportunity Conversion API
 *
 * POST /api/v1/crm/leads/[id]/convert - Convert a lead into an opportunity
 *
 * Organization ID is resolved from the authenticated user's session,
 * never accepted from the client. Cross-org lookups return non-disclosing 404.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { convertLead } from '@/lib/services/crm/lead-conversion-service';
import { leadConvertSchema, type LeadConvertInput } from '@/lib/schemas/crm/lead-conversion.schema';

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

/** POST /api/v1/crm/leads/[id]/convert - Convert lead to opportunity */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const parsed = await parseBody<LeadConvertInput>(request, leadConvertSchema);

    if (!parsed.success) {
      return errorResponse('Invalid request body', 400, parsed.error.issues);
    }

    const result = await convertLead(id, parsed.data);

    return NextResponse.json(
      {
        alreadyConverted: result.alreadyConverted,
        opportunity: result.opportunity,
        lead: result.lead,
      },
      { status: result.alreadyConverted ? 200 : 201 }
    );
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}
