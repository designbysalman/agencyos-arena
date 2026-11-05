/**
 * AgencyOS CRM Lead Detail API
 * GET    /api/v1/crm/leads/:id - Get a lead
 * PUT    /api/v1/crm/leads/:id - Update a lead
 * DELETE /api/v1/crm/leads/:id - Soft delete a lead
 *
 * Security:
 * - Requires a valid Better Auth session (401 if unauthenticated)
 * - Organization ID resolved from session, never trusted from client
 * - RBAC via lead.* permission codes
 * - Non-disclosing 404 for cross-organization / missing resources
 * - Audit logging with PII redaction
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { auth } from '@/lib/auth-server';
import { deleteLead, getLead, updateLead } from '@/lib/services/crm/lead-service';
import { leadUpdateSchema } from '@/lib/schemas/crm/lead.schema';

/** GET /api/v1/crm/leads/:id */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const result = await auth.api.getSession({
      headers: { cookie: cookieStore.toString() },
    });

    if (!result?.session || !result.user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const { id } = await params;
    const lead = await getLead(id);
    return NextResponse.json(lead);
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 401) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }
    if (error.statusCode === 403) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (error.statusCode === 404) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/** PATCH /api/v1/crm/leads/:id */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const result = await auth.api.getSession({
      headers: { cookie: cookieStore.toString() },
    });

    if (!result?.session || !result.user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = leadUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const overrideDuplicate = searchParams.get('overrideDuplicate') === 'true';
    const { id } = await params;

    try {
      const lead = await updateLead(id, parsed.data, overrideDuplicate);
      return NextResponse.json(lead);
    } catch (err) {
      const error = err as Error & {
        statusCode?: number;
        duplicateId?: string;
      };
      if (error.statusCode === 409) {
        return NextResponse.json(
          {
            error: 'Duplicate lead detected',
            duplicateId: error.duplicateId,
            message:
              'A lead with the same contact/account/source/status already exists in this organization.',
          },
          { status: 409 }
        );
      }
      throw error;
    }
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 401) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }
    if (error.statusCode === 403) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (error.statusCode === 404) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/** DELETE /api/v1/crm/leads/:id */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const result = await auth.api.getSession({
      headers: { cookie: cookieStore.toString() },
    });

    if (!result?.session || !result.user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const { id } = await params;
    const result_ = await deleteLead(id);
    return NextResponse.json(result_);
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 401) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }
    if (error.statusCode === 403) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (error.statusCode === 404) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
