/**
 * Unit tests for Sales route integration and builder entry/edit flows.
 *
 * Verifies that:
 * - New Proposal / New Quotation routes redirect to the Phase 2.2 builder
 * - Edit Proposal / Edit Quotation routes redirect to the builder with document ID
 * - Sidebar navigation includes Quotations alongside Proposals
 * - Builder pages accept document ID for edit mode
 * - Existing Phase 2.1 list/detail pages remain accessible
 *
 * Prisma is mocked so these tests run without a live database.
 */

vi.mock('@/lib/db', () => ({
  prisma: {
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  },
}));

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();

function readRel(p: string): string {
  return readFileSync(join(ROOT, p), 'utf-8');
}

describe('Sales route integration (redirects to Phase 2.2 builder)', () => {
  it('New Proposal page redirects to /sales/proposals/builder', () => {
    const src = readRel('app/sales/proposals/new/page.tsx');
    expect(src).toContain("redirect('/sales/proposals/builder')");
    expect(src).not.toContain('CreateProposalPage');
    expect(src).not.toContain('Card');
  });

  it('New Quotation page redirects to /sales/quotations/builder', () => {
    const src = readRel('app/sales/quotations/new/page.tsx');
    expect(src).toContain("redirect('/sales/quotations/builder')");
    expect(src).not.toContain('CreateQuotationForm');
    expect(src).not.toContain('Card');
  });

  it('Proposal Edit page redirects to builder with document ID', () => {
    const src = readRel('app/sales/proposals/[id]/edit/page.tsx');
    expect(src).toContain("redirect(`/sales/proposals/builder/${params.id}`)");
    expect(src).not.toContain('EditProposalForm');
  });

  it('Quotation Edit page redirects to builder with document ID', () => {
    const src = readRel('app/sales/quotations/[id]/edit/page.tsx');
    expect(src).toContain("redirect(`/sales/quotations/builder/${params.id}`)");
    expect(src).not.toContain('EditQuotationForm');
  });
});

describe('Sales layout uses unified DashboardClientLayout', () => {
  it('SalesLayout imports DashboardClientLayout (not standalone header)', () => {
    const src = readRel('app/sales/layout.tsx');
    expect(src).toContain('@/app/dashboard/dashboard-client-layout');
    expect(src).toContain('DashboardClientLayout');
    expect(src).not.toContain('AgencyOS Sales');
  });

  it('SalesLayout preserves auth validation (redirect to /login)', () => {
    const src = readRel('app/sales/layout.tsx');
    expect(src).toContain("redirect('/login')");
    expect(src).toContain('dynamic = ');
  });
});

describe('Sidebar navigation includes Proposals and Quotations', () => {
  it('Sidebar has Proposals nav item pointing to /sales/proposals', () => {
    const src = readRel('components/layout/sidebar.tsx');
    expect(src).toContain("{ name: 'Proposals', href: '/sales/proposals'");
  });

  it('Sidebar has Quotations nav item pointing to /sales/quotations', () => {
    const src = readRel('components/layout/sidebar.tsx');
    expect(src).toContain("{ name: 'Quotations', href: '/sales/quotations'");
    expect(src).toContain('Receipt');
  });

  it('All CRM and Sales modules are accessible from sidebar', () => {
    const src = readRel('components/layout/sidebar.tsx');
    const expected = [
      '/dashboard',
      '/crm/contacts',
      '/crm/accounts',
      '/crm/pipelines',
      '/crm/leads',
      '/crm/opportunities',
      '/sales/proposals',
      '/sales/quotations',
    ];
    for (const href of expected) {
      expect(src).toContain(`href: '${href}'`);
    }
  });
});

describe('Builder pages accept document ID for edit mode', () => {
  it('Proposal builder page accepts params.id and passes to BuilderApp', () => {
    const src = readRel('app/sales/proposals/builder/page.tsx');
    expect(src).toContain('params.id');
    expect(src).toContain('isEdit');
    expect(src).toContain('ProposalBuilderApp');
  });

  it('Quotation builder page accepts params.id and passes to BuilderApp', () => {
    const src = readRel('app/sales/quotations/builder/page.tsx');
    expect(src).toContain('params.id');
    expect(src).toContain('isEdit');
    expect(src).toContain('QuotationBuilderApp');
  });
});

