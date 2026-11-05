/**
 * AgencyOS CRM Contacts API - Single Contact
 *
 * GET    /api/v1/crm/contacts/[id] - Get contact by ID
 * PUT    /api/v1/crm/contacts/[id] - Update contact
 * DELETE /api/v1/crm/contacts/[id] - Soft delete contact
 *
 * Organization ID is resolved from the authenticated user's session,
 * never accepted from the client. Cross-org lookups return non-disclosing 404.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getContact, updateContact, deleteContact } from '@/lib/services/crm/contact-service';
import { contactUpdateSchema, type ContactUpdateInput } from '@/lib/schemas/crm/contact.schema';

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

/** GET /api/v1/crm/contacts/[id] - Get contact by ID */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const contact = await getContact(params.id);
    return NextResponse.json(contact);
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}

/** PUT /api/v1/crm/contacts/[id] - Update contact */
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const parsed = await parseBody<ContactUpdateInput>(request, contactUpdateSchema);

    if (!parsed.success) {
      return errorResponse('Invalid request body', 400, parsed.error.issues);
    }

    const contact = await updateContact(params.id, parsed.data);
    return NextResponse.json(contact);
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}

/** DELETE /api/v1/crm/contacts/[id] - Soft delete contact */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const result = await deleteContact(params.id);
    return NextResponse.json(result);
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}
