/**
 * AgencyOS CRM Opportunities Summary API
 *
 * GET /api/v1/crm/opportunities/summary - Get opportunity summary metrics
 *
 * Organization ID is resolved from the authenticated user's session.
 */

import { NextResponse } from 'next/server';

import { getOpportunitySummary } from '@/lib/services/crm/opportunity-service';

/** GET /api/v1/crm/opportunities/summary - Get opportunity summary metrics */
export async function GET() {
  try {
    const summary = await getOpportunitySummary();
    return NextResponse.json(summary);
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return NextResponse.json(
      {
        error:
          statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      },
      { status: statusCode }
    );
  }
}
