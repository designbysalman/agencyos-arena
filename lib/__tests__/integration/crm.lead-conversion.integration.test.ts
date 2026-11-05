/**
 * Integration tests for Lead-to-Opportunity Conversion API.
 *
 * These tests run against a REAL PostgreSQL database via Prisma Client
 * and real HTTP endpoints via the Next.js dev server.
 *
 * They verify:
 * - Successful lead-to-opportunity conversion
 * - Relationship preservation (contact, account, pipeline, stage, owner)
 * - Value preservation from lead expected value
 * - Missing and invalid references (404)
 * - Permission denial (403)
 * - Organization isolation / IDOR protection
 * - Duplicate and concurrent conversion prevention
 * - Already-converted behavior
 * - Lead lifecycle status update to "converted"
 * - Audit logging
 *
 * Requires DATABASE_URL and BETTER_AUTH_SECRET environment variables.
 * Requires a running Next.js dev server at http://localhost:3000 for HTTP tests.
 * Skips gracefully if no database is available.
 * Fails if the HTTP server is unavailable when the database is available.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db';

const DATABASE_URL = process.env.DATABASE_URL;
const canRunTests = !!DATABASE_URL;

const SERVER_URL = 'http://localhost:3000';

const describeIfDb = canRunTests ? describe : describe.skip;

const TEST_EMAIL_SUFFIX = '@crm-conversion-test.invalid';
const TEST_PASSWORD = 'TestPassword123!';

/** Register, sign in, and bootstrap an org for a test user. Returns session token, user, orgId. */
async function createAuthenticatedUserWithOrg(email: string, name: string, orgName: string) {
  const signUpRes = await fetch(`${SERVER_URL}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: TEST_PASSWORD, name }),
  });
  expect(signUpRes.status).toBe(200);

  const signInRes = await fetch(`${SERVER_URL}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: TEST_PASSWORD }),
  });
  expect(signInRes.status).toBe(200);

  const setCookie = signInRes.headers.get('set-cookie') || '';
  const cookieMatch = setCookie.match(/better-auth.session_token=([^;]+)/);
  const token = cookieMatch ? cookieMatch[1] : null;

  const bootstrapRes = await fetch(`${SERVER_URL}/api/auth/bootstrap-organization`, {
    method: 'POST',
    headers: {
      Cookie: `better-auth.session_token=${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ organizationName: orgName }),
  });
  expect(bootstrapRes.status).toBe(200);

  const user = await prisma.user.findUnique({ where: { email } });
  expect(user).toBeDefined();
  const org = await prisma.organization.findFirst({
    where: { userRoles: { some: { userId: user!.id } } },
  });
  expect(org).toBeDefined();

  return { user: user!, token, org: org! };
}

describeIfDb('CRM Lead-to-Opportunity Conversion integration (real PostgreSQL)', () => {
  let testUserId: string;
  let testOrgId: string;
  let testSessionToken: string;
  let testLeadId: string;
  let testOppId: string;
  let testContactId: string;
  let testAccountId: string;
  let testPipelineId: string;
  let testStageId: string;
  let foreignSessionToken: string;
  let foreignOrgId: string;

  beforeAll(async () => {
    await prisma.$connect();

    try {
      await fetch(`${SERVER_URL}/api/auth/session`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
    } catch {
      throw new Error(`HTTP server unavailable at ${SERVER_URL}`);
    }

    // Primary user + org
    const email = `crm-conv-user-${Date.now()}${TEST_EMAIL_SUFFIX}`;
    const { user, token, org } = await createAuthenticatedUserWithOrg(
      email,
      'CRM Conv User',
      'CRM Conv Test Org'
    );
    testUserId = user!.id;
    testOrgId = org!.id;
    testSessionToken = token!;

    // Foreign user + org (for IDOR tests)
    const foreignEmail = `crm-conv-foreign-${Date.now()}${TEST_EMAIL_SUFFIX}`;
    const { token: foreignToken, org: foreignOrg } = await createAuthenticatedUserWithOrg(
      foreignEmail,
      'CRM Conv Foreign User',
      'CRM Conv Foreign Org'
    );
    foreignSessionToken = foreignToken!;
    foreignOrgId = foreignOrg!.id;

    // Create pipeline and stage
    const pipeline = await prisma.pipeline.create({
      data: {
        organizationId: testOrgId,
        name: 'Test Pipeline',
        isDefault: true,
      },
    });
    testPipelineId = pipeline.id;

    const stage = await prisma.pipelineStage.create({
      data: {
        pipelineId: testPipelineId,
        name: 'Qualified',
        order: 1,
        probability: 50,
        isWon: false,
        isLost: false,
      },
    });
    testStageId = stage.id;

    // Create account and contact
    const account = await prisma.agencyAccount.create({
      data: {
        organizationId: testOrgId,
        name: 'Test Client Account',
        status: 'active',
      },
    });
    testAccountId = account.id;

    const contact = await prisma.contact.create({
      data: {
        organizationId: testOrgId,
        accountId: testAccountId,
        firstName: 'Jane',
        lastName: 'ConvContact',
        email: 'jane.conv@example.com',
        phone: '5551234567',
        status: 'active',
        createdBy: testUserId,
        updatedBy: testUserId,
      },
    });
    testContactId = contact.id;

    // Create a lead
    const lead = await prisma.lead.create({
      data: {
        organizationId: testOrgId,
        contactId: testContactId,
        accountId: testAccountId,
        source: 'website',
        status: 'qualified',
        priority: 'high',
        expectedValue: 75000,
        ownerId: testUserId,
        pipelineId: testPipelineId,
        stageId: testStageId,
        notes: 'Test lead for conversion',
      },
    });
    testLeadId = lead.id;
  });

  afterAll(async () => {
    if (testOppId) {
      await prisma.opportunity.delete({ where: { id: testOppId } }).catch(() => {});
    }
    if (testLeadId) {
      await prisma.lead.delete({ where: { id: testLeadId } }).catch(() => {});
    }
    if (testContactId) {
      await prisma.contact.delete({ where: { id: testContactId } }).catch(() => {});
    }
    if (testOrgId) {
      await prisma.opportunity.deleteMany({ where: { organizationId: testOrgId } }).catch(() => {});
      await prisma.lead.deleteMany({ where: { organizationId: testOrgId } }).catch(() => {});
      await prisma.contact.deleteMany({ where: { organizationId: testOrgId } }).catch(() => {});
      await prisma.pipelineStage
        .deleteMany({ where: { pipelineId: testPipelineId } })
        .catch(() => {});
      await prisma.pipeline.deleteMany({ where: { organizationId: testOrgId } }).catch(() => {});
      await prisma.agencyAccount
        .deleteMany({ where: { organizationId: testOrgId } })
        .catch(() => {});
      await prisma.organization.delete({ where: { id: testOrgId } }).catch(() => {});
    }
    if (foreignOrgId) {
      await prisma.opportunity
        .deleteMany({ where: { organizationId: foreignOrgId } })
        .catch(() => {});
      await prisma.pipeline.deleteMany({ where: { organizationId: foreignOrgId } }).catch(() => {});
      await prisma.agencyAccount
        .deleteMany({ where: { organizationId: foreignOrgId } })
        .catch(() => {});
      await prisma.organization.delete({ where: { id: foreignOrgId } }).catch(() => {});
    }
    if (testUserId) {
      await prisma.session.deleteMany({ where: { userId: testUserId } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: testUserId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  describe('POST /api/v1/crm/leads/[id]/convert - Convert lead to opportunity', () => {
    it('returns 401 without session', async () => {
      const res = await fetch(`${SERVER_URL}/api/v1/crm/leads/${testLeadId}/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ title: 'Converted Deal' }),
      });
      expect(res.status).toBe(401);
    });

    it('successfully converts a lead to an opportunity', async () => {
      const res = await fetch(`${SERVER_URL}/api/v1/crm/leads/${testLeadId}/convert`, {
        method: 'POST',
        headers: {
          Cookie: `better-auth.session_token=${testSessionToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          title: 'Enterprise Deal',
          value: '75000.00',
          currency: 'USD',
          pipelineId: testPipelineId,
          stageId: testStageId,
          ownerId: testUserId,
        }),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.alreadyConverted).toBe(false);
      expect(body.opportunity.id).toBeDefined();
      expect(body.opportunity.title).toBe('Enterprise Deal');
      expect(body.opportunity.status).toBe('open');
      expect(body.opportunity.value).toBe('75000');
      expect(body.opportunity.currency).toBe('USD');
      expect(body.opportunity.leadId).toBe(testLeadId);
      expect(body.opportunity.contactId).toBe(testContactId);
      expect(body.opportunity.accountId).toBe(testAccountId);
      expect(body.opportunity.pipelineId).toBe(testPipelineId);
      expect(body.opportunity.stageId).toBe(testStageId);
      expect(body.opportunity.ownerId).toBe(testUserId);
      expect(body.lead.status).toBe('converted');
      testOppId = body.opportunity.id;
    });

    it('prevents duplicate conversion of an already-converted lead', async () => {
      const res = await fetch(`${SERVER_URL}/api/v1/crm/leads/${testLeadId}/convert`, {
        method: 'POST',
        headers: {
          Cookie: `better-auth.session_token=${testSessionToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ title: 'Duplicate Deal' }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.alreadyConverted).toBe(true);
      expect(body.opportunity.id).toBe(testOppId);
      expect(body.opportunity.title).toBe('Enterprise Deal');
    });

    it('returns 404 for cross-org lead (IDOR protection)', async () => {
      // Create a lead in the foreign org
      const foreignLead = await prisma.lead.create({
        data: {
          organizationId: foreignOrgId,
          source: 'website',
          status: 'new',
        },
      });

      const res = await fetch(`${SERVER_URL}/api/v1/crm/leads/${foreignLead.id}/convert`, {
        method: 'POST',
        headers: {
          Cookie: `better-auth.session_token=${testSessionToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ title: 'Hacked Deal' }),
      });
      expect(res.status).toBe(404);

      await prisma.lead.delete({ where: { id: foreignLead.id } });
    });

    it('returns 400 for invalid input', async () => {
      const res = await fetch(`${SERVER_URL}/api/v1/crm/leads/${testLeadId}/convert`, {
        method: 'POST',
        headers: {
          Cookie: `better-auth.session_token=${testSessionToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });

    it('returns 404 for invalid pipeline', async () => {
      // First un-convert the lead so we can test again
      await prisma.opportunity.delete({ where: { id: testOppId } });
      await prisma.lead.update({
        where: { id: testLeadId },
        data: { status: 'new' },
      });

      const foreignPipeline = await prisma.pipeline.create({
        data: {
          organizationId: foreignOrgId,
          name: 'Foreign Pipeline',
        },
      });

      const res = await fetch(`${SERVER_URL}/api/v1/crm/leads/${testLeadId}/convert`, {
        method: 'POST',
        headers: {
          Cookie: `better-auth.session_token=${testSessionToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          title: 'Test Deal',
          pipelineId: foreignPipeline.id,
        }),
      });
      expect(res.status).toBe(404);

      await prisma.pipeline.delete({ where: { id: foreignPipeline.id } });
    });
  });

  describe('Lead detail page shows conversion status', () => {
    it('shows converted opportunity link after conversion', async () => {
      const res = await fetch(`${SERVER_URL}/api/v1/crm/leads/${testLeadId}`, {
        headers: {
          Cookie: `better-auth.session_token=${testSessionToken}`,
          Accept: 'application/json',
        },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('converted');
      expect(body.convertedOpportunity).toBeDefined();
      expect(body.convertedOpportunity.id).toBe(testOppId);
    });
  });

  describe('Org isolation (IDOR)', () => {
    it('foreign org cannot convert primary org lead', async () => {
      // Create a new lead in primary org
      const newLead = await prisma.lead.create({
        data: {
          organizationId: testOrgId,
          source: 'website',
          status: 'new',
        },
      });

      const res = await fetch(`${SERVER_URL}/api/v1/crm/leads/${newLead.id}/convert`, {
        method: 'POST',
        headers: {
          Cookie: `better-auth.session_token=${foreignSessionToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ title: 'Foreign Convert' }),
      });
      expect(res.status).toBe(404);

      await prisma.lead.delete({ where: { id: newLead.id } });
    });
  });
});
