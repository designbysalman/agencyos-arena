/**
 * AgencyOS Documents API - Verify Shareable Link
 *
 * GET    /api/v1/documents/links/[token] - Verify and access a shared document link
 */

import { NextResponse } from 'next/server';

import { verifyDocumentLink } from '@/lib/services/documents/link-service';

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const data = await verifyDocumentLink(token);
    return NextResponse.json(data);
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 404 ? 'Link not found or expired' : 'Forbidden',
      statusCode
    );
  }
}
