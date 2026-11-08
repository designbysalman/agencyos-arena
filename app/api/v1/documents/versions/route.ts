/**
 * AgencyOS Documents API - Versions
 *
 * POST   /api/v1/documents/versions/proposal - Create a proposal version snapshot
 * GET    /api/v1/documents/versions/proposal/[id] - List proposal versions
 * GET    /api/v1/documents/versions/document/[id] - List document versions
 */

import { NextResponse } from 'next/server';

import {
  createProposalVersion,
  listProposalVersions,
  listDocumentVersions,
} from '@/lib/services/documents/version-service';

function errorResponse(message: string, status: number, issues?: unknown[]) {
  const body: Record<string, unknown> = { error: message };
  if (issues) body.issues = issues;
  return NextResponse.json(body, { status });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!type || !id) {
      return errorResponse('type and id are required', 400);
    }

    if (type === 'proposal') {
      const data = await listProposalVersions(id);
      return NextResponse.json(data);
    }

    if (type === 'document') {
      const data = await listDocumentVersions(id);
      return NextResponse.json(data);
    }

    return errorResponse('Invalid version type', 400);
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { proposalId } = body;

    if (!proposalId || typeof proposalId !== 'string') {
      return errorResponse('proposalId is required', 400);
    }

    const version = await createProposalVersion(proposalId);
    return NextResponse.json(version, { status: 201 });
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}
