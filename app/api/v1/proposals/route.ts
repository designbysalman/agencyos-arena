/**
 * AgencyOS Proposals API - List and Create
 *
 * GET    /api/v1/proposals - List proposals (paginated, org-scoped)
 * POST   /api/v1/proposals - Create proposal
 *
 * Organization ID is resolved from the authenticated user's session,
 * never accepted from the client.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { listProposals, createProposal } from '@/lib/services/proposals/proposal-service';
import {
  proposalCreateSchema,
  proposalQuerySchema,
  type ProposalQueryInput,
  type ProposalCreateInput,
} from '@/lib/schemas/proposals/proposal.schema';
import { withDbErrorHandling } from '@/lib/api-error';

type ParseSuccess<T> = { success: true; data: T };
type ParseFailure = { success: false; error: { issues: z.ZodIssue[] } };
type ParseResult<T> = ParseSuccess<T> | ParseFailure;

/** Parse query string with Zod, return 400 on failure */
function parseQuery(searchParams: URLSearchParams): ParseResult<ProposalQueryInput> {
  try {
    return {
      success: true,
      data: proposalQuerySchema.parse(Object.fromEntries(searchParams)),
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

/** GET /api/v1/proposals - List proposals */
export const GET = withDbErrorHandling(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const parsed = parseQuery(searchParams);

  if (!parsed.success) {
    return errorResponse('Invalid query parameters', 400, parsed.error.issues);
  }

  const result = await listProposals(parsed.data);
  return NextResponse.json(result);
}, 'proposals.list');

/** POST /api/v1/proposals - Create proposal */
export const POST = withDbErrorHandling(async (request: Request) => {
  const parsed = await parseBody<ProposalCreateInput>(request, proposalCreateSchema);

  if (!parsed.success) {
    return errorResponse('Invalid request body', 400, parsed.error.issues);
  }

  const proposal = await createProposal(parsed.data);
  return NextResponse.json(proposal, { status: 201 });
}, 'proposals.create');
