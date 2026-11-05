/**
 * AgencyOS CRM Leads API
 * GET    /api/v1/crm/leads          - List leads (org-scoped, paginated)
 * POST   /api/v1/crm/leads          - Create a lead
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
import { createLead, listLeads } from '@/lib/services/crm/lead-service';
import { leadCreateSchema, leadQuerySchema } from '@/lib/schemas/crm/lead.schema';

/** Whitelisted sortable fields (defense against arbitrary column sorting) */
const ALLOWED_SORT_FIELDS = ['source', 'status', 'priority', 'createdAt', 'updatedAt'];

/** GET /api/v1/crm/leads */
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const result = await auth.api.getSession({
      headers: { cookie: cookieStore.toString() },
    });

    if (!result?.session || !result.user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());

    const parsed = leadQuerySchema.safeParse(query);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    // Whitelist sort field to prevent arbitrary column ordering
    if (parsed.data.sortBy && !ALLOWED_SORT_FIELDS.includes(parsed.data.sortBy)) {
      return NextResponse.json({ error: 'Invalid sort field' }, { status: 400 });
    }

    const data = await listLeads(parsed.data);
    return NextResponse.json(data);
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 401) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/** POST /api/v1/crm/leads */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const result = await auth.api.getSession({
      headers: { cookie: cookieStore.toString() },
    });

    if (!result?.session || !result.user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = leadCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    // Check for duplicates first; honor explicit override flag (query param)
    const { searchParams } = new URL(request.url);
    const overrideDuplicate = searchParams.get('overrideDuplicate') === 'true';

    try {
      const lead = await createLead(parsed.data, overrideDuplicate);
      return NextResponse.json(lead, { status: 201 });
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