describe('Builder page data loading uses correct service response keys', () => {
  it('Proposal builder accesses contacts (not proposals) from listContacts', () => {
    const src = readRel('app/sales/proposals/builder/page.tsx');
    expect(src).toContain('(contactsResult as { contacts: unknown[] }).contacts');
    expect(src).not.toContain('(contactsResult as { proposals: unknown[] }).proposals');
  });

  it('Proposal builder accesses opportunities (not proposals) from listOpportunities', () => {
    const src = readRel('app/sales/proposals/builder/page.tsx');
    expect(src).toContain('(opportunitiesResult as { opportunities: unknown[] }).opportunities');
    expect(src).not.toContain('(opportunitiesResult as { proposals: unknown[] }).proposals');
  });

  it('Quotation builder accesses contacts (not proposals) from listContacts', () => {
    const src = readRel('app/sales/quotations/builder/page.tsx');
    expect(src).toContain('(contactsResult as { contacts: unknown[] }).contacts');
    expect(src).not.toContain('(contactsResult as { proposals: unknown[] }).proposals');
  });

  it('Quotation builder accesses opportunities (not proposals) from listOpportunities', () => {
    const src = readRel('app/sales/quotations/builder/page.tsx');
    expect(src).toContain('(opportunitiesResult as { opportunities: unknown[] }).opportunities');
    expect(src).not.toContain('(opportunitiesResult as { proposals: unknown[] }).proposals');
  });

  it('Catch blocks use correct response keys for contacts and opportunities', () => {
    const proposalSrc = readRel('app/sales/proposals/builder/page.tsx');
    const quotationSrc = readRel('app/sales/quotations/builder/page.tsx');

    for (const src of [proposalSrc, quotationSrc]) {
      expect(src).toContain('contacts: []');
      expect(src).toContain('opportunities: []');
      expect(src).not.toContain('proposals: []');
    }
  });
});

describe('Phase 2.1 list/detail pages remain accessible', () => {
  it('Proposals list page exists and links to builder', () => {
    const src = readRel('app/sales/proposals/page.tsx');
    expect(src).toContain('New Proposal');
    expect(src).toContain('/sales/proposals/new');
    expect(src).toContain('listProposals');
  });

  it('Quotations list page exists and links to builder', () => {
    const src = readRel('app/sales/quotations/page.tsx');
    expect(src).toContain('New Quotation');
    expect(src).toContain('/sales/quotations/new');
    expect(src).toContain('listQuotations');
  });

  it('Proposal detail page exists', () => {
    const src = readRel('app/sales/proposals/[id]/page.tsx');
    expect(src).toContain('getProposal');
    expect(src).toContain('proposal.title');
  });

  it('Quotation detail page exists', () => {
    const src = readRel('app/sales/quotations/[id]/page.tsx');
    expect(src).toContain('getQuotation');
    expect(src).toContain('quotation.title');
  });
});

describe('Dynamic builder edit routes (Next.js 16 async params)', () => {
  it('Proposal builder edit route exists at builder/[id]/page.tsx', () => {
    const src = readRel('app/sales/proposals/builder/[id]/page.tsx');
    expect(src).toContain('ProposalBuilderApp');
    expect(src).toContain("isEdit={true}");
    expect(src).toContain('proposalId={id}');
    expect(src).toContain('existingProposal={existingProposalData}');
    expect(src).toContain("redirect('/sales/proposals')");
  });

  it('Quotation builder edit route exists at builder/[id]/page.tsx', () => {
    const src = readRel('app/sales/quotations/builder/[id]/page.tsx');
    expect(src).toContain('QuotationBuilderApp');
    expect(src).toContain("isEdit={true}");
    expect(src).toContain('quotationId={id}');
    expect(src).toContain('existingQuotation={existingQuotationData}');
    expect(src).toContain("redirect('/sales/quotations')");
  });

  it('Proposal builder edit route awaits params (Next.js 16)', () => {
    const src = readRel('app/sales/proposals/builder/[id]/page.tsx');
    expect(src).toContain('const { id } = await params;');
    expect(src).toContain('params: Promise<{ id: string }>');
  });

  it('Quotation builder edit route awaits params (Next.js 16)', () => {
    const src = readRel('app/sales/quotations/builder/[id]/page.tsx');
    expect(src).toContain('const { id } = await params;');
    expect(src).toContain('params: Promise<{ id: string }>');
  });

  it('Proposal builder edit route imports BuilderApp from parent directory', () => {
    const src = readRel('app/sales/proposals/builder/[id]/page.tsx');
    expect(src).toContain("from '../BuilderApp'");
  });

  it('Quotation builder edit route imports BuilderApp from parent directory', () => {
    const src = readRel('app/sales/quotations/builder/[id]/page.tsx');
    expect(src).toContain("from '../BuilderApp'");
  });

  it('Proposal builder edit route loads contacts, opportunities, and proposal in parallel', () => {
    const src = readRel('app/sales/proposals/builder/[id]/page.tsx');
    expect(src).toContain('listContacts');
    expect(src).toContain('listOpportunities');
    expect(src).toContain('getProposal');
    expect(src).toContain('Promise.all([');
  });

  it('Quotation builder edit route loads contacts, opportunities, and quotation in parallel', () => {
    const src = readRel('app/sales/quotations/builder/[id]/page.tsx');
    expect(src).toContain('listContacts');
    expect(src).toContain('listOpportunities');
    expect(src).toContain('getQuotation');
    expect(src).toContain('Promise.all([');
  });

  it('Proposal builder edit route uses correct contacts response key', () => {
    const src = readRel('app/sales/proposals/builder/[id]/page.tsx');
    expect(src).toContain('(contactsResult as { contacts: unknown[] }).contacts');
    expect(src).not.toContain('(contactsResult as { proposals: unknown[] }).proposals');
  });

  it('Quotation builder edit route uses correct contacts response key', () => {
    const src = readRel('app/sales/quotations/builder/[id]/page.tsx');
    expect(src).toContain('(contactsResult as { contacts: unknown[] }).contacts');
    expect(src).not.toContain('(contactsResult as { proposals: unknown[] }).proposals');
  });

  it('Proposal builder edit route uses correct opportunities response key', () => {
    const src = readRel('app/sales/proposals/builder/[id]/page.tsx');
    expect(src).toContain('(opportunitiesResult as { opportunities: unknown[] }).opportunities');
    expect(src).not.toContain('(opportunitiesResult as { proposals: unknown[] }).proposals');
  });

  it('Quotation builder edit route uses correct opportunities response key', () => {
    const src = readRel('app/sales/quotations/builder/[id]/page.tsx');
    expect(src).toContain('(opportunitiesResult as { opportunities: unknown[] }).opportunities');
    expect(src).not.toContain('(opportunitiesResult as { proposals: unknown[] }).proposals');
  });

  it('Proposal builder edit route redirects to list when proposal not found', () => {
    const src = readRel('app/sales/proposals/builder/[id]/page.tsx');
    expect(src).toContain('if (!existingProposal)');
    expect(src).toContain("redirect('/sales/proposals')");
  });

  it('Quotation builder edit route redirects to list when quotation not found', () => {
    const src = readRel('app/sales/quotations/builder/[id]/page.tsx');
    expect(src).toContain('if (!existingQuotation)');
    expect(src).toContain("redirect('/sales/quotations')");
  });
});

