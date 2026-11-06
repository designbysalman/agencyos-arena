/**
 * AgencyOS Proposals API - Get, Update, Delete
 *
 * GET    /api/v1/proposals/[id] - Get a single proposal
 * PUT    /api/v1/proposals/[id] - Update a proposal
 * DELETE /api/v1/proposals/[id] - Soft delete a proposal
 *
 * Organization ID is resolved from the authenticated user's session.
 * Returns non-disclosing 404 for cross-organization resources.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getProposal,
  updateProposal,
  deleteProposal,
} from '@/lib/services/proposals/proposal-service';
import {
  proposalUpdateSchema,
  type ProposalUpdateInput,
} from '@/lib/schemas/proposals/proposal.schema';
import { withDbErrorHandling } from '@/lib/api-error';

/** Parse JSON body with Zod, return 400 on failure */
async function parseBody<T>(request: Request, schema: z.ZodSchema<T>) {
  try {
    const body = await request.json();
    return { success: true as const, data: schema.parse(body) };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false as const, error: { issues: err.issues } };
    }
    return { success: false as const, error: { issues: [] } };
  }
}

/** Error response helper */
function errorResponse(message: string, status: number, issues?: unknown[]) {
  const body: Record<string, unknown> = { error: message };
  if (issues) body.issues = issues;
  return NextResponse.json(body, { status });
}

/** GET /api/v1/proposals/[id] - Get a single proposal */
export const GET = withDbErrorHandling(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const proposal = await getProposal(id);
    return NextResponse.json(proposal);
  },
  'proposals.get'
);

/** PUT /api/v1/proposals/[id] - Update a proposal */
export const PUT = withDbErrorHandling(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const parsed = await parseBody<ProposalUpdateInput>(request, proposalUpdateSchema);

    if (!parsed.success) {
      return errorResponse('Invalid request body', 400, parsed.error.issues);
    }

    const proposal = await updateProposal(id, parsed.data);
    return NextResponse.json(proposal);
  },
  'proposals.update'
);

/** DELETE /api/v1/proposals/[id] - Soft delete a proposal */
export const DELETE = withDbErrorHandling(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const result = await deleteProposal(id);
    return NextResponse.json(result);
  },
  'proposals.delete'
);
