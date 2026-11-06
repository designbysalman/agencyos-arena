/**
 * AgencyOS Quotations API - Get, Update, Delete
 *
 * GET    /api/v1/quotations/[id] - Get a single quotation
 * PUT    /api/v1/quotations/[id] - Update a quotation
 * DELETE /api/v1/quotations/[id] - Soft delete a quotation
 *
 * Organization ID is resolved from the authenticated user's session.
 * Returns non-disclosing 404 for cross-organization resources.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getQuotation,
  updateQuotation,
  deleteQuotation,
} from '@/lib/services/proposals/quotation-service';
import {
  quotationUpdateSchema,
  type QuotationUpdateInput,
} from '@/lib/schemas/proposals/quotation.schema';
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

/** GET /api/v1/quotations/[id] - Get a single quotation */
export const GET = withDbErrorHandling(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const quotation = await getQuotation(id);
    return NextResponse.json(quotation);
  },
  'quotations.get'
);

/** PUT /api/v1/quotations/[id] - Update a quotation */
export const PUT = withDbErrorHandling(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const parsed = await parseBody<QuotationUpdateInput>(request, quotationUpdateSchema);

    if (!parsed.success) {
      return errorResponse('Invalid request body', 400, parsed.error.issues);
    }

    const quotation = await updateQuotation(id, parsed.data);
    return NextResponse.json(quotation);
  },
  'quotations.update'
);

/** DELETE /api/v1/quotations/[id] - Soft delete a quotation */
export const DELETE = withDbErrorHandling(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const result = await deleteQuotation(id);
    return NextResponse.json(result);
  },
  'quotations.delete'
);