describe('Future module Coming Soon routes', () => {
  it('Coming Soon component exists and accepts title, phase, description', () => {
    const src = readRel('components/layout/coming-soon.tsx');
    expect(src).toContain('export function ComingSoon');
    expect(src).toContain('title: string');
    expect(src).toContain('phase: string');
    expect(src).toContain('description?: string');
  });

  it('Invoices Coming Soon route page exists', () => {
    const src = readRel('app/finance/invoices/page.tsx');
    expect(src).toContain('DashboardClientLayout');
    expect(src).toContain('ComingSoon');
    expect(src).toContain('redirect(\'/login\')');
    expect(src).toContain('title="Invoices"');
    expect(src).toContain('Roadmap: Future Phase');
  });

  it('Projects Coming Soon route page exists', () => {
    const src = readRel('app/projects/page.tsx');
    expect(src).toContain('DashboardClientLayout');
    expect(src).toContain('ComingSoon');
    expect(src).toContain('redirect(\'/login\')');
    expect(src).toContain('title="Projects"');
    expect(src).toContain('Roadmap: Future Phase');
  });

  it('Automation Coming Soon route page exists', () => {
    const src = readRel('app/automation/workflows/page.tsx');
    expect(src).toContain('DashboardClientLayout');
    expect(src).toContain('ComingSoon');
    expect(src).toContain('redirect(\'/login\')');
    expect(src).toContain('title="Automation"');
    expect(src).toContain('Roadmap: Future Phase');
  });

  it('Settings Coming Soon route page exists', () => {
    const src = readRel('app/settings/page.tsx');
    expect(src).toContain('DashboardClientLayout');
    expect(src).toContain('ComingSoon');
    expect(src).toContain('redirect(\'/login\')');
    expect(src).toContain('title="Settings"');
    expect(src).toContain('Roadmap: Future Phase');
  });

  it('All future module routes use dynamic = force-dynamic', () => {
    const invoicesSrc = readRel('app/finance/invoices/page.tsx');
    const projectsSrc = readRel('app/projects/page.tsx');
    const automationSrc = readRel('app/automation/workflows/page.tsx');
    const settingsSrc = readRel('app/settings/page.tsx');

    for (const src of [invoicesSrc, projectsSrc, automationSrc, settingsSrc]) {
      expect(src).toContain("export const dynamic = 'force-dynamic'");
    }
  });

  it('Sidebar navigation remains intact with all modules listed', () => {
    const src = readRel('components/layout/sidebar.tsx');
    const expected = [
      '/dashboard',
      '/crm/contacts',
      '/crm/accounts',
      '/crm/pipelines',
      '/crm/leads',
      '/crm/opportunities',
      '/sales/proposals',
      '/sales/quotations',
      '/finance/invoices',
      '/projects',
      '/automation/workflows',
      '/settings',
    ];
    for (const href of expected) {
      expect(src).toContain(`href: '${href}'`);
    }
  });

  it('Coming Soon pages do not present modules as functional', () => {
    const src = readRel('components/layout/coming-soon.tsx');
    expect(src).toContain('Coming Soon');
    expect(src).toContain('not yet available');
    expect(src).not.toContain('create');
    expect(src).not.toContain('update');
    expect(src).not.toContain('delete');
    expect(src).not.toContain('submit');
  });
});
