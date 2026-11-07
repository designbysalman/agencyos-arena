/**
 * AgencyOS Sales New Proposal page.
 * * Redirects to the Phase 2.2 Live Preview Builder for creating proposals. * Keeps the existing /sales/proposals/new route as the entry point. */

import { redirect } from 'next/navigation';

export default function NewProposalPage() {
  redirect('/sales/proposals/builder');
}
